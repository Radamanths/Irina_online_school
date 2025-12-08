"use client";

import clsx from "clsx";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { locales, AppLocale } from "../../i18n/routing";

interface Props {
  locale: string;
}

function buildHref(pathname: string, targetLocale: AppLocale) {
  const segments = pathname.split("/").filter(Boolean);
  if (!segments.length) {
    return `/${targetLocale}`;
  }
  segments[0] = targetLocale;
  return `/${segments.join("/")}`;
}

export function LanguageSwitcher({ locale }: Props) {
  const pathname = usePathname() || "/";

  return (
    <div className="language-switcher" aria-label="Language selector">
      {locales.map(itemLocale => (
        <Link
          key={itemLocale}
          href={buildHref(pathname, itemLocale)}
          className={clsx("language-switcher__item", itemLocale === locale && "is-active")}
          aria-current={itemLocale === locale ? "true" : undefined}
        >
          {itemLocale.toUpperCase()}
        </Link>
      ))}
    </div>
  );
}
