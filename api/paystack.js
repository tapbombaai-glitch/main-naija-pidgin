// api/paystack.js - Card payment for Naija Pidgin Voice - Hausa Igbo Yoruba Pidgin
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

export default async function handler(req, res) {
  // CORS for all
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if(req.method === 'OPTIONS') return res.status(200).end();

  // GET - Show payment page info
  if(req.method === 'GET') {
    return res.status(200).json({
      message: 'Naija Pidgin Voice - Card Payment API',
      price: '₦5,000 for 1000 words',
      languages: ['hausa','igbo','yoruba','pidgin'],
      how_to: 'POST with {email, payment_ref} from Paystack',
      example: {
        email: 'customer@gmail.com',
        payment_ref: 'naija_123456789 from Paystack'
      }
    });
  }

  if(req.method !== 'POST') {
    return res.status(405).json({ error: 'Use POST for payment verification' });
  }

  try {
    const { email, payment_ref } = req.body;

    if(!email || !payment_ref) {
      return res.status(400).json({ error: 'Email and payment_ref required' });
    }

    // Check if email already used for PAID key - Once per email!
    const { data: existingPaid } = await supabase
      .from('api_keys')
      .select('email')
      .eq('email', email)
      .gte('max_words', 1000)
      .limit(1);

    if(existingPaid && existingPaid.length > 0) {
      return res.status(400).json({ 
        error: '🚨 CREDIT RULE: Paid key already used once for this email. Use new email or contact Chairman!',
        email: email
      });
    }

    // Verify payment with Paystack - If PAYSTACK_SECRET_KEY set, verify, else skip for testing
    const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY;
    let paymentVerified = false;

    if(PAYSTACK_SECRET) {
      const verifyRes = await fetch(`https://api.paystack.co/transaction/verify/${payment_ref}`, {
        headers: { Authorization: `Bearer ${PAYSTACK_SECRET}` }
      });
      const verifyData = await verifyRes.json();
      
      if(verifyData.status && verifyData.data.status === 'success' && verifyData.data.amount >= 500000) {
        paymentVerified = true;
      } else {
        return res.status(400).json({ 
          error: 'Payment not verified - Card payment failed or amount not ₦5,000',
          paystack_response: verifyData
        });
      }
    } else {
      // For testing without Paystack key - Allow any ref starting with naija_
      if(payment_ref.startsWith('naija_') || payment_ref.startsWith('test_')) {
        paymentVerified = true;
      }
    }

    if(!paymentVerified) {
      return res.status(400).json({ error: 'Payment verification failed' });
    }

    // Create PAID API key - 1000 words!
    const randomStr = Math.random().toString(36).substring(2, 10);
    const apiKey = `sk_paid_${Date.now()}_${randomStr}`;
    const key_hash = crypto.createHash('sha256').update(apiKey).digest('hex');
    const key_prefix = apiKey.substring(0, 16);

    // Save to Supabase
    const { data, error } = await supabase.from('api_keys').insert({
      name: `Paid 1000 words - ${email} - Card`,
      key_hash: key_hash,
      key_prefix: key_prefix,
      email: email,
      max_words: 1000,
      words_used: 0,
      is_exhausted: false,
      payment_ref: payment_ref,
      is_active: true
    }).select().single();

    if(error) {
      console.error('Supabase error:', error);
      return res.status(500).json({ error: 'Failed to create API key: ' + error.message });
    }

    // Success - Return API key!
    return res.status(200).json({
      success: true,
      message: '✅ Payment successful! Card payment confirmed! 💳',
      api_key: apiKey,
      key_prefix: key_prefix,
      email: email,
      max_words: 1000,
      words_used: 0,
      payment_ref: payment_ref,
      languages: {
        available: ['hausa','igbo','yoruba','pidgin'],
        how_to_use: 'Use ?language=hausa or ?language=hausa,igbo,yoruba,pidgin for all together'
      },
      usage_examples: {
        all_languages: `curl -H "Authorization: Bearer ${apiKey}" "https://main-naija-pidgin.vercel.app/api/voices?language=hausa,igbo,yoruba,pidgin"`,
        hausa_only: `curl -H "Authorization: Bearer ${apiKey}" "https://main-naija-pidgin.vercel.app/api/voices?language=hausa"`,
        igbo_only: `curl -H "Authorization: Bearer ${apiKey}" "https://main-naija-pidgin.vercel.app/api/voices?language=igbo"`,
        yoruba_only: `curl -H "Authorization: Bearer ${apiKey}" "https://main-naija-pidgin.vercel.app/api/voices?language=yoruba"`,
        pidgin_only: `curl -H "Authorization: Bearer ${apiKey}" "https://main-naija-pidgin.vercel.app/api/voices?language=pidgin"`
      },
      credit_info: {
        rule: '1000 words once per email - FREE 100 also once per email',
        when_finished: '🚨 CREDIT HAS FINISHED! - Buy with new email or contact Chairman',
        tracking: 'words_used increases with each download'
      },
      save_this: '⚠️ SAVE THIS API KEY - We show only once! Use for all 4 languages!'
    });

  } catch(err) {
    console.error('Paystack API error:', err);
    return res.status(500).json({ error: 'Server error: ' + err.message });
  }
}