"use client";
import Link from "next/link";
import { roomTypeLabel } from "@/lib/room-type-labels";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import {
  ApplicationCard,
  Pagination,
  PortalShell,
  bookingRequest,
  type Application,
  type Inventory,
  type Owner,
  type PageResult,
} from "./website-booking";

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
  const [inventory, setInventory] = useState<Inventory[]>([]),
    [selected, setSelected] = useState<Application | null>(null),
    [roomNumbers, setRoomNumbers] = useState<string[]>([]);
  const [roomTypes, setRoomTypes] = useState<Inventory[]>([]);
  const [roster, setRoster] = useState("");
  const [cancelTarget, setCancelTarget] = useState<Application | null>(null);
  async function cancel(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (
      !cancelTarget ||
      !window.confirm(
        "홈페이지 예약을 취소하고 연결된 판매일보에 취소를 반영할까요?",
      )
    )
      return;
    const fields = new FormData(e.currentTarget);
    setBusy(true);
    setError("");
    try {
      await bookingRequest(`admin/applications/${cancelTarget.id}`, "POST", {
        action: "cancel",
        room_numbers: [],
        note: fields.get("note"),
        is_peak_confirmed: false,
        is_upgrade_confirmed: false,
        ...(fields.get("retained_nights") === ""
          ? {}
          : { retained_nights: Number(fields.get("retained_nights")) }),
      });
      setCancelTarget(null);
      setSelected(null);
      setRevision((n) => n + 1);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => {
    let disposed = false;
    bookingRequest<PageResult<Owner> | PageResult<Application>>(
      `admin/${tab}?page=${page}`,
    )
      .then((data) => {
        if (disposed) return;
        if (tab === "owners") setOwners(data as PageResult<Owner>);
        else setApplications(data as PageResult<Application>);
        setError("");
      })
      .catch((e) => {
        if (!disposed) setError(e.message);
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
      .then((rows) => { setInventory(rows); setRoomTypes(rows); })
      .catch((e) => setError(e.message));
  }, []);
  async function select(row: Application) {
    setBusy(true);
    setError("");
    setSelected(row);
    setInventory([]);
    setRoomNumbers([]);
    try {
      setInventory(
        await bookingRequest<Inventory[]>(
          `admin/inventory?check_in=${row.check_in}&check_out=${row.check_out}`,
        ),
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
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
      setRevision((n) => n + 1);
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
      setRevision((n) => n + 1);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function decide(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!selected) return;
    const fields = new FormData(e.currentTarget);
    const submitter = (e.nativeEvent as SubmitEvent)
      .submitter as HTMLButtonElement;
    const action = submitter?.value;
    if (!action) return;
    if (
      !window.confirm(
        action === "approve"
          ? "확인한 객실로 승인하고 PMS 판매일보를 생성할까요?"
          : "이 신청을 반려할까요?",
      )
    )
      return;
    setBusy(true);
    setError("");
    try {
      await bookingRequest(`admin/applications/${selected.id}`, "POST", {
        action,
        room_numbers: roomNumbers,
        note: fields.get("note"),
        is_peak_confirmed: fields.get("peak") === "on",
        is_upgrade_confirmed: fields.get("upgrade") === "on",
      });
      setSelected(null);
      setRevision((n) => n + 1);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
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
        `${importRows.length}개 계정을 발급할까요? 중복 아이디는 건너뜁니다.`,
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
    setRevision((n) => n + 1);
    setBusy(false);
    setRoster("");
  }
  return (
    <PortalShell
      title="예약 관리"
      navigation={
        <nav aria-label="관리자 메뉴">
          <Link href="/admin/notices/">공지사항 관리</Link>
          <Link href="/admin/reservations/" aria-current="page">예약 관리</Link>
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
              setTab("applications");
              setPage(1);
              setSelected(null);
            }}
          >
            예약 신청 내역
          </button>{" "}
          <button
            onClick={() => {
              setTab("owners");
              setPage(1);
              setSelected(null);
            }}
          >
            수분양자 명부
          </button>
        </div>
        <button onClick={() => setRevision((n) => n + 1)}>새로고침</button>
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
      {cancelTarget && (
        <form className="portal-card" onSubmit={cancel}>
          <h2>예약 취소 처리</h2>
          <ApplicationCard row={cancelTarget} />
          <p>
            수분양자: 7일 전까지 무료, 3일 전 50% 차감(내림), 당일·노쇼 100%
            차감입니다. 4~6일 전 또는 1~2일 전은 운영 기준 확인 후 아래에 차감
            유지 박수를 입력해 주세요. 만료된 박수는 복원하지 않습니다.
          </p>
          <fieldset disabled={busy}>
            {cancelTarget.kind === "owner" && (
              <label>
                차감 유지 박수 (명시된 규정 적용 시 비워두세요)
                <input name="retained_nights" type="number" min={0} max={6} />
              </label>
            )}
            <label>
              취소 사유 및 안내
              <textarea name="note" required maxLength={1000} />
            </label>
            <button type="submit">취소 확정</button>{" "}
            <button type="button" onClick={() => setCancelTarget(null)}>
              닫기
            </button>
          </fieldset>
        </form>
      )}
      {tab === "owners" ? (
        <>
          <form className="portal-card" onSubmit={issue}>
            <h2>계정 발급</h2>
            <fieldset disabled={busy}>
              <div className="portal-grid">
                <label>
                  아이디 (보유 호실)
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
                      <option key={r.name} value={r.name}>{roomTypeLabel(r.name)}</option>
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
              제외하고 최대 50행씩 등록합니다. 전화번호·아이디는 텍스트 형식으로
              관리해 주세요.
            </p>
            <p>아이디 | 이름 | 전화번호 | PMS 객실 타입명 | 올해 남은 박수</p>
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
                : "열 수·아이디·객실 타입·박수를 확인해 주세요."}
            </p>
            <button disabled={!validImport || busy} onClick={importOwners}>
              일괄 계정 발급
            </button>
          </details>
          <div className="portal-table">
            <table>
              <thead>
                <tr>
                  <th>아이디</th>
                  <th>이름 / 전화</th>
                  <th>타입</th>
                  <th>잔여 박수</th>
                  <th>계정 관리</th>
                </tr>
              </thead>
              <tbody>
                {owners?.items.map((owner) => (
                  <tr key={owner.id}>
                    <td>{owner.login_id}</td>
                    <td>
                      {owner.name}
                      <br />
                      {owner.phone}
                    </td>
                    <td>{roomTypeLabel(owner.room_type_name)}</td>
                    <td>
                      올해 {owner.annual_nights} · 이월 {owner.carryover_nights}
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
              </tbody>
            </table>
          </div>
          <Pagination page={page} total={owners?.total ?? 0} onPage={setPage} />
        </>
      ) : (
        <>
          <label>
            신청 유형
            <select value={kind} onChange={(e) => setKind(e.target.value)}>
              <option value="all">전체</option>
              <option value="owner">수분양자</option>
              <option value="general">일반</option>
            </select>
          </label>
          <p>현재 페이지의 최대 50건에서 유형을 구분합니다.</p>
          {selected && (
            <form className="portal-card" onSubmit={decide}>
              <h2>신청 검토 · 승인</h2>
              <ApplicationCard row={selected} />
              <fieldset disabled={busy}>
                <p>
                  동일 타입의 실제 호실 {selected.room_count}개를 선택해 주세요.
                </p>
                {inventory
                  .find((r) => r.name === selected.room_type_name)
                  ?.room_numbers?.map((number) => (
                    <label key={number} className="portal-check">
                      <input
                        type="checkbox"
                        checked={roomNumbers.includes(number)}
                        onChange={(e) =>
                          setRoomNumbers((prev) =>
                            e.target.checked
                              ? [...prev, number]
                              : prev.filter((n) => n !== number),
                          )
                        }
                      />
                      {number}호
                    </label>
                  ))}
                {selected.kind === "owner" && (
                  <>
                    <label className="portal-check">
                      <input name="peak" type="checkbox" />
                      성수기 이용 조건·연 1회·운영 일정을 확인했습니다.
                    </label>
                    <label className="portal-check">
                      <input name="upgrade" type="checkbox" />
                      보유 타입과 다른 객실의 이용 가능 여부 및 차액 50% 현장
                      정산을 안내했습니다.
                    </label>
                  </>
                )}
                <label>
                  승인 / 반려 안내 (고객에게 표시)
                  <textarea name="note" required maxLength={1000} />
                </label>
                <button
                  value="approve"
                  type="submit"
                  disabled={roomNumbers.length !== selected.room_count}
                >
                  승인 및 PMS 반영
                </button>{" "}
                <button value="reject" type="submit">
                  반려
                </button>{" "}
                <button type="button" onClick={() => setSelected(null)}>
                  닫기
                </button>
              </fieldset>
            </form>
          )}
          {applications?.items
            .filter((r) => kind === "all" || r.kind === kind)
            .map((row) => (
              <section key={row.id}>
                <p>
                  {row.kind === "owner" ? "수분양자" : "일반 예약"}
                  {row.owner_id &&
                    ` · ${row.owner_login_id ?? row.owner_id} ${row.owner_name ?? ""}`}
                </p>
                <ApplicationCard row={row} />
                {row.status === "pending" ? (
                  <button disabled={busy} onClick={() => select(row)}>
                    내용 확인 및 승인
                  </button>
                ) : (
                  row.report_ids.length > 0 && (
                    <p className="portal-reference">
                      생성한 PMS 판매일보: {row.report_ids.join(", ")}
                    </p>
                  )
                )}
                {["pending", "approved"].includes(row.status) && (
                  <button
                    disabled={busy}
                    onClick={() => {
                      setCancelTarget(row);
                      setSelected(null);
                    }}
                  >
                    취소 처리
                  </button>
                )}
              </section>
            ))}
          {applications?.items.length === 0 && <p>예약 신청이 없습니다.</p>}
          <Pagination
            page={page}
            total={applications?.total ?? 0}
            onPage={setPage}
          />
        </>
      )}
    </PortalShell>
  );
}
