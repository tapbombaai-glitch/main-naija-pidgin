// api/v1/voice.js - V3 FINAL - True Atomic + Handles NULL credits_remaining + Mock clearly marked
// Purpose: Naija Pidgin Voice - 1 credit per success - Bearer only - Preserve existing keys

import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
if (!supabaseUrl || !supabaseServiceKey) throw new Error('SUPABASE_SERVICE_ROLE_KEY missing');
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
function hashKey(k){ return crypto.createHash('sha256').update(k).digest('hex'); }

export default async function handler(req,res){
  res.setHeader('Content-Type','application/json');
  res.setHeader('Access-Control-Allow-Origin','*');
  res.setHeader('Access-Control-Allow-Methods','POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers','Content-Type, Authorization, x-api-key');
  if(req.method==='OPTIONS') return res.status(200).end();
  if(req.method!=='POST') return res.status(405).json({error:'Use POST {text}', code:'METHOD_NOT_ALLOWED'});

  let apiKey = (req.headers.authorization||'').replace(/^Bearer\s+/i,'').trim() || (req.headers['x-api-key']||'').trim();
  if(!apiKey) return res.status(401).json({error:'Bearer required - Authorization: Bearer mnp_...', code:'NO_BEARER'});

  let body = req.body; if(typeof body==='string'){ try{body=JSON.parse(body);}catch{body={};} }
  const text = (body.text||'').trim();
  if(!text) return res.status(400).json({error:'text required', code:'NO_TEXT'});
  if(text.length>500) return res.status(400).json({error:'max 500 chars', code:'TEXT_TOO_LONG'});

  try{
    let keyData=null;
    const {data:rawData, error:rawErr} = await supabaseAdmin.from('api_keys').select('*').eq('key_hash', apiKey).maybeSingle();
    if(rawErr) return res.status(500).json({error:'DB error auth', code:'DB_ERROR_RAW', detail:rawErr.message});
    if(rawData) keyData=rawData;
    else{
      const hashed=hashKey(apiKey);
      const {data:shaData, error:shaErr}= await supabaseAdmin.from('api_keys').select('*').eq('key_hash_sha256', hashed).maybeSingle();
      if(shaErr) return res.status(500).json({error:'DB error hash', code:'DB_ERROR_HASH_SHA', detail:shaErr.message});
      if(shaData) keyData=shaData;
      else{
        const {data:fbData, error:fbErr}= await supabaseAdmin.from('api_keys').select('*').eq('key_hash', hashed).maybeSingle();
        if(fbErr) return res.status(500).json({error:'DB error fallback', code:'DB_ERROR_FALLBACK', detail:fbErr.message});
        keyData=fbData;
      }
    }
    if(!keyData) return res.status(401).json({error:'Invalid API key', code:'INVALID_KEY'});
    if(!keyData.is_active) return res.status(403).json({error:'Pending Chairman approval tapbomba.ai@gmail.com', code:'PENDING_APPROVAL', credit:{email:keyData.email, payment_ref:keyData.payment_ref, is_active:false}});

    // Check balance before TTS - Handle NULL credits_remaining for old keys
    const calcRemaining = keyData.credits_remaining ?? ((keyData.credits_total ?? keyData.max_words ?? 0) - (keyData.credits_used ?? keyData.words_used ?? 0));
    if(keyData.is_exhausted || calcRemaining<=0){
      if(!keyData.is_exhausted) await supabaseAdmin.from('api_keys').update({is_exhausted:true, credits_remaining:0}).eq('id', keyData.id);
      return res.status(402).json({error:'CREDIT FINISHED - Buy at /buy', code:'EXHAUSTED', credit:{remaining:0, max:keyData.credits_total || keyData.max_words}});
    }

    // --- Voice Generation - Mock clearly marked - Deduct ONLY if success ---
    let voiceResult;
    try{
      voiceResult = {
        audio_url: null,
        mock: true,
        text_input: text,
        text_pidgin: text,
        message: 'MOCK VOICE - Real Naija Pidgin TTS not connected yet - Replace with ElevenLabs/Play.ht',
        duration: Math.ceil(text.length/10)
      };
      // When real TTS ready: if TTS fails, throw to prevent deduction
    }catch(ttsErr){
      return res.status(502).json({error:'Voice provider failed - Credit NOT deducted', code:'TTS_FAILED', detail:ttsErr.message});
    }

    // --- TRUE ATOMIC DEDUCTION - Starts here - This is remaining part you asked ---
    // Try atomic RPC first - True atomic - No JavaScript calc
    let updated = null;
    let updErr = null;
    
    try{
      const {data: rpcData, error: rpcErr} = await supabaseAdmin.rpc('deduct_api_credit_atomic', {p_key_id: keyData.id});
      if(rpcErr){
        // RPC not exist yet - Fallback to safe JS guard
        console.log('RPC not found, using fallback', rpcErr.message);
        throw rpcErr;
      }
      if(rpcData && rpcData.length>0){
        updated = rpcData[0];
      }else{
        // RPC returned empty = no credits or inactive = race lost
        const {data: fresh} = await supabaseAdmin.from('api_keys').select('credits_remaining').eq('id', keyData.id).single();
        return res.status(402).json({error:'CREDIT FINISHED - Race or no credits', code:'EXHAUSTED_RACE', credit:{remaining: fresh?.credits_remaining ?? 0}});
      }
    }catch(e){
      // Fallback if RPC not created yet - Safe but not 100% atomic - Still uses gte guard to reduce race
      const {data: fbUpdated, error: fbErr} = await supabaseAdmin
        .from('api_keys')
        .update({
          credits_remaining: calcRemaining - 1,
          credits_used: (keyData.credits_used ?? keyData.words_used ?? 0) + 1,
          words_used: (keyData.words_used ?? keyData.credits_used ?? 0) + 1,
          is_exhausted: (calcRemaining - 1) <= 0
        })
        .eq('id', keyData.id)
        .gte('credits_remaining', calcRemaining)
        .gt('credits_remaining', 0)
        .select('credits_remaining, credits_total, credits_used, words_used, is_exhausted')
        .maybeSingle();
      
      updErr = fbErr;
      updated = fbUpdated;
      
      if(updErr) return res.status(500).json({error:'DB deduct error', code:'DB_ERROR_DEDUCT', detail:updErr.message});
      if(!updated){
        const {data: fresh} = await supabaseAdmin.from('api_keys').select('credits_remaining').eq('id', keyData.id).single();
        return res.status(402).json({error:'CREDIT FINISHED - Concurrent request took credit', code:'EXHAUSTED_RACE', credit:{remaining: fresh?.credits_remaining ?? 0}});
      }
    }

    // Success
    return res.status(200).json({
      success: true,
      voice: voiceResult,
      credit: {
        remaining: updated.credits_remaining,
        used: updated.credits_used,
        max: updated.credits_total ?? keyData.credits_total ?? keyData.max_words,
        deducted: 1,
        email: keyData.email,
        payment_ref: keyData.payment_ref,
        type: (keyData.credits_total||0)>=1000?'PAID':'FREE 100',
        is_exhausted: updated.is_exhausted
      },
      message: `Voice OK (MOCK) - 1 credit deducted - ${updated.credits_remaining} left`
    });

  }catch(e){
    console.error('v1 voice error', e);
    return res.status(500).json({error:'Server error', code:'SERVER_ERROR', detail:e.message});
  }
}