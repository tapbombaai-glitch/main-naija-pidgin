// app/api/customer/balance/route.ts
// Main Naija Pidgin — Customer Balance API
// Current Vercel Ready - Converted to App Router

import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('SUPABASE_SERVICE_ROLE_KEY missing');
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

function hashKey(k: string) { 
  return crypto.createHash('sha256').update(k).digest('hex'); 
}

function getCorsHeaders() {
  return {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-api-key',
  };
}

async function handleBalance(req: NextRequest) {
  let apiKey = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '').trim() 
    || (req.headers.get('x-api-key') || '').trim() 
    || (req.nextUrl.searchParams.get('key') || '').trim();
    
  // Note: query.key allowed here for balance only - Voice is Bearer only
  if (!apiKey) {
    return NextResponse.json({ error: 'Bearer required', code: 'NO_BEARER' }, { 
      status: 401, 
      headers: getCorsHeaders() 
    });
  }

  try {
    let keyData: any = null;
    
    // --- EXPECTED LOOKUP SEQUENCE - 3-step for backward compat ---
    // 1. Try raw directly - For legacy records where key_hash = raw mnp_...
    const { data: rawData, error: rawErr } = await supabaseAdmin.from('api_keys').select('*').eq('key_hash', apiKey).maybeSingle();
    if (rawErr) return NextResponse.json({ error: 'DB error raw', code: 'DB_ERROR_RAW', detail: rawErr.message }, { status: 500, headers: getCorsHeaders() });
    if (rawData) keyData = rawData;
    else {
      // 2. Hash submitted key with SHA-256 - Search key_hash_sha256 - For new hash-only storage
      const hashed = hashKey(apiKey);
      const { data: shaData, error: shaErr } = await supabaseAdmin.from('api_keys').select('*').eq('key_hash_sha256', hashed).maybeSingle();
      if (shaErr) return NextResponse.json({ error: 'DB error hash', code: 'DB_ERROR_HASH_SHA', detail: shaErr.message }, { status: 500, headers: getCorsHeaders() });
      if (shaData) keyData = shaData;
      else {
        // 3. Support legacy where key_hash = hash (fallback)
        const { data: fbData, error: fbErr } = await supabaseAdmin.from('api_keys').select('*').eq('key_hash', hashed).maybeSingle();
        if (fbErr) return NextResponse.json({ error: 'DB error fallback', code: 'DB_ERROR_FALLBACK', detail: fbErr.message }, { status: 500, headers: getCorsHeaders() });
        keyData = fbData;
      }
    }

    if (!keyData) return NextResponse.json({ error: 'Invalid key', code: 'INVALID_KEY' }, { status: 401, headers: getCorsHeaders() });
    if (!keyData.is_active) return NextResponse.json({ error: 'Pending Chairman approval', code: 'PENDING_APPROVAL' }, { status: 403, headers: getCorsHeaders() });

    const remaining = keyData.credits_remaining ?? ((keyData.credits_total ?? keyData.max_words ?? 0) - (keyData.credits_used ?? keyData.words_used ?? 0));
    
    return NextResponse.json({
      success: true,
      credit: {
        email: keyData.email,
        remaining: remaining,
        max: keyData.credits_total ?? keyData.max_words,
        used: keyData.credits_used ?? keyData.words_used,
        is_active: keyData.is_active,
        is_exhausted: keyData.is_exhausted || remaining <= 0,
        type: (keyData.credits_total || 0) >= 1000 ? 'PAID' : 'FREE 100',
        prefix: keyData.key_prefix,
        payment_ref: keyData.payment_ref
      }
    }, { headers: getCorsHeaders() });

  } catch (e: any) { 
    return NextResponse.json({ error: 'Server error', detail: e.message }, { status: 500, headers: getCorsHeaders() }); 
  }
}

export async function GET(req: NextRequest) {
  return handleBalance(req);
}

export async function POST(req: NextRequest) {
  return handleBalance(req);
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: getCorsHeaders() });
}