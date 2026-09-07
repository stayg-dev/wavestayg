"use client";
import { Suspense, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Shell, MediaBlock, formatPrice, Tags } from "./shared";
import { rooms } from "./content-pages";
import {
  Booking,
  ReservationRecord,
  initialBooking,
  addDays,
  dateISO,
  nightsBetween,
  totalFor,
  shortDate,
  validateDates,
  validateGuest,
  normalizeBookingQuery,
  priceList,
} from "@/lib/booking";
const storageKey = "wave-stayg-preview-reservations";
function readRecords(): ReservationRecord[] {
  try {
    const data = JSON.parse(sessionStorage.getItem(storageKey) || "[]");
    return Array.isArray(data)
      ? data.filter(
          (x) =>
            x &&
            typeof x.code === "string" &&
            x.booking &&
            typeof x.booking.lastName === "string" &&
            typeof x.booking.firstName === "string",
        )
      : [];
  } catch {
    return [];
  }
}
function saveRecord(r: ReservationRecord) {
  try {
    sessionStorage.setItem(
      storageKey,
      JSON.stringify([r, ...readRecords().filter((x) => x.code !== r.code)]),
    );
    return true;
  } catch {
    return false;
  }
}
function PreviewNote() {
  return (
    <p className="preview-note">
      화면 미리보기 · 실제 예약이나 결제가 진행되지 않습니다.
    </p>
  );
}
function Steps({ step }: { step: number }) {
  return (
    <ol className="booking-steps" aria-label="예약 진행 단계">
      {["날짜 · 인원", "객실 선택", "예약자 정보", "결제 · 확인"].map(
        (label, i) => (
          <li
            key={label}
            className={
              step === i + 1 || (step === 5 && i === 3)
                ? "active"
                : step > i + 1
                  ? "complete"
                  : ""
            }
            aria-current={step === i + 1 ? "step" : undefined}
          >
            <span>{i + 1}</span>
            <b>{label}</b>
          </li>
        ),
      )}
    </ol>
  );
}
function Calendar({
  booking,
  onChange,
}: {
  booking: Booking;
  onChange: (v: Partial<Booking>) => void;
}) {
  const [month, setMonth] = useState(
    () => new Date(booking.checkin + "T12:00:00"),
  );
  const [picking, setPicking] = useState<"checkin" | "checkout">("checkin");
  const select = (v: string) => {
    if (picking === "checkin") {
      onChange({ checkin: v, checkout: addDays(v, 2) });
      setPicking("checkout");
    } else if (v <= booking.checkin) {
      onChange({ checkin: v, checkout: addDays(v, 2) });
    } else {
      onChange({ checkout: v });
      setPicking("checkin");
    }
  };
  return (
    <section className="panel calendar-panel">
      <div className="minor-heading">
        <h3>날짜 선택</h3>
        <span>{picking === "checkin" ? "체크인 선택" : "체크아웃 선택"}</span>
      </div>
      <div className="calendar-controls">
        <button
          type="button"
          aria-label="이전 달"
          onClick={() =>
            setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))
          }
        >
          ‹
        </button>
        <span>
          선택한 날짜 <i /> 숙박 기간
        </span>
        <button
          type="button"
          aria-label="다음 달"
          onClick={() =>
            setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))
          }
        >
          ›
        </button>
      </div>
      <div className="calendar-pair">
        {[0, 1].map((offset) => {
          const d = new Date(month.getFullYear(), month.getMonth() + offset, 1);
          const year = d.getFullYear(),
            m = d.getMonth(),
            first = d.getDay(),
            days = new Date(year, m + 1, 0).getDate();
          return (
            <div className="calendar-month" key={offset}>
              <h4>
                {year}년 {m + 1}월
              </h4>
              <div className="calendar-days">
                {["일", "월", "화", "수", "목", "금", "토"].map((x) => (
                  <span className="weekday" key={x}>
                    {x}
                  </span>
                ))}
                {Array.from({ length: first }, (_, i) => (
                  <span key={"empty" + i} />
                ))}
                {Array.from({ length: days }, (_, i) => {
                  const value = dateISO(new Date(year, m, i + 1));
                  const selected =
                    value === booking.checkin || value === booking.checkout;
                  return (
                    <button
                      type="button"
                      className={
                        selected
                          ? "selected"
                          : value > booking.checkin && value < booking.checkout
                            ? "in-range"
                            : ""
                      }
                      aria-label={`${year}년 ${m + 1}월 ${i + 1}일`}
                      aria-pressed={selected}
                      key={value}
                      onClick={() => select(value)}
                    >
                      {i + 1}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
      <div className="selected-dates">
        <label>
          체크인
          <input
            type="date"
            aria-label="체크인 날짜"
            value={booking.checkin}
            onChange={(e) => {
              if (e.target.value)
                onChange({
                  checkin: e.target.value,
                  checkout:
                    e.target.value >= booking.checkout
                      ? addDays(e.target.value, 1)
                      : booking.checkout,
                });
            }}
          />
          <small>15:00 이후</small>
        </label>
        <span>→</span>
        <label>
          체크아웃
          <input
            type="date"
            aria-label="체크아웃 날짜"
            min={addDays(booking.checkin, 1)}
            value={booking.checkout}
            onChange={(e) => {
              if (e.target.value) onChange({ checkout: e.target.value });
            }}
          />
          <small>11:00 이전</small>
        </label>
      </div>
    </section>
  );
}
function Counter({
  label,
  description,
  value,
  onChange,
  min,
  max,
}: {
  label: string;
  description: string;
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
}) {
  return (
    <div className="counter-row">
      <div>
        <strong>{label}</strong>
        <p>{description}</p>
      </div>
      <div className="counter">
        <button
          type="button"
          aria-label={`${label} 줄이기`}
          disabled={value <= min}
          onClick={() => onChange(value - 1)}
        >
          −
        </button>
        <span aria-live="polite">{value}</span>
        <button
          type="button"
          aria-label={`${label} 늘리기`}
          disabled={value >= max}
          onClick={() => onChange(value + 1)}
        >
          +
        </button>
      </div>
    </div>
  );
}
function Summary({
  booking,
  step,
  discount,
}: {
  booking: Booking;
  step: number;
  discount: boolean;
}) {
  const n = nightsBetween(booking.checkin, booking.checkout),
    t = totalFor(booking, discount);
  return (
    <aside className="panel booking-summary">
      <div className="minor-heading">
        <h3>예약 요약</h3>
        <span>
          Step {Math.min(step, 4)} ·{" "}
          {["날짜", "객실", "정보", "결제"][Math.min(step, 4) - 1]}
        </span>
      </div>
      <MediaBlock />
      {step > 1 ? (
        <>
          <h3>Ocean Suite</h3>
          <p className="muted">Ocean Suite</p>
        </>
      ) : (
        <div className="availability">
          <div>
            <span>기간 예약 가능 객실</span>
            <h2>
              4 <small>/ 6</small>
            </h2>
          </div>
          <p>
            {n}박 · {shortDate(booking.checkin)} → {shortDate(booking.checkout)}
          </p>
        </div>
      )}
      <dl className="summary-lines">
        {[
          ["체크인", shortDate(booking.checkin)],
          ["체크아웃", shortDate(booking.checkout)],
          ["숙박", `${n}박`],
          [
            "인원",
            `성인 ${booking.adults}${booking.children ? " · 아동 " + booking.children : ""}`,
          ],
          ...(step === 4
            ? [
                ["예약자", booking.lastName + booking.firstName],
                ["연락처", booking.phone],
              ]
            : []),
        ].map(([k, v]) => (
          <div key={k}>
            <dt>{k}</dt>
            <dd>{v}</dd>
          </div>
        ))}
      </dl>
      {step > 1 ? (
        <dl className="summary-lines">
          <div>
            <dt>
              {formatPrice(priceList[booking.room])} × {n}박
            </dt>
            <dd>{formatPrice(t.subtotal)}</dd>
          </div>
          {discount && (
            <div>
              <dt>쿠폰 할인</dt>
              <dd>−{formatPrice(t.saving)}</dd>
            </div>
          )}
          <div>
            <dt>세금 · 봉사료</dt>
            <dd>{formatPrice(t.tax)}</dd>
          </div>
          <div className="total">
            <dt>총액</dt>
            <dd>{formatPrice(t.total)}</dd>
          </div>
        </dl>
      ) : (
        <p className="summary-help">
          다음 단계에서 이 기간에 예약 가능한 객실만 골라서 보여드립니다.
        </p>
      )}
      <p className="cancellation-note">무료 취소 · 체크인 3일 전까지</p>
    </aside>
  );
}
export function BookingFlow() {
  return (
    <Suspense
      fallback={
        <Shell title="예약하기" english="Reservation">
          <p className="container" role="status">
            예약 화면을 불러오고 있습니다.
          </p>
        </Shell>
      }
    >
      <BookingWithQuery />
    </Suspense>
  );
}
function BookingWithQuery() {
  const query = useSearchParams();
  return (
    <BookingForm
      key={query.toString()}
      initial={{
        ...initialBooking,
        ...normalizeBookingQuery(query.toString()),
      }}
    />
  );
}
function BookingForm({ initial }: { initial: Booking }) {
  const [booking, setBooking] = useState<Booking>(initial);
  const [step, setStep] = useState(1);
  const [error, setError] = useState("");
  const [coupon, setCoupon] = useState("");
  const [discount, setDiscount] = useState(false);
  const [couponStatus, setCouponStatus] = useState("");
  const [record, setRecord] = useState<ReservationRecord | null>(null);
  const [storageError, setStorageError] = useState(false);
  const [termsOpen, setTermsOpen] = useState(false);
  const flow = useRef<HTMLDivElement>(null);
  const update = (v: Partial<Booking>) => {
    setBooking((b) => ({ ...b, ...v }));
    setError("");
  };
  const move = (s: number) => {
    setStep(s);
    setError("");
    flow.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  const next = () => {
    const err =
      validateDates(booking) || (step >= 3 ? validateGuest(booking) : "");
    if (err) {
      setError(err);
      return;
    }
    if (step === 4) {
      const r: ReservationRecord = {
        code: "DEMO-WS-" + crypto.randomUUID().slice(0, 8).toUpperCase(),
        booking,
        status: "confirmed",
        total: totalFor(booking, discount).total,
        discounted: discount,
        createdAt: new Date().toISOString(),
      };
      setRecord(r);
      setStorageError(!saveRecord(r));
      move(5);
    } else move(step + 1);
  };
  return (
    <Shell
      title="예약하기"
      english="Reservation"
      description="원하는 날짜를 먼저 정하고, 가능한 객실을 골라 예약합니다."
    >
      <div className="container booking-page" ref={flow}>
        <Link className="back-link" href="/reservation/">
          ← 예약 · 조회 선택
        </Link>
        <Steps step={step} />
        <PreviewNote />
        {step === 5 && record ? (
          <section className="booking-success">
            <div className="success-check">✓</div>
            <h2>예약 미리보기가 완료되었습니다.</h2>
            <p>
              입력하신 내용으로 예약 화면을 확인했습니다.
              <br />
              실제 숙소 예약이나 결제, 이메일 발송은 진행되지 않았습니다.
            </p>
            <div className="reservation-code">
              <span>미리보기 예약번호</span>
              <strong>{record.code}</strong>
            </div>
            {storageError ? (
              <p role="alert">
                브라우저 저장이 제한되어 조회 화면에 보관하지 못했습니다.
              </p>
            ) : (
              <Link className="pill" href="/reservation/lookup/">
                미리보기 예약 조회 →
              </Link>
            )}
            <Link href="/" className="back-link">
              홈으로 돌아가기
            </Link>
          </section>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              next();
            }}
          >
            <div className="booking-columns">
              <div className="booking-form">
                {step === 1 && (
                  <>
                    <Calendar booking={booking} onChange={update} />
                    <section className="panel guest-panel">
                      <div className="minor-heading">
                        <h3>인원 선택</h3>
                        <span>객실은 다음 단계에서 진행됩니다</span>
                      </div>
                      <Counter
                        label="성인"
                        description="만 13세 이상"
                        value={booking.adults}
                        onChange={(v) => update({ adults: v })}
                        min={1}
                        max={6 - booking.children}
                      />
                      <Counter
                        label="아동"
                        description="만 3~12세"
                        value={booking.children}
                        onChange={(v) => update({ children: v })}
                        min={0}
                        max={6 - booking.adults}
                      />
                    </section>
                  </>
                )}
                {step === 2 && (
                  <section className="panel select-room">
                    <h3>객실 선택</h3>
                    <p className="muted">
                      {shortDate(booking.checkin)} →{" "}
                      {shortDate(booking.checkout)} ·{" "}
                      {nightsBetween(booking.checkin, booking.checkout)}박 ·
                      성인 {booking.adults}
                    </p>
                    <p className="selection-note">
                      선택하신 날짜에 예약 가능한 객실만 표시됩니다.
                    </p>
                    <div className="booking-room-grid">
                      {rooms.map((r) => (
                        <label
                          key={r.id}
                          className={`booking-room ${r.available ? "" : "unavailable"} ${booking.room === r.id ? "selected" : ""}`}
                        >
                          <input
                            type="radio"
                            name="room"
                            value={r.id}
                            checked={booking.room === r.id}
                            disabled={!r.available}
                            onChange={() => update({ room: r.id })}
                          />
                          <MediaBlock />
                          <div>
                            <h4>Ocean Suite</h4>
                            <p className="muted">Ocean Suite</p>
                            <strong>{formatPrice(r.price)}</strong>
                            <span> / 1박</span>
                            <small>
                              {r.available ? "예약 가능" : "예약 마감"}
                            </small>
                          </div>
                        </label>
                      ))}
                    </div>
                  </section>
                )}
                {step === 3 && (
                  <>
                    <section className="panel guest-info">
                      <div className="minor-heading">
                        <h3>예약자 정보</h3>
                        <span>* 필수 항목</span>
                      </div>
                      <div className="form-grid">
                        {[
                          [
                            "lastName",
                            "성 · Last Name",
                            "홍",
                            "text",
                            "family-name",
                          ],
                          [
                            "firstName",
                            "이름 · First Name",
                            "길동",
                            "text",
                            "given-name",
                          ],
                          [
                            "email",
                            "이메일 · Email",
                            "abcd@gmail.com",
                            "email",
                            "email",
                          ],
                          [
                            "phone",
                            "연락처 · Phone",
                            "010-0000-0000",
                            "tel",
                            "tel",
                          ],
                        ].map(([key, label, placeholder, type, auto]) => (
                          <label className="field" key={key}>
                            {label}*
                            <input
                              required
                              autoComplete={auto}
                              type={type}
                              placeholder={placeholder}
                              maxLength={key === "phone" ? 20 : 120}
                              value={
                                booking[
                                  key as
                                    "lastName" | "firstName" | "email" | "phone"
                                ]
                              }
                              onChange={(e) =>
                                update({ [key]: e.target.value })
                              }
                              pattern={
                                key === "phone" ? "[+0-9 ()-]{8,20}" : undefined
                              }
                            />
                          </label>
                        ))}
                        <label className="field">
                          국가
                          <select
                            value={booking.country}
                            onChange={(e) =>
                              update({ country: e.target.value })
                            }
                          >
                            {["대한민국", "일본", "미국", "중국", "기타"].map(
                              (x) => (
                                <option key={x}>{x}</option>
                              ),
                            )}
                          </select>
                        </label>
                        <label className="field">
                          예상 도착 시간
                          <select
                            value={booking.arrival}
                            onChange={(e) =>
                              update({ arrival: e.target.value })
                            }
                          >
                            {[
                              "15:00",
                              "16:00",
                              "17:00",
                              "18:00",
                              "19:00",
                              "20:00",
                              "21:00",
                              "22:00 이후",
                            ].map((x) => (
                              <option key={x}>{x}</option>
                            ))}
                          </select>
                          <small>체크인은 15:00부터 가능합니다.</small>
                        </label>
                        <label className="field span-2">
                          특별 요청 사항
                          <textarea
                            placeholder="선택 · 가능한 범위에서 준비하겠습니다."
                            rows={5}
                            maxLength={1000}
                            value={booking.requests}
                            onChange={(e) =>
                              update({ requests: e.target.value })
                            }
                          />
                        </label>
                      </div>
                    </section>
                    <section className="panel terms-panel">
                      <h3>약관 동의</h3>
                      <label className="check-field">
                        <input
                          required
                          type="checkbox"
                          checked={booking.terms}
                          onChange={(e) => update({ terms: e.target.checked })}
                        />
                        <span>
                          [필수] 예약 약관 및 개인정보 처리방침에 동의합니다.
                          <small>
                            미리보기 입력값은 현재 브라우저 탭에서만 사용됩니다.
                          </small>
                        </span>
                      </label>
                      <button
                        type="button"
                        className="text-button"
                        onClick={() => setTermsOpen(!termsOpen)}
                        aria-expanded={termsOpen}
                      >
                        보기
                      </button>
                      {termsOpen && (
                        <p className="terms-text">
                          이 화면은 예약 절차를 확인하는 미리보기입니다. 실제
                          예약 계약이 체결되지 않으며, 입력한
                          이름·연락처·이메일은 외부로 전송되지 않습니다. 결제
                          정보는 수집하지 않습니다. 운영용 약관은 실제 예약
                          서비스 연결 시 제공됩니다.
                        </p>
                      )}
                      <label className="check-field">
                        <input
                          type="checkbox"
                          checked={booking.marketing}
                          onChange={(e) =>
                            update({ marketing: e.target.checked })
                          }
                        />
                        <span>
                          [선택] 마케팅 정보 수신에 동의합니다.
                          <small>
                            시즌 프로모션과 이벤트 안내를 이메일로 받습니다.
                          </small>
                        </span>
                      </label>
                    </section>
                  </>
                )}
                {step === 4 && (
                  <>
                    <section className="panel payment-panel">
                      <h3>결제 방법</h3>
                      <div className="payment-options">
                        {["신용카드", "무통장입금"].map((t) => (
                          <label
                            className={booking.payment === t ? "selected" : ""}
                            key={t}
                          >
                            <input
                              type="radio"
                              name="payment"
                              checked={booking.payment === t}
                              onChange={() => update({ payment: t })}
                            />
                            <span>
                              <strong>{t}</strong>
                              <small>
                                {t === "신용카드"
                                  ? "Visa · Master · Amex"
                                  : "24시간 이내 입금"}
                              </small>
                            </span>
                          </label>
                        ))}
                      </div>
                      {booking.payment === "신용카드" ? (
                        <div className="form-grid card-preview">
                          <label className="field span-2">
                            카드 번호
                            <input
                              disabled
                              placeholder="0000 0000 0000 0000"
                              aria-label="카드 번호 미리보기"
                            />
                          </label>
                          <label className="field">
                            유효기간
                            <input disabled placeholder="MM/YY" />
                          </label>
                          <label className="field">
                            CVC
                            <input disabled placeholder="000" />
                          </label>
                        </div>
                      ) : (
                        <p className="bank-note">
                          미리보기에서는 입금 계좌가 제공되지 않습니다.
                        </p>
                      )}
                      <p className="muted payment-note">
                        실제 결제 수단을 연결하기 전에는 카드 정보를 입력할 수
                        없습니다.
                      </p>
                      <div className="coupon-row">
                        <label className="field">
                          쿠폰 번호
                          <input
                            value={coupon}
                            placeholder="예 : SUMMER25"
                            onChange={(e) => {
                              setCoupon(e.target.value);
                              setDiscount(false);
                              setCouponStatus("");
                            }}
                          />
                        </label>
                        <button
                          className="pill small"
                          type="button"
                          onClick={() => {
                            const ok =
                              coupon.trim().toUpperCase() === "SUMMER25";
                            setDiscount(ok);
                            setCouponStatus(
                              ok
                                ? "미리보기 할인 15%가 적용되었습니다."
                                : "사용할 수 없는 쿠폰입니다.",
                            );
                          }}
                        >
                          적용
                        </button>
                      </div>
                      <p className="coupon-status" aria-live="polite">
                        {couponStatus}
                      </p>
                    </section>
                    <section className="panel final-check">
                      <h3>최종 확인</h3>
                      <dl className="summary-lines">
                        {[
                          ["예약자", booking.lastName + booking.firstName],
                          ["연락처", booking.phone],
                          ["객실", "Ocean Suite · Ocean Front"],
                          [
                            "일정",
                            `${shortDate(booking.checkin)} → ${shortDate(booking.checkout)} · ${nightsBetween(booking.checkin, booking.checkout)}박`,
                          ],
                          [
                            "인원",
                            `성인 ${booking.adults} · 아동 ${booking.children}`,
                          ],
                          ["도착 시간", booking.arrival],
                          ["결제 수단", booking.payment],
                        ].map(([k, v]) => (
                          <div key={k}>
                            <dt>{k}</dt>
                            <dd>{v}</dd>
                          </div>
                        ))}
                      </dl>
                      <p className="cancellation-note">
                        취소 정책: 체크인 3일 전까지 무료 취소 가능 · 이후 첫날
                        숙박료의 100% 부과
                      </p>
                    </section>
                  </>
                )}
                <p role="alert" className="form-error">
                  {error}
                </p>
                <div className="step-actions">
                  {step > 1 && (
                    <button
                      className="secondary"
                      type="button"
                      onClick={() => move(step - 1)}
                    >
                      ← 이전
                    </button>
                  )}
                  <button className="primary" type="submit">
                    {
                      [
                        "다음 → 객실 선택",
                        "다음 → 예약자 정보",
                        "다음 → 결제 확인",
                        "예약 확정하기 →",
                      ][step - 1]
                    }
                  </button>
                </div>
              </div>
              <Summary booking={booking} step={step} discount={discount} />
            </div>
          </form>
        )}
      </div>
    </Shell>
  );
}
export function Lookup() {
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [record, setRecord] = useState<ReservationRecord | null>(null);
  const [error, setError] = useState("");
  const dialog = useRef<HTMLDialogElement>(null);
  const b = record?.booking;
  const close = () => dialog.current?.close();
  const lookup = () => {
    const r = readRecords().find(
      (x) =>
        x.code.toUpperCase() === code.trim().toUpperCase() &&
        (x.booking.lastName + x.booking.firstName).replace(/\s/g, "") ===
          name.replace(/\s/g, "") &&
        (!contact.trim() ||
          x.booking.email.toLowerCase() === contact.trim().toLowerCase() ||
          x.booking.phone.replace(/\D/g, "") === contact.replace(/\D/g, "")),
    );
    if (r) {
      setRecord(r);
      setError("");
    } else
      setError(
        "일치하는 미리보기 예약이 없습니다. 예약번호와 예약자명을 확인해 주세요.",
      );
  };
  return (
    <Shell
      title="예약 조회"
      english="Reservation"
      description="예약번호와 예약자명으로 예약 내역을 확인하세요."
    >
      <div className="container lookup-page">
        <Link href="/reservation/" className="back-link">
          ← 예약 · 조회 선택
        </Link>
        <PreviewNote />
        {!record ? (
          <form
            className="panel lookup-form"
            onSubmit={(e) => {
              e.preventDefault();
              lookup();
            }}
          >
            <div className="lookup-icon">
              <Image
                src="/assets/53-1244-imgGroup276.svg"
                width={58}
                height={58}
                alt=""
              />
            </div>
            <h2>예약 조회하기</h2>
            <label className="field">
              예약번호 · Reservation Code*
              <input
                required
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="DEMO-WS-XXXXXXXX"
              />
              <small>예약 미리보기 완료 화면에서 확인할 수 있습니다.</small>
            </label>
            <label className="field">
              예약자명 · Guest Name*
              <input
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="홍길동"
                autoComplete="name"
              />
              <small>예약 시 입력하신 이름(성+이름)</small>
            </label>
            <label className="field">
              이메일 또는 연락처 (선택)
              <input
                value={contact}
                onChange={(e) => setContact(e.target.value)}
                placeholder="you@example.com 또는 010-0000-0000"
              />
              <small>더 정확한 조회를 위해 입력해 주세요.</small>
            </label>
            <p role="alert" className="form-error">
              {error}
            </p>
            <button className="primary full">예약 내역 조회</button>
            <p className="lookup-help">
              같은 브라우저 탭에서 만든 미리보기 예약을 조회할 수 있습니다.
            </p>
          </form>
        ) : (
          b && (
            <div className="lookup-result">
              <section className="reservation-status">
                <span>
                  {record.status === "confirmed"
                    ? "CONFIRMED · PREVIEW"
                    : "CANCELLED · PREVIEW"}
                </span>
                <h2>
                  {record.status === "confirmed"
                    ? "예약 미리보기 내역입니다."
                    : "미리보기 예약이 취소되었습니다."}
                </h2>
                <p>{record.code}</p>
              </section>
              <div className="lookup-columns">
                <div>
                  <section className="panel lookup-room">
                    <MediaBlock />
                    <div>
                      <span className="eyebrow">ROOM</span>
                      <h3>Ocean Suite</h3>
                      <Tags />
                    </div>
                    <div className="check-dates">
                      <div>
                        <span>CHECK-IN</span>
                        <h3>{shortDate(b.checkin)}</h3>
                        <p>{b.arrival} 도착 예정 · 15:00 이후</p>
                      </div>
                      <div>
                        <span>CHECK-OUT</span>
                        <h3>{shortDate(b.checkout)}</h3>
                        <p>
                          {nightsBetween(b.checkin, b.checkout)}박 · 11:00 이전
                        </p>
                      </div>
                    </div>
                    <dl className="summary-lines">
                      {[
                        ["예약자", b.lastName + b.firstName],
                        ["연락처", b.phone],
                        ["이메일", b.email],
                        ["인원", `성인 ${b.adults} · 아동 ${b.children}`],
                        ["도착 시간", b.arrival],
                        ["결제 수단", b.payment],
                        [
                          "예약 일시",
                          new Date(record.createdAt).toLocaleDateString(
                            "ko-KR",
                          ),
                        ],
                      ].map(([k, v]) => (
                        <div key={k}>
                          <dt>{k}</dt>
                          <dd>{v}</dd>
                        </div>
                      ))}
                    </dl>
                    <div className="lookup-actions">
                      <button
                        type="button"
                        className="secondary"
                        onClick={() => window.print()}
                      >
                        인쇄하기
                      </button>
                      {record.status === "confirmed" && (
                        <button
                          type="button"
                          className="secondary cancel"
                          onClick={() => dialog.current?.showModal()}
                        >
                          예약 취소
                        </button>
                      )}
                    </div>
                  </section>
                  <section className="panel checkin-guide">
                    <span className="eyebrow">CHECK-IN GUIDE</span>
                    <h3>체크인 안내</h3>
                    <dl className="summary-lines">
                      {[
                        ["주소", "강원 양양군 현남면 동산큰길 17-5"],
                        [
                          "체크인",
                          "15:00 이후 · 프론트에서 예약번호를 알려주세요.",
                        ],
                        ["주차", "전용 주차장 무료 · 만차 시 안내"],
                        ["문의", "033-672-0000 · stay@wave-stayg.kr"],
                      ].map(([k, v]) => (
                        <div key={k}>
                          <dt>{k}</dt>
                          <dd>{v}</dd>
                        </div>
                      ))}
                    </dl>
                  </section>
                </div>
                <aside className="panel lookup-payment">
                  <h3>결제 내역</h3>
                  <dl className="summary-lines">
                    <div>
                      <dt>
                        {formatPrice(priceList[b.room])} ×{" "}
                        {nightsBetween(b.checkin, b.checkout)}박
                      </dt>
                      <dd>{formatPrice(totalFor(b).subtotal)}</dd>
                    </div>
                    {record.discounted && (
                      <div>
                        <dt>쿠폰 할인</dt>
                        <dd>−{formatPrice(totalFor(b, true).saving)}</dd>
                      </div>
                    )}
                    <div>
                      <dt>세금 · 봉사료</dt>
                      <dd>{formatPrice(totalFor(b, record.discounted).tax)}</dd>
                    </div>
                    <div className="total">
                      <dt>총액</dt>
                      <dd>{formatPrice(record.total)}</dd>
                    </div>
                  </dl>
                  <p className="preview-note">실제 결제 내역이 아닙니다.</p>
                  <h4>취소 정책</h4>
                  <p>
                    체크인 3일 전까지 무료 취소 가능
                    <br />
                    이후 첫날 숙박료의 100% 부과
                  </p>
                  <button
                    className="primary full"
                    onClick={() => {
                      setRecord(null);
                      setError("");
                    }}
                  >
                    다른 예약 조회하기
                  </button>
                </aside>
              </div>
              <dialog
                ref={dialog}
                className="cancel-dialog"
                onClick={(e) => {
                  if (e.target === e.currentTarget) close();
                }}
              >
                <h2>예약을 취소하시겠어요?</h2>
                <p>{record.code}</p>
                <p>
                  미리보기 예약을 취소합니다.
                  <br />
                  실제 예약이나 결제에는 영향을 주지 않습니다.
                </p>
                <div>
                  <button className="secondary" onClick={close}>
                    돌아가기
                  </button>
                  <button
                    className="primary"
                    onClick={() => {
                      const updated = {
                        ...record,
                        status: "cancelled" as const,
                      };
                      if (saveRecord(updated)) {
                        setRecord(updated);
                        setError("");
                        close();
                      } else {
                        close();
                        setError(
                          "취소 내용을 저장하지 못했습니다. 다시 시도해 주세요.",
                        );
                      }
                    }}
                  >
                    취소하기
                  </button>
                </div>
              </dialog>
              <p className="form-error" role="alert">
                {error}
              </p>
            </div>
          )
        )}
      </div>
    </Shell>
  );
}
