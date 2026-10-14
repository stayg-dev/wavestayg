"use client";

import Image from "next/image";
import Link from "next/link";
import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import { Shell, MediaBlock } from "./shared";
import { NicepayCheckout } from "./nicepay-checkout";
import {
  bookingRequest,
  type Application,
  type BookingQuote,
  type Inventory,
} from "./website-booking";
import {
  paymentRequest,
  paymentStatusLabels,
  type PaymentConfiguration,
  type PaymentState,
  type PreparedPayment,
} from "@/lib/payments";
import { bookingToday, shiftBookingDate } from "@/lib/owner-booking-dates";
import { roomPhotos } from "@/lib/photos";
import { roomTypeLabel } from "@/lib/room-type-labels";
import {
  reservationPrice,
  reservationRoom,
  stayNights,
} from "@/lib/reservation";
import { validISO } from "@/lib/booking";
import type { PublicSales } from "@/lib/website-sales";
import styles from "./general-reservation.module.css";

type Dates = { check_in: string; check_out: string };
type Initial = Dates & { adults: number; room_type: string };
const money = (value: number) => `${value.toLocaleString("ko-KR")}원`;
function displayDate(value: string) {
  return validISO(value)
    ? new Date(`${value}T12:00:00+09:00`).toLocaleDateString("ko-KR", {
        timeZone: "Asia/Seoul",
        month: "long",
        day: "numeric",
        weekday: "short",
      })
    : "날짜를 선택해 주세요";
}
function BackLink() {
  return (
    <Link className={styles.back} href="/reservation/">
      ← 예약 · 조회 선택
    </Link>
  );
}
export function ReservationFrame({
  lookup = false,
  children,
}: {
  lookup?: boolean;
  children: ReactNode;
}) {
  return (
    <Shell
      title={lookup ? "예약 조회" : "예약하기"}
      english={lookup ? "Reservation Lookup" : "Reservation"}
      description={
        lookup
          ? "예약번호와 조회 비밀번호로 예약 및 결제 내역을 확인하세요."
          : "원하는 날짜를 먼저 정하고, 가능한 객실을 골라 예약합니다."
      }
    >
      <div className={`container ${styles.page}`}>
        <BackLink />
        {children}
      </div>
    </Shell>
  );
}
export function ReservationSteps({ step }: { step: number }) {
  return (
    <ol className={styles.steps} aria-label="예약 진행 단계">
      {["날짜 · 인원", "객실 선택", "예약자 정보", "결제 · 확인"].map(
        (label, i) => (
          <li key={label} aria-current={step === i + 1 ? "step" : undefined}>
            <span className={styles.stepNumber}>
              <Image
                src={`/assets/reservation/step-${step === i + 1 ? "active" : "idle"}.svg`}
                width={37}
                height={37}
                alt=""
              />
              <span>{i + 1}</span>
            </span>
            <b>{label}</b>
          </li>
        ),
      )}
    </ol>
  );
}
function Counter({
  label,
  help,
  value,
  min = 0,
  max,
  onChange,
}: {
  label: string;
  help: string;
  value: number;
  min?: number;
  max: number;
  onChange: (value: number) => void;
}) {
  return (
    <div className={styles.counter}>
      <div>
        <strong>{label}</strong>
        <small>{help}</small>
      </div>
      <div>
        <button
          type="button"
          aria-label={`${label} 줄이기`}
          disabled={value <= min}
          onClick={() => onChange(value - 1)}
        >
          −
        </button>
        <output aria-label={`${label} 인원`} aria-live="polite">
          {value}
        </output>
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
function Calendar({
  dates,
  onChange,
  today,
}: {
  dates: Dates;
  onChange: (dates: Dates) => void;
  today: string;
}) {
  const [month, setMonth] = useState(() =>
    (validISO(dates.check_in) ? dates.check_in : today).slice(0, 7),
  );
  const [picking, setPicking] = useState<"check_in" | "check_out">("check_in");
  function choose(value: string) {
    if (picking === "check_in" || !dates.check_in || value <= dates.check_in) {
      onChange({ check_in: value, check_out: "" });
      setPicking("check_out");
    } else {
      onChange({ ...dates, check_out: value });
      setPicking("check_in");
    }
  }
  function move(offset: number) {
    const date = new Date(`${month}-01T12:00:00Z`);
    date.setUTCMonth(date.getUTCMonth() + offset);
    setMonth(date.toISOString().slice(0, 7));
  }
  return (
    <section className={styles.panel}>
      <div className={styles.heading}>
        <h2>날짜 선택</h2>
        <small>
          {picking === "check_in" ? "체크인 선택" : "체크아웃 선택"}
        </small>
      </div>
      <div className={styles.dateFields}>
        {(["check_in", "check_out"] as const).map((key, i) => (
          <label key={key} className={picking === key ? styles.dateActive : ""}>
            <span>{i ? "체크아웃" : "체크인"}</span>
            <input
              aria-label={i ? "체크아웃" : "체크인"}
              type="date"
              value={dates[key]}
              min={
                i && dates.check_in
                  ? shiftBookingDate(dates.check_in, 1)
                  : today
              }
              onFocus={() => setPicking(key)}
              onChange={(event) => {
                const value = event.target.value;
                onChange(
                  key === "check_in"
                    ? {
                        check_in: value,
                        check_out:
                          dates.check_out > value ? dates.check_out : "",
                      }
                    : { ...dates, check_out: value },
                );
                if (validISO(value)) setMonth(value.slice(0, 7));
              }}
            />
            <small>{i ? "11:00 이전" : "15:00 이후"}</small>
          </label>
        ))}
      </div>
      <div className={styles.calendar}>
        <div className={styles.monthNav}>
          <button
            type="button"
            aria-label="이전 달"
            disabled={month <= today.slice(0, 7)}
            onClick={() => move(-1)}
          >
            ‹
          </button>
          <span>체크인과 체크아웃 날짜를 선택하세요.</span>
          <button type="button" aria-label="다음 달" onClick={() => move(1)}>
            ›
          </button>
        </div>
        <div className={styles.months}>
          {[0, 1].map((offset) => {
            const date = new Date(`${month}-01T12:00:00Z`);
            date.setUTCMonth(date.getUTCMonth() + offset);
            const year = date.getUTCFullYear(),
              m = date.getUTCMonth(),
              first = date.getUTCDay(),
              count = new Date(Date.UTC(year, m + 1, 0)).getUTCDate();
            return (
              <div key={offset}>
                <h3>
                  {year}년 {m + 1}월
                </h3>
                <div className={styles.days}>
                  {["일", "월", "화", "수", "목", "금", "토"].map((day) => (
                    <span key={day}>{day}</span>
                  ))}
                  {Array.from({ length: first }, (_, i) => (
                    <span key={`blank-${i}`} />
                  ))}
                  {Array.from({ length: count }, (_, i) => {
                    const value = `${year}-${String(m + 1).padStart(2, "0")}-${String(i + 1).padStart(2, "0")}`;
                    const selected =
                      value === dates.check_in || value === dates.check_out;
                    return (
                      <button
                        key={value}
                        type="button"
                        disabled={value < today}
                        aria-label={`${year}년 ${m + 1}월 ${i + 1}일`}
                        aria-pressed={selected}
                        className={
                          selected
                            ? styles.selectedDay
                            : value > dates.check_in && value < dates.check_out
                              ? styles.rangeDay
                              : ""
                        }
                        onClick={() => choose(value)}
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
      </div>
      <p className={styles.legend}>
        <span /> 선택한 날짜 <i /> 숙박 기간
      </p>
    </section>
  );
}
function PriceDetails({ quote }: { quote: BookingQuote }) {
  return (
    <dl className={styles.details}>
      <div>
        <dt>객실료</dt>
        <dd>{money(quote.room_amount)}</dd>
      </div>
      <div>
        <dt>인원 추가</dt>
        <dd>{money(quote.guest_fee)}</dd>
      </div>
      <div>
        <dt>추가 침구</dt>
        <dd>{money(quote.bedding_fee)}</dd>
      </div>
      <div className={styles.total}>
        <dt>총액</dt>
        <dd>{money(quote.total)}</dd>
      </div>
    </dl>
  );
}
function Summary({
  dates,
  adults,
  childrenCount,
  type,
  quote,
  step,
  policy,
}: {
  dates: Dates;
  adults: number;
  childrenCount: number;
  type: string;
  quote: BookingQuote | null;
  step: number;
  policy?: string;
}) {
  const room = reservationRoom(type);
  return (
    <aside className={styles.summary} aria-label="예약 요약">
      <div className={styles.heading}>
        <h2>예약 요약</h2>
        <span className={styles.badge}>
          Step {step} · {["날짜", "객실", "정보", "결제"][step - 1]}
        </span>
      </div>
      {step > 1 && type && (
        <>
          <div className={styles.summaryPhoto}>
            <MediaBlock photo={room ? roomPhotos[room.id]?.[0] : undefined} />
          </div>
          <h3>{room?.name ?? roomTypeLabel(type)}</h3>
          <p className={styles.muted}>{roomTypeLabel(type)}</p>
        </>
      )}
      <dl className={styles.details}>
        <div>
          <dt>체크인</dt>
          <dd>
            {displayDate(dates.check_in)}
            <small>15:00 이후</small>
          </dd>
        </div>
        <div>
          <dt>체크아웃</dt>
          <dd>
            {displayDate(dates.check_out)}
            <small>11:00 이전</small>
          </dd>
        </div>
        <div>
          <dt>숙박</dt>
          <dd>{stayNights(dates.check_in, dates.check_out) || "—"}박 · 1실</dd>
        </div>
        <div>
          <dt>인원</dt>
          <dd>
            8세 이상 {adults}명
            {childrenCount > 0 && ` · 1~7세 ${childrenCount}명`}
          </dd>
        </div>
      </dl>
      {quote ? (
        <PriceDetails quote={quote} />
      ) : (
        <p className={styles.hint}>
          {step === 1
            ? "다음 단계에서 선택한 날짜의 객실과 요금을 확인합니다."
            : "객실을 선택한 후 추가 비용을 포함한 최종 요금을 확인합니다."}
        </p>
      )}
      {policy && (
        <details className={styles.policy}>
          <summary>취소·환불 규정</summary>
          <p>{policy}</p>
        </details>
      )}
    </aside>
  );
}

export function GeneralReservation({
  initial,
  today,
}: {
  initial: Initial;
  today: string;
}) {
  const [step, setStep] = useState(1),
    [dates, setDates] = useState<Dates>({
      check_in: initial.check_in,
      check_out: initial.check_out,
    });
  const [adults, setAdults] = useState(initial.adults),
    [childrenCount, setChildrenCount] = useState(0),
    [bedding, setBedding] = useState(0);
  const [type, setType] = useState(initial.room_type),
    [inventory, setInventory] = useState<Inventory[]>([]),
    [sales, setSales] = useState<PublicSales | null>(null);
  const [quote, setQuote] = useState<BookingQuote | null>(null),
    [config, setConfig] = useState<PaymentConfiguration | null>(null);
  const [guest, setGuest] = useState({
    booker_name: "",
    booker_phone: "",
    guest_name: "",
    phone: "",
    password: "",
    note: "",
  });
  const [sameGuest, setSameGuest] = useState(true),
    [terms, setTerms] = useState(false),
    [paymentTerms, setPaymentTerms] = useState(false);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [configError, setConfigError] = useState("");
  const [prepared, setPrepared] = useState<PreparedPayment | null>(null),
    [row, setRow] = useState<Application | null>(null);
  const requestId = useRef(""),
    anchor = useRef<HTMLDivElement>(null),
    submitting = useRef(false);
  useEffect(() => {
    let active = true;
    paymentRequest<PaymentConfiguration>("config")
      .then((value) => {
        if (active) setConfig(value);
      })
      .catch((e: Error) => {
        if (active) setConfigError(e.message);
      });
    return () => {
      active = false;
    };
  }, []);
  function go(next: number) {
    setStep(next);
    if (next < 4) setPaymentTerms(false);
    setError("");
    requestAnimationFrame(() => {
      anchor.current?.scrollIntoView({ block: "start", behavior: "smooth" });
      anchor.current?.focus({ preventScroll: true });
    });
  }
  const nights = stayNights(dates.check_in, dates.check_out);
  function isAvailable(item: Inventory, prices = sales) {
    const room = reservationRoom(item.name);
    return (
      item.available > 0 &&
      (item.name !== '테스트타입' || (nights === 1 && adults + childrenCount <= 2 && bedding === 0)) &&
      item.is_open !== false &&
      !!reservationPrice(prices, item.name, dates.check_in, dates.check_out) &&
      (!room || adults + childrenCount <= room.maxOccupancy)
    );
  }
  async function checkRooms() {
    if (
      !validISO(dates.check_in) ||
      !validISO(dates.check_out) ||
      dates.check_in < bookingToday() ||
      nights < 1 ||
      nights > 30
    ) {
      setError("오늘 이후의 체크인 날짜와 1~30박의 숙박 기간을 선택해 주세요.");
      return;
    }
    setBusy(true);
    setError("");
    setQuote(null);
    try {
      const [rows, prices] = await Promise.all([
        bookingRequest<Inventory[]>(`inventory?${new URLSearchParams(dates)}`),
        bookingRequest<PublicSales>(
          `sales?${new URLSearchParams({ from: dates.check_in, to: shiftBookingDate(dates.check_out, -1) })}`,
        ),
      ]);
      setInventory(rows);
      setSales(prices);
      setType(
        rows.find(
          (item) =>
            (item.name === type || roomTypeLabel(item.name) === type) &&
            isAvailable(item, prices),
        )?.name ??
          rows.find((item) => isAvailable(item, prices))?.name ??
          "",
      );
      go(2);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const quoteInput = {
    ...dates,
    room_type_name: type,
    room_count: 1,
    adults,
    children: childrenCount,
    extra_bedding: bedding,
  };
  async function confirmRoom() {
    setBusy(true);
    setError("");
    setQuote(null);
    try {
      setQuote(await bookingRequest<BookingQuote>("quote", "POST", quoteInput));
      go(3);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function submit() {
    if (
      submitting.current ||
      !quote ||
      !config ||
      (config.enabled && (!config.ready || !paymentTerms)) ||
      !terms
    )
      return;
    submitting.current = true;
    setBusy(true);
    setError("");
    requestId.current ||= crypto.randomUUID();
    try {
      const input = {
        ...quoteInput,
        ...guest,
        ...(sameGuest
          ? { guest_name: guest.booker_name, phone: guest.booker_phone }
          : {}),
        id: requestId.current,
        pricing_revision: quote.pricing_revision,
        guest_count: adults + childrenCount,
        terms,
      };
      if (config.enabled)
        setPrepared(
          await paymentRequest<PreparedPayment>("prepare", {
            ...input,
            policy_version: config.policy_version,
            payment_terms: paymentTerms,
          }),
        );
      else
        setRow(
          await bookingRequest<Application>("applications", "POST", input),
        );
    } catch (e) {
      setError(
        `${(e as Error).message} 결과가 불분명하면 예약번호 ${requestId.current}로 먼저 조회해 주세요.`,
      );
    } finally {
      setBusy(false);
      submitting.current = false;
    }
  }
  function guestField(
    key: keyof typeof guest,
    label: string,
    inputType = "text",
  ) {
    return (
      <label>
        {label}
        <input
          name={key}
          type={inputType}
          required
          maxLength={
            key === "password"
              ? 72
              : key.includes("phone") || key === "phone"
                ? 30
                : 100
          }
          minLength={key === "password" ? 8 : undefined}
          autoComplete={
            key === "password"
              ? "new-password"
              : key.includes("phone") || key === "phone"
                ? "tel"
                : "name"
          }
          value={guest[key]}
          onChange={(e) => setGuest({ ...guest, [key]: e.target.value })}
        />
      </label>
    );
  }
  return (
    <ReservationFrame>
      <div ref={anchor} tabIndex={-1} className={styles.stage}>
        <ReservationSteps step={step} />
        {row ? (
          <>
            <p className={styles.notice} role="status">
              예약이 접수되었습니다. 호텔 확인 후 확정 알림톡을 발송합니다.
              예약번호를 보관해 주세요.
            </p>
            <ReservationDetails row={row} />
          </>
        ) : (
          <div className={styles.columns}>
            <div className={styles.mainColumn}>
              {prepared ? (
                <div className={styles.checkout}>
                  <NicepayCheckout prepared={prepared} />
                </div>
              ) : (
                <fieldset className={styles.fieldset} disabled={busy}>
                  {step === 1 && (
                    <>
                      <Calendar
                        dates={dates}
                        today={today}
                        onChange={(value) => {
                          setDates(value);
                          setQuote(null);
                        }}
                      />
                      <section className={styles.panel}>
                        <div className={styles.heading}>
                          <h2>인원 선택</h2>
                          <small>객실은 다음 단계에서 선택합니다.</small>
                        </div>
                        <div className={styles.guestCounters}>
                          <Counter
                            label="성인"
                            help="8세 이상"
                            value={adults}
                            min={1}
                            max={4}
                            onChange={(value) => {
                              setAdults(value);
                              setQuote(null);
                            }}
                          />
                          <Counter
                            label="아동"
                            help="1~7세"
                            value={childrenCount}
                            max={3}
                            onChange={(value) => {
                              setChildrenCount(value);
                              setQuote(null);
                            }}
                          />
                        </div>
                      </section>
                      <button
                        className={styles.primary}
                        type="button"
                        onClick={checkRooms}
                      >
                        {busy ? "객실 확인 중…" : "다음 → 객실 선택"}
                      </button>
                    </>
                  )}
                  {step === 2 && (
                    <>
                      <section className={styles.panel}>
                        <div className={styles.heading}>
                          <h2>객실 선택</h2>
                          <small>
                            {nights}박 · {adults + childrenCount}명 · 1실
                          </small>
                        </div>
                        <p className={styles.muted}>
                          선택하신 날짜와 인원에 맞는 객실을 선택해 주세요.
                        </p>
                        <div
                          className={styles.roomList}
                          role="radiogroup"
                          aria-label="희망 객실 타입"
                        >
                          {inventory.map((item) => {
                            const room = reservationRoom(item.name),
                              price = reservationPrice(
                                sales,
                                item.name,
                                dates.check_in,
                                dates.check_out,
                              ),
                              available = isAvailable(item);
                            return (
                              <label
                                key={item.name}
                                className={`${styles.room} ${type === item.name ? styles.roomSelected : ""} ${!available ? styles.unavailable : ""}`}
                              >
                                <input
                                  type="radio"
                                  name="room_type"
                                  value={item.name}
                                  checked={type === item.name}
                                  disabled={!available}
                                  onChange={() => {
                                    setType(item.name);
                                    setQuote(null);
                                  }}
                                />
                                <div className={styles.roomPhoto}>
                                  <MediaBlock
                                    photo={
                                      room
                                        ? roomPhotos[room.id]?.[0]
                                        : undefined
                                    }
                                  />
                                </div>
                                <span className={styles.roomName}>
                                  <strong>
                                    {room?.name ?? roomTypeLabel(item.name)}
                                  </strong>
                                  <small>{roomTypeLabel(item.name)} · 잔여 {item.available}실{item.name === '테스트타입' ? ' · 1박·최대 2명·추가 침구 없음' : ''}</small>
                                </span>
                                <span
                                  className={`${styles.availability} ${available ? styles.open : ""}`}
                                >
                                  {available
                                    ? "예약 가능"
                                    : item.is_open === false ? "판매 불가" : room &&
                                        adults + childrenCount >
                                          room.maxOccupancy
                                      ? "인원 초과"
                                      : item.available < 1 ? "예약 마감" : "요금 확인 필요"}
                                </span>
                                <span className={styles.roomPrice}>
                                  {price ? (
                                    <>
                                      {price.discount > 0 && (
                                        <del>{money(price.base)}</del>
                                      )}
                                      <strong>{money(price.total)}</strong>
                                      <small>{nights}박 객실료</small>
                                    </>
                                  ) : (
                                    <small>예약 불가</small>
                                  )}
                                </span>
                              </label>
                            );
                          })}
                        </div>
                        {!inventory.some((item) => isAvailable(item)) && (
                          <p className={styles.hint}>
                            {sales?.message ||
                              "선택하신 일정과 인원으로 예약 가능한 객실이 없습니다. 날짜나 인원을 변경해 주세요."}
                          </p>
                        )}
                      </section>
                      <section className={styles.panel}>
                        <Counter
                          label="추가 침구"
                          help="세트 · 최종 요금에 포함"
                          value={bedding}
                          max={6}
                          onChange={(value) => {
                            setBedding(value);
                            setQuote(null);
                          }}
                        />
                      </section>
                      <div className={styles.actions}>
                        <button
                          type="button"
                          className={styles.secondary}
                          onClick={() => go(1)}
                        >
                          ← 이전
                        </button>
                        <button
                          className={styles.primary}
                          type="button"
                          disabled={
                            !inventory.some(
                              (item) => item.name === type && isAvailable(item),
                            )
                          }
                          onClick={confirmRoom}
                        >
                          {busy ? "요금 확인 중…" : "다음 → 예약자 정보"}
                        </button>
                      </div>
                    </>
                  )}
                  {step === 3 && (
                    <form
                      onSubmit={(event) => {
                        event.preventDefault();
                        go(4);
                      }}
                    >
                      <section className={styles.panel}>
                        <div className={styles.heading}>
                          <h2>예약자 정보</h2>
                          <small>* 필수 입력</small>
                        </div>
                        <div className={styles.formGrid}>
                          {guestField("booker_name", "예약자 이름")}
                          {guestField(
                            "booker_phone",
                            "예약자 연락처 · 알림톡 수신",
                            "tel",
                          )}
                        </div>
                        <label className={styles.check}>
                          <input
                            type="checkbox"
                            checked={sameGuest}
                            onChange={(e) => setSameGuest(e.target.checked)}
                          />
                          예약자와 실제 투숙객이 같습니다.
                        </label>
                        {!sameGuest && (
                          <div className={styles.formGrid}>
                            {guestField("guest_name", "실제 투숙객 이름")}
                            {guestField("phone", "투숙객 연락처", "tel")}
                          </div>
                        )}
                        {guestField("password", "조회 비밀번호", "password")}
                        <p className={styles.muted}>
                          8~72자로 설정해 주세요. 예약번호와 함께 예약 조회에
                          사용합니다.
                        </p>
                        <label>
                          요청사항
                          <textarea
                            name="note"
                            rows={4}
                            maxLength={700}
                            value={guest.note}
                            onChange={(e) =>
                              setGuest({ ...guest, note: e.target.value })
                            }
                            placeholder="숙소에 전달할 내용을 남겨주세요."
                          />
                        </label>
                        <small className={styles.muted}>
                          요청사항은 숙소 사정에 따라 제공 여부가 달라질 수
                          있습니다.
                        </small>
                      </section>
                      <section className={styles.panel}>
                        <h2>약관 동의</h2>
                        <label className={styles.check}>
                          <input
                            name="terms"
                            type="checkbox"
                            required
                            checked={terms}
                            onChange={(e) => setTerms(e.target.checked)}
                          />
                          <span>
                            [필수] 예약 처리를 위한 이름·연락처 수집 및 이용
                            조건에 동의합니다.
                            <small>
                              예약 접수와 안내를 위해 입력하신 정보를
                              사용합니다.
                            </small>
                          </span>
                        </label>
                      </section>
                      <div className={styles.actions}>
                        <button
                          className={styles.secondary}
                          type="button"
                          onClick={() => go(2)}
                        >
                          ← 이전
                        </button>
                        <button className={styles.primary} type="submit">
                          다음 → 결제 확인
                        </button>
                      </div>
                    </form>
                  )}
                  {step === 4 && (
                    <>
                      <section className={styles.panel}>
                        <h2>결제 방법</h2>
                        <div className={styles.method}>
                          <span aria-hidden="true">●</span>
                          <div>
                            <strong>
                              {config?.enabled
                                ? "신용카드"
                                : config
                                  ? "현장 정산"
                                  : "결제 방법 확인 중…"}
                            </strong>
                            <small>
                              {config?.enabled
                                ? "NICEPAY의 안전한 결제창에서 결제합니다."
                                : "예약 내용을 확인한 후 접수해 주세요."}
                            </small>
                          </div>
                        </div>
                      </section>
                      <section className={styles.panel}>
                        <h2>최종 확인</h2>
                        <dl className={`${styles.details} ${styles.review}`}>
                          <div>
                            <dt>예약자</dt>
                            <dd>{guest.booker_name}</dd>
                          </div>
                          <div>
                            <dt>연락처</dt>
                            <dd>{guest.booker_phone}</dd>
                          </div>
                          <div>
                            <dt>투숙객</dt>
                            <dd>
                              {sameGuest ? guest.booker_name : guest.guest_name}
                            </dd>
                          </div>
                          <div>
                            <dt>객실</dt>
                            <dd>{roomTypeLabel(type)}</dd>
                          </div>
                          <div>
                            <dt>일정</dt>
                            <dd>
                              {displayDate(dates.check_in)} →{" "}
                              {displayDate(dates.check_out)}
                            </dd>
                          </div>
                          <div>
                            <dt>인원</dt>
                            <dd>
                              {adults + childrenCount}명 · 추가 침구 {bedding}
                              세트
                            </dd>
                          </div>
                        </dl>
                        {quote && <PriceDetails quote={quote} />}
                        {config?.enabled && (
                          <>
                            <details className={styles.policy} open>
                              <summary>결제·취소 규정</summary>
                              <p>{config.policy_text}</p>
                            </details>
                            <label className={styles.check}>
                              <input
                                name="payment_terms"
                                type="checkbox"
                                checked={paymentTerms}
                                onChange={(e) =>
                                  setPaymentTerms(e.target.checked)
                                }
                              />
                              결제 금액과 취소·환불 규정을 확인하고 동의합니다.
                            </label>
                          </>
                        )}
                        <p className={styles.hint}>
                          호텔에서 접수 내용을 확인한 후 예약자에게 확정
                          알림톡을 발송합니다.
                        </p>
                      </section>
                      <div className={styles.actions}>
                        <button
                          type="button"
                          className={styles.secondary}
                          onClick={() => go(3)}
                        >
                          ← 이전
                        </button>
                        <button
                          type="button"
                          className={styles.primary}
                          disabled={
                            !config ||
                            (config.enabled && (!config.ready || !paymentTerms))
                          }
                          onClick={submit}
                        >
                          {busy
                            ? "처리 중…"
                            : config?.enabled
                              ? "카드 결제 준비"
                              : "예약 신청"}
                        </button>
                      </div>
                      {config?.enabled && !config.ready && (
                        <p className={styles.hint}>
                          온라인 결제 준비 중입니다. 프런트에 문의해 주세요.
                        </p>
                      )}
                    </>
                  )}
                </fieldset>
              )}
              {(error || configError) && (
                <p className={styles.error} role="alert">
                  {error || configError}
                </p>
              )}
            </div>
            <Summary
              dates={dates}
              adults={adults}
              childrenCount={childrenCount}
              type={type}
              quote={quote}
              step={step}
              policy={config?.policy_text}
            />
          </div>
        )}
      </div>
    </ReservationFrame>
  );
}

function ReservationDetails({
  row,
  payment,
  paymentError,
  onReset,
}: {
  row: Application;
  payment?: PaymentState | null;
  paymentError?: string;
  onReset?: () => void;
}) {
  const room = reservationRoom(row.room_type_name);
  const label =
    row.status === "cancelled"
      ? "취소된 예약입니다."
      : row.status === "rejected"
        ? "예약이 반려되었습니다."
        : row.status === "payment_pending"
          ? "결제 결과를 확인하고 있습니다."
          : "예약이 접수되었습니다.";
  return (
    <div className={`${styles.columns} ${styles.resultColumns}`}>
      <div>
        <div
          className={`${styles.status} ${["cancelled", "rejected"].includes(row.status) ? styles.closedStatus : ""}`}
          role="status"
        >
          <div className={styles.statusTitle}>
            {["registered", "approved"].includes(row.status) && (
              <span className={styles.statusIcon} aria-hidden="true">
                <Image
                  src="/assets/reservation/status-circle.svg"
                  width={47}
                  height={47}
                  alt=""
                />
                <Image
                  src="/assets/reservation/status-check.svg"
                  width={22}
                  height={15}
                  alt=""
                />
              </span>
            )}
            <div>
              <small>RESERVATION</small>
              <strong>{label}</strong>
            </div>
          </div>
          <span>{row.id}</span>
        </div>
        <article className={styles.reservationCard}>
          <div className={styles.resultPhoto}>
            <MediaBlock photo={room ? roomPhotos[room.id]?.[0] : undefined} />
            <div>
              <small>ROOM</small>
              <h2>{room?.name ?? roomTypeLabel(row.room_type_name)}</h2>
              <p>
                {roomTypeLabel(row.room_type_name)} · {row.room_count}실
              </p>
            </div>
          </div>
          <div className={styles.resultBody}>
            <div className={styles.stayDates}>
              <div>
                <small>CHECK-IN</small>
                <strong>{displayDate(row.check_in)}</strong>
                <small>15:00 이후</small>
              </div>
              <div>
                <small>CHECK-OUT</small>
                <strong>{displayDate(row.check_out)}</strong>
                <small>11:00 이전</small>
              </div>
            </div>
            <dl className={styles.details}>
              <div>
                <dt>예약자</dt>
                <dd>{row.booker_name || row.guest_name}</dd>
              </div>
              <div>
                <dt>예약자 연락처</dt>
                <dd>{row.booker_phone || row.phone}</dd>
              </div>
              <div>
                <dt>투숙객</dt>
                <dd>{row.guest_name}</dd>
              </div>
              <div>
                <dt>투숙객 연락처</dt>
                <dd>{row.phone}</dd>
              </div>
              <div>
                <dt>인원</dt>
                <dd>{row.guest_count}명</dd>
              </div>
              <div>
                <dt>결제 수단</dt>
                <dd>
                  {row.payment_order_id ? "온라인 카드 결제" : "현장 정산"}
                </dd>
              </div>
            </dl>
            {row.note && <p className={styles.hint}>요청사항: {row.note}</p>}
            {row.admin_note && (
              <p className={styles.hint}>호텔 안내: {row.admin_note}</p>
            )}
            <div className={styles.resultActions}>
              <button
                className={styles.secondary}
                type="button"
                onClick={() => window.print()}
              >
                <Image
                  src="/assets/reservation/print.svg"
                  width={22}
                  height={22}
                  alt=""
                />
                인쇄하기
              </button>
              <a className={styles.secondary} href="tel:01080640076">
                <Image
                  src="/assets/reservation/cancel.svg"
                  width={20}
                  height={22}
                  alt=""
                />
                변경·취소 문의
              </a>
            </div>
          </div>
        </article>
        <section className={`${styles.panel} ${styles.checkinGuide}`}>
          <small>CHECK-IN GUIDE</small>
          <h2>체크인 안내</h2>
          <dl className={styles.details}>
            <div>
              <dt>주소</dt>
              <dd>강원 양양군 현남면 동산큰길 17-5</dd>
            </div>
            <div>
              <dt>체크인</dt>
              <dd>15:00 이후 · 프런트에서 예약번호를 알려주세요.</dd>
            </div>
            <div>
              <dt>문의</dt>
              <dd>
                <a href="tel:01080640076">010-8064-0076</a>
              </dd>
            </div>
          </dl>
        </section>
      </div>
      <aside className={styles.summary}>
        <h2>결제 내역</h2>
        {row.pricing ? (
          <PriceDetails quote={row.pricing} />
        ) : (
          <dl className={styles.details}>
            <div className={styles.total}>
              <dt>예약 금액</dt>
              <dd>{money(row.quoted_amount)}</dd>
            </div>
          </dl>
        )}
        {payment && (
          <dl className={styles.details}>
            <div>
              <dt>결제 상태</dt>
              <dd>
                {paymentStatusLabels[payment.status] ?? "결제 상태 확인 필요"}
              </dd>
            </div>
            <div>
              <dt>결제 요청 금액</dt>
              <dd>{money(payment.amount)}</dd>
            </div>
            {payment.refunded_amount > 0 && (
              <div>
                <dt>환불 금액</dt>
                <dd>{money(payment.refunded_amount)}</dd>
              </div>
            )}
          </dl>
        )}
        {paymentError && (
          <p className={styles.error} role="alert">
            {paymentError}
          </p>
        )}
        {row.payment_order_id && (
          <Link
            className={styles.primary}
            href={`/reservation/payment/?order=${row.payment_order_id}`}
          >
            결제·환불 상태 확인
          </Link>
        )}
        <p className={styles.hint}>
          예약 확정 여부는 호텔의 확정 알림톡을 확인해 주세요. 일정 변경 및
          취소·환불은 프런트로 문의해 주세요.
        </p>
        {onReset ? (
          <button type="button" className={styles.secondary} onClick={onReset}>
            다른 예약 조회하기
          </button>
        ) : (
          <Link
            className={styles.secondary}
            href={`/reservation/lookup/?id=${row.id}`}
          >
            예약 조회하기
          </Link>
        )}
      </aside>
    </div>
  );
}

export function ReservationLookup({ lookupId = "" }: { lookupId?: string }) {
  const [row, setRow] = useState<Application | null>(null),
    [payment, setPayment] = useState<PaymentState | null>(null);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [paymentError, setPaymentError] = useState("");
  async function find(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setPaymentError("");
    setRow(null);
    setPayment(null);
    const input = Object.fromEntries(new FormData(event.currentTarget));
    try {
      const application = await bookingRequest<Application>(
        "lookup",
        "POST",
        input,
      );
      if (application.payment_order_id) {
        try {
          await paymentRequest("lookup", input);
          setPayment(
            await paymentRequest<PaymentState>(
              `${application.payment_order_id}/status`,
            ),
          );
        } catch {
          setPaymentError(
            "결제 상태를 불러오지 못했습니다. 잠시 후 다시 조회해 주세요.",
          );
        }
      }
      setRow(application);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <ReservationFrame lookup>
      {row ? (
        <ReservationDetails
          row={row}
          payment={payment}
          paymentError={paymentError}
          onReset={() => {
            setRow(null);
            setPayment(null);
            setError("");
          }}
        />
      ) : (
        <form className={styles.lookup} onSubmit={find}>
          <div className={styles.lookupHeading}>
            <span>
              <Image
                src="/assets/reservation/search.svg"
                width={48.6467}
                height={47.2162}
                alt=""
              />
            </span>
            <div>
              <h2>예약 내역 조회</h2>
              <p>예약 접수 시 발급된 예약번호와 비밀번호를 입력해 주세요.</p>
            </div>
          </div>
          <fieldset className={styles.fieldset} disabled={busy}>
            <label>
              예약번호 · Reservation Code
              <input
                name="id"
                defaultValue={lookupId}
                required
                maxLength={36}
                autoComplete="off"
                placeholder="접수 시 발급된 예약번호"
              />
            </label>
            <p className={styles.muted}>
              예약 접수 화면에서 안내된 번호를 입력해 주세요.
            </p>
            <label>
              조회 비밀번호
              <input
                name="password"
                required
                type="password"
                minLength={8}
                maxLength={72}
                autoComplete="current-password"
                placeholder="예약 시 설정한 비밀번호"
              />
            </label>
            <p className={styles.muted}>
              비밀번호를 잊으셨다면 프런트로 문의해 주세요.
            </p>
            <button className={styles.primary} type="submit">
              {busy ? "조회 중…" : "예약 조회하기"}
            </button>
          </fieldset>
          {error && (
            <p className={styles.error} role="alert">
              {error}
            </p>
          )}
          <p className={styles.lookupHelp}>
            예약 문의 <a href="tel:01080640076">010-8064-0076</a>
          </p>
        </form>
      )}
    </ReservationFrame>
  );
}
