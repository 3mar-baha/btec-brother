import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const PROTECTED = ["/market", "/workspace", "/directory", "/logs", "/admin", "/settings", "/profile"];

function redirectTo(pathname: string, request: NextRequest) {
  const url = request.nextUrl.clone();
  url.pathname = pathname;
  url.search = "";
  return NextResponse.redirect(url);
}

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isProtected = PROTECTED.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`)
  );

  // Unauthenticated visitors.
  if (!user) {
    if (pathname === "/pending-approval") {
      return redirectTo("/login", request);
    }
    if (isProtected) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      url.search = "";
      url.searchParams.set("redirectedFrom", pathname);
      return NextResponse.redirect(url);
    }
    return response;
  }

  // Authenticated: gate on approval status.
  const { data: profile } = await supabase
    .from("users")
    .select("is_approved, role")
    .eq("id", user.id)
    .single();
  const isApproved = profile?.is_approved === true || profile?.role === "admin";

  if (pathname === "/login") {
    return redirectTo(isApproved ? "/market" : "/pending-approval", request);
  }

  if (!isApproved) {
    if (pathname !== "/pending-approval") {
      return redirectTo("/pending-approval", request);
    }
    return response;
  }

  if (pathname === "/pending-approval") {
    return redirectTo(profile?.role === "admin" ? "/admin" : "/market", request);
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|manifest\\.webmanifest|manifest\\.json|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
