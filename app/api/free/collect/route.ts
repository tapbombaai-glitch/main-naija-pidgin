// app/api/free/collect/route.ts - FREE 100 - No double free - Balanced
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
const supabaseAdmin = supabaseUrl && serviceKey ? createClient(supabaseUrl, serviceKey) : null;

function getHeaders(){
  return {
    'Content-Type':'application/json',
    'Access-Control-Allow-Origin':'*',
    'Access-Control-Allow-Methods':'POST, OPTIONS',
    'Access-Control-Allow-Headers':'Content-Type'
  };
}

export async function POST(req: NextRequest) {
  if (!supabaseAdmin) {
    return NextResponse.json({ success: false, error: 'Server configuration incomplete - SUPABASE_URL / SERVICE_ROLE_KEY missing' }, { status: 500, headers: getHeaders() });
  }

  try {
    const body = await req.json();
    const cleanEmail = String(body.email || '').trim().toLowerCase();
    const name = String(body.name || 'Customer').trim().slice(0,100);

    if (cleanEmail.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      return NextResponse.json({ success: false, error: 'Enter valid email - e.g. kingselysuoye@gmail.com' }, { status: 400, headers: getHeaders() });
    }

    // ✅ FIX: Check BOTH old FREE-100 and new free_% - Prevents 2nd free
    const { data: existingFree, error: lookupError } = await supabaseAdmin
      .from('api_keys')
      .select('id, key_prefix')
      .eq('email', cleanEmail)
      .or('payment_ref.eq.FREE-100,payment_ref.ilike.free_%')
      .limit(1);

    if (lookupError) {
      console.error('Free-key eligibility check failed:', lookupError);
      return NextResponse.json({ success: false, error: 'Could not verify free-key eligibility', detail: lookupError.message }, { status: 500, headers: getHeaders() });
    }
    if (existingFree && existingFree.length > 0) {
      return NextResponse.json({ success: false, code: 'FREE_ALREADY_CLAIMED', error: 'A free key already claimed for this email - Use existing or buy 5k ₦25k' }, { status: 409, headers: getHeaders() });
    }

    const rawKey = 'mnp_' + crypto.randomBytes(24).toString('hex');
    const shaHash = crypto.createHash('sha256').update(rawKey).digest('hex');
    const credits = 100;

    const record = {
      name: `FREE 100 - ${name}`,
      email: cleanEmail,
      key_hash: shaHash, // ✅ FIX: Store HASH not raw
      key_hash_sha256: shaHash,
      key_prefix: rawKey.substring(0,12) + '...',
      credits_total: credits,
      credits_remaining: credits,
      max_words: credits,
      word_count: credits,
      words_used: 0,
      credits_used: 0,
      is_active: true, // Free auto active
      is_exhausted: false,
      payment_ref: `free_${crypto.randomUUID()}`,
      payment_status: 'free',
      package: 'free-100'
    };

    const { error: insertError } = await supabaseAdmin.from('api_keys').insert([record as any]);
    if (insertError) {
      console.error('Free-key creation failed:', insertError);
      if (insertError.code === '23505') {
        return NextResponse.json({ success: false, code:'FREE_ALREADY_CLAIMED', error: 'Free key already claimed - Race' }, { status: 409, headers: getHeaders() });
      }
      return NextResponse.json({ success: false, error: 'Could not create free API key', detail: insertError.message }, { status: 500, headers: getHeaders() });
    }

    return NextResponse.json({
      success: true,
      api_key: rawKey,
      email: cleanEmail,
      credits: 100,
      type: 'FREE 100',
      credit: { remaining: 100, max: 100, used: 0, type:'FREE 100', is_active:true },
      usage: { bearer: `Authorization: Bearer ${rawKey}`, voice:'/api/v1/voice', balance:'/api/customer/balance' }
    }, { headers: getHeaders() });

  } catch (error: any) {
    console.error('Free-key endpoint failed:', error);
    return NextResponse.json({ success: false, error: 'Unexpected server error', detail: error.message }, { status: 500, headers: getHeaders() });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: getHeaders() });
}