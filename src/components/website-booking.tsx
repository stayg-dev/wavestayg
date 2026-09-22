"use client";
import Link from "next/link";
import { useEffect, useState, type FormEvent, type ReactNode } from "react";

export type BookingQuote = {
  room_amount: number;
  upgrade_amount: number;
  guest_fee: number;
  bedding_fee: number;
  total: number;
  owned_type: string | null;
};
export type Application = {
  id: string;
  kind: string;
  owner_id: string | null;
  owner_login_id?: string | null;
  owner_name?: string | null;
  status: string;
  check_in: string;
  check_out: string;
  room_count: number;
  room_type_name: string;
  guest_name: string;
  phone: string;
  guest_count: number;
  quoted_amount: number;
  pricing: BookingQuote | null;
  note: string;
  admin_note: string;
  report_ids: string[];
  is_peak: boolean;
};
export type Owner = {
  id: string;
  login_id: string;
  name: string;
  phone: string;
  room_type_name: string;
  annual_nights: number;
  carryover_nights: number;
  is_active: boolean;
};
export type Inventory = {
  name: string;
  available: number;
  room_numbers?: string[];
};
export type PageResult<T> = { items: T[]; total: number; page: number };
export const statusText: Record<string, string> = {
  pending: "승인 대기",
  approved: "예약 승인",
  rejected: "반려",
  cancelled: "취소",
};
export async function bookingRequest<T>(
  path: string,
  method = "GET",
  body?: unknown,
): Promise<T> {
  const response = await fetch(
    `/api/pms/${path.split("?")[0]}/${path.includes("?") ? `?${path.split("?")[1]}` : ""}`,
    {
      method,
      cache: "no-store",
      headers:
        body === undefined ? undefined : { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    },
  );
  const data = await response.json();
  if (!response.ok)
    throw new Error(data.error ?? "요청을 처리하지 못했습니다.");
  return data;
}
export function PortalShell({
  children,
  title,
}: {
  children: ReactNode;
  title: string;
}) {
  return (
    <main id="main" className="booking-portal">
      <header>
        <Link href="/">WAVE STAY-G · 양양</Link>
        <nav>
          <Link href="/rooms/">객실 안내</Link>
          <Link href="/reservation/book/">일반 예약</Link>
          <Link href="/reservation/lookup/">예약 조회</Link>
          <Link href="/owners/">수분양자</Link>
        </nav>
      </header>
      <h1>{title}</h1>
      {children}
    </main>
  );
}
export function ApplicationCard({ row }: { row: Application }) {
  return (
    <article className="portal-card">
      <div className="portal-row">
        <strong>
          {row.room_type_name} · {row.room_count}실
        </strong>
        <span className={`booking-status ${row.status}`}>
          {statusText[row.status]}
        </span>
      </div>
      <p>
        {row.check_in} ~ {row.check_out} · {row.guest_count}명
      </p>
      <p>
        투숙객 {row.guest_name} · {row.phone}
      </p>
      <p className="portal-reference">신청 번호: {row.id}</p>
      <p>금액 {row.quoted_amount.toLocaleString()}원 · 현장 정산</p>
      {row.pricing?.owned_type && (
        <p>
          보유 타입: {row.pricing.owned_type} · 업그레이드 차액 50%{" "}
          {row.pricing.upgrade_amount.toLocaleString()}원 · 인원 추가{" "}
          {row.pricing.guest_fee.toLocaleString()}원 · 침구{" "}
          {row.pricing.bedding_fee.toLocaleString()}원
        </p>
      )}
      {row.note && <p className="portal-note">{row.note}</p>}
      {row.admin_note && (
        <p className="portal-note">관리자 안내: {row.admin_note}</p>
      )}
    </article>
  );
}
export function OwnerPolicy() {
  return (
    <details className="portal-card">
      <summary>수분양자 이용 조건 · 취소 및 이월 안내</summary>
      <ul>
        <li>
          2026년 5박, 2027년부터 연 15박. 객실 수 × 숙박 일수만큼 승인 시
          차감합니다.
        </li>
        <li>비수기는 입실 14일 전부터, 1일 1회 신청, 최대 2실·3박입니다.</li>
        <li>
          7~8월은 연 1회, 1실·최대 3박이며 운영 일정은 관리자가 확인합니다.
        </li>
        <li>
          예약은 본인 계정으로, 실제 투숙은 다른 분도 가능합니다. 본인은 신분증,
          다른 투숙객은 예약자명과 예약 확인 내용을 제시해 주세요.
        </li>
        <li>
          동일 타입은 무료입니다. 상위 타입은 판매가 차액의 50%를 현장에서
          정산하며 관리자 확인이 필요합니다.
        </li>
        <li>
          7일 전까지 취소는 무료, 3일 전 취소는 박수 50% 차감(내림), 당일
          취소·노쇼는 100% 차감입니다. 그 외 구간은 관리자에게 문의해 주세요.
        </li>
        <li>
          미사용 연간 부여 박수는 최대 50%(내림)를 다음 해 3월 31일까지
          이월합니다. 2026년 혜택은 12월 31일 소멸하며 이월하지 않습니다.
        </li>
      </ul>
      <p>
        신청만으로 예약이 확정되지 않습니다. 승인 결과는 이 화면에서 확인해
        주세요. 취소 및 일정 변경은 프런트에 문의해 주세요.
      </p>
    </details>
  );
}
export function BookingApplicationForm({
  owner,
  onApplied,
}: {
  owner?: Owner;
  onApplied: (row: Application) => void;
}) {
  const [dates, setDates] = useState({ check_in: "", check_out: "" });
  const [inventory, setInventory] = useState<Inventory[] | null>(null);
  const [type, setType] = useState(owner?.room_type_name ?? "");
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const [requestId, setRequestId] = useState("");
  const [quote, setQuote] = useState<BookingQuote | null>(null);
  async function preview(form: HTMLFormElement) {
    const fields = new FormData(form);
    setBusy(true);
    setError("");
    try {
      setQuote(
        await bookingRequest<BookingQuote>(
          owner ? "owner-quote" : "quote",
          "POST",
          {
            ...dates,
            room_type_name: type,
            room_count: Number(fields.get("room_count") ?? 1),
            adults: Number(fields.get("adults")),
            children: Number(fields.get("children")),
            extra_bedding: Number(fields.get("extra_bedding")),
          },
        ),
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function check() {
    setBusy(true);
    setError("");
    setInventory(null);
    try {
      const rows = await bookingRequest<Inventory[]>(
        `inventory?${new URLSearchParams(dates)}`,
      );
      setInventory(rows);
      setType(rows.some((r) => r.name === type) ? type : (rows[0]?.name ?? ""));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!inventory) return;
    if (!quote) {
      setError("신청 전 요금을 확인해 주세요.");
      return;
    }
    const fields = new FormData(event.currentTarget);
    const id = requestId || crypto.randomUUID();
    setRequestId(id);
    setBusy(true);
    setError("");
    try {
      const row = await bookingRequest<Application>(
        owner ? "owner-applications" : "applications",
        "POST",
        {
          id,
          ...dates,
          room_count: Number(fields.get("room_count") ?? 1),
          room_type_name: type,
          guest_name: fields.get("guest_name"),
          phone: fields.get("phone"),
          guest_count: Number(fields.get("guest_count") ?? 1),
          note: fields.get("note"),
          adults: Number(fields.get("adults")),
          children: Number(fields.get("children")),
          extra_bedding: Number(fields.get("extra_bedding")),
          password: fields.get("password"),
          terms: fields.get("terms") === "on",
        },
      );
      setRequestId("");
      onApplied(row);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="portal-card">
      <h2>예약 신청</h2>
      <p>
        객실 현황 확인 후 신청할 수 있습니다. 최종 객실 배정과 예약 확정은
        관리자 승인 후 진행됩니다.
      </p>
      <form
        onSubmit={submit}
        onChange={(e) => {
          const target = e.target;
          if (
            (target instanceof HTMLInputElement &&
              ["date", "number"].includes(target.type)) ||
            target instanceof HTMLSelectElement
          )
            setQuote(null);
        }}
      >
        <fieldset disabled={busy}>
          <div className="portal-grid">
            <label>
              체크인
              <input
                required
                type="date"
                value={dates.check_in}
                onChange={(e) => {
                  setDates({ ...dates, check_in: e.target.value });
                  setInventory(null);
                }}
              />
            </label>
            <label>
              체크아웃
              <input
                required
                type="date"
                value={dates.check_out}
                onChange={(e) => {
                  setDates({ ...dates, check_out: e.target.value });
                  setInventory(null);
                }}
              />
            </label>
          </div>
          <button
            type="button"
            onClick={check}
            disabled={!dates.check_in || !dates.check_out}
          >
            객실 확인
          </button>
          {inventory && (
            <>
              <div className="portal-grid">
                <label>
                  희망 객실 타입
                  <select
                    required
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                  >
                    {inventory.map((r) => (
                      <option
                        key={r.name}
                        value={r.name}
                        disabled={r.available < 1}
                      >
                        {r.name} · 신청 가능 {r.available}실
                      </option>
                    ))}
                  </select>
                </label>
                {owner && (
                  <label>
                    객실 수
                    <select name="room_count">
                      <option value="1">1실</option>
                      <option value="2">2실 (비수기)</option>
                    </select>
                  </label>
                )}
              </div>
              {owner && type !== owner.room_type_name && (
                <p>
                  보유 타입: {owner.room_type_name}. 타입 변경은 승인 시 가능
                  여부와 추가 요금을 안내합니다.
                </p>
              )}
              <div className="portal-grid">
                <label>
                  실제 투숙객 이름
                  <input
                    name="guest_name"
                    required
                    maxLength={100}
                    defaultValue={owner?.name}
                    autoComplete="name"
                  />
                </label>
                <label>
                  연락처
                  <input
                    name="phone"
                    required
                    type="tel"
                    maxLength={30}
                    defaultValue={owner?.phone}
                    autoComplete="tel"
                  />
                </label>
                {
                  <>
                    <label>
                      8세 이상
                      <input
                        name="adults"
                        type="number"
                        min={1}
                        max={owner ? 8 : 4}
                        defaultValue={2}
                        required
                      />
                    </label>
                    <label>
                      1~7세
                      <input
                        name="children"
                        type="number"
                        min={0}
                        max={owner ? 7 : 3}
                        defaultValue={0}
                        required
                      />
                    </label>
                    <label>
                      추가 침구(세트)
                      <input
                        name="extra_bedding"
                        type="number"
                        min={0}
                        max={6}
                        defaultValue={0}
                        required
                      />
                    </label>
                    {!owner && (
                      <label>
                        조회 비밀번호
                        <input
                          name="password"
                          type="password"
                          minLength={8}
                          maxLength={72}
                          required
                          autoComplete="new-password"
                        />
                      </label>
                    )}
                  </>
                }
              </div>
              <label>
                요청사항
                <textarea name="note" maxLength={700} rows={3} />
              </label>
              {!owner && (
                <p>
                  요금표 기준 객실료와 인원·침구 추가 비용이 적용됩니다.
                  세금·봉사료 추가 및 쿠폰 할인은 없습니다. 결제는 현장에서
                  진행합니다.
                </p>
              )}
              <label className="portal-check">
                <input name="terms" type="checkbox" required />
                예약 처리를 위한 이름·연락처 수집 및 이용 조건에
                동의합니다.{" "}
              </label>
              <button
                type="button"
                onClick={(e) => {
                  if (e.currentTarget.form) void preview(e.currentTarget.form);
                }}
              >
                요금 확인
              </button>
              {quote && (
                <p role="status">
                  {owner
                    ? `업그레이드 차액 50% ${quote.upgrade_amount.toLocaleString()}`
                    : `객실료 ${quote.room_amount.toLocaleString()}`}
                  원 + 인원 추가 {quote.guest_fee.toLocaleString()}원 + 침구{" "}
                  {quote.bedding_fee.toLocaleString()}원 ={" "}
                  <strong>총 {quote.total.toLocaleString()}원</strong>
                </p>
              )}
              <button
                disabled={
                  !inventory.some((r) => r.name === type && r.available > 0) ||
                  !quote
                }
                type="submit"
              >
                {busy ? "처리 중…" : "예약 신청"}
              </button>
            </>
          )}
        </fieldset>
      </form>
      {error && (
        <p role="alert" className="portal-error">
          {error}
        </p>
      )}
    </section>
  );
}
export function OwnerPortal() {
  const [owner, setOwner] = useState<Owner | null>(null),
    [rows, setRows] = useState<PageResult<Application> | null>(null);
  const [page, setPage] = useState(1),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [message, setMessage] = useState("");
  async function load(n = page) {
    const info = await bookingRequest<Owner>("me");
    setOwner(info);
    setRows(
      await bookingRequest<PageResult<Application>>(`applications?page=${n}`),
    );
  }
  useEffect(() => {
    bookingRequest<Owner>("me")
      .then(setOwner)
      .catch(() => {});
  }, []);
  useEffect(() => {
    if (!owner) return;
    let cancelled = false;
    bookingRequest<PageResult<Application>>(`applications?page=${page}`)
      .then((data) => {
        if (!cancelled) setRows(data);
      })
      .catch((e) => {
        if (!cancelled) setError(e.message);
      });
    return () => {
      cancelled = true;
    };
  }, [owner, page]);
  async function login(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const fields = new FormData(e.currentTarget);
    try {
      await bookingRequest("login", "POST", Object.fromEntries(fields));
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function changePassword(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fields = new FormData(e.currentTarget);
    if (fields.get("password") !== fields.get("confirm")) {
      setError("새 비밀번호 확인이 일치하지 않습니다.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await bookingRequest("password", "POST", {
        current_password: fields.get("current_password"),
        password: fields.get("password"),
      });
      setOwner(null);
      setRows(null);
      setMessage("비밀번호를 변경했습니다. 다시 로그인해 주세요.");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <PortalShell title="수분양자 예약">
      <p>관리자가 발급한 아이디와 비밀번호로 로그인해 주세요.</p>
      {message && <p role="status">{message}</p>}
      {error && (
        <p role="alert" className="portal-error">
          {error}
        </p>
      )}
      {!owner ? (
        <form className="portal-card" onSubmit={login}>
          <fieldset disabled={busy}>
            <label>
              아이디
              <input
                name="login_id"
                required
                maxLength={40}
                autoComplete="username"
              />
            </label>
            <label>
              비밀번호
              <input
                name="password"
                type="password"
                required
                maxLength={72}
                autoComplete="current-password"
              />
            </label>
            <button>{busy ? "로그인 중…" : "로그인"}</button>
          </fieldset>
        </form>
      ) : (
        <>
          <section className="portal-card">
            <div className="portal-row">
              <h2>{owner.name || owner.login_id}님</h2>
              <button
                onClick={async () => {
                  try {
                    await bookingRequest("login", "DELETE");
                    setOwner(null);
                    setRows(null);
                  } catch (e) {
                    setError((e as Error).message);
                  }
                }}
              >
                로그아웃
              </button>
            </div>
            <p>
              잔여 {owner.annual_nights + owner.carryover_nights}박 · 올해{" "}
              {owner.annual_nights}박 / 이월 {owner.carryover_nights}박
            </p>
            <p>보유 타입: {owner.room_type_name}</p>
            <details>
              <summary>비밀번호 변경</summary>
              <form onSubmit={changePassword}>
                <label>
                  현재 비밀번호
                  <input
                    name="current_password"
                    type="password"
                    autoComplete="current-password"
                    required
                  />
                </label>
                <label>
                  새 비밀번호
                  <input
                    name="password"
                    type="password"
                    minLength={8}
                    maxLength={72}
                    autoComplete="new-password"
                    required
                  />
                </label>
                <label>
                  새 비밀번호 확인
                  <input
                    name="confirm"
                    type="password"
                    minLength={8}
                    maxLength={72}
                    autoComplete="new-password"
                    required
                  />
                </label>
                <button disabled={busy}>변경</button>
              </form>
            </details>
          </section>
          <OwnerPolicy />
          <BookingApplicationForm
            owner={owner}
            onApplied={() => {
              setMessage(
                "예약 신청을 접수했습니다. 관리자 승인 후 확정됩니다.",
              );
              void load(1).catch((e) => setError(e.message));
              setPage(1);
            }}
          />
          <div className="portal-row">
            <h2>내 예약 신청</h2>
            <button
              onClick={() => void load().catch((e) => setError(e.message))}
            >
              새로고침
            </button>
          </div>
          {rows?.items.map((row) => (
            <ApplicationCard key={row.id} row={row} />
          ))}
          {rows?.items.length === 0 && <p>신청 내역이 없습니다.</p>}
          <Pagination page={page} total={rows?.total ?? 0} onPage={setPage} />
        </>
      )}
    </PortalShell>
  );
}
export function Pagination({
  page,
  total,
  onPage,
}: {
  page: number;
  total: number;
  onPage: (n: number) => void;
}) {
  return (
    <div className="portal-row">
      <button disabled={page <= 1} onClick={() => onPage(page - 1)}>
        이전
      </button>
      <span>
        {page} / {Math.max(1, Math.ceil(total / 50))} · 총 {total}건
      </span>
      <button disabled={page * 50 >= total} onClick={() => onPage(page + 1)}>
        다음
      </button>
    </div>
  );
}
export function GeneralBookingPortal({ lookup = false }: { lookup?: boolean }) {
  const [row, setRow] = useState<Application | null>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  async function find(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setRow(null);
    try {
      setRow(
        await bookingRequest<Application>(
          "lookup",
          "POST",
          Object.fromEntries(new FormData(e.currentTarget)),
        ),
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <PortalShell title={lookup ? "예약 신청 조회" : "일반 예약 신청"}>
      {lookup ? (
        <form className="portal-card" onSubmit={find}>
          <label>
            신청 번호
            <input name="id" required />
          </label>
          <label>
            조회 비밀번호
            <input
              name="password"
              required
              type="password"
              minLength={8}
              maxLength={72}
            />
          </label>
          <button disabled={busy}>조회</button>
        </form>
      ) : (
        !row && <BookingApplicationForm onApplied={setRow} />
      )}
      {error && (
        <p role="alert" className="portal-error">
          {error}
        </p>
      )}
      {row && (
        <>
          <p role="status">
            {lookup
              ? "신청 내역입니다."
              : "신청이 접수되었습니다. 신청 번호와 비밀번호로 승인 결과를 조회할 수 있습니다. 신청 번호를 보관해 주세요."}
          </p>
          <ApplicationCard row={row} />
        </>
      )}
    </PortalShell>
  );
}
