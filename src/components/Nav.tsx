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
      <div className="mx-auto flex max-w-5xl flex-col gap-4 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Sonic Trading Simulator</h1>
          <p className="text-sm text-zinc-400">Track skin sale prices</p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <NavClient initialUser={initialUser} initialAdmin={initialAdmin} />
        </div>
      </div>
    </header>
  );
}
