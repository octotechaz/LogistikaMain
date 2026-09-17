"use client";

import { useMemo, useRef, useState } from "react";
import { CargoListings } from "@/components/landing/CargoListings";
import { CargoPostForm } from "@/components/landing/CargoPostForm";
import { FAQSection } from "@/components/landing/FAQSection";
import { Footer } from "@/components/landing/Footer";
import { HeroSection } from "@/components/landing/HeroSection";
import { IntroLoader } from "@/components/landing/IntroLoader";
import { LandingNavbar } from "@/components/landing/LandingNavbar";
import { RoleSelection } from "@/components/landing/RoleSelection";
import { ScrollVideoSection } from "@/components/landing/ScrollVideoSection";
import { StatsSection } from "@/components/landing/StatsSection";
import {
  listingSeed,
  ownerBenefits,
  carrierBenefits,
  type CargoFormState,
  type CargoListing,
  type OfferDraft,
  type PlatformRole
} from "@/components/landing/mock-data";

export function PremiumMarketplaceExperience() {
  const [showIntro, setShowIntro] = useState(true);
  const [selectedRole, setSelectedRole] = useState<PlatformRole | null>(null);
  const [showRoleSelection, setShowRoleSelection] = useState(false);
  const [listings, setListings] = useState<CargoListing[]>(listingSeed);
  const listingsRef = useRef<HTMLElement | null>(null);
  const formRef = useRef<HTMLElement | null>(null);

  const benefits = useMemo(
    () => ({
      owner: ownerBenefits,
      carrier: carrierBenefits
    }),
    []
  );

  function scrollToElement(element: HTMLElement | null) {
    if (!element) return;
    element.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function handlePrimaryAction() {
    scrollToElement(formRef.current);
  }

  function handleSecondaryAction() {
    scrollToElement(listingsRef.current);
  }

  function handleRoleSelection(role: PlatformRole) {
    setSelectedRole(role);
    setShowRoleSelection(false);
    if (role === "owner") {
      window.setTimeout(() => scrollToElement(formRef.current), 180);
    } else {
      window.setTimeout(() => scrollToElement(listingsRef.current), 180);
    }
  }

  function addCargoListing(payload: CargoFormState) {
    const [pickupCity] = payload.pickupAddress.split(",");
    const [deliveryCity] = payload.deliveryAddress.split(",");
    setListings((current) => [
      {
        id: `load-${Date.now()}`,
        title: payload.title || "Yeni yük elanı",
        pickupCity: pickupCity?.trim() || "Bakı",
        deliveryCity: deliveryCity?.trim() || "Gəncə",
        distanceKm: 290,
        weight: payload.weight || "Məlum deyil",
        cargoType: payload.cargoType || "Qarışıq yük",
        budget: payload.budget || "Sorğu əsasında",
        date: payload.pickupDate || "Planlanır",
        offerCount: 0,
        status: "Yeni",
        summary: payload.notes || "Yeni elan premium form axınından yaradıldı."
      },
      ...current
    ]);
  }

  function submitOffer(listingId: string, draft: OfferDraft) {
    setListings((current) =>
      current.map((listing) =>
        listing.id === listingId
          ? {
              ...listing,
              offerCount: listing.offerCount + 1,
              summary: draft.note || listing.summary
            }
          : listing
      )
    );
  }

  return (
    <div className="min-h-screen bg-[#020816] text-white">
      {showIntro ? (
        <IntroLoader
          onComplete={() => {
            setShowIntro(false);
            setShowRoleSelection(true);
          }}
        />
      ) : null}

      {showRoleSelection ? <RoleSelection onSelect={handleRoleSelection} /> : null}

      <LandingNavbar
        onPrimaryAction={() => {
          if (!selectedRole) {
            setShowRoleSelection(true);
            return;
          }
          handlePrimaryAction();
        }}
      />

      <main>
        <HeroSection
          selectedRole={selectedRole}
          onSelectRole={handleRoleSelection}
          onPrimaryAction={() => {
            if (!selectedRole) {
              setShowRoleSelection(true);
              return;
            }
            handlePrimaryAction();
          }}
          onSecondaryAction={handleSecondaryAction}
        />

        <ScrollVideoSection />

        <section ref={formRef} className="contents">
          <CargoPostForm selectedRole={selectedRole} onSubmit={addCargoListing} />
        </section>

        <section ref={listingsRef} className="contents">
          <CargoListings listings={listings} selectedRole={selectedRole} onOfferSubmit={submitOffer} />
        </section>

        <section className="bg-[#020816] px-4 py-6 sm:px-6 lg:px-8">
          <div className="mx-auto grid max-w-7xl gap-4 lg:grid-cols-2">
            <BenefitPanel title="Yük sahibləri üçün üstünlüklər" items={benefits.owner} />
            <BenefitPanel title="Sürücülər və daşıyıcılar üçün üstünlüklər" items={benefits.carrier} />
          </div>
        </section>

        <StatsSection />
        <FAQSection />
      </main>

      <Footer />
    </div>
  );
}

function BenefitPanel({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-[1.8rem] border border-white/10 bg-white/6 p-6">
      <h3 className="text-xl font-semibold text-white">{title}</h3>
      <div className="mt-4 grid gap-4">
        {items.map((item) => (
          <p key={item} className="rounded-[1.2rem] border border-white/8 bg-slate-950/55 p-4 text-sm leading-7 text-slate-300">
            {item}
          </p>
        ))}
      </div>
    </div>
  );
}
