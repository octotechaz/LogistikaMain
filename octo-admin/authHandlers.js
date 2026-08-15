"use strict";

const {
  loginPreGate,
  adminAuthPreGate,
  loginPostHostPolicy,
  loginGetHostPolicy,
  adminAuthGetHostPolicy,
  loginLandingTarget,
  requireAuthAction,
  isBrowserHtmlRequest,
  authCookieSetOptions,
} = require("./hostConfig");
const { composeSelectedCountryPhone } = require("./phoneUtils");

const AUTH_COOKIE = "azlog_token";

const ADMIN_LOGIN_VIEW = {
  adminPanel: true,
  emailOnly: true,
  pageTitle: "Admin Giriş — Tranzit",
  panelHeading: "Admin giriş",
  panelSubheading: "İdarəetmə panelinə e-poçt ünvanınızla daxil olun.",
};

const EMAIL_IDENTIFIER = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const INVALID_ADMIN_LOGIN = "E-poçt və ya şifrə yanlışdır.";

function resolveLoginIdentifier(body, adminOnly) {
  const raw = String(body?.email || body?.identifier || body?.phone || "").trim();
  if (adminOnly) {
    return EMAIL_IDENTIFIER.test(raw) ? raw.toLowerCase() : "";
  }
  if (/^\+?[\d\s().-]+$/.test(raw)) {
    return composeSelectedCountryPhone(body?.countryCode || "994", raw);
  }
  return raw;
}

async function issueAuthCookie(res, user, cookieMaxAgeMs) {
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret || !res || typeof res.cookie !== "function") return;

  try {
    const { SignJWT } = require("jose");
    const token = await new SignJWT({
      sub: String(user.id),
      role: user.role,
      email: user.email,
    })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime(Math.floor(cookieMaxAgeMs / 1000) + "s")
      .sign(new TextEncoder().encode(jwtSecret));

    res.cookie(AUTH_COOKIE, token, authCookieSetOptions(cookieMaxAgeMs));
  } catch (err) {
    console.error("[auth] failed to issue azlog_token", err);
  }
}

/**
 * Factory for login POST handlers.
 *
 * @param {object} repository — findLoginUser + verifyPassword
 * @param {{ adminOnly?: boolean }} [options]
 *   adminOnly: use /auth gates (ADMIN_HOST only); form posts to /auth
 */
function makeLoginPostHandler(repository, options = {}) {
  const adminOnly = options.adminOnly === true;
  const preGateFn = adminOnly ? adminAuthPreGate : loginPreGate;
  const formAction = adminOnly ? "/auth" : "/dashboard/login";

  return async function loginPostHandler(req, res) {
    const host = req.hostname || req.get("host") || "";
    const preGate = preGateFn(host);
    if (preGate.action !== "allow") {
      return res.status(404).json({ error: "Not found" });
    }

    const { password, remember } = req.body;

    try {
      const loginIdentifier = resolveLoginIdentifier(req.body || {}, adminOnly);

      if (adminOnly && !loginIdentifier) {
        return res.render("login", {
          error: INVALID_ADMIN_LOGIN,
          formAction,
          ...ADMIN_LOGIN_VIEW,
        });
      }

      const user = loginIdentifier ? await repository.findLoginUser(loginIdentifier) : null;

      if (user && await repository.verifyPassword(password, user.password)) {
        if (adminOnly && user.role !== "ADMIN") {
          return res.status(404).json({ error: "Not found" });
        }

        const hostCheck = loginPostHostPolicy(user.role, host);
        if (hostCheck.action !== "allow") {
          return res.status(404).json({ error: "Not found" });
        }

        req.session.userId = user.id;
        req.session.user = { id: user.id, email: user.email, name: user.name, role: user.role };

        let cookieMaxAge = 24 * 60 * 60 * 1000;
        if (remember === "on") {
          cookieMaxAge = 30 * 24 * 60 * 60 * 1000;
        }
        req.session.cookie.maxAge = cookieMaxAge;

        // ADMIN JWT confines public/portal browsing back to the admin panel.
        await issueAuthCookie(res, user, cookieMaxAge);

        return res.redirect(loginLandingTarget(user.role, host));
      } else {
        res.render("login", {
          error: adminOnly ? INVALID_ADMIN_LOGIN : "E-poçt (nömrə) və ya şifrə yanlışdır.",
          formAction,
          ...ADMIN_LOGIN_VIEW,
        });
      }
    } catch (error) {
      console.error(error);
      res.render("login", {
        error: "Giriş zamanı xəta baş verdi.",
        formAction,
        ...ADMIN_LOGIN_VIEW,
      });
    }
  };
}

/**
 * Factory for login GET handlers.
 *
 * @param {{ adminOnly?: boolean }} [options]
 */
function makeLoginGetHandler(options = {}) {
  const adminOnly = options.adminOnly === true;
  const formAction = adminOnly ? "/auth" : "/dashboard/login";

  return function loginGetHandler(req, res) {
    const host = req.hostname || req.get("host") || "";
    const loginPolicy = adminOnly
      ? adminAuthGetHostPolicy(host, isBrowserHtmlRequest(req))
      : loginGetHostPolicy(host, isBrowserHtmlRequest(req));

    if (loginPolicy.action === "redirect") {
      return res.redirect(loginPolicy.location);
    }
    if (loginPolicy.action === "json404") {
      return res.status(404).json({ error: "Not found" });
    }
    if (req.session.userId) {
      return res.redirect(loginLandingTarget(req.session.user && req.session.user.role, host));
    }
    res.render("login", {
      error: null,
      formAction,
      ...ADMIN_LOGIN_VIEW,
    });
  };
}

function readCookie(cookieHeader, name) {
  if (!cookieHeader || typeof cookieHeader !== "string") {
    return null;
  }
  const parts = cookieHeader.split(";");
  for (const part of parts) {
    const trimmed = part.trim();
    if (!trimmed.startsWith(`${name}=`)) {
      continue;
    }
    return decodeURIComponent(trimmed.slice(name.length + 1));
  }
  return null;
}

/**
 * Factory for the requireAuth middleware.
 *
 * Accepts Express session OR Next.js azlog_token JWT (bridges into session).
 * Unauthenticated requests on admin/portal hosts redirect to login.
 * Public or unknown hosts fail closed with 404.
 *
 * @param {{ userRepository?: { findSessionUser: Function } }} [options]
 * @returns {function} Express middleware (req, res, next)
 */
function makeRequireAuth(options = {}) {
  const userRepository = options.userRepository || null;

  return async function requireAuth(req, res, next) {
    try {
      if (req.session?.userId) {
        return next();
      }

      const token = readCookie(req.headers.cookie, AUTH_COOKIE);
      const jwtSecret = process.env.JWT_SECRET;

      if (token && jwtSecret && userRepository) {
        const { jwtVerify } = require("jose");
        const { payload } = await jwtVerify(token, new TextEncoder().encode(jwtSecret));
        const userId = String(payload.sub || "");
        const user = userId ? await userRepository.findSessionUser(userId) : null;

        if (user?.id && user.role) {
          req.session.userId = user.id;
          req.session.user = {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            profile_picture: user.profile_picture ?? null,
          };

          return req.session.save((err) => {
            if (err) {
              return next(err);
            }
            return next();
          });
        }
      }
    } catch {
      // Fall through to unauthenticated handling.
    }

    const authAction = requireAuthAction(req.hostname || req.get("host") || "");
    if (authAction.action === "redirect") {
      return res.redirect(authAction.location);
    }
    return res.status(404).json({ error: "Not found" });
  };
}

module.exports = {
  makeLoginPostHandler,
  makeLoginGetHandler,
  makeRequireAuth,
};
