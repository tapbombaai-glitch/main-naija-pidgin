// api/customer/balance.js - Current Vercel Ready
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
  res.setHeader('Access-Control-Allow-Methods','GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers','Content-Type, Authorization, x-api-key');
  if(req.method==='OPTIONS') return res.status(200).end();

  let apiKey = (req.headers.authorization||'').replace(/^Bearer\s+/i,'').trim() || (req.headers['x-api-key']||'').trim() || (req.query.key||'').trim();
  // Note: query.key allowed here for balance only - Voice is Bearer only
  if(!apiKey) return res.status(401).json({error:'Bearer required', code:'NO_BEARER'});

  try{
    let keyData=null;
    // --- EXPECTED LOOKUP SEQUENCE - 3-step for backward compat ---
    // 1. Try raw directly - For legacy records where key_hash = raw mnp_...
    const {data: rawData, error: rawErr} = await supabaseAdmin.from('api_keys').select('*').eq('key_hash', apiKey).maybeSingle();
    if(rawErr) return res.status(500).json({error:'DB error raw', code:'DB_ERROR_RAW', detail:rawErr.message});
    if(rawData) keyData=rawData;
    else{
      // 2. Hash submitted key with SHA-256 - Search key_hash_sha256 - For new hash-only storage
      const hashed = hashKey(apiKey);
      const {data: shaData, error: shaErr} = await supabaseAdmin.from('api_keys').select('*').eq('key_hash_sha256', hashed).maybeSingle();
      if(shaErr) return res.status(500).json({error:'DB error hash', code:'DB_ERROR_HASH_SHA', detail:shaErr.message});
      if(shaData) keyData=shaData;
      else{
        // 3. Support legacy where key_hash = hash (fallback)
        const {data: fbData, error: fbErr} = await supabaseAdmin.from('api_keys').select('*').eq('key_hash', hashed).maybeSingle();
        if(fbErr) return res.status(500).json({error:'DB error fallback', code:'DB_ERROR_FALLBACK', detail:fbErr.message});
        keyData=fbData;
      }
    }

    if(!keyData) return res.status(401).json({error:'Invalid key', code:'INVALID_KEY'});
    if(!keyData.is_active) return res.status(403).json({error:'Pending Chairman approval', code:'PENDING_APPROVAL'});

    const remaining = keyData.credits_remaining ?? ((keyData.credits_total ?? keyData.max_words ?? 0) - (keyData.credits_used ?? keyData.words_used ?? 0));
    return res.status(200).json({
      success:true,
      credit:{
        email:keyData.email,
        remaining: remaining,
        max: keyData.credits_total ?? keyData.max_words,
        used: keyData.credits_used ?? keyData.words_used,
        is_active: keyData.is_active,
        is_exhausted: keyData.is_exhausted || remaining<=0,
        type: (keyData.credits_total||0)>=1000?'PAID':'FREE 100',
        prefix: keyData.key_prefix,
        payment_ref: keyData.payment_ref
      }
    });
  }catch(e){ return res.status(500).json({error:'Server error', detail:e.message}); }
}