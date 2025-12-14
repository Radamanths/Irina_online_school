import { BadRequestException, ForbiddenException, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import type {
  InvoiceStatus,
  Order,
  OrderType,
  Payment,
  PaymentProvider,
  Prisma,
  Subscription,
  SubscriptionStatus
} from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { CreateOrderDto, type SupportedCurrency } from "./dto/create-order.dto";
import type { ListOrdersDto } from "./dto/list-orders.dto";
import { OrderSelfServiceAction, OrderSelfServiceRequestDto } from "./dto/order-self-service.dto";

type SubscriptionPlanRecord = {
  id: string;
  isActive: boolean;
  courseId: string;
  currency: string;
  intervalUnit: string;
  intervalCount: number;
  amount: unknown;
  trialDays: number;
  cohortCode?: string | null;
};

type OrderWithRelations = Prisma.OrderGetPayload<{
  include: {
    payments: true;
    enrollment: { select: { courseId: true } };
    subscription: {
      include: {
        plan: true;
      };
    };
    invoice: true;
  };
}>;

export interface PaymentSummary {
  id: string;
  provider: Payment["provider"];
  status: Payment["status"];
  amount: number;
  currency: string;
  providerRef?: string | null;
  processedAt?: Date | null;
}

export interface OrderSummary {
  id: string;
  userId: string;
  type: Order["type"];
  status: Order["status"];
  amount: number;
  currency: string;
  courseId?: string | null;
  subscriptionId?: string | null;
  metadata?: Record<string, unknown> | null;
  subscription?: {
    id: string;
    status: SubscriptionStatus;
    cancelAtPeriodEnd: boolean;
    canceledAt?: Date | null;
    currentPeriodStart?: Date | null;
    currentPeriodEnd?: Date | null;
    planName?: string | null;
    intervalUnit?: SubscriptionPlanRecord["intervalUnit"];
    intervalCount?: number;
  } | null;
  payments: PaymentSummary[];
  invoice?: OrderInvoiceSummary | null;
  createdAt: Date;
  updatedAt: Date;
}

interface OrderInvoiceSummary {
  id: string;
  status: InvoiceStatus;
  downloadUrl?: string | null;
  notes?: string | null;
  requestedAt: Date;
}

interface SelfServiceLogEntry {
  id: string;
  action: OrderSelfServiceAction;
  channel: string;
  reason?: string | null;
  requestedAt: string;
  status: "submitted" | "scheduled" | "processed";
  effectiveAt?: string | null;
}

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(private readonly prisma: PrismaService) {}

  async createOrder(dto: CreateOrderDto): Promise<OrderSummary> {
    const { courseId, userId, subscriptionPlanId } = dto;
    let currency: SupportedCurrency = dto.currency ?? "USD";
    const type: OrderType = dto.type ?? "one_time";
    const planRequested = Boolean(subscriptionPlanId);

    const courseDelegate = (this.prisma as PrismaService & { course?: Prisma.CourseDelegate }).course;
    const userDelegate = (this.prisma as PrismaService & { user?: Prisma.UserDelegate }).user;
    const orderDelegate = this.getOrderDelegate();
    const enrollmentDelegate = (this.prisma as PrismaService & { enrollment?: Prisma.EnrollmentDelegate }).enrollment;
    const planDelegate = (this.prisma as PrismaService & {
      subscriptionPlan?: {
        findUnique: (args: unknown) => Promise<unknown>;
      };
    }).subscriptionPlan;

    if (!courseDelegate || !userDelegate) {
      throw new Error("Prisma delegates are not available. Run prisma generate.");
    }

    if (planRequested && !planDelegate) {
      throw new Error("Prisma subscription plan delegate is not available. Run prisma generate.");
    }

    const [course, user, plan] = await Promise.all([
      courseDelegate.findUnique({
        where: { id: courseId },
        select: {
          id: true,
          priceUsd: true,
          priceRub: true,
          priceKzt: true,
          cohortCode: true
        }
      }),
      userDelegate.findUnique({ where: { id: userId }, select: { id: true } }),
      subscriptionPlanId && planDelegate
        ? planDelegate.findUnique({ where: { id: subscriptionPlanId } })
        : Promise.resolve(null)
    ]);

    const planRecord = plan as SubscriptionPlanRecord | null;

    if (!user) {
      throw new NotFoundException(`User ${userId} not found`);
    }

    if (!course) {
      throw new NotFoundException(`Course ${courseId} not found`);
    }

    if (subscriptionPlanId && !planRecord) {
      throw new NotFoundException(`Subscription plan ${subscriptionPlanId} not found`);
    }

    const provider: PaymentProvider = dto.provider ?? "manual";
    const courseCohort = this.normalizeCohortCode(course.cohortCode);
    let planCohort: string | null = null;

    if (planRecord) {
      if (!planRecord.isActive) {
        throw new BadRequestException(`Subscription plan ${planRecord.id} is inactive`);
      }
      if (planRecord.courseId !== courseId) {
        throw new BadRequestException("Subscription plan does not belong to the selected course");
      }
      planCohort = this.normalizeCohortCode(planRecord.cohortCode);
      if (planCohort && courseCohort && planCohort !== courseCohort) {
        throw new BadRequestException("Subscription plan is assigned to a different cohort");
      }
      if (planCohort && !courseCohort) {
        this.logger.warn(`Course ${courseId} is missing cohortCode while plan ${planRecord.id} requires ${planCohort}`);
      }
      currency = this.normalizeCurrency(planRecord.currency);
    }

    const isSubscription = Boolean(planRecord);
    const orderType: OrderType = isSubscription ? "subscription" : type;

    const amountDecimal = isSubscription
      ? this.coerceAmount(planRecord?.amount)
      : this.resolvePrice(course, currency);
    if (!amountDecimal) {
      throw new BadRequestException(`Course ${courseId} has no price for currency ${currency}`);
    }

    const resolvedCohortCode = planCohort ?? courseCohort;
    const subscriptionDelegate = planRecord ? this.getSubscriptionDelegate() : null;
    let subscription: Subscription | null = null;

    try {
      const metadata: Record<string, unknown> = {
        ...(dto.metadata ?? {}),
        courseId
      };

      if (resolvedCohortCode) {
        metadata.cohortCode = resolvedCohortCode;
      }
      if (!metadata.provider) {
        metadata.provider = provider;
      }

      if (planRecord) {
        metadata.subscriptionPlanId = planRecord.id;
        metadata.subscriptionInterval = {
          unit: planRecord.intervalUnit,
          count: planRecord.intervalCount
        };
        metadata.trialDays = planRecord.trialDays;
      }

      if (planRecord && subscriptionDelegate) {
        subscription = await this.createSubscriptionDraft({
          subscriptionDelegate,
          plan: planRecord,
          provider,
          userId,
          cohortCode: resolvedCohortCode ?? null
        });
      }

      const order = await orderDelegate.create({
        data: {
          userId,
          currency,
          type: orderType,
          amount: amountDecimal,
          metadata: metadata as Prisma.InputJsonValue,
          subscriptionId: subscription?.id ?? null
        }
      });

      if (courseId && enrollmentDelegate) {
        await enrollmentDelegate.upsert({
          where: { userId_courseId: { userId, courseId } },
          update: { orderId: order.id },
          create: {
            userId,
            courseId,
            orderId: order.id,
            status: "paused"
          }
        });
      }

      return this.getOrder(order.id);
    } catch (error) {
      if (subscription && subscriptionDelegate) {
        try {
          await subscriptionDelegate.delete({ where: { id: subscription.id } });
        } catch (cleanupError) {
          this.logger.warn(
            `Failed to cleanup subscription ${subscription.id} after order error`,
            cleanupError instanceof Error ? cleanupError.stack : cleanupError
          );
        }
      }
      this.logger.error("Failed to create order", error instanceof Error ? error.stack : error);
      throw error;
    }
  }

  async getOrder(orderId: string): Promise<OrderSummary> {
    const order = await this.findOrderWithRelations(orderId);

    if (!order) {
      throw new NotFoundException(`Order ${orderId} not found`);
    }

    return this.mapOrder(order);
  }

  async listOrders(filters: ListOrdersDto = {}): Promise<{ data: OrderSummary[]; nextCursor?: string }> {
    const orderDelegate = this.getOrderDelegate();

    const take = Math.min(filters.take ?? 20, 100);
    const where: Prisma.OrderWhereInput = {
      userId: filters.userId,
      status: filters.status
    };

    const orders = await orderDelegate.findMany({
      where,
      take: take + 1,
      ...(filters.cursor ? { cursor: { id: filters.cursor }, skip: 1 } : {}),
      orderBy: { createdAt: "desc" },
      include: {
        payments: true,
        enrollment: { select: { courseId: true } },
        subscription: { include: { plan: true } },
        invoice: true
      }
    });

    const hasNext = orders.length > take;
    const trimmed = hasNext ? orders.slice(0, take) : orders;

    return {
      data: trimmed.map(order => this.mapOrder(order)),
      nextCursor: hasNext ? trimmed[trimmed.length - 1]?.id : undefined
    };
  }

  async requestSelfServiceAction(orderId: string, dto: OrderSelfServiceRequestDto): Promise<OrderSummary> {
    const order = await this.findOrderWithRelations(orderId);
    if (!order) {
      throw new NotFoundException(`Order ${orderId} not found`);
    }

    if (order.userId !== dto.userId) {
      throw new ForbiddenException("You cannot modify another student's order");
    }

    switch (dto.action) {
      case OrderSelfServiceAction.Cancel:
        return this.handleSelfServiceCancellation(order, dto);
      case OrderSelfServiceAction.Refund:
        return this.handleSelfServiceRefund(order, dto);
      default:
        throw new BadRequestException("Unsupported self-service action");
    }
  }

  private async handleSelfServiceCancellation(order: OrderWithRelations, dto: OrderSelfServiceRequestDto): Promise<OrderSummary> {
    const subscription = order.subscriptionId ? order.subscription ?? null : null;
    const channel = dto.channel ?? "dashboard";
    const baseEntry = this.createSelfServiceEntry(OrderSelfServiceAction.Cancel, channel, dto.reason);

    if (subscription && subscription.cancelAtPeriodEnd) {
      return this.getOrder(order.id);
    }

    if (subscription) {
      const effectiveDate = subscription.currentPeriodEnd ?? new Date();
      const subscriptionEntry: SelfServiceLogEntry = {
        ...baseEntry,
        status: subscription.status === "canceled" ? "processed" : "scheduled",
        effectiveAt: effectiveDate.toISOString()
      };

      await this.prisma.subscription.update({
        where: { id: subscription.id },
        data: {
          cancelAtPeriodEnd: true,
          metadata: this.writeSelfServiceMetadata(subscription.metadata ?? null, subscriptionEntry)
        }
      });

      await this.prisma.order.update({
        where: { id: order.id },
        data: {
          metadata: this.writeSelfServiceMetadata(order.metadata ?? null, subscriptionEntry)
        }
      });

      this.logger.log(`Self-service subscription cancellation scheduled for order ${order.id}`);
      return this.getOrder(order.id);
    }

    if (order.status === "completed") {
      throw new BadRequestException("Order is already paid. Request a refund instead.");
    }

    if (order.status === "canceled") {
      return this.getOrder(order.id);
    }

    const processedEntry: SelfServiceLogEntry = {
      ...baseEntry,
      status: "processed",
      effectiveAt: baseEntry.requestedAt
    };

    await this.prisma.order.update({
      where: { id: order.id },
      data: {
        status: "canceled",
        metadata: this.writeSelfServiceMetadata(order.metadata ?? null, processedEntry)
      }
    });

    this.logger.log(`Self-service order cancellation processed for order ${order.id}`);
    return this.getOrder(order.id);
  }

  private async handleSelfServiceRefund(order: OrderWithRelations, dto: OrderSelfServiceRequestDto): Promise<OrderSummary> {
    if (order.status === "refunded") {
      return this.getOrder(order.id);
    }

    const payment = await this.prisma.payment.findFirst({
      where: { orderId: order.id, status: "succeeded" },
      orderBy: [{ processedAt: "desc" }, { id: "desc" }]
    });

    if (!payment) {
      throw new BadRequestException("There are no settled payments to refund for this order.");
    }

    const channel = dto.channel ?? "dashboard";
    const processedAt = new Date();
    const paymentMetadata = (payment.webhookPayload ?? {}) as Prisma.JsonObject;
    paymentMetadata.manualRefund = {
      reason: dto.reason ?? null,
      requestedAt: processedAt.toISOString(),
      channel
    };

    await this.prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: "refunded",
        processedAt,
        webhookPayload: paymentMetadata
      }
    });

    const entry: SelfServiceLogEntry = {
      ...this.createSelfServiceEntry(OrderSelfServiceAction.Refund, channel, dto.reason),
      status: "processed",
      effectiveAt: processedAt.toISOString()
    };

    await this.prisma.order.update({
      where: { id: order.id },
      data: {
        status: "refunded",
        metadata: this.writeSelfServiceMetadata(order.metadata ?? null, entry)
      }
    });

    if (order.subscriptionId) {
      await this.prisma.subscription.update({
        where: { id: order.subscriptionId },
        data: {
          status: "canceled",
          cancelAtPeriodEnd: true,
          canceledAt: processedAt,
          metadata: this.writeSelfServiceMetadata(order.subscription?.metadata ?? null, entry)
        }
      });
    }

    this.logger.log(`Self-service refund processed for order ${order.id} (payment ${payment.id})`);
    return this.getOrder(order.id);
  }

  private createSelfServiceEntry(
    action: OrderSelfServiceAction,
    channel: string,
    reason?: string
  ): SelfServiceLogEntry {
    return {
      id: randomUUID(),
      action,
      channel,
      reason: reason ?? null,
      requestedAt: new Date().toISOString(),
      status: "submitted"
    };
  }

  private writeSelfServiceMetadata(
    source: Prisma.JsonValue | null,
    entry: SelfServiceLogEntry
  ): Prisma.InputJsonValue {
    const snapshot = this.normalizeMetadata(source);
    const history = Array.isArray(snapshot.selfServiceLog)
      ? ([...(snapshot.selfServiceLog as SelfServiceLogEntry[])] as SelfServiceLogEntry[])
      : [];
    history.push(entry);
    snapshot.selfServiceLog = history.slice(-20);
    return snapshot as Prisma.InputJsonValue;
  }

  private normalizeMetadata(source: Prisma.JsonValue | null): Record<string, unknown> {
    if (source && typeof source === "object" && !Array.isArray(source)) {
      return { ...(source as Record<string, unknown>) };
    }
    return {};
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

  private async createSubscriptionDraft(params: {
    subscriptionDelegate: Prisma.SubscriptionDelegate;
    plan: SubscriptionPlanRecord;
    userId: string;
    provider: PaymentProvider;
    cohortCode?: string | null;
  }): Promise<Subscription> {
    const now = new Date();
    let status: SubscriptionStatus = "incomplete";
    let currentPeriodStart: Date | null = null;
    let currentPeriodEnd: Date | null = null;

    if (params.plan.trialDays > 0) {
      status = "trialing";
      currentPeriodStart = now;
      currentPeriodEnd = this.addDays(now, params.plan.trialDays);
    }

    return params.subscriptionDelegate.create({
      data: {
        userId: params.userId,
        planId: params.plan.id,
        provider: params.provider,
        status,
        currentPeriodStart,
        currentPeriodEnd,
        metadata: {
          cohortCode: params.cohortCode ?? null,
          interval: {
            unit: params.plan.intervalUnit,
            count: params.plan.intervalCount
          }
        } as Prisma.InputJsonValue
      }
    });
  }

  private addDays(date: Date, days: number): Date {
    const copy = new Date(date);
    copy.setDate(copy.getDate() + days);
    return copy;
  }

  private normalizeCohortCode(value?: string | null): string | null {
    if (!value) {
      return null;
    }
    const trimmed = value.trim();
    if (!trimmed) {
      return null;
    }
    return trimmed
      .toUpperCase()
      .replace(/[^A-Z0-9-]+/g, "-")
      .replace(/-{2,}/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  private getSubscriptionDelegate() {
    const delegate = (this.prisma as PrismaService & { subscription?: Prisma.SubscriptionDelegate }).subscription;
    if (!delegate) {
      throw new Error("Prisma subscription delegate is not available. Run prisma generate.");
    }
    return delegate;
  }

  private normalizeCurrency(value?: string | null): SupportedCurrency {
    const upper = (value ?? "USD").toUpperCase();
    const supported: SupportedCurrency[] = ["USD", "RUB", "KZT"];
    if (supported.includes(upper as SupportedCurrency)) {
      return upper as SupportedCurrency;
    }
    throw new BadRequestException(`Unsupported currency ${value ?? ""} for subscription plan`);
  }

  private resolvePrice(
    course: { priceUsd: Prisma.Decimal | null; priceRub: Prisma.Decimal | null; priceKzt: Prisma.Decimal | null },
    currency: SupportedCurrency
  ): Prisma.Decimal | null {
    switch (currency) {
      case "USD":
        return course.priceUsd;
      case "RUB":
        return course.priceRub;
      case "KZT":
        return course.priceKzt;
      default:
        return null;
    }
  }

  private mapOrder(
    order: OrderWithRelations
  ): OrderSummary {
    return {
      id: order.id,
      userId: order.userId,
      type: order.type,
      status: order.status,
      amount: Number(order.amount),
      currency: order.currency,
      metadata: (order.metadata as Record<string, unknown>) ?? null,
      courseId: order.enrollment?.courseId ?? null,
      subscriptionId: order.subscriptionId ?? null,
      subscription: order.subscription
        ? {
            id: order.subscription.id,
            status: order.subscription.status,
            cancelAtPeriodEnd: order.subscription.cancelAtPeriodEnd,
            canceledAt: order.subscription.canceledAt,
            currentPeriodStart: order.subscription.currentPeriodStart,
            currentPeriodEnd: order.subscription.currentPeriodEnd,
            planName: order.subscription.plan?.name ?? null,
            intervalUnit: order.subscription.plan?.intervalUnit ?? null,
            intervalCount: order.subscription.plan?.intervalCount ?? null
          }
        : null,
      payments: order.payments.map(payment => ({
        id: payment.id,
        provider: payment.provider,
        status: payment.status,
        amount: Number(payment.amount),
        currency: payment.currency,
        providerRef: payment.providerRef,
        processedAt: payment.processedAt
      })),
      invoice: order.invoice
        ? {
            id: order.invoice.id,
            status: order.invoice.status,
            downloadUrl: order.invoice.downloadUrl ?? null,
            notes: order.invoice.notes ?? null,
            requestedAt: order.invoice.createdAt
          }
        : null,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt
    };
  }

  private async findOrderWithRelations(orderId: string): Promise<OrderWithRelations | null> {
    const orderDelegate = this.getOrderDelegate();
    return orderDelegate.findUnique({
      where: { id: orderId },
      include: {
        payments: true,
        enrollment: { select: { courseId: true } },
        subscription: { include: { plan: true } },
        invoice: true
      }
    });
  }

  private getOrderDelegate() {
    const orderDelegate = (this.prisma as PrismaService & { order?: Prisma.OrderDelegate }).order;
    if (!orderDelegate) {
      throw new Error("Prisma order delegate is not available. Run prisma generate.");
    }
    return orderDelegate;
  }
}
