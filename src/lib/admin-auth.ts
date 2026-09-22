import "server-only";
import { cookies } from "next/headers";
import { HttpError } from "./http-error.ts";
import { validPasswordHash, verifyAdminSession } from "./admin-security.ts";

export const adminCookie = "wave_stayg_admin";
export async function adminConfig() {
  const passwordHash = process.env.ADMIN_PASSWORD_HASH ?? "";
  const secret = process.env.ADMIN_SESSION_SECRET ?? "";
  if (!validPasswordHash(passwordHash) || secret.length < 32)
    throw new HttpError(503, "관리자 로그인 설정이 필요합니다.");
  return { passwordHash, secret };
}
export async function isAdmin() {
  const token = (await cookies()).get(adminCookie)?.value;
  if (!token) return false;
  const { secret, passwordHash } = await adminConfig();
  return verifyAdminSession(token, secret, passwordHash);
}
export async function requireAdmin() {
  if (!(await isAdmin()))
    throw new HttpError(401, "관리자 로그인이 필요합니다.");
}
