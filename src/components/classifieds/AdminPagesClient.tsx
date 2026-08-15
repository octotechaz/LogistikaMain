"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  Boxes,
  CheckCircle2,
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

  const statusOptions = [
    { value: "PENDING", label: "Gözləyir" },
    { value: "APPROVED", label: "Təsdiqlənib" },
    { value: "REJECTED", label: "Rədd edilib" }
  ];

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
              .map((listing) => (
                <div key={listing.id} className="surface-panel p-5">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-3">
                        <h2 className="text-lg font-semibold text-navy-900">{listing.title}</h2>
                        <StatusBadge status={effectiveStatus(listing)} />
                      </div>
                      <p className="mt-2 text-sm text-slate-600">
                        {listing.pickupCity} → {listing.deliveryCity} • {listing.ownerName}
                      </p>
                      <p className="mt-1 text-sm text-slate-500 line-clamp-2">{listing.description}</p>
                    </div>
                    <div className="flex flex-col gap-3 sm:items-end">
                      {effectiveStatus(listing) === "PENDING" ? (
                        <div className="flex flex-col gap-2">
                          <select
                            disabled={busyId === listing.id}
                            onChange={(event) => {
                              const newStatus = event.target.value as "APPROVED" | "REJECTED";
                              if (newStatus === "REJECTED") {
                                setReasons((current) => ({ ...current, [listing.id]: "" }));
                              }
                              setAdminStatus(listing.id, newStatus, newStatus === "REJECTED" ? reasons[listing.id] : undefined);
                            }}
                            className="form-select form-select-sm w-full sm:w-auto"
                            defaultValue=""
                          >
                            <option value="" disabled>Status seçin</option>
                            <option value="APPROVED">Təsdiq et</option>
                            <option value="REJECTED">Rədd et</option>
                          </select>
                        </div>
                      ) : (
                        <select
                          disabled={busyId === listing.id}
                          onChange={(event) => setAdminStatus(listing.id, event.target.value as "PENDING" | "APPROVED")}
                          className="form-select form-select-sm w-full sm:w-auto"
                          defaultValue={effectiveStatus(listing)}
                        >
                          <option value="APPROVED">Aktiv et</option>
                          <option value="PENDING">Gözləyirə göndər</option>
                          {effectiveStatus(listing) === "REJECTED" && (
                            <option value="PENDING">Yenidən gözləməyə al</option>
                          )}
                        </select>
                      )}
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
                  {effectiveStatus(listing) === "REJECTED" ? (
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
              ))}
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
