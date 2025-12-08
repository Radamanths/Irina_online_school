import { Injectable, Logger } from "@nestjs/common";
import type { Prisma } from "@prisma/client";
import type { SupportedLocale } from "../courses/courses.data";
import { PrismaService } from "../prisma/prisma.service";
import type { LessonProgressResponse } from "../progress/progress.service";
import type { CourseDetailResponse } from "../courses/courses.service";
import type { LessonProgressStatus } from "../progress/dto/upsert-progress.dto";

export interface EnrollmentSummary {
  id: string;
  course: CourseDetailResponse;
  status: string;
  progressPercent: number;
  nextLessonId?: string;
  nextLessonTitle?: string;
}

export interface Widget {
  eyebrow: string;
  title: string;
  description: string;
  cta?: { label: string; href: string };
}

export interface DashboardMetrics {
  completedLessons: number;
  activeCourses: number;
  minutesWatched: number;
  passedQuizzes: number;
}

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getDashboard(userId: string, locale: string) {
    const resolvedLocale: SupportedLocale = locale === "en" ? "en" : "ru";
    const [{ summaries, progressRecords }, widgets, passedQuizzes] = await Promise.all([
      this.getEnrollmentSummaries(userId, resolvedLocale),
      Promise.resolve(this.buildWidgets(resolvedLocale)),
      this.countPassedQuizzes(userId)
    ]);

    const metrics = this.buildMetrics({
      summaries,
      progressRecords,
      passedQuizzes
    });

    return {
      userId,
      widgets,
      enrollments: summaries,
      metrics,
      progress: progressRecords
    };
  }

  private async getEnrollmentSummaries(
    userId: string,
    locale: SupportedLocale
  ): Promise<{ summaries: EnrollmentSummary[]; progressRecords: LessonProgressResponse[] }> {
    try {
      const enrollments = await (this.prisma as PrismaService & { enrollment?: Prisma.EnrollmentDelegate }).enrollment?.findMany({
        where: { userId },
        include: {
          course: {
            include: {
              modules: {
                orderBy: { orderIndex: "asc" },
                include: {
                  lessons: {
                    orderBy: { orderIndex: "asc" },
                    include: { quiz: true }
                  }
                }
              }
            }
          }
        }
      });

      if (!enrollments || enrollments.length === 0) {
        return { summaries: [], progressRecords: [] };
      }

      const lessonIds = enrollments.flatMap(enrollment =>
        enrollment.course.modules.flatMap(module => module.lessons.map(lesson => lesson.id))
      );

      const progressRecords = await (this.prisma as PrismaService & { lessonProgress?: Prisma.LessonProgressDelegate }).lessonProgress?.findMany({
        where: {
          userId,
          lessonId: { in: lessonIds }
        }
      });
      const normalizedProgress: LessonProgressResponse[] = (progressRecords || []).map(progress => ({
        userId: progress.userId,
        lessonId: progress.lessonId,
        status: (progress.status as LessonProgressStatus) || "not_started",
        watchedSeconds: progress.watchedSeconds ?? 0,
        lastPositionSeconds: progress.lastPositionSeconds ?? 0,
        updatedAt: progress.updatedAt
      }));

      const summaries = enrollments.map(enrollment => this.mapEnrollment(enrollment, normalizedProgress, locale));
      return { summaries, progressRecords: normalizedProgress };
    } catch (error) {
      this.logger.error(
        `Failed to build enrollment summaries for user ${userId}`,
        error instanceof Error ? error.stack : error
      );
      return { summaries: [], progressRecords: [] };
    }
  }

  private mapEnrollment(
    enrollment: Prisma.EnrollmentGetPayload<{
      include: {
        course: {
          include: {
            modules: {
              orderBy: { orderIndex: "asc" };
              include: {
                lessons: {
                  orderBy: { orderIndex: "asc" };
                  include: { quiz: true };
                };
              };
            };
          };
        };
      };
    }>,
    progressRecords: LessonProgressResponse[],
    locale: SupportedLocale
  ): EnrollmentSummary {
    const course: CourseDetailResponse = {
      id: enrollment.course.id,
      slug: enrollment.course.slug,
      title: this.pickLocalized(enrollment.course.titleRu, enrollment.course.titleEn, locale),
      shortDescription: this.pickLocalized(enrollment.course.descriptionRu, enrollment.course.descriptionEn, locale),
      fullDescription: this.pickLocalized(enrollment.course.descriptionRu, enrollment.course.descriptionEn, locale),
      level: enrollment.course.level || (locale === "en" ? "All levels" : "Все уровни"),
      duration: enrollment.course.durationMonths ? this.formatCourseDuration(enrollment.course.durationMonths, locale) : "",
      price: "",
      modules: enrollment.course.modules.map(module => ({
        id: module.id,
        title: this.pickLocalized(module.titleRu, module.titleEn, locale),
        duration: this.formatModuleDuration(module.lessons, locale),
        lessons: module.lessons.map(lesson => ({
          id: lesson.id,
          title: this.pickLocalized(lesson.titleRu, lesson.titleEn, locale),
          type: lesson.quiz ? "quiz" : lesson.videoProvider ? "video" : "content",
          length: this.formatMinutes(lesson.durationMinutes, locale)
        }))
      }))
    };

    const courseLessonIds = course.modules.flatMap(module => module.lessons.map(lesson => lesson.id));
    const completedCount = courseLessonIds.filter(id => progressRecords.some(progress => progress.lessonId === id && progress.status === "completed"))
      .length;
    const progressPercent = courseLessonIds.length
      ? Math.round((completedCount / courseLessonIds.length) * 100)
      : 0;

    const nextLesson = course.modules
      .flatMap(module => module.lessons)
      .find(lesson => !progressRecords.some(progress => progress.lessonId === lesson.id && progress.status === "completed"));

    return {
      id: enrollment.id,
      status: enrollment.status,
      course,
      progressPercent,
      nextLessonId: nextLesson?.id,
      nextLessonTitle: nextLesson?.title
    };
  }

  private buildWidgets(locale: SupportedLocale): Widget[] {
    if (locale === "en") {
      return [
        {
          eyebrow: "Assignments",
          title: "2 briefs awaiting review",
          description: "Upload deliverables to unlock mentor feedback",
          cta: { label: "Open LMS", href: "/lms" }
        },
        {
          eyebrow: "Mentor",
          title: "Session with Alice tomorrow",
          description: "Prepare project deck to discuss art-direction",
          cta: { label: "Reschedule", href: "/mentors" }
        }
      ];
    }

    return [
      {
        eyebrow: "Задания",
        title: "2 брифа ждут проверки",
        description: "Загрузите материалы, чтобы получить фидбек наставника",
        cta: { label: "Перейти в LMS", href: "/lms" }
      },
      {
        eyebrow: "Наставник",
        title: "Звонок завтра",
        description: "Подготовьте проектную презентацию для сессии",
        cta: { label: "Перенести", href: "/mentors" }
      }
    ];
  }

  private pickLocalized(ruValue?: string | null, enValue?: string | null, locale: SupportedLocale = "ru"): string {
    const ru = ruValue?.trim();
    const en = enValue?.trim();
    if (locale === "en") {
      return en || ru || "";
    }
    return ru || en || "";
  }

  private formatCourseDuration(months?: number | null, locale: SupportedLocale = "ru") {
    if (!months) {
      return locale === "en" ? "Self-paced" : "В своём темпе";
    }
    if (locale === "en") {
      return months === 1 ? "1 month" : `${months} months`;
    }
    return `${months} мес.`;
  }

  private formatModuleDuration(lessons: { durationMinutes: number | null }[] = [], locale: SupportedLocale) {
    const totalMinutes = lessons.reduce((total, lesson) => total + (lesson.durationMinutes || 0), 0);
    return this.formatMinutes(totalMinutes, locale, locale === "en" ? "Flexible pace" : "Гибкий темп");
  }

  private formatMinutes(value?: number | null, locale: SupportedLocale = "ru", fallback?: string) {
    if (!value) {
      return fallback || (locale === "en" ? "Self-paced" : "В своём темпе");
    }
    return locale === "en" ? `${value} min` : `${value} мин`;
  }

  private buildMetrics(input: {
    summaries: EnrollmentSummary[];
    progressRecords: LessonProgressResponse[];
    passedQuizzes: number;
  }): DashboardMetrics {
    const completedLessons = input.progressRecords.filter(record => record.status === "completed").length;
    const minutesWatched = Math.round(
      input.progressRecords.reduce((total, record) => total + (record.watchedSeconds ?? 0), 0) / 60
    );
    const activeCourses = input.summaries.filter(summary => summary.progressPercent > 0 || summary.status === "active").length;

    return {
      completedLessons,
      activeCourses,
      minutesWatched: minutesWatched > 0 ? minutesWatched : 0,
      passedQuizzes: input.passedQuizzes
    };
  }

  private async countPassedQuizzes(userId: string): Promise<number> {
    try {
      const delegate = (this.prisma as PrismaService & { quizSubmission?: Prisma.QuizSubmissionDelegate }).quizSubmission;
      if (!delegate) {
        return 0;
      }
      return await delegate.count({ where: { userId, passed: true } });
    } catch (error) {
      this.logger.error(
        `Failed to count passed quizzes for user ${userId}`,
        error instanceof Error ? error.stack : error
      );
      return 0;
    }
  }
}
