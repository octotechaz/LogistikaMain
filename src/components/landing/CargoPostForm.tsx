"use client";

import { Check, ChevronRight, ShieldCheck, UploadCloud } from "lucide-react";
import { useMemo, useState } from "react";
import {
  defaultCargoForm,
  requirements,
  type CargoFormState,
  type PlatformRole
} from "@/components/landing/mock-data";

type CargoPostFormProps = {
  selectedRole: PlatformRole | null;
  onSubmit: (payload: CargoFormState) => void;
};

const stepTitles = [
  "Yük məlumatları",
  "Marşrut",
  "Tarix və büdcə",
  "Əlavə tələblər",
  "Təsdiq"
];

export function CargoPostForm({ selectedRole, onSubmit }: CargoPostFormProps) {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<CargoFormState>(defaultCargoForm);
  const [submitted, setSubmitted] = useState(false);

  const roleNote = useMemo(
    () =>
      selectedRole === "carrier"
        ? "Daşıyıcı axını seçilsə də elan forması canlı məhsul təcrübəsini göstərmək üçün aktiv saxlanılıb."
        : "Yük sahibi üçün optimallaşdırılmış step-by-step elan axını aktivdir.",
    [selectedRole]
  );

  function updateField<K extends keyof CargoFormState>(field: K, value: CargoFormState[K]) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function toggleRequirement(item: string) {
    setForm((current) => ({
      ...current,
      requirements: current.requirements.includes(item)
        ? current.requirements.filter((value) => value !== item)
        : [...current.requirements, item]
    }));
  }

  function nextStep() {
    setStep((current) => Math.min(current + 1, stepTitles.length - 1));
  }

  function previousStep() {
    setStep((current) => Math.max(current - 1, 0));
  }

  function handleSubmit() {
    onSubmit(form);
    setSubmitted(true);
    setStep(0);
    setForm(defaultCargoForm);
    window.setTimeout(() => setSubmitted(false), 4500);
  }

  return (
    <section id="yuk-formu" className="bg-[#020816] px-4 py-20 sm:px-6 lg:px-8">
      <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[0.86fr_1.14fr]">
        <div className="space-y-6">
          <p className="text-sm uppercase tracking-[0.35em] text-cyan-200/65">Cargo Owner Flow</p>
          <h2 className="text-3xl font-semibold tracking-tight text-white sm:text-5xl">Yük elanı yerləşdir</h2>
          <p className="max-w-xl text-base leading-8 text-slate-300">
            Premium form səthi bir anda çox məlumat sıxmır. Hər addımda marşrut, tarix, büdcə və xüsusi tələblər ayrıca
            toplanır.
          </p>

          <div className="grid gap-4 rounded-[1.8rem] border border-white/10 bg-white/6 p-5 backdrop-blur-2xl">
            <div className="flex items-start gap-4">
              <div className="rounded-2xl border border-cyan-300/25 bg-cyan-300/10 p-3 text-cyan-100">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">Axın notu</h3>
                <p className="mt-2 text-sm leading-7 text-slate-300">{roleNote}</p>
              </div>
            </div>
            <div className="grid gap-3 text-sm text-slate-400">
              <p>1. Yük məlumatları</p>
              <p>2. Marşrut</p>
              <p>3. Tarix və büdcə</p>
              <p>4. Əlavə tələblər</p>
              <p>5. Elanı təsdiqlə</p>
            </div>
          </div>
        </div>

        <div className="rounded-[2rem] border border-white/10 bg-white/7 p-5 shadow-[0_35px_90px_rgba(2,8,23,0.45)] backdrop-blur-2xl sm:p-7">
          <div className="mb-6 flex flex-wrap gap-3">
            {stepTitles.map((label, index) => (
              <button
                key={label}
                type="button"
                onClick={() => setStep(index)}
                className={`rounded-full border px-4 py-2 text-sm transition ${
                  step === index
                    ? "border-cyan-300/30 bg-cyan-300/10 text-cyan-100"
                    : "border-white/8 bg-white/5 text-slate-400 hover:text-white"
                }`}
              >
                {index + 1}. {label}
              </button>
            ))}
          </div>

          <div className="grid gap-5">
            {step === 0 ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  label="Yükün adı"
                  value={form.title}
                  onChange={(value) => updateField("title", value)}
                  placeholder="Məsələn, quru ərzaq paletləri"
                />
                <Field
                  label="Yükün növü"
                  value={form.cargoType}
                  onChange={(value) => updateField("cargoType", value)}
                  placeholder="Paletli yük / soyudulmuş məhsul"
                />
                <Field
                  label="Yükün çəkisi"
                  value={form.weight}
                  onChange={(value) => updateField("weight", value)}
                  placeholder="18 ton"
                />
                <Field
                  label="Yükün həcmi"
                  value={form.volume}
                  onChange={(value) => updateField("volume", value)}
                  placeholder="34 m3"
                />
              </div>
            ) : null}

            {step === 1 ? (
              <div className="grid gap-4">
                <Field
                  label="Yükləmə ünvanı"
                  value={form.pickupAddress}
                  onChange={(value) => updateField("pickupAddress", value)}
                  placeholder="Bakı, Qaradağ logistika parkı"
                />
                <Field
                  label="Çatdırılma ünvanı"
                  value={form.deliveryAddress}
                  onChange={(value) => updateField("deliveryAddress", value)}
                  placeholder="Gəncə, sənaye zonası"
                />
              </div>
            ) : null}

            {step === 2 ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  label="Yükləmə tarixi"
                  type="date"
                  value={form.pickupDate}
                  onChange={(value) => updateField("pickupDate", value)}
                />
                <Field
                  label="Çatdırılma tarixi"
                  type="date"
                  value={form.deliveryDate}
                  onChange={(value) => updateField("deliveryDate", value)}
                />
                <Field
                  label="Təxmini büdcə"
                  value={form.budget}
                  onChange={(value) => updateField("budget", value)}
                  placeholder="₼ 1,200 - 1,500"
                />
              </div>
            ) : null}

            {step === 3 ? (
              <div className="grid gap-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  {requirements.map((item) => {
                    const active = form.requirements.includes(item);
                    return (
                      <button
                        key={item}
                        type="button"
                        onClick={() => toggleRequirement(item)}
                        className={`flex min-h-[56px] items-center justify-between rounded-[1.2rem] border px-4 py-3 text-left text-sm transition ${
                          active
                            ? "border-cyan-300/35 bg-cyan-300/10 text-cyan-100"
                            : "border-white/8 bg-white/5 text-slate-300"
                        }`}
                      >
                        {item}
                        {active ? <Check className="h-4 w-4" /> : null}
                      </button>
                    );
                  })}
                </div>
                <label className="grid gap-2 text-sm text-slate-300">
                  Əlavə qeydlər
                  <textarea
                    value={form.notes}
                    onChange={(event) => updateField("notes", event.target.value)}
                    placeholder="Sənəd, yükləmə pəncərəsi və digər detalları qeyd edin."
                    className="min-h-32 rounded-[1.3rem] border border-white/8 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-300/30"
                  />
                </label>
              </div>
            ) : null}

            {step === 4 ? (
              <div className="grid gap-4">
                <div className="rounded-[1.5rem] border border-white/10 bg-slate-950/55 p-5">
                  <h3 className="text-lg font-semibold text-white">Yekun baxış</h3>
                  <div className="mt-4 grid gap-3 text-sm text-slate-300 sm:grid-cols-2">
                    <Summary label="Yük" value={form.title || "Doldurulmayıb"} />
                    <Summary label="Növ" value={form.cargoType || "Doldurulmayıb"} />
                    <Summary label="Çəki / həcm" value={`${form.weight || "-"} / ${form.volume || "-"}`} />
                    <Summary label="Büdcə" value={form.budget || "Doldurulmayıb"} />
                    <Summary label="Yükləmə" value={form.pickupAddress || "Doldurulmayıb"} />
                    <Summary label="Çatdırılma" value={form.deliveryAddress || "Doldurulmayıb"} />
                  </div>
                </div>

                <div className="rounded-[1.5rem] border border-dashed border-cyan-300/20 bg-cyan-300/6 p-4 text-sm text-slate-300">
                  <div className="flex items-center gap-3 text-cyan-100">
                    <UploadCloud className="h-4 w-4" />
                    Şəkil və sənəd upload sahəsi növbəti iteration üçün nəzərdə tutulub.
                  </div>
                </div>
              </div>
            ) : null}
          </div>

          <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
            {submitted ? (
              <p className="rounded-full border border-emerald-300/25 bg-emerald-300/10 px-4 py-2 text-sm text-emerald-100">
                Elan mock axına əlavə olundu.
              </p>
            ) : (
              <p className="text-sm text-slate-400">Form stepper-i demo rejimində lokal state ilə işləyir.</p>
            )}

            <div className="flex gap-3">
              <button
                type="button"
                onClick={previousStep}
                className="rounded-full border border-white/10 bg-white/6 px-5 py-3 text-sm text-white transition hover:bg-white/10"
              >
                Geri
              </button>
              {step === stepTitles.length - 1 ? (
                <button
                  type="button"
                  onClick={handleSubmit}
                  className="rounded-full border border-cyan-300/30 bg-[linear-gradient(135deg,#22d3ee,#2563eb)] px-5 py-3 text-sm font-medium text-white shadow-[0_16px_38px_rgba(37,99,235,0.35)]"
                >
                  Elanı təsdiqlə
                </button>
              ) : (
                <button
                  type="button"
                  onClick={nextStep}
                  className="inline-flex items-center gap-2 rounded-full border border-cyan-300/30 bg-[linear-gradient(135deg,#22d3ee,#2563eb)] px-5 py-3 text-sm font-medium text-white shadow-[0_16px_38px_rgba(37,99,235,0.35)]"
                >
                  Elanı davam etdir
                  <ChevronRight className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

type FieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
};

function Field({ label, value, onChange, placeholder, type = "text" }: FieldProps) {
  return (
    <label className="grid gap-2 text-sm text-slate-300">
      {label}
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="h-14 rounded-[1.2rem] border border-white/8 bg-slate-950/60 px-4 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-300/30"
      />
    </label>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1.1rem] border border-white/8 bg-white/5 p-4">
      <p className="text-xs uppercase tracking-[0.22em] text-slate-500">{label}</p>
      <p className="mt-2 text-sm text-white">{value}</p>
    </div>
  );
}
