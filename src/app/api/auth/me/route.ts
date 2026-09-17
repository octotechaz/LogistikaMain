import { fail, getApiUser, ok, publicUser } from "@/lib/api";

export async function GET(request: Request) {
  const user = await getApiUser(request);

  if (!user) {
    return fail("Giriş tələb olunur.", 401);
  }

  if (user.status === "BLOCKED") {
    return fail("Hesabınız bloklanıb.", 403);
  }

  return ok({
    user: publicUser(user)
  });
}
