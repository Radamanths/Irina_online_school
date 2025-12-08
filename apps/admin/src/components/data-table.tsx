import type { ReactNode } from "react";
import clsx from "clsx";

export type DataTableAlign = "left" | "center" | "right";

export type DataTableRow = {
  id: string;
  [key: string]: ReactNode;
};

export interface DataTableColumn {
  key: string;
  label: string;
  align?: DataTableAlign;
}

interface DataTableProps {
  columns: DataTableColumn[];
  rows: DataTableRow[];
  caption?: string;
  emptyLabel?: string;
}

export function DataTable({ columns, rows, caption, emptyLabel = "Нет данных" }: DataTableProps) {
  return (
    <div className="data-table-wrapper">
      <table className="data-table">
        {caption && <caption>{caption}</caption>}
        <thead>
          <tr>
            {columns.map(column => (
              <th key={String(column.key)} className={clsx(column.align && `data-table__cell--${column.align}`)}>
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="data-table__empty">
                {emptyLabel}
              </td>
            </tr>
          ) : (
            rows.map(row => (
              <tr key={row.id}>
                {columns.map(column => (
                  <td
                    key={String(column.key)}
                    className={clsx("data-table__cell", column.align && `data-table__cell--${column.align}`)}
                  >
                    {row[column.key] ?? "—"}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
