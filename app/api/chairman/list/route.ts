import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ADMIN_EMAIL = "tapbomba.ai@gmail.com";

export async function GET(req: NextRequest) {
  try {
    const auth = req.headers.get("authorization");
    if (!auth?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Missing authorization token" }, { status: 401 });
    }
    const token = auth.slice(7);
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !anon) {
      return NextResponse.json({ error: "Supabase configuration missing" }, { status: 500 });
    }

    const client = createClient(url, anon, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: { user }, error: authError } = await client.auth.getUser(token);
    if (authError || !user || user.email?.toLowerCase() !== ADMIN_EMAIL) {
      return NextResponse.json({ error: "Chairman access only" }, { status: 403 });
    }

    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("email, is_chairman")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError || !profile || profile.email?.toLowerCase() !== ADMIN_EMAIL || profile.is_chairman !== true) {
      return NextResponse.json({ error: "Chairman profile verification failed" }, { status: 403 });
    }

    // ✅ ADJUSTED: Page system, no more 100 lock
    const { searchParams } = new URL(req.url);
    const page = Math.max(Number(searchParams.get("page") || 1), 1);
    const pageSize = 100;
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    // TRUE COUNTS - no download, no 1000 cap. Pending = total - approved - rejected
    const [totalResult, approvedResult, rejectedResult, recordingsResult] = await Promise.all([
      supabaseAdmin.from("recordings").select("*", { count: "exact", head: true }),
      supabaseAdmin.from("recordings").select("*", { count: "exact", head: true }).or("status.eq.approved,is_approved.eq.true"),
      supabaseAdmin.from("recordings").select("*", { count: "exact", head: true }).eq("status", "rejected"),
      supabaseAdmin.from("recordings").select("*").order("created_at", { ascending: false }).range(from, to),
    ]);

    const errors = [totalResult.error, approvedResult.error, rejectedResult.error, recordingsResult.error].filter(Boolean);
    if (errors.length > 0) {
      console.error("Chairman dashboard query errors:", errors);
      return NextResponse.json({ error: "Could not calculate recording statistics." }, { status: 500 });
    }

    const total = totalResult.count ?? 0;
    const approved = approvedResult.count ?? 0;
    const rejected = rejectedResult.count ?? 0;
    const pending = total - approved - rejected;

    return NextResponse.json(
      {
        stats: { total, approved, rejected, pending },
        recordings: recordingsResult.data || [],
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
        hasMore: page < Math.ceil(total / pageSize),
      },
      { headers: { "Cache-Control": "private, no-store, max-age=0" } }
    );
  } catch (error) {
    console.error("Chairman recording list error:", error);
    return NextResponse.json({ error: "Could not load recordings" }, { status: 500 });
  }
}