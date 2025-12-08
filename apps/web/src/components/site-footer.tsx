import { getCopy } from "../lib/i18n.config";

interface Props {
  locale: string;
}

const stripNonDigits = (value: string) => value.replace(/[^0-9]/g, "");
const sanitizeTel = (value: string) => value.replace(/[^0-9+]/g, "");

export async function SiteFooter({ locale }: Props) {
  const {
    common: { brandName, footer }
  } = await getCopy(locale);
  const year = new Date().getFullYear();

  const phoneHref = `tel:${sanitizeTel(footer.phone)}`;
  const whatsappHref = `https://wa.me/${stripNonDigits(footer.whatsapp)}`;

  return (
    <footer className="site-footer">
      <div className="site-footer__grid">
        <div className="site-footer__intro">
          <p className="eyebrow">{brandName}</p>
          <h3>{footer.tagline}</h3>
          <p>{footer.address}</p>
        </div>

        <div>
          <p className="eyebrow">{footer.contactLabel}</p>
          <ul className="site-footer__list">
            <li>
              <a href={`mailto:${footer.contact}`}>{footer.contact}</a>
            </li>
            <li>
              <a href={phoneHref}>{footer.phone}</a>
            </li>
            <li>
              <a href={whatsappHref} target="_blank" rel="noreferrer">
                {footer.whatsapp}
              </a>
            </li>
          </ul>
        </div>

        <div>
          <p className="eyebrow">{footer.paymentLabel}</p>
          <div className="site-footer__card">
            <span>{footer.cardLabel}</span>
            <strong>{footer.cardNumber}</strong>
          </div>
          <p className="site-footer__note">{footer.paymentNote}</p>
        </div>

        <div>
          <p className="eyebrow">{footer.socialLabel}</p>
          <div className="site-footer__socials">
            {footer.socials.map(social => (
              <a key={social.href} href={social.href} target="_blank" rel="noreferrer">
                {social.label}
              </a>
            ))}
          </div>
        </div>
      </div>
      <div className="site-footer__meta">
        <span>© {year} {brandName}</span>
        <span>{footer.legal}</span>
      </div>
    </footer>
  );
}
