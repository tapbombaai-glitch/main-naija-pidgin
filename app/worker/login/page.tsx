import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { identifier, password } = await req.json();

  if (!identifier || !password) {
    return NextResponse.json({ error: "Enter ID and password" }, { status: 400 });
  }

  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        },
      },
    }
  );

  // 1. Find email from Worker ID or Email
  // If identifier contains "@", na email. If not, na Worker ID.
  let email = identifier.trim().toLowerCase();

  if (!email.includes("@")) {
    // Look for worker in your "workers" table
    const { data: worker } = await supabase
      .from("workers")
      .select("email, worker_id")
      .eq("worker_id", identifier.trim())
      .single();

    if (!worker) {
      return NextResponse.json({ error: "Worker ID not found" }, { status: 404 });
    }
    email = worker.email;
  }

  // 2. Login with Supabase - THIS GO CREATE COOKIE
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return NextResponse.json({ error: "Wrong email/ID or password" }, { status: 401 });
  }

  // 3. Return workerId for localStorage (optional, for UI only)
  return NextResponse.json({
    success: true,
    workerId: data.user.id,
    email: data.user.email,
  });
}