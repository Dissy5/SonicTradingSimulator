const DEFAULT_ALLOWED_EMAIL = "billjared528@gmail.com";

export function getAllowedSignInEmails(): string[] {
  const raw =
    process.env.ALLOWED_SIGN_IN_EMAILS ??
    process.env.ALLOWED_SIGN_IN_EMAIL ??
    DEFAULT_ALLOWED_EMAIL;

  return raw
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

export function isAllowedSignInUser(
  user: { email?: string | null } | null | undefined
): boolean {
  const email = user?.email?.trim().toLowerCase();
  if (!email) return false;
  return getAllowedSignInEmails().includes(email);
}
