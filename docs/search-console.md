# Search Console Checklist

This guide explains how to keep the Virgo marketing site connected to Google Search Console and how to verify that our localized routes keep indexing parity after each release.

## 1. Property Setup

1. Open [Google Search Console](https://search.google.com/search-console) and create a *Domain* property for `virgoschool.com`. If that is not available, fall back to a *URL prefix* property for `https://virgoschool.com`.
2. When Google offers verification methods, choose **HTML tag**.
3. Copy the token value from the meta snippet (the string inside `content="..."`).
4. Set the `GOOGLE_SITE_VERIFICATION` environment variable for every deployed environment:
   - `apps/web/.env.local` for local smoke tests.
   - Hosting provider secrets (Vercel, Render, etc.) for preview/staging/production.
5. Redeploy the site. The root layout (`apps/web/app/layout.tsx`) automatically injects the `<meta name="google-site-verification" />` tag once the env var is present.
6. Re-run verification inside Search Console; it should succeed instantly because the meta tag is live at `/`.

## 2. Submit the Sitemap

1. Visit `https://virgoschool.com/sitemap.xml` (served by `app/sitemap.ts`) and confirm it lists both RU/EN routes plus dynamic course slugs.
2. In Search Console, open the **Sitemaps** panel and submit the absolute URL `https://virgoschool.com/sitemap.xml`.
3. Repeat for staging domains if they use separate properties.
4. After each marketing release, spot-check the **Status** column; it should be `Success`. If Google reports errors, use the *See index coverage* link to inspect failing URLs.

## 3. Monitor Coverage & Enhancements

- **Coverage**: Ensure new localized pages move from *Discovered* to *Indexed*. Pay attention to `Submitted URL seems to be a Soft 404`—usually caused by missing locale slugs or incorrect redirects.
- **Enhancements**: Core Web Vitals and Mobile Usability signals come from real-user data. Track regressions per locale and log follow-up issues in the roadmap.
- **Manual Actions / Security**: Check this tab weekly during active launches.

## 4. Link Testing Workflow

Use the following lightweight checklist whenever we ship new marketing content or redirects:

1. **Before deploying**
   - Run `pnpm --filter @virgo/web lint` and smoke-test `/ru`, `/en`, `/sitemap.xml`, and `/robots.txt` locally.
   - Confirm any new redirects are present inside `apps/web/next.config.mjs` so Search Console will see the canonical target.
2. **After deploying**
   - Use Search Console's URL Inspection tool for the canonical page (e.g., `https://virgoschool.com/ru/courses`). Click *Test Live URL* to ensure crawlers see a 200 status.
   - Inspect at least one localized variant of every newly added course detail page.
   - Re-submit the sitemap if major route structures changed.
3. **Ongoing**
   - Schedule a weekly reminder to review Coverage reports and export any errors into the roadmap's Migration & SEO section.

## 5. Troubleshooting

| Symptom | Likely Cause | Fix |
|---------|--------------|-----|
| Property keeps losing verification | `GOOGLE_SITE_VERIFICATION` missing in environment | Re-add the env var and redeploy; confirm via `curl -I https://virgoschool.com` that the meta tag exists. |
| URLs stuck in `Submitted but not indexed` | Recently added locales or redirects | Use URL Inspection → *Request Indexing*; double-check the Next.js redirect map returns 301 to the localized page. |
| Sitemap shows 0 discovered URLs | Build failed or API returned empty course list | Visit the sitemap manually; if it is empty, ensure `fetchCourses` returns data or mock fallback is available. |

Keeping this checklist in rotation satisfies the roadmap item “Проверка ссылок/карточек в Search Console” and gives the content team a predictable process for every release.
