"use client";

import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable
} from "@tanstack/react-table";
import { useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  ChevronsLeft,
  ChevronsRight,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { cn } from "@/lib/utils";

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
}

export function DataTable<TData, TValue>({ columns, data }: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = useState<SortingState>([]);

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onSortingChange: setSorting,
    getSortedRowModel: getSortedRowModel(),
    state: { sorting },
    initialState: {
      pagination: { pageSize: 10 }
    }
  });

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="w-full overflow-x-auto">
        <table className="min-w-full border-collapse text-left text-sm text-slate-700">
          <thead className="bg-slate-50 text-[12px] font-semibold uppercase tracking-wide text-slate-500">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    className={cn(
                      "whitespace-nowrap px-4 py-3 font-semibold",
                      header.column.getCanSort() && "cursor-pointer select-none hover:bg-slate-100/70"
                    )}
                    onClick={header.column.getToggleSortingHandler()}
                  >
                    <div
                      className={cn(
                        "flex items-center gap-1",
                        header.column.columnDef.meta?.align === "right" && "justify-end",
                        header.column.columnDef.meta?.align === "center" && "justify-center"
                      )}
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(header.column.columnDef.header, header.getContext())}
                      {{
                        asc: <ChevronUp className="h-3.5 w-3.5" />,
                        desc: <ChevronDown className="h-3.5 w-3.5" />
                      }[header.column.getIsSorted() as string] ?? null}
                    </div>
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <tr key={row.id} className="border-t border-slate-100 transition-colors hover:bg-slate-50/70">
                  {row.getVisibleCells().map((cell) => (
                    <td
                      key={cell.id}
                      className={cn(
                        "px-4 py-3 align-middle text-[14px]",
                        cell.column.columnDef.meta?.align === "right" && "text-right",
                        cell.column.columnDef.meta?.align === "center" && "text-center"
                      )}
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={columns.length} className="h-24 border-t border-slate-100 text-center text-slate-500">
                  Heç bir nəticə tapılmadı.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between border-t border-slate-100 bg-white px-4 py-3 sm:px-6">
        <p className="text-sm text-slate-600">
          Cəmi{" "}
          <span className="font-semibold text-navy-900">
            {table.getFilteredRowModel().rows.length}
          </span>{" "}
          elan
        </p>
        <nav className="inline-flex items-center overflow-hidden rounded-lg border border-slate-200" aria-label="Pagination">
          <button
            type="button"
            onClick={() => table.setPageIndex(0)}
            disabled={!table.getCanPreviousPage()}
            className="px-2.5 py-2 text-slate-400 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ChevronsLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
            className="border-l border-slate-200 px-2.5 py-2 text-slate-400 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="border-l border-r border-slate-200 px-3 py-2 text-sm font-semibold text-navy-900">
            Səhifə {table.getState().pagination.pageIndex + 1} / {table.getPageCount() || 1}
          </span>
          <button
            type="button"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
            className="px-2.5 py-2 text-slate-400 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => table.setPageIndex(table.getPageCount() - 1)}
            disabled={!table.getCanNextPage()}
            className="border-l border-slate-200 px-2.5 py-2 text-slate-400 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ChevronsRight className="h-4 w-4" />
          </button>
        </nav>
      </div>
    </div>
  );
}
