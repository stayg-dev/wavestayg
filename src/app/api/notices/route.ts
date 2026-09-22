import { apiError, jsonResponse } from "@/lib/api";
import { readPublicNotices } from "@/lib/notices/pms";

export const runtime = "nodejs";
export async function GET() {
  try {
    return jsonResponse({ notices: await readPublicNotices() });
  } catch (error) {
    return apiError(error);
  }
}
