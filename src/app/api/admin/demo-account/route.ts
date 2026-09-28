import { fail, ok, requireApiUser } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/password";

function randomDigits(length: number) {
  return Array.from({ length }, () => Math.floor(Math.random() * 10)).join("");
}

function generateDemoCredentials() {
  const num = randomDigits(6);
  const phone = `+99450${num}`;
  const email = `demo${num}@tranzit.az`;
  const password = `Demo${num}!`;
  return { phone, email, password };
}

export async function POST(request: Request) {
  const { response } = await requireApiUser(request, ["ADMIN"]);
  if (response) return response;

  // Benzersiz credentials bulana kadar dene (max 5)
  let attempt = 0;
  while (attempt < 5) {
    attempt++;
    const { phone, email, password } = generateDemoCredentials();

    const existing = await prisma.user.findFirst({
      where: { OR: [{ phone }, { email }] },
      select: { id: true }
    });
    if (existing) continue;

    const passwordHash = await hashPassword(password);

    const user = await prisma.user.create({
      data: {
        firstName: "Test",
        lastName: "İstifadəçi",
        phone,
        email,
        passwordHash,
        role: "CARGO_OWNER",
        companyName: "Demo Şirkət",
        status: "ACTIVE"
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        phone: true,
        email: true,
        role: true,
        status: true,
        companyName: true,
        createdAt: true
      }
    });

    return ok({ user, password });
  }

  return fail("Unikal hesab yaratmaq mümkün olmadı, yenidən cəhd edin.", 500);
}