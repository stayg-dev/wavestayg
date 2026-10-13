"use client";

import { useState } from "react";
import { type Room } from "@/lib/rooms";
import { roomTypeLabel } from "@/lib/room-type-labels";
import { bookingToday, shiftBookingDate } from "@/lib/owner-booking-dates";
import { usePublicSales } from "./use-public-sales";
import { formatPrice } from "./shared";

export function DiscountedRate({
  original,
  discounted,
  currency = true,
}: {
  original: number;
  discounted: number;
  currency?: boolean;
}) {
  const format = currency
    ? formatPrice
    : (price: number) => price.toLocaleString("ko-KR");
  if (original <= discounted) return <strong>{format(discounted)}</strong>;
  return (
    <span
      className="discounted-rate"
      aria-label={`정상가 ${original.toLocaleString("ko-KR")}원, 판매가 ${discounted.toLocaleString("ko-KR")}원`}
    >
      <s>{format(original)}</s>
      <span aria-hidden="true"> → </span>
      <strong>{format(discounted)}</strong>
    </span>
  );
}

function matchesRoom(name: string, room: Room) {
  return (
    roomTypeLabel(name) === room.korean ||
    (room.id === 8 && ["LDO", "로프트 더블 오션"].includes(name))
  );
}
export function RoomStartingRate({ room }: { room: Room }) {
  const { data, error } = usePublicSales();
  if (!data) return <span>{error ? "요금 확인 필요" : "요금 확인 중…"}</span>;
  const dates =
    data.rooms
      .find((r) => matchesRoom(r.name, room))
      ?.dates.filter((d) => d.sale_amount !== null && d.is_open) ?? [];
  const lowest = dates.reduce<(typeof dates)[number] | undefined>(
    (best, date) =>
      !best || date.sale_amount! < best.sale_amount! ? date : best,
    undefined,
  );
  if (!lowest) return <span>예약 접수 중지</span>;
  return (
    <>
      <DiscountedRate
        original={lowest.base_amount!}
        discounted={lowest.sale_amount!}
      />
      부터
    </>
  );
}

export function ServiceRateGuide({ owner = false }: { owner?: boolean } = {}) {
  const { data, error } = usePublicSales();
  if (!data) return <p>{error || "부가서비스 요금 확인 중…"}</p>;
  const rates = data.services;
  return (
    <div className="service-rate-guide">
      <h3>부가서비스</h3>
      <p>
        <strong>인원 추가(침구 포함)</strong> · 기준 인원 초과 시 1인 1박{" "}
        {formatPrice(owner ? rates.owner_guest : rates.general_guest)}
      </p>
      <p>
        {owner
          ? "4세 이상 추가 인원 요금 적용"
          : "1~7세 무료 · 8세 이상 성인 요금 적용"}
      </p>
      <p>
        <strong>추가 침구류</strong> · 1세트 1박{" "}
        {formatPrice(owner ? rates.owner_bedding : rates.general_bedding)}
      </p>
      <p>
        <strong>얼리체크인·레이트체크아웃</strong> · 시간당{" "}
        {formatPrice(rates.extra_hour)} (프런트 사전 요청)
      </p>
    </div>
  );
}

export function RoomRateGuide({ room }: { room: Room }) {
  const today = bookingToday();
  const { data, error } = usePublicSales(today, shiftBookingDate(today, 6));
  if (!data) return <p>{error || "요금 확인 중…"}</p>;
  const dates = data.rooms.find((r) => matchesRoom(r.name, room))?.dates ?? [];
  return (
    <dl className="room-rate-guide" aria-label={`${room.korean} 1박 요금`}>
      <div>
        <dt>다가오는 7일</dt>
        <dd>객실 1실 · 1박</dd>
      </div>
      {dates.map((d) => (
        <div key={d.date}>
          <dt>{d.date.slice(5)}</dt>
          <dd>
            {d.sale_amount === null ? (
              "요금 미설정"
            ) : (
              <DiscountedRate
                original={d.base_amount!}
                discounted={d.sale_amount}
              />
            )}
            {!d.is_open && <small> · 접수 중지</small>}
          </dd>
        </div>
      ))}
      {!dates.length && (
        <div>
          <dt>판매 요금 준비 중</dt>
          <dd>프런트 문의</dd>
        </div>
      )}
    </dl>
  );
}

export function RateTable({
  description,
  owner = false,
}: { description?: string; owner?: boolean } = {}) {
  const [from, setFrom] = useState(bookingToday);
  const to = shiftBookingDate(from, 6);
  const { data, error } = usePublicSales(from, to);
  const dates = Array.from({ length: 7 }, (_, i) => shiftBookingDate(from, i));
  return (
    <section
      className="rate-table-section"
      id="room-rates"
      aria-labelledby="room-rates-title"
    >
      <h2 id="room-rates-title">객실 요금표</h2>
      <p>객실 1실 · 1박 기준 / 단위: 원</p>
      {description && <p>{description}</p>}
      <label>
        숙박일 기준으로 보기{" "}
        <input
          type="date"
          value={from}
          min={bookingToday()}
          onChange={(e) => {
            if (e.target.value) setFrom(e.target.value);
          }}
        />
      </label>
      {!data ? (
        <p role="status">{error || "PMS 판매 요금을 불러오는 중…"}</p>
      ) : (
        <>
          {(!data.is_enabled ||
            !(owner ? data.is_owner_enabled : data.is_general_enabled)) && (
            <p role="status">
              {data.message || "현재 예약 접수가 중지되어 있습니다."}
            </p>
          )}
          <div
            className="rate-table-scroll"
            role="region"
            aria-label="날짜별 객실 판매 요금"
            tabIndex={0}
          >
            <table className="rate-table">
              <thead>
                <tr>
                  <th scope="col">객실 타입</th>
                  {dates.map((date) => (
                    <th scope="col" key={date}>
                      {date.slice(5)}
                      <br />
                      {new Date(`${date}T00:00:00Z`).toLocaleDateString(
                        "ko-KR",
                        { weekday: "short", timeZone: "UTC" },
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.rooms.map((room) => (
                  <tr key={room.room_type_id}>
                    <th scope="row">{roomTypeLabel(room.name)}</th>
                    {room.dates.map((date) => (
                      <td key={date.date}>
                        {date.sale_amount === null ? (
                          "요금 미설정"
                        ) : (
                          <DiscountedRate
                            original={date.base_amount!}
                            discounted={date.sale_amount}
                            currency={false}
                          />
                        )}
                        {!(owner ? date.is_owner_open : date.is_open) && (
                          <div>접수 중지</div>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="rate-table-note">
            표시된 판매가는 날짜별 실제 객실료입니다. 연박은 각 숙박일 요금을
            합산합니다. 잔여 객실과 최종 금액은 예약 신청에서 확인해 주세요.
          </p>
        </>
      )}
      <ServiceRateGuide owner={owner} />
    </section>
  );
}
