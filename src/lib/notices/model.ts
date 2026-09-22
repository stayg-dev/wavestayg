import { HttpError } from "../http-error.ts";

export const noticeCategories = ["공지", "안내", "이벤트"] as const;
export type NoticeInput = {
  title: string;
  body: string;
  category: (typeof noticeCategories)[number];
};
export type NoticeRecord = NoticeInput & {
  id: string;
  createdAt: string;
  updatedAt: string;
};
export type NoticeCatalog = { version: 1; notices: NoticeRecord[] };
export type NoticeSnapshot = {
  catalog: NoticeCatalog;
  revision: string | null;
};

export function validateNotice(input: unknown): NoticeInput {
  if (!input || typeof input !== "object")
    throw new HttpError(400, "공지 내용을 확인해 주세요.");
  const value = input as Record<string, unknown>;
  const title = typeof value.title === "string" ? value.title.trim() : "";
  const body = typeof value.body === "string" ? value.body.trim() : "";
  if (!title || title.length > 120)
    throw new HttpError(400, "제목은 1~120자로 입력해 주세요.");
  if (!body || body.length > 20000)
    throw new HttpError(400, "본문은 1~20,000자로 입력해 주세요.");
  if (!noticeCategories.includes(value.category as NoticeInput["category"]))
    throw new HttpError(400, "분류를 선택해 주세요.");
  return {
    title,
    body,
    category: value.category as NoticeInput["category"],
  };
}

export function sortNotices(notices: NoticeRecord[]) {
  return [...notices].sort(
    (a, b) =>
      b.createdAt.localeCompare(a.createdAt) ||
      a.id.localeCompare(b.id),
  );
}

export function isNewNotice(createdAt: string | null, now = Date.now()) {
  if (!createdAt) return false;
  const elapsed = now - Date.parse(createdAt);
  return elapsed >= 0 && elapsed < 7 * 86400000;
}
