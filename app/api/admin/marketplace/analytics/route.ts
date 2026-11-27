import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CHAIRMAN_EMAIL = "tapbomba.ai@gmail.com";
const PACKAGES = [
  "starter",
  "basic",
  "standard",
  "business",
  "premium",
];

function lagosDate(value: string | Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Lagos",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(value));

  const get = (type: string) =>
    parts.find((part) => part.type === type)?.value || "";

  return `${get("year")}-${get("month")}-${get("day")}`;
}

function lagosMonth(value: string | Date) {
  return lagosDate(value).slice(0, 7);
}

async function getAllRows(
  table: string,
  columns: string,
  filters?: { column: string; value: string }[]
) {
  const rows: any[] = [];
  const pageSize = 1000;

  for (let start = 0; ; start += pageSize) {
    let query = supabaseAdmin
      .from(table)
      .select(columns)
      .order("created_at", { ascending: true })
      .range(start, start + pageSize - 1);

    if (filters) {
      for (const filter of filters) {
        query = query.eq(filter.column, filter.value);
      }
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`${table}: ${error.message}`);
    }

    rows.push(...(data || []));

    if (!data || data.length < pageSize) break;
  }

  return rows;
}

export async function GET(request: NextRequest) {
  try {
    // 1. Verify login token
    const authorization = request.headers.get("authorization");

    if (!authorization?.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Please login as Chairman." },
        { status: 401 }
      );
    }

    const token = authorization.slice(7);

    const {
      data: { user },
      error: authError,
    } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json(
        { error: "Invalid login session." },
        { status: 401 }
      );
    }

    // 2. Verify Chairman email
    if (user.email?.toLowerCase() !== CHAIRMAN_EMAIL) {
      return NextResponse.json(
        { error: "Chairman access only." },
        { status: 403 }
      );
    }

    // 3. Verify Chairman profile
    const { data: profile, error: profileError } =
      await supabaseAdmin
        .from("profiles")
        .select("is_chairman")
        .eq("id", user.id)
        .maybeSingle();

    if (
      profileError ||
      !profile ||
      profile.is_chairman !== true
    ) {
      return NextResponse.json(
        { error: "Chairman permission not found." },
        { status: 403 }
      );
    }

    // 4. Read marketplace tracking events
    const events = await getAllRows(
      "marketplace_events",
      "visitor_id,event_type,package_id,created_at"
    );

    // 5. Read payment records
    const allPayments = await getAllRows(
      "api_payments",
      "package_id,amount,payment_status,paid_at,created_at"
    );

    // Count both completed-payment status formats.
    const payments = allPayments.filter((payment) => {
      const status = String(payment.payment_status || "")
        .trim()
        .toLowerCase();

      return status === "successful" || status === "success";
    });

    const now = new Date();
    const today = lagosDate(now);

    const uniqueVisitors = new Set<string>();
    const todayVisitors = new Set<string>();

    let pageViews = 0;
    let buyClicks = 0;

    const dailyMap: Record<string, number> = {};
    const monthlyMap: Record<string, number> = {};

    for (const event of events) {
      const date = lagosDate(event.created_at);
      const month = date.slice(0, 7);

      if (event.event_type === "page_view") {
        pageViews++;

        if (event.visitor_id) {
          uniqueVisitors.add(event.visitor_id);

          if (date === today) {
            todayVisitors.add(event.visitor_id);
          }
        }

        dailyMap[date] = (dailyMap[date] || 0) + 1;
        monthlyMap[month] = (monthlyMap[month] || 0) + 1;
      }

      if (event.event_type === "buy_click") {
        buyClicks++;
      }
    }

    let totalRevenue = 0;
    let successfulPurchases = 0;

    const packageSales: Record<
      string,
      { purchases: number; revenue: number }
    > = {};

    for (const id of PACKAGES) {
      packageSales[id] = {
        purchases: 0,
        revenue: 0,
      };
    }

    const paymentDaily: Record<string, number> = {};

    for (const payment of payments) {
      successfulPurchases++;

      const amount = Number(payment.amount || 0);
      const packageId = String(payment.package_id || "");

      totalRevenue += amount;

      if (packageSales[packageId]) {
        packageSales[packageId].purchases++;
        packageSales[packageId].revenue += amount;
      }

      const paidDate = payment.paid_at || payment.created_at;
      const month = lagosMonth(paidDate);

      paymentDaily[month] =
        (paymentDaily[month] || 0) + amount;
    }

    // Last 7 days
    const dailyActivity = [];

    for (let i = 6; i >= 0; i--) {
      const date = new Date(
        `${today}T00:00:00Z`
      );

      date.setUTCDate(date.getUTCDate() - i);

      const key = date.toISOString().slice(0, 10);

      dailyActivity.push({
        date: key,
        visitors: dailyMap[key] || 0,
      });
    }

    // Last 6 months
    const monthlyActivity = [];

    const currentParts = today.split("-").map(Number);

    for (let i = 5; i >= 0; i--) {
      const date = new Date(
        Date.UTC(currentParts[0], currentParts[1] - 1 - i, 1)
      );

      const key = date.toISOString().slice(0, 7);

      monthlyActivity.push({
        month: key,
        visitors: monthlyMap[key] || 0,
        revenue: paymentDaily[key] || 0,
      });
    }

    return NextResponse.json({
      success: true,

      visitors: {
        total: pageViews,
        unique: uniqueVisitors.size,
        today: todayVisitors.size,
      },

      buyClicks,

      purchases: successfulPurchases,

      revenue: totalRevenue,

      packageSales,

      dailyActivity,

      monthlyActivity,

      updatedAt: now.toISOString(),
    });
  } catch (error: any) {
    console.error("Marketplace analytics error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Could not load Marketplace analytics.",
      },
      { status: 500 }
    );
  }
}