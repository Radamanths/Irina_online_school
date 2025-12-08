import Link from "next/link";
import type { CourseDetail, LessonDetail, LessonProgressStatus } from "../lib/types";
import { LessonVideoPlayer } from "./lesson-video-player";
import { OfflineBanner } from "./offline-banner";

interface LessonPlayerProps {
  locale: string;
  course: CourseDetail;
  lesson: LessonDetail;
  attachmentsLabel: string;
  videoFallbackLabel: string;
  lessonStatuses: Record<string, LessonProgressStatus>;
  statusCopy: Record<LessonProgressStatus, string>;
  offlineTitle: string;
  offlineDescription: string;
  offlineRetry: string;
}

export function LessonPlayer({
  locale,
  course,
  lesson,
  attachmentsLabel,
  videoFallbackLabel,
  lessonStatuses,
  statusCopy,
  offlineTitle,
  offlineDescription,
  offlineRetry
}: LessonPlayerProps) {
  return (
    <div className="lesson-player">
      <div className="lesson-player__body">
        <OfflineBanner
          title={offlineTitle}
          description={offlineDescription}
          retryLabel={offlineRetry}
          className="lesson-player__offline"
        />
        <header className="lesson-player__header">
          <p className="eyebrow">{course.title}</p>
          <h1>{lesson.title}</h1>
          <p className="lesson-player__meta">{formatDuration(lesson.durationMinutes, locale, course.duration)}</p>
        </header>
        <div className="lesson-player__video">
          <LessonVideoPlayer lessonId={lesson.id} lesson={lesson} fallbackLabel={videoFallbackLabel} />
        </div>
        {lesson.body && (
          <article className="lesson-player__content" dangerouslySetInnerHTML={{ __html: lesson.body }} />
        )}
        {renderAttachments(lesson.attachments, attachmentsLabel)}
      </div>
      <LessonSidebar
        locale={locale}
        course={course}
        activeLessonId={lesson.id}
        lessonStatuses={lessonStatuses}
        statusCopy={statusCopy}
      />
    </div>
  );
}

function renderAttachments(data: LessonDetail["attachments"], label: string) {
  if (!data) {
    return null;
  }

  const list = Array.isArray(data) ? data : [];
  if (list.length === 0) {
    return null;
  }

  return (
    <section className="lesson-player__attachments">
      <p className="eyebrow">{label}</p>
      <ul>
        {list.map((item, index) => {
          if (!item || typeof item !== "object") {
            return null;
          }

          const title = "label" in item && typeof item.label === "string" ? item.label : `Attachment ${index + 1}`;
          const url = "url" in item && typeof item.url === "string" ? item.url : undefined;

          if (!url) {
            return null;
          }

          return (
            <li key={url}>
              <a href={url} target="_blank" rel="noreferrer">
                {title}
              </a>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function LessonSidebar({
  locale,
  course,
  activeLessonId,
  lessonStatuses,
  statusCopy
}: {
  locale: string;
  course: CourseDetail;
  activeLessonId: string;
  lessonStatuses: Record<string, LessonProgressStatus>;
  statusCopy: Record<LessonProgressStatus, string>;
}) {
  return (
    <aside className="lesson-player__sidebar">
      <h2>{course.title}</h2>
      <ul>
        {course.modules.map(module => (
          <li key={module.id}>
            <p className="lesson-player__module-title">{module.title}</p>
            <ul>
              {module.lessons.map(lesson => (
                <li key={lesson.id}>
                  <Link
                    className={lesson.id === activeLessonId ? "active" : undefined}
                    href={buildLessonHref(locale, course.slug, lesson.id)}
                  >
                    <span className="lesson-player__lesson-text">
                      <span>{lesson.title}</span>
                      <span className="lesson-player__status">
                        {statusCopy[lessonStatuses[lesson.id] ?? "not_started"]}
                      </span>
                    </span>
                    <span className="lesson-player__badge">{lesson.type}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
    </aside>
  );
}

function buildLessonHref(locale: string, slug: string, lessonId: string) {
  return `/${locale}/dashboard/course/${slug}/lesson/${lessonId}`;
}

function formatDuration(value: number | null | undefined, locale: string, fallback: string) {
  if (!value) {
    return fallback;
  }
  if (locale === "en") {
    return value === 1 ? "1 min" : `${value} min`;
  }
  return `${value} мин`;
}
