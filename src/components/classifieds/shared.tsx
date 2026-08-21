"use client";

import {
  AnimatePresence,
  LayoutGroup,
  motion,
  type Transition
} from "framer-motion";
import { usePathname, useRouter } from "next/navigation";
import { startTransition, useEffect, useRef, useState, type MouseEvent } from "react";
import { createPortal } from "react-dom";
import { useApiAuthUser } from "@/hooks/useApiAuthUser";
import {
  ArrowRight,
  Clock3,
  LayoutDashboard,
  List,
  LogOut,
  MapPin,
  MessageCircleMore,
  PhoneCall,
  Plus,
  Send,
  ShieldCheck,
  Truck,
  UserRound,
  Menu,
  X
} from "lucide-react";
import { StatusBadge } from "@/components/StatusBadge";
import { listingVisualTone } from "@/lib/listing-visual";
import { FavoriteNavLink } from "@/components/classifieds/FavoriteNavLink";
import { Button, ButtonLink } from "@/components/ui/Button";
import Image from "next/image";
import NextLink from "next/link";
import { FastLink as Link } from "@/components/ui/FastLink";
import { formatListingDate, formatPriceCompact, formatWeight } from "@/lib/classifieds-format";
import { effectiveStatus, listingStatusLabels } from "@/lib/status/classifieds";
import { footerNavItems, getActiveTopbarItemId, topbarNavItems } from "@/lib/topbar";
import { cn } from "@/lib/utils";
import type { CargoListing } from "@/types/classifieds";
import { LocaleSwitcher } from "@/components/LocaleSwitcher";
import { useLocale } from "@/hooks/useLocale";

const topbarTabTransition: Transition = {
  type: "spring",
  stiffness: 260,
  damping: 30,
  mass: 0.9
};

const pageTransition: Transition = {
  duration: 0.32,
  ease: [0.22, 1, 0.36, 1]
};

export function AppLogo() {
  return (
    <Link href="/" className="flex shrink-0 items-center leading-none text-navy-900">
      <span className="whitespace-nowrap text-[1.15rem] sm:text-xl md:text-2xl font-extrabold tracking-tight">
        Tranzit.<span className="text-logistics-orange">AZ</span>
      </span>
    </Link>
  );
}

const NAV_LABEL_KEYS: Record<string, string> = {
  loads: "nav_loads",
  about: "nav_about",
  help: "nav_howitworks",
};

export function PublicNavbar() {
  const router = useRouter();
  const pathname = usePathname();
  const { t } = useLocale();
  const resolvedTopbarItemId = getActiveTopbarItemId(pathname);
  const [optimisticTopbarItemId, setOptimisticTopbarItemId] = useState(resolvedTopbarItemId);
  const activeTopbarItemId = optimisticTopbarItemId;
  const showFavorites = true;
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [portalReady, setPortalReady] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setPortalReady(true);
  }, []);

  useEffect(() => {
    if (!mobileMenuOpen) {
      return;
    }
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [mobileMenuOpen]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: globalThis.MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const { user: sessionUser, legacyUser, logout } = useApiAuthUser();

  const user = sessionUser
    ? {
        name: `${sessionUser.firstName} ${sessionUser.lastName}`,
        email: sessionUser.email,
        role: sessionUser.role
      }
    : legacyUser
      ? {
          name: legacyUser.name,
          email: legacyUser.email,
          role: legacyUser.role
        }
      : null;

  const userInitial = (user?.name || user?.email || "U").trim().charAt(0).toUpperCase();
  const publishLabel = user?.role === "CARRIER" ? "Aktiv yüklər" : "Yeni elan";

  const handleLogout = async () => {
    await logout();
  };

  useEffect(() => {
    setOptimisticTopbarItemId(resolvedTopbarItemId);
  }, [resolvedTopbarItemId]);

  function handleTopbarClick(itemId: string, href: string, event: MouseEvent<HTMLAnchorElement>) {
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    ) {
      return;
    }

    setOptimisticTopbarItemId(itemId);
    if (href === pathname) {
      return;
    }

    event.preventDefault();
    router.push(href);
  }

  function goPublish() {
    if (!user) {
      router.push("/login");
      return;
    }
    if (user.role === "CARRIER") {
      router.push("/carrier/cargo-posts");
      return;
    }
    router.push("/cargo-owner/cargo-posts/new");
  }

  const mobileMenu =
    portalReady && mobileMenuOpen
      ? createPortal(
          <AnimatePresence>
            <motion.div
              key="public-mobile-menu"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.16, ease: "easeOut" }}
              className="fixed inset-0 z-[80] md:hidden"
            >
              <button
                type="button"
                aria-label="Menyunu bağla"
                className="absolute inset-0 bg-slate-900/35"
                onClick={() => setMobileMenuOpen(false)}
              />
              <motion.nav
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.16, ease: "easeOut" }}
                className="relative mx-3 mt-[4.5rem] flex max-h-[calc(100dvh-5.5rem)] flex-col gap-2 overflow-y-auto rounded-[20px] border border-slate-200 bg-white px-4 py-5 shadow-[0_18px_46px_rgba(15,23,42,0.16)]"
              >
                {topbarNavItems.map((item) => {
                  const isActive = item.id === activeTopbarItemId;
                  return (
                    <Link
                      key={item.id}
                      href={item.href}
                      onClick={(event) => {
                        handleTopbarClick(item.id, item.href, event);
                        setMobileMenuOpen(false);
                      }}
                      className={cn(
                        "flex min-h-12 items-center rounded-[14px] px-4 text-[1.05rem] font-semibold transition-colors",
                        isActive
                          ? "bg-orange-50 text-logistics-orange"
                          : "text-slate-600 hover:bg-slate-50 hover:text-navy-900"
                      )}
                    >
                      {t(NAV_LABEL_KEYS[item.id] ?? "", item.label)}
                    </Link>
                  );
                })}

                <div className="my-2 h-px bg-slate-100" />

                {user ? (
                  <div className="space-y-1.5">
                    <div className="flex min-h-12 min-w-0 items-center gap-3 rounded-[14px] bg-slate-50 px-4 text-[1rem] font-semibold text-navy-900">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-logistics-orange/10 text-base font-bold text-logistics-orange">
                        {userInitial}
                      </span>
                      <span className="min-w-0 truncate">{user.email}</span>
                    </div>

                    <Link
                      href={user.role === "CARRIER" ? "/carrier/dashboard" : "/cargo-owner/dashboard"}
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex min-h-11 items-center gap-3 rounded-[14px] px-4 text-[0.98rem] font-semibold text-slate-600 transition-colors hover:bg-slate-50 hover:text-navy-900"
                    >
                      <LayoutDashboard className="h-[18px] w-[18px] shrink-0" />
                      <span>Dashboard</span>
                    </Link>

                    <Link
                      href={user.role === "CARRIER" ? "/carrier/cargo-posts" : "/cargo-owner/cargo-posts"}
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex min-h-11 items-center gap-3 rounded-[14px] px-4 text-[0.98rem] font-semibold text-slate-600 transition-colors hover:bg-slate-50 hover:text-navy-900"
                    >
                      <List className="h-[18px] w-[18px] shrink-0" />
                      <span>{user.role === "CARRIER" ? "Aktiv yüklər" : "Mənim elanlarım"}</span>
                    </Link>

                    <button
                      type="button"
                      onClick={() => {
                        setMobileMenuOpen(false);
                        handleLogout();
                      }}
                      className="flex min-h-11 w-full items-center gap-3 rounded-[14px] px-4 text-left text-[0.98rem] font-semibold text-red-600 transition-colors hover:bg-red-50"
                    >
                      <LogOut className="h-[18px] w-[18px] shrink-0" />
                      <span>Çıxış et</span>
                    </button>
                  </div>
                ) : (
                  <Link
                    href="/login"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex min-h-12 items-center gap-3 rounded-[14px] px-4 text-[1.05rem] font-semibold text-slate-600 transition-colors hover:bg-slate-50 hover:text-navy-900"
                  >
                    <UserRound className="h-[18px] w-[18px] shrink-0" />
                    <span>Daxil ol / Qeydiyyat</span>
                  </Link>
                )}
              </motion.nav>
            </motion.div>
          </AnimatePresence>,
          document.body
        )
      : null;

  return (
    <>
      <header className="sticky top-0 z-[60] w-full min-w-0 max-w-full px-0 md:px-4 md:pt-3 lg:px-6">
        <div className="relative mx-auto w-full min-w-0 max-w-[1780px] border-b border-slate-200 bg-white/96 shadow-[0_8px_24px_rgba(15,23,42,0.06)] backdrop-blur-xl transition-shadow duration-200 md:rounded-[24px] md:border md:border-white/70 md:bg-white/88 md:shadow-[0_14px_34px_rgba(15,23,42,0.07)]">
          <div className="flex h-16 min-w-0 items-center justify-between gap-2 px-4 md:h-auto md:gap-5 md:px-5 md:py-2 lg:px-7">
            <AppLogo />

            <nav className="hidden items-center gap-1 text-[0.9rem] font-semibold text-navy-900 md:flex xl:gap-1.5 xl:text-[0.98rem]">
              <LayoutGroup id="public-topbar-tabs">
                {topbarNavItems.map((item) => {
                  const isActive = item.id === activeTopbarItemId;

                  return (
                    <Link
                      key={item.id}
                      href={item.href}
                      aria-current={isActive ? "page" : undefined}
                      onClick={(event) => handleTopbarClick(item.id, item.href, event)}
                      className={cn(
                        "relative isolate inline-flex min-h-11 items-center gap-1.5 px-2.5 text-slate-600 transition-colors duration-200 ease-out hover:text-navy-900 xl:px-3.5",
                        isActive ? "text-navy-900" : ""
                      )}
                    >
                      <span className="relative z-10">{t(NAV_LABEL_KEYS[item.id] ?? "", item.label)}</span>
                      {isActive ? (
                        <motion.span
                          layoutId="topbar-active-underline"
                          className="absolute inset-x-3 bottom-[7px] h-[2px] rounded-full bg-logistics-orange/90"
                          transition={topbarTabTransition}
                        />
                      ) : null}
                    </Link>
                  );
                })}
              </LayoutGroup>
            </nav>

            <div className="flex shrink-0 items-center gap-1.5 sm:gap-3">
              <LocaleSwitcher className="hidden sm:flex" />
              {showFavorites ? <FavoriteNavLink /> : null}

              {user ? (
                <div className="relative hidden md:inline-block" ref={dropdownRef}>
                  <button
                    type="button"
                    onClick={() => setDropdownOpen(!dropdownOpen)}
                    aria-label="Profil menyusunu ac"
                    className={cn(
                      "inline-flex h-11 w-11 cursor-pointer items-center justify-center overflow-hidden rounded-full border bg-white text-sm font-bold transition duration-200 hover:-translate-y-px hover:bg-navy-50",
                      dropdownOpen
                        ? "border-logistics-orange text-logistics-orange shadow-sm"
                        : "border-[#d9e4f4] text-navy-900"
                    )}
                  >
                    <span className="flex h-full w-full items-center justify-center bg-logistics-orange/10 text-logistics-orange">
                      {userInitial}
                    </span>
                  </button>

                  <AnimatePresence>
                    {dropdownOpen ? (
                      <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        transition={{ duration: 0.15 }}
                        className="absolute right-0 top-full z-[70] w-56 pt-2"
                      >
                        <div className="rounded-2xl border border-slate-100 bg-white p-2 shadow-[0_10px_40px_-10px_rgba(0,0,0,0.1)]">
                          <div className="mb-1 flex items-center gap-3 border-b border-slate-100 px-3 py-3">
                            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-logistics-orange/10 text-lg font-bold text-logistics-orange">
                              {userInitial}
                            </span>
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-medium text-slate-500">Xoş gəldiniz</p>
                              <p className="truncate text-sm font-bold text-navy-900">
                                {user?.name || "İstifadəçi"}
                              </p>
                            </div>
                          </div>

                          <Link
                            href={user.role === "CARRIER" ? "/carrier/cargo-posts" : "/cargo-owner/cargo-posts"}
                            className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 hover:text-logistics-orange"
                          >
                            <List className="h-[18px] w-[18px]" />
                            <span>{user.role === "CARRIER" ? "Aktiv yüklər" : "Mənim elanlarım"}</span>
                          </Link>

                          <div className="my-1 border-t border-slate-100" />

                          <button
                            type="button"
                            onClick={handleLogout}
                            className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-sm font-medium text-red-600 transition-colors hover:bg-red-50"
                          >
                            <LogOut className="h-[18px] w-[18px]" />
                            <span>Çıxış et</span>
                          </button>
                        </div>
                      </motion.div>
                    ) : null}
                  </AnimatePresence>
                </div>
              ) : (
                <Link
                  href="/login"
                  className="hidden h-11 min-h-11 items-center justify-center gap-2 rounded-[14px] border border-[#d9e4f4] bg-white px-[18px] py-2 text-sm font-semibold text-navy-900 transition duration-200 hover:-translate-y-px hover:bg-navy-50 md:inline-flex"
                >
                  <UserRound className="h-[18px] w-[18px]" />
                  Daxil ol
                </Link>
              )}

              <button
                type="button"
                onClick={goPublish}
                className="inline-flex h-10 w-10 items-center justify-center rounded-[14px] bg-logistics-orange px-0 text-white md:hidden"
              >
                <Plus className="h-5 w-5" />
              </button>
              <Button
                onClick={goPublish}
                className="hidden min-h-11 rounded-[14px] bg-logistics-orange px-5 shadow-sm hover:bg-orange-600 md:inline-flex"
              >
                <Plus className="mr-1.5 h-[18px] w-[18px] opacity-90" />
                {publishLabel}
              </Button>

              <button
                type="button"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                aria-expanded={mobileMenuOpen}
                aria-label={mobileMenuOpen ? "Menyunu bağla" : "Menyunu aç"}
                className="inline-flex h-10 w-10 items-center justify-center rounded-[14px] bg-slate-100 px-0 text-slate-700 transition-colors hover:bg-slate-200 md:hidden"
              >
                {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
            </div>
          </div>
        </div>
      </header>
      {mobileMenu}
    </>
  );
}

const FOOTER_DEFAULTS = {
  phone: "+994 50 123 45 67",
  whatsapp: "994501234567",
  email: "info@tranzit.az",
  telegram: "tranzitaz",
  workHours: "Hər gün 09:00-20:00",
  copyright: "© 2026 Tranzit.AZ. Bütün hüquqlar qorunur.",
  tagline: "Yük elanları və daşıma əlaqələri üçün public platforma.",
};

const FOOTER_NAV_LABEL_KEYS: Record<string, string> = {
  about: "nav_about",
  contact: "nav_contact",
};

export function PublicFooter() {
  const pathname = usePathname();
  const { t } = useLocale();
  const legalLinks = footerNavItems.filter((item) => ["terms", "privacy", "rules"].includes(item.id));
  const platformLinks = footerNavItems.filter((item) => !["terms", "privacy", "rules"].includes(item.id));
  const [fs, setFs] = useState(FOOTER_DEFAULTS);

  useEffect(() => {
    fetch("/api/public/footer-settings")
      .then((r) => r.ok ? r.json() : null)
      .then((data) => { if (data) setFs({ ...FOOTER_DEFAULTS, ...data }); })
      .catch(() => {});
  }, []);

  return (
    <footer className="shrink-0 border-t border-slate-200 bg-white px-3 pb-4 pt-4 sm:px-4 lg:px-6 lg:pb-6">
      <div className="mx-auto max-w-[1780px] overflow-hidden rounded-[22px] border border-slate-200/80 bg-white text-[0.95rem] text-slate-500 shadow-[0_12px_30px_rgba(15,23,42,0.05)]">
        <div className="grid gap-8 px-5 py-6 sm:px-7 lg:grid-cols-[1.3fr,0.75fr,0.75fr,1fr] lg:px-8">
          <div>
            <Link href="/" className="flex shrink-0 items-center text-navy-900">
              <span className="text-2xl font-extrabold leading-none">
                Tranzit.<span className="text-logistics-orange">AZ</span>
              </span>
            </Link>
            <p className="mt-3 max-w-sm text-sm leading-6 text-slate-500">
              Yük sahibləri və daşıyıcılar üçün sadə, şəffaf və birbaşa əlaqə yaradan elan platforması.
            </p>
          </div>

          <div>
            <h3 className="text-sm font-bold uppercase tracking-[0.12em] text-navy-900">{t("footer_platform", "Platforma")}</h3>
            <div className="mt-4 grid gap-2.5">
              {platformLinks.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.id}
                    href={item.href}
                    className={cn("w-fit transition", isActive ? "font-semibold text-logistics-orange" : "hover:text-navy-900")}
                  >
                    {t(FOOTER_NAV_LABEL_KEYS[item.id] ?? "", item.label)}
                  </Link>
                );
              })}
            </div>
          </div>

          <div>
            <h3 className="text-sm font-bold uppercase tracking-[0.12em] text-navy-900">{t("footer_legal", "Hüquqi")}</h3>
            <div className="mt-4 grid gap-2.5">
              {legalLinks.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.id}
                    href={item.href}
                    className={cn("w-fit transition", isActive ? "font-semibold text-logistics-orange" : "hover:text-navy-900")}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>

          <div>
            <h3 className="text-sm font-bold uppercase tracking-[0.12em] text-navy-900">{t("footer_support", "Dəstək")}</h3>
            <a
              href={`tel:${fs.phone}`}
              className="mt-4 inline-block font-semibold text-navy-900 transition hover:text-logistics-orange"
            >
              {fs.phone}
            </a>
            <p className="mt-1 text-sm text-slate-500">{t("footer_work_hours", fs.workHours)}</p>
            <div className="mt-4 flex items-center gap-2.5">
              <a
                href={`https://wa.me/${fs.whatsapp}`}
                target="_blank"
                rel="noreferrer"
                aria-label="WhatsApp"
                className="flex h-10 w-10 items-center justify-center rounded-[12px] bg-emerald-50 text-emerald-600 transition hover:bg-emerald-100"
              >
                <PhoneCall className="h-[18px] w-[18px]" />
              </a>
              <a
                href={`mailto:${fs.email}`}
                aria-label="E-poçt"
                className="flex h-10 w-10 items-center justify-center rounded-[12px] bg-sky-50 text-sky-600 transition hover:bg-sky-100"
              >
                <MessageCircleMore className="h-[18px] w-[18px]" />
              </a>
              <a
                href={`https://t.me/${fs.telegram}`}
                target="_blank"
                rel="noreferrer"
                aria-label="Telegram"
                className="flex h-10 w-10 items-center justify-center rounded-[12px] bg-blue-50 text-blue-600 transition hover:bg-blue-100"
              >
                <Send className="h-[18px] w-[18px]" />
              </a>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2 border-t border-slate-200/80 px-5 py-4 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:px-7 lg:px-8">
          <p>{t("footer_copyright", fs.copyright)}</p>
          <p>{t("footer_tagline", fs.tagline)}</p>
        </div>
      </div>
    </footer>
  );
}

export function PublicPage({
  children,
  emphasizeBackground = false
}: {
  children: React.ReactNode;
  emphasizeBackground?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex min-h-screen min-w-0 max-w-full flex-col bg-[#f8fafc]",
        emphasizeBackground && "bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_22%,#f8fafc_100%)]"
      )}
    >
      <PublicNavbar />
      <motion.main
        className="flex min-h-[calc(100vh-260px)] min-w-0 flex-1 flex-col overflow-x-clip pt-4 lg:pt-5"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={pageTransition}
      >
        {children}
      </motion.main>
      <PublicFooter />
    </div>
  );
}

export function PageSection({
  title,
  eyebrow,
  description,
  action
}: {
  title: string;
  eyebrow?: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4 mb-2">
      <div className="max-w-3xl">
        {eyebrow ? <p className="text-sm font-medium text-logistics-orange uppercase tracking-wider mb-1">{eyebrow}</p> : null}
        <h1 className="text-[1.75rem] font-bold tracking-tight text-slate-800 m-0 leading-tight">{title}</h1>
        {description ? <p className="mt-1.5 text-[15px] leading-relaxed text-slate-500">{description}</p> : null}
      </div>
      {action}
    </div>
  );
}

export function DashboardShell({
  title,
  description,
  children,
  section,
  action,
  sessionUser
}: {
  title?: string;
  description?: string;
  children: React.ReactNode;
  section: "owner" | "admin" | "carrier";
  action?: React.ReactNode;
  sessionUser?: { firstName: string; lastName: string; phone: string; role: string } | null;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { logout } = useApiAuthUser();
  const [pendingHref, setPendingHref] = useState<string | null>(null);
  const prefetchedRef = useRef<Set<string>>(new Set());

  const navItems =
    section === "owner"
      ? [
          { href: "/cargo-owner/dashboard", label: "Mənim elanlarım", icon: "ri-list-check-3" },
          { href: "/cargo-owner/cargo-posts/new", label: "Yeni elan", icon: "ri-add-box-line" }
        ]
      : section === "carrier"
        ? [
            { href: "/carrier/dashboard", label: "Dashboard", icon: "ri-dashboard-3-line" },
            { href: "/carrier/cargo-posts", label: "Aktiv yüklər", icon: "ri-truck-line" },
            { href: "/carrier/applications", label: "Müraciətlərim", icon: "ri-file-list-3-line" },
            { href: "/carrier/vehicles", label: "Avtomobillər", icon: "ri-car-line" }
          ]
        : [
            { href: "/admin/dashboard", label: "Ümumi görünüş", icon: "ri-dashboard-3-line" },
            { href: "/admin/users", label: "İstifadəçilər", icon: "ri-group-line" },
            { href: "/admin/loads", label: "Elanlar", icon: "ri-article-line" },
            { href: "/admin/categories", label: "Kateqoriyalar", icon: "ri-function-line" },
            { href: "/admin/banners", label: "Bannerlər", icon: "ri-image-line" },
            { href: "/admin/statistics", label: "Statistika", icon: "ri-bar-chart-box-line" }
          ];

  const sectionMeta =
    section === "owner"
      ? { panel: "Yük Sahibi Paneli", name: sessionUser?.firstName || "Yük Sahibi" }
      : section === "carrier"
        ? { panel: "Daşıyıcı Panel", name: sessionUser?.firstName || "Daşıyıcı" }
        : { panel: "Admin Panel", name: "Admin İstifadəçi" };

  const rootPaths = new Set(["/cargo-owner/dashboard", "/carrier/dashboard", "/admin/dashboard"]);

  useEffect(() => {
    setPendingHref(null);
  }, [pathname]);

  useEffect(() => {
    for (const item of navItems) {
      if (prefetchedRef.current.has(item.href)) {
        continue;
      }
      prefetchedRef.current.add(item.href);
      router.prefetch(item.href);
    }
    // Prefetch once per mounted shell / section.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [section, router]);

  function isNavActive(href: string) {
    const current = pendingHref || pathname;
    if (current === href) {
      return true;
    }
    if (rootPaths.has(href)) {
      return false;
    }
    return current.startsWith(`${href}/`) || current.startsWith(href);
  }

  function goTo(href: string, event?: MouseEvent<HTMLAnchorElement>) {
    if (event?.metaKey || event?.ctrlKey || event?.shiftKey || event?.altKey) {
      return;
    }
    event?.preventDefault();
    if (href === pathname) {
      setPendingHref(null);
      return;
    }
    setPendingHref(href);
    startTransition(() => {
      router.push(href);
    });
  }

  return (
    <div className="relative min-h-screen bg-[#f4f6f9]">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[280px] flex-col border-r border-slate-200 bg-white shadow-sm lg:flex">
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
          <div className="flex h-[72px] shrink-0 items-center border-b border-slate-100 px-6">
            <AppLogo />
          </div>

          <div className="shrink-0 border-b border-slate-100 p-6">
            <p className="mb-1 text-xs font-bold uppercase tracking-wider text-slate-400">{sectionMeta.panel}</p>
            <h3 className="truncate text-[15px] font-semibold text-slate-800">{sectionMeta.name}</h3>
          </div>

          <nav className="space-y-1 p-4">
            {navItems.map((item) => {
              const active = isNavActive(item.href);
              const pending = pendingHref === item.href && pathname !== item.href;
              return (
                <NextLink
                  key={item.href}
                  href={item.href}
                  prefetch
                  onClick={(event) => goTo(item.href, event)}
                  onMouseEnter={() => router.prefetch(item.href)}
                  className={cn(
                    "relative z-10 flex cursor-pointer items-center gap-3 rounded-xl px-4 py-3 text-[15px] font-medium transition-colors duration-100",
                    active
                      ? "bg-blue-50 font-semibold text-blue-700"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900",
                    pending && "ring-2 ring-blue-100"
                  )}
                >
                  <i
                    className={cn(
                      item.icon,
                      "pointer-events-none text-[18px]",
                      active ? "text-blue-600" : "text-slate-400"
                    )}
                    aria-hidden
                  />
                  <span className="pointer-events-none">{item.label}</span>
                </NextLink>
              );
            })}
          </nav>
        </div>

        <div className="shrink-0 space-y-2 border-t border-slate-200 bg-slate-50/50 p-4">
          <ButtonLink
            href="/"
            variant="secondary"
            className="h-11 w-full justify-start border-slate-200 bg-white px-4 text-slate-700 shadow-sm hover:bg-slate-50"
          >
            <i className="ri-home-4-line mr-2 text-[18px] text-slate-400"></i>
            Sayta bax
          </ButtonLink>

          <Button
            variant="ghost"
            className="h-11 w-full justify-start px-4 text-red-600 hover:bg-red-50 hover:text-red-700"
            onClick={logout}
          >
            <i className="ri-logout-box-line mr-2 text-[18px] opacity-80"></i>
            Çıxış et
          </Button>
        </div>
      </aside>

      <main className="relative z-0 flex min-h-screen flex-col lg:pl-[280px]">
        <header className="sticky top-0 z-30 flex h-[72px] shrink-0 items-center gap-3 border-b border-slate-200 bg-white px-4 shadow-sm lg:hidden">
          <AppLogo />
          <div className="flex min-w-0 flex-1 items-center gap-2 overflow-x-auto pb-1">
            {navItems.map((item) => {
              const active = isNavActive(item.href);
              return (
                <NextLink
                  key={item.href}
                  href={item.href}
                  prefetch
                  onClick={(event) => goTo(item.href, event)}
                  onMouseEnter={() => router.prefetch(item.href)}
                  className={cn(
                    "shrink-0 whitespace-nowrap rounded-lg px-3 py-2 text-xs font-semibold transition-colors duration-100",
                    active ? "bg-blue-50 text-blue-700" : "bg-slate-50 text-slate-600"
                  )}
                >
                  {item.label}
                </NextLink>
              );
            })}
          </div>
        </header>

        <div className="w-full flex-1 p-6 lg:p-10">
          <div className="mx-auto max-w-[1200px] space-y-8">
            {title ? <PageSection title={title} description={description} action={action} /> : null}
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}

export function ListingSummaryCard({
  listing,
  href = `/loads/${listing.id}`,
  hideStatus = false,
  actionNode
}: {
  listing: CargoListing;
  href?: string;
  hideStatus?: boolean;
  actionNode?: React.ReactNode;
}) {
  const imageUrl = listing.photo || (listing.photos && listing.photos.length > 0 ? listing.photos[0] : null);
  const placeholderTone = listingVisualTone(listing);
  const PlaceholderIcon = placeholderTone.icon;

  return (
    <Link href={href} className="surface-panel block overflow-hidden transition hover:border-logistics-orange/40">
      <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center">
        <div className="relative flex h-24 w-full shrink-0 items-center justify-center overflow-hidden rounded-2xl sm:w-24">
          {imageUrl ? (
            <Image
              src={imageUrl}
              alt={listing.title}
              fill
              sizes="96px"
              unoptimized
              className="object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
                if (e.target && (e.target as HTMLImageElement).parentElement) {
                  const fallbackIcon = (e.target as HTMLImageElement).parentElement?.querySelector(".fallback-icon");
                  if (fallbackIcon) fallbackIcon.classList.remove("hidden");
                }
              }}
            />
          ) : null}
          <div
            className={cn(
              "fallback-icon flex h-full w-full items-center justify-center",
              placeholderTone.panel,
              imageUrl ? "absolute inset-0 hidden" : ""
            )}
          >
            <PlaceholderIcon className="h-9 w-9" />
          </div>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="truncate text-2xl font-bold text-navy-900">{listing.title}</h3>
              <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-slate-600">
                <MapPin className="h-4 w-4 text-logistics-orange" />
                {listing.pickupCity}
                <ArrowRight className="h-3.5 w-3.5 text-slate-400" />
                {listing.deliveryCity}
              </p>
            </div>
            <div className="text-right flex flex-col items-end gap-3">
              <div className="flex items-center gap-2">
                {actionNode && <div onClick={(e) => e.preventDefault()}>{actionNode}</div>}
                {!hideStatus && <StatusBadge status={effectiveStatus(listing)} />}
              </div>
              <div>
                <p className={`text-3xl font-bold text-navy-900 ${hideStatus && !actionNode ? '' : ''}`}>
                  {formatPriceCompact(listing.price)}
                </p>
                <p className="mt-1 text-xs text-slate-500">{formatListingDate(listing.createdAt)}</p>
              </div>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm text-slate-600">
            <span>{listing.cargoType}</span>
            <span>{formatWeight(listing.weight)}</span>
            <span>{listing.vehicleType || "Nəqliyyat sərbəstdir"}</span>
          </div>
          <p className="mt-3 line-clamp-2 text-sm leading-6 text-slate-500">{listing.description}</p>
        </div>
      </div>
    </Link>
  );
}

export function ListingsTable({
  listings,
  title,
  viewAllHref
}: {
  listings: CargoListing[];
  title: string;
  viewAllHref?: string;
}) {
  return (
    <section className="surface-panel overflow-hidden">
      <div className="flex items-center justify-between gap-4 border-b border-slate-200 px-5 py-4">
        <h2 className="text-2xl font-bold text-navy-900">{title}</h2>
        {viewAllHref ? (
          <Link href={viewAllHref} className="text-sm font-semibold text-navy-900 transition hover:text-logistics-orange">
            Bütün yüklərə bax
          </Link>
        ) : null}
      </div>
      <div className="hidden grid-cols-[1.1fr,1.1fr,1fr,0.8fr,1fr,0.8fr] gap-4 border-b border-slate-200 bg-slate-50 px-5 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 lg:grid">
        <span>Yükləmə yeri</span>
        <span>Çatdırılma yeri</span>
        <span>Yük növü</span>
        <span>Çəki</span>
        <span>Nəqliyyat</span>
        <span>Status</span>
      </div>
      <div>
        {listings.map((listing) => (
          <Link
            key={listing.id}
            href={`/loads/${listing.id}`}
            className="grid gap-4 border-b border-slate-100 px-5 py-4 transition hover:bg-slate-50 lg:grid-cols-[1.1fr,1.1fr,1fr,0.8fr,1fr,0.8fr]"
          >
            <ListCell label="Yükləmə yeri" value={listing.pickupCity} />
            <ListCell label="Çatdırılma yeri" value={listing.deliveryCity} />
            <ListCell label="Yük növü" value={listing.cargoType} muted />
            <ListCell label="Çəki" value={formatWeight(listing.weight)} muted />
            <ListCell label="Nəqliyyat" value={listing.vehicleType || "Sərbəst"} muted />
            <div className="flex items-center justify-between gap-3">
              <StatusBadge status={effectiveStatus(listing)} />
              <ArrowRight className="h-4 w-4 text-slate-300" />
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

function ListCell({
  label,
  value,
  muted = false
}: {
  label: string;
  value: string;
  muted?: boolean;
}) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400 lg:hidden">{label}</p>
      <p className={cn("text-sm font-medium text-navy-900", muted && "font-normal text-slate-600")}>{value}</p>
    </div>
  );
}

export function MetricCard({
  label,
  value,
  icon
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-[10px] p-[20px] shadow-[0_0_1px_rgba(0,0,0,.125),0_1px_3px_rgba(0,0,0,.2)] flex items-center justify-between transition-all hover:-translate-y-0.5 hover:shadow-[0_0_1px_rgba(0,0,0,.125),0_2px_5px_rgba(0,0,0,.3)]">
      <div>
        <p className="text-[13px] font-bold text-slate-500 uppercase tracking-wider mb-1">{label}</p>
        <h3 className="text-3xl font-bold tracking-tight text-slate-800 m-0">{value}</h3>
      </div>
      <div className="flex h-[50px] w-[50px] items-center justify-center rounded-full bg-slate-100 text-slate-500">
        {icon}
      </div>
    </div>
  );
}

export function EmptyAccessState({
  title,
  description,
  actionHref,
  actionLabel
}: {
  title: string;
  description: string;
  actionHref: string;
  actionLabel: string;
}) {
  return (
    <div className="surface-panel flex min-h-[260px] flex-col items-center justify-center p-8 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-orange-50 text-logistics-orange">
        <ShieldCheck className="h-7 w-7" />
      </div>
      <h2 className="mt-5 text-2xl font-bold text-navy-900">{title}</h2>
      <p className="mt-3 max-w-md text-sm leading-6 text-slate-600">{description}</p>
      <ButtonLink href={actionHref} className="mt-6">
        {actionLabel}
      </ButtonLink>
    </div>
  );
}

export function ContactPanel({ listing }: { listing: CargoListing }) {
  return (
    <div className="surface-panel p-6">
      <p className="text-sm font-semibold text-navy-900">Satıcı / Elanı yerləşdirən</p>
      <div className="mt-4 rounded-xl border border-slate-200 p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-slate-100 text-sm font-bold text-slate-500">
            {listing.ownerProfilePicture ? (
              <img
                src={listing.ownerProfilePicture}
                alt={listing.ownerName || "İstifadəçi"}
                className="h-full w-full object-cover"
              />
            ) : (
              (listing.ownerName || "İ").slice(0, 1).toLocaleUpperCase("az")
            )}
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-navy-900">{listing.ownerName}</p>
            <p className="mt-0.5 text-sm text-slate-500">Birbaşa əlaqə üçün zəng edin</p>
          </div>
        </div>
        <div className="mt-4 flex items-center gap-3 rounded-xl border border-logistics-orange/40 px-4 py-3">
          <PhoneCall className="h-5 w-5 text-logistics-orange" />
          <span className="text-2xl font-bold text-navy-900">{listing.ownerPhone}</span>
        </div>
        <Button className="mt-4 w-full">Zəng et</Button>
      </div>
      <div className="mt-5 space-y-3 text-sm text-slate-600">
        <p>Elan tarixi: {formatListingDate(listing.createdAt)}</p>
        <p>Ən gec götürülmə tarixi: {formatListingDate(listing.pickupDeadlineDate || listing.pickupDate)}</p>
        {listing.expiresAt ? <p>Deaktivləşmə vaxtı: {formatListingDate(listing.expiresAt)}</p> : null}
        <p>Elan statusu: {listingStatusLabels[effectiveStatus(listing)]}</p>
      </div>
      <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-600">
        Təhlükəsizlik üçün ödənişi yalnız razılaşmadan sonra edin və şəxsi məlumatlarınızı paylaşarkən diqqətli olun.
      </div>
    </div>
  );
}

export function DetailFact({
  label,
  value,
  icon
}: {
  label: string;
  value: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
        {icon}
        {label}
      </div>
      <p className="mt-3 text-base font-semibold text-navy-900">{value}</p>
    </div>
  );
}

export function ListingMetaStrip({ listing }: { listing: CargoListing }) {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      <DetailFact
        label="Yerləşdirilmə tarixi"
        value={formatListingDate(listing.createdAt)}
        icon={<Clock3 className="h-4 w-4" />}
      />
      <DetailFact label="Yük növü" value={listing.cargoType} icon={<Truck className="h-4 w-4" />} />
      <DetailFact label="Status" value={listingStatusLabels[effectiveStatus(listing)]} icon={<ShieldCheck className="h-4 w-4" />} />
    </div>
  );
}
