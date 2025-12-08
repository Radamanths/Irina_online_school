import { Injectable, Logger } from "@nestjs/common";
import type { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";

export interface LessonOutline {
  id: string;
  title: string;
  durationMinutes: number | null;
  orderIndex: number;
  type: "video" | "quiz" | "content";
}

export interface ModuleOutline {
  id: string;
  courseId: string;
  orderIndex: number;
  title: string;
  summary?: string;
  dripUnlockAt?: Date | null;
  lessons: LessonOutline[];
}

@Injectable()
export class ModulesService {
  private readonly logger = new Logger(ModulesService.name);

  constructor(private readonly prisma: PrismaService) {}

  async listModules(courseId: string, locale?: string): Promise<ModuleOutline[]> {
    if (!courseId) {
      return [];
    }

    try {
      const delegate = (this.prisma as PrismaService & { module?: Prisma.ModuleDelegate }).module;
      if (!delegate) {
        return [];
      }

      const records = await delegate.findMany({
        where: { courseId },
        orderBy: { orderIndex: "asc" },
        include: {
          lessons: {
            orderBy: { orderIndex: "asc" },
            include: { quiz: { select: { id: true } } }
          }
        }
      });

        return records.map(record => this.mapModule(record, locale));
    } catch (error) {
      this.logger.error(
        `Failed to list modules for course ${courseId}`,
        error instanceof Error ? error.stack : error
      );
      return [];
    }
  }

  async getModule(moduleId: string, locale?: string): Promise<ModuleOutline | null> {
    try {
      const delegate = (this.prisma as PrismaService & { module?: Prisma.ModuleDelegate }).module;
      if (!delegate) {
        return null;
      }

      const module = await delegate.findUnique({
        where: { id: moduleId },
        include: {
          lessons: {
            orderBy: { orderIndex: "asc" },
            include: { quiz: { select: { id: true } } }
          }
        }
      });

      return module ? this.mapModule(module, locale) : null;
    } catch (error) {
      this.logger.error(
        `Failed to fetch module ${moduleId}`,
        error instanceof Error ? error.stack : error
      );
      return null;
    }
  }

  private mapModule(
    module: Prisma.ModuleGetPayload<{
      include: { lessons: { include: { quiz: { select: { id: true } } } } };
    }> & { dripUnlockAt?: Date | null },
    locale?: string
  ): ModuleOutline {
    return {
      id: module.id,
      courseId: module.courseId,
      orderIndex: module.orderIndex,
      title: this.pickLocalized(module.titleRu, module.titleEn, locale),
      summary: this.pickLocalized(module.summaryRu, module.summaryEn, locale) || undefined,
      dripUnlockAt: module.dripUnlockAt ?? null,
      lessons: (module.lessons || []).map(lesson => this.mapLesson(lesson, locale))
    };
  }

  private mapLesson(
    lesson: Prisma.LessonGetPayload<{ include: { quiz: { select: { id: true } } } }>,
    locale?: string
  ): LessonOutline {
    return {
      id: lesson.id,
      title: this.pickLocalized(lesson.titleRu, lesson.titleEn, locale),
      durationMinutes: lesson.durationMinutes,
      orderIndex: lesson.orderIndex,
      type: this.resolveLessonType(lesson.videoProvider, lesson.quiz?.id)
    };
  }

  private resolveLessonType(videoProvider?: string | null, quizId?: string | null): LessonOutline["type"] {
    if (quizId) {
      return "quiz";
    }
    if (videoProvider) {
      return "video";
    }
    return "content";
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
