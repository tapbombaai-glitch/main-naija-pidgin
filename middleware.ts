import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const CHAIRMAN_EMAIL = "tapbomba.ai@gmail.com";

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error("Supabase environment variables are missing.");
    return supabaseResponse;
  }

  // Preserve refreshed authentication cookies.
  let refreshedCookies: {
    name: string;
    value: string;
    options?: any;
  }[] = [];

  const supabase = createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },

        setAll(cookiesToSet) {
          refreshedCookies = cookiesToSet;

          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });

          supabaseResponse = NextResponse.next({
            request,
          });

          cookiesToSet.forEach(({ name, value, options }) => {
            supabaseResponse.cookies.set(
              name,
              value,
              options
            );
          });
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  const userEmail = user?.email?.toLowerCase();

  const isChairman = userEmail === CHAIRMAN_EMAIL;

  const isWorkerArea =
    pathname === "/worker" ||
    pathname.startsWith("/worker/");

  const isWorkerPublicPage =
    pathname === "/worker/login" ||
    pathname === "/worker/register";

  const isAdminArea =
    pathname === "/admin" ||
    pathname.startsWith("/admin/");

  const isAdminLogin =
    pathname === "/admin/login";

  // Helper: redirect while preserving refreshed cookies.
  function redirectTo(path: string) {
    const url = request.nextUrl.clone();

    url.pathname = path;
    url.search = "";

    const response = NextResponse.redirect(url);

    refreshedCookies.forEach(
      ({ name, value, options }) => {
        response.cookies.set(name, value, options);
      }
    );

    return response;
  }

  // =====================================
  // CHAIRMAN DASHBOARD PROTECTION
  // =====================================

  if (isAdminArea && !isAdminLogin) {
    if (!user) {
      return redirectTo("/admin/login");
    }

    if (!isChairman) {
      return redirectTo("/worker/login");
    }
  }

  // =====================================
  // WORKER DASHBOARD PROTECTION
  // =====================================

  if (isWorkerArea && !isWorkerPublicPage) {
    if (!user) {
      return redirectTo("/worker/login");
    }

    // Chairman must use the Chairman Dashboard.
    // Do not send Chairman back to Admin Login.
    if (isChairman) {
      return redirectTo("/worker/login");
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};