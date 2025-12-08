import type { LessonProgressStatus } from "./types";

export interface SyncLessonProgressPayload {
  lessonId: string;
  status?: LessonProgressStatus;
  watchedSeconds?: number;
  lastPositionSeconds?: number;
}

export async function syncLessonProgress(payload: SyncLessonProgressPayload) {
  const response = await fetch("/api/progress", {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error("Failed to sync lesson progress");
  }

  return response.json();
}
