import Link from "next/link";
import { DispatcherRegisterForm } from "@/components/DispatcherRegisterForm";
import { Footer } from "@/components/Footer";
import { Navbar } from "@/components/Navbar";

export default function DispatcherRegisterPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
        <Link href="/" className="text-sm font-semibold text-logistics-orange">
          Ana səhifəyə qayıt
        </Link>
        <div className="mt-4">
          <p className="text-sm font-semibold text-logistics-orange">Dispetçer qeydiyyatı</p>
          <h1 className="mt-2 text-3xl font-bold text-navy-900">Bir neçə maşını operator uyğunlaşdırmasına qoşun</h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Dispetçer uyğun yük gələndə operator tərəfindən aktivləşdirilir və sürücü cavabları birlikdə idarə olunur.
          </p>
        </div>
        <div className="mt-6">
          <DispatcherRegisterForm />
        </div>
      </main>
      <Footer />
    </div>
  );
}
