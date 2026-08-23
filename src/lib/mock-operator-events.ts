export type MockOperatorEvent = {
  id: string;
  loadId: string;
  title: string;
  description: string;
  time: string;
};

export const mockOperatorEvents: MockOperatorEvent[] = [
  {
    id: "event-1",
    loadId: "load-1",
    title: "WhatsApp mesajı göndərildi",
    description: "3 sürücüyə 1/2/3 cavab formatı ilə mesaj göndərildi.",
    time: "09:12"
  },
  {
    id: "event-2",
    loadId: "load-1",
    title: "İlk cavab gəldi",
    description: "Elvin Hüseynov 1 - gedirəm cavabını verdi.",
    time: "09:15"
  },
  {
    id: "event-3",
    loadId: "load-2",
    title: "Qiymət etirazı",
    description: "Tural Əliyev 3 - qiymət azdır cavabını verdi.",
    time: "09:18"
  }
];

export const operatorKpis = [
  { label: "Yeni yüklər", value: "12", hint: "Bugünkü qəbul" },
  { label: "İlk cavab vaxtı", value: "4 dəq", hint: "Orta cavab" },
  { label: "3 təklif vaxtı", value: "15 dəq", hint: "MVP hədəfi" },
  { label: "Bağlanma faizi", value: "64%", hint: "Son 7 gün" },
  { label: "Sürücü cavab faizi", value: "72%", hint: "1/2/3 cavabları" },
  { label: "Təkrar yük verənlər", value: "38%", hint: "Ay üzrə" }
];
