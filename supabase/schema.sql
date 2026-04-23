-- 邀请码最小可用数据结构（Supabase Postgres）
-- 执行前请确保数据库已启用 pgcrypto 扩展
create extension if not exists pgcrypto;

create table if not exists public.access_users (
  id uuid primary key default gen_random_uuid(),
  user_key text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.invite_codes (
  code text primary key,
  status text not null default 'active',
  max_uses int not null default 1,
  used_count int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.invite_redeems (
  id bigserial primary key,
  code text not null references public.invite_codes(code),
  user_id uuid not null references public.access_users(id),
  platform text not null default 'unknown',
  created_at timestamptz not null default now(),
  unique (code),
  unique (user_id)
);

-- 完整题库（仅服务端读取，前端通过 questions-page 分页获取）
create table if not exists public.question_bank (
  seq int primary key,
  chapter int not null,
  type text not null default 'single',
  content text not null,
  options jsonb not null,
  answer jsonb not null,
  explanation text not null default '',
  source text not null default '',
  created_at timestamptz not null default now(),
  constraint question_bank_type_check check (type in ('single', 'multi'))
);

create index if not exists idx_question_bank_chapter on public.question_bank(chapter);

-- 全站错题次数：每次答错记一行（用于 Top100 聚合）
create table if not exists public.question_mistakes (
  id bigserial primary key,
  user_id uuid not null references public.access_users(id) on delete cascade,
  question_id int not null,
  source text not null default 'practice',
  created_at timestamptz not null default now(),
  constraint question_mistakes_source_check check (source in ('practice', 'exam'))
);

create index if not exists idx_question_mistakes_qid on public.question_mistakes(question_id);
create index if not exists idx_question_mistakes_created on public.question_mistakes(created_at desc);

-- id 与 question_bank.seq：seq = question_id - 117（与应用内 AUTO_START_ID=118 一致）
create or replace function public.wrong_question_top100()
returns table (
  question_id int,
  mistake_count bigint,
  chapter int,
  content_preview text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    m.question_id,
    count(*)::bigint as mistake_count,
    coalesce(max(qb.chapter), 0)::int as chapter,
    left(coalesce(max(qb.content), ''), 120) as content_preview
  from public.question_mistakes m
  left join public.question_bank qb on qb.seq = m.question_id - 117
  group by m.question_id
  order by mistake_count desc, m.question_id asc
  limit 100;
$$;

create or replace function public.redeem_invite(
  p_code text,
  p_user_key text,
  p_platform text default 'unknown'
)
returns table (
  ok boolean,
  message text,
  invite_code text,
  activated_at timestamptz
)
language plpgsql
security definer
as $$
declare
  v_code text := upper(trim(p_code));
  v_user_key text := trim(p_user_key);
  v_user_id uuid;
  v_invite invite_codes%rowtype;
  v_prev invite_redeems%rowtype;
begin
  if v_code = '' then
    return query select false, '邀请码为空', null::text, null::timestamptz;
    return;
  end if;

  if v_user_key = '' then
    return query select false, '用户标识为空', null::text, null::timestamptz;
    return;
  end if;

  insert into public.access_users(user_key) values (v_user_key)
  on conflict (user_key) do update set user_key = excluded.user_key
  returning id into v_user_id;

  select * into v_prev from public.invite_redeems
  where user_id = v_user_id
  order by created_at asc
  limit 1;

  if found then
    return query select true, '已解锁', v_prev.code, v_prev.created_at;
    return;
  end if;

  -- 与存储大小写无关：输入已 upper，这里用 upper(trim(code)) 匹配主键实际写法
  select * into v_invite from public.invite_codes
  where upper(trim(code)) = v_code and status = 'active'
  for update;

  if not found then
    return query select false, '邀请码无效或已停用', null::text, null::timestamptz;
    return;
  end if;

  if v_invite.used_count >= v_invite.max_uses then
    return query select false, '邀请码已被使用', null::text, null::timestamptz;
    return;
  end if;

  insert into public.invite_redeems(code, user_id, platform)
  values (v_invite.code, v_user_id, coalesce(nullif(trim(p_platform), ''), 'unknown'));

  update public.invite_codes
  set used_count = used_count + 1
  where code = v_invite.code;

  return query select true, '解锁成功', v_invite.code, now();
end;
$$;

create or replace function public.access_status(p_user_key text)
returns table (
  unlocked boolean,
  invite_code text,
  activated_at timestamptz
)
language sql
security definer
as $$
  select
    (r.id is not null) as unlocked,
    r.code as invite_code,
    r.created_at as activated_at
  from public.access_users u
  left join public.invite_redeems r on r.user_id = u.id
  where u.user_key = trim(p_user_key)
  order by r.created_at asc
  limit 1;
$$;

-- 可选：预置邀请码（示例）
insert into public.invite_codes(code, status, max_uses)
values
  ('VIP2026A', 'active', 1),
  ('VIP2026B', 'active', 1)
on conflict (code) do nothing;
