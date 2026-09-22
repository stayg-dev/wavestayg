import "server-only";
import { pms } from "../pms";
import { validateNotice, type NoticeRecord, type NoticeSnapshot } from "./model";

type PmsNotice = {
  id: string;
  title: string;
  body: string;
  category: NoticeRecord["category"];
  created_at: string;
  updated_at: string;
};
type PmsSnapshot = { notices: PmsNotice[]; revision: string | null };

function record(notice: PmsNotice): NoticeRecord {
  return {
    ...validateNotice(notice),
    id: notice.id,
    createdAt: notice.created_at,
    updatedAt: notice.updated_at,
  };
}
function snapshot(data: PmsSnapshot): NoticeSnapshot {
  return { catalog: { version: 1, notices: data.notices.map(record) }, revision: data.revision };
}

export const noticeStore = {
  async read() {
    return snapshot(await pms<PmsSnapshot>("admin/notices"));
  },
  async save(input: unknown, id: string | null, revision: string | null) {
    const notice = validateNotice(input);
    return snapshot(await pms<PmsSnapshot>(
      id ? `admin/notices/${encodeURIComponent(id)}` : "admin/notices",
      id ? "PUT" : "POST",
      { notice, revision },
    ));
  },
  async remove(id: string, revision: string | null) {
    return snapshot(await pms<PmsSnapshot>(`admin/notices/${encodeURIComponent(id)}`, "DELETE", { revision }));
  },
};

export async function readPublicNotices() {
  const data = await pms<{ notices: PmsNotice[] }>("notices");
  return data.notices.map(record);
}
