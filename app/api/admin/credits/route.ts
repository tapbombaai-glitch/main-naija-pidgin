// app/api/admin/credits/route.ts - CORRECTED - Fixed RPC fallback logic
// Chairman: tapbomba.ai@gmail.com - Verifies token, not body - True atomic via RPC FOR UPDATE
// Important: Deploy correct RPC for your actual schema

import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE;
const CHAIRMAN_EMAIL = 'tapbomba.ai@gmail.com';
const ALLOWED_ORIGIN = 'https://main-naija-pidgin.vercel.app';

function getBearerToken(req: NextRequest) {
  const h = req.headers.get('authorization') || '';
  const m = h.match(/^Bearer\s+(.+)$/i);
  return m ? m[1].trim() : '';
}
function isFunctionNotFoundError(err: any) {
  if (!err) return false;
  const msg = String(err.message || '').toLowerCase();
  const code = String(err.code || '');
  return code === '42883' || code === 'PGRST202' || msg.includes('does not exist') || (msg.includes('function') && msg.includes('not found'));
}
function isBusinessError(err: any) {
  if (!err) return false;
  const msg = String(err.message || '').toLowerCase();
  return msg.includes('insufficient credits') || msg.includes('not found') || msg.includes('exceeds limit') || msg.includes('invalid');
}
function corsHeaders(origin: string | null) {
  return {
    'Access-Control-Allow-Origin': ALLOWED_ORIGIN, // Restricted to actual domain - Chairman-only!
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };
}

export async function POST(req: NextRequest) {
  const origin = req.headers.get('origin');
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    console.error('Missing Supabase env vars');
    return NextResponse.json({ success: false, error: 'Server configuration error' }, { status: 500, headers: corsHeaders(origin) });
  }
  const token = getBearerToken(req);
  if (!token) return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401, headers: corsHeaders(origin) });

  const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });

  try {
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) return NextResponse.json({ success: false, error: 'Invalid or expired session' }, { status: 401, headers: corsHeaders(origin) });
    if (String(user.email || '').trim().toLowerCase() !== CHAIRMAN_EMAIL.toLowerCase()) {
      return NextResponse.json({ success: false, error: 'Chairman access only' }, { status: 403, headers: corsHeaders(origin) });
    }

    const body = await req.json();
    const apiKeyId = String(body.api_key_id || body.keyId || body.id || '').trim();
    const action = String(body.action || '').trim();
    if (!apiKeyId) return NextResponse.json({ success: false, error: 'API key ID required' }, { status: 400, headers: corsHeaders(origin) });

    let change = 0;
    if (action === 'add') change = Number(body.amount);
    else if (action === 'deduct') change = -Number(body.amount);
    else return NextResponse.json({ success: false, error: 'Action must be add or deduct' }, { status: 400, headers: corsHeaders(origin) });

    if (!Number.isSafeInteger(Math.abs(change)) || change === 0 || Math.abs(change) > 1000000) {
      return NextResponse.json({ success: false, error: 'Amount must be whole number 1-1000000' }, { status: 400, headers: corsHeaders(origin) });
    }

    // CORRECTED FALLBACK LOGIC
    let result: any = null;
    let usedMethod = '';

    try {
      const { data, error } = await supabaseAdmin.rpc('atomic_credit_change', { p_key_id: apiKeyId, p_change: change });
      if (error) {
        if (isBusinessError(error)) {
          const msg = String(error.message || '');
          if (msg.toLowerCase().includes('insufficient credits')) return NextResponse.json({ success: false, error: 'Insufficient credits to deduct' }, { status: 400, headers: corsHeaders(origin) });
          if (msg.toLowerCase().includes('not found')) return NextResponse.json({ success: false, error: 'API key not found' }, { status: 404, headers: corsHeaders(origin) });
          return NextResponse.json({ success: false, error: msg }, { status: 400, headers: corsHeaders(origin) });
        }
        if (isFunctionNotFoundError(error)) {
          const { data: data2, error: error2 } = await supabaseAdmin.rpc('atomic_credit_change_multi', { p_key_id: apiKeyId, p_change: change });
          if (error2) {
            if (isBusinessError(error2)) {
              const msg = String(error2.message || '');
              if (msg.toLowerCase().includes('insufficient credits')) return NextResponse.json({ success: false, error: 'Insufficient credits to deduct' }, { status: 400, headers: corsHeaders(origin) });
              if (msg.toLowerCase().includes('not found')) return NextResponse.json({ success: false, error: 'API key not found' }, { status: 404, headers: corsHeaders(origin) });
              return NextResponse.json({ success: false, error: msg }, { status: 400, headers: corsHeaders(origin) });
            }
            if (isFunctionNotFoundError(error2)) {
              result = null;
            } else {
              return NextResponse.json({ success: false, error: 'Could not update credits' }, { status: 500, headers: corsHeaders(origin) });
            }
          } else {
            result = data2 && (data2 as any)[0];
            usedMethod = 'rpc_multi_for_update';
          }
        } else {
          return NextResponse.json({ success: false, error: 'Could not update credits' }, { status: 500, headers: corsHeaders(origin) });
        }
      } else {
        result = data && (data as any)[0];
        usedMethod = 'rpc_single_for_update';
      }
    } catch (e: any) {
      return NextResponse.json({ success: false, error: 'Could not update credits' }, { status: 500, headers: corsHeaders(origin) });
    }

    if (result) {
      return NextResponse.json({
        success: true,
        message: action === 'add' ? 'Credits added successfully' : 'Credits deducted successfully',
        api_key_id: apiKeyId, keyId: apiKeyId,
        previous_credits: result.previous_credits,
        credits: result.credits !== undefined ? Number(result.credits) : Number(result.credits_remaining),
        credits_remaining: result.credits_remaining !== undefined ? Number(result.credits_remaining) : undefined,
        change, atomic: true, method: usedMethod
      }, { headers: corsHeaders(origin) });
    }

    // Fallback conditional update
    console.warn('Using conditional fallback - Not true atomic - Deploy RPC');
    const { data: keyRec, error: keyErr } = await supabaseAdmin.from('api_keys').select('id, credits, credits_remaining, credits_total, credits_used').eq('id', apiKeyId).maybeSingle();
    if (keyErr) return NextResponse.json({ success: false, error: 'Could not retrieve API key' }, { status: 500, headers: corsHeaders(origin) });
    if (!keyRec) return NextResponse.json({ success: false, error: 'API key not found' }, { status: 404, headers: corsHeaders(origin) });

    const isSingle = keyRec.credits !== null && keyRec.credits !== undefined;
    const current = isSingle ? Number(keyRec.credits) : Number(keyRec.credits_remaining);
    if (!Number.isSafeInteger(current) || current < 0) return NextResponse.json({ success: false, error: 'Stored credit balance is invalid' }, { status: 500, headers: corsHeaders(origin) });
    const newVal = current + change;
    if (newVal < 0) return NextResponse.json({ success: false, error: 'Insufficient credits to deduct' }, { status: 400, headers: corsHeaders(origin) });

    let updated: any;
    if (isSingle) {
      const { data: rows, error } = await supabaseAdmin.from('api_keys').update({ credits: newVal }).eq('id', apiKeyId).eq('credits', current).select('id, credits');
      if (error) return NextResponse.json({ success: false, error: 'Could not update credits' }, { status: 500, headers: corsHeaders(origin) });
      updated = rows;
    } else {
      const payload = change > 0 ? { credits_remaining: current + change, credits_total: ((keyRec as any).credits_total || 0) + change } : { credits_remaining: current + change };
      const { data: rows, error } = await supabaseAdmin.from('api_keys').update(payload as any).eq('id', apiKeyId).eq('credits_remaining', current).select('id, credits_remaining, credits_total, credits_used');
      if (error) return NextResponse.json({ success: false, error: 'Could not update credits' }, { status: 500, headers: corsHeaders(origin) });
      updated = rows;
    }

    if (!updated || updated.length === 0) return NextResponse.json({ success: false, error: 'Credit balance changed - Refresh and try again', atomic: false }, { status: 409, headers: corsHeaders(origin) });

    const finalRow = updated[0];
    return NextResponse.json({
      success: true, message: action === 'add' ? 'Credits added' : 'Credits deducted',
      api_key_id: apiKeyId, keyId: apiKeyId, previous_credits: current,
      credits: finalRow.credits !== undefined ? Number(finalRow.credits) : Number(finalRow.credits_remaining),
      credits_remaining: finalRow.credits_remaining !== undefined ? Number(finalRow.credits_remaining) : undefined,
      change, atomic: false, method: 'conditional_fallback',
      warning: 'Fallback is not fully atomic - Deploy RPC atomic_credit_change() for true atomic'
    }, { headers: corsHeaders(origin) });

  } catch (err) {
    console.error('Admin credit endpoint failed', err);
    return NextResponse.json({ success: false, error: 'An unexpected server error occurred' }, { status: 500, headers: corsHeaders(origin) });
  }
}

export async function OPTIONS(req: NextRequest) {
  return new NextResponse(null, { status: 200, headers: corsHeaders(req.headers.get('origin')) });
}