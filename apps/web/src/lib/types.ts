export interface CourseSummary {
  id: string;
  slug: string;
  title: string;
  shortDescription: string;
  level: string;
  duration: string;
  price: string;
  category?: string;
  cohortCode?: string | null;
}

export interface LessonSummary {
  id: string;
  title: string;
  type: string;
  length: string;
}

export interface Module {
  id: string;
  title: string;
  duration: string;
  lessons: LessonSummary[];
}

export interface CourseDetail extends CourseSummary {
  fullDescription: string;
  modules: Module[];
  seoTitle?: string | null;
  seoDescription?: string | null;
  seoKeywords?: string | null;
  seoImage?: string | null;
}

export interface DashboardWidget {
  eyebrow: string;
  title: string;
  description: string;
  cta?: { label: string; href: string };
}

export interface DashboardMetrics {
  completedLessons: number;
  activeCourses: number;
  minutesWatched: number;
  passedQuizzes: number;
}

export type LessonProgressStatus = "not_started" | "in_progress" | "completed";

export interface LessonProgress {
  userId: string;
  lessonId: string;
  status: LessonProgressStatus;
  watchedSeconds: number | null;
  lastPositionSeconds: number | null;
  updatedAt: string;
}

export interface EnrollmentSummary {
  id: string;
  status: string;
  course: CourseDetail;
  progressPercent: number;
  nextLessonId?: string;
  nextLessonTitle?: string;
}

export interface LessonDetail {
  id: string;
  moduleId: string;
  orderIndex: number;
  title: string;
  body?: string;
  durationMinutes?: number | null;
  videoProvider?: string | null;
  videoRef?: string | null;
  attachments?: Record<string, unknown> | null;
  quizId?: string | null;
}

export interface UpsertLessonProgressPayload {
  userId: string;
  lessonId: string;
  status?: LessonProgressStatus;
  watchedSeconds?: number;
  lastPositionSeconds?: number;
}

export interface CertificateSummary {
  id: string;
  enrollmentId: string;
  courseId: string;
  courseTitle: string;
  pdfUrl: string;
  hash: string;
  issuedAt: string;
}

export type QuizQuestionType = "single" | "multiple";

export interface QuizOption {
  id: string;
  label: string;
}

export interface QuizQuestion {
  id: string;
  prompt: string;
  type: QuizQuestionType;
  options: QuizOption[];
  explanation?: string;
}

export interface QuizDetail {
  id: string;
  lessonId: string;
  passScore: number;
  attemptsLimit: number | null;
  timeLimitSeconds?: number | null;
  questions: QuizQuestion[];
}

export interface QuizSubmissionAnswer {
  questionId: string;
  selectedOptionIds: string[];
  correctOptionIds: string[];
  isCorrect: boolean;
}

export interface QuizSubmission {
  id: string;
  quizId: string;
  userId: string;
  score: number;
  passed: boolean;
  elapsedSeconds: number | null;
  submittedAt: string;
  answers: QuizSubmissionAnswer[];
}

export interface QuizAnswerInput {
  questionId: string;
  selectedOptionIds: string[];
}

export interface PaymentSummary {
  id: string;
  provider: string;
  status: string;
  amount: number;
  currency: string;
  providerRef?: string | null;
  processedAt?: string | null;
}

export type OrderSelfServiceAction = "cancel" | "refund";

export interface BillingProfileSummary {
  userId: string;
  fullName: string;
  email: string;
  companyName?: string | null;
  taxId?: string | null;
  address?: string | null;
  phone?: string | null;
  updatedAt: string;
}

export type InvoiceStatusValue = "pending" | "issued" | "failed";

export interface InvoiceRequestSummary {
  id: string;
  status: InvoiceStatusValue;
  downloadUrl?: string | null;
  notes?: string | null;
  requestedAt: string;
}

export interface OrderSubscriptionSummary {
  id: string;
  status: "trialing" | "active" | "past_due" | "canceled" | "incomplete";
  cancelAtPeriodEnd: boolean;
  canceledAt?: string | null;
  currentPeriodStart?: string | null;
  currentPeriodEnd?: string | null;
  planName?: string | null;
  intervalUnit?: "month" | "year" | null;
  intervalCount?: number | null;
}

export interface OrderSummary {
  id: string;
  userId: string;
  type: string;
  status: string;
  amount: number;
  currency: string;
  courseId?: string | null;
  subscriptionId?: string | null;
  metadata?: Record<string, unknown> | null;
  subscription?: OrderSubscriptionSummary | null;
  payments: PaymentSummary[];
  invoice?: InvoiceRequestSummary | null;
  createdAt: string;
  updatedAt: string;
}

export interface OrderListResponse {
  data: OrderSummary[];
  nextCursor?: string;
}

export interface EnrollmentAccessCheck {
  allowed: boolean;
  enrollmentId?: string;
  status?: string;
  accessStart?: string | null;
  accessEnd?: string | null;
  courseId?: string;
  lessonId?: string;
  moduleId?: string;
  unlockAt?: string | null;
  prerequisiteModuleId?: string | null;
  reason?: string;
}
