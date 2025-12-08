import { NextResponse } from "next/server";
import { requireAuth } from "../../../../src/lib/auth";
import { getBillingProfile, upsertBillingProfile } from "../../../../src/lib/api";
import type { UpsertBillingProfilePayload } from "../../../../src/lib/api";

export async function GET() {
  const user = await requireAuth();
  try {
    const profile = await getBillingProfile(user.id);
    return NextResponse.json(profile ?? null, { status: 200 });
  } catch (error) {
    console.error("Failed to load billing profile", error);
    return NextResponse.json({ error: "Unable to load billing profile" }, { status: resolveStatus(error) });
  }
}

export async function POST(request: Request) {
  const user = await requireAuth();
  let payload: Record<string, unknown> = {};

  try {
    payload = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const fullName = readRequiredString(payload.fullName, 200);
  const email = readRequiredString(payload.email, 200);
  if (!fullName || !email) {
    return NextResponse.json({ error: "fullName and email are required" }, { status: 400 });
  }

  const dto: UpsertBillingProfilePayload = {
    fullName,
    email,
    companyName: readOptionalString(payload.companyName, 200),
    taxId: readOptionalString(payload.taxId, 100),
    address: readOptionalString(payload.address, 300),
    phone: readOptionalString(payload.phone, 50)
  };

  try {
    const profile = await upsertBillingProfile(user.id, dto);
    return NextResponse.json(profile, { status: 200 });
  } catch (error) {
    console.error("Failed to save billing profile", error);
    return NextResponse.json({ error: "Unable to save billing profile" }, { status: resolveStatus(error) });
  }
}

function readRequiredString(value: unknown, maxLength: number) {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  if (!trimmed.length) {
    return null;
  }
  return trimmed.slice(0, maxLength);
}

function readOptionalString(value: unknown, maxLength: number) {
  if (typeof value !== "string") {
    return undefined;
  }
  const trimmed = value.trim();
  if (!trimmed.length) {
    return undefined;
  }
  return trimmed.slice(0, maxLength);
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
