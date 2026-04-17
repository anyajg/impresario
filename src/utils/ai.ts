import Taro from '@tarojs/taro';
import type { Question } from '../data/questions';
import {
  chapters,
  getCorrectIndicesSorted,
  isMultiQuestion,
} from '../data/questions';

// ── Config ──

const AI_CONFIG_KEY = 'imp_ai_config';
const AI_CACHE_KEY = 'imp_ai_cache';

export interface AIConfig {
  apiUrl: string;
  apiKey: string;
  model: string;
}

const DEFAULT_CONFIG: AIConfig = {
  apiUrl: 'https://api.deepseek.com/v1/chat/completions',
  apiKey: '',
  model: 'deepseek-chat',
};

export function getAIConfig(): AIConfig {
  try {
    const saved = Taro.getStorageSync(AI_CONFIG_KEY);
    return saved ? { ...DEFAULT_CONFIG, ...saved } : { ...DEFAULT_CONFIG };
  } catch {
    return { ...DEFAULT_CONFIG };
  }
}

export function saveAIConfig(config: AIConfig): void {
  Taro.setStorageSync(AI_CONFIG_KEY, config);
}

export function isAIConfigured(): boolean {
  const config = getAIConfig();
  return !!(config.apiKey && config.apiUrl && config.model);
}

export function ensureAIConfigured(): boolean {
  if (isAIConfigured()) return true;
  Taro.showToast({ title: '请先配置 AI 接口', icon: 'none', duration: 2000 });
  Taro.navigateTo({ url: '/pages/aiSettings/index' });
  return false;
}

// ── Cache ──

type CacheStore = Record<string, string>;

function getCache(): CacheStore {
  try {
    return Taro.getStorageSync(AI_CACHE_KEY) || {};
  } catch {
    return {};
  }
}

function setCache(key: string, value: string): void {
  const cache = getCache();
  cache[key] = value;
  Taro.setStorageSync(AI_CACHE_KEY, cache);
}

export function getCachedResponse(key: string): string | null {
  return getCache()[key] || null;
}

// ── API Call ──

async function chatCompletion(systemPrompt: string, userPrompt: string): Promise<string> {
  const config = getAIConfig();

  return new Promise((resolve, reject) => {
    Taro.request({
      url: config.apiUrl,
      method: 'POST',
      header: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.apiKey}`,
      },
      data: {
        model: config.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.7,
        max_tokens: 1024,
      },
      success(res) {
        if (res.statusCode === 200 && res.data?.choices?.[0]?.message?.content) {
          resolve(res.data.choices[0].message.content.trim());
        } else {
          const errMsg =
            res.data?.error?.message || `请求失败 (${res.statusCode})`;
          reject(new Error(errMsg));
        }
      },
      fail(err) {
        reject(new Error(err.errMsg || '网络请求失败'));
      },
    });
  });
}

// ── Prompts ──

const SYSTEM_PROMPT =
  '你是一位资深的演出经纪人资格考试辅导老师，擅长深入浅出地讲解知识点。请用简洁、清晰的中文回答。';

function indicesToLetters(indices: number[]): string {
  return indices.map((i) => String.fromCharCode(65 + i)).join('、');
}

function buildQuestionPrompt(
  q: Question,
  userAnswer: number | number[] | null
): string {
  const options = q.options
    .map((opt, i) => `${String.fromCharCode(65 + i)}. ${opt}`)
    .join('\n');
  const ch = chapters.find((c) => c.id === q.chapter);
  const correctIdx = getCorrectIndicesSorted(q);
  const correctLabel = indicesToLetters(correctIdx);
  const correctDetail = correctIdx
    .map((i) => `${String.fromCharCode(65 + i)}（${q.options[i]}）`)
    .join('；');

  let userLabel: string;
  if (userAnswer === null) {
    userLabel = '未作答';
  } else if (typeof userAnswer === 'number') {
    userLabel = `${String.fromCharCode(65 + userAnswer)}（${q.options[userAnswer]}）`;
  } else if (userAnswer.length === 0) {
    userLabel = '未选择任何项';
  } else {
    userLabel = userAnswer
      .map((i) => `${String.fromCharCode(65 + i)}（${q.options[i]}）`)
      .join('；');
  }

  const typeHint = isMultiQuestion(q) ? '多选题（需全部选对才算对）' : '单选题';

  return `学生在以下题目中回答错误，请帮助分析：

【章节】${ch?.name || '未知'}
【题型】${typeHint}
【题目】${q.content}
【选项】
${options}
【学生选择】${userLabel}
【正确答案】${correctLabel}（${correctDetail}）

请从以下角度简要分析（总共不超过 300 字）：
1. 为什么正确选项是 ${correctLabel}
2. 学生作答可能的误区
3. 记忆口诀或关键提示`;
}

function buildOverallPrompt(wrongQuestions: Question[]): string {
  const chapterGroups: Record<string, number> = {};
  wrongQuestions.forEach((q) => {
    const ch = chapters.find((c) => c.id === q.chapter);
    const name = ch?.name || '未知';
    chapterGroups[name] = (chapterGroups[name] || 0) + 1;
  });

  const distribution = Object.entries(chapterGroups)
    .map(([name, count]) => `  ${name}：${count} 题`)
    .join('\n');

  const questionList = wrongQuestions
    .map((q, i) => {
      const ch = chapters.find((c) => c.id === q.chapter);
      const tag = isMultiQuestion(q) ? '[多选]' : '[单选]';
      return `${i + 1}. ${tag}[${ch?.name}] ${q.content}`;
    })
    .join('\n');

  return `以下是学生做错的全部题目，请做整体诊断分析：

【错题分布】
${distribution}

【错题列表】
${questionList}

请给出一份简洁的诊断报告（不超过 400 字），包含：
1. 薄弱章节与知识盲区
2. 错误类型分析（理解偏差/记忆混淆/审题不清）
3. 针对性复习建议（优先复习什么、怎么复习）`;
}

// ── Public API ──

function cacheKeyForUserAnswer(userAnswer: number | number[] | null): string {
  if (userAnswer === null) return 'null';
  if (typeof userAnswer === 'number') return String(userAnswer);
  return JSON.stringify([...userAnswer].sort((a, b) => a - b));
}

export async function aiAnalyzeQuestion(
  question: Question,
  userAnswer: number | number[] | null
): Promise<string> {
  const cacheKey = `q_${question.id}_${cacheKeyForUserAnswer(userAnswer)}`;
  const cached = getCachedResponse(cacheKey);
  if (cached) return cached;

  const result = await chatCompletion(
    SYSTEM_PROMPT,
    buildQuestionPrompt(question, userAnswer)
  );
  setCache(cacheKey, result);
  return result;
}

export async function aiAnalyzeOverall(
  wrongQuestions: Question[]
): Promise<string> {
  const ids = wrongQuestions
    .map((q) => q.id)
    .sort()
    .join(',');
  const cacheKey = `overall_${ids}`;
  const cached = getCachedResponse(cacheKey);
  if (cached) return cached;

  const result = await chatCompletion(
    SYSTEM_PROMPT,
    buildOverallPrompt(wrongQuestions)
  );
  setCache(cacheKey, result);
  return result;
}
