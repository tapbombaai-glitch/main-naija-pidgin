import { supabaseAdmin } from '@/lib/supabase-admin'

export async function POST(req: Request) {
  const body = await req.text()
  const signature = req.headers.get('x-paystack-signature') || ''
  
  // Verify signature - security!
  const crypto = await import('crypto')
  const hash = crypto.createHmac('sha512', process.env.PAYSTACK_SECRET_KEY!).update(body).digest('hex')
  if (hash !== signature) return Response.json({ error: 'Invalid signature' }, { status: 401 })

  const event = JSON.parse(body)
  if (event.event !== 'charge.success') return Response.json({ received: true })

  const reference = event.data.reference
  const amount = event.data.amount / 100 // Convert kobo to Naira

  // Get payment from DB
  const { data: payment } = await supabaseAdmin.from('api_payments').select('*').eq('reference', reference).single()
  if (!payment || payment.payment_status === 'successful') return Response.json({ received: true })

  // YOUR SMALL PRICE LOGIC - FOR START START 👑
  let creditsToGive = payment.credits // use what you saved
  // If no credits saved, use small price mapping
  if (!creditsToGive || creditsToGive === 0) {
    if (amount >= 10000) creditsToGive = 2500  // ₦10k = 2500 voices
    else if (amount >= 5000) creditsToGive = 1000   // ₦5k = 1000 voices
    else if (amount >= 2000) creditsToGive = 300    // ₦2k = 300 voices
    else if (amount >= 1000) creditsToGive = 100    // ₦1k = 100 voices
    else creditsToGive = 50 // small test
  }

  // Mark payment successful
  await supabaseAdmin.from('api_payments').update({ 
    payment_status: 'successful', 
    paid_at: new Date().toISOString(),
    credits: creditsToGive // save correct credits
  }).eq('reference', reference)
  
  // Give credits to API key automatically
  const { data: key } = await supabaseAdmin.from('api_keys').select('*').eq('user_id', payment.user_id).eq('is_active', true).order('created_at', { ascending: false }).limit(1).single()
  
  if (key) {
    await supabaseAdmin.from('api_keys').update({
      paid_requests_remaining: (key.paid_requests_remaining || 0) + creditsToGive,
      credits_remaining: (key.free_requests_remaining || 0) + (key.paid_requests_remaining || 0) + creditsToGive,
    }).eq('id', key.id)
  }

  console.log(`✅ Chairman money! User ${payment.user_id} paid ₦${amount} - gave ${creditsToGive} voices`)

  return Response.json({ success: true, credits: creditsToGive })
}