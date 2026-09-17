import type { Metadata } from "next";
import { TermsPageClient } from "@/components/classifieds/TermsPageClient";

export const metadata: Metadata = {
  title: "İstifadə şərtləri",
  description: "Tranzit.AZ platformasından istifadə qaydaları, elanların yerləşdirilməsi və istifadəçilərin məsuliyyətləri haqqında şərtlər."
};

export default function TermsPage() {
  return <TermsPageClient />;
}