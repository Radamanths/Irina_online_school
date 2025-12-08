"use client";

import { useTransition, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@virgo/ui";
import { processRefundAction, sendPaymentReminderAction } from "../../app/(dashboard)/orders/[orderId]/actions";

interface OrderActionsPanelProps {
  orderId: string;
  isRefunded: boolean;
  lastReminderAt?: string | null;
  reminderCount?: number;
  refundReason?: string | null;
  refundProcessedAt?: string | null;
}

interface ActionFeedback {
  tone: "success" | "error";
  text: string;
}

export function OrderActionsPanel({
  orderId,
  isRefunded,
  lastReminderAt,
  reminderCount,
  refundReason,
  refundProcessedAt
}: OrderActionsPanelProps) {
  const [feedback, setFeedback] = useState<ActionFeedback | null>(null);
  const [activeAction, setActiveAction] = useState<"reminder" | "refund" | null>(null);
  const [isPending, startTransition] = useTransition();
  const [refundNote, setRefundNote] = useState("");
  const router = useRouter();

  const handleReminder = () => {
    setFeedback(null);
    setActiveAction("reminder");
    startTransition(async () => {
      const result = await sendPaymentReminderAction(orderId);
      if (!result.success) {
        setFeedback({ tone: "error", text: result.message ?? "Не удалось отправить напоминание" });
        setActiveAction(null);
        return;
      }
      setFeedback({
        tone: "success",
        text: result.message ?? "Напоминание отправлено"
      });
      setActiveAction(null);
      router.refresh();
    });
  };

  const handleRefund = () => {
    setFeedback(null);
    setActiveAction("refund");
    startTransition(async () => {
      const result = await processRefundAction(orderId, refundNote);
      if (!result.success) {
        setFeedback({ tone: "error", text: result.message ?? "Не удалось оформить возврат" });
        setActiveAction(null);
        return;
      }
      setRefundNote("");
      setFeedback({ tone: "success", text: result.message ?? "Возврат оформлен" });
      setActiveAction(null);
      router.refresh();
    });
  };

  return (
    <div className="order-actions">
      {!isRefunded && (
        <div className="order-actions__field">
          <label className="order-actions__label" htmlFor={`refund-reason-${orderId}`}>
            Комментарий к возврату (необязательно)
          </label>
          <textarea
            id={`refund-reason-${orderId}`}
            className="order-actions__textarea"
            placeholder="Например: студент перенес покупку на следующий поток"
            maxLength={500}
            value={refundNote}
            onChange={event => setRefundNote(event.target.value)}
            disabled={isPending}
          />
          <span className="order-actions__hint">До 500 символов</span>
        </div>
      )}
      <Button type="button" variant="ghost" onClick={handleReminder} disabled={isPending}>
        {isPending && activeAction === "reminder" ? "Отправляем..." : "Напомнить об оплате"}
      </Button>
      {!isRefunded && (
        <Button type="button" variant="ghost" onClick={handleRefund} disabled={isPending}>
          {isPending && activeAction === "refund" ? "Оформляем..." : "Оформить возврат"}
        </Button>
      )}
      {feedback && <p className={`table-feedback table-feedback--${feedback.tone}`}>{feedback.text}</p>}
      {isRefunded && refundProcessedAt && (
        <p className="order-actions__meta">Возврат оформлен: {refundProcessedAt}</p>
      )}
      {isRefunded && refundReason && (
        <p className="order-actions__meta">Комментарий: {refundReason}</p>
      )}
      {lastReminderAt && !feedback && (
        <p className="order-actions__meta">Последнее напоминание: {lastReminderAt}</p>
      )}
      {typeof reminderCount === "number" && reminderCount > 0 && !feedback && (
        <p className="order-actions__meta">Всего напоминаний: {reminderCount}</p>
      )}
    </div>
  );
}
