import Link from "next/link";
import { getCopy } from "../../lib/i18n.config";

interface Props {
  locale: string;
}

export async function LandingSections({ locale }: Props) {
  const { home, common } = await getCopy(locale);
  const footerContact = common?.footer?.contact ?? "";
  const mailto = footerContact ? `mailto:${footerContact}` : "#";
  const programsMeta = (home?.programs ?? ({} as typeof home.programs)) as typeof home.programs & {
    durationLabel?: string;
    priceLabel?: string;
    ctaHint?: string;
  };
  const programIcons = ["🪐", "🌙", "✨", "☀️"];
  const intensityHints = [
    "Глубокая проработка",
    "Интенсивный формат",
    "Продвинутая практика",
    "Комфортный темп"
  ];
  const durationLabel = programsMeta.durationLabel ?? "Длительность";
  const priceLabel = programsMeta.priceLabel ?? "Оплата";
  const actionsHint = programsMeta.ctaHint ?? "Детали программы";
  const programCards = programsMeta.cards ?? [];
  const metricsItems = home?.metrics?.items ?? [];
  const educationHighlights = home?.education?.highlights ?? [];
  const astroServicesCards = home?.astroServices?.cards ?? [];
  const applicationSteps = home?.application?.steps ?? [];
  const blogPosts = home?.blogPreview?.posts ?? [];
  const paymentCards = home?.payment?.cards ?? [];
  const contactContacts = home?.contactPanel?.contacts ?? [];
  const contactSocials = home?.contactPanel?.socials ?? [];

  return (
    <>
      <section className="landing-panel landing-panel--metrics">
        <header className="section-heading">
          <span className="pill">{home?.metrics?.eyebrow ?? ""}</span>
          <h2>{home?.metrics?.title ?? ""}</h2>
          <p className="lead">{home?.metrics?.description ?? ""}</p>
        </header>
        <div className="metrics-grid">
          {metricsItems.map(item => (
            <article key={item.label} className="metric-card">
              <strong>{item.value}</strong>
              <p>{item.label}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="landing-panel landing-panel--education">
        <header className="section-heading">
          <span className="pill">{home?.education?.eyebrow ?? ""}</span>
          <h2>{home?.education?.title ?? ""}</h2>
          <p className="lead">{home?.education?.description ?? ""}</p>
        </header>
        <div className="education-panel">
          <p>{home?.education?.body ?? ""}</p>
          <ul>
            {educationHighlights.map(highlight => (
              <li key={highlight}>{highlight}</li>
            ))}
          </ul>
        </div>
      </section>

      <section className="landing-panel landing-panel--programs">
        <header className="section-heading">
          <span className="pill">{home?.programs?.eyebrow ?? ""}</span>
          <h2>{home?.programs?.title ?? ""}</h2>
          <p className="lead">{home?.programs?.description ?? ""}</p>
        </header>
        <div className="programs-grid">
          {programCards.map((card, index) => {
            const accentIndex = index % programIcons.length;
            const icon = programIcons[accentIndex];
            const fillRatio = [0.85, 0.65, 0.78, 0.7][accentIndex];
            const insight = intensityHints[accentIndex];
            return (
              <article key={card.name} className={`program-card program-card--accent-${accentIndex}`}>
                <header className="program-card__header">
                  <div className="program-card__icon" aria-hidden="true">
                    <span>{icon}</span>
                  </div>
                  <div className="program-card__title-group">
                    <span className="program-card__subtitle">{card.subtitle}</span>
                    <h3>{card.name}</h3>
                  </div>
                  <span className="program-card__badge">{String(index + 1).padStart(2, "0")}</span>
                </header>
                <p className="program-card__description">{card.modules}</p>
                <div className="program-card__stats">
                  <div className="program-card__stat">
                    <span className="program-card__stat-label">{durationLabel}</span>
                    <span className="program-card__stat-value">{card.duration}</span>
                  </div>
                  <div className="program-card__stat">
                    <span className="program-card__stat-label">{priceLabel}</span>
                    <span className="program-card__stat-value">{card.price}</span>
                  </div>
                </div>
                <div className="program-card__meter" aria-hidden="true">
                  <span className="program-card__meter-fill" style={{ width: `${fillRatio * 100}%` }} />
                </div>
                <div className="program-card__actions">
                  <span>{insight ?? actionsHint}</span>
                  <a className="button button--frosted" href={card.href} target="_blank" rel="noreferrer">
                    {card.linkLabel}
                  </a>
                </div>
              </article>
            );
          })}
        </div>
        <div className="section-cta">
          <Link className="button button--ghost" href={`/${locale}/courses`}>
            {home?.programs?.ctaLabel ?? ""}
          </Link>
        </div>
      </section>

      <section className="landing-panel landing-panel--services">
        <header className="section-heading">
          <span className="pill">{home?.astroServices?.eyebrow ?? ""}</span>
          <h2>{home?.astroServices?.title ?? ""}</h2>
          <p className="lead">{home?.astroServices?.description ?? ""}</p>
        </header>
        <div className="services-grid">
          {astroServicesCards.map(card => (
            <a key={card.name} className="service-card" href={card.href} target="_blank" rel="noreferrer">
              <h3>{card.name}</h3>
              <p>{card.description}</p>
              <div className="service-card__meta">
                <span>{card.duration}</span>
                <span>{card.price}</span>
              </div>
            </a>
          ))}
        </div>
        <div className="section-cta">
          <Link className="button" href={`/${locale}${home?.astroServices?.ctaHref ?? ""}`}>
            {home?.astroServices?.ctaLabel ?? ""}
          </Link>
        </div>
      </section>

      <section className="landing-panel landing-panel--application">
        <header className="section-heading">
          <span className="pill">{home?.application?.eyebrow ?? ""}</span>
          <h2>{home?.application?.title ?? ""}</h2>
          <p className="lead">{home?.application?.description ?? ""}</p>
        </header>
        <ol className="application-steps">
          {applicationSteps.map(step => (
            <li key={step.title}>
              <strong>{step.title}</strong>
              <p>{step.description}</p>
            </li>
          ))}
        </ol>
        <p className="application-note">{home?.application?.note ?? ""}</p>
      </section>

      <section className="landing-panel landing-panel--blog">
        <header className="section-heading">
          <span className="pill">{home?.blogPreview?.eyebrow ?? ""}</span>
          <h2>{home?.blogPreview?.title ?? ""}</h2>
          <p className="lead">{home?.blogPreview?.description ?? ""}</p>
        </header>
        <div className="blog-grid">
          {blogPosts.map(post => (
            <article key={post.title} className="blog-card">
              <span>{post.tag}</span>
              <h3>{post.title}</h3>
              <p>{post.excerpt}</p>
              <a href={post.href} target="_blank" rel="noreferrer">
                {home.blogPreview.ctaLabel}
              </a>
            </article>
          ))}
        </div>
        <div className="section-cta">
          <Link className="button button--ghost" href={`/${locale}${home?.blogPreview?.ctaHref ?? ""}`}>
            {home?.blogPreview?.ctaLabel ?? ""}
          </Link>
        </div>
      </section>

      <section className="landing-panel landing-panel--payment">
        <header className="section-heading">
          <span className="pill">{home?.payment?.eyebrow ?? ""}</span>
          <h2>{home?.payment?.title ?? ""}</h2>
        </header>
        <div className="payment-grid">
          {paymentCards.map(card => (
            <article key={card.label} className="payment-card">
              <h3>{card.label}</h3>
              <ul>
                {card.details.map(detail => (
                  <li key={detail}>{detail}</li>
                ))}
              </ul>
            </article>
          ))}
        </div>
        <p className="payment-note">{home?.payment?.note ?? ""}</p>
      </section>

      <section className="landing-panel landing-panel--contact">
        <header className="section-heading">
          <span className="pill">{home?.contactPanel?.eyebrow ?? ""}</span>
          <h2>{home?.contactPanel?.title ?? ""}</h2>
          <p className="lead">{home?.contactPanel?.description ?? ""}</p>
        </header>
        <div className="contact-panel">
          <div>
            <p className="eyebrow">{home?.contactPanel?.eyebrow ?? ""}</p>
            <ul>
              {contactContacts.map(contact => (
                <li key={contact.label}>
                  <span>{contact.label}</span>
                  {contact.href ? (
                    <a href={contact.href}>{contact.value}</a>
                  ) : (
                    <span>{contact.value}</span>
                  )}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="eyebrow">{common?.footer?.socialLabel ?? ""}</p>
            <div className="contact-panel__socials">
              {contactSocials.map(social => (
                <a key={social.href} href={social.href} target="_blank" rel="noreferrer">
                  {social.label}
                </a>
              ))}
            </div>
          </div>
        </div>
        <div className="section-cta">
          <a className="button" href={home?.contactPanel?.ctaHref ?? "#"} target="_blank" rel="noreferrer">
            {home?.contactPanel?.ctaLabel ?? ""}
          </a>
          <a className="button button--ghost" href={mailto}>
            {footerContact}
          </a>
        </div>
      </section>
    </>
  );
}
