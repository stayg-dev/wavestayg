export type SalesPrice = {
  base_amount: number;
  discount_amount: number;
  sale_amount: number;
};
export type SalesTariff = {
  room_type_id: string;
  name: string;
  weekday: SalesPrice;
  friday: SalesPrice;
  saturday: SalesPrice;
};
export type SalesOverride = SalesPrice & { room_type_id: string; date: string };
export type SalesAudience = "all" | "general" | "owner";
export type SalesBlock = {
  room_type_id: string;
  date: string;
  audience: SalesAudience;
  reason: string;
};
export type SalesServices = {
  general_guest: number;
  general_bedding: number;
  owner_guest: number;
  owner_bedding: number;
  extra_hour: number;
};
export type SalesConfig = {
  payment_policy?: { version: string; text: string };
  is_enabled: boolean;
  is_general_enabled: boolean;
  is_owner_enabled: boolean;
  message: string;
  valid_from: string;
  valid_to: string;
  tariffs: SalesTariff[];
  overrides: SalesOverride[];
  blocks: SalesBlock[];
  services: SalesServices;
};
export type SalesSnapshot = {
  config: SalesConfig;
  revision: string | null;
  room_types?: { id: string; name: string }[];
};
export type SalesHistory = {
  id: string;
  reason: string;
  created_at: string;
  before: SalesConfig;
  after: SalesConfig;
};
export type PublicSales = Omit<
  SalesConfig,
  "tariffs" | "overrides" | "blocks"
> & {
  revision: string | null;
  rooms: {
    room_type_id: string;
    name: string;
    dates: {
      date: string;
      base_amount: number | null;
      discount_amount: number | null;
      sale_amount: number | null;
      is_open: boolean;
      is_owner_open: boolean;
    }[];
  }[];
};

export function salesDateRange(
  from: string,
  to: string,
  weekdays = [0, 1, 2, 3, 4, 5, 6],
) {
  const start = Date.parse(`${from}T00:00:00Z`),
    end = Date.parse(`${to}T00:00:00Z`);
  const count = (end - start) / 86400000 + 1;
  if (
    !Number.isInteger(count) ||
    count < 1 ||
    count > 366 ||
    new Date(start).toISOString().slice(0, 10) !== from ||
    new Date(end).toISOString().slice(0, 10) !== to
  )
    throw new Error("적용 기간은 올바른 날짜로 1~366일을 선택해 주세요.");
  const dates = Array.from(
    { length: count },
    (_, i) => new Date(start + i * 86400000),
  );
  return dates
    .filter((d) => weekdays.includes(d.getUTCDay()))
    .map((d) => d.toISOString().slice(0, 10));
}

/** Only edits the selected rooms, stay-nights and audience. Reopening never removes another audience's block. */
export function editSalesDates(
  config: SalesConfig,
  ids: string[],
  dates: string[],
  action: "price" | "reset" | "block" | "reopen",
  price: SalesPrice,
  audience: SalesAudience,
  reason: string,
): SalesConfig {
  if (!ids.length || !dates.length)
    throw new Error("객실과 적용 요일을 선택해 주세요.");
  if (dates.some((d) => d < config.valid_from || d > config.valid_to))
    throw new Error("판매 요금 유효 기간 안에서 선택해 주세요.");
  const selected = (row: { room_type_id: string; date: string }) =>
    ids.includes(row.room_type_id) && dates.includes(row.date);
  if (action === "price") {
    if (ids.some((id) => !config.tariffs.some((t) => t.room_type_id === id)))
      throw new Error("먼저 선택 객실의 기본 요금을 입력해 주세요.");
    if (
      !Number.isInteger(price.base_amount) ||
      price.base_amount < 1 ||
      price.base_amount > 10000000 ||
      !Number.isInteger(price.discount_amount) ||
      price.discount_amount < 0 ||
      price.discount_amount >= price.base_amount
    )
      throw new Error("할인액은 0원 이상, 정상가 미만의 정수여야 합니다.");
  }
  if (action === "block" && !reason.trim())
    throw new Error("방막기 사유를 입력해 주세요.");
  const next = structuredClone(config);
  if (action === "price" || action === "reset") {
    next.overrides = next.overrides.filter((row) => !selected(row));
    if (action === "price")
      next.overrides.push(
        ...ids.flatMap((room_type_id) =>
          dates.map((date) => ({
            room_type_id,
            date,
            ...price,
            sale_amount: price.base_amount - price.discount_amount,
          })),
        ),
      );
  } else {
    next.blocks = next.blocks.filter(
      (row) => !selected(row) || row.audience !== audience,
    );
    if (action === "block")
      next.blocks.push(
        ...ids.flatMap((room_type_id) =>
          dates.map((date) => ({
            room_type_id,
            date,
            audience,
            reason: reason.trim(),
          })),
        ),
      );
  }
  if (next.blocks.length > 10000 || next.overrides.length > 10000)
    throw new Error(
      "날짜별 설정은 각각 최대 10,000건입니다. 적용 기간을 줄여 주세요.",
    );
  return next;
}

/** General sale switches replace legacy all/general blocks without touching owner records. */
export function editGeneralSalesStatus(
  config: SalesConfig,
  ids: string[],
  dates: string[],
  isOpen: boolean,
  reason = "",
): SalesConfig {
  if (!ids.length || !dates.length)
    throw new Error("객실과 적용 요일을 선택해 주세요.");
  const next = structuredClone(config);
  next.blocks = next.blocks.filter(
    (row) =>
      row.audience === "owner" ||
      !ids.includes(row.room_type_id) ||
      !dates.includes(row.date),
  );
  if (!isOpen)
    next.blocks.push(
      ...ids.flatMap((room_type_id) =>
        dates.map((date) => ({
          room_type_id,
          date,
          audience: "general" as const,
          reason: reason.trim() || "홈페이지 판매 불가",
        })),
      ),
    );
  if (next.blocks.length > 10000)
    throw new Error(
      "판매 상태 설정은 최대 10,000건입니다. 적용 기간을 줄여 주세요.",
    );
  return next;
}
