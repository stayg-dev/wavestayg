export type Booking = {
  checkin: string;
  checkout: string;
  adults: number;
  children: number;
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
  discounted: boolean;
  createdAt: string;
};
export const priceList = [58000, 42000, 34000, 52000, 89000, 25000];
export const initialBooking: Booking = {
  checkin: "2026-09-20",
  checkout: "2026-09-22",
  adults: 2,
  children: 0,
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
export function totalFor(booking: Booking, discount = false) {
  const subtotal =
    priceList[booking.room] * nightsBetween(booking.checkin, booking.checkout);
  const saving = discount ? Math.round(subtotal * 0.15) : 0;
  const tax = Math.round((subtotal - saving) * 0.1);
  return { subtotal, saving, tax, total: subtotal - saving + tax };
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
      : b.adults < 1 || b.adults + b.children > 6
        ? "투숙 인원은 성인 1명 이상, 총 6명 이하로 선택해 주세요."
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
  if (room !== null && [1, 2, 3, 4].includes(Number(room)))
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
