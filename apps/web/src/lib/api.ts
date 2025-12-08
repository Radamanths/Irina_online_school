import "server-only";
import axios from "axios";
import { getAppConfig } from "@virgo/config";
import { getMockCourseDetail, getMockCourseSummaries } from "./mock-courses";
import type {
  BillingProfileSummary,
  CertificateSummary,
  CourseDetail,
  CourseSummary,
  DashboardMetrics,
  DashboardWidget,
  EnrollmentAccessCheck,
  EnrollmentSummary,
  InvoiceRequestSummary,
  LessonDetail,
  LessonProgress,
  OrderListResponse,
  OrderSelfServiceAction,
  OrderSummary,
  QuizAnswerInput,
  QuizDetail,
  QuizSubmission,
  UpsertLessonProgressPayload
} from "./types";

const { apiBaseUrl } = getAppConfig();
const client = apiBaseUrl ? axios.create({ baseURL: apiBaseUrl }) : null;

function assertClient() {
  if (!client) {
    throw new Error("API client is not configured");
  }
  return client;
}

export async function fetchCourses(locale: string): Promise<CourseSummary[]> {
  if (!client) {
    return getMockCourseSummaries(locale);
  }
  try {
    const { data } = await client.get(`/courses`, { params: { locale } });
    return data;
  } catch {
    return getMockCourseSummaries(locale);
  }
}

export async function fetchCourseDetail(slug: string, locale: string): Promise<CourseDetail> {
  if (!client) {
    const mock = getMockCourseDetail(slug, locale);
    if (mock) {
      return mock;
    }
    throw new Error(`Course ${slug} not found in mock dataset`);
  }
  try {
    const { data } = await client.get(`/courses/${slug}`, { params: { locale } });
    return data;
  } catch (error) {
    const mock = getMockCourseDetail(slug, locale);
    if (mock) {
      return mock;
    }
    throw error;
  }
}

export async function fetchOrder(orderId: string): Promise<OrderSummary> {
  const api = assertClient();
  const { data } = await api.get(`/orders/${orderId}`);
  return data;
}

export async function listUserOrders(
  userId: string,
  params: { status?: string; take?: number; cursor?: string } = {}
): Promise<OrderListResponse> {
  if (!client) {
    return { data: [] };
  }
  try {
    const { data } = await client.get(`/orders/user/${userId}`, {
      params: {
        status: params.status,
        take: params.take,
        cursor: params.cursor
      }
    });
    return data;
  } catch (error) {
    console.error("Failed to list user orders", error);
    return { data: [] };
  }
}

export async function requestOrderSelfServiceAction(
  orderId: string,
  payload: { userId: string; action: OrderSelfServiceAction; reason?: string; channel?: string }
): Promise<OrderSummary> {
  const api = assertClient();
  const { data } = await api.post(`/orders/${orderId}/self-service`, {
    ...payload,
    channel: payload.channel ?? "dashboard"
  });
  return data;
}

export interface UpsertBillingProfilePayload {
  fullName: string;
  email: string;
  companyName?: string;
  taxId?: string;
  address?: string;
  phone?: string;
}

export async function getBillingProfile(userId: string): Promise<BillingProfileSummary | null> {
  const api = assertClient();
  const { data } = await api.get(`/billing/profile/${userId}`);
  return data ?? null;
}

export async function upsertBillingProfile(
  userId: string,
  payload: UpsertBillingProfilePayload
): Promise<BillingProfileSummary> {
  const api = assertClient();
  const { data } = await api.post(`/billing/profile`, {
    userId,
    ...payload
  });
  return data;
}

export async function requestOrderInvoice(
  orderId: string,
  payload: { userId: string; notes?: string }
): Promise<InvoiceRequestSummary> {
  const api = assertClient();
  const { data } = await api.post(`/billing/orders/${orderId}/invoice`, payload);
  return data;
}

export interface DashboardResponse {
  userId: string;
  widgets: DashboardWidget[];
  enrollments: EnrollmentSummary[];
  metrics?: DashboardMetrics;
  progress?: LessonProgress[];
}

export async function getDashboard(userId: string, locale: string): Promise<DashboardResponse> {
  const api = assertClient();
  const { data } = await api.get(`/users/${userId}/dashboard`, { params: { locale } });
  return data;
}

export async function fetchUserProgress(userId: string, courseId?: string): Promise<LessonProgress[]> {
  const api = assertClient();
  const { data } = await api.get(`/progress/${userId}`, {
    params: courseId ? { courseId } : undefined
  });
  return data;
}

export async function fetchLessonDetail(lessonId: string, locale: string, userId: string): Promise<LessonDetail> {
  const api = assertClient();
  const { data } = await api.get(`/lessons/${lessonId}`, {
    params: { locale },
    headers: { "x-user-id": userId }
  });
  return data;
}

export async function checkEnrollmentAccess(params: {
  userId: string;
  courseId?: string;
  lessonId?: string;
}): Promise<EnrollmentAccessCheck> {
  const api = assertClient();
  const { data } = await api.get(`/enrollments/access`, { params });
  return data;
}

export async function updateLessonProgress(payload: UpsertLessonProgressPayload): Promise<LessonProgress> {
  const api = assertClient();
  const { data } = await api.patch(`/progress`, payload);
  return data;
}

export async function fetchUserCertificates(userId: string, locale: string): Promise<CertificateSummary[]> {
  const api = assertClient();
  const { data } = await api.get(`/certificates/user/${userId}`, { params: { locale } });
  return data;
}

export async function fetchQuizDetail(quizId: string, locale: string, userId: string): Promise<QuizDetail> {
  const api = assertClient();
  const { data } = await api.get(`/quizzes/${quizId}`, {
    params: { locale },
    headers: { "x-user-id": userId }
  });
  return data;
}

export async function fetchQuizSubmissions(quizId: string, userId: string): Promise<QuizSubmission[]> {
  const api = assertClient();
  const { data } = await api.get(`/quizzes/${quizId}/submissions`, {
    params: { userId },
    headers: { "x-user-id": userId }
  });
  return data;
}

export async function submitQuizAttempt(
  quizId: string,
  payload: { userId: string; answers: QuizAnswerInput[]; locale: string; elapsedSeconds?: number | null }
): Promise<QuizSubmission> {
  const api = assertClient();
  const { data } = await api.post(`/quizzes/${quizId}/submissions`, payload, {
    params: { locale: payload.locale },
    headers: { "x-user-id": payload.userId }
  });
  return data;
}

export type SeoLocaleFields = {
  title: string;
  description: string;
  keywords: string;
};

export type SeoPageConfig = {
  id: string;
  label: string;
  slug: string;
  image: string;
  locales: Record<"ru" | "en", SeoLocaleFields>;
};

export type SeoSettings = {
  updatedAt: string;
  pages: SeoPageConfig[];
};

const defaultSeoPages: SeoPageConfig[] = [
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

const defaultSeoSettings: SeoSettings = {
  updatedAt: new Date(0).toISOString(),
  pages: defaultSeoPages
};

function cloneDefaultSeoSettings(): SeoSettings {
  return {
    updatedAt: defaultSeoSettings.updatedAt,
    pages: defaultSeoSettings.pages.map(page => ({
      ...page,
      locales: {
        ru: { ...page.locales.ru },
        en: { ...page.locales.en }
      }
    }))
  };
}

function normalizeSeoLocaleFields(locale: unknown): SeoLocaleFields {
  if (!locale || typeof locale !== "object") {
    return { title: "", description: "", keywords: "" };
  }
  const data = locale as Record<string, unknown>;
  return {
    title: typeof data.title === "string" ? data.title.trim() : "",
    description: typeof data.description === "string" ? data.description.trim() : "",
    keywords: typeof data.keywords === "string" ? data.keywords.trim() : ""
  };
}

function normalizeSeoPageConfig(page: unknown): SeoPageConfig {
  const source = (page && typeof page === "object" ? (page as Record<string, unknown>) : {}) as Record<
    string,
    unknown
  >;
  const rawSlug = typeof source.slug === "string" ? source.slug : typeof source.id === "string" ? source.id : "/";
  const slug = normalizeSeoSlug(rawSlug);
  const id = typeof source.id === "string" && source.id.trim().length ? source.id.trim() : slug.replace(/\//g, "-") || "page";
  const label = typeof source.label === "string" && source.label.trim().length ? source.label.trim() : deriveLabelFromSlug(slug);
  const image = typeof source.image === "string" ? source.image.trim() : "";
  const locales = typeof source.locales === "object" && source.locales ? (source.locales as Record<string, unknown>) : {};

  return {
    id,
    label,
    slug,
    image,
    locales: {
      ru: normalizeSeoLocaleFields(locales.ru),
      en: normalizeSeoLocaleFields(locales.en)
    }
  };
}

function normalizeSeoSlug(slug: string): string {
  if (!slug) {
    return "/";
  }
  const trimmed = slug.trim();
  if (!trimmed.length || trimmed === "/") {
    return "/";
  }
  return trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
}

function deriveLabelFromSlug(slug: string): string {
  if (slug === "/") {
    return "Главная";
  }
  return slug
    .replace(/^\/+/, "")
    .split("/")
    .filter(Boolean)
    .map(segment => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" / ")
    .trim() || "Страница";
}

function normalizeSeoSettingsResponse(payload: unknown): SeoSettings {
  const fallback = cloneDefaultSeoSettings();
  if (!payload || typeof payload !== "object") {
    return fallback;
  }
  const snapshot = payload as Record<string, unknown>;
  const pagesSource = Array.isArray(snapshot.pages) ? snapshot.pages : fallback.pages;
  return {
    updatedAt: typeof snapshot.updatedAt === "string" ? snapshot.updatedAt : fallback.updatedAt,
    pages: pagesSource.map(page => normalizeSeoPageConfig(page))
  };
}

export async function fetchSeoSettings(): Promise<SeoSettings> {
  if (!client) {
    return cloneDefaultSeoSettings();
  }
  try {
    const { data } = await client.get(`/admin/seo`);
    return normalizeSeoSettingsResponse(data);
  } catch {
    return cloneDefaultSeoSettings();
  }
}
