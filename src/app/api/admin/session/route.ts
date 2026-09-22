import { cookies } from "next/headers";
import { adminConfig, adminCookie, isAdmin } from "@/lib/admin-auth";
import {
  adminSessionSeconds,
  issueAdminSession,
  verifyAdminPassword,
} from "@/lib/admin-security";
import { apiError, jsonResponse, readJson, sameOrigin } from "@/lib/api";
import { HttpError } from "@/lib/http-error";
import { pms } from "@/lib/pms";

export const runtime = "nodejs";
export async function GET() {
  try {
    return jsonResponse({ authenticated: await isAdmin() });
  } catch (error) {
    return apiError(error);
  }
}
export async function POST(request: Request) {
  try {
    sameOrigin(request);
    const { passwordHash, secret } = await adminConfig();
    const body = await readJson(request, 2048);
    if (typeof body.password !== "string" || body.password.length > 256)
      throw new HttpError(400, "비밀번호를 확인해 주세요.");
    await pms("admin-login-attempt", "POST", {});
    if (!(await verifyAdminPassword(body.password, passwordHash)))
      throw new HttpError(401, "비밀번호를 확인해 주세요.");
    (await cookies()).set(
      adminCookie,
      issueAdminSession(secret, passwordHash),
      {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        path: "/",
        maxAge: adminSessionSeconds,
      },
    );
    return jsonResponse({ authenticated: true });
  } catch (error) {
    return apiError(error);
  }
}
export async function DELETE(request: Request) {
  try {
    sameOrigin(request);
    (await cookies()).set(adminCookie, "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge: 0,
    });
    return jsonResponse({ authenticated: false });
  } catch (error) {
    return apiError(error);
  }
}
