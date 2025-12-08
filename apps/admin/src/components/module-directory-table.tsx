"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { ChangeEvent, ReactNode } from "react";
import type { ModuleDirectoryRecord } from "../lib/api";
import { DataTable, type DataTableColumn, type DataTableRow } from "./data-table";

interface ModuleRow extends DataTableRow {
  module: ReactNode;
  owner: string;
  lessons: string;
  stage: ReactNode;
  updatedAt: string;
}

const columns: DataTableColumn[] = [
  { key: "module", label: "Модуль" },
  { key: "owner", label: "Владелец" },
  { key: "lessons", label: "Уроки", align: "center" },
  { key: "stage", label: "Статус" },
  { key: "updatedAt", label: "Обновлено", align: "right" }
];

const stageFilters = [
  { value: "all", label: "Все" },
  { value: "draft", label: "Черновик" },
  { value: "review", label: "На проверке" },
  { value: "published", label: "Опубликован" }
] as const;

type StageFilterValue = (typeof stageFilters)[number]["value"];

type LanguageFilterValue = "all" | "RU" | "EN";

const stageToneMeta = {
  draft: { label: "Черновик", tone: "warning" },
  review: { label: "На проверке", tone: "info" },
  published: { label: "Опубликован", tone: "success" }
} as const;

export function ModuleDirectoryTable({ modules }: { modules: ModuleDirectoryRecord[] }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [stageFilter, setStageFilter] = useState<StageFilterValue>("all");
  const [languageFilter, setLanguageFilter] = useState<LanguageFilterValue>("all");

  const rows = useMemo<ModuleRow[]>(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();
    return modules
      .filter((module: ModuleDirectoryRecord) => {
        const matchesStage = stageFilter === "all" || module.stage === stageFilter;
        const matchesLanguage = languageFilter === "all" || module.language === languageFilter;
        const matchesQuery = normalizedQuery
          ? `${module.moduleTitle} ${module.owner} ${module.courseTitle}`.toLowerCase().includes(normalizedQuery)
          : true;
        return matchesStage && matchesLanguage && matchesQuery;
      })
      .map((module: ModuleDirectoryRecord) => {
        const stageMeta = stageToneMeta[module.stage];
        return {
          id: module.id,
          module: (
            <div>
              <Link href={`/curriculum/${module.id}`} className="table-primary-link">
                <strong>{module.moduleTitle}</strong>
              </Link>
              <p className="table-subtitle">Курс: {module.courseTitle}</p>
            </div>
          ),
          owner: module.owner,
          lessons: `${module.lessons}`,
          stage: <span className={`status-pill status-pill--${stageMeta.tone}`}>{stageMeta.label}</span>,
          updatedAt: module.updatedAt
        };
      });
  }, [languageFilter, modules, searchQuery, stageFilter]);

  return (
    <div className="table-stack">
      <div className="table-toolbar">
        <label className="table-toolbar__label" htmlFor="module-search">
          Поиск
        </label>
        <input
          id="module-search"
          className="table-toolbar__search"
          placeholder="Модуль, владелец или курс"
          value={searchQuery}
          onChange={(event: ChangeEvent<HTMLInputElement>) => setSearchQuery(event.target.value)}
        />
        <div className="toolbar-filters" role="group" aria-label="Фильтр модулей">
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
        <label className="table-toolbar__label" htmlFor="module-language-filter">
          Язык
        </label>
        <select
          id="module-language-filter"
          className="table-toolbar__select"
          value={languageFilter}
          onChange={(event: ChangeEvent<HTMLSelectElement>) => setLanguageFilter(event.target.value as LanguageFilterValue)}
        >
          <option value="all">Все</option>
          <option value="RU">RU</option>
          <option value="EN">EN</option>
        </select>
      </div>
      <DataTable columns={columns} rows={rows} caption="Учебные модули" />
    </div>
  );
}
