"use client";
import Link from "next/link";
import Image from "next/image";
import { facilities, sights } from "@/lib/property";
import { sitePhotos } from "@/lib/photos";
import { PhotoGallery } from "./photo-gallery";
import {
  Shell,
  MediaBlock,
  Tags,
} from "./shared";

export function Facilities() {
  return (
    <Shell title="부대시설" english="Facilities" description="바다를 배경으로 하는 편안한 공간. 필요할 때 열리고, 조용할 때 머무릅니다.">
      <div className="container facilities-page">
        {[facilities[1], facilities[0], facilities[2]].map((facility, i) => (
          <article className={`feature-row ${i % 2 ? "reverse" : ""}`} key={i}>
            <PhotoGallery photos={facility.photos} label={facility.korean} />
            <div className="facility-info">
              <Tags items={[facility.tag]} />
              <h3>{facility.name}</h3>
              <p className="muted">{facility.korean}</p>
              <p className="facility-description">
                {facility.description[0]}
                <br />
                {facility.description[1]}
              </p>
              <dl>
                {[
                  ["운영 시간", facility.hours],
                  ["위치", facility.location],
                  [facility.useLabel, facility.use],
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
          <a href="tel:01080640076">010-8064-0076</a>
        </h3>
        <p>연중무휴 · 09:00 – 22:00</p>
      </div>
      <div>
        <span>EMAIL</span>
        <h3>
          <a href="mailto:wavestayg0901@gmail.com">wavestayg0901@gmail.com</a>
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
          <MediaBlock className="location-map" photo={sitePhotos.location} sizes="100vw" />
          <span className="location-photo-link">네이버 지도에서 위치 보기 ↗</span>
        </a>
        <ContactCards />
        <section className="travel">
          <div className="minor-heading">
            <h3>오시는 방법</h3>
            <span>서울 기준</span>
          </div>
          <div className="travel-methods">
            {[
              ["자동차", "서울 → 양양 IC →\n죽도해변 (약 2시간 40분)"],
              ["고속버스", "동서울 → 양양터미널 (2시간 30분)\n→ 택시 15분"],
              ["KTX", "청량리 → 강릉역\n→ 렌터카 40분"],
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
                  <span>₩</span>
                  <div>
                    <strong>객실·요일별 요금 안내</strong>
                    <small>일~목 / 금 / 토·공휴일 전일 요금 적용</small>
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
            <p>전화 예약 · 문의는 010-8064-0076 · 매일 09:00 – 22:00</p>
          </div>
        </div>
      </div>
    </Shell>
  );
}
