import { type NextRequest, NextResponse } from "next/server";

import { mapOAuthErrorToLoginError } from "@/lib/login-errors";
import { updateSession } from "@/lib/supabase/middleware";

function redirectToLogin(
  request: NextRequest,
  error: string,
  email?: string,
  errorDescription?: string | null
) {
  const loginUrl = request.nextUrl.clone();
  loginUrl.pathname = "/login";
  loginUrl.search = "";
  loginUrl.searchParams.set("error", error);
  if (email) {
    loginUrl.searchParams.set("email", email);
  }
  if (errorDescription?.trim()) {
    loginUrl.searchParams.set("error_description", errorDescription);
  }
  return NextResponse.redirect(loginUrl);
}

export async function middleware(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;
  const code = searchParams.get("code");
  const oauthError = searchParams.get("error");
  const errorDescription = searchParams.get("error_description");

  // Supabase may send OAuth errors to the Site URL (/) instead of /auth/callback
  if (oauthError && pathname !== "/login" && pathname !== "/auth/callback") {
    const mapped = mapOAuthErrorToLoginError(oauthError, errorDescription);
    return redirectToLogin(request, mapped, undefined, errorDescription);
  }

  // Supabase sometimes redirects to Site URL (/) with ?code= instead of /auth/callback
  if (code && pathname !== "/auth/callback") {
    const callbackUrl = request.nextUrl.clone();
    callbackUrl.pathname = "/auth/callback";
    if (!callbackUrl.searchParams.has("next")) {
      callbackUrl.searchParams.set("next", pathname === "/" ? "/" : pathname);
    }
    return NextResponse.redirect(callbackUrl);
  }

  return updateSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
