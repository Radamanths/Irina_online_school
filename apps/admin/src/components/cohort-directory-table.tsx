"use client";

import { useMemo, useState } from "react";
import type { ChangeEvent, ReactNode } from "react";
import type { CohortSummary } from "../lib/api";
import { DataTable, type DataTableColumn, type DataTableRow } from "./data-table";

interface CohortRow extends DataTableRow {
  cohort: ReactNode;
  course: string;
  capacity: string;
  stage: ReactNode;
  window: string;
  timezone: string;
}

const columns: DataTableColumn[] = [
  { key: "cohort", label: "Поток" },
  { key: "course", label: "Курс" },
  { key: "capacity", label: "Заполненность" },
  { key: "stage", label: "Статус" },
  { key: "window", label: "Даты" },
  { key: "timezone", label: "Часовой пояс", align: "right" }
];

const stageFilters = [
  { value: "all", label: "Все" },
  { value: "running", label: "В работе" },
  { value: "enrollment", label: "Набор" },
  { value: "wrap-up", label: "Завершение" }
] as const;

type StageFilterValue = (typeof stageFilters)[number]["value"];

const stageMeta = {
  running: { label: "В работе", tone: "success" },
  enrollment: { label: "Набор", tone: "info" },
  "wrap-up": { label: "Завершение", tone: "warning" }
} as const;

export function CohortDirectoryTable({ cohorts }: { cohorts: CohortSummary[] }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [stageFilter, setStageFilter] = useState<StageFilterValue>("all");
  const [timezoneFilter, setTimezoneFilter] = useState<string>("all");

  const timezones = useMemo(() => Array.from(new Set(cohorts.map(cohort => cohort.timezone))).sort(), [cohorts]);

  const rows = useMemo<CohortRow[]>(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    return cohorts
      .filter(cohort => {
        const matchesStage = stageFilter === "all" || cohort.stage === stageFilter;
        const matchesTimezone = timezoneFilter === "all" || cohort.timezone === timezoneFilter;
        const matchesQuery = normalizedQuery
          ? `${cohort.label} ${cohort.course}`.toLowerCase().includes(normalizedQuery)
          : true;

        return matchesStage && matchesTimezone && matchesQuery;
      })
      .map(cohort => {
        const tone = stageMeta[cohort.stage];
        return {
          id: cohort.id,
          cohort: (
            <div>
              <strong>{cohort.label}</strong>
              <p className="table-subtitle">{cohort.course}</p>
            </div>
          ),
          course: cohort.course,
          capacity: cohort.capacity,
          stage: <span className={`status-pill status-pill--${tone.tone}`}>{tone.label}</span>,
          window: `${cohort.startDate} — ${cohort.endDate}`,
          timezone: cohort.timezone
        } satisfies CohortRow;
      });
  }, [cohorts, searchQuery, stageFilter, timezoneFilter]);

  return (
    <div className="table-stack">
      <div className="table-toolbar">
        <label className="table-toolbar__label" htmlFor="cohort-search">
          Поиск
        </label>
        <input
          id="cohort-search"
          className="table-toolbar__search"
          placeholder="Название потока или курса"
          value={searchQuery}
          onChange={(event: ChangeEvent<HTMLInputElement>) => setSearchQuery(event.target.value)}
        />
        <div className="toolbar-filters" role="group" aria-label="Фильтр по статусу">
          {stageFilters.map(filter => (
            <button
              key={filter.value}
              type="button"
              className="toolbar-chip"
              aria-pressed={stageFilter === filter.value}
              onClick={() => setStageFilter(filter.value)}
            >
              {filter.label}
            </button>
          ))}
        </div>
        <label className="table-toolbar__label" htmlFor="timezone-filter">
          Часовой пояс
        </label>
        <select
          id="timezone-filter"
          className="table-toolbar__select"
          value={timezoneFilter}
          onChange={(event: ChangeEvent<HTMLSelectElement>) => setTimezoneFilter(event.target.value)}
        >
          <option value="all">Все</option>
          {timezones.map(timezone => (
            <option key={timezone} value={timezone}>
              {timezone}
            </option>
          ))}
        </select>
      </div>
      <DataTable columns={columns} rows={rows} caption="Список потоков" />
    </div>
  );
}
