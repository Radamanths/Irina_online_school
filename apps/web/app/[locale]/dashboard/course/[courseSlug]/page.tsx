import Link from "next/link";
import { notFound } from "next/navigation";
import { checkEnrollmentAccess, fetchCourseDetail, fetchUserProgress } from "../../../../../src/lib/api";
import { requireAuth } from "../../../../../src/lib/auth";
import { buildCourseProgressSummary, createProgressMap } from "../../../../../src/lib/progress";
import { getCopy } from "../../../../../src/lib/i18n.config";
import type { CourseDetail, EnrollmentAccessCheck } from "../../../../../src/lib/types";
import type { TranslationShape } from "../../../../../src/lib/i18n.config";

interface CoursePageParams {
  params: Promise<{ locale: string; courseSlug: string }>;
}

export default async function CourseDashboardPage({ params }: CoursePageParams) {
  const { locale, courseSlug } = await params;
  const user = await requireAuth();
  const course = await fetchCourseDetail(courseSlug, locale);
  if (!course) {
    notFound();
  }

  const [progressEntries, lessonGateMap] = await Promise.all([
    fetchUserProgress(user.id, course.id),
    buildLessonGateMap(course, user.id)
  ]);

  const progressMap = createProgressMap(progressEntries);
  const summary = buildCourseProgressSummary(course, progressMap, locale);

  if (!summary) {
    notFound();
  }

  const copy = await getCopy(locale);
  const {
    account: {
      nextLessonLabel,
      resumeCta,
      lessonCountLabel,
      completedCourse,
      progressEmpty,
      lessonLocked: lessonLockedCopy
    },
    coursesDetail: { curriculumHeading },
    lessonPlayer: { backLabel, status: statusCopy }
  } = copy;
  const moduleProgressMap = new Map(summary.modules.map(module => [module.id, module]));
  const moduleTitleMap = new Map(course.modules.map(module => [module.id, module.title]));

  return (
    <section className="course-dashboard">
      <Link className="course-dashboard__back" href={`/${locale}/dashboard`}>
        {backLabel}
      </Link>
      <header className="course-dashboard__header">
        <p className="eyebrow">{course.level}</p>
        <h1>{course.title}</h1>
        <p className="lead">{course.shortDescription}</p>
        <div className="course-dashboard__stats">
          <p className="course-dashboard__percent">{summary.completionPercent}%</p>
          <p className="eyebrow">{formatLessonCount(lessonCountLabel, summary.completedLessons, summary.totalLessons)}</p>
        </div>
        {summary.nextLesson ? (
          <div className="course-dashboard__next">
            <p className="eyebrow">{nextLessonLabel}</p>
            <p>
              {summary.nextLesson.moduleTitle} · {summary.nextLesson.title}
            </p>
            <Link className="button" href={summary.nextLesson.resumeUrl}>
              {resumeCta}
            </Link>
          </div>
        ) : (
          <p className="course-dashboard__completed">{completedCourse}</p>
        )}
      </header>
      <section className="course-dashboard__modules">
        <h2>{curriculumHeading}</h2>
        {course.modules.length === 0 ? (
          <p>{progressEmpty}</p>
        ) : (
          course.modules.map(module => (
            <article className="course-dashboard__module" key={module.id}>
              <header>
                <div>
                  <h3>{module.title}</h3>
                  <p className="eyebrow">
                    {formatLessonCount(
                      lessonCountLabel,
                      moduleProgressMap.get(module.id)?.completedLessons || 0,
                      module.lessons.length
                    )}
                  </p>
                </div>
              </header>
              <ul>
                {module.lessons.map(lesson => {
                  const status = progressMap.get(lesson.id)?.status ?? "not_started";
                  const gate = lessonGateMap.get(lesson.id);
                  const isLocked = Boolean(gate);
                  const reasonText = gate
                    ? formatLockedReason(gate, lessonLockedCopy, locale, moduleTitleMap)
                    : null;
                  const lessonClassNames = ["course-dashboard__lesson"];
                  if (isLocked) {
                    lessonClassNames.push("course-dashboard__lesson--locked");
                  }
                  return (
                    <li key={lesson.id} className={lessonClassNames.join(" ")}>
                      <div>
                        <p>{lesson.title}</p>
                        <p className="eyebrow">{isLocked ? lessonLockedCopy.label : statusCopy[status]}</p>
                        {reasonText && <p className="course-dashboard__lesson-lock">{reasonText}</p>}
                      </div>
                      {isLocked ? (
                        <span className="button button--ghost button--disabled">{lessonLockedCopy.cta}</span>
                      ) : (
                        <Link
                          className="button button--ghost"
                          href={`/${locale}/dashboard/course/${courseSlug}/lesson/${lesson.id}`}
                        >
                          {resumeCta}
                        </Link>
                      )}
                    </li>
                  );
                })}
              </ul>
            </article>
          ))
        )}
      </section>
    </section>
  );
}

function formatLessonCount(template: string, completed: number, total: number) {
  return template.replace("{completed}", completed.toString()).replace("{total}", total.toString());
}

async function buildLessonGateMap(course: CourseDetail, userId: string): Promise<Map<string, EnrollmentAccessCheck>> {
  const lessonIds = course.modules.flatMap(module => module.lessons.map(lesson => lesson.id));
  if (lessonIds.length === 0) {
    return new Map();
  }

  const gatingReasons = new Set(["DRIP_LOCKED", "PREREQUISITE_PENDING"]);
  const checks = await Promise.allSettled(
    lessonIds.map(lessonId => checkEnrollmentAccess({ userId, lessonId }))
  );

  return checks.reduce((map, result, index) => {
    if (result.status === "fulfilled") {
      const value = result.value;
      if (value && !value.allowed && value.reason && gatingReasons.has(value.reason)) {
        map.set(lessonIds[index], value);
      }
    }
    return map;
  }, new Map<string, EnrollmentAccessCheck>());
}

function formatLockedReason(
  gate: EnrollmentAccessCheck,
  copy: TranslationShape["account"]["lessonLocked"],
  locale: string,
  moduleTitleMap: Map<string, string>
): string | null {
  if (gate.reason === "DRIP_LOCKED") {
    if (gate.unlockAt) {
      const formatter = new Intl.DateTimeFormat(locale === "en" ? "en-US" : "ru-RU", {
        dateStyle: "long",
        timeStyle: "short"
      });
      return copy.drip.replace("{date}", formatter.format(new Date(gate.unlockAt)));
    }
    return copy.dripFallback;
  }

  if (gate.reason === "PREREQUISITE_PENDING") {
    if (gate.prerequisiteModuleId) {
      const moduleTitle = moduleTitleMap.get(gate.prerequisiteModuleId);
      if (moduleTitle) {
        return copy.prerequisite.replace("{module}", moduleTitle);
      }
    }
    return copy.prerequisiteFallback;
  }

  return null;
}
