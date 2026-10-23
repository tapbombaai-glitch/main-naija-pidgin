import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
const supabaseAdmin = supabaseUrl && serviceKey ? createClient(supabaseUrl, serviceKey) : null;

export default async function handler(req, res) {
  res.setHeader('Content-Type','application/json');
  res.setHeader('Access-Control-Allow-Origin','*');
  res.setHeader('Access-Control-Allow-Methods','POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers','Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Use POST {email, name}' });

  if (!supabaseAdmin) {
    return res.status(500).json({ success: false, error: 'Server configuration incomplete - SUPABASE_URL / SERVICE_ROLE_KEY missing' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
    const cleanEmail = String(body.email || '').trim().toLowerCase();
    const name = String(body.name || 'Customer').trim().slice(0,100);

    if (cleanEmail.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      return res.status(400).json({ success: false, error: 'Enter valid email - e.g. kingselysuoye@gmail.com' });
    }

    // ✅ FIX: Check BOTH old FREE-100 and new free_% - Prevents 2nd free
    const { data: existingFree, error: lookupError } = await supabaseAdmin
      .from('api_keys')
      .select('id, key_prefix')
      .eq('email', cleanEmail)
      .or('payment_ref.eq.FREE-100,payment_ref.ilike.free_%')
      .limit(1);

    if (lookupError) {
      console.error('Free-key eligibility check failed:', lookupError);
      return res.status(500).json({ success: false, error: 'Could not verify free-key eligibility', detail: lookupError.message });
    }
    if (existingFree && existingFree.length > 0) {
      return res.status(409).json({ success: false, code: 'FREE_ALREADY_CLAIMED', error: 'A free key already claimed for this email - Use existing or buy 5k ₦25k' });
    }

    const rawKey = 'mnp_' + crypto.randomBytes(24).toString('hex');
    const shaHash = crypto.createHash('sha256').update(rawKey).digest('hex');
    const credits = 100;

    const record = {
      name: `FREE 100 - ${name}`,
      email: cleanEmail,
      key_hash: shaHash, // ✅ FIX: Store HASH not raw - Same as balance.js + voice.js V3 - Works with existing balance because balance.js checks key_hash=raw OR key_hash_sha256=hash
      key_hash_sha256: shaHash,
      key_prefix: rawKey.substring(0,12) + '...',
      credits_total: credits,
      credits_remaining: credits,
      max_words: credits,
      word_count: credits,
      words_used: 0,
      credits_used: 0,
      is_active: true, // Free auto active - No chairman tapbomba.ai@gmail.com needed
      is_exhausted: false,
      payment_ref: `free_${crypto.randomUUID()}`, // Unique - Prevents race
      payment_status: 'free',
      package: 'free-100'
    };

    const { error: insertError } = await supabaseAdmin.from('api_keys').insert([record]);
    if (insertError) {
      console.error('Free-key creation failed:', insertError);
      if (insertError.code === '23505') {
        return res.status(409).json({ success: false, code:'FREE_ALREADY_CLAIMED', error: 'Free key already claimed - Race' });
      }
      return res.status(500).json({ success: false, error: 'Could not create free API key', detail: insertError.message });
    }

    // Return raw ONCE - Works with existing balance.js because balance.js does 3-step: raw -> sha256 -> fallback
    return res.status(200).json({
      success: true,
      api_key: rawKey, // Show once
      email: cleanEmail,
      credits: 100,
      type: 'FREE 100',
      credit: { remaining: 100, max: 100, used: 0, type:'FREE 100', is_active:true },
      usage: { bearer: `Authorization: Bearer ${rawKey}`, voice:'/api/v1/voice', balance:'/api/customer/balance' }
    });

  } catch (error) {
    console.error('Free-key endpoint failed:', error);
    return res.status(500).json({ success: false, error: 'Unexpected server error', detail: error.message });
  }
}