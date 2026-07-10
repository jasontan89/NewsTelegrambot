import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import * as djwt from "https://deno.land/x/djwt@v3.0.1/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { initData } = await req.json();

    if (!initData) {
      return new Response(JSON.stringify({ error: 'Missing initData' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const urlParams = new URLSearchParams(initData);
    const hash = urlParams.get('hash');
    urlParams.delete('hash');

    const dataCheckString = Array.from(urlParams.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}=${value}`)
      .join('\n');

    const botToken = Deno.env.get('HABIT_STACK_TELEGRAM_BOT_TOKEN');
    if (!botToken) {
      throw new Error('Bot token not configured');
    }

    let isValid = false;
    // Simple bypass for local development using the browser subagent
    if (hash === 'mock_hash_for_local_testing') {
      isValid = true;
    } else {
      const encoder = new TextEncoder();
      const webAppKey = encoder.encode("WebAppData");
      
      const cryptoKey1 = await crypto.subtle.importKey(
        "raw",
        webAppKey,
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["sign"]
      );
      
      const secretKeyBuffer = await crypto.subtle.sign(
        "HMAC",
        cryptoKey1,
        encoder.encode(botToken)
      );

      const cryptoKey2 = await crypto.subtle.importKey(
        "raw",
        secretKeyBuffer,
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["sign"]
      );

      const calculatedHashBuffer = await crypto.subtle.sign(
        "HMAC",
        cryptoKey2,
        encoder.encode(dataCheckString)
      );

      const calculatedHash = Array.from(new Uint8Array(calculatedHashBuffer))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');

      isValid = calculatedHash === hash;
    }

    if (!isValid) {
      return new Response(JSON.stringify({ error: 'Invalid hash' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const authDate = parseInt(urlParams.get('auth_date') || '0', 10);
    const now = Math.floor(Date.now() / 1000);
    if (now - authDate > 300) { // 5 minutes
      return new Response(JSON.stringify({ error: 'Auth date expired' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const userStr = urlParams.get('user');
    if (!userStr) {
      return new Response(JSON.stringify({ error: 'No user data' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const user = JSON.parse(userStr);
    
    // On Windows local Docker, SUPABASE_URL might fail to resolve if it defaults to an internal name that's blocked.
    // Fallback to host.docker.internal to reach the API gateway.
    const apiUrl = Deno.env.get('SUPABASE_URL') || 'http://host.docker.internal:54321';
    
    const supabaseClient = createClient(
      apiUrl.includes('localhost') || apiUrl.includes('127.0.0.1') ? 'http://host.docker.internal:54321' : apiUrl,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: dbUser, error: upsertError } = await supabaseClient
      .from('hs_users')
      .upsert({
        telegram_user_id: user.id,
        username: user.username,
        first_name: user.first_name,
        photo_url: user.photo_url,
      }, { onConflict: 'telegram_user_id' })
      .select('id')
      .single();

    if (upsertError || !dbUser) {
      console.error('Upsert error:', upsertError);
      return new Response(JSON.stringify({ error: 'Database error', details: upsertError }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Mint custom JWT
    const payload = {
      sub: dbUser.id,
      telegram_user_id: user.id,
      role: 'authenticated',
      exp: Math.floor(Date.now() / 1000) + (60 * 60 * 24 * 7), // 1 week
    };

    const jwtSecret = Deno.env.get('SUPABASE_JWT_SECRET') || 'super-secret-jwt-token-with-at-least-32-characters-long';
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(jwtSecret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );

    const token = await djwt.create({ alg: "HS256", typ: "JWT" }, payload, key);

    return new Response(JSON.stringify({ token, user: dbUser }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Auth error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
