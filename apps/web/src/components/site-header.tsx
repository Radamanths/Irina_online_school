import Image from "next/image";
import Link from "next/link";
import { getCopy } from "../lib/i18n.config";
import { LanguageSwitcher } from "./language-switcher";
import { ThemeToggle } from "./theme-toggle";

interface Props {
  locale: string;
}

const stripNonDigits = (value: string) => value.replace(/[^0-9]/g, "");
const sanitizeTel = (value: string) => value.replace(/[^0-9+]/g, "");

export async function SiteHeader({ locale }: Props) {
  const {
    common: { brandName, navigation, footer }
  } = await getCopy(locale);

  const phoneHref = `tel:${sanitizeTel(footer.phone)}`;
  const whatsappHref = `https://wa.me/${stripNonDigits(footer.whatsapp)}`;

  return (
    <header className="site-header">
      <div className="site-header__row">
        <Link className="site-header__brand" href={`/${locale}`}>
          <span className="site-header__emblem">
            <Image src="/brand/graphics/symbol-12.svg" alt="Virgo symbol" width={40} height={40} />
          </span>
          <span className="site-header__label">
            <strong>{brandName}</strong>
            <span>{footer.tagline}</span>
          </span>
        </Link>

        <nav aria-label="Primary" className="site-header__nav">
          <ul className="site-nav">
            {navigation.primary.map(item => (
              <li key={item.path}>
                <Link href={`/${locale}/${item.path}`}>{item.label}</Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="site-header__action-group">
          <ThemeToggle />
          <LanguageSwitcher locale={locale} />
          <Link className="button" href={`/${locale}/${navigation.cta.path}`}>
            {navigation.cta.label}
          </Link>
        </div>
      </div>

      <div className="site-header__row site-header__row--support">
        <div className="site-header__hotline">
          <span>{footer.contactLabel}</span>
          <div className="site-header__hotline-links">
            <a href={`mailto:${footer.contact}`}>{footer.contact}</a>
            <a href={phoneHref}>{footer.phone}</a>
            <a href={whatsappHref} target="_blank" rel="noreferrer">
              WhatsApp
            </a>
          </div>
        </div>
        <div className="site-header__support-card">
          <span className="eyebrow">{footer.paymentLabel}</span>
          <strong>{footer.cardLabel}</strong>
          <span>{footer.cardNumber}</span>
          <small>{footer.paymentNote}</small>
        </div>
      </div>
    </header>
  );
}
