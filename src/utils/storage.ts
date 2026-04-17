import Taro from '@tarojs/taro';

const WRONG_IDS_KEY = 'imp_wrong_ids';
const STATS_KEY = 'imp_stats';
const EXAM_RESULT_KEY = 'imp_exam_result';
const EXAM_HISTORY_KEY = 'imp_exam_history';

export interface PracticeStats {
  totalAnswered: number;
  correctCount: number;
}

/** 单选存单个下标；多选存已选下标数组（与题目顺序无关，结果页用 isSelectionCorrect 判分） */
export type ExamStoredAnswer = number | number[];

export interface ExamResult {
  score: number;
  total: number;
  correctCount: number;
  answers: Record<string, ExamStoredAnswer>;
  date: string;
  duration: number;
}

// ── Wrong Questions ──

export function getWrongIds(): number[] {
  try {
    return Taro.getStorageSync(WRONG_IDS_KEY) || [];
  } catch {
    return [];
  }
}

export function addWrongId(id: number): void {
  const ids = getWrongIds();
  if (!ids.includes(id)) {
    ids.push(id);
    Taro.setStorageSync(WRONG_IDS_KEY, ids);
  }
}

export function removeWrongId(id: number): void {
  const ids = getWrongIds().filter((i) => i !== id);
  Taro.setStorageSync(WRONG_IDS_KEY, ids);
}

export function clearWrongIds(): void {
  Taro.setStorageSync(WRONG_IDS_KEY, []);
}

// ── Practice Stats ──

export function getStats(): PracticeStats {
  try {
    return Taro.getStorageSync(STATS_KEY) || { totalAnswered: 0, correctCount: 0 };
  } catch {
    return { totalAnswered: 0, correctCount: 0 };
  }
}

export function recordAnswer(correct: boolean): void {
  const stats = getStats();
  stats.totalAnswered += 1;
  if (correct) stats.correctCount += 1;
  Taro.setStorageSync(STATS_KEY, stats);
}

// ── Exam ──

export function saveExamResult(result: ExamResult): void {
  Taro.setStorageSync(EXAM_RESULT_KEY, result);
  const history = getExamHistory();
  history.push(result);
  Taro.setStorageSync(EXAM_HISTORY_KEY, history);
}

export function getExamResult(): ExamResult | null {
  try {
    return Taro.getStorageSync(EXAM_RESULT_KEY) || null;
  } catch {
    return null;
  }
}

export function getExamHistory(): ExamResult[] {
  try {
    return Taro.getStorageSync(EXAM_HISTORY_KEY) || [];
  } catch {
    return [];
  }
}
