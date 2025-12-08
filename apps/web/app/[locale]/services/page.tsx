import { buildSeoMetadata } from "../../../src/lib/seo";
import { getCopy } from "../../../src/lib/i18n.config";

interface PageParams {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: PageParams) {
  const { locale } = await params;
  return buildSeoMetadata(locale, "services", "/services");
}

export default async function ServicesPage({ params }: PageParams) {
  const { locale } = await params;
  const { servicesPage, common } = await getCopy(locale);
  const servicesLabel = common.navigation.primary.find(item => item.path === "services")?.label ?? servicesPage.title;

  return (
    <div className="page">
      <section className="page-hero">
        <span className="pill">{servicesLabel}</span>
        <h1>{servicesPage.title}</h1>
        <p className="lead">{servicesPage.intro}</p>
      </section>

      <section className="landing-panel landing-panel--services-detail">
        <div className="services-grid services-grid--detail">
          {servicesPage.cards.map(card => (
            <article key={card.title} className="service-card service-card--detail">
              <div className="service-card__header">
                <h3>{card.title}</h3>
                <span>{card.duration}</span>
              </div>
              <p>{card.description}</p>
              <ul>
                {card.features.map(feature => (
                  <li key={feature}>{feature}</li>
                ))}
              </ul>
              <div className="service-card__footer">
                <span>{card.price}</span>
                <a className="button button--ghost" href={card.href} target="_blank" rel="noreferrer">
                  {card.ctaLabel}
                </a>
              </div>
            </article>
          ))}
        </div>
        <p className="services-note">{servicesPage.note}</p>
      </section>
    </div>
  );
}
