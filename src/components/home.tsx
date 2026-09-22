"use client";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  Header,
  Footer,
  MediaBlock,
  SectionTitle,
  showReservationNotice,
} from "./shared";

import { RoomInfo } from "./rooms";
import { rooms } from "@/lib/rooms";
import { facilities, sights, aboutParagraphs } from "@/lib/property";
import { sitePhotos, roomPhotos, momentPhotos } from "@/lib/photos";
import { PhotoGallery } from "./photo-gallery";

const heroPhotos = sitePhotos.hero;
const heroTitles = [["파도가 머무는", "조용한 시간"], ["바다를 구경하는", "편안한 휴식"], ["건축으로 담아낸", "바다의 결"]];
const heroRotationInterval = 5000;

export function Home() {
  const [slide, setSlide] = useState(0);
  const [rotationPaused, setRotationPaused] = useState(false);

  useEffect(() => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let timer: ReturnType<typeof setTimeout> | undefined;
    const scheduleNextSlide = () => {
      clearTimeout(timer);
      if (rotationPaused || reducedMotion.matches || document.hidden) return;
      timer = setTimeout(() => {
        setSlide((current) => (current + 1) % heroPhotos.length);
      }, heroRotationInterval);
    };

    scheduleNextSlide();
    reducedMotion.addEventListener("change", scheduleNextSlide);
    document.addEventListener("visibilitychange", scheduleNextSlide);
    return () => {
      clearTimeout(timer);
      reducedMotion.removeEventListener("change", scheduleNextSlide);
      document.removeEventListener("visibilitychange", scheduleNextSlide);
    };
  }, [slide, rotationPaused]);

  const [facility, setFacility] = useState(0);
  const [checkin, setCheckin] = useState("2026-09-20");
  const [checkout, setCheckout] = useState("2026-09-22");
  const [guests, setGuests] = useState("2");
  const nights = Math.max(
    1,
    Math.round((Date.parse(checkout) - Date.parse(checkin)) / 86400000),
  );
  const f = facilities[facility];
  return (
    <>
      <Header home />
      <main id="main">
        <section className="home-hero">
          <div className="hero-photos" aria-hidden="true">
            {heroPhotos.map((photo, index) => (
              <Image
                key={photo.src}
                className={`hero-photo${slide === index ? " is-active" : ""}`}
                src={photo.src}
                style={{ objectPosition: photo.position }}
                alt=""
                fill
                sizes="100vw"
                loading={index === 0 ? "eager" : "lazy"}
                fetchPriority={index === 0 ? "high" : undefined}
              />
            ))}
          </div>
          <div className="hero-copy">
            <h1>
              {heroTitles[slide][0]}
              <br />
              {heroTitles[slide][1]}
            </h1>
            <p>
              죽도해변 앞, 창을 열면 동해의 아침이 하루를 열어줍니다.
            </p>
            <div className="slide-controls">
              {heroPhotos.map((_, i) => (
                <button
                  aria-label={`${i + 1}번째 사진: ${heroPhotos[i].alt}`}
                  aria-pressed={slide === i}
                  className={slide === i ? "active" : ""}
                  onClick={() => setSlide(i)}
                  key={i}
                />
              ))}
              <button
                type="button"
                className="slide-pause"
                aria-label={rotationPaused ? "배경 사진 자동 전환 재생" : "배경 사진 자동 전환 일시정지"}
                onClick={() => setRotationPaused((paused) => !paused)}
              >
                <span aria-hidden="true">{rotationPaused ? "▶" : "Ⅱ"}</span>
              </button>
            </div>
          </div>
          <form className="booking-bar" noValidate onSubmit={(event) => {
            event.preventDefault();
            showReservationNotice();
          }}>
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
          <SectionTitle eyebrow="About Wave STAY-G">
            시원한 바다, 편안한 스테이
            <br />
            <em>힐링</em>이 시작되는 곳.
          </SectionTitle>
          <div className="feature-row">
            <MediaBlock photo={sitePhotos.about} />
            <div>
              <h3>WAVE STAY-G</h3>
              <p>
                {aboutParagraphs.map((paragraph, index) => (
                  <span className="about-paragraph" key={index}>{paragraph}</span>
                ))}
              </p>
            </div>
          </div>
        </section>
        <section className="home-rooms tinted">
          <div className="container">
            <div className="section-heading">
              <div>
                <p className="eyebrow">ROOMS · {rooms.length} TYPES</p>
                <h2>머무는 순간이 풍경이 되는 곳</h2>
              </div>
              <Link href="/rooms/">전체 객실 보기 →</Link>
            </div>
            {rooms.slice(0, 3).map((room, i) => (
              <div
                className={`feature-row ${i === 1 ? "reverse" : ""}`}
                key={i}
              >
                <MediaBlock photo={roomPhotos[room.id][0]} />
                <RoomInfo room={room} />
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
                0{i + 1} · {x.tab}
              </button>
            ))}
          </div>
          <div className="feature-row">
            <PhotoGallery key={f.name} photos={f.photos} label={f.korean} />
            <div className="facility-info">
              <b className="facility-number">0{facility + 1}</b>
              <h3>{f.name}</h3>
              <p className="muted">{f.homeKorean}</p>
              <p className="facility-description">
                {f.description[0]}
                <br />
                {f.description[1]}
              </p>
              <dl>
                <div>
                  <dt>운영 시간</dt>
                  <dd>{f.hours}</dd>
                </div>
                <div>
                  <dt>위치</dt>
                  <dd>{f.location}</dd>
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
              <MediaBlock photo={sitePhotos.location} />
            </div>
            <div className="nearby">
              <div className="minor-heading"><h4>주변 명소</h4><span>도보 · 차량 거리 기준</span></div>
              <div className="nearby-grid">
                {sights.map(([name, category, distance]) => (
                  <article key={name}>
                    <span>{category}</span><h5>{name}</h5><p>{distance}</p>
                  </article>
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
            {momentPhotos.map((photo) => (
              <MediaBlock key={photo.src} photo={photo} />
            ))}
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
