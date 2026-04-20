import { View, Text, ScrollView } from '@tarojs/components';
import Taro, { useDidShow } from '@tarojs/taro';
import { useState, useCallback } from 'react';
import {
  questions,
  chapters,
  getCorrectIndicesSorted,
  ensureFullQuestionBankLoaded,
  type Question,
} from '../../data/questions';
import { getWrongIds, clearWrongIds, removeWrongId } from '../../utils/storage';
import {
  ensureAIConfigured,
  aiAnalyzeQuestion,
  aiAnalyzeOverall,
} from '../../utils/ai';
import TabBar from '../../components/TabBar';
import './index.scss';

function WrongBookPage() {
  const supportsAI = process.env.TARO_ENV !== 'weapp';
  const [wrongQuestions, setWrongQuestions] = useState<Question[]>([]);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  // AI states
  const [aiLoading, setAiLoading] = useState<Record<string, boolean>>({});
  const [aiResults, setAiResults] = useState<Record<string, string>>({});
  const [overallReport, setOverallReport] = useState('');
  const [showReport, setShowReport] = useState(false);

  const loadData = useCallback(async () => {
    await ensureFullQuestionBankLoaded();
    const ids = getWrongIds();
    const qs = questions.filter((q) => ids.includes(q.id));
    setWrongQuestions(qs);
  }, []);

  useDidShow(loadData);

  const handleToggle = (id: number) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const handleRemove = (id: number) => {
    removeWrongId(id);
    setWrongQuestions((prev) => prev.filter((q) => q.id !== id));
    setExpandedId(null);
  };

  const handleClear = () => {
    Taro.showModal({
      title: '确认清空',
      content: '确定要清空所有错题吗？',
      success(res) {
        if (res.confirm) {
          clearWrongIds();
          setWrongQuestions([]);
          setExpandedId(null);
          setOverallReport('');
          setShowReport(false);
        }
      },
    });
  };

  const handlePractice = () => {
    if (wrongQuestions.length === 0) return;
    Taro.navigateTo({ url: '/pages/practice/index?mode=wrong' });
  };

  // ── AI: single question ──
  const handleAIQuestion = async (q: Question) => {
    if (!supportsAI) return;
    if (!ensureAIConfigured()) return;
    const key = `q_${q.id}`;
    if (aiResults[key]) return; // already loaded

    setAiLoading((prev) => ({ ...prev, [key]: true }));
    try {
      const result = await aiAnalyzeQuestion(q, null);
      setAiResults((prev) => ({ ...prev, [key]: result }));
    } catch (e: any) {
      Taro.showToast({ title: e.message || 'AI 请求失败', icon: 'none' });
    } finally {
      setAiLoading((prev) => ({ ...prev, [key]: false }));
    }
  };

  // ── AI: overall report ──
  const handleAIOverall = async () => {
    if (!supportsAI) return;
    if (!ensureAIConfigured()) return;
    if (overallReport) {
      setShowReport(true);
      return;
    }

    setAiLoading((prev) => ({ ...prev, overall: true }));
    setShowReport(true);
    try {
      const result = await aiAnalyzeOverall(wrongQuestions);
      setOverallReport(result);
    } catch (e: any) {
      Taro.showToast({ title: e.message || 'AI 请求失败', icon: 'none' });
      setShowReport(false);
    } finally {
      setAiLoading((prev) => ({ ...prev, overall: false }));
    }
  };

  if (wrongQuestions.length === 0) {
    return (
      <View className='page'>
        <View className='empty'>
          <Text className='empty-mark'>空</Text>
          <Text className='empty-title'>暂无错题</Text>
          <Text className='empty-desc'>继续努力练习吧！</Text>
          <View
            className='btn btn-primary'
            onClick={() => Taro.redirectTo({ url: '/pages/index/index' })}
          >
            <Text className='btn-text'>返回首页</Text>
          </View>
        </View>
        <TabBar current={2} />
      </View>
    );
  }

  return (
    <ScrollView className='page' scrollY>
      {/* Actions */}
      <View className='actions'>
        <View className='action-btn action-practice' onClick={handlePractice}>
          <Text className='action-btn-text'>重做错题</Text>
        </View>
        <View className='action-btn action-clear' onClick={handleClear}>
          <Text className='action-btn-text'>清空</Text>
        </View>
      </View>

      {supportsAI && (
        <View className='ai-overall-btn' onClick={handleAIOverall}>
          <Text className='ai-overall-btn-text'>薄弱项诊断</Text>
          <Text className='ai-overall-btn-sub'>
            分析 {wrongQuestions.length} 道错题，生成复习建议
          </Text>
        </View>
      )}

      {supportsAI && showReport && (
        <View className='ai-report'>
          <View className='ai-report-header'>
            <Text className='ai-report-title'>诊断报告</Text>
            <Text className='ai-report-close' onClick={() => setShowReport(false)}>
              收起
            </Text>
          </View>
          {aiLoading.overall ? (
            <View className='ai-loading'>
              <Text className='ai-loading-dot'>●</Text>
              <Text className='ai-loading-text'>AI 正在分析中...</Text>
            </View>
          ) : (
            <Text className='ai-report-content'>{overallReport}</Text>
          )}
        </View>
      )}

      <View className='count-bar'>
        <Text className='count-text'>共 {wrongQuestions.length} 道错题</Text>
      </View>

      {wrongQuestions.map((q) => {
        const ch = chapters.find((c) => c.id === q.chapter);
        const expanded = expandedId === q.id;
        const aiKey = `q_${q.id}`;
        const hasAI = !!aiResults[aiKey];
        const isAILoading = !!aiLoading[aiKey];

        return (
          <View key={q.id} className='wrong-card'>
            <View className='wrong-header' onClick={() => handleToggle(q.id)}>
              <View className='wrong-left'>
                {ch && (
                  <View
                    className='wrong-tag'
                    style={{ background: ch.color }}
                  >
                    <Text className='wrong-tag-text'>{ch.name}</Text>
                  </View>
                )}
                <Text
                  className='wrong-question'
                  style={{ WebkitLineClamp: expanded ? 'unset' : 2 }}
                >
                  {q.content}
                </Text>
              </View>
              <Text className={`wrong-arrow ${expanded ? 'expanded' : ''}`}>
                ›
              </Text>
            </View>

            {expanded && (
              <View className='wrong-detail'>
                <View className='wrong-options'>
                  {q.options.map((opt, idx) => {
                    const label = String.fromCharCode(65 + idx);
                    const correctSet = new Set(getCorrectIndicesSorted(q));
                    const isAnswer = correctSet.has(idx);
                    return (
                      <View
                        key={idx}
                        className={`wrong-option ${isAnswer ? 'wrong-option-correct' : ''}`}
                      >
                        <Text className='wrong-option-text'>
                          {label}. {opt}
                          {isAnswer ? '（正确项）' : ''}
                        </Text>
                      </View>
                    );
                  })}
                </View>
                <View className='wrong-explanation'>
                  <Text className='wrong-explanation-title'>解析</Text>
                  <Text className='wrong-explanation-text'>
                    {q.explanation}
                  </Text>
                </View>

                {/* AI per-question */}
                {supportsAI && !hasAI && (
                  <View
                    className='ai-btn'
                    onClick={() => handleAIQuestion(q)}
                  >
                    {isAILoading ? (
                      <Text className='ai-btn-text'>分析中…</Text>
                    ) : (
                      <Text className='ai-btn-text'>AI 深度解析</Text>
                    )}
                  </View>
                )}

                {supportsAI && hasAI && (
                  <View className='ai-result'>
                    <Text className='ai-result-title'>AI 解析</Text>
                    <Text className='ai-result-text'>{aiResults[aiKey]}</Text>
                  </View>
                )}

                <View
                  className='remove-btn'
                  onClick={() => handleRemove(q.id)}
                >
                  <Text className='remove-btn-text'>移出错题本</Text>
                </View>
              </View>
            )}
          </View>
        );
      })}

      <View className='bottom-space' />
      <TabBar current={2} />
    </ScrollView>
  );
}

export default WrongBookPage;
