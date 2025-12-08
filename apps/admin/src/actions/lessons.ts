"use server";

import { createLesson, deleteLesson, reorderLessons, updateLesson, updateLessonQuiz } from "../lib/api";
import type { LessonDraftInput, LessonQuizInput } from "../lib/api";

export async function createLessonAction(moduleId: string, input: LessonDraftInput) {
  return createLesson(moduleId, input);
}

export async function updateLessonAction(moduleId: string, lessonId: string, input: LessonDraftInput) {
  return updateLesson(moduleId, lessonId, input);
}

export async function deleteLessonAction(moduleId: string, lessonId: string) {
  return deleteLesson(moduleId, lessonId);
}

export async function reorderLessonsAction(moduleId: string, lessonIds: string[]) {
  return reorderLessons(moduleId, lessonIds);
}

export async function updateLessonQuizAction(lessonId: string, input: LessonQuizInput) {
  return updateLessonQuiz(lessonId, input);
}
