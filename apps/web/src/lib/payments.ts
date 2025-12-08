import { getAppConfig } from "@virgo/config";

const { apiBaseUrl, paymentsProvider } = getAppConfig();

interface CreateCheckoutSessionInput {
  courseId: string;
  userId: string;
  currency?: string;
  provider?: string;
  locale?: string;
  subscriptionPlanId?: string;
}

export async function createCheckoutSession(input: CreateCheckoutSessionInput) {
  const payload = {
    ...input,
    provider: input.provider ?? paymentsProvider
  };
  const res = await fetch(`${apiBaseUrl}/payments/checkout`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    throw new Error("Unable to create checkout session");
  }
  return res.json();
}
