export const paymentProviderLabels: Record<string, string> = {
  yookassa: "YooKassa",
  cloudpayments: "CloudPayments",
  stripe: "Stripe",
  manual: "Manual"
};

export const paymentLocaleLabels: Record<"ru" | "en", string> = {
  ru: "Русский",
  en: "English"
};

export function formatProviderLabel(provider: string): string {
  return paymentProviderLabels[provider] ?? provider;
}

export function formatLocaleLabel(locale: "ru" | "en"): string {
  return paymentLocaleLabels[locale] ?? locale;
}
