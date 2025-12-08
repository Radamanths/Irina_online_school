import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import type { CreatePlanDto } from "./dto/create-plan.dto";
import type { UpdatePlanDto } from "./dto/update-plan.dto";

export interface SubscriptionPlanResponse {
  id: string;
  courseId: string;
  name: string;
  description: string | null;
  currency: string;
  amount: number;
  intervalUnit: "month" | "year";
  intervalCount: number;
  trialDays: number;
  setupFee: number | null;
  isActive: boolean;
  cohortCode?: string | null;
  stripePriceId?: string | null;
  yookassaPlanId?: string | null;
  cloudpaymentsPlanId?: string | null;
  metadata?: unknown;
}

type SubscriptionPlanRow = {
  id: string;
  courseId: string;
  name: string;
  description: string | null;
  currency: string;
  amount: unknown;
  intervalUnit: "month" | "year";
  intervalCount: number;
  trialDays: number;
  setupFee: unknown;
  isActive: boolean;
  cohortCode?: string | null;
  stripePriceId?: string | null;
  yookassaPlanId?: string | null;
  cloudpaymentsPlanId?: string | null;
  metadata?: unknown;
};

type PlanMutationPayload = {
  courseId?: string;
  name?: string;
  description?: string | null;
  currency?: string;
  cohortCode?: string | null;
  amount?: number;
  intervalUnit?: "month" | "year";
  intervalCount?: number;
  trialDays?: number;
  setupFee?: number | null;
  stripePriceId?: string | null;
  yookassaPlanId?: string | null;
  cloudpaymentsPlanId?: string | null;
  metadata?: unknown;
  isActive?: boolean;
};

@Injectable()
export class SubscriptionsService {
  constructor(private readonly prisma: PrismaService) {}

  async listPlans(
    params: { courseId?: string; cohortCode?: string; activeOnly?: boolean } = {}
  ): Promise<SubscriptionPlanResponse[]> {
    const planDelegate = this.getPlanDelegate();

    const where: Record<string, unknown> = {};
    if (params.courseId) {
      where.courseId = params.courseId;
    }
    if (params.cohortCode) {
      where.cohortCode = params.cohortCode.toUpperCase();
    }
    if (params.activeOnly ?? true) {
      where.isActive = true;
    }

    const plans = await planDelegate.findMany({
      where,
      orderBy: [{ amount: "asc" }, { createdAt: "asc" }]
    });

    return plans.map(plan => this.mapPlan(plan));
  }

  async createPlan(dto: CreatePlanDto): Promise<SubscriptionPlanResponse> {
    const planDelegate = this.getPlanDelegate();
    const courseDelegate = this.getCourseDelegate();

    const course = await this.getCourseSnapshot(courseDelegate, dto.courseId);
    const resolvedCohort = this.resolvePlanCohort(dto.cohortCode, course.cohortCode);

    const plan = await planDelegate.create({
      data: {
        courseId: dto.courseId,
        name: dto.name,
        description: dto.description ?? null,
        currency: this.normalizeCurrency(dto.currency),
        cohortCode: resolvedCohort,
        amount: dto.amount,
        intervalUnit: dto.intervalUnit ?? "month",
        intervalCount: dto.intervalCount ?? 1,
        trialDays: dto.trialDays ?? 0,
        setupFee: dto.setupFee ?? null,
        stripePriceId: dto.stripePriceId ?? null,
        yookassaPlanId: dto.yookassaPlanId ?? null,
        cloudpaymentsPlanId: dto.cloudpaymentsPlanId ?? null,
        metadata: dto.metadata === undefined ? undefined : dto.metadata,
        isActive: dto.isActive ?? true
      }
    });

    return this.mapPlan(plan);
  }

  async updatePlan(id: string, dto: UpdatePlanDto & PlanMutationPayload): Promise<SubscriptionPlanResponse> {
    const planDelegate = this.getPlanDelegate();
    const courseDelegate = this.getCourseDelegate();

    const existing = await planDelegate.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Subscription plan ${id} not found`);
    }

    const courseIdChanged = Boolean(dto.courseId && dto.courseId !== existing.courseId);
    const needsCourseSnapshot = courseIdChanged || dto.cohortCode !== undefined;
    const courseSnapshot: { id: string; cohortCode: string | null } | null = needsCourseSnapshot
      ? await this.getCourseSnapshot(courseDelegate, dto.courseId ?? existing.courseId)
      : null;

    const data: Record<string, unknown> = {};
    if (dto.courseId) data.courseId = dto.courseId;
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.currency) data.currency = this.normalizeCurrency(dto.currency);
    if (dto.cohortCode !== undefined) {
      data.cohortCode = this.resolvePlanCohort(dto.cohortCode, courseSnapshot?.cohortCode ?? null);
    } else if (courseIdChanged && courseSnapshot) {
      data.cohortCode = this.resolvePlanCohort(existing.cohortCode ?? null, courseSnapshot.cohortCode);
    }
    if (dto.amount !== undefined) data.amount = dto.amount;
    if (dto.intervalUnit) data.intervalUnit = dto.intervalUnit;
    if (dto.intervalCount !== undefined) data.intervalCount = dto.intervalCount;
    if (dto.trialDays !== undefined) data.trialDays = dto.trialDays;
    if (dto.setupFee !== undefined) data.setupFee = dto.setupFee;
    if (dto.stripePriceId !== undefined) data.stripePriceId = dto.stripePriceId;
    if (dto.yookassaPlanId !== undefined) data.yookassaPlanId = dto.yookassaPlanId;
    if (dto.cloudpaymentsPlanId !== undefined) data.cloudpaymentsPlanId = dto.cloudpaymentsPlanId;
    if (dto.metadata !== undefined) data.metadata = dto.metadata;
    if (dto.isActive !== undefined) data.isActive = dto.isActive;

    if (Object.keys(data).length === 0) {
      return this.mapPlan(existing);
    }

    const plan = await planDelegate.update({ where: { id }, data });
    return this.mapPlan(plan);
  }

  private mapPlan(plan: SubscriptionPlanRow): SubscriptionPlanResponse {
    return {
      id: plan.id,
      courseId: plan.courseId,
      name: plan.name,
      description: plan.description ?? null,
      currency: plan.currency,
      amount: this.coerceAmount(plan.amount),
      intervalUnit: plan.intervalUnit,
      intervalCount: plan.intervalCount,
      trialDays: plan.trialDays,
      setupFee:
        plan.setupFee === null || plan.setupFee === undefined ? null : this.coerceAmount(plan.setupFee),
      isActive: plan.isActive,
      cohortCode: plan.cohortCode ?? null,
      stripePriceId: plan.stripePriceId ?? null,
      yookassaPlanId: plan.yookassaPlanId ?? null,
      cloudpaymentsPlanId: plan.cloudpaymentsPlanId ?? null,
      metadata: plan.metadata ?? null
    };
  }

  private coerceAmount(value: unknown): number {
    if (typeof value === "number") {
      return value;
    }

    if (typeof value === "string") {
      const parsed = Number(value);
      if (!Number.isNaN(parsed)) {
        return parsed;
      }
    }

    if (value && typeof value === "object") {
      const candidate = value as { toNumber?: () => number; toString?: () => string };
      if (typeof candidate.toNumber === "function") {
        return candidate.toNumber();
      }
      if (typeof candidate.toString === "function") {
        const parsed = Number(candidate.toString());
        if (!Number.isNaN(parsed)) {
          return parsed;
        }
      }
    }

    throw new BadRequestException("Subscription plan amount is invalid");
  }

  private normalizeCurrency(value?: string | null): string {
    if (!value) {
      return "USD";
    }
    return value.toUpperCase();
  }

  private normalizeCohortCode(value?: string | null): string | null {
    if (!value) {
      return null;
    }
    const trimmed = value.trim();
    return trimmed ? trimmed.toUpperCase() : null;
  }

  private resolvePlanCohort(input?: string | null, courseCohort?: string | null): string | null {
    const normalizedInput = this.normalizeCohortCode(input);
    const normalizedCourse = this.normalizeCohortCode(courseCohort);
    if (normalizedInput && normalizedCourse && normalizedInput !== normalizedCourse) {
      throw new BadRequestException("Cohort code does not match the course cohort");
    }
    return normalizedInput ?? normalizedCourse ?? null;
  }

  private async getCourseSnapshot(
    courseDelegate: {
      findUnique: (args: Record<string, unknown>) => Promise<{ id: string; cohortCode: string | null } | null>;
    },
    courseId: string
  ): Promise<{ id: string; cohortCode: string | null }> {
    const course = await courseDelegate.findUnique({
      where: { id: courseId },
      select: { id: true, cohortCode: true }
    });

    if (!course) {
      throw new NotFoundException(`Course ${courseId} not found`);
    }

    return course;
  }

  private getPlanDelegate() {
    const delegate = (this.prisma as PrismaService & {
      subscriptionPlan?: {
        findMany: (args: Record<string, unknown>) => Promise<SubscriptionPlanRow[]>;
        findUnique: (args: Record<string, unknown>) => Promise<SubscriptionPlanRow | null>;
        create: (args: Record<string, unknown>) => Promise<SubscriptionPlanRow>;
        update: (args: Record<string, unknown>) => Promise<SubscriptionPlanRow>;
      };
    }).subscriptionPlan;

    if (!delegate) {
      throw new Error("Prisma subscription plan delegate is not available. Run prisma generate.");
    }

    return delegate;
  }

  private getCourseDelegate() {
    const delegate = (this.prisma as PrismaService & {
      course?: {
        findUnique: (args: Record<string, unknown>) => Promise<{ id: string; cohortCode: string | null } | null>;
      };
    }).course;

    if (!delegate) {
      throw new Error("Prisma course delegate is not available. Run prisma generate.");
    }

    return delegate;
  }
}
