"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ClipboardList,
  Clock3,
  Plus,
  ShieldCheck,
} from "lucide-react";
import { CargoMeasurementFields } from "@/components/CargoMeasurementFields";
import {
  DashboardShell,
  EmptyAccessState,
  MetricCard
} from "@/components/classifieds/shared";
import { OwnerListingsTable } from "@/components/classifieds/OwnerListingsTable";
import { ImageUploader } from "@/components/ImageUploader";
import { Button, ButtonLink } from "@/components/ui/Button";
import { useClassifieds } from "@/components/providers/ClassifiedsProvider";
import { cn } from "@/lib/utils";
import {
  formatVolume,
  normalizeQuantityValue,
  validateCargoMeasurements
} from "@/lib/cargo-measurements";
import {
  classifiedsCargoTypes,
  classifiedsCities,
  classifiedsVehicleTypes
} from "@/lib/classifieds-meta";
import {
  derivePickupDeadlineFromLegacyDuration,
  getBakuTodayDateString,
  getMaxPickupDeadlineDateString,
  normalizePickupDeadlineDateValue,
  pickupDeadlineRequiredMessage,
  validatePickupDeadlineDateValue
} from "@/lib/pickup-deadline";
import {
  getListingImageLimitHint,
  listingImageMaxFileSizeBytes,
  listingImageMaxFiles,
  listingImageMaxFilesMessage
} from "@/lib/listing-images";
import { effectiveStatus } from "@/lib/status/classifieds";
import { mapApiCargoPostToListing } from "@/lib/cargo-post-map";
import { normalizeInternationalPhone } from "@/lib/phone-validation";
import type { CargoListing, CargoListingDraft } from "@/types/classifieds";
import { PhoneField } from "@/components/PhoneField";
import { ClockTimePicker } from "@/components/classifieds/ClockTimePicker";
import { AddressAutocomplete } from "@/components/classifieds/AddressAutocomplete";

type SessionUser = {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  role: string;
};

type PublicCategory = {
  id: string;
  label: string;
  iconKey: string;
  iconTone: string;
  isActive: boolean;
};

function stringValue(value: unknown) {
  return value === null || value === undefined ? "" : String(value);
}

export function OwnerDashboardPageClient({ sessionUser }: { sessionUser: SessionUser }) {
  const { ready } = useClassifieds();
  const [listings, setListings] = useState<CargoListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const loadListings = async () => {
    setActionError(null);
    const response = await fetch("/api/cargo-posts");
    const data = await response.json().catch(() => null);

    if (!response.ok || !data?.ok || !Array.isArray(data.data)) {
      throw new Error(data?.message || "Elanlar yüklənmədi.");
    }

    setListings(
      data.data.map((item: Record<string, unknown>) =>
        mapApiCargoPostToListing(item, sessionUser.phone)
      )
    );
  };

  useEffect(() => {
    if (!ready) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    loadListings()
      .catch((error) => {
        if (!cancelled) {
          setActionError(error instanceof Error ? error.message : "Elanlar yüklənmədi.");
          setListings([]);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, sessionUser.phone]);

  async function handleSoftDelete(id: string) {
    setBusyId(id);
    setActionError(null);
    try {
      const response = await fetch(`/api/cargo-posts/${id}`, { method: "DELETE" });
      const data = await response.json().catch(() => null);
      if (!response.ok || !data?.ok) {
        throw new Error(data?.message || "Elan silinmədi.");
      }
      await loadListings();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Elan silinmədi.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleRestore(id: string) {
    setBusyId(id);
    setActionError(null);
    try {
      const response = await fetch(`/api/cargo-posts/${id}/restore`, { method: "POST" });
      const data = await response.json().catch(() => null);
      if (!response.ok || !data?.ok) {
        throw new Error(data?.message || "Elan bərpa edilmədi.");
      }
      await loadListings();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Elan bərpa edilmədi.");
    } finally {
      setBusyId(null);
    }
  }

  if (!ready || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
      </div>
    );
  }

  const ownerListings = listings
    .filter((listing) => effectiveStatus(listing) !== "DELETED")
    .sort((left, right) => +new Date(right.createdAt) - +new Date(left.createdAt));

  const activeCount = ownerListings.filter((item) => effectiveStatus(item) === "ACTIVE").length;
  const pendingCount = ownerListings.filter((item) => effectiveStatus(item) === "PENDING").length;
  const expiredCount = ownerListings.filter((item) => effectiveStatus(item) === "EXPIRED").length;
  const inactiveCount = ownerListings.filter((item) =>
    ["INACTIVE", "REJECTED", "DELETED"].includes(effectiveStatus(item))
  ).length;

  return (
    <DashboardShell
      section="owner"
      title="Mənim elanlarım"
      description="Yeni elanlar admin təsdiqindən sonra dərc olunur. Buradan elanlarınızı izləyə və redaktə edə bilərsiniz."
      sessionUser={sessionUser}
      action={
        <ButtonLink href="/cargo-owner/cargo-posts/new">
          <Plus className="h-4 w-4" />
          Yeni elan
        </ButtonLink>
      }
    >
      {actionError ? (
        <div className="mb-4 rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {actionError}
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-4">
        <MetricCard
          label="Aktiv elanlar"
          value={String(activeCount)}
          icon={<ShieldCheck className="h-5 w-5" />}
        />
        <MetricCard
          label="Təsdiq gözləyir"
          value={String(pendingCount)}
          icon={<Clock3 className="h-5 w-5" />}
        />
        <MetricCard
          label="Vaxtı keçən"
          value={String(expiredCount)}
          icon={<Clock3 className="h-5 w-5" />}
        />
        <MetricCard
          label="Deaktiv / rədd"
          value={String(inactiveCount)}
          icon={<ClipboardList className="h-5 w-5" />}
        />
      </div>

      {ownerListings.length ? (
        <OwnerListingsTable
          data={ownerListings}
          onRestore={handleRestore}
          onSoftDelete={handleSoftDelete}
          busyId={busyId}
        />
      ) : (
        <EmptyAccessState
          title="Hələ elan yoxdur"
          description="İlk yük elanınızı yaradın; daşıyıcılar elanı görüb sizə müraciət edə bilsin."
          actionHref="/cargo-owner/cargo-posts/new"
          actionLabel="İlk elanımı yarat"
        />
      )}
    </DashboardShell>
  );
}

export function OwnerLoadFormPageClient({ sessionUser }: { sessionUser: SessionUser }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { ready, listings, saveListing } = useClassifieds();
  const [error, setError] = useState<string | null>(null);
  const [categories, setCategories] = useState<PublicCategory[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("");
  const [fieldErrors, setFieldErrors] = useState<
    Partial<
      Record<"pickupAddress" | "deliveryAddress" | "pickupDeadlineDate" | "contactPhone", string>
    >
  >({});
  const [measurementErrors, setMeasurementErrors] = useState<
    Partial<Record<"quantity" | "length" | "width" | "height", string>>
  >({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [remoteListing, setRemoteListing] = useState<CargoListing | null>(null);
  const [remoteLoading, setRemoteLoading] = useState(false);
  const [contactPhone, setContactPhone] = useState(sessionUser.phone || "");
  const listingId = searchParams.get("id");
  const cachedListing =
    listingId
      ? listings.find(
          (listing) => listing.id === listingId && listing.ownerId === sessionUser.id
        )
      : undefined;
  const editing = cachedListing || remoteListing || undefined;

  useEffect(() => {
    if (!listingId || cachedListing) {
      setRemoteListing(null);
      setRemoteLoading(false);
      return;
    }

    let cancelled = false;
    setRemoteLoading(true);

    fetch(`/api/cargo-posts`)
      .then((res) => res.json())
      .then((data) => {
        if (cancelled || !data?.ok || !Array.isArray(data.data)) {
          return;
        }

        const item = data.data.find((row: Record<string, unknown>) => row.id === listingId);
        if (!item) {
          return;
        }

        setRemoteListing(mapApiCargoPostToListing(item, sessionUser.phone));
      })
      .catch(console.error)
      .finally(() => {
        if (!cancelled) {
          setRemoteLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [cachedListing, listingId, sessionUser.phone]);

  useEffect(() => {
    setContactPhone(editing?.ownerPhone || sessionUser.phone || "");
  }, [editing?.ownerPhone, sessionUser.phone]);

  useEffect(() => {
    fetch("/api/public/categories", { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data?.data)) setCategories(data.data);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (editing) {
      setSelectedCategoryId((editing as unknown as { categoryId?: string }).categoryId || "");
    }
  }, [editing?.id]);

  const initialPhotoUrls = useMemo(
    () =>
      editing?.photos?.length
        ? editing.photos
        : editing?.photo
          ? [editing.photo]
          : [],
    [editing?.photo, editing?.photos]
  );
  const [photosState, setPhotosState] = useState<string[]>(initialPhotoUrls);
  const editingMeasurementDefaults = useMemo(
    () => ({
      quantity: normalizeQuantityValue(editing?.quantity),
      length: stringValue(editing?.length),
      width: stringValue(editing?.width),
      height: stringValue(editing?.height)
    }),
    [editing?.height, editing?.length, editing?.quantity, editing?.width]
  );
  const [measurements, setMeasurements] = useState({
    quantity: editingMeasurementDefaults.quantity,
    length: editingMeasurementDefaults.length,
    width: editingMeasurementDefaults.width,
    height: editingMeasurementDefaults.height
  });
  const measurementValidation = useMemo(
    () => validateCargoMeasurements(measurements),
    [measurements]
  );
  const volumeValue =
    measurementValidation.volume !== null
      ? formatVolume(measurementValidation.volume)
      : "";

  useEffect(() => {
    setMeasurements(editingMeasurementDefaults);
    setMeasurementErrors({});
    setFieldErrors({});
    setError(null);
    setPhotosState(initialPhotoUrls);
  }, [editingMeasurementDefaults, initialPhotoUrls]);

  function updateMeasurement(
    field: keyof typeof measurements,
    value: string
  ) {
    setMeasurements((current) => ({
      ...current,
      [field]: value
    }));
    setMeasurementErrors((current) => ({
      ...current,
      [field]: undefined
    }));
    setError(null);
  }

  function clearFieldError(
    field: "pickupAddress" | "deliveryAddress" | "pickupDeadlineDate"
  ) {
    setFieldErrors((current) => ({
      ...current,
      [field]: undefined
    }));
    setError(null);
  }

  function showFormError(message: string) {
    setError(message);
    queueMicrotask(() => {
      document.getElementById("owner-load-form-error")?.scrollIntoView({
        behavior: "smooth",
        block: "center"
      });
    });
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    event.stopPropagation();

    if (isSubmitting) {
      return;
    }

    setFieldErrors({});
    setError(null);

    const nextMeasurementValidation = validateCargoMeasurements(measurements);
    const formData = new FormData(event.currentTarget);
    const pickupAddress = String(formData.get("pickupAddress") || "");
    const deliveryAddress = String(formData.get("deliveryAddress") || "");
    const pickupDeadlineDate = String(formData.get("pickupDeadlineDate") || "");
    const nextFieldErrors: Partial<
      Record<"pickupAddress" | "deliveryAddress" | "pickupDeadlineDate", string>
    > = {};

    if (pickupAddress.trim() === "") {
      nextFieldErrors.pickupAddress = "Yükləmə ünvanını daxil edin.";
    }

    if (deliveryAddress.trim() === "") {
      nextFieldErrors.deliveryAddress = "Boşaltma ünvanını daxil edin.";
    }

    const pickupDeadlineError = validatePickupDeadlineDateValue(pickupDeadlineDate);

    if (pickupDeadlineError) {
      nextFieldErrors.pickupDeadlineDate = pickupDeadlineError;
    }

    if (Object.keys(nextFieldErrors).length > 0) {
      setFieldErrors(nextFieldErrors);
      showFormError(Object.values(nextFieldErrors)[0] ?? pickupDeadlineRequiredMessage);
      return;
    }

    if (!nextMeasurementValidation.canSubmit) {
      setMeasurementErrors({
        quantity: nextMeasurementValidation.quantityError,
        length: nextMeasurementValidation.lengthError,
        width: nextMeasurementValidation.widthError,
        height: nextMeasurementValidation.heightError
      });
      showFormError(
        nextMeasurementValidation.formError ||
          nextMeasurementValidation.quantityError ||
          nextMeasurementValidation.lengthError ||
          nextMeasurementValidation.widthError ||
          nextMeasurementValidation.heightError ||
          "Məlumatları yenidən yoxlayın."
      );
      return;
    }

    const photos = photosState.filter((url) => typeof url === "string" && url.startsWith("/uploads/"));

    if (photosState.length > 0 && photos.length === 0) {
      showFormError("Şəkillər düzgün yüklənməyib. Yenidən şəkil seçin.");
      return;
    }

    if (photos.length > listingImageMaxFiles) {
      showFormError(listingImageMaxFilesMessage);
      return;
    }

    const title = String(formData.get("title") || "").trim();
    const cargoType = String(formData.get("cargoType") || "").trim();
    const description = String(formData.get("description") || "").trim();
    const weight = String(formData.get("weight") || "").trim();
    const pickupCity = String(formData.get("pickupCity") || "").trim();
    const deliveryCity = String(formData.get("deliveryCity") || "").trim();
    const vehicleType = String(formData.get("vehicleType") || "").trim();
    const ownerPhoneRaw = (contactPhone || String(formData.get("ownerPhone") || sessionUser.phone)).trim();
    const ownerPhone = normalizeInternationalPhone(ownerPhoneRaw);
    const normalizedDeadline = normalizePickupDeadlineDateValue(pickupDeadlineDate);

    if (!ownerPhone) {
      setFieldErrors((current) => ({
        ...current,
        contactPhone: "Telefon nömrəsi düzgün formatda deyil.",
      }));
      showFormError("Əlaqə telefonu düzgün formatda deyil.");
      return;
    }

    setFieldErrors((current) => ({ ...current, contactPhone: undefined }));

    if (!title) {
      showFormError("Elan başlığı mütləqdir.");
      return;
    }
    if (!cargoType) {
      showFormError("Yük növü mütləqdir.");
      return;
    }
    if (description.length < 10) {
      showFormError("Təsvir ən azı 10 simvol olmalıdır.");
      return;
    }
    if (!weight) {
      showFormError("Çəki mütləqdir.");
      return;
    }
    if (!pickupCity) {
      showFormError("Yükləmə şəhəri mütləqdir.");
      return;
    }
    if (!deliveryCity) {
      showFormError("Boşaltma şəhəri mütləqdir.");
      return;
    }

    const resolvedVehicleType = vehicleType.trim() || "Fərq etməz";

    const draft: CargoListingDraft = {
      title,
      cargoType,
      description,
      weight,
      pickupCity,
      pickupAddress,
      deliveryCity,
      deliveryAddress,
      ownerPhone,
      photo: photos[0] || "",
      photos,
      volume: volumeValue,
      length: measurements.length,
      width: measurements.width,
      height: measurements.height,
      quantity: nextMeasurementValidation.quantityValid
        ? String(nextMeasurementValidation.quantity)
        : "",
      pickupDate: String(formData.get("pickupDate") || ""),
      pickupDeadlineDate: normalizedDeadline,
      pickupTime: String(formData.get("pickupTime") || ""),
      vehicleType: resolvedVehicleType,
      price: String(formData.get("price") || ""),
      note: String(formData.get("note") || ""),
      needsLoadingHelp: String(formData.get("needsLoadingHelp") || "Xeyr"),
      needsUnloadingHelp: String(formData.get("needsUnloadingHelp") || "Xeyr"),
      requiresInvoice: String(formData.get("requiresInvoice") || "Xeyr"),
      roundTrip: String(formData.get("roundTrip") || "Xeyr")
    };

    const apiPayload = {
      cargoName: draft.title,
      cargoType: draft.cargoType,
      description: draft.description,
      weight: draft.weight,
      volume: draft.volume || undefined,
      length: draft.length || undefined,
      width: draft.width || undefined,
      height: draft.height || undefined,
      quantity: draft.quantity || undefined,
      pickupAddress: draft.pickupAddress,
      deliveryAddress: draft.deliveryAddress,
      pickupCity: draft.pickupCity,
      deliveryCity: draft.deliveryCity,
      pickupDate: draft.pickupDate || undefined,
      pickupDeadlineDate: draft.pickupDeadlineDate,
      requiredVehicleType: resolvedVehicleType,
      proposedPrice: draft.price || undefined,
      priceNegotiable: false,
      contactPhone: draft.ownerPhone,
      needsLoadingHelp: draft.needsLoadingHelp,
      needsUnloadingHelp: draft.needsUnloadingHelp,
      requiresInvoice: draft.requiresInvoice,
      roundTrip: draft.roundTrip,
      legacyPickupTime: draft.pickupTime || undefined,
      legacyNote: draft.note || undefined,
      categoryId: selectedCategoryId || undefined,
      imageUrls: photos
    };

    setIsSubmitting(true);

    try {
      const isEdit = typeof listingId === "string" && listingId.length > 0 && !listingId.startsWith("load-");
      const response = await fetch(
        isEdit ? `/api/cargo-posts/${listingId}` : "/api/cargo-posts",
        {
          method: isEdit ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(apiPayload)
        }
      );

      let result: {
        ok?: boolean;
        message?: string;
        details?: Array<{ field?: string; message: string }>;
      } | null = null;

      try {
        result = await response.json();
      } catch {
        result = null;
      }

      if (!response.ok || !result?.ok) {
        const detailMessage = result?.details?.map((item) => item.message).filter(Boolean).join(" ");
        if (result?.details?.length) {
          const next: Partial<Record<"pickupAddress" | "deliveryAddress" | "pickupDeadlineDate" | "contactPhone", string>> = {};
          for (const detail of result.details) {
            if (
              detail.field === "pickupAddress" ||
              detail.field === "deliveryAddress" ||
              detail.field === "pickupDeadlineDate" ||
              detail.field === "contactPhone"
            ) {
              next[detail.field] = detail.message;
            }
          }
          setFieldErrors(next);
        }
        showFormError(detailMessage || result?.message || "Elan göndərilmədi.");
        return;
      }

      try {
        const ownerContext = {
          id: sessionUser.id,
          name: `${sessionUser.firstName} ${sessionUser.lastName}`.trim(),
          phone: sessionUser.phone
        };

        // Keep local classifieds cache in sync for admin/demo views.
        // Never block a successful API create if localStorage sync fails.
        saveListing(draft, ownerContext, editing?.id);
      } catch {
        // ignore local cache errors
      }

      router.push("/cargo-owner/dashboard");
      router.refresh();
    } catch {
      showFormError("Elan göndərilmədi. Yenidən cəhd edin.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!ready || (listingId && remoteLoading && !editing)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <DashboardShell
      section="owner"
      title={editing ? "Elanı redaktə et" : "Yeni yük elanı"}
      description="Formu göndərdikdən sonra elan admin yoxlamasına düşür; təsdiqlənəndən sonra ictimai katalogda görünür."
      sessionUser={sessionUser}
    >
      <div className="overflow-hidden rounded-[16px] border border-slate-200/60 bg-white shadow-[0_2px_12px_rgba(0,0,0,0.04)]">
      <form
        key={editing?.id || "new-listing"}
        id="owner-load-form"
        onSubmit={onSubmit}
        noValidate
      >
        <div className="card-body p-6 lg:p-8 space-y-6">
          {error ? (
            <div
              id="owner-load-form-error"
              className="rounded-lg bg-red-50 p-4 border border-red-100 flex items-center gap-3"
            >
              <i className="ri-error-warning-fill text-red-500 text-xl"></i>
              <span className="text-sm font-medium text-red-700">{error}</span>
            </div>
          ) : null}

          {/* Section: Əsas Məlumatlar */}
          <div>
            <h4 className="text-[16px] font-semibold text-slate-800 mb-4 pb-2 border-b border-slate-100 flex items-center gap-2">
              Əsas məlumatlar
            </h4>
            <div className="grid gap-x-6 gap-y-5 md:grid-cols-2">
              <div className="form-group mb-0">
                <label className="text-sm font-semibold text-slate-700 mb-1.5 block">
                  Elan başlığı <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <i className="ri-text text-slate-400"></i>
                  </div>
                  <input
                    name="title"
                    className="form-control w-full rounded-lg border-slate-300 shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-200 focus:ring-opacity-50 pl-10 text-[15px] py-2.5 h-auto transition-shadow"
                    placeholder="Məs: Soyuduculu ərzaq yükü"
                    defaultValue={editing?.title}
                    required
                  />
                </div>
              </div>

              <div className="form-group mb-0">
                <label className="text-sm font-semibold text-slate-700 mb-1.5 block">
                  Yük növü <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <i className="ri-box-3-line text-slate-400"></i>
                  </div>
                  <select
                    name="cargoType"
                    className="form-select w-full rounded-lg border-slate-300 shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-200 focus:ring-opacity-50 pl-10 text-[15px] py-2.5 h-auto transition-shadow appearance-none"
                    defaultValue={editing?.cargoType || ""}
                    required
                  >
                    <option value="" disabled hidden>Növü seçin</option>
                    {classifiedsCargoTypes.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                    <i className="ri-arrow-down-s-line text-slate-400"></i>
                  </div>
                </div>
              </div>

              {categories.length > 0 && (
                <div className="form-group mb-0">
                  <label className="text-sm font-semibold text-slate-700 mb-1.5 block">
                    Kateqoriya
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <i className="ri-price-tag-3-line text-slate-400"></i>
                    </div>
                    <select
                      name="categoryId"
                      value={selectedCategoryId}
                      onChange={(e) => setSelectedCategoryId(e.target.value)}
                      className="form-select w-full rounded-lg border-slate-300 shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-200 focus:ring-opacity-50 pl-10 text-[15px] py-2.5 h-auto transition-shadow appearance-none"
                    >
                      <option value="">Kateqoriya seçin (isteğe bağlı)</option>
                      {categories.map((cat) => (
                        <option key={cat.id} value={cat.id}>{cat.label}</option>
                      ))}
                    </select>
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                      <i className="ri-arrow-down-s-line text-slate-400"></i>
                    </div>
                  </div>
                </div>
              )}

              <div className="form-group mb-0 md:col-span-2">
                <label className="text-sm font-semibold text-slate-700 mb-1.5 block">
                  Təsvir <span className="text-red-500">*</span>
                </label>
                <textarea
                  name="description"
                  className="form-control w-full rounded-lg border-slate-300 shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-200 focus:ring-opacity-50 text-[15px] py-3 transition-shadow min-h-[120px]"
                  placeholder="Yükünüz haqqında ətraflı məlumat verin..."
                  defaultValue={editing?.description}
                  required
                />
              </div>
            </div>
          </div>

          {/* Section: Ölçü və Çəki */}
          <div className="pt-2">
            <h4 className="text-[16px] font-semibold text-slate-800 mb-4 pb-2 border-b border-slate-100 flex items-center gap-2">
              Çəki və Həcm
            </h4>

            <div className="mb-5 max-w-md">
              <label className="text-sm font-semibold text-slate-700 mb-1.5 block">
                Çəki (kq) <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <i className="ri-weight-line text-slate-400"></i>
                </div>
                <input
                  name="weight"
                  type="number"
                  min="1"
                  step="1"
                  placeholder="Məs: 2000"
                  className="form-control w-full rounded-lg border-slate-300 shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-200 focus:ring-opacity-50 pl-10 pr-12 text-[15px] py-2.5 h-auto transition-shadow"
                  defaultValue={editing?.weight}
                  required
                />
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                  <span className="text-slate-400 text-sm font-medium">kq</span>
                </div>
              </div>
            </div>

            <div className="">
              <CargoMeasurementFields
                values={{
                  ...measurements,
                  volume: volumeValue
                }}
                errors={measurementErrors}
                onChange={updateMeasurement}
              />
            </div>
          </div>

          {/* Section: Marşrut və Tarix */}
          <div className="pt-2">
            <h4 className="text-[16px] font-semibold text-slate-800 mb-4 pb-2 border-b border-slate-100 flex items-center gap-2">
              Marşrut və Tarix
            </h4>

            <div className="grid gap-x-6 gap-y-5 md:grid-cols-2 mb-5">
              {/* Pickup Info */}
              <div className="space-y-4">
                <h5 className="font-semibold text-slate-800 text-[15px] mb-1">
                  Yükləmə yeri
                </h5>

                <div className="form-group mb-0">
                  <label className="text-[13px] font-semibold text-slate-600 mb-1.5 block">Şəhər <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <select
                      name="pickupCity"
                      className="form-select w-full rounded-lg border-slate-300 shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-200 focus:ring-opacity-50 text-[14px] py-2.5 h-auto transition-shadow appearance-none"
                      defaultValue={editing?.pickupCity || ""}
                      required
                    >
                      <option value="" disabled hidden>Şəhər seçin</option>
                      {classifiedsCities.map((item) => (
                        <option key={item} value={item}>{item}</option>
                      ))}
                    </select>
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                      <i className="ri-arrow-down-s-line text-slate-400"></i>
                    </div>
                  </div>
                </div>

                <AddressAutocomplete
                  name="pickupAddress"
                  label={<>Ünvan <span className="text-red-500">*</span></>}
                  defaultValue={editing?.pickupAddress}
                  required
                  error={fieldErrors.pickupAddress}
                  onFieldChange={() => clearFieldError("pickupAddress")}
                />
              </div>

              {/* Delivery Info */}
              <div className="space-y-4">
                <h5 className="font-semibold text-slate-800 text-[15px] mb-1">
                  Boşaltma yeri
                </h5>

                <div className="form-group mb-0">
                  <label className="text-[13px] font-semibold text-slate-600 mb-1.5 block">Şəhər <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <select
                      name="deliveryCity"
                      className="form-select w-full rounded-lg border-slate-300 shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-200 focus:ring-opacity-50 text-[14px] py-2.5 h-auto transition-shadow appearance-none"
                      defaultValue={editing?.deliveryCity || ""}
                      required
                    >
                      <option value="" disabled hidden>Şəhər seçin</option>
                      {classifiedsCities.map((item) => (
                        <option key={item} value={item}>{item}</option>
                      ))}
                    </select>
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                      <i className="ri-arrow-down-s-line text-slate-400"></i>
                    </div>
                  </div>
                </div>

                <AddressAutocomplete
                  name="deliveryAddress"
                  label={<>Ünvan <span className="text-red-500">*</span></>}
                  defaultValue={editing?.deliveryAddress}
                  required
                  error={fieldErrors.deliveryAddress}
                  onFieldChange={() => clearFieldError("deliveryAddress")}
                />
              </div>
            </div>

            <div className="grid gap-x-6 gap-y-5 md:grid-cols-3">
              <div className="form-group mb-0">
                <label className="text-sm font-semibold text-slate-700 mb-1.5 block">
                  Yükləmə tarixi
                </label>
                <div className="relative">
                  <input
                    name="pickupDate"
                    type="date"
                    className="form-control w-full rounded-lg border-slate-300 shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-200 focus:ring-opacity-50 text-[15px] py-2.5 h-auto transition-shadow"
                    defaultValue={editing?.pickupDate || ""}
                  />
                </div>
              </div>

              <div className="form-group mb-0">
                <label className="text-sm font-semibold text-slate-700 mb-1.5 block">
                  Ən gec götürülmə tarixi <span className="text-red-500">*</span>
                </label>
                <input
                  name="pickupDeadlineDate"
                  type="date"
                  className={cn(
                    "form-control w-full rounded-lg shadow-sm focus:ring focus:ring-opacity-50 text-[15px] py-2.5 h-auto transition-shadow",
                    fieldErrors.pickupDeadlineDate ? "border-red-300 focus:border-red-500 focus:ring-red-200" : "border-slate-300 focus:border-blue-500 focus:ring-blue-200"
                  )}
                  defaultValue={
                    editing?.pickupDeadlineDate ||
                    (editing?.durationDays
                      ? derivePickupDeadlineFromLegacyDuration(
                          editing.createdAt,
                          editing.durationDays
                        )
                      : "")
                  }
                  min={getBakuTodayDateString()}
                  max={getMaxPickupDeadlineDateString()}
                  required
                  onChange={() => clearFieldError("pickupDeadlineDate")}
                />
                <span className="text-[11px] font-medium text-slate-500 mt-1.5 block flex items-center gap-1">
                  <i className="ri-calendar-event-line"></i> Maksimum 30 gün
                </span>
                {fieldErrors.pickupDeadlineDate && (
                  <span className="text-[12px] font-medium text-red-600 mt-1 block flex items-center gap-1">
                    <i className="ri-error-warning-line"></i> {fieldErrors.pickupDeadlineDate}
                  </span>
                )}
              </div>

              <ClockTimePicker
                name="pickupTime"
                label="Yükləmə saatı"
                defaultValue={editing?.pickupTime || ""}
              />
            </div>
          </div>

          {/* Section: Əlavə Məlumatlar */}
          <div className="pt-2">
            <h4 className="text-[16px] font-semibold text-slate-800 mb-4 pb-2 border-b border-slate-100 flex items-center gap-2">
              Əlavə detallar
            </h4>

            <div className="grid gap-x-6 gap-y-5 md:grid-cols-2 lg:grid-cols-3">
              <div className="form-group mb-0">
                <label className="text-sm font-semibold text-slate-700 mb-1.5 block">
                  Tələb olunan nəqliyyat növü
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <i className="ri-truck-line text-slate-400"></i>
                  </div>
                  <select
                    name="vehicleType"
                    className="form-select w-full rounded-lg border-slate-300 shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-200 focus:ring-opacity-50 pl-10 text-[15px] py-2.5 h-auto transition-shadow appearance-none"
                    defaultValue={editing?.vehicleType || "Fərq etməz"}
                  >
                    <option value="Fərq etməz">Fərq etməz</option>
                    {classifiedsVehicleTypes.map((item) => (
                      <option key={item} value={item}>{item}</option>
                    ))}
                  </select>
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                    <i className="ri-arrow-down-s-line text-slate-400"></i>
                  </div>
                </div>
              </div>

              <div className="form-group mb-0">
                <label className="text-sm font-semibold text-slate-700 mb-1.5 block">
                  Təklif olunan qiymət
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <i className="ri-money-dollar-circle-line text-slate-400"></i>
                  </div>
                  <input
                    name="price"
                    type="number"
                    min="1"
                    className="form-control w-full rounded-lg border-slate-300 shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-200 focus:ring-opacity-50 pl-10 pr-12 text-[15px] py-2.5 h-auto transition-shadow"
                    placeholder="Məbləğ"
                    defaultValue={stringValue(editing?.price || "")}
                  />
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                    <span className="text-slate-400 text-sm font-medium">AZN</span>
                  </div>
                </div>
              </div>

              <div className="form-group mb-0">
                <PhoneField
                  label="Əlaqə telefonu"
                  name="ownerPhone"
                  value={contactPhone}
                  onChange={(next) => {
                    setContactPhone(next);
                    if (fieldErrors.contactPhone) {
                      setFieldErrors((current) => ({ ...current, contactPhone: undefined }));
                    }
                  }}
                  disabled={isSubmitting}
                  error={fieldErrors.contactPhone}
                />
              </div>

              <div className="form-group mb-0 md:col-span-2 lg:col-span-3">
                <label className="text-sm font-semibold text-slate-700 mb-1.5 block">
                  Əlavə qeydlər
                </label>
                <textarea
                  name="note"
                  className="form-control w-full rounded-lg border-slate-300 shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-200 focus:ring-opacity-50 text-[15px] py-3 transition-shadow min-h-[100px]"
                  placeholder="Sürücü üçün əlavə xüsusi qeydləriniz varsa yazın..."
                  defaultValue={editing?.note || ""}
                />
              </div>
            </div>

            <div className="mt-6 border-t border-slate-100 pt-5">
              <h3 className="text-[17px] font-bold text-navy-900 flex items-center gap-2 mb-4">
                <i className="ri-information-line text-logistics-orange text-xl"></i>
                Əlavə məlumat (Kömək və Tələblər)
              </h3>

              <div className="grid gap-5 md:grid-cols-2">
                <div>
                  <label className="text-[14px] font-semibold text-slate-700 mb-2 block">Yükləmə ilə bağlı yardım</label>
                  <div className="relative">
                    <select
                      name="needsLoadingHelp"
                      className="form-select w-full rounded-lg border-slate-300 shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-200 focus:ring-opacity-50 text-[15px] py-2.5 h-auto transition-shadow appearance-none"
                      defaultValue={editing?.needsLoadingHelp || "Xeyr"}
                    >
                      <option value="Bəli">Bəli, yükləmə yardımı lazımdır</option>
                      <option value="Xeyr">Xeyr, yükləmə yardımı lazım deyil</option>
                    </select>
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                      <i className="ri-arrow-down-s-line text-slate-400"></i>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="text-[14px] font-semibold text-slate-700 mb-2 block">Boşaltma ilə bağlı yardım</label>
                  <div className="relative">
                    <select
                      name="needsUnloadingHelp"
                      className="form-select w-full rounded-lg border-slate-300 shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-200 focus:ring-opacity-50 text-[15px] py-2.5 h-auto transition-shadow appearance-none"
                      defaultValue={editing?.needsUnloadingHelp || "Xeyr"}
                    >
                      <option value="Bəli">Bəli, boşaltma yardımı lazımdır</option>
                      <option value="Xeyr">Xeyr, boşaltma yardımı lazım deyil</option>
                    </select>
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                      <i className="ri-arrow-down-s-line text-slate-400"></i>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="text-[14px] font-semibold text-slate-700 mb-2 block">Faktura (Sənəd) tələb olunur</label>
                  <div className="relative">
                    <select
                      name="requiresInvoice"
                      className="form-select w-full rounded-lg border-slate-300 shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-200 focus:ring-opacity-50 text-[15px] py-2.5 h-auto transition-shadow appearance-none"
                      defaultValue={editing?.requiresInvoice || "Xeyr"}
                    >
                      <option value="Bəli">Bəli</option>
                      <option value="Xeyr">Xeyr</option>
                    </select>
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                      <i className="ri-arrow-down-s-line text-slate-400"></i>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="text-[14px] font-semibold text-slate-700 mb-2 block">Gediş-dönüş yük imkanı</label>
                  <div className="relative">
                    <select
                      name="roundTrip"
                      className="form-select w-full rounded-lg border-slate-300 shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-200 focus:ring-opacity-50 text-[15px] py-2.5 h-auto transition-shadow appearance-none"
                      defaultValue={editing?.roundTrip || "Xeyr"}
                    >
                      <option value="Bəli">Bəli, qayıdış yükü də var</option>
                      <option value="Xeyr">Xeyr, yalnız bir tərəfə</option>
                    </select>
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                      <i className="ri-arrow-down-s-line text-slate-400"></i>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-slate-100 px-6 py-6 lg:px-8">
          <h4 className="text-[16px] font-semibold text-slate-800 mb-4 pb-2 border-b border-slate-100 flex items-center gap-2">
            Şəkillər
          </h4>

          <div className="rounded-[14px] border-2 border-dashed border-slate-200 p-6">
            <div className="mb-5 flex flex-col items-center text-center max-w-md mx-auto">
              <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 mb-3">
                <i className="ri-camera-lens-line text-xl"></i>
              </div>
              <h3 className="text-[15px] font-semibold text-slate-800 mb-1">
                Elanınıza şəkillər əlavə edin
              </h3>
              <p className="text-[13px] leading-relaxed text-slate-500">
                İlk şəkil əsas cover kimi görünəcək. Şəkillər aydın və keyfiyyətli olmalıdır ki, sürücülər yükü daha yaxşı anlasın.
              </p>
            </div>
            <ImageUploader
              key={listingId || "new-load"}
              folder="classified-loads"
              label="Şəkilləri seçin"
              maxFiles={listingImageMaxFiles}
              maxFileSizeBytes={listingImageMaxFileSizeBytes}
              helperText={getListingImageLimitHint()}
              initialUrls={initialPhotoUrls}
              onUrlsChange={setPhotosState}
            />
          </div>
        </div>

        <div className="card-footer bg-slate-50/80 px-6 py-5 border-t border-slate-200 flex flex-wrap gap-3 sm:justify-end items-center">
          <ButtonLink href="/cargo-owner/dashboard" variant="ghost" className="order-2 sm:order-1 text-slate-600 font-medium px-5">
            Ləğv et
          </ButtonLink>
          <Button
            type="submit"
            disabled={isSubmitting}
            className="order-1 sm:order-2 bg-[#0055FF] hover:bg-[#004ce6] text-white font-medium px-8 py-2.5 h-auto rounded-lg shadow-sm w-full sm:w-auto flex items-center justify-center gap-2"
          >
            <i className={editing || (listingId && !listingId.startsWith("load-")) ? "ri-save-line" : "ri-send-plane-line"}></i>
            {isSubmitting
              ? "Göndərilir..."
              : editing || (listingId && !listingId.startsWith("load-"))
                ? "Dəyişiklikləri saxla"
                : "Elanı göndər"}
          </Button>
        </div>
      </form>
      </div>
    </DashboardShell>
  );
}
