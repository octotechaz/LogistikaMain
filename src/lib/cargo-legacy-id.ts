import "server-only";

import { prisma } from "@/lib/prisma";

export async function allocateLegacySqliteId(): Promise<number | undefined> {
  try {
    const seqRows = await prisma.$queryRaw<{ nextval: bigint }[]>`
      SELECT nextval('cargo_post_legacy_sqlite_id_seq') AS nextval
    `;
    const id = Number(seqRows[0]?.nextval ?? 0);
    if (id > 0) {
      return id;
    }
  } catch {
    // Sequence may be missing before migrations run — fall back below.
  }

  const maxRow = await prisma.cargoPost.aggregate({
    _max: { legacySqliteId: true },
  });
  const next = (maxRow._max.legacySqliteId ?? 99_999) + 1;
  return next > 0 ? next : undefined;
}
