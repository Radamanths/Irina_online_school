import { buildSeoMetadata } from "../../../src/lib/seo";
import { getCopy } from "../../../src/lib/i18n.config";

interface PageParams {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: PageParams) {
  const { locale } = await params;
  return buildSeoMetadata(locale, "blog", "/blog");
}

export default async function BlogPage({ params }: PageParams) {
  const { locale } = await params;
  const { blogPage, common } = await getCopy(locale);
  const blogLabel = common.navigation.primary.find(item => item.path === "blog")?.label ?? blogPage.title;

  return (
    <div className="page">
      <section className="page-hero">
        <span className="pill">{blogLabel}</span>
        <h1>{blogPage.title}</h1>
        <p className="lead">{blogPage.intro}</p>
      </section>

      <section className="landing-panel landing-panel--blog-detail">
        <div className="blog-grid blog-grid--detail">
          {blogPage.posts.map(post => (
            <article key={post.title} className="blog-card">
              <span className="blog-card__category">{post.category}</span>
              <h3>{post.title}</h3>
              <p>{post.excerpt}</p>
              <a href={post.href} target="_blank" rel="noreferrer">
                {blogPage.ctaLabel}
              </a>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
