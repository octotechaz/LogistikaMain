/**
 * Shared auth cookie options for Next.js Set-Cookie.
 * Cookie Domain must be a parent of all public/portal/admin hosts so login
 * survives subdomain switches (e.g. tranzit.test ↔ portal.tranzit.test).
 *
 * Note: Domain=.localhost is blocked by the Public Suffix List — local hosts
 * must use a real parent like *.tranzit.test (see AUTH_COOKIE_DOMAIN / hosts).
 */

export type AuthCookieOptions = {
  httpOnly: true;
  sameSite: "lax";
  secure: boolean;
  path: "/";
  maxAge: number;
  domain?: string;
};

type EnvRecord = Partial<Record<string, string | undefined>>;

function isNgrokHostname(host: string | null | undefined): boolean {
  const bare = String(host || "").split(":")[0].toLowerCase();
  if (!bare) return false;
  return (
    bare.endsWith(".ngrok-free.app") ||
    bare.endsWith(".ngrok-free.dev") ||
    bare.endsWith(".ngrok.app") ||
    bare.endsWith(".ngrok.io") ||
    bare.endsWith(".ngrok.dev")
  );
}

function isNgrokTunnelMode(env: EnvRecord = process.env): boolean {
  if (env.NGROK_TUNNEL === "1" || env.NGROK_TUNNEL === "true") return true;
  return [env.PUBLIC_SITE_HOST, env.PORTAL_HOST, env.ADMIN_HOST].some((host) => isNgrokHostname(host));
}

function bareHost(host: string): string {
  if (!host) return "";
  const ipv6 = host.match(/^(\[.+\])(:\d+)?$/);
  if (ipv6) return ipv6[1].toLowerCase();
  return host.split(":")[0].toLowerCase();
}

function isLocalHttpHost(host: string): boolean {
  const bare = bareHost(host);
  return (
    bare === "localhost" ||
    bare.endsWith(".localhost") ||
    bare === "127.0.0.1" ||
    bare.endsWith(".tranzit.test") ||
    bare === "tranzit.test" ||
    bare.endsWith(".lvh.me") ||
    bare === "lvh.me" ||
    bare.endsWith(".localtest.me") ||
    bare === "localtest.me"
  );
}

/**
 * Parent cookie domain shared by public + portal (+ admin) hosts.
 * Prefer AUTH_COOKIE_DOMAIN; otherwise derive when PORTAL_HOST is portal.<PUBLIC>.
 */
export function resolveAuthCookieDomain(env: EnvRecord = process.env): string | undefined {
  if (isNgrokTunnelMode(env)) {
    const explicit = (env.AUTH_COOKIE_DOMAIN ?? "").trim();
    return explicit || undefined;
  }

  const explicit = (env.AUTH_COOKIE_DOMAIN ?? "").trim();
  if (explicit) {
    // Never allow PSL-blocked .localhost
    const normalized = explicit.startsWith(".") ? explicit.toLowerCase() : `.${explicit.toLowerCase()}`;
    if (normalized === ".localhost" || normalized === ".test" || normalized === ".local") {
      return undefined;
    }
    return normalized;
  }

  const publicSite = bareHost(env.PUBLIC_SITE_HOST ?? "");
  const portal = bareHost(env.PORTAL_HOST ?? "");
  if (!publicSite || !portal) return undefined;

  if (portal === `portal.${publicSite}`) {
    if (publicSite === "localhost") return undefined;
    return `.${publicSite}`;
  }

  return undefined;
}

export function authCookieSecure(env: EnvRecord = process.env): boolean {
  if (env.AUTH_COOKIE_SECURE === "true") return true;
  if (env.AUTH_COOKIE_SECURE === "false") return false;

  if (isNgrokTunnelMode(env)) return true;

  const hosts = [env.PUBLIC_SITE_HOST, env.PORTAL_HOST, env.ADMIN_HOST];
  if (hosts.some((h) => h && isLocalHttpHost(h))) return false;

  const nextauth = env.NEXTAUTH_URL ?? "";
  if (nextauth.startsWith("http://")) return false;

  return env.NODE_ENV === "production";
}

/** Options for setting the JWT session cookie. */
export function authCookieSetOptions(
  maxAge = 60 * 60 * 24 * 7,
  env: EnvRecord = process.env
): AuthCookieOptions {
  const domain = resolveAuthCookieDomain(env);
  return {
    httpOnly: true,
    sameSite: "lax",
    secure: authCookieSecure(env),
    path: "/",
    maxAge,
    ...(domain ? { domain } : {}),
  };
}

/** Options for clearing the JWT session cookie (must match domain/secure/path). */
export function authCookieClearOptions(env: EnvRecord = process.env): AuthCookieOptions {
  return authCookieSetOptions(0, env);
}
