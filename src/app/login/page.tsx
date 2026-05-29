import Link from "next/link";
import { Suspense } from "react";

import { LoginStatus } from "@/components/LoginStatus";
import { SignInWithGoogle } from "@/components/SignInWithGoogle";
import { getAuthUser } from "@/lib/supabase/auth-server";

type LoginPageProps = {
  searchParams: Promise<{ next?: string }>;
};

function safeNextPath(next: string | undefined): string {
  if (!next || !next.startsWith("/") || next.startsWith("//")) {
    return "/";
  }
  return next;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const user = await getAuthUser();
  const { next: nextParam } = await searchParams;
  const next = safeNextPath(nextParam);

  if (user) {
    return (
      <section className="mx-auto max-w-sm">
        <p className="mb-4 text-sm text-zinc-400">You are already signed in.</p>
        <Link href={next} className="text-sm text-blue-400 hover:text-blue-300">
          Continue
        </Link>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-sm space-y-6">
      <div>
        <h2 className="mb-2 text-lg font-semibold">Sign in</h2>
        <p className="text-sm text-zinc-400">
          Sign in with Google to record transactions. The transaction log is available without an account.
        </p>
        <p className="mt-2 text-xs text-zinc-500">
          Access is controlled by Google sign-in. If your account isn&apos;t on the app&apos;s test
          user list yet, Google will block sign-in before you return here.
        </p>
      </div>

      <Suspense fallback={null}>
        <LoginStatus />
      </Suspense>

      <SignInWithGoogle next={next} />

      <p className="text-center text-sm text-zinc-500">
        <Link href="/transactions" className="text-zinc-400 hover:text-zinc-200">
          View transactions without signing in
        </Link>
      </p>
    </section>
  );
}
