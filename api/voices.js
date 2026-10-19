// api/voices.js - Complete - Hausa Igbo Yoruba Pidgin Together + Card Payment Keys + Credit Finished
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

function hashKey(key) {
  return crypto.createHash('sha256').update(key).digest('hex');
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if(req.method === 'OPTIONS') return res.status(200).end();

  // Get API key from header or query
  let apiKey = req.headers.authorization?.replace('Bearer ', '') || req.query.key;

  if(!apiKey) {
    return res.status(401).json({ 
      error: 'API key required - Get FREE 100 words or Buy 1000 words with card 💳',
      how_to_get: {
        free: 'POST to /api/free-key with email - Once per email',
        paid_card: 'Pay ₦5,000 with card via Paystack - POST to /api/paystack with payment_ref'
      }
    });
  }

  // Hash and find key
  const keyHash = hashKey(apiKey);
  const { data: keyData, error: keyError } = await supabase
    .from('api_keys')
    .select('*')
    .eq('key_hash', keyHash)
    .eq('is_active', true)
    .single();

  if(keyError || !keyData) {
    return res.status(401).json({ error: 'Invalid API key - Check key or buy new one' });
  }

  // Check if credit finished 🚨
  if(keyData.is_exhausted || keyData.words_used >= keyData.max_words) {
    // Mark as exhausted if not already
    if(!keyData.is_exhausted) {
      await supabase.from('api_keys').update({ is_exhausted: true }).eq('id', keyData.id);
    }
    
    return res.status(403).json({
      error: '🚨 CREDIT HAS FINISHED! 🚨',
      message: 'Your credit has finished! Words used up!',
      details: {
        email: keyData.email,
        max_words: keyData.max_words,
        words_used: keyData.words_used,
        remaining: 0,
        key_type: keyData.max_words >= 1000 ? 'PAID 1000' : 'FREE 100',
        language_support: ['hausa','igbo','yoruba','pidgin']
      },
      what_next: {
        free: 'Use new email for FREE 100 words once',
        paid: 'Pay ₦5,000 with card for PAID 1000 words - Use new email or contact Chairman',
        buy_url: 'POST to /api/paystack with Paystack payment_ref'
      }
    });
  }

  // Language filter - Handle single or multiple together!
  // ?language=hausa or ?language=hausa,igbo,yoruba,pidgin
  let languageFilter = req.query.language;
  let languages = [];
  
  if(languageFilter) {
    languages = languageFilter.toLowerCase().split(',').map(l => l.trim()).filter(l => l);
    // Validate languages
    const validLangs = ['hausa','igbo','yoruba','pidgin'];
    languages = languages.filter(l => validLangs.includes(l));
  }

  // Build query
  let query = supabase.from('recordings').select('*').order('created_at', { ascending: false }).limit(100);

  if(languages.length > 0) {
    query = query.in('language', languages);
  }

  const { data: recordings, error } = await query;

  if(error) {
    return res.status(500).json({ error: 'Failed to fetch recordings: ' + error.message });
  }

  // Calculate words to be used
  const totalWordsInResponse = recordings.reduce((sum, r) => sum + (r.word_count || 0), 0);

  // Update words_used - Add this batch
  const newWordsUsed = keyData.words_used + totalWordsInResponse;
  const isNowExhausted = newWordsUsed >= keyData.max_words;

  await supabase.from('api_keys').update({ 
    words_used: newWordsUsed,
    is_exhausted: isNowExhausted
  }).eq('id', keyData.id);

  // Group by language for customer to know!
  const byLanguage = {};
  recordings.forEach(r => {
    const lang = r.language || 'pidgin';
    byLanguage[lang] = (byLanguage[lang] || 0) + 1;
  });

  // Return with language info!
  return res.status(200).json({
    success: true,
    message: languages.length > 0 ? `Filtered by: ${languages.join(', ')}` : 'All languages - Hausa, Igbo, Yoruba, Pidgin',
    data: recordings.map(r => ({
      file_name: r.file_name,
      pidgin_text: r.pidgin_text,
      word_count: r.word_count,
      language: r.language || 'pidgin', // <-- Customer knows this one na Hausa, Igbo, etc!
      audio_url: r.audio_url,
      download_url: `https://main-naija-pidgin.vercel.app/api/download?file=${r.audio_path}&key=${apiKey}`,
      created_at: r.created_at
    })),
    total: recordings.length,
    total_by_language: byLanguage, // How many Hausa, Igbo, Yoruba, Pidgin!
    credit: {
      email: keyData.email,
      type: keyData.max_words >= 1000 ? 'PAID 1000 - Card Payment' : 'FREE 100',
      max_words: keyData.max_words,
      words_used_before: keyData.words_used,
      words_used_now: newWordsUsed,
      remaining: Math.max(0, keyData.max_words - newWordsUsed),
      is_exhausted: isNowExhausted,
      payment_ref: keyData.payment_ref || 'free'
    },
    languages_available: ['hausa','igbo','yoruba','pidgin'],
    filter_examples: {
      hausa_only: '?language=hausa',
      igbo_only: '?language=igbo',
      yoruba_only: '?language=yoruba',
      pidgin_only: '?language=pidgin',
      two_together: '?language=hausa,yoruba',
      all_together: '?language=hausa,igbo,yoruba,pidgin'
    },
    ...(isNowExhausted && {
      warning: '🚨 CREDIT HAS FINISHED AFTER THIS REQUEST! Buy new key with card!'
    })
  });
}