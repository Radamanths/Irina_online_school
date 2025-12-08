"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { CourseSummary } from "../lib/types";
import { CourseCard } from "./course-card";

interface CatalogCopy {
  searchPlaceholder: string;
  levelLabel: string;
  categoryLabel: string;
  clearFilters: string;
  emptyState: string;
  detailCta: string;
}

interface Props {
  courses: CourseSummary[];
  locale: string;
  copy: CatalogCopy;
}

export function CourseCatalog({ courses, locale, copy }: Props) {
  const levels = Array.from(new Set(courses.map(course => course.level).filter(Boolean)));
  const categories = Array.from(new Set(courses.map(course => course.category).filter((value): value is string => Boolean(value))));
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [search, setSearch] = useState(() => searchParams.get("q") ?? "");
  const [levelFilter, setLevelFilter] = useState(() => searchParams.get("level") ?? "");
  const [categoryFilter, setCategoryFilter] = useState(() => searchParams.get("category") ?? "");

  useEffect(() => {
    const nextSearch = searchParams.get("q") ?? "";
    const nextLevel = searchParams.get("level") ?? "";
    const nextCategory = searchParams.get("category") ?? "";

    if (nextSearch !== search) {
      setSearch(nextSearch);
    }
    if (nextLevel !== levelFilter) {
      setLevelFilter(nextLevel);
    }
    if (nextCategory !== categoryFilter) {
      setCategoryFilter(nextCategory);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  useEffect(() => {
    const params = new URLSearchParams();
    if (search.trim()) {
      params.set("q", search.trim());
    }
    if (levelFilter) {
      params.set("level", levelFilter);
    }
    if (categoryFilter) {
      params.set("category", categoryFilter);
    }

    const queryString = params.toString();
    const href = queryString ? `${pathname}?${queryString}` : pathname;
    router.replace(href, { scroll: false });
  }, [search, levelFilter, categoryFilter, router, pathname]);

  const filteredCourses = useMemo(() => {
    return courses.filter(course => {
      const matchesSearch = search
        ? `${course.title} ${course.shortDescription}`.toLowerCase().includes(search.toLowerCase())
        : true;
      const matchesLevel = levelFilter ? course.level === levelFilter : true;
      const matchesCategory = categoryFilter ? course.category === categoryFilter : true;
      return matchesSearch && matchesLevel && matchesCategory;
    });
  }, [courses, search, levelFilter, categoryFilter]);

  function resetFilters() {
    setSearch("");
    setLevelFilter("");
    setCategoryFilter("");
  }

  return (
    <div className="course-catalog">
      <form className="course-filters" onSubmit={event => event.preventDefault()}>
        <label className="course-filters__group">
          <span>{copy.searchPlaceholder}</span>
          <input
            type="search"
            value={search}
            onChange={event => setSearch(event.target.value)}
            placeholder={copy.searchPlaceholder}
          />
        </label>
        <label className="course-filters__group">
          <span>{copy.levelLabel}</span>
          <select value={levelFilter} onChange={event => setLevelFilter(event.target.value)}>
            <option value="">—</option>
            {levels.map(level => (
              <option key={level} value={level}>
                {level}
              </option>
            ))}
          </select>
        </label>
        <label className="course-filters__group">
          <span>{copy.categoryLabel}</span>
          <select value={categoryFilter} onChange={event => setCategoryFilter(event.target.value)}>
            <option value="">—</option>
            {categories.map(category => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </label>
        <button type="button" className="button button--ghost" onClick={resetFilters}>
          {copy.clearFilters}
        </button>
      </form>

      {filteredCourses.length === 0 ? (
        <p className="course-catalog__empty">{copy.emptyState}</p>
      ) : (
        <div className="grid course-catalog__list">
          {filteredCourses.map(course => (
            <CourseCard key={course.id} course={course} locale={locale} detailCta={copy.detailCta} />
          ))}
        </div>
      )}
    </div>
  );
}
