import Link from "next/link";
import { Card } from "@virgo/ui";
import type { CourseProgressSummary } from "../lib/progress";

interface CourseProgressCardProps {
  summary: CourseProgressSummary;
  nextLessonLabel: string;
  resumeCta: string;
  lessonCountLabel: string;
}

export function CourseProgressCard({ summary, nextLessonLabel, resumeCta, lessonCountLabel }: CourseProgressCardProps) {
  const formattedTotal = formatLessonCount(lessonCountLabel, summary.completedLessons, summary.totalLessons);
  return (
    <Card className="course-progress-card">
      <header className="course-progress-card__header">
        <div>
          <p className="eyebrow">{summary.course.level}</p>
          <h3>{summary.course.title}</h3>
        </div>
        <p className="course-progress-card__percent">{summary.completionPercent}%</p>
      </header>
      <div className="course-progress-card__progress">
        <p>{formattedTotal}</p>
        <div className="course-progress-card__bar" role="presentation">
          <span style={{ width: `${summary.completionPercent}%` }} />
        </div>
      </div>
      {summary.nextLesson && (
        <div className="course-progress-card__next">
          <p className="eyebrow">{nextLessonLabel}</p>
          <p className="course-progress-card__next-title">
            {summary.nextLesson.moduleTitle} · {summary.nextLesson.title}
          </p>
          <Link className="button button--ghost" href={summary.nextLesson.resumeUrl}>
            {resumeCta}
          </Link>
        </div>
      )}
      <ul className="course-progress-card__modules">
        {summary.modules.map(module => {
          const modulePercent = module.totalLessons ? Math.round((module.completedLessons / module.totalLessons) * 100) : 0;
          return (
            <li key={module.id}>
              <div>
                <p>{module.title}</p>
                <p className="eyebrow">{formatLessonCount(lessonCountLabel, module.completedLessons, module.totalLessons)}</p>
              </div>
              <div className="course-progress-card__bar course-progress-card__bar--compact" role="presentation">
                <span style={{ width: `${modulePercent}%` }} />
              </div>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}

function formatLessonCount(template: string, completed: number, total: number) {
  return template.replace("{completed}", completed.toString()).replace("{total}", total.toString());
}
