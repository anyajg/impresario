import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SOURCE_SET = new Set(['practice', 'exam']);

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ ok: false, message: 'Method Not Allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const supabaseUrl = Deno.env.get('PROJECT_URL') || '';
  const serviceRoleKey = Deno.env.get('SERVICE_ROLE_KEY') || '';
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  try {
    const body = await req.json();
    const userKey = String(body?.userKey || '').trim();
    const rawIds = body?.questionIds;
    const sourceRaw = String(body?.source || 'practice').trim().toLowerCase();
    const source = SOURCE_SET.has(sourceRaw) ? sourceRaw : 'practice';

    const questionIds = Array.isArray(rawIds)
      ? rawIds.map((x: unknown) => Number(x)).filter((n) => Number.isFinite(n) && n > 0)
      : [];

    if (!userKey || questionIds.length === 0) {
      return new Response(JSON.stringify({ ok: false, message: '缺少 userKey 或 questionIds' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const uniq = [...new Set(questionIds)];
    if (uniq.length > 50) {
      return new Response(JSON.stringify({ ok: false, message: '单次最多 50 题' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let userId: string | null = null;
    const found = await supabase.from('access_users').select('id').eq('user_key', userKey).maybeSingle();
    if (found.error) {
      return new Response(JSON.stringify({ ok: false, message: found.error.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (found.data?.id) {
      userId = found.data.id as string;
    } else {
      const ins = await supabase.from('access_users').insert({ user_key: userKey }).select('id').single();
      if (ins.error || !ins.data?.id) {
        return new Response(JSON.stringify({ ok: false, message: ins.error?.message || '创建用户失败' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      userId = ins.data.id as string;
    }

    const rows = uniq.map((question_id) => ({
      user_id: userId,
      question_id,
      source,
    }));

    const insM = await supabase.from('question_mistakes').insert(rows);
    if (insM.error) {
      return new Response(JSON.stringify({ ok: false, message: insM.error.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ ok: true, recorded: uniq.length }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, message: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
