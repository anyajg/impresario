import { View, Text, ScrollView } from '@tarojs/components';
import Taro, { useDidShow } from '@tarojs/taro';
import { useState } from 'react';
import { fetchAnalyticsSummary } from '../../utils/access';
import { getAccessState } from '../../utils/storage';
import './index.scss';

function AnalyticsPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [totals, setTotals] = useState({
    users: 0,
    redeems: 0,
    activeCodes: 0,
    questionBank: 0,
  });
  const [recent, setRecent] = useState<
    Array<{ code: string; userKey: string; platform: string; createdAt: string }>
  >([]);

  useDidShow(async () => {
    const userKey = (getAccessState().userKey || '').trim();
    if (!userKey) {
      setError('请先在首页输入邀请码专属昵称并完成验证');
      return;
    }

    setLoading(true);
    setError('');
    const resp = await fetchAnalyticsSummary(userKey);
    setLoading(false);

    if (!resp.ok || !resp.canAccess) {
      setError(resp.message || '无权限访问数据分析');
      return;
    }

    setTotals({
      users: resp.totals?.users || 0,
      redeems: resp.totals?.redeems || 0,
      activeCodes: resp.totals?.activeCodes || 0,
      questionBank: resp.totals?.questionBank || 0,
    });
    setRecent(resp.recentRedeems || []);
  });

  const fmt = (iso: string) => {
    if (!iso) return '-';
    try {
      return new Date(iso).toLocaleString();
    } catch {
      return iso;
    }
  };

  return (
    <ScrollView className='page' scrollY>
      <View className='hero'>
        <Text className='hero-title'>用户数据分析</Text>
        <Text className='hero-desc'>仅授权用户可见</Text>
      </View>

      {loading && (
        <View className='state-card'>
          <Text className='state-text'>加载中...</Text>
        </View>
      )}

      {!loading && !!error && (
        <View className='state-card'>
          <Text className='state-text state-error'>{error}</Text>
          <View className='back-btn' onClick={() => Taro.navigateBack()}>
            <Text className='back-btn-text'>返回</Text>
          </View>
        </View>
      )}

      {!loading && !error && (
        <View className='content'>
          <View className='grid'>
            <View className='metric-card'>
              <Text className='metric-value'>{totals.users}</Text>
              <Text className='metric-label'>总用户数</Text>
            </View>
            <View className='metric-card'>
              <Text className='metric-value'>{totals.redeems}</Text>
              <Text className='metric-label'>解锁总次数</Text>
            </View>
            <View className='metric-card'>
              <Text className='metric-value'>{totals.activeCodes}</Text>
              <Text className='metric-label'>可用邀请码</Text>
            </View>
            <View className='metric-card'>
              <Text className='metric-value'>{totals.questionBank}</Text>
              <Text className='metric-label'>题库总题数</Text>
            </View>
          </View>

          <View className='section-title'>
            <Text>最近兑换记录</Text>
          </View>
          {recent.length === 0 && (
            <View className='empty-row'>
              <Text className='empty-text'>暂无数据</Text>
            </View>
          )}
          {recent.map((it, idx) => (
            <View className='row' key={`${it.userKey}_${it.createdAt}_${idx}`}>
              <View className='row-top'>
                <Text className='row-code'>邀请码 {it.code || '-'}</Text>
                <Text className='row-platform'>{it.platform || 'unknown'}</Text>
              </View>
              <Text className='row-user'>{it.userKey || '-'}</Text>
              <Text className='row-time'>{fmt(it.createdAt)}</Text>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

export default AnalyticsPage;
