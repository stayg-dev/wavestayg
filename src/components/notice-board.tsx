"use client";
import { useEffect, useState } from "react";
import { Shell } from "./shared";
import {
  isNewNotice,
  noticeCategories,
  type NoticeRecord,
} from "@/lib/notices/model";

export function Notice() {
  const [notices, setNotices] = useState<NoticeRecord[]>([]);
  const [filter, setFilter] = useState("전체");
  const [opened, setOpened] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reload, setReload] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      try {
        const response = await fetch("/api/notices/", {
          cache: "no-store",
          signal: controller.signal,
        });
        if (!response.ok)
          throw new Error(
            "공지사항을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.",
          );
        const data = await response.json();
        setNotices(data.notices);
        setError("");
      } catch (error) {
        if (!controller.signal.aborted)
          setError(
            error instanceof Error
              ? error.message
              : "공지사항을 불러오지 못했습니다.",
          );
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    void load();
    return () => controller.abort();
  }, [reload]);

  const filtered = notices.filter(
    (notice) => filter === "전체" || notice.category === filter,
  );
  const pageCount = Math.max(1, Math.ceil(filtered.length / 10));
  const visible = filtered.slice((page - 1) * 10, page * 10);
  const movePage = (next: number) => {
    setPage(next);
    setOpened(null);
  };
  return (
    <Shell title="공지사항" english="Notice">
      <div className="container notice-page">
        <div className="notice-toolbar">
          <div className="tabs">
            {["전체", ...noticeCategories].map((category) => (
              <button
                key={category}
                className={filter === category ? "active" : ""}
                aria-pressed={filter === category}
                onClick={() => {
                  setFilter(category);
                  movePage(1);
                }}
              >
                {category}
              </button>
            ))}
          </div>
          <span>{loading ? "불러오는 중" : `전체 ${filtered.length}건`}</span>
        </div>
        {loading ? (
          <p className="notice-feedback" role="status">
            공지사항을 불러오고 있습니다.
          </p>
        ) : error ? (
          <div className="notice-feedback" role="alert">
            <p>{error}</p>
            <button
              className="primary"
              onClick={() => {
                setLoading(true);
                setReload((value) => value + 1);
              }}
            >
              다시 시도
            </button>
          </div>
        ) : !filtered.length ? (
          <p className="notice-feedback">등록된 공지사항이 없습니다.</p>
        ) : (
          <div className="notice-list">
            {visible.map((notice) => (
              <article
                key={notice.id}
                className={opened === notice.id ? "expanded" : ""}
              >
                <button
                  className="notice-row"
                  onClick={() =>
                    setOpened(opened === notice.id ? null : notice.id)
                  }
                  aria-expanded={opened === notice.id}
                  aria-controls={`notice-${notice.id}`}
                >
                  <span className="notice-kind">
                    {notice.category}
                  </span>
                  <span className="notice-title">
                    <strong>
                      {notice.title}{" "}
                      {isNewNotice(notice.createdAt) && <small>new</small>}
                    </strong>
                    <span>{notice.body.slice(0, 100)}</span>
                  </span>
                  <time dateTime={notice.createdAt}>
                    {new Date(
                      notice.createdAt,
                    ).toLocaleDateString("ko-KR", { timeZone: "Asia/Seoul" })}
                  </time>
                  <span className="notice-arrow">
                    {opened === notice.id ? "−" : "+"}
                  </span>
                </button>
                {opened === notice.id && (
                  <div
                    id={`notice-${notice.id}`}
                    className="notice-body notice-plain-body"
                  >
                    {notice.body}
                  </div>
                )}
              </article>
            ))}
          </div>
        )}
        {!loading && !error && pageCount > 1 && (
          <nav className="pagination" aria-label="공지사항 페이지">
            <button
              disabled={page === 1}
              onClick={() => movePage(1)}
              aria-label="첫 페이지"
            >
              ‹‹
            </button>
            <button
              disabled={page === 1}
              onClick={() => movePage(page - 1)}
              aria-label="이전 페이지"
            >
              ‹
            </button>
            <span aria-live="polite">
              {page} / {pageCount}
            </span>
            <button
              disabled={page === pageCount}
              onClick={() => movePage(page + 1)}
              aria-label="다음 페이지"
            >
              ›
            </button>
            <button
              disabled={page === pageCount}
              onClick={() => movePage(pageCount)}
              aria-label="마지막 페이지"
            >
              ››
            </button>
          </nav>
        )}
      </div>
    </Shell>
  );
}
