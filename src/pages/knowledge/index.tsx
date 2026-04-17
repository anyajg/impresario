import { View, Text, ScrollView } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { useMemo } from 'react';
import {
  knowledgeArticles,
  getChapterLabel,
  type KnowledgeArticle,
} from '../../data/knowledgeArticles';
import './index.scss';

function groupByChapter(items: KnowledgeArticle[]) {
  const map = new Map<number, KnowledgeArticle[]>();
  for (const a of items) {
    const list = map.get(a.chapter) ?? [];
    list.push(a);
    map.set(a.chapter, list);
  }
  return [...map.entries()].sort((a, b) => a[0] - b[0]);
}

function KnowledgePage() {
  const grouped = useMemo(() => groupByChapter(knowledgeArticles), []);

  return (
    <View className='page knowledge-page'>
      <View className='knowledge-hero'>
        <Text className='knowledge-hero-icon'>📖</Text>
        <Text className='knowledge-hero-title'>知识点</Text>
        <Text className='knowledge-hero-desc'>
          摘自备考资料《经纪人考试考点》，按章节归类，便于与题库对照复习。
        </Text>
      </View>

      <ScrollView scrollY className='knowledge-scroll'>
        {grouped.map(([chapterId, list]) => (
          <View key={chapterId} className='knowledge-section'>
            <View className='knowledge-section-head'>
              <Text className='knowledge-section-name'>{getChapterLabel(chapterId)}</Text>
              <Text className='knowledge-section-count'>{list.length} 篇</Text>
            </View>
            {list.map((a) => (
              <View
                key={a.id}
                className='knowledge-row'
                onClick={() =>
                  Taro.navigateTo({ url: `/pages/knowledge/detail?id=${a.id}` })
                }
              >
                <View className='knowledge-row-main'>
                  <Text className='knowledge-row-title'>{a.title}</Text>
                  <Text className='knowledge-row-preview'>
                    {a.content.replace(/\s+/g, ' ').slice(0, 56)}
                    …
                  </Text>
                </View>
                <Text className='knowledge-row-arrow'>›</Text>
              </View>
            ))}
          </View>
        ))}
      </ScrollView>

      <View className='knowledge-foot'>
        <Text className='knowledge-foot-link' onClick={() => Taro.navigateBack()}>
          ← 返回
        </Text>
        <Text
          className='knowledge-foot-link primary'
          onClick={() => Taro.redirectTo({ url: '/pages/index/index' })}
        >
          回首页
        </Text>
      </View>
    </View>
  );
}

export default KnowledgePage;
