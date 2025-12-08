import Link from "next/link";
import { getCopy } from "../../../src/lib/i18n.config";
import { buildSeoMetadata } from "../../../src/lib/seo";

interface Props {
  params: Promise<{ locale: string }>;
}

export default async function AboutPage({ params }: Props) {
  const { locale } = await params;
  const { about, common } = await getCopy(locale);

  return (
    <>
      <section className="hero hero--subtle">
        <p className="eyebrow">{about.title}</p>
        <h1>{about.intro}</h1>
      </section>

      <section className="about-section">
        <h2>{about.missionTitle}</h2>
        <p>{about.missionBody}</p>
      </section>

      <section className="about-section about-section--grid">
        <div>
          <h2>{about.methodTitle}</h2>
          <p>{about.methodDescription}</p>
        </div>
        <ul className="pillars">
          {about.methodHighlights.map(point => (
            <li key={point}>{point}</li>
          ))}
        </ul>
      </section>

      <section className="about-section">
        <h2>{about.mentorsTitle}</h2>
        <p>{about.mentorsBody}</p>
        <div className="about-stats">
          {about.stats.map(stat => (
            <article key={stat.label}>
              <span className="about-stats__value">{stat.value}</span>
              <span>{stat.label}</span>
            </article>
          ))}
        </div>
      </section>

      <section className="cta-panel">
        <div>
          <p className="eyebrow">{common.brandName}</p>
          <h3>{about.ctaLabel}</h3>
          <p>{about.ctaDescription}</p>
        </div>
        <div className="cta-panel__actions">
          <Link className="button" href={`/${locale}/courses`}>
            {about.ctaLabel}
          </Link>
          <Link className="button button--ghost" href={`mailto:${common.footer.contact}`}>
            {common.footer.contact}
          </Link>
        </div>
      </section>
    </>
  );
}

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  return buildSeoMetadata(locale, "about", "about");
}
