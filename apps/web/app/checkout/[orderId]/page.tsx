import Link from "next/link";
import { fetchOrder } from "../../../src/lib/api";
import { getCopy, type TranslationShape } from "../../../src/lib/i18n.config";

type Locale = "ru" | "en";
type CheckoutCopy = TranslationShape["checkout"];

interface CheckoutPageProps {
  params: Promise<{ orderId: string }>;
  searchParams?: Promise<{ provider?: string; locale?: string; providerUrl?: string }>;
}

export default async function CheckoutPage({ params, searchParams }: CheckoutPageProps) {
  const { orderId } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const locale: Locale = resolvedSearchParams?.locale === "en" ? "en" : "ru";
  const order = await fetchOrder(orderId);
  const payments = order.payments ?? [];
  const providerParam = resolvedSearchParams?.provider ?? payments[0]?.provider ?? "stripe";
  const provider = providerParam.toLowerCase();
  const providerCheckoutUrl = resolvedSearchParams?.providerUrl;
  const copy = (await getCopy(locale)).checkout;

  const amountLabel = formatCurrency(order, locale);
  const providerLabel = formatProvider(provider, copy);
  const statusLabel = formatStatus(order.status, copy);
  const instructions = getProviderInstructions(provider, copy, providerCheckoutUrl);

  return (
    <main className="checkout-page">
      <header className="checkout-page__header">
        <p className="checkout-page__eyebrow">{copy.pageTitle}</p>
        <h1>{copy.summaryHeading}</h1>
      </header>
      <div className="checkout-grid">
        <section className="checkout-card">
          <h2>{copy.summaryHeading}</h2>
          <dl>
            <div>
              <dt>{copy.orderIdLabel}</dt>
              <dd>{order.id}</dd>
            </div>
            <div>
              <dt>{copy.amountLabel}</dt>
              <dd>{amountLabel}</dd>
            </div>
            <div>
              <dt>{copy.statusLabel}</dt>
              <dd className={`checkout-status checkout-status--${order.status.toLowerCase()}`}>{statusLabel}</dd>
            </div>
            <div>
              <dt>{copy.providerLabel}</dt>
              <dd>{providerLabel}</dd>
            </div>
          </dl>
        </section>
        <section className="checkout-card">
          <h2>{instructions.title}</h2>
          <ul className="checkout-steps">
            {instructions.steps.map(step => (
              <li key={step}>{step}</li>
            ))}
          </ul>
          {instructions.testCard && (
            <div className="checkout-test-card">
              <p>{copy.testCardHeading}</p>
              <div>
                <span>{copy.testCardNumberLabel}</span>
                <strong>{instructions.testCard.number}</strong>
              </div>
              <div>
                <span>{copy.testCardExpiryLabel}</span>
                <strong>{instructions.testCard.expiry}</strong>
              </div>
              <div>
                <span>{copy.testCardCvcLabel}</span>
                <strong>{instructions.testCard.cvc}</strong>
              </div>
              <p className="checkout-test-card__note">{copy.testCardNote}</p>
            </div>
          )}
          {instructions.cta && (
            <a
              className="button button--ghost"
              href={instructions.cta.href}
              target="_blank"
              rel="noreferrer noopener"
            >
              {instructions.cta.label}
            </a>
          )}
        </section>
      </div>
      <section className="checkout-card">
        <div className="checkout-card__heading">
          <h2>{copy.paymentsListHeading}</h2>
        </div>
        {payments.length === 0 ? (
          <p>{copy.paymentsEmpty}</p>
        ) : (
          <ul className="checkout-payments">
            {payments.map(payment => (
              <li key={payment.id}>
                <div>
                  <span>{formatProvider(payment.provider, copy)}</span>
                  <strong>{formatCurrency(payment, locale)}</strong>
                </div>
                <div className={`checkout-status checkout-status--${payment.status.toLowerCase()}`}>
                  {formatStatus(payment.status, copy)}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
      <div className="checkout-footer">
        <Link href={`/${locale}/courses`} className="checkout-back-link">
          {copy.backToCourses}
        </Link>
        <p>{copy.supportNote}</p>
      </div>
    </main>
  );
}

function formatCurrency(entity: { amount: number; currency: string }, locale: Locale) {
  const formatter = new Intl.NumberFormat(locale === "en" ? "en-US" : "ru-RU", {
    style: "currency",
    currency: entity.currency || "USD",
    currencyDisplay: "narrowSymbol"
  });
  return formatter.format(entity.amount);
}

function formatProvider(provider: string, copy: CheckoutCopy) {
  const normalized = provider.toLowerCase();
  if (normalized.includes("stripe")) {
    return copy.providerStripe;
  }
  if (normalized.includes("yoo")) {
    return copy.providerYooKassa;
  }
  if (normalized.includes("cloud")) {
    return copy.providerCloudPayments;
  }
  if (normalized.includes("manual")) {
    return copy.providerManual;
  }
  return provider;
}

function formatStatus(status: string, copy: CheckoutCopy) {
  const normalized = status.toLowerCase();
  if (normalized === "pending" || normalized === "requires_payment_method") {
    return copy.statusPending;
  }
  if (normalized === "paid" || normalized === "succeeded") {
    return copy.statusPaid;
  }
  if (normalized === "processing") {
    return copy.statusProcessing;
  }
  if (normalized === "failed") {
    return copy.statusFailed;
  }
  return status;
}

function getProviderInstructions(
  provider: string,
  copy: CheckoutCopy,
  providerCheckoutUrl?: string | null
): {
  title: string;
  steps: readonly string[];
  testCard?: { number: string; expiry: string; cvc: string };
  cta?: { label: string; href: string };
} {
  if (provider.toLowerCase().includes("stripe")) {
    return {
      title: copy.instructionsStripeTitle,
      steps: copy.instructionsStripeSteps,
      testCard: { number: "4242 4242 4242 4242", expiry: "12/34", cvc: "123" }
    };
  }
  if (provider.toLowerCase().includes("yoo")) {
    return {
      title: copy.instructionsYooKassaTitle,
      steps: copy.instructionsYooKassaSteps,
      cta: providerCheckoutUrl ? { label: copy.instructionsYooKassaCta, href: providerCheckoutUrl } : undefined
    };
  }
  if (provider.toLowerCase().includes("cloud")) {
    return {
      title: copy.instructionsCloudPaymentsTitle,
      steps: copy.instructionsCloudPaymentsSteps,
      cta: providerCheckoutUrl ? { label: copy.instructionsCloudPaymentsCta, href: providerCheckoutUrl } : undefined
    };
  }
  return {
    title: copy.instructionsGenericTitle,
    steps: [copy.instructionsGenericStep]
  };
}