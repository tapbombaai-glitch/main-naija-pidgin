import { supabaseAdmin } from '@/lib/supabase-admin'

export async function POST(req: Request) {
  const body = await req.text()
  const signature = req.headers.get('x-paystack-signature') || ''
  
  // Verify signature
  const crypto = await import('crypto')
  const hash = crypto.createHmac('sha512', process.env.PAYSTACK_SECRET_KEY!).update(body).digest('hex')
  if (hash !== signature) return Response.json({ error: 'Invalid signature' }, { status: 401 })

  const event = JSON.parse(body)
  if (event.event !== 'charge.success') return Response.json({ received: true })

  const reference = event.data.reference
  const { data: payment } = await supabaseAdmin.from('api_payments').select('*').eq('reference', reference).single()
  if (!payment || payment.payment_status === 'successful') return Response.json({ received: true })

  await supabaseAdmin.from('api_payments').update({ payment_status: 'successful', paid_at: new Date().toISOString() }).eq('reference', reference)
  
  const { data: key } = await supabaseAdmin.from('api_keys').select('*').eq('user_id', payment.user_id).eq('is_active', true).order('created_at', { ascending: false }).limit(1).single()
  if (key) {
    await supabaseAdmin.from('api_keys').update({
      paid_requests_remaining: key.paid_requests_remaining + payment.credits,
      credits_remaining: key.free_requests_remaining + key.paid_requests_remaining + payment.credits,
    }).eq('id', key.id)
  }

  return Response.json({ success: true })
}