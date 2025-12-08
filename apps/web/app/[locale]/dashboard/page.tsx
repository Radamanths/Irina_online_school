import { requireAuth } from "../../../src/lib/auth";
import { fetchUserCertificates, getBillingProfile, getDashboard, listUserOrders } from "../../../src/lib/api";
import { DashboardWidget } from "../../../src/components/dashboard-widget";
import { DashboardMetricCard } from "../../../src/components/dashboard-metric-card";
import { CourseProgressCard } from "../../../src/components/course-progress-card";
import { CertificateCard } from "../../../src/components/certificate-card";
import { CertificateUploader } from "../../../src/components/certificate-uploader";
import { BillingCard } from "../../../src/components/billing-card";
import { BillingProfileForm } from "../../../src/components/billing-profile-form";
import { OfflineBanner } from "../../../src/components/offline-banner";
import { getCopy } from "../../../src/lib/i18n.config";
import { buildCourseProgressSummary, createProgressMap } from "../../../src/lib/progress";
import type { CourseProgressSummary } from "../../../src/lib/progress";
import type { DashboardMetrics, DashboardWidget as DashboardWidgetType, EnrollmentSummary } from "../../../src/lib/types";

export default async function DashboardPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const user = await requireAuth();
  const [dashboard, certificates, ordersResponse, copy, billingProfile] = await Promise.all([
    getDashboard(user.id, locale),
    fetchUserCertificates(user.id, locale),
    listUserOrders(user.id, { take: 4 }),
    getCopy(locale),
    getBillingProfile(user.id)
  ]);

  const progressEntries = dashboard.progress ?? [];
  const progressMap = createProgressMap(progressEntries);
  const enrollments = dashboard.enrollments ?? [];
  const courseProgress = enrollments
    .map(enrollment => buildCourseProgressSummary(enrollment.course, progressMap, locale))
    .filter((summary): summary is CourseProgressSummary => summary !== null)
    .sort((a, b) => Number(b.hasEngagement) - Number(a.hasEngagement));

  const {
    account: {
      heading,
      progressHeading,
      progressEmpty,
      nextLessonLabel,
      resumeCta,
      lessonCountLabel,
      certificatesHeading,
      certificatesDescription,
      certificatesEmpty,
      certificateIssuedLabel,
      certificateDownloadLabel,
      certificatesUploadTitle,
      certificatesUploadSubtitle,
      certificatesUploadDrop,
      certificatesUploadButton,
      certificatesUploadHint,
      certificatesUploadStatusReady,
      certificatesUploadStatusUploading,
      certificatesUploadStatusSuccess,
      certificatesUploadStatusError,
      certificatesUploadErrorType,
      certificatesUploadErrorSize,
      offlineTitle,
      offlineDescription,
      offlineRetry,
      emptyStateEyebrow,
      emptyStateTitle,
      emptyStateDescription,
      emptyStateCta,
      progressStatsEyebrow,
      progressStatsTitle,
      progressStatsDescription,
      metricsHeading,
      metricsCompletedLabel,
      metricsWatchTimeLabel,
      metricsActiveLabel,
      metricsQuizLabel,
      billing: billingCopy
    }
  } = copy;

  const orders = ordersResponse.data ?? [];
  const courseTitleMap = buildCourseTitleMap(enrollments);

  const shouldShowOnboardingWidget = dashboard.widgets.length === 0 && courseProgress.length === 0;
  const onboardingWidget: DashboardWidgetType = {
    eyebrow: emptyStateEyebrow,
    title: emptyStateTitle,
    description: emptyStateDescription,
    cta: {
      label: emptyStateCta,
      href: `/${locale}/courses`
    }
  };
  const statsWidget = buildProgressWidget({
    courseProgress,
    progressStatsEyebrow,
    progressStatsTitle,
    progressStatsDescription
  });

  const widgetList = shouldShowOnboardingWidget
    ? [onboardingWidget]
    : [...dashboard.widgets, ...(statsWidget ? [statsWidget] : [])];

  const metricsCards = buildMetricCards({
    metrics: dashboard.metrics,
    locale,
    labels: {
      completed: metricsCompletedLabel,
      watch: metricsWatchTimeLabel,
      active: metricsActiveLabel,
      quizzes: metricsQuizLabel
    }
  });

  return (
    <section className="dashboard">
      <h1>{heading}</h1>
      <OfflineBanner title={offlineTitle} description={offlineDescription} retryLabel={offlineRetry} />
      <div className="grid">
        {widgetList.map(widget => (
          <DashboardWidget key={widget.title} widget={widget} />
        ))}
      </div>
      {metricsCards.length > 0 && (
        <section className="dashboard-metrics">
          <header>
            <h2>{metricsHeading}</h2>
          </header>
          <div className="dashboard-metrics__grid">
            {metricsCards.map(metric => (
              <DashboardMetricCard
                key={metric.label}
                label={metric.label}
                value={metric.value}
                description={metric.description}
              />
            ))}
          </div>
        </section>
      )}
      <section className="dashboard-progress">
        <header>
          <h2>{progressHeading}</h2>
        </header>
        {courseProgress.length === 0 ? (
          <p>{progressEmpty}</p>
        ) : (
          <div className="dashboard-progress__list">
            {courseProgress.map(summary => (
              <CourseProgressCard
                key={summary.course.id}
                summary={summary}
                nextLessonLabel={nextLessonLabel}
                resumeCta={resumeCta}
                lessonCountLabel={lessonCountLabel}
              />
            ))}
          </div>
        )}
      </section>
      <section className="dashboard-certificates">
        <header>
          <h2>{certificatesHeading}</h2>
          <p>{certificatesDescription}</p>
        </header>
        <CertificateUploader
          title={certificatesUploadTitle}
          subtitle={certificatesUploadSubtitle}
          dropLabel={certificatesUploadDrop}
          buttonLabel={certificatesUploadButton}
          hint={certificatesUploadHint}
          statusReady={certificatesUploadStatusReady}
          statusUploading={certificatesUploadStatusUploading}
          statusSuccess={certificatesUploadStatusSuccess}
          statusError={certificatesUploadStatusError}
          errorType={certificatesUploadErrorType}
          errorSize={certificatesUploadErrorSize}
        />
        {certificates.length === 0 ? (
          <p>{certificatesEmpty}</p>
        ) : (
          <div className="dashboard-certificates__list">
            {certificates.map(certificate => (
              <CertificateCard
                key={certificate.id}
                certificate={certificate}
                locale={locale}
                issuedLabel={certificateIssuedLabel}
                downloadLabel={certificateDownloadLabel}
              />
            ))}
          </div>
        )}
      </section>
      <section className="dashboard-billing">
        <header className="dashboard-billing__intro">
          <h2>{billingCopy.heading}</h2>
          <p>{billingCopy.description}</p>
        </header>
        <div className="dashboard-billing__grid">
          <BillingProfileForm locale={locale} profile={billingProfile} copy={billingCopy.profile} />
          <div className="dashboard-billing__orders">
            {orders.length === 0 ? (
              <p>{billingCopy.empty}</p>
            ) : (
              <div className="dashboard-billing__list">
                {orders.map(order => (
                  <BillingCard
                    key={order.id}
                    order={order}
                    locale={locale}
                    courseTitle={order.courseId ? courseTitleMap.get(order.courseId) : undefined}
                    copy={billingCopy}
                    hasBillingProfile={Boolean(billingProfile)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </section>
    </section>
  );
}

function buildProgressWidget({
  courseProgress,
  progressStatsEyebrow,
  progressStatsTitle,
  progressStatsDescription
}: {
  courseProgress: CourseProgressSummary[];
  progressStatsEyebrow: string;
  progressStatsTitle: string;
  progressStatsDescription: string;
}): DashboardWidgetType | null {
  if (courseProgress.length === 0) {
    return null;
  }

  const totals = courseProgress.reduce(
    (acc, summary) => {
      acc.completed += summary.completedLessons;
      acc.total += summary.totalLessons;
      return acc;
    },
    { completed: 0, total: 0 }
  );

  const percent = totals.total ? Math.round((totals.completed / totals.total) * 100) : 0;

  return {
    eyebrow: progressStatsEyebrow,
    title: progressStatsTitle.replace("{percent}", percent.toString()),
    description: progressStatsDescription
      .replace("{completed}", totals.completed.toString())
      .replace("{active}", courseProgress.length.toString())
  };
}

function buildMetricCards({
  metrics,
  locale,
  labels
}: {
  metrics?: DashboardMetrics;
  locale: string;
  labels: { completed: string; watch: string; active: string; quizzes: string };
}) {
  if (!metrics) {
    return [];
  }

  const formatter = new Intl.NumberFormat(locale === "en" ? "en-US" : "ru-RU");

  return [
    { label: labels.completed, value: formatter.format(metrics.completedLessons) },
    { label: labels.watch, value: formatter.format(metrics.minutesWatched) },
    { label: labels.active, value: formatter.format(metrics.activeCourses) },
    { label: labels.quizzes, value: formatter.format(metrics.passedQuizzes) }
  ];
}

function buildCourseTitleMap(enrollments: EnrollmentSummary[]) {
  const map = new Map<string, string>();
  enrollments.forEach(enrollment => {
    const courseId = enrollment.course?.id;
    if (courseId) {
      map.set(courseId, enrollment.course.title);
    }
  });
  return map;
}