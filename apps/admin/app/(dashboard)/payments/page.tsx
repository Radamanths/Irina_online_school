import { Button } from "@virgo/ui";
import { getPaymentFeed } from "../../../src/lib/api";
import { PageHeader } from "../../../src/components/page-header";
import { PaymentFeedTable } from "../../../src/components/payment-feed-table";

export default async function PaymentsPage() {
  const payments = await getPaymentFeed();

  return (
    <>
      <PageHeader
        eyebrow="Платежи"
        title="Финансовый журнал"
        description="Контролируйте входящие платежи, статусы транзакций и повторные попытки."
        actions={
          <>
            <Button variant="ghost">Экспорт</Button>
            <Button>Создать счет</Button>
          </>
        }
      />
        <PaymentFeedTable payments={payments} />
    </>
  );
}
