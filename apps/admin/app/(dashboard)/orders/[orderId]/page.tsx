import Link from "next/link";
import { notFound } from "next/navigation";
import { Button } from "@virgo/ui";
import { PageHeader } from "../../../../src/components/page-header";
import { DataTable, type DataTableColumn, type DataTableRow } from "../../../../src/components/data-table";
import { Timeline } from "../../../../src/components/timeline";
import { OrderActionsPanel } from "../../../../src/components/order-actions-panel";
import { PaymentLinkLauncher } from "../../../../src/components/payment-link-launcher";
import { PaymentLinkSummaryCard } from "../../../../src/components/payment-link-summary-card";
import { PaymentLinkHistory } from "../../../../src/components/payment-link-history";
import { InvoiceManager } from "../../../../src/components/invoice-manager";
import { getOrderDetail, type OrderDetail } from "../../../../src/lib/api";

interface OrderDetailPageProps {
  params: { orderId: string };
}

const paymentColumns: DataTableColumn[] = [
  { key: "attempt", label: "Попытка" },
  { key: "status", label: "Статус" },
  { key: "amount", label: "Сумма", align: "right" },
  { key: "processedAt", label: "Обновлено", align: "right" }
];

const orderStatusMeta = {
  pending: { label: "В обработке", tone: "warning" },
  requires_action: { label: "Требует действия", tone: "info" },
  completed: { label: "Завершен", tone: "success" },
  canceled: { label: "Отменен", tone: "muted" },
  refunded: { label: "Возврат", tone: "danger" }
} as const;

const paymentStatusMeta = {
  paid: { label: "Оплачено", tone: "success" },
  pending: { label: "В ожидании", tone: "warning" },
  failed: { label: "Ошибка", tone: "danger" }
} as const;

const invoiceStatusMeta = {
  pending: { label: "Готовится", tone: "warning" },
  issued: { label: "Выписан", tone: "success" },
  failed: { label: "Ошибка", tone: "danger" }
} as const;

function formatValue(value?: string | null): string {
  return value && value.trim().length > 0 ? value : "—";
}

function readSnapshotField(invoice: OrderDetail["invoice"], field: string): string | null {
  if (!invoice?.profileSnapshot || typeof invoice.profileSnapshot !== "object") {
    return null;
  }

  const rawValue = (invoice.profileSnapshot as Record<string, unknown>)[field];
  return typeof rawValue === "string" ? rawValue : null;
}

function buildPaymentRows(order: OrderDetail): DataTableRow[] {
  return order.paymentAttempts.map(attempt => {
    const status = paymentStatusMeta[attempt.status];
    return {
      id: attempt.id,
      attempt: (
        <div>
          <strong>{attempt.provider}</strong>
          {attempt.reference && <p className="table-subtitle">{attempt.reference}</p>}
        </div>
      ),
      status: <span className={`status-pill status-pill--${status.tone}`}>{status.label}</span>,
      amount: attempt.amount,
      processedAt: attempt.processedAt
    };
  });
}

export default async function OrderDetailPage({ params }: OrderDetailPageProps) {
  const order = await getOrderDetail(params.orderId);

  if (!order) {
    notFound();
  }

  const orderStatus = orderStatusMeta[order.status] ?? { label: order.status, tone: "muted" as const };
  const paymentStatus = paymentStatusMeta[order.paymentStatus] ?? {
    label: order.paymentStatus,
    tone: "muted" as const
  };
  const paymentRows = buildPaymentRows(order);
  const isRefunded = order.status === "refunded";
  const invoiceStatus = order.invoice
    ? invoiceStatusMeta[order.invoice.status] ?? { label: order.invoice.status, tone: "muted" as const }
    : null;
  const invoiceSnapshot = order.invoice
    ? {
        fullName: readSnapshotField(order.invoice, "fullName"),
        companyName: readSnapshotField(order.invoice, "companyName"),
        taxId: readSnapshotField(order.invoice, "taxId"),
        address: readSnapshotField(order.invoice, "address"),
        recordedAt: readSnapshotField(order.invoice, "recordedAt")
      }
    : null;
  const invoiceSnapshotHasData = Boolean(
    invoiceSnapshot && Object.values(invoiceSnapshot).some(value => typeof value === "string" && value.trim().length > 0)
  );

  return (
    <>
      <PageHeader
        eyebrow="Заказ"
        title={`Заказ ${order.id}`}
        description={`Создан ${order.createdAtFull}. Последнее обновление ${order.updatedAtFull}.`}
        actions={
          <>
            <Link href="/orders">
              <Button variant="ghost">К списку заказов</Button>
            </Link>
            <OrderActionsPanel
              orderId={order.id}
              isRefunded={isRefunded}
              lastReminderAt={order.lastReminderAt}
              reminderCount={order.reminderCount}
              refundReason={order.refundReason}
              refundProcessedAt={order.refundProcessedAt}
            />
            <PaymentLinkLauncher
              key={order.lastPaymentLink?.createdAtIso ?? "no-link"}
              orderId={order.id}
              initialLink={
                order.lastPaymentLink ? { ...order.lastPaymentLink, orderId: order.id } : null
              }
            />
          </>
        }
      />

      <section className="detail-grid">
        <article className="detail-card">
          <p className="eyebrow">Детали заказа</p>
          <dl className="detail-list">
            <div>
              <dt>ID заказа</dt>
              <dd>{order.id}</dd>
            </div>
            <div>
              <dt>Тип</dt>
              <dd>{order.type === "subscription" ? "Подписка" : "Разовый"}</dd>
            </div>
            <div>
              <dt>Статус заказа</dt>
              <dd>
                <span className={`status-pill status-pill--${orderStatus.tone}`}>{orderStatus.label}</span>
              </dd>
            </div>
            <div>
              <dt>Создан</dt>
              <dd>{order.createdAtFull}</dd>
            </div>
            <div>
              <dt>Обновлен</dt>
              <dd>{order.updatedAtFull}</dd>
            </div>
            <div>
              <dt>Последнее напоминание</dt>
              <dd>{order.lastReminderAt ?? "Еще не отправлялось"}</dd>
            </div>
            <div>
              <dt>Всего напоминаний</dt>
              <dd>{order.reminderCount}</dd>
            </div>
          </dl>
        </article>

        <article className="detail-card">
          <p className="eyebrow">Студент</p>
          <dl className="detail-list">
            <div>
              <dt>Имя</dt>
              <dd>{order.student}</dd>
            </div>
            <div>
              <dt>Email</dt>
              <dd>{order.studentEmail}</dd>
            </div>
            <div>
              <dt>Поток</dt>
              <dd>{order.cohort}</dd>
            </div>
            <div>
              <dt>Курс</dt>
              <dd>{order.courseTitle}</dd>
            </div>
          </dl>
        </article>

        <article className="detail-card">
          <p className="eyebrow">Оплата</p>
          <dl className="detail-list">
            <div>
              <dt>Сумма</dt>
              <dd>{order.amount}</dd>
            </div>
            <div>
              <dt>Валюта</dt>
              <dd>{order.currency}</dd>
            </div>
            <div>
              <dt>Способ</dt>
              <dd>{order.method}</dd>
            </div>
            <div>
              <dt>Статус платежа</dt>
              <dd>
                <span className={`status-pill status-pill--${paymentStatus.tone}`}>{paymentStatus.label}</span>
              </dd>
            </div>
            {order.refundProcessedAt && (
              <div>
                <dt>Дата возврата</dt>
                <dd>{order.refundProcessedAt}</dd>
              </div>
            )}
            {order.refundReason && (
              <div>
                <dt>Причина возврата</dt>
                <dd>{order.refundReason}</dd>
              </div>
            )}
          </dl>
        </article>
      </section>

      {(order.billingProfile || order.invoice) && (
        <section className="detail-grid">
          {order.billingProfile && (
            <article className="detail-card">
              <p className="eyebrow">Биллинг профиль</p>
              <dl className="detail-list">
                <div>
                  <dt>ФИО / контакт</dt>
                  <dd>{formatValue(order.billingProfile.fullName)}</dd>
                </div>
                <div>
                  <dt>Email</dt>
                  <dd>{formatValue(order.billingProfile.email)}</dd>
                </div>
                <div>
                  <dt>Компания</dt>
                  <dd>{formatValue(order.billingProfile.companyName)}</dd>
                </div>
                <div>
                  <dt>ИНН / VAT</dt>
                  <dd>{formatValue(order.billingProfile.taxId)}</dd>
                </div>
                <div>
                  <dt>Адрес</dt>
                  <dd>{formatValue(order.billingProfile.address)}</dd>
                </div>
                <div>
                  <dt>Телефон</dt>
                  <dd>{formatValue(order.billingProfile.phone)}</dd>
                </div>
                <div>
                  <dt>Обновлено</dt>
                  <dd>{formatValue(order.billingProfile.updatedAt)}</dd>
                </div>
              </dl>
            </article>
          )}

          {(order.invoice || order.billingProfile) && (
            <article className="detail-card">
              <p className="eyebrow">Счёт-фактура</p>
              <dl className="detail-list">
                <div>
                  <dt>ID документа</dt>
                  <dd>{formatValue(order.invoice?.id)}</dd>
                </div>
                <div>
                  <dt>Статус</dt>
                  <dd>
                    {invoiceStatus ? (
                      <span className={`status-pill status-pill--${invoiceStatus.tone}`}>{invoiceStatus.label}</span>
                    ) : (
                      "—"
                    )}
                  </dd>
                </div>
                <div>
                  <dt>Запрошен</dt>
                  <dd>{formatValue(order.invoice?.requestedAt)}</dd>
                </div>
                <div>
                  <dt>Комментарий</dt>
                  <dd>{formatValue(order.invoice?.notes)}</dd>
                </div>
              </dl>

              {order.invoice?.downloadUrl ? (
                <div>
                  <Link href={order.invoice.downloadUrl} target="_blank" rel="noreferrer">
                    <Button variant="ghost">Скачать PDF</Button>
                  </Link>
                </div>
              ) : (
                <p>{order.invoice ? "Файл ещё не сформирован" : "Счёт ещё не выпущен"}</p>
              )}

              {invoiceSnapshotHasData && invoiceSnapshot && (
                <dl className="detail-list">
                  <div>
                    <dt>ФИО (снимок)</dt>
                    <dd>{formatValue(invoiceSnapshot.fullName)}</dd>
                  </div>
                  <div>
                    <dt>Компания (снимок)</dt>
                    <dd>{formatValue(invoiceSnapshot.companyName)}</dd>
                  </div>
                  <div>
                    <dt>ИНН / VAT (снимок)</dt>
                    <dd>{formatValue(invoiceSnapshot.taxId)}</dd>
                  </div>
                  <div>
                    <dt>Адрес (снимок)</dt>
                    <dd>{formatValue(invoiceSnapshot.address)}</dd>
                  </div>
                  <div>
                    <dt>Зафиксировано</dt>
                    <dd>{formatValue(invoiceSnapshot.recordedAt)}</dd>
                  </div>
                </dl>
              )}

              <InvoiceManager
                orderId={order.id}
                invoice={order.invoice}
                billingProfilePresent={Boolean(order.billingProfile)}
              />
            </article>
          )}
        </section>
      )}

      {order.lastPaymentLink && <PaymentLinkSummaryCard link={{ ...order.lastPaymentLink, orderId: order.id }} />}
      {order.paymentLinkHistory.length > 0 && <PaymentLinkHistory links={order.paymentLinkHistory} />}

      <section className="detail-stack">
        <h2>Попытки оплаты</h2>
        <DataTable columns={paymentColumns} rows={paymentRows} caption="Журнал оплат" />
      </section>

      <section className="detail-card detail-card--wide">
        <p className="eyebrow">История событий</p>
        <Timeline events={order.timeline} />
      </section>

      {order.metadata && (
        <section className="detail-card detail-card--wide">
          <p className="eyebrow">Metadata</p>
          <pre className="detail-metadata">{JSON.stringify(order.metadata, null, 2)}</pre>
        </section>
      )}
    </>
  );
}
