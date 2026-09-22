import { roomCatalog, type Room } from "@/lib/rooms";
import { rateLabels, serviceRates } from "@/lib/booking";
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
  return (
    <section className="rate-table-section" id="room-rates" aria-labelledby="room-rates-title">
      <h2 id="room-rates-title">객실 요금표</h2>
      <p>객실 1실 · 1박 기준 / 단위: 원</p>
      {description && <p>{description}</p>}
      <div className="rate-table-scroll" role="region" aria-label="객실별 요일 요금표" tabIndex={0}>
        <table className="rate-table">
          <caption>11개 객실 타입의 요일별 1박 요금</caption>
          <thead><tr><th scope="col">객실 타입</th>{Object.values(rateLabels).map((label) => <th scope="col" key={label}>{label}</th>)}</tr></thead>
          <tbody>{roomCatalog.map((room) => (
            <tr key={room.id}><th scope="row">{room.korean}</th>
              <td>{room.rates.weekday.toLocaleString("ko-KR")}</td>
              <td>{room.rates.friday.toLocaleString("ko-KR")}</td>
              <td>{room.rates.peak.toLocaleString("ko-KR")}</td>
            </tr>
          ))}</tbody>
        </table>
      </div>
      <p className="rate-table-note">공휴일 전일은 요일과 관계없이 토요일 요금이 적용됩니다. 연박은 각 숙박일의 요금을 합산합니다.</p>
      <ServiceRateGuide />
    </section>
  );
}
