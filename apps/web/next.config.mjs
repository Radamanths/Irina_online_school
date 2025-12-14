import createNextIntlPlugin from "next-intl/plugin";

const supportedLocales = ["ru", "en"];
const defaultLocale = "ru";

const legacyCourseSlugs = [
  { legacy: "product-growth-intensive", canonical: "product-growth" },
  { legacy: "ux-research-sprint", canonical: "ux-research" },
  { legacy: "data-analytics-bootcamp", canonical: "data-analytics" }
];

function buildLegacyRedirects() {
  const redirects = [];

  // Explicit slug rewrites need to run before broad patterns.
  for (const mapping of legacyCourseSlugs) {
    redirects.push({
      source: `/programs/${mapping.legacy}`,
      destination: `/${defaultLocale}/courses/${mapping.canonical}`,
      permanent: true
    });

    for (const locale of supportedLocales) {
      redirects.push({
        source: `/${locale}/programs/${mapping.legacy}`,
        destination: `/${locale}/courses/${mapping.canonical}`,
        permanent: true
      });
    }
  }

  redirects.push(
    { source: "/programs", destination: `/${defaultLocale}/courses`, permanent: true },
    { source: "/programs/:slug", destination: `/${defaultLocale}/courses/:slug`, permanent: true }
  );

  for (const locale of supportedLocales) {
    redirects.push(
      { source: `/${locale}/programs`, destination: `/${locale}/courses`, permanent: true },
      { source: `/${locale}/programs/:slug`, destination: `/${locale}/courses/:slug`, permanent: true }
    );
  }

  const staticPages = ["about", "courses"]; // Legacy WP pages without locale prefixes
  for (const page of staticPages) {
    redirects.push({
      source: `/${page}`,
      destination: `/${defaultLocale}/${page}`,
      permanent: true
    });
  }

  return redirects;
}

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: process.env.VERCEL ? undefined : "standalone",
  transpilePackages: ["@virgo/config", "@virgo/ui"],
  eslint: {
    ignoreDuringBuilds: true
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "virgoschool.com" },
      { protocol: "https", hostname: "images.ctfassets.net" }
    ]
  },
  env: {
    NEXT_PUBLIC_API_BASE: process.env.NEXT_PUBLIC_API_BASE || "http://localhost:4000"
  },
  async redirects() {
    return buildLegacyRedirects();
  }
};

export default withNextIntl(nextConfig);
