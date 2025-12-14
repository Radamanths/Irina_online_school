import type { LessonProgressStatus } from "../src/progress/dto/upsert-progress.dto";

interface CourseRecord {
  id: string;
  slug: string;
  titleRu: string;
  titleEn: string;
  descriptionRu: string;
  descriptionEn: string;
  level: string;
  durationMonths: number;
  priceRub: number;
  priceUsd: number;
  priceKzt: number;
  category: string;
}

interface ModuleRecord {
  id: string;
  courseId: string;
  orderIndex: number;
  titleRu: string;
  titleEn: string;
  summaryRu?: string;
  summaryEn?: string;
}

interface LessonRecord {
  id: string;
  moduleId: string;
  orderIndex: number;
  titleRu: string;
  titleEn: string;
  bodyRu: string;
  bodyEn: string;
  durationMinutes: number;
  videoProvider?: string;
  videoRef?: string;
  attachments?: Record<string, unknown> | null;
  quizId?: string | null;
}

interface LessonProgressRecord {
  userId: string;
  lessonId: string;
  status: LessonProgressStatus;
  watchedSeconds: number;
  lastPositionSeconds: number;
  updatedAt: Date;
}

interface EnrollmentRecord {
  id: string;
  userId: string;
  courseId: string;
  status: "active" | "paused" | "completed" | "expired" | "canceled";
  accessStart: Date | null;
  accessEnd: Date | null;
}

interface CertificateRecord {
  id: string;
  enrollmentId: string;
  pdfUrl: string;
  hash: string;
  issuedAt: Date;
}

interface OrderRecord {
  id: string;
  userId: string;
  enrollmentId?: string | null;
  type: string;
  status: string;
  amount: number;
  currency: string;
  metadata?: Record<string, unknown> | null;
  createdAt: Date;
  updatedAt: Date;
}

interface PaymentRecord {
  id: string;
  orderId: string;
  provider: "stripe" | "yookassa" | "cloudpayments" | "manual";
  status: "pending" | "succeeded" | "failed" | "refunded";
  amount: number;
  currency: string;
  providerRef?: string | null;
  webhookPayload?: Record<string, unknown> | null;
  processedAt?: Date | null;
  createdAt: Date;
}

interface RoleRecord {
  id: string;
  code: string;
  name: string;
}

interface UserRoleRecord {
  id: string;
  userId: string;
  roleId: string;
}

interface UserRecord {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  locale: string;
  timezone: string;
  createdAt: Date;
  updatedAt: Date;
}

const now = new Date("2025-01-01T10:00:00.000Z");

const users: UserRecord[] = [
  {
    id: "user-1",
    firstName: "Анна",
    lastName: "Иванова",
    email: "anna@example.com",
    locale: "ru",
    timezone: "Europe/Moscow",
    createdAt: addMinutes(now, -400),
    updatedAt: addMinutes(now, -5)
  },
  {
    id: "user-2",
    firstName: "Егор",
    lastName: "Смирнов",
    email: "egor@example.com",
    locale: "ru",
    timezone: "Europe/Moscow",
    createdAt: addMinutes(now, -390),
    updatedAt: addMinutes(now, -30)
  },
  {
    id: "user-3",
    firstName: "Мария",
    lastName: "Орлова",
    email: "maria@example.com",
    locale: "ru",
    timezone: "Europe/Moscow",
    createdAt: addMinutes(now, -380),
    updatedAt: addMinutes(now, -110)
  }
];

function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60 * 1000);
}

export function createPrismaMock() {
  const courses: CourseRecord[] = [
    {
      id: "course-1",
      slug: "intro-design",
      titleRu: "Дизайн с нуля",
      titleEn: "Design from Scratch",
      descriptionRu: "Учим базовые принципы UX/UI.",
      descriptionEn: "Learn the basics of UX/UI.",
      level: "beginner",
      durationMonths: 3,
      priceRub: 45000,
      priceUsd: 500,
      priceKzt: 250000,
      category: "design"
    }
  ];

  const modules: ModuleRecord[] = [
    {
      id: "module-1",
      courseId: "course-1",
      orderIndex: 1,
      titleRu: "Основы",
      titleEn: "Fundamentals",
      summaryRu: "Основы дизайна",
      summaryEn: "Design basics"
    }
  ];

  const lessons: LessonRecord[] = [
    {
      id: "lesson-1",
      moduleId: "module-1",
      orderIndex: 1,
      titleRu: "Введение",
      titleEn: "Introduction",
      bodyRu: "Контент по-русски",
      bodyEn: "Content in English",
      durationMinutes: 15,
      videoProvider: "vimeo",
      videoRef: "123",
      attachments: null,
      quizId: null
    },
    {
      id: "lesson-2",
      moduleId: "module-1",
      orderIndex: 2,
      titleRu: "Практика",
      titleEn: "Practice",
      bodyRu: "Практический урок",
      bodyEn: "Practice lesson",
      durationMinutes: 20,
      videoProvider: undefined,
      videoRef: undefined,
      attachments: null,
      quizId: "quiz-1"
    }
  ];

  const enrollments: EnrollmentRecord[] = [
    { id: "enroll-1", userId: "user-1", courseId: "course-1", status: "active", accessStart: null, accessEnd: null }
  ];

  const certificates: CertificateRecord[] = [
    {
      id: "cert-1",
      enrollmentId: "enroll-1",
      pdfUrl: "https://cdn.example.com/cert-1.pdf",
      hash: "hash-123",
      issuedAt: now
    }
  ];

  const orders: OrderRecord[] = [
    {
      id: "order-1",
      userId: "user-1",
      enrollmentId: "enroll-1",
      type: "one_time",
      status: "pending",
      amount: 500,
      currency: "USD",
      metadata: { provider: "stripe" },
      createdAt: addMinutes(now, -5),
      updatedAt: addMinutes(now, -5)
    },
    {
      id: "order-2",
      userId: "user-2",
      enrollmentId: null,
      type: "one_time",
      status: "completed",
      amount: 42000,
      currency: "RUB",
      metadata: { provider: "stripe" },
      createdAt: addMinutes(now, -60),
      updatedAt: addMinutes(now, -30)
    },
    {
      id: "order-3",
      userId: "user-3",
      enrollmentId: null,
      type: "one_time",
      status: "requires_action",
      amount: 36000,
      currency: "RUB",
      metadata: { provider: "yookassa" },
      createdAt: addMinutes(now, -120),
      updatedAt: addMinutes(now, -110)
    },
    {
      id: "order-4",
      userId: "user-2",
      enrollmentId: null,
      type: "one_time",
      status: "canceled",
      amount: 58000,
      currency: "RUB",
      metadata: { provider: "cloudpayments" },
      createdAt: addMinutes(now, -180),
      updatedAt: addMinutes(now, -170)
    }
  ];

  const payments: PaymentRecord[] = [
    {
      id: "payment-1",
      orderId: "order-1",
      provider: "stripe",
      status: "pending",
      amount: 500,
      currency: "USD",
      providerRef: "pi_test",
      webhookPayload: null,
      processedAt: addMinutes(now, -5),
      createdAt: addMinutes(now, -5)
    },
    {
      id: "payment-2",
      orderId: "order-2",
      provider: "stripe",
      status: "succeeded",
      amount: 42000,
      currency: "RUB",
      providerRef: "stripe-42000",
      webhookPayload: null,
      processedAt: addMinutes(now, -30),
      createdAt: addMinutes(now, -60)
    },
    {
      id: "payment-3",
      orderId: "order-3",
      provider: "yookassa",
      status: "failed",
      amount: 36000,
      currency: "RUB",
      providerRef: "yk-err",
      webhookPayload: null,
      processedAt: addMinutes(now, -110),
      createdAt: addMinutes(now, -120)
    },
    {
      id: "payment-4",
      orderId: "order-4",
      provider: "cloudpayments",
      status: "refunded",
      amount: 58000,
      currency: "RUB",
      providerRef: "cp-58000",
      webhookPayload: null,
      processedAt: addMinutes(now, -170),
      createdAt: addMinutes(now, -180)
    }
  ];

  const lessonProgress: LessonProgressRecord[] = [
    {
      userId: "user-1",
      lessonId: "lesson-1",
      status: "completed",
      watchedSeconds: 900,
      lastPositionSeconds: 900,
      updatedAt: now
    }
  ];

  const roles: RoleRecord[] = [];
  const userRoles: UserRoleRecord[] = [];
  let roleSequence = 0;
  let userRoleSequence = 0;

  function getCourseById(id?: string | null) {
    return courses.find(course => course.id === id);
  }

  function getModuleById(id?: string | null) {
    return modules.find(module => module.id === id);
  }

  function getLessonsByModule(moduleId: string) {
    return lessons
      .filter(lesson => lesson.moduleId === moduleId)
      .map(lesson => ({
        ...lesson,
        quiz: lesson.quizId ? { id: lesson.quizId } : null
      }));
  }

  function getCourseIdForLesson(lessonId: string) {
    const lesson = lessons.find(record => record.id === lessonId);
    if (!lesson) {
      return undefined;
    }
    const module = getModuleById(lesson.moduleId);
    return module?.courseId;
  }

  function getUserById(id?: string | null): UserRecord | null {
    if (!id) {
      return null;
    }
    return users.find(user => user.id === id) ?? null;
  }

  function getRoleById(roleId?: string | null): RoleRecord | null {
    if (!roleId) {
      return null;
    }
    return roles.find(role => role.id === roleId) ?? null;
  }

  function matchesRoleWhere(role: RoleRecord, where?: { code?: string | { in?: string[] }; id?: string }): boolean {
    if (!where) {
      return true;
    }
    if (typeof where.code === "string" && role.code !== where.code) {
      return false;
    }
    if (typeof where.code === "object" && Array.isArray(where.code.in) && !where.code.in.includes(role.code)) {
      return false;
    }
    if (where.id && role.id !== where.id) {
      return false;
    }
    return true;
  }

  function mapUserWithRelations(
    user: UserRecord,
    include?: { roles?: { include?: { role?: boolean } } | boolean }
  ): UserRecord & Record<string, unknown> {
    if (!include?.roles) {
      return { ...user };
    }
    const relations = userRoles
      .filter(relation => relation.userId === user.id)
      .map(relation => ({
        ...relation,
        role: getRoleById(relation.roleId)
      }));
    return {
      ...user,
      roles: relations
    };
  }

  type EnrollmentRelationArg =
    | true
    | {
        include?: { course?: boolean };
        select?: { courseId?: boolean };
      };

  type OrderIncludeInput = {
    user?: boolean;
    payments?: boolean;
    enrollment?: EnrollmentRelationArg;
  };

  type OrderIncludeArg = true | { include?: OrderIncludeInput };

  type PaymentIncludeArg = {
    order?: OrderIncludeArg;
  };

  type OrderByInput = Record<string, "asc" | "desc"> | Array<Record<string, "asc" | "desc">>;

  function getEnrollmentForOrder(order: OrderRecord) {
    if (order.enrollmentId) {
      return enrollments.find(record => record.id === order.enrollmentId) ?? null;
    }
    return enrollments.find(record => record.userId === order.userId) ?? null;
  }

  function buildEnrollmentPayload(order: OrderRecord, arg: EnrollmentRelationArg) {
    const enrollment = getEnrollmentForOrder(order);
    if (!enrollment) {
      return null;
    }
    if (arg === true) {
      return {
        ...enrollment,
        course: getCourseById(enrollment.courseId)
      };
    }
    if (arg.select) {
      const payload: Record<string, unknown> = {};
      if (arg.select.courseId) {
        payload.courseId = enrollment.courseId;
      }
      return payload;
    }
    const base: Record<string, unknown> = { ...enrollment };
    if (arg.include?.course) {
      base.course = getCourseById(enrollment.courseId);
    }
    return base;
  }

  function mapOrderRecord(order: OrderRecord, includeArg?: OrderIncludeArg): OrderRecord & Record<string, unknown> {
    const payload: Record<string, unknown> = { ...order };
    if (!includeArg) {
      return payload as OrderRecord & Record<string, unknown>;
    }
    if (includeArg === true) {
      return payload as OrderRecord & Record<string, unknown>;
    }
    const relations = includeArg.include ?? {};
    if (relations.user) {
      payload.user =
        getUserById(order.userId) ?? {
          id: order.userId,
          firstName: "Имя",
          lastName: "Фамилия",
          email: "user@example.com"
        };
    }
    if (relations.payments) {
      payload.payments = payments.filter(payment => payment.orderId === order.id);
    }
    if (relations.enrollment) {
      payload.enrollment = buildEnrollmentPayload(order, relations.enrollment);
    }
    return payload as OrderRecord & Record<string, unknown>;
  }

  function attachOrderToPayment(payment: PaymentRecord, include?: PaymentIncludeArg): PaymentRecord & Record<string, unknown> {
    if (!include?.order) {
      return { ...payment } as PaymentRecord & Record<string, unknown>;
    }
    const order = orders.find(record => record.id === payment.orderId) ?? null;
    return {
      ...payment,
      order: order ? mapOrderRecord(order, include.order) : null
    } as PaymentRecord & Record<string, unknown>;
  }

  function normalizeOrderClauses(orderBy?: OrderByInput): Array<{ key: string; direction: "asc" | "desc" }> {
    const clauses = Array.isArray(orderBy) ? orderBy : orderBy ? [orderBy] : [];
    return clauses.flatMap(clause =>
      Object.entries(clause).map(([key, direction]) => {
        const dir: "asc" | "desc" = direction === "desc" ? "desc" : "asc";
        return {
          key,
          direction: dir
        };
      })
    );
  }

  function normalizeComparable(value: unknown): number | string | undefined {
    if (value instanceof Date) {
      return value.getTime();
    }
    if (typeof value === "number" || typeof value === "string") {
      return value;
    }
    return undefined;
  }

  function compareByClauses<T extends object>(
    a: T,
    b: T,
    clauses: { key: string; direction: "asc" | "desc" }[]
  ) {
    for (const clause of clauses) {
      const dir = clause.direction === "desc" ? -1 : 1;
      const aValue = normalizeComparable((a as unknown as Record<string, unknown>)[clause.key]);
      const bValue = normalizeComparable((b as unknown as Record<string, unknown>)[clause.key]);
      if (aValue === bValue) {
        continue;
      }
      if (aValue === undefined) {
        return 1 * dir;
      }
      if (bValue === undefined) {
        return -1 * dir;
      }
      if (aValue > bValue) {
        return dir;
      }
      return -dir;
    }
    return 0;
  }

  function matchesPaymentWhere(payment: PaymentRecord, where?: Partial<PaymentRecord>) {
    if (!where) {
      return true;
    }
    return Object.entries(where).every(([key, value]) => {
      if (value === undefined) {
        return true;
      }
      return (payment as unknown as Record<string, unknown>)[key] === value;
    });
  }

  function getOrderPayments(orderId: string) {
    return payments.filter(payment => payment.orderId === orderId);
  }

  function matchesStringFilter(value: unknown, filter?: any): boolean {
    if (filter === undefined || filter === null) {
      return true;
    }
    if (typeof filter === "string") {
      return value === filter;
    }
    if (typeof value !== "string") {
      return false;
    }
    if (typeof filter.contains === "string") {
      return value.toLowerCase().includes(filter.contains.toLowerCase());
    }
    return true;
  }

  function matchesStatusCondition(value: string, condition?: any): boolean {
    if (!condition) {
      return true;
    }
    if (typeof condition === "string") {
      return value === condition;
    }
    if (Array.isArray(condition.in)) {
      return condition.in.includes(value);
    }
    return true;
  }

  function matchesPaymentCondition(payment: PaymentRecord, condition: any): boolean {
    if (!condition) {
      return true;
    }
    if (condition.provider && payment.provider !== condition.provider) {
      return false;
    }
    if (condition.status && !matchesStatusCondition(payment.status, condition.status)) {
      return false;
    }
    return true;
  }

  function matchesPaymentsRelation(order: OrderRecord, relation: any): boolean {
    if (!relation) {
      return true;
    }
    const relatedPayments = getOrderPayments(order.id);
    if (relation.some) {
      const hasMatch = relatedPayments.some(payment => matchesPaymentCondition(payment, relation.some));
      if (!hasMatch) {
        return false;
      }
    }
    if (relation.none) {
      const hasMatch = relatedPayments.some(payment => matchesPaymentCondition(payment, relation.none));
      if (hasMatch) {
        return false;
      }
    }
    return true;
  }

  function matchesUserClause(order: OrderRecord, clause: any): boolean {
    const user = getUserById(order.userId);
    if (!user) {
      return false;
    }
    if (clause.email && !matchesStringFilter(user.email, clause.email)) {
      return false;
    }
    if (clause.firstName && !matchesStringFilter(user.firstName, clause.firstName)) {
      return false;
    }
    if (clause.lastName && !matchesStringFilter(user.lastName, clause.lastName)) {
      return false;
    }
    if (clause.id && !matchesStringFilter(user.id, clause.id)) {
      return false;
    }
    return true;
  }

  function matchesCourseClause(course: CourseRecord | undefined, clause: any): boolean {
    if (!course) {
      return false;
    }
    if (clause.slug && !matchesStringFilter(course.slug, clause.slug)) {
      return false;
    }
    if (clause.titleRu && !matchesStringFilter(course.titleRu, clause.titleRu)) {
      return false;
    }
    if (clause.titleEn && !matchesStringFilter(course.titleEn, clause.titleEn)) {
      return false;
    }
    return true;
  }

  function matchesEnrollmentClause(order: OrderRecord, clause: any): boolean {
    const enrollment = getEnrollmentForOrder(order);
    if (!enrollment) {
      return false;
    }
    if (clause.courseId && enrollment.courseId !== clause.courseId) {
      return false;
    }
    if (clause.id && !matchesStringFilter(enrollment.id, clause.id)) {
      return false;
    }
    if (clause.course?.is && !matchesCourseClause(getCourseById(enrollment.courseId), clause.course.is)) {
      return false;
    }
    return true;
  }

  function matchesOrderWhere(order: OrderRecord, where?: any): boolean {
    if (!where) {
      return true;
    }
    if (Array.isArray(where.AND)) {
      return where.AND.every((clause: any) => matchesOrderWhere(order, clause));
    }
    if (Array.isArray(where.OR)) {
      return where.OR.some((clause: any) => matchesOrderWhere(order, clause));
    }
    if (where.status && order.status !== where.status) {
      return false;
    }
    if (where.currency && order.currency !== where.currency) {
      return false;
    }
    if (where.id && !matchesStringFilter(order.id, where.id)) {
      return false;
    }
    if (where.createdAt) {
      const { gte, lte } = where.createdAt;
      if (gte) {
        const gteDate = gte instanceof Date ? gte : new Date(gte);
        if (order.createdAt < gteDate) {
          return false;
        }
      }
      if (lte) {
        const lteDate = lte instanceof Date ? lte : new Date(lte);
        if (order.createdAt > lteDate) {
          return false;
        }
      }
    }
    if (where.user?.is && !matchesUserClause(order, where.user.is)) {
      return false;
    }
    if (where.enrollment?.is && !matchesEnrollmentClause(order, where.enrollment.is)) {
      return false;
    }
    if (where.payments && !matchesPaymentsRelation(order, where.payments)) {
      return false;
    }
    return true;
  }

  const prisma = {
    $connect: async () => undefined,
    $disconnect: async () => undefined,
    $queryRaw: async (..._args: any[]) => 1,
    $transaction: async (operations: any) => {
      if (Array.isArray(operations)) {
        return Promise.all(operations);
      }
      if (typeof operations === "function") {
        return operations(prisma);
      }
      return operations;
    },
    role: {
      upsert: async ({
        where,
        update,
        create
      }: {
        where: { id?: string; code?: string };
        update: Partial<RoleRecord>;
        create: { code: string; name: string };
      }) => {
        const index = roles.findIndex(role => {
          if (where.id && role.id === where.id) {
            return true;
          }
          if (where.code && role.code === where.code) {
            return true;
          }
          return false;
        });
        if (index >= 0) {
          const payload: RoleRecord = {
            ...roles[index],
            ...update
          };
          roles[index] = payload;
          return { ...payload };
        }
        const payload: RoleRecord = {
          id: `role-${++roleSequence}`,
          code: create.code,
          name: create.name
        };
        roles.push(payload);
        return { ...payload };
      },
      findMany: async ({ where, orderBy }: { where?: any; orderBy?: Record<string, "asc" | "desc"> } = {}) => {
        let result = roles.filter(role => matchesRoleWhere(role, where));
        if (orderBy?.name) {
          const dir = orderBy.name === "desc" ? -1 : 1;
          result = [...result].sort((a, b) => (a.name > b.name ? dir : -dir));
        }
        return result.map(role => ({ ...role }));
      }
    },
    userRole: {
      deleteMany: async ({ where }: { where?: { userId?: string } } = {}) => {
        const before = userRoles.length;
        for (let index = userRoles.length - 1; index >= 0; index -= 1) {
          const relation = userRoles[index];
          if (where?.userId && relation.userId !== where.userId) {
            continue;
          }
          userRoles.splice(index, 1);
        }
        return { count: before - userRoles.length };
      },
      create: async ({ data }: { data: { userId: string; roleId: string } }) => {
        const payload: UserRoleRecord = {
          id: `user-role-${++userRoleSequence}`,
          userId: data.userId,
          roleId: data.roleId
        };
        userRoles.push(payload);
        return { ...payload };
      }
    },
    course: {
      findMany: async () =>
        courses.map(course => ({
          id: course.id,
          slug: course.slug,
          titleRu: course.titleRu,
          titleEn: course.titleEn,
          descriptionRu: course.descriptionRu,
          descriptionEn: course.descriptionEn,
          level: course.level,
          durationMonths: course.durationMonths,
          priceRub: course.priceRub,
          priceUsd: course.priceUsd,
          priceKzt: course.priceKzt,
          category: course.category
        })),
      findUnique: async ({ where }: { where: { slug?: string; id?: string } }) => {
        if (!where) {
          return null;
        }
        const record = courses.find(course => course.slug === where.slug || course.id === where.id);
        if (!record) {
          return null;
        }
        return {
          ...record,
          modules: modules
            .filter(module => module.courseId === record.id)
            .map(module => ({
              ...module,
              lessons: getLessonsByModule(module.id)
            }))
        };
      }
    },
    module: {
      findMany: async ({ where }: { where: { courseId?: string } }) => {
        const filtered = where?.courseId
          ? modules.filter(module => module.courseId === where.courseId)
          : modules;
        return filtered.map(module => ({
          ...module,
          lessons: getLessonsByModule(module.id)
        }));
      },
      findUnique: async ({ where }: { where: { id: string } }) => {
        const module = modules.find(record => record.id === where.id);
        if (!module) {
          return null;
        }
        return {
          ...module,
          lessons: getLessonsByModule(module.id)
        };
      }
    },
    lesson: {
      findMany: async ({ where }: { where: { moduleId?: string } }) => {
        const filtered = where?.moduleId
          ? lessons.filter(lesson => lesson.moduleId === where.moduleId)
          : lessons;
        return filtered.map(lesson => ({
          ...lesson,
          quiz: lesson.quizId ? { id: lesson.quizId } : null
        }));
      },
      findUnique: async ({ where, include }: { where: { id: string }; include?: { quiz?: unknown; module?: boolean } }) => {
        const lesson = lessons.find(record => record.id === where.id);
        if (!lesson) {
          return null;
        }

        const result: Record<string, unknown> = {
          ...lesson
        };

        if (include?.quiz) {
          result.quiz = lesson.quizId ? { id: lesson.quizId } : null;
        }

        if (include?.module) {
          result.module = modules.find(record => record.id === lesson.moduleId) ?? null;
        }

        return result;
      }
    },
    lessonProgress: {
      findMany: async ({ where }: { where: { userId: string; lesson?: { module?: { courseId?: string } } } }) => {
        return lessonProgress.filter(record => {
          if (record.userId !== where.userId) {
            return false;
          }
          const requestedCourseId = where.lesson?.module?.courseId;
          if (!requestedCourseId) {
            return true;
          }
          return getCourseIdForLesson(record.lessonId) === requestedCourseId;
        });
      },
      findUnique: async ({ where }: { where: { userId_lessonId: { userId: string; lessonId: string } } }) => {
        const { userId, lessonId } = where.userId_lessonId;
        return lessonProgress.find(record => record.userId === userId && record.lessonId === lessonId) ?? null;
      },
      upsert: async ({ where, create }: { where: { userId_lessonId: { userId: string; lessonId: string } }; create: LessonProgressRecord; update: LessonProgressRecord }) => {
        const { userId, lessonId } = where.userId_lessonId;
        const existingIndex = lessonProgress.findIndex(record => record.userId === userId && record.lessonId === lessonId);
        const payload: LessonProgressRecord = {
          ...create,
          userId,
          lessonId,
          updatedAt: new Date()
        };
        if (existingIndex >= 0) {
          lessonProgress[existingIndex] = payload;
        } else {
          lessonProgress.push(payload);
        }
        return payload;
      }
    },
    enrollment: {
      findUnique: async ({ where }: { where: { id?: string; userId_courseId?: { userId: string; courseId: string } } }) => {
        const enrollment = where.userId_courseId
          ? enrollments.find(
              record => record.userId === where.userId_courseId?.userId && record.courseId === where.userId_courseId?.courseId
            )
          : enrollments.find(record => record.id === where.id);
        if (!enrollment) {
          return null;
        }
        return {
          ...enrollment,
          course: getCourseById(enrollment.courseId)
        };
      }
    },
    certificate: {
      findMany: async ({ where }: { where?: { enrollment?: { userId?: string } } }) => {
        return certificates
          .filter(record => {
            const requestedUserId = where?.enrollment?.userId;
            if (!requestedUserId) {
              return true;
            }
            const enrollment = enrollments.find(item => item.id === record.enrollmentId);
            return enrollment?.userId === requestedUserId;
          })
          .map(record => ({
            ...record,
            enrollment: {
              ...enrollments.find(item => item.id === record.enrollmentId)!,
              course: getCourseById(enrollments.find(item => item.id === record.enrollmentId)!.courseId)
            }
          }));
      },
      findUnique: async ({ where }: { where: { enrollmentId?: string; hash?: string } }) => {
        const record = certificates.find(
          certificate => certificate.enrollmentId === where.enrollmentId || certificate.hash === where.hash
        );
        if (!record) {
          return null;
        }
        return {
          ...record,
          enrollment: {
            ...enrollments.find(item => item.id === record.enrollmentId)!,
            course: getCourseById(enrollments.find(item => item.id === record.enrollmentId)!.courseId)
          }
        };
      },
      upsert: async ({ where, create }: { where: { enrollmentId: string }; create: CertificateRecord; update: CertificateRecord }) => {
        const index = certificates.findIndex(record => record.enrollmentId === where.enrollmentId);
        const payload: CertificateRecord = {
          id: index >= 0 ? certificates[index].id : `cert-${certificates.length + 1}`,
          enrollmentId: where.enrollmentId,
          pdfUrl: create.pdfUrl,
          hash: create.hash,
          issuedAt: create.issuedAt
        };
        if (index >= 0) {
          certificates[index] = payload;
        } else {
          certificates.push(payload);
        }
        return {
          ...payload,
          enrollment: {
            ...enrollments.find(item => item.id === payload.enrollmentId)!,
            course: getCourseById(enrollments.find(item => item.id === payload.enrollmentId)!.courseId)
          }
        };
      }
    }
    ,
    order: {
      findMany: async ({ take, skip, orderBy, where, include }: any = {}) => {
        const filtered = orders.filter(order => matchesOrderWhere(order, where));
        const clauses = normalizeOrderClauses(orderBy);
        const sorted = clauses.length ? [...filtered].sort((a, b) => compareByClauses(a, b, clauses)) : [...filtered];
        const start = Math.max(skip ?? 0, 0);
        const end = typeof take === "number" ? start + take : undefined;
        const sliced = sorted.slice(start, end);
        if (!include) {
          return sliced.map(order => ({ ...order }));
        }
        return sliced.map(order => mapOrderRecord(order, { include }));
      },
      count: async ({ where }: { where?: any } = {}) => {
        return orders.filter(order => matchesOrderWhere(order, where)).length;
      },
      findUnique: async ({ where, include }: { where: { id: string }; include?: OrderIncludeInput }) => {
        const order = orders.find(record => record.id === where.id);
        if (!order) {
          return null;
        }
        if (!include) {
          return { ...order };
        }
        return mapOrderRecord(order, { include });
      },
      update: async ({ where, data }: { where: { id: string }; data: Partial<OrderRecord> }) => {
        const index = orders.findIndex(order => order.id === where.id);
        if (index === -1) {
          throw new Error("Order not found");
        }
        const payload: OrderRecord = {
          ...orders[index],
          ...data,
          updatedAt: data.updatedAt ?? new Date()
        };
        orders[index] = payload;
        return payload;
      }
    },
    payment: {
      findMany: async ({ take, orderBy, include }: { take?: number; orderBy?: OrderByInput; include?: PaymentIncludeArg } = {}) => {
        const clauses = normalizeOrderClauses(orderBy);
        const sorted = clauses.length ? [...payments].sort((a, b) => compareByClauses(a, b, clauses)) : [...payments];
        const limited = typeof take === "number" ? sorted.slice(0, take) : sorted;
        return limited.map(payment => attachOrderToPayment(payment, include));
      },
      findFirst: async ({ where, orderBy, include }: { where?: Partial<PaymentRecord>; orderBy?: OrderByInput; include?: PaymentIncludeArg } = {}) => {
        const filtered = payments.filter(payment => matchesPaymentWhere(payment, where));
        if (!filtered.length) {
          return null;
        }
        const clauses = normalizeOrderClauses(orderBy);
        const candidate = clauses.length ? [...filtered].sort((a, b) => compareByClauses(a, b, clauses))[0] : filtered[0];
        return candidate ? attachOrderToPayment(candidate, include) : null;
      },
      create: async ({
        data
      }: {
        data: Partial<PaymentRecord> & Pick<PaymentRecord, "orderId" | "provider" | "status" | "amount" | "currency">;
      }) => {
        const record: PaymentRecord = {
          id: data.id ?? `payment-${payments.length + 1}`,
          orderId: data.orderId,
          provider: data.provider,
          status: data.status,
          amount: Number(data.amount),
          currency: data.currency,
          providerRef: data.providerRef ?? null,
          webhookPayload: data.webhookPayload ?? null,
          processedAt: data.processedAt ?? null,
          createdAt: data.createdAt ?? new Date()
        };
        payments.push(record);
        return record;
      },
      update: async ({ where, data }: { where: { id: string }; data: Partial<PaymentRecord> }) => {
        const index = payments.findIndex(payment => payment.id === where.id);
        if (index === -1) {
          throw new Error("Payment not found");
        }
        payments[index] = { ...payments[index], ...data };
        return payments[index];
      },
      findUnique: async ({ where, include }: { where: { id: string }; include?: PaymentIncludeArg }) => {
        const payment = payments.find(record => record.id === where.id);
        if (!payment) {
          return null;
        }
        return attachOrderToPayment(payment, include);
      }
    },
    user: {
      findMany: async ({ take, orderBy, include }: { take?: number; orderBy?: Record<string, "asc" | "desc">; include?: any } = {}) => {
        let sorted = [...users];
        if (orderBy?.createdAt) {
          const dir = orderBy.createdAt === "desc" ? -1 : 1;
          sorted.sort((a, b) => (a.createdAt > b.createdAt ? dir : -dir));
        }
        const limited = typeof take === "number" ? sorted.slice(0, take) : sorted;
        return limited.map(user => mapUserWithRelations(user, include));
      },
      findUnique: async ({ where, include }: { where: { id?: string; email?: string }; include?: any }) => {
        const record = users.find(user => (where.id && user.id === where.id) || (where.email && user.email === where.email));
        if (!record) {
          return null;
        }
        return mapUserWithRelations(record, include);
      }
    }
  };

  return prisma;
}
