"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { LogOut, Truck, UserRound } from "lucide-react";
import { useApiAuthUser } from "@/hooks/useApiAuthUser";
import { cn } from "@/lib/utils";
import { useLocale } from "@/hooks/useLocale";

export function Navbar({
  user: initialUser
}: { user?: { firstName: string; lastName: string; role?: string } | null } = {}) {
  const { user: sessionUser, legacyUser, logout } = useApiAuthUser();
  const { t } = useLocale();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const user = initialUser
    ? { name: `${initialUser.firstName} ${initialUser.lastName}`, email: "", role: initialUser.role ?? "USER" }
    : sessionUser
      ? { name: `${sessionUser.firstName} ${sessionUser.lastName}`, email: sessionUser.email, role: sessionUser.role }
      : legacyUser
        ? { name: legacyUser.name, email: legacyUser.email, role: legacyUser.role }
        : null;

  const userInitial = (user?.name || user?.email || "U").trim().charAt(0).toUpperCase();

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setDropdownOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  const handleLogout = async () => {
    setDropdownOpen(false);
    await logout();
  };

  const role = user?.role;
  const primaryHref =
    role === "CARRIER" ? "/carrier/cargo-posts"
    : role === "CARGO_OWNER" ? "/cargo-owner/cargo-posts/new"
    : user ? "/cargo-owner/dashboard"
    : "/login";
  const primaryLabel =
    role === "CARRIER" ? t("nav_active_loads", "Aktiv yüklər")
    : role === "CARGO_OWNER" ? t("nav_new_listing", "Yeni elan")
    : user ? t("nav_panel", "Panel")
    : t("nav_new_listing", "Yeni elan");

  return (
    <header className="sticky top-0 z-[60] w-full bg-logistics-orange shadow-sm">
      <div className="relative mx-auto flex min-h-16 w-full max-w-[1280px] items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/20">
            <Truck className="h-5 w-5 text-white" aria-hidden />
          </span>
          <span className="text-xl font-extrabold tracking-tight text-white">
            Tranzit.AZ
          </span>
        </Link>

        <nav className="hidden items-center gap-1 sm:flex">
          <Link className="rounded-lg px-3 py-2 text-sm font-semibold text-white/90 transition-colors hover:bg-white/15 hover:text-white" href="/">
            {t("nav_home", "Ana səhifə")}
          </Link>
          <Link className="rounded-lg px-3 py-2 text-sm font-semibold text-white/90 transition-colors hover:bg-white/15 hover:text-white" href={primaryHref}>
            {primaryLabel}
          </Link>
          <Link className="rounded-lg px-3 py-2 text-sm font-semibold text-white/90 transition-colors hover:bg-white/15 hover:text-white" href="/how-it-works">
            {t("nav_howitworks", "Necə işləyir")}
          </Link>

          {user ? (
            <div className="relative hidden sm:block" ref={dropdownRef}>
              <button type="button" aria-expanded={dropdownOpen} aria-haspopup="menu" aria-label="Profil menyusu"
                onClick={() => setDropdownOpen((open) => !open)}
                className={cn(
                  "inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-lg border border-white/30 bg-white/15 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/25",
                  dropdownOpen && "bg-white/25"
                )}>
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white/30 text-xs font-bold text-white">
                  {userInitial}
                </span>
                <span className="max-w-[150px] truncate">{user.email || user.name}</span>
              </button>

              {dropdownOpen ? (
                <div role="menu" className="absolute right-0 top-full z-[70] w-56 pt-2">
                  <div className="rounded-xl border border-slate-100 bg-white p-2 shadow-lg">
                    <div className="mb-1 flex items-center gap-3 border-b border-slate-100 px-3 py-3">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-logistics-orange/10 text-lg font-bold text-logistics-orange">
                        {userInitial}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium text-slate-500">{t("nav_welcome", "Xoş gəldiniz")}</p>
                        <p className="truncate text-sm font-bold text-navy-900">{user.name || t("nav_user", "İstifadəçi")}</p>
                      </div>
                    </div>

                    <Link
                      href={role === "ADMIN" ? "/octo-admin" : role === "CARRIER" ? "/carrier/cargo-posts" : "/cargo-owner/dashboard"}
                      role="menuitem"
                      onClick={() => setDropdownOpen(false)}
                      className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 hover:text-logistics-orange">
                      {role === "ADMIN" ? t("nav_admin_panel", "Admin Paneli") : role === "CARRIER" ? t("nav_active_loads", "Aktiv yüklər") : t("nav_my_listings", "Mənim elanlarım")}
                    </Link>

                    <div className="my-1 border-t border-slate-100" />

                    <button type="button" role="menuitem" onClick={handleLogout}
                      className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm font-medium text-red-600 transition-colors hover:bg-red-50">
                      <LogOut className="h-[18px] w-[18px]" />
                      <span>{t("nav_logout", "Çıxış et")}</span>
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          ) : (
            <>
              <Link href="/login"
                className="hidden h-10 items-center justify-center gap-2 rounded-lg border border-white/30 bg-white/15 px-4 text-sm font-semibold text-white transition hover:bg-white/25 sm:inline-flex">
                <UserRound className="h-[18px] w-[18px]" />
                {t("login_btn", "Daxil ol")}
              </Link>
              <Link href="/cargo-owner/cargo-posts/new"
                className="hidden h-10 items-center justify-center gap-2 rounded-lg bg-white px-4 text-sm font-semibold text-logistics-orange transition hover:bg-orange-50 sm:inline-flex">
                <Truck className="h-4 w-4" aria-hidden />
                {t("nav_new_listing", "Yeni elan")}
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
