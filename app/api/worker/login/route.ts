import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CHAIRMAN_EMAIL = "tapbomba.ai@gmail.com";

export async function POST(req: NextRequest) {
  try {
    const { identifier, password } = await req.json();

    if (!identifier?.trim() || !password) {
      return NextResponse.json(
        { error: "Enter Worker ID and password." },
        { status: 400 }
      );
    }

    const cookieStore = await cookies();

    // We go collect cookies here first, then put am for final response
    let cookiesToSave: { name: string; value: string; options?: any }[] = [];

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSave = cookiesToSet;
          },
        },
      }
    );

    let worker: { email: string; worker_id: string } | null = null;
    const cleanIdentifier = identifier.trim();

    if (cleanIdentifier.includes("@")) {
      const { data } = await supabase
        .from("workers")
        .select("email, worker_id")
        .eq("email", cleanIdentifier.toLowerCase())
        .maybeSingle();
      worker = data;
    } else {
      const { data } = await supabase
        .from("workers")
        .select("email, worker_id")
        .eq("worker_id", cleanIdentifier)
        .maybeSingle();
      worker = data;
    }

    if (!worker?.email) {
      return NextResponse.json(
        { error: "Worker account not found." },
        { status: 404 }
      );
    }

    const email = worker.email.toLowerCase();

    if (email === CHAIRMAN_EMAIL) {
      return NextResponse.json(
        { error: "Please use the Chairman Login." },
        { status: 403 }
      );
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error || !data.user) {
      return NextResponse.json(
        { error: "Wrong Worker ID or password." },
        { status: 401 }
      );
    }

    if (data.user.email?.toLowerCase() !== email) {
      await supabase.auth.signOut();
      return NextResponse.json(
        { error: "Worker account verification failed." },
        { status: 403 }
      );
    }

    // Now we put the cookies for the CORRECT final response
    const response = NextResponse.json(
      {
        success: true,
        workerId: worker.worker_id,
        email: data.user.email,
      },
      {
        headers: { "Cache-Control": "no-store" },
      }
    );

    cookiesToSave.forEach(({ name, value, options }) => {
      response.cookies.set(name, value, options);
    });

    return response;
  } catch (error) {
    console.error("Worker login error:", error);
    return NextResponse.json(
      { error: "Something went wrong during login." },
      { status: 500 }
    );
  }
}