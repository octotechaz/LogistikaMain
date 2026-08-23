import type { Metadata } from "next";
import { AboutPageClient } from "@/components/classifieds/AboutPageClient";

export const metadata: Metadata = {
  title: "Platforma haqqında",
  description:
    "Tranzit.AZ haqqında məlumat: yük sahibləri, sürücülər və daşıma şirkətləri arasında əlaqəni asanlaşdıran onlayn yük elanları platforması."
};

export default function AboutPage() {
  return <AboutPageClient />;
}