import "server-only";
import { getAppConfig } from "@virgo/config";
import {
  applyOrdersFilters,
  buildOrdersFilterQuery,
  defaultOrdersFilters,
  type OrdersFilters
} from "./orders-filters";

interface StatTile {
  id: string;
  label: string;
  value: string;
  trend: string;
}

export interface CourseSummary {
  id: string;
  title: string;
  mentor: string;
  cohort: string;
  students: number;
  status: "running" | "enrollment" | "maintenance" | "archived";
  updatedAt: string;
}

export type ModuleStage = "draft" | "review" | "published";

export interface CourseModuleOutline {
  id: string;
  title: string;
  lessons: number;
  owner: string;
  stage: ModuleStage;
  summary?: string;
}

export interface ModuleDraftInput {
  id?: string;
  title: string;
  lessons: number;
  owner: string;
  stage: ModuleStage;
  summary?: string;
}

export interface CourseDetail extends CourseSummary {
  titleRu: string;
  titleEn: string;
  description: string;
  descriptionRu: string;
  descriptionEn: string;
  language: string;
  timezone: string;
  format: string;
  startDate: string;
  endDate: string;
  capacity: string;
  seoTitle: string;
  seoDescription: string;
  seoKeywords: string;
  seoImage: string;
  modules: CourseModuleOutline[];
}

export interface CourseDraftInput {
  titleRu: string;
  titleEn?: string;
  mentor: string;
  cohort: string;
  status: CourseSummary["status"];
  descriptionRu: string;
  descriptionEn?: string;
  language: string;
  timezone: string;
  format: string;
  startDate: string;
  endDate: string;
  capacity: string;
  seoTitle: string;
  seoDescription: string;
  seoKeywords: string;
  seoImage: string;
  modules: ModuleDraftInput[];
}

export interface StudentProfile {
  id: string;
  name: string;
  cohort: string;
  course: string;
  progress: number;
  paymentStatus: "paid" | "overdue" | "trial";
  lastActivity: string;
}

export interface ManualEnrollmentInput {
  userId: string;
  courseId: string;
  status?: "active" | "paused" | "completed";
  accessStart?: string;
  accessEnd?: string;
  note?: string;
}

export interface CohortSummary {
  id: string;
  label: string;
  course: string;
  stage: "running" | "enrollment" | "wrap-up";
  capacity: string;
  startDate: string;
  endDate: string;
  timezone: string;
}

export interface PaymentRecord {
  id: string;
  student: string;
  cohort: string;
  amount: string;
  status: "paid" | "pending" | "failed";
  processedAt: string;
  method: string;
}

export interface OrderRecord {
  id: string;
  student: string;
  cohort: string;
  amount: string;
  status: "pending" | "requires_action" | "completed" | "canceled" | "refunded";
  paymentStatus: "paid" | "pending" | "failed";
  method: string;
  currency: string;
  createdAt: string;
  createdAtIso: string;
  updatedAt: string;
  updatedAtIso: string;
}

export interface OrdersFeedPage {
  items: OrderRecord[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
  facets: OrdersFilterFacets;
}

export interface OrdersFilterFacets {
  methods: string[];
  currencies: string[];
  cohorts: string[];
}

export interface OrderPaymentAttempt {
  id: string;
  provider: string;
  status: "paid" | "pending" | "failed";
  amount: string;
  processedAt: string;
  reference?: string;
}

export type OrderTimelineTone = "info" | "success" | "warning" | "danger" | "muted";

export interface OrderTimelineEvent {
  id: string;
  label: string;
  description: string;
  timestamp: string;
  tone: OrderTimelineTone;
}

export interface OrderBillingProfile {
  fullName: string;
  email: string;
  companyName?: string | null;
  taxId?: string | null;
  address?: string | null;
  phone?: string | null;
  updatedAt: string | null;
}

export type InvoiceStatusValue = "pending" | "issued" | "failed";

export interface OrderInvoiceDetail {
  id: string;
  status: InvoiceStatusValue;
  downloadUrl?: string | null;
  notes?: string | null;
  requestedAt: string;
  profileSnapshot?: Record<string, unknown> | null;
}

export interface OrderDetail extends OrderRecord {
  type: "one_time" | "subscription";
  currency: string;
  studentEmail: string;
  studentId: string;
  courseId: string | null;
  courseTitle: string;
  enrollmentId: string | null;
  metadata: Record<string, unknown> | null;
  lastPaymentLink: PaymentLinkSummary | null;
  paymentLinkHistory: PaymentLinkHistoryEntry[];
  paymentAttempts: OrderPaymentAttempt[];
  refundReason: string | null;
  refundProcessedAt: string | null;
  createdAtFull: string;
  updatedAtFull: string;
  reminderCount: number;
  lastReminderAt: string | null;
  timeline: OrderTimelineEvent[];
  billingProfile: OrderBillingProfile | null;
  invoice: OrderInvoiceDetail | null;
}

export interface PaymentLinkSummary {
  id: string;
  url: string;
  provider: string;
  locale: "ru" | "en";
  createdAt: string;
  createdAtIso: string;
  paymentId: string | null;
  providerRef: string | null;
  simulated: boolean;
}

export interface PaymentLinkHistoryEntry extends PaymentLinkSummary {}

export interface ModuleDirectoryRecord {
  id: string;
  moduleTitle: string;
  courseId: string;
  courseTitle: string;
  stage: ModuleStage;
  owner: string;
  lessons: number;
  updatedAt: string;
  language: "RU" | "EN";
}

export interface UserDirectoryRecord {
  id: string;
  name: string;
  email: string;
  roles: string[];
  roleCodes: string[];
  locale: string;
  timezone: string;
  createdAt: string;
  lastActiveAt: string;
}

export interface RoleOption {
  code: string;
  name: string;
}

export interface LessonDetail {
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
  attachments?: unknown;
  quizId?: string | null;
  quiz?: LessonQuizSettings | null;
}

export interface LessonDraftInput {
  titleRu: string;
  titleEn?: string;
  bodyRu?: string;
  bodyEn?: string;
  durationMinutes?: number | null;
  videoProvider?: string;
  videoRef?: string;
}

export interface LessonQuizSettings {
  id: string | null;
  passScore: number;
  attemptsLimit: number | null;
  timeLimitSeconds: number | null;
}

export interface LessonQuizInput {
  passScore: number;
  attemptsLimit?: number | null;
  timeLimitSeconds?: number | null;
}

export interface MediaAssetRecord {
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

export interface MediaUploadRequest {
  filename: string;
  mimeType?: string;
  sizeBytes?: number;
  type?: string;
}

export interface MediaUploadTicket {
  assetId: string;
  storageKey: string;
  uploadUrl: string;
  previewUrl: string;
  expiresAt: string;
  headers: Record<string, string>;
}

export interface SeoLocaleFields {
  title: string;
  description: string;
  keywords: string;
}

export interface SeoPageConfig {
  id: string;
  label: string;
  slug: string;
  image: string;
  locales: Record<"ru" | "en", SeoLocaleFields>;
}

export interface SeoSettings {
  updatedAt: string;
  pages: SeoPageConfig[];
}

export interface ProgressAutomationSettings {
  webhookUrl: string | null;
  enabled: boolean;
  updatedAt: string;
  activeUrl: string | null;
  activeSource: "env" | "settings" | "disabled";
}

export interface ProgressAutomationUpdateInput {
  webhookUrl: string | null;
  enabled: boolean;
}

export interface ProgressAutomationWebhookPayload {
  userId: string;
  userEmail?: string | null;
  userName?: string | null;
  courseId?: string | null;
  moduleId?: string | null;
  lessonId: string;
  completedAt: string;
}

export interface ProgressAutomationTestResult {
  delivered: boolean;
  targetUrl: string | null;
  payload: ProgressAutomationWebhookPayload;
}

export interface DunningRunEntry {
  orderId: string;
  reminderCount: number;
  lastReminderAt: string;
  lastReminderAtIso: string;
}

export interface DunningRunResult {
  evaluated: number;
  remindersSent: number;
  dryRun: boolean;
  overdueDays: number;
  reminderIntervalHours: number;
  entries: DunningRunEntry[];
}

export interface DunningRunInput {
  limit?: number;
  dryRun?: boolean;
}

const { apiBaseUrl } = getAppConfig();
const requestOptions: RequestInit = { cache: "no-store" };

const lessonFallbackByModule: Record<string, LessonDetail[]> = {
  "ux-1": [
    {
      id: "ux-1-lesson-1",
      moduleId: "ux-1",
      orderIndex: 1,
      titleRu: "Подготовка гайда",
      titleEn: "Interview prep",
      bodyRu: "Разбираем структуру глубинного интервью и подбираем вопросы.",
      bodyEn: "Structure a discovery interview and pick strong prompts.",
      durationMinutes: 45,
      videoProvider: "vimeo",
      videoRef: "872341201",
      attachments: [{ type: "doc", label: "Скрипт интервью" }],
      quizId: null,
      quiz: null
    },
    {
      id: "ux-1-lesson-2",
      moduleId: "ux-1",
      orderIndex: 2,
      titleRu: "Проведение интервью",
      titleEn: "Running the session",
      bodyRu: "Практикуемся в вопросах, уточняем метрики успеха и сигналы.",
      bodyEn: "Run interviews, capture success metrics and insights.",
      durationMinutes: 50,
      videoProvider: "vimeo",
      videoRef: "872341202",
      attachments: [{ type: "sheet", label: "Матрица инсайтов" }],
      quizId: null,
      quiz: null
    }
  ],
  "pm-2": [
    {
      id: "pm-2-lesson-1",
      moduleId: "pm-2",
      orderIndex: 1,
      titleRu: "Формулы ростовых экспериментов",
      titleEn: "Growth experiment formulas",
      bodyRu: "Сравниваем ICE, PIE и PXL для приоритизации.",
      bodyEn: "ICE vs PIE vs PXL frameworks for prioritisation.",
      durationMinutes: 35,
      videoProvider: "loom",
      videoRef: "pxl-demo",
      attachments: null,
      quizId: null,
      quiz: null
    }
  ]
};

function findFallbackLessonById(lessonId: string): { moduleId: string; lesson: LessonDetail } | null {
  for (const [moduleId, lessons] of Object.entries(lessonFallbackByModule)) {
    const lesson = lessons.find(entry => entry.id === lessonId);
    if (lesson) {
      return { moduleId, lesson };
    }
  }
  return null;
}

function getFallbackQuizSettings(lesson: LessonDetail): LessonQuizSettings {
  if (lesson.quiz) {
    return lesson.quiz;
  }
  return {
    id: lesson.quizId ?? null,
    passScore: 80,
    attemptsLimit: null,
    timeLimitSeconds: null
  };
}

const usersFallback: UserDirectoryRecord[] = [
  {
    id: "user-01",
    name: "Анна Кузнецова",
    email: "anna@virgo.school",
    roles: ["Admin"],
    roleCodes: ["admin"],
    locale: "RU",
    timezone: "Europe/Moscow",
    createdAt: "03 сен",
    lastActiveAt: "18 ноя"
  },
  {
    id: "user-02",
    name: "Michael Rivera",
    email: "michael@virgo.school",
    roles: ["Content", "Mentor"],
    roleCodes: ["manager"],
    locale: "EN",
    timezone: "UTC",
    createdAt: "12 окт",
    lastActiveAt: "17 ноя"
  },
  {
    id: "user-03",
    name: "—",
    email: "support@virgo.school",
    roles: ["Support"],
    roleCodes: ["support"],
    locale: "RU",
    timezone: "Europe/Moscow",
    createdAt: "28 авг",
    lastActiveAt: "15 ноя"
  }
];

const roleOptionsFallback: RoleOption[] = [
  { code: "admin", name: "Администратор" },
  { code: "manager", name: "Менеджер" },
  { code: "support", name: "Поддержка" }
];

const mediaLibraryFallback: MediaAssetRecord[] = [
  {
    id: "asset-hero",
    label: "hero-cover.jpg",
    type: "image",
    mimeType: "image/jpeg",
    size: "620 KB",
    sizeBytes: 635000,
    storageKey: "uploads/20250101/hero-cover.jpg",
    url: "https://images.unsplash.com/photo-1529333166437-7750a6dd5a70",
    createdAt: "01 дек · 14:22"
  },
  {
    id: "asset-trailer",
    label: "program-trailer.mp4",
    type: "video",
    mimeType: "video/mp4",
    size: "38 MB",
    sizeBytes: 39800000,
    storageKey: "uploads/20250101/program-trailer.mp4",
    url: "https://storage.googleapis.com/coverr-main/mp4/Mt_Baker.mp4",
    createdAt: "28 ноя · 10:04"
  },
  {
    id: "asset-guide",
    label: "style-guide.pdf",
    type: "document",
    mimeType: "application/pdf",
    size: "4.8 MB",
    sizeBytes: 4800000,
    storageKey: "uploads/20241130/style-guide.pdf",
    url: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
    createdAt: "28 ноя · 09:12"
  }
];

const seoSettingsFallback: SeoSettings = {
  updatedAt: new Date(0).toISOString(),
  pages: [
    {
      id: "home",
      label: "Главная",
      slug: "/",
      image: "https://images.unsplash.com/photo-1529333166437-7750a6dd5a70",
      locales: {
        ru: {
          title: "Virgo School — практические программы",
          description: "Развивайте цифровые навыки вместе с комьюнити Virgo.",
          keywords: "virgo school, обучение, курсы"
        },
        en: {
          title: "Virgo School — pragmatic learning",
          description: "Master product craft in live cohorts and focused sprints.",
          keywords: "virgo school, cohorts"
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
          description: "Узнайте, как Virgo School соединяет стратегию, ремесло и технологии через гибридные лаборатории.",
          keywords: "virgo school, о школе, наставники"
        },
        en: {
          title: "About Virgo School — Mission, mentors, and methodology",
          description: "Learn how Virgo School blends strategy, craft, and technology via hybrid labs and measurable outcomes.",
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
          description: "Выберите программу по продукту, дизайну или маркетингу.",
          keywords: "virgo курсы, каталог"
        },
        en: {
          title: "Virgo course catalog",
          description: "Explore Virgo programs covering product, design and leadership.",
          keywords: "virgo courses, catalog"
        }
      }
    }
  ]
};

const progressAutomationFallback: ProgressAutomationSettings = {
  webhookUrl: null,
  enabled: false,
  updatedAt: new Date(0).toISOString(),
  activeUrl: null,
  activeSource: "disabled"
};

const dunningRunFallback: DunningRunResult = {
  evaluated: 0,
  remindersSent: 0,
  dryRun: true,
  overdueDays: 3,
  reminderIntervalHours: 24,
  entries: []
};

function getLessonFallback(moduleId: string): LessonDetail[] {
  const lessons = lessonFallbackByModule[moduleId];
  return lessons ? lessons.map(lesson => ({ ...lesson })) : [];
}

function resequenceFallback(moduleId: string) {
  const lessons = [...(lessonFallbackByModule[moduleId] ?? [])].sort((a, b) => a.orderIndex - b.orderIndex);
  lessonFallbackByModule[moduleId] = lessons.map((lesson, index) => ({
    ...lesson,
    orderIndex: index + 1
  }));
}

async function fetchCollection<T>(path: string, fallback: T[]): Promise<T[]> {
  if (!apiBaseUrl) {
    return fallback;
  }

  try {
    const res = await fetch(`${apiBaseUrl}${path}`, requestOptions);
    if (!res.ok) {
      return fallback;
    }
    const data = (await res.json()) as T[];
    return Array.isArray(data) && data.length ? data : fallback;
  } catch {
    return fallback;
  }
}

async function fetchResource<T>(path: string, fallback: T): Promise<T> {
  if (!apiBaseUrl) {
    return fallback;
  }

  try {
    const res = await fetch(`${apiBaseUrl}${path}`, requestOptions);
    if (!res.ok) {
      return fallback;
    }
    const data = (await res.json()) as T;
    return data ?? fallback;
  } catch {
    return fallback;
  }
}

export async function getMediaLibrary(limit = 24): Promise<MediaAssetRecord[]> {
  if (!apiBaseUrl) {
    return mediaLibraryFallback.slice(0, limit);
  }

  const params = new URLSearchParams();
  if (limit) {
    params.set("limit", String(limit));
  }
  const query = params.toString();
  const endpoint = query ? `${apiBaseUrl}/admin/media/assets?${query}` : `${apiBaseUrl}/admin/media/assets`;

  try {
    const res = await fetch(endpoint, requestOptions);
    if (!res.ok) {
      return mediaLibraryFallback.slice(0, limit);
    }
    const data = (await res.json()) as MediaAssetRecord[];
    return Array.isArray(data) && data.length ? data : mediaLibraryFallback.slice(0, limit);
  } catch {
    return mediaLibraryFallback.slice(0, limit);
  }
}

export async function requestMediaUpload(input: MediaUploadRequest): Promise<MediaUploadTicket> {
  if (!apiBaseUrl) {
    throw new Error("API base URL is not configured");
  }

  const res = await fetch(`${apiBaseUrl}/admin/media/uploads`, {
    ...requestOptions,
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(input)
  });

  if (!res.ok) {
    throw new Error("Не удалось получить ссылку загрузки");
  }

  return (await res.json()) as MediaUploadTicket;
}

export async function getSeoSettings(): Promise<SeoSettings> {
  if (!apiBaseUrl) {
    return seoSettingsFallback;
  }

  try {
    const res = await fetch(`${apiBaseUrl}/admin/seo`, requestOptions);
    if (!res.ok) {
      return seoSettingsFallback;
    }
    const data = (await res.json()) as SeoSettings;
    return data ?? seoSettingsFallback;
  } catch {
    return seoSettingsFallback;
  }
}

export async function updateSeoSettings(payload: SeoSettings): Promise<SeoSettings> {
  if (!apiBaseUrl) {
    throw new Error("API base URL is not configured");
  }

  const res = await fetch(`${apiBaseUrl}/admin/seo`, {
    ...requestOptions,
    method: "PUT",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ pages: payload.pages })
  });

  if (!res.ok) {
    throw new Error("Не удалось обновить SEO настройки");
  }

  return (await res.json()) as SeoSettings;
}

export async function getProgressAutomationSettings(): Promise<ProgressAutomationSettings> {
  if (!apiBaseUrl) {
    return progressAutomationFallback;
  }

  try {
    const res = await fetch(`${apiBaseUrl}/admin/automation/progress`, requestOptions);
    if (!res.ok) {
      return progressAutomationFallback;
    }
    const data = (await res.json()) as ProgressAutomationSettings;
    return data ?? progressAutomationFallback;
  } catch {
    return progressAutomationFallback;
  }
}

export async function updateProgressAutomationSettings(
  payload: ProgressAutomationUpdateInput
): Promise<ProgressAutomationSettings> {
  if (!apiBaseUrl) {
    throw new Error("API base URL is not configured");
  }

  const res = await fetch(`${apiBaseUrl}/admin/automation/progress`, {
    ...requestOptions,
    method: "PUT",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    throw new Error("Не удалось обновить настройки автоматизации");
  }

  return (await res.json()) as ProgressAutomationSettings;
}

export async function triggerProgressAutomationTest(): Promise<ProgressAutomationTestResult> {
  if (!apiBaseUrl) {
    throw new Error("API base URL is not configured");
  }

  const res = await fetch(`${apiBaseUrl}/admin/automation/progress/test`, {
    ...requestOptions,
    method: "POST"
  });

  if (!res.ok) {
    throw new Error("Не удалось отправить тестовый вебхук");
  }

  return (await res.json()) as ProgressAutomationTestResult;
}

export async function runDunningAutomation(payload: DunningRunInput = {}): Promise<DunningRunResult> {
  if (!apiBaseUrl) {
    const now = new Date();
    const simulatedEntry: DunningRunEntry | null = payload.dryRun
      ? null
      : {
          orderId: `demo-order-${now.getTime()}`,
          reminderCount: 1,
          lastReminderAt: new Intl.DateTimeFormat("ru-RU", {
            day: "2-digit",
            month: "short",
            hour: "2-digit",
            minute: "2-digit"
          }).format(now),
          lastReminderAtIso: now.toISOString()
        };

    return {
      ...dunningRunFallback,
      dryRun: Boolean(payload.dryRun ?? true),
      evaluated: payload.limit ?? 5,
      remindersSent: simulatedEntry ? 1 : 0,
      entries: simulatedEntry ? [simulatedEntry] : []
    };
  }

  const res = await fetch(`${apiBaseUrl}/admin/automation/dunning/run`, {
    ...requestOptions,
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    throw new Error("Не удалось запустить dunning");
  }

  return (await res.json()) as DunningRunResult;
}

export async function getDashboardStats(): Promise<StatTile[]> {
  const fallback: StatTile[] = [
    { id: "revenue", label: "Выручка 30д", value: "$42k", trend: "128 оплаченных заказов" },
    { id: "students", label: "Активные студенты", value: "1 248", trend: "+42 новых за 7д" },
    { id: "pipeline", label: "Воронка заказов", value: "37", trend: "без возвратов" },
    { id: "avgTicket", label: "Средний чек", value: "$329", trend: "128 заказов за 30д" }
  ];

  return fetchCollection("/admin/dashboard", fallback);
}

export async function getCourseSummaries(): Promise<CourseSummary[]> {
  const fallback: CourseSummary[] = [
    {
      id: "ux-0425",
      title: "UX Research Sprint",
      mentor: "Екатерина Белова",
      cohort: "UX-0425",
      students: 28,
      status: "running",
      updatedAt: "18 ноя"
    },
    {
      id: "pm-0325",
      title: "Product Growth Playbook",
      mentor: "Сергей Алексеев",
      cohort: "PM-0325",
      students: 41,
      status: "enrollment",
      updatedAt: "17 ноя"
    },
    {
      id: "qa-0525",
      title: "QA Automation Weekend",
      mentor: "Мария Долгова",
      cohort: "QA-0525",
      students: 19,
      status: "maintenance",
      updatedAt: "15 ноя"
    },
    {
      id: "ml-0224",
      title: "ML Ops Essentials",
      mentor: "Данила Кац",
      cohort: "ML-0224",
      students: 36,
      status: "archived",
      updatedAt: "01 сен"
    }
  ];

  return fetchCollection("/admin/courses", fallback);
}

const courseDetailFallback: Record<string, CourseDetail> = {
  "ux-0425": {
    id: "ux-0425",
    title: "UX Research Sprint",
    titleRu: "UX Research Sprint",
    titleEn: "UX Research Sprint",
    mentor: "Екатерина Белова",
    cohort: "UX-0425",
    students: 28,
    status: "running",
    updatedAt: "18 ноя",
    description: "Интенсив по исследованию пользователей и проверке гипотез в цифровых продуктах.",
    descriptionRu: "Интенсив по исследованию пользователей и проверке гипотез в цифровых продуктах.",
    descriptionEn: "Intensive on user research and validating product hypotheses.",
    language: "RU",
    timezone: "MSK",
    format: "Online live",
    startDate: "04 ноя",
    endDate: "20 дек",
    capacity: "28 / 32",
    seoTitle: "UX Research Sprint — Virgo School",
    seoDescription: "Интенсив по исследованию пользователей и проверке гипотез в цифровых продуктах.",
    seoKeywords: "ux research, интервью, cjm",
    seoImage: "https://cdn.virgo.school/seo/ux-research.jpg",
    modules: [
      {
        id: "ux-1",
        title: "Discovery интервью",
        lessons: 6,
        owner: "Катя Белова",
        stage: "published",
        summary: "Погружаемся в интервью и карты эмпатии"
      },
      {
        id: "ux-2",
        title: "Customer Journey",
        lessons: 5,
        owner: "Катя Белова",
        stage: "review",
        summary: "От сценариев до CJM"
      }
    ]
  },
  "pm-0325": {
    id: "pm-0325",
    title: "Product Growth Playbook",
    titleRu: "Product Growth Playbook",
    titleEn: "Product Growth Playbook",
    mentor: "Сергей Алексеев",
    cohort: "PM-0325",
    students: 41,
    status: "enrollment",
    updatedAt: "17 ноя",
    description: "Программа по росту продуктовых метрик и систематизации экспериментов.",
    descriptionRu: "Программа по росту продуктовых метрик и систематизации экспериментов.",
    descriptionEn: "Program about product growth metrics and a structured experimentation cadence.",
    language: "RU",
    timezone: "MSK",
    format: "Blended",
    startDate: "25 ноя",
    endDate: "12 фев",
    capacity: "41 / 60",
    seoTitle: "Product Growth Playbook",
    seoDescription: "Ростовые эксперименты и аналитика для продуктовых команд.",
    seoKeywords: "growth, продукт, эксперименты",
    seoImage: "https://cdn.virgo.school/seo/pm-growth.jpg",
    modules: [
      {
        id: "pm-1",
        title: "Growth стратегия",
        lessons: 4,
        owner: "Сергей Алексеев",
        stage: "draft",
        summary: "Определяем эксперименты и North Star"
      },
      {
        id: "pm-2",
        title: "Эксперименты и аналитика",
        lessons: 7,
        owner: "Алина Ермакова",
        stage: "review",
        summary: "Фреймворки ICE, PIE и бэклоги"
      }
    ]
  },
  "qa-0525": {
    id: "qa-0525",
    title: "QA Automation Weekend",
    titleRu: "QA Automation Weekend",
    titleEn: "QA Automation Weekend",
    mentor: "Мария Долгова",
    cohort: "QA-0525",
    students: 19,
    status: "maintenance",
    updatedAt: "15 ноя",
    description: "Практический курс по автоматизации тестирования c Java и Playwright.",
    descriptionRu: "Практический курс по автоматизации тестирования c Java и Playwright.",
    descriptionEn: "Hands-on automation course covering Java and Playwright flows.",
    language: "RU",
    timezone: "MSK",
    format: "Weekend",
    startDate: "10 сен",
    endDate: "22 ноя",
    capacity: "19 / 24",
    seoTitle: "QA Automation Weekend",
    seoDescription: "Практический курс по автоматизации тестирования c Java и Playwright.",
    seoKeywords: "qa, automation, playwright",
    seoImage: "https://cdn.virgo.school/seo/qa-weekend.jpg",
    modules: [
      {
        id: "qa-1",
        title: "Автотесты как код",
        lessons: 5,
        owner: "Мария Долгова",
        stage: "published",
        summary: "Подготовка инфраструктуры и PageObject"
      },
      {
        id: "qa-2",
        title: "CI/CD и отчеты",
        lessons: 4,
        owner: "Олег Дроздов",
        stage: "draft",
        summary: "Интеграция с GitHub Actions и Allure"
      }
    ]
  },
  "ml-0224": {
    id: "ml-0224",
    title: "ML Ops Essentials",
    titleRu: "ML Ops Essentials",
    titleEn: "ML Ops Essentials",
    mentor: "Данила Кац",
    cohort: "ML-0224",
    students: 36,
    status: "archived",
    updatedAt: "01 сен",
    description: "Запуск ML Pipelines и поддержка моделей в продакшене на Kubernetes.",
    descriptionRu: "Запуск ML Pipelines и поддержка моделей в продакшене на Kubernetes.",
    descriptionEn: "Run ML pipelines and productionize models on Kubernetes.",
    language: "EN",
    timezone: "UTC+3",
    format: "Online self-paced",
    startDate: "02 июл",
    endDate: "30 сен",
    capacity: "36 / 40",
    seoTitle: "ML Ops Essentials",
    seoDescription: "Запуск ML Pipelines и поддержка моделей в продакшене на Kubernetes.",
    seoKeywords: "mlops, pipelines, kubernetes",
    seoImage: "https://cdn.virgo.school/seo/ml-ops.jpg",
    modules: [
      {
        id: "ml-1",
        title: "ML Pipelines",
        lessons: 8,
        owner: "Данила Кац",
        stage: "published",
        summary: "Feature Store, Kubeflow и деплой"
      },
      {
        id: "ml-2",
        title: "Observability",
        lessons: 6,
        owner: "Игорь Иваницкий",
        stage: "review",
        summary: "Мониторинг и алерты для моделей"
      }
    ]
  }
};

export async function getCourseDetail(courseId: string): Promise<CourseDetail | null> {
  if (!apiBaseUrl) {
    return courseDetailFallback[courseId] ?? null;
  }

  try {
    const res = await fetch(`${apiBaseUrl}/admin/courses/${courseId}`, requestOptions);
    if (!res.ok) {
      return null;
    }
    return (await res.json()) as CourseDetail;
  } catch {
    return courseDetailFallback[courseId] ?? null;
  }
}

export async function getModuleDirectory(): Promise<ModuleDirectoryRecord[]> {
  const fallback: ModuleDirectoryRecord[] = [
    {
      id: "ux-1",
      moduleTitle: "Discovery интервью",
      courseId: "ux-0425",
      courseTitle: "UX Research Sprint",
      stage: "published",
      owner: "Катя Белова",
      lessons: 6,
      updatedAt: "18 ноя",
      language: "RU"
    },
    {
      id: "ux-2",
      moduleTitle: "Customer Journey",
      courseId: "ux-0425",
      courseTitle: "UX Research Sprint",
      stage: "review",
      owner: "Катя Белова",
      lessons: 5,
      updatedAt: "17 ноя",
      language: "RU"
    },
    {
      id: "pm-1",
      moduleTitle: "Growth стратегия",
      courseId: "pm-0325",
      courseTitle: "Product Growth Playbook",
      stage: "draft",
      owner: "Сергей Алексеев",
      lessons: 4,
      updatedAt: "16 ноя",
      language: "RU"
    },
    {
      id: "pm-2",
      moduleTitle: "Эксперименты и аналитика",
      courseId: "pm-0325",
      courseTitle: "Product Growth Playbook",
      stage: "review",
      owner: "Алина Ермакова",
      lessons: 7,
      updatedAt: "15 ноя",
      language: "RU"
    },
    {
      id: "qa-1",
      moduleTitle: "Автотесты как код",
      courseId: "qa-0525",
      courseTitle: "QA Automation Weekend",
      stage: "published",
      owner: "Мария Долгова",
      lessons: 5,
      updatedAt: "14 ноя",
      language: "RU"
    },
    {
      id: "ml-1",
      moduleTitle: "ML Pipelines",
      courseId: "ml-0224",
      courseTitle: "ML Ops Essentials",
      stage: "published",
      owner: "Данила Кац",
      lessons: 8,
      updatedAt: "01 сен",
      language: "EN"
    }
  ];

  return fetchCollection("/admin/modules", fallback);
}

export async function getUserDirectory(): Promise<UserDirectoryRecord[]> {
  if (!apiBaseUrl) {
    return usersFallback;
  }

  try {
    const res = await fetch(`${apiBaseUrl}/admin/users`, requestOptions);
    if (!res.ok) {
      return usersFallback;
    }
    const data = (await res.json()) as UserDirectoryRecord[];
    return Array.isArray(data) && data.length ? data : usersFallback;
  } catch {
    return usersFallback;
  }
}

export async function getAvailableRoles(): Promise<RoleOption[]> {
  if (!apiBaseUrl) {
    return roleOptionsFallback;
  }

  try {
    const res = await fetch(`${apiBaseUrl}/admin/roles`, requestOptions);
    if (!res.ok) {
      return roleOptionsFallback;
    }
    const data = (await res.json()) as RoleOption[];
    return Array.isArray(data) && data.length ? data : roleOptionsFallback;
  } catch {
    return roleOptionsFallback;
  }
}

export async function getModuleLessons(moduleId: string): Promise<LessonDetail[]> {
  const fallback = getLessonFallback(moduleId);
  if (!apiBaseUrl) {
    return fallback;
  }

  try {
    const res = await fetch(`${apiBaseUrl}/admin/modules/${moduleId}/lessons`, requestOptions);
    if (!res.ok) {
      return fallback;
    }
    const data = (await res.json()) as LessonDetail[];
    return Array.isArray(data) ? data : fallback;
  } catch {
    return fallback;
  }
}

export async function createLesson(moduleId: string, input: LessonDraftInput): Promise<LessonDetail> {
  if (!apiBaseUrl) {
    await new Promise(resolve => setTimeout(resolve, 250));
    const fallbackLessons = lessonFallbackByModule[moduleId] ?? [];
    const nextOrder = fallbackLessons.length + 1;
    const nextLesson: LessonDetail = {
      id: `${moduleId}-lesson-${Date.now()}`,
      moduleId,
      orderIndex: nextOrder,
      titleRu: input.titleRu,
      titleEn: input.titleEn || input.titleRu,
      bodyRu: input.bodyRu,
      bodyEn: input.bodyEn || input.bodyRu,
      durationMinutes: input.durationMinutes ?? null,
      videoProvider: input.videoProvider ?? null,
      videoRef: input.videoRef ?? null,
      attachments: null,
      quizId: null,
      quiz: null
    };
    lessonFallbackByModule[moduleId] = [...fallbackLessons, nextLesson];
    return nextLesson;
  }

  const res = await fetch(`${apiBaseUrl}/admin/modules/${moduleId}/lessons`, {
    ...requestOptions,
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input)
  });

  if (!res.ok) {
    throw new Error(`Failed to create lesson for module ${moduleId}`);
  }

  return (await res.json()) as LessonDetail;
}

export async function updateLesson(moduleId: string, lessonId: string, input: LessonDraftInput): Promise<LessonDetail> {
  if (!apiBaseUrl) {
    await new Promise(resolve => setTimeout(resolve, 250));
    const lessons = lessonFallbackByModule[moduleId] ?? [];
    const existingIndex = lessons.findIndex(lesson => lesson.id === lessonId);
    if (existingIndex === -1) {
      throw new Error(`Lesson ${lessonId} not found in fallback data`);
    }
    const updatedLesson: LessonDetail = {
      ...lessons[existingIndex],
      titleRu: input.titleRu,
      titleEn: input.titleEn || input.titleRu,
      bodyRu: input.bodyRu,
      bodyEn: input.bodyEn || input.bodyRu,
      durationMinutes: input.durationMinutes ?? null,
      videoProvider: input.videoProvider ?? null,
      videoRef: input.videoRef ?? null
    };
    lessonFallbackByModule[moduleId] = [
      ...lessons.slice(0, existingIndex),
      updatedLesson,
      ...lessons.slice(existingIndex + 1)
    ];
    return updatedLesson;
  }

  const res = await fetch(`${apiBaseUrl}/admin/modules/${moduleId}/lessons/${lessonId}`, {
    ...requestOptions,
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input)
  });

  if (!res.ok) {
    throw new Error(`Failed to update lesson ${lessonId}`);
  }

  return (await res.json()) as LessonDetail;
}

export async function deleteLesson(moduleId: string, lessonId: string): Promise<{ removedId: string }> {
  if (!apiBaseUrl) {
    await new Promise(resolve => setTimeout(resolve, 200));
    const lessons = lessonFallbackByModule[moduleId] ?? [];
    const filtered = lessons.filter(lesson => lesson.id !== lessonId);
    lessonFallbackByModule[moduleId] = filtered;
    resequenceFallback(moduleId);
    return { removedId: lessonId };
  }

  const res = await fetch(`${apiBaseUrl}/admin/modules/${moduleId}/lessons/${lessonId}`, {
    ...requestOptions,
    method: "DELETE"
  });

  if (!res.ok) {
    throw new Error(`Failed to delete lesson ${lessonId}`);
  }

  return (await res.json()) as { removedId: string };
}

export async function reorderLessons(moduleId: string, lessonIds: string[]): Promise<LessonDetail[]> {
  if (!apiBaseUrl) {
    await new Promise(resolve => setTimeout(resolve, 200));
    const lessons = lessonFallbackByModule[moduleId] ?? [];
    const lessonMap = new Map(lessons.map(lesson => [lesson.id, lesson] as const));
    const reordered = lessonIds
      .map(id => lessonMap.get(id))
      .filter((lesson): lesson is LessonDetail => Boolean(lesson));
    if (reordered.length !== lessons.length) {
      throw new Error("Fallback reorder payload mismatch");
    }
    lessonFallbackByModule[moduleId] = reordered;
    resequenceFallback(moduleId);
    return getLessonFallback(moduleId);
  }

  const res = await fetch(`${apiBaseUrl}/admin/modules/${moduleId}/lessons/order`, {
    ...requestOptions,
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ lessonIds })
  });

  if (!res.ok) {
    throw new Error(`Failed to reorder lessons for module ${moduleId}`);
  }

  return (await res.json()) as LessonDetail[];
}

export async function getLessonQuiz(lessonId: string): Promise<LessonQuizSettings> {
  if (!apiBaseUrl) {
    const fallback = findFallbackLessonById(lessonId);
    if (!fallback) {
      throw new Error(`Lesson ${lessonId} not found`);
    }
    return getFallbackQuizSettings(fallback.lesson);
  }

  const res = await fetch(`${apiBaseUrl}/admin/lessons/${lessonId}/quiz`, requestOptions);
  if (!res.ok) {
    throw new Error(`Failed to load quiz settings for lesson ${lessonId}`);
  }
  return (await res.json()) as LessonQuizSettings;
}

export async function updateLessonQuiz(lessonId: string, input: LessonQuizInput): Promise<LessonQuizSettings> {
  if (!apiBaseUrl) {
    await new Promise(resolve => setTimeout(resolve, 150));
    const fallback = findFallbackLessonById(lessonId);
    if (!fallback) {
      throw new Error(`Lesson ${lessonId} not found`);
    }
    const next: LessonQuizSettings = {
      id: fallback.lesson.quizId ?? `quiz-${Date.now()}`,
      passScore: input.passScore,
      attemptsLimit:
        typeof input.attemptsLimit === "number" && input.attemptsLimit > 0 ? input.attemptsLimit : null,
      timeLimitSeconds:
        typeof input.timeLimitSeconds === "number" && input.timeLimitSeconds > 0
          ? input.timeLimitSeconds
          : null
    };
    fallback.lesson.quizId = next.id;
    fallback.lesson.quiz = next;
    return next;
  }

  const res = await fetch(`${apiBaseUrl}/admin/lessons/${lessonId}/quiz`, {
    ...requestOptions,
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input)
  });

  if (!res.ok) {
    throw new Error(`Failed to update quiz settings for lesson ${lessonId}`);
  }

  return (await res.json()) as LessonQuizSettings;
}

export async function updateUserRoles(userId: string, roleCodes: string[]): Promise<UserDirectoryRecord> {
  if (!apiBaseUrl) {
    await new Promise(resolve => setTimeout(resolve, 200));
    const userIndex = usersFallback.findIndex(user => user.id === userId);
    if (userIndex === -1) {
      throw new Error(`User ${userId} not found in fallback data`);
    }
    const updatedRoles = roleCodes.length ? roleCodes : usersFallback[userIndex].roleCodes;
    const updatedRecord: UserDirectoryRecord = {
      ...usersFallback[userIndex],
      roleCodes: updatedRoles,
      roles: updatedRoles.map(code => {
        const option = roleOptionsFallback.find(role => role.code === code);
        return option?.name ?? code;
      })
    };
    usersFallback[userIndex] = updatedRecord;
    return updatedRecord;
  }

  const res = await fetch(`${apiBaseUrl}/admin/users/${userId}/roles`, {
    ...requestOptions,
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ roles: roleCodes })
  });

  if (!res.ok) {
    throw new Error(`Failed to update roles for user ${userId}`);
  }

  return (await res.json()) as UserDirectoryRecord;
}

export async function saveCourseDraft(input: CourseDraftInput): Promise<{ id: string }> {
  if (!apiBaseUrl) {
    await new Promise(resolve => setTimeout(resolve, 400));
    return { id: input.cohort || `draft-${Date.now()}` };
  }

  try {
    const res = await fetch(`${apiBaseUrl}/admin/courses`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input)
    });
    if (!res.ok) {
      throw new Error("Failed to save course");
    }
    return (await res.json()) as { id: string };
  } catch {
    return { id: input.cohort || `draft-${Date.now()}` };
  }
}

export async function getStudentDirectory(): Promise<StudentProfile[]> {
  const fallback: StudentProfile[] = [
    {
      id: "student-01",
      name: "Наталья Макарова",
      cohort: "UX-0425",
      course: "UX Research Sprint",
      progress: 78,
      paymentStatus: "paid",
      lastActivity: "18 ноя"
    },
    {
      id: "student-02",
      name: "Алексей Рыбаков",
      cohort: "PM-0325",
      course: "Product Growth Playbook",
      progress: 12,
      paymentStatus: "trial",
      lastActivity: "17 ноя"
    },
    {
      id: "student-03",
      name: "Ирина Хачатурова",
      cohort: "QA-0525",
      course: "QA Automation Weekend",
      progress: 43,
      paymentStatus: "overdue",
      lastActivity: "15 ноя"
    },
    {
      id: "student-04",
      name: "Владимир Ким",
      cohort: "ML-0224",
      course: "ML Ops Essentials",
      progress: 96,
      paymentStatus: "paid",
      lastActivity: "04 ноя"
    }
  ];

  return fetchCollection("/admin/students", fallback);
}

export async function createManualEnrollment(input: ManualEnrollmentInput): Promise<StudentProfile> {
  if (!apiBaseUrl) {
    throw new Error("API недоступно для выдачи доступа");
  }

  const res = await fetch(`${apiBaseUrl}/admin/enrollments/manual`, {
    ...requestOptions,
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input)
  });

  if (!res.ok) {
    let message = "Не удалось выдать доступ";
    try {
      const payload = await res.json();
      if (payload?.message) {
        message = payload.message;
      }
    } catch {
      const text = await res.text().catch(() => null);
      if (text) {
        message = text;
      }
    }
    throw new Error(message);
  }

  return (await res.json()) as StudentProfile;
}

export async function getCohortSummaries(): Promise<CohortSummary[]> {
  const fallback: CohortSummary[] = [
    {
      id: "UX-0425",
      label: "UX-0425",
      course: "UX Research Sprint",
      stage: "running",
      capacity: "28 / 32",
      startDate: "04 ноя",
      endDate: "20 дек",
      timezone: "MSK"
    },
    {
      id: "PM-0325",
      label: "PM-0325",
      course: "Product Growth Playbook",
      stage: "enrollment",
      capacity: "41 / 60",
      startDate: "25 ноя",
      endDate: "12 фев",
      timezone: "MSK"
    },
    {
      id: "QA-0525",
      label: "QA-0525",
      course: "QA Automation Weekend",
      stage: "wrap-up",
      capacity: "19 / 24",
      startDate: "10 сен",
      endDate: "22 ноя",
      timezone: "MSK"
    }
  ];

  return fetchCollection("/admin/cohorts", fallback);
}

export async function getPaymentFeed(): Promise<PaymentRecord[]> {
  const fallback: PaymentRecord[] = [
    {
      id: "PAY-3490",
      student: "Наталья Макарова",
      cohort: "UX-0425",
      amount: "₽42 000",
      status: "paid",
      processedAt: "18 ноя, 12:14",
      method: "Tinkoff"
    },
    {
      id: "PAY-3491",
      student: "Алексей Рыбаков",
      cohort: "PM-0325",
      amount: "₽58 000",
      status: "pending",
      processedAt: "17 ноя, 16:43",
      method: "CloudPayments"
    },
    {
      id: "PAY-3492",
      student: "Ирина Хачатурова",
      cohort: "QA-0525",
      amount: "₽36 000",
      status: "failed",
      processedAt: "15 ноя, 09:21",
      method: "ЮKassa"
    }
  ];

  return fetchCollection("/payments/admin/feed", fallback);
}

const ordersFallback: OrderRecord[] = [
  {
    id: "ORD-10342",
    student: "Наталья Макарова",
    cohort: "UX-0425",
    amount: "₽42 000",
    status: "completed",
    paymentStatus: "paid",
    method: "Tinkoff",
    currency: "RUB",
    createdAt: "18 ноя, 11:02",
    createdAtIso: "2025-11-18T11:02:00.000Z",
    updatedAt: "18 ноя, 12:14",
    updatedAtIso: "2025-11-18T12:14:00.000Z"
  },
  {
    id: "ORD-10355",
    student: "Алексей Рыбаков",
    cohort: "PM-0325",
    amount: "₽58 000",
    status: "pending",
    paymentStatus: "pending",
    method: "CloudPayments",
    currency: "USD",
    createdAt: "17 ноя, 15:12",
    createdAtIso: "2025-11-17T15:12:00.000Z",
    updatedAt: "17 ноя, 16:43",
    updatedAtIso: "2025-11-17T16:43:00.000Z"
  },
  {
    id: "ORD-10321",
    student: "Ирина Хачатурова",
    cohort: "QA-0525",
    amount: "₽36 000",
    status: "requires_action",
    paymentStatus: "failed",
    method: "YooKassa",
    currency: "RUB",
    createdAt: "15 ноя, 08:55",
    createdAtIso: "2025-11-15T08:55:00.000Z",
    updatedAt: "15 ноя, 09:21",
    updatedAtIso: "2025-11-15T09:21:00.000Z"
  }
];

const fallbackFacets: OrdersFilterFacets = {
  methods: ["Tinkoff", "CloudPayments", "YooKassa"],
  currencies: ["RUB", "USD"],
  cohorts: [
    ...new Set(ordersFallback.map(order => order.cohort).filter(Boolean))
  ]
};

const orderDetailFallback: Record<string, OrderDetail> = {
  "ORD-10342": {
    ...ordersFallback[0],
    type: "one_time",
    currency: "RUB",
    studentEmail: "n.makarova@example.com",
    studentId: "student-01",
    courseId: "course-ux",
    courseTitle: "UX Research Sprint",
    enrollmentId: "enroll-01",
    metadata: { provider: "tinkoff", reminders: { count: 1, lastSentAt: "2025-11-18T12:30:00.000Z" } },
    refundReason: null,
    refundProcessedAt: null,
    paymentAttempts: [
      {
        id: "pay-1",
        provider: "Tinkoff",
        status: "paid",
        amount: "₽42 000",
        processedAt: "18 ноя, 12:14"
      }
    ],
    createdAtFull: "18 ноя, 11:02",
    updatedAtFull: "18 ноя, 12:14",
    reminderCount: 1,
    lastReminderAt: "18 ноя, 12:30",
    timeline: [
      {
        id: "ORD-10342-reminder-1",
        label: "Отправлено напоминание",
        description: "Первое напоминание отправлено студенту.",
        timestamp: "18 ноя, 12:30",
        tone: "warning"
      },
      {
        id: "ORD-10342-status-completed",
        label: "Заказ завершен",
        description: "Оплата подтверждена, заказ закрыт.",
        timestamp: "18 ноя, 12:14",
        tone: "success"
      },
      {
        id: "pay-1-payment",
        label: "Платеж подтвержден",
        description: "₽42 000 через Tinkoff успешно зачислен.",
        timestamp: "18 ноя, 12:14",
        tone: "success"
      },
      {
        id: "ORD-10342-created",
        label: "Заказ создан",
        description: "Заказ оформлен на сумму ₽42 000.",
        timestamp: "18 ноя, 11:02",
        tone: "info"
      }
    ],
    billingProfile: {
      fullName: "Наталья Макарова",
      email: "billing@virgo-school.test",
      companyName: "ООО \"Вирго\"",
      taxId: "7708123456",
      address: "Москва, ул. Тестовая, 10",
      phone: "+7 900 000-00-00",
      updatedAt: "18 ноя, 10:45"
    },
    invoice: {
      id: "INV-10342",
      status: "issued",
      downloadUrl: "https://example.com/invoice/INV-10342.pdf",
      notes: "НДС 20%",
      requestedAt: "18 ноя, 12:20",
      profileSnapshot: {
        fullName: "Наталья Макарова",
        companyName: "ООО \"Вирго\"",
        taxId: "7708123456",
        address: "Москва, ул. Тестовая, 10",
        recordedAt: "2025-11-18T12:20:00.000Z"
      }
    }
  },
  "ORD-10355": {
    ...ordersFallback[1],
    type: "subscription",
    currency: "RUB",
    studentEmail: "a.rybakov@example.com",
    studentId: "student-02",
    courseId: "course-pm",
    courseTitle: "Product Growth Playbook",
    enrollmentId: null,
    metadata: { provider: "cloudpayments" },
    refundReason: null,
    refundProcessedAt: null,
    lastPaymentLink: {
      id: "link-10355-1",
      url: "https://demo.virgo.school/checkout/ORD-10355?provider=cloudpayments",
      provider: "cloudpayments",
      locale: "ru",
      createdAt: "17 ноя, 16:44",
      createdAtIso: "2025-11-17T13:44:00.000Z",
      paymentId: "pay-2",
      providerRef: "cp-ORD-10355",
      simulated: true
    },
    paymentLinkHistory: [
      {
        id: "link-10355-1",
        url: "https://demo.virgo.school/checkout/ORD-10355?provider=cloudpayments",
        provider: "cloudpayments",
        locale: "ru",
        createdAt: "17 ноя, 16:44",
        createdAtIso: "2025-11-17T13:44:00.000Z",
        paymentId: "pay-2",
        providerRef: "cp-ORD-10355",
        simulated: true
      }
    ],
    paymentAttempts: [
      {
        id: "pay-2",
        provider: "CloudPayments",
        status: "pending",
        amount: "₽58 000",
        processedAt: "17 ноя, 16:43"
      }
    ],
    createdAtFull: "17 ноя, 15:12",
    updatedAtFull: "17 ноя, 16:43",
    reminderCount: 0,
    lastReminderAt: null,
    timeline: [
      {
        id: "pay-2-payment",
        label: "Платеж создан",
        description: "₽58 000 через CloudPayments ожидает подтверждения.",
        timestamp: "17 ноя, 16:43",
        tone: "warning"
      },
      {
        id: "ORD-10355-created",
        label: "Заказ создан",
        description: "Заказ оформлен на сумму ₽58 000.",
        timestamp: "17 ноя, 15:12",
        tone: "info"
      }
    ],
    billingProfile: {
      fullName: "Андрей Рыбаков",
      email: "a.rybakov@example.com",
      companyName: "ИП Рыбаков",
      taxId: "470500000000",
      address: "Казань, ул. Примерная, 8",
      phone: "+7 901 555-44-33",
      updatedAt: "17 ноя, 14:50"
    },
    invoice: {
      id: "INV-10355",
      status: "pending",
      downloadUrl: null,
      notes: "Ожидает подписи",
      requestedAt: "17 ноя, 16:45",
      profileSnapshot: {
        fullName: "Андрей Рыбаков",
        companyName: "ИП Рыбаков",
        taxId: "470500000000",
        address: "Казань, ул. Примерная, 8",
        recordedAt: "2025-11-17T16:45:00.000Z"
      }
    }
  },
  "ORD-10321": {
    ...ordersFallback[2],
    type: "one_time",
    currency: "RUB",
    studentEmail: "i.hachaturova@example.com",
    studentId: "student-03",
    courseId: "course-qa",
    courseTitle: "QA Automation Weekend",
    enrollmentId: "enroll-09",
    metadata: { provider: "yookassa", retries: 2 },
    lastPaymentLink: {
      id: "link-10321-1",
      url: "https://demo.virgo.school/checkout/ORD-10321?provider=yookassa",
      provider: "yookassa",
      locale: "ru",
      createdAt: "16 ноя, 10:04",
      createdAtIso: "2025-11-16T07:04:00.000Z",
      paymentId: null,
      providerRef: "yk-ORD-10321",
      simulated: true
    },
    paymentLinkHistory: [
      {
        id: "link-10321-1",
        url: "https://demo.virgo.school/checkout/ORD-10321?provider=yookassa",
        provider: "yookassa",
        locale: "ru",
        createdAt: "16 ноя, 10:04",
        createdAtIso: "2025-11-16T07:04:00.000Z",
        paymentId: null,
        providerRef: "yk-ORD-10321",
        simulated: true
      }
    ],
    paymentAttempts: [
      {
        id: "pay-3",
        provider: "YooKassa",
        status: "failed",
        amount: "₽36 000",
        processedAt: "15 ноя, 09:21",
        reference: "ERR-529"
      }
    ],
    createdAtFull: "15 ноя, 08:55",
    updatedAtFull: "15 ноя, 09:21",
    reminderCount: 2,
    lastReminderAt: "16 ноя, 10:05",
    refundReason: null,
    refundProcessedAt: null,
    timeline: [
      {
        id: "ORD-10321-reminder-2",
        label: "Отправлено напоминание",
        description: "Письмо №2 отправлено студенту.",
        timestamp: "16 ноя, 10:05",
        tone: "warning"
      },
      {
        id: "ORD-10321-status-requires_action",
        label: "Требуются действия студента",
        description: "Система ожидает обновления способа оплаты или подтверждения.",
        timestamp: "15 ноя, 09:21",
        tone: "warning"
      },
      {
        id: "pay-3-payment",
        label: "Платеж отклонен",
        description: "₽36 000 через YooKassa отклонен провайдером.",
        timestamp: "15 ноя, 09:21",
        tone: "danger"
      },
      {
        id: "ORD-10321-created",
        label: "Заказ создан",
        description: "Заказ оформлен на сумму ₽36 000.",
        timestamp: "15 ноя, 08:55",
        tone: "info"
      }
    ],
    billingProfile: {
      fullName: "Ирина Хачатурова",
      email: "i.hachaturova@example.com",
      companyName: null,
      taxId: null,
      address: "Екатеринбург, ул. Мира, 5",
      phone: "+7 343 777-99-88",
      updatedAt: "15 ноя, 08:40"
    },
    invoice: {
      id: null,
      status: null,
      downloadUrl: null,
      notes: null,
      requestedAt: null,
      profileSnapshot: null
    }
  }
};

export interface OrdersFeedPaginationOptions {
  limit?: number;
  offset?: number;
}

const DEFAULT_ORDERS_PAGE_SIZE = 50;
const MAX_ORDERS_PAGE_SIZE = 200;

export async function getOrdersFeed(
  filters: OrdersFilters = defaultOrdersFilters,
  pagination: OrdersFeedPaginationOptions = {}
): Promise<OrdersFeedPage> {
  const limit = Math.min(Math.max(pagination.limit ?? DEFAULT_ORDERS_PAGE_SIZE, 1), MAX_ORDERS_PAGE_SIZE);
  const offset = Math.max(pagination.offset ?? 0, 0);

  const fallbackItems = applyOrdersFilters(ordersFallback, filters);
  const fallbackPage: OrdersFeedPage = {
    items: fallbackItems.slice(offset, offset + limit),
    total: fallbackItems.length,
    limit,
    offset,
    hasMore: offset + limit < fallbackItems.length,
    facets: fallbackFacets
  };

  const query = buildOrdersFilterQuery(filters);
  const params = new URLSearchParams(query);
  if (limit !== DEFAULT_ORDERS_PAGE_SIZE) {
    params.set("limit", String(limit));
  }
  if (offset) {
    params.set("offset", String(offset));
  }

  const path = params.toString() ? `/admin/orders?${params.toString()}` : "/admin/orders";
  return fetchResource(path, fallbackPage);
}

export async function getOrderDetail(orderId: string): Promise<OrderDetail | null> {
  if (!apiBaseUrl) {
    return orderDetailFallback[orderId] ?? null;
  }

  try {
    const res = await fetch(`${apiBaseUrl}/admin/orders/${orderId}`, requestOptions);
    if (!res.ok) {
      return null;
    }
    return (await res.json()) as OrderDetail;
  } catch {
    return orderDetailFallback[orderId] ?? null;
  }
}
