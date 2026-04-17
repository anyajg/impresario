import { View, Text, ScrollView } from '@tarojs/components';
import Taro, { useDidShow, useReady } from '@tarojs/taro';
import { useState } from 'react';
import { getKnowledgeById, getChapterLabel } from '../../data/knowledgeArticles';
import type { KnowledgeArticle } from '../../data/knowledgeArticles';
import './detail.scss';

function KnowledgeDetailPage() {
  const [article, setArticle] = useState<KnowledgeArticle | null>(null);

  const load = () => {
    const id = Number(Taro.getCurrentInstance().router?.params?.id ?? 0);
    const a = getKnowledgeById(id);
    setArticle(a ?? null);
    if (a) {
      Taro.setNavigationBarTitle({ title: a.title.slice(0, 18) + (a.title.length > 18 ? '…' : '') });
    }
  };

  useReady(load);
  useDidShow(load);

  if (!article) {
    return (
      <View className='page knowledge-detail'>
        <Text className='knowledge-empty'>未找到该篇内容</Text>
      </View>
    );
  }

  return (
    <View className='page knowledge-detail'>
      <View className='knowledge-detail-meta'>
        <Text className='knowledge-detail-chip'>{getChapterLabel(article.chapter)}</Text>
        <Text className='knowledge-detail-src'>来源：{article.source}</Text>
      </View>
      <Text className='knowledge-detail-h1'>{article.title}</Text>
      <ScrollView scrollY className='knowledge-detail-body-wrap'>
        <Text className='knowledge-detail-body' selectable>
          {article.content}
        </Text>
      </ScrollView>
    </View>
  );
}

export default KnowledgeDetailPage;
