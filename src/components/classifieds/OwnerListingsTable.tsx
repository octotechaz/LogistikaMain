"use client";

import { ColumnDef } from "@tanstack/react-table";

declare module "@tanstack/table-core" {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface ColumnMeta<TData extends import("@tanstack/react-table").RowData, TValue> {
    align?: "left" | "center" | "right";
  }
}

import { DataTable } from "@/components/ui/DataTable";
import { CargoListing } from "@/types/classifieds";
import { effectiveStatus } from "@/lib/status/classifieds";
import { StatusBadge } from "@/components/StatusBadge";
import { Button, ButtonLink } from "@/components/ui/Button";

interface OwnerListingsTableProps {
  data: CargoListing[];
  onRestore: (id: string) => void;
  onSoftDelete: (id: string) => void;
  busyId?: string | null;
}

function formatDeadline(value?: string) {
  if (!value) {
    return "—";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("az-AZ", {
    day: "numeric",
    month: "short",
    year: "numeric"
  }).format(date);
}

export function OwnerListingsTable({
  data,
  onRestore,
  onSoftDelete,
  busyId = null
}: OwnerListingsTableProps) {
  const columns: ColumnDef<CargoListing>[] = [
    {
      accessorKey: "title",
      header: "Başlıq",
      cell: ({ row }) => {
        const listing = row.original;
        return (
          <div className="flex min-w-[180px] flex-col gap-1">
            <span className="text-[15px] font-semibold text-slate-800">{listing.title}</span>
            <span className="text-[13px] text-slate-500">
              <i className="fas fa-box-open mr-1.5 opacity-70" />
              {listing.cargoType}
            </span>
            {listing.rejectionReason ? (
              <div className="mt-1 w-fit rounded bg-red-50 px-2 py-1 text-[12px] font-medium text-red-600">
                <i className="fas fa-exclamation-circle mr-1" />
                Rədd səbəbi: {listing.rejectionReason}
              </div>
            ) : null}
          </div>
        );
      }
    },
    {
      accessorKey: "weight",
      header: "Çəki",
      meta: { align: "center" },
      cell: ({ row }) => (
        <span className="whitespace-nowrap text-[14px] font-medium text-slate-600">
          {row.original.weight ? `${row.original.weight} ton` : "—"}
        </span>
      )
    },
    {
      accessorKey: "volume",
      header: "Həcm",
      meta: { align: "center" },
      cell: ({ row }) => (
        <span className="whitespace-nowrap text-[14px] font-medium text-slate-600">
          {row.original.volume ? `${row.original.volume} m³` : "—"}
        </span>
      )
    },
    {
      id: "route",
      header: "Marşrut",
      meta: { align: "center" },
      cell: ({ row }) => {
        const listing = row.original;
        return (
          <div className="whitespace-nowrap font-medium text-slate-600">
            <span className="rounded-md bg-slate-100 px-2.5 py-1 text-[14px]">
              {listing.pickupCity}{" "}
              <i className="fas fa-arrow-right mx-1 text-[10px] text-slate-400" />{" "}
              {listing.deliveryCity}
            </span>
          </div>
        );
      }
    },
    {
      accessorKey: "pickupDeadlineDate",
      header: "Son tarix",
      meta: { align: "center" },
      cell: ({ row }) => (
        <span className="whitespace-nowrap text-[14px] text-slate-500">
          <i className="far fa-calendar-alt mr-1.5 opacity-70" />
          {formatDeadline(row.original.pickupDeadlineDate || row.original.pickupDate)}
        </span>
      )
    },
    {
      id: "status",
      header: "Status",
      meta: { align: "center" },
      cell: ({ row }) => (
        <div className="whitespace-nowrap">
          <StatusBadge status={effectiveStatus(row.original)} />
        </div>
      )
    },
    {
      accessorKey: "createdAt",
      header: "Yerləşdirilib",
      meta: { align: "center" },
      cell: ({ row }) => (
        <div className="whitespace-nowrap text-[14px] text-slate-500">
          {new Intl.DateTimeFormat("az-AZ", {
            day: "2-digit",
            month: "short",
            year: "numeric"
          }).format(new Date(row.original.createdAt))}
        </div>
      )
    },
    {
      id: "actions",
      header: "Əməliyyat",
      meta: { align: "right" },
      cell: ({ row }) => {
        const listing = row.original;
        const status = effectiveStatus(listing);
        const busy = busyId === listing.id;

        return (
          <div className="flex items-center justify-end gap-2">
            <ButtonLink
              href={`/cargo-owner/cargo-posts/new?id=${encodeURIComponent(listing.id)}`}
              variant="secondary"
              className="h-8 border-slate-200 bg-white px-3 text-[13px] font-medium shadow-sm hover:bg-slate-50 hover:text-blue-600"
            >
              <i className="far fa-edit mr-1.5" />
              Redaktə et
            </ButtonLink>

            {["REJECTED", "EXPIRED", "DELETED", "INACTIVE"].includes(status) ? (
              <Button
                variant="secondary"
                disabled={busy}
                onClick={() => onRestore(listing.id)}
                className="h-8 border-slate-200 bg-white px-3 text-[13px] font-medium shadow-sm hover:bg-slate-50 hover:text-emerald-600"
              >
                <i className="fas fa-redo mr-1.5" />
                Yenidən göndər
              </Button>
            ) : null}

            <Button
              variant="ghost"
              disabled={busy}
              className="h-8 w-8 p-0 text-slate-400 hover:bg-red-50 hover:text-red-600"
              onClick={() => {
                if (window.confirm("Bu elanı silmək istədiyinizə əminsiniz?")) {
                  onSoftDelete(listing.id);
                }
              }}
              title="Sil"
            >
              <i className="far fa-trash-alt" />
            </Button>
          </div>
        );
      }
    }
  ];

  return <DataTable columns={columns} data={data} />;
}
