export type PlatformRole = "owner" | "carrier";

export type CargoListing = {
  id: string;
  title: string;
  pickupCity: string;
  deliveryCity: string;
  distanceKm: number;
  weight: string;
  cargoType: string;
  budget: string;
  date: string;
  offerCount: number;
  status: "Yeni" | "Aktiv" | "Təcili";
  summary: string;
};

export type CargoFormState = {
  title: string;
  cargoType: string;
  weight: string;
  volume: string;
  pickupAddress: string;
  deliveryAddress: string;
  pickupDate: string;
  deliveryDate: string;
  budget: string;
  notes: string;
  requirements: string[];
};

export type OfferDraft = {
  price: string;
  duration: string;
  vehicleType: string;
  note: string;
  contact: string;
};

export const navItems = [
  { label: "Ana səhifə", href: "#ana-sehife" },
  { label: "Necə işləyir", href: "#nece-isleyir" },
  { label: "Yüklər", href: "#canli-yukler" },
  { label: "Elan yerləşdir", href: "#yuk-formu" },
  { label: "Daşıyıcılar", href: "#ustunlukler" },
  { label: "FAQ", href: "#faq" }
];

export const roleCards = [
  {
    id: "owner" as const,
    title: "Yük elanı yerləşdirmək istəyirəm",
    description: "Yükünüzü qeyd edin, daşıyıcılardan real təkliflər alın."
  },
  {
    id: "carrier" as const,
    title: "Yüklərə təklif vermək istəyirəm",
    description: "Sürücü və ya logistika şirkəti kimi mövcud yüklərə təklif göndərin."
  }
];

export const journeyStages = [
  "Yük məlumatlarını daxil edin",
  "Daşıyıcılardan təkliflər alın",
  "Ən uyğun təklifi seçin",
  "Daşınmanı real vaxtda izləyin",
  "Çatdırılmanı tamamlayın"
];

export const listingSeed: CargoListing[] = [
  {
    id: "load-101",
    title: "Quru ərzaq paletləri",
    pickupCity: "Bakı",
    deliveryCity: "Gəncə",
    distanceKm: 364,
    weight: "18 ton",
    cargoType: "Paletli yük",
    budget: "₼ 1,480 - 1,650",
    date: "06 iyul 2026",
    offerCount: 12,
    status: "Aktiv",
    summary: "Soyuducu tələb olunmur, axşam yükləmə mümkündür."
  },
  {
    id: "load-102",
    title: "Farmasevtik məhsullar",
    pickupCity: "Sumqayıt",
    deliveryCity: "Lənkəran",
    distanceKm: 246,
    weight: "9 ton",
    cargoType: "Soyudulmuş məhsul",
    budget: "₼ 980 - 1,120",
    date: "05 iyul 2026",
    offerCount: 7,
    status: "Təcili",
    summary: "Temperatur rejimi +4C, sığorta vacibdir."
  },
  {
    id: "load-103",
    title: "Mebel və dekor",
    pickupCity: "Şəki",
    deliveryCity: "Bakı",
    distanceKm: 305,
    weight: "6.5 ton",
    cargoType: "Mebel",
    budget: "₼ 740 - 860",
    date: "07 iyul 2026",
    offerCount: 4,
    status: "Yeni",
    summary: "Bağlı yük maşını tələb olunur, montaj materialları da daxildir."
  }
];

export const requirements = [
  "Soyuduculu maşın",
  "Qapalı yük maşını",
  "Təhlükəli yük",
  "Sığorta tələb olunur",
  "Təcili çatdırılma"
];

export const ownerBenefits = [
  "Bir elana bir neçə daşıyıcı təklifi toplayın və bazar qiymətini canlı görün.",
  "Yükləmə, marşrut, tarix və sənəd tələblərini bir axında idarə edin.",
  "Status paneli ilə təklif, seçim və çatdırılma mərhələsini eyni səthdə izləyin."
];

export const carrierBenefits = [
  "Canlı yükləri məsafə, çəkı və büdcəyə görə süzərək daha sürətli qərar verin.",
  "Hər yük üzrə xüsusi təklif, maşın növü və çatdırılma müddəti göndərin.",
  "Etibarlı yük sahibləri, şəffaf məlumat və sürətli əlaqə ilə boş reysləri azaldın."
];

export const stats = [
  { label: "Aktiv elanlar", value: 1240, suffix: "+" },
  { label: "Qeydiyyatlı daşıyıcılar", value: 318, suffix: "+" },
  { label: "Tamamlanmış daşımalar", value: 8700, suffix: "+" },
  { label: "Orta cavab müddəti", value: 14, suffix: " dəq" }
];

export const faqs = [
  {
    question: "Yük elanı yerləşdirmək üçün nə qədər vaxt lazımdır?",
    answer:
      "Step-by-step forma ilə əsas yük məlumatlarını 2-3 dəqiqəyə tamamlayıb elanı sistemə yerləşdirə bilərsiniz."
  },
  {
    question: "Daşıyıcı təkliflərini necə müqayisə edirəm?",
    answer:
      "Hər təklifdə qiymət, çatdırılma müddəti, maşın növü və daşıyıcının qeydi eyni kart strukturunda göstərilir."
  },
  {
    question: "Sənəd və xüsusi tələbləri əlavə etmək mümkündür?",
    answer:
      "Bəli. Formada əlavə qeydlər, sığorta, soyuduculu maşın, təhlükəli yük və digər xüsusi tələbləri ayrıca qeyd edə bilərsiniz."
  },
  {
    question: "Platforma yalnız böyük logistika şirkətləri üçündür?",
    answer:
      "Xeyr. Fərdi sürücülərdən tutmuş fleet idarə edən logistika şirkətlərinə qədər hər kəs yüklərə təklif verə bilər."
  }
];

export const defaultCargoForm: CargoFormState = {
  title: "",
  cargoType: "",
  weight: "",
  volume: "",
  pickupAddress: "",
  deliveryAddress: "",
  pickupDate: "",
  deliveryDate: "",
  budget: "",
  notes: "",
  requirements: []
};

export const defaultOfferDraft: OfferDraft = {
  price: "",
  duration: "",
  vehicleType: "",
  note: "",
  contact: ""
};
