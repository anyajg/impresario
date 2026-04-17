import { View, Text } from '@tarojs/components';
import Taro, { useDidShow } from '@tarojs/taro';
import { useState } from 'react';
import { questions, chapters, getQuestionsByChapter } from '../../data/questions';
import { getStats, getWrongIds, getExamHistory } from '../../utils/storage';
import { isAIConfigured } from '../../utils/ai';
import TabBar from '../../components/TabBar';
import './index.scss';

function IndexPage() {
  const [totalAnswered, setTotalAnswered] = useState(0);
  const [correctRate, setCorrectRate] = useState(0);
  const [wrongCount, setWrongCount] = useState(0);
  const [examCount, setExamCount] = useState(0);
  const [aiReady, setAiReady] = useState(false);

  useDidShow(() => {
    const stats = getStats();
    setTotalAnswered(stats.totalAnswered);
    setCorrectRate(
      stats.totalAnswered > 0
        ? Math.round((stats.correctCount / stats.totalAnswered) * 100)
        : 0
    );
    setWrongCount(getWrongIds().length);
    setExamCount(getExamHistory().length);
    setAiReady(isAIConfigured());
  });

  return (
    <View className='page'>
      {/* Header */}
      <View className='header'>
        <Text className='header-icon'>🎭</Text>
        <Text className='header-title'>演出经纪人考试练习</Text>
        <Text className='header-desc'>系统学习 · 高效备考</Text>
      </View>

      {/* Stats */}
      <View className='stats-row'>
        <View className='stat-item'>
          <Text className='stat-value'>{questions.length}</Text>
          <Text className='stat-label'>总题数</Text>
        </View>
        <View className='stat-divider' />
        <View className='stat-item'>
          <Text className='stat-value'>{totalAnswered}</Text>
          <Text className='stat-label'>已练习</Text>
        </View>
        <View className='stat-divider' />
        <View className='stat-item'>
          <Text className='stat-value'>{correctRate}%</Text>
          <Text className='stat-label'>正确率</Text>
        </View>
        <View className='stat-divider' />
        <View className='stat-item'>
          <Text className='stat-value'>{wrongCount}</Text>
          <Text className='stat-label'>错题</Text>
        </View>
      </View>

      {/* Menu Cards */}
      <View className='section-title'>
        <Text>开始学习</Text>
      </View>

      <View
        className='card'
        onClick={() => Taro.redirectTo({ url: '/pages/practice/index' })}
      >
        <View className='card-left'>
          <View className='card-icon' style={{ background: '#EEF2FF' }}>
            <Text>📚</Text>
          </View>
          <View className='card-info'>
            <Text className='card-title'>章节练习</Text>
            <Text className='card-desc'>按章节顺序学习，夯实基础</Text>
          </View>
        </View>
        <Text className='card-arrow'>›</Text>
      </View>

      <View
        className='card'
        onClick={() => Taro.navigateTo({ url: '/pages/knowledge/index' })}
      >
        <View className='card-left'>
          <View className='card-icon' style={{ background: '#ECFEFF' }}>
            <Text>📖</Text>
          </View>
          <View className='card-info'>
            <Text className='card-title'>知识点</Text>
            <Text className='card-desc'>法规、舞台、经纪实务等纲要精读</Text>
          </View>
        </View>
        <Text className='card-arrow'>›</Text>
      </View>

      <View
        className='card'
        onClick={() => Taro.redirectTo({ url: '/pages/wrongBook/index' })}
      >
        <View className='card-left'>
          <View className='card-icon' style={{ background: '#FEF2F2' }}>
            <Text>❌</Text>
          </View>
          <View className='card-info'>
            <Text className='card-title'>错题本</Text>
            <Text className='card-desc'>
              {wrongCount > 0 ? `${wrongCount} 道错题待复习` : '暂无错题，继续加油'}
            </Text>
          </View>
        </View>
        <Text className='card-arrow'>›</Text>
      </View>

      <View
        className='card'
        onClick={() => Taro.redirectTo({ url: '/pages/exam/index' })}
      >
        <View className='card-left'>
          <View className='card-icon' style={{ background: '#F0FDF4' }}>
            <Text>📝</Text>
          </View>
          <View className='card-info'>
            <Text className='card-title'>模拟考试</Text>
            <Text className='card-desc'>
              {examCount > 0 ? `已考 ${examCount} 次` : '限时模考，检验学习成果'}
            </Text>
          </View>
        </View>
        <Text className='card-arrow'>›</Text>
      </View>

      {/* AI Settings */}
      <View
        className='card'
        onClick={() => Taro.navigateTo({ url: '/pages/aiSettings/index' })}
      >
        <View className='card-left'>
          <View className='card-icon' style={{ background: '#F5F3FF' }}>
            <Text>🤖</Text>
          </View>
          <View className='card-info'>
            <Text className='card-title'>AI 智能解析</Text>
            <Text className='card-desc'>
              {aiReady ? 'AI 已配置，可在错题本中使用' : '配置 AI 接口，获取深度解析'}
            </Text>
          </View>
        </View>
        <View className={`ai-badge ${aiReady ? 'ai-badge-on' : ''}`}>
          <Text className='ai-badge-text'>{aiReady ? '已开启' : '未配置'}</Text>
        </View>
      </View>

      {/* Chapter Progress */}
      <View className='section-title'>
        <Text>章节概览</Text>
      </View>

      {chapters.map((ch) => {
        const total = getQuestionsByChapter(ch.id).length;
        return (
          <View
            key={ch.id}
            className='chapter-card'
            onClick={() =>
              Taro.navigateTo({ url: `/pages/practice/index?chapter=${ch.id}` })
            }
          >
            <View className='chapter-header'>
              <Text className='chapter-icon'>{ch.icon}</Text>
              <Text className='chapter-name'>{ch.name}</Text>
            </View>
            <Text className='chapter-count'>{total} 题</Text>
          </View>
        );
      })}

      <View className='footer'>
        <Text className='footer-text'>题库数据仅供练习参考</Text>
      </View>

      <TabBar current={0} />
    </View>
  );
}

export default IndexPage;
