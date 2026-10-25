// app/api/download/route.ts - FINAL Secure - Bearer only, no path traversal, authorized only
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabaseUrl=process.env.SUPABASE_URL||process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey=process.env.SUPABASE_SERVICE_ROLE_KEY||process.env.SUPABASE_SERVICE_KEY;
if(!supabaseUrl||!supabaseServiceKey) throw new Error('SUPABASE_SERVICE_ROLE_KEY missing');

const supabaseAdmin=createClient(supabaseUrl, supabaseServiceKey);
function hashKey(k:string){ return crypto.createHash('sha256').update(k).digest('hex'); }
function isSafeFilePath(file:any){
  if(!file||typeof file!=='string') return false;
  const t=file.trim(); if(t.length===0||t.length>300) return false;
  if(t.includes('..')||t.includes('\\')||t.startsWith('/')||t.startsWith('\\')||t.includes('\0')) return false;
  const parts=t.split('/'); for(const p of parts){ if(p===''||p==='.'||p==='..') return false; }
  return true;
}
function getHeaders(){
  return {
    'Access-Control-Allow-Origin':'*',
    'Access-Control-Allow-Methods':'GET, OPTIONS',
    'Access-Control-Allow-Headers':'Content-Type, Authorization, x-api-key'
  };
}

export async function GET(req: NextRequest){
  let apiKey=''; const auth=req.headers.get('authorization')||'';
  if(auth){
    if(auth.toLowerCase().startsWith('bearer ')) apiKey=auth.replace(/^Bearer\s+/i,'').trim();
    else if(auth.trim()!=='') return NextResponse.json({error:'Invalid Authorization scheme - Use Bearer', code:'INVALID_AUTH_SCHEME'}, {status:401, headers: getHeaders()});
  }
  if(!apiKey) apiKey=(req.headers.get('x-api-key')||'').trim();
  if(!apiKey){
    if(req.nextUrl.searchParams.get('key')||req.nextUrl.searchParams.get('api_key')) return NextResponse.json({error:'API key in URL not allowed - Use Bearer header', code:'URL_KEY_NOT_ALLOWED'}, {status:401, headers: getHeaders()});
    return NextResponse.json({error:'API key required via Bearer', code:'NO_BEARER'}, {status:401, headers: getHeaders()});
  }
  const fileParam=(req.nextUrl.searchParams.get('file')||'').toString().trim();
  if(!fileParam) return NextResponse.json({error:'Missing ?file= parameter', code:'MISSING_FILE'}, {status:400, headers: getHeaders()});
  if(!isSafeFilePath(fileParam)) return NextResponse.json({error:'Invalid file path - Path traversal not allowed', code:'INVALID_FILE_PATH'}, {status:400, headers: getHeaders()});

  try{
    let keyData:any=null;
    const {data:rawData, error:rawErr}=await supabaseAdmin.from('api_keys').select('*').eq('key_hash', apiKey).eq('is_active', true).maybeSingle();
    if(rawErr){ console.error('DB error raw download:', rawErr); return NextResponse.json({error:'Database error', code:'DB_ERROR_RAW'}, {status:500, headers: getHeaders()}); }
    if(rawData) keyData=rawData;
    else{
      const hashed=hashKey(apiKey);
      const {data:hashSha, error:hashShaErr}=await supabaseAdmin.from('api_keys').select('*').eq('key_hash_sha256', hashed).eq('is_active', true).maybeSingle();
      if(hashShaErr){ console.error('DB error hash_sha download:', hashShaErr); return NextResponse.json({error:'Database error', code:'DB_ERROR_HASH_SHA'}, {status:500, headers: getHeaders()}); }
      if(hashSha) keyData=hashSha;
      else{
        const {data:hashOld, error:hashOldErr}=await supabaseAdmin.from('api_keys').select('*').eq('key_hash', hashed).eq('is_active', true).maybeSingle();
        if(hashOldErr){ console.error('DB error fallback download:', hashOldErr); return NextResponse.json({error:'Database error', code:'DB_ERROR_FALLBACK'}, {status:500, headers: getHeaders()}); }
        keyData=hashOld;
      }
    }
    if(!keyData) return NextResponse.json({error:'Invalid API key', code:'INVALID_KEY'}, {status:401, headers: getHeaders()});

    const creditsRemaining=keyData.credits_remaining ?? ((keyData.max_words||keyData.credits_total||keyData.word_count||0) - (keyData.words_used||keyData.credits_used||0));
    if(keyData.is_exhausted||creditsRemaining<=0) return NextResponse.json({error:'CREDIT FINISHED', code:'EXHAUSTED'}, {status:403, headers: getHeaders()});

    // Check file exists in recordings table + approved only
    const {data:rec1}=await supabaseAdmin.from('recordings').select('*').eq('audio_path', fileParam).maybeSingle();
    const {data:rec2}=rec1?{data:rec1}:await supabaseAdmin.from('recordings').select('*').eq('file_name', fileParam).maybeSingle();
    const recording=rec1||rec2;
    if(!recording) return NextResponse.json({error:'File not found in recordings database', code:'FILE_NOT_IN_DB'}, {status:404, headers: getHeaders()});
    if((recording as any).is_approved===false) return NextResponse.json({error:'Recording not approved', code:'NOT_APPROVED'}, {status:403, headers: getHeaders()});

    const storagePath=(recording as any).audio_path||(recording as any).file_name||fileParam;
    if(!isSafeFilePath(storagePath)) return NextResponse.json({error:'Invalid stored path', code:'INVALID_STORED_PATH'}, {status:400, headers: getHeaders()});

    const {data:fileData, error:dlErr}=await supabaseAdmin.storage.from('pidgin-recordings').download(storagePath);
    if(dlErr){ console.error('Storage download error:', dlErr); return NextResponse.json({error:'File not found in storage', code:'STORAGE_FILE_NOT_FOUND'}, {status:404, headers: getHeaders()}); }

    const buffer=await fileData.arrayBuffer();
    const headers = {
      ...getHeaders(),
      'Content-Type':'audio/wav',
      'Content-Disposition': `attachment; filename="${(storagePath.split('/').pop()||'voice.wav').replace(/"/g,'')}"`
    };
    return new NextResponse(Buffer.from(buffer), { status: 200, headers });
  }catch(e:any){ console.error('Unexpected download error:', e); return NextResponse.json({error:'Unexpected server error', code:'SERVER_ERROR'}, {status:500, headers: getHeaders()}); }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: getHeaders() });
}