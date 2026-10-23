// api/download.js - FINAL - Secure download - Bearer only, no path traversal, authorized only
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl=process.env.SUPABASE_URL||process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey=process.env.SUPABASE_SERVICE_ROLE_KEY||process.env.SUPABASE_SERVICE_KEY;
if(!supabaseUrl||!supabaseServiceKey) throw new Error('SUPABASE_SERVICE_ROLE_KEY missing');

const supabaseAdmin=createClient(supabaseUrl, supabaseServiceKey);
function hashKey(k){ return crypto.createHash('sha256').update(k).digest('hex'); }
function isSafeFilePath(file){
  if(!file||typeof file!=='string') return false;
  const t=file.trim(); if(t.length===0||t.length>300) return false;
  if(t.includes('..')||t.includes('\\')||t.startsWith('/')||t.startsWith('\\')||t.includes('\0')) return false;
  const parts=t.split('/'); for(const p of parts){ if(p===''||p==='.'||p==='..') return false; }
  return true;
}

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
    if(req.query.key||req.query.api_key) return res.status(401).json({error:'API key in URL not allowed - Use Bearer header', code:'URL_KEY_NOT_ALLOWED'});
    return res.status(401).json({error:'API key required via Bearer', code:'NO_BEARER'});
  }
  const fileParam=(req.query.file||'').toString().trim();
  if(!fileParam) return res.status(400).json({error:'Missing ?file= parameter', code:'MISSING_FILE'});
  if(!isSafeFilePath(fileParam)) return res.status(400).json({error:'Invalid file path - Path traversal not allowed', code:'INVALID_FILE_PATH'});

  try{
    let keyData=null;
    const {data:rawData, error:rawErr}=await supabaseAdmin.from('api_keys').select('*').eq('key_hash', apiKey).eq('is_active', true).maybeSingle();
    if(rawErr){ console.error('DB error raw download:', rawErr); return res.status(500).json({error:'Database error', code:'DB_ERROR_RAW'}); }
    if(rawData) keyData=rawData;
    else{
      const hashed=hashKey(apiKey);
      const {data:hashSha, error:hashShaErr}=await supabaseAdmin.from('api_keys').select('*').eq('key_hash_sha256', hashed).eq('is_active', true).maybeSingle();
      if(hashShaErr){ console.error('DB error hash_sha download:', hashShaErr); return res.status(500).json({error:'Database error', code:'DB_ERROR_HASH_SHA'}); }
      if(hashSha) keyData=hashSha;
      else{
        const {data:hashOld, error:hashOldErr}=await supabaseAdmin.from('api_keys').select('*').eq('key_hash', hashed).eq('is_active', true).maybeSingle();
        if(hashOldErr){ console.error('DB error fallback download:', hashOldErr); return res.status(500).json({error:'Database error', code:'DB_ERROR_FALLBACK'}); }
        keyData=hashOld;
      }
    }
    if(!keyData) return res.status(401).json({error:'Invalid API key', code:'INVALID_KEY'});

    const creditsRemaining=keyData.credits_remaining ?? ((keyData.max_words||keyData.credits_total||keyData.word_count||0) - (keyData.words_used||keyData.credits_used||0));
    if(keyData.is_exhausted||creditsRemaining<=0) return res.status(403).json({error:'CREDIT FINISHED', code:'EXHAUSTED'});

    // Check file exists in recordings table + approved only
    const {data:rec1}=await supabaseAdmin.from('recordings').select('*').eq('audio_path', fileParam).maybeSingle();
    const {data:rec2}=rec1?{data:rec1}:await supabaseAdmin.from('recordings').select('*').eq('file_name', fileParam).maybeSingle();
    const recording=rec1||rec2;
    if(!recording) return res.status(404).json({error:'File not found in recordings database', code:'FILE_NOT_IN_DB'});
    if(recording.is_approved===false) return res.status(403).json({error:'Recording not approved', code:'NOT_APPROVED'});

    const storagePath=recording.audio_path||recording.file_name||fileParam;
    if(!isSafeFilePath(storagePath)) return res.status(400).json({error:'Invalid stored path', code:'INVALID_STORED_PATH'});

    const {data:fileData, error:dlErr}=await supabaseAdmin.storage.from('pidgin-recordings').download(storagePath);
    if(dlErr){ console.error('Storage download error:', dlErr); return res.status(404).json({error:'File not found in storage', code:'STORAGE_FILE_NOT_FOUND'}); }

    const buffer=await fileData.arrayBuffer();
    res.setHeader('Content-Type','audio/wav');
    res.setHeader('Content-Disposition', `attachment; filename="${(storagePath.split('/').pop()||'voice.wav').replace(/"/g,'')}"`);
    return res.status(200).send(Buffer.from(buffer));
  }catch(e){ console.error('Unexpected download error:', e); return res.status(500).json({error:'Unexpected server error', code:'SERVER_ERROR'}); }
}