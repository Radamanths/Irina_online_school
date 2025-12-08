"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@virgo/ui";
import {
  generatePaymentLinkAction,
  type PaymentLinkInput,
  type PaymentLinkPayload
} from "../../app/(dashboard)/orders/[orderId]/actions";

const providerOptions: { value: PaymentLinkInput["provider"]; label: string }[] = [
  { value: "yookassa", label: "YooKassa" },
  { value: "cloudpayments", label: "CloudPayments" },
  { value: "manual", label: "Manual" }
];

const localeOptions: { value: NonNullable<PaymentLinkInput["locale"]>; label: string }[] = [
  { value: "ru", label: "Русский" },
  { value: "en", label: "English" }
];

type FeedbackTone = "success" | "error";

interface PaymentLinkLauncherProps {
  orderId: string;
  initialLink?: PaymentLinkPayload | null;
}

export function PaymentLinkLauncher({ orderId, initialLink }: PaymentLinkLauncherProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [provider, setProvider] = useState<PaymentLinkInput["provider"]>(() => {
    if (initialLink?.provider && providerOptions.some(option => option.value === initialLink.provider)) {
      return initialLink.provider as PaymentLinkInput["provider"];
    }
    return providerOptions[0]?.value;
  });
  const [locale, setLocale] = useState<NonNullable<PaymentLinkInput["locale"]>>(
    initialLink?.locale ?? "ru"
  );
  const [link, setLink] = useState<PaymentLinkPayload | null>(initialLink ?? null);
  const [feedback, setFeedback] = useState<{ tone: FeedbackTone; text: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [isPending, startTransition] = useTransition();
  const rootRef = useRef<HTMLDivElement | null>(null);
  const router = useRouter();

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    const handleClick = (event: MouseEvent) => {
      if (!rootRef.current) {
        return;
      }
      if (rootRef.current.contains(event.target as Node)) {
        return;
      }
      setIsOpen(false);
    };

    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [isOpen]);

  const handleGenerate = () => {
    setFeedback(null);
    setCopied(false);
    startTransition(async () => {
      const response = await generatePaymentLinkAction(orderId, { provider, locale });
      if (!response.success || !response.link) {
        setLink(null);
        setFeedback({ tone: "error", text: response.message ?? "Не удалось создать ссылку" });
        return;
      }

      setLink(response.link);
      setFeedback({
        tone: "success",
        text: response.message ?? "Ссылка готова. Скопируйте ее и отправьте студенту."
      });
      router.refresh();
    });
  };

  const handleCopy = async () => {
    if (!link) {
      return;
    }
    try {
      if (!navigator?.clipboard) {
        throw new Error("Clipboard unavailable");
      }
      await navigator.clipboard.writeText(link.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setFeedback({ tone: "error", text: "Не удалось скопировать ссылку" });
    }
  };

  const providerLabel = link ? providerOptions.find(option => option.value === link.provider)?.label : null;
  const localeLabel = link ? localeOptions.find(option => option.value === link.locale)?.label : null;

  return (
    <div className="payment-link" ref={rootRef}>
      <Button type="button" onClick={() => setIsOpen(open => !open)}>
        {isOpen ? "Скрыть ссылку" : "Создать ссылку оплаты"}
      </Button>

      {isOpen && (
        <div className="payment-link__panel" role="dialog" aria-label="Создание ссылки оплаты">
          <div className="payment-link__fields">
            <label className="payment-link__label" htmlFor="payment-provider-select">
              Провайдер
            </label>
            <select
              id="payment-provider-select"
              className="payment-link__select"
              value={provider}
              onChange={event => setProvider(event.target.value as PaymentLinkInput["provider"])}
            >
              {providerOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="payment-link__fields">
            <label className="payment-link__label" htmlFor="payment-locale-select">
              Язык чек-аута
            </label>
            <select
              id="payment-locale-select"
              className="payment-link__select"
              value={locale}
              onChange={event => setLocale(event.target.value as NonNullable<PaymentLinkInput["locale"]>)}
            >
              {localeOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <Button type="button" onClick={handleGenerate} disabled={isPending}>
            {isPending ? "Генерируем..." : "Сформировать ссылку"}
          </Button>

          {feedback && <p className={`payment-link__feedback payment-link__feedback--${feedback.tone}`}>{feedback.text}</p>}

          {link && (
            <div className="payment-link__result">
              <label className="payment-link__label" htmlFor="payment-link-output">
                Ссылка готова
              </label>
              <div className="payment-link__copy-row">
                <input
                  id="payment-link-output"
                  className="payment-link__input"
                  value={link.url}
                  readOnly
                  aria-live="polite"
                />
                <Button type="button" variant="ghost" onClick={handleCopy}>
                  {copied ? "Скопировано" : "Копировать"}
                </Button>
              </div>
              <p className="payment-link__meta">
                {providerLabel ?? link.provider} · {localeLabel ?? link.locale} · {link.createdAt}
                {link.simulated && <span className="payment-link__badge payment-link__badge--muted">Sandbox</span>}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
