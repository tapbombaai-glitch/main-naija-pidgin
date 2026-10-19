// api/voices.js - Vercel Serverless Function - Auto Download with API Key + 4 Languages + Credit Finished Notification ✅
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://rupuxvpupdhlhxgjrbsh.supabase.co";
const SUPABASE_KEY = "sb_publishable_DQ27GSl6cVVYy8s5U4ZsFA_ye9e-hpY";
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function hashKey(text){
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b=>b.toString(16).padStart(2,'0')).join('');
}

export default async function handler(req, res){
  // CORS for API customers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type, X-API-Key');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if(req.method === 'OPTIONS') return res.status(200).end();

  // 1. Get API key from header OR query ?key=sk_xxx (for easy test)
  const auth = req.headers.authorization || '';
  let rawKey = auth.replace('Bearer ', '').trim();
  if(!rawKey && req.query.key) rawKey = req.query.key;
  if(req.headers['x-api-key']) rawKey = req.headers['x-api-key'];
  
  if(!rawKey || !rawKey.startsWith('sk_')){
    return res.status(401).json({ 
      error: 'Missing API key! Use Authorization: Bearer sk_free_xxx or sk_live_xxx or ?key=sk_xxx',
      languages: 'Add ?language=hausa,igbo,yoruba,pidgin or ?language=all - Download 4 together!',
      examples: {
        all_4: 'GET /api/voices?language=hausa,igbo,yoruba,pidgin -H "Authorization: Bearer sk_live_xxx"',
        only_hausa: 'GET /api/voices?language=hausa -H "Authorization: Bearer sk_live_xxx"',
        c_example: 'curl -H "Authorization: Bearer sk_live_xxx" https://main-naija-pidgin.vercel.app/api/voices?language=hausa,igbo,yoruba,pidgin'
      }
    });
  }

  // 2. Hash and check key in DB
  const keyHash = await hashKey(rawKey);
  const { data: keyData, error } = await supabase.from('api_keys').select('*').eq('key_hash', keyHash).eq('is_active', true).single();
  if(error || !keyData){
    return res.status(401).json({ error: 'Invalid or inactive API key! Key not found!' });
  }

  // 3. CREDIT HAS FINISHED NOTIFICATION - Check if exhausted! 🚨
  if(keyData.is_exhausted){
    const maxWords = keyData.max_words || (rawKey.startsWith('sk_free_') ? 100 : 1000);
    return res.status(403).json({
      error: rawKey.startsWith('sk_free_') ? 'FREE LIMIT REACHED! 100 words once per email!' : 'PAID LIMIT REACHED! 1000 words per ₦5,000!',
      message: `Your credit has finished! You don use ${keyData.words_used}/${maxWords} words! 🚨 CREDIT HAS FINISHED!`,
      solution: rawKey.startsWith('sk_free_') 
        ? 'Use another email for new FREE 100 words at /api/login OR Buy PAID ₦5,000 - Moniepoint 8067955573' 
        : 'Buy NEW PAID key for another 1000 words - Pay ₦5,000 again - Moniepoint 8067955573 Kingsley Alfred Suoye',
      email: keyData.email,
      words_used: keyData.words_used,
      max_words: maxWords,
      exhausted: true,
      notification: '🚨 CREDIT HAS FINISHED! Your credit has finished! Must get new API key!',
      credit_status: 'FINISHED'
    });
  }

  // 4. Check limit: sk_free_ = 100 words, sk_live_ = 1000 words
  const isFree = rawKey.startsWith('sk_free_');
  const maxWords = keyData.max_words || (isFree ? 100 : 1000);
  const wordsUsedBefore = keyData.words_used || 0;
  const wordsRemainingBefore = maxWords - wordsUsedBefore;

  if(wordsRemainingBefore <= 0){
    await supabase.from('api_keys').update({is_exhausted: true}).eq('id', keyData.id);
    return res.status(403).json({
      error: 'CREDIT HAS FINISHED! No remaining words!',
      message: `Your credit has finished! Used ${wordsUsedBefore}/${maxWords}`,
      exhausted: true,
      notification: '🚨 CREDIT HAS FINISHED!'
    });
  }

  // 5. LANGUAGE FILTER - ADD 4 LANGUAGES TOGETHER - NO DESTROY PLAN! ✅
  const host = req.headers.host || 'main-naija-pidgin.vercel.app';
  const fullUrl = new URL(req.url, `https://${host}`);
  const languageParam = fullUrl.searchParams.get('language') || fullUrl.searchParams.get('languages') || 'all';
  
  let languageFilterNormalized = [];
  if(languageParam && languageParam.toLowerCase() !== 'all'){
    languageFilterNormalized = languageParam.toLowerCase().split(',').map(l=>{
      let ll = l.trim();
      if(ll.includes('hausa') || ll.includes('awosa') || ll === 'ha') return 'hausa';
      if(ll.includes('igbo') || ll.includes('ibo') || ll === 'ig') return 'igbo';
      if(ll.includes('yoruba') || ll.includes('yorub') || ll === 'yo') return 'yoruba';
      if(ll.includes('pidgin') || ll.includes('pigeon') || ll.includes('pigin') || ll === 'pi') return 'pidgin';
      return ll;
    });
    languageFilterNormalized = [...new Set(languageFilterNormalized)];
  }

  // 6. Fetch recordings - With language filter + Limit by remaining credit
  let query = supabase.from('recordings').select('*').order('created_at', {ascending: false}).limit(100);
  if(languageFilterNormalized.length > 0){
    query = query.in('language', languageFilterNormalized);
  }
  const { data: recordings, error: recError } = await query;
  if(recError) return res.status(500).json({ error: recError.message });

  // Calculate total words customer fit access - Respect remaining credit!
  let totalWords = 0;
  let filtered = [];
  for(let r of recordings){
    if(totalWords + r.word_count > wordsRemainingBefore) break;
    totalWords += r.word_count;
    filtered.push({
      file_name: r.file_name,
      pidgin_text: r.pidgin_text,
      word_count: r.word_count,
      language: r.language || 'pidgin',
      audio_url: r.audio_url,
      download_with_api_key: `https://main-naija-pidgin.vercel.app/api/download?file=${encodeURIComponent(r.audio_path)}&key=${rawKey}&language=${r.language||'pidgin'}`,
      created_at: r.created_at
    });
  }

  // Update usage
  const newWordsUsed = wordsUsedBefore + totalWords;
  const isNowExhausted = newWordsUsed >= maxWords;
  await supabase.from('api_keys').update({
    words_used: newWordsUsed,
    is_exhausted: isNowExhausted
  }).eq('id', keyData.id);

  // 7. Return JSON - Customer fit auto download with language + credit status!
  return res.status(200).json({
    success: true,
    key_type: isFree ? 'sk_free_ - FREE 100 words - Once per email' : 'sk_live_ - PAID 1000 words - ₦5,000 once per payment',
    key_prefix: keyData.key_prefix,
    email: keyData.email,
    total_recordings: filtered.length,
    total_words: totalWords,
    total_words_this_request: totalWords,
    words_used_before: wordsUsedBefore,
    words_used_now: newWordsUsed,
    words_remaining: maxWords - newWordsUsed,
    max_allowed: maxWords,
    languages_filter: languageFilterNormalized.length > 0 ? languageFilterNormalized : ['all'],
    languages_in_this_request: languageFilterNormalized.length > 0 ? languageFilterNormalized : ['hausa','igbo','yoruba','pidgin'],
    total_by_language: {
      hausa: filtered.filter(r=>r.language==='hausa').length,
      igbo: filtered.filter(r=>r.language==='igbo').length,
      yoruba: filtered.filter(r=>r.language==='yoruba').length,
      pidgin: filtered.filter(r=>r.language==='pidgin').length,
    },
    credit_status: isNowExhausted ? '🚨 CREDIT HAS FINISHED! Your credit has finished!' : `ACTIVE - ${maxWords - newWordsUsed} words left`,
    notification: isNowExhausted ? '🚨 CREDIT HAS FINISHED! Must buy new credit! Free: new email, Paid: new ₦5,000!' : null,
    message: isNowExhausted 
      ? `Data delivered ${totalWords} words - CREDIT NOW FINISHED! Used ${newWordsUsed}/${maxWords} - Need new credit!`
      : `Use download_with_api_key or audio_url to download file auto with API key! Languages: ${languageFilterNormalized.length>0?languageFilterNormalized.join(','):'all'}`,
    examples: {
      all_4_together: `https://main-naija-pidgin.vercel.app/api/voices?language=hausa,igbo,yoruba,pidgin -H "Authorization: Bearer ${rawKey.substring(0,18)}..."`,
      only_hausa: `https://main-naija-pidgin.vercel.app/api/voices?language=hausa`,
      only_igbo: `https://main-naija-pidgin.vercel.app/api/voices?language=igbo`,
      only_yoruba: `https://main-naija-pidgin.vercel.app/api/voices?language=yoruba`,
    },
    c_example: `C: curl -H "Authorization: Bearer ${rawKey.substring(0,18)}..." "https://main-naija-pidgin.vercel.app/api/voices?language=hausa,igbo,yoruba,pidgin"`,
    data: filtered
  });
}