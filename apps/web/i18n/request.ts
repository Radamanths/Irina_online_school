import { getRequestConfig } from "next-intl/server";
import { getAppConfig } from "@virgo/config";
import { defaultLocale, isLocale, AppLocale } from "./routing";

const { apiBaseUrl } = getAppConfig();
const sanitizedApiBase = (apiBaseUrl || "http://localhost:4000").replace(/\/$/, "");

export default getRequestConfig(async ({ locale }) => {
  const resolved = isLocale(locale) ? locale : defaultLocale;

  return {
    locale: resolved,
    messages: await loadMessages(resolved)
  };
});

async function loadMessages(locale: AppLocale) {
  const endpoint = `${sanitizedApiBase}/translations/${locale}`;
  try {
    const response = await fetch(endpoint, {
      headers: { Accept: "application/json" },
      cache: "no-store"
    });
    if (!response.ok) {
      throw new Error(`Failed to load translations: ${response.status}`);
    }
    const payload = await response.json();
    if (payload?.messages) {
      return payload.messages;
    }
    throw new Error("Empty translation payload");
  } catch {
    return (await import(`../messages/${locale}.json`)).default;
  }
}
