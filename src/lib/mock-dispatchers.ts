export type MockDispatcher = {
  id: string;
  name: string;
  phone: string;
  whatsapp: string;
  teamName: string;
  vehicleCount: number;
  vehicleTypes: string[];
  directions: string[];
  note: string;
};

export const mockDispatchers: MockDispatcher[] = [
  {
    id: "dispatcher-1",
    name: "Rauf Məmmədov",
    phone: "+994 50 700 10 10",
    whatsapp: "+994 50 700 10 10",
    teamName: "Baku Fleet",
    vehicleCount: 12,
    vehicleTypes: ["TIR", "Kamaz", "Ford Transit"],
    directions: ["Bakı", "Gəncə", "Şəki", "Qəbələ"],
    note: "Bölgələrarası daşımalar üçün tez cavab verir."
  },
  {
    id: "dispatcher-2",
    name: "Nailə Qasımova",
    phone: "+994 70 888 44 11",
    whatsapp: "+994 70 888 44 11",
    teamName: "Cold Chain AZ",
    vehicleCount: 7,
    vehicleTypes: ["Soyuduculu maşın"],
    directions: ["Lənkəran", "Masallı", "Bakı"],
    note: "Soyudulmuş ərzaq və dərman daşımaları üzrə uyğundur."
  }
];
