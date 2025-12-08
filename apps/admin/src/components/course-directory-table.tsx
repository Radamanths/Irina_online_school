"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { ChangeEvent, ReactNode } from "react";
import type { CourseSummary } from "../lib/api";
import { DataTable, type DataTableColumn, type DataTableRow } from "./data-table";

interface CourseRow extends DataTableRow {
  course: ReactNode;
  cohort: string;
  students: string;
  status: ReactNode;
  updatedAt: string;
}

const columns: DataTableColumn[] = [
  { key: "course", label: "Курс" },
  { key: "cohort", label: "Поток" },
  { key: "students", label: "Студенты" },
  { key: "status", label: "Статус" },
  { key: "updatedAt", label: "Обновлено", align: "right" }
];

const statusFilters = [
  { value: "all", label: "Все" },
  { value: "running", label: "В работе" },
  { value: "enrollment", label: "Набор" },
  { value: "maintenance", label: "На обновлении" },
  { value: "archived", label: "Архив" }
] as const;

type StatusFilterValue = (typeof statusFilters)[number]["value"];

const statusToneMeta = {
  running: { label: "В работе", tone: "success" },
  enrollment: { label: "Набор", tone: "info" },
  maintenance: { label: "На обновлении", tone: "warning" },
  archived: { label: "Архив", tone: "muted" }
} as const;

export function CourseDirectoryTable({ courses }: { courses: CourseSummary[] }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilterValue>("all");
  const [cohortFilter, setCohortFilter] = useState<string>("all");

  const cohorts = useMemo(() => Array.from(new Set(courses.map(course => course.cohort))), [courses]);

  const rows = useMemo<CourseRow[]>(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();
    return courses
      .filter(course => {
        const matchesStatus = statusFilter === "all" || course.status === statusFilter;
        const matchesCohort = cohortFilter === "all" || course.cohort === cohortFilter;
        const matchesQuery = normalizedQuery
          ? `${course.title} ${course.mentor} ${course.cohort}`.toLowerCase().includes(normalizedQuery)
          : true;
        return matchesStatus && matchesCohort && matchesQuery;
      })
      .map<CourseRow>(course => {
        const statusMeta = statusToneMeta[course.status];
        return {
          id: course.id,
          course: (
            <div>
              <Link href={`/courses/${course.id}`} className="table-primary-link">
                <strong>{course.title}</strong>
              </Link>
              <p className="table-subtitle">Куратор: {course.mentor}</p>
            </div>
          ),
          cohort: course.cohort,
          students: `${course.students} чел.`,
          status: <span className={`status-pill status-pill--${statusMeta.tone}`}>{statusMeta.label}</span>,
          updatedAt: course.updatedAt
        };
      });
  }, [cohortFilter, courses, searchQuery, statusFilter]);

  return (
    <div className="table-stack">
      <div className="table-toolbar">
        <label className="table-toolbar__label" htmlFor="course-search">
          Поиск
        </label>
        <input
          id="course-search"
          className="table-toolbar__search"
          placeholder="Название, куратор или поток"
          value={searchQuery}
          onChange={(event: ChangeEvent<HTMLInputElement>) => setSearchQuery(event.target.value)}
        />
        <div className="toolbar-filters" role="group" aria-label="Фильтр по статусу курса">
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
        <label className="table-toolbar__label" htmlFor="cohort-filter">
          Поток
        </label>
        <select
          id="cohort-filter"
          className="table-toolbar__select"
          value={cohortFilter}
          onChange={(event: ChangeEvent<HTMLSelectElement>) => setCohortFilter(event.target.value)}
        >
          <option value="all">Все потоки</option>
          {cohorts.map(cohort => (
            <option key={cohort} value={cohort}>
              {cohort}
            </option>
          ))}
        </select>
      </div>
      <DataTable columns={columns} rows={rows} caption="Таблица курсов" />
    </div>
  );
}
