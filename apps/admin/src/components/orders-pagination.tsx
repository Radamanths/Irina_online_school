"use client";

import { usePathname, useRouter } from "next/navigation";
import { useCallback, useMemo, type ChangeEvent } from "react";
import { buildOrdersFilterQuery, type OrdersFilters } from "../lib/orders-filters";

interface OrdersPaginationProps {
  currentPage: number;
  hasNext: boolean;
  limit: number;
  total: number;
  rangeStart: number;
  rangeEnd: number;
  filters: OrdersFilters;
  pageSize: number;
  pageSizeOptions: number[];
  defaultPageSize: number;
}

export function OrdersPagination({
  currentPage,
  hasNext,
  limit,
  total,
  rangeStart,
  rangeEnd,
  filters,
  pageSize,
  pageSizeOptions,
  defaultPageSize
}: OrdersPaginationProps) {
  const router = useRouter();
  const pathname = usePathname();
  const totalPages = Math.max(Math.ceil(total / limit), 1);
  const hasPrevious = currentPage > 1;

  const infoText = useMemo(() => {
    if (total === 0) {
      return "Нет заказов";
    }
    return `Показано ${rangeStart}–${rangeEnd} из ${total}`;
  }, [rangeStart, rangeEnd, total]);

  const navigate = useCallback(
    (page: number, nextPageSize: number = pageSize) => {
      if (page < 1 || (page === currentPage && nextPageSize === pageSize)) {
        return;
      }
      const baseQuery = buildOrdersFilterQuery(filters);
      const params = new URLSearchParams(baseQuery);
      if (page > 1) {
        params.set("page", String(page));
      } else {
        params.delete("page");
      }

      if (nextPageSize !== defaultPageSize) {
        params.set("pageSize", String(nextPageSize));
      } else {
        params.delete("pageSize");
      }

      const queryString = params.toString();
      router.push(queryString ? `${pathname}?${queryString}` : pathname);
    },
    [currentPage, defaultPageSize, filters, pageSize, pathname, router]
  );

  const handlePageSizeChange = useCallback(
    (event: ChangeEvent<HTMLSelectElement>) => {
      const nextSize = Number(event.target.value);
      if (!Number.isFinite(nextSize) || nextSize <= 0 || nextSize === pageSize) {
        return;
      }
      navigate(1, nextSize);
    },
    [navigate, pageSize]
  );

  return (
    <div className="table-pagination">
      <p className="table-pagination__info">
        {infoText}
        {totalPages > 1 ? ` · Стр. ${currentPage} из ${totalPages}` : null}
      </p>
      <div className="table-pagination__controls" role="group" aria-label="Навигация по страницам заказов">
        <button
          type="button"
          className="table-pagination__button"
          aria-label="Предыдущая страница"
          onClick={() => navigate(currentPage - 1)}
          disabled={!hasPrevious}
        >
          Назад
        </button>
        <button
          type="button"
          className="table-pagination__button"
          aria-label="Следующая страница"
          onClick={() => navigate(currentPage + 1)}
          disabled={!hasNext}
        >
          Вперед
        </button>
      </div>
      <div className="table-pagination__sizes">
        <label htmlFor="orders-page-size" className="table-pagination__label">
          На странице
        </label>
        <select
          id="orders-page-size"
          className="table-pagination__select"
          value={pageSize}
          onChange={handlePageSizeChange}
        >
          {pageSizeOptions.map(option => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
