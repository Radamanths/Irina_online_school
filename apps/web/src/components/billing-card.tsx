"use client";

import { useEffect, useState } from "react";
import { Card } from "@virgo/ui";
import type { InvoiceRequestSummary, OrderSelfServiceAction, OrderSummary } from "../lib/types";

interface BillingStatusMap {
  pending: string;
  requiresAction: string;
  completed: string;
  canceled: string;
  refunded: string;
}

interface SubscriptionStatusMap {
  trialing: string;
  active: string;
  pastDue: string;
  canceled: string;
}

interface PaymentStatusMap {
  paid: string;
  pending: string;
  failed: string;
  refunded: string;
}

interface BillingActionsCopy {
  cancelOrder: string;
  cancelSubscription: string;
  refund: string;
  processing: string;
  success: string;
  error: string;
}

interface BillingInvoiceCopy {
  heading: string;
  notRequested: string;
  requestedAt: string;
  notesLabel: string;
  notesPlaceholder: string;
  request: string;
  refresh: string;
  download: string;
  success: string;
  error: string;
  requiresProfile: string;
  status: InvoiceStatusMap;
}

interface InvoiceStatusMap {
  pending: string;
  issued: string;
  failed: string;
}

export interface BillingCardCopy {
  courseLabel: string;
  courseFallback: string;
  statusLabel: string;
  createdAtLabel: string;
  subscriptionLabel: string;
  nextChargeLabel: string;
  cancellationScheduled: string;
  paymentsHeading: string;
  paymentsEmpty: string;
  notAvailable: string;
  orderStatus: BillingStatusMap;
  subscriptionStatus: SubscriptionStatusMap;
  paymentStatus: PaymentStatusMap;
  types: { oneTime: string; subscription: string };
  actions: BillingActionsCopy;
  invoice: BillingInvoiceCopy;
}

interface BillingCardProps {
  order: OrderSummary;
  locale: string;
  courseTitle?: string | null;
  copy: BillingCardCopy;
  hasBillingProfile: boolean;
}

export function BillingCard({ order, locale, courseTitle, copy, hasBillingProfile }: BillingCardProps) {
  const [localOrder, setLocalOrder] = useState(order);
  const [invoice, setInvoice] = useState<InvoiceRequestSummary | null>(order.invoice ?? null);
  const [isSubmitting, setIsSubmitting] = useState<OrderSelfServiceAction | null>(null);
  const [invoiceSubmitting, setInvoiceSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ tone: "success" | "error"; message: string } | null>(null);
  const [invoiceFeedback, setInvoiceFeedback] = useState<{ tone: "success" | "error"; message: string } | null>(null);
  const [invoiceNotes, setInvoiceNotes] = useState("");
  const [profileReady, setProfileReady] = useState(hasBillingProfile);

  useEffect(() => {
    setProfileReady(hasBillingProfile);
  }, [hasBillingProfile]);

  useEffect(() => {
    function handleProfileSaved() {
      setProfileReady(true);
    }
    window.addEventListener("billing-profile:saved", handleProfileSaved);
    return () => window.removeEventListener("billing-profile:saved", handleProfileSaved);
  }, []);

  const amountLabel = formatCurrency(locale, localOrder.amount, localOrder.currency);
  const formattedCreatedAt = formatDate(locale, localOrder.createdAt);
  const isSubscription = localOrder.type === "subscription" || Boolean(localOrder.subscription);
  const hasSucceededPayment = localOrder.payments.some(payment => payment.status === "succeeded");

  const canCancelOrder = !isSubscription && (localOrder.status === "pending" || localOrder.status === "requires_action");
  const canCancelSubscription = Boolean(
    localOrder.subscription &&
      !localOrder.subscription.cancelAtPeriodEnd &&
      localOrder.subscription.status !== "canceled"
  );
  const canRequestRefund = hasSucceededPayment && localOrder.status !== "refunded";

  const subscription = localOrder.subscription ?? null;
  const subscriptionStatus = subscription
    ? copy.subscriptionStatus[normalizeSubscriptionStatus(subscription.status)] ?? subscription.status
    : null;
  const cancellationMessage = subscription?.cancelAtPeriodEnd
    ? copy.cancellationScheduled.replace(
        "{date}",
        formatDate(locale, subscription.currentPeriodEnd, copy.notAvailable)
      )
    : null;

  const buttons: { label: string; action: OrderSelfServiceAction; disabled: boolean }[] = [];
  if (canCancelOrder) {
    buttons.push({ label: copy.actions.cancelOrder, action: "cancel", disabled: false });
  }
  if (canCancelSubscription) {
    buttons.push({ label: copy.actions.cancelSubscription, action: "cancel", disabled: false });
  }
  if (canRequestRefund) {
    buttons.push({ label: copy.actions.refund, action: "refund", disabled: false });
  }

  async function handleAction(action: OrderSelfServiceAction) {
    setIsSubmitting(action);
    setFeedback(null);
    try {
      const response = await fetch("/api/orders/self-service", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ orderId: localOrder.id, action })
      });

      if (!response.ok) {
        throw new Error(`Request failed with ${response.status}`);
      }

      const updated = (await response.json()) as OrderSummary;
      setLocalOrder(updated);
      setFeedback({ tone: "success", message: copy.actions.success });
    } catch (error) {
      console.error("Self-service order action failed", error);
      setFeedback({ tone: "error", message: copy.actions.error });
    } finally {
      setIsSubmitting(null);
    }
  }

  async function handleInvoiceRequest() {
    if (invoiceSubmitting || !profileReady) {
      return;
    }
    setInvoiceSubmitting(true);
    setInvoiceFeedback(null);
    const notes = invoiceNotes.trim().slice(0, 500);
    try {
      const response = await fetch("/api/billing/request-invoice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ orderId: localOrder.id, notes: notes.length ? notes : undefined })
      });
      if (!response.ok) {
        throw new Error(`Request failed with ${response.status}`);
      }
      const summary = (await response.json()) as InvoiceRequestSummary;
      setInvoice(summary);
      setInvoiceFeedback({ tone: "success", message: copy.invoice.success });
    } catch (error) {
      console.error("Invoice request failed", error);
      setInvoiceFeedback({ tone: "error", message: copy.invoice.error });
    } finally {
      setInvoiceSubmitting(false);
    }
  }

  return (
    <Card className="billing-card">
      <header className="billing-card__header">
        <div>
          <p className="eyebrow">{isSubscription ? copy.types.subscription : copy.types.oneTime}</p>
          <h3>{courseTitle || copy.courseFallback}</h3>
        </div>
        <p className="billing-card__amount">{amountLabel}</p>
      </header>
      <dl className="billing-card__meta">
        <div>
          <dt>{copy.courseLabel}</dt>
          <dd>{courseTitle || copy.courseFallback}</dd>
        </div>
        <div>
          <dt>{copy.statusLabel}</dt>
          <dd>{mapOrderStatus(copy.orderStatus, localOrder.status)}</dd>
        </div>
        <div>
          <dt>{copy.createdAtLabel}</dt>
          <dd>{formattedCreatedAt}</dd>
        </div>
      </dl>
      {subscription && (
        <div className="billing-card__subscription">
          <div className="billing-card__tag">{copy.subscriptionLabel}</div>
          <strong>{subscriptionStatus}</strong>
          <p>
            {copy.nextChargeLabel}: {formatDate(locale, subscription.currentPeriodEnd, copy.notAvailable)}
          </p>
          {cancellationMessage && <p>{cancellationMessage}</p>}
        </div>
      )}
      {feedback && (
        <div
          className={`billing-card__feedback ${
            feedback.tone === "success" ? "billing-card__feedback--success" : "billing-card__feedback--error"
          }`}
        >
          {feedback.message}
        </div>
      )}
      <section className="billing-card__invoice">
        <div>
          <p className="eyebrow">{copy.invoice.heading}</p>
          <strong>{formatInvoiceStatus(copy.invoice, invoice)}</strong>
          {invoice?.requestedAt && (
            <p className="billing-card__invoice-meta">
              {copy.invoice.requestedAt.replace("{date}", formatDate(locale, invoice.requestedAt, copy.notAvailable))}
            </p>
          )}
        </div>
        {invoice?.downloadUrl && (
          <a
            href={invoice.downloadUrl}
            target="_blank"
            rel="noreferrer"
            className="button button--ghost"
          >
            {copy.invoice.download}
          </a>
        )}
      </section>
      {profileReady ? (
        <div className="billing-card__invoice-form">
          <label className="billing-card__invoice-notes">
            <span>{copy.invoice.notesLabel}</span>
            <textarea
              value={invoiceNotes}
              maxLength={500}
              placeholder={copy.invoice.notesPlaceholder}
              onChange={event => setInvoiceNotes(event.target.value)}
            />
          </label>
          {invoiceFeedback && (
            <div
              className={`billing-card__feedback ${
                invoiceFeedback.tone === "success"
                  ? "billing-card__feedback--success"
                  : "billing-card__feedback--error"
              }`}
            >
              {invoiceFeedback.message}
            </div>
          )}
          <div className="billing-card__invoice-actions">
            <button type="button" className="button button--ghost" disabled={invoiceSubmitting} onClick={handleInvoiceRequest}>
              {invoiceSubmitting
                ? `${invoice ? copy.invoice.refresh : copy.invoice.request}...`
                : invoice
                  ? copy.invoice.refresh
                  : copy.invoice.request}
            </button>
          </div>
        </div>
      ) : (
        <p className="billing-card__invoice-hint">{copy.invoice.requiresProfile}</p>
      )}
      {buttons.length > 0 && (
        <div className="billing-card__actions">
          {buttons.map(button => (
            <button
              key={button.label}
              type="button"
              className="button button--ghost"
              disabled={isSubmitting !== null}
              onClick={() => handleAction(button.action)}
            >
              {isSubmitting === button.action ? copy.actions.processing : button.label}
            </button>
          ))}
        </div>
      )}
      <section className="billing-card__payments">
        <h4>{copy.paymentsHeading}</h4>
        {localOrder.payments.length === 0 ? (
          <p className="billing-card__empty">{copy.paymentsEmpty}</p>
        ) : (
          <ul>
            {localOrder.payments.map(payment => (
              <li key={payment.id}>
                <span className="billing-card__payment-status">
                  {mapPaymentStatus(copy.paymentStatus, payment.status)}
                </span>
                <span>
                  {formatCurrency(locale, payment.amount, payment.currency)} · {formatDate(locale, payment.processedAt, copy.notAvailable)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </Card>
  );
}

function formatInvoiceStatus(copy: BillingInvoiceCopy, invoice: InvoiceRequestSummary | null) {
  if (!invoice) {
    return copy.notRequested;
  }
  const key = invoice.status as keyof InvoiceStatusMap;
  return copy.status[key] ?? invoice.status;
}

function mapOrderStatus(map: BillingStatusMap, status: string) {
  if (status === "requires_action") {
    return map.requiresAction;
  }
  const key = status as keyof BillingStatusMap;
  return map[key] ?? status;
}

function mapPaymentStatus(map: PaymentStatusMap, status: string) {
  if (status === "succeeded") {
    return map.paid;
  }
  const key = status as keyof PaymentStatusMap;
  return map[key] ?? status;
}

function normalizeSubscriptionStatus(status: string): keyof SubscriptionStatusMap {
  switch (status) {
    case "past_due":
      return "pastDue";
    case "canceled":
      return "canceled";
    case "trialing":
      return "trialing";
    case "active":
    case "incomplete":
    default:
      return status === "active" ? "active" : "trialing";
  }
}

function formatCurrency(locale: string, amount: number, currency: string) {
  try {
    return new Intl.NumberFormat(locale === "en" ? "en-US" : "ru-RU", {
      style: "currency",
      currency,
      maximumFractionDigits: currency === "USD" ? 2 : 0
    }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${currency}`;
  }
}

function formatDate(locale: string, value?: string | null, fallback = "") {
  if (!value) {
    return fallback || "";
  }
  try {
    return new Intl.DateTimeFormat(locale === "en" ? "en-US" : "ru-RU", {
      day: "2-digit",
      month: "short",
      year: "numeric"
    }).format(new Date(value));
  } catch {
    return fallback || value;
  }
}
