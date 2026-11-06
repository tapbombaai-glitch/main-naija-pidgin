import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CHAIRMAN_EMAIL = "tapbomba.ai@gmail.com";

class RouteError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
  }
}

function getEnv(name: string) {
  const value = process.env[name];
  if (!value) {
    throw new RouteError(`Missing configuration: ${name}`, 500);
  }
  return value;
}

async function verifyChairman(req: NextRequest) {
  const url = getEnv("NEXT_PUBLIC_SUPABASE_URL");
  const anon = getEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  const service = getEnv("SUPABASE_SERVICE_ROLE_KEY");

  const authorization = req.headers.get("authorization");

  if (!authorization?.startsWith("Bearer ")) {
    throw new RouteError("Please log in as Chairman.", 401);
  }

  const token = authorization.slice(7).trim();

  const authClient = createClient(url, anon, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  const { data, error } =
    await authClient.auth.getUser(token);

  if (error || !data.user) {
    throw new RouteError("Invalid session.", 401);
  }

  if (
    data.user.email?.toLowerCase() !==
    CHAIRMAN_EMAIL
  ) {
    throw new RouteError("Chairman access only.", 403);
  }

  return createClient(url, service, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

export async function GET(req: NextRequest) {
  try {
    const admin = await verifyChairman(req);

    const { data, error } = await admin
      .from("chairman_voices")
      .select("*")
      .order("created_at", {
        ascending: false,
      });

    if (error) {
      throw new RouteError(error.message, 500);
    }

    return NextResponse.json(
      {
        success: true,
        voices: data || [],
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (error) {
    const status =
      error instanceof RouteError
        ? error.status
        : 500;

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unable to load voices.",
      },
      { status }
    );
  }
}