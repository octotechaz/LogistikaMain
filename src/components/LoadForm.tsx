"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { FormInput, FormTextarea } from "@/components/FormInput";

const requiredFields = ["fullName", "phone", "title", "cargoType", "tonnage", "pickupCity", "deliveryCity", "pickupAddress", "deliveryAddress", "date", "priceRange", "vehicleType"];

export function LoadForm() {
  const router = useRouter();
  const [errors, setErrors] = useState<Record<string, string>>({});

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const nextErrors: Record<string, string> = {};

    requiredFields.forEach((field) => {
      if (!String(formData.get(field) ?? "").trim()) {
        nextErrors[field] = "Bu sahə mütləqdir.";
      }
    });

    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors);
      return;
    }

    router.push("/loads/success");
  }

  return (
    <form onSubmit={submit} className="form-card">
      <div className="grid gap-4 md:grid-cols-2">
        <FormInput name="fullName" label="Ad soyad" placeholder="Məsələn: Rəşad Məmmədov" error={errors.fullName} />
        <FormInput name="phone" label="Telefon" placeholder="+994..." error={errors.phone} />
        <FormInput name="companyName" label="Şirkət adı" placeholder="Optional" />
        <FormInput name="title" label="Yükün adı" placeholder="Mebel daşınması" error={errors.title} />
        <FormInput name="cargoType" label="Yük tipi" placeholder="Mebel, ərzaq, tikinti materialı..." error={errors.cargoType} />
        <FormInput name="tonnage" label="Yük çəkisi / tonnaj" type="number" step="0.1" placeholder="2" error={errors.tonnage} />
        <FormInput name="volume" label="Yük həcmi" placeholder="18 m³" />
        <FormInput name="pickupCity" label="Götürülmə şəhəri" placeholder="Bakı" error={errors.pickupCity} />
        <FormInput name="deliveryCity" label="Çatdırılma şəhəri" placeholder="Gəncə" error={errors.deliveryCity} />
        <FormInput name="pickupAddress" label="Götürülmə ünvanı" placeholder="Anbar / küçə / rayon" error={errors.pickupAddress} />
        <FormInput name="deliveryAddress" label="Çatdırılma ünvanı" placeholder="Çatdırılacaq ünvan" error={errors.deliveryAddress} />
        <FormInput name="date" label="Tarix" type="date" error={errors.date} />
        <FormInput name="priceRange" label="Qiymət aralığı" placeholder="180-220 AZN və ya razılaşma ilə" error={errors.priceRange} />
        <FormInput name="vehicleType" label="Tələb olunan maşın növü" placeholder="Ford Transit, TIR, Kamaz..." error={errors.vehicleType} />
        <div className="rounded-lg border border-dashed border-navy-100 bg-slate-50 p-4 text-sm text-slate-600">
          Şəkil upload sonrakı mərhələdə aktiv ediləcək. Hazırda operator yük məlumatına əsasən uyğunlaşdırma edir.
        </div>
      </div>
      <FormTextarea name="note" label="Əlavə qeyd" placeholder="Yükləmə vaxtı, xüsusi şərtlər, əlaqə detalları..." />
      <Button type="submit" className="w-full md:w-auto">
        Yükü yerləşdir
      </Button>
    </form>
  );
}
