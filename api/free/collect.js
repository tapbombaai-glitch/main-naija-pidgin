// api/free/collect.js - PROPOSED - Free 100 credits, 1 per email, server-side eligibility
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

export default async function handler(req,res){
  res.setHeader('Access-Control-Allow-Origin','*');
  res.setHeader('Access-Control-Allow-Methods','POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers','Content-Type');
  if(req.method==='OPTIONS') return res.status(200).end();
  if(req.method!=='POST') return res.status(405).json({error:'Use POST'});

  try{
    const {email, name} = req.body;
    const cleanEmail = (email||'').toLowerCase().trim();
    if(!cleanEmail.includes('@')) return res.status(400).json({error:'Valid email required'});

    // Server-side eligibility: 1 free per email
    const {data: existingFree} = await supabaseAdmin.from('api_keys').select('id').eq('email', cleanEmail).like('payment_ref','free_%').maybeSingle();
    if(existingFree) return res.status(409).json({error:'Free key already claimed for this email', code:'FREE_ALREADY_CLAIMED'});

    // Also prevent if paid key already exists? Allow - Free + paid separate
    const rawKey = `mnp_${crypto.randomBytes(24).toString('hex')}`;
    const shaHash = crypto.createHash('sha256').update(rawKey).digest('hex');
    const prefix = rawKey.substring(0,16);
    const credits = 100; // Free 100 as per approved

    const {data, error} = await supabaseAdmin.from('api_keys').insert([{
      name:`FREE 100 - ${cleanEmail}`,
      email:cleanEmail,
      key_hash: rawKey,
      key_hash_sha256: shaHash,
      key_prefix: prefix,
      credits_total: credits,
      credits_remaining: credits,
      max_words: credits,
      word_count: credits,
      words_used: 0,
      credits_used: 0,
      is_active: true, // Free active immediately, no chairman
      is_exhausted: false,
      payment_ref:`free_${cleanEmail}_${Date.now()}`
    }]).select().single();

    if(error){
      if(error.code==='23505') return res.status(409).json({error:'Free key already exists'});
      return res.status(500).json({error:error.message});
    }

    return res.status(200).json({success:true, api_key:rawKey, full_key:rawKey, email:cleanEmail, credits, type:'FREE 100'});
  }catch(e){ return res.status(500).json({error:e.message}); }
}