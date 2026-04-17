import raw from './knowledge.json';

export interface KnowledgeArticle {
  id: number;
  chapter: number;
  title: string;
  content: string;
  source: string;
}

type Root = { version: number; items: KnowledgeArticle[] };

const root = raw as Root;

export const knowledgeArticles: KnowledgeArticle[] = root.items;

const CHAPTER_NAMES: Record<number, string> = {
  1: '政策法规',
  2: '经纪基础',
  3: '经纪实务',
  4: '安全管理',
};

export function getKnowledgeById(id: number): KnowledgeArticle | undefined {
  return knowledgeArticles.find((a) => a.id === id);
}

export function getChapterLabel(chapterId: number): string {
  return CHAPTER_NAMES[chapterId] ?? '综合';
}
