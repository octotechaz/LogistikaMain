"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import {
  BarChart3,
  Boxes,
  CheckCircle2,
  ChevronDown,
  Clock3,
  Megaphone,
  ShieldCheck,
  UserRound
} from "lucide-react";
import {
  DashboardShell,
  EmptyAccessState,
  MetricCard
} from "@/components/classifieds/shared";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/Button";
import { useApiAuthUser } from "@/hooks/useApiAuthUser";
import { useClassifieds } from "@/components/providers/ClassifiedsProvider";
import { formatListingDate, getPublicListings } from "@/lib/classifieds-format";
import { mapApiCargoPostToListing } from "@/lib/cargo-post-map";
import { effectiveStatus } from "@/lib/status/classifieds";
import type { Banner, CargoListing } from "@/types/classifieds";
import type { PublicListingCategory } from "@/types/classifieds";

function RequireAdmin({ children }: { children: React.ReactNode }) {
  const { ready } = useClassifieds();
  const { user, legacyUser, isLoading } = useApiAuthUser();

  if (!ready || isLoading) {
    return <div className="min-h-screen bg-slate-50" />;
  }

  const isAdmin =
    user?.role === "ADMIN" || legacyUser?.role === "ADMIN";

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-[radial-gradient(circle_at_top,#eef6ff,transparent_32%),linear-gradient(180deg,#f8fbff_0%,#f4f7fb_40%,#f4f7fb_100%)] p-6">
        <div className="mx-auto max-w-4xl pt-10">
          <EmptyAccessState
            title="Admin girişi tələb olunur"
            description="Bu bölmə yalnız admin sessiyası üçün açıqdır."
            actionHref="https://admin.tranzit.az/auth"
            actionLabel="Admin kimi daxil ol"
          />
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

export function AdminDashboardPageClient() {
  const { owners, listings, banners } = useClassifieds();
  const publicCount = getPublicListings(listings).length;
  const pending = listings.filter((item) => effectiveStatus(item) === "PENDING").length;

  return (
    <RequireAdmin>
      <DashboardShell
        section="admin"
        title="Ümumi idarəetmə görünüşü"
        description="Elanların moderasiyası, istifadəçilər və banner məzmunu bu paneldən idarə olunur."
      >
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard label="Yük sahibləri" value={String(owners.filter((item) => item.role === "CARGO_OWNER").length)} icon={<UserRound className="h-5 w-5" />} />
          <MetricCard label="Təsdiq gözləyən" value={String(pending)} icon={<Clock3 className="h-5 w-5" />} />
          <MetricCard label="Public elanlar" value={String(publicCount)} icon={<ShieldCheck className="h-5 w-5" />} />
          <MetricCard label="Aktiv bannerlər" value={String(banners.filter((item) => item.isActive).length)} icon={<Megaphone className="h-5 w-5" />} />
        </div>
        <div className="surface-panel p-6">
          <h2 className="text-xl font-semibold text-navy-900">Son əlavə olunan elanlar</h2>
          <div className="mt-5 space-y-3">
            {listings
              .slice()
              .sort((left, right) => +new Date(right.createdAt) - +new Date(left.createdAt))
              .slice(0, 6)
              .map((listing) => (
                <div key={listing.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 p-4">
                  <div>
                    <p className="font-medium text-navy-900">{listing.title}</p>
                    <p className="text-sm text-slate-600">
                      {listing.pickupCity} → {listing.deliveryCity}
                    </p>
                  </div>
                  <StatusBadge status={effectiveStatus(listing)} />
                </div>
              ))}
          </div>
        </div>
      </DashboardShell>
    </RequireAdmin>
  );
}

const editableCategoryIconKeys = ["grid", "home", "hammer", "food", "droplets", "snowflake", "tractor", "truck", "package", "boxes"];

const emptyCategory: PublicListingCategory = {
  id: "",
  label: "",
  iconKey: "boxes",
  iconTone: "text-slate-500",
  matchCargoType: "",
  matchVehicleType: "",
  matchKeyword: "",
  sortOrder: 100,
  isActive: true
};

export function AdminCategoriesPageClient() {
  const [categories, setCategories] = useState<PublicListingCategory[]>([]);
  const [draft, setDraft] = useState<PublicListingCategory>(emptyCategory);
  const [loading, setLoading] = useState(true);

  async function loadCategories() {
    setLoading(true);
    const response = await fetch("/api/admin/public-categories", { cache: "no-store" });
    const payload = (await response.json()) as { data?: PublicListingCategory[] };
    setCategories(Array.isArray(payload.data) ? payload.data : []);
    setLoading(false);
  }

  useEffect(() => {
    loadCategories();
  }, []);

  async function saveCategory(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await fetch("/api/admin/public-categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(draft)
    });
    setDraft(emptyCategory);
    await loadCategories();
  }

  async function deleteCategory(id: string) {
    await fetch(`/api/admin/public-categories?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    await loadCategories();
  }

  return (
    <RequireAdmin>
      <DashboardShell
        section="admin"
        title="Public kateqoriyalar"
        description="Ana səhifədəki kateqoriya ikonları, adları və filter qaydaları SQLite-dən idarə olunur."
      >
        <form onSubmit={saveCategory} className="surface-panel grid gap-4 p-5 lg:grid-cols-4">
          <label className="form-label">
            ID
            <input
              className="form-field"
              value={draft.id}
              onChange={(event) => setDraft((current) => ({ ...current, id: event.target.value }))}
              placeholder="home"
              required
            />
          </label>
          <label className="form-label">
            Ad
            <input
              className="form-field"
              value={draft.label}
              onChange={(event) => setDraft((current) => ({ ...current, label: event.target.value }))}
              placeholder="Ev əşyaları"
              required
            />
          </label>
          <label className="form-label">
            Icon key
            <select
              className="form-field"
              value={draft.iconKey}
              onChange={(event) => setDraft((current) => ({ ...current, iconKey: event.target.value }))}
            >
              {editableCategoryIconKeys.map((key) => (
                <option key={key} value={key}>
                  {key}
                </option>
              ))}
            </select>
          </label>
          <label className="form-label">
            Rəng class
            <input
              className="form-field"
              value={draft.iconTone}
              onChange={(event) => setDraft((current) => ({ ...current, iconTone: event.target.value }))}
              placeholder="text-sky-600"
            />
          </label>
          <label className="form-label">
            Cargo type filter
            <input
              className="form-field"
              value={draft.matchCargoType || ""}
              onChange={(event) => setDraft((current) => ({ ...current, matchCargoType: event.target.value }))}
              placeholder="Tikinti materialı"
            />
          </label>
          <label className="form-label">
            Vehicle filter
            <input
              className="form-field"
              value={draft.matchVehicleType || ""}
              onChange={(event) => setDraft((current) => ({ ...current, matchVehicleType: event.target.value }))}
              placeholder="Soyuduculu maşın"
            />
          </label>
          <label className="form-label">
            Açar sözlər
            <input
              className="form-field"
              value={draft.matchKeyword || ""}
              onChange={(event) => setDraft((current) => ({ ...current, matchKeyword: event.target.value }))}
              placeholder="meyvə,tərəvəz,taxıl"
            />
          </label>
          <label className="form-label">
            Sıra
            <input
              className="form-field"
              type="number"
              value={draft.sortOrder}
              onChange={(event) => setDraft((current) => ({ ...current, sortOrder: Number(event.target.value) }))}
            />
          </label>
          <label className="flex items-center gap-2 text-sm font-semibold text-navy-900">
            <input
              type="checkbox"
              checked={draft.isActive}
              onChange={(event) => setDraft((current) => ({ ...current, isActive: event.target.checked }))}
            />
            Aktiv göstər
          </label>
          <div className="flex items-end gap-2 lg:col-span-3">
            <Button type="submit">Saxla</Button>
            <Button type="button" variant="secondary" onClick={() => setDraft(emptyCategory)}>
              Təmizlə
            </Button>
          </div>
        </form>

        <div className="surface-panel overflow-hidden">
          <div className="border-b border-slate-200 px-5 py-4">
            <h2 className="text-xl font-semibold text-navy-900">Kateqoriyalar</h2>
          </div>
          {loading ? (
            <p className="p-5 text-sm text-slate-500">Yüklənir...</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50 text-left text-slate-500">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Ad</th>
                    <th className="px-4 py-3 font-semibold">Icon</th>
                    <th className="px-4 py-3 font-semibold">Filter</th>
                    <th className="px-4 py-3 font-semibold">Sıra</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                    <th className="px-4 py-3 font-semibold">Əməliyyat</th>
                  </tr>
                </thead>
                <tbody>
                  {categories.map((category) => (
                    <tr key={category.id} className="border-t border-slate-100">
                      <td className="px-4 py-3 font-semibold text-navy-900">{category.label}</td>
                      <td className="px-4 py-3 text-slate-600">{category.iconKey}</td>
                      <td className="px-4 py-3 text-slate-600">
                        {[category.matchCargoType, category.matchVehicleType, category.matchKeyword].filter(Boolean).join(" / ") || "Hamısı"}
                      </td>
                      <td className="px-4 py-3 text-slate-600">{category.sortOrder}</td>
                      <td className="px-4 py-3 text-slate-600">{category.isActive ? "Aktiv" : "Gizli"}</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <Button type="button" variant="secondary" onClick={() => setDraft(category)}>
                            Düzəlt
                          </Button>
                          <Button type="button" variant="danger" onClick={() => deleteCategory(category.id)}>
                            Sil
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </DashboardShell>
    </RequireAdmin>
  );
}

export function AdminUsersPageClient() {
  const { owners, setOwnerStatus } = useClassifieds();
  const cargoOwners = owners.filter((owner) => owner.role === "CARGO_OWNER");

  return (
    <RequireAdmin>
      <DashboardShell
        section="admin"
        title="İstifadəçilər"
        description="Yük sahibi hesablarını aktiv və ya blok vəziyyətinə keçirə bilərsiniz."
      >
        <div className="surface-panel overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-left text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-semibold">İstifadəçi</th>
                  <th className="px-4 py-3 font-semibold">Telefon</th>
                  <th className="px-4 py-3 font-semibold">Şirkət</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Əməliyyat</th>
                </tr>
              </thead>
              <tbody>
                {cargoOwners.map((owner) => (
                  <tr key={owner.id} className="border-t border-slate-100">
                    <td className="px-4 py-3 font-medium text-navy-900">
                      {owner.firstName} {owner.lastName}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{owner.phone}</td>
                    <td className="px-4 py-3 text-slate-600">{owner.companyName || "Qeyd edilməyib"}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={owner.status} />
                    </td>
                    <td className="px-4 py-3">
                      <Button
                        variant={owner.status === "ACTIVE" ? "secondary" : "primary"}
                        onClick={() => setOwnerStatus(owner.id, owner.status === "ACTIVE" ? "BLOCKED" : "ACTIVE")}
                      >
                        {owner.status === "ACTIVE" ? "Blokla" : "Aktiv et"}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </DashboardShell>
    </RequireAdmin>
  );
}

const statusOptions = [
  { value: "PENDING", label: "Gözləyir", color: "text-amber-600" },
  { value: "APPROVED", label: "Təsdiqlənib", color: "text-emerald-600" },
  { value: "REJECTED", label: "Rədd edilib", color: "text-red-600" }
];

function StatusDropdown({
  value,
  onChange,
  disabled
}: {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const currentLabel = statusOptions.find((option) => option.value === value)?.label || "Seçin";

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  return (
    <div ref={rootRef} className="relative w-full min-w-[180px]">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((current) => !current)}
        className="flex w-full items-center justify-between gap-2 rounded-md border border-slate-300 bg-white px-3 py-2 text-left text-sm text-slate-700 shadow-sm outline-none transition hover:border-slate-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-200 disabled:cursor-not-allowed disabled:opacity-60"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="truncate">{currentLabel}</span>
        <ChevronDown className="h-4 w-4 shrink-0 text-slate-400 transition-transform" />
      </button>

      {open ? (
        <div className="absolute left-0 top-full z-40 mt-1 w-full min-w-[180px] rounded-md border border-slate-200 bg-white shadow-[0_10px_24px_rgba(15,23,42,0.14)]">
          <div className="py-1" role="listbox">
            {statusOptions.map((option) => (
                <button
                key={option.value}
                type="button"
                onClick={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
                className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm text-slate-700 transition-colors hover:bg-slate-50"
                role="option"
                aria-selected={value === option.value}
              >
                <span>{option.label}</span>
                <span className={`text-xs font-semibold ${option.color}`}>{option.value}</span>
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function AdminLoadsPageClient() {
  const [listings, setListings] = useState<CargoListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reasons, setReasons] = useState<Record<string, string>>({});

  const loadListings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/cargo-posts", { credentials: "include" });
      const result = await response.json().catch(() => null);
      if (!response.ok || !result?.ok) {
        throw new Error(result?.message || "Elanlar yüklənmədi.");
      }
      const rows = Array.isArray(result.data) ? result.data : [];
      setListings(
        rows.map((item: Record<string, unknown>) =>
          mapApiCargoPostToListing({
            ...item,
            cargoOwnerProfile:
              item.cargoOwnerProfile ||
              ({
                companyName: (item.owner as Record<string, unknown> | undefined)?.companyName,
                user: item.owner
              } as Record<string, unknown>)
          })
        )
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Elanlar yüklənmədi.");
      setListings([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadListings();
  }, [loadListings]);

  async function setAdminStatus(listingId: string, status: "APPROVED" | "REJECTED" | "PENDING", reason?: string) {
    setBusyId(listingId);
    setError(null);
    try {
      const response = await fetch(`/api/admin/cargo-posts/${listingId}/status`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, rejectionReason: reason })
      });
      const result = await response.json().catch(() => null);
      if (!response.ok || !result?.ok) {
        throw new Error(result?.message || "Status yenilənmədi.");
      }
      await loadListings();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Status yenilənmədi.");
    } finally {
      setBusyId(null);
    }
  }

  async function removeListing(listingId: string) {
    if (!window.confirm("Bu elanı silmək istədiyinizə əminsiniz?")) {
      return;
    }
    setBusyId(listingId);
    setError(null);
    try {
      const response = await fetch(`/api/cargo-posts/${listingId}`, {
        method: "DELETE",
        credentials: "include"
      });
      const result = await response.json().catch(() => null);
      if (!response.ok || !result?.ok) {
        throw new Error(result?.message || "Elan silinmədi.");
      }
      await loadListings();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Elan silinmədi.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <RequireAdmin>
      <DashboardShell
        section="admin"
        title="Elan moderasiyası"
        description="Yeni elanlar dərc olunmazdan əvvəl burada təsdiqlənməlidir."
      >
        {error ? (
          <div className="mb-4 rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            {error}
          </div>
        ) : null}

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
          </div>
        ) : (
          <div className="grid gap-4">
            {listings.length === 0 ? (
              <div className="surface-panel p-8 text-center text-slate-500">Hələ elan yoxdur.</div>
            ) : null}
            {listings
              .slice()
              .sort((left, right) => +new Date(right.createdAt) - +new Date(left.createdAt))
              .map((listing) => {
                const currentStatus = effectiveStatus(listing);
                const isPending = currentStatus === "PENDING";
                return (
                  <div key={listing.id} className="surface-panel p-5">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-3">
                          <h2 className="text-lg font-semibold text-navy-900">{listing.title}</h2>
                          <StatusBadge status={currentStatus} />
                        </div>
                        <p className="mt-2 text-sm text-slate-600">
                          {listing.pickupCity} → {listing.deliveryCity} • {listing.ownerName}
                        </p>
                        <p className="mt-1 text-sm text-slate-500 line-clamp-2">{listing.description}</p>
                      </div>
                      <div className="flex flex-col gap-3 sm:items-end">
                        <StatusDropdown
                          value={currentStatus}
                          onChange={(newStatus) => {
                            const reason = newStatus === "REJECTED" ? (reasons[listing.id] || "Məlumat natamamdır") : undefined;
                            setAdminStatus(listing.id, newStatus as "APPROVED" | "REJECTED" | "PENDING", reason);
                          }}
                          disabled={busyId === listing.id}
                        />
                        <Button
                          variant="ghost"
                          className="text-red-600 self-end sm:self-auto"
                          disabled={busyId === listing.id}
                          onClick={() => removeListing(listing.id)}
                        >
                          Sil
                        </Button>
                      </div>
                    </div>
                    {isPending ? (
                      <div className="mt-4">
                        <label className="form-label">
                          Rədd səbəbi
                          <textarea
                            className="form-field min-h-20"
                            value={reasons[listing.id] || ""}
                            onChange={(event) =>
                              setReasons((current) => ({ ...current, [listing.id]: event.target.value }))
                            }
                          />
                        </label>
                      </div>
                    ) : null}
                  </div>
                );
              })}
          </div>
        )}
      </DashboardShell>
    </RequireAdmin>
  );
}

export function AdminBannersPageClient() {
  const { banners, saveBanner, deleteBanner, toggleBanner } = useClassifieds();
  const [editing, setEditing] = useState<Banner | null>(null);

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const banner: Banner = {
      id: editing?.id || `banner-${Date.now()}`,
      label: String(formData.get("label") || ""),
      title: String(formData.get("title") || ""),
      description: String(formData.get("description") || ""),
      ctaText: String(formData.get("ctaText") || ""),
      ctaLink: String(formData.get("ctaLink") || ""),
      background: String(formData.get("background") || ""),
      imageData: "",
      imageUrl: "",
      textColor: String(formData.get("textColor") || "#111827"),
      order: Number(formData.get("order") || 1),
      isActive: Boolean(formData.get("isActive"))
    };

    saveBanner(banner);
    setEditing(null);
    event.currentTarget.reset();
  }

  return (
    <RequireAdmin>
      <DashboardShell
        section="admin"
        title="Banner idarəetməsi"
        description="Ana səhifədə görünən promo bloklarını buradan tənzimləyin."
      >
        <div className="grid gap-6 xl:grid-cols-[1fr,0.92fr]">
          <div className="grid gap-4">
            {banners
              .slice()
              .sort((left, right) => left.order - right.order)
              .map((banner) => (
                <div key={banner.id} className="surface-panel p-5">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <div className="flex flex-wrap items-center gap-3">
                        <h2 className="text-lg font-semibold text-navy-900">{banner.title}</h2>
                        <StatusBadge status={banner.isActive ? "ACTIVE" : "INACTIVE"} />
                      </div>
                      <p className="mt-2 text-sm text-slate-600">{banner.description}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button variant="secondary" onClick={() => setEditing(banner)}>
                        Redaktə et
                      </Button>
                      <Button variant="secondary" onClick={() => toggleBanner(banner.id)}>
                        {banner.isActive ? "Söndür" : "Aktiv et"}
                      </Button>
                      <Button variant="ghost" className="text-red-600" onClick={() => deleteBanner(banner.id)}>
                        Sil
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
          </div>

          <form className="surface-panel p-6" onSubmit={onSubmit}>
            <h2 className="text-xl font-semibold text-navy-900">
              {editing ? "Banneri redaktə et" : "Yeni banner əlavə et"}
            </h2>
            <div className="mt-5 space-y-4">
              <label className="form-label">
                Etiket
                <input name="label" className="form-field" defaultValue={editing?.label || ""} />
              </label>
              <label className="form-label">
                Başlıq
                <input name="title" className="form-field" defaultValue={editing?.title || ""} required />
              </label>
              <label className="form-label">
                Təsvir
                <textarea
                  name="description"
                  className="form-field min-h-24"
                  defaultValue={editing?.description || ""}
                  required
                />
              </label>
              <label className="form-label">
                CTA mətni
                <input name="ctaText" className="form-field" defaultValue={editing?.ctaText || ""} />
              </label>
              <label className="form-label">
                CTA linki
                <input name="ctaLink" className="form-field" defaultValue={editing?.ctaLink || ""} />
              </label>
              <label className="form-label">
                Background CSS
                <input
                  name="background"
                  className="form-field"
                  defaultValue={editing?.background || "linear-gradient(135deg,#ffffff 0%,#eef6ff 64%,#fff4e8 100%)"}
                />
              </label>
              <label className="form-label">
                Sıra
                <input name="order" type="number" className="form-field" defaultValue={editing?.order || 1} />
              </label>
              <label className="checkbox-card">
                <input name="isActive" type="checkbox" defaultChecked={editing?.isActive ?? true} />
                Banner aktiv olsun
              </label>
            </div>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button type="submit">{editing ? "Yadda saxla" : "Banner əlavə et"}</Button>
              {editing ? (
                <Button type="button" variant="secondary" onClick={() => setEditing(null)}>
                  Ləğv et
                </Button>
              ) : null}
            </div>
          </form>
        </div>
      </DashboardShell>
    </RequireAdmin>
  );
}

const LOCALES = ["az", "ru", "en", "tr"] as const;
type Locale = (typeof LOCALES)[number];

const TABS = [
  {
    id: "home",
    label: "Ana Səhifə",
    fields: [
      { key: "home_hero_title", label: "Hero başlıq" },
      { key: "home_hero_subtitle", label: "Hero alt başlıq" },
      { key: "listings_title", label: "Son elanlar başlığı" },
      { key: "categories_title", label: "Kateqoriyalar başlığı" },
    ],
  },
  {
    id: "nav",
    label: "Naviqasiya",
    fields: [
      { key: "nav_home", label: "Ana səhifə" },
      { key: "nav_loads", label: "Elanlar" },
      { key: "nav_about", label: "Haqqımızda" },
      { key: "nav_howitworks", label: "Necə işləyir" },
      { key: "nav_contact", label: "Əlaqə" },
      { key: "nav_active_loads", label: "Aktiv yüklər" },
      { key: "nav_new_listing", label: "Yeni elan" },
      { key: "nav_panel", label: "Panel" },
      { key: "nav_welcome", label: "Xoş gəldiniz" },
      { key: "nav_user", label: "İstifadəçi" },
      { key: "nav_admin_panel", label: "Admin Paneli" },
      { key: "nav_my_listings", label: "Mənim elanlarım" },
      { key: "nav_logout", label: "Çıxış et" },
    ],
  },
  {
    id: "search",
    label: "Axtarış & Kataloq",
    fields: [
      { key: "search_eyebrow", label: "Eyebrow mətni" },
      { key: "search_title", label: "Əsas başlıq" },
      { key: "search_route_label", label: "Marşrut bölməsi başlığı" },
      { key: "search_pickup_city", label: "Yükləmə şəhəri" },
      { key: "search_delivery_city", label: "Çatdırılma şəhəri" },
      { key: "search_cargo_type", label: "Yük növü" },
      { key: "search_vehicle_type", label: "Nəqliyyat növü" },
      { key: "search_keyword", label: "Açar söz sahəsi" },
      { key: "search_keyword_placeholder", label: "Açar söz placeholder" },
      { key: "search_btn", label: "Axtar düyməsi" },
      { key: "search_btn_loading", label: "Axtarılır... mətni" },
      { key: "search_advanced_btn", label: "Ətraflı filter düyməsi" },
      { key: "search_advanced_hint", label: "Ətraflı filter hint" },
      { key: "search_select", label: "Seçin mətni" },
    ],
  },
  {
    id: "about",
    label: "Haqqımızda",
    fields: [
      { key: "about_hero_title", label: "Hero başlıq" },
      { key: "about_hero_description", label: "Hero təsvir" },
      { key: "about_advantages_title", label: "Üstünlüklər başlığı" },
      { key: "about_paragraphs", label: "Paraqraflar (hər sətir ayrı)", textarea: true, array: true },
      { key: "about_advantages", label: "Üstünlüklər (hər sətir ayrı)", textarea: true, array: true },
    ],
  },
  {
    id: "howitworks",
    label: "Necə işləyir",
    fields: [
      { key: "howitworks_title", label: "Başlıq" },
      { key: "howitworks_description", label: "Təsvir", textarea: true },
    ],
    steps: true,
  },
  {
    id: "footer",
    label: "Footer",
    fields: [
      { key: "footer_phone", label: "Telefon" },
      { key: "footer_work_hours", label: "İş saatları" },
      { key: "footer_copyright", label: "Copyright" },
      { key: "footer_tagline", label: "Tagline" },
      { key: "footer_platform", label: "Platforma bölməsi başlığı" },
      { key: "footer_legal", label: "Hüquqi bölməsi başlığı" },
      { key: "footer_support", label: "Dəstək bölməsi başlığı" },
    ],
  },
  {
    id: "login",
    label: "Giriş",
    fields: [
      { key: "login_eyebrow", label: "Eyebrow" },
      { key: "login_title", label: "Başlıq" },
      { key: "login_subtitle", label: "Alt başlıq" },
      { key: "login_tab_owner", label: "Tab: Yük sahibi" },
      { key: "login_tab_carrier", label: "Tab: Yük daşıyan" },
      { key: "login_method_phone", label: "Metod: Telefon" },
      { key: "login_method_email", label: "Metod: E-poçt" },
      { key: "login_field_phone", label: "Telefon sahəsi" },
      { key: "login_field_email", label: "Email sahəsi" },
      { key: "login_field_email_placeholder", label: "Email placeholder" },
      { key: "login_field_password", label: "Şifrə sahəsi" },
      { key: "login_field_password_placeholder", label: "Şifrə placeholder" },
      { key: "login_forgot_password", label: "Şifrəni unutmusan?" },
      { key: "login_btn", label: "Giriş düyməsi" },
      { key: "login_btn_loading", label: "Giriş (yüklənir)" },
      { key: "login_btn_owner", label: "Giriş düyməsi (sahibi)" },
      { key: "login_btn_carrier", label: "Giriş düyməsi (daşıyan)" },
      { key: "login_no_account", label: "Hesab yoxdur?" },
      { key: "login_register_owner", label: "Qeydiyyat linki (sahibi)" },
      { key: "login_register_carrier", label: "Qeydiyyat linki (daşıyan)" },
      { key: "login_sidebar_title", label: "Sidebar başlığı" },
      { key: "login_sidebar_owner_title", label: "Sidebar: sahibi başlığı" },
      { key: "login_sidebar_carrier_title", label: "Sidebar: daşıyan başlığı" },
      { key: "login_sidebar_owner_desc", label: "Sidebar: sahibi təsviri" },
      { key: "login_sidebar_carrier_desc", label: "Sidebar: daşıyan təsviri" },
      { key: "login_error_invalid", label: "Xəta: yanlış məlumat" },
      { key: "login_error_phone", label: "Xəta: telefon" },
      { key: "login_error_email", label: "Xəta: email" },
    ],
  },
  {
    id: "register",
    label: "Qeydiyyat",
    fields: [
      { key: "register_title", label: "Başlıq" },
      { key: "register_eyebrow_owner", label: "Eyebrow (sahibi)" },
      { key: "register_eyebrow_carrier", label: "Eyebrow (daşıyan)" },
      { key: "register_subtitle_owner", label: "Alt başlıq (sahibi)" },
      { key: "register_subtitle_carrier", label: "Alt başlıq (daşıyan)" },
      { key: "register_field_firstname", label: "Ad sahəsi" },
      { key: "register_field_lastname", label: "Soyad sahəsi" },
      { key: "register_field_phone", label: "Telefon sahəsi" },
      { key: "register_field_email", label: "Email sahəsi" },
      { key: "register_field_password", label: "Şifrə sahəsi" },
      { key: "register_field_company", label: "Şirkət sahəsi" },
      { key: "register_field_voen", label: "VÖEN sahəsi" },
      { key: "register_btn", label: "Hesab yarat düyməsi" },
      { key: "register_btn_loading", label: "Hesab yarat (yüklənir)" },
      { key: "register_terms_prefix", label: "Şərtlər (əvvəl)" },
      { key: "register_terms_link", label: "İstifadə şərtləri linki" },
      { key: "register_privacy_link", label: "Məxfilik siyasəti linki" },
      { key: "register_terms_suffix", label: "Şərtlər (son)" },
      { key: "register_success", label: "Uğur mesajı" },
      { key: "register_error", label: "Xəta mesajı" },
    ],
  },
  {
    id: "forgot",
    label: "Şifrə yenilə",
    fields: [
      { key: "forgot_title", label: "Başlıq" },
      { key: "forgot_subtitle", label: "Alt başlıq" },
      { key: "forgot_field_phone", label: "Telefon sahəsi" },
      { key: "forgot_field_email", label: "Email sahəsi" },
      { key: "forgot_field_email_placeholder", label: "Email placeholder" },
      { key: "forgot_btn_send", label: "OTP göndər düyməsi" },
      { key: "forgot_btn_sending", label: "OTP göndərilir..." },
      { key: "forgot_otp_label", label: "OTP kodu sahəsi" },
      { key: "forgot_otp_placeholder", label: "OTP placeholder" },
      { key: "forgot_new_password", label: "Yeni şifrə" },
      { key: "forgot_new_password_placeholder", label: "Yeni şifrə placeholder" },
      { key: "forgot_confirm_password", label: "Şifrə təkrar" },
      { key: "forgot_confirm_password_placeholder", label: "Şifrə təkrar placeholder" },
      { key: "forgot_btn_reset", label: "Şifrəni yenilə düyməsi" },
      { key: "forgot_btn_resetting", label: "Yenilənir..." },
      { key: "forgot_btn_back", label: "Geri düyməsi" },
      { key: "forgot_success_title", label: "Uğur başlığı" },
      { key: "forgot_success_redirect", label: "Yönləndirmə mətni" },
      { key: "forgot_success_login", label: "İndi daxil ol" },
      { key: "forgot_back_to_login", label: "Giriş səhifəsinə qayıt" },
      { key: "forgot_create_account", label: "Yeni hesab yarat" },
      { key: "forgot_error_send", label: "Xəta: OTP göndərilmədi" },
      { key: "forgot_error_reset", label: "Xəta: şifrə yenilənmədi" },
    ],
  },
  {
    id: "role",
    label: "Rol seçimi & Daşıyıcı",
    fields: [
      { key: "role_select_eyebrow", label: "Eyebrow" },
      { key: "role_select_title", label: "Başlıq" },
      { key: "role_carrier_title", label: "Daşıyan kart başlığı" },
      { key: "role_carrier_desc", label: "Daşıyan kart təsviri" },
      { key: "role_owner_title", label: "Sahibi kart başlığı" },
      { key: "role_owner_desc", label: "Sahibi kart təsviri" },
      { key: "carrier_highlight_1", label: "Daşıyıcı highlight 1" },
      { key: "carrier_highlight_2", label: "Daşıyıcı highlight 2" },
      { key: "carrier_highlight_3", label: "Daşıyıcı highlight 3" },
      { key: "carrier_field_contact_phone", label: "Əlaqə nömrəsi sahəsi" },
      { key: "carrier_field_whatsapp", label: "WhatsApp sahəsi" },
      { key: "carrier_company_placeholder", label: "Şirkət placeholder" },
      { key: "carrier_vehicle_type", label: "Avtomobil növü sahəsi" },
      { key: "carrier_location_address", label: "Ünvan sahəsi" },
      { key: "carrier_location_placeholder", label: "Ünvan placeholder" },
      { key: "carrier_cargo_volume", label: "Yük həcmi sahəsi" },
      { key: "carrier_cargo_volume_placeholder", label: "Həcm placeholder" },
      { key: "carrier_max_weight", label: "Maks. çəki sahəsi" },
      { key: "carrier_max_weight_placeholder", label: "Çəki placeholder" },
      { key: "carrier_cargo_types_title", label: "Yük növləri başlığı" },
      { key: "carrier_map_title", label: "Xəritə bölməsi başlığı" },
    ],
  },
  {
    id: "catalog_ui",
    label: "Kataloq UI",
    fields: [
      { key: "catalog_select_placeholder", label: "Seçin mətni" },
      { key: "catalog_all", label: "Hamısı" },
      { key: "catalog_view_all", label: "Hamısına bax" },
      { key: "catalog_close", label: "Bağla" },
      { key: "catalog_reset", label: "Sıfırla" },
      { key: "catalog_grid", label: "Kvadratlar görünüşü" },
      { key: "catalog_list", label: "Siyahı görünüşü" },
      { key: "catalog_all_listings", label: "Bütün elanlar" },
      { key: "catalog_listings_shown", label: "elan göstərilir" },
      { key: "catalog_found", label: "Tapıldı" },
      { key: "catalog_listings_unit", label: "elan (vahid)" },
      { key: "catalog_no_results", label: "Nəticə yoxdur - başlıq" },
      { key: "catalog_no_results_hint", label: "Nəticə yoxdur - hint" },
      { key: "catalog_no_category", label: "Kateqoriyada elan yoxdur" },
      { key: "catalog_no_category_hint", label: "Kateqoriya hint" },
      { key: "catalog_loading", label: "Yüklənir..." },
      { key: "catalog_listings_loading", label: "Elanlar yüklənir..." },
      { key: "catalog_load_error", label: "Yükləmə xətası" },
      { key: "catalog_retry", label: "Yenidən cəhd et" },
      { key: "catalog_metric_qty", label: "Say" },
      { key: "catalog_metric_volume", label: "Həcm" },
      { key: "catalog_metric_weight", label: "Çəki" },
      { key: "catalog_metric_dims", label: "Ölçü" },
      { key: "catalog_filter_min_price", label: "Min qiymət" },
      { key: "catalog_filter_max_price", label: "Max qiymət" },
      { key: "catalog_filter_min_weight", label: "Min çəki" },
      { key: "catalog_filter_max_weight", label: "Max çəki" },
      { key: "catalog_filter_date_from", label: "Tarixdən" },
      { key: "catalog_filter_date_to", label: "Tarixədək" },
      { key: "catalog_filter_min_volume", label: "Min həcm" },
      { key: "catalog_filter_max_volume", label: "Max həcm" },
      { key: "catalog_filter_length", label: "Uzunluq" },
      { key: "catalog_filter_width", label: "En" },
      { key: "catalog_filter_height", label: "Hündürlük" },
      { key: "catalog_chip_all", label: "Chip: Hamısı" },
      { key: "catalog_chip_general", label: "Chip: Ümumi yüklər" },
      { key: "catalog_chip_construction", label: "Chip: Tikinti" },
      { key: "catalog_chip_food", label: "Chip: Qida" },
      { key: "catalog_chip_agri", label: "Chip: Kənd təsərrüfatı" },
      { key: "catalog_chip_liquid", label: "Chip: Maye" },
      { key: "catalog_chip_cold", label: "Chip: Soyuducu" },
      { key: "catalog_chip_danger", label: "Chip: Təhlükəli" },
      { key: "catalog_chip_other", label: "Chip: Digər" },
      { key: "catalog_sort_newest", label: "Sort: Ən yeni" },
      { key: "catalog_sort_price_desc", label: "Sort: Qiymət azalan" },
      { key: "catalog_sort_price_asc", label: "Sort: Qiymət artan" },
      { key: "catalog_sort_weight_desc", label: "Sort: Çəki azalan" },
      { key: "catalog_hiw_title", label: "Necə işləyir başlığı" },
      { key: "catalog_hiw_1_title", label: "Addım 1 başlığı" },
      { key: "catalog_hiw_1_text", label: "Addım 1 mətni" },
      { key: "catalog_hiw_2_title", label: "Addım 2 başlığı" },
      { key: "catalog_hiw_2_text", label: "Addım 2 mətni" },
      { key: "catalog_hiw_3_title", label: "Addım 3 başlığı" },
      { key: "catalog_hiw_3_text", label: "Addım 3 mətni" },
      { key: "catalog_cta_title", label: "CTA başlığı" },
      { key: "catalog_cta_desc", label: "CTA təsviri" },
      { key: "catalog_cta_free", label: "CTA: Pulsuz" },
      { key: "catalog_cta_carriers", label: "CTA: Daşıyıcılar" },
      { key: "catalog_cta_fast", label: "CTA: Tez həll" },
      { key: "catalog_cta_btn", label: "CTA düyməsi" },
      { key: "catalog_stats_title", label: "Statistika başlığı" },
      { key: "catalog_stats_listings", label: "Stat: Aktiv elan" },
      { key: "catalog_stats_carriers", label: "Stat: Daşıyıcılar" },
      { key: "catalog_stats_deliveries", label: "Stat: Daşınmalar" },
      { key: "catalog_stats_satisfaction", label: "Stat: Məmnuniyyət" },
      { key: "catalog_trust_title", label: "Etibar başlığı" },
      { key: "catalog_trust_safe", label: "Etibar: Təhlükəsiz" },
      { key: "catalog_trust_data", label: "Etibar: Məlumat" },
      { key: "catalog_trust_support", label: "Etibar: Dəstək" },
    ],
  },
  {
    id: "nav_auth",
    label: "Nav & Auth UI",
    fields: [
      { key: "nav_login", label: "Daxil ol" },
      { key: "nav_login_register", label: "Daxil ol / Qeydiyyat" },
      { key: "nav_welcome_user", label: "Xoş gəldiniz" },
      { key: "nav_default_user", label: "İstifadəçi (default)" },
      { key: "footer_tagline_static", label: "Footer tagline (statik)" },
    ],
  },
  {
    id: "dashboard",
    label: "Panel & Dashboard",
    fields: [
      { key: "dashboard_owner_panel", label: "Yük Sahibi Paneli adı" },
      { key: "dashboard_carrier_panel", label: "Daşıyıcı Paneli adı" },
      { key: "dashboard_admin_panel", label: "Admin Paneli adı" },
      { key: "dashboard_owner_default_name", label: "Sahibi default adı" },
      { key: "dashboard_carrier_default_name", label: "Daşıyıcı default adı" },
      { key: "dashboard_nav_my_listings", label: "Nav: Mənim elanlarım" },
      { key: "dashboard_nav_new_listing", label: "Nav: Yeni elan" },
      { key: "dashboard_nav_dashboard", label: "Nav: Dashboard" },
      { key: "dashboard_nav_active_loads", label: "Nav: Aktiv yüklər" },
      { key: "dashboard_nav_applications", label: "Nav: Müraciətlərim" },
      { key: "dashboard_nav_vehicles", label: "Nav: Avtomobillər" },
      { key: "dashboard_nav_overview", label: "Nav: Ümumi görünüş" },
      { key: "dashboard_nav_users", label: "Nav: İstifadəçilər" },
      { key: "dashboard_nav_listings", label: "Nav: Elanlar" },
      { key: "dashboard_nav_categories", label: "Nav: Kateqoriyalar" },
      { key: "dashboard_nav_banners", label: "Nav: Bannerlər" },
      { key: "dashboard_nav_statistics", label: "Nav: Statistika" },
      { key: "dashboard_btn_view_site", label: "Düymə: Sayta bax" },
      { key: "dashboard_btn_logout", label: "Düymə: Çıxış et" },
    ],
  },
] as const;

type FieldDef = { key: string; label: string; textarea?: boolean; array?: boolean };
type TabDef = { id: string; label: string; fields: readonly FieldDef[]; steps?: boolean };

const STEP_ICONS = ["UploadCloud", "ShieldCheck", "ClipboardList", "PhoneCall"];

function valueToDisplay(val: unknown, isArray?: boolean): string {
  if (isArray) {
    if (Array.isArray(val)) return val.map((v) => (typeof v === "string" ? v : JSON.stringify(v))).join("\n");
    if (typeof val === "string") return val;
    return "";
  }
  if (typeof val === "string") return val;
  return "";
}

function displayToValue(display: string, isArray?: boolean): unknown {
  if (isArray) return display.split("\n").filter(Boolean);
  return display;
}

type NavLink = { id: string; href: string };

const DEFAULT_TOPBAR: NavLink[] = [
  { id: "loads", href: "/" },
  { id: "about", href: "/haqqimizda" },
  { id: "help", href: "/how-it-works" },
];

const DEFAULT_FOOTER: NavLink[] = [
  { id: "about", href: "/haqqimizda" },
  { id: "terms", href: "/istifade-sertleri" },
  { id: "privacy", href: "/mexfilik-siyaseti" },
  { id: "rules", href: "/qaydalar" },
  { id: "contact", href: "/elaqe" },
];

const TOPBAR_LABELS: Record<string, string> = {
  loads: "Elanlar",
  about: "Haqqımızda",
  help: "Necə işləyir",
};

const FOOTER_LABELS: Record<string, string> = {
  about: "Haqqımızda",
  terms: "İstifadə şərtləri",
  privacy: "Məxfilik siyasəti",
  rules: "Qaydalar",
  contact: "Əlaqə",
};

export function AdminPageContentPageClient() {
  const [locale, setLocale] = useState<Locale>("az");
  const [activeTab, setActiveTab] = useState<string>(TABS[0].id);
  const [search, setSearch] = useState("");
  const [fieldSearch, setFieldSearch] = useState("");
  const [fields, setFields] = useState<Record<string, string>>({});
  const [steps, setSteps] = useState<{ icon: string; title: string; text: string }[]>([
    { icon: "UploadCloud", title: "", text: "" },
    { icon: "ShieldCheck", title: "", text: "" },
    { icon: "ClipboardList", title: "", text: "" },
    { icon: "PhoneCall", title: "", text: "" },
  ]);
  const [topbarNav, setTopbarNav] = useState<NavLink[]>(DEFAULT_TOPBAR);
  const [footerNav, setFooterNav] = useState<NavLink[]>(DEFAULT_FOOTER);
  const [navLoading, setNavLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const cacheRef = useRef<Partial<Record<Locale, { fields: Record<string, string>; steps: typeof steps }>>>({});

  async function fetchLocale(loc: Locale) {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/page-content?locale=${loc}`);
      const json = await res.json() as { data: Record<string, unknown> };
      const data = json.data ?? {};
      const newFields: Record<string, string> = {};
      for (const tab of TABS) {
        for (const f of tab.fields as readonly FieldDef[]) {
          newFields[f.key] = valueToDisplay(data[f.key], f.array);
        }
      }
      const rawSteps = data["howitworks_steps"];
      const newSteps: { icon: string; title: string; text: string }[] = [0, 1, 2, 3].map((i) => {
        const s = Array.isArray(rawSteps) ? (rawSteps[i] as Record<string, string> | undefined) : undefined;
        return { icon: s?.icon ?? STEP_ICONS[i], title: s?.title ?? "", text: s?.text ?? "" };
      });
      cacheRef.current[loc] = { fields: newFields, steps: newSteps };
      setFields(newFields);
      setSteps(newSteps);
    } catch {
      setError("Məlumatlar yüklənmədi");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void fetchLocale("az");
    void (async () => {
      setNavLoading(true);
      try {
        const res = await fetch("/api/admin/topbar-nav");
        const json = await res.json() as { topbar: NavLink[]; footer: NavLink[] };
        if (json.topbar) setTopbarNav(json.topbar);
        if (json.footer) setFooterNav(json.footer);
      } catch {}
      finally { setNavLoading(false); }
    })();
  }, []);

  function switchLocale(loc: Locale) {
    if (loc === locale) return;
    setLocale(loc);
    if (cacheRef.current[loc]) {
      const cached = cacheRef.current[loc]!;
      setFields(cached.fields);
      setSteps(cached.steps);
    } else {
      void fetchLocale(loc);
    }
  }

  function setField(key: string, value: string) {
    setFields((prev) => ({ ...prev, [key]: value }));
  }

  function setStep(i: number, part: "icon" | "title" | "text", value: string) {
    setSteps((prev) => prev.map((s, idx) => idx === i ? { ...s, [part]: value } : s));
  }

  async function handleSave() {
    setSaved(false);
    setError(null);
    const data: Record<string, unknown> = {};
    for (const tab of TABS) {
      for (const f of tab.fields as readonly FieldDef[]) {
        data[f.key] = displayToValue(fields[f.key] ?? "", f.array);
      }
    }
    data["howitworks_steps"] = steps;
    delete cacheRef.current[locale];
    try {
      const res = await fetch("/api/admin/page-content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locale, data }),
      });
      const json = await res.json() as { ok: boolean };
      if (!json.ok) throw new Error();
      setSaved(true);
      setTimeout(() => startTransition(() => setSaved(false)), 3000);
    } catch {
      setError("Saxlama zamanı xəta baş verdi.");
    }
  }

  const isNavTab = activeTab === "topbar_nav";

  const filteredTabs = search.trim()
    ? TABS.filter((tab) =>
        tab.label.toLowerCase().includes(search.toLowerCase()) ||
        (tab.fields as readonly FieldDef[]).some(
          (f) => f.label.toLowerCase().includes(search.toLowerCase()) || f.key.toLowerCase().includes(search.toLowerCase())
        )
      )
    : TABS;

  const activeTabDef = TABS.find((t) => t.id === activeTab) as TabDef | undefined;

  async function saveNav() {
    setSaved(false);
    setError(null);
    try {
      const res = await fetch("/api/admin/topbar-nav", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topbar: topbarNav, footer: footerNav }),
      });
      const json = await res.json() as { ok: boolean };
      if (!json.ok) throw new Error();
      setSaved(true);
      setTimeout(() => startTransition(() => setSaved(false)), 3000);
    } catch {
      setError("Saxlama zamanı xəta baş verdi.");
    }
  }

  return (
    <RequireAdmin>
      <DashboardShell
        section="admin"
        title="Səhifə Məzmunu"
        description="Saytın ön hissəsindəki bütün mətnləri dil üzrə idarə edin."
      >
        <div className="flex flex-wrap items-center gap-3 mb-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold text-slate-500 mr-1">Dil:</span>
            {LOCALES.map((loc) => (
              <button
                key={loc}
                type="button"
                onClick={() => switchLocale(loc)}
                className={`px-3 py-1.5 rounded-md text-sm font-semibold border transition ${
                  locale === loc
                  ? "bg-blue-600 text-white border-blue-600"
                  : "bg-white text-slate-600 border-slate-300 hover:border-slate-400"
              }`}
            >
              {loc.toUpperCase()}
            </button>
          ))}
          {loading && <span className="text-xs text-slate-400 ml-2">Yüklənir...</span>}
          </div>
          <input
            type="search"
            placeholder="Tab və ya sahə axtar..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="form-field h-9 w-64 rounded-lg px-3 text-sm"
          />
        </div>

        {saved && (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700 mb-2">
            Dəyişikliklər uğurla saxlandı.
          </div>
        )}
        {error && (
          <div className="rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm font-medium text-red-700 mb-2">
            {error}
          </div>
        )}

        <div className="flex flex-wrap gap-1 border-b border-slate-200 mb-4">
          {(search ? filteredTabs : TABS).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => { setActiveTab(tab.id); setSearch(""); setFieldSearch(""); }}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition -mb-px ${
                activeTab === tab.id
                  ? "border-blue-600 text-blue-700"
                  : "border-transparent text-slate-500 hover:text-slate-700"
              }`}
            >
              {tab.label}
            </button>
          ))}
          <button
            key="topbar_nav"
            type="button"
            onClick={() => { setActiveTab("topbar_nav"); setSearch(""); setFieldSearch(""); }}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition -mb-px ${
              activeTab === "topbar_nav"
                ? "border-blue-600 text-blue-700"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            Naviqasiya Linkləri
          </button>
        </div>

        {isNavTab ? (
          <div className="space-y-6">
            <div className="surface-panel p-5">
              <h3 className="text-base font-semibold text-navy-900 mb-4">Topbar naviqasiyası</h3>
              {navLoading ? <p className="text-sm text-slate-400">Yüklənir...</p> : (
                <div className="grid gap-3">
                  {topbarNav.map((item) => (
                    <label key={item.id} className="form-label">
                      {TOPBAR_LABELS[item.id] ?? item.id}
                      <input
                        className="form-field"
                        value={item.href}
                        onChange={(e) => setTopbarNav((prev) => prev.map((n) => n.id === item.id ? { ...n, href: e.target.value } : n))}
                      />
                    </label>
                  ))}
                </div>
              )}
            </div>
            <div className="surface-panel p-5">
              <h3 className="text-base font-semibold text-navy-900 mb-4">Footer naviqasiyası</h3>
              {navLoading ? <p className="text-sm text-slate-400">Yüklənir...</p> : (
                <div className="grid gap-3 sm:grid-cols-2">
                  {footerNav.map((item) => (
                    <label key={item.id} className="form-label">
                      {FOOTER_LABELS[item.id] ?? item.id}
                      <input
                        className="form-field"
                        value={item.href}
                        onChange={(e) => setFooterNav((prev) => prev.map((n) => n.id === item.id ? { ...n, href: e.target.value } : n))}
                      />
                    </label>
                  ))}
                </div>
              )}
            </div>
            <div className="mt-4 flex items-center gap-3">
              <Button onClick={saveNav}>Saxla</Button>
              <span className="text-sm text-slate-400">Topbar və footer linklərini saxla</span>
            </div>
          </div>
        ) : activeTabDef ? (
          <>
        <div className="mb-3">
          <input
            type="search"
            placeholder="Sahə axtar... (ad, açar)"
            value={fieldSearch}
            onChange={(e) => setFieldSearch(e.target.value)}
            className="form-field h-9 w-full max-w-sm rounded-lg px-3 text-sm"
          />
          {fieldSearch && (
            <p className="mt-1 text-xs text-slate-400">
              {(activeTabDef.fields as readonly FieldDef[]).filter((f) =>
                f.label.toLowerCase().includes(fieldSearch.toLowerCase()) ||
                f.key.toLowerCase().includes(fieldSearch.toLowerCase()) ||
                (fields[f.key] ?? "").toLowerCase().includes(fieldSearch.toLowerCase())
              ).length} nəticə
            </p>
          )}
        </div>
        <div className="surface-panel p-5 grid gap-4 sm:grid-cols-2">
          {((activeTabDef.fields as readonly FieldDef[]).filter((f) =>
            !fieldSearch ||
            f.label.toLowerCase().includes(fieldSearch.toLowerCase()) ||
            f.key.toLowerCase().includes(fieldSearch.toLowerCase()) ||
            (fields[f.key] ?? "").toLowerCase().includes(fieldSearch.toLowerCase())
          )).map((f) => (
            <label key={f.key} className={`form-label${f.textarea ? " sm:col-span-2" : ""}`}>
              {f.label}
              {f.array ? (
                <span className="text-xs text-slate-400 font-normal ml-2">(hər sətir ayrı maddə)</span>
              ) : null}
              {f.textarea ? (
                <textarea
                  className="form-field min-h-[80px] font-mono text-sm"
                  value={fields[f.key] ?? ""}
                  onChange={(e) => setField(f.key, e.target.value)}
                />
              ) : (
                <input
                  className="form-field"
                  value={fields[f.key] ?? ""}
                  onChange={(e) => setField(f.key, e.target.value)}
                />
              )}
            </label>
          ))}
        </div>

        {activeTabDef.steps ? (
          <div className="surface-panel p-5 mt-4">
            <h3 className="text-base font-semibold text-navy-900 mb-4">Addımlar</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              {steps.map((step, i) => (
                <div key={i} className="border border-slate-200 rounded-lg p-4 space-y-3">
                  <div className="text-sm font-semibold text-slate-500">Addım {i + 1}</div>
                  <label className="form-label">
                    İkon
                    <select
                      className="form-field"
                      value={step.icon}
                      onChange={(e) => setStep(i, "icon", e.target.value)}
                    >
                      {STEP_ICONS.map((icon) => (
                        <option key={icon} value={icon}>{icon}</option>
                      ))}
                    </select>
                  </label>
                  <label className="form-label">
                    Başlıq
                    <input
                      className="form-field"
                      value={step.title}
                      onChange={(e) => setStep(i, "title", e.target.value)}
                    />
                  </label>
                  <label className="form-label">
                    Mətn
                    <textarea
                      className="form-field"
                      rows={2}
                      value={step.text}
                      onChange={(e) => setStep(i, "text", e.target.value)}
                    />
                  </label>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        <div className="mt-4 flex items-center gap-3">
          <Button onClick={handleSave}>Saxla</Button>
          <span className="text-sm text-slate-400">Seçilmiş dil ({locale.toUpperCase()}) üçün saxlanır</span>
        </div>
          </>
        ) : null}
      </DashboardShell>
    </RequireAdmin>
  );
}

export function AdminStatisticsPageClient() {
  const { owners, listings, banners } = useClassifieds();
  const publicListings = useMemo(() => getPublicListings(listings), [listings]);
  const statusGroups = {
    active: listings.filter((item) => effectiveStatus(item) === "ACTIVE").length,
    pending: listings.filter((item) => effectiveStatus(item) === "PENDING").length,
    rejected: listings.filter((item) => effectiveStatus(item) === "REJECTED").length,
    expired: listings.filter((item) => effectiveStatus(item) === "EXPIRED").length
  };

  return (
    <RequireAdmin>
      <DashboardShell
        section="admin"
        title="Statistika"
        description="MVP classifieds modelinin əsas göstəricilərini bu səhifədə toplayırıq."
      >
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard label="Ümumi elanlar" value={String(listings.length)} icon={<Boxes className="h-5 w-5" />} />
          <MetricCard label="Public görünən" value={String(publicListings.length)} icon={<CheckCircle2 className="h-5 w-5" />} />
          <MetricCard label="Yük sahibləri" value={String(owners.filter((item) => item.role === "CARGO_OWNER").length)} icon={<UserRound className="h-5 w-5" />} />
          <MetricCard label="Aktiv bannerlər" value={String(banners.filter((item) => item.isActive).length)} icon={<Megaphone className="h-5 w-5" />} />
        </div>
        <div className="grid gap-6 lg:grid-cols-[0.85fr,1.15fr]">
          <div className="surface-panel p-6">
            <h2 className="text-xl font-semibold text-navy-900">Status bölgüsü</h2>
            <div className="mt-5 space-y-4">
              {[
                { label: "Aktiv", value: statusGroups.active, icon: <ShieldCheck className="h-4 w-4" /> },
                { label: "Gözləmədə", value: statusGroups.pending, icon: <Clock3 className="h-4 w-4" /> },
                { label: "Rədd edilən", value: statusGroups.rejected, icon: <BarChart3 className="h-4 w-4" /> },
                { label: "Vaxtı keçən", value: statusGroups.expired, icon: <Clock3 className="h-4 w-4" /> }
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between rounded-lg border border-slate-200 px-4 py-3">
                  <div className="flex items-center gap-3 text-sm text-slate-600">
                    <span className="text-logistics-orange">{item.icon}</span>
                    {item.label}
                  </div>
                  <strong className="text-navy-900">{item.value}</strong>
                </div>
              ))}
            </div>
          </div>
          <div className="surface-panel p-6">
            <h2 className="text-xl font-semibold text-navy-900">Son aktivləşən elanlar</h2>
            <div className="mt-5 space-y-3">
              {publicListings.slice(0, 6).map((listing) => (
                <div key={listing.id} className="rounded-lg border border-slate-200 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-medium text-navy-900">{listing.title}</p>
                      <p className="text-sm text-slate-600">
                        {listing.pickupCity} → {listing.deliveryCity}
                      </p>
                    </div>
                    <span className="text-sm text-slate-500">{formatListingDate(listing.approvedAt)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </DashboardShell>
    </RequireAdmin>
  );
}
