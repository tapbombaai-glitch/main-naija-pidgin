import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const reference = searchParams.get('reference');
  if (!reference) return NextResponse.redirect('/marketplace?error=no_ref');

  const verify = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
    headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` }
  });
  const data = await verify.json();
  
  if (data.status && data.data.status === 'success') {
    const pkg = data.data.metadata?.packageId || 'pro';
    const requests = pkg === 'growth' ? 2000 : pkg === 'scale' ? 10000 : 1000;
    // Add paid requests to user's key — update Supabase
    await supabase.from('api_keys').update({ paid_requests_remaining: requests }).eq('user_id', data.data.metadata?.userId);
    return NextResponse.redirect(`/marketplace?success=${pkg}&requests=${requests}`);
  }
  return NextResponse.redirect('/marketplace?error=payment_failed');
}