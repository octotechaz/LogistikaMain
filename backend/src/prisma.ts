import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  backendPrisma?: PrismaClient;
};

export const prisma =
  globalForPrisma.backendPrisma ??
  new PrismaClient({
    log: process.env.PRISMA_LOG === "true" ? ["query", "error", "warn"] : ["error"]
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.backendPrisma = prisma;
}
