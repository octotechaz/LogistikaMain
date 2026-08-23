export type MockDriver = {
  id: string;
  name: string;
  phone: string;
  whatsapp: string;
  city: string;
  vehicleType: string;
  plateNumber: string;
  tonnage: number;
  directions: string[];
  activityScore: number;
  lastResponseStatus: "Tez cavab verdi" | "Qiymət azdır" | "Cavab gözləyir" | "Razılaşdı";
};

export const mockDrivers: MockDriver[] = [
  {
    id: "driver-1",
    name: "Elvin Hüseynov",
    phone: "+994 55 222 33 44",
    whatsapp: "+994 55 222 33 44",
    city: "Bakı",
    vehicleType: "Ford Transit",
    plateNumber: "10-AB-123",
    tonnage: 3.5,
    directions: ["Bakı", "Gəncə", "Sumqayıt"],
    activityScore: 86,
    lastResponseStatus: "Tez cavab verdi"
  },
  {
    id: "driver-2",
    name: "Tural Əliyev",
    phone: "+994 77 222 11 99",
    whatsapp: "+994 77 222 11 99",
    city: "Gəncə",
    vehicleType: "TIR",
    plateNumber: "90-KM-777",
    tonnage: 20,
    directions: ["Bakı", "Gəncə", "Şəki"],
    activityScore: 73,
    lastResponseStatus: "Qiymət azdır"
  },
  {
    id: "driver-3",
    name: "Samir İbrahimov",
    phone: "+994 55 333 11 88",
    whatsapp: "+994 55 333 11 88",
    city: "Lənkəran",
    vehicleType: "Soyuduculu maşın",
    plateNumber: "99-SY-808",
    tonnage: 5,
    directions: ["Lənkəran", "Masallı", "Bakı"],
    activityScore: 91,
    lastResponseStatus: "Razılaşdı"
  }
];
