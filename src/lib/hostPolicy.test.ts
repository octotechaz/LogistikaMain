import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  getNextHosts,
  matchNextHost,
  isAdminApiPath,
  isAdminPath,
  isPortalUserPath,
  isDelegatedToExpress,
  hostPolicyResult,
} from "./hostPolicy";

/** Shorthand hint for browser HTML GET navigation. */
const HTML_GET = { method: "GET", isHtmlRequest: true };

// ── getNextHosts ──────────────────────────────────────────────────────────────

describe("getNextHosts", () => {
  it("returns env-configured production hosts", () => {
    const h = getNextHosts({
      PUBLIC_SITE_HOST: "logistika.octotech.az",
      PORTAL_HOST: "portal-logistika.octotech.az",
      ADMIN_HOST: "admin-logistika.octotech.az",
      NODE_ENV: "production",
    });
    assert.equal(h.publicSite, "logistika.octotech.az");
    assert.equal(h.portal, "portal-logistika.octotech.az");
    assert.equal(h.admin, "admin-logistika.octotech.az");
  });

  it("falls back to *.lvh.me in development", () => {
    const h = getNextHosts({ NODE_ENV: "development" });
    assert.equal(h.publicSite, "lvh.me:3001");
    assert.equal(h.portal, "portal.lvh.me:3001");
    assert.equal(h.admin, "admin.lvh.me:3005");
  });

  it("throws in production when PUBLIC_SITE_HOST is missing", () => {
    assert.throws(
      () =>
        getNextHosts({
          NODE_ENV: "production",
          PUBLIC_SITE_HOST: "",
          PORTAL_HOST: "portal-logistika.octotech.az",
          ADMIN_HOST: "admin-logistika.octotech.az",
        }),
      /PUBLIC_SITE_HOST/i
    );
  });

  it("throws in production when PORTAL_HOST is missing", () => {
    assert.throws(
      () =>
        getNextHosts({
          NODE_ENV: "production",
          PUBLIC_SITE_HOST: "logistika.octotech.az",
          PORTAL_HOST: "",
          ADMIN_HOST: "admin-logistika.octotech.az",
        }),
      /PORTAL_HOST/i
    );
  });

  it("throws in production when ADMIN_HOST is missing", () => {
    assert.throws(
      () =>
        getNextHosts({
          NODE_ENV: "production",
          PUBLIC_SITE_HOST: "logistika.octotech.az",
          PORTAL_HOST: "portal-logistika.octotech.az",
          ADMIN_HOST: "",
        }),
      /ADMIN_HOST/i
    );
  });
});

// ── matchNextHost ─────────────────────────────────────────────────────────────

describe("matchNextHost", () => {
  const ENV = {
    NODE_ENV: "production",
    PUBLIC_SITE_HOST: "logistika.octotech.az",
    PORTAL_HOST: "portal-logistika.octotech.az",
    ADMIN_HOST: "admin-logistika.octotech.az",
  };

  it("returns true when host matches portal", () => {
    assert.equal(matchNextHost("portal-logistika.octotech.az", "portal", ENV), true);
  });

  it("returns true when host matches admin", () => {
    assert.equal(matchNextHost("admin-logistika.octotech.az", "admin", ENV), true);
  });

  it("returns false when host does not match", () => {
    assert.equal(matchNextHost("portal-logistika.octotech.az", "admin", ENV), false);
  });

  it("strips port before comparison", () => {
    assert.equal(matchNextHost("admin-logistika.octotech.az:443", "admin", ENV), true);
  });
});

// ── isAdminApiPath ────────────────────────────────────────────────────────────

describe("isAdminApiPath", () => {
  it("returns true for /api/admin/* paths", () => {
    assert.equal(isAdminApiPath("/api/admin/users"), true);
    assert.equal(isAdminApiPath("/api/admin/statistics"), true);
    assert.equal(isAdminApiPath("/api/admin/cargo-posts/123"), true);
  });

  it("returns false for non-admin API paths", () => {
    assert.equal(isAdminApiPath("/api/auth/login"), false);
    assert.equal(isAdminApiPath("/api/loads"), false);
    assert.equal(isAdminApiPath("/carrier/dashboard"), false);
  });
});

// ── isPortalUserPath ──────────────────────────────────────────────────────────

describe("isPortalUserPath", () => {
  it("returns true for /carrier/* paths", () => {
    assert.equal(isPortalUserPath("/carrier/dashboard"), true);
  });

  it("returns true for /cargo-owner/* paths", () => {
    assert.equal(isPortalUserPath("/cargo-owner/loads"), true);
  });

  it("returns true for /driver/profile", () => {
    assert.equal(isPortalUserPath("/driver/profile"), true);
  });

  it("returns true for /dispatcher/profile", () => {
    assert.equal(isPortalUserPath("/dispatcher/profile"), true);
  });

  it("returns true for /operator/* paths", () => {
    assert.equal(isPortalUserPath("/operator/dashboard"), true);
  });

  it("returns false for public paths", () => {
    assert.equal(isPortalUserPath("/loads"), false);
    assert.equal(isPortalUserPath("/loginx"), false);
    assert.equal(isPortalUserPath("/"), false);
  });

  it("returns true for /login and /register/carrier", () => {
    assert.equal(isPortalUserPath("/login"), true);
    assert.equal(isPortalUserPath("/register/carrier"), true);
  });

  it("returns false for admin API paths", () => {
    assert.equal(isPortalUserPath("/api/admin/users"), false);
  });
});

// ── hostPolicyResult ─────────────────────────────────────────────────────────

describe("hostPolicyResult", () => {
  const PROD_ENV = {
    NODE_ENV: "production",
    PUBLIC_SITE_HOST: "logistika.octotech.az",
    PORTAL_HOST: "portal-logistika.octotech.az",
    ADMIN_HOST: "admin-logistika.octotech.az",
  };

  it("pass: admin API on admin host", () => {
    const r = hostPolicyResult("/api/admin/users", "admin-logistika.octotech.az", PROD_ENV);
    assert.equal(r.action, "pass");
  });

  it("block404: admin API on wrong host (portal)", () => {
    const r = hostPolicyResult("/api/admin/users", "portal-logistika.octotech.az", PROD_ENV);
    assert.equal(r.action, "block404");
  });

  it("block404: admin API on public host", () => {
    const r = hostPolicyResult("/api/admin/users", "logistika.octotech.az", PROD_ENV);
    assert.equal(r.action, "block404");
  });

  it("pass: portal user path on portal host", () => {
    const r = hostPolicyResult("/carrier/dashboard", "portal-logistika.octotech.az", PROD_ENV);
    assert.equal(r.action, "pass");
  });

  it("redirect: portal user path on wrong host redirects to portal host", () => {
    const r = hostPolicyResult("/carrier/dashboard", "logistika.octotech.az", PROD_ENV, HTML_GET);
    assert.equal(r.action, "redirect");
    assert.match((r as { action: "redirect"; location: string }).location, /portal-logistika\.octotech\.az/);
    assert.match((r as { action: "redirect"; location: string }).location, /^https:\/\//);
  });

  it("redirect: portal user path on admin host redirects to portal host", () => {
    const r = hostPolicyResult("/carrier/dashboard", "admin-logistika.octotech.az", PROD_ENV, HTML_GET);
    assert.equal(r.action, "redirect");
    assert.match((r as { action: "redirect"; location: string }).location, /portal-logistika\.octotech\.az/);
  });

  it("redirect: /login on public host redirects to portal host", () => {
    const r = hostPolicyResult("/login", "logistika.octotech.az", PROD_ENV, HTML_GET);
    assert.equal(r.action, "redirect");
    assert.equal(
      (r as { action: "redirect"; location: string }).location,
      "https://portal-logistika.octotech.az/login"
    );
  });

  it("pass: /login on portal host", () => {
    const r = hostPolicyResult("/login", "portal-logistika.octotech.az", PROD_ENV, HTML_GET);
    assert.equal(r.action, "pass");
  });

  it("pass: public path on public/main host passes through", () => {
    const r = hostPolicyResult("/loads", "logistika.octotech.az", PROD_ENV);
    assert.equal(r.action, "pass");
  });

  // ── /admin/* page classification ──────────────────────────────────────────

  it("pass: /admin/* page on admin host passes", () => {
    const r = hostPolicyResult("/admin/dashboard", "admin-logistika.octotech.az", PROD_ENV);
    assert.equal(r.action, "pass");
  });

  it("redirect: /admin/* page on public host redirects to admin host", () => {
    const r = hostPolicyResult("/admin/login", "logistika.octotech.az", PROD_ENV, HTML_GET);
    assert.equal(r.action, "redirect");
    assert.match((r as { action: "redirect"; location: string }).location, /admin-logistika\.octotech\.az/);
    assert.match((r as { action: "redirect"; location: string }).location, /^https:\/\//);
  });

  it("redirect: /admin/* page on portal host redirects to admin host", () => {
    const r = hostPolicyResult("/admin/dashboard", "portal-logistika.octotech.az", PROD_ENV, HTML_GET);
    assert.equal(r.action, "redirect");
    assert.match((r as { action: "redirect"; location: string }).location, /admin-logistika\.octotech\.az/);
  });

  // ── Public paths on admin host must redirect to public site ──────────────

  it("redirect: public page on admin host redirects to public site", () => {
    const r = hostPolicyResult("/loads", "admin-logistika.octotech.az", PROD_ENV, HTML_GET);
    assert.equal(r.action, "redirect");
    assert.match((r as { action: "redirect"; location: string }).location, /logistika\.octotech\.az/);
    assert.doesNotMatch((r as { action: "redirect"; location: string }).location, /admin-logistika/);
  });

  it("redirect: public page on portal host redirects to public site", () => {
    const r = hostPolicyResult("/loads", "portal-logistika.octotech.az", PROD_ENV, HTML_GET);
    assert.equal(r.action, "redirect");
    assert.match((r as { action: "redirect"; location: string }).location, /logistika\.octotech\.az/);
  });

  it("pass: / root on public host passes", () => {
    const r = hostPolicyResult("/", "logistika.octotech.az", PROD_ENV);
    assert.equal(r.action, "pass");
  });

  // ── Query string preservation ─────────────────────────────────────────────

  it("redirect: query string preserved in portal user redirect", () => {
    const r = hostPolicyResult("/carrier/dashboard?tab=loads&page=2", "logistika.octotech.az", PROD_ENV, HTML_GET);
    assert.equal(r.action, "redirect");
    const loc = (r as { action: "redirect"; location: string }).location;
    assert.match(loc, /tab=loads/);
    assert.match(loc, /page=2/);
  });

  it("redirect: query string preserved in admin page redirect", () => {
    const r = hostPolicyResult("/admin/login?next=%2Fadmin%2Fdashboard", "logistika.octotech.az", PROD_ENV, HTML_GET);
    assert.equal(r.action, "redirect");
    const loc = (r as { action: "redirect"; location: string }).location;
    assert.match(loc, /next=/);
  });

  it("redirect: query string preserved when public path on admin host redirects", () => {
    const r = hostPolicyResult("/loads?category=truck", "admin-logistika.octotech.az", PROD_ENV, HTML_GET);
    assert.equal(r.action, "redirect");
    const loc = (r as { action: "redirect"; location: string }).location;
    assert.match(loc, /category=truck/);
  });
});
// ── Segment-boundary safety — isPortalUserPath ────────────────────────────────

describe("isPortalUserPath segment boundaries", () => {
  it("returns false for /carrierx (no segment boundary)", () => {
    assert.equal(isPortalUserPath("/carrierx"), false);
  });

  it("returns false for /operatorx", () => {
    assert.equal(isPortalUserPath("/operatorx"), false);
  });

  it("returns false for /cargo-ownerx", () => {
    assert.equal(isPortalUserPath("/cargo-ownerx"), false);
  });

  it("returns false for /driver/profilex", () => {
    assert.equal(isPortalUserPath("/driver/profilex"), false);
  });

  it("returns false for /dispatcher/profilex", () => {
    assert.equal(isPortalUserPath("/dispatcher/profilex"), false);
  });

  it("returns true for /carrier/loads (segment child)", () => {
    assert.equal(isPortalUserPath("/carrier/loads"), true);
  });

  it("returns true for /carrier exactly", () => {
    assert.equal(isPortalUserPath("/carrier"), true);
  });

  it("returns true for /driver/profile exactly", () => {
    assert.equal(isPortalUserPath("/driver/profile"), true);
  });

  it("returns true for /driver/profile/edit (child of exact)", () => {
    assert.equal(isPortalUserPath("/driver/profile/edit"), true);
  });

  it("returns false for /driver/profilex (suffix, not child)", () => {
    assert.equal(isPortalUserPath("/driver/profilex"), false);
  });
});

// ── isAdminPath segment boundaries ───────────────────────────────────────────

describe("isAdminPath segment boundaries", () => {
  it("returns true for /admin exactly", () => {
    assert.equal(isAdminPath("/admin"), true);
  });

  it("returns true for /admin/login (child)", () => {
    assert.equal(isAdminPath("/admin/login"), true);
  });

  it("returns false for /adminx (no boundary)", () => {
    assert.equal(isAdminPath("/adminx"), false);
  });

  it("returns false for /admin-evil", () => {
    assert.equal(isAdminPath("/admin-evil"), false);
  });

  it("returns true for /api/admin/users", () => {
    assert.equal(isAdminPath("/api/admin/users"), true);
  });

  it("returns false for /api/adminx", () => {
    assert.equal(isAdminPath("/api/adminx"), false);
  });
});

// ── hostPolicyResult: API paths on wrong host must 404, never redirect ────────

describe("hostPolicyResult API paths", () => {
  const PROD_ENV = {
    NODE_ENV: "production",
    PUBLIC_SITE_HOST: "logistika.octotech.az",
    PORTAL_HOST: "portal-logistika.octotech.az",
    ADMIN_HOST: "admin-logistika.octotech.az",
  };

  it("block404: /api/auth/me on admin host (wrong host for user API)", () => {
    const r = hostPolicyResult("/api/auth/me", "admin-logistika.octotech.az", PROD_ENV, { method: "GET", isHtmlRequest: false });
    assert.equal(r.action, "block404");
  });

  it("block404: /api/auth/me on portal host even with GET non-HTML", () => {
    const r = hostPolicyResult("/api/loads", "admin-logistika.octotech.az", PROD_ENV, { method: "GET", isHtmlRequest: false });
    assert.equal(r.action, "block404");
  });

  it("pass: /api/auth/me on portal host", () => {
    const r = hostPolicyResult("/api/auth/me", "portal-logistika.octotech.az", PROD_ENV, { method: "GET", isHtmlRequest: false });
    assert.equal(r.action, "pass");
  });

  it("pass: /api/uploads on localhost in development", () => {
    const r = hostPolicyResult("/api/uploads", "localhost:3001", { NODE_ENV: "development" }, { method: "POST", isHtmlRequest: false });
    assert.equal(r.action, "pass");
  });

  it("block404: /api/uploads on localhost in production", () => {
    const r = hostPolicyResult("/api/uploads", "localhost:3001", PROD_ENV, { method: "POST", isHtmlRequest: false });
    assert.equal(r.action, "block404");
  });

  it("block404: /api/auth/me on public host (user API blocked on public site)", () => {
    const r = hostPolicyResult("/api/auth/me", "logistika.octotech.az", PROD_ENV, { method: "GET", isHtmlRequest: false });
    assert.equal(r.action, "block404");
  });

  it("block404: OPTIONS on wrong host returns 404, not redirect", () => {
    const r = hostPolicyResult("/carrier/dashboard", "logistika.octotech.az", PROD_ENV, { method: "OPTIONS", isHtmlRequest: false });
    assert.equal(r.action, "block404");
  });

  it("block404: POST on wrong host returns 404, not redirect", () => {
    const r = hostPolicyResult("/carrier/dashboard", "logistika.octotech.az", PROD_ENV, { method: "POST", isHtmlRequest: false });
    assert.equal(r.action, "block404");
  });

  it("block404: non-HTML GET on wrong host returns 404, not redirect", () => {
    const r = hostPolicyResult("/carrier/dashboard", "logistika.octotech.az", PROD_ENV, { method: "GET", isHtmlRequest: false });
    assert.equal(r.action, "block404");
  });

  it("redirect: browser HTML GET on wrong host redirects (query preserved)", () => {
    const r = hostPolicyResult("/carrier/dashboard?tab=loads", "logistika.octotech.az", PROD_ENV, { method: "GET", isHtmlRequest: true });
    assert.equal(r.action, "redirect");
    assert.match((r as { action: "redirect"; location: string }).location, /tab=loads/);
  });

  it("block404: /api/* GET on correct host (portal) passes", () => {
    const r = hostPolicyResult("/api/loads", "portal-logistika.octotech.az", PROD_ENV, { method: "GET", isHtmlRequest: false });
    assert.equal(r.action, "pass");
  });
});

// ── isDelegatedToExpress — Next.js rewrite pass-through ───────────────────────

describe("isDelegatedToExpress", () => {
  it("returns true for /dashboard exactly", () => {
    assert.equal(isDelegatedToExpress("/dashboard"), true);
  });

  it("returns true for /dashboard/login", () => {
    assert.equal(isDelegatedToExpress("/dashboard/login"), true);
  });

  it("returns true for /dashboard/butun-elanlar", () => {
    assert.equal(isDelegatedToExpress("/dashboard/butun-elanlar"), true);
  });

  it("returns true for /dashboard/yeni-elan", () => {
    assert.equal(isDelegatedToExpress("/dashboard/yeni-elan"), true);
  });

  it("returns true for /dashboard/session-user", () => {
    assert.equal(isDelegatedToExpress("/dashboard/session-user"), true);
  });

  it("returns true for /dashboard/api/send-otp", () => {
    assert.equal(isDelegatedToExpress("/dashboard/api/send-otp"), true);
  });

  it("returns true for /octo-admin", () => {
    assert.equal(isDelegatedToExpress("/octo-admin"), true);
  });

  it("returns true for /octo-admin/something", () => {
    assert.equal(isDelegatedToExpress("/octo-admin/something"), true);
  });

  it("returns true for /uploads/image.jpg", () => {
    assert.equal(isDelegatedToExpress("/uploads/image.jpg"), true);
  });

  it("returns false for /loads (public Next.js page)", () => {
    assert.equal(isDelegatedToExpress("/loads"), false);
  });

  it("returns false for /carrier/dashboard (portal Next.js page)", () => {
    assert.equal(isDelegatedToExpress("/carrier/dashboard"), false);
  });

  it("returns false for /api/admin/users (Next.js API)", () => {
    assert.equal(isDelegatedToExpress("/api/admin/users"), false);
  });

  it("returns false for /dashboardx (no boundary)", () => {
    assert.equal(isDelegatedToExpress("/dashboardx"), false);
  });
});

// ── hostPolicyResult: delegated paths always pass ─────────────────────────────

describe("hostPolicyResult: Express-delegated paths pass on any host", () => {
  const PROD_ENV = {
    NODE_ENV: "production",
    PUBLIC_SITE_HOST: "logistika.octotech.az",
    PORTAL_HOST: "portal-logistika.octotech.az",
    ADMIN_HOST: "admin-logistika.octotech.az",
  };

  it("pass: /dashboard/login on ADMIN_HOST (admin login must work)", () => {
    const r = hostPolicyResult("/dashboard/login", "admin-logistika.octotech.az", PROD_ENV, HTML_GET);
    assert.equal(r.action, "pass");
  });

  it("pass: /dashboard/login on PORTAL_HOST (portal login must work)", () => {
    const r = hostPolicyResult("/dashboard/login", "portal-logistika.octotech.az", PROD_ENV, HTML_GET);
    assert.equal(r.action, "pass");
  });

  it("pass: /dashboard/butun-elanlar on ADMIN_HOST (admin UI must work)", () => {
    const r = hostPolicyResult("/dashboard/butun-elanlar", "admin-logistika.octotech.az", PROD_ENV, HTML_GET);
    assert.equal(r.action, "pass");
  });

  it("pass: /dashboard/yeni-elan on PORTAL_HOST (portal UI must work)", () => {
    const r = hostPolicyResult("/dashboard/yeni-elan", "portal-logistika.octotech.az", PROD_ENV, HTML_GET);
    assert.equal(r.action, "pass");
  });

  it("pass: /dashboard/session-user on ADMIN_HOST (admin API must work)", () => {
    const r = hostPolicyResult("/dashboard/session-user", "admin-logistika.octotech.az", PROD_ENV, { method: "GET", isHtmlRequest: false });
    assert.equal(r.action, "pass");
  });

  it("pass: /dashboard/api/send-otp on PORTAL_HOST (portal API must work)", () => {
    const r = hostPolicyResult("/dashboard/api/send-otp", "portal-logistika.octotech.az", PROD_ENV, { method: "POST", isHtmlRequest: false });
    assert.equal(r.action, "pass");
  });

  it("pass: /octo-admin on ADMIN_HOST (admin redirect target must work)", () => {
    const r = hostPolicyResult("/octo-admin", "admin-logistika.octotech.az", PROD_ENV, HTML_GET);
    assert.equal(r.action, "pass");
  });

  it("pass: /uploads/foo.jpg on any host (static asset proxy)", () => {
    const r = hostPolicyResult("/uploads/foo.jpg", "logistika.octotech.az", PROD_ENV, { method: "GET", isHtmlRequest: false });
    assert.equal(r.action, "pass");
  });

  it("pass: /dashboard/login even on PUBLIC_SITE_HOST (Express handles the redirect)", () => {
    const r = hostPolicyResult("/dashboard/login", "logistika.octotech.az", PROD_ENV, HTML_GET);
    assert.equal(r.action, "pass");
  });
});

// ── API ownership: /api/public/* and /api/health on public site host ──────────

describe("hostPolicyResult: API ownership", () => {
  const PROD_ENV = {
    NODE_ENV: "production",
    PUBLIC_SITE_HOST: "logistika.octotech.az",
    PORTAL_HOST: "portal-logistika.octotech.az",
    ADMIN_HOST: "admin-logistika.octotech.az",
  };

  it("pass: /api/public/categories on PUBLIC_SITE_HOST", () => {
    const r = hostPolicyResult("/api/public/categories", "logistika.octotech.az", PROD_ENV, { method: "GET", isHtmlRequest: false });
    assert.equal(r.action, "pass");
  });

  it("block404: /api/public/categories on ADMIN_HOST", () => {
    const r = hostPolicyResult("/api/public/categories", "admin-logistika.octotech.az", PROD_ENV, { method: "GET", isHtmlRequest: false });
    assert.equal(r.action, "block404");
  });

  it("block404: /api/public/categories on PORTAL_HOST", () => {
    const r = hostPolicyResult("/api/public/categories", "portal-logistika.octotech.az", PROD_ENV, { method: "GET", isHtmlRequest: false });
    assert.equal(r.action, "block404");
  });

  it("pass: /api/public/listings on localhost in development", () => {
    const r = hostPolicyResult("/api/public/listings", "localhost:3001", { NODE_ENV: "development" }, { method: "GET", isHtmlRequest: false });
    assert.equal(r.action, "pass");
  });

  it("pass: /api/public/listings on portal.lvh.me in development", () => {
    const r = hostPolicyResult(
      "/api/public/listings",
      "portal.lvh.me:3001",
      { NODE_ENV: "development", PUBLIC_SITE_HOST: "lvh.me:3001", PORTAL_HOST: "portal.lvh.me:3001" },
      { method: "GET", isHtmlRequest: false }
    );
    assert.equal(r.action, "pass");
  });

  it("block404: /api/public/listings on localhost in production", () => {
    const r = hostPolicyResult("/api/public/listings", "localhost:3001", PROD_ENV, { method: "GET", isHtmlRequest: false });
    assert.equal(r.action, "block404");
  });

  it("pass: /api/health on PUBLIC_SITE_HOST", () => {
    const r = hostPolicyResult("/api/health", "logistika.octotech.az", PROD_ENV, { method: "GET", isHtmlRequest: false });
    assert.equal(r.action, "pass");
  });

  it("block404: /api/health on ADMIN_HOST", () => {
    const r = hostPolicyResult("/api/health", "admin-logistika.octotech.az", PROD_ENV, { method: "GET", isHtmlRequest: false });
    assert.equal(r.action, "block404");
  });

  it("pass: /api/auth/me on PORTAL_HOST (user API on portal)", () => {
    const r = hostPolicyResult("/api/auth/me", "portal-logistika.octotech.az", PROD_ENV, { method: "GET", isHtmlRequest: false });
    assert.equal(r.action, "pass");
  });

  it("block404: /api/auth/me on PUBLIC_SITE_HOST (user API only on portal)", () => {
    const r = hostPolicyResult("/api/auth/me", "logistika.octotech.az", PROD_ENV, { method: "GET", isHtmlRequest: false });
    assert.equal(r.action, "block404");
  });

  it("block404: /api/auth/me on ADMIN_HOST (admin host must not serve user APIs)", () => {
    const r = hostPolicyResult("/api/auth/me", "admin-logistika.octotech.az", PROD_ENV, { method: "GET", isHtmlRequest: false });
    assert.equal(r.action, "block404");
  });
});

// ── Rule 4: all remaining /api/* → PORTAL_HOST only ─────────────────────────

describe("hostPolicyResult: all /api/* blocked on non-portal hosts (rule 4)", () => {
  const PROD_ENV = {
    NODE_ENV: "production",
    PUBLIC_SITE_HOST: "logistika.octotech.az",
    PORTAL_HOST: "portal-logistika.octotech.az",
    ADMIN_HOST: "admin-logistika.octotech.az",
  };

  it("block404: /api/auth/login on ADMIN_HOST", () => {
    const r = hostPolicyResult("/api/auth/login", "admin-logistika.octotech.az", PROD_ENV, { method: "POST", isHtmlRequest: false });
    assert.equal(r.action, "block404");
  });

  it("block404: /api/loads on ADMIN_HOST", () => {
    const r = hostPolicyResult("/api/loads", "admin-logistika.octotech.az", PROD_ENV, { method: "GET", isHtmlRequest: false });
    assert.equal(r.action, "block404");
  });

  it("block404: /api/carrier/profile on ADMIN_HOST", () => {
    const r = hostPolicyResult("/api/carrier/profile", "admin-logistika.octotech.az", PROD_ENV, { method: "GET", isHtmlRequest: false });
    assert.equal(r.action, "block404");
  });

  it("pass: /api/auth/login on PORTAL_HOST", () => {
    const r = hostPolicyResult("/api/auth/login", "portal-logistika.octotech.az", PROD_ENV, { method: "POST", isHtmlRequest: false });
    assert.equal(r.action, "pass");
  });

  it("pass: /api/auth/me on PORTAL_HOST", () => {
    const r = hostPolicyResult("/api/auth/me", "portal-logistika.octotech.az", PROD_ENV, { method: "GET", isHtmlRequest: false });
    assert.equal(r.action, "pass");
  });

  it("block404: /api/auth/me on ADMIN_HOST (confirmed regression)", () => {
    const r = hostPolicyResult("/api/auth/me", "admin-logistika.octotech.az", PROD_ENV, { method: "GET", isHtmlRequest: false });
    assert.equal(r.action, "block404");
  });

  it("block404: /api/auth/login on PUBLIC_SITE_HOST", () => {
    const r = hostPolicyResult("/api/auth/login", "logistika.octotech.az", PROD_ENV, { method: "POST", isHtmlRequest: false });
    assert.equal(r.action, "block404");
  });

  it("block404: /api/loads on PUBLIC_SITE_HOST", () => {
    const r = hostPolicyResult("/api/loads", "logistika.octotech.az", PROD_ENV, { method: "GET", isHtmlRequest: false });
    assert.equal(r.action, "block404");
  });

  it("block404: /api/auth/login on unknown host", () => {
    const r = hostPolicyResult("/api/auth/login", "evil.example.com", PROD_ENV, { method: "POST", isHtmlRequest: false });
    assert.equal(r.action, "block404");
  });
});
