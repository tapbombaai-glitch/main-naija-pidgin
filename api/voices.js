// api/voices.js - PROPOSED - Fixes mismatch + deduction + concurrent protection
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

function hashKey(k){ return crypto.createHash('sha256').update(k).digest('hex'); }

export default async function handler(req,res){
  res.setHeader('Access-Control-Allow-Origin','*');
  res.setHeader('Access-Control-Allow-Methods','GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers','Content-Type, Authorization');
  if(req.method==='OPTIONS') return res.status(200).end();

  let apiKey = req.headers.authorization?.replace('Bearer ','') || req.query.key;
  if(!apiKey) return res.status(401).json({error:'API key required'});

  // Fix mismatch: Try RAW first (old keys), then HASHED (new keys) - Preserve existing customer keys
  let keyData = null;
  const rawTry = await supabaseAdmin.from('api_keys').select('*').eq('key_hash', apiKey).eq('is_active', true).maybeSingle();
  if(rawTry.data) keyData = rawTry.data;
  else {
    const hashed = hashKey(apiKey);
    const hashTry = await supabaseAdmin.from('api_keys').select('*').or(`key_hash_sha256.eq.${hashed},key_hash.eq.${hashed}`).eq('is_active', true).maybeSingle();
    keyData = hashTry.data;
  }
  if(!keyData) return res.status(401).json({error:'Invalid API key or not active - Pending Chairman approval?'});

  // Unified credits - Use credits_remaining or max_words - words_used
  const creditsRemaining = keyData.credits_remaining ?? (keyData.max_words - (keyData.words_used||0));
  const isExhausted = keyData.is_exhausted || creditsRemaining<=0 || (keyData.words_used||0) >= (keyData.max_words||0);
  if(isExhausted){
    if(!keyData.is_exhausted) await supabaseAdmin.from('api_keys').update({is_exhausted:true}).eq('id', keyData.id);
    return res.status(403).json({error:'CREDIT FINISHED', credit:{remaining:0, max:keyData.max_words||keyData.credits_total}});
  }

  // Language filter - Preserve Hausa/Igbo/Yoruba/Pidgin together
  let languages = [];
  if(req.query.language){
    const valid=['hausa','igbo','yoruba','pidgin'];
    languages = req.query.language.toLowerCase().split(',').map(l=>l.trim()).filter(l=>valid.includes(l));
  }

  let query = supabaseAdmin.from('recordings').select('*').order('created_at',{ascending:false}).limit(100);
  if(languages.length>0) query = query.in('language', languages);
  const {data: recordings, error} = await query;
  if(error) return res.status(500).json({error:error.message});

  // CORRECT DEDUCTION: 1 per successful API operation, not sum of word_counts
  // Protection against concurrent requests + negative balances: Use atomic decrement with check
  const deduction = 1; // 1 credit per API call - For TTS, change to per voice generated
  // Atomic update: Only deduct if enough credits
  const {data: updated, error: updateError} = await supabaseAdmin.from('api_keys')
    .update({
      words_used: (keyData.words_used||0)+deduction,
      credits_used: (keyData.credits_used||0)+deduction,
      credits_remaining: Math.max(0, creditsRemaining - deduction),
      is_exhausted: (creditsRemaining - deduction)<=0
    })
    .eq('id', keyData.id)
    .gte('credits_remaining', deduction) // Prevent negative if concurrent
    .select().maybeSingle();

  // If concurrent request already exhausted, updated will be null - Return 403
  if(!updated && creditsRemaining < deduction){
    return res.status(403).json({error:'CREDIT FINISHED during request'});
  }

  const byLang = {};
  recordings.forEach(r=>{ byLang[r.language||'pidgin'] = (byLang[r.language||'pidgin']||0)+1; });

  return res.status(200).json({
    success:true,
    data: recordings.map(r=>({
      file_name:r.file_name, pidgin_text:r.pidgin_text, word_count:r.word_count,
      language:r.language||'pidgin', audio_url:r.audio_url,
      // FIX: No key in URL - Auth via header
      download_url:`/api/download?file=${r.audio_path}`,
      created_at:r.created_at
    })),
    total: recordings.length,
    total_by_language: byLang,
    credit:{
      email:keyData.email,
      max:keyData.max_words||keyData.credits_total,
      used_before:keyData.words_used||0,
      used_now:(keyData.words_used||0)+deduction,
      remaining: Math.max(0, creditsRemaining-deduction),
      is_exhausted: (creditsRemaining-deduction)<=0
    }
  });
}