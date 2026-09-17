export declare const LOOPBACK: "127.0.0.1";
export declare const OCTO_ADMIN_PORT: 3005;
export declare const BACKEND_PORT: 4001;

export declare function validateInternalLoopbackUrl(
  key: string,
  raw: string,
  port: number
): { ok: true; href: string } | { ok: false; error: string };

export declare function validateHttpsBaseOrigin(
  key: string,
  raw: string
): { ok: true; origin: string } | { ok: false; error: string };

export declare function validateBareDnsHostname(
  key: string,
  raw: string
): { ok: true; canonical: string } | { ok: false; error: string };

export declare function validatePostgresUrl(
  raw: string
): { ok: true } | { ok: false; error: string };

export declare function validateCorsAllowlist(
  raw: string,
  allowedHosts: string[]
): { ok: true; origins: Set<string> } | { ok: false; error: string };

export declare function validateExactPort(
  key: string,
  value: number,
  expected: number
): { ok: true } | { ok: false; error: string };

export declare function validatePublicHostDistinctness(
  publicSiteHost: string,
  portalHost: string,
  adminHost: string
): { ok: true } | { ok: false; error: string };

export declare function validatePublicUrlAlignment(
  urlKey: string,
  raw: string,
  publicSiteHost: string
): { ok: true } | { ok: false; error: string };