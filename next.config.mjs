/** @type {import('next').NextConfig} */

import {
  LOOPBACK,
  OCTO_ADMIN_PORT,
  validateInternalLoopbackUrl,
} from "./src/lib/env-validation-core.mjs";

const isProd = process.env.NODE_ENV === "production";

function isNextBuild() {
  return (
    process.env.NEXT_PHASE === "phase-production-build" ||
    process.env.npm_lifecycle_event === "build"
  );
}

function resolveInternalAdminUrl() {
  const fallback = `http://${LOOPBACK}:${OCTO_ADMIN_PORT}`;
  const value = process.env.INTERNAL_ADMIN_URL;
  if (!value) {
    // `next build` sets NODE_ENV=production before runtime env exists (Docker/Portainer).
    if (isProd && !isNextBuild()) {
      throw new Error(
        "INTERNAL_ADMIN_URL is required in production — refusing to start with a hardcoded default"
      );
    }
    return fallback;
  }
  if (isProd) {
    const result = validateInternalLoopbackUrl("INTERNAL_ADMIN_URL", value, OCTO_ADMIN_PORT);
    if (!result.ok) {
      throw new Error(`INTERNAL_ADMIN_URL validation failed: ${result.error}`);
    }
  }
  return value;
}

const internalAdminUrl = resolveInternalAdminUrl();

const nextConfig = {
  devIndicators: false,
  experimental: {
    // Listing photos can be up to 150 MB; default middleware limit is 10 MB.
    middlewareClientMaxBodySize: "150mb",
  },
  serverExternalPackages: ["better-sqlite3"],
  images: {
    remotePatterns: [
      {
        protocol: "http",
        hostname: LOOPBACK,
        port: String(OCTO_ADMIN_PORT),
        pathname: "/uploads/**",
      },
    ],
  },
  async rewrites() {
    return [
      // Canonical admin login on ADMIN_HOST (exact /auth only — do not
      // rewrite /auth/login|/auth/register|/auth/forgot-password).
      {
        source: "/auth",
        destination: `${internalAdminUrl}/auth`,
      },
      {
        source: "/dashboard",
        destination: `${internalAdminUrl}/dashboard`,
      },
      {
        source: "/dashboard/:path*",
        destination: `${internalAdminUrl}/dashboard/:path*`,
      },
      {
        source: "/octo-admin",
        destination: `${internalAdminUrl}/octo-admin`,
      },
      {
        source: "/octo-admin/:path*",
        destination: `${internalAdminUrl}/octo-admin/:path*`,
      },
      {
        source: "/uploads/:path*",
        destination: `${internalAdminUrl}/uploads/:path*`,
      },
    ];
  },
  async redirects() {
    return [
      {
        source: "/cargo-owner/l",
        destination: "/cargo-owner/loads",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;