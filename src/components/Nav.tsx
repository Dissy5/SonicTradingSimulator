import Link from "next/link";

import { NavClient, type NavUser } from "@/components/NavClient";
import { isAdmin } from "@/lib/admin";
import { getAuthUser } from "@/lib/supabase/auth-server";
import { getUserDisplayName } from "@/lib/user-settings";

async function toNavUser(
  user: NonNullable<Awaited<ReturnType<typeof getAuthUser>>>
): Promise<NavUser> {
  return {
    id: user.id,
    email: user.email ?? null,
    name: await getUserDisplayName(user),
    avatarUrl: (user.user_metadata?.avatar_url as string | undefined) ?? null,
  };
}

export async function Nav() {
  const authUser = await getAuthUser();
  const initialUser = authUser ? await toNavUser(authUser) : null;
  const initialAdmin = authUser ? await isAdmin() : false;

  return (
    <header className="app-header border-b">
      <div className="flex w-full flex-col gap-4 px-6 py-5 sm:flex-row sm:items-center sm:justify-between lg:px-10 xl:px-16">
        <Link href="/" className="group block rounded-lg outline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500">
          <h1 className="text-xl font-semibold tracking-tight group-hover:text-zinc-100">
            Sonic Trading Simulator
          </h1>
          <p className="text-sm text-zinc-400 group-hover:text-zinc-300">Track SSS transactions</p>
        </Link>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <NavClient initialUser={initialUser} initialAdmin={initialAdmin} />
        </div>
      </div>
    </header>
  );
}
