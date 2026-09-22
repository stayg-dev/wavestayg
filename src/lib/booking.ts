import { rooms } from "./rooms.ts";
import { holidayCalendarStart, holidayCalendarEnd, publicHolidays } from "./holidays.ts";

export const serviceRates = { extraGuest: 22000, bedding: 22000, extraHour: 11000 };
export const rateLabels = { weekday: "일~목요일", friday: "금요일", peak: "토요일·공휴일 전일" };
export type RateType = keyof typeof rateLabels;
export type NightlyRate = { date: string; type: RateType; amount: number };
export type BookingQuote = {
  nightly: NightlyRate[];
  subtotal: number;
  extraGuests: number;
  guestFee: number;
  beddingSets: number;
  beddingFee: number;
  total: number;
};

export type Booking = {
  checkin: string;
  checkout: string;
  adults: number;
  children: number;
  extraBedding: number;
  room: number;
  lastName: string;
  firstName: string;
  email: string;
  phone: string;
  country: string;
  arrival: string;
  requests: string;
  terms: boolean;
  marketing: boolean;
  payment: string;
};
export type ReservationRecord = {
  code: string;
  booking: Booking;
  status: "confirmed" | "cancelled";
  total: number;
  quote: BookingQuote;
  createdAt: string;
};
export const initialBooking: Booking = {
  checkin: "2026-09-20",
  checkout: "2026-09-22",
  adults: 2,
  children: 0,
  extraBedding: 0,
  room: 1,
  lastName: "",
  firstName: "",
  email: "",
  phone: "",
  country: "대한민국",
  arrival: "15:00",
  requests: "",
  terms: false,
  marketing: false,
  payment: "신용카드",
};
export function dateISO(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
export function addDays(value: string, days: number) {
  const d = new Date(value + "T12:00:00");
  d.setDate(d.getDate() + days);
  return dateISO(d);
}
export function validISO(value: string) {
  return (
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    !Number.isNaN(Date.parse(value)) &&
    new Date(value).toISOString().slice(0, 10) === value
  );
}
export function nightsBetween(start: string, end: string) {
  if (!validISO(start) || !validISO(end)) return 0;
  return Math.max(
    0,
    Math.round((Date.parse(end) - Date.parse(start)) / 86400000),
  );
}
export function rateTypeFor(date: string): RateType {
  if (!validISO(date) || date < holidayCalendarStart || date > holidayCalendarEnd)
    throw new RangeError("공휴일 요금 확인이 필요한 날짜입니다.");
  const weekday = new Date(date + "T12:00:00Z").getUTCDay();
  if (weekday === 6 || publicHolidays.has(addDays(date, 1))) return "peak";
  return weekday === 5 ? "friday" : "weekday";
}
export function totalFor(booking: Booking): BookingQuote {
  const error = validateDates(booking);
  const room = rooms.find((room) => room.id === booking.room);
  if (error || !room) throw new RangeError(error || "객실을 선택해 주세요.");
  const nights = nightsBetween(booking.checkin, booking.checkout);
  const nightly = Array.from({ length: nights }, (_, index) => {
    const date = addDays(booking.checkin, index);
    const type = rateTypeFor(date);
    return { date, type, amount: room.rates[type] };
  });
  const subtotal = nightly.reduce((sum, night) => sum + night.amount, 0);
  // Ages 8+ use adult rates; ages 1–7 incur no additional guest charge.
  // Bedding included in the extra guest fee is never charged a second time.
  const extraGuests = Math.max(0, booking.adults - room.baseOccupancy);
  const guestFee = extraGuests * serviceRates.extraGuest * nights;
  const beddingSets = booking.extraBedding;
  const beddingFee = beddingSets * serviceRates.bedding * nights;
  return { nightly, subtotal, extraGuests, guestFee, beddingSets, beddingFee,
    total: subtotal + guestFee + beddingFee };
}
export function validateRoomOccupancy(b: Booking) {
  const room = rooms.find((room) => room.id === b.room);
  if (!room) return "객실을 선택해 주세요.";
  return b.adults + b.children > room.maxOccupancy
    ? `선택한 객실은 아동 포함 최대 ${room.maxOccupancy}인까지 투숙할 수 있습니다.`
    : "";
}
export function shortDate(value: string) {
  return new Date(value + "T12:00:00").toLocaleDateString("ko-KR", {
    month: "long",
    day: "numeric",
    weekday: "short",
  });
}
export function validateDates(b: Booking) {
  const n = nightsBetween(b.checkin, b.checkout);
  return n < 1
    ? "체크아웃은 체크인 다음 날부터 선택해 주세요."
    : n > 30
      ? "숙박은 최대 30박까지 선택할 수 있습니다."
      : b.checkin < holidayCalendarStart || addDays(b.checkout, -1) > holidayCalendarEnd
        ? "2026~2027년 숙박일의 요금을 확인할 수 있습니다. 다른 날짜는 프런트에 문의해 주세요."
        : !Number.isInteger(b.adults) || !Number.isInteger(b.children) ||
          b.adults < 1 || b.children < 0 || b.adults + b.children > 6
          ? "8세 이상 1명 이상, 총 6명 이하로 선택해 주세요."
          : !Number.isInteger(b.extraBedding) || b.extraBedding < 0 || b.extraBedding > 6
            ? "추가 침구는 0~6세트로 선택해 주세요."
            : "";
}
export function normalizeBookingQuery(search: string): Partial<Booking> {
  const q = new URLSearchParams(search);
  const result: Partial<Booking> = {};
  const checkin = q.get("checkin") || "";
  const checkout = q.get("checkout") || "";
  if (
    validISO(checkin) &&
    validISO(checkout) &&
    nightsBetween(checkin, checkout) > 0 &&
    nightsBetween(checkin, checkout) <= 30
  ) {
    result.checkin = checkin;
    result.checkout = checkout;
  }
  const n = Number(q.get("guests"));
  if (Number.isInteger(n) && n >= 1 && n <= 6) result.adults = n;
  const room = q.get("room");
  if (room !== null && /^\d+$/.test(room) && rooms.some((item) => item.id === Number(room)))
    result.room = Number(room);
  return result;
}
export function validateGuest(b: Booking) {
  if (!b.lastName.trim() || !b.firstName.trim())
    return "예약자 성과 이름을 입력해 주세요.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(b.email.trim()))
    return "이메일 주소를 확인해 주세요.";
  if (b.phone.replace(/\D/g, "").length < 8) return "연락처를 확인해 주세요.";
  if (!b.terms) return "필수 약관에 동의해 주세요.";
  return "";
}
