import type { ApplicationStatus, CargoStatus, Role, UserStatus, VehicleStatus } from "@prisma/client";

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

export const azerbaijanLocations = [
  "Bakı",
  "Sumqayıt",
  "Gəncə",
  "Mingəçevir",
  "Şəki",
  "Şamaxı",
  "Quba",
  "Xaçmaz",
  "Lənkəran",
  "Masallı",
  "Şirvan",
  "Naxçıvan",
  "Qəbələ",
  "Bərdə",
  "Ağcabədi",
  "Salyan"
];

export const workDays = [
  "Bazar ertəsi",
  "Çərşənbə axşamı",
  "Çərşənbə",
  "Cümə axşamı",
  "Cümə",
  "Şənbə",
  "Bazar"
];

export const carrierLocationOptions = [
  { label: "Bakı", latitude: 40.409264, longitude: 49.867092, x: 74, y: 40 },
  { label: "Sumqayıt", latitude: 40.589722, longitude: 49.66861, x: 64, y: 31 },
  { label: "Xırdalan", latitude: 40.44808, longitude: 49.75502, x: 68, y: 36 },
  { label: "Şamaxı", latitude: 40.63141, longitude: 48.64137, x: 54, y: 34 },
  { label: "Qəbələ", latitude: 40.98139, longitude: 47.84582, x: 38, y: 24 },
  { label: "Şəki", latitude: 41.19194, longitude: 47.17056, x: 29, y: 18 },
  { label: "Gəncə", latitude: 40.68278, longitude: 46.36056, x: 17, y: 37 },
  { label: "Mingəçevir", latitude: 40.77026, longitude: 47.0496, x: 24, y: 31 },
  { label: "Bərdə", latitude: 40.37577, longitude: 47.12619, x: 28, y: 44 },
  { label: "Lənkəran", latitude: 38.75428, longitude: 48.85062, x: 60, y: 72 },
  { label: "Masallı", latitude: 39.03432, longitude: 48.6654, x: 55, y: 66 },
  { label: "Quba", latitude: 41.36108, longitude: 48.51341, x: 51, y: 12 }
] as const;
