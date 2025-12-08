import Link from "next/link";
import { CourseCard } from "../course-card";
import type { CourseSummary } from "../../lib/types";
import { getCopy } from "../../lib/i18n.config";

interface Props {
  locale: string;
  courses: CourseSummary[];
}

export async function CoursesPreview({ locale, courses }: Props) {
  const { coursesHome } = await getCopy(locale);

  return (
    <section className="stack">
      <header>
        <p className="eyebrow">{coursesHome.eyebrow}</p>
        <h2>{coursesHome.heading}</h2>
      </header>
      <div className="grid">
        {courses.map(course => (
          <CourseCard key={course.id} course={course} locale={locale} detailCta={coursesHome.detailCta} />
        ))}
      </div>
      <div>
        <Link className="button button--ghost" href={`/${locale}/courses`}>
          {coursesHome.viewAll}
        </Link>
      </div>
    </section>
  );
}
