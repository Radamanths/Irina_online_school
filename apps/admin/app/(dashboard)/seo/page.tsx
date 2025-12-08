import { PageHeader } from "../../../src/components/page-header";
import { SeoEditor } from "../../../src/components/seo-editor";
import { getSeoSettings } from "../../../src/lib/api";

export default async function SeoSettingsPage() {
  const settings = await getSeoSettings();

  return (
    <>
      <PageHeader
        eyebrow="SEO"
        title="Мета-теги и превью"
        description="Настройте заголовки и описания для публичных страниц, чтобы улучшить видимость в поиске."
      />
      <SeoEditor settings={settings} />
    </>
  );
}
