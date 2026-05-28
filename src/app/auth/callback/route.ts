import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { isAllowedSignInUser } from "@/lib/auth-allowlist";
import { mapOAuthErrorToLoginError } from "@/lib/login-errors";

function loginRedirect(
  origin: string,
  error: string,
  email?: string | null
) {
  const emailParam = email ? `&email=${encodeURIComponent(email)}` : "";
  return `${origin}/login?error=${error}${emailParam}`;
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  let next = searchParams.get("next") ?? "/";

  if (!next.startsWith("/")) {
    next = "/";
  }

  if (!code) {
    const oauthError = searchParams.get("error");
    const errorDescription = searchParams.get("error_description");
    if (oauthError) {
      const mapped = mapOAuthErrorToLoginError(oauthError, errorDescription);
      return NextResponse.redirect(loginRedirect(origin, mapped));
    }
    return NextResponse.redirect(loginRedirect(origin, "auth"));
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !key) {
    return NextResponse.redirect(loginRedirect(origin, "auth"));
  }

  const redirectUrl = `${origin}${next}`;
  let response = NextResponse.redirect(redirectUrl);

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });
        response = NextResponse.redirect(redirectUrl);
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    console.error("Auth callback error:", error.message);
    const authError = error as { code?: string };
    const mapped = mapOAuthErrorToLoginError(
      authError.code ?? "auth",
      error.message
    );
    return NextResponse.redirect(loginRedirect(origin, mapped));
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!isAllowedSignInUser(user)) {
    await supabase.auth.signOut();
    const deniedResponse = NextResponse.redirect(
      loginRedirect(origin, "restricted", user?.email)
    );
    for (const cookie of response.cookies.getAll()) {
      deniedResponse.cookies.set(cookie);
    }
    return deniedResponse;
  }

  return response;
}
