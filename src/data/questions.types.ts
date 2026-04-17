export type QuestionChoiceType = 'single' | 'multi';

export interface Question {
  id: number;
  chapter: number;
  content: string;
  options: string[];
  /**
   * 题型；省略时视为单选（与历史数据兼容）。
   * 多选题请显式设置 `type: 'multi'`，且 `answer` 为下标数组（顺序无关，比较时会规范化）。
   */
  type?: QuestionChoiceType;
  /** 单选：一个选项下标；多选：全部正确选项下标（无序） */
  answer: number | number[];
  explanation: string;
}

export interface Chapter {
  id: number;
  name: string;
  icon: string;
  color: string;
}

/** 是否多选题（显式 type 或 answer 为数组） */
export function isMultiQuestion(q: Question): boolean {
  if (q.type === 'multi') return true;
  if (Array.isArray(q.answer)) return true;
  return false;
}

/** 正确答案下标，升序去重 */
export function getCorrectIndicesSorted(q: Question): number[] {
  const raw = Array.isArray(q.answer) ? q.answer : [q.answer];
  return [...new Set(raw)].sort((a, b) => a - b);
}

/** 将用户作答规范为升序去重数组；未作答为 null */
export function normalizeUserSelection(
  user: number | number[] | null | undefined
): number[] | null {
  if (user === null || user === undefined) return null;
  const arr = Array.isArray(user) ? user : [user];
  return [...new Set(arr)].sort((a, b) => a - b);
}

/** 集合完全一致（全对或全错，无部分分） */
export function isSelectionCorrect(
  user: number | number[] | null | undefined,
  q: Question
): boolean {
  const u = normalizeUserSelection(user);
  if (!u) return false;
  const c = getCorrectIndicesSorted(q);
  if (u.length !== c.length) return false;
  return u.every((v, i) => v === c[i]);
}
