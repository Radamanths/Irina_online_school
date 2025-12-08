import { Logger } from "@nestjs/common";
import type { PaymentProvider } from "@prisma/client";
import type { OrderSummary } from "../orders/orders.service";
import type { SupportedLocale } from "../courses/courses.data";

export interface ProviderSessionResult {
  providerRef: string;
  confirmationUrl?: string;
  payload?: Record<string, unknown>;
  simulated: boolean;
}

interface ProviderConfig {
  frontendBaseUrl: string;
  yookassa?: { shopId?: string; secretKey?: string };
  cloudpayments?: { publicId?: string; secretKey?: string };
}

const logger = new Logger("PaymentProviders");

export async function createProviderSession(
  provider: PaymentProvider,
  order: OrderSummary,
  locale: SupportedLocale,
  config: ProviderConfig
): Promise<ProviderSessionResult | null> {
  switch (provider) {
    case "yookassa":
      return createYooKassaSession(order, locale, config);
    case "cloudpayments":
      return createCloudPaymentsSession(order, locale, config);
    default:
      return null;
  }
}

async function createYooKassaSession(
  order: OrderSummary,
  locale: SupportedLocale,
  config: ProviderConfig
): Promise<ProviderSessionResult> {
  const fallback = buildFallbackSession("yookassa", order, config.frontendBaseUrl);
  const shopId = config.yookassa?.shopId;
  const secretKey = config.yookassa?.secretKey;

  if (!shopId || !secretKey) {
    logger.warn("YooKassa credentials are not configured. Using simulated session.");
    return fallback;
  }

  try {
    const response = await fetch("https://api.yookassa.ru/v3/payments", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${Buffer.from(`${shopId}:${secretKey}`).toString("base64")}`,
        "Idempotence-Key": order.id
      },
      body: JSON.stringify({
        amount: { value: formatAmount(order.amount), currency: order.currency },
        capture: true,
        description: `Virgo School order ${order.id}`,
        confirmation: {
          type: "redirect",
          return_url: `${config.frontendBaseUrl}/checkout/${order.id}?locale=${locale}&provider=yookassa`
        },
        metadata: {
          orderId: order.id,
          userId: order.userId,
          courseId: order.courseId
        }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`YooKassa API returned ${response.status}: ${errorText}`);
    }

    const payload = (await response.json()) as {
      id?: string;
      confirmation?: { confirmation_url?: string };
    };

    return {
      providerRef: payload.id ?? fallback.providerRef,
      confirmationUrl: payload.confirmation?.confirmation_url ?? fallback.confirmationUrl,
      payload,
      simulated: false
    };
  } catch (error) {
    logger.error("Failed to create YooKassa payment", error instanceof Error ? error.stack : error);
    return fallback;
  }
}

async function createCloudPaymentsSession(
  order: OrderSummary,
  locale: SupportedLocale,
  config: ProviderConfig
): Promise<ProviderSessionResult> {
  const fallback = buildFallbackSession("cloudpayments", order, config.frontendBaseUrl);
  const publicId = config.cloudpayments?.publicId;
  const secretKey = config.cloudpayments?.secretKey;

  if (!publicId || !secretKey) {
    logger.warn("CloudPayments credentials are not configured. Using simulated session.");
    return fallback;
  }

  try {
    const response = await fetch("https://api.cloudpayments.ru/invoices/create", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${Buffer.from(`${publicId}:${secretKey}`).toString("base64")}`
      },
      body: JSON.stringify({
        Amount: Number(formatAmount(order.amount)),
        Currency: order.currency,
        Description: `Virgo School order ${order.id}`,
        AccountId: order.userId,
        Email: `student+${order.userId}@virgoschool.com`,
        SendEmail: true,
        JsonData: {
          orderId: order.id,
          courseId: order.courseId,
          locale
        }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`CloudPayments API returned ${response.status}: ${errorText}`);
    }

    const payload = (await response.json()) as {
      Success?: boolean;
      Message?: string;
      Model?: { Id?: string | number; Url?: string };
    };

    if (!payload.Success || !payload.Model) {
      throw new Error(payload.Message || "CloudPayments invoice creation failed");
    }

    return {
      providerRef: String(payload.Model.Id ?? fallback.providerRef),
      confirmationUrl: payload.Model.Url ?? fallback.confirmationUrl,
      payload,
      simulated: false
    };
  } catch (error) {
    logger.error("Failed to create CloudPayments invoice", error instanceof Error ? error.stack : error);
    return fallback;
  }
}

function buildFallbackSession(
  provider: PaymentProvider,
  order: OrderSummary,
  frontendBaseUrl: string
): ProviderSessionResult {
  const providerRef = `${provider}-${order.id}`;
  return {
    providerRef,
    confirmationUrl: `${frontendBaseUrl}/checkout/${order.id}?provider=${provider}`,
    payload: {
      provider,
      orderId: order.id,
      simulated: true
    },
    simulated: true
  };
}

function formatAmount(amount: number): string {
  return amount.toFixed(2);
}
