import { NextResponse } from "next/server";
import { requireAuth } from "../../../../src/lib/auth";
import { requestOrderSelfServiceAction } from "../../../../src/lib/api";
import type { OrderSelfServiceAction } from "../../../../src/lib/types";

type SelfServicePayload = {
  orderId?: unknown;
  action?: unknown;
  reason?: unknown;
};

export async function POST(request: Request) {
  const user = await requireAuth();
  let body: SelfServicePayload = {};

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const orderId = typeof body.orderId === "string" ? body.orderId : null;
  const action = isValidAction(body.action) ? body.action : null;
  const reason = typeof body.reason === "string" && body.reason.trim().length > 0 ? body.reason.trim().slice(0, 500) : undefined;

  if (!orderId || !action) {
    return NextResponse.json({ error: "orderId and action are required" }, { status: 400 });
  }

  try {
    const updated = await requestOrderSelfServiceAction(orderId, {
      userId: user.id,
      action,
      reason,
      channel: "dashboard"
    });
    return NextResponse.json(updated, { status: 200 });
  } catch (error) {
    console.error("Failed to process self-service order request", error);
    return NextResponse.json({ error: "Unable to update order" }, { status: resolveStatus(error) });
  }
}

function isValidAction(value: unknown): value is OrderSelfServiceAction {
  return value === "cancel" || value === "refund";
}

function resolveStatus(error: unknown): number {
  if (typeof error === "object" && error && "response" in error) {
    const response = (error as { response?: { status?: number } }).response;
    if (response?.status) {
      return response.status;
    }
  }
  return 500;
}
