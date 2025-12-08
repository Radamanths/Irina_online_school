import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import type { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { LessonProgressStatus, LESSON_PROGRESS_STATUSES, UpsertProgressDto } from "./dto/upsert-progress.dto";
import { EnrollmentAccessService } from "../enrollments/enrollments.service";
import { ProgressWebhookService } from "./progress-webhook.service";

export interface LessonProgressResponse {
  userId: string;
  lessonId: string;
  status: LessonProgressStatus;
  watchedSeconds: number;
  lastPositionSeconds: number;
  updatedAt: Date;
}

export interface LessonProgressExportRow {
  userId: string;
  userEmail: string;
  userName: string | null;
  courseId: string;
  moduleId: string;
  moduleTitle: string;
  lessonId: string;
  lessonTitle: string;
  status: LessonProgressStatus;
  updatedAt: Date;
}


@Injectable()
export class ProgressService {
  private readonly logger = new Logger(ProgressService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly enrollmentAccessService: EnrollmentAccessService,
    private readonly progressWebhookService: ProgressWebhookService
  ) {}

  async listProgress(userId: string, courseId?: string): Promise<LessonProgressResponse[]> {
    const where: Prisma.LessonProgressWhereInput = { userId };
    if (courseId) {
      await this.enrollmentAccessService.assertCourseAccess(userId, courseId);
      where.lesson = { module: { courseId } };
    }

    try {
      const delegate = (this.prisma as PrismaService & { lessonProgress?: Prisma.LessonProgressDelegate }).lessonProgress;
      if (!delegate) {
        return [];
      }

      const entries = await delegate.findMany({
        where,
        orderBy: { updatedAt: "desc" }
      });
      return entries.map(entry => this.mapResponse(entry));
    } catch (error) {
      this.logger.error(`Failed to list progress for user ${userId}`, error instanceof Error ? error.stack : error);
      return [];
    }
  }

  async upsertProgress(dto: UpsertProgressDto): Promise<LessonProgressResponse> {
    const payload = this.normalizePayload(dto);
    const lessonAccess = await this.enrollmentAccessService.assertLessonAccess(payload.userId, payload.lessonId);
    try {
      const delegate = (this.prisma as PrismaService & { lessonProgress?: Prisma.LessonProgressDelegate }).lessonProgress;
      if (!delegate) {
        throw new Error("Prisma lessonProgress delegate is not available. Run prisma generate.");
      }

      const existing = await delegate.findUnique({
        where: { userId_lessonId: { userId: payload.userId, lessonId: payload.lessonId } }
      });

      const record = await delegate.upsert({
        where: { userId_lessonId: { userId: payload.userId, lessonId: payload.lessonId } },
        create: payload,
        update: payload
      });

      if (this.shouldEmitCompletion(existing?.status, record.status)) {
        await this.emitCompletionWebhook({
          userId: record.userId,
          lessonId: record.lessonId,
          courseId: lessonAccess.courseId ?? null,
          moduleId: lessonAccess.moduleId ?? null,
          completedAt: record.updatedAt
        });
      }

      return this.mapResponse(record);
    } catch (error) {
      this.logger.error(
        `Failed to upsert progress for user ${payload.userId} lesson ${payload.lessonId}`,
        error instanceof Error ? error.stack : error
      );
      throw error;
    }
  }

  async exportCourseProgress(courseId: string, locale?: string): Promise<LessonProgressExportRow[]> {
    if (!courseId) {
      throw new NotFoundException("courseId is required");
    }

    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
      select: { id: true }
    });

    if (!course) {
      throw new NotFoundException(`Course ${courseId} not found`);
    }

    const resolvedLocale = locale === "en" ? "en" : "ru";
    const delegate = (this.prisma as PrismaService & { lessonProgress?: Prisma.LessonProgressDelegate }).lessonProgress;
    if (!delegate) {
      return [];
    }

    const entries = await delegate.findMany({
      where: { lesson: { module: { courseId } } },
      include: {
        user: { select: { id: true, email: true, firstName: true, lastName: true } },
        lesson: {
          select: {
            id: true,
            titleRu: true,
            titleEn: true,
            module: { select: { id: true, courseId: true, titleRu: true, titleEn: true } }
          }
        }
      },
      orderBy: [{ userId: "asc" }, { lessonId: "asc" }]
    });

    return entries.map(entry => ({
      userId: entry.userId,
      userEmail: entry.user.email,
      userName: this.buildUserName(entry.user.firstName, entry.user.lastName),
      courseId: entry.lesson.module.courseId,
      moduleId: entry.lesson.module.id,
      moduleTitle: this.pickLocalized(entry.lesson.module.titleRu, entry.lesson.module.titleEn, resolvedLocale),
      lessonId: entry.lesson.id,
      lessonTitle: this.pickLocalized(entry.lesson.titleRu, entry.lesson.titleEn, resolvedLocale),
      status: (entry.status as LessonProgressStatus) ?? "not_started",
      updatedAt: entry.updatedAt
    }));
  }

  serializeProgressCsv(rows: LessonProgressExportRow[]): string {
    const headers: (keyof LessonProgressExportRow | "updatedAtISO")[] = [
      "userId",
      "userEmail",
      "userName",
      "courseId",
      "moduleId",
      "moduleTitle",
      "lessonId",
      "lessonTitle",
      "status",
      "updatedAtISO"
    ];

    const lines = [headers.join(",")];
    for (const row of rows) {
      const values = [
        row.userId,
        row.userEmail,
        row.userName ?? "",
        row.courseId,
        row.moduleId,
        row.moduleTitle,
        row.lessonId,
        row.lessonTitle,
        row.status,
        row.updatedAt.toISOString()
      ];
      lines.push(values.map(value => this.escapeCsvValue(value)).join(","));
    }

    return lines.join("\n");
  }

  private normalizePayload(dto: UpsertProgressDto) {
    return {
      userId: dto.userId,
      lessonId: dto.lessonId,
      status: dto.status && LESSON_PROGRESS_STATUSES.includes(dto.status) ? dto.status : "in_progress",
      watchedSeconds: dto.watchedSeconds ?? undefined,
      lastPositionSeconds: dto.lastPositionSeconds ?? undefined
    };
  }

  private async emitCompletionWebhook(params: {
    userId: string;
    lessonId: string;
    courseId: string | null;
    moduleId: string | null;
    completedAt: Date;
  }) {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: params.userId },
        select: { email: true, firstName: true, lastName: true }
      });

      await this.progressWebhookService.emitLessonCompleted({
        userId: params.userId,
        userEmail: user?.email ?? null,
        userName: this.buildUserName(user?.firstName ?? null, user?.lastName ?? null),
        courseId: params.courseId,
        moduleId: params.moduleId,
        lessonId: params.lessonId,
        completedAt: params.completedAt.toISOString()
      });
    } catch (error) {
      this.logger.error(
        `Failed to emit completion webhook for user ${params.userId} lesson ${params.lessonId}`,
        error instanceof Error ? error.stack : error
      );
    }
  }

  private shouldEmitCompletion(previousStatus?: string, nextStatus?: string): boolean {
    return previousStatus !== "completed" && nextStatus === "completed";
  }

  private mapResponse(entry: {
    userId: string;
    lessonId: string;
    status: string;
    watchedSeconds: number;
    lastPositionSeconds: number;
    updatedAt: Date;
  }): LessonProgressResponse {
    return {
      userId: entry.userId,
      lessonId: entry.lessonId,
      status: (entry.status as LessonProgressStatus) || "not_started",
      watchedSeconds: entry.watchedSeconds,
      lastPositionSeconds: entry.lastPositionSeconds,
      updatedAt: entry.updatedAt
    };
  }

  private pickLocalized(ruValue?: string | null, enValue?: string | null, locale?: string) {
    const ru = ruValue?.trim();
    const en = enValue?.trim();
    if (locale === "en") {
      return en || ru || "";
    }
    return ru || en || "";
  }

  private buildUserName(firstName?: string | null, lastName?: string | null) {
    const name = [firstName?.trim(), lastName?.trim()].filter(Boolean).join(" ");
    return name || null;
  }

  private escapeCsvValue(value: string) {
    if (/[",\n]/.test(value)) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  }
}
