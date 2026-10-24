// api/admin/credits.js - CORRECTED - Fixed RPC fallback logic - No dangerous fallback on business error!
// Chairman: tapbomba.ai@gmail.com - Verifies token, not body - True atomic via RPC FOR UPDATE
// Important: Deploy correct RPC for your actual schema - Don't deploy both blindly - Run schema query first!

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE;
const CHAIRMAN_EMAIL = 'tapbomba.ai@gmail.com';
const ALLOWED_ORIGIN = 'https://main-naija-pidgin.vercel.app';

function send(res, status, body) { return res.status(status).json(body); }
function getBearerToken(req) {
  const h = req.headers.authorization || '';
  const m = h.match(/^Bearer\s+(.+)$/i);
  return m ? m[1].trim() : '';
}
function isFunctionNotFoundError(err) {
  if (!err) return false;
  const msg = String(err.message || '').toLowerCase();
  const code = String(err.code || '');
  // PostgreSQL 42883 = undefined_function, PostgREST PGRST202 = function not found
  return code === '42883' || code === 'PGRST202' || msg.includes('does not exist') || msg.includes('function') && msg.includes('not found');
}
function isBusinessError(err) {
  if (!err) return false;
  const msg = String(err.message || '').toLowerCase();
  return msg.includes('insufficient credits') || msg.includes('not found') || msg.includes('exceeds limit') || msg.includes('invalid');
}

export default async function handler(req, res) {
  // CORS restricted to actual domain - Chairman-only endpoint!
  const origin = req.headers.origin || '';
  res.setHeader('Access-Control-Allow-Origin', origin === ALLOWED_ORIGIN ? ALLOWED_ORIGIN : ALLOWED_ORIGIN);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return send(res, 405, { success: false, error: 'Method not allowed' });
  }
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    console.error('Missing Supabase env vars');
    return send(res, 500, { success: false, error: 'Server configuration error' });
  }
  const token = getBearerToken(req);
  if (!token) return send(res, 401, { success: false, error: 'Authentication required' });

  const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });

  try {
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) return send(res, 401, { success: false, error: 'Invalid or expired session' });
    if (String(user.email || '').trim().toLowerCase() !== CHAIRMAN_EMAIL.toLowerCase()) {
      return send(res, 403, { success: false, error: 'Chairman access only' });
    }

    const body = req.body || {};
    const apiKeyId = String(body.api_key_id || body.keyId || body.id || '').trim();
    const action = String(body.action || '').trim();
    if (!apiKeyId) return send(res, 400, { success: false, error: 'API key ID required' });

    let change = 0;
    if (action === 'add') change = Number(body.amount);
    else if (action === 'deduct') change = -Number(body.amount);
    else return send(res, 400, { success: false, error: 'Action must be add or deduct' });

    if (!Number.isSafeInteger(Math.abs(change)) || change === 0 || Math.abs(change) > 1000000) {
      return send(res, 400, { success: false, error: 'Amount must be whole number 1-1000000' });
    }

    // CORRECTED FALLBACK LOGIC - Don't treat business error as missing function!
    // Safest: Select correct RPC for actual schema, deploy it, remove direct-update fallback entirely!
    // For now: Try RPC, if business error -> return error immediately, no fallback!
    // Only if function not found -> try other RPC or fallback with warning

    let result = null;
    let usedMethod = '';

    // Try atomic_credit_change (single credits column) first
    try {
      const { data, error } = await supabaseAdmin.rpc('atomic_credit_change', { p_key_id: apiKeyId, p_change: change });
      if (error) {
        if (isBusinessError(error)) {
          // Business error like insufficient credits - Return immediately, don't fallback!
          console.error('RPC business error', error.message);
          const msg = String(error.message || '');
          if (msg.toLowerCase().includes('insufficient credits')) {
            return send(res, 400, { success: false, error: 'Insufficient credits to deduct' });
          }
          if (msg.toLowerCase().includes('not found')) {
            return send(res, 404, { success: false, error: 'API key not found' });
          }
          return send(res, 400, { success: false, error: msg });
        }
        if (isFunctionNotFoundError(error)) {
          // Function not found - Try other RPC
          console.warn('atomic_credit_change not found, trying atomic_credit_change_multi', error.message);
          const { data: data2, error: error2 } = await supabaseAdmin.rpc('atomic_credit_change_multi', { p_key_id: apiKeyId, p_change: change });
          if (error2) {
            if (isBusinessError(error2)) {
              const msg = String(error2.message || '');
              if (msg.toLowerCase().includes('insufficient credits')) return send(res, 400, { success: false, error: 'Insufficient credits to deduct' });
              if (msg.toLowerCase().includes('not found')) return send(res, 404, { success: false, error: 'API key not found' });
              return send(res, 400, { success: false, error: msg });
            }
            if (isFunctionNotFoundError(error2)) {
              // Both RPCs missing - Fallback to conditional update only if you explicitly allow - Better to error!
              console.error('Both RPCs missing - Deploy SQL RPC - Fallback not true atomic');
              // For safety during transition, allow conditional fallback but mark as not atomic
              // In production, you should remove fallback entirely and require RPC!
              result = null; // Will go to fallback below
            } else {
              console.error('Second RPC unexpected error', error2.message);
              return send(res, 500, { success: false, error: 'Could not update credits' });
            }
          } else {
            result = data2 && data2[0];
            usedMethod = 'rpc_multi_for_update';
          }
        } else {
          // Unexpected RPC error - Don't fallback, return generic error (don't expose details)
          console.error('RPC unexpected error', error.message);
          return send(res, 500, { success: false, error: 'Could not update credits' });
        }
      } else {
        result = data && data[0];
        usedMethod = 'rpc_single_for_update';
      }
    } catch (e) {
      console.error('RPC exception', e.message);
      return send(res, 500, { success: false, error: 'Could not update credits' });
    }

    if (result) {
      // True atomic success via RPC FOR UPDATE - Read, validation, update in same function!
      return send(res, 200, {
        success: true,
        message: action === 'add' ? 'Credits added successfully' : 'Credits deducted successfully',
        api_key_id: apiKeyId,
        keyId: apiKeyId,
        previous_credits: result.previous_credits,
        credits: result.credits !== undefined ? Number(result.credits) : Number(result.credits_remaining),
        credits_remaining: result.credits_remaining !== undefined ? Number(result.credits_remaining) : undefined,
        change,
        atomic: true,
        method: usedMethod
      });
    }

    // Fallback: Conditional update - Only if RPCs not deployed - Not fully atomic across all columns!
    // Recommendation: Remove this fallback entirely after deploying correct RPC!
    console.warn('Using conditional fallback - Not true atomic - Deploy RPC for true atomic');
    const { data: keyRec, error: keyErr } = await supabaseAdmin.from('api_keys').select('id, credits, credits_remaining').eq('id', apiKeyId).maybeSingle();
    if (keyErr) {
      console.error('Key lookup failed', keyErr.message);
      return send(res, 500, { success: false, error: 'Could not retrieve API key' });
    }
    if (!keyRec) return send(res, 404, { success: false, error: 'API key not found' });

    const isSingle = keyRec.credits !== null && keyRec.credits !== undefined;
    const current = isSingle ? Number(keyRec.credits) : Number(keyRec.credits_remaining);
    if (!Number.isSafeInteger(current) || current < 0) {
      console.error('Invalid stored balance');
      return send(res, 500, { success: false, error: 'Stored credit balance is invalid' });
    }
    const newVal = current + change;
    if (newVal < 0) return send(res, 400, { success: false, error: 'Insufficient credits to deduct' });

    let updated;
    if (isSingle) {
      const { data: rows, error } = await supabaseAdmin.from('api_keys').update({ credits: newVal }).eq('id', apiKeyId).eq('credits', current).select('id, credits');
      if (error) {
        console.error('Update failed', error.message);
        return send(res, 500, { success: false, error: 'Could not update credits' });
      }
      updated = rows;
    } else {
      // For multi-column, only update credits_remaining for admin actions - Don't touch credits_used unless intended!
      // If credits_used tracks API usage only, don't increase on admin deduct!
      const payload = change > 0
        ? { credits_remaining: current + change, credits_total: (keyRec.credits_total||0)+change }
        : { credits_remaining: current + change }; // Don't touch credits_used for admin deduct - Only for API usage!
      const { data: rows, error } = await supabaseAdmin.from('api_keys').update(payload).eq('id', apiKeyId).eq('credits_remaining', current).select('id, credits_remaining, credits_total, credits_used');
      if (error) {
        console.error('Update failed', error.message);
        return send(res, 500, { success: false, error: 'Could not update credits' });
      }
      updated = rows;
    }

    if (!updated || updated.length === 0) {
      return send(res, 409, { success: false, error: 'Credit balance changed - Refresh and try again', atomic: false });
    }

    const finalRow = updated[0];
    return send(res, 200, {
      success: true,
      message: action === 'add' ? 'Credits added' : 'Credits deducted',
      api_key_id: apiKeyId,
      keyId: apiKeyId,
      previous_credits: current,
      credits: finalRow.credits !== undefined ? Number(finalRow.credits) : Number(finalRow.credits_remaining),
      credits_remaining: finalRow.credits_remaining !== undefined ? Number(finalRow.credits_remaining) : undefined,
      change,
      atomic: false,
      method: 'conditional_fallback',
      warning: 'Fallback is not fully atomic - Deploy RPC atomic_credit_change() for true atomic'
    });

  } catch (err) {
    console.error('Admin credit endpoint failed', err);
    return send(res, 500, { success: false, error: 'An unexpected server error occurred' });
  }
}