import type { ApplicationStatus, CargoStatus, Role, UserStatus, VehicleStatus } from "@prisma/client";
import {
  azerbaijanLocations as mapLocationLabels,
  azerbaijanMapLocations,
  carrierLocationOptions as mapCarrierLocationOptions,
} from "@/lib/azerbaijan-map-locations";

export { azerbaijanMapLocations, mapCarrierLocationOptions as carrierLocationOptions };

export const appName = "Tranzit.AZ";

export const roleLabels: Record<Role, string> = {
  CARRIER: "Yük daşıyan",
  CARGO_OWNER: "Yük sahibi",
  DRIVER: "Sürücü",
  DISPATCHER: "Dispetçer",
  OPERATOR: "Operator",
  ADMIN: "Admin"
};

export const userStatusLabels: Record<UserStatus, string> = {
  ACTIVE: "Aktiv",
  PENDING: "Gözləyir",
  BLOCKED: "Bloklanıb"
};

export const vehicleStatusLabels: Record<VehicleStatus, string> = {
  PENDING: "Təsdiq gözləyir",
  APPROVED: "Təsdiqlənib",
  REJECTED: "Rədd edilib"
};

export const cargoStatusLabels: Record<CargoStatus, string> = {
  ACTIVE: "Aktiv",
  ASSIGNED: "Təyin edilib",
  IN_PROGRESS: "Daşınır",
  COMPLETED: "Tamamlanıb",
  CANCELLED: "Ləğv edilib",
  EXPIRED: "Vaxtı bitib"
};

export const applicationStatusLabels: Record<ApplicationStatus, string> = {
  PENDING: "Gözləyir",
  ACCEPTED: "Qəbul edilib",
  REJECTED: "Rədd edilib"
};

export const statusTone: Record<string, "green" | "yellow" | "red" | "blue" | "gray"> = {
  ACTIVE: "green",
  APPROVED: "green",
  ACCEPTED: "green",
  COMPLETED: "green",
  CONFIRMED: "green",
  DRIVER_ACCEPTED: "green",
  DISPATCHER_ACCEPTED: "green",
  PENDING: "yellow",
  NEW: "yellow",
  CHECKING: "yellow",
  MATCHING: "blue",
  CONTACTING: "blue",
  WAITING_RESPONSE: "yellow",
  ASSIGNED: "blue",
  IN_PROGRESS: "blue",
  NEGOTIATION: "blue",
  PRICE_TOO_LOW: "red",
  BLOCKED: "red",
  REJECTED: "red",
  CANCELLED: "red",
  EXPIRED: "gray"
};

export const vehicleTypes = [
  "Kamaz",
  "TIR",
  "Ford Transit",
  "Soyuduculu maşın",
  "Evakuator",
  "Mikroavtobus",
  "Yük maşını",
  "Tentli yük maşını",
  "Platforma",
  "Konteyner daşıyan"
];

export const cargoTypes = [
  "Kubik",
  "Tikinti materialı",
  "Mebel",
  "Ərzaq",
  "Texnika",
  "Paletli yük",
  "Maye yük",
  "Heyvan yemi",
  "Sənaye avadanlığı",
  "Soyudulmuş məhsul"
];

export const azerbaijanLocations = mapLocationLabels;

export const workDays = [
  "Bazar ertəsi",
  "Çərşənbə axşamı",
  "Çərşənbə",
  "Cümə axşamı",
  "Cümə",
  "Şənbə",
  "Bazar"
];
