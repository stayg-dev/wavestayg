"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { PortalShell, bookingRequest } from "./website-booking";
import { roomTypeLabel } from "@/lib/room-type-labels";
import { bookingToday, shiftBookingDate } from "@/lib/owner-booking-dates";
import {
  editSalesDates,
  salesDateRange,
  type SalesAudience,
  type SalesConfig,
  type SalesHistory,
  type SalesSnapshot,
  type SalesTariff,
} from "@/lib/website-sales";

const periods = [
  ["weekday", "주중"],
  ["friday", "금요일"],
  ["saturday", "토요일·공휴일 전일"],
] as const;
const serviceLabels = {
  general_guest: "일반 · 추가 인원 / 1인 1박",
  general_bedding: "일반 · 침구 / 1세트 1박",
  owner_guest: "수분양자 · 추가 인원 / 1인 1박",
  owner_bedding: "수분양자 · 침구 / 1세트 1박",
  extra_hour: "얼리·레이트 / 1시간",
};
const audienceLabels = { all: "전체", general: "일반 예약", owner: "수분양자" };
const money = (n: number) => `${n.toLocaleString("ko-KR")}원`;
const priceDescription = (p: {
  base_amount: number;
  discount_amount: number;
  sale_amount: number;
}) =>
  `${money(p.base_amount)} − 할인 ${money(p.discount_amount)} = ${money(p.sale_amount)}`;

function Amount({
  label,
  value,
  onChange,
  min = 1,
  max = 10000000,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
}) {
  return (
    <label>
      {label}
      <input
        aria-label={label}
        type="number"
        min={min}
        max={max}
        step={1}
        value={value || (min ? "" : 0)}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </label>
  );
}

export function WebsiteSalesSettings() {
  const [snapshot, setSnapshot] = useState<SalesSnapshot | null>(null);
  const [config, setConfig] = useState<SalesConfig | null>(null);
  const [history, setHistory] = useState<SalesHistory[]>([]);
  const [busy, setBusy] = useState(true),
    [error, setError] = useState(""),
    [message, setMessage] = useState("");
  const [reason, setReason] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [from, setFrom] = useState(bookingToday),
    [to, setTo] = useState(bookingToday);
  const [weekdays, setWeekdays] = useState([0, 1, 2, 3, 4, 5, 6]);
  const [action, setAction] = useState<"price" | "reset" | "block" | "reopen">(
    "price",
  );
  const [base, setBase] = useState(0),
    [discount, setDiscount] = useState(0);
  const [audience, setAudience] = useState<SalesAudience>("all"),
    [blockReason, setBlockReason] = useState("");
  const [viewType, setViewType] = useState(""),
    [viewFrom, setViewFrom] = useState(bookingToday);
  const [preview, setPreview] = useState<
    { date: string; sale_amount: number | null }[]
  >([]);
  const pending = useRef<{ content: string; id: string } | null>(null);
  const dirty =
    !!config && JSON.stringify(config) !== JSON.stringify(snapshot?.config);

  async function load() {
    setBusy(true);
    setError("");
    try {
      const data = await bookingRequest<SalesSnapshot>("admin/sales");
      setSnapshot(data);
      setConfig(structuredClone(data.config));
      pending.current = null;
      setViewType((current) => current || data.room_types?.[0]?.id || "");
      setHistory(await bookingRequest<SalesHistory[]>("admin/sales/history"));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => {
    let cancelled = false;
    Promise.all([
      bookingRequest<SalesSnapshot>("admin/sales"),
      bookingRequest<SalesHistory[]>("admin/sales/history"),
    ])
      .then(([data, changes]) => {
        if (cancelled) return;
        setSnapshot(data);
        setConfig(structuredClone(data.config));
        setHistory(changes);
        setViewType(data.room_types?.[0]?.id ?? "");
      })
      .catch((e: Error) => {
        if (!cancelled) setError(e.message);
      })
      .finally(() => {
        if (!cancelled) setBusy(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  // Saved date resolution (including holiday eves) comes from PMS; unsaved overrides are overlaid below.
  useEffect(() => {
    if (!viewFrom || !viewType) return;
    let cancelled = false;
    bookingRequest<import("@/lib/website-sales").PublicSales>(
      `sales?from=${viewFrom}&to=${shiftBookingDate(viewFrom, 30)}`,
    )
      .then((data) => {
        if (!cancelled)
          setPreview(
            data.rooms.find((r) => r.room_type_id === viewType)?.dates ?? [],
          );
      })
      .catch(() => {
        if (!cancelled) setPreview([]);
      });
    return () => {
      cancelled = true;
    };
  }, [viewFrom, viewType, snapshot?.revision]);

  function edit(change: Partial<SalesConfig>) {
    setConfig((c) => (c ? { ...c, ...change } : c));
    setMessage("");
  }
  function editTariff(
    id: string,
    period: keyof Pick<SalesTariff, "weekday" | "friday" | "saturday">,
    key: "base_amount" | "discount_amount",
    value: number,
  ) {
    if (!config) return;
    edit({
      tariffs: config.tariffs.map((t) => {
        if (t.room_type_id !== id) return t;
        const price = { ...t[period], [key]: value };
        return {
          ...t,
          [period]: {
            ...price,
            sale_amount: price.base_amount - price.discount_amount,
          },
        };
      }),
    });
  }
  function applyDates() {
    if (!config) return;
    try {
      const dates = salesDateRange(from, to, weekdays);
      setConfig(
        editSalesDates(
          config,
          selected,
          dates,
          action,
          {
            base_amount: base,
            discount_amount: discount,
            sale_amount: base - discount,
          },
          audience,
          blockReason,
        ),
      );
      setError("");
      setMessage(
        `${selected.length}개 객실 타입 × ${dates.length}박을 편집했습니다. 아래 저장 버튼을 눌러 반영해 주세요.`,
      );
    } catch (e) {
      setError((e as Error).message);
    }
  }
  async function save() {
    if (!config || !snapshot) return;
    if (!reason.trim()) {
      setError("변경 사유를 입력해 주세요.");
      return;
    }
    setBusy(true);
    setError("");
    setMessage("");
    const payload = {
      config,
      revision: snapshot.revision,
      reason: reason.trim(),
    };
    const content = JSON.stringify(payload);
    if (pending.current?.content !== content)
      pending.current = { content, id: crypto.randomUUID() };
    try {
      await bookingRequest<SalesSnapshot>("admin/sales", "POST", {
        ...payload,
        request_id: pending.current.id,
      });
      await load();
      setReason("");
      setMessage("PMS에 저장했습니다. 새 견적과 예약에 바로 적용됩니다.");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <PortalShell
      title="홈페이지 요금·판매 설정"
      navigation={
        <nav>
          <Link href="/admin/reservations/">예약 관리</Link>
          <Link href="/admin/notices/">공지사항</Link>
          <Link href="/admin/settings/" aria-current="page">
            요금·판매 설정
          </Link>
        </nav>
      }
      className="sales-settings"
    >
      <p>
        객실 표시 요금과 실제 예약 요금을 함께 관리합니다. 적용일은 숙박일
        기준이며 퇴실일은 포함하지 않습니다.
      </p>
      <div className="sales-feedback" aria-live="polite">
        {error && (
          <p role="alert" className="portal-error">
            {error}
          </p>
        )}
        {message && <p role="status">{message}</p>}
      </div>
      <button
        type="button"
        disabled={busy}
        onClick={() => {
          if (
            !dirty ||
            window.confirm("저장하지 않은 변경을 버리고 다시 불러올까요?")
          )
            void load();
        }}
      >
        PMS 설정 다시 불러오기
      </button>
      {!config && (
        <p>
          {busy
            ? "설정을 불러오는 중…"
            : "설정을 불러온 후 편집할 수 있습니다."}
        </p>
      )}
      {config && (
        <fieldset disabled={busy} className="sales-editor">
          <section className="portal-card">
            <h2>예약 접수</h2>
            <label className="portal-check">
              <input
                type="checkbox"
                checked={config.is_enabled}
                onChange={(e) => edit({ is_enabled: e.target.checked })}
              />
              홈페이지 예약 접수 허용
            </label>
            <div className="portal-row">
              {(
                [
                  ["is_general_enabled", "일반 예약 허용"],
                  ["is_owner_enabled", "수분양자 예약 허용"],
                ] as const
              ).map(([key, label]) => (
                <label className="portal-check" key={key}>
                  <input
                    type="checkbox"
                    checked={config[key]}
                    onChange={(e) => edit({ [key]: e.target.checked })}
                  />
                  {label}
                </label>
              ))}
            </div>
            <p>
              접수를 중지해도 기존 예약과 예약 조회·취소는 유지됩니다. 요금이
              없는 객실이나 유효 기간 밖의 날짜는 접수할 수 없습니다.
            </p>
            <label>
              판매 중지 안내 문구
              <input
                value={config.message}
                maxLength={300}
                onChange={(e) => edit({ message: e.target.value })}
              />
            </label>
            <div className="portal-grid">
              <label>
                요금 유효 시작일
                <input
                  type="date"
                  value={config.valid_from}
                  onChange={(e) => edit({ valid_from: e.target.value })}
                />
              </label>
              <label>
                요금 유효 종료일
                <input
                  type="date"
                  value={config.valid_to}
                  onChange={(e) => edit({ valid_to: e.target.value })}
                />
              </label>
            </div>
          </section>
          <section className="portal-card">
            <h2>객실 기본 요금</h2>
            <p>
              정상가와 할인액을 각각 입력하세요. 실제 판매가는 정상가에서
              할인액을 빼서 자동 계산됩니다. 할인액 0원은 할인 없이 판매합니다.
              금액은 객실 1실·1박 기준이며 공휴일 전일은 토요일 요금이
              적용됩니다.
            </p>
            <div className="sales-table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>객실 타입</th>
                    {periods.map(([key, label]) => (
                      <th key={key}>{label}</th>
                    ))}
                    <th>설정</th>
                  </tr>
                </thead>
                <tbody>
                  {snapshot?.room_types?.map((room) => {
                    const tariff = config.tariffs.find(
                      (t) => t.room_type_id === room.id,
                    );
                    return (
                      <tr key={room.id}>
                        <th>{roomTypeLabel(room.name)}</th>
                        {periods.map(([key, label]) => (
                          <td key={key}>
                            {tariff ? (
                              <>
                                <Amount
                                  label={`${roomTypeLabel(room.name)} ${label} 정상가`}
                                  value={tariff[key].base_amount}
                                  onChange={(v) =>
                                    editTariff(room.id, key, "base_amount", v)
                                  }
                                />
                                <Amount
                                  label={`${roomTypeLabel(room.name)} ${label} 할인액`}
                                  value={tariff[key].discount_amount}
                                  min={0}
                                  max={9999999}
                                  onChange={(v) =>
                                    editTariff(
                                      room.id,
                                      key,
                                      "discount_amount",
                                      v,
                                    )
                                  }
                                />
                                <p>
                                  실제 판매가{" "}
                                  <output
                                    aria-label={`${roomTypeLabel(room.name)} ${label} 실제 판매가`}
                                  >
                                    {money(tariff[key].sale_amount)}
                                  </output>
                                </p>
                              </>
                            ) : (
                              "미설정"
                            )}
                          </td>
                        ))}
                        <td>
                          <button
                            type="button"
                            onClick={() => {
                              if (tariff)
                                edit({
                                  tariffs: config.tariffs.filter(
                                    (t) => t.room_type_id !== room.id,
                                  ),
                                  overrides: config.overrides.filter(
                                    (o) => o.room_type_id !== room.id,
                                  ),
                                });
                              else
                                edit({
                                  tariffs: [
                                    ...config.tariffs,
                                    {
                                      room_type_id: room.id,
                                      name: room.name,
                                      weekday: {
                                        base_amount: 0,
                                        discount_amount: 0,
                                        sale_amount: 0,
                                      },
                                      friday: {
                                        base_amount: 0,
                                        discount_amount: 0,
                                        sale_amount: 0,
                                      },
                                      saturday: {
                                        base_amount: 0,
                                        discount_amount: 0,
                                        sale_amount: 0,
                                      },
                                    },
                                  ],
                                });
                            }}
                          >
                            {tariff ? "요금 해제" : "요금 입력"}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {!snapshot?.room_types?.length && (
              <p>
                연결된 객실 타입이 없습니다. PMS 객실 타입 설정을 확인해 주세요.
              </p>
            )}
          </section>
          <section className="portal-card">
            <h2>날짜별 요금·방막기</h2>
            <p>
              성수기·비성수기·특가를 기간과 요일로 지정하세요. 날짜별 요금이
              기본 요금보다 우선합니다. 방막기는 PMS의 실물 객실 재고를 변경하지
              않고 홈페이지 접수에 적용됩니다.
            </p>
            <div className="sales-room-options">
              {snapshot?.room_types?.map((room) => (
                <label className="portal-check" key={room.id}>
                  <input
                    type="checkbox"
                    checked={selected.includes(room.id)}
                    onChange={(e) =>
                      setSelected(
                        e.target.checked
                          ? [...selected, room.id]
                          : selected.filter((id) => id !== room.id),
                      )
                    }
                  />
                  {roomTypeLabel(room.name)}
                </label>
              ))}
            </div>
            <button
              type="button"
              onClick={() =>
                setSelected(snapshot?.room_types?.map((r) => r.id) ?? [])
              }
            >
              객실 전체 선택
            </button>
            <button type="button" onClick={() => setSelected([])}>
              선택 해제
            </button>
            <div className="portal-grid">
              <label>
                첫 숙박일
                <input
                  type="date"
                  value={from}
                  onChange={(e) => setFrom(e.target.value)}
                />
              </label>
              <label>
                마지막 숙박일 (포함)
                <input
                  type="date"
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                />
              </label>
            </div>
            <div className="portal-row">
              {["일", "월", "화", "수", "목", "금", "토"].map((day, i) => (
                <label className="portal-check" key={day}>
                  <input
                    type="checkbox"
                    checked={weekdays.includes(i)}
                    onChange={(e) =>
                      setWeekdays(
                        e.target.checked
                          ? [...weekdays, i]
                          : weekdays.filter((v) => v !== i),
                      )
                    }
                  />
                  {day}
                </label>
              ))}
            </div>
            <label>
              작업
              <select
              aria-label="작업"
                value={action}
                onChange={(e) => setAction(e.target.value as typeof action)}
              >
                <option value="price">날짜별 판매 요금 지정</option>
                <option value="reset">날짜별 요금 해제 · 기본 요금 사용</option>
                <option value="block">방막기</option>
                <option value="reopen">방막기 해제</option>
              </select>
            </label>
            {action === "price" && (
              <>
                <div className="portal-grid">
                  <Amount
                    label="날짜별 정상가"
                    value={base}
                    onChange={setBase}
                  />
                  <Amount
                    label="날짜별 할인액"
                    value={discount}
                    min={0}
                    max={9999999}
                    onChange={setDiscount}
                  />
                </div>
                <p>
                  실제 판매가{" "}
                  <output aria-label="날짜별 실제 판매가">
                    {money(base - discount)}
                  </output>{" "}
                  / 객실 1실·1박
                </p>
                <button
                  type="button"
                  disabled={base <= 5000}
                  onClick={() => setDiscount(5000)}
                >
                  할인액 5,000원 입력
                </button>
              </>
            )}
            {(action === "block" || action === "reopen") && (
              <>
                <label>
                  예약 대상
                  <select
                    value={audience}
                    onChange={(e) =>
                      setAudience(e.target.value as SalesAudience)
                    }
                  >
                    {Object.entries(audienceLabels).map(([key, label]) => (
                      <option key={key} value={key}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
                {action === "block" && (
                  <label>
                    방막기 사유 (관리자만 표시)
                    <input
                      value={blockReason}
                      maxLength={300}
                      onChange={(e) => setBlockReason(e.target.value)}
                    />
                  </label>
                )}
                <p>
                  해제는 선택한 대상의 방막기만 지웁니다. 다른 대상의 방막기나
                  전체 접수 중지가 남아 있으면 판매가 재개되지 않습니다.
                </p>
              </>
            )}
            <button type="button" onClick={applyDates}>
              선택 기간에 편집 적용
            </button>
          </section>
          <section className="portal-card">
            <h2>날짜별 설정 확인</h2>
            <div className="portal-grid">
              <label>
                객실
                <select
                  value={viewType}
                  onChange={(e) => setViewType(e.target.value)}
                >
                  {snapshot?.room_types?.map((r) => (
                    <option key={r.id} value={r.id}>
                      {roomTypeLabel(r.name)}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                확인 시작일
                <input
                  type="date"
                  value={viewFrom}
                  onChange={(e) => setViewFrom(e.target.value)}
                />
              </label>
            </div>
            <p>
              31일간의 저장된 판매가와 현재 편집 중인 날짜 특가·방막기를
              비교합니다. 기본 요금 편집 결과는 저장 후 확인할 수 있습니다.
            </p>
            <div className="sales-table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>숙박일</th>
                    <th>저장된 판매가</th>
                    <th>날짜별 특가 (편집 중)</th>
                    <th>방막기 (편집 중)</th>
                  </tr>
                </thead>
                <tbody>
                  {viewFrom &&
                    salesDateRange(
                      viewFrom,
                      shiftBookingDate(viewFrom, 30),
                    ).map((date) => {
                      const override = config.overrides.find(
                        (o) => o.room_type_id === viewType && o.date === date,
                      );
                      const blocks = config.blocks.filter(
                        (b) => b.room_type_id === viewType && b.date === date,
                      );
                      const price = preview.find(
                        (p) => p.date === date,
                      )?.sale_amount;
                      return (
                        <tr key={date}>
                          <th>{date}</th>
                          <td>{price == null ? "미설정" : money(price)}</td>
                          <td>
                            {override
                              ? `${money(override.base_amount)} → ${money(override.sale_amount)}`
                              : "기본 요금"}
                          </td>
                          <td>
                            {blocks.length
                              ? blocks
                                  .map(
                                    (b) =>
                                      `${audienceLabels[b.audience]}: ${b.reason}`,
                                  )
                                  .join(" / ")
                              : "없음"}
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </section>
          <section className="portal-card">
            <h2>부가서비스 요금</h2>
            <div className="portal-grid">
              {(
                Object.keys(serviceLabels) as (keyof typeof serviceLabels)[]
              ).map((key) => (
                <Amount
                  key={key}
                  label={serviceLabels[key]}
                  value={config.services[key]}
                  min={0}
                  onChange={(v) =>
                    edit({ services: { ...config.services, [key]: v } })
                  }
                />
              ))}
            </div>
          </section>
          <section className="portal-card sales-save">
            <strong>
              {dirty ? "저장하지 않은 변경이 있습니다." : "저장된 설정입니다."}
            </strong>
            <label>
              변경 사유
              <input
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                maxLength={300}
                placeholder="예: 10월 비성수기 요금 및 점검일 방막기"
              />
            </label>
            <button
              type="button"
              disabled={!dirty || !reason.trim()}
              onClick={() => void save()}
            >
              {busy ? "저장 중…" : "PMS에 설정 저장"}
            </button>
            <p>
              저장 이후 접수되는 예약부터 적용됩니다. 기존 예약 금액은 바뀌지
              않습니다.
            </p>
          </section>
        </fieldset>
      )}
      <section className="portal-card">
        <h2>최근 변경 이력</h2>
        {history.length ? (
          history.map((h) => (
            <details key={h.id}>
              <summary>
                {new Date(h.created_at).toLocaleString("ko-KR")} · {h.reason}
              </summary>
              <p>
                예약 접수: {h.before.is_enabled ? "허용" : "중지"} →{" "}
                {h.after.is_enabled ? "허용" : "중지"} / 날짜 특가:{" "}
                {h.before.overrides.length} → {h.after.overrides.length}건 /
                방막기: {h.before.blocks.length} → {h.after.blocks.length}건
              </p>
              <div className="sales-table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>객실</th>
                      <th>변경 전 판매가 (주중 / 금 / 토)</th>
                      <th>변경 후 판매가 (주중 / 금 / 토)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Array.from(
                      new Set(
                        [...h.before.tariffs, ...h.after.tariffs].map(
                          (t) => t.room_type_id,
                        ),
                      ),
                    ).map((id) => {
                      const before = h.before.tariffs.find(
                          (t) => t.room_type_id === id,
                        ),
                        after = h.after.tariffs.find(
                          (t) => t.room_type_id === id,
                        );
                      return (
                        <tr key={id}>
                          <th>{roomTypeLabel((after ?? before)!.name)}</th>
                          <td>
                            {before
                              ? periods
                                  .map(([k]) => priceDescription(before[k]))
                                  .join(" / ")
                              : "미설정"}
                          </td>
                          <td>
                            {after
                              ? periods
                                  .map(([k]) => priceDescription(after[k]))
                                  .join(" / ")
                              : "미설정"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </details>
          ))
        ) : (
          <p>변경 이력이 없습니다.</p>
        )}
      </section>
    </PortalShell>
  );
}
