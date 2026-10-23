// api/voices.js - FINAL - For API Key Dashboard - Fixes all 10 requirements
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
if (!supabaseUrl || !supabaseServiceKey) throw new Error('SUPABASE_SERVICE_ROLE_KEY missing');

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
function hashKey(k){ return crypto.createHash('sha256').update(k).digest('hex'); }

export default async function handler(req,res){
  res.setHeader('Access-Control-Allow-Origin','*');
  res.setHeader('Access-Control-Allow-Methods','GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers','Content-Type, Authorization, x-api-key');
  if(req.method==='OPTIONS') return res.status(200).end();
  if(req.method!=='GET') return res.status(405).json({error:'Use GET method'});

  let apiKey=''; const auth=req.headers.authorization||'';
  if(auth){
    if(auth.toLowerCase().startsWith('bearer ')) apiKey=auth.replace(/^Bearer\s+/i,'').trim();
    else if(auth.trim()!=='') return res.status(401).json({error:'Invalid Authorization scheme - Use Bearer', code:'INVALID_AUTH_SCHEME'});
  }
  if(!apiKey) apiKey=(req.headers['x-api-key']||'').trim();
  if(!apiKey){
    if(req.query.key||req.query.api_key) return res.status(401).json({error:'API key in URL not allowed - Use Authorization: Bearer', code:'URL_KEY_NOT_ALLOWED'});
    return res.status(401).json({error:'API key required via Authorization: Bearer', code:'NO_BEARER'});
  }

  try{
    let keyData=null;
    const {data:rawData, error:rawErr}=await supabaseAdmin.from('api_keys').select('*').eq('key_hash', apiKey).eq('is_active', true).maybeSingle();
    if(rawErr){ console.error('DB error raw lookup voices:', rawErr); return res.status(500).json({error:'Database error', code:'DB_ERROR_RAW'}); }
    if(rawData) keyData=rawData;
    else{
      const hashed=hashKey(apiKey);
      const {data:hashSha, error:hashShaErr}=await supabaseAdmin.from('api_keys').select('*').eq('key_hash_sha256', hashed).eq('is_active', true).maybeSingle();
      if(hashShaErr){ console.error('DB error hash_sha:', hashShaErr); return res.status(500).json({error:'Database error', code:'DB_ERROR_HASH_SHA'}); }
      if(hashSha) keyData=hashSha;
      else{
        const {data:hashOld, error:hashOldErr}=await supabaseAdmin.from('api_keys').select('*').eq('key_hash', hashed).eq('is_active', true).maybeSingle();
        if(hashOldErr){ console.error('DB error fallback:', hashOldErr); return res.status(500).json({error:'Database error', code:'DB_ERROR_FALLBACK'}); }
        keyData=hashOld;
      }
    }
    if(!keyData){
      const hashedPending=hashKey(apiKey);
      const {data:pendingRaw}=await supabaseAdmin.from('api_keys').select('id,is_active,email,payment_ref').eq('key_hash', apiKey).maybeSingle();
      const {data:pendingSha}=await supabaseAdmin.from('api_keys').select('id,is_active,email,payment_ref').eq('key_hash_sha256', hashedPending).maybeSingle();
      const {data:pendingHashOld}=await supabaseAdmin.from('api_keys').select('id,is_active,email,payment_ref').eq('key_hash', hashedPending).maybeSingle();
      const pending=pendingRaw||pendingSha||pendingHashOld;
      if(pending && !pending.is_active) return res.status(401).json({error:'Pending Chairman approval', email:pending.email, payment_ref:pending.payment_ref, code:'PENDING_APPROVAL'});
      return res.status(401).json({error:'Invalid API key', code:'INVALID_KEY'});
    }

    const creditsRemaining=keyData.credits_remaining ?? ((keyData.max_words||keyData.credits_total||keyData.word_count||0) - (keyData.words_used||keyData.credits_used||0));
    const creditsTotal=keyData.credits_total ?? keyData.max_words ?? keyData.word_count ?? 0;
    const creditsUsed=keyData.credits_used ?? keyData.words_used ?? 0;

    if(keyData.is_exhausted || creditsRemaining<=0){
      if(!keyData.is_exhausted) await supabaseAdmin.from('api_keys').update({is_exhausted:true}).eq('id', keyData.id);
      return res.status(403).json({error:'CREDIT FINISHED', code:'EXHAUSTED', credit:{remaining:0, max:creditsTotal, used:creditsUsed}});
    }

    let languages=[];
    if(req.query.language){
      const valid=['hausa','igbo','yoruba','pidgin'];
      languages=req.query.language.toLowerCase().split(',').map(l=>l.trim()).filter(l=>valid.includes(l));
    }

    // Recordings FIRST - No deduction yet - Fix #4
    let query=supabaseAdmin.from('recordings').select('file_name,pidgin_text,word_count,language,audio_url,audio_path,created_at,is_approved').order('created_at',{ascending:false}).limit(Math.min(100, parseInt(req.query.limit||'50')||50)).eq('is_approved', true);
    if(languages.length>0) query=query.in('language', languages);
    const {data:recordings, error:recErr}=await query;
    if(recErr){ console.error('DB error recordings:', recErr); return res.status(500).json({error:'Failed to retrieve recordings - No credit deducted', code:'RECORDINGS_ERROR'}); }

    // Atomic deduction - No unsafe fallback - Fix #4
    const deduction=1;
    const {data:rpcData, error:rpcErr}=await supabaseAdmin.rpc('deduct_credit_atomic', {key_id:keyData.id, deduct_amount:deduction});
    if(rpcErr){
      console.error('deduct_credit_atomic missing or error:', rpcErr);
      return res.status(500).json({error:'Credit system not ready - Atomic function missing - No credit deducted - Contact admin to install deduct_credit_atomic', code:'NEEDS_MIGRATION', detail:'Function deduct_credit_atomic not installed'});
    }
    let rpcResult=Array.isArray(rpcData)?rpcData[0]:rpcData;
    if(!rpcResult || rpcResult.success===false){
      return res.status(403).json({error:'CREDIT FINISHED during concurrent request', code:'CONCURRENT_EXHAUSTED'});
    }

    const byLang={}; (recordings||[]).forEach(r=>{ byLang[r.language||'pidgin']=(byLang[r.language||'pidgin']||0)+1; });

    return res.status(200).json({
      success:true,
      data:(recordings||[]).map(r=>({ file_name:r.file_name, pidgin_text:r.pidgin_text, word_count:r.word_count, language:r.language||'pidgin', audio_url:r.audio_url, download_url:`/api/download?file=${encodeURIComponent(r.audio_path||r.file_name)}`, created_at:r.created_at })),
      total:recordings?.length||0, total_by_language:byLang,
      credit:{ email:keyData.email, remaining:rpcResult.credits_remaining, used_before:creditsUsed, used_now:rpcResult.words_used||rpcResult.credits_used, max:creditsTotal, payment_ref:keyData.payment_ref, status:'active' }
    });
  }catch(e){ console.error('Unexpected voices error:', e); return res.status(500).json({error:'Unexpected server error', code:'SERVER_ERROR'}); }
}