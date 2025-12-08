const FALLBACK_SITE_URL = "http://localhost:3000";

export function getSiteUrl(): string {
  const raw = process.env.FRONTEND_BASE_URL ?? FALLBACK_SITE_URL;
  return raw.replace(/\/$/, "");
}
