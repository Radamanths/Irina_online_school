"use server";

import { revalidatePath } from "next/cache";
import { createManualEnrollment, type ManualEnrollmentInput } from "../lib/api";

export type ManualEnrollmentActionResult =
  | { status: "success"; message?: string }
  | { status: "error"; message: string };

export async function createManualEnrollmentAction(
  input: ManualEnrollmentInput
): Promise<ManualEnrollmentActionResult> {
  if (!input.userId || !input.courseId) {
    return { status: "error", message: "Укажите студента и курс" };
  }

  const payload: ManualEnrollmentInput = {
    userId: input.userId,
    courseId: input.courseId,
    status: input.status || undefined,
    accessStart: input.accessStart || undefined,
    accessEnd: input.accessEnd || undefined,
    note: input.note?.trim() || undefined
  };

  try {
    await createManualEnrollment(payload);
    revalidatePath("/students");
    return { status: "success", message: "Доступ успешно выдан" };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Не удалось выдать доступ";
    return { status: "error", message };
  }
}
