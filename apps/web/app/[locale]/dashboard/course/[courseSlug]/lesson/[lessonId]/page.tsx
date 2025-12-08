import { revalidatePath } from "next/cache";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { LessonPlayer } from "../../../../../../../src/components/lesson-player";
import { LessonQuizPanel } from "../../../../../../../src/components/lesson-quiz-panel";
import { LessonGateNotice } from "../../../../../../../src/components/lesson-gate-notice";
import { requireAuth } from "../../../../../../../src/lib/auth";
import {
  checkEnrollmentAccess,
  fetchCourseDetail,
  fetchLessonDetail,
  fetchUserProgress,
  updateLessonProgress
} from "../../../../../../../src/lib/api";
import { getCopy } from "../../../../../../../src/lib/i18n.config";
import type { CourseDetail, LessonProgressStatus } from "../../../../../../../src/lib/types";

interface LessonParams {
  params: Promise<{ locale: string; courseSlug: string; lessonId: string }>;
}

export default async function LessonPage({ params }: LessonParams) {
  const { locale, courseSlug, lessonId } = await params;
  const user = await requireAuth();
  const copy = await getCopy(locale);
  const {
    lessonPlayer: {
      backLabel,
      attachments: attachmentsLabel,
      videoFallback: videoFallbackLabel,
      quizHeading,
      quizDescription,
      quizCta,
      quizUnavailable,
      status: statusCopy,
      statusLabel,
      locked: lockedCopy,
      offlineTitle,
      offlineDescription,
      offlineRetry
    }
  } = copy;

  const course = await fetchCourseDetail(courseSlug, locale);
  if (!course) {
    notFound();
  }

  const lessonAccess = await checkEnrollmentAccess({ userId: user.id, lessonId }).catch(() => ({ allowed: false, reason: "UNKNOWN" }));
  if (!lessonAccess) {
    redirect(`/${locale}/dashboard?error=enrollment`);
  }

  if (!lessonAccess.allowed) {
    const enrollmentBlockedReasons = new Set(["NOT_ENROLLED", "INACTIVE", "UNKNOWN"]);
    if (!lessonAccess.reason || enrollmentBlockedReasons.has(lessonAccess.reason)) {
      redirect(`/${locale}/dashboard?error=enrollment`);
    }

    const gatingReasons = new Set(["DRIP_LOCKED", "PREREQUISITE_PENDING"]);
    if (!gatingReasons.has(lessonAccess.reason)) {
      redirect(`/${locale}/dashboard?error=enrollment`);
    }

    return (
      <section className="lesson-page lesson-page--locked">
        <Link className="lesson-page__back" href={`/${locale}/dashboard`}>
          {backLabel}
        </Link>
        <LessonGateNotice
          locale={locale}
          course={course}
          courseSlug={courseSlug}
          access={lessonAccess}
          copy={lockedCopy}
        />
      </section>
    );
  }

  if (lessonAccess.courseId && lessonAccess.courseId !== course.id) {
    notFound();
  }

  const [lesson, progress] = await Promise.all([
    fetchLessonDetail(lessonId, locale, user.id).catch(() => null),
    fetchUserProgress(user.id, course.id)
  ]);

  if (!lesson) {
    notFound();
  }

  const lessonExistsInCourse = course.modules.some((module: CourseDetail["modules"][number]) =>
    module.lessons.some(
      (courseLesson: CourseDetail["modules"][number]["lessons"][number]) => courseLesson.id === lesson.id
    )
  );
  if (!lessonExistsInCourse) {
    notFound();
  }

  const lessonStatuses = progress.reduce<Record<string, LessonProgressStatus>>((acc, entry) => {
    acc[entry.lessonId] = entry.status;
    return acc;
  }, {});
  const status = lessonStatuses[lesson.id] ?? "not_started";

  async function setStatus(nextStatus: LessonProgressStatus) {
    "use server";
    const userSession = await requireAuth();
    await updateLessonProgress({ userId: userSession.id, lessonId, status: nextStatus });
    revalidatePath(`/${locale}/dashboard`);
    revalidatePath(`/${locale}/dashboard/course/${courseSlug}`);
    revalidatePath(`/${locale}/dashboard/course/${courseSlug}/lesson/${lessonId}`);
  }

  const saveInProgress = setStatus.bind(null, "in_progress");
  const markCompleted = setStatus.bind(null, "completed");

  return (
    <section className="lesson-page">
      <Link className="lesson-page__back" href={`/${locale}/dashboard`}>
        {backLabel}
      </Link>
      <LessonPlayer
        locale={locale}
        course={course}
        lesson={lesson}
        attachmentsLabel={attachmentsLabel}
        videoFallbackLabel={videoFallbackLabel}
        lessonStatuses={lessonStatuses}
        statusCopy={statusCopy}
        offlineTitle={offlineTitle}
        offlineDescription={offlineDescription}
        offlineRetry={offlineRetry}
      />
      {lesson.quizId && (
        <LessonQuizPanel
          locale={locale}
          courseSlug={courseSlug}
          lessonId={lesson.id}
          heading={quizHeading}
          description={quizDescription}
          ctaLabel={quizCta}
          unavailableLabel={quizUnavailable}
          quizId={lesson.quizId}
        />
      )}
      <div className="lesson-page__actions">
        <p>
          {statusLabel}: {statusCopy[status]}
        </p>
        <div>
          <form action={saveInProgress}>
            <button type="submit" className="button button--ghost">
              {copy.lessonPlayer.markInProgress}
            </button>
          </form>
          <form action={markCompleted}>
            <button type="submit" className="button">
              {copy.lessonPlayer.markComplete}
            </button>
          </form>
        </div>
      </div>
    </section>
  );
}
