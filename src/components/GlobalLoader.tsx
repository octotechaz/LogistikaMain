"use client";

import { Suspense, useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";

// DOM'u doğrudan manipüle ediyoruz — React state/re-render yok, anında tepki
const OVERLAY_ID = "__gl_overlay__";
const MIN_MS = 0;
const MAX_MS = 4000;

let hideTimer: ReturnType<typeof setTimeout> | null = null;
let shownAt = 0;

function getOverlay(): HTMLElement | null {
  return document.getElementById(OVERLAY_ID);
}

function showLoader() {
  if (hideTimer) { clearTimeout(hideTimer); hideTimer = null; }
  const el = getOverlay();
  if (!el) return;
  shownAt = Date.now();
  el.style.opacity = "1";
  el.style.pointerEvents = "auto";
  hideTimer = setTimeout(hideLoader, MAX_MS);
}

function hideLoader() {
  if (hideTimer) { clearTimeout(hideTimer); hideTimer = null; }
  const el = getOverlay();
  if (!el) return;
  const elapsed = Date.now() - shownAt;
  const delay = Math.max(0, MIN_MS - elapsed);
  setTimeout(() => {
    const e = getOverlay();
    if (e) { e.style.opacity = "0"; e.style.pointerEvents = "none"; }
  }, delay);
}

// Loader overlay'i DOM'a inject et (bir kez)
function ensureOverlay() {
  if (document.getElementById(OVERLAY_ID)) return;
  const style = document.createElement("style");
  style.textContent = `
    #${OVERLAY_ID} {
      position: fixed; inset: 0; z-index: 9999;
      display: flex; align-items: center; justify-content: center;
      background: rgba(255,255,255,0.5);
      opacity: 0; pointer-events: none;
      transition: opacity 0.15s ease;
    }
    #${OVERLAY_ID} .gl-ring {
      width: 48px; height: 48px; border-radius: 50%;
      border: 3.5px solid #e2e8f0;
      border-top-color: #f97316;
      animation: gl-spin 0.65s linear infinite;
    }
    @keyframes gl-spin { to { transform: rotate(360deg); } }
  `;
  document.head.appendChild(style);
  const div = document.createElement("div");
  div.id = OVERLAY_ID;
  div.setAttribute("aria-hidden", "true");
  div.innerHTML = '<div class="gl-ring"></div>';
  document.body.appendChild(div);
}

function GlobalLoaderInner() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Sayfa değişince kapat
  useEffect(() => {
    hideLoader();
  }, [pathname, searchParams]);

  // Click listener
  useEffect(() => {
    ensureOverlay();

    function handleClick(e: MouseEvent) {
      const target = e.target as HTMLElement;

      // data-no-loader olan bir elementin içindeyse hiç loader gösterme
      if (target.closest("[data-no-loader]")) return;

      // Tıklanan veya üst elementlerinde button varsa loader gösterme
      if (target.closest("button")) return;

      // Sadece internal navigation link'lerinde loader göster
      const anchor = target.closest("a");
      if (anchor) {
        if (anchor.closest("[data-no-loader]")) return;
        const href = anchor.getAttribute("href") ?? "";
        if (
          !href ||
          href.startsWith("http") ||
          href.startsWith("//") ||
          href.startsWith("#") ||
          anchor.hasAttribute("download") ||
          anchor.getAttribute("target") === "_blank" ||
          anchor.hasAttribute("data-no-loader")
        ) return;
        showLoader();
      }
    }

    document.addEventListener("click", handleClick, true);
    return () => document.removeEventListener("click", handleClick, true);
  }, []);

  return null;
}

export function GlobalLoader() {
  return (
    <Suspense fallback={null}>
      <GlobalLoaderInner />
    </Suspense>
  );
}