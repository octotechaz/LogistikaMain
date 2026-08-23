import Link from "next/link";

export default function NotFoundPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="max-w-md rounded-lg border border-navy-100 bg-white p-6 text-center shadow-sm">
        <p className="text-sm font-semibold text-logistics-orange">404</p>
        <h1 className="mt-2 text-2xl font-bold text-navy-900">Səhifə tapılmadı</h1>
        <p className="mt-3 text-sm text-slate-600">Axtardığınız səhifə mövcud deyil və ya giriş icazəniz yoxdur.</p>
        <Link href="/" className="mt-5 inline-flex rounded-lg bg-logistics-orange px-4 py-2 text-sm font-semibold text-white">
          Ana səhifəyə qayıt
        </Link>
      </div>
    </div>
  );
}
