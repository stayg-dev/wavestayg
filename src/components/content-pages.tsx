"use client";
import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Shell,
  MediaBlock,
  Tags,
  formatPrice,
  description,
  description2,
} from "./shared";

export const rooms = [
  { id: 0, category: "오션 프론트", price: 58000, available: false },
  { id: 1, category: "오션 사이드", price: 42000, available: true },
  { id: 2, category: "패밀리", price: 34000, available: true },
  { id: 3, category: "스위트 · 빌라", price: 52000, available: true },
  { id: 4, category: "스위트 · 빌라", price: 89000, available: true },
  { id: 5, category: "오션 사이드", price: 25000, available: false },
];
export function Rooms() {
  const [filter, setFilter] = useState("전체");
  const [selected, setSelected] = useState(0);
  const room = rooms[selected];
  const visible = rooms
    .slice(0, 4)
    .filter((r) => filter === "전체" || r.category === filter);
  return (
    <Shell title="객실" english="Rooms & Suites">
      <div className="container rooms-page">
        <div className="tabs">
          {[
            "전체",
            "오션 프론트",
            "오션 사이드",
            "패밀리",
            "스위트 · 빌라",
          ].map((t) => (
            <button
              key={t}
              onClick={() => setFilter(t)}
              aria-pressed={filter === t}
              className={filter === t ? "active" : ""}
            >
              {t}
            </button>
          ))}
        </div>
        <div className="room-browser">
          <div className="room-list">
            {visible.map((r) => (
              <article
                key={r.id}
                className={`room-list-card ${selected === r.id ? "selected" : ""}`}
              >
                <MediaBlock />
                <div>
                  <Tags />
                  <h3>Ocean Suite</h3>
                  <p className="muted">오션 스위트</p>
                  <p>
                    {description}
                    <br />
                    {description2}
                  </p>
                  <div className="price-row">
                    <strong>{formatPrice(r.id < 2 ? 58000 : 580000)}</strong>
                    <span>/ 1박</span>
                  </div>
                  <button
                    className="pill small"
                    onClick={() => setSelected(r.id)}
                  >
                    자세히 보기 →
                  </button>
                </div>
              </article>
            ))}
            {visible.length === 0 && (
              <p className="empty">해당 유형의 객실이 없습니다.</p>
            )}
          </div>
          <article className="room-detail" id="room-detail">
            <MediaBlock className="room-detail-photo" />
            <div className="room-detail-body">
              <Tags />
              <h2>Ocean Suite</h2>
              <p className="muted">오션 스위트</p>
              <p className="room-detail-description">
                {description}
                <br />
                {description2}
              </p>
              <dl className="room-specs">
                {["침대", "수용", "면적", "뷰"].map((k) => (
                  <div key={k}>
                    <dt>{k}</dt>
                    <dd>King</dd>
                  </div>
                ))}
              </dl>
              <h4>포함 어메니티</h4>
              <Tags items={Array(7).fill("Ocean Front")} />
              <div className="detail-price">
                <strong>{formatPrice(room.id < 2 ? 58000 : 580000)}</strong>
                <span>/ 1박</span>
                <small>세금 · 봉사료 별도</small>
              </div>
              <Link
                className="primary full"
                href={`/reservation/book/?room=${room.id}`}
              >
                이 객실 예약하기 →
              </Link>
            </div>
          </article>
        </div>
      </div>
    </Shell>
  );
}
export function Facilities() {
  return (
    <Shell title="부대시설" english="Facilities">
      <div className="container facilities-page">
        {[0, 1, 2, 3].map((i) => (
          <article className={`feature-row ${i % 2 ? "reverse" : ""}`} key={i}>
            <MediaBlock />
            <div className="facility-info">
              <Tags items={["Ocean Front"]} />
              <h3>Coastal Dining</h3>
              <p className="muted">코스탈 다이닝</p>
              <p className="facility-description">
                동해의 해산물과 계절의 재료
                <br />
                파노라마 오션 뷰와 함께
              </p>
              <dl>
                {[
                  ["운영 시간", "Breakfast · Dinner"],
                  ["위치", "본관 · 로비층"],
                  ["예약", "자유 이용"],
                ].map(([k, v]) => (
                  <div key={k}>
                    <dt>{k}</dt>
                    <dd>{v}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </article>
        ))}
      </div>
    </Shell>
  );
}
const sights = [
  ["죽도해변", "Beach", "도보 2분"],
  ["서핑 스팟", "Surf", "도보 3분"],
  ["하조대", "View", "차량 15분"],
  ["낙산사", "Culture", "차량 25분"],
  ["송이밸리 자연휴양림", "Nature", "차량 20분"],
];
export function ContactCards() {
  return (
    <div className="contact-cards">
      <div>
        <span>ADDRESS</span>
        <h3>강원 양양군 현남면 동산큰길 17-5</h3>
        <p>
          17-5, Dongsankeun-gil, Hyeonnam-myeon,
          <br />
          Yangyang-gun, Gangwon-do
        </p>
      </div>
      <div>
        <span>PHONE</span>
        <h3>
          <a href="tel:0336720000">033-672-0000</a>
        </h3>
        <p>연중무휴 · 09:00 – 22:00</p>
      </div>
      <div>
        <span>EMAIL</span>
        <h3>
          <a href="mailto:stay@wave-stayg.kr">stay@wave-stayg.kr</a>
        </h3>
        <p>24시간 이내 회신</p>
      </div>
    </div>
  );
}
export function Location() {
  return (
    <Shell title="오시는 길" english="Getting Here">
      <div className="container location-page">
        <a
          href="https://naver.me/FhUgubIv"
          target="_blank"
          rel="noreferrer"
          aria-label="네이버 지도에서 위치 보기"
        >
          <MediaBlock className="location-map" />
        </a>
        <ContactCards />
        <section className="travel">
          <div className="minor-heading">
            <h3>오시는 방법</h3>
            <span>서울 기준</span>
          </div>
          <div className="travel-methods">
            {[
              ["자동차", "서울 → 양양 IC → 죽도해변 (약 2시간 40분)"],
              ["고속버스", "동서울 → 양양터미널 (2시간 30분) → 택시 15분"],
              ["KTX", "청량리 → 강릉역 → 렌터카 40분"],
              ["항공", "양양국제공항에서 차량 30분"],
            ].map(([k, v], i) => (
              <article key={k}>
                <b>0{i + 1}</b>
                <div>
                  <h4>{k}</h4>
                  <p>{v}</p>
                </div>
              </article>
            ))}
          </div>
        </section>
        <section className="sights">
          <div className="minor-heading">
            <h3>주변 명소</h3>
            <span>도보 · 차량 거리 기준</span>
          </div>
          <div className="sights-grid">
            {sights.map(([k, en, d]) => (
              <article key={k}>
                <MediaBlock />
                <div>
                  <span>{en}</span>
                  <h4>{k}</h4>
                  <p>{d}</p>
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>
    </Shell>
  );
}
const notices = [
  [
    "공지",
    "2026.07.02",
    "2026년 수영장 오픈 안내",
    "청송 한옥호텔 안(ANN)의 수영장이 오픈되었습니다.",
  ],
  [
    "공지",
    "2026.06.28",
    "훈장댁 + 청송백자 패키지 판매 안내",
    "청송 한옥호텔 안(ANN)의 훈장댁 + 청송백자 패키지 판매가 시작되었습니다.",
  ],
  [
    "공지",
    "2026.06.20",
    "전 객실 예약 오픈 안내",
    "청송 한옥호텔 안(ANN)의 12월까지 전 객실 예약이 오픈되었습니다.",
  ],
  [
    "공지",
    "2026.06.10",
    "하절기 온돌 점검 및 대청소 안내",
    "8월 3일(월) – 8월 5일(수) 3일간, 죽림채는 정상 운영됩니다.",
  ],
  [
    "안내",
    "2026.05.30",
    "반려동물 동반 이용 규정 개정",
    "지정 객실(대문채)에 한하여 소형견 동반이 허용됩니다.",
  ],
  [
    "이벤트",
    "2026.05.12",
    "봄의 끝, 마당 음악회 후기",
    "함께해 주신 모든 분들께 감사드립니다.",
  ],
  [
    "공지",
    "2026.04.28",
    "홈페이지 개편 안내",
    "예약 시스템과 객실 소개 페이지가 새롭게 정비되었습니다.",
  ],
];
export function Notice() {
  const [filter, setFilter] = useState("전체");
  const [opened, setOpened] = useState<number | null>(null);
  const filtered = notices
    .map((n, i) => ({ n, i }))
    .filter(({ n }) => filter === "전체" || n[0] === filter);
  return (
    <Shell title="공지사항" english="Notice">
      <div className="container notice-page">
        <div className="notice-toolbar">
          <div className="tabs">
            {["전체", "공지", "안내", "이벤트"].map((t) => (
              <button
                key={t}
                className={filter === t ? "active" : ""}
                aria-pressed={filter === t}
                onClick={() => {
                  setFilter(t);
                  setOpened(null);
                }}
              >
                {t}
              </button>
            ))}
          </div>
          <span>전체 {filtered.length}건</span>
        </div>
        <div className="notice-list">
          {filtered.map(({ n, i }) => (
            <article key={i} className={opened === i ? "expanded" : ""}>
              <button
                className="notice-row"
                onClick={() => setOpened(opened === i ? null : i)}
                aria-expanded={opened === i}
                aria-controls={`notice-${i}`}
              >
                <span className="notice-kind">{n[0]}</span>
                <span className="notice-title">
                  <strong>
                    {n[2]} {i === 0 && <small>new</small>}
                  </strong>
                  <span>{n[3]}</span>
                </span>
                <time>{n[1]}</time>
                <span className="notice-arrow">{opened === i ? "−" : "+"}</span>
              </button>
              {opened === i && (
                <div id={`notice-${i}`} className="notice-body">
                  <p>{n[3]}</p>
                  <p>자세한 안내는 숙소로 문의해 주세요.</p>
                  <Link href="/contact/">문의하기 →</Link>
                </div>
              )}
            </article>
          ))}
        </div>
        <nav className="pagination" aria-label="공지사항 페이지">
          <button disabled aria-label="첫 페이지">
            ‹‹
          </button>
          <button disabled aria-label="이전 페이지">
            ‹
          </button>
          <button aria-current="page">1</button>
          <button disabled aria-label="다음 페이지">
            ›
          </button>
          <button disabled aria-label="마지막 페이지">
            ››
          </button>
        </nav>
      </div>
    </Shell>
  );
}
export function Contact() {
  return (
    <Shell title="문의사항" english="Contact">
      <div className="container contact-page">
        <h2>도움이 필요하신가요?</h2>
        <p>예약 및 숙소 이용에 대해 문의해 주세요.</p>
        <ContactCards />
      </div>
    </Shell>
  );
}
export function Reservation() {
  return (
    <Shell
      title="예약 & 조회"
      english="Reservation"
      description="원하는 날짜를 먼저 정하고, 가능한 객실을 골라 예약합니다."
    >
      <div className="container reservation-landing">
        <div className="reservation-choices">
          {[false, true].map((find) => (
            <Link
              href={find ? "/reservation/lookup/" : "/reservation/book/"}
              key={String(find)}
              className="reservation-choice"
            >
              <div className={`reservation-icon ${find ? "find" : ""}`}>
                <Image
                  src={`/assets/53-1244-imgGroup${find ? "276" : "266"}.svg`}
                  width={58}
                  height={58}
                  alt=""
                />
              </div>
              <p className="eyebrow">
                {find ? "FIND YOUR RESERVATION" : "BOOK A STAY"}
              </p>
              <h2>{find ? "예약 조회" : "예약하기"}</h2>
              <p>
                {find ? (
                  <>
                    이미 예약하신 내역을 확인하고 변경 · 취소하세요.
                    <br />
                    예약번호와 예약자명만 있으면 됩니다.
                  </>
                ) : (
                  <>
                    날짜와 객실을 선택하고 새로 예약을 진행합니다.
                    <br />
                    인원 · 예약자 정보 · 결제까지 한 번에
                  </>
                )}
              </p>
              {find ? (
                <div className="reservation-info">
                  <Image
                    src="/assets/53-1244-imgGroup277.svg"
                    width={20}
                    height={20}
                    alt=""
                  />
                  예약번호는 예약 시 발송된 이메일에서 확인하실 수 있습니다.
                </div>
              ) : (
                <div className="promotion">
                  <span>%</span>
                  <div>
                    <strong>여름 바다 얼리버드 -15%</strong>
                    <small>코드 SUMMER25 · 8월 31일까지</small>
                  </div>
                </div>
              )}
              <Tags
                items={
                  find
                    ? ["날짜 확인", "객실 확인", "취소", "영수증"]
                    : ["날짜 선택", "객실 선택", "인원", "결제"]
                }
              />
              <small className="muted">
                {find ? "예약번호 · 예약자명 필요" : "약 3분소요 · 즉시 확정"}
              </small>
              <span className="choice-link">
                {find ? "예약 조회하기" : "예약 진행하기"} →
              </span>
            </Link>
          ))}
        </div>
        <div className="help-strip">
          <Image
            src="/assets/53-1244-imgFrame.svg"
            width={33}
            height={33}
            alt=""
          />
          <div>
            <h4>도움이 필요하신가요?</h4>
            <p>전화 예약 · 문의는 010-0000-0000 · 매일 오전 09:00 - 21:00</p>
          </div>
        </div>
      </div>
    </Shell>
  );
}
