import { Injectable, Logger } from "@nestjs/common";
import type { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { courseSeeds, SupportedLocale, translateText } from "./courses.data";

export interface CourseSummaryResponse {
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

export interface CourseDetailResponse extends CourseSummaryResponse {
  fullDescription: string;
  modules: Array<{
    id: string;
    title: string;
    duration: string;
    lessons: Array<{ id: string; title: string; type: string; length: string }>;
  }>;
}

type CourseSummaryRecord = Prisma.CourseGetPayload<{
  select: {
    id: true;
    slug: true;
    cohortCode: true;
    titleRu: true;
    titleEn: true;
    descriptionRu: true;
    descriptionEn: true;
    level: true;
    durationMonths: true;
    priceRub: true;
    priceUsd: true;
    priceKzt: true;
    category: true;
  };
}>;

type CourseWithOutline = Prisma.CourseGetPayload<{
  include: {
    modules: {
      orderBy: { orderIndex: "asc" };
      include: {
        lessons: {
          orderBy: { orderIndex: "asc" };
          include: { quiz: true };
        };
      };
    };
  };
}>;

@Injectable()
export class CoursesService {
  private readonly logger = new Logger(CoursesService.name);

  constructor(private readonly prisma: PrismaService) {}

  async listCourses(locale: string): Promise<CourseSummaryResponse[]> {
    const resolvedLocale = this.normalizeLocale(locale);
    const summaries = await this.fetchCourseSummaries(resolvedLocale);
    if (summaries.length) {
      return summaries;
    }

    this.logger.warn("Falling back to course seed data for list view");
    return courseSeeds.map(seed => this.mapSeedSummary(seed, resolvedLocale));
  }

  async getCourseDetail(slug: string, locale: string): Promise<CourseDetailResponse> {
    const resolvedLocale = this.normalizeLocale(locale);
    const dbCourse = await this.fetchCourseWithOutline(slug, resolvedLocale);
    if (dbCourse) {
      return dbCourse;
    }

    const seed = courseSeeds.find(course => course.slug === slug) || courseSeeds[0];
    this.logger.warn(`Course ${slug} not found in DB, returning seed copy`);
    return this.mapSeedDetail(seed, resolvedLocale);
  }

  private normalizeLocale(locale?: string): SupportedLocale {
    return locale === "en" ? "en" : "ru";
  }

  private async fetchCourseSummaries(locale: SupportedLocale): Promise<CourseSummaryResponse[]> {
    try {
      const delegate = (this.prisma as PrismaService & { course?: Prisma.CourseDelegate }).course;
      if (!delegate) {
        return [];
      }

      const records = (await delegate.findMany({
        where: { status: "published" },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          slug: true,
          titleRu: true,
          titleEn: true,
          descriptionRu: true,
          descriptionEn: true,
          level: true,
          durationMonths: true,
          priceRub: true,
          priceUsd: true,
          priceKzt: true,
          category: true,
          cohortCode: true
        }
      })) as CourseSummaryRecord[];

      return records.map(record => this.mapPrismaCourseSummary(record, locale));
    } catch (error) {
      this.logger.error("Failed to list courses from database", error instanceof Error ? error.stack : undefined);
      return [];
    }
  }

  private async fetchCourseWithOutline(
    slug: string,
    locale: SupportedLocale
  ): Promise<CourseDetailResponse | null> {
    try {
      const delegate = (this.prisma as PrismaService & { course?: Prisma.CourseDelegate }).course;
      if (!delegate) {
        return null;
      }

      const course = (await delegate.findUnique({
        where: { slug },
        include: {
          modules: {
            orderBy: { orderIndex: "asc" },
            include: {
              lessons: {
                orderBy: { orderIndex: "asc" },
                include: { quiz: true }
              }
            }
          }
        }
      })) as CourseWithOutline | null;

      if (!course) {
        return null;
      }

      return this.mapPrismaCourseDetail(course, locale);
    } catch (error) {
      this.logger.error(
        `Failed to fetch course ${slug} from database`,
        error instanceof Error ? error.stack : undefined
      );
      return null;
    }
  }

  private mapPrismaCourseSummary(course: CourseSummaryRecord, locale: SupportedLocale): CourseSummaryResponse {
    return {
      id: course.id,
      slug: course.slug,
      title: this.pickLocalized(course.titleRu, course.titleEn, locale),
      shortDescription: this.buildShortDescription(course, locale),
      level: course.level || (locale === "en" ? "All levels" : "Все уровни"),
      duration: this.formatCourseDuration(course.durationMonths, locale),
      price: this.formatPrice(course, locale),
      category: course.category || undefined,
      cohortCode: this.deriveCohortCode(course.slug, course.id, course.cohortCode)
    };
  }

  private mapPrismaCourseDetail(course: CourseWithOutline, locale: SupportedLocale): CourseDetailResponse {
    return {
      ...this.mapPrismaCourseSummary(course, locale),
      fullDescription: this.stripHtml(this.pickLocalized(course.descriptionRu, course.descriptionEn, locale)),
      modules: (course.modules || []).map(module => ({
        id: module.id,
        title: this.pickLocalized(module.titleRu, module.titleEn, locale),
        duration: this.formatModuleDuration(module.lessons, locale),
        lessons: (module.lessons || []).map(lesson => ({
          id: lesson.id,
          title: this.pickLocalized(lesson.titleRu, lesson.titleEn, locale),
          type: this.resolveLessonType(lesson.videoProvider, lesson.quiz?.id),
          length: this.formatMinutes(lesson.durationMinutes, locale)
        }))
      }))
    };
  }

  private resolveLessonType(videoProvider?: string | null, quizId?: string | null) {
    if (quizId) {
      return "quiz";
    }
    if (videoProvider) {
      return "video";
    }
    return "content";
  }

  private pickLocalized(
    ruValue?: string | null,
    enValue?: string | null,
    locale: SupportedLocale = "ru"
  ): string {
    const ru = ruValue?.trim();
    const en = enValue?.trim();
    if (locale === "en") {
      return en || ru || "";
    }
    return ru || en || "";
  }

  private buildShortDescription(
    course: { descriptionRu?: string | null; descriptionEn?: string | null },
    locale: SupportedLocale
  ) {
    const text = this.stripHtml(this.pickLocalized(course.descriptionRu, course.descriptionEn, locale));
    if (text.length <= 220) {
      return text;
    }
    return `${text.slice(0, 217)}…`;
  }

  private stripHtml(value?: string | null) {
    if (!value) {
      return "";
    }
    return value.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  }

  private formatCourseDuration(months?: number | null, locale: SupportedLocale = "ru") {
    if (!months) {
      return locale === "en" ? "Self-paced" : "В своём темпе";
    }
    if (locale === "en") {
      return months === 1 ? "1 month" : `${months} months`;
    }
    return `${months} мес.`;
  }

  private formatModuleDuration(
    lessons: { durationMinutes: number | null }[] = [],
    locale: SupportedLocale
  ) {
    const totalMinutes = lessons.reduce((total, lesson) => total + (lesson.durationMinutes || 0), 0);
    return this.formatMinutes(totalMinutes, locale, locale === "en" ? "Flexible pace" : "Гибкий темп");
  }

  private formatMinutes(value?: number | null, locale: SupportedLocale = "ru", fallback?: string) {
    if (!value) {
      return fallback || (locale === "en" ? "Self-paced" : "В своём темпе");
    }
    return locale === "en" ? `${value} min` : `${value} мин`;
  }

  private formatPrice(
    course: {
      priceRub: Prisma.Decimal | null;
      priceUsd: Prisma.Decimal | null;
      priceKzt: Prisma.Decimal | null;
    },
    locale: SupportedLocale
  ) {
    const preference = locale === "ru" ? ["RUB", "KZT", "USD"] : ["USD", "RUB", "KZT"];
    const values: Record<string, Prisma.Decimal | null> = {
      RUB: course.priceRub,
      USD: course.priceUsd,
      KZT: course.priceKzt
    };

    for (const currency of preference) {
      const decimal = values[currency];
      const amount = this.decimalToNumber(decimal);
      if (amount) {
        const formatter = new Intl.NumberFormat(locale === "en" ? "en-US" : "ru-RU", {
          style: "currency",
          currency
        });
        return formatter.format(amount);
      }
    }

    return locale === "en" ? "Contact us" : "По запросу";
  }

  private decimalToNumber(value?: Prisma.Decimal | null): number | null {
    if (!value) {
      return null;
    }

    if (typeof value === "number") {
      return value;
    }

    const maybeDecimal = value as unknown as { toNumber?: () => number; toString?: () => string };
    if (typeof maybeDecimal.toNumber === "function") {
      return maybeDecimal.toNumber();
    }

    if (typeof maybeDecimal.toString === "function") {
      const parsed = Number(maybeDecimal.toString());
      return Number.isNaN(parsed) ? null : parsed;
    }

    return null;
  }

  private mapSeedSummary(seed: (typeof courseSeeds)[number], locale: SupportedLocale): CourseSummaryResponse {
    return {
      id: seed.id,
      slug: seed.slug,
      title: translateText(seed.title, locale),
      shortDescription: translateText(seed.shortDescription, locale),
      level: seed.level,
      duration: seed.duration,
      price: seed.price,
      category: seed.category,
      cohortCode: seed.cohortCode ?? seed.slug.toUpperCase()
    };
  }

  private mapSeedDetail(seed: (typeof courseSeeds)[number], locale: SupportedLocale): CourseDetailResponse {
    return {
      ...this.mapSeedSummary(seed, locale),
      fullDescription: translateText(seed.fullDescription, locale),
      modules: seed.modules.map(module => ({
        id: module.id,
        title: translateText(module.title, locale),
        duration: module.duration,
        lessons: module.lessons.map(lesson => ({
          id: lesson.id,
          title: translateText(lesson.title, locale),
          type: lesson.type,
          length: lesson.length
        }))
      }))
    };
  }

  private deriveCohortCode(slug?: string | null, fallbackId?: string | null, stored?: string | null): string | null {
    const normalizedStored = this.normalizeCohortCode(stored);
    if (normalizedStored) {
      return normalizedStored;
    }
    const codeSource = slug || fallbackId;
    return codeSource ? codeSource.toUpperCase() : null;
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
}
