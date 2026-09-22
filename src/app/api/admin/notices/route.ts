import { requireAdmin } from "@/lib/admin-auth";
import {
  apiError,
  jsonResponse,
  readJson,
  revisionFrom,
  sameOrigin,
} from "@/lib/api";
import { noticeStore } from "@/lib/notices/pms";

export const runtime = "nodejs";
export async function GET() {
  try {
    await requireAdmin();
    return jsonResponse(await noticeStore.read());
  } catch (error) {
    return apiError(error);
  }
}
export async function POST(request: Request) {
  try {
    sameOrigin(request);
    await requireAdmin();
    const body = await readJson(request);
    return jsonResponse(
      await noticeStore.save(body.notice, null, revisionFrom(body)),
      201,
    );
  } catch (error) {
    return apiError(error);
  }
}
