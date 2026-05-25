/**
 * Allowed origins that may embed this app in an iframe.
 * Configured via VITE_ALLOWED_REFERRER_ORIGINS (comma-separated) in .env.
 */
export const ALLOWED_REFERRER_ORIGINS: string[] = (
  (import.meta.env.VITE_ALLOWED_REFERRER_ORIGINS as string) || ""
)
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);
