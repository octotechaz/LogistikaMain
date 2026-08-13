/** @type {import('next').NextConfig} */

import {
  LOOPBACK,
  OCTO_ADMIN_PORT,
  validateInternalLoopbackUrl,
} from "./src/lib/env-validation-core.mjs";

const isProd = process.env.NODE_ENV === "production";

function resolveInternalAdminUrl() {
  const value = process.env.INTERNAL_ADMIN_URL;
  if (!value) {
    if (isProd) {
      throw new Error(
        "INTERNAL_ADMIN_URL is required in production — refusing to start with a hardcoded default"
      );
    }
    return `http://${LOOPBACK}:${OCTO_ADMIN_PORT}`;
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
        source: "/dashboard/login",
        destination: "/login",
        permanent: false,
      },
      {
        source: "/cargo-owner/l",
        destination: "/cargo-owner/loads",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;