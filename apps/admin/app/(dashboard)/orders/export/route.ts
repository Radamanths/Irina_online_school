import { getOrdersFeed } from "../../../../src/lib/api";
import type { OrderRecord } from "../../../../src/lib/api";
import { normalizeOrdersFilters } from "../../../../src/lib/orders-filters";

function escapeCsvValue(value: string): string {
  if (value.includes(",") || value.includes("\n") || value.includes("\"")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function buildOrdersCsv(rows: OrderRecord[]): string {
  const headers = [
    "Order ID",
    "Student",
    "Cohort",
    "Amount",
    "Currency",
    "Order Status",
    "Payment Status",
    "Method",
    "Created",
    "Created ISO",
    "Updated",
    "Updated ISO"
  ];

  const lines = rows.map(order =>
    [
      order.id,
      order.student,
      order.cohort,
      order.amount,
      order.currency,
      order.status,
      order.paymentStatus,
      order.method,
      order.createdAt,
      order.createdAtIso,
      order.updatedAt,
      order.updatedAtIso
    ].map(value => escapeCsvValue(String(value ?? ""))).join(",")
  );

  return [headers.join(","), ...lines].join("\n");
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const filters = normalizeOrdersFilters(url.searchParams);
  const rows: OrderRecord[] = [];
  const pageSize = 200;
  let offset = 0;

  while (true) {
    const page = await getOrdersFeed(filters, { limit: pageSize, offset });
    rows.push(...page.items);
    if (!page.hasMore || page.items.length === 0) {
      break;
    }
    offset = page.offset + page.items.length;
    if (offset >= page.total) {
      break;
    }
  }

  const csv = buildOrdersCsv(rows);
  const timestamp = new Date().toISOString().split("T")[0];

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="orders-${timestamp}.csv"`
    }
  });
}
