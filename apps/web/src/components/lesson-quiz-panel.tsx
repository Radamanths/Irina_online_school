import Link from "next/link";
import { Card } from "@virgo/ui";

interface LessonQuizPanelProps {
  locale: string;
  courseSlug: string;
  lessonId: string;
  heading: string;
  description: string;
  ctaLabel: string;
  unavailableLabel: string;
  quizId?: string | null;
}

export function LessonQuizPanel({
  locale,
  courseSlug,
  lessonId,
  heading,
  description,
  ctaLabel,
  unavailableLabel,
  quizId
}: LessonQuizPanelProps) {
  const quizHref = `/${locale}/dashboard/course/${courseSlug}/lesson/${lessonId}/quiz`;

  return (
    <Card className="lesson-quiz-panel">
      <div>
        <p className="eyebrow">{heading}</p>
        <p>{description}</p>
      </div>
      {quizId ? (
        <Link className="button" href={quizHref}>
          {ctaLabel}
        </Link>
      ) : (
        <p className="lesson-quiz-panel__unavailable">{unavailableLabel}</p>
      )}
    </Card>
  );
}
