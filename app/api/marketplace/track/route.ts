import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED_PACKAGES = [
  "starter",
  "basic",
  "standard",
  "business",
  "premium",
];

const ALLOWED_EVENTS = ["page_view", "buy_click"];

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const visitorId = String(body.visitorId || "").trim();
    const eventType = String(body.eventType || "").trim();
    const packageId = body.packageId
      ? String(body.packageId).trim()
      : null;

    if (
      visitorId.length < 20 ||
      visitorId.length > 100 ||
      !ALLOWED_EVENTS.includes(eventType)
    ) {
      return NextResponse.json(
        { success: false, error: "Invalid analytics event." },
        { status: 400 }
      );
    }

    if (
      packageId &&
      !ALLOWED_PACKAGES.includes(packageId)
    ) {
      return NextResponse.json(
        { success: false, error: "Invalid package." },
        { status: 400 }
      );
    }

    if (eventType === "buy_click" && !packageId) {
      return NextResponse.json(
        { success: false, error: "Package is required." },
        { status: 400 }
      );
    }

    const { error } = await supabaseAdmin
      .from("marketplace_events")
      .insert({
        visitor_id: visitorId,
        event_type: eventType,
        page_path: "/marketplace",
        package_id: packageId,
      });

    if (error) {
      console.error("Marketplace tracking error:", error.message);

      return NextResponse.json(
        { success: false, error: "Tracking unavailable." },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Marketplace tracking failed:", error);

    return NextResponse.json(
      { success: false, error: "Tracking failed." },
      { status: 500 }
    );
  }
}