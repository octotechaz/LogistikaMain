import Link from "next/link";
import { DriverRegisterForm } from "@/components/DriverRegisterForm";
import { Footer } from "@/components/Footer";
import { Navbar } from "@/components/Navbar";

export default function DriverRegisterPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
        <Link href="/" className="text-sm font-semibold text-logistics-orange">
          Ana səhifəyə qayıt
        </Link>
        <div className="mt-4">
          <p className="text-sm font-semibold text-logistics-orange">Passiv sürücü qeydiyyatı</p>
          <h1 className="mt-2 text-3xl font-bold text-navy-900">Yükləri operator vasitəsilə alın</h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Yük axtarmağa ehtiyac yoxdur. Operator uyğun yük olanda WhatsApp/SMS/zəng ilə sizə göndərəcək.
          </p>
        </div>
        <div className="mt-6">
          <DriverRegisterForm />
        </div>
      </main>
      <Footer />
    </div>
  );
}
