"use strict";

const {
  loginPreGate,
  adminAuthPreGate,
  loginPostHostPolicy,
  loginGetHostPolicy,
  adminAuthGetHostPolicy,
  loginLandingPath,
  loginLandingTarget,
  requireAuthAction,
  isBrowserHtmlRequest,
} = require("./hostConfig");
const { composeSelectedCountryPhone } = require("./phoneUtils");

const AUTH_COOKIE = "azlog_token";

const ADMIN_LOGIN_VIEW = {
  adminPanel: true,
  pageTitle: "Admin Giriş — Tranzit",
  panelHeading: "Admin Panel",
  panelSubheading: "Yalnız idarəçi hesabı ilə daxil olun",
};

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
    const preGate = preGateFn(req.hostname || req.get("host") || "");
    if (preGate.action !== "allow") {
      return res.status(404).json({ error: "Not found" });
    }

    const { identifier, email, phone, password, remember, countryCode } = req.body;

    try {
      let loginIdentifier = (identifier || phone || email || "").trim();
      if (/^\+?[\d\s().-]+$/.test(loginIdentifier)) {
        loginIdentifier = composeSelectedCountryPhone(countryCode || "994", loginIdentifier);
      }

      const user = await repository.findLoginUser(loginIdentifier);

      if (user && await repository.verifyPassword(password, user.password)) {
        if (adminOnly && user.role !== "ADMIN") {
          return res.status(404).json({ error: "Not found" });
        }

        const hostCheck = loginPostHostPolicy(user.role, req.hostname || req.get("host") || "");
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

        res.redirect(loginLandingPath(user.role));
      } else {
        res.render("login", {
          error: "E-poçt (nömrə) və ya şifrə yanlışdır.",
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
