export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { prisma } = await import("@/lib/prisma");
    try {
      await prisma.$executeRawUnsafe(`
        ALTER TABLE "CargoPost" ADD COLUMN IF NOT EXISTS "translations" JSONB;
      `);
      await prisma.$executeRawUnsafe(`
        ALTER TABLE "PublicCategory" ADD COLUMN IF NOT EXISTS "labelTranslations" JSONB;
      `);
    } catch {
      // column may already exist or DB not reachable yet — silently ignore
    }
  }
}