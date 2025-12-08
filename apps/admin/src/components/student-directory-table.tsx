"use client";

import { useMemo, useState } from "react";
import type { ChangeEvent, ReactNode } from "react";
import type { StudentProfile } from "../lib/api";
import { DataTable, type DataTableColumn, type DataTableRow } from "./data-table";

interface StudentRow extends DataTableRow {
  student: ReactNode;
  course: string;
  cohort: string;
  progress: ReactNode;
  payment: ReactNode;
  lastActivity: string;
}

const columns: DataTableColumn[] = [
  { key: "student", label: "Студент" },
  { key: "course", label: "Курс" },
  { key: "cohort", label: "Поток" },
  { key: "progress", label: "Прогресс" },
  { key: "payment", label: "Оплата" },
  { key: "lastActivity", label: "Активность", align: "right" }
];

const paymentFilters = [
  { value: "all", label: "Все" },
  { value: "paid", label: "Оплачено" },
  { value: "trial", label: "Пробный" },
  { value: "overdue", label: "Просрочка" }
] as const;

type PaymentFilterValue = (typeof paymentFilters)[number]["value"];

const paymentStatusMeta = {
  paid: { label: "Оплачено", tone: "success" },
  overdue: { label: "Просрочка", tone: "danger" },
  trial: { label: "Пробный период", tone: "info" }
} as const;

export function StudentDirectoryTable({ students }: { students: StudentProfile[] }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [paymentFilter, setPaymentFilter] = useState<PaymentFilterValue>("all");

  const filteredRows = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();
    return students
      .filter(student => {
        const matchesPayment = paymentFilter === "all" || student.paymentStatus === paymentFilter;
        const matchesQuery = normalizedQuery
          ? `${student.name} ${student.course} ${student.cohort}`.toLowerCase().includes(normalizedQuery)
          : true;
        return matchesPayment && matchesQuery;
      })
      .map<StudentRow>(student => {
        const payment = paymentStatusMeta[student.paymentStatus];
        return {
          id: student.id,
          student: (
            <div>
              <strong>{student.name}</strong>
              <p className="table-subtitle">{student.cohort}</p>
            </div>
          ),
          course: student.course,
          cohort: student.cohort,
          progress: (
            <div className="progress-cell">
              <span>{student.progress}%</span>
              <div className="progress-rail">
                <span className="progress-fill" style={{ width: `${student.progress}%` }} />
              </div>
            </div>
          ),
          payment: <span className={`status-pill status-pill--${payment.tone}`}>{payment.label}</span>,
          lastActivity: student.lastActivity
        };
      });
  }, [students, paymentFilter, searchQuery]);

  return (
    <div className="table-stack">
      <div className="table-toolbar">
        <label className="table-toolbar__label" htmlFor="student-search">
          Поиск
        </label>
        <input
          id="student-search"
          className="table-toolbar__search"
          placeholder="Имя, курс или поток"
          value={searchQuery}
          onChange={(event: ChangeEvent<HTMLInputElement>) => setSearchQuery(event.target.value)}
        />
        <div className="toolbar-filters" role="group" aria-label="Фильтр по оплате">
          {paymentFilters.map(filter => (
            <button
              key={filter.value}
              type="button"
              className="toolbar-chip"
              aria-pressed={paymentFilter === filter.value}
              onClick={() => setPaymentFilter(filter.value)}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>
      <DataTable columns={columns} rows={filteredRows} caption="Список студентов" />
    </div>
  );
}
