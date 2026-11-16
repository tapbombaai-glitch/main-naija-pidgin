import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ADMIN_EMAIL = "tapbomba.ai@gmail.com";

export async function POST(request: NextRequest) {
  try {
    const authorization = request.headers.get("authorization");

    if (!authorization?.startsWith("Bearer ")) {
      return NextResponse.json(
        { success: false, error: "Unauthorized." },
        { status: 401 }
      );
    }

    const token = authorization.replace("Bearer ", "").trim();

    const authClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const {
      data: { user },
      error: userError,
    } = await authClient.auth.getUser(token);

    if (userError || !user) {
      return NextResponse.json(
        { success: false, error: "Invalid session." },
        { status: 401 }
      );
    }

    if (
      user.email?.trim().toLowerCase() !==
      ADMIN_EMAIL.toLowerCase()
    ) {
      return NextResponse.json(
        { success: false, error: "Chairman access required." },
        { status: 403 }
      );
    }

    const { data: profile, error: profileError } =
      await supabaseAdmin
        .from("profiles")
        .select("email,is_chairman")
        .eq("id", user.id)
        .maybeSingle();

    if (
      profileError ||
      !profile ||
      profile.email?.trim().toLowerCase() !==
        ADMIN_EMAIL.toLowerCase() ||
      profile.is_chairman !== true
    ) {
      return NextResponse.json(
        { success: false, error: "Chairman access required." },
        { status: 403 }
      );
    }

    const body = await request.json();

    const keyId = String(body.key_id || "").trim();

    if (!keyId) {
      return NextResponse.json(
        { success: false, error: "API key ID is required." },
        { status: 400 }
      );
    }

    const UUID_REGEX =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    if (!UUID_REGEX.test(keyId)) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid API key ID.",
        },
        { status: 400 }
      );
    }

    const { data: existingKey, error: findError } =
      await supabaseAdmin
        .from("api_keys")
        .select(
          "id,email,key_prefix,is_active,status,payment_status"
        )
        .eq("id", keyId)
        .maybeSingle();

    if (findError) {
      console.error("API KEY LOOKUP ERROR:", findError);

      return NextResponse.json(
        {
          success: false,
          error: "Could not find API key.",
        },
        { status: 500 }
      );
    }

    if (!existingKey) {
      return NextResponse.json(
        {
          success: false,
          error: "API key not found.",
        },
        { status: 404 }
      );
    }

    const { data: updatedKey, error: updateError } =
      await supabaseAdmin
        .from("api_keys")
        .update({
          is_active: false,
          status: "inactive",
        })
        .eq("id", keyId)
        .select(
          "id,email,key_prefix,is_active,status"
        )
        .single();

    if (updateError) {
      console.error(
        "API KEY DEACTIVATE ERROR:",
        updateError
      );

      return NextResponse.json(
        {
          success: false,
          error: "Could not deactivate API key.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "API key deactivated successfully.",
      customer: updatedKey,
    });
  } catch (error) {
    console.error(
      "API KEY DEACTIVATE ROUTE ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error: "Unexpected server error.",
      },
      { status: 500 }
    );
  }
}