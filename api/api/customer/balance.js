// api/customer/balance.js
// Created for Main Naija Pidgin API Key Dashboard
// Purpose: Read-only balance check - Bearer only - No credit deduction - Option A secure storage + preserve existing keys
// Fixes: Safe hash lookup (no .or() string), distinguishes DB errors vs invalid key, chairman approval check, never URL key, never exposes raw keys

import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('SUPABASE_SERVICE_ROLE_KEY missing - Set env var - No anon fallback for security');
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

function hashKey(k) {
  return crypto.createHash('sha256').update(k).digest('hex');
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-api-key');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Use GET method for balance check' });
  }

  // Bearer only - Never URL ?key= - Per security requirement
  let apiKey = (req.headers.authorization || '').replace(/^Bearer\s+/i, '').trim() || (req.headers['x-api-key'] || '').trim();

  if (!apiKey) {
    return res.status(401).json({
      error: 'API key required via Authorization: Bearer header - Never put key in URL - Example: Authorization: Bearer mnp_...',
      code: 'NO_BEARER'
    });
  }

  // Safe lookup - Separate queries, no string interpolation in .or(), distinguish DB errors vs invalid key
  let keyData = null;

  try {
    // 1. Try RAW first (preserves existing customers' keys where key_hash contains RAW mnp_... - Option A backward compat)
    const { data: rawData, error: rawError } = await supabaseAdmin
      .from('api_keys')
      .select('*')
      .eq('key_hash', apiKey)
      .maybeSingle();

    if (rawError) {
      return res.status(500).json({
        error: 'Database error during authentication - Try again',
        code: 'DB_ERROR_RAW',
        detail: rawError.message
      });
    }

    if (rawData) {
      keyData = rawData;
    } else {
      // 2. Try HASHED in key_hash_sha256 (new secure keys - Option A: store only hash + prefix, never raw)
      const hashed = hashKey(apiKey);
      const { data: hashShaData, error: hashShaError } = await supabaseAdmin
        .from('api_keys')
        .select('*')
        .eq('key_hash_sha256', hashed)
        .maybeSingle();

      if (hashShaError) {
        return res.status(500).json({
          error: 'Database error during hash lookup',
          code: 'DB_ERROR_HASH_SHA',
          detail: hashShaError.message
        });
      }

      if (hashShaData) {
        keyData = hashShaData;
      } else {
        // 3. Try HASHED in key_hash (transitional - if old migration stored hash in key_hash)
        const { data: hashInKeyHashData, error: hashInKeyHashError } = await supabaseAdmin
          .from('api_keys')
          .select('*')
          .eq('key_hash', hashed)
          .maybeSingle();

        if (hashInKeyHashError) {
          return res.status(500).json({
            error: 'Database error during fallback lookup',
            code: 'DB_ERROR_FALLBACK',
            detail: hashInKeyHashError.message
          });
        }

        keyData = hashInKeyHashData;
      }
    }

    if (!keyData) {
      return res.status(401).json({ error: 'Invalid API key - Key not found', code: 'INVALID_KEY' });
    }

    // Chairman approval check - Inactive keys blocked - Preserves existing workflow - Only tapbomba.ai@gmail.com can approve via /admin/keys
    if (!keyData.is_active) {
      return res.status(401).json({
        error: 'Pending Chairman approval - Paid keys require tapbomba.ai@gmail.com approval in /admin/keys',
        email: keyData.email,
        payment_ref: keyData.payment_ref,
        code: 'PENDING_APPROVAL',
        credit: {
          email: keyData.email,
          payment_ref: keyData.payment_ref,
          status: 'pending_approval',
          is_active: false
        }
      });
    }

    // Read-only balance calculation - No deduction
    const creditsRemaining = keyData.credits_remaining ?? ((keyData.max_words || keyData.credits_total || 0) - (keyData.words_used || 0));
    const creditsTotal = keyData.credits_total ?? keyData.max_words ?? keyData.word_count ?? 0;
    const creditsUsed = keyData.credits_used ?? keyData.words_used ?? 0;

    if (keyData.is_exhausted || creditsRemaining <= 0) {
      // Mark exhausted if not already marked
      if (!keyData.is_exhausted) {
        await supabaseAdmin.from('api_keys').update({ is_exhausted: true }).eq('id', keyData.id);
      }

      return res.status(403).json({
        error: 'CREDIT FINISHED - No credits left - Please buy more credits at /buy',
        code: 'EXHAUSTED',
        credit: {
          email: keyData.email,
          remaining: 0,
          used: creditsUsed,
          max: creditsTotal,
          payment_ref: keyData.payment_ref,
          status: 'exhausted',
          is_active: true,
          type: creditsTotal >= 1000 ? 'PAID' : 'FREE 100'
        }
      });
    }

    // Success - Read-only, no credit deducted - Dashboard displays correct remaining credits
    return res.status(200).json({
      success: true,
      credit: {
        email: keyData.email,
        remaining: creditsRemaining,
        used: creditsUsed,
        max: creditsTotal,
        payment_ref: keyData.payment_ref,
        status: 'active',
        is_active: true,
        type: creditsTotal >= 1000 ? 'PAID' : 'FREE 100',
        name: keyData.name,
        prefix: keyData.key_prefix
      },
      message: `Balance check successful - No credit deducted - ${creditsRemaining} credits remaining`
    });
  } catch (e) {
    return res.status(500).json({ error: 'Unexpected server error during balance check', code: 'SERVER_ERROR', detail: e.message });
  }
}