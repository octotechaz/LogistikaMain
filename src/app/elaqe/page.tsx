import type { Metadata } from "next";
import { ContactPageClient } from "@/components/classifieds/ContactPageClient";

export const metadata: Metadata = {
  title: "Əlaqə",
  description:
    "Tranzit.AZ ilə əlaqə saxlayın: telefon, e-mail və sadə əlaqə forması vasitəsilə sual və təkliflərinizi göndərin."
};

export default function ContactPage() {
  return <ContactPageClient />;
}
