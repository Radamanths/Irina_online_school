import { NextResponse } from "next/server";
import { requireAuth } from "../../../../src/lib/auth";
import { requestOrderInvoice } from "../../../../src/lib/api";

interface InvoiceRequestBody {
  orderId?: unknown;
  notes?: unknown;
}

export async function POST(request: Request) {
  const user = await requireAuth();
  let payload: InvoiceRequestBody = {};

  try {
    payload = (await request.json()) as InvoiceRequestBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const orderId = typeof payload.orderId === "string" ? payload.orderId.trim() : "";
  if (!orderId) {
    return NextResponse.json({ error: "orderId is required" }, { status: 400 });
  }

  const rawNotes = typeof payload.notes === "string" ? payload.notes.trim() : "";
  const notes = rawNotes.length ? rawNotes.slice(0, 500) : undefined;

  try {
    const invoice = await requestOrderInvoice(orderId, { userId: user.id, notes });
    return NextResponse.json(invoice, { status: 200 });
  } catch (error) {
    console.error("Failed to request invoice", error);
    return NextResponse.json({ error: "Unable to request invoice" }, { status: resolveStatus(error) });
  }
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
