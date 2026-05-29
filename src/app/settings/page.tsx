import { redirect } from "next/navigation";

import { UserSettingsForm } from "@/components/UserSettingsForm";
import { getAuthUser } from "@/lib/supabase/auth-server";
import { getUserSettings } from "@/lib/user-settings";

export default async function SettingsPage() {
  const user = await getAuthUser();
  if (!user) {
    redirect("/login?next=/settings");
  }

  const settings = await getUserSettings(user);

  return (
    <section className="space-y-2">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Settings</h2>
        <p className="mt-1 text-sm text-zinc-400">
          Manage your profile, appearance, and personal data.
        </p>
      </div>
      <UserSettingsForm initialSettings={settings} />
    </section>
  );
}
