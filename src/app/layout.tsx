import type { Metadata } from "next";
import "@fortawesome/fontawesome-free/css/all.min.css";
import "remixicon/fonts/remixicon.css";
import "@/app/globals.css";
import { ClassifiedsProvider } from "@/components/providers/ClassifiedsProvider";
import { appName } from "@/lib/constants";

export const metadata: Metadata = {
  title: {
    default: `${appName} - Yük elanları platforması`,
    template: `%s | ${appName}`
  },
  description:
    "Tranzit.AZ yük sahibləri üçün müasir elan platformasıdır. Elan yerləşdirin, sürücülər əlaqə nömrənizlə birbaşa sizə zəng etsin.",
  openGraph: {
    title: "Tranzit.AZ - Yük elanları platforması",
    description:
      "Yük sahibləri elan yerləşdirir, daşıyıcılar əlaqə nömrəsi ilə birbaşa əlaqə saxlayır.",
    url: "https://tranzit.az",
    siteName: "Tranzit.AZ",
    locale: "az_AZ",
    type: "website"
  }
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="az">
      <body className="min-h-screen">
        <ClassifiedsProvider>{children}</ClassifiedsProvider>
      </body>
    </html>
  );
}
