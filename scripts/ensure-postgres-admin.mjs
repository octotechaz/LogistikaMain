#!/usr/bin/env node
/**
 * Ensure exactly one bootstrap ADMIN user exists in PostgreSQL.
 * Credentials live in the database (password hash) — not in Portainer env.
 *
 * Idempotent: creates only when no ADMIN user exists.
 * Never overwrites an existing admin password.
 */
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";
import { fileURLToPath } from "node:url";
import path from "node:path";

/** Default bootstrap identity — stored as bcrypt hash in Postgres only. */
export const BOOTSTRAP_ADMIN = {
  firstName: "Admin",
  lastName: "Tranzit",
  email: "admin@tranzit.az",
  phone: "+994501112233",
  password: "Password123!",
  role: "ADMIN",
};

/**
 * @param {import("@prisma/client").PrismaClient} [client]
 * @returns {Promise<{ action: "created" | "exists"; email: string }>}
 */
export async function ensurePostgresAdmin(client) {
  const prisma = client || new PrismaClient();
  const ownsClient = !client;

  try {
    const existingAdmin = await prisma.user.findFirst({
      where: { role: "ADMIN" },
      select: { id: true, email: true },
    });

    if (existingAdmin) {
      return { action: "exists", email: existingAdmin.email };
    }

    const emailTaken = await prisma.user.findUnique({
      where: { email: BOOTSTRAP_ADMIN.email },
      select: { id: true, role: true },
    });
    if (emailTaken) {
      await prisma.user.update({
        where: { id: emailTaken.id },
        data: { role: "ADMIN", status: "ACTIVE" },
      });
      return { action: "exists", email: BOOTSTRAP_ADMIN.email };
    }

    const phoneTaken = await prisma.user.findUnique({
      where: { phone: BOOTSTRAP_ADMIN.phone },
      select: { id: true },
    });
    if (phoneTaken) {
      throw new Error(
        "Cannot create bootstrap admin: phone already used by another user"
      );
    }

    const passwordHash = await bcrypt.hash(BOOTSTRAP_ADMIN.password, 12);
    await prisma.user.create({
      data: {
        firstName: BOOTSTRAP_ADMIN.firstName,
        lastName: BOOTSTRAP_ADMIN.lastName,
        email: BOOTSTRAP_ADMIN.email,
        phone: BOOTSTRAP_ADMIN.phone,
        passwordHash,
        role: "ADMIN",
        status: "ACTIVE",
      },
    });

    return { action: "created", email: BOOTSTRAP_ADMIN.email };
  } finally {
    if (ownsClient) {
      await prisma.$disconnect();
    }
  }
}

async function main() {
  const result = await ensurePostgresAdmin();
  if (result.action === "created") {
    console.log(`PostgreSQL admin created: ${result.email}`);
    console.log("Admin login URL: https://admin.tranzit.az/dashboard/login");
    console.log(`Email: ${BOOTSTRAP_ADMIN.email}`);
    console.log(`Password: ${BOOTSTRAP_ADMIN.password}`);
  } else {
    console.log(`PostgreSQL admin already present: ${result.email}`);
  }
}

const isDirectRun =
  Boolean(process.argv[1]) &&
  path.resolve(fileURLToPath(import.meta.url)) === path.resolve(process.argv[1]);

if (isDirectRun) {
  main().catch((err) => {
    console.error("ensure-postgres-admin failed:", err?.message || err);
    process.exit(1);
  });
}
