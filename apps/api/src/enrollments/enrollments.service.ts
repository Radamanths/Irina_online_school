import { BadRequestException, ForbiddenException, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { Enrollment, EnrollmentStatus, Module } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";

export interface EnrollmentAccessResult {
  allowed: boolean;
  enrollmentId?: string;
  status?: EnrollmentStatus;
  accessStart?: Date | null;
  accessEnd?: Date | null;
  courseId?: string;
  lessonId?: string;
  moduleId?: string;
  unlockAt?: Date | null;
  prerequisiteModuleId?: string | null;
  reason?: string;
}

@Injectable()
export class EnrollmentAccessService {
  private readonly logger = new Logger(EnrollmentAccessService.name);

  constructor(private readonly prisma: PrismaService) {}

  async checkCourseAccess(userId: string, courseId: string): Promise<EnrollmentAccessResult> {
    if (!userId || !courseId) {
      throw new BadRequestException("userId and courseId are required");
    }

    const enrollment = await this.prisma.enrollment.findUnique({
      where: { userId_courseId: { userId, courseId } }
    });

    if (!enrollment) {
      return { allowed: false, reason: "NOT_ENROLLED", courseId };
    }

    if (!this.isEnrollmentActive(enrollment)) {
      return {
        allowed: false,
        reason: "INACTIVE",
        enrollmentId: enrollment.id,
        status: enrollment.status,
        accessStart: enrollment.accessStart,
        accessEnd: enrollment.accessEnd,
        courseId
      };
    }

    return {
      allowed: true,
      enrollmentId: enrollment.id,
      status: enrollment.status,
      accessStart: enrollment.accessStart,
      accessEnd: enrollment.accessEnd,
      courseId
    };
  }

  async checkLessonAccess(userId: string, lessonId: string): Promise<EnrollmentAccessResult> {
    if (!userId || !lessonId) {
      throw new BadRequestException("userId and lessonId are required");
    }

    const lesson = await this.prisma.lesson.findUnique({
      where: { id: lessonId },
      include: { module: true }
    });

    if (!lesson) {
      throw new NotFoundException(`Lesson ${lessonId} not found`);
    }

    const moduleGatePayload = this.normalizeModuleGatePayload(lesson.module);
    const result = await this.checkCourseAccess(userId, moduleGatePayload.courseId);
    if (!result.allowed) {
      return { ...result, lessonId, courseId: moduleGatePayload.courseId };
    }

    const gate = await this.evaluateModuleGate(userId, moduleGatePayload, result.accessStart ?? null);

    if (!gate.allowed) {
      return {
        ...result,
        allowed: false,
        lessonId,
        courseId: moduleGatePayload.courseId,
        moduleId: moduleGatePayload.id,
        unlockAt: gate.unlockAt,
        prerequisiteModuleId: gate.prerequisiteModuleId,
        reason: gate.reason
      };
    }

    return {
      ...result,
      lessonId,
      courseId: moduleGatePayload.courseId,
      moduleId: moduleGatePayload.id
    };
  }

  async assertLessonAccess(userId: string, lessonId: string) {
    try {
      const result = await this.checkLessonAccess(userId, lessonId);
      if (!result.allowed) {
        throw new ForbiddenException(result.reason ?? "ACCESS_DENIED");
      }
      return result;
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof ForbiddenException || error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error(`Failed to assert lesson access`, error instanceof Error ? error.stack : error);
      throw new ForbiddenException("ACCESS_DENIED");
    }
  }

  async assertCourseAccess(userId: string, courseId: string) {
    try {
      const result = await this.checkCourseAccess(userId, courseId);
      if (!result.allowed) {
        throw new ForbiddenException(result.reason ?? "ACCESS_DENIED");
      }
      return result;
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof ForbiddenException || error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error(`Failed to assert course access`, error instanceof Error ? error.stack : error);
      throw new ForbiddenException("ACCESS_DENIED");
    }
  }

  private isEnrollmentActive(enrollment: Enrollment): boolean {
    const allowedStatuses: EnrollmentStatus[] = ["active", "completed"];
    if (!allowedStatuses.includes(enrollment.status)) {
      return false;
    }

    const now = new Date();
    if (enrollment.accessStart && enrollment.accessStart > now) {
      return false;
    }

    if (enrollment.accessEnd && enrollment.accessEnd < now) {
      return false;
    }

    return true;
  }

  private async evaluateModuleGate(
    userId: string,
    module: ModuleGatePayload,
    enrollmentStart: Date | null
  ): Promise<{ allowed: boolean; reason?: string; unlockAt?: Date | null; prerequisiteModuleId?: string | null }> {
    const unlockAt = this.resolveUnlockAt(module, enrollmentStart);
    if (unlockAt && unlockAt.getTime() > Date.now()) {
      return { allowed: false, reason: "DRIP_LOCKED", unlockAt, prerequisiteModuleId: module.prerequisiteModuleId ?? null };
    }

    if (module.prerequisiteModuleId) {
      const completed = await this.hasCompletedModule(userId, module.prerequisiteModuleId);
      if (!completed) {
        return {
          allowed: false,
          reason: "PREREQUISITE_PENDING",
          unlockAt,
          prerequisiteModuleId: module.prerequisiteModuleId
        };
      }
    }

    return { allowed: true, unlockAt: unlockAt ?? null, prerequisiteModuleId: module.prerequisiteModuleId ?? null };
  }

  private resolveUnlockAt(module: { dripUnlockAt?: Date | null; dripDelayDays?: number | null }, enrollmentStart: Date | null) {
    const absolute = module.dripUnlockAt ?? null;
    const relative = module.dripDelayDays && enrollmentStart ? this.addDays(enrollmentStart, module.dripDelayDays) : null;
    if (absolute && relative) {
      return new Date(Math.max(absolute.getTime(), relative.getTime()));
    }
    return absolute ?? relative ?? null;
  }

  private addDays(date: Date, days: number): Date {
    const next = new Date(date);
    next.setUTCDate(next.getUTCDate() + days);
    return next;
  }

  private async hasCompletedModule(userId: string, moduleId: string): Promise<boolean> {
    const [lessonCount, completedCount] = await Promise.all([
      this.prisma.lesson.count({ where: { moduleId } }),
      this.prisma.lessonProgress.count({
        where: {
          userId,
          status: "completed",
          lesson: { moduleId }
        }
      })
    ]);

    if (lessonCount === 0) {
      return true;
    }

    return completedCount >= lessonCount;
  }

  private normalizeModuleGatePayload(module: Module | null): ModuleGatePayload {
    if (!module) {
      throw new NotFoundException("Module not found for lesson");
    }

    const extended = module as Module & Partial<ModuleGatePayload>;
    return {
      id: extended.id,
      courseId: extended.courseId,
      dripUnlockAt: extended.dripUnlockAt ?? null,
      dripDelayDays: extended.dripDelayDays ?? null,
      prerequisiteModuleId: extended.prerequisiteModuleId ?? null
    };
  }
}

type ModuleGatePayload = {
  id: string;
  courseId: string;
  dripUnlockAt: Date | null;
  dripDelayDays: number | null;
  prerequisiteModuleId: string | null;
};
