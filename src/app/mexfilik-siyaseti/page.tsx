import type { Metadata } from "next";
import { PrivacyPageClient } from "@/components/classifieds/PrivacyPageClient";

export const metadata: Metadata = {
  title: "Məxfilik siyasəti",
  description: "Tranzit.AZ istifadəçi məlumatlarının necə toplandığını, istifadə edildiyini və qorunduğunu izah edən məxfilik siyasəti."
};

export default function PrivacyPage() {
  return <PrivacyPageClient />;
}