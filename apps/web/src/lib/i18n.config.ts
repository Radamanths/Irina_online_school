import { getMessages } from "next-intl/server";
import ruMessages from "../../messages/ru.json";
import enMessages from "../../messages/en.json";

export const supportedLocales = ["ru", "en"] as const;
export type SupportedLocale = (typeof supportedLocales)[number];

type NavigationItem = { label: string; path: string };
type FooterSocial = { label: string; href: string };
type FooterCopy = {
  tagline: string;
  contact: string;
  legal: string;
  phone: string;
  whatsapp: string;
  address: string;
  cardLabel: string;
  cardNumber: string;
  paymentNote: string;
  contactLabel: string;
  paymentLabel: string;
  socialLabel: string;
  socials: readonly FooterSocial[];
};
type AboutStat = { value: string; label: string };

type AboutCopy = {
  title: string;
  intro: string;
  missionTitle: string;
  missionBody: string;
  methodTitle: string;
  methodDescription: string;
  methodHighlights: readonly string[];
  mentorsTitle: string;
  mentorsBody: string;
  ctaLabel: string;
  ctaDescription: string;
  stats: readonly AboutStat[];
};

type SeoEntry = {
  title: string;
  description: string;
};

type LessonStatusKey = "not_started" | "in_progress" | "completed";

type HomeCopy = {
  metrics: {
    eyebrow: string;
    title: string;
    description: string;
    items: readonly { value: string; label: string }[];
  };
  webinar: {
    eyebrow: string;
    title: string;
    description: string;
    details: readonly string[];
    ctaLabel: string;
    ctaHref: string;
    note: string;
  };
  education: {
    eyebrow: string;
    title: string;
    description: string;
    body: string;
    highlights: readonly string[];
  };
  programs: {
    eyebrow: string;
    title: string;
    description: string;
    cards: readonly {
      name: string;
      subtitle: string;
      duration: string;
      modules: string;
      price: string;
      href: string;
      linkLabel: string;
    }[];
    ctaLabel: string;
  };
  astroServices: {
    eyebrow: string;
    title: string;
    description: string;
    cards: readonly {
      name: string;
      description: string;
      duration: string;
      price: string;
      href: string;
    }[];
    ctaLabel: string;
    ctaHref: string;
  };
  application: {
    eyebrow: string;
    title: string;
    description: string;
    steps: readonly { title: string; description: string }[];
    note: string;
  };
  blogPreview: {
    eyebrow: string;
    title: string;
    description: string;
    posts: readonly { title: string; excerpt: string; href: string; tag: string }[];
    ctaLabel: string;
    ctaHref: string;
  };
  payment: {
    eyebrow: string;
    title: string;
    cards: readonly { label: string; details: readonly string[] }[];
    note: string;
  };
  contactPanel: {
    eyebrow: string;
    title: string;
    description: string;
    contacts: readonly { label: string; value: string; href?: string }[];
    socials: readonly FooterSocial[];
    ctaLabel: string;
    ctaHref: string;
  };
};

type ServicesPageCopy = {
  title: string;
  intro: string;
  cards: readonly {
    title: string;
    description: string;
    duration: string;
    price: string;
    features: readonly string[];
    ctaLabel: string;
    href: string;
  }[];
  note: string;
};

type ApplyPageCopy = {
  title: string;
  intro: string;
  steps: readonly { title: string; description: string }[];
  faq: {
    title: string;
    items: readonly { question: string; answer: string }[];
  };
  payment: {
    title: string;
    items: readonly { label: string; value: string }[];
  };
  contactCta: {
    label: string;
    href: string;
    caption: string;
  };
};

type BlogPageCopy = {
  title: string;
  intro: string;
  posts: readonly { title: string; excerpt: string; href: string; category: string }[];
  ctaLabel: string;
};

export type TranslationShape = {
  common: {
    brandName: string;
    navigation: {
      primary: readonly NavigationItem[];
      cta: NavigationItem;
    };
    footer: FooterCopy;
  };
  hero: {
    eyebrow: string;
    headline: string;
    subline: string;
    primaryCta: string;
    secondaryCta: string;
  };
  coursesHome: {
    eyebrow: string;
    heading: string;
    viewAll: string;
    detailCta: string;
  };
  coursesList: {
    title: string;
    searchPlaceholder: string;
    levelLabel: string;
    categoryLabel: string;
    clearFilters: string;
    emptyState: string;
  };
  coursesDetail: {
    curriculumHeading: string;
    lifetimeAccess: string;
  };
  checkout: {
    enroll: string;
    loginRequired: string;
    error: string;
    pageTitle: string;
    summaryHeading: string;
    orderIdLabel: string;
    amountLabel: string;
    statusLabel: string;
    providerLabel: string;
    testCardHeading: string;
    testCardNumberLabel: string;
    testCardExpiryLabel: string;
    testCardCvcLabel: string;
    testCardNote: string;
    paymentsListHeading: string;
    paymentsEmpty: string;
    backToCourses: string;
    supportNote: string;
    providerStripe: string;
    providerYooKassa: string;
    providerCloudPayments: string;
    providerManual: string;
    statusPending: string;
    statusProcessing: string;
    statusPaid: string;
    statusFailed: string;
    instructionsStripeTitle: string;
    instructionsStripeSteps: readonly string[];
    instructionsYooKassaTitle: string;
    instructionsYooKassaSteps: readonly string[];
    instructionsYooKassaCta: string;
    instructionsCloudPaymentsTitle: string;
    instructionsCloudPaymentsSteps: readonly string[];
    instructionsCloudPaymentsCta: string;
    instructionsGenericTitle: string;
    instructionsGenericStep: string;
    subscriptionHeading: string;
    subscriptionOneTimeLabel: string;
    subscriptionOneTimeDescription: string;
    subscriptionPlansLoading: string;
    subscriptionPlansError: string;
    subscriptionPlansEmpty: string;
    subscriptionSetupFeeLabel: string;
  };
  account: {
    heading: string;
    progressHeading: string;
    progressEmpty: string;
    nextLessonLabel: string;
    resumeCta: string;
    lessonCountLabel: string;
    completedCourse: string;
    emptyStateEyebrow: string;
    emptyStateTitle: string;
    emptyStateDescription: string;
    emptyStateCta: string;
    progressStatsEyebrow: string;
    progressStatsTitle: string;
    progressStatsDescription: string;
    metricsHeading: string;
    metricsCompletedLabel: string;
    metricsWatchTimeLabel: string;
    metricsActiveLabel: string;
    metricsQuizLabel: string;
    certificatesHeading: string;
    certificatesDescription: string;
    certificatesEmpty: string;
    certificateIssuedLabel: string;
    certificateDownloadLabel: string;
    certificatesUploadTitle: string;
    certificatesUploadSubtitle: string;
    certificatesUploadDrop: string;
    certificatesUploadButton: string;
    certificatesUploadHint: string;
    certificatesUploadStatusReady: string;
    certificatesUploadStatusUploading: string;
    certificatesUploadStatusSuccess: string;
    certificatesUploadStatusError: string;
    certificatesUploadErrorType: string;
    certificatesUploadErrorSize: string;
    offlineTitle: string;
    offlineDescription: string;
    offlineRetry: string;
    lessonLocked: {
      label: string;
      drip: string;
      dripFallback: string;
      prerequisite: string;
      prerequisiteFallback: string;
      cta: string;
    };
    billing: {
      heading: string;
      description: string;
      empty: string;
      courseLabel: string;
      courseFallback: string;
      statusLabel: string;
      createdAtLabel: string;
      subscriptionLabel: string;
      nextChargeLabel: string;
      cancellationScheduled: string;
      paymentsHeading: string;
      paymentsEmpty: string;
      notAvailable: string;
      actions: {
        cancelOrder: string;
        cancelSubscription: string;
        refund: string;
        processing: string;
        success: string;
        error: string;
      };
      paymentStatus: {
        paid: string;
        pending: string;
        failed: string;
        refunded: string;
      };
      orderStatus: {
        pending: string;
        requiresAction: string;
        completed: string;
        canceled: string;
        refunded: string;
      };
      subscriptionStatus: {
        trialing: string;
        active: string;
        pastDue: string;
        canceled: string;
      };
      types: {
        oneTime: string;
        subscription: string;
      };
    };
  };
  lessonPlayer: {
    videoFallback: string;
    attachments: string;
    markComplete: string;
    markInProgress: string;
    backLabel: string;
    statusLabel: string;
    offlineTitle: string;
    offlineDescription: string;
    offlineRetry: string;
    status: Record<LessonStatusKey, string>;
    quizHeading: string;
    quizDescription: string;
    quizCta: string;
    quizUnavailable: string;
    quizPageTitle: string;
    quizPageDescription: string;
    quizBackToLesson: string;
    locked: {
      title: string;
      description: string;
      dripTitle: string;
      dripSubtitle: string;
      dripFallback: string;
      prerequisiteTitle: string;
      prerequisiteSubtitle: string;
      prerequisiteFallback: string;
      genericReason: string;
      backCta: string;
    };
  };
  lessonQuiz: {
    scoreLabel: string;
    passScoreLabel: string;
    attemptsLabel: string;
    attemptsUnlimited: string;
    attemptsUsed: string;
    attemptsRemaining: string;
    historyHeading: string;
    noAttempts: string;
    submitLabel: string;
    submitSuccess: string;
    submitFailure: string;
    submitError: string;
    selectAnswerError: string;
    statusPassed: string;
    statusFailed: string;
    limitReached: string;
    questionLabel: string;
    singleChoiceHint: string;
    multiChoiceHint: string;
    lastAttemptLabel: string;
    attemptLabel: string;
    focusModeEnter: string;
    focusModeExit: string;
    focusHintTitle: string;
    focusHintTip: string;
    focusHintActive: string;
    focusHintLost: string;
    focusHintHidden: string;
    timerLabel: string;
    timerHint: string;
    timerExpired: string;
    summaryHeading: string;
    summaryScoreLabel: string;
    summaryAnswersLabel: string;
    summaryStatus: string;
    summaryCta: string;
    reportHeading: string;
    reportScoreLabel: string;
    reportTimeLabel: string;
    reportTimeHint: string;
    reportTimeFallback: string;
    reportSubmittedLabel: string;
    reportTip: string;
    reportRetakeCta: string;
    autoSubmitMessage: string;
    leaveWarningTitle: string;
    leaveWarning: string;
    navigatorHeading: string;
    navigatorSummary: string;
    navigatorAnswered: string;
    navigatorUnanswered: string;
    reviewHeading: string;
    reviewStatusCorrect: string;
    reviewStatusIncorrect: string;
    reviewStatusSkipped: string;
    reviewSelectedLabel: string;
    reviewCorrectLabel: string;
    reviewEmptyAnswer: string;
    reviewExplanationLabel: string;
  };
  about: AboutCopy;
  seo: {
    home: SeoEntry;
    about: SeoEntry;
    courses: SeoEntry;
    services: SeoEntry;
    apply: SeoEntry;
    blog: SeoEntry;
  };
  home: HomeCopy;
  servicesPage: ServicesPageCopy;
  applyPage: ApplyPageCopy;
  blogPage: BlogPageCopy;
};

const dictionary: Record<SupportedLocale, TranslationShape> = {
  ru: ruMessages as TranslationShape,
  en: enMessages as TranslationShape
};

function isSupportedLocale(locale: string): locale is SupportedLocale {
  return supportedLocales.includes(locale as SupportedLocale);
}

export async function getCopy(locale: string): Promise<TranslationShape> {
  const resolvedLocale = isSupportedLocale(locale) ? locale : "ru";
  try {
    const messages = await getMessages({ locale: resolvedLocale });
    return messages as TranslationShape;
  } catch {
    return dictionary[resolvedLocale];
  }
}
