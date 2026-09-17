import type { MockLoad } from "@/lib/mock-loads";

export function buildWhatsappMessage(load: MockLoad) {
  return `${load.route} | ${load.tonnage} ton ${load.cargoType.toLowerCase()} | ${load.date} | ${load.price}
Cavab ver: 1 - gedirəm, 2 - maraqlı deyil, 3 - qiymət azdır`;
}

export function buildSmsMessage(load: MockLoad) {
  return `tranzit.az: ${load.pickupCity}-${load.deliveryCity}, ${load.tonnage} ton ${load.cargoType.toLowerCase()}, ${load.date.toLowerCase()}, ${load.price}. Cavab: 1 gedirəm, 2 yox, 3 qiymət azdır.`;
}
