import { supabaseAdmin } from '@/lib/supabase-admin'
export async function POST(req: Request) {
  const { id, action } = await req.json()
  await supabaseAdmin.from('api_payments').update({ payment_status: action==='approve'?'approved':'rejected' }).eq('id', id)
  return Response.json({ success: true })
}