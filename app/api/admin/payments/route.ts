import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CHAIRMAN_EMAIL = "tapbomba.ai@gmail.com";
// MINIMUM_PAYOUT deleted - no more ₦5,000 restriction, no unused constant

// >>> YOUR RATE - CHANGE ONLY HERE IF NA ₦30 <<<
const RATE_PER_APPROVED_RECORDING = 20;

function getEnv(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing environment variable: ${name}`);
  return value;
}

async function getChairman(request: NextRequest) {
  try {
    const supabaseUrl = getEnv("NEXT_PUBLIC_SUPABASE_URL");
    const anonKey = getEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");
    const serviceRoleKey = getEnv("SUPABASE_SERVICE_ROLE_KEY");
    const authorization = request.headers.get("authorization");
    if (!authorization?.startsWith("Bearer ")) {
      return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
    }
    const token = authorization.replace("Bearer ", "").trim();
    if (!token) {
      return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
    }
    const supabaseAuth = createClient(supabaseUrl, anonKey, { auth: { autoRefreshToken: false, persistSession: false } });
    const { data: { user }, error: userError } = await supabaseAuth.auth.getUser(token);
    if (userError || !user) {
      return { error: NextResponse.json({ error: "Invalid authentication" }, { status: 401 }) };
    }
    if (user.email?.toLowerCase() !== CHAIRMAN_EMAIL.toLowerCase()) {
      return { error: NextResponse.json({ error: "Chairman access required" }, { status: 403 }) };
    }
    const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });
    const { data: profile, error: profileError } = await admin.from("profiles").select("id, email, is_chairman").eq("id", user.id).maybeSingle();
    if (profileError) return { error: NextResponse.json({ error: "Unable to verify Chairman account" }, { status: 500 }) };
    if (!profile || profile.is_chairman !== true || profile.email?.toLowerCase() !== CHAIRMAN_EMAIL.toLowerCase()) {
      return { error: NextResponse.json({ error: "Chairman access required" }, { status: 403 }) };
    }
    return { admin, user };
  } catch (error) {
    console.error("Chairman authentication error:", error);
    return { error: NextResponse.json({ error: "Authentication failed" }, { status: 500 }) };
  }
}

async function fetchAll(admin: any, table: string, select: string, filters?: (q: any) => any) {
  const all: any[] = [];
  let from = 0;
  const pageSize = 1000;
  while (true) {
    let q = admin.from(table).select(select).range(from, from + pageSize - 1);
    if (filters) q = filters(q);
    const { data, error } = await q;
    if (error) throw error;
    if (!data || data.length === 0) break;
    all.push(...data);
    if (data.length < pageSize) break;
    from += pageSize;
  }
  return all;
}

function calcApproved(recordings: any[]) {
  const map = new Map<string, { count: number; total: number }>();
  for (const r of recordings || []) {
    if (!r.worker_id) continue;
    const earnings = Number(r.earnings || 0);
    const cur = map.get(r.worker_id) || { count: 0, total: 0 };
    cur.count += 1;
    if (Number.isFinite(earnings) && earnings > 0) cur.total += earnings;
    else cur.total += RATE_PER_APPROVED_RECORDING;
    map.set(r.worker_id, cur);
  }
  return map;
}

export async function GET(request: NextRequest) {
  const chairman = await getChairman(request);
  if ("error" in chairman) return chairman.error;
  const { admin } = chairman;
  try {
    const workerProfiles = await fetchAll(admin, "worker_profiles", "worker_id, full_name, email, state, city");
    const workers = await fetchAll(admin, "workers", "worker_id, full_name, bank_name, account_number, account_name");
    const recordings = await fetchAll(admin, "recordings", "worker_id, earnings, is_approved", (q) => q.eq("is_approved", true));
    const payments = await fetchAll(admin, "payments", "id, worker_id, amount, payment_reference, payment_method, notes, paid_by, paid_at");
    payments.sort((a, b) => new Date(b.paid_at || 0).getTime() - new Date(a.paid_at || 0).getTime());
    const workerMap = new Map<string, any>();
    for (const w of workerProfiles || []) {
      if (!w.worker_id) continue;
      workerMap.set(w.worker_id, { worker_id: w.worker_id, full_name: w.full_name || "", email: w.email || "", state: w.state || "", city: w.city || "", bank_name: "", account_number: "", account_name: "" });
    }
    for (const w of workers || []) {
      if (!w.worker_id) continue;
      const existing = workerMap.get(w.worker_id);
      workerMap.set(w.worker_id, { worker_id: w.worker_id, full_name: existing?.full_name || w.full_name || "", email: existing?.email || "", state: existing?.state || "", city: existing?.city || "", bank_name: w.bank_name || "", account_number: w.account_number || "", account_name: w.account_name || "" });
    }
    const approvedMap = calcApproved(recordings);
    const paidByWorker = new Map<string, number>();
    for (const p of payments || []) {
      if (!p.worker_id) continue;
      const amount = Number(p.amount || 0);
      if (!Number.isFinite(amount) || amount <= 0) continue;
      paidByWorker.set(p.worker_id, (paidByWorker.get(p.worker_id) || 0) + amount);
    }
    const workerIds = new Set<string>([...workerMap.keys(), ...approvedMap.keys(), ...paidByWorker.keys()]);
    const workerResults = Array.from(workerIds).map((workerId) => {
      const worker = workerMap.get(workerId) || { worker_id: workerId, full_name: "", email: "", state: "", city: "", bank_name: "", account_number: "", account_name: "" };
      const approvedInfo = approvedMap.get(workerId) || { count: 0, total: 0 };
      const approved = approvedInfo.total;
      const approved_count = approvedInfo.count;
      const paid = paidByWorker.get(workerId) || 0;
      const outstanding = Math.max(approved - paid, 0);
      return {
        worker_id: workerId,
        name: worker.full_name, email: worker.email, state: worker.state, city: worker.city,
        bank_name: worker.bank_name, account_number: worker.account_number, account_name: worker.account_name,
        approved_earnings: approved,
        approved_count,
        unpaid_count: approved_count,
        total_approved: approved_count,
        amount_paid: paid,
        outstanding,
        unpaid_amount: outstanding,
        minimum_payout: 0,
        eligible: outstanding > 0,
      };
    });
    workerResults.sort((a, b) => b.outstanding - a.outstanding || b.approved_count - a.approved_count);
    const paymentHistory = (payments || []).map((payment: any) => ({ id: payment.id, worker_id: payment.worker_id, amount: Number(payment.amount || 0), payment_reference: payment.payment_reference || "", payment_method: payment.payment_method || "", notes: payment.notes || "", paid_by: payment.paid_by || "", paid_at: payment.paid_at || null, status: "Recorded" }));
    const totalApproved = workerResults.reduce((s, w) => s + w.approved_earnings, 0);
    const totalPaid = workerResults.reduce((s, w) => s + w.amount_paid, 0);
    const totalOutstanding = Math.max(totalApproved - totalPaid, 0);
    return NextResponse.json({ success: true, workers: workerResults, payments: paymentHistory, overview: { total_earnings: totalApproved, total_paid: totalPaid, total_outstanding: totalOutstanding } });
  } catch (error) {
    console.error("GET /api/admin/payments failed:", error);
    return NextResponse.json({ error: "Could not load payment information" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const chairman = await getChairman(request);
  if ("error" in chairman) return chairman.error;
  const { admin, user } = chairman;
  try {
    const body = await request.json();
    const workerId = String(body.worker_id || "").trim();
    const amount = Number(body.amount);
    const paymentReference = String(body.payment_reference || "").trim();
    const paymentMethod = String(body.payment_method || "Bank transfer").trim();
    const notes = String(body.notes || "").trim();
    if (!workerId) return NextResponse.json({ error: "worker_id is required" }, { status: 400 });
    if (!Number.isFinite(amount) || amount <= 0) return NextResponse.json({ error: "A valid payment amount is required" }, { status: 400 });
    if (!paymentReference) return NextResponse.json({ error: "Bank transfer reference is required" }, { status: 400 });
    const { data: worker, error: workerError } = await admin.from("workers").select("worker_id").eq("worker_id", workerId).maybeSingle();
    if (workerError) return NextResponse.json({ error: "Could not verify worker" }, { status: 500 });
    if (!worker) return NextResponse.json({ error: "Worker account not found" }, { status: 404 });
    let approvedRecordings: any[];
    try {
      approvedRecordings = await fetchAll(admin, "recordings", "earnings", (q) => q.eq("worker_id", workerId).eq("is_approved", true));
    } catch (error) {
      console.error("Could not fetch approved recordings:", error);
      return NextResponse.json({ error: "Could not verify worker earnings" }, { status: 500 });
    }
    const approvedTotal = (approvedRecordings || []).reduce((sum, r: any) => {
      const earnings = Number(r.earnings || 0);
      if (Number.isFinite(earnings) && earnings > 0) return sum + earnings;
      return sum + RATE_PER_APPROVED_RECORDING;
    }, 0);
    let previousPayments: any[];
    try {
      previousPayments = await fetchAll(admin, "payments", "amount", (q) => q.eq("worker_id", workerId));
    } catch (error) {
      console.error("Could not fetch previous payments:", error);
      return NextResponse.json({ error: "Could not verify previous payments" }, { status: 500 });
    }
    const paidTotal = (previousPayments || []).reduce((sum, p: any) => { const v = Number(p.amount || 0); if (!Number.isFinite(v) || v <= 0) return sum; return sum + v; }, 0);
    const outstanding = Math.max(approvedTotal - paidTotal, 0);
    if (amount > outstanding) return NextResponse.json({ error: "Payment amount is greater than the worker's outstanding balance.", approved_earnings: approvedTotal, already_paid: paidTotal, outstanding, requested_payment: amount }, { status: 400 });
    const { data: duplicate, error: duplicateError } = await admin.from("payments").select("id").eq("payment_reference", paymentReference).maybeSingle();
    if (duplicateError) return NextResponse.json({ error: "Could not verify payment reference. Payment was not recorded." }, { status: 500 });
    if (duplicate) return NextResponse.json({ error: "This bank transfer reference has already been recorded." }, { status: 409 });
    const { data: payment, error: insertError } = await admin.from("payments").insert({ worker_id: workerId, amount, payment_reference: paymentReference, payment_method: paymentMethod, notes, paid_by: user.email || CHAIRMAN_EMAIL, paid_at: new Date().toISOString() }).select("id, worker_id, amount, payment_reference, payment_method, notes, paid_by, paid_at").single();
    if (insertError) {
      if (insertError.code === "23505") return NextResponse.json({ error: "This bank transfer reference has already been recorded." }, { status: 409 });
      return NextResponse.json({ error: "Payment could not be recorded" }, { status: 500 });
    }
    const remaining = Math.max(outstanding - amount, 0);
    return NextResponse.json({ success: true, payment: { ...payment, status: "Recorded" }, approved_earnings: approvedTotal, previous_paid: paidTotal, amount_paid: amount, remaining_outstanding: remaining });
  } catch (error) {
    console.error("POST /api/admin/payments failed:", error);
    return NextResponse.json({ error: "Could not process payment" }, { status: 500 });
  }
}