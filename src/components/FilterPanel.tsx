import { CalendarDays, Filter, MapPin, Search } from "lucide-react";
import { azerbaijanLocations, cargoTypes, vehicleTypes } from "@/lib/constants";

export function FilterPanel({
  defaultValues = {}
}: {
  defaultValues?: Record<string, string | undefined>;
}) {
  return (
    <form method="get" className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-navy-900">
        <Filter className="h-4 w-4 text-logistics-orange" aria-hidden />
        Filtrlər
      </div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <label className="space-y-1 text-sm">
          <span className="text-slate-600">Yük növü</span>
          <select name="cargoType" className="form-field" defaultValue={defaultValues.cargoType ?? ""}>
            <option value="">Hamısı</option>
            {cargoTypes.map((type) => (
              <option key={type}>{type}</option>
            ))}
          </select>
        </label>
        <label className="space-y-1 text-sm">
          <span className="text-slate-600">Şəhər/Rayon</span>
          <div className="relative">
            <MapPin className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-400" aria-hidden />
            <select name="city" className="form-field pl-9" defaultValue={defaultValues.city ?? ""}>
              <option value="">Hamısı</option>
              {azerbaijanLocations.map((location) => (
                <option key={location}>{location}</option>
              ))}
            </select>
          </div>
        </label>
        <label className="space-y-1 text-sm">
          <span className="text-slate-600">Avtomobil növü</span>
          <select name="vehicleType" className="form-field" defaultValue={defaultValues.vehicleType ?? ""}>
            <option value="">Hamısı</option>
            {vehicleTypes.map((type) => (
              <option key={type}>{type}</option>
            ))}
          </select>
        </label>
        <label className="space-y-1 text-sm">
          <span className="text-slate-600">Tarix</span>
          <div className="relative">
            <CalendarDays className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-400" aria-hidden />
            <input type="date" name="date" className="form-field pl-9" defaultValue={defaultValues.date ?? ""} />
          </div>
        </label>
        <label className="space-y-1 text-sm">
          <span className="text-slate-600">Daşıya bildiyim tonnaj</span>
          <input name="tonnage" type="number" step="0.1" className="form-field" defaultValue={defaultValues.tonnage ?? ""} />
        </label>
        <label className="space-y-1 text-sm">
          <span className="text-slate-600">Min. qiymət</span>
          <input name="priceMin" type="number" className="form-field" defaultValue={defaultValues.priceMin ?? ""} />
        </label>
        <label className="space-y-1 text-sm">
          <span className="text-slate-600">Maks. qiymət</span>
          <input name="priceMax" type="number" className="form-field" defaultValue={defaultValues.priceMax ?? ""} />
        </label>
        <label className="space-y-1 text-sm">
          <span className="text-slate-600">Axtarış</span>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-400" aria-hidden />
            <input name="q" className="form-field pl-9" placeholder="Yük, rayon..." defaultValue={defaultValues.q ?? ""} />
          </div>
        </label>
      </div>
      <div className="mt-4 flex justify-end">
        <button className="rounded-lg bg-navy-900 px-4 py-2 text-sm font-semibold text-white">Tətbiq et</button>
      </div>
    </form>
  );
}
