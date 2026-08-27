"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { LogOut, Truck, UserRound } from "lucide-react";
import { ButtonLink } from "@/components/ui/Button";
import { useApiAuthUser } from "@/hooks/useApiAuthUser";
import { cn } from "@/lib/utils";
import { LocaleSwitcher } from "@/components/LocaleSwitcher";
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
    <header className="sticky top-0 z-[60] border-b border-navy-100 bg-white/95 backdrop-blur">
      <div className="relative mx-auto flex min-h-16 max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-3 font-bold text-navy-900">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-navy-900 text-white">
            <Truck className="h-5 w-5" aria-hidden />
          </span>
          <span className="text-xl font-extrabold tracking-tight">
            Tranzit.<span className="text-logistics-orange">AZ</span>
          </span>
        </Link>

        <nav className="flex basis-full flex-wrap items-center gap-3 md:basis-auto">
          <Link className="rounded-lg px-3 py-2 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900" href="/">
            {t("nav_home", "Ana səhifə")}
          </Link>
          <Link className="rounded-lg px-3 py-2 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900" href={primaryHref}>
            {primaryLabel}
          </Link>
          <Link className="rounded-lg px-3 py-2 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900" href="/how-it-works">
            {t("nav_howitworks", "Necə işləyir")}
          </Link>

          <LocaleSwitcher />

          {user ? (
            <div className="relative hidden sm:block" ref={dropdownRef}>
              <button type="button" aria-expanded={dropdownOpen} aria-haspopup="menu" aria-label="Profil menyusu"
                onClick={() => setDropdownOpen((open) => !open)}
                className={cn(
                  "inline-flex h-11 cursor-pointer items-center justify-center gap-2 rounded-[14px] border bg-white px-[18px] py-2 text-sm font-semibold text-navy-900 transition duration-200 hover:-translate-y-px hover:bg-navy-50",
                  dropdownOpen ? "border-logistics-orange text-logistics-orange shadow-sm" : "border-[#d9e4f4]"
                )}>
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-logistics-orange/10 text-xs font-bold text-logistics-orange">
                  {userInitial}
                </span>
                <span className="max-w-[150px] truncate">{user.email || user.name}</span>
              </button>

              {dropdownOpen ? (
                <div role="menu" className="absolute right-0 top-full z-[70] w-56 pt-2">
                  <div className="rounded-2xl border border-slate-100 bg-white p-2 shadow-[0_10px_40px_-10px_rgba(0,0,0,0.1)]">
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
                      className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 hover:text-logistics-orange">
                      {role === "ADMIN" ? t("nav_admin_panel", "Admin Paneli") : role === "CARRIER" ? t("nav_active_loads", "Aktiv yüklər") : t("nav_my_listings", "Mənim elanlarım")}
                    </Link>

                    <div className="my-1 border-t border-slate-100" />

                    <button type="button" role="menuitem" onClick={handleLogout}
                      className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-sm font-medium text-red-600 transition-colors hover:bg-red-50">
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
                className="hidden h-11 min-h-11 items-center justify-center gap-2 rounded-[14px] border border-[#d9e4f4] bg-white px-[18px] py-2 text-sm font-semibold text-navy-900 transition duration-200 hover:-translate-y-px hover:bg-navy-50 sm:inline-flex">
                <UserRound className="h-[18px] w-[18px]" />
                {t("login_btn", "Daxil ol")}
              </Link>
              <ButtonLink href="/cargo-owner/cargo-posts/new"
                className="group h-11 min-h-11 rounded-[14px] border-none bg-logistics-orange px-[18px] shadow-sm hover:bg-orange-600">
                <Truck className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden />
                {t("nav_new_listing", "Yeni elan")}
              </ButtonLink>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}