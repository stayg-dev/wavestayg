import { rooms } from "./rooms.ts";
import { roomTypeLabel } from "./room-type-labels.ts";
import type { PublicSales } from "./website-sales.ts";

export function reservationRoom(name: string) {
  const normalize = (value: string) => value.replace(/\s/g, "").toLowerCase();
  return rooms.find(
    (room) =>
      normalize(room.korean) === normalize(roomTypeLabel(name)) ||
      normalize(room.name) === normalize(name),
  );
}

export function stayNights(checkIn: string, checkOut: string) {
  return (
    Math.max(
      0,
      (Date.parse(`${checkOut}T00:00:00Z`) -
        Date.parse(`${checkIn}T00:00:00Z`)) /
        86400000,
    ) || 0
  );
}

// A complete PMS price for every occupied night is required. Never use demo rates.
export function reservationPrice(
  sales: PublicSales | null,
  name: string,
  checkIn: string,
  checkOut: string,
) {
  // The PMS explicitly publishes the test product independently of normal sales.
  // It must still be present with a complete, open nightly rate below.
  if (!sales || (name !== "테스트타입" && (!sales.is_enabled || !sales.is_general_enabled))) return null;
  const nights = stayNights(checkIn, checkOut);
  const room = sales.rooms.find((room) => room.name === name);
  if (!room || nights < 1 || !Number.isInteger(nights)) return null;
  let base = 0,
    discount = 0,
    total = 0;
  for (let i = 0; i < nights; i++) {
    const date = new Date(Date.parse(`${checkIn}T00:00:00Z`) + i * 86400000)
      .toISOString()
      .slice(0, 10);
    const rate = room.dates.find((rate) => rate.date === date);
    if (
      !rate?.is_open ||
      rate.base_amount === null ||
      rate.discount_amount === null ||
      rate.sale_amount === null
    )
      return null;
    base += rate.base_amount;
    discount += rate.discount_amount;
    total += rate.sale_amount;
  }
  return { base, discount, total, nights };
}
