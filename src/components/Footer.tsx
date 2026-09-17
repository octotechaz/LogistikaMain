import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-navy-100 bg-white">
      <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-6 text-sm text-slate-600 sm:px-6 md:flex-row md:items-center md:justify-between lg:px-8">
        <p>Tranzit.AZ - operatorlu yük uyğunlaşdırma MVP-si</p>
        <div className="flex flex-wrap gap-3">
          <Link href="/cargo-owner/register" className="font-semibold text-navy-900">
            Yük yerləşdir
          </Link>
          <Link href="/driver/register" className="font-semibold text-navy-900">
            Sürücü qeydiyyatı
          </Link>
          <Link href="/dispatcher/register" className="font-semibold text-navy-900">
            Dispetçer qeydiyyatı
          </Link>
        </div>
      </div>
    </footer>
  );
}
