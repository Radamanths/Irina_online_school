import type { CourseDetail, CourseSummary } from "./types";
import { defaultLocale, isLocale, type AppLocale } from "../../i18n/routing";

interface CourseMockBucket {
  summaries: CourseSummary[];
  details: Record<string, CourseDetail>;
}

const sharedModules = {
  uxResearch: {
    id: "ux-foundations",
    title: {
      ru: "Исследования пользователей",
      en: "User Research Foundations"
    },
    duration: "3 недели",
    lessons: [
      {
        id: "ux-interviews",
        title: { ru: "Глубинные интервью", en: "Customer Interviews" },
        type: "video",
        length: "18 мин"
      },
      {
        id: "ux-mapping",
        title: { ru: "Карта эмпатии", en: "Empathy Mapping" },
        type: "article",
        length: "12 мин"
      }
    ]
  },
  productGrowth: {
    id: "growth-systems",
    title: {
      ru: "Системы роста",
      en: "Growth Systems"
    },
    duration: "4 недели",
    lessons: [
      {
        id: "north-star",
        title: { ru: "North Star Metric", en: "North Star Metric" },
        type: "video",
        length: "22 мин"
      },
      {
        id: "experiments-stack",
        title: { ru: "Стек экспериментов", en: "Experiment Stack" },
        type: "workshop",
        length: "35 мин"
      }
    ]
  },
  dataBootcamp: {
    id: "data-core",
    title: {
      ru: "Основы аналитики",
      en: "Analytics Essentials"
    },
    duration: "5 недель",
    lessons: [
      {
        id: "python-refresh",
        title: { ru: "Python для аналитиков", en: "Python Refresh" },
        type: "lab",
        length: "40 мин"
      },
      {
        id: "dashboards",
        title: { ru: "Дашборды в Looker", en: "Looker Dashboards" },
        type: "video",
        length: "27 мин"
      }
    ]
  }
};

const courseMocks: Record<AppLocale, CourseMockBucket> = {
  ru: buildLocaleBucket("ru"),
  en: buildLocaleBucket("en")
};

function buildLocaleBucket(locale: AppLocale): CourseMockBucket {
  const t = (value: { ru: string; en: string }) => value[locale];

  const summaries: CourseSummary[] = [
    {
      id: "product-growth",
      slug: "product-growth",
      title: t({ ru: "Product Growth Intensive", en: "Product Growth Intensive" }),
      shortDescription: t({
        ru: "Научитесь строить систему экспериментов, которая масштабирует метрики",
        en: "Build an experimentation engine that scales product metrics"
      }),
      level: t({ ru: "Средний", en: "Intermediate" }),
      duration: "8 недель",
      price: locale === "ru" ? "68 000 ₽" : "$1,290",
      category: t({ ru: "Продукт", en: "Product" }),
      cohortCode: "PRODUCT-GROWTH"
    },
    {
      id: "ux-research",
      slug: "ux-research",
      title: t({ ru: "UX Research Sprint", en: "UX Research Sprint" }),
      shortDescription: t({
        ru: "От глубинных интервью до карт эмпатии за 4 недели",
        en: "Master interviews, field studies, and mapping in 4 weeks"
      }),
      level: t({ ru: "Старт", en: "Foundation" }),
      duration: "4 недели",
      price: locale === "ru" ? "42 000 ₽" : "$790",
      category: t({ ru: "Дизайн", en: "Design" }),
      cohortCode: "UX-RESEARCH"
    },
    {
      id: "data-analytics",
      slug: "data-analytics",
      title: t({ ru: "Data Analytics Bootcamp", en: "Data Analytics Bootcamp" }),
      shortDescription: t({
        ru: "Практика SQL, Python и визуализации на реальных кейсах",
        en: "Hands-on SQL, Python and visualization with production datasets"
      }),
      level: t({ ru: "Продвинутый", en: "Advanced" }),
      duration: "10 недель",
      price: locale === "ru" ? "74 000 ₽" : "$1,490",
      category: t({ ru: "Данные", en: "Data" }),
      cohortCode: "DATA-ANALYTICS"
    }
  ];

  const details: Record<string, CourseDetail> = {
    "product-growth": buildDetail(summaries[0], [sharedModules.productGrowth, sharedModules.uxResearch], locale, {
      ru: "Создайте команду роста, которая быстро тестирует гипотезы и масштабирует успешные эксперименты.",
      en: "Build a growth practice that tests bold bets and scales what works across the product."
    }),
    "ux-research": buildDetail(summaries[1], [sharedModules.uxResearch], locale, {
      ru: "Погрузитесь в исследования: от разработок скриптов до презентации инсайтов команде.",
      en: "Dive into discovery work, from interview guides to storytelling customer insights."
    }),
    "data-analytics": buildDetail(
      summaries[2],
      [sharedModules.dataBootcamp, sharedModules.productGrowth],
      locale,
      {
        ru: "Отстройте продвинутую аналитику: пайплайны данных, автоматизация и продуктовые дашборды.",
        en: "Level up analytics workflows with reliable pipelines, automation, and insightful dashboards."
      }
    )
  };

  return { summaries, details };
}

function buildDetail(
  summary: CourseSummary,
  moduleSources: {
    id: string;
    title: { ru: string; en: string };
    duration: string;
    lessons: { id: string; title: { ru: string; en: string }; type: string; length: string }[];
  }[],
  locale: AppLocale,
  description: { ru: string; en: string }
): CourseDetail {
  return {
    ...summary,
    fullDescription: description[locale],
    modules: moduleSources.map(source => ({
      id: source.id,
      title: source.title[locale],
      duration: source.duration,
      lessons: source.lessons.map(lesson => ({
        id: lesson.id,
        title: lesson.title[locale],
        type: lesson.type,
        length: lesson.length
      }))
    }))
  };
}

function resolveLocale(locale: string): AppLocale {
  return isLocale(locale) ? locale : defaultLocale;
}

export function getMockCourseSummaries(locale: string): CourseSummary[] {
  const resolved = resolveLocale(locale);
  return courseMocks[resolved].summaries.map(course => ({ ...course }));
}

export function getMockCourseDetail(slug: string, locale: string): CourseDetail | null {
  const resolved = resolveLocale(locale);
  const detail = courseMocks[resolved].details[slug];
  if (!detail) {
    return null;
  }
  return {
    ...detail,
    modules: detail.modules.map(module => ({
      ...module,
      lessons: module.lessons.map(lesson => ({ ...lesson }))
    }))
  };
}
