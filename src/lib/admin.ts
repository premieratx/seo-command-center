/**
 * Super-admin identity helpers.
 *
 * A super admin has additional capabilities:
 *   - Sees all profiles in the system (not just their own)
 *   - Can invite new users by email
 *
 * Identity is determined by email. The allowlist can be overridden via the
 * SUPER_ADMIN_EMAILS env var (comma-separated). If unset, falls back to the
 * built-in list below.
 */

const DEFAULT_SUPER_ADMINS = ["ppcaustin@gmail.com"];

function superAdminEmails(): string[] {
  const raw = process.env.SUPER_ADMIN_EMAILS;
  if (!raw) return DEFAULT_SUPER_ADMINS;
  return raw
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

export function isSuperAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return superAdminEmails().includes(email.toLowerCase());
}
