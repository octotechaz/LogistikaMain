"use client";

import { ArrowRight, Gauge, MapPinned, MessagesSquare, Package, Timer } from "lucide-react";
import { useMemo, useState } from "react";
import { OfferModal } from "@/components/landing/OfferModal";
import { type CargoListing, type OfferDraft, type PlatformRole } from "@/components/landing/mock-data";

type CargoListingsProps = {
  listings: CargoListing[];
  selectedRole: PlatformRole | null;
  onOfferSubmit: (listingId: string, draft: OfferDraft) => void;
};

export function CargoListings({ listings, selectedRole, onOfferSubmit }: CargoListingsProps) {
  const [activeFilter, setActiveFilter] = useState<"All" | "Aktiv" | "Yeni" | "Təcili">("All");
  const [selectedListing, setSelectedListing] = useState<CargoListing | null>(null);

  const filtered = useMemo(() => {
    if (activeFilter === "All") return listings;
    return listings.filter((listing) => listing.status === activeFilter);
  }, [activeFilter, listings]);

  return (
    <section id="canli-yukler" className="bg-[#020816] px-4 py-20 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div className="max-w-3xl">
            <p className="text-sm uppercase tracking-[0.35em] text-cyan-200/65">Carrier Surface</p>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight text-white sm:text-5xl">Canlı yük elanları</h2>
            <p className="mt-4 text-base leading-8 text-slate-300">
              Daşıyıcı tərəfi üçün card anatomy məsafə, yük növü, büdcə və təklif sayını dərhal önə çıxarır. Təklif
              modalı da eyni səthdən açılır.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            {["All", "Aktiv", "Yeni", "Təcili"].map((filter) => (
              <button
                key={filter}
                type="button"
                onClick={() => setActiveFilter(filter as "All" | "Aktiv" | "Yeni" | "Təcili")}
                className={`rounded-full border px-4 py-2 text-sm transition ${
                  activeFilter === filter
                    ? "border-cyan-300/30 bg-cyan-300/10 text-cyan-100"
                    : "border-white/10 bg-white/6 text-slate-300"
                }`}
              >
                {filter === "All" ? "Hamısı" : filter}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-4 xl:grid-cols-3">
          {filtered.map((listing) => (
            <article
              key={listing.id}
              className="group rounded-[1.8rem] border border-white/10 bg-white/7 p-5 shadow-[0_25px_60px_rgba(2,8,23,0.35)] backdrop-blur-2xl transition duration-300 hover:-translate-y-1 hover:border-cyan-300/20"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="inline-flex rounded-full border border-white/10 bg-white/8 px-3 py-1 text-xs text-cyan-100">
                    {listing.status}
                  </div>
                  <h3 className="mt-4 text-2xl font-semibold text-white">{listing.title}</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedListing(listing)}
                  className="rounded-full border border-cyan-300/25 bg-cyan-300/10 p-3 text-cyan-100 transition hover:bg-cyan-300/15"
                  aria-label={`${listing.title} üçün təklif ver`}
                >
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>

              <p className="mt-4 text-sm leading-7 text-slate-300">{listing.summary}</p>

              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                <CardMetric icon={MapPinned} label="Yükləmə" value={listing.pickupCity} />
                <CardMetric icon={MapPinned} label="Çatdırılma" value={listing.deliveryCity} />
                <CardMetric icon={Gauge} label="Məsafə" value={`${listing.distanceKm} km`} />
                <CardMetric icon={Package} label="Çəki" value={listing.weight} />
                <CardMetric icon={Timer} label="Tarix" value={listing.date} />
                <CardMetric icon={MessagesSquare} label="Təklif sayı" value={String(listing.offerCount)} />
              </div>

              <div className="mt-6 flex items-center justify-between rounded-[1.3rem] border border-white/8 bg-slate-950/55 px-4 py-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Büdcə</p>
                  <p className="mt-2 text-base font-medium text-white">{listing.budget}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedListing(listing)}
                  className="rounded-full border border-cyan-300/30 bg-[linear-gradient(135deg,#22d3ee,#2563eb)] px-5 py-3 text-sm font-medium text-white shadow-[0_12px_30px_rgba(37,99,235,0.35)]"
                >
                  Təklif ver
                </button>
              </div>
            </article>
          ))}
        </div>

        <div
          id="ustunlukler"
          className="mt-16 grid gap-4 rounded-[2rem] border border-white/10 bg-[linear-gradient(135deg,rgba(8,15,29,0.92),rgba(4,9,20,0.98))] p-6 lg:grid-cols-[1fr_1fr]"
        >
          <div className="rounded-[1.6rem] border border-white/8 bg-white/5 p-6">
            <p className="text-sm uppercase tracking-[0.25em] text-cyan-200/65">Yük sahibləri üçün üstünlüklər</p>
            <ul className="mt-5 grid gap-4 text-sm leading-7 text-slate-300">
              <li>Bir elanda bir neçə daşıyıcı təklifini paralel toplayın.</li>
              <li>Qrafik, büdcə və xüsusi tələbləri eyni form daxilində strukturlaşdırın.</li>
              <li>Qərarı sürətləndirmək üçün status, məsafə və təklif müqayisəsi hazır gəlir.</li>
            </ul>
          </div>
          <div className="rounded-[1.6rem] border border-white/8 bg-white/5 p-6">
            <p className="text-sm uppercase tracking-[0.25em] text-cyan-200/65">Daşıyıcılar üçün üstünlüklər</p>
            <ul className="mt-5 grid gap-4 text-sm leading-7 text-slate-300">
              <li>Canlı yük axınını status, marşrut və büdcə ilə sürətlə skan edin.</li>
              <li>Hər təklifdə maşın növü və müddəti birbaşa qeyd edin.</li>
              <li>Boş reysləri azaltmaq üçün uyğun yükləri premium card səthində seçin.</li>
            </ul>
          </div>
        </div>

        <OfferModal
          listing={selectedListing}
          onClose={() => setSelectedListing(null)}
          onSubmit={(draft) => {
            if (!selectedListing) return;
            onOfferSubmit(selectedListing.id, draft);
          }}
        />

        {selectedRole === "carrier" ? (
          <div className="mt-8 rounded-[1.6rem] border border-cyan-300/15 bg-cyan-300/8 px-5 py-4 text-sm text-cyan-100">
            Carrier axını aktivdir: CTA və modal davranışı təklif göndərməyə fokuslanıb.
          </div>
        ) : null}
      </div>
    </section>
  );
}

function CardMetric({
  icon: Icon,
  label,
  value
}: {
  icon: typeof MapPinned;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-[1.2rem] border border-white/8 bg-slate-950/55 p-4">
      <div className="flex items-center gap-2 text-xs uppercase tracking-[0.22em] text-slate-500">
        <Icon className="h-3.5 w-3.5 text-cyan-300" />
        {label}
      </div>
      <p className="mt-3 text-sm text-white">{value}</p>
    </div>
  );
}
