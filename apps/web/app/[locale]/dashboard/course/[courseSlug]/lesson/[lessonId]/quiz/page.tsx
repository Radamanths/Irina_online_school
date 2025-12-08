import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { LessonQuizClient } from "../../../../../../../../src/components/lesson-quiz-client";
import { LessonGateNotice } from "../../../../../../../../src/components/lesson-gate-notice";
import { requireAuth } from "../../../../../../../../src/lib/auth";
import {
  checkEnrollmentAccess,
  fetchCourseDetail,
  fetchLessonDetail,
  fetchQuizDetail,
  fetchQuizSubmissions,
  submitQuizAttempt
} from "../../../../../../../../src/lib/api";
import { getCopy } from "../../../../../../../../src/lib/i18n.config";
import type { CourseDetail, QuizAnswerInput, QuizSubmission } from "../../../../../../../../src/lib/types";

interface LessonQuizParams {
  params: Promise<{ locale: string; courseSlug: string; lessonId: string }>;
}

export default async function LessonQuizPage({ params }: LessonQuizParams) {
  const { locale, courseSlug, lessonId } = await params;
  const user = await requireAuth();
  const course = await fetchCourseDetail(courseSlug, locale);
  if (!course) {
    notFound();
  }

  const lessonAccess = await checkEnrollmentAccess({ userId: user.id, lessonId }).catch(() => ({ allowed: false, reason: "UNKNOWN" }));
  if (!lessonAccess) {
    redirect(`/${locale}/dashboard?error=enrollment`);
  }

  const copy = await getCopy(locale);

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
        <Link className="lesson-page__back" href={`/${locale}/dashboard/course/${courseSlug}/lesson/${lessonId}`}>
          {copy.lessonPlayer.quizBackToLesson}
        </Link>
        <LessonGateNotice
          locale={locale}
          course={course}
          courseSlug={courseSlug}
          access={lessonAccess}
          copy={copy.lessonPlayer.locked}
        />
      </section>
    );
  }

  if (lessonAccess.courseId && lessonAccess.courseId !== course.id) {
    notFound();
  }

  const lesson = await fetchLessonDetail(lessonId, locale, user.id).catch(() => null);

  if (!lesson) {
    notFound();
  }

  const lessonExistsInCourse = course.modules.some((module: CourseDetail["modules"][number]) =>
    module.lessons.some(
      (courseLesson: CourseDetail["modules"][number]["lessons"][number]) => courseLesson.id === lesson.id
    )
  );
  if (!lessonExistsInCourse || !lesson.quizId) {
    notFound();
  }

  const {
    lessonPlayer: { quizHeading, quizPageTitle, quizPageDescription, quizBackToLesson },
    lessonQuiz
  } = copy;

  const [quiz, submissions] = await Promise.all([
    fetchQuizDetail(lesson.quizId, locale, user.id).catch(() => null),
    fetchQuizSubmissions(lesson.quizId, user.id).catch(() => [])
  ]);

  if (!quiz) {
    notFound();
  }

  async function submitAnswers(
    quizId: string,
    payload: { answers: QuizAnswerInput[]; elapsedSeconds: number | null }
  ): Promise<QuizSubmission> {
    "use server";
    const session = await requireAuth();
    const submission = await submitQuizAttempt(quizId, {
      userId: session.id,
      answers: payload.answers,
      elapsedSeconds: payload.elapsedSeconds ?? undefined,
      locale
    });
    revalidatePath(`/${locale}/dashboard`);
    revalidatePath(`/${locale}/dashboard/course/${courseSlug}`);
    revalidatePath(`/${locale}/dashboard/course/${courseSlug}/lesson/${lessonId}`);
    revalidatePath(`/${locale}/dashboard/course/${courseSlug}/lesson/${lessonId}/quiz`);
    return submission;
  }

  const submitQuiz = submitAnswers.bind(null, quiz.id);

  return (
    <section className="lesson-quiz">
      <Link
        className="lesson-page__back"
        href={`/${locale}/dashboard/course/${courseSlug}/lesson/${lessonId}`}
      >
        {quizBackToLesson}
      </Link>
      <article className="lesson-quiz__card">
        <p className="eyebrow">{quizHeading}</p>
        <h1>{lesson.title}</h1>
        <p>{quizPageTitle}</p>
        <p>{quizPageDescription}</p>
      </article>
      <LessonQuizClient
        locale={locale}
        quiz={quiz}
        submissions={submissions}
        copy={lessonQuiz}
        submitAttempt={submitQuiz}
      />
    </section>
  );
}
