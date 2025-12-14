import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomUUID } from "node:crypto";
import { BadRequestException, Injectable, NotFoundException, OnModuleInit } from "@nestjs/common";
import {
  CourseStatus,
  EnrollmentSource,
  EnrollmentStatus,
  InvoiceStatus,
  OrderStatus,
  OrderType,
  PaymentStatus,
  Prisma,
  PaymentProvider
} from "@prisma/client";
import type {
  BillingProfile,
  MediaAsset as PrismaMediaAsset,
  OrderInvoice,
  Payment,
  Quiz
} from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { SaveCourseDraftDto } from "./dto/save-course-draft.dto";
import { UpsertLessonDto } from "./dto/upsert-lesson.dto";
import { UpsertQuizSettingsDto } from "./dto/upsert-quiz-settings.dto";
import { CreatePaymentLinkDto } from "./dto/create-payment-link.dto";
import { RefundOrderDto } from "./dto/refund-order.dto";
import type { SupportedLocale } from "../courses/courses.data";
import { PaymentsService } from "../payments/payments.service";
import { ProgressWebhookService, type LessonCompletionWebhookPayload } from "../progress/progress-webhook.service";
import { RequestMediaUploadDto } from "./dto/request-media-upload.dto";
import { UpdateSeoSettingsDto } from "./dto/update-seo-settings.dto";
import { CreateManualEnrollmentDto } from "./dto/create-manual-enrollment.dto";
import { UpdateEnrollmentDto } from "./dto/update-enrollment.dto";
import { UpdateProgressAutomationSettingsDto } from "./dto/update-progress-automation-settings.dto";
import { RunDunningDto } from "./dto/run-dunning.dto";
import { UpdateInvoiceDto } from "./dto/update-invoice.dto";
import { PROGRESS_AUTOMATION_SETTINGS_KEY, SEO_SETTINGS_KEY } from "./constants";

export interface AdminStudentProfile {
  id: string;
  name: string;
  cohort: string;
  course: string;
  progress: number;
  paymentStatus: "paid" | "trial" | "overdue";
  lastActivity: string;
}

export interface AdminDashboardStat {
  id: string;
  label: string;
  value: string;
  trend: string;
}

export interface AdminUserRecord {
  id: string;
  email: string;
  name: string;
  roles: string[];
  roleCodes: string[];
  locale: string;
  timezone: string;
  createdAt: string;
  lastActiveAt: string;
}

export interface AdminRoleOption {
  code: string;
  name: string;
}

export interface AdminCourseSummary {
  id: string;
  title: string;
  mentor: string;
  cohort: string;
  students: number;
  status: "running" | "enrollment" | "maintenance" | "archived";
  updatedAt: string;
}

export type AdminModuleStage = "draft" | "review" | "published";

export interface AdminCourseModuleOutline {
  id: string;
  title: string;
  lessons: number;
  owner: string;
  stage: AdminModuleStage;
  summary?: string;
}

export interface AdminCourseDetail extends AdminCourseSummary {
  titleRu: string;
  titleEn: string;
  description: string;
  descriptionRu: string;
  descriptionEn: string;
  language: "RU" | "EN";
  timezone: string;
  format: string;
  startDate: string;
  endDate: string;
  capacity: string;
  seoTitle: string;
  seoDescription: string;
  seoKeywords: string;
  seoImage: string;
  modules: AdminCourseModuleOutline[];
}

export interface AdminCohortSummary {
  id: string;
  label: string;
  course: string;
  stage: "running" | "enrollment" | "wrap-up";
  capacity: string;
  startDate: string;
  endDate: string;
  timezone: string;
}

export interface AdminModuleDirectoryRecord {
  id: string;
  moduleTitle: string;
  courseId: string;
  courseTitle: string;
  stage: AdminModuleStage;
  owner: string;
  lessons: number;
  updatedAt: string;
  language: "RU" | "EN";
}

export interface AdminLessonDetail {
  id: string;
  moduleId: string;
  orderIndex: number;
  titleRu: string;
  titleEn: string;
  bodyRu?: string | null;
  bodyEn?: string | null;
  durationMinutes?: number | null;
  videoProvider?: string | null;
  videoRef?: string | null;
  attachments?: Prisma.JsonValue | null;
  quizId?: string | null;
  quiz?: AdminLessonQuizSettings | null;
}

export interface AdminLessonQuizSettings {
  id: string | null;
  passScore: number;
  attemptsLimit: number | null;
  timeLimitSeconds: number | null;
}

export interface AdminOrderRecord {
  id: string;
  student: string;
  cohort: string;
  amount: string;
  currency: string;
  status: OrderStatus;
  paymentStatus: "paid" | "pending" | "failed";
  method: string;
  createdAt: string;
  createdAtIso: string;
  updatedAt: string;
  updatedAtIso: string;
}

interface AdminOrdersFeedParams {
  limit?: number;
  offset?: number;
  status?: string;
  paymentStatus?: string;
  method?: string;
  search?: string;
  currency?: string;
  courseId?: string;
  courseSlug?: string;
  cohortCode?: string;
  createdFrom?: string;
  createdTo?: string;
}

export interface AdminOrdersFeedResult {
  items: AdminOrderRecord[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
  facets: AdminOrdersFeedFacets;
}

interface AdminOrdersFeedFacets {
  methods: string[];
  currencies: string[];
  cohorts: string[];
}

export interface AdminOrderPaymentAttempt {
  id: string;
  provider: string;
  status: "paid" | "pending" | "failed";
  amount: string;
  processedAt: string;
  reference?: string;
}

export type AdminTimelineTone = "info" | "success" | "warning" | "danger" | "muted";

export interface AdminOrderTimelineEvent {
  id: string;
  label: string;
  description: string;
  timestamp: string;
  tone: AdminTimelineTone;
}

export interface AdminBillingProfileSummary {
  fullName: string;
  email: string;
  companyName?: string | null;
  taxId?: string | null;
  address?: string | null;
  phone?: string | null;
  updatedAt: string | null;
}

export interface AdminInvoiceSummary {
  id: string;
  status: InvoiceStatus;
  downloadUrl?: string | null;
  notes?: string | null;
  requestedAt: string;
  profileSnapshot?: Record<string, unknown> | null;
}

export interface AdminLastPaymentLink {
  id: string;
  url: string;
  provider: PaymentProvider;
  locale: SupportedLocale;
  createdAt: string;
  createdAtIso: string;
  paymentId: string | null;
  providerRef: string | null;
  simulated: boolean;
}

export type AdminPaymentLinkEntry = AdminLastPaymentLink;

export interface AdminOrderDetail extends AdminOrderRecord {
  type: OrderType;
  currency: string;
  studentEmail: string;
  studentId: string;
  courseId: string | null;
  courseTitle: string;
  enrollmentId: string | null;
  metadata: Record<string, unknown> | null;
  lastPaymentLink: AdminLastPaymentLink | null;
  paymentLinkHistory: AdminPaymentLinkEntry[];
  paymentAttempts: AdminOrderPaymentAttempt[];
  refundReason: string | null;
  refundProcessedAt: string | null;
  createdAtFull: string;
  updatedAtFull: string;
  reminderCount: number;
  lastReminderAt: string | null;
  timeline: AdminOrderTimelineEvent[];
  billingProfile: AdminBillingProfileSummary | null;
  invoice: AdminInvoiceSummary | null;
}

export interface AdminOrderReminderResponse {
  orderId: string;
  reminderCount: number;
  lastReminderAt: string;
}

export interface AdminOrderRefundResponse {
  orderId: string;
  refundedAt: string;
  paymentIds: string[];
  reason?: string | null;
}

export interface AdminPaymentLinkResponse extends AdminPaymentLinkEntry {
  orderId: string;
}

export interface AdminMediaAsset {
  id: string;
  label: string;
  type: string;
  mimeType?: string | null;
  size: string;
  sizeBytes?: number | null;
  storageKey: string;
  url: string;
  createdAt: string;
}

export interface AdminMediaUploadTicket {
  assetId: string;
  storageKey: string;
  uploadUrl: string;
  previewUrl: string;
  expiresAt: string;
  headers: Record<string, string>;
}

export interface AdminSeoLocaleFields {
  title: string;
  description: string;
  keywords: string;
}

export interface AdminSeoPageConfig {
  id: string;
  label: string;
  slug: string;
  image: string;
  locales: Record<"ru" | "en", AdminSeoLocaleFields>;
}

export interface AdminSeoSettings {
  updatedAt: string;
  pages: AdminSeoPageConfig[];
}

export interface AdminProgressAutomationSettings {
  webhookUrl: string | null;
  enabled: boolean;
  updatedAt: string;
  activeUrl: string | null;
  activeSource: "env" | "settings" | "disabled";
}

export interface AdminProgressAutomationTestResult {
  delivered: boolean;
  targetUrl: string | null;
  payload: LessonCompletionWebhookPayload;
}

export interface AdminDunningRunEntry {
  orderId: string;
  reminderCount: number;
  lastReminderAt: string;
  lastReminderAtIso: string;
}

export interface AdminDunningRunResult {
  evaluated: number;
  remindersSent: number;
  dryRun: boolean;
  overdueDays: number;
  reminderIntervalHours: number;
  entries: AdminDunningRunEntry[];
}

type StoredProgressAutomationSettings = Pick<AdminProgressAutomationSettings, "webhookUrl" | "enabled" | "updatedAt">;

const DEFAULT_SEO_PAGES: AdminSeoPageConfig[] = [
  {
    id: "home",
    label: "Главная",
    slug: "/",
    image: "https://images.unsplash.com/photo-1529333166437-7750a6dd5a70",
    locales: {
      ru: {
        title: "Virgo School — практические программы",
        description: "Развивайте цифровые навыки, проходя курсы и спринты вместе с командой Virgo.",
        keywords: "virgo school, обучение, курсы"
      },
      en: {
        title: "Virgo School — pragmatic learning",
        description: "Master product and design craft with live cohorts and curated mentors.",
        keywords: "virgo school, courses, cohorts"
      }
    }
  },
  {
    id: "about",
    label: "О школе",
    slug: "/about",
    image: "https://images.unsplash.com/photo-1487412720507-e7ab37603c6f",
    locales: {
      ru: {
        title: "О Virgo School — Миссия, наставники и методология",
        description: "Узнайте, как Virgo School сочетает стратегию, ремесло и технологии через гибридные лаборатории и измеримые результаты.",
        keywords: "virgo school, о школе, наставники"
      },
      en: {
        title: "About Virgo School — Mission, mentors, and methodology",
        description: "Learn how Virgo School combines strategy, craft, and technology through curated mentors, hybrid labs, and measurable outcomes.",
        keywords: "virgo school, about, mentors"
      }
    }
  },
  {
    id: "courses",
    label: "Каталог курсов",
    slug: "/courses",
    image: "https://images.unsplash.com/photo-1522202176988-66273c2fd55f",
    locales: {
      ru: {
        title: "Каталог программ Virgo",
        description: "Выберите курс по продукту, дизайну или маркетингу и присоединяйтесь к ближайшему потоку.",
        keywords: "virgo курсы, продуктовый менеджмент, дизайн"
      },
      en: {
        title: "Virgo programs catalog",
        description: "Browse Virgo cohorts covering product, design, growth and leadership tracks.",
        keywords: "virgo catalog, product courses"
      }
    }
  }
];

type CourseSeoMeta = {
  mentor?: string;
  timezone?: string;
  startDate?: string;
  endDate?: string;
  capacity?: string | number | { current?: number; limit?: number; total?: number };
  capacityLimit?: number;
  language?: "RU" | "EN";
  format?: string;
  seoTitle?: string;
  seoDescription?: string;
  seoKeywords?: string;
  seoImage?: string;
  modules?: Record<
    string,
    {
      owner?: string;
      stage?: AdminModuleStage;
      summary?: string;
      lessons?: number;
      title?: string;
      order?: number;
    }
  >;
};

type OrderWithRelations = Prisma.OrderGetPayload<{
  include: {
    user: { include: { billingProfile: true } };
    enrollment: { include: { course: true } };
    payments: true;
    invoice: true;
  };
}>;

const sampleLessonSelect = Prisma.validator<Prisma.LessonArgs>()({
  select: {
    id: true,
    moduleId: true,
    module: { select: { id: true, courseId: true } }
  }
});

type SampleLessonSelection = Prisma.LessonGetPayload<typeof sampleLessonSelect>;

@Injectable()
export class AdminService implements OnModuleInit {
  private readonly activityFormatter = new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "short"
  });

  private readonly dateTimeFormatter = new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit"
  });

  private readonly dateFormatter = this.activityFormatter;
  private readonly currencyFormatter = new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    maximumFractionDigits: 0
  });
  private readonly mediaBucket = process.env.ASSETS_S3_BUCKET || null;
  private readonly mediaRegion = process.env.AWS_REGION || "eu-central-1";
  private readonly mediaPublicBase =
    process.env.ASSETS_CDN_BASE || process.env.AWS_S3_PUBLIC_ENDPOINT || null;
  private readonly s3Client: S3Client | null = this.createS3Client();
  private readonly defaultRoleCatalog: AdminRoleOption[] = [
    { code: "admin", name: "Администратор" },
    { code: "manager", name: "Менеджер" },
    { code: "support", name: "Поддержка" }
  ];
  private defaultRolesReady = false;
  private defaultRoleSeedPromise: Promise<void> | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly paymentsService: PaymentsService,
    private readonly progressWebhookService: ProgressWebhookService
  ) {}

  async onModuleInit() {
    await this.ensureDefaultRoles();
  }

  private async ensureDefaultRoles(): Promise<void> {
    if (this.defaultRolesReady) {
      return;
    }

    if (!this.defaultRoleSeedPromise) {
      this.defaultRoleSeedPromise = Promise.all(
        this.defaultRoleCatalog.map(role =>
          this.prisma.role.upsert({
            where: { code: role.code },
            update: { name: role.name },
            create: { code: role.code, name: role.name }
          })
        )
      )
        .then(() => {
          this.defaultRolesReady = true;
        })
        .catch(error => {
          this.defaultRoleSeedPromise = null;
          throw error;
        });
    }

    return this.defaultRoleSeedPromise;
  }

  private createS3Client(): S3Client | null {
    if (!this.mediaBucket) {
      return null;
    }

    const credentials =
      process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY
        ? {
            accessKeyId: process.env.AWS_ACCESS_KEY_ID,
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
          }
        : undefined;

    try {
      return new S3Client({
        region: this.mediaRegion,
        endpoint: process.env.AWS_S3_ENDPOINT,
        forcePathStyle: process.env.AWS_S3_FORCE_PATH_STYLE === "true",
        credentials
      });
    } catch (error) {
      console.error("Failed to initialize S3 client", error);
      return null;
    }
  }

  async getStudentDirectory(limit = 50): Promise<AdminStudentProfile[]> {
    const take = Math.min(Math.max(limit, 1), 200);

    const enrollments = await this.prisma.enrollment.findMany({
      take,
      orderBy: { updatedAt: "desc" },
      include: {
        user: true,
        course: true,
        order: {
          include: {
            payments: true
          }
        }
      }
    });

    return enrollments.map(enrollment => this.mapEnrollment(enrollment));
  }

  async createManualEnrollment(dto: CreateManualEnrollmentDto): Promise<AdminStudentProfile> {
    const user = await this.prisma.user.findUnique({ where: { id: dto.userId } });
    if (!user) {
      throw new NotFoundException(`User ${dto.userId} not found`);
    }

    const course = await this.prisma.course.findFirst({
      where: {
        OR: [{ id: dto.courseId }, { slug: dto.courseId }]
      }
    });

    if (!course) {
      throw new NotFoundException(`Course ${dto.courseId} not found`);
    }

    const existing = await this.prisma.enrollment.findUnique({
      where: {
        userId_courseId: {
          userId: user.id,
          courseId: course.id
        }
      }
    });

    if (existing) {
      throw new BadRequestException("Enrollment already exists for this user and course");
    }

    const accessStart = dto.accessStart ? this.parseDate(dto.accessStart) : new Date();
    const accessEnd = dto.accessEnd ? this.parseDate(dto.accessEnd) : null;
    this.validateAccessWindow(accessStart, accessEnd);

    const enrollment = await this.prisma.enrollment.create({
      data: {
        userId: user.id,
        courseId: course.id,
        status: dto.status ?? EnrollmentStatus.active,
        accessStart,
        accessEnd,
        source: EnrollmentSource.manual,
        note: dto.note?.trim() || null
      },
      include: {
        user: true,
        course: true,
        order: {
          include: {
            payments: true
          }
        }
      }
    });

    return this.mapEnrollment(enrollment);
  }

  async updateManualEnrollment(enrollmentId: string, dto: UpdateEnrollmentDto): Promise<AdminStudentProfile> {
    const enrollment = await this.prisma.enrollment.findUnique({
      where: { id: enrollmentId },
      include: {
        user: true,
        course: true,
        order: {
          include: {
            payments: true
          }
        }
      }
    });

    if (!enrollment) {
      throw new NotFoundException(`Enrollment ${enrollmentId} not found`);
    }

    let nextStart = enrollment.accessStart;
    let nextEnd = enrollment.accessEnd;

    if (dto.accessStart !== undefined) {
      nextStart = dto.accessStart ? this.parseDate(dto.accessStart) : null;
    }

    if (dto.accessEnd !== undefined) {
      nextEnd = dto.accessEnd ? this.parseDate(dto.accessEnd) : null;
    }

    if (dto.accessStart !== undefined || dto.accessEnd !== undefined) {
      this.validateAccessWindow(nextStart ?? undefined, nextEnd ?? undefined);
    }

    const data: Prisma.EnrollmentUpdateInput = {};

    if (dto.status) {
      data.status = dto.status;
    }

    if (dto.accessStart !== undefined) {
      data.accessStart = nextStart;
    }

    if (dto.accessEnd !== undefined) {
      data.accessEnd = nextEnd;
    }

    if (dto.note !== undefined) {
      const trimmed = dto.note?.trim();
      data.note = trimmed && trimmed.length ? trimmed : null;
    }

    if (!Object.keys(data).length) {
      return this.mapEnrollment(enrollment);
    }

    const updated = await this.prisma.enrollment.update({
      where: { id: enrollmentId },
      data,
      include: {
        user: true,
        course: true,
        order: {
          include: {
            payments: true
          }
        }
      }
    });

    return this.mapEnrollment(updated);
  }

  async getUserDirectory(limit = 100): Promise<AdminUserRecord[]> {
    const take = Math.min(Math.max(limit, 1), 200);
    const users = await this.prisma.user.findMany({
      take,
      orderBy: { createdAt: "desc" },
      include: {
        roles: {
          include: {
            role: true
          }
        }
      }
    });

    return users.map(user => this.mapUserRecord(user));
  }

  async getAvailableRoles(): Promise<AdminRoleOption[]> {
    await this.ensureDefaultRoles();
    const roles = await this.prisma.role.findMany({
      orderBy: { name: "asc" }
    });

    return roles.map(role => ({ code: role.code, name: role.name }));
  }

  async updateUserRoles(userId: string, roles: string[]): Promise<AdminUserRecord> {
    await this.ensureDefaultRoles();
    const trimmedRoles = Array.from(new Set(roles.map(role => role.trim()))).filter(Boolean);
    if (!trimmedRoles.length) {
      throw new BadRequestException("At least one role is required");
    }

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException(`User ${userId} not found`);
    }

    const availableRoles = await this.prisma.role.findMany({ where: { code: { in: trimmedRoles } } });
    if (availableRoles.length !== trimmedRoles.length) {
      throw new BadRequestException("One or more roles are invalid");
    }

    await this.prisma.$transaction([
      this.prisma.userRole.deleteMany({ where: { userId } }),
      ...availableRoles.map(role =>
        this.prisma.userRole.create({
          data: {
            userId,
            roleId: role.id
          }
        })
      )
    ]);

    const updatedUser = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        roles: {
          include: {
            role: true
          }
        }
      }
    });

    if (!updatedUser) {
      throw new NotFoundException(`User ${userId} not found after update`);
    }

    return this.mapUserRecord(updatedUser);
  }

  async getDashboardStats(): Promise<AdminDashboardStat[]> {
    const now = Date.now();
    const thirtyDaysAgo = new Date(now - 30 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);

    const [revenueAgg, activeStudents, newStudents, completedOrders, upcomingOrders, refunds] = await Promise.all([
      this.prisma.payment.aggregate({
        _sum: { amount: true },
        where: {
          status: "succeeded",
          processedAt: { gte: thirtyDaysAgo }
        }
      }),
      this.prisma.enrollment.count({ where: { status: "active" } }),
      this.prisma.enrollment.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
      this.prisma.order.count({ where: { status: "completed", updatedAt: { gte: thirtyDaysAgo } } }),
      this.prisma.order.count({ where: { status: { in: ["pending", "requires_action"] }, createdAt: { gte: sevenDaysAgo } } }),
      this.prisma.order.count({ where: { status: "refunded", updatedAt: { gte: thirtyDaysAgo } } })
    ]);

    const revenueTotal = this.decimalToNumber(revenueAgg._sum.amount) ?? 0;
    const avgTicket = completedOrders > 0 ? revenueTotal / completedOrders : 0;

    return [
      {
        id: "revenue",
        label: "Выручка 30д",
        value: this.currencyFormatter.format(revenueTotal),
        trend: `${completedOrders} оплаченных заказов`
      },
      {
        id: "students",
        label: "Активные студенты",
        value: activeStudents.toLocaleString("ru-RU"),
        trend: newStudents ? `+${newStudents} новых за 7 дней` : "без изменений"
      },
      {
        id: "pipeline",
        label: "Воронка заказов",
        value: upcomingOrders.toString(),
        trend: refunds ? `${refunds} возвратов 30д` : "без возвратов"
      },
      {
        id: "avgTicket",
        label: "Средний чек",
        value: this.currencyFormatter.format(avgTicket),
        trend: completedOrders ? `${completedOrders} заказов за 30д` : "нет продаж"
      }
    ];
  }

  async getCourseSummaries(): Promise<AdminCourseSummary[]> {
    const courses = await this.prisma.course.findMany({
      orderBy: { updatedAt: "desc" },
      include: {
        _count: { select: { enrollments: true } }
      }
    });

    return courses.map(course => this.mapCourseSummary(course));
  }

  async getCourseDetail(courseId: string): Promise<AdminCourseDetail | null> {
    const course = await this.prisma.course.findFirst({
      where: {
        OR: [{ id: courseId }, { slug: courseId }]
      },
      include: {
        modules: {
          orderBy: { orderIndex: "asc" },
          include: { lessons: true }
        },
        _count: { select: { enrollments: true } }
      }
    });

    if (!course) {
      return null;
    }

    return this.mapCourseDetail(course);
  }

  async saveCourseDraft(dto: SaveCourseDraftDto): Promise<{ id: string }> {
    const titleRu = dto.titleRu?.trim() || "";
    const titleEn = dto.titleEn?.trim() || titleRu;
    const descriptionRu = dto.descriptionRu?.trim() || "";
    const descriptionEn = dto.descriptionEn?.trim() || descriptionRu;
    const cohort = dto.cohort?.trim() || "";
    const cohortCode = this.normalizeCohortCode(cohort);
    const slugSource = cohort || titleRu || titleEn;
    const slug = this.slugify(slugSource);
    const status = this.mapDraftStatusToCourseStatus(dto.status);
    const existing = await this.prisma.course.findUnique({ where: { slug } });
    const previousMeta = this.parseMeta(existing?.seoMeta ?? null);
    const seoMeta = this.buildCourseMeta(
      {
        ...dto,
        titleRu,
        titleEn,
        descriptionRu,
          descriptionEn,
        cohort
      },
      previousMeta
    );
    const seoMetaPayload = seoMeta as Prisma.InputJsonValue;

    if (existing) {
      const updated = await this.prisma.course.update({
        where: { id: existing.id },
        data: {
          titleRu,
          titleEn,
          descriptionRu,
          descriptionEn,
          status,
          cohortCode,
          seoMeta: seoMetaPayload
        }
      });
      return { id: updated.id };
    }

    const created = await this.prisma.course.create({
      data: {
        slug,
        cohortCode,
        titleRu,
        titleEn,
        descriptionRu,
        descriptionEn,
        status,
        seoMeta: seoMetaPayload
      }
    });

    return { id: created.id };
  }

  async getCohortSummaries(): Promise<AdminCohortSummary[]> {
    const courses = await this.prisma.course.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        _count: { select: { enrollments: true } }
      }
    });

    return courses.map(course => this.mapCohortSummary(course));
  }

  async getModuleDirectory(): Promise<AdminModuleDirectoryRecord[]> {
    const modules = await this.prisma.module.findMany({
      orderBy: [{ courseId: "asc" }, { orderIndex: "asc" }],
      include: {
        lessons: true,
        course: true
      }
    });

    return modules.map(module => this.mapModuleDirectoryRecord(module));
  }

  async getModuleLessons(moduleId: string): Promise<AdminLessonDetail[]> {
    await this.assertModuleExists(moduleId);
    const lessons = await this.prisma.lesson.findMany({
      where: { moduleId },
      orderBy: { orderIndex: "asc" },
      include: {
        quiz: {
          select: {
            id: true,
            passScore: true,
            attemptsLimit: true,
            timeLimitSeconds: true
          }
        }
      }
    });

    return lessons.map(lesson => this.mapLessonDetail(lesson));
  }

  async createLesson(moduleId: string, dto: UpsertLessonDto): Promise<AdminLessonDetail> {
    await this.assertModuleExists(moduleId);
    const orderIndex = await this.getNextLessonOrderIndex(moduleId);
    const payload = this.buildLessonWritePayload(dto);
    const lesson = await this.prisma.lesson.create({
      data: {
        moduleId,
        orderIndex,
        ...payload
      },
      include: {
        quiz: {
          select: {
            id: true,
            passScore: true,
            attemptsLimit: true,
            timeLimitSeconds: true
          }
        }
      }
    });

    return this.mapLessonDetail(lesson);
  }

  async updateLesson(moduleId: string, lessonId: string, dto: UpsertLessonDto): Promise<AdminLessonDetail> {
    const existing = await this.prisma.lesson.findUnique({
      where: { id: lessonId },
      include: {
        quiz: {
          select: {
            id: true,
            passScore: true,
            attemptsLimit: true,
            timeLimitSeconds: true
          }
        }
      }
    });

    if (!existing || existing.moduleId !== moduleId) {
      throw new NotFoundException(`Lesson ${lessonId} for module ${moduleId} not found`);
    }

    const payload = this.buildLessonWritePayload(dto);
    const updated = await this.prisma.lesson.update({
      where: { id: lessonId },
      data: payload,
      include: {
        quiz: {
          select: {
            id: true,
            passScore: true,
            attemptsLimit: true,
            timeLimitSeconds: true
          }
        }
      }
    });

    return this.mapLessonDetail(updated);
  }

  async deleteLesson(moduleId: string, lessonId: string): Promise<{ removedId: string }> {
    const lesson = await this.prisma.lesson.findUnique({ where: { id: lessonId } });
    if (!lesson || lesson.moduleId !== moduleId) {
      throw new NotFoundException(`Lesson ${lessonId} for module ${moduleId} not found`);
    }

    await this.prisma.lesson.delete({ where: { id: lessonId } });
    await this.resequenceLessons(moduleId);
    return { removedId: lessonId };
  }

  async reorderLessons(moduleId: string, lessonIds: string[]): Promise<AdminLessonDetail[]> {
    if (!lessonIds.length) {
      return this.getModuleLessons(moduleId);
    }

    await this.assertModuleExists(moduleId);
    const lessons = await this.prisma.lesson.findMany({
      where: { moduleId },
      orderBy: { orderIndex: "asc" }
    });

    const existingIds = lessons.map(lesson => lesson.id);
    const uniqueLessonIds = Array.from(new Set(lessonIds));

    if (uniqueLessonIds.length !== lessons.length || !uniqueLessonIds.every(id => existingIds.includes(id))) {
      throw new BadRequestException("Lesson order payload must include every lesson for the module");
    }

    await this.prisma.$transaction(
      uniqueLessonIds.map((lessonId, index) =>
        this.prisma.lesson.update({ where: { id: lessonId }, data: { orderIndex: index + 1 } })
      )
    );

    const updatedLessons = await this.prisma.lesson.findMany({
      where: { moduleId },
      orderBy: { orderIndex: "asc" },
      include: {
        quiz: {
          select: {
            id: true,
            passScore: true,
            attemptsLimit: true,
            timeLimitSeconds: true
          }
        }
      }
    });

    return updatedLessons.map(lesson => this.mapLessonDetail(lesson));
  }

  async getLessonQuizSettings(lessonId: string): Promise<AdminLessonQuizSettings> {
    const lesson = await this.prisma.lesson.findUnique({
      where: { id: lessonId },
      include: { quiz: true }
    });

    if (!lesson) {
      throw new NotFoundException(`Lesson ${lessonId} not found`);
    }

    return this.mapQuizSettings(lesson.quiz ?? null);
  }

  async upsertLessonQuizSettings(
    lessonId: string,
    dto: UpsertQuizSettingsDto
  ): Promise<AdminLessonQuizSettings> {
    const lesson = await this.prisma.lesson.findUnique({
      where: { id: lessonId },
      include: { quiz: true }
    });

    if (!lesson) {
      throw new NotFoundException(`Lesson ${lessonId} not found`);
    }

    const payload = this.buildQuizSettingsPayload(dto);

    if (lesson.quiz) {
      const updated = await this.prisma.quiz.update({
        where: { id: lesson.quiz.id },
        data: payload
      });
      return this.mapQuizSettings(updated);
    }

    const created = await this.prisma.quiz.create({
      data: {
        lessonId: lesson.id,
        questions: [],
        ...payload
      }
    });

    return this.mapQuizSettings(created);
  }

  async getOrdersFeed(params: AdminOrdersFeedParams = {}): Promise<AdminOrdersFeedResult> {
    const normalizedLimit = typeof params.limit === "number" && Number.isFinite(params.limit) ? params.limit : 50;
    const take = Math.min(Math.max(normalizedLimit, 1), 200);
    const normalizedOffset = typeof params.offset === "number" && Number.isFinite(params.offset) ? params.offset : 0;
    const skip = Math.max(normalizedOffset, 0);
    const statusFilter = this.normalizeOrderStatusFilter(params.status);
    const paymentStatusFilter = this.normalizePaymentStatusFilter(params.paymentStatus);
    const methodFilter = this.normalizeMethodFilter(params.method);
    const currencyFilter = this.normalizeCurrencyFilter(params.currency);
    const searchQuery = typeof params.search === "string" ? params.search.trim() : "";
    const courseClause = this.buildCourseFilterClause(params.courseId, params.courseSlug, params.cohortCode);
    const createdRangeClause = this.buildCreatedDateClause(params.createdFrom, params.createdTo);

    const whereParts: Prisma.OrderWhereInput[] = [];
    if (statusFilter) {
      whereParts.push({ status: statusFilter });
    }

    if (methodFilter) {
      whereParts.push({ payments: { some: { provider: methodFilter } } });
    }

    if (paymentStatusFilter) {
      whereParts.push(...this.buildPaymentStatusClauses(paymentStatusFilter));
    }

    if (currencyFilter) {
      whereParts.push({ currency: currencyFilter });
    }

    if (courseClause) {
      whereParts.push(courseClause);
    }

    if (createdRangeClause) {
      whereParts.push(createdRangeClause);
    }

    if (searchQuery) {
      whereParts.push(this.buildOrdersSearchClause(searchQuery));
    }

    const where: Prisma.OrderWhereInput | undefined = whereParts.length ? { AND: whereParts } : undefined;

    const [orders, total, currencyRows, providerRows, cohortRows] = await this.prisma.$transaction([
      this.prisma.order.findMany({
        take,
        skip,
        orderBy: { createdAt: "desc" },
        where,
        include: {
          user: { include: { billingProfile: true } },
          enrollment: {
            include: { course: true }
          },
          payments: true,
          invoice: true
        }
      }),
      this.prisma.order.count({ where }),
      this.prisma.order.findMany({
        where,
        distinct: ["currency"],
        select: { currency: true },
        orderBy: { currency: "asc" }
      }),
      this.prisma.payment.findMany({
        where: where ? { order: { is: where } } : undefined,
        distinct: ["provider"],
        select: { provider: true },
        orderBy: { provider: "asc" }
      }),
      this.prisma.order.findMany({
        where,
        include: {
          enrollment: {
            include: {
              course: true
            }
          }
        },
        orderBy: { createdAt: "desc" }
      })
    ]);

    const items = orders.map(order => this.mapOrderRecord(order));
    const hasMore = skip + items.length < total;
    const facets = this.buildOrdersFacets(currencyRows, providerRows, cohortRows);

    return {
      items,
      total,
      limit: take,
      offset: skip,
      hasMore,
      facets
    };
  }

  async getOrderDetail(orderId: string): Promise<AdminOrderDetail | null> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        user: { include: { billingProfile: true } },
        enrollment: {
          include: {
            course: true
          }
        },
        payments: true,
        invoice: true
      }
    });

    if (!order) {
      return null;
    }

    return this.mapOrderDetail(order);
  }

  async sendOrderPaymentReminder(orderId: string): Promise<AdminOrderReminderResponse> {
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) {
      throw new NotFoundException(`Order ${orderId} not found`);
    }

    const metadata = this.normalizeMetadata(order.metadata);
    const reminderState = this.extractReminderMeta(metadata);
    const reminderCount = reminderState.reminderCount + 1;
    const lastReminderAtDate = new Date();
    const updatedMetadata = {
      ...(metadata ?? {}),
      reminders: {
        count: reminderCount,
        lastSentAt: lastReminderAtDate.toISOString()
      }
    } satisfies Record<string, unknown>;

    await this.prisma.order.update({
      where: { id: orderId },
      data: { metadata: updatedMetadata as Prisma.InputJsonValue }
    });

    return {
      orderId,
      reminderCount,
      lastReminderAt: this.formatDateTime(lastReminderAtDate)
    };
  }

  async refundOrder(orderId: string, dto?: RefundOrderDto): Promise<AdminOrderRefundResponse> {
    const order = await this.prisma.order.findUnique({ where: { id: orderId }, include: { payments: true } });

    if (!order) {
      throw new NotFoundException(`Order ${orderId} not found`);
    }

    if (!order.payments || order.payments.length === 0) {
      throw new BadRequestException("Для возврата требуется хотя бы один платеж");
    }

    const metadata = this.normalizeMetadata(order.metadata) ?? {};
    const refundMeta = this.extractRefundMeta(metadata);
    const refundReason = dto?.reason?.trim() ? dto.reason.trim() : null;

    if (order.status === "refunded") {
      const sourceDateIso = refundMeta.processedAt ?? order.updatedAt?.toISOString();
      const refundedAt = this.formatDateTime(sourceDateIso ? new Date(sourceDateIso) : new Date());
      const paymentIds = order.payments.map(payment => payment.id);
      return { orderId, refundedAt, paymentIds, reason: refundMeta.reason ?? null };
    }

    const refundDate = new Date();
    const paymentIds = order.payments.map(payment => payment.id);
    const updatedMetadata = {
      ...metadata,
      refund: {
        paymentIds,
        processedAt: refundDate.toISOString(),
        ...(refundReason ? { reason: refundReason } : {})
      }
    } satisfies Record<string, unknown>;

    await this.prisma.$transaction([
      ...order.payments.map(payment =>
        this.prisma.payment.update({
          where: { id: payment.id },
          data: {
            status: "refunded",
            processedAt: payment.processedAt ?? refundDate
          }
        })
      ),
      this.prisma.order.update({
        where: { id: orderId },
        data: {
          status: "refunded",
          metadata: updatedMetadata as Prisma.InputJsonValue
        }
      })
    ]);

    return {
      orderId,
      refundedAt: this.formatDateTime(refundDate),
      paymentIds,
      reason: refundReason ?? null
    };
  }

  async createPaymentLink(orderId: string, dto: CreatePaymentLinkDto): Promise<AdminPaymentLinkResponse> {
    const locale: SupportedLocale = dto.locale === "en" ? "en" : "ru";
    const provider: PaymentProvider | undefined = dto.provider;
    const link = await this.paymentsService.createPaymentLinkForOrder(orderId, provider, locale);
    const recordedAt = new Date();

    const metadataSource = await this.prisma.order.findUnique({ where: { id: orderId }, select: { metadata: true } });
    const metadata = this.normalizeMetadata(metadataSource?.metadata ?? null) ?? {};
    const history = this.extractPaymentLinkHistory(metadata);
    const entry: AdminPaymentLinkEntry = {
      id: this.generatePaymentLinkEntryId(orderId),
      url: link.url,
      provider: link.provider,
      locale,
      createdAt: this.formatDateTime(recordedAt),
      createdAtIso: recordedAt.toISOString(),
      paymentId: link.paymentId,
      providerRef: link.providerRef,
      simulated: link.simulated
    };
    const serializedEntry = this.serializePaymentLinkEntry(entry);
    const serializedHistory = history.map(item => this.serializePaymentLinkEntry(item));
    const nextMetadata = {
      ...metadata,
      lastPaymentLink: serializedEntry,
      paymentLinks: [...serializedHistory, serializedEntry]
    } satisfies Record<string, unknown>;

    await this.prisma.order.update({
      where: { id: orderId },
      data: { metadata: nextMetadata as Prisma.InputJsonValue }
    });

    return {
      orderId,
      ...entry
    };
  }

  async updateOrderInvoice(orderId: string, dto: UpdateInvoiceDto): Promise<AdminInvoiceSummary> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        user: { include: { billingProfile: true } },
        invoice: true
      }
    });

    if (!order) {
      throw new NotFoundException(`Order ${orderId} not found`);
    }

    const existingSnapshot = this.asRecord(order.invoice?.profileSnapshot ?? null);
    const snapshot: Prisma.JsonObject | null = existingSnapshot
      ? (existingSnapshot as Prisma.JsonObject)
      : this.buildInvoiceProfileSnapshot(order.user?.billingProfile ?? null);

    if (!snapshot) {
      throw new BadRequestException("Для обновления счета требуется заполненный биллинг-профиль");
    }

    const normalizedDownloadUrl =
      dto.downloadUrl !== undefined ? this.normalizeNullableString(dto.downloadUrl) : undefined;
    const normalizedNotes = dto.notes !== undefined ? this.normalizeNullableString(dto.notes) : undefined;

    const updateData: Prisma.OrderInvoiceUpdateInput = {};
    if (dto.status) {
      updateData.status = dto.status;
    }
    if (normalizedDownloadUrl !== undefined) {
      updateData.downloadUrl = normalizedDownloadUrl;
    }
    if (normalizedNotes !== undefined) {
      updateData.notes = normalizedNotes;
    }
    if (!existingSnapshot) {
      updateData.profileSnapshot = snapshot;
    }

    const invoiceRecord = await this.prisma.orderInvoice.upsert({
      where: { orderId },
      update: updateData,
      create: {
        orderId,
        userId: order.userId,
        status: dto.status ?? "pending",
        downloadUrl: normalizedDownloadUrl ?? null,
        notes: normalizedNotes ?? null,
        profileSnapshot: snapshot
      }
    });

    return this.mapInvoiceSummary(invoiceRecord)!;
  }

  async getMediaLibrary(limit = 24): Promise<AdminMediaAsset[]> {
    const take = Math.min(Math.max(limit ?? 24, 1), 60);
    const assets = await this.prisma.mediaAsset.findMany({
      take,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }]
    });

    return assets.map(asset => this.mapMediaAsset(asset));
  }

  async requestMediaUpload(dto: RequestMediaUploadDto): Promise<AdminMediaUploadTicket> {
    if (!this.mediaBucket || !this.s3Client) {
      throw new BadRequestException("Медиахранилище не настроено на сервере");
    }

    const sanitizedName = this.sanitizeFilename(dto.filename);
    const storageKey = this.buildStorageKey(sanitizedName);
    const mediaType = (dto.type?.toLowerCase() ?? this.detectMediaType(dto.mimeType)) || "file";
    const sizeValue = typeof dto.sizeBytes === "number" && Number.isFinite(dto.sizeBytes)
      ? Math.round(dto.sizeBytes)
      : null;

    const asset = await this.prisma.mediaAsset.create({
      data: {
        storageKey,
        type: mediaType,
        mimeType: dto.mimeType,
        sizeBytes: sizeValue,
        metadata: {
          filename: dto.filename,
          requestedAt: new Date().toISOString()
        } as Prisma.JsonObject
      }
    });

    const expiresIn = 60 * 5;
    const putCommand = new PutObjectCommand({
      Bucket: this.mediaBucket,
      Key: storageKey,
      ContentType: dto.mimeType ?? "application/octet-stream",
      Metadata: {
        "x-amz-meta-origin": "virgo-admin"
      }
    });
    const uploadUrl = await getSignedUrl(this.s3Client, putCommand, { expiresIn });

    return {
      assetId: asset.id,
      storageKey,
      uploadUrl,
      previewUrl: this.buildPublicUrl(storageKey),
      expiresAt: new Date(Date.now() + expiresIn * 1000).toISOString(),
      headers: {
        "Content-Type": dto.mimeType ?? "application/octet-stream"
      }
    };
  }

  async getSeoSettings(): Promise<AdminSeoSettings> {
    const record = await this.prisma.setting.findUnique({ where: { key: SEO_SETTINGS_KEY } });
    return this.parseSeoSettings(record?.value ?? null);
  }

  async updateSeoSettings(dto: UpdateSeoSettingsDto): Promise<AdminSeoSettings> {
    if (!dto.pages || !dto.pages.length) {
      throw new BadRequestException("Необходимо указать хотя бы одну страницу");
    }

    const normalizedPages = dto.pages.map(page => this.normalizeSeoPage(page));
    const payload = {
      updatedAt: new Date().toISOString(),
      pages: normalizedPages
    } satisfies Record<string, unknown>;

    const serializedPayload = payload as unknown as Prisma.InputJsonValue;

    await this.prisma.setting.upsert({
      where: { key: SEO_SETTINGS_KEY },
      create: { key: SEO_SETTINGS_KEY, value: serializedPayload },
      update: { value: serializedPayload }
    });

    return {
      updatedAt: payload.updatedAt,
      pages: normalizedPages
    };
  }

  async getProgressAutomationSettings(): Promise<AdminProgressAutomationSettings> {
    const record = await this.prisma.setting.findUnique({ where: { key: PROGRESS_AUTOMATION_SETTINGS_KEY } });
    const stored = this.parseProgressAutomationSettings(record?.value ?? null);
    return this.decorateProgressAutomationSettings(stored);
  }

  async updateProgressAutomationSettings(dto: UpdateProgressAutomationSettingsDto): Promise<AdminProgressAutomationSettings> {
    const normalizedUrl = dto.webhookUrl?.trim() || null;

    if (normalizedUrl) {
      try {
        const url = new URL(normalizedUrl);
        if (!url.protocol.startsWith("http")) {
          throw new BadRequestException("Webhook URL должен начинаться с http или https");
        }
      } catch {
        throw new BadRequestException("Укажите корректный URL для вебхука");
      }
    }

    const snapshot: StoredProgressAutomationSettings = {
      webhookUrl: normalizedUrl,
      enabled: Boolean(dto.enabled && normalizedUrl),
      updatedAt: new Date().toISOString()
    };

    const serializedSnapshot = snapshot as unknown as Prisma.InputJsonValue;

    await this.prisma.setting.upsert({
      where: { key: PROGRESS_AUTOMATION_SETTINGS_KEY },
      create: { key: PROGRESS_AUTOMATION_SETTINGS_KEY, value: serializedSnapshot },
      update: { value: serializedSnapshot }
    });

    return this.decorateProgressAutomationSettings(snapshot);
  }

  async triggerProgressAutomationTest(): Promise<AdminProgressAutomationTestResult> {
    const payload = await this.buildProgressAutomationSample();
    const delivery = await this.progressWebhookService.emitLessonCompleted(payload);
    return {
      delivered: delivery.delivered,
      targetUrl: delivery.targetUrl,
      payload
    };
  }

  async triggerDunningRun(dto: RunDunningDto): Promise<AdminDunningRunResult> {
    const params = {
      limit: typeof dto.limit === "number" ? dto.limit : undefined,
      dryRun: dto.dryRun
    };
    const result = await this.paymentsService.processDunningReminders(params);
    return {
      evaluated: result.evaluated,
      remindersSent: result.remindersSent,
      dryRun: result.dryRun,
      overdueDays: result.overdueDays,
      reminderIntervalHours: result.reminderIntervalHours,
      entries: result.entries.map(entry => ({
        orderId: entry.orderId,
        reminderCount: entry.reminderCount,
        lastReminderAtIso: entry.lastReminderAt,
        lastReminderAt: this.formatDateTime(new Date(entry.lastReminderAt))
      }))
    };
  }

  private parseDate(value: string): Date {
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      throw new BadRequestException("Invalid date value");
    }
    return parsed;
  }

  private validateAccessWindow(accessStart?: Date | null, accessEnd?: Date | null) {
    if (accessStart && accessEnd && accessStart > accessEnd) {
      throw new BadRequestException("accessEnd must be after accessStart");
    }
  }

  private mapEnrollment(
    enrollment: Prisma.EnrollmentGetPayload<{
      include: {
        user: true;
        course: true;
        order: {
          include: {
            payments: true;
          };
        };
      };
    }>
  ): AdminStudentProfile {
    const user = enrollment.user;
    const course = enrollment.course;
    const order = enrollment.order;

    const fullName = [user?.firstName, user?.lastName].filter(Boolean).join(" ").trim();
    const name = fullName || user?.email || "Студент";
    const cohort = this.resolveCourseCohortCode(course);
    const courseTitle = course?.titleRu || course?.titleEn || course?.slug || "Без названия";

    return {
      id: enrollment.id,
      name,
      cohort,
      course: courseTitle,
      progress: enrollment.progress ?? 0,
      paymentStatus: this.resolvePaymentStatus(order?.payments ?? [], enrollment.createdAt),
      lastActivity: this.activityFormatter.format(enrollment.updatedAt ?? new Date())
    };
  }

  private mapCourseSummary(
    course: Prisma.CourseGetPayload<{
      include: { _count: { select: { enrollments: true } } };
    }>
  ): AdminCourseSummary {
    const meta = this.parseMeta(course.seoMeta);
    const mentor = this.resolveMentor(meta);
    const cohort = this.resolveCourseCohortCode(course);
    const updatedAt = this.dateFormatter.format(course.updatedAt ?? new Date());
    const status = this.mapCourseStatus(course.status, course.updatedAt);

    return {
      id: course.id,
      title: course.titleRu || course.titleEn || cohort,
      mentor,
      cohort,
      students: course._count?.enrollments ?? 0,
      status,
      updatedAt
    };
  }

  private mapCourseDetail(
    course: Prisma.CourseGetPayload<{
      include: {
        modules: { include: { lessons: true } };
        _count: { select: { enrollments: true } };
      };
    }>
  ): AdminCourseDetail {
    const summary = this.mapCourseSummary(course);
    const meta = this.parseMeta(course.seoMeta);
    const language = this.resolveLanguage(meta);
    const timezone = meta?.timezone || "MSK";
    const format = meta?.format || "Online live";
    const startSource = meta?.startDate ? new Date(meta.startDate) : course.createdAt;
    const endSource = meta?.endDate ? new Date(meta.endDate) : this.addMonths(startSource, course.durationMonths ?? 2);
    const startDate = this.formatShortDate(startSource);
    const endDate = this.formatShortDate(endSource ?? startSource);
    const capacity = this.formatCapacity(summary.students, meta);
    const descriptionRu = course.descriptionRu?.trim() || "";
    const descriptionEn = course.descriptionEn?.trim() || "";
    const description = this.stripHtml(descriptionRu || descriptionEn);
    const titleRu = course.titleRu;
    const titleEn = course.titleEn;
    const seoTitle = meta?.seoTitle?.trim() || summary.title;
    const seoDescription = meta?.seoDescription?.trim() || description;
    const seoKeywords = meta?.seoKeywords?.trim() || "";
    const seoImage = meta?.seoImage?.trim() || "";

    const existingModules = (course.modules || []).map(module => {
      const outline = this.mapModuleOutline(module, meta, summary.mentor);
      const order = meta?.modules?.[module.id]?.order ?? module.orderIndex ?? 0;
      return { outline, order };
    });

    const extraModules = meta?.modules
      ? Object.entries(meta.modules)
          .filter(([moduleId]) => !(course.modules || []).some(module => module.id === moduleId))
          .map(([moduleId, definition], index) => ({
            outline: this.mapSyntheticModule(moduleId, definition, summary.mentor),
            order: definition.order ?? 1000 + index
          }))
      : [];

    const modules = [...existingModules, ...extraModules]
      .sort((a, b) => a.order - b.order)
      .map(entry => entry.outline);

    return {
      ...summary,
      description,
      descriptionRu,
      descriptionEn,
      titleRu,
      titleEn,
      language,
      timezone,
      format,
      startDate,
      endDate,
      capacity,
      seoTitle,
      seoDescription,
      seoKeywords,
      seoImage,
      modules
    };
  }

  private mapMediaAsset(asset: PrismaMediaAsset): AdminMediaAsset {
    const metadata = (asset.metadata ?? {}) as Record<string, unknown>;
    const filename = typeof metadata.filename === "string" ? metadata.filename : null;
    const label = filename || asset.storageKey.split("/").pop() || asset.storageKey;

    return {
      id: asset.id,
      label,
      type: asset.type,
      mimeType: asset.mimeType,
      size: this.formatFileSize(asset.sizeBytes),
      sizeBytes: asset.sizeBytes,
      storageKey: asset.storageKey,
      url: this.buildPublicUrl(asset.storageKey),
      createdAt: this.dateTimeFormatter.format(asset.createdAt)
    };
  }

  private buildPublicUrl(key: string): string {
    const normalizedKey = key.replace(/^\/+/, "");
    if (this.mediaPublicBase) {
      return `${this.mediaPublicBase.replace(/\/$/, "")}/${normalizedKey}`;
    }
    if (this.mediaBucket) {
      return `https://${this.mediaBucket}.s3.${this.mediaRegion}.amazonaws.com/${normalizedKey}`;
    }
    return normalizedKey;
  }

  private formatFileSize(size?: number | null): string {
    if (!size || size <= 0) {
      return "—";
    }
    const units = ["B", "KB", "MB", "GB", "TB"];
    let value = size;
    let unitIndex = 0;
    while (value >= 1024 && unitIndex < units.length - 1) {
      value /= 1024;
      unitIndex++;
    }
    const fixed = value >= 10 || unitIndex === 0 ? value.toFixed(0) : value.toFixed(1);
    return `${fixed} ${units[unitIndex]}`;
  }

  private buildStorageKey(filename: string): string {
    const datePrefix = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    return `uploads/${datePrefix}/${randomUUID()}-${filename}`;
  }

  private sanitizeFilename(filename: string): string {
    const safe = filename
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9._-]+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-+|-+$/g, "");
    return safe || `asset-${Date.now()}`;
  }

  private detectMediaType(mime?: string | null): string | null {
    if (!mime) {
      return null;
    }
    if (mime.startsWith("image/")) {
      return "image";
    }
    if (mime.startsWith("video/")) {
      return "video";
    }
    if (mime.startsWith("audio/")) {
      return "audio";
    }
    if (mime === "application/pdf") {
      return "document";
    }
    return "file";
  }

  private parseSeoSettings(value: Prisma.JsonValue | null): AdminSeoSettings {
    const fallback = this.cloneDefaultSeoPages();
    if (!value || typeof value !== "object") {
      return { updatedAt: new Date(0).toISOString(), pages: fallback };
    }

    const snapshot = value as Record<string, unknown>;
    const pagesRaw = Array.isArray(snapshot.pages) ? snapshot.pages : fallback;
    const pages = pagesRaw.map(page => this.normalizeSeoPage(page));
    const updatedAt = typeof snapshot.updatedAt === "string" ? snapshot.updatedAt : new Date().toISOString();

    return {
      updatedAt,
      pages: pages.length ? pages : fallback
    };
  }

  private parseProgressAutomationSettings(value: Prisma.JsonValue | null): StoredProgressAutomationSettings {
    if (!value || typeof value !== "object") {
      return {
        webhookUrl: null,
        enabled: false,
        updatedAt: new Date(0).toISOString()
      };
    }

    const snapshot = value as Record<string, unknown>;
    const rawUrl = typeof snapshot.webhookUrl === "string" ? snapshot.webhookUrl.trim() : null;
    const webhookUrl = rawUrl && rawUrl.length ? rawUrl : null;
    const enabled = Boolean(snapshot.enabled) && Boolean(webhookUrl);
    const updatedAt = typeof snapshot.updatedAt === "string" && snapshot.updatedAt.length
      ? snapshot.updatedAt
      : new Date(0).toISOString();

    return {
      webhookUrl,
      enabled,
      updatedAt
    };
  }

  private decorateProgressAutomationSettings(
    settings: StoredProgressAutomationSettings
  ): AdminProgressAutomationSettings {
    const envWebhook = process.env.PROGRESS_WEBHOOK_URL?.trim() || null;
    if (envWebhook) {
      return {
        ...settings,
        activeUrl: envWebhook,
        activeSource: "env"
      };
    }

    if (settings.enabled && settings.webhookUrl) {
      return {
        ...settings,
        activeUrl: settings.webhookUrl,
        activeSource: "settings"
      };
    }

    return {
      ...settings,
      activeUrl: null,
      activeSource: "disabled"
    };
  }

  private async buildProgressAutomationSample(): Promise<LessonCompletionWebhookPayload> {
    const enrollment = await this.prisma.enrollment.findFirst({
      where: { status: { in: ["active", "completed"] } },
      include: {
        user: { select: { id: true, email: true, firstName: true, lastName: true } },
        course: { select: { id: true } }
      },
      orderBy: { updatedAt: "desc" }
    });

    const lesson = await this.pickSampleLesson(enrollment?.courseId);
    const user = enrollment?.user;
    const userEmail = user?.email ?? "ops+webhook@virgo.school";
    const userName = this.composeUserName(user?.firstName, user?.lastName, user?.email);

    return {
      userId: user?.id ?? "test-user",
      userEmail,
      userName,
      courseId: enrollment?.courseId ?? lesson?.module?.courseId ?? null,
      moduleId: lesson?.moduleId ?? lesson?.module?.id ?? null,
      lessonId: lesson?.id ?? "lesson-sample",
      completedAt: new Date().toISOString()
    };
  }

  private async pickSampleLesson(courseId?: string | null): Promise<SampleLessonSelection | null> {
    const selection = {
      ...sampleLessonSelect,
      orderBy: { orderIndex: "asc" as const }
    };

    if (courseId) {
      const lesson = await this.prisma.lesson.findFirst({
        ...selection,
        where: { module: { courseId } }
      });
      if (lesson) {
        return lesson;
      }
    }

    return this.prisma.lesson.findFirst(selection);
  }

  private composeUserName(firstName?: string | null, lastName?: string | null, fallback?: string | null) {
    const parts = [firstName, lastName]
      .map(part => (typeof part === "string" ? part.trim() : ""))
      .filter(Boolean);
    if (parts.length) {
      return parts.join(" ");
    }
    if (fallback && fallback.trim().length) {
      return fallback;
    }
    return "Automation Test";
  }

  private cloneDefaultSeoPages(): AdminSeoPageConfig[] {
    return DEFAULT_SEO_PAGES.map(page => ({
      ...page,
      locales: {
        ru: { ...page.locales.ru },
        en: { ...page.locales.en }
      }
    }));
  }

  private normalizeSeoPage(page: unknown): AdminSeoPageConfig {
    const input = (typeof page === "object" && page) ? (page as Record<string, unknown>) : {};
    const rawSlug = typeof input.slug === "string" ? input.slug : typeof input.id === "string" ? input.id : "/";
    const slug = this.normalizeSlug(rawSlug);
    const idSource = typeof input.id === "string" && input.id.trim().length ? input.id.trim() : slug.replace(/\//g, "-") || randomUUID();
    const label = typeof input.label === "string" && input.label.trim().length ? input.label.trim() : this.deriveLabelFromSlug(slug);
    const image = typeof input.image === "string" ? input.image : "";

    const ruSource = (input.locales as Record<string, unknown> | undefined)?.ru ?? input.ru;
    const enSource = (input.locales as Record<string, unknown> | undefined)?.en ?? input.en;

    return {
      id: idSource,
      label,
      slug,
      image,
      locales: {
        ru: this.normalizeSeoLocale(ruSource),
        en: this.normalizeSeoLocale(enSource)
      }
    };
  }

  private normalizeSeoLocale(locale: unknown): AdminSeoLocaleFields {
    if (!locale || typeof locale !== "object") {
      return { title: "", description: "", keywords: "" };
    }
    const data = locale as Record<string, unknown>;
    const title = typeof data.title === "string" ? data.title.trim() : "";
    const description = typeof data.description === "string" ? data.description.trim() : "";
    const keywords = typeof data.keywords === "string" ? data.keywords.trim() : "";
    return { title, description, keywords };
  }

  private normalizeSlug(slug: string): string {
    if (!slug) {
      return "/";
    }
    let value = slug.trim();
    if (!value.startsWith("/")) {
      value = `/${value}`;
    }
    value = value.replace(/\s+/g, "-");
    value = value.replace(/\/+/g, "/");
    return value || "/";
  }

  private deriveLabelFromSlug(slug: string): string {
    if (slug === "/") {
      return "Главная";
    }
    const segments = slug
      .split("/")
      .filter(Boolean)
      .map(segment => segment.replace(/[-_]/g, " "));
    if (!segments.length) {
      return "SEO страница";
    }
    return segments
      .map(part => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" → ");
  }

  private resolvePaymentStatus(payments: { status: PaymentStatus }[], createdAt: Date): AdminStudentProfile["paymentStatus"] {
    if (payments.some(payment => payment.status === "succeeded")) {
      return "paid";
    }

    if (payments.some(payment => payment.status === "pending")) {
      return "trial";
    }

    const hasAnyPayments = payments.length > 0;
    if (!hasAnyPayments) {
      const now = Date.now();
      const trialWindowMs = 14 * 24 * 60 * 60 * 1000;
      if (now - createdAt.getTime() <= trialWindowMs) {
        return "trial";
      }
    }

    return "overdue";
  }

  private mapCourseStatus(status: CourseStatus, updatedAt?: Date | null): AdminCourseSummary["status"] {
    if (status === "archived") {
      return "archived";
    }

    if (status === "published") {
      if (updatedAt && Date.now() - updatedAt.getTime() > 60 * 24 * 60 * 60 * 1000) {
        return "maintenance";
      }
      return "running";
    }

    return "enrollment";
  }

  private mapCohortSummary(
    course: Prisma.CourseGetPayload<{
      include: { _count: { select: { enrollments: true } } };
    }>
  ): AdminCohortSummary {
    const meta = this.parseMeta(course.seoMeta);
    const label = this.resolveCourseCohortCode(course);
    const courseTitle = course.titleRu || course.titleEn || label;
    const stage = this.resolveCohortStage(course.status);
    const timezone = meta?.timezone || "MSK";

    const startSource = meta?.startDate ? new Date(meta.startDate) : course.createdAt;
    const endSource = meta?.endDate ? new Date(meta.endDate) : this.addMonths(startSource, course.durationMonths ?? 2);
    const startDate = this.activityFormatter.format(startSource ?? new Date());
    const endDate = this.activityFormatter.format(endSource ?? startSource ?? new Date());

    const currentStudents = course._count?.enrollments ?? 0;
    const capacity = this.formatCapacity(currentStudents, meta);

    return {
      id: course.id,
      label,
      course: courseTitle,
      stage,
      capacity,
      startDate,
      endDate,
      timezone
    };
  }

  private resolveCohortStage(status: CourseStatus): AdminCohortSummary["stage"] {
    switch (status) {
      case "archived":
        return "wrap-up";
      case "published":
        return "running";
      default:
        return "enrollment";
    }
  }

  private formatCapacity(current: number, meta: CourseSeoMeta | null): string {
    const trimmedString = typeof meta?.capacity === "string" ? meta.capacity.trim() : null;
    if (trimmedString) {
      return trimmedString;
    }

    if (typeof meta?.capacity === "number") {
      return `${current} / ${meta.capacity}`;
    }

    if (meta?.capacity && typeof meta.capacity === "object") {
      const limit = meta.capacity.limit ?? meta.capacity.total;
      const value = meta.capacity.current ?? current;
      if (limit) {
        return `${value} / ${limit}`;
      }
    }

    if (typeof meta?.capacityLimit === "number" && meta.capacityLimit > 0) {
      return `${current} / ${meta.capacityLimit}`;
    }

    const defaultLimit = Math.max(current, 30);
    return `${current} / ${defaultLimit}`;
  }

  private parseMeta(value: Prisma.JsonValue | null | undefined): CourseSeoMeta | null {
    if (!value || typeof value !== "object") {
      return null;
    }
    return value as CourseSeoMeta;
  }

  private addMonths(date?: Date | null, months: number = 2): Date {
    const base = date ? new Date(date) : new Date();
    base.setMonth(base.getMonth() + months);
    return base;
  }

  private mapModuleDirectoryRecord(
    module: Prisma.ModuleGetPayload<{
      include: {
        lessons: true;
        course: true;
      };
    }>
  ): AdminModuleDirectoryRecord {
    const course = module.course;
    const meta = this.parseMeta(course?.seoMeta ?? null);
    const mentor = this.resolveMentor(meta);
    const outline = this.mapModuleOutline(module, meta, mentor);
    const courseId = course?.id ?? "unknown-course";
    const courseTitle = course?.titleRu || course?.titleEn || course?.slug || "Без названия";
    const language = this.resolveLanguage(meta);

    return {
      id: module.id,
      moduleTitle: outline.title,
      courseId,
      courseTitle,
      stage: outline.stage,
      owner: outline.owner,
      lessons: outline.lessons,
      updatedAt: this.formatShortDate(module.course?.updatedAt),
      language
    };
  }

  private mapUserRecord(
    user: Prisma.UserGetPayload<{ include: { roles: { include: { role: true } } } }>
  ): AdminUserRecord {
    const roleLabelsRaw = user.roles?.map(relation => relation.role) ?? [];
    const roleLabels = roleLabelsRaw
      .map(role => role?.name || role?.code)
      .filter((value): value is string => Boolean(value));
    const roleCodes = roleLabelsRaw
      .map(role => role?.code)
      .filter((value): value is string => Boolean(value));
    const rolesDisplay = roleLabels.length ? roleLabels : [];
    const codesDisplay = roleCodes.length ? roleCodes : [];
    const name = [user.firstName, user.lastName].filter(Boolean).join(" ").trim() || "—";

    return {
      id: user.id,
      email: user.email,
      name: name === "—" ? user.email.split("@")[0] ?? "—" : name,
      roles: rolesDisplay,
      roleCodes: codesDisplay,
      locale: user.locale?.toUpperCase?.() ?? "RU",
      timezone: user.timezone || "Europe/Moscow",
      createdAt: this.formatShortDate(user.createdAt),
      lastActiveAt: this.formatShortDate(user.updatedAt)
    };
  }

  private mapOrderRecord(order: OrderWithRelations): AdminOrderRecord {
    const studentName = [order.user?.firstName, order.user?.lastName].filter(Boolean).join(" ").trim();
    const student = studentName || order.user?.email || "Студент";
    const cohort = this.resolveCourseCohortCode(order.enrollment?.course);
    const amount = this.formatCurrency(order.amount, order.currency);
    const paymentStatus = this.resolveOrderPaymentStatus(order.payments ?? []);
    const method = this.resolvePaymentProvider(order.payments ?? []);
    const createdAt = order.createdAt ?? new Date();
    const updatedAt = order.updatedAt ?? createdAt;
    const currency = order.currency || "USD";

    return {
      id: order.id,
      student,
      cohort,
      amount,
      currency,
      status: order.status,
      paymentStatus,
      method,
      createdAt: this.formatShortDate(createdAt),
      createdAtIso: createdAt.toISOString(),
      updatedAt: this.formatShortDate(updatedAt),
      updatedAtIso: updatedAt.toISOString()
    };
  }

  private mapOrderDetail(order: OrderWithRelations): AdminOrderDetail {
    const baseRecord = this.mapOrderRecord(order);
    const course = order.enrollment?.course;
    const metadata = this.normalizeMetadata(order.metadata);
    const lastPaymentLink = this.extractLastPaymentLink(metadata);
    const paymentLinkHistory = this.extractPaymentLinkHistory(metadata);
    const reminderState = this.extractReminderMeta(metadata);
    const lastReminderAt = reminderState.lastReminderIso
      ? this.formatDateTime(new Date(reminderState.lastReminderIso))
      : null;
    const refundMeta = this.extractRefundMeta(metadata);
    const paymentAttempts = [...(order.payments || [])]
      .sort((a, b) => {
        const left = a.processedAt ?? new Date(0);
        const right = b.processedAt ?? new Date(0);
        return right.getTime() - left.getTime();
      })
      .map(payment => this.mapOrderPaymentAttempt(payment));

    const timeline = this.buildOrderTimeline(order, reminderState, paymentLinkHistory, metadata);
    const billingProfile = this.mapBillingProfile(order.user?.billingProfile ?? null);
    const invoice = this.mapInvoiceSummary(order.invoice ?? null);

    return {
      ...baseRecord,
      type: order.type,
      currency: order.currency || "USD",
      studentEmail: order.user?.email || "—",
      studentId: order.user?.id || "—",
      courseId: course?.id || null,
      courseTitle: course?.titleRu || course?.titleEn || course?.slug || "Без названия",
      enrollmentId: order.enrollment?.id || null,
      metadata,
      lastPaymentLink,
      paymentLinkHistory,
      paymentAttempts,
      refundReason: refundMeta.reason,
      refundProcessedAt: refundMeta.processedAt ? this.formatDateTime(new Date(refundMeta.processedAt)) : null,
      createdAtFull: this.formatDateTime(order.createdAt),
      updatedAtFull: this.formatDateTime(order.updatedAt),
      reminderCount: reminderState.reminderCount,
      lastReminderAt,
      timeline,
      billingProfile,
      invoice
    };
  }

  private mapBillingProfile(profile: BillingProfile | null | undefined): AdminBillingProfileSummary | null {
    if (!profile) {
      return null;
    }

    return {
      fullName: profile.fullName,
      email: profile.email,
      companyName: profile.companyName ?? null,
      taxId: profile.taxId ?? null,
      address: profile.address ?? null,
      phone: profile.phone ?? null,
      updatedAt: profile.updatedAt ? this.formatDateTime(profile.updatedAt) : null
    };
  }

  private mapInvoiceSummary(invoice: OrderInvoice | null | undefined): AdminInvoiceSummary | null {
    if (!invoice) {
      return null;
    }

    return {
      id: invoice.id,
      status: invoice.status,
      downloadUrl: invoice.downloadUrl ?? null,
      notes: invoice.notes ?? null,
      requestedAt: this.formatDateTime(invoice.createdAt),
      profileSnapshot: this.asRecord(invoice.profileSnapshot)
    };
  }

  private buildInvoiceProfileSnapshot(profile: BillingProfile | null | undefined): Prisma.JsonObject | null {
    if (!profile) {
      return null;
    }

    return {
      userId: profile.userId,
      fullName: profile.fullName,
      email: profile.email,
      companyName: profile.companyName ?? null,
      taxId: profile.taxId ?? null,
      address: profile.address ?? null,
      phone: profile.phone ?? null,
      recordedAt: new Date().toISOString()
    } satisfies Prisma.JsonObject;
  }

  private normalizeNullableString(value?: string | null): string | null {
    if (typeof value !== "string") {
      return null;
    }
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  private asRecord(value: Prisma.JsonValue | null | undefined): Record<string, unknown> | null {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      return null;
    }
    return value as Record<string, unknown>;
  }

  private normalizeOrderStatusFilter(value?: string): OrderStatus | null {
    if (!value) {
      return null;
    }

    const normalized = value.trim().toLowerCase();
    switch (normalized) {
      case "pending":
        return "pending";
      case "requires_action":
      case "requires-action":
        return "requires_action";
      case "completed":
        return "completed";
      case "canceled":
      case "cancelled":
        return "canceled";
      case "refunded":
        return "refunded";
      default:
        return null;
    }
  }

  private normalizePaymentStatusFilter(value?: string): AdminOrderRecord["paymentStatus"] | null {
    if (!value) {
      return null;
    }

    const normalized = value.trim().toLowerCase();
    if (normalized === "paid") {
      return "paid";
    }
    if (normalized === "failed") {
      return "failed";
    }
    if (normalized === "pending") {
      return "pending";
    }
    return null;
  }

  private normalizeMethodFilter(value?: string): PaymentProvider | null {
    if (!value) {
      return null;
    }

    const normalized = value.trim().toLowerCase().replace(/[\s_-]+/g, "");

    if (normalized.includes("stripe")) {
      return "stripe";
    }

    if (normalized.includes("yoo") || normalized.includes("kassa")) {
      return "yookassa";
    }

    if (normalized.includes("cloud")) {
      return "cloudpayments";
    }

    if (normalized.includes("manual") || normalized.includes("cash") || normalized.includes("tinkoff")) {
      return "manual";
    }

    return null;
  }

  private buildPaymentStatusClauses(status: AdminOrderRecord["paymentStatus"]): Prisma.OrderWhereInput[] {
    if (status === "paid") {
      return [{ payments: { some: { status: "succeeded" } } }];
    }

    if (status === "failed") {
      return [
        { payments: { some: { status: { in: ["failed", "refunded"] } } } },
        { payments: { none: { status: "succeeded" } } }
      ];
    }

    // pending
    return [
      { payments: { none: { status: "succeeded" } } },
      { payments: { none: { status: { in: ["failed", "refunded"] } } } }
    ];
  }

  private normalizeCurrencyFilter(value?: string | null): string | null {
    if (!value) {
      return null;
    }
    const trimmed = value.trim();
    if (!trimmed) {
      return null;
    }
    const normalized = trimmed.toUpperCase();
    return /^[A-Z]{3}$/.test(normalized) ? normalized : null;
  }

  private buildCourseFilterClause(
    courseId?: string | null,
    courseSlug?: string | null,
    cohortCode?: string | null
  ): Prisma.OrderWhereInput | null {
    const normalizedId = courseId?.trim() || null;
    const normalizedSlug = courseSlug?.trim() || null;
    const normalizedCohort = this.normalizeCohortCode(cohortCode);
    if (!normalizedId && !normalizedSlug && !normalizedCohort) {
      return null;
    }

    const enrollmentClause: Prisma.EnrollmentWhereInput = {};
    if (normalizedId) {
      enrollmentClause.courseId = normalizedId;
    }

    const courseClause: Prisma.CourseWhereInput = {};
    if (normalizedSlug) {
      courseClause.slug = {
        equals: normalizedSlug,
        mode: "insensitive"
      };
    }

    if (normalizedCohort) {
      courseClause.cohortCode = normalizedCohort;
    }

    if (Object.keys(courseClause).length) {
      enrollmentClause.course = {
        is: courseClause
      };
    }

    return {
      enrollment: {
        is: enrollmentClause
      }
    } satisfies Prisma.OrderWhereInput;
  }

  private parseFilterDate(value?: string | null, endOfDay = false): Date | null {
    if (!value) {
      return null;
    }
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      return null;
    }
    if (endOfDay) {
      parsed.setHours(23, 59, 59, 999);
    }
    return parsed;
  }

  private buildCreatedDateClause(from?: string | null, to?: string | null): Prisma.OrderWhereInput | null {
    const gte = this.parseFilterDate(from ?? null, false);
    const lte = this.parseFilterDate(to ?? null, true);
    if (!gte && !lte) {
      return null;
    }
    const createdAt: Prisma.DateTimeFilter = {};
    if (gte) {
      createdAt.gte = gte;
    }
    if (lte) {
      createdAt.lte = lte;
    }
    return { createdAt } satisfies Prisma.OrderWhereInput;
  }

  private buildOrdersSearchClause(query: string): Prisma.OrderWhereInput {
    const contains = (value: string): Prisma.StringFilter => ({
      contains: value,
      mode: "insensitive"
    });

    return {
      OR: [
        { id: contains(query) },
        { user: { is: { email: contains(query) } } },
        { user: { is: { firstName: contains(query) } } },
        { user: { is: { lastName: contains(query) } } },
        { user: { is: { id: contains(query) } } },
        { enrollment: { is: { course: { is: { cohortCode: contains(query) } } } } },
        { enrollment: { is: { course: { is: { slug: contains(query) } } } } },
        { enrollment: { is: { course: { is: { titleRu: contains(query) } } } } },
        { enrollment: { is: { course: { is: { titleEn: contains(query) } } } } },
        { enrollment: { is: { id: contains(query) } } }
      ]
    };

  }

  private buildOrdersFacets(
    currencyRows: Array<{ currency: string | null }>,
    providerRows: Array<{ provider: PaymentProvider }>,
    cohortRows: Array<{ enrollment: { course: { slug: string | null; cohortCode: string | null; id: string } | null } | null }>
  ): AdminOrdersFeedFacets {
    const currencies = currencyRows
      .map(row => row.currency?.toUpperCase())
      .filter(isNonEmptyString)
      .filter((value, index, self) => self.indexOf(value) === index)
      .sort();

    const methods = providerRows
      .map(row => this.mapPaymentProviderLabel(row.provider))
      .filter(isNonEmptyString)
      .filter((value, index, self) => self.indexOf(value) === index)
      .sort();

    const cohorts = cohortRows
      .map(row => this.resolveCourseCohortCode(row.enrollment?.course))
      .filter(code => isNonEmptyString(code) && code !== "—")
      .filter((value, index, self) => self.indexOf(value) === index)
      .sort();

    return {
      currencies,
      methods,
      cohorts
    };
  }

  private mapOrderPaymentAttempt(payment: Payment): AdminOrderPaymentAttempt {
    const processedAt = payment.processedAt ?? new Date();
    return {
      id: payment.id,
      provider: this.mapPaymentProviderLabel(payment.provider),
      status: this.mapPaymentAttemptStatus(payment.status),
      amount: this.formatCurrency(payment.amount, payment.currency),
      processedAt: this.formatDateTime(processedAt),
      reference: payment.providerRef || undefined
    };
  }

  private buildOrderTimeline(
    order: OrderWithRelations,
    reminderState: { reminderCount: number; lastReminderIso: string | null },
    paymentLinks: AdminPaymentLinkEntry[],
    metadata: Record<string, unknown> | null
  ): AdminOrderTimelineEvent[] {
    const events: { date: Date; event: AdminOrderTimelineEvent }[] = [];
    const createdAt = order.createdAt ?? new Date();
    const refundMeta = this.extractRefundMeta(metadata);

    events.push({
      date: createdAt,
      event: {
        id: `${order.id}-created`,
        label: "Заказ создан",
        description: `Заказ оформлен на сумму ${this.formatCurrency(order.amount, order.currency)}.`,
        timestamp: this.formatDateTime(createdAt),
        tone: "info"
      }
    });

    const fallbackPaymentDate = order.updatedAt ?? order.createdAt ?? new Date();
    (order.payments ?? []).forEach(payment => {
      const paymentEvent = this.describePaymentTimelineEvent(payment, fallbackPaymentDate);
      events.push({
        date: paymentEvent.date,
        event: {
          id: `${payment.id}-payment`,
          label: paymentEvent.label,
          description: paymentEvent.description,
          timestamp: this.formatDateTime(paymentEvent.date),
          tone: paymentEvent.tone
        }
      });
    });

    if (reminderState.lastReminderIso) {
      const reminderDate = new Date(reminderState.lastReminderIso);
      const reminderText =
        reminderState.reminderCount > 1
          ? `Письмо №${reminderState.reminderCount} отправлено студенту.`
          : "Первое напоминание отправлено студенту.";
      events.push({
        date: reminderDate,
        event: {
          id: `${order.id}-reminder-${reminderState.reminderCount}`,
          label: "Отправлено напоминание",
          description: reminderText,
          timestamp: this.formatDateTime(reminderDate),
          tone: "warning"
        }
      });
    }

    paymentLinks.forEach(entry => {
      const timestamp = new Date(entry.createdAtIso);
      events.push({
        date: timestamp,
        event: {
          id: `${order.id}-payment-link-${entry.id}`,
          label: "Создана ссылка оплаты",
          description: `${this.mapPaymentProviderLabel(entry.provider)} · ${entry.locale.toUpperCase()}`,
          timestamp: this.formatDateTime(timestamp),
          tone: entry.simulated ? "muted" : "info"
        }
      });
    });

    const statusEvent = this.describeOrderStatusTimeline(order.status, order.updatedAt ?? order.createdAt, refundMeta.reason);
    if (statusEvent) {
      events.push({
        date: statusEvent.date,
        event: {
          id: `${order.id}-status-${order.status}`,
          label: statusEvent.label,
          description: statusEvent.description,
          timestamp: this.formatDateTime(statusEvent.date),
          tone: statusEvent.tone
        }
      });
    }

    return events
      .sort((a, b) => b.date.getTime() - a.date.getTime())
      .map(entry => entry.event);
  }

  private describeOrderStatusTimeline(
    status: OrderStatus,
    timestamp?: Date | null,
    refundReason?: string | null
  ): { label: string; description: string; tone: AdminTimelineTone; date: Date } | null {
    const date = timestamp ?? new Date();
    switch (status) {
      case "completed":
        return {
          label: "Заказ завершен",
          description: "Оплата подтверждена, заказ закрыт.",
          tone: "success",
          date
        };
      case "requires_action":
        return {
          label: "Требуются действия студента",
          description: "Система ожидает обновления способа оплаты или подтверждения.",
          tone: "warning",
          date
        };
      case "canceled":
        return {
          label: "Заказ отменен",
          description: "Заказ отменен вручную или автоматически.",
          tone: "muted",
          date
        };
      case "refunded":
        const reasonSuffix = refundReason ? ` Причина: ${refundReason}` : "";
        return {
          label: "Средства возвращены",
          description: `Платеж по заказу полностью возвращен студенту.${reasonSuffix}`.trim(),
          tone: "danger",
          date
        };
      default:
        return null;
    }
  }

  private describePaymentTimelineEvent(
    payment: Payment,
    fallbackDate: Date
  ): { date: Date; label: string; description: string; tone: AdminTimelineTone } {
    const date = payment.processedAt ?? fallbackDate;
    const amount = this.formatCurrency(payment.amount, payment.currency);
    const provider = this.mapPaymentProviderLabel(payment.provider);

    switch (payment.status) {
      case "succeeded":
        return {
          date,
          label: "Платеж подтвержден",
          description: `${amount} через ${provider} успешно зачислен.`,
          tone: "success"
        };
      case "failed":
        return {
          date,
          label: "Платеж отклонен",
          description: `${amount} через ${provider} отклонен провайдером.`,
          tone: "danger"
        };
      case "refunded":
        return {
          date,
          label: "Возврат платежа",
          description: `${amount} через ${provider} возвращен студенту.`,
          tone: "danger"
        };
      case "pending":
      default:
        return {
          date,
          label: "Платеж создан",
          description: `${amount} через ${provider} ожидает подтверждения.`,
          tone: "warning"
        };
    }
  }

  private mapModuleOutline(
    module: Prisma.ModuleGetPayload<{ include: { lessons: true } }> & { orderIndex?: number },
    meta: CourseSeoMeta | null,
    fallbackOwner: string
  ): AdminCourseModuleOutline {
    const moduleMeta = module.id && meta?.modules ? meta.modules[module.id] : undefined;
    const lessonsCount = moduleMeta?.lessons ?? module.lessons?.length ?? 0;
    const title = moduleMeta?.title?.trim() || module.titleRu || module.titleEn || `Модуль ${(module.orderIndex ?? 0) + 1}`;
    const owner = moduleMeta?.owner?.trim() || fallbackOwner || "Команда кураторов";
    const summary = moduleMeta?.summary?.trim() || module.summaryRu || module.summaryEn || undefined;
    const stage = moduleMeta?.stage ?? this.resolveModuleStageFromData(lessonsCount, summary);

    return {
      id: module.id,
      title,
      lessons: lessonsCount,
      owner,
      stage,
      summary: summary || undefined
    };
  }

  private mapQuizSettings(
    quiz: (Pick<Quiz, "id" | "passScore" | "attemptsLimit" | "timeLimitSeconds"> & Partial<Quiz>) | Quiz | null
  ): AdminLessonQuizSettings {
    if (!quiz) {
      return {
        id: null,
        passScore: 80,
        attemptsLimit: null,
        timeLimitSeconds: null
      };
    }

    return {
      id: quiz.id,
      passScore: quiz.passScore ?? 80,
      attemptsLimit: quiz.attemptsLimit ?? null,
      timeLimitSeconds: quiz.timeLimitSeconds ?? null
    };
  }

  private buildQuizSettingsPayload(dto: UpsertQuizSettingsDto) {
    const normalizedPassScore = Math.min(Math.max(dto.passScore, 1), 100);
    const normalizedAttempts =
      typeof dto.attemptsLimit === "number" && dto.attemptsLimit > 0 ? dto.attemptsLimit : null;
    const normalizedTimeLimit =
      typeof dto.timeLimitSeconds === "number" && dto.timeLimitSeconds > 0 ? dto.timeLimitSeconds : null;

    return {
      passScore: normalizedPassScore,
      attemptsLimit: normalizedAttempts,
      timeLimitSeconds: normalizedTimeLimit
    } satisfies Pick<Prisma.QuizCreateInput, "passScore" | "attemptsLimit" | "timeLimitSeconds">;
  }

  private mapLessonDetail(
    lesson: Prisma.LessonGetPayload<{
      include: { quiz: { select: { id: true; passScore: true; attemptsLimit: true; timeLimitSeconds: true } } }
    }>
  ): AdminLessonDetail {
    const quiz = lesson.quiz ? this.mapQuizSettings(lesson.quiz) : null;

    return {
      id: lesson.id,
      moduleId: lesson.moduleId,
      orderIndex: lesson.orderIndex,
      titleRu: lesson.titleRu,
      titleEn: lesson.titleEn,
      bodyRu: lesson.bodyRu,
      bodyEn: lesson.bodyEn,
      durationMinutes: lesson.durationMinutes ?? null,
      videoProvider: lesson.videoProvider,
      videoRef: lesson.videoRef,
      attachments: lesson.attachments,
      quizId: quiz?.id ?? null,
      quiz
    };
  }

  private buildLessonWritePayload(dto: UpsertLessonDto) {
    const sanitize = (value?: string | null) => {
      const trimmed = value?.trim();
      return trimmed && trimmed.length > 0 ? trimmed : null;
    };

    return {
      titleRu: dto.titleRu.trim(),
      titleEn: dto.titleEn?.trim() || dto.titleRu.trim(),
      bodyRu: sanitize(dto.bodyRu),
      bodyEn: sanitize(dto.bodyEn) ?? sanitize(dto.bodyRu),
      durationMinutes: dto.durationMinutes ?? null,
      videoProvider: sanitize(dto.videoProvider),
      videoRef: sanitize(dto.videoRef)
    } satisfies Pick<Prisma.LessonCreateInput, "titleRu" | "titleEn" | "bodyRu" | "bodyEn" | "durationMinutes" | "videoProvider" | "videoRef">;
  }

  private async assertModuleExists(moduleId: string): Promise<void> {
    const module = await this.prisma.module.findUnique({ where: { id: moduleId } });
    if (!module) {
      throw new NotFoundException(`Module ${moduleId} not found`);
    }
  }

  private async getNextLessonOrderIndex(moduleId: string): Promise<number> {
    const lastLesson = await this.prisma.lesson.findFirst({
      where: { moduleId },
      orderBy: { orderIndex: "desc" }
    });
    return (lastLesson?.orderIndex ?? 0) + 1;
  }

  private async resequenceLessons(moduleId: string): Promise<void> {
    const lessons = await this.prisma.lesson.findMany({
      where: { moduleId },
      orderBy: { orderIndex: "asc" },
      select: { id: true }
    });

    await this.prisma.$transaction(
      lessons.map((lesson, index) =>
        this.prisma.lesson.update({ where: { id: lesson.id }, data: { orderIndex: index + 1 } })
      )
    );
  }

  private mapSyntheticModule(
    moduleId: string,
    definition: NonNullable<CourseSeoMeta["modules"]>[string],
    fallbackOwner: string
  ): AdminCourseModuleOutline {
    return {
      id: moduleId,
      title: definition.title?.trim() || moduleId,
      lessons: definition.lessons ?? 0,
      owner: definition.owner?.trim() || fallbackOwner || "Команда кураторов",
      stage: definition.stage ?? "draft",
      summary: definition.summary?.trim() || undefined
    };
  }

  private resolveModuleStageFromData(lessonsCount: number, summary?: string | null): AdminModuleStage {
    if (lessonsCount <= 1 && !summary) {
      return "draft";
    }

    if (lessonsCount > 1 && !summary) {
      return "review";
    }

    return "published";
  }

  private formatShortDate(date?: Date | null): string {
    return this.activityFormatter.format(date ?? new Date());
  }

  private formatDateTime(date?: Date | null): string {
    return this.dateTimeFormatter.format(date ?? new Date());
  }

  private stripHtml(value: string): string {
    return value.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  }

  private resolveMentor(meta: CourseSeoMeta | null): string {
    return typeof meta?.mentor === "string" && meta.mentor.trim() ? meta.mentor.trim() : "Команда кураторов";
  }

  private resolveLanguage(meta: CourseSeoMeta | null): "RU" | "EN" {
    return meta?.language === "EN" ? "EN" : "RU";
  }

  private buildCourseMeta(dto: SaveCourseDraftDto, previous?: CourseSeoMeta | null): CourseSeoMeta {
    const language = dto.language === "EN" ? "EN" : "RU";
    const canonicalTitle = dto.titleRu || dto.titleEn || dto.cohort || "course";
    const canonicalDescription = dto.descriptionRu || dto.descriptionEn || "";
    const modules: NonNullable<CourseSeoMeta["modules"]> = {};
    (dto.modules ?? []).forEach((module, index) => {
      const moduleId = module.id?.trim() || `${this.slugify(dto.cohort || canonicalTitle)}-module-${index + 1}`;
      modules[moduleId] = {
        owner: module.owner.trim(),
        stage: module.stage,
        summary: module.summary?.trim(),
        lessons: module.lessons,
        title: module.title.trim(),
        order: index
      };
    });

    return {
      ...(previous ?? {}),
      mentor: dto.mentor.trim(),
      timezone: dto.timezone.trim(),
      startDate: dto.startDate.trim(),
      endDate: dto.endDate.trim(),
      capacity: dto.capacity.trim(),
      language,
      format: dto.format.trim(),
      seoTitle: dto.seoTitle?.trim() || previous?.seoTitle || canonicalTitle,
      seoDescription:
        dto.seoDescription?.trim() || previous?.seoDescription || this.stripHtml(canonicalDescription).slice(0, 240),
      seoKeywords: dto.seoKeywords?.trim() || previous?.seoKeywords || "",
      seoImage: dto.seoImage?.trim() || previous?.seoImage || "",
      modules
    };
  }

  private mapDraftStatusToCourseStatus(status: SaveCourseDraftDto["status"]): CourseStatus {
    switch (status) {
      case "archived":
        return "archived";
      case "enrollment":
        return "scheduled";
      case "maintenance":
      case "running":
      default:
        return "published";
    }
  }

  private slugify(value: string): string {
    return value
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .replace(/-{2,}/g, "-")
      || `course-${Date.now()}`;
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

  private resolveCourseCohortCode(course?: { cohortCode?: string | null; slug?: string | null; id?: string | null } | null): string {
    const normalized = this.normalizeCohortCode(course?.cohortCode);
    if (normalized) {
      return normalized;
    }
    const slug = course?.slug?.trim();
    if (slug) {
      return slug.toUpperCase();
    }
    return course?.id ?? "—";
  }

  private formatCurrency(value: Prisma.Decimal | number, currency?: string): string {
    const amount = this.decimalToNumber(value as Prisma.Decimal) ?? 0;
    const uppercaseCurrency = (currency || "USD").toUpperCase();
    const locale = uppercaseCurrency === "RUB" ? "ru-RU" : uppercaseCurrency === "KZT" ? "kk-KZ" : "en-US";
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: uppercaseCurrency,
      maximumFractionDigits: uppercaseCurrency === "RUB" || uppercaseCurrency === "KZT" ? 0 : 2
    }).format(amount);
  }

  private resolveOrderPaymentStatus(payments: Payment[]): AdminOrderRecord["paymentStatus"] {
    if (payments.some(payment => payment.status === "succeeded")) {
      return "paid";
    }

    if (payments.some(payment => payment.status === "failed" || payment.status === "refunded")) {
      return "failed";
    }

    return "pending";
  }

  private resolvePaymentProvider(payments: Payment[]): string {
    return this.mapPaymentProviderLabel(payments[0]?.provider);
  }

  private mapPaymentProviderLabel(provider?: string | null): string {
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

  private normalizeProvider(value: unknown): PaymentProvider {
    if (value === "stripe" || value === "yookassa" || value === "cloudpayments" || value === "manual") {
      return value;
    }
    return "manual";
  }

  private normalizePaymentLinkEntry(entry: unknown): AdminPaymentLinkEntry | null {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
      return null;
    }

    const record = entry as Record<string, unknown>;
    const url = typeof record.url === "string" ? record.url : null;
    const id = typeof record.id === "string" ? record.id : null;
    if (!url || !id) {
      return null;
    }

    const provider = this.normalizeProvider(record.provider);
    const localeValue = typeof record.locale === "string" ? record.locale.toLowerCase() : "ru";
    const locale: SupportedLocale = localeValue === "en" ? "en" : "ru";
    const createdAtRaw = record.createdAt;
    const isoCandidate =
      typeof record.createdAtIso === "string"
        ? record.createdAtIso
        : typeof createdAtRaw === "string"
          ? createdAtRaw
          : createdAtRaw instanceof Date
            ? createdAtRaw.toISOString()
            : typeof createdAtRaw === "number"
              ? new Date(createdAtRaw).toISOString()
              : "";
    const parsedDate = isoCandidate ? new Date(isoCandidate) : new Date();
    const normalizedDate = Number.isNaN(parsedDate.getTime()) ? new Date() : parsedDate;
    const createdAtIso = normalizedDate.toISOString();
    const createdAt = this.formatDateTime(normalizedDate);
    const paymentId = typeof record.paymentId === "string" ? record.paymentId : null;
    const providerRef = typeof record.providerRef === "string" ? record.providerRef : null;
    const simulated = typeof record.simulated === "boolean" ? record.simulated : false;

    return {
      id,
      url,
      provider,
      locale,
      createdAt,
      createdAtIso,
      paymentId,
      providerRef,
      simulated
    };
  }

  private generatePaymentLinkEntryId(orderId: string): string {
    const randomPart = Math.random().toString(36).slice(2, 8);
    return `${orderId}-pl-${Date.now()}-${randomPart}`;
  }

  private mapPaymentAttemptStatus(status: PaymentStatus): AdminOrderPaymentAttempt["status"] {
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

  private normalizeMetadata(metadata: Prisma.JsonValue | null): Record<string, unknown> | null {
    if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
      return null;
    }
    return metadata as Record<string, unknown>;
  }

  private serializePaymentLinkEntry(entry: AdminPaymentLinkEntry): Record<string, Prisma.InputJsonValue> {
    const payload: Record<string, Prisma.InputJsonValue> = {
      id: entry.id,
      url: entry.url,
      provider: entry.provider,
      locale: entry.locale,
      createdAt: entry.createdAt,
      createdAtIso: entry.createdAtIso,
      simulated: entry.simulated
    };

    if (entry.paymentId) {
      payload.paymentId = entry.paymentId;
    }

    if (entry.providerRef) {
      payload.providerRef = entry.providerRef;
    }

    return payload;
  }

  private extractLastPaymentLink(metadata: Record<string, unknown> | null): AdminLastPaymentLink | null {
    if (!metadata || typeof metadata !== "object") {
      return null;
    }

    const raw = (metadata as Record<string, unknown> & { lastPaymentLink?: unknown }).lastPaymentLink;
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
      return null;
    }

    const normalized = this.normalizePaymentLinkEntry(raw);
    return normalized ?? null;
  }

  private extractPaymentLinkHistory(metadata: Record<string, unknown> | null): AdminPaymentLinkEntry[] {
    if (!metadata || typeof metadata !== "object") {
      return [];
    }

    const raw = (metadata as Record<string, unknown> & { paymentLinks?: unknown }).paymentLinks;
    if (!Array.isArray(raw)) {
      return [];
    }

    return raw
      .map(entry => this.normalizePaymentLinkEntry(entry))
      .filter((entry): entry is AdminPaymentLinkEntry => Boolean(entry));
  }

  private extractRefundMeta(metadata: Record<string, unknown> | null): {
    reason: string | null;
    processedAt: string | null;
    paymentIds: string[];
  } {
    if (!metadata || typeof metadata !== "object") {
      return { reason: null, processedAt: null, paymentIds: [] };
    }

    const raw = (metadata as Record<string, unknown> & { refund?: unknown }).refund;
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
      return { reason: null, processedAt: null, paymentIds: [] };
    }

    const record = raw as Record<string, unknown>;
    const processedAt = typeof record.processedAt === "string" ? record.processedAt : null;
    const paymentIds = Array.isArray(record.paymentIds)
      ? record.paymentIds.filter((id): id is string => typeof id === "string")
      : [];
    const reasonValue = typeof record.reason === "string" ? record.reason.trim() : "";
    const reason = reasonValue ? reasonValue : null;

    return { reason, processedAt, paymentIds };
  }

  private extractReminderMeta(metadata: Record<string, unknown> | null): {
    reminderCount: number;
    lastReminderIso: string | null;
  } {
    if (metadata && "reminders" in metadata) {
      const reminders = (metadata as Record<string, unknown> & { reminders?: unknown }).reminders;
      if (reminders && typeof reminders === "object" && !Array.isArray(reminders)) {
        const record = reminders as Record<string, unknown>;
        const reminderCount = typeof record.count === "number" ? record.count : 0;
        const lastReminderIso = typeof record.lastSentAt === "string" ? record.lastSentAt : null;
        return { reminderCount, lastReminderIso };
      }
    }

    return { reminderCount: 0, lastReminderIso: null };
  }

  private decimalToNumber(value?: Prisma.Decimal | null): number | null {
    if (!value) {
      return null;
    }

    if (typeof value === "number") {
      return value;
    }

    const decimalCandidate = value as unknown as { toNumber?: () => number; toString?: () => string };
    if (typeof decimalCandidate.toNumber === "function") {
      return decimalCandidate.toNumber();
    }

    if (typeof decimalCandidate.toString === "function") {
      const parsed = Number(decimalCandidate.toString());
      return Number.isNaN(parsed) ? null : parsed;
    }

    return null;
  }
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}
