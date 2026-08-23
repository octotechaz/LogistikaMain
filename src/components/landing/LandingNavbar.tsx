"use client";

import { Menu, Sparkles, X, UserRound } from "lucide-react";
import { useEffect, useState } from "react";
import { navItems } from "@/components/landing/mock-data";
import { useApiAuthUser } from "@/hooks/useApiAuthUser";

type LandingNavbarProps = {
  onPrimaryAction: () => void;
};

export function LandingNavbar({ onPrimaryAction }: LandingNavbarProps) {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { user: sessionUser, legacyUser, logout } = useApiAuthUser();

  const resolvedUser = sessionUser
    ? { name: `${sessionUser.firstName} ${sessionUser.lastName}`, email: sessionUser.email }
    : legacyUser
      ? { name: legacyUser.name, email: legacyUser.email }
      : null;
  const userName = resolvedUser?.name ?? null;
  const userInitial = (userName || resolvedUser?.email || "U").trim().charAt(0).toUpperCase();

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 18);
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleLogout = async () => {
    await logout();
  };

  return (
    <header className="fixed inset-x-0 top-0 z-50">
      <div
        className={`mx-auto flex max-w-7xl items-center justify-between border-x border-b rounded-b-2xl px-4 py-3 transition duration-300 sm:px-6 ${
          isScrolled
            ? "border-white/12 bg-slate-950/85 shadow-[0_18px_60px_rgba(2,8,23,0.45)] backdrop-blur-2xl"
            : "border-white/8 bg-slate-950/40 backdrop-blur-xl"
        }`}
      >
        <a href="#ana-sehife" className="flex items-center gap-3 text-white">
          <div className="rounded-xl border border-cyan-400/25 bg-cyan-400/10 p-2 text-cyan-100">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <p className="text-[1.1rem] font-bold text-slate-200">
              Tranzit.<span className="text-[#f97316]">AZ</span>
            </p>
            <p className="text-xs text-slate-500">Freight Marketplace</p>
          </div>
        </a>

        <nav className="hidden items-center gap-2 lg:flex">
          {navItems.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="rounded-full px-4 py-2 text-sm text-slate-300 transition hover:bg-white/8 hover:text-white"
            >
              {item.label}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-3 lg:flex">
          {resolvedUser ? (
            <div className="relative group">
              <a href="/cargo-owner/dashboard" className="h-11 items-center justify-center gap-2 py-2 text-sm font-semibold transition duration-200 hover:-translate-y-px border bg-white text-navy-900 hover:bg-navy-50 hidden rounded-[14px] border-[#d9e4f4] px-[18px] sm:inline-flex cursor-pointer"
              >
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-logistics-orange/10 text-logistics-orange font-bold text-xs">
                  {userInitial}
                </span>
                <span className="truncate max-w-[150px]">{resolvedUser.email}</span>
              </a>
              <div className="absolute right-0 top-full mt-2 hidden w-56 rounded-2xl border border-slate-100 bg-white p-2 shadow-[0_10px_40px_-10px_rgba(0,0,0,0.1)] group-hover:block z-[9999]">
                <div className="px-3 py-3 mb-1 border-b border-slate-100 flex items-center gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-logistics-orange/10 text-logistics-orange font-bold text-lg">
                    {userInitial}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-slate-500 font-medium">Xoş gəldiniz</p>
                    <p className="text-sm font-bold text-navy-900 truncate">{userName || "İstifadəçi"}</p>
                  </div>
                </div>
                <div className="my-1 border-t border-slate-100"></div>
                <button onClick={handleLogout} className="flex w-full items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium text-red-600 hover:bg-red-50 transition-colors text-left">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-log-out h-[18px] w-[18px]"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/></svg>
                  <span>Çıxış et</span>
                </button>
              </div>
            </div>
          ) : (
            <a
              href="/login"
              className="min-h-11 items-center justify-center gap-2 py-2 text-sm font-semibold transition duration-200 hover:-translate-y-px border bg-white text-navy-900 hover:bg-navy-50 hidden h-11 rounded-[14px] border-[#d9e4f4] px-[18px] sm:inline-flex"
            >
              <UserRound className="h-[18px] w-[18px]" />
              Daxil ol
            </a>
          )}

          <button
            type="button"
            onClick={resolvedUser ? () => window.location.href = "/cargo-owner/cargo-posts/new" : onPrimaryAction}
            className="rounded-full border border-cyan-300/30 bg-[linear-gradient(135deg,#22d3ee,#2563eb)] px-5 py-2.5 text-sm font-medium text-white shadow-[0_12px_36px_rgba(37,99,235,0.35)] flex items-center gap-2"
          >
            {resolvedUser ? "Yeni elan" : "Qeydiyyat"}
          </button>
        </div>

        <button
          type="button"
          className="rounded-full border border-white/10 p-2.5 text-slate-200 lg:hidden"
          onClick={() => setIsMenuOpen((current) => !current)}
          aria-label="Menunu ac"
        >
          {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {isMenuOpen ? (
        <div className="mx-auto mt-3 max-w-7xl rounded-[1.5rem] border border-white/10 bg-slate-950/90 p-4 backdrop-blur-2xl lg:hidden">
          <div className="grid gap-2">
            {navItems.map((item) => (
              <a
                key={item.href}
                href={item.href}
                onClick={() => setIsMenuOpen(false)}
                className="rounded-2xl px-4 py-3 text-sm text-slate-300 transition hover:bg-white/8 hover:text-white"
              >
                {item.label}
              </a>
            ))}
            <button
              type="button"
              onClick={() => {
                setIsMenuOpen(false);
                onPrimaryAction();
              }}
              className="mt-2 rounded-2xl bg-[linear-gradient(135deg,#22d3ee,#2563eb)] px-4 py-3 text-sm font-medium text-white"
            >
              Qeydiyyat
            </button>
          </div>
        </div>
      ) : null}
    </header>
  );
}