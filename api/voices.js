// api/voices.js - Vercel Serverless Function - Auto Download with API Key ✅
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
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if(req.method === 'OPTIONS') return res.status(200).end();

  // 1. Get API key from header
  const auth = req.headers.authorization || '';
  const rawKey = auth.replace('Bearer ', '').trim();
  if(!rawKey || !rawKey.startsWith('sk_')){
    return res.status(401).json({ error: 'Missing API key! Use Authorization: Bearer sk_free_xxx or sk_live_xxx' });
  }

  // 2. Hash and check key in DB
  const keyHash = await hashKey(rawKey);
  const { data: keyData, error } = await supabase.from('api_keys').select('*').eq('key_hash', keyHash).eq('is_active', true).single();
  if(error || !keyData){
    return res.status(401).json({ error: 'Invalid or inactive API key!' });
  }

  // 3. Check limit: sk_free_ = 100 words, sk_live_ = 1000 words
  const isFree = rawKey.startsWith('sk_free_');
  const maxWords = isFree ? 100 : 1000;
  
  // 4. Fetch recordings - Limit by maxWords
  let query = supabase.from('recordings').select('*').order('created_at', {ascending: false}).limit(50);
  const { data: recordings, error: recError } = await query;
  if(recError) return res.status(500).json({ error: recError.message });

  // Calculate total words customer fit access
  let totalWords = 0;
  let filtered = [];
  for(let r of recordings){
    if(totalWords + r.word_count > maxWords) break;
    totalWords += r.word_count;
    filtered.push({
      file_name: r.file_name,
      pidgin_text: r.pidgin_text,
      word_count: r.word_count,
      audio_url: r.audio_url, // Direct download link
      download_with_api_key: `https://main-naija-pidgin.vercel.app/api/download?file=${r.audio_path}&key=${rawKey}`, // Auto download with API key!
      created_at: r.created_at
    });
  }

  // 5. Return JSON - Customer fit auto download!
  return res.status(200).json({
    success: true,
    key_type: isFree ? 'sk_free_ - FREE 100 words' : 'sk_live_ - PAID 1000 words',
    key_prefix: keyData.key_prefix,
    total_recordings: filtered.length,
    total_words: totalWords,
    max_allowed: maxWords,
    message: 'Use download_with_api_key or audio_url to download file auto with API key!',
    data: filtered
  });
}