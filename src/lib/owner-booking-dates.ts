export function bookingToday() {
  return new Date(Date.now() + 9 * 3600_000).toISOString().slice(0, 10);
}

export function shiftBookingDate(date: string, days: number) {
  return new Date(Date.parse(`${date}T00:00:00Z`) + days * 86400_000)
    .toISOString().slice(0, 10);
}

export function ownerCheckInAllowed(date: string, today: string) {
  if (!date || date < today || date > "2027-12-31" || date > shiftBookingDate(today, 365)) return false;
  const peak = ["07", "08"].includes(date.slice(5, 7));
  return peak || date >= shiftBookingDate(today, 14);
}

export function firstOwnerCheckIn(today: string) {
  for (let offset = 0; offset <= 14; offset++) {
    const date = shiftBookingDate(today, offset);
    if (ownerCheckInAllowed(date, today)) return date;
  }
  return "";
}
