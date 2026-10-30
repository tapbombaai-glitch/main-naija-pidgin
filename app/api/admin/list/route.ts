import { supabaseAdmin } from '@/lib/supabase-admin'
export async function GET() {
  const { data } = await supabaseAdmin.from('api_payments').select('*').eq('payment_status','pending_voice').order('created_at',{ascending:false}).limit(20)
  // If you use different table, change to 'custom_voices' where status='pending'
  return Response.json(data || [])
}