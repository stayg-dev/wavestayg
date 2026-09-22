import "server-only";
import { HttpError } from "./http-error";
import { websiteSettings } from "./server-config";

export const ownerCookie = "wave_stayg_owner";
export function pmsConfigured() {
  return !!process.env.PMS_PROJECT_ID && (process.env.PMS_API_KEY?.length ?? 0) >= 32;
}
export async function pms<T>(
  path: string,
  method = "GET",
  body?: unknown,
  token?: string,
): Promise<T> {
  if (!pmsConfigured())
    throw new HttpError(503, "서비스 연결을 준비하고 있습니다.");
  const base = new URL(websiteSettings.pmsApiUrl);
  if (
    base.protocol !== "https:" &&
    !["localhost", "127.0.0.1"].includes(base.hostname)
  )
    throw new HttpError(503, "PMS 연결 설정을 확인해 주세요.");
  const url = `${base.toString().replace(/\/$/, "")}/projects/${encodeURIComponent(process.env.PMS_PROJECT_ID!)}/website/${path}`;
  let response: Response;
  try {
    response = await fetch(url, {
      method,
      redirect: "error",
      cache: "no-store",
      signal: AbortSignal.timeout(25_000),
      headers: {
        "Content-Type": "application/json",
        "X-Website-Key": process.env.PMS_API_KEY!,
        ...(token ? { "X-Owner-Session": token } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new HttpError(
      503,
      "PMS 응답을 확인하지 못했습니다. 새로고침으로 처리 결과를 확인한 뒤 다시 시도해 주세요.",
    );
  }
  const result = await response.json().catch(() => null);
  if (
    response.status === 404 &&
    (!result || (typeof result.message === "string" && /^Cannot (GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS) \//.test(result.message)))
  )
    throw new HttpError(
      503,
      "PMS 연동 API를 찾을 수 없습니다. PMS 백엔드 배포 상태를 확인해 주세요.",
    );
  if (!response.ok)
    throw new HttpError(
      response.status >= 500 ? 503 : response.status,
      response.status < 500 && typeof result?.message === "string"
        ? result.message
        : "PMS 처리에 실패했습니다. 잠시 후 다시 시도해 주세요.",
    );
  if (!result || result.code !== 200)
    throw new HttpError(503, "PMS 응답 형식을 확인해 주세요.");
  return result.data as T;
}
