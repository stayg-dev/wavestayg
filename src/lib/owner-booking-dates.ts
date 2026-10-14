export function bookingToday() {
  return new Date(Date.now() + 9 * 3600_000).toISOString().slice(0, 10);
}

export function shiftBookingDate(date: string, days: number) {
  return new Date(Date.parse(`${date}T00:00:00Z`) + days * 86400_000)
    .toISOString().slice(0, 10);
}

export function ownerCheckInAllowed(date: string, today: string) {
  const parsed = new Date(`${date}T00:00:00Z`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== date) return false;
  if (!date || date < today || date > "2027-12-31" || date > shiftBookingDate(today, 365)) return false;
  const peak = ["07", "08"].includes(date.slice(5, 7));
  return date >= shiftBookingDate(today, peak ? 14 : 5);
}

export function firstOwnerCheckIn(today: string) {
  for (let offset = 0; offset <= 14; offset++) {
    const date = shiftBookingDate(today, offset);
    if (ownerCheckInAllowed(date, today)) return date;
  }
  return "";
}
