import type { CourseDetail, LessonProgress, LessonProgressStatus } from "./types";

export interface CourseProgressSummary {
  course: CourseDetail;
  completionPercent: number;
  completedLessons: number;
  totalLessons: number;
  hasEngagement: boolean;
  nextLesson?: {
    id: string;
    title: string;
    moduleTitle: string;
    resumeUrl: string;
    status: LessonProgressStatus;
  };
  modules: Array<{ id: string; title: string; completedLessons: number; totalLessons: number }>;
}

export function createProgressMap(entries: LessonProgress[]): Map<string, LessonProgress> {
  return new Map(entries.map(entry => [entry.lessonId, entry]));
}

export function buildCourseProgressSummary(
  course: CourseDetail,
  progressMap: Map<string, LessonProgress>,
  locale: string
): CourseProgressSummary | null {
  const lessons = course.modules.flatMap(module =>
    module.lessons.map(lesson => ({
      ...lesson,
      moduleId: module.id,
      moduleTitle: module.title
    }))
  );

  if (lessons.length === 0) {
    return null;
  }

  const completedLessons = lessons.filter(lesson => progressMap.get(lesson.id)?.status === "completed").length;
  const completionPercent = lessons.length ? Math.round((completedLessons / lessons.length) * 100) : 0;
  const nextLessonEntry = lessons.find(lesson => {
    const record = progressMap.get(lesson.id);
    return !record || record.status !== "completed";
  });

  const modules = course.modules.map(module => ({
    id: module.id,
    title: module.title,
    completedLessons: module.lessons.filter(lesson => progressMap.get(lesson.id)?.status === "completed").length,
    totalLessons: module.lessons.length
  }));

  return {
    course,
    completionPercent,
    completedLessons,
    totalLessons: lessons.length,
    hasEngagement: lessons.some(lesson => progressMap.has(lesson.id)),
    nextLesson: nextLessonEntry
      ? {
          id: nextLessonEntry.id,
          title: nextLessonEntry.title,
          moduleTitle: nextLessonEntry.moduleTitle,
          resumeUrl: `/${locale}/dashboard/course/${course.slug}/lesson/${nextLessonEntry.id}`,
          status: progressMap.get(nextLessonEntry.id)?.status ?? "not_started"
        }
      : undefined,
    modules
  };
}
