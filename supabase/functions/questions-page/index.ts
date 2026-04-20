import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const AUTO_START_ID = 118;

type BankRow = {
  seq: number;
  chapter: number;
  type: 'single' | 'multi';
  content: string;
  options: string[];
  answer: number | number[];
  explanation: string;
  source: string;
};

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
    const page = Math.max(1, Number.parseInt(String(body?.page || '1'), 10) || 1);
    const pageSize = Math.max(
      1,
      Math.min(200, Number.parseInt(String(body?.pageSize || '100'), 10) || 100)
    );

    if (!userKey) {
      return new Response(JSON.stringify({ ok: false, message: 'userKey 不能为空' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: accessData, error: accessError } = await supabase.rpc('access_status', {
      p_user_key: userKey,
    });
    if (accessError) {
      return new Response(JSON.stringify({ ok: false, message: accessError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const accessRow = Array.isArray(accessData) ? accessData[0] : null;
    const unlocked = !!accessRow?.unlocked;
    if (!unlocked) {
      return new Response(
        JSON.stringify({
          ok: true,
          unlocked: false,
          page,
          pageSize,
          total: 0,
          items: [],
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const { data, error, count } = await supabase
      .from('question_bank')
      .select('seq, chapter, type, content, options, answer, explanation, source', {
        count: 'exact',
      })
      .order('seq', { ascending: true })
      .range(from, to);

    if (error) {
      return new Response(JSON.stringify({ ok: false, message: error.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const rows = ((data || []) as BankRow[]).map((it) => ({
      id: AUTO_START_ID + it.seq - 1,
      chapter: it.chapter,
      type: it.type,
      content: it.content,
      options: it.options,
      answer: it.answer,
      explanation: it.explanation,
      source: it.source,
    }));

    return new Response(
      JSON.stringify({
        ok: true,
        unlocked: true,
        page,
        pageSize,
        total: count || 0,
        items: rows,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, message: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
