import { getAppConfig } from "@virgo/config";

const { apiBaseUrl } = getAppConfig();

export interface SubscriptionPlan {
  id: string;
  courseId: string;
  name: string;
  description: string | null;
  currency: string;
  amount: number;
  intervalUnit: "month" | "year";
  intervalCount: number;
  trialDays: number;
  setupFee: number | null;
  isActive: boolean;
  cohortCode?: string | null;
}

export async function fetchCoursePlans(
  courseId: string,
  options: { cohortCode?: string; signal?: AbortSignal } = {}
): Promise<SubscriptionPlan[]> {
  const url = new URL(`${apiBaseUrl}/subscriptions/plans`);
  url.searchParams.set("courseId", courseId);
  url.searchParams.set("active", "true");
  if (options.cohortCode) {
    url.searchParams.set("cohortCode", options.cohortCode);
  }

  const res = await fetch(url.toString(), {
    credentials: "include",
    signal: options.signal
  });

  if (!res.ok) {
    throw new Error("Failed to load subscription plans");
  }

  return res.json();
}
