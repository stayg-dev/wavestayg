"use client";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import {
  Header,
  Footer,
  MediaBlock,
  SectionTitle,
  RoomInfo,
  description,
  description2,
} from "./shared";
export function Home() {
  const [slide, setSlide] = useState(0);
  const [facility, setFacility] = useState(0);
  const [checkin, setCheckin] = useState("2026-09-20");
  const [checkout, setCheckout] = useState("2026-09-22");
  const [guests, setGuests] = useState("2");
  const nights = Math.max(
    1,
    Math.round((Date.parse(checkout) - Date.parse(checkin)) / 86400000),
  );
  const facilities = [
    [
      "Infinity Pool",
      "인피니티 풀",
      "수평선까지 이어지는 25m 야외 풀.",
      "이른 아침 오션 뷰가 특히 아름답습니다.",
      "10:00 – 22:00",
    ],
    [
      "Spa",
      "스파",
      "바다를 마주하며 즐기는 편안한 휴식.",
      "온전히 나에게 집중하는 시간을 만나보세요.",
      "10:00 – 22:00",
    ],
    [
      "Coastal Dining",
      "코스탈 다이닝",
      "동해의 해산물과 계절의 재료",
      "파노라마 오션 뷰와 함께",
      "Breakfast · Dinner",
    ],
    [
      "Sea Lounge",
      "씨 라운지",
      "바다 옆의 여유로운 시간.",
      "수평선을 바라보며 하루를 마무리하세요.",
      "10:00 – 22:00",
    ],
  ];
  const f = facilities[facility];
  return (
    <>
      <Header home />
      <main id="main">
        <section className="home-hero">
          <Image
            className="hero-photo"
            src={
              [
                "/assets/home-img.png",
                "/assets/3-25-img14.png",
                "/assets/3-25-img12.png",
              ][slide]
            }
            alt="양양 죽도해변의 푸른 바다"
            fill
            sizes="100vw"
            priority
          />
          <div className="hero-copy">
            <h1>
              파도가 머무는
              <br />
              조용한 시간
            </h1>
            <p>
              동해의 새벽, 바람과 파도만이 인사하는 자리에서 하루가 시작됩니다.
            </p>
            <div className="slide-controls">
              {[0, 1, 2].map((i) => (
                <button
                  aria-label={`${i + 1}번째 해변 사진`}
                  aria-pressed={slide === i}
                  className={slide === i ? "active" : ""}
                  onClick={() => setSlide(i)}
                  key={i}
                />
              ))}
            </div>
          </div>
          <form className="booking-bar" action="/reservation/book/">
            <label>
              체크인
              <input
                type="date"
                name="checkin"
                value={checkin}
                onChange={(e) => {
                  if (!e.target.value) return;
                  setCheckin(e.target.value);
                  if (e.target.value >= checkout)
                    setCheckout(
                      new Date(Date.parse(e.target.value) + 86400000)
                        .toISOString()
                        .slice(0, 10),
                    );
                }}
                required
              />
            </label>
            <label>
              체크아웃
              <input
                type="date"
                name="checkout"
                min={new Date(Date.parse(checkin) + 86400000)
                  .toISOString()
                  .slice(0, 10)}
                value={checkout}
                onChange={(e) => setCheckout(e.target.value)}
                required
              />
            </label>
            <div>
              <span>기간</span>
              <p>{nights}박</p>
            </div>
            <label>
              인원
              <select
                name="guests"
                value={guests}
                onChange={(e) => setGuests(e.target.value)}
              >
                {[1, 2, 3, 4, 5, 6].map((n) => (
                  <option key={n} value={n}>
                    성인 {n}
                  </option>
                ))}
              </select>
            </label>
            <button className="primary">객실 검색 →</button>
          </form>
        </section>
        <section className="container home-about">
          <SectionTitle eyebrow="About Wave STAYG">
            시원한 바다, 편안한 스테이
            <br />
            <em>힐링</em>이 시작되는 곳.
          </SectionTitle>
          <div className="feature-row">
            <MediaBlock />
            <div>
              <h3>WAVE STAY-G</h3>
              <p>
                {description}
                <br />
                {description2}
              </p>
            </div>
          </div>
        </section>
        <section className="home-rooms tinted">
          <div className="container">
            <div className="section-heading">
              <div>
                <p className="eyebrow">ROOMS · 6 TYPES</p>
                <h2>모든 객실이 오션뷰</h2>
              </div>
              <Link href="/rooms/">전체 객실 보기 →</Link>
            </div>
            {[0, 1, 2].map((i) => (
              <div
                className={`feature-row ${i === 1 ? "reverse" : ""}`}
                key={i}
              >
                <MediaBlock />
                <RoomInfo />
              </div>
            ))}
          </div>
        </section>
        <section className="container home-facilities">
          <SectionTitle eyebrow="FACILITIES">
            바다 옆의 <em>여유</em>
          </SectionTitle>
          <div className="tabs" aria-label="부대시설">
            {facilities.map((x, i) => (
              <button
                key={i}
                className={facility === i ? "active" : ""}
                aria-pressed={facility === i}
                onClick={() => setFacility(i)}
              >
                0{i + 1} · {x[1]}
              </button>
            ))}
          </div>
          <div className="feature-row">
            <MediaBlock />
            <div className="facility-info">
              <b className="facility-number">0{facility + 1}</b>
              <h3>{f[0]}</h3>
              <p className="muted">{f[1]}</p>
              <p className="facility-description">
                {f[2]}
                <br />
                {f[3]}
              </p>
              <dl>
                <div>
                  <dt>운영 시간</dt>
                  <dd>{f[4]}</dd>
                </div>
                <div>
                  <dt>위치</dt>
                  <dd>본관 · 로비층</dd>
                </div>
              </dl>
              <Link href="/facilities/" className="pill outline small">
                부대시설 전체 →
              </Link>
            </div>
          </div>
        </section>
        <section className="tinted home-location">
          <div className="container">
            <div className="location-top">
              <div>
                <p className="eyebrow">LOCATION</p>
                <h2>
                  양양 죽도해변,
                  <br />
                  파도가 시작되는 자리
                </h2>
                <p className="location-description">
                  서울에서 2시간 40분, 문을 열면 바로 죽도해변
                  <br />
                  Wave STAYG는 서핑 스팟과 하조대·낙산사·설악산이 가까운 양양의
                  심장부에 위치합니다.
                </p>
                <div className="address">
                  <span>주소</span>
                  <p>강원 양양군 현남면 동산큰길 17-5</p>
                </div>
                <Link className="pill dark small" href="/location/">
                  오시는 길 자세히 →
                </Link>
              </div>
              <MediaBlock />
            </div>
            <div className="nearby">
              <h4>주변 명소</h4>
              <div>
                {[0, 1, 2, 3, 4, 5].map((i) => (
                  <MediaBlock key={i} />
                ))}
              </div>
            </div>
          </div>
        </section>
        <section className="container home-moments">
          <SectionTitle eyebrow="SIGNATURE MOMENTS">
            오래 남는 <em>순간들</em>
          </SectionTitle>
          <div className="moments-grid">
            {[0, 1, 2, 3].map((i) => (
              <MediaBlock key={i} />
            ))}
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
