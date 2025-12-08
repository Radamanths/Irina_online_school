import { PageHeader } from "../../../src/components/page-header";
import { ProgressAutomationPanel } from "../../../src/components/progress-automation-panel";
import { DunningAutomationPanel } from "../../../src/components/dunning-automation-panel";
import { getProgressAutomationSettings } from "../../../src/lib/api";

export default async function AutomationPage() {
  const settings = await getProgressAutomationSettings();

  return (
    <>
      <PageHeader
        eyebrow="Автоматизация"
        title="Прогресс и вебхуки"
        description="Настройте адрес уроковых webhooks, чтобы CRM и автоматизации получали уведомления о завершении занятий."
      />
      <ProgressAutomationPanel settings={settings} />
      <DunningAutomationPanel />
    </>
  );
}
