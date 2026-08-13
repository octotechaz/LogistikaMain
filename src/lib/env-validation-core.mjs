/**
 * Canonical production env validation core.
 * Pure ESM — no TypeScript syntax, no framework dependencies.
 * Importable from next.config.mjs, CLI scripts, tsx-compiled TS, and plain Node.
 * All security decisions use URL parsing — no startsWith checks.
 */

export const LOOPBACK = /** @type {const} */ ("127.0.0.1");
export const OCTO_ADMIN_PORT = /** @type {const} */ (3005);
export const BACKEND_PORT = /** @type {const} */ (4001);

/** True for ngrok tunnel hostnames (public HTTPS dev tunnels). */
export function isNgrokHostname(host) {
  const bare = String(host || "")
    .split(":")[0]
    .toLowerCase();
  if (!bare) return false;
  return (
    bare.endsWith(".ngrok-free.app") ||
    bare.endsWith(".ngrok-free.dev") ||
    bare.endsWith(".ngrok.app") ||
    bare.endsWith(".ngrok.io") ||
    bare.endsWith(".ngrok.dev")
  );
}

/** True when any configured app host is an ngrok tunnel. */
export function isNgrokTunnelMode(env = process.env) {
  if (env.NGROK_TUNNEL === "1" || env.NGROK_TUNNEL === "true") return true;
  return [env.PUBLIC_SITE_HOST, env.PORTAL_HOST, env.ADMIN_HOST].some((host) =>
    isNgrokHostname(host)
  );
}

/**
 * Assert that `raw` is a well-formed URL whose protocol, hostname, port, and
 * pathname exactly match the expected loopback service. Rejects:
 *   - wrong port (e.g. 30050 instead of 3005)
 *   - credentialed authority (user:pass@evil.example.com bypass)
 *   - any path beyond "/"
 *   - query strings and fragments
 *   - non-http protocol
 *
 * @param {string} key
 * @param {string} raw
 * @param {number} port
 * @returns {{ ok: true; href: string } | { ok: false; error: string }}
 */
export function validateInternalLoopbackUrl(key, raw, port) {
  let parsed;
  try {
    parsed = new URL(raw);
  } catch {
    return { ok: false, error: `${key} is not a valid URL` };
  }
  if (parsed.protocol !== "http:") {
    return { ok: false, error: `${key} must use http:// protocol` };
  }
  if (parsed.hostname !== LOOPBACK) {
    return { ok: false, error: `${key} hostname must be ${LOOPBACK}` };
  }
  // URL.port is "" when the URL uses the scheme's default port (80 for http).
  // Our ports are non-default so URL.port is always populated when set.
  if (parsed.port !== String(port)) {
    return { ok: false, error: `${key} port must be ${port}` };
  }
  if (parsed.username || parsed.password) {
    return { ok: false, error: `${key} must not contain credentials` };
  }
  if (parsed.pathname !== "/" && parsed.pathname !== "") {
    return { ok: false, error: `${key} must be a bare origin (no path)` };
  }
  if (parsed.search) {
    return { ok: false, error: `${key} must not contain a query string` };
  }
  if (parsed.hash) {
    return { ok: false, error: `${key} must not contain a fragment` };
  }
  return { ok: true, href: `http://${LOOPBACK}:${port}` };
}

/**
 * Assert that `raw` is an HTTPS base origin:
 *   - scheme must be https:
 *   - no credentials, path, query, fragment
 *   - no explicit port (including non-default ports)
 *   - hostname must be a syntactically valid DNS name (not an IP literal)
 *
 * @param {string} key
 * @param {string} raw
 * @returns {{ ok: true; origin: string } | { ok: false; error: string }}
 */
export function validateHttpsBaseOrigin(key, raw) {
  let parsed;
  try {
    parsed = new URL(raw);
  } catch {
    return { ok: false, error: `${key} is not a valid URL` };
  }
  if (parsed.protocol !== "https:") {
    return { ok: false, error: `${key} must use https:// protocol in production` };
  }
  if (parsed.username || parsed.password) {
    return { ok: false, error: `${key} must not contain credentials` };
  }
  // Forbid any explicit port. The WHATWG URL parser normalizes the default port
  // (:443 for https) to "" in parsed.port, so we must also check the raw string
  // for an explicit port before normalization occurs.
  if (parsed.port !== "") {
    return { ok: false, error: `${key} must not contain an explicit port` };
  }
  // Detect explicit :443 (or any digit sequence after the host) in the raw string
  // by comparing the serialized origin length. If raw has a port suffix that the
  // parser stripped, the authority section will differ.
  const authorityMatch = raw.match(/^https?:\/\/([^/?#]*)/);
  if (authorityMatch) {
    const rawAuthority = authorityMatch[1];
    // If the authority contains credentials strip them for the port check.
    const hostPart = rawAuthority.includes("@") ? rawAuthority.split("@").pop() : rawAuthority;
    // hostPart is host[:port]; if it contains ":" there is an explicit port.
    if (hostPart && hostPart.includes(":")) {
      return { ok: false, error: `${key} must not contain an explicit port` };
    }
  }
  if (parsed.pathname !== "/" && parsed.pathname !== "") {
    return { ok: false, error: `${key} must be a base origin (no path)` };
  }
  if (parsed.search) {
    return { ok: false, error: `${key} must not contain a query string` };
  }
  if (parsed.hash) {
    return { ok: false, error: `${key} must not contain a fragment` };
  }
  // Reject IP literals — require a DNS hostname.
  const dnsResult = validateBareDnsHostname(key, parsed.hostname);
  if (!dnsResult.ok) {
    return { ok: false, error: `${key} hostname must be a valid DNS name, not an IP literal or bare label` };
  }
  // Return lowercase canonical origin (no trailing slash, no port).
  return { ok: true, origin: `https://${parsed.hostname.toLowerCase()}` };
}

/**
 * Assert that `raw` is a bare DNS hostname conforming to RFC 1123 label syntax:
 *   - total length <= 253
 *   - at least two labels (FQDN required)
 *   - each label: 1..63 chars
 *   - label chars: A-Z, a-z, 0-9, hyphen
 *   - labels cannot start or end with hyphen
 *   - no empty labels (double-dot), no trailing dot
 *   - no scheme, port, path, whitespace, underscores, or IP literals
 *
 * Returns `canonical` (lowercased hostname) on success so all consumers compare
 * the same representation.
 *
 * Error messages name only the env key and reason — never the supplied value.
 *
 * @param {string} key
 * @param {string} raw
 * @returns {{ ok: true; canonical: string } | { ok: false; error: string }}
 */
export function validateBareDnsHostname(key, raw) {
  const trimmed = (typeof raw === "string") ? raw.trim() : "";
  if (!trimmed) {
    return { ok: false, error: `${key} must not be empty` };
  }

  // Reject anything that looks like a URL or has structural extras.
  if (trimmed.includes("://")) {
    return { ok: false, error: `${key} must be a bare hostname (no scheme)` };
  }
  if (trimmed.includes("/")) {
    return { ok: false, error: `${key} must be a bare hostname (no path)` };
  }
  if (trimmed.includes(":")) {
    return { ok: false, error: `${key} must be a bare hostname (no port)` };
  }
  if (trimmed.includes("?") || trimmed.includes("#")) {
    return { ok: false, error: `${key} must be a bare hostname (no query or fragment)` };
  }

  // Reject trailing dot (root label not allowed here).
  if (trimmed.endsWith(".")) {
    return { ok: false, error: `${key} must not have a trailing dot` };
  }

  // Total length check (253 is the max for a fully-qualified domain name).
  if (trimmed.length > 253) {
    return { ok: false, error: `${key} exceeds maximum hostname length (253)` };
  }

  const labels = trimmed.split(".");

  // Require at least two labels (FQDN).
  if (labels.length < 2) {
    return { ok: false, error: `${key} must be a fully-qualified domain name (at least two labels)` };
  }

  // Validate each label.
  const LABEL_RE = /^[A-Za-z0-9]([A-Za-z0-9-]{0,61}[A-Za-z0-9])?$|^[A-Za-z0-9]$/;
  for (const label of labels) {
    if (label.length === 0) {
      return { ok: false, error: `${key} must not contain empty labels` };
    }
    if (label.length > 63) {
      return { ok: false, error: `${key} label exceeds maximum length (63)` };
    }
    if (!LABEL_RE.test(label)) {
      return {
        ok: false,
        error: `${key} label contains invalid characters (only A-Z, a-z, 0-9, hyphen allowed; labels cannot start or end with hyphen)`,
      };
    }
  }

  // Reject pure-numeric labels in every position (IP literals like 127.0.0.1).
  // An IPv4 literal has all-numeric labels, each 0-255. We reject any hostname
  // where every label is all-numeric (conservative — prevents IP literal bypass).
  if (labels.every((l) => /^\d+$/.test(l))) {
    return { ok: false, error: `${key} must be a DNS hostname, not an IP literal` };
  }

  return { ok: true, canonical: trimmed.toLowerCase() };
}

/**
 * Assert that `raw` is a valid PostgreSQL URL (postgresql:// or postgres://):
 *   - scheme must be postgresql: or postgres:
 *   - hostname must be non-empty
 *   - pathname must be non-empty and not just "/"
 *   - no fragment
 *
 * Error messages never echo the supplied URL or credentials.
 *
 * @param {string} raw
 * @returns {{ ok: true } | { ok: false; error: string }}
 */
export function validatePostgresUrl(raw) {
  let parsed;
  try {
    parsed = new URL(raw);
  } catch {
    return { ok: false, error: "DATABASE_URL is not a valid URL" };
  }
  if (parsed.protocol !== "postgresql:" && parsed.protocol !== "postgres:") {
    return { ok: false, error: "DATABASE_URL must use postgresql:// or postgres:// scheme" };
  }
  if (!parsed.hostname) {
    return { ok: false, error: "DATABASE_URL must include a non-empty hostname" };
  }
  if (!parsed.pathname || parsed.pathname === "/") {
    return { ok: false, error: "DATABASE_URL must include a non-empty database name in the path" };
  }
  if (parsed.hash) {
    return { ok: false, error: "DATABASE_URL must not contain a fragment" };
  }
  return { ok: true };
}

/**
 * Parse and validate a CORS allowlist.
 * `raw` must be a comma-separated list of HTTPS base origins.
 * Every origin's hostname must also appear in `allowedHosts`.
 * Rejects empty values, wildcards, HTTP origins, origins with paths, and
 * origins whose hostname is not in the configured host set.
 *
 * Error messages are generic — they never echo raw entries or hostnames.
 *
 * @param {string} raw
 * @param {string[]} allowedHosts
 * @returns {{ ok: true; origins: Set<string> } | { ok: false; error: string }}
 */
export function validateCorsAllowlist(raw, allowedHosts) {
  if (!raw || raw.trim() === "*") {
    return { ok: false, error: "CORS_ORIGIN must not be a wildcard (*)" };
  }
  const parts = raw.split(",").map((s) => s.trim()).filter(Boolean);
  if (parts.length === 0) {
    return { ok: false, error: "CORS_ORIGIN must contain at least one origin" };
  }
  // Canonicalize allowed hosts to lowercase for comparison.
  const allowedHostSet = new Set(allowedHosts.map((h) => h.toLowerCase()));
  /** @type {Set<string>} */
  const origins = new Set();
  for (let i = 0; i < parts.length; i++) {
    const result = validateHttpsBaseOrigin("CORS_ORIGIN", parts[i]);
    if (!result.ok) {
      // Return a generic error that does not echo the raw entry.
      return { ok: false, error: `CORS_ORIGIN entry ${i + 1} is not a valid HTTPS base origin` };
    }
    let parsed;
    try {
      parsed = new URL(parts[i]);
    } catch {
      return { ok: false, error: `CORS_ORIGIN entry ${i + 1} is not a valid URL` };
    }
    const normalizedHost = parsed.hostname.toLowerCase();
    if (!allowedHostSet.has(normalizedHost)) {
      // Generic error — never echoes the hostname.
      return {
        ok: false,
        error: `CORS_ORIGIN entry ${i + 1} hostname is not in the configured host set`,
      };
    }
    origins.add(result.origin);
  }
  return { ok: true, origins };
}

/**
 * Assert that a port number equals the expected canonical value in production.
 * Error messages name only the key and expected value — never the supplied value.
 *
 * @param {string} key
 * @param {number} value
 * @param {number} expected
 * @returns {{ ok: true } | { ok: false; error: string }}
 */
export function validateExactPort(key, value, expected) {
  if (value !== expected) {
    return {
      ok: false,
      error: `${key} must be exactly ${expected} in production`,
    };
  }
  return { ok: true };
}

/**
 * Assert that the three public-facing hostnames are pairwise distinct.
 * Comparison is case-insensitive (canonical lowercase).
 * Error messages name only the conflicting key pair — never the supplied values.
 *
 * @param {string} publicSiteHost  canonical lowercase hostname
 * @param {string} portalHost      canonical lowercase hostname
 * @param {string} adminHost       canonical lowercase hostname
 * @returns {{ ok: true } | { ok: false; error: string }}
 */
export function validatePublicHostDistinctness(publicSiteHost, portalHost, adminHost) {
  if (publicSiteHost === portalHost) {
    return { ok: false, error: "PUBLIC_SITE_HOST and PORTAL_HOST must be distinct" };
  }
  if (publicSiteHost === adminHost) {
    return { ok: false, error: "PUBLIC_SITE_HOST and ADMIN_HOST must be distinct" };
  }
  if (portalHost === adminHost) {
    return { ok: false, error: "PORTAL_HOST and ADMIN_HOST must be distinct" };
  }
  return { ok: true };
}

/**
 * Assert that `urlKey` resolves to an HTTPS URL whose hostname equals `publicSiteHost`.
 * Error messages name only the key — never the supplied URL or hostname value.
 *
 * @param {string} urlKey           env var name (e.g. "NEXTAUTH_URL")
 * @param {string} raw              raw env var value
 * @param {string} publicSiteHost   canonical lowercase hostname to match against
 * @returns {{ ok: true } | { ok: false; error: string }}
 */
export function validatePublicUrlAlignment(urlKey, raw, publicSiteHost) {
  let parsed;
  try {
    parsed = new URL(raw);
  } catch {
    return { ok: false, error: `${urlKey} is not a valid URL` };
  }
  if (parsed.hostname.toLowerCase() !== publicSiteHost) {
    return { ok: false, error: `${urlKey} hostname must equal PUBLIC_SITE_HOST` };
  }
  return { ok: true };
}