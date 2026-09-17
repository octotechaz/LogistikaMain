import Link from "next/link";
import { Footer } from "@/components/Footer";
import { LoginForm } from "@/components/LoginForm";
import { Navbar } from "@/components/Navbar";

export default function OperatorLoginPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <main className="mx-auto max-w-xl px-4 py-10 sm:px-6 lg:px-8">
        <Link href="/" className="text-sm font-semibold text-logistics-orange">
          Ana səhifəyə qayıt
        </Link>
        <div className="mt-5 rounded-lg border border-navy-100 bg-white p-4 shadow-sm">
          <p className="text-sm font-semibold text-logistics-orange">Operator girişi</p>
          <p className="mt-2 text-sm text-slate-600">Operator və admin hesabları CRM panelinə yönləndirilir.</p>
        </div>
        <div className="mt-5">
          <LoginForm />
        </div>
      </main>
      <Footer />
    </div>
  );
}
