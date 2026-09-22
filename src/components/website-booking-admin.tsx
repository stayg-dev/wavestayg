"use client";
import Link from "next/link";
import { roomTypeLabel } from "@/lib/room-type-labels";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import {
  statusText,
  Pagination,
  PortalShell,
  bookingRequest,
  type Application,
  type Inventory,
  type Owner,
  type PageResult,
} from "./website-booking";

import { BookingAdminDialog } from "./booking-admin-dialog";
import { OwnerBalanceEditor } from "./owner-balance-editor";

export function WebsiteBookingAdmin() {
  const router = useRouter();
  const [tab, setTab] = useState("applications"),
    [kind, setKind] = useState("all"),
    [page, setPage] = useState(1),
    [revision, setRevision] = useState(0);
  const [owners, setOwners] = useState<PageResult<Owner> | null>(null),
    [applications, setApplications] = useState<PageResult<Application> | null>(
      null,
    );
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [credentials, setCredentials] = useState<string[]>([]);
  const [selected, setSelected] = useState<Application | null>(null);
  const [loading, setLoading] = useState(true);
  const [roomTypes, setRoomTypes] = useState<Inventory[]>([]);
  const [roster, setRoster] = useState("");
  useEffect(() => {
    let disposed = false;
    bookingRequest<PageResult<Owner> | PageResult<Application>>(
      `admin/${tab}?page=${page}`,
    )
      .then((data) => {
        if (disposed) return;
        setLoading(false);
        if (tab === "owners") setOwners(data as PageResult<Owner>);
        else setApplications(data as PageResult<Application>);
        setError("");
      })
      .catch((e) => {
        if (!disposed) {
          setError(e.message);
          setLoading(false);
        }
      });
    return () => {
      disposed = true;
    };
  }, [tab, page, revision]);
  useEffect(() => {
    const today = new Date(Date.now() + 9 * 3600_000)
      .toISOString()
      .slice(0, 10);
    const tomorrow = new Date(Date.now() + 9 * 3600_000 + 86400_000)
      .toISOString()
      .slice(0, 10);
    bookingRequest<Inventory[]>(
      `admin/inventory?check_in=${today}&check_out=${tomorrow}`,
    )
      .then(setRoomTypes)
      .catch((e) => setError(e.message));
  }, []);
  async function issue(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const fields = Object.fromEntries(new FormData(e.currentTarget));
    try {
      const data = await bookingRequest<{
        login_id: string;
        initial_password: string;
      }>("admin/owners", "POST", {
        ...fields,
        initial_nights: Number(fields.initial_nights),
      });
      setCredentials((prev) => [
        ...prev,
        `${data.login_id}\t${data.initial_password}`,
      ]);
      refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function reset(owner: Owner, active?: boolean) {
    if (
      !window.confirm(
        active === undefined
          ? `${owner.login_id}님의 비밀번호를 재발급할까요? 기존 로그인은 해제됩니다.`
          : `${owner.login_id} 계정을 ${active ? "활성화" : "비활성화"}할까요?`,
      )
    )
      return;
    setBusy(true);
    setError("");
    try {
      const data = await bookingRequest<{ initial_password?: string }>(
        `admin/owners/${owner.id}`,
        "POST",
        active === undefined ? {} : { is_active: active },
      );
      if (data.initial_password)
        setCredentials((prev) => [
          ...prev,
          `${owner.login_id}\t${data.initial_password}`,
        ]);
      refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  function refresh() {
    setLoading(true);
    setRevision((n) => n + 1);
  }
  function changePage(next: number) {
    setLoading(true);
    setPage(next);
  }
  const visibleApplications =
    applications?.items.filter((row) => kind === "all" || row.kind === kind) ??
    [];
  const importRows = roster
    .trim()
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => line.split("\t"));
  const validImport =
    importRows.length > 0 &&
    importRows.length <= 50 &&
    importRows.every(
      (cells) =>
        cells.length === 5 &&
        /^[\w-]{1,40}$/.test(cells[0]) &&
        roomTypes.some((r) => r.name === cells[3]) &&
        /^\d+$/.test(cells[4]) &&
        Number(cells[4]) <= 15,
    );
  async function importOwners() {
    if (
      !validImport ||
      !window.confirm(
        `${importRows.length}개 계정을 발급할까요? 중복 호실은 건너뜁니다.`,
      )
    )
      return;
    setBusy(true);
    setError("");
    const failed: string[] = [];
    for (const cells of importRows) {
      try {
        const data = await bookingRequest<{
          login_id: string;
          initial_password: string;
        }>("admin/owners", "POST", {
          login_id: cells[0],
          name: cells[1],
          phone: cells[2],
          room_type_name: cells[3],
          initial_nights: Number(cells[4]),
        });
        setCredentials((prev) => [
          ...prev,
          `${data.login_id}\t${data.initial_password}`,
        ]);
      } catch (e) {
        failed.push(`${cells[0]}: ${(e as Error).message}`);
      }
    }
    setError(failed.join("\n"));
    refresh();
    setBusy(false);
    setRoster("");
  }
  return (
    <PortalShell
      title="예약 관리"
      className="booking-admin"
      navigation={
        <nav aria-label="관리자 메뉴">
          <Link href="/admin/notices/">공지사항 관리</Link>
          <Link href="/admin/reservations/" aria-current="page">
            예약 관리
          </Link>
        </nav>
      }
    >
      <button
        onClick={async () => {
          await fetch("/api/admin/session/", { method: "DELETE" });
          router.push("/admin/");
          router.refresh();
        }}
      >
        로그아웃
      </button>
      <p>
        승인 시에만 PMS 판매일보에 예약을 생성합니다. PMS에서 변경·삭제한 내용은
        홈페이지 신청 상태와 무료 박수에 반영되지 않습니다.
      </p>
      <div className="portal-row">
        <div>
          <button
            onClick={() => {
              if (tab !== "applications" || page !== 1) setLoading(true);
              setTab("applications");
              setPage(1);
              setSelected(null);
            }}
          >
            예약 신청 내역
          </button>{" "}
          <button
            onClick={() => {
              if (tab !== "owners" || page !== 1) setLoading(true);
              setTab("owners");
              setPage(1);
              setSelected(null);
            }}
          >
            수분양자 명부
          </button>
        </div>
        <button disabled={loading || busy} onClick={refresh}>
          새로고침
        </button>
      </div>
      {error && (
        <p role="alert" className="portal-error portal-note">
          {error}
        </p>
      )}
      {credentials.length > 0 && (
        <section className="portal-card">
          <h2>발급 계정 · 비밀번호</h2>
          <p>
            이 화면에서만 확인할 수 있습니다. 수분양자에게 안전하게 전달해
            주세요.
          </p>
          <pre className="portal-note">{credentials.join("\n")}</pre>
          <button onClick={() => setCredentials([])}>
            전달 완료 · 화면에서 지우기
          </button>
        </section>
      )}
      {tab === "owners" ? (
        <>
          <form className="portal-card" onSubmit={issue}>
            <h2>계정 발급</h2>
            <fieldset disabled={busy}>
              <div className="portal-grid">
                <label>
                  호실
                  <input
                    name="login_id"
                    pattern="[a-zA-Z0-9_-]+"
                    maxLength={40}
                    required
                  />
                </label>
                <label>
                  이름
                  <input name="name" maxLength={100} />
                </label>
                <label>
                  전화번호
                  <input name="phone" type="tel" maxLength={30} />
                </label>
                <label>
                  보유 객실 타입
                  <select name="room_type_name" required>
                    <option value="">선택</option>
                    {roomTypes.map((r) => (
                      <option key={r.name} value={r.name}>
                        {roomTypeLabel(r.name)}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  올해 남은 무료 박수
                  <input
                    name="initial_nights"
                    type="number"
                    min={0}
                    max={15}
                    defaultValue={new Date().getFullYear() === 2026 ? 5 : 15}
                    required
                  />
                </label>
              </div>
              <button>계정 발급</button>
            </fieldset>
          </form>
          <details className="portal-card">
            <summary>엑셀 명부 일괄 등록</summary>
            <p>
              엑셀에서 아래 순서의 5개 열을 복사해 붙여 넣으세요. 헤더를
              제외하고 최대 50행씩 등록합니다. 전화번호·호실은 텍스트 형식으로
              관리해 주세요.
            </p>
            <p>호실 | 이름 | 전화번호 | PMS 객실 타입명 | 올해 남은 박수</p>
            <textarea
              rows={6}
              value={roster}
              onChange={(e) => setRoster(e.target.value)}
              disabled={busy}
              aria-label="엑셀 명부 붙여넣기"
            />
            <p>
              {importRows.length}행 ·{" "}
              {validImport
                ? "형식 확인 완료"
                : "열 수·호실·객실 타입·박수를 확인해 주세요."}
            </p>
            <button disabled={!validImport || busy} onClick={importOwners}>
              일괄 계정 발급
            </button>
          </details>
          <div className="portal-table">
            <table>
              <thead>
                <tr>
                  <th scope="col" aria-sort="ascending">
                    호실 ↑
                  </th>
                  <th>이름 / 전화</th>
                  <th>타입</th>
                  <th>잔여 박수</th>
                  <th>계정 관리</th>
                </tr>
              </thead>
              <tbody>
                {!loading &&
                  owners?.items.map((owner) => (
                    <tr key={owner.id}>
                      <td>{owner.login_id}</td>
                      <td>
                        {owner.name}
                        <br />
                        {owner.phone}
                      </td>
                      <td>{roomTypeLabel(owner.room_type_name)}</td>
                      <td>
                        <OwnerBalanceEditor
                          owner={owner}
                          disabled={busy}
                          onSaved={refresh}
                        />
                      </td>
                      <td>
                        <button disabled={busy} onClick={() => reset(owner)}>
                          비밀번호 재발급
                        </button>{" "}
                        <button
                          disabled={busy}
                          onClick={() => reset(owner, !owner.is_active)}
                        >
                          {owner.is_active ? "비활성화" : "활성화"}
                        </button>
                      </td>
                    </tr>
                  ))}
                {loading && (
                  <tr>
                    <td colSpan={5} role="status">
                      명부를 불러오고 있습니다.
                    </td>
                  </tr>
                )}
                {!loading && owners?.items.length === 0 && (
                  <tr>
                    <td colSpan={5}>등록된 수분양자가 없습니다.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <Pagination
            page={page}
            total={owners?.total ?? 0}
            onPage={changePage}
          />
        </>
      ) : (
        <>
          <div className="admin-list-toolbar">
            <label>
              신청 유형
              <select value={kind} onChange={(e) => setKind(e.target.value)}>
                <option value="all">전체</option>
                <option value="owner">수분양자</option>
                <option value="general">일반</option>
              </select>
            </label>
            <p className="admin-muted">
              전체 {applications?.total ?? 0}건 · 현재 페이지 최대 50건 내
              유형별 조회
            </p>
          </div>
          <div className="portal-table admin-reservations">
            <table aria-label="예약 신청 내역" aria-busy={loading}>
              <thead>
                <tr>
                  <th scope="col">상태</th>
                  <th scope="col">신청 유형</th>
                  <th scope="col">수분양자 호실</th>
                  <th scope="col">투숙객 / 연락처</th>
                  <th scope="col">객실</th>
                  <th scope="col">숙박 일정</th>
                  <th scope="col">인원</th>
                  <th scope="col">금액</th>
                  <th scope="col">PMS 반영</th>
                  <th scope="col">상세</th>
                </tr>
              </thead>
              <tbody>
                {!loading &&
                  visibleApplications.map((row) => (
                    <tr key={row.id} onClick={() => setSelected(row)}>
                      <td>
                        <span className={`booking-status ${row.status}`}>
                          {statusText[row.status] ?? row.status}
                        </span>
                      </td>
                      <td>{row.kind === "owner" ? "수분양자" : "일반"}</td>
                      <td>
                        {row.kind === "owner" ? (
                          <>
                            {row.owner_login_id ?? "—"}
                            <small>{row.owner_name}</small>
                          </>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td>
                        <strong>{row.guest_name}</strong>
                        <small>{row.phone}</small>
                      </td>
                      <td>
                        {roomTypeLabel(row.room_type_name)}
                        <small>{row.room_count}실</small>
                      </td>
                      <td>
                        {row.check_in}
                        <small>~ {row.check_out}</small>
                      </td>
                      <td>{row.guest_count}명</td>
                      <td className="admin-amount">
                        {row.quoted_amount.toLocaleString()}원
                      </td>
                      <td>
                        {row.report_ids.length > 0 ? (
                          <span
                            className={`admin-sync ${row.status === "cancelled" ? "cancelled" : ""}`}
                          >
                            {row.status === "cancelled"
                              ? "취소 반영"
                              : `${row.report_ids.length}실 반영`}
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td>
                        <button
                          className="admin-detail-button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelected(row);
                          }}
                          aria-label={`${row.guest_name} ${row.check_in} 예약 상세`}
                        >
                          상세 보기
                        </button>
                      </td>
                    </tr>
                  ))}
                {loading && (
                  <tr>
                    <td colSpan={10} className="admin-empty" role="status">
                      예약 내역을 불러오고 있습니다.
                    </td>
                  </tr>
                )}
                {!loading && !error && visibleApplications.length === 0 && (
                  <tr>
                    <td colSpan={10} className="admin-empty">
                      표시할 예약 신청이 없습니다.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <Pagination
            page={page}
            total={applications?.total ?? 0}
            onPage={changePage}
          />
        </>
      )}
      {selected && (
        <BookingAdminDialog
          key={selected.id}
          application={selected}
          onClose={() => setSelected(null)}
          onChanged={() => {
            setSelected(null);
            refresh();
          }}
        />
      )}
    </PortalShell>
  );
}
