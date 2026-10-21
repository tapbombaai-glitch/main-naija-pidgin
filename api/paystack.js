// api/paystack.js - V6.4 FINAL FIXED - LIVE ₦5k + ₦22k + FREE compatible
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if(req.method === 'OPTIONS') return res.status(200).end();
  if(req.method !== 'POST') return res.status(405).json({ error: 'Use POST' });

  try {
    const { email, payment_ref, reference, packageId } = req.body;
    const payRef = payment_ref || reference;
    
    if(!email || !payRef) return res.status(400).json({ error: 'Email + payment_ref required' });

    const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY || process.env.PAYSTACK_SK_LIVE;
    if(!PAYSTACK_SECRET) return res.status(500).json({ error: 'PAYSTACK_SECRET_KEY missing in Vercel Env' });

    // Prevent reuse of ref
    const { data: usedRef } = await supabase.from('api_keys').select('id').eq('payment_ref', payRef).limit(1);
    if(usedRef?.length > 0) {
      const { data: existing } = await supabase.from('api_keys').select('key_hash,key_prefix,word_count').eq('payment_ref', payRef).single();
      return res.status(200).json({ success: true, api_key: existing?.key_hash, full_key: existing?.key_hash, message: 'Already used - returning old key' });
    }

    // Verify with Paystack LIVE
    const verifyRes = await fetch(`https://api.paystack.co/transaction/verify/${payRef}`, {
      headers: { Authorization: `Bearer ${PAYSTACK_SECRET}` }
    });
    const verifyData = await verifyRes.json();

    if(!verifyData.status || verifyData.data.status !== 'success') {
      return res.status(400).json({ error: 'Paystack says not successful', data: verifyData });
    }

    const amountPaidKobo = verifyData.data.amount;
    const amountPaidNaira = amountPaidKobo / 100;
    const verifiedEmail = verifyData.data.customer.email.toLowerCase();

    // Determine package by amount - SUPPORTS YOUR PRICES
    let credits = 1000;
    let planName = 'Starter 1k';
    
    if (amountPaidKobo === 100000) { credits = 1000; planName = 'TEST 1k - ₦1,000'; }
    else if (amountPaidKobo >= 400000 && amountPaidKobo <= 600000) { credits = 1000; planName = 'Starter 1k - ₦5,000'; }
    else if (amountPaidKobo >= 2000000 && amountPaidKobo <= 2500000) { credits = 5000; planName = 'Popular 5k - ₦22,000'; }
    else if (amountPaidKobo >= 4000000) { credits = Math.floor(amountPaidKobo / 5); planName = `Custom ${Math.floor(amountPaidKobo/5)}`; }
    else {
      // Allow any successful payment - don't block
      credits = packageId === '5k' ? 5000 : 1000;
      planName = packageId === '5k' ? 'Popular 5k' : 'Starter 1k';
    }

    // Create key with mnp_ prefix - FIXED to match your table
    const rawKey = `mnp_${Date.now().toString(36)}${Math.random().toString(36).substring(2, 8)}${Math.random().toString(36).substring(2, 6)}`;
    const keyHash = rawKey; // Store raw as key_hash for your table structure
    const prefix = rawKey.substring(0, 12);
    const shaHash = crypto.createHash('sha256').update(rawKey).digest('hex');

    // FIXED INSERT - matches your real columns from video
    const { data, error } = await supabase.from('api_keys').insert([{
      name: `${planName} - ${email}`,
      email: verifiedEmail,
      key_hash: rawKey,           // Your real column
      key_prefix: prefix,         // Your real column
      credits_remaining: credits, // Your real column
      word_count: credits,        // Your real column
      words_used: 0,              // Your real column
      is_active: false,           // PENDING Chairman - you go approve for /admin/keys
      payment_ref: payRef,
      // Optional if your table has these
      // amount_paid: amountPaidNaira,
      // plan: planName
    }]).select().single();

    if(error) {
      console.error('Insert error:', error);
      return res.status(500).json({ error: error.message, details: error });
    }

    return res.status(200).json({ 
      success: true, 
      api_key: rawKey, 
      full_key: rawKey,
      key: rawKey,
      key_hash: shaHash,
      email: verifiedEmail, 
      credits: credits,
      word_count: credits,
      package: planName,
      amount: amountPaidNaira,
      status: 'pending_approval',
      message: `✅ Verified ₦${amountPaidNaira.toLocaleString()} - PENDING Chairman approval in /admin/keys`
    });

  } catch(e){ 
    console.error('Paystack handler error:', e);
    return res.status(500).json({ error: e.message }); 
  }
}