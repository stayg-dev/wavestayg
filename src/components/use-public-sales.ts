"use client";
import { useEffect, useState } from "react";
import { bookingToday, shiftBookingDate } from "@/lib/owner-booking-dates";
import type { PublicSales } from "@/lib/website-sales";

// Coalesce simultaneous room-card requests, without persisting a price cache.
const requests = new Map<string, Promise<PublicSales>>();
function request(url: string) {
  const active = requests.get(url);
  if (active) return active;
  const promise = fetch(url, { cache: "no-store" })
    .then(async (r) => {
      const data = await r.json();
      if (!r.ok)
        throw new Error(
          "요금을 불러오지 못했습니다. 잠시 후 다시 확인해 주세요.",
        );
      return data as PublicSales;
    })
    .finally(() => requests.delete(url));
  requests.set(url, promise);
  return promise;
}
export function usePublicSales(
  from = bookingToday(),
  to = shiftBookingDate(from, 30),
) {
  const url = `/api/pms/sales/?${new URLSearchParams({ from, to })}`;
  const [state, setState] = useState<{
    url: string;
    data: PublicSales | null;
    error: string;
  }>({ url: "", data: null, error: "" });
  useEffect(() => {
    let cancelled = false;
    request(url)
      .then((data) => {
        if (!cancelled) setState({ url, data, error: "" });
      })
      .catch((e: Error) => {
        if (!cancelled) setState({ url, data: null, error: e.message });
      });
    return () => {
      cancelled = true;
    };
  }, [url]);
  return state.url === url ? state : { data: null, error: "" };
}
