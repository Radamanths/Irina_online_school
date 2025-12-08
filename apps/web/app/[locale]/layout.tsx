import type { ReactNode } from "react";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, unstable_setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { LocaleProvider } from "../../src/providers/locale-provider";
import { SiteHeader } from "../../src/components/site-header";
import { SiteFooter } from "../../src/components/site-footer";
import { locales, isLocale } from "../../i18n/routing";

export function generateStaticParams() {
  return locales.map(locale => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  if (!isLocale(locale)) {
    notFound();
  }

  unstable_setRequestLocale(locale);
  const messages = await getMessages({ locale });

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      <LocaleProvider locale={locale}>
        <div className="site-shell">
          <SiteHeader locale={locale} />
          <main className="site-content">{children}</main>
          <SiteFooter locale={locale} />
        </div>
      </LocaleProvider>
    </NextIntlClientProvider>
  );
}
