import Image from "next/image";
import Link from "next/link";
import { getCopy } from "../../lib/i18n.config";

export async function Hero({ locale }: { locale: string }) {
  const { hero, home } = await getCopy(locale);
  const metricHighlights = home?.metrics?.items?.slice(0, 3) ?? [];
  const featuredProgram = home?.programs?.cards?.[0];

  return (
    <section className="hero">
      <div className="hero__content">
        <span className="pill">{hero?.eyebrow ?? ""}</span>
        <h1>{hero?.headline ?? ""}</h1>
        <p className="lead">{hero?.subline ?? ""}</p>
        <div className="hero__actions">
          <Link className="button" href={`/${locale}/apply`}>
            {hero?.primaryCta ?? ""}
          </Link>
          <Link className="button button--ghost" href={`/${locale}/services`}>
            {hero?.secondaryCta ?? ""}
          </Link>
        </div>
        <dl className="hero__metrics">
          {metricHighlights.map(item => (
            <div key={item.label}>
              <dt>{item.value}</dt>
              <dd>{item.label}</dd>
            </div>
          ))}
        </dl>
      </div>

      <aside className="hero__panel">
        <div className="hero__card hero__card--badge">
          <Image src="/brand/graphics/symbol-12.svg" alt="Virgo badge" width={48} height={48} priority />
          <div>
            <p>Virgo School</p>
            <span>{home?.payment?.eyebrow ?? ""}</span>
          </div>
        </div>

        <div className="hero__card hero__card--webinar">
          <span className="pill">{home?.webinar?.eyebrow ?? ""}</span>
          <strong>{home?.webinar?.title ?? ""}</strong>
          <p>{home?.webinar?.description ?? ""}</p>
          <ul>
            {(home?.webinar?.details ?? []).map(detail => (
              <li key={detail}>{detail}</li>
            ))}
          </ul>
          <a className="button" href={home?.webinar?.ctaHref ?? "#"} target="_blank" rel="noreferrer">
            {home?.webinar?.ctaLabel ?? ""}
          </a>
          <small>{home?.webinar?.note ?? ""}</small>
        </div>

        {featuredProgram ? (
          <div className="hero__card hero__card--program">
            <span className="pill">{home?.programs?.eyebrow ?? ""}</span>
            <p>{featuredProgram.subtitle}</p>
            <strong>{featuredProgram.name}</strong>
            <div className="hero__schedule-meta">
              <span>{featuredProgram.duration}</span>
              <span>{featuredProgram.price}</span>
            </div>
            <p>{featuredProgram.modules}</p>
            <a className="hero__program-link" href={featuredProgram.href} target="_blank" rel="noreferrer">
              {featuredProgram.linkLabel}
            </a>
          </div>
        ) : null}
      </aside>
    </section>
  );
}
