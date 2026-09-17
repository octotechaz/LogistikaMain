import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  authCookieSecure,
  authCookieSetOptions,
  resolveAuthCookieDomain,
} from "./auth-cookie";

describe("resolveAuthCookieDomain", () => {
  it("uses AUTH_COOKIE_DOMAIN when set", () => {
    assert.equal(
      resolveAuthCookieDomain({ AUTH_COOKIE_DOMAIN: "tranzit.test" }),
      ".tranzit.test"
    );
    assert.equal(
      resolveAuthCookieDomain({ AUTH_COOKIE_DOMAIN: ".tranzit.az" }),
      ".tranzit.az"
    );
  });

  it("rejects PSL-blocked .localhost", () => {
    assert.equal(
      resolveAuthCookieDomain({ AUTH_COOKIE_DOMAIN: ".localhost" }),
      undefined
    );
  });

  it("derives from portal.<public> pattern", () => {
    assert.equal(
      resolveAuthCookieDomain({
        PUBLIC_SITE_HOST: "tranzit.test:3001",
        PORTAL_HOST: "portal.tranzit.test:3001",
      }),
      ".tranzit.test"
    );
    assert.equal(
      resolveAuthCookieDomain({
        PUBLIC_SITE_HOST: "tranzit.az",
        PORTAL_HOST: "portal.tranzit.az",
      }),
      ".tranzit.az"
    );
  });

  it("does not set Domain for *.localhost (PSL)", () => {
    assert.equal(
      resolveAuthCookieDomain({
        PUBLIC_SITE_HOST: "localhost:3001",
        PORTAL_HOST: "portal.localhost:3001",
      }),
      undefined
    );
  });
});

describe("authCookieSecure", () => {
  it("is false for local http hosts even when NODE_ENV=production", () => {
    assert.equal(
      authCookieSecure({
        NODE_ENV: "production",
        PUBLIC_SITE_HOST: "lvh.me:3001",
        PORTAL_HOST: "portal.lvh.me:3001",
        ADMIN_HOST: "admin.lvh.me:3005",
      }),
      false
    );
  });

  it("is true for real production https hosts", () => {
    assert.equal(
      authCookieSecure({
        NODE_ENV: "production",
        PUBLIC_SITE_HOST: "tranzit.az",
        PORTAL_HOST: "portal.tranzit.az",
        ADMIN_HOST: "admin.tranzit.az",
        NEXTAUTH_URL: "https://tranzit.az",
      }),
      true
    );
  });
});

describe("authCookieSetOptions", () => {
  it("includes shared domain for lvh.me", () => {
    const opts = authCookieSetOptions(3600, {
      PUBLIC_SITE_HOST: "lvh.me:3001",
      PORTAL_HOST: "portal.lvh.me:3001",
      ADMIN_HOST: "admin.lvh.me:3005",
      NODE_ENV: "production",
    });
    assert.equal(opts.domain, ".lvh.me");
    assert.equal(opts.secure, false);
    assert.equal(opts.httpOnly, true);
    assert.equal(opts.sameSite, "lax");
    assert.equal(opts.path, "/");
    assert.equal(opts.maxAge, 3600);
  });
});
