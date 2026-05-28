"use client";

import { useMemo } from "react";
import { useSearchParams } from "next/navigation";

import {
  getLoginErrorMessage,
  mapOAuthErrorToLoginError,
  type LoginErrorCode,
} from "@/lib/login-errors";

function normalizeError(
  rawError: string | null,
  description: string | null
): LoginErrorCode | undefined {
  if (!rawError) return undefined;
  if (rawError === "restricted" || rawError === "denied" || rawError === "auth") {
    return rawError;
  }
  return mapOAuthErrorToLoginError(rawError, description);
}

export function LoginStatus() {
  const searchParams = useSearchParams();

  const { error, email } = useMemo(() => {
    const description = searchParams.get("error_description");
    const queryError = normalizeError(
      searchParams.get("error"),
      description
    );
    const queryEmail = searchParams.get("email") ?? undefined;

    if (typeof window !== "undefined") {
      const hash = window.location.hash.slice(1);
      if (hash) {
        const hashParams = new URLSearchParams(hash);
        const hashError = normalizeError(
          hashParams.get("error") ?? hashParams.get("error_code"),
          hashParams.get("error_description")
        );
        if (hashError) {
          return { error: hashError, email: queryEmail };
        }
      }
    }

    return { error: queryError, email: queryEmail };
  }, [searchParams]);

  const loginError = getLoginErrorMessage(error, email);

  if (!loginError) {
    return null;
  }

  return (
    <div
      role="alert"
      className="rounded-xl border border-amber-900/60 bg-amber-950/30 p-4 text-sm"
    >
      <p className="font-medium text-amber-200">{loginError.title}</p>
      <p className="mt-1 text-amber-200/80">{loginError.body}</p>
    </div>
  );
}
