import { NextResponse } from "next/server";
import { requireAuth } from "../../../src/lib/auth";
import { updateLessonProgress } from "../../../src/lib/api";
import type { LessonProgressStatus } from "../../../src/lib/types";

interface ProgressPayload {
  lessonId?: unknown;
  status?: unknown;
  watchedSeconds?: unknown;
  lastPositionSeconds?: unknown;
}

export async function PATCH(request: Request) {
  const user = await requireAuth();
  let body: ProgressPayload = {};

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const lessonId = typeof body.lessonId === "string" ? body.lessonId : null;
  if (!lessonId) {
    return NextResponse.json({ error: "lessonId is required" }, { status: 400 });
  }

  const payload = {
    userId: user.id,
    lessonId,
    status: isValidStatus(body.status) ? body.status : undefined,
    watchedSeconds: parsePositiveNumber(body.watchedSeconds),
    lastPositionSeconds: parsePositiveNumber(body.lastPositionSeconds)
  };

  try {
    const result = await updateLessonProgress(payload);
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error("Failed to sync lesson progress", error);
    return NextResponse.json({ error: "Unable to update progress" }, { status: 500 });
  }
}

function isValidStatus(value: unknown): value is LessonProgressStatus {
  return value === "not_started" || value === "in_progress" || value === "completed";
}

function parsePositiveNumber(value: unknown): number | undefined {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return undefined;
  }
  return Math.max(0, Math.round(value));
}
