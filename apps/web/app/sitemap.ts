import type { MetadataRoute } from "next";
import { locales } from "../i18n/routing";
import { fetchCourses, fetchSeoSettings } from "../src/lib/api";
import { getSiteUrl } from "../src/lib/site-url";

const fallbackStaticSegments = ["", "/about", "/courses"] as const;

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = getSiteUrl();
  const lastModified = new Date();
  const [seoSettings] = await Promise.all([fetchSeoSettings()]);

  const seoSegments = new Set<string>(fallbackStaticSegments);
  for (const page of seoSettings.pages) {
    const slug = (page.slug || "/").trim() || "/";
    seoSegments.add(slug === "/" ? "" : slug);
  }

  const staticEntries = locales.flatMap(locale => {
    const prefix = `/${locale}`;
    return [...seoSegments].map(segment => {
      const path = segment === "" ? prefix : `${prefix}${segment}`;
      return {
        url: `${baseUrl}${path}`,
        lastModified
      } satisfies MetadataRoute.Sitemap[number];
    });
  });

  const dynamicCourseEntries = (
    await Promise.all(
      locales.map(async locale => {
        const courses = await fetchCourses(locale);
        return courses.map(course => {
          const slug = course.slug || course.id;
          return {
            url: `${baseUrl}/${locale}/courses/${slug}`,
            lastModified
          } satisfies MetadataRoute.Sitemap[number];
        });
      })
    )
  ).flat();

  return [...staticEntries, ...dynamicCourseEntries];
}
