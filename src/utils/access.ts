import Taro from '@tarojs/taro';
import { accessConfig } from '../config/accessConfig';
import { getAccessState, setAccessState } from './storage';

type ApiResp = {
  ok: boolean;
  message?: string;
  unlocked?: boolean;
  inviteCode?: string;
  activatedAt?: string;
};

export type QuestionPageItem = {
  id: number;
  chapter: number;
  type: 'single' | 'multi';
  content: string;
  options: string[];
  answer: number | number[];
  explanation: string;
  source: string;
};

type QuestionPageResp = ApiResp & {
  page?: number;
  pageSize?: number;
  total?: number;
  items?: QuestionPageItem[];
};

export type AnalyticsSummaryResp = ApiResp & {
  canAccess?: boolean;
  totals?: {
    users: number;
    redeems: number;
    activeCodes: number;
    questionBank: number;
  };
  recentRedeems?: Array<{
    code: string;
    userKey: string;
    platform: string;
    createdAt: string;
  }>;
  usableInviteCodes?: Array<{
    code: string;
    maxUses: number;
    usedCount: number;
    status: string;
  }>;
};

function isConfigured() {
  return !!(accessConfig.apiBaseUrl && accessConfig.anonKey);
}

async function post(path: string, data: Record<string, unknown>): Promise<ApiResp> {
  const url = `${accessConfig.apiBaseUrl.replace(/\/$/, '')}/${path.replace(/^\//, '')}`;
  const res = await Taro.request({
    url,
    method: 'POST',
    header: {
      'Content-Type': 'application/json',
      apikey: accessConfig.anonKey,
    },
    data,
    timeout: 15000,
  });

  if (res.statusCode < 200 || res.statusCode >= 300) {
    return { ok: false, message: `服务异常 (${res.statusCode})` };
  }
  return (res.data || { ok: false, message: '响应为空' }) as ApiResp;
}

export async function redeemInviteCode(params: {
  userKey: string;
  inviteCode: string;
}): Promise<ApiResp> {
  if (!isConfigured()) return { ok: false, message: '邀请码服务未配置' };
  const userKey = params.userKey.trim();
  const inviteCode = params.inviteCode.trim().toUpperCase();
  if (!userKey) return { ok: false, message: '请输入邀请码专属昵称' };
  if (!inviteCode) return { ok: false, message: '请输入邀请码' };

  return post('redeem-invite', {
    userKey,
    inviteCode,
    platform: process.env.TARO_ENV || 'unknown',
  });
}

export async function syncAccessStateFromServer(userKey: string): Promise<boolean> {
  if (!isConfigured()) return false;
  if (!userKey.trim()) return false;
  const resp = await post('access-status', { userKey: userKey.trim() });
  if (!resp.ok) return false;
  const prev = getAccessState();
  setAccessState({
    ...prev,
    userKey: userKey.trim(),
    unlocked: !!resp.unlocked,
    inviteCode: resp.inviteCode || prev.inviteCode,
    activatedAt: resp.activatedAt || prev.activatedAt,
  });
  return !!resp.unlocked;
}

export async function fetchQuestionPage(params: {
  userKey: string;
  page: number;
  pageSize: number;
}): Promise<QuestionPageResp> {
  if (!isConfigured()) return { ok: false, message: '题库服务未配置' };
  const userKey = params.userKey.trim();
  const page = Math.max(1, Math.floor(params.page || 1));
  const pageSize = Math.max(1, Math.min(200, Math.floor(params.pageSize || 100)));
  if (!userKey) return { ok: false, message: '请输入邀请码专属昵称' };
  return post('questions-page', { userKey, page, pageSize }) as Promise<QuestionPageResp>;
}

export async function checkAnalyticsAccess(userKey: string): Promise<boolean> {
  if (!isConfigured()) return false;
  const key = userKey.trim();
  if (!key) return false;
  const resp = (await post('analytics-summary', {
    userKey: key,
    checkOnly: true,
  })) as AnalyticsSummaryResp;
  return !!(resp.ok && resp.canAccess);
}

export async function fetchAnalyticsSummary(
  userKey: string
): Promise<AnalyticsSummaryResp> {
  if (!isConfigured()) return { ok: false, message: '数据分析服务未配置' };
  const key = userKey.trim();
  if (!key) return { ok: false, message: '请输入邀请码专属昵称' };
  return post('analytics-summary', { userKey: key }) as Promise<AnalyticsSummaryResp>;
}
