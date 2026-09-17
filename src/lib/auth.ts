import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { verifyAuthToken } from "@/lib/jwt";

export const authCookieName = "azlog_token";

export const getCurrentUser = cache(async () => {
  const cookieStore = await cookies();
  const token = cookieStore.get(authCookieName)?.value;

  if (!token) {
    return null;
  }

  try {
    const payload = await verifyAuthToken(token);

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
});

export async function requireUser() {
  const user = await getCurrentUser();

  if (!user || user.status === "BLOCKED") {
    redirect("/login");
  }

  return user;
}

export const requireAuth = requireUser;

export async function requireRole(roles: string[]) {
  const user = await requireUser();

  if (!roles.includes(user.role)) {
    redirect("/");
  }

  return user;
}
