"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import type { ChangeEvent, ReactNode } from "react";
import type { OrderRecord, OrdersFilterFacets } from "../lib/api";
import {
  applyOrdersFilters,
  buildOrdersFilterQuery,
  defaultOrdersFilters,
  ORDER_STATUS_FILTERS,
  PAYMENT_STATUS_FILTERS,
  type OrdersFilters,
  getRangePresetBounds,
  type RangePresetValue
} from "../lib/orders-filters";
import { DataTable, type DataTableColumn, type DataTableRow } from "./data-table";

interface OrderRow extends DataTableRow {
  order: ReactNode;
  student: string;
  cohort: string;
  amount: string;
  orderStatus: ReactNode;
  paymentStatus: ReactNode;
  updatedAt: string;
}

const columns: DataTableColumn[] = [
  { key: "order", label: "Заказ" },
  { key: "student", label: "Студент" },
  { key: "cohort", label: "Поток" },
  { key: "amount", label: "Сумма", align: "right" },
  { key: "orderStatus", label: "Статус заказа" },
  { key: "paymentStatus", label: "Статус платежа" },
  { key: "updatedAt", label: "Обновлен", align: "right" }
];

type StatusTone = "success" | "warning" | "danger" | "info" | "muted";

const RANGE_PRESETS: Array<{ value: Exclude<RangePresetValue, "custom">; label: string }> = [
  { value: "all", label: "Все время" },
  { value: "7d", label: "7 дней" },
  { value: "30d", label: "30 дней" },
  { value: "90d", label: "90 дней" }
];

const orderStatusMeta: Record<Exclude<OrderRecord["status"], undefined>, { label: string; tone: StatusTone }> = {
  pending: { label: "В обработке", tone: "warning" },
  requires_action: { label: "Требует действия", tone: "info" },
  completed: { label: "Завершен", tone: "success" },
  canceled: { label: "Отменен", tone: "muted" },
  refunded: { label: "Возврат", tone: "danger" }
};

const paymentStatusMeta = {
  paid: { label: "Оплачено", tone: "success" },
  pending: { label: "В ожидании", tone: "warning" },
  failed: { label: "Ошибка", tone: "danger" }
} as const;

export function OrdersFeedTable({
  orders,
  initialFilters = defaultOrdersFilters,
  filterMeta
}: {
  orders: OrderRecord[];
  initialFilters?: OrdersFilters;
  filterMeta?: OrdersFilterFacets;
}) {
  const [filters, setFilters] = useState<OrdersFilters>(initialFilters);
  const [, startTransition] = useTransition();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    setFilters(initialFilters);
  }, [initialFilters]);

  const methodOptions = useMemo(() => {
    const source = filterMeta?.methods?.length ? filterMeta.methods : Array.from(new Set(orders.map(order => order.method)));
    const normalized = ["all", ...source];
    if (filters.method !== "all" && !normalized.includes(filters.method)) {
      normalized.push(filters.method);
    }
    return Array.from(new Set(normalized));
  }, [filterMeta?.methods, orders, filters.method]);

  const cohortOptions = useMemo(() => {
    const source = filterMeta?.cohorts?.length ? filterMeta.cohorts : Array.from(new Set(orders.map(order => order.cohort).filter(Boolean)));
    const options = ["", ...source];
    if (filters.cohort && !options.includes(filters.cohort)) {
      options.push(filters.cohort);
    }
    return Array.from(new Set(options));
  }, [filterMeta?.cohorts, orders, filters.cohort]);

  const currencyOptions = useMemo(() => {
    const source = filterMeta?.currencies?.length ? filterMeta.currencies : Array.from(new Set(orders.map(order => order.currency).filter(Boolean)));
    const options = ["all", ...source];
    if (filters.currency !== "all" && !options.includes(filters.currency)) {
      options.push(filters.currency);
    }
    return Array.from(new Set(options));
  }, [filterMeta?.currencies, orders, filters.currency]);

  const applyRangePreset = (preset: RangePresetValue) => {
    const bounds = getRangePresetBounds(preset);
    updateFilters({
      rangePreset: preset,
      dateFrom: bounds.from,
      dateTo: bounds.to
    });
  };

  const handleDateChange = (key: "dateFrom" | "dateTo") => (event: ChangeEvent<HTMLInputElement>) => {
    updateFilters({ [key]: event.target.value, rangePreset: "custom" } as Partial<OrdersFilters>);
  };

  const updateFilters = (nextFilters: Partial<OrdersFilters>) => {
    setFilters(current => {
      const next = { ...current, ...nextFilters };
      startTransition(() => {
        const query = buildOrdersFilterQuery(next);
        router.replace(query ? `${pathname}?${query}` : pathname);
      });
      return next;
    });
  };

  const rows = useMemo(() => {
    return applyOrdersFilters(orders, filters).map<OrderRow>(order => {
        const orderStatus = orderStatusMeta[order.status] ?? {
          label: order.status,
          tone: "muted" as StatusTone
        };
        const paymentStatus = paymentStatusMeta[order.paymentStatus] ?? {
          label: order.paymentStatus,
          tone: "muted" as StatusTone
        };
        return {
          id: order.id,
          order: (
            <div>
              <Link href={`/orders/${order.id}`} className="table-primary-link" aria-label={`Открыть заказ ${order.id}`}>
                <strong>{order.id}</strong>
              </Link>
              <p className="table-subtitle">{order.method}</p>
            </div>
          ),
          student: order.student,
          cohort: order.cohort,
          amount: order.amount,
          orderStatus: (
            <span className={`status-pill status-pill--${orderStatus.tone}`}>{orderStatus.label}</span>
          ),
          paymentStatus: (
            <span className={`status-pill status-pill--${paymentStatus.tone}`}>{paymentStatus.label}</span>
          ),
          updatedAt: order.updatedAt
        };
        });
      }, [orders, filters]);

  return (
    <div className="table-stack">
      <div className="table-toolbar">
        <div className="table-toolbar__group">
          <label className="table-toolbar__label" htmlFor="order-search">
            Поиск
          </label>
          <input
            id="order-search"
            className="table-toolbar__search"
            placeholder="ID заказа, студент или поток"
            value={filters.search}
            onChange={(event: ChangeEvent<HTMLInputElement>) => updateFilters({ search: event.target.value })}
          />
        </div>
        <label className="table-toolbar__label" htmlFor="order-method-filter">
          Способ оплаты
        </label>
        <select
          id="order-method-filter"
          className="table-toolbar__select"
          value={filters.method}
          onChange={(event: ChangeEvent<HTMLSelectElement>) => updateFilters({ method: event.target.value })}
        >
          {methodOptions.map(option => (
            <option key={option} value={option}>
              {option === "all" ? "Все" : option}
            </option>
          ))}
        </select>
        <label className="table-toolbar__label" htmlFor="order-cohort-filter">
          Поток
        </label>
        <select
          id="order-cohort-filter"
          className="table-toolbar__select"
          value={filters.cohort}
          onChange={(event: ChangeEvent<HTMLSelectElement>) => updateFilters({ cohort: event.target.value })}
        >
          {cohortOptions.map(option => (
            <option key={option || "all-cohorts"} value={option}>
              {option ? option : "Все"}
            </option>
          ))}
        </select>
        <label className="table-toolbar__label" htmlFor="order-currency-filter">
          Валюта
        </label>
        <select
          id="order-currency-filter"
          className="table-toolbar__select"
          value={filters.currency}
          onChange={(event: ChangeEvent<HTMLSelectElement>) => updateFilters({ currency: event.target.value })}
        >
          {currencyOptions.map(option => (
            <option key={option} value={option}>
              {option === "all" ? "Любая" : option}
            </option>
          ))}
        </select>
        <div className="toolbar-filters" role="group" aria-label="Диапазон дат">
          {RANGE_PRESETS.map(preset => (
            <button
              key={preset.value}
              type="button"
              className="toolbar-chip"
              aria-pressed={filters.rangePreset === preset.value}
              onClick={() => applyRangePreset(preset.value)}
            >
              {preset.label}
            </button>
          ))}
        </div>
        <div className="table-toolbar__group">
          <label className="table-toolbar__label" htmlFor="orders-date-from">
            С
          </label>
          <input
            id="orders-date-from"
            type="date"
            className="table-toolbar__search"
            value={filters.dateFrom}
            onChange={handleDateChange("dateFrom")}
          />
        </div>
        <div className="table-toolbar__group">
          <label className="table-toolbar__label" htmlFor="orders-date-to">
            По
          </label>
          <input
            id="orders-date-to"
            type="date"
            className="table-toolbar__search"
            value={filters.dateTo}
            onChange={handleDateChange("dateTo")}
          />
        </div>
        <div className="toolbar-filters" role="group" aria-label="Статус заказа">
          {ORDER_STATUS_FILTERS.map(filter => (
            <button
              key={filter.value}
              type="button"
              className="toolbar-chip"
              aria-pressed={filters.orderStatus === filter.value}
              onClick={() => updateFilters({ orderStatus: filter.value })}
            >
              {filter.label}
            </button>
          ))}
        </div>
        <div className="toolbar-filters" role="group" aria-label="Статус платежа">
          {PAYMENT_STATUS_FILTERS.map(filter => (
            <button
              key={filter.value}
              type="button"
              className="toolbar-chip"
              aria-pressed={filters.paymentStatus === filter.value}
              onClick={() => updateFilters({ paymentStatus: filter.value })}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>
      <DataTable columns={columns} rows={rows} caption="Лента заказов" />
    </div>
  );
}
