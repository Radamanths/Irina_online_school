import type { Metadata } from "next";
import { cache } from "react";
import { locales } from "../../i18n/routing";
import { fetchSeoSettings, type SeoSettings } from "./api";
import { getCopy } from "./i18n.config";
import { getSiteUrl } from "./site-url";

type SeoPageKey = keyof Awaited<ReturnType<typeof getCopy>>["seo"];

type BuildMetadataParams = {
  locale: string;
  title: string;
  description: string;
  siteName: string;
  path?: string;
  type?: "website" | "article";
  image?: string;
  keywords?: string[];
};

const baseUrl = getSiteUrl();

const openGraphLocales: Record<string, string> = {
  ru: "ru_RU",
  en: "en_US"
};

const defaultPageSlugs: Partial<Record<SeoPageKey, string>> = {
  home: "/",
  about: "/about",
  courses: "/courses",
  services: "/services",
  apply: "/apply",
  blog: "/blog"
};

const loadSeoSettings = cache(async () => fetchSeoSettings());

function mapLanguageAlternates(pathname: string) {
  return locales.reduce<Record<string, string>>((acc, locale) => {
    acc[locale] = `/${locale}${pathname}`;
    return acc;
  }, {});
}

function normalizePath(path?: string) {
  if (!path) return "";
  return path.startsWith("/") ? path : `/${path}`;
}

function normalizeSlugForMatch(slug?: string) {
  if (!slug) {
    return "/";
  }
  if (slug === "/") {
    return "/";
  }
  return slug.startsWith("/") ? slug : `/${slug}`;
}

function resolveImageUrl(image?: string) {
  if (!image) {
    return undefined;
  }
  if (image.startsWith("http://") || image.startsWith("https://")) {
    return image;
  }
  const normalized = image.startsWith("/") ? image : `/${image}`;
  return `${baseUrl}${normalized}`;
}

function selectSeoPageBySlug(settings: SeoSettings, path?: string) {
  const slugToMatch = normalizeSlugForMatch(path ?? "/");
  return settings.pages.find(entry => entry.slug === slugToMatch);
}

function resolveSeoPage(settings: SeoSettings, fallbackPage: SeoPageKey, path?: string) {
  return (
    selectSeoPageBySlug(settings, path) ||
    selectSeoPageBySlug(settings, defaultPageSlugs[fallbackPage]) ||
    settings.pages.find(entry => entry.id === fallbackPage)
  );
}

function extractKeywords(value?: string) {
  if (!value) {
    return undefined;
  }
  const parts = value
    .split(",")
    .map(part => part.trim())
    .filter(Boolean);
  return parts.length ? parts : undefined;
}

export function buildMetadata({
  locale,
  title,
  description,
  siteName,
  path,
  type = "website",
  image,
  keywords
}: BuildMetadataParams): Metadata {
  const normalized = normalizePath(path);
  const pathname = `/${locale}${normalized}`;
  const canonical = `${baseUrl}${pathname}`;
  const imageUrl = resolveImageUrl(image);
  const keywordList = keywords?.filter(Boolean);

  const metadata: Metadata = {
    title,
    description,
    alternates: {
      canonical,
      languages: mapLanguageAlternates(normalized)
    },
    openGraph: {
      title,
      description,
      url: canonical,
      siteName,
      locale: openGraphLocales[locale] ?? "en_US",
      type,
      images: imageUrl ? [{ url: imageUrl }] : undefined
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: imageUrl ? [imageUrl] : undefined
    }
  };

  if (keywordList && keywordList.length) {
    metadata.keywords = keywordList;
  }

  return metadata;
}

export async function buildSeoMetadata(locale: string, page: SeoPageKey, path?: string): Promise<Metadata> {
  return buildSeoMetadataForPath(locale, path, page);
}

export async function buildSeoMetadataForPath(
  locale: string,
  path?: string,
  fallbackPage: SeoPageKey = "home"
): Promise<Metadata> {
  const localeKey = locale === "en" ? "en" : "ru";
  const [copy, seoSettings] = await Promise.all([getCopy(locale), loadSeoSettings()]);
  const fallbackEntry = copy.seo[fallbackPage];
  const seoPage = resolveSeoPage(seoSettings, fallbackPage, path);
  const fields = seoPage?.locales?.[localeKey];

  return buildMetadata({
    locale,
    title: fields?.title?.trim() || fallbackEntry.title,
    description: fields?.description?.trim() || fallbackEntry.description,
    siteName: copy.common.brandName,
    path,
    image: seoPage?.image?.trim(),
    keywords: extractKeywords(fields?.keywords)
  });
}
