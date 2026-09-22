"use client";
import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import {
  noticeCategories,
  sortNotices,
  type NoticeInput,
  type NoticeRecord,
  type NoticeSnapshot,
} from "@/lib/notices/model";

const emptyNotice: NoticeInput = {
  title: "",
  body: "",
  category: "공지",
};
class AdminRequestError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}
async function request<T>(
  path: string,
  method = "GET",
  body?: unknown,
): Promise<T> {
  const response = await fetch(path, {
    method,
    cache: "no-store",
    headers:
      body === undefined ? undefined : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await response.json();
  if (!response.ok)
    throw new AdminRequestError(
      data.error || "요청을 처리하지 못했습니다.",
      response.status,
    );
  return data;
}

export function NoticeAdmin({
  initialAuthenticated,
}: {
  initialAuthenticated: boolean;
}) {
  const [authenticated, setAuthenticated] = useState(initialAuthenticated);
  const [password, setPassword] = useState("");
  const [snapshot, setSnapshot] = useState<NoticeSnapshot | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [draft, setDraft] = useState<NoticeInput>(emptyNotice);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [reload, setReload] = useState(0);

  useEffect(() => {
    if (!authenticated) return;
    let disposed = false;
    request<NoticeSnapshot>("/api/admin/notices/")
      .then((data) => {
        if (!disposed) {
          setSnapshot(data);
          setError("");
        }
      })
      .catch((error) => {
        if (disposed) return;
        setError(
          error instanceof Error
            ? error.message
            : "목록을 불러오지 못했습니다.",
        );
        if (error instanceof AdminRequestError && error.status === 401)
          setAuthenticated(false);
      });
    return () => {
      disposed = true;
    };
  }, [authenticated, reload]);

  useEffect(() => {
    if (!dirty) return;
    const preventExit = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", preventExit);
    return () => window.removeEventListener("beforeunload", preventExit);
  }, [dirty]);

  function handleError(error: unknown) {
    setError(
      error instanceof Error ? error.message : "요청을 처리하지 못했습니다.",
    );
    if (error instanceof AdminRequestError && error.status === 401) {
      setAuthenticated(false);
      setSnapshot(null);
    }
  }
  async function login(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await request("/api/admin/session/", "POST", { password });
      setPassword("");
      setAuthenticated(true);
    } catch (error) {
      handleError(error);
    } finally {
      setBusy(false);
    }
  }
  function mayDiscard() {
    return !dirty || window.confirm("저장하지 않은 내용을 버릴까요?");
  }
  function edit(notice?: NoticeRecord) {
    if (!mayDiscard()) return;
    setSelected(notice?.id ?? null);
    setDraft(
      notice
        ? {
            title: notice.title,
            body: notice.body,
            category: notice.category,
          }
        : { ...emptyNotice },
    );
    setDirty(false);
    setMessage("");
    setError("");
  }
  function update(values: Partial<NoticeInput>) {
    setDraft((previous) => ({ ...previous, ...values }));
    setDirty(true);
    setMessage("");
  }
  async function save(event: FormEvent) {
    event.preventDefault();
    if (!snapshot) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const data = await request<NoticeSnapshot>(
        selected ? `/api/admin/notices/${selected}/` : "/api/admin/notices/",
        selected ? "PUT" : "POST",
        { notice: draft, revision: snapshot.revision },
      );
      const saved = selected
        ? data.catalog.notices.find((notice) => notice.id === selected)
        : data.catalog.notices.find(
            (notice) =>
              !snapshot.catalog.notices.some((old) => old.id === notice.id),
          );
      setSnapshot(data);
      setSelected(saved?.id ?? null);
      setDirty(false);
      setMessage("저장했습니다. 공지사항 페이지에 바로 반영됩니다.");
    } catch (error) {
      handleError(error);
    } finally {
      setBusy(false);
    }
  }
  async function remove() {
    if (
      !snapshot ||
      !selected ||
      !window.confirm("이 공지를 삭제할까요? 삭제한 내용은 복구할 수 없습니다.")
    )
      return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const data = await request<NoticeSnapshot>(
        `/api/admin/notices/${selected}/`,
        "DELETE",
        { revision: snapshot.revision },
      );
      setSnapshot(data);
      setSelected(null);
      setDraft({ ...emptyNotice });
      setDirty(false);
      setMessage("공지를 삭제했습니다.");
    } catch (error) {
      handleError(error);
    } finally {
      setBusy(false);
    }
  }
  async function logout() {
    if (!mayDiscard()) return;
    setBusy(true);
    try {
      await request("/api/admin/session/", "DELETE");
      setAuthenticated(false);
      setSnapshot(null);
      setDraft({ ...emptyNotice });
      setSelected(null);
      setDirty(false);
      setError("");
      setMessage("");
    } catch (error) {
      handleError(error);
    } finally {
      setBusy(false);
    }
  }

  if (!authenticated)
    return (
      <section className="admin-login">
        <p className="admin-eyebrow">ADMIN LOGIN</p>
        <h1>관리자 로그인</h1>
        <p>관리자 비밀번호로 로그인해 주세요.</p>
        <form onSubmit={login}>
          <label>
            비밀번호
            <input
              type="password"
              autoComplete="current-password"
              required
              maxLength={256}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </label>
          {error && (
            <p role="alert" className="admin-error">
              {error}
            </p>
          )}
          <button className="admin-primary" disabled={busy}>
            {busy ? "확인 중…" : "로그인"}
          </button>
        </form>
      </section>
    );

  const notices = snapshot ? sortNotices(snapshot.catalog.notices) : [];
  return (
    <>
      <nav className="admin-header admin-menu" aria-label="관리자 메뉴">
        <Link href="/admin/" aria-current="page">공지사항 관리</Link>
        <Link href="/admin/reservations/">예약 관리</Link>
      </nav>
      <div className="admin-title">
        <div>
          <p className="admin-eyebrow">NOTICE ADMIN</p>
          <h1>공지사항 관리</h1>
          <p>숙소의 새로운 소식을 전해 주세요.</p>
        </div>
        <button disabled={busy} className="admin-secondary" onClick={logout}>
          로그아웃
        </button>
      </div>
      {error && (
        <p role="alert" className="admin-error">
          {error}
        </p>
      )}
      {message && (
        <p role="status" className="admin-success">
          {message}
        </p>
      )}
      <div className="admin-workspace">
        <aside className="admin-list-panel">
          <div className="admin-list-toolbar">
            <strong>전체 {notices.length}건</strong>
            <button disabled={busy || !snapshot} onClick={() => edit()}>
              + 새 공지
            </button>
          </div>
          <button
            className="admin-refresh"
            disabled={busy}
            onClick={() => {
              if (mayDiscard()) {
                setSnapshot(null);
                setSelected(null);
                setDraft({ ...emptyNotice });
                setDirty(false);
                setReload((value) => value + 1);
              }
            }}
          >
            목록 새로고침
          </button>
          {!snapshot ? (
            <p className="admin-empty">
              {error ? "목록을 다시 불러와 주세요." : "목록을 불러오는 중…"}
            </p>
          ) : !notices.length ? (
            <p className="admin-empty">첫 공지를 작성해 보세요.</p>
          ) : (
            <ul>
              {notices.map((notice) => (
                <li key={notice.id}>
                  <button
                    disabled={busy}
                    onClick={() => edit(notice)}
                    className={selected === notice.id ? "selected" : ""}
                    aria-current={selected === notice.id ? "true" : undefined}
                  >
                    <span className="admin-badges">
                      <span>{notice.category}</span>
                    </span>
                    <strong>{notice.title}</strong>
                    <time>
                      {new Date(notice.updatedAt).toLocaleDateString("ko-KR", {
                        timeZone: "Asia/Seoul",
                      })}
                    </time>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </aside>
        <form className="admin-editor" onSubmit={save}>
          <div className="admin-editor-heading">
            <h2>{selected ? "공지 수정" : "새 공지 작성"}</h2>
            {dirty && <span>저장하지 않음</span>}
          </div>
          <fieldset disabled={busy || !snapshot}>
            <label>
              제목
              <input
                required
                maxLength={120}
                value={draft.title}
                onChange={(event) => update({ title: event.target.value })}
                placeholder="공지 제목을 입력해 주세요"
              />
            </label>
            <div className="admin-form-row">
              <label>
                분류
                <select
                  value={draft.category}
                  onChange={(event) =>
                    update({
                      category: event.target.value as NoticeInput["category"],
                    })
                  }
                >
                  {noticeCategories.map((category) => (
                    <option key={category}>{category}</option>
                  ))}
                </select>
              </label>
            </div>
            <p className="admin-hint">저장하면 바로 공개됩니다.</p>
            <label>
              본문
              <textarea
                required
                rows={13}
                maxLength={20000}
                value={draft.body}
                onChange={(event) => update({ body: event.target.value })}
                placeholder="안내할 내용을 입력해 주세요. 줄바꿈은 그대로 표시됩니다."
              />
            </label>
            <p className="admin-count">
              {draft.body.length.toLocaleString()} / 20,000자 · 일반 텍스트
            </p>
            <div className="admin-actions">
              <button type="submit" className="admin-primary">
                {busy ? "처리 중…" : selected ? "수정" : "등록"}
              </button>
              {selected && (
                <button type="button" className="admin-danger" onClick={remove}>
                  공지 삭제
                </button>
              )}
            </div>
          </fieldset>
        </form>
      </div>
    </>
  );
}
