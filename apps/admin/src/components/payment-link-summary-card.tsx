"use client";

import { useState } from "react";
import { Button } from "@virgo/ui";
import type { PaymentLinkSummary } from "../lib/api";
import { formatLocaleLabel, formatProviderLabel } from "./payment-link-labels";

interface PaymentLinkSummaryCardProps {
  link: PaymentLinkSummary;
}

export function PaymentLinkSummaryCard({ link }: PaymentLinkSummaryCardProps) {
  const [copied, setCopied] = useState(false);
  const providerLabel = formatProviderLabel(link.provider);
  const localeLabel = formatLocaleLabel(link.locale);

  const handleCopy = async () => {
    try {
      if (!navigator?.clipboard) {
        throw new Error("Clipboard unavailable");
      }
      await navigator.clipboard.writeText(link.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  const handleOpen = () => {
    if (typeof window === "undefined") {
      return;
    }
    window.open(link.url, "_blank", "noopener,noreferrer");
  };

  return (
    <section className="detail-card detail-card--wide payment-link-summary">
      <div className="payment-link-summary__header">
        <p className="eyebrow">Последняя ссылка оплаты</p>
        <span
          className={`payment-link__badge ${link.simulated ? "payment-link__badge--muted" : "payment-link__badge--live"}`}
        >
          {link.simulated ? "Sandbox" : "Live"}
        </span>
      </div>
      <p className="payment-link-summary__meta">
        Создана {link.createdAt} · {providerLabel} · {localeLabel}
      </p>
      <div className="payment-link__copy-row">
        <input className="payment-link__input" value={link.url} readOnly aria-label="Ссылка оплаты" />
        <Button type="button" variant="ghost" onClick={handleCopy}>
          {copied ? "Скопировано" : "Копировать"}
        </Button>
        <Button type="button" variant="ghost" onClick={handleOpen}>
          Открыть
        </Button>
      </div>
      <dl className="payment-link-summary__stats">
        <div>
          <dt>ID платежа</dt>
          <dd>{link.paymentId ?? "—"}</dd>
        </div>
        <div>
          <dt>Reference</dt>
          <dd>{link.providerRef ?? "—"}</dd>
        </div>
      </dl>
    </section>
  );
}
