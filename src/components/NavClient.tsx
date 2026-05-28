"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export type NavUser = {
  id: string;
  email: string | null;
  name: string;
  avatarUrl: string | null;
};

type NavClientProps = {
  initialUser: NavUser | null;
  initialAdmin: boolean;
};

async function fetchSessionState(): Promise<{ user: NavUser | null; isAdmin: boolean }> {
  const res = await fetch("/api/me");
  if (!res.ok) {
    return { user: null, isAdmin: false };
  }
  return res.json() as Promise<{ user: NavUser | null; isAdmin: boolean }>;
}

export function NavClient({ initialUser, initialAdmin }: NavClientProps) {
  const router = useRouter();
  const [user, setUser] = useState(initialUser);
  const [admin, setAdmin] = useState(initialAdmin);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event) => {
      if (event === "SIGNED_IN" || event === "SIGNED_OUT") {
        const state = await fetchSessionState();
        setUser(state.user);
        setAdmin(state.isAdmin);
        router.refresh();
        return;
      }

      if (event === "USER_UPDATED") {
        const state = await fetchSessionState();
        setUser(state.user);
        setAdmin(state.isAdmin);
      }
    });

    return () => subscription.unsubscribe();
  }, [router]);

  async function signOut() {
    setSigningOut(true);
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    setUser(null);
    setAdmin(false);
    router.refresh();
    setSigningOut(false);
  }

  const links = [
    { href: "/", label: "Record Sale" },
    { href: "/shop", label: "Shop" },
    { href: "/flips", label: "Flips" },
    { href: "/sales", label: "Sales Log" },
    { href: "/values", label: "Values" },
    ...(admin ? [{ href: "/add", label: "Catalog" }] : []),
  ];

  return (
    <>
      <nav className="flex flex-wrap gap-2">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="rounded-lg border border-zinc-700 px-3 py-1.5 text-sm text-zinc-200 hover:bg-zinc-900"
          >
            {link.label}
          </Link>
        ))}
      </nav>
      <div className="flex items-center gap-3 border-t border-zinc-800 pt-3 sm:border-t-0 sm:pt-0">
        {user ? (
          <>
            {user.avatarUrl ? (
              <Image
                src={user.avatarUrl}
                alt=""
                width={32}
                height={32}
                className="h-8 w-8 rounded-full"
                unoptimized
              />
            ) : null}
            <span className="max-w-40 truncate text-sm text-zinc-400">
              {user.name}
              {admin ? " · Admin" : ""}
            </span>
            <button
              type="button"
              onClick={signOut}
              disabled={signingOut}
              className="rounded-lg border border-zinc-700 px-3 py-1.5 text-sm text-zinc-200 hover:bg-zinc-900 disabled:opacity-50"
            >
              {signingOut ? "Signing out…" : "Sign out"}
            </button>
          </>
        ) : (
          <Link
            href="/login"
            className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-500"
          >
            Sign in
          </Link>
        )}
      </div>
    </>
  );
}
