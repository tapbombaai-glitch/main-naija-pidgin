import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CHAIRMAN_EMAIL = "tapbomba.ai@gmail.com";

class RouteError extends Error {
  status: number;
  constructor(message: string, status: number) { super(message); this.status = status; }
}
function getEnv(name: string) {
  const value = process.env[name];
  if (!value) throw new RouteError(`Missing server configuration: ${name}`, 500);
  return value;
}
export async function GET(req: NextRequest) {
  try {
    const supabaseUrl = getEnv("NEXT_PUBLIC_SUPABASE_URL");
    const anonKey = getEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");
    const serviceKey = getEnv("SUPABASE_SERVICE_ROLE_KEY");
    const authorization = req.headers.get("authorization");
    if (!authorization?.startsWith("Bearer ")) throw new RouteError("Please log in as Chairman.", 401);
    const token = authorization.slice(7).trim();
    const authClient = createClient(supabaseUrl, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: { user }, error } = await authClient.auth.getUser(token);
    if (error || !user) throw new RouteError("Invalid session.", 401);
    if (user.email?.toLowerCase() !== CHAIRMAN_EMAIL) throw new RouteError("Access denied.", 403);
    const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data, error: dbError } = await admin.from("chairman_voices").select("*").order("created_at", { ascending: false });
    if (dbError) throw new RouteError(dbError.message, 500);
    return NextResponse.json({ success: true, voices: data || [] }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { const status = error instanceof RouteError ? error.status : 500; return NextResponse.json({ success: false, error: error instanceof Error ? error.message : "Unexpected error" }, { status }); }
}