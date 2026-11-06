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
      return NextResponse.json(
        { error: "Missing authorization token" },
        { status: 401 }
      );
    }

    const token = auth.slice(7);
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!url || !anon) {
      return NextResponse.json(
        { error: "Supabase configuration missing" },
        { status: 500 }
      );
    }

    const client = createClient(url, anon, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const {
      data: { user },
      error: authError,
    } = await client.auth.getUser(token);

    if (
      authError ||
      !user ||
      user.email?.toLowerCase() !== ADMIN_EMAIL
    ) {
      return NextResponse.json(
        { error: "Chairman access only" },
        { status: 403 }
      );
    }

    const { data: profile, error: profileError } =
      await supabaseAdmin
        .from("profiles")
        .select("email, is_chairman")
        .eq("id", user.id)
        .maybeSingle();

    if (
      profileError ||
      !profile ||
      profile.email?.toLowerCase() !== ADMIN_EMAIL ||
      profile.is_chairman !== true
    ) {
      return NextResponse.json(
        { error: "Chairman profile verification failed" },
        { status: 403 }
      );
    }

    const { data: recordings, error } = await supabaseAdmin
      .from("recordings")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      recordings: recordings || [],
    });

  } catch (error) {
    console.error("Chairman recording list error:", error);

    return NextResponse.json(
      { error: "Could not load recordings" },
      { status: 500 }
    );
  }
}