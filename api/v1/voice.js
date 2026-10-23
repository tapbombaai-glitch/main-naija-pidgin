// api/v1/voice.js - REAL CODE - Reviewed 12:14/12:22/12:31 PM videos
// - Preserves old customers (key_hash, sha256, api_key)
// - Mock returns audio_url:null, NO deduction
// - Real path disabled until TTS provider connected
// - Uses verified param p_api_key_id uuid

import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

function hashKey(k){ return crypto.createHash('sha256').update(k).digest('hex'); }

export default async function handler(req,res){
  res.setHeader('Content-Type','application/json');
  res.setHeader('Access-Control-Allow-Origin','*');
  res.setHeader('Access-Control-Allow-Methods','POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers','Content-Type, Authorization, x-api-key');
  if(req.method==='OPTIONS') return res.status(200).end();

  let apiKey = (req.headers.authorization||'').replace(/^Bearer\s+/i,'').trim() || (req.headers['x-api-key']||'').trim();
  if(!apiKey) return res.status(401).json({error:'Bearer required', code:'NO_BEARER', mock:true, audio_url:null});

  let body = req.body; if(typeof body==='string'){ try{body=JSON.parse(body)}catch{body={}} }
  const text = (body?.text || req.query?.text || '').toString().trim();
  if(!text) return res.status(400).json({error:'Text required', mock:true, audio_url:null});

  try{
    // --- 4-STEP AUTH - Preserve existing customers ---
    let keyData=null;
    const {data: rawData, error: rawErr} = await supabaseAdmin.from('api_keys').select('*').eq('key_hash', apiKey).maybeSingle();
    if(rawErr) return res.status(500).json({error:'DB error raw', code:'DB_ERROR_RAW', detail:rawErr.message, mock:true, audio_url:null});
    if(rawData) keyData=rawData;
    else{
      const hashed = hashKey(apiKey);
      const {data: shaData, error: shaErr} = await supabaseAdmin.from('api_keys').select('*').eq('key_hash_sha256', hashed).maybeSingle();
      if(shaErr) return res.status(500).json({error:'DB error hash', code:'DB_ERROR_HASH_SHA', detail:shaErr.message, mock:true, audio_url:null});
      if(shaData) keyData=shaData;
      else{
        const {data: fbData, error: fbErr} = await supabaseAdmin.from('api_keys').select('*').eq('key_hash', hashed).maybeSingle();
        if(fbErr) return res.status(500).json({error:'DB error fallback', code:'DB_ERROR_FALLBACK', detail:fbErr.message, mock:true, audio_url:null});
        keyData=fbData;
        if(!keyData){
          const {data: legacyApiData, error: legacyErr} = await supabaseAdmin.from('api_keys').select('*').eq('api_key', apiKey).maybeSingle();
          if(legacyErr) return res.status(500).json({error:'DB error api_key', code:'DB_ERROR_APIKEY', detail:legacyErr.message, mock:true, audio_url:null});
          keyData=legacyApiData;
        }
      }
    }

    if(!keyData) return res.status(401).json({error:'Invalid key', code:'INVALID_KEY', mock:true, audio_url:null});
    if(!keyData.is_active) return res.status(403).json({error:'Pending Chairman approval', code:'PENDING_APPROVAL', mock:true, audio_url:null});

    const remaining = keyData.credits_remaining ?? ((keyData.credits_total ?? keyData.max_words ?? 0) - (keyData.credits_used ?? keyData.words_used ?? 0));
    if(remaining <= 0) return res.status(402).json({error:'No credits', code:'NO_CREDITS', remaining, mock:true, audio_url:null});

    // --- REAL TTS DISABLED - MOCK PATH - NO DEDUCTION ---
    const isRealTtsConnected = false; // Keep false until real Naija Pidgin provider connected
    if(!isRealTtsConnected){
      return res.status(200).json({
        success: true,
        mock: true,
        audio_url: null,
        message: 'MOCK VOICE - Real Naija Pidgin TTS not connected yet - NO CREDIT DEDUCTED',
        text,
        credits_remaining: remaining,
        credits: remaining,
        email: keyData.email
      });
    }

    // --- REAL PATH - Only runs when isRealTtsConnected = true + provider connected ---
    // Step 1: Deduct atomically with verified param
    const {data: deductData, error: deductErr} = await supabaseAdmin.rpc('deduct_api_credit_atomic', { p_api_key_id: keyData.id });
    if(deductErr) return res.status(500).json({error:'Deduct failed', detail:deductErr.message, mock:false, audio_url:null});

    const newRemaining = deductData?.[0]?.remaining ?? deductData?.[0]?.credits_remaining ?? (remaining - 1);

    // Step 2: TODO - Connect real provider here (ElevenLabs / Play.ht etc)
    // Example: const audioUrl = await generate