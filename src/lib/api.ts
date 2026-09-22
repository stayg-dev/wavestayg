import { HttpError } from "./http-error.ts";

export function sameOrigin(request: Request) {
  // Next may construct request.url with an internal hostname behind its proxy.
  // Host remains the browser's destination; Origin is controlled by the browser.
  const requestUrl = new URL(request.url);
  const host = request.headers.get("host") ?? requestUrl.host;
  const forwardedProtocol = request.headers.get("x-forwarded-proto");
  const protocol = forwardedProtocol === "https" || forwardedProtocol === "http"
    ? `${forwardedProtocol}:` : requestUrl.protocol;
  const target = new URL(`${protocol}//${host}`);
  if (
    request.headers.get("origin") !== target.origin ||
    request.headers.get("sec-fetch-site") === "cross-site"
  ) {
    throw new HttpError(403, "허용되지 않은 요청입니다.");
  }
}

export async function readJson(
  request: Request,
  maxBytes = 96_000,
): Promise<Record<string, unknown>> {
  if (!request.headers.get("content-type")?.startsWith("application/json"))
    throw new HttpError(415, "JSON 요청이 필요합니다.");
  const reader = request.body?.getReader();
  if (!reader) throw new HttpError(400, "요청 내용이 없습니다.");
  let total = 0;
  const chunks: Uint8Array[] = [];
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maxBytes) {
        await reader.cancel();
        throw new HttpError(413, "입력 내용이 너무 큽니다.");
      }
      chunks.push(value);
    }
    const parsed: unknown = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed))
      throw new Error("Invalid JSON object");
    return parsed as Record<string, unknown>;
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError(400, "요청 내용을 확인해 주세요.");
  } finally {
    reader.releaseLock();
  }
}

export function jsonResponse(data: unknown, status = 200) {
  return Response.json(data, {
    status,
    headers: {
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

export function apiError(error: unknown) {
  if (error instanceof HttpError)
    return jsonResponse({ error: error.message }, error.status);
  // Do not expose internal URLs, credentials or third-party error bodies.
  console.error(
    "Notice API failed:",
    error instanceof Error ? error.name : "UnknownError",
  );
  return jsonResponse(
    { error: "저장소에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요." },
    503,
  );
}

export function revisionFrom(body: Record<string, unknown>) {
  if (
    body.revision !== null &&
    (typeof body.revision !== "string" ||
      body.revision.length > 256 ||
      !body.revision)
  )
    throw new HttpError(400, "문서 버전 정보가 필요합니다. 새로고침해 주세요.");
  return body.revision as string | null;
}
