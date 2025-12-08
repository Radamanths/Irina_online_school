export type SupportedLocale = "ru" | "en";

interface LocalizedText {
  ru: string;
  en: string;
}

interface LessonSeed {
  id: string;
  type: string;
  length: string;
  title: LocalizedText;
}

interface ModuleSeed {
  id: string;
  duration: string;
  title: LocalizedText;
  lessons: LessonSeed[];
}

interface CourseSeed {
  id: string;
  slug: string;
  level: string;
  duration: string;
  price: string;
  category: string;
  cohortCode?: string;
  title: LocalizedText;
  shortDescription: LocalizedText;
  fullDescription: LocalizedText;
  modules: ModuleSeed[];
}

export const courseSeeds: CourseSeed[] = [
  {
    id: "art-direction",
    slug: "art-direction",
    cohortCode: "ART-2025",
    level: "Middle",
    duration: "10 недель",
    price: "48 000 ₽",
    category: "Art Direction",
    title: {
      ru: "Арт-директор цифровых продуктов",
      en: "Art Director for Digital Products"
    },
    shortDescription: {
      ru: "Учимся собирать кросс-функциональные команды и управлять визуальными системами",
      en: "Build cross-functional teams and lead cohesive visual systems"
    },
    fullDescription: {
      ru: "Курс объединяет практику art-direction и продуктовый менеджмент, чтобы студенты могли уверенно вести бренды и digital-опыт.",
      en: "A blend of art-direction and product leadership for shipping confident digital experiences."
    },
    modules: [
      {
        id: "ad-foundations",
        duration: "12 часов",
        title: {
          ru: "Система и команда",
          en: "System & team"
        },
        lessons: [
          {
            id: "brief-ops",
            type: "live",
            length: "90 мин",
            title: {
              ru: "Операционные брифы",
              en: "Operational briefs"
            }
          },
          {
            id: "rituals",
            type: "async",
            length: "40 мин",
            title: {
              ru: "Командные ритуалы",
              en: "Team rituals"
            }
          }
        ]
      },
      {
        id: "ad-labs",
        duration: "16 часов",
        title: {
          ru: "Креативные лаборатории",
          en: "Creative labs"
        },
        lessons: [
          {
            id: "critique",
            type: "live",
            length: "120 мин",
            title: {
              ru: "Фасилитация критики",
              en: "Critique facilitation"
            }
          }
        ]
      }
    ]
  },
  {
    id: "motion-magic",
    slug: "motion-design",
    cohortCode: "MOTION-2025",
    level: "Junior+",
    duration: "8 недель",
    price: "36 000 ₽",
    category: "Motion",
    title: {
      ru: "Motion-дизайн для брендов",
      en: "Motion Design for Brands"
    },
    shortDescription: {
      ru: "Практики сторителлинга, 2D/3D и динамических гайдов",
      en: "Storytelling, 2D/3D craft, and motion systems"
    },
    fullDescription: {
      ru: "От референсов к продакшену: студенты проделывают полный цикл создания брендовых роликов.",
      en: "Students go from reference digging to final renders for branded films."
    },
    modules: [
      {
        id: "motion-story",
        duration: "10 часов",
        title: {
          ru: "Нарратив",
          en: "Narrative"
        },
        lessons: [
          {
            id: "beats",
            type: "async",
            length: "30 мин",
            title: {
              ru: "Структура битов",
              en: "Story beats"
            }
          }
        ]
      }
    ]
  }
];

export function translateText(text: LocalizedText, locale: SupportedLocale) {
  return text[locale] || text.ru;
}
