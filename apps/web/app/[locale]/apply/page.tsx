import { buildSeoMetadata } from "../../../src/lib/seo";
import { getCopy } from "../../../src/lib/i18n.config";

interface PageParams {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: PageParams) {
  const { locale } = await params;
  return buildSeoMetadata(locale, "apply", "/apply");
}

export default async function ApplyPage({ params }: PageParams) {
  const { locale } = await params;
  const { applyPage, common } = await getCopy(locale);

  return (
    <div className="page">
      <section className="page-hero">
        <span className="pill">{common.navigation.cta.label}</span>
        <h1>{applyPage.title}</h1>
        <p className="lead">{applyPage.intro}</p>
      </section>

      <section className="landing-panel landing-panel--application">
        <ol className="application-steps">
          {applyPage.steps.map(step => (
            <li key={step.title}>
              <strong>{step.title}</strong>
              <p>{step.description}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="landing-panel landing-panel--faq">
        <header className="section-heading">
          <span className="pill">{applyPage.faq.title}</span>
          <h2>{applyPage.faq.title}</h2>
        </header>
        <div className="faq-list">
          {applyPage.faq.items.map(item => (
            <details key={item.question} open>
              <summary>{item.question}</summary>
              <p>{item.answer}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="landing-panel landing-panel--payment">
        <header className="section-heading">
          <span className="pill">{applyPage.payment.title}</span>
          <h2>{applyPage.payment.title}</h2>
        </header>
        <ul className="tuition-list">
          {applyPage.payment.items.map(item => (
            <li key={item.label}>
              <strong>{item.label}</strong>
              <span>{item.value}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="landing-panel landing-panel--contact apply-contact">
        <p>{applyPage.contactCta.caption}</p>
        <a className="button" href={applyPage.contactCta.href} target="_blank" rel="noreferrer">
          {applyPage.contactCta.label}
        </a>
      </section>
    </div>
  );
}
