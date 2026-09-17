"use client";

import { Send } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";

export function CargoApplyForm({
  cargoPostId,
  vehicles
}: {
  cargoPostId: string;
  vehicles: Array<{ id: string; brand: string; model: string; plateNumber: string }>;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoading(true);
    setError(null);

    const formData = new FormData(event.currentTarget);
    const response = await fetch("/api/applications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        cargoPostId,
        vehicleId: String(formData.get("vehicleId") ?? ""),
        offeredPrice: String(formData.get("offeredPrice") ?? ""),
        message: String(formData.get("message") ?? "")
      })
    });
    const result = await response.json();

    setIsLoading(false);

    if (!response.ok || !result.ok) {
      setError(result.message ?? "Müraciət göndərilmədi.");
      return;
    }

    router.push("/carrier/applications");
    router.refresh();
  }

  if (!vehicles.length) {
    return (
      <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-700">
        Müraciət etmək üçün ən azı bir təsdiqlənmiş avtomobiliniz olmalıdır.
      </p>
    );
  }

  return (
    <form onSubmit={onSubmit} className="mt-4 space-y-3 rounded-lg bg-slate-50 p-4">
      {error ? <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}
      <div className="grid gap-3 md:grid-cols-[1fr_160px]">
        <label className="form-label">
          Avtomobil
          <select name="vehicleId" className="form-field" required>
            <option value="">Seçin</option>
            {vehicles.map((vehicle) => (
              <option key={vehicle.id} value={vehicle.id}>
                {vehicle.brand} {vehicle.model} · {vehicle.plateNumber}
              </option>
            ))}
          </select>
        </label>
        <label className="form-label">
          Təklif qiyməti
          <input name="offeredPrice" type="number" className="form-field" placeholder="AZN" />
        </label>
      </div>
      <label className="form-label">
        Mesaj
        <textarea name="message" className="form-field min-h-20" placeholder="Yük sahibinə qısa mesaj..." />
      </label>
      <Button type="submit" disabled={isLoading} className="w-full sm:w-auto">
        <Send className="h-4 w-4" aria-hidden />
        {isLoading ? "Göndərilir..." : "Müraciət et"}
      </Button>
    </form>
  );
}
