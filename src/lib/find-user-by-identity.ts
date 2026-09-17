import { Prisma, type User } from "@prisma/client";

import {
  canonicalizeLoginPhone,
  isEmailIdentity,
  phoneDigitMatchValues,
  phoneDigits,
  phoneInterpretations,
  phoneLookupCandidates,
} from "@/lib/login-identity";
import { prisma } from "@/lib/prisma";

export async function findUserByPhone(rawPhone: string): Promise<User | null> {
  const candidates = phoneLookupCandidates(rawPhone);
  const canonical = canonicalizeLoginPhone(rawPhone);
  if (canonical && !candidates.includes(canonical)) {
    candidates.unshift(canonical);
  }

  if (candidates.length) {
    const exact = await prisma.user.findFirst({
      where: { phone: { in: candidates } },
    });
    if (exact) return exact;
  }

  const digitValues = phoneDigitMatchValues(rawPhone);
  if (digitValues.length) {
    const rows = await prisma.$queryRaw<Array<{ id: string }>>`
      SELECT id
      FROM "User"
      WHERE regexp_replace(phone, '[^0-9]', '', 'g') IN (${Prisma.join(
        digitValues.map((value) => Prisma.sql`${value}`)
      )})
      LIMIT 1
    `;
    if (rows[0]?.id) {
      return prisma.user.findUnique({ where: { id: rows[0].id } });
    }
  }

  const azHits = phoneInterpretations(rawPhone).filter((n) => n.startsWith("+994"));
  if (azHits.length === 1) {
    const national = phoneDigits(azHits[0]).slice(-9);
    if (national.length === 9) {
      const bySuffix = await prisma.$queryRaw<Array<{ id: string }>>`
        SELECT id
        FROM "User"
        WHERE RIGHT(regexp_replace(phone, '[^0-9]', '', 'g'), 9) = ${national}
          AND (
            regexp_replace(phone, '[^0-9]', '', 'g') LIKE '994%'
            OR (
              regexp_replace(phone, '[^0-9]', '', 'g') LIKE '0%'
              AND length(regexp_replace(phone, '[^0-9]', '', 'g')) = 10
            )
            OR length(regexp_replace(phone, '[^0-9]', '', 'g')) = 9
          )
        LIMIT 1
      `;
      if (bySuffix[0]?.id) {
        return prisma.user.findUnique({ where: { id: bySuffix[0].id } });
      }
    }
  }

  return null;
}

export async function findUserByIdentity(identity: string): Promise<User | null> {
  const trimmed = identity.trim();
  if (!trimmed) return null;

  if (isEmailIdentity(trimmed)) {
    return prisma.user.findUnique({
      where: { email: trimmed.toLowerCase() },
    });
  }

  return findUserByPhone(trimmed);
}

export function maskPhoneNumber(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 4) {
    return "****";
  }
  return `***${digits.slice(-4)}`;
}
