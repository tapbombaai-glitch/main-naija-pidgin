// app/api/voices/route.ts - FINAL - For API Key Dashboard - Fixes all 10 requirements
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
if (!supabaseUrl || !supabaseServiceKey) throw new Error('SUPABASE_SERVICE_ROLE_KEY missing');

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
function hashKey(k:string){ return crypto.createHash('sha256').update(k).digest('hex'); }
function getHeaders(){ return {'Access-Control-Allow-Origin':'*','Access-Control-Allow-Methods':'GET, OPTIONS','Access-Control-Allow-Headers':'Content-Type, Authorization, x-api-key','Content-Type':'application/json'}; }

export async function GET(req: NextRequest){
  let apiKey=''; const auth=req.headers.get('authorization')||'';
  if(auth){
    if(auth.toLowerCase().startsWith('bearer ')) apiKey=auth.replace(/^Bearer\s+/i,'').trim();
    else if(auth.trim()!=='') return NextResponse.json({error:'Invalid Authorization scheme - Use Bearer', code:'INVALID_AUTH_SCHEME'}, {status:401, headers: getHeaders()});
  }
  if(!apiKey) apiKey=(req.headers.get('x-api-key')||'').trim();
  if(!apiKey){
    if(req.nextUrl.searchParams.get('key')||req.nextUrl.searchParams.get('api_key')) return NextResponse.json({error:'API key in URL not allowed - Use Authorization: Bearer', code:'URL_KEY_NOT_ALLOWED'}, {status:401, headers: getHeaders()});
    return NextResponse.json({error:'API key required via Authorization: Bearer', code:'NO_BEARER'}, {status:401, headers: getHeaders()});
  }

  try{
    let keyData:any=null;
    const {data:rawData, error:rawErr}=await supabaseAdmin.from('api_keys').select('*').eq('key_hash', apiKey).eq('is_active', true).maybeSingle();
    if(rawErr){ console.error('DB error raw lookup voices:', rawErr); return NextResponse.json({error:'Database error', code:'DB_ERROR_RAW'}, {status:500, headers: getHeaders()}); }
    if(rawData) keyData=rawData;
    else{
      const hashed=hashKey(apiKey);
      const {data:hashSha, error:hashShaErr}=await supabaseAdmin.from('api_keys').select('*').eq('key_hash_sha256', hashed).eq('is_active', true).maybeSingle();
      if(hashShaErr){ console.error('DB error hash_sha:', hashShaErr); return NextResponse.json({error:'Database error', code:'DB_ERROR_HASH_SHA'}, {status:500, headers: getHeaders()}); }
      if(hashSha) keyData=hashSha;
      else{
        const {data:hashOld, error:hashOldErr}=await supabaseAdmin.from('api_keys').select('*').eq('key_hash', hashed).eq('is_active', true).maybeSingle();
        if(hashOldErr){ console.error('DB error fallback:', hashOldErr); return NextResponse.json({error:'Database error', code:'DB_ERROR_FALLBACK'}, {status:500, headers: getHeaders()}); }
        keyData=hashOld;
      }
    }
    if(!keyData){
      const hashedPending=hashKey(apiKey);
      const {data:pendingRaw}=await supabaseAdmin.from('api_keys').select('id,is_active,email,payment_ref').eq('key_hash', apiKey).maybeSingle();
      const {data:pendingSha}=await supabaseAdmin.from('api_keys').select('id,is_active,email,payment_ref').eq('key_hash_sha256', hashedPending).maybeSingle();
      const {data:pendingHashOld}=await supabaseAdmin.from('api_keys').select('id,is_active,email,payment_ref').eq('key_hash', hashedPending).maybeSingle();
      const pending=pendingRaw||pendingSha||pendingHashOld;
      if(pending && !pending.is_active) return NextResponse.json({error:'Pending Chairman approval', email:pending.email, payment_ref:pending.payment_ref, code:'PENDING_APPROVAL'}, {status:401, headers: getHeaders()});
      return NextResponse.json({error:'Invalid API key', code:'INVALID_KEY'}, {status:401, headers: getHeaders()});
    }

    const creditsRemaining=keyData.credits_remaining ?? ((keyData.max_words||keyData.credits_total||keyData.word_count||0) - (keyData.words_used||keyData.credits_used||0));
    const creditsTotal=keyData.credits_total ?? keyData.max_words ?? keyData.word_count ?? 0;
    const creditsUsed=keyData.credits_used ?? keyData.words_used ?? 0;

    if(keyData.is_exhausted || creditsRemaining<=0){
      if(!keyData.is_exhausted) await supabaseAdmin.from('api_keys').update({is_exhausted:true}).eq('id', keyData.id);
      return NextResponse.json({error:'CREDIT FINISHED', code:'EXHAUSTED', credit:{remaining:0, max:creditsTotal, used:creditsUsed}}, {status:403, headers: getHeaders()});
    }

    let languages:string[]=[];
    const langParam = req.nextUrl.searchParams.get('language');
    if(langParam){
      const valid=['hausa','igbo','yoruba','pidgin'];
      languages=langParam.toLowerCase().split(',').map((l:string)=>l.trim()).filter((l:string)=>valid.includes(l));
    }

    // Recordings FIRST - No deduction yet - Fix #4
    const limit = Math.min(100, parseInt(req.nextUrl.searchParams.get('limit')||'50')||50);
    let query=supabaseAdmin.from('recordings').select('file_name,pidgin_text,word_count,language,audio_url,audio_path,created_at,is_approved').order('created_at',{ascending:false}).limit(limit).eq('is_approved', true);
    if(languages.length>0) query=query.in('language', languages);
    const {data:recordings, error:recErr}=await query;
    if(recErr){ console.error('DB error recordings:', recErr); return NextResponse.json({error:'Failed to retrieve recordings - No credit deducted', code:'RECORDINGS_ERROR'}, {status:500, headers: getHeaders()}); }

    // Atomic deduction - No unsafe fallback - Fix #4
    const deduction=1;
    const {data:rpcData, error:rpcErr}=await supabaseAdmin.rpc('deduct_credit_atomic', {key_id:keyData.id, deduct_amount:deduction});
    if(rpcErr){
      console.error('deduct_credit_atomic missing or error:', rpcErr);
      return NextResponse.json({error:'Credit system not ready - Atomic function missing - No credit deducted - Contact admin to install deduct_credit_atomic', code:'NEEDS_MIGRATION', detail:'Function deduct_credit_atomic not installed'}, {status:500, headers: getHeaders()});
    }
    let rpcResult:any=Array.isArray(rpcData)?rpcData[0]:rpcData;
    if(!rpcResult || rpcResult.success===false){
      return NextResponse.json({error:'CREDIT FINISHED during concurrent request', code:'CONCURRENT_EXHAUSTED'}, {status:403, headers: getHeaders()});
    }

    const byLang:any={}; (recordings||[]).forEach((r:any)=>{ byLang[r.language||'pidgin']=(byLang[r.language||'pidgin']||0)+1; });

    return NextResponse.json({
      success:true,
      data:(recordings||[]).map((r:any)=>({ file_name:r.file_name, pidgin_text:r.pidgin_text, word_count:r.word_count, language:r.language||'pidgin', audio_url:r.audio_url, download_url:`/api/download?file=${encodeURIComponent(r.audio_path||r.file_name)}`, created_at:r.created_at })),
      total:recordings?.length||0, total_by_language:byLang,
      credit:{ email:keyData.email, remaining:rpcResult.credits_remaining, used_before:creditsUsed, used_now:rpcResult.words_used||rpcResult.credits_used, max:creditsTotal, payment_ref:keyData.payment_ref, status:'active' }
    }, {headers: getHeaders()});
  }catch(e:any){ console.error('Unexpected voices error:', e); return NextResponse.json({error:'Unexpected server error', code:'SERVER_ERROR'}, {status:500, headers: getHeaders()}); }
}

export async function OPTIONS() {
  return new NextResponse(null, {status:200, headers: getHeaders()});
}