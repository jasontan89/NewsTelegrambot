import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const ALLOWED_ORIGIN = Deno.env.get('ALLOWED_ORIGIN') || 'https://jasontan89.github.io';

const corsHeaders = {
  'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helper for base64url encoding
function base64url(buf: Uint8Array): string {
  let binary = "";
  const len = buf.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(buf[i]);
  }
  return btoa(binary)
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

// Helper to sign JWT using Web Crypto API
async function signJwt(payload: any, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const header = { alg: "HS256", typ: "JWT" };
  const encodedHeader = base64url(encoder.encode(JSON.stringify(header)));
  const encodedPayload = base64url(encoder.encode(JSON.stringify(payload)));
  
  const tokenData = `${encodedHeader}.${encodedPayload}`;
  
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  
  const signatureBuffer = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(tokenData)
  );
  
  const encodedSignature = base64url(new Uint8Array(signatureBuffer));
  return `${tokenData}.${encodedSignature}`;
}

serve(async (req) => {
  // Handle CORS
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

    // Sort keys alphabetically using standard Array.sort() (strict Unicode code point order)
    const entries = Array.from(urlParams.entries()).sort((a, b) => a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0);
    
    const dataCheckString = entries
      .map(([key, value]) => `${key}=${value}`)
      .join('\n');

    const botToken = Deno.env.get('HABIT_STACK_TELEGRAM_BOT_TOKEN');

    // Safe Debug Logging (No PII)
    console.log("--- Auth Debug ---");
    console.log("Token set:", !!botToken);
    if (botToken) {
      console.log(`Token prefix: ${botToken.slice(0, 4)}... length: ${botToken.length}`);
    }
    console.log("Reconstructed keys:", entries.map(e => e[0]));
    console.log("Received hash:", hash);

    if (!botToken) {
      throw new Error('Bot token not configured');
    }

    // Validate HMAC-SHA256 hash from Telegram
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

    console.log("Calculated hash:", calculatedHash);
    const isValid = calculatedHash === hash;
    console.log("Is hash valid?", isValid);

    if (!isValid) {
      return new Response(JSON.stringify({ error: 'Invalid hash', calculated: calculatedHash, received: hash }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const authDate = parseInt(urlParams.get('auth_date') || '0', 10);
    const now = Math.floor(Date.now() / 1000);
    if (now - authDate > 86400 * 30) { // Keep session valid for up to 30 days of initData (standard Telegram behavior)
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
    
    const apiUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseClient = createClient(
      apiUrl,
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
      .select('*')
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

    const jwtSecret = Deno.env.get('JWT_SECRET') || Deno.env.get('SUPABASE_JWT_SECRET') || '';
    const token = await signJwt(payload, jwtSecret);

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
