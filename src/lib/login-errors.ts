export type LoginErrorCode = "auth" | "restricted" | "denied";

type LoginErrorMessage = {
  title: string;
  body: string;
};

function isExplicitOAuthCancel(description: string | null | undefined): boolean {
  const desc = (description ?? "").toLowerCase();
  return /user (denied|cancelled|canceled|closed)|consent denied|the user cancelled|flow cancelled|sign.?in was cancelled/.test(
    desc
  );
}

function isGoogleAccessBlocked(description: string | null | undefined): boolean {
  const desc = (description ?? "").toLowerCase();
  return /test user|testing|hasn't given you access|has not given you access|has not completed|not approved|access blocked|blocked|only available|developer-approved|invite|403|org_internal|admin_policy|not authorized|unauthorized client|invalid client/.test(
    desc
  );
}

export function mapOAuthErrorToLoginError(
  error: string | null | undefined,
  description: string | null | undefined
): LoginErrorCode {
  const combined = `${error ?? ""} ${description ?? ""}`.toLowerCase();

  if (error === "access_denied") {
    if (isExplicitOAuthCancel(description)) {
      return "denied";
    }
    if (isGoogleAccessBlocked(description) || !description?.trim()) {
      // Google test-user blocks often come back as bare access_denied via Supabase
      return "restricted";
    }
    return "restricted";
  }

  if (
    /signup|sign.up|not allowed|disabled|invite|unauthorized|not authorized|registration|test user|access blocked/.test(
      combined
    )
  ) {
    return "restricted";
  }

  return "auth";
}

export function getLoginErrorMessage(
  error: string | undefined,
  email: string | undefined
): LoginErrorMessage | null {
  if (!error) return null;

  const decodedEmail = email ? decodeURIComponent(email) : null;

  switch (error as LoginErrorCode) {
    case "restricted":
      if (decodedEmail) {
        return {
          title: `Couldn't sign in with ${decodedEmail}`,
          body: "Google didn't authorize that account for this app. Add it as a test user in Google Cloud Console, or try a different account.",
        };
      }
      return {
        title: "Sign-in not allowed",
        body: "Google didn't authorize that account for this app. The OAuth app is in testing mode, so only approved test users can sign in.",
      };
    case "denied":
      return {
        title: "Sign-in cancelled",
        body: "You didn't complete Google sign-in. You can try again with the same or a different account.",
      };
    case "auth":
    default:
      return {
        title: "Sign-in failed",
        body: "Something went wrong while signing in. Please try again.",
      };
  }
}

export function readLoginErrorFromUrl(url: URL | Location): {
  error?: LoginErrorCode;
  email?: string;
} {
  const query = new URLSearchParams(url.search);
  let error = query.get("error") ?? undefined;
  let email = query.get("email") ?? undefined;

  if (!error && url.hash.length > 1) {
    const hash = new URLSearchParams(url.hash.slice(1));
    error = hash.get("error") ?? hash.get("error_code") ?? undefined;
    const description = hash.get("error_description");
    if (!email && description?.includes("@")) {
      const match = description.match(/[\w.+-]+@[\w.-]+\.\w+/);
      if (match) email = match[0];
    }
    if (error && !["restricted", "denied", "auth"].includes(error)) {
      error = mapOAuthErrorToLoginError(error, description);
    }
  }

  if (error && !["restricted", "denied", "auth"].includes(error)) {
    error = mapOAuthErrorToLoginError(
      error,
      query.get("error_description")
    );
  }

  return {
    error: error as LoginErrorCode | undefined,
    email: email ?? undefined,
  };
}
