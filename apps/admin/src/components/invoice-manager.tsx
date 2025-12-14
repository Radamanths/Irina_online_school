"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@virgo/ui";
import type { OrderInvoiceDetail, InvoiceStatusValue } from "../lib/api";
import { updateInvoiceAction } from "../../app/(dashboard)/orders/[orderId]/actions";

const statusOptions: { value: InvoiceStatusValue; label: string }[] = [
  { value: "pending", label: "Готовится" },
  { value: "issued", label: "Выписан" },
  { value: "failed", label: "Ошибка" }
];

interface InvoiceManagerProps {
  orderId: string;
  invoice: OrderInvoiceDetail | null;
  billingProfilePresent: boolean;
}

interface FeedbackState {
  tone: "success" | "error";
  text: string;
}

export function InvoiceManager({ orderId, invoice, billingProfilePresent }: InvoiceManagerProps) {
  const router = useRouter();
  const [status, setStatus] = useState<InvoiceStatusValue>(invoice?.status ?? "pending");
  const [downloadUrl, setDownloadUrl] = useState(invoice?.downloadUrl ?? "");
  const [notes, setNotes] = useState(invoice?.notes ?? "");
  const [feedback, setFeedback] = useState<FeedbackState | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!billingProfilePresent) {
      setFeedback({ tone: "error", text: "Сначала заполните биллинг-профиль студента." });
      return;
    }

    setFeedback(null);
    startTransition(() => {
      void (async () => {
        const result = await updateInvoiceAction(orderId, {
          status,
          downloadUrl,
          notes
        });

        if (!result.success) {
          setFeedback({ tone: "error", text: result.message ?? "Не удалось обновить счёт" });
          return;
        }

        if (result.invoice) {
          setStatus(result.invoice.status);
          setDownloadUrl(result.invoice.downloadUrl ?? "");
          setNotes(result.invoice.notes ?? "");
        }

        setFeedback({ tone: "success", text: result.message ?? "Данные счета сохранены" });
        router.refresh();
      })();
    });
  };

  const isDisabled = isPending || !billingProfilePresent;

  return (
    <form className="invoice-manager" onSubmit={handleSubmit}>
      <div className="invoice-manager__grid">
        <div className="invoice-manager__field">
          <label className="invoice-manager__label" htmlFor={`invoice-status-${orderId}`}>
            Статус документа
          </label>
          <select
            id={`invoice-status-${orderId}`}
            className="invoice-manager__select"
            value={status}
            onChange={event => setStatus(event.target.value as InvoiceStatusValue)}
            disabled={isDisabled}
          >
            {statusOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="invoice-manager__field">
          <label className="invoice-manager__label" htmlFor={`invoice-link-${orderId}`}>
            Ссылка на PDF
          </label>
          <input
            id={`invoice-link-${orderId}`}
            className="invoice-manager__input"
            type="url"
            placeholder="https://storage.example.com/invoice.pdf"
            value={downloadUrl}
            onChange={event => setDownloadUrl(event.target.value)}
            disabled={isDisabled}
          />
        </div>

        <div className="invoice-manager__field">
          <label className="invoice-manager__label" htmlFor={`invoice-notes-${orderId}`}>
            Служебный комментарий
          </label>
          <textarea
            id={`invoice-notes-${orderId}`}
            className="invoice-manager__textarea"
            placeholder="Например: требуется подпись директора"
            maxLength={500}
            value={notes}
            onChange={event => setNotes(event.target.value)}
            disabled={isDisabled}
          />
        </div>
      </div>

      <div className="invoice-manager__actions">
        <Button type="submit" disabled={isDisabled}>
          {isPending ? "Сохраняем..." : invoice ? "Обновить счёт" : "Создать счёт"}
        </Button>
        {!billingProfilePresent && (
          <p className="invoice-manager__hint">Без реквизитов выпуск счета недоступен.</p>
        )}
      </div>

      {feedback && (
        <p className={`invoice-manager__feedback invoice-manager__feedback--${feedback.tone}`}>
          {feedback.text}
        </p>
      )}
    </form>
  );
}
