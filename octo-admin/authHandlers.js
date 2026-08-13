"use strict";

const {
  loginPreGate,
  loginPostHostPolicy,
  loginGetHostPolicy,
  loginLandingPath,
  loginLandingTarget,
  requireAuthAction,
  isBrowserHtmlRequest,
} = require("./hostConfig");
const { composeSelectedCountryPhone } = require("./phoneUtils");

const AUTH_COOKIE = "azlog_token";

/**
 * Factory for the POST /dashboard/login handler.
 *
 * Injects a user repository so tests can supply a fake.  The returned handler
 * encapsulates the full production flow:
 *   1. loginPreGate  — block public/unknown host before any DB work
 *   2. repository.findLoginUser — find user by email or phone
 *   3. repository.verifyPassword — verify password hash
 *   4. loginPostHostPolicy — enforce role/host alignment
 *   5. Session setup and redirect on success
 *
 * @param {object} repository — object with findLoginUser(identifier) and verifyPassword(password, hash)
 * @returns {function} async Express route handler (req, res)
 */
function makeLoginPostHandler(repository) {
  return async function loginPostHandler(req, res) {
    const preGate = loginPreGate(req.hostname || req.get("host") || "");
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
        res.render("login", { error: "E-poçt (nömrə) və ya şifrə yanlışdır." });
      }
    } catch (error) {
      console.error(error);
      res.render("login", { error: "Giriş zamanı xəta baş verdi." });
    }
  };
}

/**
 * Factory for the GET /dashboard/login handler.
 *
 * Admin host serves the Express EJS login. Portal/public redirect to Next /login.
 *
 * @returns {function} Express route handler (req, res)
 */
function makeLoginGetHandler() {
  return function loginGetHandler(req, res) {
    const loginPolicy = loginGetHostPolicy(
      req.hostname || req.get("host") || "",
      isBrowserHtmlRequest(req)
    );
    if (loginPolicy.action === "redirect") {
      return res.redirect(loginPolicy.location);
    }
    if (loginPolicy.action === "json404") {
      return res.status(404).json({ error: "Not found" });
    }
    if (req.session.userId) {
      return res.redirect(loginLandingTarget(req.session.user && req.session.user.role, req.hostname || req.get("host") || ""));
    }
    res.render("login", { error: null });
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
