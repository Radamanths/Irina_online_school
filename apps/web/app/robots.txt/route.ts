import { getSiteUrl } from "../../../src/lib/site-url";

export function GET(): Response {
  const siteUrl = getSiteUrl();
  const sitemapUrl = `${siteUrl}/sitemap.xml`;
  const body = ["User-agent: *", "Allow: /", `Sitemap: ${sitemapUrl}`].join("\n");

  return new Response(body, {
    headers: {
      "Content-Type": "text/plain"
    }
  });
}
