import { ok } from "@/lib/api";
import { authCookieName } from "@/lib/auth";
import { authCookieClearOptions } from "@/lib/auth-cookie";

export async function POST() {
  const response = ok({ loggedOut: true });
  response.cookies.set(authCookieName, "", authCookieClearOptions());

  return response;
}
