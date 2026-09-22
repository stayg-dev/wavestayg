import { cookies } from "next/headers";
import { requireAdmin } from "@/lib/admin-auth";
import { apiError, jsonResponse, readJson, sameOrigin } from "@/lib/api";
import { HttpError } from "@/lib/http-error";
import { ownerCookie, pms } from "@/lib/pms";

export const runtime = "nodejs";
type Context = { params: Promise<{ path: string[] }> };
const uuid = "[0-9a-fA-F-]{36}";
async function handle(request: Request, context: Context) {
  try {
    const { path: segments } = await context.params;
    const path = segments.join("/");
    const method = request.method;
    const admin = path.startsWith("admin/");
    const allowed =
      method === "GET"
        ? /^(me|applications|inventory|admin\/(owners|applications|inventory))$/.test(
            path,
          )
        : method === "POST" &&
          new RegExp(
            `^(login|password|quote|owner-quote|applications|owner-applications|lookup|admin/owners|admin/(owners|applications)/${uuid})$`,
          ).test(path);
    if (!allowed && !(method === "DELETE" && path === "login"))
      throw new HttpError(404, "잘못된 경로입니다.");
    if (method !== "GET") sameOrigin(request);
    if (admin) await requireAdmin();
    const jar = await cookies();
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict" as const,
      path: "/",
    };
    if (method === "DELETE") {
      jar.set(ownerCookie, "", { ...cookieOptions, maxAge: 0 });
      return jsonResponse({});
    }
    let body = method === "POST" ? await readJson(request, 12000) : undefined;
    const requiresOwner =
      ["me", "password", "owner-applications", "owner-quote"].includes(path) ||
      (path === "applications" && method === "GET");
    const token = requiresOwner ? jar.get(ownerCookie)?.value : undefined;
    if (requiresOwner && !token)
      throw new HttpError(401, "수분양자 로그인이 필요합니다.");
    if ((path === "applications" || path === "owner-applications") && body) {
      if (body.terms !== true)
        throw new HttpError(400, "개인정보 수집 및 예약 조건에 동의해 주세요.");
      const input = { ...body };
      delete input.terms;
      input.quoted_amount = 0; // PMS calculates the authoritative price for both customer types.
      input.guest_count = Number(body.adults) + Number(body.children);
      if (path === "owner-applications") delete input.password;
      body = input;
    }
    const search = new URL(request.url).searchParams;
    const query = new URLSearchParams();
    for (const key of ["check_in", "check_out", "page"])
      if (search.has(key)) query.set(key, search.get(key)!);
    const remotePath =
      path === "owner-applications"
        ? "applications"
        : path === "owner-quote"
          ? "quote"
          : path;
    const data = await pms<unknown>(
      remotePath + (query.size ? `?${query}` : ""),
      method,
      body,
      token,
    );
    if (path === "login") {
      jar.set(ownerCookie, (data as { token: string }).token, {
        ...cookieOptions,
        maxAge: 8 * 3600,
      });
      return jsonResponse({ authenticated: true });
    }
    if (path === "password")
      jar.set(ownerCookie, "", { ...cookieOptions, maxAge: 0 });
    return jsonResponse(data);
  } catch (error) {
    return apiError(error);
  }
}
export const GET = handle;
export const POST = handle;
export const DELETE = handle;
