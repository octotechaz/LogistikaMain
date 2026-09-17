import type { Banner, CargoListing, CargoOwner } from "@/types/classifieds";

function addDays(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString();
}

function todayAt(time: string) {
  const [hours, minutes] = time.split(":").map(Number);
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);
  return date.toISOString();
}

export const defaultOwners: CargoOwner[] = [
  {
    id: "owner-1",
    firstName: "Aysel",
    lastName: "Məmmədova",
    phone: "050 555 10 20",
    companyName: "Global Cargo MMC",
    taxId: "",
    status: "ACTIVE",
    role: "CARGO_OWNER",
    registeredAt: addDays(-4)
  }
];

export const defaultListings: CargoListing[] = [
  {
    id: "load-1",
    ownerId: "owner-1",
    ownerName: "Aysel Məmmədova",
    ownerPhone: "050 555 10 20",
    title: "Paletləşmiş ümumi yük",
    cargoType: "Paletli yük",
    description:
      "Paletləşmiş quru yük anbar şəraitində saxlanılır. Yükləmə forkliftlə aparılır, təhvil nöqtəsində boşaltma üçün rahat giriş var.",
    weight: 20000,
    length: 8,
    width: 2.4,
    height: 2.6,
    quantity: "20",
    pickupCity: "Bakı",
    pickupAddress: "Suraxanı rayonu, logistika anbarı",
    deliveryCity: "Gəncə",
    deliveryAddress: "Gəncə sənaye zonası",
    pickupDate: addDays(1).slice(0, 10),
    pickupTime: "10:00-13:00",
    vehicleType: "Tentli yük maşını",
    price: "1200",
    note: "",
    durationDays: 10,
    createdAt: todayAt("10:25"),
    approvedAt: todayAt("10:25"),
    expiresAt: addDays(9),
    rejectionReason: null,
    status: "ACTIVE",
    photo: ""
  },
  {
    id: "load-2",
    ownerId: "owner-1",
    ownerName: "Aysel Məmmədova",
    ownerPhone: "050 555 10 20",
    title: "Tikinti materialları (sement, dəmir)",
    cargoType: "Tikinti materialı",
    description:
      "Sement və armatur paletləri yüklənəcək. Yükləmə texnika ilə aparılır, təhvil nöqtəsi iri tonnajlı maşın üçün uyğundur.",
    weight: 22000,
    length: 8,
    width: 2.4,
    height: 2.2,
    quantity: "12",
    pickupCity: "Sumqayıt",
    pickupAddress: "Anbar küçəsi",
    deliveryCity: "Naxçıvan",
    deliveryAddress: "Sənaye zonası",
    pickupDate: addDays(2).slice(0, 10),
    pickupTime: "09:00-12:00",
    vehicleType: "TIR",
    price: "1800",
    note: "",
    durationDays: 5,
    createdAt: todayAt("09:40"),
    approvedAt: todayAt("09:40"),
    expiresAt: addDays(3),
    rejectionReason: null,
    status: "ACTIVE",
    photo: ""
  },
  {
    id: "load-3",
    ownerId: "owner-1",
    ownerName: "Aysel Məmmədova",
    ownerPhone: "050 555 10 20",
    title: "Taxıl (buğda)",
    cargoType: "Ərzaq",
    description:
      "Buğda kisələri quru anbardan yüklənəcək. Marşrut üzrə vaxtında çatdırılma və səliqəli boşaltma vacibdir.",
    weight: 25000,
    quantity: "",
    pickupCity: "Şəmkir",
    pickupAddress: "Taxıl bazası",
    deliveryCity: "Bakı",
    deliveryAddress: "Qida anbarı",
    vehicleType: "Kamaz",
    price: "950",
    note: "",
    durationDays: 10,
    createdAt: todayAt("09:15"),
    approvedAt: todayAt("09:15"),
    expiresAt: addDays(8),
    rejectionReason: null,
    status: "ACTIVE",
    photo: ""
  },
  {
    id: "load-4",
    ownerId: "owner-1",
    ownerName: "Aysel Məmmədova",
    ownerPhone: "050 555 10 20",
    title: "Soyuducu yük (ət məhsulları)",
    cargoType: "Soyudulmuş məhsul",
    description:
      "Soyuq zəncir tələb edən ət məhsullarıdır. Refrijerator maşın və diqqətli temperatur rejimi lazımdır.",
    weight: 10000,
    length: 4,
    width: 2,
    height: 2,
    quantity: "",
    pickupCity: "Qəbələ",
    pickupAddress: "Soyuq anbar",
    deliveryCity: "Bakı",
    deliveryAddress: "Topdan satış mərkəzi",
    pickupDate: addDays(1).slice(0, 10),
    pickupTime: "08:00-12:00",
    vehicleType: "Soyuduculu maşın",
    price: "1500",
    note: "",
    durationDays: 10,
    createdAt: todayAt("08:50"),
    approvedAt: todayAt("08:50"),
    expiresAt: addDays(6),
    rejectionReason: null,
    status: "ACTIVE",
    photo: ""
  },
  {
    id: "load-5",
    ownerId: "owner-1",
    ownerName: "Aysel Məmmədova",
    ownerPhone: "050 555 10 20",
    title: "Maye yük (bitki yağı)",
    cargoType: "Ərzaq",
    description:
      "Qablaşdırılmış bitki yağı yüklənəcək. Məhsul quru və təmiz maşın tələb edir, boşaltma saatı öncədən razılaşdırılıb.",
    weight: 18000,
    length: 6,
    width: 2.3,
    height: 2.1,
    quantity: "",
    pickupCity: "Bakı",
    pickupAddress: "Binə terminalı",
    deliveryCity: "Lənkəran",
    deliveryAddress: "Distribusiya mərkəzi",
    pickupDate: addDays(2).slice(0, 10),
    pickupTime: "07:30-11:00",
    vehicleType: "Platforma",
    price: "1700",
    note: "",
    durationDays: 10,
    createdAt: todayAt("08:20"),
    approvedAt: todayAt("08:20"),
    expiresAt: addDays(7),
    rejectionReason: null,
    status: "ACTIVE",
    photo: ""
  },
  {
    id: "load-6",
    ownerId: "owner-1",
    ownerName: "Aysel Məmmədova",
    ownerPhone: "050 555 10 20",
    title: "Mebel (qadoqlanmış)",
    cargoType: "Mebel",
    description:
      "Qadoqlanmış mebel dəstləri ehtiyatla daşınmalıdır. Yükləmə briqadası var, boşaltma üçün sürücüdən kömək tələb olunmur.",
    weight: 12000,
    length: 5,
    width: 2.2,
    height: 2.1,
    quantity: "8",
    pickupCity: "Bakı",
    pickupAddress: "Biləcəri anbarı",
    deliveryCity: "Mingəçevir",
    deliveryAddress: "Mebel mağazası",
    pickupDate: addDays(3).slice(0, 10),
    pickupTime: "09:00-14:00",
    vehicleType: "Ford Transit",
    price: "800",
    note: "",
    durationDays: 5,
    createdAt: todayAt("07:55"),
    approvedAt: todayAt("07:55"),
    expiresAt: addDays(4),
    rejectionReason: null,
    status: "ACTIVE",
    photo: ""
  },
  {
    id: "load-7",
    ownerId: "owner-1",
    ownerName: "Aysel Məmmədova",
    ownerPhone: "050 555 10 20",
    title: "Soyuduculu ərzaq yükü",
    cargoType: "Ərzaq",
    description:
      "Soyuduculu maşın tələb edən qablaşdırılmış ərzaq məhsullarıdır. Elan admin təsdiqini gözləyən demo nümunədir və public siyahıda görünmür.",
    weight: 2500,
    length: 4,
    width: 2,
    height: 2,
    quantity: "60",
    pickupCity: "Bakı",
    pickupAddress: "Keşlə anbar zonası",
    deliveryCity: "Quba",
    deliveryAddress: "Quba mərkəz",
    pickupDate: addDays(1).slice(0, 10),
    pickupTime: "08:00-12:00",
    vehicleType: "Soyuduculu maşın",
    price: "300",
    note: "",
    durationDays: 10,
    createdAt: new Date().toISOString(),
    approvedAt: null,
    expiresAt: null,
    rejectionReason: null,
    status: "PENDING",
    photo: ""
  }
];

export const defaultBanners: Banner[] = [
  {
    id: "banner-1",
    label: "Yük elanları",
    title: "Yükünüzü elan edin, sürücülər birbaşa sizə zəng etsin",
    description:
      "Tranzit.AZ yük sahibləri üçün açıq elan platformasıdır. Elanınızı yerləşdirin, əlaqə nömrənizlə daşıyıcılarla birbaşa danışın.",
    ctaText: "Yeni elan",
    ctaLink: "/cargo-owner/cargo-posts/new",
    background: "linear-gradient(135deg, #ffffff 0%, #eef6ff 64%, #fff4e8 100%)",
    imageData: "",
    textColor: "#111827",
    order: 1,
    isActive: true
  }
];
