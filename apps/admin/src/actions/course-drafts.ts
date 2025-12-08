"use server";

import { saveCourseDraft } from "../lib/api";
import type { CourseDraftInput } from "../lib/api";

export async function saveCourseDraftAction(input: CourseDraftInput) {
  return saveCourseDraft(input);
}
