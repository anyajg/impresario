import { View, Text, Input } from '@tarojs/components';
import Taro, { useDidShow } from '@tarojs/taro';
import { useState } from 'react';
import {
  chapters,
  getQuestionsByChapter,
  ensureFullQuestionBankLoaded,
  getAvailableQuestionCount,
  TRIAL_QUESTION_LIMIT,
} from '../../data/questions';
import {
  getStats,
  getWrongIds,
  getExamHistory,
  isInviteUnlocked,
  getAccessState,
  setAccessState,
  setUserKey,
} from '../../utils/storage';
import { redeemInviteCode, syncAccessStateFromServer } from '../../utils/access';
import { isAIConfigured } from '../../utils/ai';
import TabBar from '../../components/TabBar';
import './index.scss';

function IndexPage() {
  const [totalAnswered, setTotalAnswered] = useState(0);
  const [correctRate, setCorrectRate] = useState(0);
  const [wrongCount, setWrongCount] = useState(0);
  const [examCount, setExamCount] = useState(0);
  const [aiReady, setAiReady] = useState(false);
  const [questionCount, setQuestionCount] = useState(getAvailableQuestionCount());
  const [inviteCode, setInviteCode] = useState('');
  const [userKey, setUserKeyInput] = useState(getAccessState().userKey || '');
  const [unlocked, setUnlocked] = useState(isInviteUnlocked());

  useDidShow(async () => {
    const savedUserKey = getAccessState().userKey || '';
    if (savedUserKey) {
      setUserKeyInput(savedUserKey);
      await syncAccessStateFromServer(savedUserKey);
    }
    const nowUnlocked = isInviteUnlocked();
    setUnlocked(nowUnlocked);
    if (nowUnlocked) await ensureFullQuestionBankLoaded();
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
    setQuestionCount(getAvailableQuestionCount());
  });

  const handleActivate = async () => {
    setUserKey(userKey);
    const res = await redeemInviteCode({ userKey, inviteCode });
    if (!res.ok) {
      Taro.showToast({ title: res.message || '解锁失败', icon: 'none' });
      return;
    }
    setAccessState({
      unlocked: true,
      userKey: userKey.trim(),
      inviteCode: inviteCode.trim().toUpperCase(),
      activatedAt: new Date().toISOString(),
    });
    Taro.showToast({ title: '已解锁完整版', icon: 'success' });
    setUnlocked(true);
    await ensureFullQuestionBankLoaded();
    setQuestionCount(getAvailableQuestionCount());
    setInviteCode('');
  };

  return (
    <View className='page'>
      {/* Header */}
      <View className='header'>
        <View className='header-row'>
          <View className='header-mark'>
            <Text>演</Text>
          </View>
          <View className='header-text'>
            <Text className='header-title'>演出经纪人考试练习</Text>
            <Text className='header-desc'>题库与知识点，便于系统复习</Text>
          </View>
        </View>
      </View>

      {/* Stats */}
      <View className='stats-row'>
        <View className='stat-item'>
          <Text className='stat-value'>{questionCount}</Text>
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

      {!unlocked && (
        <View className='invite-card'>
          <Text className='invite-title'>体验版可免费练习 {TRIAL_QUESTION_LIMIT} 题</Text>
          <Text className='invite-desc'>输入用户标识与邀请码后解锁完整版题库</Text>
          <View className='invite-row'>
            <Input
              className='invite-input'
              value={userKey}
              placeholder='用户标识（手机号/邮箱）'
              onInput={(e) => setUserKeyInput(e.detail.value)}
            />
          </View>
          <View className='invite-row'>
            <Input
              className='invite-input'
              value={inviteCode}
              placeholder='请输入邀请码'
              onInput={(e) => setInviteCode(e.detail.value)}
            />
            <View className='invite-btn' onClick={handleActivate}>
              <Text className='invite-btn-text'>解锁</Text>
            </View>
          </View>
        </View>
      )}

      {/* Menu Cards */}
      <View className='section-title'>
        <Text>开始学习</Text>
      </View>

      <View
        className='card'
        onClick={() => Taro.redirectTo({ url: '/pages/practice/index' })}
      >
        <View className='card-left'>
          <View className='card-icon'>
            <Text className='card-icon-letter'>练</Text>
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
          <View className='card-icon'>
            <Text className='card-icon-letter'>知</Text>
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
          <View className='card-icon'>
            <Text className='card-icon-letter'>错</Text>
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
          <View className='card-icon'>
            <Text className='card-icon-letter'>考</Text>
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
          <View className='card-icon'>
            <Text className='card-icon-letter'>析</Text>
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
