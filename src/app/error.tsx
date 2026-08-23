"use client";

import { Button } from "@/components/ui/Button";

export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="max-w-md rounded-lg border border-navy-100 bg-white p-6 text-center shadow-sm">
        <p className="text-sm font-semibold text-logistics-orange">Xəta baş verdi</p>
        <h1 className="mt-2 text-2xl font-bold text-navy-900">Səhifə yüklənmədi</h1>
        <p className="mt-3 text-sm text-slate-600">Zəhmət olmasa yenidən cəhd edin.</p>
        <Button onClick={reset} className="mt-5">
          Yenidən yoxla
        </Button>
      </div>
    </div>
  );
}
