"use client";

import { useMemo, useState } from "react";
import type { ChangeEvent, ReactNode } from "react";
import type { PaymentRecord } from "../lib/api";
import { DataTable, type DataTableColumn, type DataTableRow } from "./data-table";

interface PaymentRow extends DataTableRow {
  receipt: ReactNode;
  student: string;
  cohort: string;
  amount: string;
  status: ReactNode;
  processedAt: string;
}

const columns: DataTableColumn[] = [
  { key: "receipt", label: "Платеж" },
  { key: "student", label: "Студент" },
  { key: "cohort", label: "Поток" },
  { key: "amount", label: "Сумма", align: "right" },
  { key: "status", label: "Статус" },
  { key: "processedAt", label: "Дата", align: "right" }
];

const statusFilters = [
  { value: "all", label: "Все" },
  { value: "paid", label: "Оплачено" },
  { value: "pending", label: "В ожидании" },
  { value: "failed", label: "Ошибка" }
] as const;

type StatusFilterValue = (typeof statusFilters)[number]["value"];

const paymentStatusMeta = {
  paid: { label: "Оплачено", tone: "success" },
  pending: { label: "В ожидании", tone: "warning" },
  failed: { label: "Ошибка", tone: "danger" }
} as const;

export function PaymentFeedTable({ payments }: { payments: PaymentRecord[] }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilterValue>("all");
  const [methodFilter, setMethodFilter] = useState("all");

  const methodOptions = useMemo<string[]>(() => {
    const unique = Array.from(new Set(payments.map(payment => payment.method)));
    return ["all", ...unique];
  }, [payments]);

  const filteredRows = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();
    return payments
      .filter(payment => {
        const matchesStatus = statusFilter === "all" || payment.status === statusFilter;
        const matchesMethod = methodFilter === "all" || payment.method === methodFilter;
        const haystack = `${payment.id} ${payment.student} ${payment.cohort}`.toLowerCase();
        const matchesQuery = normalizedQuery ? haystack.includes(normalizedQuery) : true;
        return matchesStatus && matchesMethod && matchesQuery;
      })
      .map<PaymentRow>(payment => {
        const status = paymentStatusMeta[payment.status];
        return {
          id: payment.id,
          receipt: (
            <div>
              <strong>{payment.id}</strong>
              <p className="table-subtitle">{payment.method}</p>
            </div>
          ),
          student: payment.student,
          cohort: payment.cohort,
          amount: payment.amount,
          status: <span className={`status-pill status-pill--${status.tone}`}>{status.label}</span>,
          processedAt: payment.processedAt
        };
      });
  }, [payments, statusFilter, methodFilter, searchQuery]);

  return (
    <div className="table-stack">
      <div className="table-toolbar">
        <div className="table-toolbar__group">
          <label className="table-toolbar__label" htmlFor="payment-search">
            Поиск
          </label>
          <input
            id="payment-search"
            className="table-toolbar__search"
            placeholder="ID платежа, студент или поток"
            value={searchQuery}
            onChange={(event: ChangeEvent<HTMLInputElement>) => setSearchQuery(event.target.value)}
          />
        </div>
        <label className="table-toolbar__label" htmlFor="payment-method">
          Провайдер
        </label>
        <select
          id="payment-method"
          className="table-toolbar__select"
          value={methodFilter}
          onChange={(event: ChangeEvent<HTMLSelectElement>) => setMethodFilter(event.target.value)}
        >
          {methodOptions.map(option => (
            <option key={option} value={option}>
              {option === "all" ? "Все" : option}
            </option>
          ))}
        </select>
        <div className="toolbar-filters" role="group" aria-label="Статус платежа">
          {statusFilters.map(filter => (
            <button
              key={filter.value}
              type="button"
              className="toolbar-chip"
              aria-pressed={statusFilter === filter.value}
              onClick={() => setStatusFilter(filter.value)}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>
      <DataTable columns={columns} rows={filteredRows} caption="Лента платежей" />
    </div>
  );
}
