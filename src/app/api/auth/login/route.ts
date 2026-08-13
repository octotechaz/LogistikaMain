import { fail, ok, parseZodError, publicUser } from "@/lib/api";
import { authCookieName } from "@/lib/auth";
import { authCookieSetOptions } from "@/lib/auth-cookie";
import { findUserByIdentity } from "@/lib/find-user-by-identity";
import { signAuthToken } from "@/lib/jwt";
import { verifyPassword } from "@/lib/password";
import { dashboardPathForRole } from "@/lib/role-redirect";
import { loginSchema } from "@/lib/validations/auth";

const INVALID_LOGIN = "Giriş məlumatları yanlışdır.";

export async function POST(request: Request) {
  try {
    const payload = loginSchema.parse(await request.json());
    const user = await findUserByIdentity(payload.email);

    if (!user) {
      return fail(INVALID_LOGIN, 401);
    }

    if (user.status === "BLOCKED") {
      return fail(INVALID_LOGIN, 401);
    }

    const validPassword = await verifyPassword(payload.password, user.passwordHash);
    if (!validPassword) {
      return fail(INVALID_LOGIN, 401);
    }

    const token = await signAuthToken({
      sub: user.id,
      role: user.role as import("@/lib/jwt").AuthRole,
      email: user.email,
    });

    const response = ok({
      redirectTo: dashboardPathForRole(user.role),
      user: publicUser(user),
    });

    response.cookies.set(authCookieName, token, authCookieSetOptions());

    return response;
  } catch (error) {
    if (error && typeof error === "object" && "issues" in error) {
      return fail(INVALID_LOGIN, 401, parseZodError(error));
    }
    console.error("[auth/login]", error);
    return fail(INVALID_LOGIN, 401);
  }
}
