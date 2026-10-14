import { reservationRoom } from "./reservation.ts";
import { getOffSeasonRates, offSeasonDiscount } from "./seasonal-rate-table.ts";
import type {
  SalesConfig,
  SalesSnapshot,
  SalesTariff,
} from "./website-sales.ts";

type RoomType = { id: string; name: string };

/** Admin draft only. Public prices and booking quotes still come from PMS. */
export function rateTableTariff(room: RoomType): SalesTariff | null {
  const catalogRoom = reservationRoom(room.name);
  if (!catalogRoom) return null;
  const [weekday, friday, saturday] = getOffSeasonRates(catalogRoom.id).map(
    (base_amount) => ({
      base_amount,
      discount_amount: offSeasonDiscount,
      sale_amount: base_amount - offSeasonDiscount,
    }),
  );
  return { room_type_id: room.id, name: room.name, weekday, friday, saturday };
}

/** Fill missing rooms only; preserve saved prices, overrides and stop-sales. */
export function fillRateTableTariffs(
  config: SalesConfig,
  rooms: RoomType[],
): SalesConfig {
  const next = structuredClone(config);
  for (const room of rooms) {
    if (next.tariffs.some((tariff) => tariff.room_type_id === room.id))
      continue;
    const tariff = rateTableTariff(room);
    if (tariff) next.tariffs.push(tariff);
  }
  return next;
}

export function initialSalesDraft(snapshot: SalesSnapshot): SalesConfig {
  return snapshot.revision === null && snapshot.config.tariffs.length === 0
    ? fillRateTableTariffs(snapshot.config, snapshot.room_types ?? [])
    : structuredClone(snapshot.config);
}
