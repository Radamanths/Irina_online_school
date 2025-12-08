import { PageHeader } from "../../../src/components/page-header";
import { MediaLibrary } from "../../../src/components/media-library";
import { getMediaLibrary } from "../../../src/lib/api";

export default async function MediaLibraryPage() {
  const assets = await getMediaLibrary();

  return (
    <>
      <PageHeader
        eyebrow="Контент"
        title="Медиабиблиотека"
        description="Храните обложки, трейлеры и методички в одном месте и делитесь прямыми ссылками с командой."
      />
      <MediaLibrary initialAssets={assets} />
    </>
  );
}
