"use client";

import { useState } from "react";
import { type Room } from "@/lib/rooms";
import { rateLabels, serviceRates } from "@/lib/booking";
import { rateTableSeasons, seasonalRateTable } from "@/lib/seasonal-rate-table";
import { formatPrice } from "./shared";

export function ServiceRateGuide() {
  return (
    <div className="service-rate-guide">
      <h3>부가서비스</h3>
      <p><strong>인원 추가(침구 포함)</strong> · 기준 인원 초과 시 1인 1박 {formatPrice(serviceRates.extraGuest)}</p>
      <p>1~7세 무료 · 8세 이상 성인 요금 적용</p>
      <p><strong>추가 침구류</strong> · 1세트 1박 {formatPrice(serviceRates.bedding)}</p>
      <p><strong>얼리체크인·레이트체크아웃</strong> · 시간당 {formatPrice(serviceRates.extraHour)} (프런트 사전 요청)</p>
    </div>
  );
}

export function RoomRateGuide({ room }: { room: Room }) {
  return (
    <dl className="room-rate-guide" aria-label={`${room.korean} 1박 요금`}>
      {Object.entries(rateLabels).map(([key, label]) => (
        <div key={key}><dt>{label}</dt><dd>{formatPrice(room.rates[key as keyof Room["rates"]])}</dd></div>
      ))}
    </dl>
  );
}

export function RateTable({ description }: { description?: string } = {}) {
  const [period, setPeriod] = useState<"off" | "shoulder" | "high">("off");
  const visibleSeasons = rateTableSeasons.filter((season) => season.key === period || (period === "high" && season.key === "peak"));
  return (
    <section className="rate-table-section" id="room-rates" aria-labelledby="room-rates-title">
      <h2 id="room-rates-title">객실 요금표</h2>
      <p>객실 1실 · 1박 기준 / 단위: 원</p>
      {description && <p>{description}</p>}
      <div className="rate-period-tabs" role="tablist" aria-label="요금표 기간">
        {rateTableSeasons.filter((season) => season.key !== "peak").map((season, index) => (
          <button type="button" role="tab" id={`rate-tab-${season.key}`} aria-controls="rate-period-panel"
            aria-selected={period === season.key} tabIndex={period === season.key ? 0 : -1} key={season.key}
            onClick={() => setPeriod(season.key)} onKeyDown={(event) => {
              const keys = ["off", "shoulder", "high"] as const;
              const next = event.key === "ArrowRight" ? (index + 1) % 3 : event.key === "ArrowLeft" ? (index + 2) % 3 : event.key === "Home" ? 0 : event.key === "End" ? 2 : null;
              if (next === null) return;
              event.preventDefault();
              setPeriod(keys[next]);
              document.getElementById(`rate-tab-${keys[next]}`)?.focus();
            }}>
            {season.label}
          </button>
        ))}
      </div>
      <div id="rate-period-panel" role="tabpanel" aria-labelledby={`rate-tab-${period}`}>
      <div className="rate-table-scroll" role="region" aria-label="객실별 기간 및 요일 요금표" tabIndex={0} key={period}>
        <table className={`rate-table${period === "high" ? " rate-table-high" : ""}`}>
          <caption>11개 객실 타입의 요일별 1박 요금 · 2026.09.20 기준</caption>
          <colgroup><col className="rate-room-column" /></colgroup>
          {visibleSeasons.map((season) => <colgroup key={season.key} span={3} />)}
          <thead>
            <tr>
              <th scope="col" rowSpan={2} className="rate-room-heading">객실 타입</th>
              {visibleSeasons.map((season) => (
                <th scope="colgroup" colSpan={3} key={season.key} className="rate-season-heading">
                  {season.label}<span>{season.period}</span>
                </th>
              ))}
            </tr>
            <tr>{visibleSeasons.flatMap((season) => ["주중", "금", "토"].map((day, index) => (
              <th scope="col" key={`${season.key}-${day}`} className={index === 0 ? "rate-season-start" : undefined}>{day}</th>
            )))}</tr>
          </thead>
          <tbody>{seasonalRateTable.map((room) => (
            <tr key={room.name}><th scope="row">{room.name}</th>
              {visibleSeasons.flatMap((season) => room.rates[season.key].map((price, index) => (
                <td key={`${season.key}-${index}`} className={index === 0 ? "rate-season-start" : undefined}>{price.toLocaleString("ko-KR")}</td>
              )))}
            </tr>
          ))}</tbody>
        </table>
      </div>
      </div>
      <p className="rate-table-note">공휴일 전일은 요일과 관계없이 토요일 요금이 적용됩니다. 연박은 각 숙박일의 요금을 합산합니다.</p>
      <ServiceRateGuide />
    </section>
  );
}
