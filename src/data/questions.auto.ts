import type { Question } from './questions.types';
import raw from './questions.auto.json';

type AutoJsonRoot = {
  version: number;
  count: number;
  items: Array<{
    chapter: number;
    type: 'single' | 'multi';
    content: string;
    options: string[];
    answer: number | number[];
    explanation: string;
    source: string;
  }>;
};

/** 与 questions.imported 最后一题 id=117 衔接 */
const AUTO_START_ID = 118;

export const autoQuestions: Question[] = (raw as AutoJsonRoot).items.map((it, i) => ({
  id: AUTO_START_ID + i,
  chapter: it.chapter,
  ...(it.type === 'multi' ? { type: 'multi' as const } : {}),
  content: it.content,
  options: it.options,
  answer: it.answer,
  explanation: it.explanation.includes('【来源】')
    ? it.explanation
    : `${it.explanation}\n\n【来源】${it.source}`,
}));
