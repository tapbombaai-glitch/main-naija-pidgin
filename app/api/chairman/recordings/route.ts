import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";

const ADMIN_EMAIL = "tapbomba.ai@gmail.com";

export async function POST(req: NextRequest) {
  try {
    const auth = req.headers.get("authorization");

    if (!auth?.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Missing token" },
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
        { error: "Chairman only" },
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

    const body = await req.json();
    const { id, status } = body;

    if (
      typeof id !== "string" ||
      !["approved", "rejected", "pending"].includes(status)
    ) {
      return NextResponse.json(
        { error: "Invalid recording ID or status" },
        { status: 400 }
      );
    }

    const { data: recording, error: findError } =
      await supabaseAdmin
        .from("recordings")
        .select("id")
        .eq("id", id)
        .maybeSingle();

    if (findError) {
      return NextResponse.json(
        { error: findError.message },
        { status: 500 }
      );
    }

    if (!recording) {
      return NextResponse.json(
        { error: "Recording not found" },
        { status: 404 }
      );
    }

    const { error: updateError } = await supabaseAdmin
      .from("recordings")
      .update({
        status,
        is_approved: status === "approved",
      })
      .eq("id", id);

    if (updateError) {
      return NextResponse.json(
        { error: updateError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Recording ${status} successfully`,
    });

  } catch (error) {
    console.error("Chairman approval error:", error);

    return NextResponse.json(
      { error: "Recording update failed" },
      { status: 500 }
    );
  }
}