-- 全站错题 Top100：表 + 聚合函数（可重复执行）
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
