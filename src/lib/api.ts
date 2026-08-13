import { NextResponse } from "next/server";
import { UserStatus } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { verifyAuthToken } from "@/lib/jwt";
import { authCookieName } from "@/lib/auth";

type ErrorCode =
  | "VALIDATION_ERROR"
  | "UNAUTHENTICATED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "SERVER_ERROR"
  | "BAD_REQUEST";

export function ok<T>(data: T, init?: ResponseInit) {
  return NextResponse.json({ success: true, ok: true, data }, init);
}

function codeForStatus(status: number): ErrorCode {
  if (status === 401) return "UNAUTHENTICATED";
  if (status === 403) return "FORBIDDEN";
  if (status === 404) return "NOT_FOUND";
  if (status === 409) return "CONFLICT";
  if (status >= 500) return "SERVER_ERROR";
  return status === 400 ? "VALIDATION_ERROR" : "BAD_REQUEST";
}

export function fail(message: string, status = 400, details?: unknown, code?: ErrorCode) {
  return NextResponse.json(
    {
      success: false,
      ok: false,
      error: {
        code: code ?? codeForStatus(status),
        message
      },
      message,
      details
    },
    { status }
  );
}

export function publicUser<T extends { passwordHash?: string | null }>(user: T) {
  const safeUser = { ...user };
  delete safeUser.passwordHash;
  return safeUser;
}

export async function getApiUser(request: Request) {
  const token = request.headers
    .get("cookie")
    ?.split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${authCookieName}=`))
    ?.split("=")[1];

  if (!token) {
    return null;
  }

  try {
    const payload = await verifyAuthToken(decodeURIComponent(token));
    return prisma.user.findUnique({
      where: { id: payload.sub },
      include: {
        carrierProfile: true,
        cargoOwnerProfile: true,
        driverProfile: true,
        dispatcherProfile: true
      }
    });
  } catch {
    return null;
  }
}

export async function requireApiUser(request: Request, roles?: string[]) {
  const user = await getApiUser(request);

  if (!user) {
    return { user: null, response: fail("Giriş tələb olunur.", 401) };
  }

  if (user.status === UserStatus.BLOCKED) {
    return { user: null, response: fail("Hesabınız bloklanıb.", 403) };
  }

  if (roles && !roles.includes(user.role)) {
    return { user: null, response: fail("Bu əməliyyat üçün icazəniz yoxdur.", 403) };
  }

  return { user, response: null };
}

export function parseZodError(error: unknown) {
  if (typeof error === "object" && error && "issues" in error) {
    return (error as { issues: Array<{ path: Array<string | number>; message: string }> }).issues.map(
      (issue) => ({
        field: issue.path.join("."),
        message: issue.message
      })
    );
  }

  return undefined;
}
