"use server";

import { revalidatePath } from "next/cache";
import { getAppConfig } from "@virgo/config";
import type { InvoiceStatusValue, OrderInvoiceDetail } from "../../../../src/lib/api";

interface ReminderResponse {
  success: boolean;
  reminderCount?: number;
  lastReminderAt?: string;
  message?: string;
}

interface RefundResponse {
  success: boolean;
  refundedAt?: string;
  paymentIds?: string[];
  reason?: string | null;
  message?: string;
}

export interface PaymentLinkInput {
  provider?: "manual" | "stripe" | "yookassa" | "cloudpayments";
  locale?: "ru" | "en";
}

export interface PaymentLinkPayload {
  orderId: string;
  id: string;
  url: string;
  provider: string;
  locale: "ru" | "en";
  paymentId: string | null;
  providerRef: string | null;
  simulated: boolean;
  createdAt: string;
  createdAtIso: string;
}

interface PaymentLinkResponse {
  success: boolean;
  link?: PaymentLinkPayload;
  message?: string;
}

interface InvoiceUpdateResponse {
  success: boolean;
  invoice?: OrderInvoiceDetail;
  message?: string;
}

export interface InvoiceUpdatePayload {
  status: InvoiceStatusValue;
  downloadUrl?: string;
  notes?: string;
}

export async function sendPaymentReminderAction(orderId: string): Promise<ReminderResponse> {
  const { apiBaseUrl } = getAppConfig();

  if (!apiBaseUrl) {
    await new Promise(resolve => setTimeout(resolve, 400));
    return {
      success: true,
      reminderCount: 1,
      lastReminderAt: new Intl.DateTimeFormat("ru-RU", {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit"
      }).format(new Date()),
      message: "Демо режим: напоминание не отправлено в боевой среде"
    };
  }

  const response = await fetch(`${apiBaseUrl}/admin/orders/${orderId}/remind`, {
    method: "POST",
    cache: "no-store"
  });

  if (!response.ok) {
    return { success: false, message: "Не удалось отправить напоминание" };
  }

  const payload = (await response.json()) as { reminderCount: number; lastReminderAt: string };
  revalidatePath(`/orders/${orderId}`);
  return { success: true, ...payload };
}

export async function processRefundAction(orderId: string, reason?: string): Promise<RefundResponse> {
  const { apiBaseUrl } = getAppConfig();
  const trimmedReason = reason?.trim();

  if (!apiBaseUrl) {
    await new Promise(resolve => setTimeout(resolve, 400));
    return {
      success: true,
      refundedAt: new Intl.DateTimeFormat("ru-RU", {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit"
      }).format(new Date()),
      paymentIds: [],
      reason: trimmedReason ?? null,
      message: trimmedReason ? `Демо режим: возврат с причиной «${trimmedReason}».` : undefined
    };
  }

  const response = await fetch(`${apiBaseUrl}/admin/orders/${orderId}/refund`, {
    method: "POST",
    cache: "no-store",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(trimmedReason ? { reason: trimmedReason } : {})
  });

  if (!response.ok) {
    return { success: false, message: "Не удалось оформить возврат" };
  }

  const payload = (await response.json()) as { refundedAt: string; paymentIds: string[]; reason?: string | null };
  revalidatePath(`/orders/${orderId}`);
  return { success: true, ...payload };
}

export async function generatePaymentLinkAction(orderId: string, input: PaymentLinkInput = {}): Promise<PaymentLinkResponse> {
  const { apiBaseUrl } = getAppConfig();
  const locale = input.locale === "en" ? "en" : "ru";
  const provider = input.provider ?? "manual";

  if (!apiBaseUrl) {
    await new Promise(resolve => setTimeout(resolve, 400));
    const params = new URLSearchParams({ provider, locale });
    const createdAtDate = new Date();
    return {
      success: true,
      link: {
        orderId,
        id: `demo-${orderId}-${Date.now()}`,
        url: `https://demo.virgo.school/checkout/${orderId}?${params.toString()}`,
        provider,
        locale,
        paymentId: `demo-${Date.now()}`,
        providerRef: `demo-${orderId}`,
        simulated: true,
        createdAt: new Intl.DateTimeFormat("ru-RU", {
          day: "2-digit",
          month: "short",
          hour: "2-digit",
          minute: "2-digit"
        }).format(createdAtDate),
        createdAtIso: createdAtDate.toISOString()
      },
      message: "Демо режим: ссылка создана локально"
    };
  }

  const response = await fetch(`${apiBaseUrl}/admin/orders/${orderId}/payment-link`, {
    method: "POST",
    cache: "no-store",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ provider, locale })
  });

  if (!response.ok) {
    return { success: false, message: "Не удалось создать ссылку оплаты" };
  }

  const payload = (await response.json()) as PaymentLinkPayload;
  return { success: true, link: payload };
}

export async function updateInvoiceAction(orderId: string, payload: InvoiceUpdatePayload): Promise<InvoiceUpdateResponse> {
  const { apiBaseUrl } = getAppConfig();
  const status = payload.status ?? "pending";
  const body: Record<string, unknown> = {
    status,
    downloadUrl: payload.downloadUrl,
    notes: payload.notes
  };

  if (!apiBaseUrl) {
    await new Promise(resolve => setTimeout(resolve, 400));
    const requestedAt = new Intl.DateTimeFormat("ru-RU", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit"
    }).format(new Date());
    return {
      success: true,
      invoice: {
        id: `demo-${orderId}`,
        status,
        downloadUrl: payload.downloadUrl?.trim() ? payload.downloadUrl.trim() : null,
        notes: payload.notes?.trim() ? payload.notes.trim() : null,
        requestedAt,
        profileSnapshot: null
      },
      message: "Демо режим: счёт обновлён локально"
    };
  }

  const response = await fetch(`${apiBaseUrl}/admin/orders/${orderId}/invoice`, {
    method: "PATCH",
    cache: "no-store",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    return { success: false, message: "Не удалось обновить счёт" };
  }

  const invoice = (await response.json()) as OrderInvoiceDetail;
  revalidatePath(`/orders/${orderId}`);
  return { success: true, invoice, message: "Счёт обновлён" };
}
