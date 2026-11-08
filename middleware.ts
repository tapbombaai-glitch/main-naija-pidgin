import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Allow the app to continue if Supabase is not configured.
  if (!supabaseUrl || !supabaseAnonKey) {
    console.error("Supabase environment variables are missing.");
    return supabaseResponse;
  }

  const supabase = createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },

        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });

          supabaseResponse = NextResponse.next({
            request,
          });

          cookiesToSet.forEach(({ name, value, options }) => {
            supabaseResponse.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  // Refresh/check the Supabase login session.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  /*
   * WORKER PROTECTION
   *
   * /worker/login and /worker/register remain public.
   *
   * /worker requires a logged-in Supabase user.
   */
  const pathname = request.nextUrl.pathname;

  const isWorkerArea =
    pathname === "/worker" ||
    pathname.startsWith("/worker/");

  const isWorkerPublicPage =
    pathname === "/worker/login" ||
    pathname === "/worker/register";

  if (isWorkerArea && !isWorkerPublicPage) {
    // Not logged in → send worker to Worker Login.
    if (!user) {
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = "/worker/login";
      loginUrl.search = "";

      return NextResponse.redirect(loginUrl);
    }

    // Chairman must not enter the Worker Panel.
    const userEmail = user.email?.toLowerCase();

    if (userEmail === "tapbomba.ai@gmail.com") {
      const chairmanUrl = request.nextUrl.clone();
      chairmanUrl.pathname = "/admin/login";
      chairmanUrl.search = "";

      return NextResponse.redirect(chairmanUrl);
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};