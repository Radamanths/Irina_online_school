import { Injectable, Logger } from "@nestjs/common";
import type { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { EnrollmentAccessService } from "../enrollments/enrollments.service";

export interface LessonDetail {
  id: string;
  moduleId: string;
  orderIndex: number;
  title: string;
  body?: string;
  durationMinutes?: number | null;
  videoProvider?: string | null;
  videoRef?: string | null;
  attachments?: Prisma.JsonValue | null;
  quizId?: string | null;
}

type LessonWithQuiz = Prisma.LessonGetPayload<{ include: { quiz: { select: { id: true } } } }>;

@Injectable()
export class LessonsService {
  private readonly logger = new Logger(LessonsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly enrollmentAccessService: EnrollmentAccessService
  ) {}

  async listLessons(moduleId: string, locale?: string): Promise<LessonDetail[]> {
    if (!moduleId) {
      return [];
    }

    try {
      const delegate = (this.prisma as PrismaService & { lesson?: Prisma.LessonDelegate }).lesson;
      if (!delegate) {
        return [];
      }

      const lessons = await delegate.findMany({
        where: { moduleId },
        orderBy: { orderIndex: "asc" },
        include: { quiz: { select: { id: true } } }
      });

      return lessons.map(lesson => this.mapLesson(lesson, locale));
    } catch (error) {
      this.logger.error(
        `Failed to list lessons for module ${moduleId}`,
        error instanceof Error ? error.stack : error
      );
      return [];
    }
  }

  async getLesson(lessonId: string, userId: string, locale?: string): Promise<LessonDetail | null> {
    try {
      const delegate = (this.prisma as PrismaService & { lesson?: Prisma.LessonDelegate }).lesson;
      if (!delegate) {
        return null;
      }

      const lesson = await delegate.findUnique({
        where: { id: lessonId },
        include: {
          quiz: { select: { id: true } }
        }
      });

      if (!lesson) {
        return null;
      }

      await this.enrollmentAccessService.assertLessonAccess(userId, lessonId);
      return this.mapLesson(lesson as LessonWithQuiz, locale);
    } catch (error) {
      this.logger.error(
        `Failed to fetch lesson ${lessonId}`,
        error instanceof Error ? error.stack : error
      );
      return null;
    }
  }

  private mapLesson(
      lesson: LessonWithQuiz,
    locale?: string
  ): LessonDetail {
    return {
      id: lesson.id,
      moduleId: lesson.moduleId,
      orderIndex: lesson.orderIndex,
      title: this.pickLocalized(lesson.titleRu, lesson.titleEn, locale),
      body: this.pickLocalized(lesson.bodyRu, lesson.bodyEn, locale) || undefined,
      durationMinutes: lesson.durationMinutes,
      videoProvider: lesson.videoProvider,
      videoRef: lesson.videoRef,
      attachments: lesson.attachments,
      quizId: lesson.quiz?.id ?? null
    };
  }

  private pickLocalized(ruValue?: string | null, enValue?: string | null, locale?: string): string {
    const ru = ruValue?.trim();
    const en = enValue?.trim();
    if (locale === "en") {
      return en || ru || "";
    }
    return ru || en || "";
  }
}
