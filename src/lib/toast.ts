type ToastTone = "error" | "success";

const TOAST_ID = "tranzit-toast";
const DEFAULT_SUCCESS_DELAY_MS = 2500;

function ensureToastStyles() {
  if (typeof document === "undefined") {
    return;
  }

  if (document.getElementById("tranzit-toast-style")) {
    return;
  }

  const style = document.createElement("style");
  style.id = "tranzit-toast-style";
  style.textContent = `
    @keyframes tranzit-toast-in {
      from { opacity: 0; transform: translate3d(24px, 12px, 0); }
      to { opacity: 1; transform: translate3d(0, 0, 0); }
    }
    #${TOAST_ID} {
      position: fixed;
      right: 20px;
      bottom: 20px;
      z-index: 10000;
      display: none;
      max-width: min(92vw, 360px);
      border-radius: 12px;
      padding: 14px 18px;
      font-size: 14px;
      font-weight: 600;
      line-height: 1.4;
      color: #fff;
      box-shadow: 0 12px 28px rgba(15, 23, 42, 0.22);
      animation: tranzit-toast-in 220ms ease-out;
    }
  `;
  document.head.appendChild(style);
}

export function showToast(message: string, tone: ToastTone = "success", autoHideMs = 4500) {
  if (typeof document === "undefined") {
    return;
  }

  try {
    ensureToastStyles();

    let el = document.getElementById(TOAST_ID) as HTMLDivElement | null;
    if (!el) {
      el = document.createElement("div");
      el.id = TOAST_ID;
      el.setAttribute("role", "status");
      el.setAttribute("aria-live", "polite");
      document.body.appendChild(el);
    }

    el.style.background = tone === "error" ? "#dc2626" : "#16a34a";
    el.textContent = message;
    el.style.display = "block";
    el.style.animation = "none";
    // restart animation
    void el.offsetWidth;
    el.style.animation = "tranzit-toast-in 220ms ease-out";

    const existing = (el as HTMLDivElement & { _t?: ReturnType<typeof setTimeout> })._t;
    if (existing) {
      clearTimeout(existing);
    }

    (el as HTMLDivElement & { _t?: ReturnType<typeof setTimeout> })._t = setTimeout(() => {
      el!.style.display = "none";
    }, autoHideMs);
  } catch {
    // ignore DOM failures
  }
}

export function redirectAfterToast(
  message: string,
  href: string,
  delayMs = DEFAULT_SUCCESS_DELAY_MS
) {
  showToast(message, "success", delayMs + 500);
  window.setTimeout(() => {
    window.location.assign(href);
  }, delayMs);
}

/** @deprecated use redirectAfterToast */
export function redirectHomeAfterToast(message: string, delayMs = DEFAULT_SUCCESS_DELAY_MS) {
  redirectAfterToast(message, "/", delayMs);
}
