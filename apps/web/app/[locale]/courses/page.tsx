import { fetchCourses } from "../../../src/lib/api";
import { CourseCatalog } from "../../../src/components/course-catalog";
import { getCopy } from "../../../src/lib/i18n.config";
import { buildSeoMetadata } from "../../../src/lib/seo";

export default async function CoursesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const courses = await fetchCourses(locale);
  const copy = await getCopy(locale);
  const { coursesList, coursesHome } = copy;
  return (
    <section className="stack">
      <h1>{coursesList.title}</h1>
      <CourseCatalog
        courses={courses}
        locale={locale}
        copy={{
          searchPlaceholder: coursesList.searchPlaceholder,
          categoryLabel: coursesList.categoryLabel,
          levelLabel: coursesList.levelLabel,
          clearFilters: coursesList.clearFilters,
          emptyState: coursesList.emptyState,
          detailCta: coursesHome.detailCta
        }}
      />
    </section>
  );
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return buildSeoMetadata(locale, "courses", "courses");
}
