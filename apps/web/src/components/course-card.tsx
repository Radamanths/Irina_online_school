import Link from "next/link";
import type { CourseSummary } from "../lib/types";
import { Card } from "@virgo/ui";

interface Props {
  course: CourseSummary;
  locale: string;
  detailCta: string;
}

export function CourseCard({ course, locale, detailCta }: Props) {
  return (
    <Card className="course-card">
      <p className="badge">{course.level}</p>
      <h3>{course.title}</h3>
      <p>{course.shortDescription}</p>
      <div className="course-card__meta">
        <span>{course.duration}</span>
        <span>{course.price}</span>
      </div>
      <Link className="course-card__cta" href={`/${locale}/courses/${course.slug}`}>
        {detailCta}
      </Link>
    </Card>
  );
}
