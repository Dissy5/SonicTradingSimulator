import Link from "next/link";

import { NavClient, type NavUser } from "@/components/NavClient";
import { isAdmin } from "@/lib/admin";
import { getAuthUser } from "@/lib/supabase/auth-server";

function toNavUser(user: NonNullable<Awaited<ReturnType<typeof getAuthUser>>>): NavUser {
  return {
    id: user.id,
    email: user.email ?? null,
    name:
      (user.user_metadata?.full_name as string | undefined) ??
      (user.user_metadata?.name as string | undefined) ??
      user.email?.split("@")[0] ??
      "Signed in",
    avatarUrl: (user.user_metadata?.avatar_url as string | undefined) ?? null,
  };
}

export async function Nav() {
  const authUser = await getAuthUser();
  const initialUser = authUser ? toNavUser(authUser) : null;
  const initialAdmin = authUser ? await isAdmin() : false;

  return (
    <header className="border-b border-zinc-800 bg-zinc-950/80">
      <div className="flex w-full flex-col gap-4 px-6 py-5 sm:flex-row sm:items-center sm:justify-between lg:px-10 xl:px-16">
        <Link href="/" className="group block rounded-lg outline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500">
          <h1 className="text-xl font-semibold tracking-tight group-hover:text-zinc-100">
            Sonic Trading Simulator
          </h1>
          <p className="text-sm text-zinc-400 group-hover:text-zinc-300">Track skin sale prices</p>
        </Link>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <NavClient initialUser={initialUser} initialAdmin={initialAdmin} />
        </div>
      </div>
    </header>
  );
}
