import Link from "next/link";
import { Suspense } from "react";

import { LoginStatus } from "@/components/LoginStatus";
import { SignInWithGoogle } from "@/components/SignInWithGoogle";

export function DashboardGuest() {
  return (
    <section className="mx-auto max-w-lg space-y-8">
      <div>
        <h2 className="mb-2 text-2xl font-semibold tracking-tight">Dashboard</h2>
        <p className="text-sm text-zinc-400">
          Sign in to see your transactions, flips, shop listings, and quick links to every part of
          the simulator.
        </p>
      </div>

      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6 space-y-6">
        <div>
          <h3 className="mb-2 text-lg font-semibold">Sign in</h3>
          <p className="text-sm text-zinc-400">
            Sign in with Google to record transactions and manage your personal trading data.
          </p>
          <p className="mt-2 text-xs text-zinc-500">
            Access is controlled by Google sign-in. If your account isn&apos;t on the app&apos;s test
            user list yet, Google will block sign-in before you return here.
          </p>
        </div>

        <Suspense fallback={null}>
          <LoginStatus />
        </Suspense>

        <SignInWithGoogle next="/" />
      </div>

      <p className="text-center text-sm text-zinc-500">
        <Link href="/transactions" className="text-zinc-400 hover:text-zinc-200">
          View the public transaction log without signing in
        </Link>
      </p>
    </section>
  );
}
