export const locales = ["ru", "en"] as const;
export type AppLocale = (typeof locales)[number];

export const defaultLocale: AppLocale = "ru";
export const localePrefix = "always" as const;

export function isLocale(value: string): value is AppLocale {
  return locales.includes(value as AppLocale);
}
