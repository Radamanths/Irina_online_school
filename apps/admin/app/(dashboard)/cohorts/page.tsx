import { Button } from "@virgo/ui";
import { getCohortSummaries } from "../../../src/lib/api";
import { PageHeader } from "../../../src/components/page-header";
import { CohortDirectoryTable } from "../../../src/components/cohort-directory-table";

export default async function CohortsPage() {
  const cohorts = await getCohortSummaries();

  return (
    <>
      <PageHeader
        eyebrow="Потоки"
        title="Оперативный календарь"
        description="Контролируйте новые наборы и вовремя закрывайте потоки на выпуск."
        actions={<Button>Открыть набор</Button>}
      />
      <CohortDirectoryTable cohorts={cohorts} />
    </>
  );
}
