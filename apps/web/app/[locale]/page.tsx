import { Hero } from "../../src/components/sections/hero";
import { CoursesPreview } from "../../src/components/sections/courses-preview";
import { LandingSections } from "../../src/components/sections/landing-sections";
import { fetchCourses } from "../../src/lib/api";
import { buildSeoMetadata } from "../../src/lib/seo";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return buildSeoMetadata(locale, "home");
}

export default async function LocaleHome({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const courses = await fetchCourses(locale);
  return (
    <>
      <Hero locale={locale} />
      <CoursesPreview locale={locale} courses={courses.slice(0, 3)} />
      <LandingSections locale={locale} />
    </>
  );
}
