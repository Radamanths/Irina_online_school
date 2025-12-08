import { Button } from "@virgo/ui";
import Link from "next/link";
import { OrdersFeedTable } from "../../../src/components/orders-feed-table";
import { OrdersPagination } from "../../../src/components/orders-pagination";
import { PageHeader } from "../../../src/components/page-header";
import { getOrdersFeed } from "../../../src/lib/api";
import { buildOrdersFilterQuery, normalizeOrdersFilters } from "../../../src/lib/orders-filters";

interface OrdersPageProps {
  searchParams: Record<string, string | string[] | undefined>;
}

const PAGE_SIZE_OPTIONS = [25, 50, 100];
const DEFAULT_PAGE_SIZE = PAGE_SIZE_OPTIONS[0];

export default async function OrdersPage({ searchParams }: OrdersPageProps) {
  const initialFilters = normalizeOrdersFilters(searchParams);
  const currentPage = parsePage(searchParams.page);
  const pageSize = parsePageSize(searchParams.pageSize, PAGE_SIZE_OPTIONS, DEFAULT_PAGE_SIZE);
  const offset = (currentPage - 1) * pageSize;
  const ordersFeed = await getOrdersFeed(initialFilters, { limit: pageSize, offset });
  const orders = ordersFeed.items;
  const filtersQuery = buildOrdersFilterQuery(initialFilters);
  const exportHref = filtersQuery ? `/orders/export?${filtersQuery}` : "/orders/export";
  const rangeStart = ordersFeed.total === 0 ? 0 : ordersFeed.offset + 1;
  const rangeEnd = Math.min(ordersFeed.total, ordersFeed.offset + orders.length);

  return (
    <>
      <PageHeader
        eyebrow="Заказы"
        title="Лента заказов"
        description="Отслеживайте подписки и разовые заказы, контролируйте платежи и статусы выполнения."
        actions={
          <>
            <Link href={exportHref}>
              <Button variant="ghost">Экспорт</Button>
            </Link>
            <Button>Новый заказ</Button>
          </>
        }
      />
      <OrdersFeedTable orders={orders} initialFilters={initialFilters} filterMeta={ordersFeed.facets} />
      <OrdersPagination
        currentPage={currentPage}
        filters={initialFilters}
        hasNext={ordersFeed.hasMore}
        limit={ordersFeed.limit}
        total={ordersFeed.total}
        rangeStart={rangeStart}
        rangeEnd={rangeEnd}
        pageSize={pageSize}
        pageSizeOptions={PAGE_SIZE_OPTIONS}
        defaultPageSize={DEFAULT_PAGE_SIZE}
      />
    </>
  );
}

function parsePage(value: string | string[] | undefined): number {
  const raw = Array.isArray(value) ? value[0] : value;
  const parsed = raw ? Number(raw) : NaN;
  if (!Number.isFinite(parsed) || parsed < 1) {
    return 1;
  }
  return Math.floor(parsed);
}

function parsePageSize(
  value: string | string[] | undefined,
  options: number[],
  fallback: number
): number {
  const raw = Array.isArray(value) ? value[0] : value;
  const parsed = raw ? Number(raw) : NaN;
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  const normalized = Math.floor(parsed);
  return options.includes(normalized) ? normalized : fallback;
}
