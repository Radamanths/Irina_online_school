"use client";

import { useState, useTransition } from "react";
import type { FormEvent } from "react";
import { Button } from "@virgo/ui";
import type { DunningRunResult } from "../lib/api";
import { runDunningAutomationAction } from "../actions/dunning";

export function DunningAutomationPanel() {
  const [limit, setLimit] = useState("25");
  const [dryRun, setDryRun] = useState(true);
  const [result, setResult] = useState<DunningRunResult | null>(null);
  const [status, setStatus] = useState<"idle" | "pending" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus("pending");
    setMessage(null);

    const parsedLimit = Number(limit);
    const payload = {
      dryRun,
      ...(Number.isFinite(parsedLimit) && parsedLimit > 0 ? { limit: Math.floor(parsedLimit) } : {})
    };

    startTransition(() => {
      runDunningAutomationAction(payload)
        .then(response => {
          setResult(response);
          setStatus("idle");
        })
        .catch(error => {
          setStatus("error");
          setMessage(error instanceof Error ? error.message : "Не удалось запустить dunning");
        });
    });
  };

  const busy = isPending || status === "pending";
  const summary = result
    ? `${result.remindersSent} из ${result.evaluated} заказов получили напоминание · окно ${result.overdueDays} д · период ${result.reminderIntervalHours} ч`
    : "Автоматические повторные списания помогают удерживать студентов без ручной рутины.";

  return (
    <section className="form-panel" aria-live="polite">
      <header>
        <p className="eyebrow">Dunning</p>
        <h2>Повторные списания</h2>
        <p>{summary}</p>
      </header>
      <form className="form-section" onSubmit={handleSubmit}>
        <label className="form-field">
          <span>Максимум заказов за прогон</span>
          <input
            type="number"
            min={1}
            max={200}
            step={1}
            name="limit"
            value={limit}
            onChange={event => setLimit(event.target.value)}
            placeholder="25"
          />
          <p className="muted">Можно ограничить размер батча, чтобы протестировать процесс на малом объеме.</p>
        </label>
        <label className="form-field form-field--inline">
          <input
            type="checkbox"
            name="dryRun"
            checked={dryRun}
            onChange={event => setDryRun(event.target.checked)}
          />
          <span>Dry-run (обновляет только отчет, не пишет в БД)</span>
        </label>
        {status === "error" && message && <p className="form-error">{message}</p>}
        <div className="form-actions">
          <Button type="submit" disabled={busy}>
            {busy ? "Запускаем..." : "Запустить dunning"}
          </Button>
          {result && <span className="form-status">Последний прогон: {result.dryRun ? "демо" : "боевой"}</span>}
        </div>
      </form>
      {result && (
        <div className="detail-card detail-card--wide">
          <p className="eyebrow">Результаты</p>
          {result.entries.length === 0 ? (
            <p className="muted">Подходящих заказов не нашли. Проверьте окно просрочки или отключите dry-run.</p>
          ) : (
            <ul className="timeline">
              {result.entries.map(entry => (
                <li key={`${entry.orderId}-${entry.reminderCount}`} className="timeline__item">
                  <div>
                    <strong>Заказ {entry.orderId}</strong>
                    <p className="table-subtitle">Напоминание #{entry.reminderCount}</p>
                  </div>
                  <span>{entry.lastReminderAt}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}
