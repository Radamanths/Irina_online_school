import type { OrderRecord } from "./api";

export const ORDER_STATUS_FILTERS = [
  { value: "all", label: "Все" },
  { value: "pending", label: "В обработке" },
  { value: "requires_action", label: "Требует действия" },
  { value: "completed", label: "Завершен" },
  { value: "canceled", label: "Отменен" },
  { value: "refunded", label: "Возврат" }
] as const;

export const PAYMENT_STATUS_FILTERS = [
  { value: "all", label: "Любой платеж" },
  { value: "paid", label: "Оплачено" },
  { value: "pending", label: "В ожидании" },
  { value: "failed", label: "Ошибка" }
] as const;

export type OrderStatusFilterValue = (typeof ORDER_STATUS_FILTERS)[number]["value"];
export type PaymentStatusFilterValue = (typeof PAYMENT_STATUS_FILTERS)[number]["value"];

export interface OrdersFilters {
  search: string;
  orderStatus: OrderStatusFilterValue;
  paymentStatus: PaymentStatusFilterValue;
  method: string;
  cohort: string;
  currency: string;
  dateFrom: string;
  dateTo: string;
  rangePreset: RangePresetValue;
}

export const defaultOrdersFilters: OrdersFilters = {
  search: "",
  orderStatus: "all",
  paymentStatus: "all",
  method: "all",
  cohort: "",
  currency: "all",
  dateFrom: "",
  dateTo: "",
  rangePreset: "all"
};

export const RANGE_PRESET_VALUES = ["all", "7d", "30d", "90d", "custom"] as const;
export type RangePresetValue = (typeof RANGE_PRESET_VALUES)[number];

function isRangePreset(value: string | undefined): value is RangePresetValue {
  return value ? RANGE_PRESET_VALUES.includes(value as RangePresetValue) : false;
}

type SearchParamsLike =
  | URLSearchParams
  | { get(name: string): string | null }
  | Readonly<Record<string, string | string[] | undefined>>
  | undefined;

function getParam(params: SearchParamsLike, key: string): string | undefined {
  if (!params) {
    return undefined;
  }

  if (typeof (params as { get?: unknown }).get === "function") {
    const value = (params as { get: (name: string) => string | null }).get(key);
    return value === null ? undefined : value;
  }

  const value = (params as Readonly<Record<string, string | string[] | undefined>>)[key];
  if (Array.isArray(value)) {
    return value[0];
  }
  return value;
}

function normalizeDateInput(value?: string): string | undefined {
  if (!value) {
    return undefined;
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }
  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) {
    return undefined;
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed;
  }
  return parsed.toISOString().split("T")[0];
}

export function normalizeOrdersFilters(params?: SearchParamsLike): OrdersFilters {
  const filters: OrdersFilters = { ...defaultOrdersFilters };

  const statusParam = getParam(params, "status");
  if (statusParam && ORDER_STATUS_FILTERS.some(filter => filter.value === statusParam)) {
    filters.orderStatus = statusParam as OrderStatusFilterValue;
  }

  const paymentParam = getParam(params, "paymentStatus");
  if (paymentParam && PAYMENT_STATUS_FILTERS.some(filter => filter.value === paymentParam)) {
    filters.paymentStatus = paymentParam as PaymentStatusFilterValue;
  }

  const methodParam = getParam(params, "method");
  if (methodParam && methodParam !== "all") {
    filters.method = methodParam;
  }

  const queryParam = getParam(params, "q");
  if (queryParam) {
    filters.search = queryParam.trim();
  }

  const cohortParam = getParam(params, "cohortCode") ?? getParam(params, "courseSlug") ?? getParam(params, "cohort");
  if (cohortParam) {
    filters.cohort = cohortParam.trim();
  }

  const currencyParam = getParam(params, "currency");
  if (currencyParam && currencyParam.trim()) {
    const normalized = currencyParam.trim().toUpperCase();
    filters.currency = normalized;
  }

  const fromParam = normalizeDateInput(getParam(params, "from"));
  if (fromParam) {
    filters.dateFrom = fromParam;
  }

  const toParam = normalizeDateInput(getParam(params, "to"));
  if (toParam) {
    filters.dateTo = toParam;
  }

  const rangePresetParam = getParam(params, "rangePreset");
  if (isRangePreset(rangePresetParam)) {
    filters.rangePreset = rangePresetParam;
  } else if (filters.dateFrom || filters.dateTo) {
    filters.rangePreset = "custom";
  }

  return filters;
}

export function buildOrdersFilterQuery(filters: OrdersFilters): string {
  const params = new URLSearchParams();

  if (filters.search.trim()) {
    params.set("q", filters.search.trim());
  }

  if (filters.orderStatus !== "all") {
    params.set("status", filters.orderStatus);
  }

  if (filters.paymentStatus !== "all") {
    params.set("paymentStatus", filters.paymentStatus);
  }

  if (filters.method !== "all") {
    params.set("method", filters.method);
  }

  if (filters.cohort.trim()) {
    const normalizedCohort = filters.cohort.trim();
    params.set("cohortCode", normalizedCohort);
    params.set("courseSlug", normalizedCohort);
  }

  if (filters.currency !== "all" && filters.currency.trim()) {
    params.set("currency", filters.currency.trim().toUpperCase());
  }

  if (filters.dateFrom) {
    params.set("from", filters.dateFrom);
  }

  if (filters.dateTo) {
    params.set("to", filters.dateTo);
  }

  if (filters.rangePreset !== "all") {
    params.set("rangePreset", filters.rangePreset);
  }

  return params.toString();
}

function parseBoundary(value: string, endOfDay = false): number | null {
  if (!value) {
    return null;
  }
  const base = new Date(value);
  if (Number.isNaN(base.getTime())) {
    return null;
  }
  if (endOfDay) {
    base.setHours(23, 59, 59, 999);
  }
  return base.getTime();
}

const PRESET_DAY_MAP: Record<Exclude<RangePresetValue, "all" | "custom">, number> = {
  "7d": 7,
  "30d": 30,
  "90d": 90
};

function formatDateInput(date: Date): string {
  return date.toISOString().split("T")[0];
}

export function getRangePresetBounds(
  preset: RangePresetValue,
  referenceDate: Date = new Date()
): { from: string; to: string } {
  if (preset === "all" || preset === "custom") {
    return { from: "", to: "" };
  }

  const totalDays = PRESET_DAY_MAP[preset];
  if (!totalDays) {
    return { from: "", to: "" };
  }

  const end = new Date(referenceDate);
  end.setHours(0, 0, 0, 0);
  const start = new Date(end);
  start.setDate(start.getDate() - (totalDays - 1));
  return {
    from: formatDateInput(start),
    to: formatDateInput(end)
  };
}

export function applyOrdersFilters(orders: OrderRecord[], filters: OrdersFilters): OrderRecord[] {
  const normalizedQuery = filters.search.trim().toLowerCase();
  const cohortFilter = filters.cohort.trim().toLowerCase();
  const currencyFilter = filters.currency.trim().toUpperCase();
  const fromBoundary = filters.dateFrom ? parseBoundary(filters.dateFrom) : null;
  const toBoundary = filters.dateTo ? parseBoundary(filters.dateTo, true) : null;

  return orders.filter(order => {
    const matchesOrderStatus = filters.orderStatus === "all" || order.status === filters.orderStatus;
    const matchesPaymentStatus = filters.paymentStatus === "all" || order.paymentStatus === filters.paymentStatus;
    const matchesMethod = filters.method === "all" || order.method === filters.method;
    const haystack = `${order.id} ${order.student} ${order.cohort}`.toLowerCase();
    const matchesQuery = normalizedQuery ? haystack.includes(normalizedQuery) : true;
    const matchesCohort = cohortFilter ? order.cohort.toLowerCase() === cohortFilter : true;
    const matchesCurrency = currencyFilter === "ALL" || order.currency === currencyFilter;
    const createdTimestamp = order.createdAtIso ? Date.parse(order.createdAtIso) : NaN;
    const matchesFrom = fromBoundary !== null ? (!Number.isNaN(createdTimestamp) && createdTimestamp >= fromBoundary) : true;
    const matchesTo = toBoundary !== null ? (!Number.isNaN(createdTimestamp) && createdTimestamp <= toBoundary) : true;

    return (
      matchesOrderStatus &&
      matchesPaymentStatus &&
      matchesMethod &&
      matchesQuery &&
      matchesCohort &&
      matchesCurrency &&
      matchesFrom &&
      matchesTo
    );
  });
}
