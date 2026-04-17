export interface KnowledgeArticle {
  id: number;
  chapter: number;
  title: string;
  content: string;
  source: string;
}

const CHAPTER_NAMES: Record<number, string> = {
  1: '政策法规',
  2: '经纪基础',
  3: '经纪实务',
  4: '安全管理',
};

// 小程序包体受限（主包/分包 2MB），此处提供轻量版知识点入口说明。
export const knowledgeArticles: KnowledgeArticle[] = [
  {
    id: 1,
    chapter: 1,
    title: '知识点（小程序精简版）',
    content:
      '当前小程序为精简包，仅保留练题核心能力。完整知识点正文请使用网页版查看（首页「知识点」入口对应的 H5 版本）。',
    source: '系统说明',
  },
];

export function getKnowledgeById(id: number): KnowledgeArticle | undefined {
  return knowledgeArticles.find((a) => a.id === id);
}

export function getChapterLabel(chapterId: number): string {
  return CHAPTER_NAMES[chapterId] ?? '综合';
}
