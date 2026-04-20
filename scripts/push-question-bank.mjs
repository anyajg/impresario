#!/usr/bin/env node

import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const projectUrl = process.env.PROJECT_URL;
const serviceRoleKey = process.env.SERVICE_ROLE_KEY;

if (!projectUrl || !serviceRoleKey) {
  console.error('缺少环境变量 PROJECT_URL 或 SERVICE_ROLE_KEY');
  process.exit(1);
}

const filePath = resolve(process.cwd(), 'src/data/questions.auto.json');
const raw = await readFile(filePath, 'utf8');
const root = JSON.parse(raw);
const items = Array.isArray(root?.items) ? root.items : [];

if (items.length === 0) {
  console.error('questions.auto.json 中没有可导入的数据');
  process.exit(1);
}

const payload = items.map((it, index) => ({
  seq: index + 1,
  chapter: Number(it.chapter),
  type: it.type === 'multi' ? 'multi' : 'single',
  content: String(it.content || ''),
  options: Array.isArray(it.options) ? it.options : [],
  answer: it.answer,
  explanation: String(it.explanation || ''),
  source: String(it.source || ''),
}));

async function request(path, init) {
  const resp = await fetch(`${projectUrl}${path}`, {
    ...init,
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
    },
  });
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`HTTP ${resp.status}: ${text}`);
  }
  return resp;
}

console.log(`准备导入 ${payload.length} 条题目到 question_bank...`);
await request('/rest/v1/question_bank?seq=gt.0&select=seq', {
  method: 'DELETE',
  headers: { Prefer: 'return=minimal' },
});

const BATCH_SIZE = 200;
for (let i = 0; i < payload.length; i += BATCH_SIZE) {
  const chunk = payload.slice(i, i + BATCH_SIZE);
  await request('/rest/v1/question_bank', {
    method: 'POST',
    headers: {
      Prefer: 'resolution=merge-duplicates,return=minimal',
    },
    body: JSON.stringify(chunk),
  });
  console.log(`已写入 ${Math.min(i + BATCH_SIZE, payload.length)}/${payload.length}`);
}

console.log('导入完成。');
