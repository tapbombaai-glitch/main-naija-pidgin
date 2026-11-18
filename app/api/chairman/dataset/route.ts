import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ADMIN_EMAIL = "tapbomba.ai@gmail.com";

export async function POST(request: NextRequest) {
  try {
    // Verify Chairman's login token
    const authHeader = request.headers.get("authorization");

    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const token = authHeader.slice(7);

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !anonKey) {
      return NextResponse.json(
        { error: "Supabase configuration missing" },
        { status: 500 }
      );
    }

    const supabaseAuth = createClient(supabaseUrl, anonKey);

    const {
      data: { user },
      error: authError,
    } = await supabaseAuth.auth.getUser(token);

    if (authError || !user || user.email?.toLowerCase() !== ADMIN_EMAIL) {
      return NextResponse.json(
        { error: "Chairman access only" },
        { status: 403 }
      );
    }

    // Confirm Chairman profile
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("email,is_chairman")
      .eq("id", user.id)
      .maybeSingle();

    if (
      profileError ||
      !profile ||
      profile.email?.toLowerCase() !== ADMIN_EMAIL ||
      profile.is_chairman !== true
    ) {
      return NextResponse.json(
        { error: "Chairman permission not verified" },
        { status: 403 }
      );
    }

    const body = await request.json();

    const id = String(body.id || "").trim();
    const status = String(body.status || "").trim().toLowerCase();

    if (!id || !["approved", "rejected"].includes(status)) {
      return NextResponse.json(
        { error: "A valid recording ID and status are required" },
        { status: 400 }
      );
    }

    // Update only the selected dataset submission.
    // The recording and its audio file are never deleted.
    const { data, error } = await supabaseAdmin
      .from("dataset_recordings")
      .update({ status })
      .eq("id", id)
      .select("id,status")
      .maybeSingle();

    if (error) {
      console.error("Chairman dataset update error:", error);

      return NextResponse.json(
        { error: "Could not update dataset recording" },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json(
        { error: "Dataset recording not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Dataset recording ${status} successfully`,
      recording: data,
    });
  } catch (error) {
    console.error("Chairman dataset API error:", error);

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}