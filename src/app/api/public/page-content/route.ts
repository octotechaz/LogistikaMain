import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const DEFAULTS: Record<string, string> = {
  about_hero_title: "Platforma haqqında",
  about_hero_description: "Tranzit.AZ yük bazarında əlaqəni sürətləndirən, aydın və rahat iş axını təqdim edən elan platformasıdır.",
  about_paragraphs: JSON.stringify([
    "Tranzit.AZ yük sahibləri, sürücülər və daşıma şirkətləri arasında əlaqəni asanlaşdıran onlayn yük elanları platformasıdır. Məqsədimiz yükünüzün daha asan tapılmasını sürətli, şəffaf və rahat etməkdir.",
    "Platformada yük sahibləri öz elanlarını pulsuz yerləşdirə, sürücülər və daşıma şirkətləri isə uyğun yükləri asanlıqla taparaq əlaqə saxlaya bilərlər."
  ]),
  about_advantages: JSON.stringify([
    "Vaxta qənaət - Siz sürücü yox, sürücülər sizi axtarır.",
    "Rahat elan yerləşdirmə",
    "Yük növü, nəqliyyat və şəhərə görə axtarış sistemi",
    "Sürücülər və daşıma şirkətləri üçün yeni sifariş imkanları",
    "Birbaşa zəng və vasitəsiz danışıq imkanı",
    "Sürücülər üçün qeydiyyat olmadan yük görmə və zəng etmə imkanları"
  ]),
  howitworks_title: "Sadə elan modeli, sürətli əlaqə",
  howitworks_description: "Tranzit.AZ marketplace deyil. Platforma yük elanını dərc edir və sürücünü birbaşa yük sahibi ilə danışdırır.",
  howitworks_steps: JSON.stringify([
    { icon: "UploadCloud", title: "Asan yük yerləşdirmə", text: "Yük sahibi qeydiyyatdan keçərək yük formunu bir neçə kliklə doldurur." },
    { icon: "ShieldCheck", title: "Təsdiqləmə vaxtı", text: "Dəqiqələr içində elanınız yoxlanılır, qaydalara uyğun olduqda təsdiqlənir." },
    { icon: "ClipboardList", title: "Əlçatan elan səhifəsi", text: "Elanınız əsas səhifədə görünərək sürücülər üçün daha əlçatan olur." },
    { icon: "PhoneCall", title: "Birbaşa zəng", text: "Fərdi sürücülər birbaşa sizinlə əlaqə saxlayaraq daşınmanın detallarını razılaşdırır." }
  ]),
  home_hero_title: "Daşımalarınızı bizimlə asanlaşdırın",
  home_hero_subtitle: "Yükünüz üçün doğru marşrutu, nəqliyyatı və daşıyıcını bir yerdə tapın.",
};

export async function GET() {
  try {
    const rows = await prisma.appSetting.findMany({
      where: { key: { in: Object.keys(DEFAULTS) } },
    });

    const map: Record<string, string> = {};
    for (const row of rows) {
      map[row.key] = row.value;
    }

    const result: Record<string, unknown> = {};
    for (const key of Object.keys(DEFAULTS)) {
      result[key] = map[key] ?? DEFAULTS[key];
    }

    return NextResponse.json(result);
  } catch {
    return NextResponse.json(DEFAULTS);
  }
}