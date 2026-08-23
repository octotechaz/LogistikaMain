"use client";

import { X } from "lucide-react";
import { useEffect, useState } from "react";
import { defaultOfferDraft, type CargoListing, type OfferDraft } from "@/components/landing/mock-data";

type OfferModalProps = {
  listing: CargoListing | null;
  onClose: () => void;
  onSubmit: (draft: OfferDraft) => void;
};

export function OfferModal({ listing, onClose, onSubmit }: OfferModalProps) {
  const [draft, setDraft] = useState<OfferDraft>(defaultOfferDraft);

  useEffect(() => {
    setDraft(defaultOfferDraft);
  }, [listing]);

  if (!listing) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[rgba(2,8,23,0.75)] px-4 py-6 backdrop-blur-xl">
      <div className="w-full max-w-2xl rounded-[2rem] border border-white/10 bg-[linear-gradient(180deg,rgba(10,18,34,0.98),rgba(3,9,20,0.98))] p-6 shadow-[0_40px_120px_rgba(2,8,23,0.7)]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-cyan-200/65">Offer Modal</p>
            <h3 className="mt-3 text-2xl font-semibold text-white">Bu yükə təklif verin</h3>
            <p className="mt-2 text-sm leading-7 text-slate-300">
              {listing.title} · {listing.pickupCity} - {listing.deliveryCity}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-white/10 p-2 text-slate-300 transition hover:bg-white/8 hover:text-white"
            aria-label="Bagla"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <ModalField
            label="Təklif edilən qiymət"
            value={draft.price}
            onChange={(value) => setDraft((current) => ({ ...current, price: value }))}
            placeholder="₼ 1,240"
          />
          <ModalField
            label="Çatdırılma müddəti"
            value={draft.duration}
            onChange={(value) => setDraft((current) => ({ ...current, duration: value }))}
            placeholder="1 gün 8 saat"
          />
          <ModalField
            label="Maşın növü"
            value={draft.vehicleType}
            onChange={(value) => setDraft((current) => ({ ...current, vehicleType: value }))}
            placeholder="Tentli TIR / soyuduculu maşın"
          />
          <ModalField
            label="Əlaqə məlumatı"
            value={draft.contact}
            onChange={(value) => setDraft((current) => ({ ...current, contact: value }))}
            placeholder="+994 50 555 55 55"
          />
          <label className="sm:col-span-2">
            <span className="mb-2 block text-sm text-slate-300">Qeyd</span>
            <textarea
              value={draft.note}
              onChange={(event) => setDraft((current) => ({ ...current, note: event.target.value }))}
              placeholder="Reys uyğunluğu, boş dönüş və ya əlavə xidmətləri qeyd edin."
              className="min-h-32 w-full rounded-[1.2rem] border border-white/8 bg-slate-950/65 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-300/30"
            />
          </label>
        </div>

        <div className="mt-6 flex flex-wrap justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-white/10 bg-white/6 px-5 py-3 text-sm text-white"
          >
            Bağla
          </button>
          <button
            type="button"
            onClick={() => {
              onSubmit(draft);
              onClose();
            }}
            className="rounded-full border border-cyan-300/30 bg-[linear-gradient(135deg,#22d3ee,#2563eb)] px-5 py-3 text-sm font-medium text-white shadow-[0_16px_38px_rgba(37,99,235,0.35)]"
          >
            Təklifi göndər
          </button>
        </div>
      </div>
    </div>
  );
}

function ModalField({
  label,
  value,
  onChange,
  placeholder
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <label>
      <span className="mb-2 block text-sm text-slate-300">{label}</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="h-14 w-full rounded-[1.2rem] border border-white/8 bg-slate-950/65 px-4 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-300/30"
      />
    </label>
  );
}
