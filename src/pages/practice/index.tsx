import { View, Text, ScrollView } from '@tarojs/components';
import Taro, { useDidShow } from '@tarojs/taro';
import { useState, useCallback } from 'react';
import {
  chapters,
  getQuestionsByChapter,
  questions as allQuestions,
  isMultiQuestion,
  getCorrectIndicesSorted,
  isSelectionCorrect,
  ensureFullQuestionBankLoaded,
  type Question,
} from '../../data/questions';
import {
  addWrongId,
  removeWrongId,
  recordAnswer,
  getWrongIds,
} from '../../utils/storage';
import { ensureAIConfigured, aiAnalyzeQuestion } from '../../utils/ai';
import TabBar from '../../components/TabBar';
import './index.scss';

function PracticePage() {
  const router = Taro.getCurrentInstance().router;
  const chapterParam = router?.params?.chapter;
  const modeParam = router?.params?.mode;

  // 有 URL 参数 = 子页面模式（从首页章节卡或错题本跳入），无参数 = Tab 主页模式
  const isSubPage = !!(chapterParam || modeParam);

  const [currentChapter, setCurrentChapter] = useState<number | null>(
    chapterParam ? Number(chapterParam) : null
  );
  const [practiceQuestions, setPracticeQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  /** 单选为单元素数组、多选为已选下标；提交前多选可多次点选切换 */
  const [picked, setPicked] = useState<number[]>([]);
  const [answered, setAnswered] = useState(false);
  const [correctInSession, setCorrectInSession] = useState(0);
  const [finished, setFinished] = useState(false);
  const [aiText, setAiText] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [, setQuestionCount] = useState(allQuestions.length);

  useDidShow(async () => {
    await ensureFullQuestionBankLoaded();
    setQuestionCount(allQuestions.length);
    if (modeParam === 'wrong') {
      const wrongIds = getWrongIds();
      const qs = allQuestions.filter((q) => wrongIds.includes(q.id));
      setPracticeQuestions(qs);
      if (qs.length === 0) setFinished(true);
    } else if (chapterParam) {
      const qs = getQuestionsByChapter(Number(chapterParam));
      setPracticeQuestions(qs);
    }
  });

  const startChapter = useCallback((chapterId: number) => {
    setCurrentChapter(chapterId);
    const qs = getQuestionsByChapter(chapterId);
    setPracticeQuestions(qs);
    setCurrentIndex(0);
    setPicked([]);
    setAnswered(false);
    setCorrectInSession(0);
    setFinished(false);
    setAiText('');
    setAiLoading(false);
  }, []);

  const finalizeAnswer = useCallback(
    (indices: number[]) => {
      const question = practiceQuestions[currentIndex];
      const isCorrect = isSelectionCorrect(indices, question);
      setAnswered(true);
      recordAnswer(isCorrect);
      if (isCorrect) {
        setCorrectInSession((prev) => prev + 1);
        removeWrongId(question.id);
      } else {
        addWrongId(question.id);
      }
    },
    [practiceQuestions, currentIndex]
  );

  const handleSelectSingle = useCallback(
    (optionIndex: number) => {
      if (answered) return;
      setPicked([optionIndex]);
      finalizeAnswer([optionIndex]);
    },
    [answered, finalizeAnswer]
  );

  const handleToggleMulti = useCallback(
    (optionIndex: number) => {
      if (answered) return;
      setPicked((prev) => {
        const s = new Set(prev);
        if (s.has(optionIndex)) s.delete(optionIndex);
        else s.add(optionIndex);
        return [...s].sort((a, b) => a - b);
      });
    },
    [answered]
  );

  const handleSubmitMulti = useCallback(() => {
    if (answered) return;
    const question = practiceQuestions[currentIndex];
    if (!isMultiQuestion(question)) return;
    finalizeAnswer(picked);
  }, [answered, practiceQuestions, currentIndex, picked, finalizeAnswer]);

  const handleNext = useCallback(() => {
    if (currentIndex + 1 >= practiceQuestions.length) {
      setFinished(true);
    } else {
      setCurrentIndex((prev) => prev + 1);
      setPicked([]);
      setAnswered(false);
      setAiText('');
      setAiLoading(false);
    }
  }, [currentIndex, practiceQuestions.length]);

  const handleBack = () => {
    if (isSubPage) {
      Taro.navigateBack();
    } else {
      setCurrentChapter(null);
      setFinished(false);
      setCurrentIndex(0);
      setPicked([]);
      setAnswered(false);
      setCorrectInSession(0);
      setAiText('');
    }
  };

  const goHome = () => {
    Taro.redirectTo({ url: '/pages/index/index' });
  };

  const handleAI = useCallback(async () => {
    if (!ensureAIConfigured()) return;
    if (aiText || aiLoading) return;
    const q = practiceQuestions[currentIndex];
    if (!q || picked.length === 0) return;

    setAiLoading(true);
    try {
      const result = await aiAnalyzeQuestion(
        q,
        isMultiQuestion(q) ? picked : picked[0]!
      );
      setAiText(result);
    } catch (e: any) {
      Taro.showToast({ title: e.message || 'AI 请求失败', icon: 'none' });
    } finally {
      setAiLoading(false);
    }
  }, [practiceQuestions, currentIndex, picked, aiText, aiLoading]);

  // ── Chapter Selection (Tab 主页模式) ──
  if (!currentChapter && modeParam !== 'wrong') {
    return (
      <View className='page page-with-tab'>
        <View className='page-header'>
          <Text className='page-header-title'>选择章节</Text>
          <Text className='page-header-desc'>选择一个章节开始练习</Text>
        </View>
        {chapters.map((ch) => {
          const total = getQuestionsByChapter(ch.id).length;
          return (
            <View
              key={ch.id}
              className='chapter-item'
              onClick={() => startChapter(ch.id)}
            >
              <View className='chapter-left'>
                <View
                  className='chapter-badge'
                  style={{ background: ch.color }}
                >
                  <Text className='chapter-badge-text'>{ch.icon}</Text>
                </View>
                <View className='chapter-text'>
                  <Text className='chapter-title'>{ch.name}</Text>
                  <Text className='chapter-sub'>{total} 道题目</Text>
                </View>
              </View>
              <Text className='chapter-arrow'>›</Text>
            </View>
          );
        })}
        {!isSubPage && <TabBar current={1} />}
      </View>
    );
  }

  // ── Finished ──
  if (finished) {
    const total = practiceQuestions.length;
    const rate = total > 0 ? Math.round((correctInSession / total) * 100) : 0;

    return (
      <View className='page'>
        <View className='finish-container'>
          <Text className='finish-mark'>完成</Text>
          <Text className='finish-title'>
            {total === 0 ? '暂无题目' : '练习完成！'}
          </Text>
          {total > 0 && (
            <View className='finish-stats'>
              <View className='finish-stat'>
                <Text className='finish-stat-value'>{total}</Text>
                <Text className='finish-stat-label'>总题数</Text>
              </View>
              <View className='finish-stat'>
                <Text className='finish-stat-value'>{correctInSession}</Text>
                <Text className='finish-stat-label'>答对</Text>
              </View>
              <View className='finish-stat'>
                <Text className='finish-stat-value'>{rate}%</Text>
                <Text className='finish-stat-label'>正确率</Text>
              </View>
            </View>
          )}
          <View className='finish-actions'>
            <View className='btn btn-outline' onClick={goHome}>
              <Text className='btn-text-outline'>回主页</Text>
            </View>
            <View className='btn btn-primary' onClick={handleBack}>
              <Text className='btn-text'>返回</Text>
            </View>
          </View>
        </View>
      </View>
    );
  }

  // ── Question View ──
  const question = practiceQuestions[currentIndex];
  if (!question) return null;

  const isCorrect = answered && isSelectionCorrect(picked, question);
  const chapterInfo = chapters.find((c) => c.id === question.chapter);
  const multi = isMultiQuestion(question);
  const correctSet = new Set(getCorrectIndicesSorted(question));

  return (
    <View className='practice-root'>
      <View className='practice-home-fixed'>
        <Text className='practice-home-btn' onClick={goHome}>
          ← 回主页
        </Text>
      </View>
      <ScrollView className='page practice-scroll-body' scrollY>
      {/* Progress */}
      <View className='progress-bar'>
        <View
          className='progress-fill'
          style={{
            width: `${((currentIndex + 1) / practiceQuestions.length) * 100}%`,
          }}
        />
      </View>

      <View className='question-header'>
        {chapterInfo && (
          <View
            className='question-tag'
            style={{ background: chapterInfo.color }}
          >
            <Text className='question-tag-text'>{chapterInfo.name}</Text>
          </View>
        )}
        <Text className='question-counter'>
          {currentIndex + 1} / {practiceQuestions.length}
        </Text>
      </View>

      <View className='question-content'>
        <Text className='question-text'>{question.content}</Text>
      </View>

      <View className='options'>
        {question.options.map((opt, idx) => {
          const optionLabel = String.fromCharCode(65 + idx);
          const inPick = picked.includes(idx);
          let cls = 'option';
          if (answered) {
            const isCorr = correctSet.has(idx);
            if (isCorr) cls += ' option-correct';
            else if (inPick) cls += ' option-wrong';
            else cls += ' option-disabled';
          } else if (inPick) {
            cls += ' option-selected';
          }

          return (
            <View
              key={idx}
              className={cls}
              onClick={() =>
                multi ? handleToggleMulti(idx) : handleSelectSingle(idx)
              }
            >
              <View className='option-label'>
                <Text className='option-label-text'>{optionLabel}</Text>
              </View>
              <Text className='option-text'>{opt}</Text>
            </View>
          );
        })}
      </View>

      {!answered && multi && (
        <View className='multi-submit-wrap'>
          <View className='btn btn-primary' onClick={handleSubmitMulti}>
            <Text className='btn-text'>提交答案</Text>
          </View>
        </View>
      )}

      {answered && (
        <View className='result-section'>
          <View className={`result-banner ${isCorrect ? 'correct' : 'wrong'}`}>
            <Text className='result-banner-text'>
              {isCorrect ? '回答正确' : '回答错误'}
            </Text>
          </View>
          <View className='explanation'>
            <Text className='explanation-title'>解析</Text>
            <Text className='explanation-text'>{question.explanation}</Text>
          </View>

          {!isCorrect && !aiText && (
            <View className='ai-btn' onClick={handleAI}>
              {aiLoading ? (
                <Text className='ai-btn-text'>分析中…</Text>
              ) : (
                <Text className='ai-btn-text'>AI 深度解析</Text>
              )}
            </View>
          )}

          {aiText && (
            <View className='ai-result'>
              <Text className='ai-result-title'>AI 解析</Text>
              <Text className='ai-result-text'>{aiText}</Text>
            </View>
          )}

          <View className='btn btn-primary' onClick={handleNext}>
            <Text className='btn-text'>
              {currentIndex + 1 >= practiceQuestions.length
                ? '查看结果'
                : '下一题'}
            </Text>
          </View>
        </View>
      )}
      </ScrollView>
    </View>
  );
}

export default PracticePage;
