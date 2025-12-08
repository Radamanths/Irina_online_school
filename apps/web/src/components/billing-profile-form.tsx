"use client";

import { useState } from "react";
import { Card } from "@virgo/ui";
import type { BillingProfileSummary } from "../lib/types";

export interface BillingProfileFormCopy {
  title: string;
  description: string;
  updatedLabel: string;
  updatedFallback: string;
  submitLabel: string;
  success: string;
  error: string;
  fields: {
    fullName: string;
    email: string;
    companyName: string;
    taxId: string;
    address: string;
    phone: string;
  };
}

interface BillingProfileFormProps {
  locale: string;
  profile: BillingProfileSummary | null;
  copy: BillingProfileFormCopy;
}

export function BillingProfileForm({ locale, profile, copy }: BillingProfileFormProps) {
  const [formState, setFormState] = useState({
    fullName: profile?.fullName ?? "",
    email: profile?.email ?? "",
    companyName: profile?.companyName ?? "",
    taxId: profile?.taxId ?? "",
    address: profile?.address ?? "",
    phone: profile?.phone ?? ""
  });
  const [lastSaved, setLastSaved] = useState(profile?.updatedAt ?? null);
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ tone: "success" | "error"; message: string } | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!formState.fullName.trim() || !formState.email.trim()) {
      setFeedback({ tone: "error", message: copy.error });
      return;
    }
    setIsSaving(true);
    setFeedback(null);
    try {
      const response = await fetch("/api/billing/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formState)
      });
      if (!response.ok) {
        throw new Error(`Request failed with ${response.status}`);
      }
      const payload = (await response.json()) as BillingProfileSummary;
      setFormState({
        fullName: payload.fullName,
        email: payload.email,
        companyName: payload.companyName ?? "",
        taxId: payload.taxId ?? "",
        address: payload.address ?? "",
        phone: payload.phone ?? ""
      });
      setLastSaved(payload.updatedAt ?? null);
      setFeedback({ tone: "success", message: copy.success });
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("billing-profile:saved"));
      }
    } catch (error) {
      console.error("Failed to save billing profile", error);
      setFeedback({ tone: "error", message: copy.error });
    } finally {
      setIsSaving(false);
    }
  }

  function handleChange(field: keyof typeof formState, value: string) {
    setFormState(prev => ({ ...prev, [field]: value }));
  }

  const updatedLabel = lastSaved
    ? copy.updatedLabel.replace("{date}", formatDate(locale, lastSaved))
    : copy.updatedFallback;

  return (
    <Card className="billing-profile-card">
      <header className="billing-profile-card__header">
        <div>
          <h3>{copy.title}</h3>
          <p>{copy.description}</p>
        </div>
        <p className="billing-profile-card__meta">{updatedLabel}</p>
      </header>
      <form className="billing-profile-form" onSubmit={handleSubmit}>
        <div className="billing-profile-form__grid">
          <label>
            <span>{copy.fields.fullName}</span>
            <input
              type="text"
              value={formState.fullName}
              maxLength={200}
              onChange={event => handleChange("fullName", event.target.value)}
              required
            />
          </label>
          <label>
            <span>{copy.fields.email}</span>
            <input
              type="email"
              value={formState.email}
              maxLength={200}
              onChange={event => handleChange("email", event.target.value)}
              required
            />
          </label>
          <label>
            <span>{copy.fields.companyName}</span>
            <input
              type="text"
              value={formState.companyName}
              maxLength={200}
              onChange={event => handleChange("companyName", event.target.value)}
            />
          </label>
          <label>
            <span>{copy.fields.taxId}</span>
            <input
              type="text"
              value={formState.taxId}
              maxLength={100}
              onChange={event => handleChange("taxId", event.target.value)}
            />
          </label>
          <label className="billing-profile-form__full">
            <span>{copy.fields.address}</span>
            <textarea
              value={formState.address}
              maxLength={300}
              rows={3}
              onChange={event => handleChange("address", event.target.value)}
            />
          </label>
          <label>
            <span>{copy.fields.phone}</span>
            <input
              type="text"
              value={formState.phone}
              maxLength={50}
              onChange={event => handleChange("phone", event.target.value)}
            />
          </label>
        </div>
        {feedback && (
          <p
            className={`billing-profile-form__feedback ${
              feedback.tone === "success" ? "billing-profile-form__feedback--success" : "billing-profile-form__feedback--error"
            }`}
          >
            {feedback.message}
          </p>
        )}
        <div className="billing-profile-form__actions">
          <button type="submit" className="button" disabled={isSaving}>
            {isSaving ? `${copy.submitLabel}...` : copy.submitLabel}
          </button>
        </div>
      </form>
    </Card>
  );
}

function formatDate(locale: string, value: string) {
  try {
    return new Intl.DateTimeFormat(locale === "en" ? "en-US" : "ru-RU", {
      day: "2-digit",
      month: "short",
      year: "numeric"
    }).format(new Date(value));
  } catch {
    return value;
  }
}
