import { redirect } from "next/navigation";

import { isAdmin } from "@/lib/admin";

export default async function AddLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const admin = await isAdmin();
  if (!admin) {
    redirect("/?error=admin");
  }

  return children;
}
