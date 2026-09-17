import { SignJWT, jwtVerify } from "jose";
import { EnvError } from "./env";

export type AuthRole = "CARRIER" | "CARGO_OWNER" | "DRIVER" | "DISPATCHER" | "OPERATOR" | "ADMIN";

export type AuthTokenPayload = {
  sub: string;
  role: AuthRole;
  email: string;
};

/** Lazily resolve the JWT secret — fails closed in production when absent or too short. */
function resolveJwtSecret(): Uint8Array {
  const raw = process.env.JWT_SECRET;
  if (!raw) {
    if (process.env.NODE_ENV === "production") {
      throw new EnvError("Missing required production env var: JWT_SECRET");
    }
    return new TextEncoder().encode("development-secret-change-me-please-32-chars");
  }
  if (process.env.NODE_ENV === "production" && raw.length < 32) {
    throw new EnvError("Production env var JWT_SECRET is too short (minimum 32 characters)");
  }
  return new TextEncoder().encode(raw);
}

export async function signAuthToken(payload: AuthTokenPayload) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(resolveJwtSecret());
}

export async function verifyAuthToken(token: string) {
  const { payload } = await jwtVerify(token, resolveJwtSecret());

  return {
    sub: String(payload.sub),
    role: payload.role as AuthRole,
    email: String(payload.email)
  };
}