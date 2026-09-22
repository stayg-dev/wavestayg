import { requireAdmin } from "@/lib/admin-auth";
import {
  apiError,
  jsonResponse,
  readJson,
  revisionFrom,
  sameOrigin,
} from "@/lib/api";
import { HttpError } from "@/lib/http-error";
import { noticeStore } from "@/lib/notices/pms";

export const runtime = "nodejs";
type Context = { params: Promise<{ id: string }> };
async function contextId(context: Context) {
  const { id } = await context.params;
  if (!/^[a-f0-9-]{36}$/.test(id))
    throw new HttpError(404, "공지를 찾을 수 없습니다.");
  return id;
}
export async function PUT(request: Request, context: Context) {
  try {
    sameOrigin(request);
    await requireAdmin();
    const id = await contextId(context);
    const body = await readJson(request);
    return jsonResponse(
      await noticeStore.save(body.notice, id, revisionFrom(body)),
    );
  } catch (error) {
    return apiError(error);
  }
}
export async function DELETE(request: Request, context: Context) {
  try {
    sameOrigin(request);
    await requireAdmin();
    const id = await contextId(context);
    const body = await readJson(request, 2048);
    return jsonResponse(await noticeStore.remove(id, revisionFrom(body)));
  } catch (error) {
    return apiError(error);
  }
}
