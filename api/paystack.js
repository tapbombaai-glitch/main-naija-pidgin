// api/paystack.js - FINAL SECURE ₦1,000 TEST
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if(req.method === 'OPTIONS') return res.status(200).end();
  if(req.method !== 'POST') return res.status(405).json({ error: 'Use POST' });

  try {
    const { email, payment_ref } = req.body;
    if(!email || !payment_ref) return res.status(400).json({ error: 'Email + ref required' });

    // Key from Vercel Env Vars - PLATE 2
    const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY;
    if(!PAYSTACK_SECRET) return res.status(500).json({ error: 'Server not configured - PAYSTACK_SECRET_KEY missing in Vercel' });

    // Prevent reuse of ref
    const { data: usedRef } = await supabase.from('api_keys').select('id').eq('payment_ref', payment_ref).limit(1);
    if(usedRef?.length > 0) return res.status(400).json({ error: 'This payment already used!' });

    const { data: usedEmail } = await supabase.from('api_keys').select('id').eq('email', email).gte('max_words', 1000).limit(1);
    if(usedEmail?.length > 0) return res.status(400).json({ error: 'Email already has paid key!' });

    // Verify with Paystack
    const verifyRes = await fetch(`https://api.paystack.co/transaction/verify/${payment_ref}`, {
      headers: { Authorization: `Bearer ${PAYSTACK_SECRET}` }
    });
    const verifyData = await verifyRes.json();

    if(!verifyData.status || verifyData.data.status !== 'success') return res.status(400).json({ error: 'Paystack says not successful', data: verifyData });
    if(verifyData.data.amount !== 100000) return res.status(400).json({ error: `Expected ₦1,000 but got ₦${verifyData.data.amount/100}` });

    // Create key
    const apiKey = `sk_paid_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const key_hash = crypto.createHash('sha256').update(apiKey).digest('hex');

    const { error } = await supabase.from('api_keys').insert({
      name: `TEST ₦1k - ${email}`, key_hash, key_prefix: apiKey.substring(0,16),
      email, max_words: 1000, words_used: 0, is_exhausted: false, payment_ref, is_active: true
    });

    if(error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ success: true, api_key: apiKey, email, max_words: 1000 });

  } catch(e){ return res.status(500).json({ error: e.message }); }
}