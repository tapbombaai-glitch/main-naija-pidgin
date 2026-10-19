// api/download.js - Auto download wav file with API key validation ✅
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
  res.setHeader('Access-Control-Allow-Origin', '*');
  const { file, key } = req.query;
  const authKey = key || (req.headers.authorization || '').replace('Bearer ', '');
  
  if(!authKey || !file){
    return res.status(400).json({ error: 'Need ?file=path&key=sk_xxx or Authorization Bearer key' });
  }

  // Validate API key
  const keyHash = await hashKey(authKey);
  const { data: keyData } = await supabase.from('api_keys').select('*').eq('key_hash', keyHash).eq('is_active', true).single();
  if(!keyData) return res.status(401).json({ error: 'Invalid API key!' });

  // Download file from Supabase storage and stream to customer - Auto download!
  const { data, error } = await supabase.storage.from('pidgin-recordings').download(file);
  if(error) return res.status(404).json({ error: 'File not found: '+error.message });

  // Force download with API key validation passed!
  res.setHeader('Content-Type', 'audio/wav');
  res.setHeader('Content-Disposition', `attachment; filename="${file.split('/').pop()}"`);
  const buffer = await data.arrayBuffer();
  return res.status(200).send(Buffer.from(buffer));
}