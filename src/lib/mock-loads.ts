export type OperatorLoadStatus =
  | "NEW"
  | "MATCHING"
  | "CONTACTING_DRIVERS"
  | "WAITING_RESPONSE"
  | "DRIVER_ACCEPTED"
  | "PRICE_TOO_LOW"
  | "CONFIRMED"
  | "COMPLETED"
  | "CANCELLED";

export type MockLoad = {
  id: string;
  title: string;
  cargoType: string;
  route: string;
  pickupCity: string;
  deliveryCity: string;
  pickupAddress: string;
  deliveryAddress: string;
  tonnage: number;
  volume: string;
  price: string;
  date: string;
  requiredVehicleType: string;
  contactPhone: string;
  note: string;
  status: OperatorLoadStatus;
};

export const mockLoads: MockLoad[] = [
  {
    id: "load-1",
    title: "Mebel daşınması",
    cargoType: "Mebel",
    route: "Bakı → Gəncə",
    pickupCity: "Bakı",
    deliveryCity: "Gəncə",
    pickupAddress: "Bakı, Xətai rayonu",
    deliveryAddress: "Gəncə, mərkəz",
    tonnage: 2,
    volume: "18 m³",
    price: "180 AZN",
    date: "Bu gün",
    requiredVehicleType: "Ford Transit",
    contactPhone: "+994 50 111 22 33",
    note: "Mebel səliqəli yüklənməlidir, axşam saatına qədər çatdırılmalıdır.",
    status: "NEW"
  },
  {
    id: "load-2",
    title: "Tikinti materialı",
    cargoType: "Tikinti materialı",
    route: "Xırdalan → Şəki",
    pickupCity: "Xırdalan",
    deliveryCity: "Şəki",
    pickupAddress: "Xırdalan, anbar 7",
    deliveryAddress: "Şəki, sənaye zonası",
    tonnage: 18,
    volume: "42 m³",
    price: "Razılaşma ilə",
    date: "Sabah",
    requiredVehicleType: "TIR",
    contactPhone: "+994 70 222 44 66",
    note: "Yükləmə üçün forklift var, boşaltma tərəfi operatorla dəqiqləşdiriləcək.",
    status: "MATCHING"
  },
  {
    id: "load-3",
    title: "Soyudulmuş ərzaq",
    cargoType: "Ərzaq",
    route: "Lənkəran → Bakı",
    pickupCity: "Lənkəran",
    deliveryCity: "Bakı",
    pickupAddress: "Lənkəran, mərkəzi anbar",
    deliveryAddress: "Bakı, Nərimanov rayonu",
    tonnage: 4,
    volume: "20 m³",
    price: "520 AZN",
    date: "Bu gün",
    requiredVehicleType: "Soyuduculu maşın",
    contactPhone: "+994 55 333 11 88",
    note: "Temperatur rejimi qorunmalıdır.",
    status: "WAITING_RESPONSE"
  },
  {
    id: "load-4",
    title: "Paletli yük",
    cargoType: "Paletli yük",
    route: "Bakı → Qəbələ",
    pickupCity: "Bakı",
    deliveryCity: "Qəbələ",
    pickupAddress: "Qaradağ logistika mərkəzi",
    deliveryAddress: "Qəbələ, sənaye zonası",
    tonnage: 8,
    volume: "32 m³",
    price: "640 AZN",
    date: "3 gün sonra",
    requiredVehicleType: "Kamaz",
    contactPhone: "+994 77 444 55 66",
    note: "10 palet, standart tentli maşın uyğundur.",
    status: "DRIVER_ACCEPTED"
  }
];
