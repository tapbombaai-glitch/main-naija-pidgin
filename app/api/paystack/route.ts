// app/api/paystack/route.ts - PROPOSED - Preserves Paystack, fixes security + new packages
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
if(!supabaseUrl || !supabaseServiceKey) throw new Error('SUPABASE SERVICE ROLE missing - No anon fallback');
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

const PACKAGES: any = {
  '1k':  { credits: 1000,  amountKobo: 500000,  amountNaira: 5000,  name: 'Starter 1k' },
  '2k':  { credits: 2000,  amountKobo: 1000000, amountNaira: 10000, name: 'Standard 2k' },
  '5k':  { credits: 5000,  amountKobo: 2500000, amountNaira: 25000, name: 'Professional 5k' },
  '10k': { credits: 10000, amountKobo: 5000000, amountNaira: 50000, name: 'Professional 10k' }
};
const LEGACY_AMOUNTS: any = { 100000:1000, 2200000:5000 };

function getHeaders(){ return {'Content-Type':'application/json','Access-Control-Allow-Origin':'*','Access-Control-Allow-Methods':'POST, OPTIONS','Access-Control-Allow-Headers':'Content-Type'}; }

export async function POST(req: NextRequest){
  try{
    const body = await req.json();
    const {email, payment_ref, reference, packageId} = body;
    const payRef = (payment_ref || reference || '').trim();
    const frontendEmail = (email||'').toLowerCase().trim();
    if(!frontendEmail || !payRef) return NextResponse.json({error:'Email + payment_ref required'}, {status:400, headers: getHeaders()});

    const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY || process.env.PAYSTACK_SK_LIVE;
    if(!PAYSTACK_SECRET) return NextResponse.json({error:'PAYSTACK_SECRET_KEY missing'}, {status:500, headers: getHeaders()});

    // 1. Duplicate protection - No key exposure
    const {data: existing} = await supabaseAdmin.from('api_keys').select('id,email').eq('payment_ref', payRef).maybeSingle();
    if(existing){
      return NextResponse.json({error:'Payment already credited', ref: payRef, email: existing.email}, {status:409, headers: getHeaders()});
    }

    // 2. Verify with Paystack LIVE
    const verifyRes = await fetch(`https://api.paystack.co/transaction/verify/${payRef}`, {
      headers:{Authorization:`Bearer ${PAYSTACK_SECRET}`}
    });
    const verifyData = await verifyRes.json();
    if(!verifyData.status || verifyData.data.status!=='success'){
      return NextResponse.json({error:'Paystack not successful', data: verifyData}, {status:400, headers: getHeaders()});
    }

    const amountKobo = verifyData.data.amount;
    const amountNaira = amountKobo/100;
    const verifiedEmail = verifyData.data.customer.email.toLowerCase();
    const currency = verifyData.data.currency;

    // 3. Exact validation - Server decides credits, not frontend
    if(currency!=='NGN') return NextResponse.json({error:'Currency must be NGN'}, {status:400, headers: getHeaders()});
    if(verifiedEmail!==frontendEmail) return NextResponse.json({error:`Email mismatch: Paystack ${verifiedEmail} != ${frontendEmail}`}, {status:400, headers: getHeaders()});

    let credits, planName;
    const exactPkg = Object.values(PACKAGES).find((p:any)=>p.amountKobo===amountKobo);
    if(exactPkg){ credits=(exactPkg as any).credits; planName=(exactPkg as any).name; }
    else if(LEGACY_AMOUNTS[amountKobo]){ credits=LEGACY_AMOUNTS[amountKobo]; planName=`Legacy ${amountKobo/100}`; }
    else { return NextResponse.json({error:`Amount ₦${amountNaira} not in approved: ₦0, ₦5k, ₦10k, ₦25k, ₦50k`, amount:amountNaira}, {status:400, headers: getHeaders()}); }

    // 4. Secure key - crypto.randomBytes, not Math.random
    const rawKey = `mnp_${crypto.randomBytes(24).toString('hex')}`;
    const shaHash = crypto.createHash('sha256').update(rawKey).digest('hex');
    const prefix = rawKey.substring(0,16);

    // 5. Insert - Preserve columns, add new for compatibility
    const {data, error} = await supabaseAdmin.from('api_keys').insert([{
      name: `${planName} - ${verifiedEmail}`,
      email: verifiedEmail,
      key_hash: rawKey, // RAW for backward compat
      key_hash_sha256: shaHash,
      key_prefix: prefix,
      credits_total: credits,
      credits_remaining: credits,
      max_words: credits,
      word_count: credits,
      words_used: 0,
      credits_used: 0,
      is_active: false, // PENDING Chairman approval - Preserve workflow
      is_exhausted: false,
      payment_ref: payRef
    } as any]).select().single();

    if(error){
      if(error.code==='23505') return NextResponse.json({error:'Duplicate ref'}, {status:409, headers: getHeaders()});
      return NextResponse.json({error:error.message}, {status:500, headers: getHeaders()});
    }

    return NextResponse.json({
      success:true, api_key:rawKey, full_key:rawKey, email:verifiedEmail,
      credits, package:planName, amount:amountNaira, status:'pending_approval',
      message:`✅ Verified ₦${amountNaira} - ${credits} credits - Pending Chairman approval`
    }, {headers: getHeaders()});
  }catch(e:any){ return NextResponse.json({error:e.message}, {status:500, headers: getHeaders()}); }
}

export async function OPTIONS() {
  return new NextResponse(null, {status:200, headers: getHeaders()});
}