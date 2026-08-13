import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { config } from "../config";

const secret = new TextEncoder().encode(config.jwtSecret);

export type AuthTokenPayload = {
  sub: string;
  role: string;
  email: string;
};

export async function signAuthToken(payload: AuthTokenPayload) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secret);
}

export async function verifyAuthToken(token: string) {
  const { payload } = await jwtVerify(token, secret);

  return {
    sub: String(payload.sub),
    role: payload.role as string,
    email: String(payload.email)
  };
}

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, passwordHash: string) {
  return bcrypt.compare(password, passwordHash);
}

export function publicUser<T extends { passwordHash?: string | null }>(user: T) {
  const safeUser = { ...user };
  delete safeUser.passwordHash;
  return safeUser;
}
