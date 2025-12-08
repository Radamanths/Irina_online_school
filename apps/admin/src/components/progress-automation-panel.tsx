"use client";

import { useState, useTransition } from "react";
import type { FormEvent } from "react";
import { Button } from "@virgo/ui";
import type { ProgressAutomationSettings } from "../lib/api";
import {
  triggerProgressAutomationTestAction,
  updateProgressAutomationSettingsAction
} from "../actions/progress-automation";

interface ProgressAutomationPanelProps {
  settings: ProgressAutomationSettings;
}

export function ProgressAutomationPanel({ settings }: ProgressAutomationPanelProps) {
  const [webhookUrl, setWebhookUrl] = useState(settings.webhookUrl ?? "");
  const [enabled, setEnabled] = useState(settings.enabled);
  const [updatedAt, setUpdatedAt] = useState(settings.updatedAt);
  const [activeUrl, setActiveUrl] = useState(settings.activeUrl);
  const [activeSource, setActiveSource] = useState(settings.activeSource);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [testStatus, setTestStatus] = useState<"idle" | "pending" | "success" | "error">("idle");
  const [testMessage, setTestMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isTesting, startTestTransition] = useTransition();

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus("saving");
    setMessage(null);

    const payload = {
      webhookUrl: webhookUrl.trim() ? webhookUrl.trim() : null,
      enabled
    };

    startTransition(() => {
      updateProgressAutomationSettingsAction(payload)
        .then(response => {
          setWebhookUrl(response.webhookUrl ?? "");
          setEnabled(response.enabled);
          setUpdatedAt(response.updatedAt);
          setActiveUrl(response.activeUrl);
          setActiveSource(response.activeSource);
          setStatus("saved");
        })
        .catch(error => {
          const fallbackMessage = "Не удалось обновить настройки";
          setStatus("error");
          setMessage(error instanceof Error ? error.message : fallbackMessage);
        });
    });
  };

  const handleDisable = () => {
    setEnabled(false);
  };

  const handleEnable = () => {
    setEnabled(true);
  };

  const handleReset = () => {
    setWebhookUrl(settings.webhookUrl ?? "");
    setEnabled(settings.enabled);
    setUpdatedAt(settings.updatedAt);
    setActiveUrl(settings.activeUrl);
    setActiveSource(settings.activeSource);
    setStatus("idle");
    setMessage(null);
  };

  const busy = isPending || status === "saving";
  const formattedUpdatedAt = updatedAt
    ? new Intl.DateTimeFormat("ru-RU", { dateStyle: "medium", timeStyle: "short" }).format(new Date(updatedAt))
    : "—";
  const statusMessage = (() => {
    if (status === "saved") {
      return "Настройки обновлены";
    }
    if (status === "error") {
      return message ?? "Не удалось сохранить";
    }
    return null;
  })();

  const resolvedEndpoint = (() => {
    if (activeSource === "env") {
      return { label: "Env override", value: activeUrl, tone: "info" };
    }
    if (activeSource === "settings") {
      return { label: "Активный URL", value: activeUrl, tone: "success" };
    }
    return { label: "Вебхук выключен", value: null, tone: "muted" };
  })();

  const handleTestWebhook = () => {
    setTestStatus("pending");
    setTestMessage(null);
    startTestTransition(() => {
      triggerProgressAutomationTestAction()
        .then(result => {
          const summary = result.delivered
            ? `Отправлено в ${result.targetUrl ?? "неизвестный URL"}`
            : "Не удалось доставить";
          setTestStatus(result.delivered ? "success" : "error");
          setTestMessage(summary);
        })
        .catch(error => {
          setTestStatus("error");
          setTestMessage(error instanceof Error ? error.message : "Не удалось отправить тест");
        });
    });
  };

  return (
    <section className="form-panel" aria-live="polite">
      <header>
        <p className="eyebrow">Webhooks</p>
        <h2>Завершение уроков</h2>
        <p>
          Отправляйте события о прохождении уроков во внешние системы. Укажите URL вебхука и включите отправку,
          чтобы синхронизировать автоматизацию.
        </p>
      </header>
      <form className="form-section" onSubmit={handleSubmit}>
        <label className="form-field">
          <span>Webhook URL</span>
          <input
            type="url"
            name="webhookUrl"
            placeholder="https://example.com/api/webhooks/lesson"
            value={webhookUrl}
            onChange={event => setWebhookUrl(event.target.value)}
          />
          <p className="muted">
            Принимающая сторона должна обработать POST запрос с телом <code>lesson.completed</code> и подтвердить 2xx статусом.
          </p>
        </label>
        <fieldset className="form-field">
          <legend>Статус автоматизации</legend>
          <div>
            <label>
              <input
                type="radio"
                name="webhook-status"
                value="enabled"
                checked={enabled}
                onChange={handleEnable}
              />
              <span>Включено</span>
            </label>
            <label>
              <input
                type="radio"
                name="webhook-status"
                value="disabled"
                checked={!enabled}
                onChange={handleDisable}
              />
              <span>Выключено</span>
            </label>
          </div>
          <p className="muted">
            Отправка событий возможна только если указан URL и статус «Включено».
          </p>
        </fieldset>
        {statusMessage && (
          <p className={status === "error" ? "form-error" : "form-success"}>{statusMessage}</p>
        )}
        <div className="form-actions">
          <Button type="submit" disabled={busy}>
            {busy ? "Сохраняем..." : "Сохранить"}
          </Button>
          <Button type="button" variant="ghost" onClick={handleReset} disabled={busy}>
            Сбросить
          </Button>
          <span className="form-status">Обновлено: {formattedUpdatedAt}</span>
        </div>
        <div className="panel-divider" />
        <div className="form-field">
          <p className="eyebrow">Статус вебхука</p>
          <p className={`muted status-${resolvedEndpoint.tone}`}>
            {resolvedEndpoint.value ? `${resolvedEndpoint.label}: ${resolvedEndpoint.value}` : resolvedEndpoint.label}
          </p>
          <div className="form-actions">
            <Button type="button" variant="ghost" onClick={handleTestWebhook} disabled={isTesting}>
              {isTesting ? "Отправляем..." : "Отправить тестовый вебхук"}
            </Button>
            {testMessage && (
              <span className={testStatus === "success" ? "form-success" : "form-error"}>{testMessage}</span>
            )}
          </div>
        </div>
      </form>
    </section>
  );
}
