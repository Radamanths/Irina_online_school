import { fetchCourseDetail } from "../../../../src/lib/api";
import { LessonList } from "../../../../src/components/lesson-list";
import { CheckoutCTA } from "../../../../src/components/checkout-cta";
import { getCopy } from "../../../../src/lib/i18n.config";
import { getSessionUser } from "../../../../src/lib/auth";
import { buildMetadata } from "../../../../src/lib/seo";

interface Props {
  params: Promise<{ locale: string; slug: string }>;
}

export default async function CourseDetailPage({ params }: Props) {
  const { locale, slug } = await params;
  const [course, user] = await Promise.all([fetchCourseDetail(slug, locale), getSessionUser()]);
  const {
    coursesDetail: { curriculumHeading }
  } = await getCopy(locale);
  return (
    <article className="course-detail">
      <header>
        <p className="eyebrow">{course.category}</p>
        <h1>{course.title}</h1>
        <p className="lead">{course.shortDescription}</p>
      </header>
      <section>
        <h2>{curriculumHeading}</h2>
        <LessonList modules={course.modules} locale={locale} />
      </section>
      <CheckoutCTA course={course} locale={locale} userId={user?.id ?? null} />
    </article>
  );
}

export async function generateMetadata({ params }: Props) {
  const { locale, slug } = await params;
  const [course, copy] = await Promise.all([fetchCourseDetail(slug, locale), getCopy(locale)]);
  const fallbackTitle = `${course.title} — ${copy.common.brandName}`;
  const fallbackDescription =
    course.shortDescription ?? course.fullDescription ?? copy.seo.courses.description;
  const title = course.seoTitle?.trim() || fallbackTitle;
  const description = course.seoDescription?.trim() || fallbackDescription;
  const keywords = course.seoKeywords
    ?.split(",")
    .map(keyword => keyword.trim())
    .filter(Boolean);

  return buildMetadata({
    locale,
    title,
    description,
    siteName: copy.common.brandName,
    path: `courses/${course.slug ?? slug}`,
    type: "article",
    image: course.seoImage?.trim() || undefined,
    keywords
  });
}
