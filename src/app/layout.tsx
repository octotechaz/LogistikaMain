import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans, Montserrat } from "next/font/google";
import "@fortawesome/fontawesome-free/css/all.min.css";
import "remixicon/fonts/remixicon.css";
import "@/app/globals.css";
import { ClassifiedsProvider } from "@/components/providers/ClassifiedsProvider";
import { LocaleProvider } from "@/components/providers/LocaleProvider";
import { GlobalLoader } from "@/components/GlobalLoader";
import { appName } from "@/lib/constants";

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin", "latin-ext"],
  variable: "--font-plus-jakarta-sans",
  weight: ["300", "400", "500", "600", "700", "800"],
  display: "swap",
});

const montserrat = Montserrat({
  subsets: ["latin", "latin-ext"],
  variable: "--font-montserrat",
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 0.9,
  minimumScale: 0.9,
};

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
    <html lang="az" className={`${plusJakartaSans.variable} ${montserrat.variable}`}>
      <body className={`${plusJakartaSans.className} min-h-screen`}>
        <LocaleProvider><ClassifiedsProvider>{children}</ClassifiedsProvider></LocaleProvider>
        <GlobalLoader />
      </body>
    </html>
  );
}
