import { cn } from "@/lib/utils";

const statusLabels: Record<string, string> = {
  NEW: "Yeni yük",
  CHECKING: "Yoxlanılır",
  MATCHING: "Uyğun sürücülər seçilir",
  CONTACTING: "Əlaqə saxlanılır",
  CONTACTING_DRIVERS: "Sürücülərlə əlaqə",
  WAITING_RESPONSE: "Cavab gözləyir",
  DRIVER_ACCEPTED: "Sürücü razılaşdı",
  DISPATCHER_ACCEPTED: "Dispetçer razılaşdı",
  PRICE_TOO_LOW: "Qiymət azdır",
  NEGOTIATION: "Danışıq gedir",
  CONFIRMED: "Bağlandı",
  COMPLETED: "Tamamlandı",
  CANCELLED: "Ləğv edildi",
  ACTIVE: "Aktiv",
  PENDING: "Gözləyir",
  APPROVED: "Təsdiqlənib",
  REJECTED: "Rədd edilib",
  ASSIGNED: "Təyin edilib",
  IN_PROGRESS: "Daşınır",
  BLOCKED: "Bloklanıb",
  ACCEPTED: "Qəbul edilib",
  DECLINED: "Maraqlı deyil",
  NO_ANSWER: "Cavab yoxdur",
  CALL_LATER: "Sonra zəng",
  EXPIRED: "Vaxtı keçib",
  INACTIVE: "Deaktiv",
  DELETED: "Silinib"
};

type ToneKey = "green" | "yellow" | "red" | "blue" | "gray";

const statusTone: Record<string, ToneKey> = {
  NEW: "blue",
  CHECKING: "yellow",
  MATCHING: "yellow",
  CONTACTING: "yellow",
  CONTACTING_DRIVERS: "yellow",
  WAITING_RESPONSE: "yellow",
  DRIVER_ACCEPTED: "green",
  DISPATCHER_ACCEPTED: "green",
  PRICE_TOO_LOW: "red",
  NEGOTIATION: "yellow",
  CONFIRMED: "green",
  COMPLETED: "green",
  CANCELLED: "gray",
  ACTIVE: "green",
  APPROVED: "green",
  ACCEPTED: "green",
  PENDING: "yellow",
  ASSIGNED: "blue",
  IN_PROGRESS: "blue",
  BLOCKED: "red",
  REJECTED: "red",
  DECLINED: "red",
  NO_ANSWER: "gray",
  CALL_LATER: "yellow",
  EXPIRED: "gray",
  INACTIVE: "blue",
  DELETED: "gray"
};

export function StatusBadge({ status }: { status: string }) {
  const tone = statusTone[status] ?? "gray";

  return (
    <span
      className={cn(
        "inline-flex items-center px-0 py-0.5 text-[13px] font-medium tracking-wide",
        tone === "green" && "text-emerald-700",
        tone === "yellow" && "text-amber-700",
        tone === "red" && "text-red-700",
        tone === "blue" && "text-blue-700",
        tone === "gray" && "text-slate-600"
      )}
    >
      {tone === "green" && <span className="mr-2 h-1.5 w-1.5 rounded-full bg-emerald-500"></span>}
      {tone === "yellow" && <span className="mr-2 h-1.5 w-1.5 rounded-full bg-amber-500"></span>}
      {tone === "red" && <span className="mr-2 h-1.5 w-1.5 rounded-full bg-red-500"></span>}
      {tone === "blue" && <span className="mr-2 h-1.5 w-1.5 rounded-full bg-blue-500"></span>}
      {tone === "gray" && <span className="mr-2 h-1.5 w-1.5 rounded-full bg-slate-400"></span>}
      {statusLabels[status] ?? status}
    </span>
  );
}
