import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { resolveEnv, validateEnv, EnvError } from "./env.js";

// ── helpers ────────────────────────────────────────────────────────────────────

const env = process.env as Record<string, string | undefined>;

function withEnv(overrides: Record<string, string | undefined>, fn: () => void) {
  const saved: Record<string, string | undefined> = {};
  for (const [k, v] of Object.entries(overrides)) {
    saved[k] = env[k];
    if (v === undefined) delete env[k];
    else env[k] = v;
  }
  try {
    fn();
  } finally {
    for (const [k, v] of Object.entries(saved)) {
      if (v === undefined) delete env[k];
      else env[k] = v;
    }
  }
}

const PROD_MIN_VALID: Record<string, string> = {
  NODE_ENV: "production",
  DATABASE_URL: "postgresql://prod:prod@localhost:5432/logistika",
  JWT_SECRET: "a".repeat(32),
  NEXTAUTH_SECRET: "b".repeat(32),
  SESSION_SECRET: "c".repeat(32),
  PUBLIC_SITE_HOST: "logistika.octotech.az",
  PORTAL_HOST: "portal-logistika.octotech.az",
  ADMIN_HOST: "admin-logistika.octotech.az",
  NEXTAUTH_URL: "https://logistika.octotech.az",
  NEXT_PUBLIC_APP_URL: "https://logistika.octotech.az",
  CORS_ORIGIN: "https://logistika.octotech.az",
  INTERNAL_ADMIN_URL: "http://127.0.0.1:3005",
  INTERNAL_BACKEND_URL: "http://127.0.0.1:4001",
  OCTO_ADMIN_HOST: "127.0.0.1",
  OCTO_ADMIN_PORT: "3005",
  BACKEND_HOST: "127.0.0.1",
  BACKEND_PORT: "4001",
  UPLOAD_DIR: "/data/uploads",
  PUBLIC_LISTINGS_SQLITE_PATH: "/data/public-listings.sqlite",
  OCTO_ADMIN_SQLITE_PATH: "/data/cargo.db",
};

// Save and clear production vars before each test suite so development defaults
// are active by default, then we selectively opt in to production mode.
const originalEnv: Record<string, string | undefined> = {};

const envProxy = process.env as Record<string, string | undefined>;

before(() => {
  for (const k of Object.keys(PROD_MIN_VALID)) {
    originalEnv[k] = envProxy[k];
    delete envProxy[k];
  }
  // Ensure we're in development by default
  originalEnv["NODE_ENV"] = envProxy["NODE_ENV"];
  envProxy["NODE_ENV"] = "test";
});

after(() => {
  for (const [k, v] of Object.entries(originalEnv)) {
    if (v === undefined) delete envProxy[k];
    else envProxy[k] = v;
  }
});

// ── development defaults ────────────────────────────────────────────────────────

describe("resolveEnv — development defaults", () => {
  it("returns without throwing in non-production", () => {
    assert.doesNotThrow(() => resolveEnv());
  });

  it("uses loopback fallbacks for internal URLs", () => {
    const env = resolveEnv();
    assert.equal(env.internalAdminUrl, "http://127.0.0.1:3005");
    assert.equal(env.internalBackendUrl, "http://127.0.0.1:4001");
  });

  it("uses loopback fallbacks for host/port", () => {
    const env = resolveEnv();
    assert.equal(env.octoAdminHost, "127.0.0.1");
    assert.equal(env.octoAdminPort, 3005);
    assert.equal(env.backendHost, "127.0.0.1");
    assert.equal(env.backendPort, 4001);
  });

  it("provides development jwt/session secrets", () => {
    const env = resolveEnv();
    assert.ok(env.jwtSecret.length >= 32);
    assert.ok(env.sessionSecret.length >= 32);
    assert.ok(env.nextauthSecret.length >= 32);
  });
});

// ── production valid ───────────────────────────────────────────────────────────

describe("resolveEnv — production valid", () => {
  it("resolves successfully when all required vars are present", () => {
    withEnv(PROD_MIN_VALID, () => {
      assert.doesNotThrow(() => resolveEnv());
    });
  });

  it("returns all fields", () => {
    withEnv(PROD_MIN_VALID, () => {
      const env = resolveEnv();
      assert.equal(env.databaseUrl, PROD_MIN_VALID.DATABASE_URL);
      assert.equal(env.octoAdminPort, 3005);
      assert.equal(env.backendPort, 4001);
    });
  });
});

// ── production fail-closed: missing vars ──────────────────────────────────────

describe("resolveEnv — production fails closed on missing vars", () => {
  const required = [
    "DATABASE_URL",
    "JWT_SECRET",
    "NEXTAUTH_SECRET",
    "SESSION_SECRET",
    "PUBLIC_SITE_HOST",
    "PORTAL_HOST",
    "ADMIN_HOST",
    "NEXTAUTH_URL",
    "NEXT_PUBLIC_APP_URL",
    "CORS_ORIGIN",
    "INTERNAL_ADMIN_URL",
    "INTERNAL_BACKEND_URL",
    "OCTO_ADMIN_HOST",
    "OCTO_ADMIN_PORT",
    "BACKEND_HOST",
    "BACKEND_PORT",
    "UPLOAD_DIR",
    "PUBLIC_LISTINGS_SQLITE_PATH",
    "OCTO_ADMIN_SQLITE_PATH",
  ] as const;

  for (const key of required) {
    it(`throws when ${key} is absent`, () => {
      const vars = { ...PROD_MIN_VALID, [key]: undefined };
      withEnv(vars, () => {
        assert.throws(() => resolveEnv(), EnvError);
      });
    });
  }
});

// ── production fail-closed: secrets too short ─────────────────────────────────

describe("resolveEnv — production fails closed on short secrets", () => {
  it("throws when JWT_SECRET is shorter than 32 chars", () => {
    withEnv({ ...PROD_MIN_VALID, JWT_SECRET: "short" }, () => {
      assert.throws(() => resolveEnv(), EnvError);
    });
  });

  it("throws when NEXTAUTH_SECRET is shorter than 32 chars", () => {
    withEnv({ ...PROD_MIN_VALID, NEXTAUTH_SECRET: "short" }, () => {
      assert.throws(() => resolveEnv(), EnvError);
    });
  });

  it("throws when SESSION_SECRET is shorter than 32 chars", () => {
    withEnv({ ...PROD_MIN_VALID, SESSION_SECRET: "short" }, () => {
      assert.throws(() => resolveEnv(), EnvError);
    });
  });
});

// ── production fail-closed: loopback enforcement ─────────────────────────────

describe("resolveEnv — production loopback enforcement", () => {
  it("throws when OCTO_ADMIN_HOST is not 127.0.0.1", () => {
    withEnv({ ...PROD_MIN_VALID, OCTO_ADMIN_HOST: "0.0.0.0" }, () => {
      assert.throws(() => resolveEnv(), EnvError);
    });
  });

  it("throws when BACKEND_HOST is not 127.0.0.1", () => {
    withEnv({ ...PROD_MIN_VALID, BACKEND_HOST: "0.0.0.0" }, () => {
      assert.throws(() => resolveEnv(), EnvError);
    });
  });

  it("throws when INTERNAL_ADMIN_URL does not start with http://127.0.0.1:3005", () => {
    withEnv({ ...PROD_MIN_VALID, INTERNAL_ADMIN_URL: "http://0.0.0.0:3005" }, () => {
      assert.throws(() => resolveEnv(), EnvError);
    });
  });

  it("throws when INTERNAL_BACKEND_URL does not start with http://127.0.0.1:4001", () => {
    withEnv({ ...PROD_MIN_VALID, INTERNAL_BACKEND_URL: "http://0.0.0.0:4001" }, () => {
      assert.throws(() => resolveEnv(), EnvError);
    });
  });

  it("throws when CORS_ORIGIN is wildcard *", () => {
    withEnv({ ...PROD_MIN_VALID, CORS_ORIGIN: "*" }, () => {
      assert.throws(() => resolveEnv(), EnvError);
    });
  });
});

// ── RED: proven-broken cases (URL parsing required) ──────────────────────────

describe("resolveEnv — INTERNAL_ADMIN_URL must be exact loopback:3005 (URL parsed)", () => {
  it("throws when INTERNAL_ADMIN_URL is bare loopback without correct port", () => {
    withEnv({ ...PROD_MIN_VALID, INTERNAL_ADMIN_URL: "http://127.0.0.1:30050" }, () => {
      assert.throws(() => resolveEnv(), EnvError);
    });
  });

  it("throws when INTERNAL_ADMIN_URL has credential-stuffed authority (startsWith bypass)", () => {
    withEnv(
      { ...PROD_MIN_VALID, INTERNAL_ADMIN_URL: "http://127.0.0.1:3005@evil.example.com" },
      () => {
        assert.throws(() => resolveEnv(), EnvError);
      }
    );
  });

  it("throws when INTERNAL_ADMIN_URL has a path beyond bare origin", () => {
    withEnv({ ...PROD_MIN_VALID, INTERNAL_ADMIN_URL: "http://127.0.0.1:3005/extra/path" }, () => {
      assert.throws(() => resolveEnv(), EnvError);
    });
  });

  it("throws when INTERNAL_ADMIN_URL has query string", () => {
    withEnv({ ...PROD_MIN_VALID, INTERNAL_ADMIN_URL: "http://127.0.0.1:3005?x=1" }, () => {
      assert.throws(() => resolveEnv(), EnvError);
    });
  });

  it("throws when INTERNAL_ADMIN_URL has fragment", () => {
    withEnv({ ...PROD_MIN_VALID, INTERNAL_ADMIN_URL: "http://127.0.0.1:3005#hash" }, () => {
      assert.throws(() => resolveEnv(), EnvError);
    });
  });
});

describe("resolveEnv — INTERNAL_BACKEND_URL must be exact loopback:4001 (URL parsed)", () => {
  it("throws when INTERNAL_BACKEND_URL has credential-stuffed authority", () => {
    withEnv(
      { ...PROD_MIN_VALID, INTERNAL_BACKEND_URL: "http://127.0.0.1:4001@evil.example.com" },
      () => {
        assert.throws(() => resolveEnv(), EnvError);
      }
    );
  });

  it("throws when INTERNAL_BACKEND_URL has wrong port (4001X suffix)", () => {
    withEnv({ ...PROD_MIN_VALID, INTERNAL_BACKEND_URL: "http://127.0.0.1:40019" }, () => {
      assert.throws(() => resolveEnv(), EnvError);
    });
  });
});

describe("resolveEnv — NEXTAUTH_URL must be an HTTPS base origin in production", () => {
  it("throws when NEXTAUTH_URL is not-a-url", () => {
    withEnv({ ...PROD_MIN_VALID, NEXTAUTH_URL: "not-a-url" }, () => {
      assert.throws(() => resolveEnv(), EnvError);
    });
  });

  it("throws when NEXTAUTH_URL has http scheme in production", () => {
    withEnv({ ...PROD_MIN_VALID, NEXTAUTH_URL: "http://logistika.octotech.az" }, () => {
      assert.throws(() => resolveEnv(), EnvError);
    });
  });

  it("throws when NEXTAUTH_URL has a path component", () => {
    withEnv({ ...PROD_MIN_VALID, NEXTAUTH_URL: "https://logistika.octotech.az/path" }, () => {
      assert.throws(() => resolveEnv(), EnvError);
    });
  });
});

describe("resolveEnv — PUBLIC_SITE_HOST must be a valid bare DNS hostname", () => {
  it("throws when PUBLIC_SITE_HOST contains a scheme", () => {
    withEnv({ ...PROD_MIN_VALID, PUBLIC_SITE_HOST: "https://evil.example.com/path" }, () => {
      assert.throws(() => resolveEnv(), EnvError);
    });
  });

  it("throws when PUBLIC_SITE_HOST is empty-ish whitespace", () => {
    withEnv({ ...PROD_MIN_VALID, PUBLIC_SITE_HOST: "  " }, () => {
      assert.throws(() => resolveEnv(), EnvError);
    });
  });
});

describe("resolveEnv — DATABASE_URL must be a valid PostgreSQL URL", () => {
  it("throws when DATABASE_URL is not a valid URL", () => {
    withEnv({ ...PROD_MIN_VALID, DATABASE_URL: "not-a-postgres-url" }, () => {
      assert.throws(() => resolveEnv(), EnvError);
    });
  });

  it("throws when DATABASE_URL uses a non-postgres scheme", () => {
    withEnv({ ...PROD_MIN_VALID, DATABASE_URL: "mysql://user:pass@host/db" }, () => {
      assert.throws(() => resolveEnv(), EnvError);
    });
  });
});

describe("resolveEnv — ports must be exactly 3005 and 4001 in production", () => {
  it("throws when OCTO_ADMIN_PORT is 9999", () => {
    withEnv({ ...PROD_MIN_VALID, OCTO_ADMIN_PORT: "9999" }, () => {
      assert.throws(() => resolveEnv(), EnvError);
    });
  });

  it("throws when BACKEND_PORT is 9998", () => {
    withEnv({ ...PROD_MIN_VALID, BACKEND_PORT: "9998" }, () => {
      assert.throws(() => resolveEnv(), EnvError);
    });
  });
});

describe("resolveEnv — CORS_ORIGIN must be comma-separated HTTPS base origins from known hosts", () => {
  it("throws when CORS_ORIGIN contains a malformed entry", () => {
    withEnv({ ...PROD_MIN_VALID, CORS_ORIGIN: "not-an-origin,https://logistika.octotech.az" }, () => {
      assert.throws(() => resolveEnv(), EnvError);
    });
  });

  it("throws when CORS_ORIGIN contains a wildcard origin entry", () => {
    withEnv({ ...PROD_MIN_VALID, CORS_ORIGIN: "*" }, () => {
      assert.throws(() => resolveEnv(), EnvError);
    });
  });

  it("throws when CORS_ORIGIN contains an HTTP (non-HTTPS) origin", () => {
    withEnv({ ...PROD_MIN_VALID, CORS_ORIGIN: "http://logistika.octotech.az" }, () => {
      assert.throws(() => resolveEnv(), EnvError);
    });
  });

  it("throws when CORS_ORIGIN contains an origin with a path", () => {
    withEnv({ ...PROD_MIN_VALID, CORS_ORIGIN: "https://logistika.octotech.az/path" }, () => {
      assert.throws(() => resolveEnv(), EnvError);
    });
  });

  it("throws when CORS_ORIGIN contains a host not in the configured host set", () => {
    withEnv({ ...PROD_MIN_VALID, CORS_ORIGIN: "https://evil.example.com" }, () => {
      assert.throws(() => resolveEnv(), EnvError);
    });
  });

  it("accepts comma-separated list of valid HTTPS origins from the known host set", () => {
    const multiOrigin =
      "https://logistika.octotech.az,https://portal-logistika.octotech.az,https://admin-logistika.octotech.az";
    withEnv(
      {
        ...PROD_MIN_VALID,
        CORS_ORIGIN: multiOrigin,
        PUBLIC_SITE_HOST: "logistika.octotech.az",
        PORTAL_HOST: "portal-logistika.octotech.az",
        ADMIN_HOST: "admin-logistika.octotech.az",
      },
      () => {
        assert.doesNotThrow(() => resolveEnv());
      }
    );
  });
});

// ── DNS label syntax enforcement via resolveEnv ───────────────────────────────

describe("resolveEnv — PUBLIC_SITE_HOST DNS label syntax enforced", () => {
  it("throws when PUBLIC_SITE_HOST label starts with hyphen", () => {
    withEnv({ ...PROD_MIN_VALID, PUBLIC_SITE_HOST: "-bad.octotech.az" }, () => {
      assert.throws(() => resolveEnv(), EnvError);
    });
  });

  it("throws when PUBLIC_SITE_HOST has underscore in label", () => {
    withEnv({ ...PROD_MIN_VALID, PUBLIC_SITE_HOST: "foo_bar.octotech.az" }, () => {
      assert.throws(() => resolveEnv(), EnvError);
    });
  });

  it("throws when PUBLIC_SITE_HOST is an IP literal", () => {
    withEnv({ ...PROD_MIN_VALID, PUBLIC_SITE_HOST: "192.168.1.1" }, () => {
      assert.throws(() => resolveEnv(), EnvError);
    });
  });

  it("throws when PUBLIC_SITE_HOST is a single-label name", () => {
    withEnv({ ...PROD_MIN_VALID, PUBLIC_SITE_HOST: "localhost" }, () => {
      assert.throws(() => resolveEnv(), EnvError);
    });
  });
});

// ── pairwise distinctness of PUBLIC_SITE_HOST / PORTAL_HOST / ADMIN_HOST ──────

describe("resolveEnv — host vars must be pairwise distinct", () => {
  it("throws when PUBLIC_SITE_HOST equals PORTAL_HOST", () => {
    withEnv(
      {
        ...PROD_MIN_VALID,
        PUBLIC_SITE_HOST: "logistika.octotech.az",
        PORTAL_HOST: "logistika.octotech.az",
        ADMIN_HOST: "admin-logistika.octotech.az",
        CORS_ORIGIN: "https://logistika.octotech.az",
      },
      () => {
        assert.throws(() => resolveEnv(), EnvError);
      }
    );
  });

  it("throws when PUBLIC_SITE_HOST equals ADMIN_HOST", () => {
    withEnv(
      {
        ...PROD_MIN_VALID,
        PUBLIC_SITE_HOST: "logistika.octotech.az",
        PORTAL_HOST: "portal-logistika.octotech.az",
        ADMIN_HOST: "logistika.octotech.az",
        CORS_ORIGIN: "https://logistika.octotech.az",
      },
      () => {
        assert.throws(() => resolveEnv(), EnvError);
      }
    );
  });

  it("throws when PORTAL_HOST equals ADMIN_HOST", () => {
    withEnv(
      {
        ...PROD_MIN_VALID,
        PUBLIC_SITE_HOST: "logistika.octotech.az",
        PORTAL_HOST: "portal-logistika.octotech.az",
        ADMIN_HOST: "portal-logistika.octotech.az",
        NEXTAUTH_URL: "https://logistika.octotech.az",
        NEXT_PUBLIC_APP_URL: "https://logistika.octotech.az",
        CORS_ORIGIN: "https://logistika.octotech.az",
      },
      () => {
        assert.throws(() => resolveEnv(), EnvError);
      }
    );
  });

  it("treats mixed-case as same host for distinctness (case-insensitive)", () => {
    withEnv(
      {
        ...PROD_MIN_VALID,
        PUBLIC_SITE_HOST: "LOGISTIKA.OCTOTECH.AZ",
        PORTAL_HOST: "logistika.octotech.az",
        ADMIN_HOST: "admin-logistika.octotech.az",
        CORS_ORIGIN: "https://logistika.octotech.az",
      },
      () => {
        assert.throws(() => resolveEnv(), EnvError);
      }
    );
  });
});

// ── NEXTAUTH_URL / NEXT_PUBLIC_APP_URL must align with PUBLIC_SITE_HOST ───────

describe("resolveEnv — NEXTAUTH_URL and NEXT_PUBLIC_APP_URL must match PUBLIC_SITE_HOST", () => {
  it("throws when NEXTAUTH_URL hostname differs from PUBLIC_SITE_HOST", () => {
    withEnv(
      {
        ...PROD_MIN_VALID,
        PUBLIC_SITE_HOST: "logistika.octotech.az",
        NEXTAUTH_URL: "https://other.octotech.az",
      },
      () => {
        assert.throws(() => resolveEnv(), EnvError);
      }
    );
  });

  it("throws when NEXT_PUBLIC_APP_URL hostname differs from PUBLIC_SITE_HOST", () => {
    withEnv(
      {
        ...PROD_MIN_VALID,
        PUBLIC_SITE_HOST: "logistika.octotech.az",
        NEXT_PUBLIC_APP_URL: "https://other.octotech.az",
      },
      () => {
        assert.throws(() => resolveEnv(), EnvError);
      }
    );
  });

  it("accepts when NEXTAUTH_URL hostname matches PUBLIC_SITE_HOST (canonical)", () => {
    withEnv(
      {
        ...PROD_MIN_VALID,
        PUBLIC_SITE_HOST: "logistika.octotech.az",
        NEXTAUTH_URL: "https://logistika.octotech.az",
        NEXT_PUBLIC_APP_URL: "https://logistika.octotech.az",
      },
      () => {
        assert.doesNotThrow(() => resolveEnv());
      }
    );
  });
});

// ── DATABASE_URL hostname and pathname requirements ───────────────────────────

describe("resolveEnv — DATABASE_URL hostname and pathname required", () => {
  it("throws when DATABASE_URL has empty hostname", () => {
    withEnv({ ...PROD_MIN_VALID, DATABASE_URL: "postgresql:///mydb" }, () => {
      assert.throws(() => resolveEnv(), EnvError);
    });
  });

  it("throws when DATABASE_URL has only / as pathname", () => {
    withEnv({ ...PROD_MIN_VALID, DATABASE_URL: "postgresql://host/" }, () => {
      assert.throws(() => resolveEnv(), EnvError);
    });
  });
});

// ── HTTPS origin must not have explicit port ──────────────────────────────────

describe("resolveEnv — NEXTAUTH_URL must not have explicit port", () => {
  it("throws when NEXTAUTH_URL has explicit non-default port", () => {
    withEnv({ ...PROD_MIN_VALID, NEXTAUTH_URL: "https://logistika.octotech.az:8443" }, () => {
      assert.throws(() => resolveEnv(), EnvError);
    });
  });
});

// ── validateEnv ───────────────────────────────────────────────────────────────

describe("validateEnv", () => {
  it("returns ok:true in development", () => {
    const result = validateEnv();
    assert.equal(result.ok, true);
  });

  it("returns ok:true in production with all vars set", () => {
    withEnv(PROD_MIN_VALID, () => {
      const result = validateEnv();
      assert.equal(result.ok, true);
    });
  });

  it("returns ok:false with errors array when production var missing", () => {
    withEnv({ ...PROD_MIN_VALID, DATABASE_URL: undefined }, () => {
      const result = validateEnv();
      assert.equal(result.ok, false);
      if (!result.ok) {
        assert.ok(result.errors.length > 0);
        // Must not print the value — check error message does not contain a URL
        assert.ok(!result.errors[0].includes("postgresql://"));
      }
    });
  });
});