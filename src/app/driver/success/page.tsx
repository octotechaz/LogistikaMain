import { CheckCircle2 } from "lucide-react";
import { Footer } from "@/components/Footer";
import { Navbar } from "@/components/Navbar";
import { ButtonLink } from "@/components/ui/Button";

export default function DriverSuccessPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <main className="mx-auto max-w-3xl px-4 py-12 text-center sm:px-6 lg:px-8">
        <div className="rounded-lg border border-navy-100 bg-white p-8 shadow-sm">
          <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-600" aria-hidden />
          <h1 className="mt-4 text-3xl font-bold text-navy-900">Sürücü qeydiyyatı qəbul edildi</h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Operator uyğun yük tapanda sizə 1/2/3 formatında WhatsApp/SMS mesajı göndərəcək.
          </p>
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <ButtonLink href="/" variant="secondary">
              Ana səhifəyə qayıt
            </ButtonLink>
            <ButtonLink href="/operator/login">Operator panelinə giriş</ButtonLink>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
