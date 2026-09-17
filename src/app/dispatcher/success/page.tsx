import { CheckCircle2 } from "lucide-react";
import { Footer } from "@/components/Footer";
import { Navbar } from "@/components/Navbar";
import { ButtonLink } from "@/components/ui/Button";

export default function DispatcherSuccessPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="rounded-lg border border-navy-100 bg-white p-7 text-center shadow-sm">
          <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-600" aria-hidden />
          <h1 className="mt-4 text-3xl font-bold text-navy-900">Dispetçer qeydiyyatı qəbul edildi</h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Operator komandamız maşın parkınızı uyğun yüklərlə əlaqələndirmək üçün sizinlə WhatsApp/SMS/zəng vasitəsilə əlaqə saxlayacaq.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <ButtonLink href="/" variant="secondary">
              Ana səhifə
            </ButtonLink>
            <ButtonLink href="/operator/login">Operator panelinə bax</ButtonLink>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
