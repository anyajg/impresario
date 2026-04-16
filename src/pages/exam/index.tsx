import { View, Text, ScrollView } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { useState, useEffect, useCallback, useRef } from 'react';
import { getRandomQuestions, chapters, type Question } from '../../data/questions';
import { saveExamResult } from '../../utils/storage';
import TabBar from '../../components/TabBar';
import './index.scss';

const EXAM_COUNT = 20;
const EXAM_TIME = 30 * 60; // 30 minutes

function ExamPage() {
  const [started, setStarted] = useState(false);
  const [examQuestions, setExamQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [timeLeft, setTimeLeft] = useState(EXAM_TIME);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef(0);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const startExam = useCallback(() => {
    const qs = getRandomQuestions(EXAM_COUNT);
    setExamQuestions(qs);
    setAnswers({});
    setCurrentIndex(0);
    setTimeLeft(EXAM_TIME);
    setStarted(true);
    startTimeRef.current = Date.now();

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  // Auto-submit when time's up
  useEffect(() => {
    if (started && timeLeft === 0) {
      handleSubmit();
    }
  }, [timeLeft, started]);

  const handleSelect = (questionId: number, optionIndex: number) => {
    setAnswers((prev) => ({ ...prev, [questionId]: optionIndex }));
  };

  const handleSubmit = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);

    const duration = Math.round((Date.now() - startTimeRef.current) / 1000);
    let correctCount = 0;
    const answerRecord: Record<string, number> = {};

    examQuestions.forEach((q) => {
      const userAnswer = answers[q.id];
      answerRecord[String(q.id)] = userAnswer ?? -1;
      if (userAnswer === q.answer) correctCount++;
    });

    const result = {
      score: Math.round((correctCount / examQuestions.length) * 100),
      total: examQuestions.length,
      correctCount,
      answers: answerRecord,
      date: new Date().toISOString(),
      duration,
    };

    saveExamResult(result);
    Taro.redirectTo({ url: '/pages/examResult/index' });
  }, [examQuestions, answers]);

  const confirmSubmit = () => {
    const unanswered = examQuestions.length - Object.keys(answers).length;
    if (unanswered > 0) {
      Taro.showModal({
        title: '确认交卷',
        content: `还有 ${unanswered} 题未作答，确定交卷吗？`,
        success(res) {
          if (res.confirm) handleSubmit();
        },
      });
    } else {
      Taro.showModal({
        title: '确认交卷',
        content: '确定要提交试卷吗？',
        success(res) {
          if (res.confirm) handleSubmit();
        },
      });
    }
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  // ── Start Screen ──
  if (!started) {
    return (
      <View className='page'>
        <View className='start-container'>
          <Text className='start-emoji'>📝</Text>
          <Text className='start-title'>模拟考试</Text>
          <View className='start-rules'>
            <View className='rule-item'>
              <Text className='rule-label'>题目数量</Text>
              <Text className='rule-value'>{EXAM_COUNT} 道</Text>
            </View>
            <View className='rule-item'>
              <Text className='rule-label'>考试时间</Text>
              <Text className='rule-value'>{EXAM_TIME / 60} 分钟</Text>
            </View>
            <View className='rule-item'>
              <Text className='rule-label'>题目类型</Text>
              <Text className='rule-value'>随机抽题</Text>
            </View>
            <View className='rule-item'>
              <Text className='rule-label'>及格分数</Text>
              <Text className='rule-value'>60 分</Text>
            </View>
          </View>
          <Text className='start-tip'>
            开始后将自动计时，到时间将自动交卷
          </Text>
          <View className='btn btn-primary' onClick={startExam}>
            <Text className='btn-text'>开始考试</Text>
          </View>
        </View>
        <TabBar current={3} />
      </View>
    );
  }

  // ── Exam Screen ──
  const question = examQuestions[currentIndex];
  if (!question) return null;

  const answeredCount = Object.keys(answers).length;
  const chapterInfo = chapters.find((c) => c.id === question.chapter);
  const isUrgent = timeLeft <= 300;

  return (
    <View className='page exam-page'>
      {/* Timer Bar */}
      <View className={`timer-bar ${isUrgent ? 'urgent' : ''}`}>
        <Text className='timer-text'>⏱ {formatTime(timeLeft)}</Text>
        <Text className='timer-progress'>
          已答 {answeredCount}/{examQuestions.length}
        </Text>
      </View>

      <ScrollView className='exam-body' scrollY>
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
            第 {currentIndex + 1} / {examQuestions.length} 题
          </Text>
        </View>

        <View className='question-content'>
          <Text className='question-text'>{question.content}</Text>
        </View>

        <View className='options'>
          {question.options.map((opt, idx) => {
            const label = String.fromCharCode(65 + idx);
            const selected = answers[question.id] === idx;
            return (
              <View
                key={idx}
                className={`option ${selected ? 'option-selected' : ''}`}
                onClick={() => handleSelect(question.id, idx)}
              >
                <View
                  className={`option-label ${selected ? 'option-label-active' : ''}`}
                >
                  <Text className='option-label-text'>{label}</Text>
                </View>
                <Text className='option-text'>{opt}</Text>
              </View>
            );
          })}
        </View>
      </ScrollView>

      {/* Navigation */}
      <View className='nav-bar'>
        <View
          className={`nav-btn ${currentIndex === 0 ? 'nav-btn-disabled' : ''}`}
          onClick={() => currentIndex > 0 && setCurrentIndex(currentIndex - 1)}
        >
          <Text className='nav-btn-text'>上一题</Text>
        </View>

        {currentIndex < examQuestions.length - 1 ? (
          <View
            className='nav-btn nav-btn-primary'
            onClick={() => setCurrentIndex(currentIndex + 1)}
          >
            <Text className='nav-btn-text-light'>下一题</Text>
          </View>
        ) : (
          <View className='nav-btn nav-btn-submit' onClick={confirmSubmit}>
            <Text className='nav-btn-text-light'>交卷</Text>
          </View>
        )}
      </View>

      {/* Question Grid */}
      <View className='grid-bar'>
        <ScrollView scrollX className='grid-scroll'>
          <View className='grid'>
            {examQuestions.map((q, idx) => {
              let cls = 'grid-item';
              if (idx === currentIndex) cls += ' grid-current';
              else if (answers[q.id] !== undefined) cls += ' grid-answered';
              return (
                <View
                  key={q.id}
                  className={cls}
                  onClick={() => setCurrentIndex(idx)}
                >
                  <Text className='grid-item-text'>{idx + 1}</Text>
                </View>
              );
            })}
          </View>
        </ScrollView>
      </View>
    </View>
  );
}

export default ExamPage;
