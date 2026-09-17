import type { Metadata } from "next";
import { RulesPageClient } from "@/components/classifieds/RulesPageClient";

export const metadata: Metadata = {
  title: "Qaydalar",
  description: "Tranzit.AZ platformasında elan yerləşdirmə qaydaları, tələb olunan məlumatlar və qadağan edilən davranışlar."
};

export default function RulesPage() {
  return <RulesPageClient />;
}