"use client";

import { useState } from "react";
import { Button } from "@virgo/ui";
import type { PaymentLinkHistoryEntry } from "../lib/api";
import { formatLocaleLabel, formatProviderLabel } from "./payment-link-labels";

interface PaymentLinkHistoryProps {
  links: PaymentLinkHistoryEntry[];
}

export function PaymentLinkHistory({ links }: PaymentLinkHistoryProps) {
  const sortedLinks = [...links].sort((a, b) => (
    new Date(b.createdAtIso).getTime() - new Date(a.createdAtIso).getTime()
  ));

  const [copiedId, setCopiedId] = useState<string | null>(null);

  if (!sortedLinks.length) {
    return null;
  }

  const handleCopy = async (link: PaymentLinkHistoryEntry) => {
    try {
      if (!navigator?.clipboard) {
        throw new Error("Clipboard unavailable");
      }
      await navigator.clipboard.writeText(link.url);
      setCopiedId(link.id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      setCopiedId(null);
    }
  };

  const handleOpen = (link: PaymentLinkHistoryEntry) => {
    if (typeof window === "undefined") {
      return;
    }
    window.open(link.url, "_blank", "noopener,noreferrer");
  };

  return (
    <section className="detail-card detail-card--wide payment-link-history">
      <p className="eyebrow">История ссылок оплаты</p>
      <div className="payment-link-history__list">
        {sortedLinks.map(link => (
          <article key={link.id} className="payment-link-history__row">
            <div>
              <p className="payment-link-history__title">
                {link.createdAt} · {formatProviderLabel(link.provider)} · {formatLocaleLabel(link.locale)}
              </p>
              <p className="payment-link-history__meta">
                ID платежа: {link.paymentId ?? "—"} · Reference: {link.providerRef ?? "—"}
              </p>
            </div>
            <div className="payment-link__copy-row">
              <input className="payment-link__input" value={link.url} readOnly aria-label="Ссылка оплаты" />
              <Button type="button" variant="ghost" onClick={() => handleCopy(link)}>
                {copiedId === link.id ? "Скопировано" : "Копировать"}
              </Button>
              <Button type="button" variant="ghost" onClick={() => handleOpen(link)}>
                Открыть
              </Button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
