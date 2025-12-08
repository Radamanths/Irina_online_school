import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { getAppConfig } from "@virgo/config";
import type { AppConfig } from "@virgo/config";
import type {
  OrderStatus,
  PaymentProvider,
  PaymentStatus,
  Prisma,
  SubscriptionIntervalUnit,
  SubscriptionPlan
} from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { OrdersService } from "../orders/orders.service";
import type { CheckoutDto } from "./dto/checkout.dto";
import type { SupportedCurrency } from "../orders/dto/create-order.dto";
import type { SupportedLocale } from "../courses/courses.data";
import { createProviderSession, type ProviderSessionResult } from "./providers";
import type { RefundRequestDto } from "./dto/refund-request.dto";

export interface AdminPaymentRecord {
  id: string;
  student: string;
  cohort: string;
  amount: string;
  status: "paid" | "pending" | "failed";
  processedAt: string;
  method: string;
}

@Injectable()
export class PaymentsService {
  private readonly config: AppConfig = getAppConfig();
  private readonly logger = new Logger(PaymentsService.name);
  private readonly providerConfig = {
    frontendBaseUrl: this.config.frontendBaseUrl || "http://localhost:3000",
    yookassa: {
      shopId: process.env.YOO_KASSA_SHOP_ID,
      secretKey: process.env.YOO_KASSA_SECRET_KEY
    },
    cloudpayments: {
      publicId: process.env.CLOUDPAYMENTS_PUBLIC_ID,
      secretKey: process.env.CLOUDPAYMENTS_API_SECRET
    }
  } as const;
  private readonly stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  private readonly dunningConfig = {
    overdueDays: this.parsePositiveNumber(process.env.DUNNING_OVERDUE_DAYS, 3, 1, 30),
    reminderIntervalHours: this.parsePositiveNumber(process.env.DUNNING_REMINDER_INTERVAL_HOURS, 24, 1, 168),
    maxReminders: this.parsePositiveNumber(process.env.DUNNING_MAX_REMINDERS, 3, 1, 10),
    batchSize: this.parsePositiveNumber(process.env.DUNNING_BATCH_SIZE, 25, 1, 200)
  } as const;

  constructor(private readonly ordersService: OrdersService, private readonly prisma: PrismaService) {}

  async createCheckoutSession(dto: CheckoutDto) {
    const provider: PaymentProvider =
      dto.provider ?? (this.config.paymentsProvider as PaymentProvider) ?? "manual";
    const currency: SupportedCurrency = dto.currency ?? "USD";
    const locale: SupportedLocale = dto.locale === "en" ? "en" : "ru";

    const order = await this.ordersService.createOrder({
      userId: dto.userId,
      courseId: dto.courseId,
      currency,
      subscriptionPlanId: dto.subscriptionPlanId,
      metadata: { provider },
      provider
    });

    const providerSession = await this.initializeProviderSession(provider, order, locale);

    const paymentDelegate = (this.prisma as PrismaService & { payment?: Prisma.PaymentDelegate }).payment;

    const payment = paymentDelegate
      ? await paymentDelegate.create({
          data: {
            orderId: order.id,
            provider,
            status: "pending",
            amount: order.amount,
            currency: order.currency,
            providerRef: providerSession?.providerRef,
            webhookPayload: providerSession?.payload as Prisma.JsonObject | undefined
          }
        })
      : null;

    const checkoutBase = this.config.frontendBaseUrl || "http://localhost:3000";
    const searchParams = new URLSearchParams({ provider, locale });
    if (providerSession?.confirmationUrl && !providerSession.simulated) {
      searchParams.set("providerUrl", providerSession.confirmationUrl);
    }
    const url = `${checkoutBase}/checkout/${order.id}?${searchParams.toString()}`;

    return {
      url,
      order,
      paymentId: payment?.id ?? null,
      providerRef: providerSession?.providerRef ?? null,
      providerCheckoutUrl: providerSession?.confirmationUrl ?? null
    };
  }

  async createPaymentLinkForOrder(orderId: string, providerInput?: PaymentProvider, localeInput?: SupportedLocale) {
    const provider: PaymentProvider = providerInput ?? (this.config.paymentsProvider as PaymentProvider) ?? "manual";
    const locale: SupportedLocale = localeInput === "en" ? "en" : "ru";

    const order = await this.ordersService.getOrder(orderId);
    const providerSession = await this.initializeProviderSession(provider, order, locale);
    const paymentDelegate = (this.prisma as PrismaService & { payment?: Prisma.PaymentDelegate }).payment;

    const payment = paymentDelegate
      ? await paymentDelegate.create({
          data: {
            orderId: order.id,
            provider,
            status: "pending",
            amount: order.amount,
            currency: order.currency,
            providerRef: providerSession?.providerRef,
            webhookPayload: providerSession?.payload as Prisma.JsonObject | undefined
          }
        })
      : null;

    const url = providerSession?.confirmationUrl ?? this.buildCheckoutUrl(order.id, provider, locale);

    return {
      orderId: order.id,
      url,
      provider,
      locale,
      paymentId: payment?.id ?? null,
      providerRef: providerSession?.providerRef ?? null,
      simulated: providerSession?.simulated ?? true
    };
  }

  async getAdminPaymentFeed(limit = 25): Promise<AdminPaymentRecord[]> {
    const payments = await this.prisma.payment.findMany({
      take: limit,
      orderBy: [{ processedAt: "desc" }, { id: "desc" }],
      include: {
        order: {
          include: {
            user: true,
            enrollment: {
              include: { course: true }
            }
          }
        }
      }
    });

    return payments.map(payment => this.mapPaymentToAdminRecord(payment));
  }

  private mapPaymentToAdminRecord(
    payment: Prisma.PaymentGetPayload<{
      include: {
        order: {
          include: {
            user: true;
            enrollment: {
              include: {
                course: true;
              };
            };
          };
        };
      };
    }>
  ): AdminPaymentRecord {
    const user = payment.order?.user;
    const enrollment = payment.order?.enrollment;
    const course = enrollment?.course;

    const fullName = [user?.firstName, user?.lastName].filter(Boolean).join(" ").trim();
    const student = fullName || user?.email || "Студент";
    const cohortCode = this.normalizeCohortCode(course?.cohortCode) || course?.slug?.toUpperCase();
    const cohort = cohortCode || course?.titleRu || course?.titleEn || enrollment?.courseId || "—";
    const amountNumber = Number(payment.amount);
    const processedDate = payment.processedAt ?? payment.order?.updatedAt ?? new Date();

    return {
      id: payment.id,
      student,
      cohort,
      amount: this.formatAmount(amountNumber, payment.currency),
      status: this.mapPaymentStatus(payment.status),
      processedAt: this.formatTimestamp(processedDate),
      method: this.mapProvider(payment.provider)
    };
  }

  private formatAmount(amount: number, currency?: string): string {
    const resolvedCurrency = (currency || "USD").toUpperCase();
    const locale = resolvedCurrency === "RUB" ? "ru-RU" : resolvedCurrency === "KZT" ? "kk-KZ" : "en-US";
    const formatter = new Intl.NumberFormat(locale, {
      style: "currency",
      currency: resolvedCurrency,
      maximumFractionDigits: resolvedCurrency === "USD" ? 2 : 0
    });
    return formatter.format(amount);
  }

  private formatTimestamp(date: Date): string {
    return new Intl.DateTimeFormat("ru-RU", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit"
    }).format(date);
  }

  private buildCheckoutUrl(orderId: string, provider: PaymentProvider, locale: SupportedLocale): string {
    const checkoutBase = this.config.frontendBaseUrl || "http://localhost:3000";
    const params = new URLSearchParams({ provider, locale });
    return `${checkoutBase}/checkout/${orderId}?${params.toString()}`;
  }

  private mapProvider(provider: PaymentProvider): string {
    switch (provider) {
      case "stripe":
        return "Stripe";
      case "yookassa":
        return "YooKassa";
      case "cloudpayments":
        return "CloudPayments";
      case "manual":
      default:
        return "Manual";
    }
  }

  private mapPaymentStatus(status: PaymentStatus): AdminPaymentRecord["status"] {
    switch (status) {
      case "succeeded":
        return "paid";
      case "failed":
      case "refunded":
        return "failed";
      case "pending":
      default:
        return "pending";
    }
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

  private async initializeProviderSession(
    provider: PaymentProvider,
    order: Awaited<ReturnType<OrdersService["createOrder"]>>,
    locale: SupportedLocale
  ): Promise<ProviderSessionResult | null> {
    if (provider === "stripe" || provider === "manual") {
      return null;
    }

    try {
      return await createProviderSession(provider, order, locale, this.providerConfig);
    } catch (error) {
      this.logger.error(
        `Failed to initialize provider session for ${provider}`,
        error instanceof Error ? error.stack : error
      );
      return null;
    }
  }

  async processStripeWebhook(payload: unknown, signature?: string) {
    if (!this.isStripeEvent(payload)) {
      this.logger.warn("Received malformed Stripe webhook payload");
      return;
    }

    if (!this.stripeWebhookSecret) {
      this.logger.warn("STRIPE_WEBHOOK_SECRET is not configured; skipping signature verification");
    } else if (!signature) {
      this.logger.warn("Stripe webhook missing signature header");
    }

    const intent = this.extractStripeObject(payload);
    const orderId = this.resolveOrderId(intent?.metadata);
    if (!orderId) {
      this.logger.warn("Stripe webhook missing orderId metadata");
      return;
    }

    await this.upsertWebhookPayment({
      orderId,
      provider: "stripe",
      providerRef: intent?.id ?? payload.id,
      amount: this.normalizeStripeAmount(intent?.amount_received ?? intent?.amount),
      currency: intent?.currency?.toUpperCase(),
      status: this.mapStripeEventToStatus(payload.type, intent?.status),
      rawPayload: payload as Prisma.JsonObject
    });
  }

  async processYooKassaWebhook(payload: unknown) {
    if (!this.isYooKassaEvent(payload)) {
      this.logger.warn("Received malformed YooKassa webhook payload");
      return;
    }

    const orderId = this.resolveOrderId(payload.object?.metadata);
    if (!orderId) {
      this.logger.warn("YooKassa webhook missing orderId metadata");
      return;
    }

    const amount = payload.object?.amount?.value ? Number(payload.object.amount.value) : undefined;

    await this.upsertWebhookPayment({
      orderId,
      provider: "yookassa",
      providerRef: payload.object?.id,
      amount,
      currency: payload.object?.amount?.currency?.toUpperCase(),
      status: this.mapYooStatus(payload.object?.status),
      rawPayload: payload as Prisma.JsonObject
    });
  }

  async requestRefund(paymentId: string, dto: RefundRequestDto) {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      include: { order: true }
    });

    if (!payment) {
      throw new NotFoundException(`Payment ${paymentId} not found`);
    }

    const metadata = {
      ...(payment.webhookPayload as Prisma.JsonObject | null),
      manualRefund: {
        reason: dto.reason ?? null,
        requestedAt: new Date().toISOString()
      }
    } satisfies Prisma.JsonObject;

    const updated = await this.prisma.payment.update({
      where: { id: paymentId },
      data: {
        status: "refunded",
        webhookPayload: metadata,
        processedAt: new Date()
      }
    });

    await this.prisma.order.update({
      where: { id: payment.orderId },
      data: { status: "refunded" }
    });

    this.logger.log(`Manual refund requested for payment ${paymentId}`);

    return {
      id: updated.id,
      status: updated.status,
      orderId: payment.orderId,
      reason: dto.reason ?? null
    };
  }

  private async upsertWebhookPayment(args: {
    orderId: string;
    provider: PaymentProvider;
    providerRef?: string | null;
    amount?: number;
    currency?: string;
    status?: PaymentStatus;
    rawPayload?: Prisma.JsonObject;
  }) {
    const order = await this.prisma.order.findUnique({
      where: { id: args.orderId },
      include: {
        subscription: {
          include: {
            plan: true
          }
        }
      }
    });
    if (!order) {
      this.logger.warn(`Webhook referenced missing order ${args.orderId}`);
      return;
    }

    const existing = args.providerRef
      ? await this.prisma.payment.findFirst({
          where: { provider: args.provider, providerRef: args.providerRef }
        })
      : await this.prisma.payment.findFirst({
          where: { provider: args.provider, orderId: order.id },
          orderBy: { processedAt: "desc" }
        });

    const amount = typeof args.amount === "number" && !Number.isNaN(args.amount) && args.amount > 0
      ? args.amount
      : Number(order.amount);

    let paymentStatus: PaymentStatus | undefined = args.status;

    if (existing) {
      const nextPayload = (args.rawPayload ?? existing.webhookPayload ?? undefined) as
        | Prisma.NullableJsonNullValueInput
        | Prisma.InputJsonValue
        | undefined;

      await this.prisma.payment.update({
        where: { id: existing.id },
        data: {
          amount,
          currency: args.currency ?? existing.currency,
          status: args.status ?? existing.status,
          providerRef: args.providerRef ?? existing.providerRef,
          webhookPayload: nextPayload,
          processedAt: new Date()
        }
      });

      paymentStatus = args.status ?? existing.status;
    } else {
      await this.prisma.payment.create({
        data: {
          orderId: order.id,
          provider: args.provider,
          providerRef: args.providerRef ?? undefined,
          amount,
          currency: args.currency ?? order.currency,
          status: args.status ?? "pending",
          webhookPayload: args.rawPayload,
          processedAt: args.status === "succeeded" ? new Date() : undefined
        }
      });

      paymentStatus = args.status ?? "pending";
    }

    const nextStatus = args.status ? this.deriveOrderStatus(args.status) : null;
    if (nextStatus && order.status !== nextStatus) {
      await this.prisma.order.update({ where: { id: order.id }, data: { status: nextStatus } });
    }

    await this.syncSubscriptionWithPayment(order, paymentStatus);
  }

  private deriveOrderStatus(paymentStatus: PaymentStatus): OrderStatus | null {
    switch (paymentStatus) {
      case "succeeded":
        return "completed";
      case "failed":
        return "requires_action";
      case "refunded":
        return "refunded";
      default:
        return null;
    }
  }

  async processDunningReminders(dto: { limit?: number; dryRun?: boolean } = {}) {
    const now = new Date();
    const overdueCutoff = new Date(now.getTime() - this.dunningConfig.overdueDays * 24 * 60 * 60 * 1000);
    const limit = dto.limit && dto.limit > 0 ? Math.min(dto.limit, 200) : this.dunningConfig.batchSize;

    const orders = await this.prisma.order.findMany({
      where: {
        status: { in: ["pending", "requires_action"] },
        createdAt: { lte: overdueCutoff }
      },
      include: {
        user: { select: { email: true, firstName: true, lastName: true } }
      },
      orderBy: { createdAt: "asc" },
      take: limit
    });

    const reminderIntervalMs = this.dunningConfig.reminderIntervalHours * 60 * 60 * 1000;
    const sent: Array<{ orderId: string; reminderCount: number; lastReminderAt: string }> = [];
    let evaluated = 0;

    for (const order of orders) {
      evaluated += 1;
      const metadata = this.cloneOrderMetadata(order.metadata);
      const reminderState = this.extractReminderState(metadata);

      if (reminderState.count >= this.dunningConfig.maxReminders) {
        continue;
      }

      if (reminderState.lastSentAt) {
        const lastSent = new Date(reminderState.lastSentAt);
        if (now.getTime() - lastSent.getTime() < reminderIntervalMs) {
          continue;
        }
      }

      const nextCount = reminderState.count + 1;
      const nextReminder = {
        count: nextCount,
        lastSentAt: now.toISOString()
      };

      const dunningLog = Array.isArray(metadata.dunningLog)
        ? [...(metadata.dunningLog as unknown[])]
        : [];
      dunningLog.push({
        sentAt: now.toISOString(),
        mode: dto.dryRun ? "dry-run" : "auto",
        orderStatus: order.status,
        nextStep: nextCount >= this.dunningConfig.maxReminders ? "handoff" : "follow-up"
      });

      metadata.reminders = nextReminder;
      metadata.dunningLog = dunningLog.slice(-20);

      if (!dto.dryRun) {
        await this.prisma.order.update({
          where: { id: order.id },
          data: { metadata: metadata as Prisma.InputJsonValue }
        });
      }

      sent.push({
        orderId: order.id,
        reminderCount: nextCount,
        lastReminderAt: nextReminder.lastSentAt
      });

      this.logger.log(
        `Dunning reminder ${nextCount}/${this.dunningConfig.maxReminders} ${dto.dryRun ? "(dry-run) " : ""}for order ${order.id}`
      );
    }

    return {
      evaluated,
      remindersSent: sent.length,
      dryRun: Boolean(dto.dryRun),
      overdueDays: this.dunningConfig.overdueDays,
      reminderIntervalHours: this.dunningConfig.reminderIntervalHours,
      entries: sent
    };
  }

  private async syncSubscriptionWithPayment(
    order:
      | (Prisma.OrderGetPayload<{
          include: { subscription: { include: { plan: true } } };
        }> & { metadata?: Prisma.JsonValue | null })
      | null,
    paymentStatus?: PaymentStatus
  ) {
    if (!order || !order.subscriptionId || !paymentStatus || paymentStatus === "pending") {
      return;
    }

    const subscription = order.subscription;
    if (!subscription) {
      this.logger.warn(`Order ${order.id} references missing subscription ${order.subscriptionId}`);
      return;
    }

    switch (paymentStatus) {
      case "succeeded":
        await this.handleSubscriptionPaymentSucceeded(order, subscription);
        break;
      case "failed":
        await this.prisma.subscription.update({
          where: { id: subscription.id },
          data: {
            status: subscription.status === "trialing" ? "trialing" : "past_due",
            metadata: this.mergeSubscriptionMetadata(subscription.metadata, {
              lastFailureAt: new Date().toISOString(),
              lastOrderId: order.id,
              failureReason: "payment_failed"
            })
          }
        });
        break;
      case "refunded":
        await this.prisma.subscription.update({
          where: { id: subscription.id },
          data: {
            status: "canceled",
            canceledAt: new Date(),
            metadata: this.mergeSubscriptionMetadata(subscription.metadata, {
              canceledAt: new Date().toISOString(),
              cancelReason: "payment_refunded",
              lastOrderId: order.id
            })
          }
        });
        break;
      default:
        break;
    }
  }

  private async handleSubscriptionPaymentSucceeded(
    order: Prisma.OrderGetPayload<{ include: { subscription: { include: { plan: true } } } }>,
    subscription: Prisma.SubscriptionGetPayload<{ include: { plan: true } }>
  ) {
    const interval = this.resolveSubscriptionInterval(order.metadata, subscription.plan);
    if (!interval) {
      this.logger.warn(`Unable to resolve subscription interval for subscription ${subscription.id}`);
      return;
    }

    const now = new Date();
    const periodStart = this.computeNextPeriodStart(subscription, now);
    const periodEnd = this.addInterval(periodStart, interval.unit, interval.count);

    await this.prisma.subscription.update({
      where: { id: subscription.id },
      data: {
        status: "active",
        currentPeriodStart: periodStart,
        currentPeriodEnd: periodEnd,
        metadata: this.mergeSubscriptionMetadata(subscription.metadata, {
          lastPaymentAt: now.toISOString(),
          lastOrderId: order.id
        })
      }
    });
  }

  private computeNextPeriodStart(
    subscription: Prisma.SubscriptionGetPayload<{ include: { plan: true } }>,
    reference: Date
  ): Date {
    if (subscription.status === "trialing" && subscription.currentPeriodEnd && subscription.currentPeriodEnd > reference) {
      return subscription.currentPeriodEnd;
    }
    return reference;
  }

  private resolveSubscriptionInterval(
    metadata: Prisma.JsonValue | null | undefined,
    plan?: SubscriptionPlan | null
  ): { unit: SubscriptionIntervalUnit; count: number } | null {
    if (plan) {
      return { unit: plan.intervalUnit, count: plan.intervalCount };
    }

    if (!metadata || typeof metadata !== "object") {
      return null;
    }

    const record = metadata as Record<string, unknown>;
    const interval = record.subscriptionInterval as { unit?: string; count?: number } | undefined;
    if (!interval) {
      return null;
    }

    const unit = this.normalizeIntervalUnit(interval.unit);
    const count = typeof interval.count === "number" && interval.count > 0 ? interval.count : 1;
    return { unit, count };
  }

  private normalizeIntervalUnit(value?: string): SubscriptionIntervalUnit {
    if (value === "year") {
      return "year";
    }
    return "month";
  }

  private addInterval(start: Date, unit: SubscriptionIntervalUnit, count: number): Date {
    const next = new Date(start);
    if (unit === "year") {
      next.setFullYear(next.getFullYear() + count);
      return next;
    }
    next.setMonth(next.getMonth() + count);
    return next;
  }

  private mergeSubscriptionMetadata(existing: Prisma.JsonValue | null, patch: Record<string, unknown>) {
    const base = existing && typeof existing === "object" ? { ...(existing as Record<string, unknown>) } : {};
    return { ...base, ...patch } as Prisma.InputJsonValue;
  }

  private parsePositiveNumber(value: string | undefined, fallback: number, min = 1, max?: number): number {
    const parsed = value ? Number(value) : Number.NaN;
    if (!Number.isFinite(parsed) || parsed < min) {
      return fallback;
    }
    const clamped = max ? Math.min(parsed, max) : parsed;
    return Math.floor(clamped);
  }

  private cloneOrderMetadata(metadata: Prisma.JsonValue | null | undefined): Record<string, unknown> {
    if (metadata && typeof metadata === "object") {
      return { ...(metadata as Record<string, unknown>) };
    }
    return {};
  }

  private extractReminderState(metadata: Record<string, unknown>): { count: number; lastSentAt: string | null } {
    const reminders = metadata.reminders;
    if (reminders && typeof reminders === "object") {
      const reminderRecord = reminders as Record<string, unknown>;
      const count = typeof reminderRecord.count === "number" && reminderRecord.count > 0 ? reminderRecord.count : 0;
      const lastSentAt = typeof reminderRecord.lastSentAt === "string" ? reminderRecord.lastSentAt : null;
      return { count, lastSentAt };
    }
    return { count: 0, lastSentAt: null };
  }

  private isStripeEvent(payload: unknown): payload is { id: string; type?: string; data?: { object?: StripePaymentIntent } } {
    return typeof payload === "object" && payload !== null && "id" in payload;
  }

  private extractStripeObject(
    payload: { data?: { object?: StripePaymentIntent } }
  ): StripePaymentIntent | undefined {
    return payload.data?.object;
  }

  private mapStripeEventToStatus(eventType?: string, intentStatus?: string | null): PaymentStatus {
    switch (eventType) {
      case "payment_intent.succeeded":
      case "charge.succeeded":
        return "succeeded";
      case "payment_intent.payment_failed":
      case "charge.failed":
        return "failed";
      case "charge.refunded":
      case "refund.created":
        return "refunded";
      default:
        if (intentStatus === "succeeded") {
          return "succeeded";
        }
        if (intentStatus === "canceled") {
          return "failed";
        }
        if (intentStatus === "requires_payment_method" || intentStatus === "requires_action") {
          return "pending";
        }
        return "pending";
    }
  }

  private normalizeStripeAmount(value?: number | null): number | undefined {
    if (typeof value !== "number") {
      return undefined;
    }
    return value / 100;
  }

  private isYooKassaEvent(payload: unknown): payload is {
    event?: string;
    object?: {
      id?: string;
      status?: string;
      amount?: { value?: string; currency?: string };
      metadata?: Record<string, string | undefined>;
    };
  } {
    return typeof payload === "object" && payload !== null && "object" in payload;
  }

  private mapYooStatus(status?: string): PaymentStatus {
    switch (status) {
      case "succeeded":
        return "succeeded";
      case "canceled":
        return "failed";
      case "refunded":
        return "refunded";
      case "pending":
      case "waiting_for_capture":
      default:
        return "pending";
    }
  }

  private resolveOrderId(metadata?: Record<string, string | undefined> | null): string | undefined {
    if (!metadata) {
      return undefined;
    }
    return metadata.orderId || metadata.order_id || metadata["order-id"];
  }
}

type StripePaymentIntent = {
  id?: string;
  amount?: number;
  amount_received?: number;
  currency?: string;
  status?: string | null;
  metadata?: Record<string, string | undefined>;
};
