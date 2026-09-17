import { CheckCircle2, Loader2, PhoneCall, Search } from "lucide-react";
import { Footer } from "@/components/Footer";
import { Navbar } from "@/components/Navbar";
import { ButtonLink } from "@/components/ui/Button";
import type { LucideIcon } from "lucide-react";

const steps: Array<{ label: string; icon: LucideIcon }> = [
  { label: "Yük qəbul edildi", icon: CheckCircle2 },
  { label: "Uyğun sürücülər axtarılır", icon: Search },
  { label: "Operator yoxlayır", icon: PhoneCall },
  { label: "İlkin təkliflər hazırlanır", icon: Loader2 }
];

export default function LoadSuccessPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <main className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="rounded-lg border border-navy-100 bg-white p-6 text-center shadow-sm sm:p-8">
          <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-600" aria-hidden />
          <h1 className="mt-4 text-3xl font-bold text-navy-900">Yükünüz qəbul edildi</h1>
          <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-slate-600">
            Operatorlarımız 10-15 dəqiqə ərzində uyğun sürücü/dispetçer tapmaq üçün sizinlə əlaqə saxlayacaq.
          </p>
          <div className="mt-7 grid gap-3 text-left sm:grid-cols-2">
            {steps.map(({ label, icon: Icon }) => (
              <div key={label} className="flex items-center gap-3 rounded-lg bg-slate-50 p-4">
                <Icon className="h-5 w-5 text-logistics-orange" aria-hidden />
                <span className="font-semibold text-navy-900">{label}</span>
              </div>
            ))}
          </div>
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <ButtonLink href="/" variant="secondary">
              Ana səhifəyə qayıt
            </ButtonLink>
            <ButtonLink href="/cargo-owner/loads/new">Yeni yük yerləşdir</ButtonLink>
            <ButtonLink href="/operator" variant="secondary">
              Operator panelinə bax
            </ButtonLink>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
