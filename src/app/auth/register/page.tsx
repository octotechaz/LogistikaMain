import { RoleSelectionCard } from "@/components/RoleSelectionCard";
import { Navbar } from "@/components/Navbar";
import { getCurrentUser } from "@/lib/auth";

export default async function RegisterChoicePage() {
  const user = await getCurrentUser();

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar user={user} />
      <main className="mx-auto max-w-5xl px-4 py-10">
        <div className="mb-8 text-center">
          <p className="text-sm font-semibold text-logistics-orange">Qeydiyyat növü</p>
          <h1 className="mt-2 text-3xl font-bold text-navy-900">Siz yük daşıyansınız, yoxsa yük sahibisiniz?</h1>
        </div>
        <div className="grid gap-5 md:grid-cols-2">
          <RoleSelectionCard
            type="carrier"
            title="Yük daşıyanam"
            description="Avtomobil əlavə edin, aktiv yükləri izləyin və müraciət göndərin."
            href="/register/carrier"
          />
          <RoleSelectionCard
            type="owner"
            title="Yük sahibiyəm"
            description="Yük elanı yaradın, müraciətləri görün və uyğun daşıyıcını seçin."
            href="/register/cargo-owner"
          />
        </div>
      </main>
    </div>
  );
}
