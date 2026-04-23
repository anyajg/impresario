import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function parseAdminUserKeys(input: string): Set<string> {
  return new Set(
    input
      .split(/[,\n]/g)
      .map((it) => it.trim())
      .filter(Boolean)
  );
}

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
  const adminUserKeys = parseAdminUserKeys(Deno.env.get('ADMIN_USER_KEYS') || '');
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  try {
    const body = await req.json();
    const userKey = String(body?.userKey || '').trim();
    const checkOnly = !!body?.checkOnly;

    if (!userKey) {
      return new Response(JSON.stringify({ ok: false, message: 'userKey 不能为空' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!adminUserKeys.has(userKey)) {
      return new Response(
        JSON.stringify({ ok: false, canAccess: false, message: '无权限访问数据分析' }),
        {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (checkOnly) {
      return new Response(JSON.stringify({ ok: true, canAccess: true }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const [usersR, redeemsR, activeCodesR, bankR, recentR] = await Promise.all([
      supabase.from('access_users').select('id', { count: 'exact', head: true }),
      supabase.from('invite_redeems').select('id', { count: 'exact', head: true }),
      supabase
        .from('invite_codes')
        .select('code', { count: 'exact', head: true })
        .eq('status', 'active'),
      supabase.from('question_bank').select('seq', { count: 'exact', head: true }),
      supabase
        .from('invite_redeems')
        .select('code, platform, created_at, access_users(user_key)')
        .order('created_at', { ascending: false })
        .limit(20),
    ]);

    const firstError = [usersR, redeemsR, activeCodesR, bankR, recentR]
      .map((it) => it.error)
      .find(Boolean);
    if (firstError) {
      return new Response(JSON.stringify({ ok: false, message: firstError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const recentRedeems = ((recentR.data || []) as Array<any>).map((it) => ({
      code: String(it.code || ''),
      userKey: String(it.access_users?.user_key || ''),
      platform: String(it.platform || 'unknown'),
      createdAt: String(it.created_at || ''),
    }));

    return new Response(
      JSON.stringify({
        ok: true,
        canAccess: true,
        totals: {
          users: usersR.count || 0,
          redeems: redeemsR.count || 0,
          activeCodes: activeCodesR.count || 0,
          questionBank: bankR.count || 0,
        },
        recentRedeems,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, message: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
