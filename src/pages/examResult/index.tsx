import { View, Text, ScrollView } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { useState, useEffect } from 'react';
import {
  getQuestionById,
  chapters,
  isMultiQuestion,
  getCorrectIndicesSorted,
  isSelectionCorrect,
} from '../../data/questions';
import {
  getExamResult,
  type ExamResult,
  type ExamStoredAnswer,
} from '../../utils/storage';
import './index.scss';

function labelsForIndices(q: { options: string[] }, indices: number[]): string {
  return indices
    .map((i) => `${String.fromCharCode(65 + i)}. ${q.options[i]}`)
    .join('；');
}

function parseExamUserAnswer(raw: ExamStoredAnswer): number | number[] | null {
  if (raw === -1) return null;
  return raw;
}

function ExamResultPage() {
  const [result, setResult] = useState<ExamResult | null>(null);

  useEffect(() => {
    const r = getExamResult();
    setResult(r);
  }, []);

  if (!result) return null;

  const passed = result.score >= 60;
  const minutes = Math.floor(result.duration / 60);
  const seconds = result.duration % 60;

  const questionDetails = Object.entries(result.answers).map(
    ([idStr, userAnswerRaw]) => {
      const q = getQuestionById(Number(idStr));
      return { question: q, userAnswer: parseExamUserAnswer(userAnswerRaw) };
    }
  );

  return (
    <ScrollView className='page' scrollY>
      {/* Score Header */}
      <View className={`score-header ${passed ? 'passed' : 'failed'}`}>
        <Text className='score-emoji'>{passed ? '🎉' : '💪'}</Text>
        <Text className='score-value'>{result.score}</Text>
        <Text className='score-label'>分</Text>
        <Text className='score-status'>
          {passed ? '恭喜通过！' : '继续努力！'}
        </Text>
      </View>

      {/* Stats */}
      <View className='result-stats'>
        <View className='result-stat'>
          <Text className='result-stat-value'>{result.total}</Text>
          <Text className='result-stat-label'>总题数</Text>
        </View>
        <View className='result-stat'>
          <Text className='result-stat-value correct-color'>
            {result.correctCount}
          </Text>
          <Text className='result-stat-label'>答对</Text>
        </View>
        <View className='result-stat'>
          <Text className='result-stat-value wrong-color'>
            {result.total - result.correctCount}
          </Text>
          <Text className='result-stat-label'>答错</Text>
        </View>
        <View className='result-stat'>
          <Text className='result-stat-value'>
            {minutes}:{String(seconds).padStart(2, '0')}
          </Text>
          <Text className='result-stat-label'>用时</Text>
        </View>
      </View>

      {/* Detail */}
      <View className='detail-title'>
        <Text className='detail-title-text'>答题详情</Text>
      </View>

      {questionDetails.map(({ question: q, userAnswer }, idx) => {
        if (!q) return null;
        const isCorrect = isSelectionCorrect(userAnswer, q);
        const ch = chapters.find((c) => c.id === q.chapter);
        const correctIdx = getCorrectIndicesSorted(q);
        const correctText = labelsForIndices(q, correctIdx);
        const unanswered = userAnswer === null;

        return (
          <View key={q.id} className='detail-card'>
            <View className='detail-header'>
              <View className='detail-left'>
                <Text className={`detail-status ${isCorrect ? 'correct' : 'wrong'}`}>
                  {isCorrect ? '✓' : '✗'}
                </Text>
                <Text className='detail-index'>第 {idx + 1} 题</Text>
                {isMultiQuestion(q) && (
                  <View className='detail-tag detail-tag-multi'>
                    <Text className='detail-tag-text'>多选</Text>
                  </View>
                )}
                {ch && (
                  <View className='detail-tag' style={{ background: ch.color }}>
                    <Text className='detail-tag-text'>{ch.name}</Text>
                  </View>
                )}
              </View>
            </View>
            <Text className='detail-question'>{q.content}</Text>
            <View className='detail-answers'>
              {!isCorrect && !unanswered && (
                <Text className='detail-user-answer'>
                  你的答案：
                  {Array.isArray(userAnswer)
                    ? labelsForIndices(q, userAnswer)
                    : `${String.fromCharCode(65 + userAnswer)}. ${q.options[userAnswer]}`}
                </Text>
              )}
              {!isCorrect && unanswered && (
                <Text className='detail-user-answer'>未作答</Text>
              )}
              <Text className='detail-correct-answer'>
                正确答案：{correctText}
              </Text>
            </View>
            {!isCorrect && (
              <View className='detail-explanation'>
                <Text className='detail-explanation-text'>
                  {q.explanation}
                </Text>
              </View>
            )}
          </View>
        );
      })}

      {/* Actions */}
      <View className='result-actions'>
        <View
          className='btn btn-primary'
          onClick={() => Taro.reLaunch({ url: '/pages/index/index' })}
        >
          <Text className='btn-text'>返回首页</Text>
        </View>
        <View
          className='btn btn-outline'
          onClick={() =>
            Taro.redirectTo({ url: '/pages/exam/index' })
          }
        >
          <Text className='btn-outline-text'>再考一次</Text>
        </View>
      </View>

      <View className='bottom-space' />
    </ScrollView>
  );
}

export default ExamResultPage;
