"use client";

import { useRef, useState } from "react";
import { getRoom, roomCatalog, roomCategories, type Room } from "@/lib/rooms";
import { Shell, MediaBlock, Tags, formatPrice, ReservationButton } from "./shared";
import { RateTable, RoomRateGuide } from "./rate-guide";
import { roomPhotos } from "@/lib/photos";
import { PhotoGallery } from "./photo-gallery";

export function RoomInfo({ room }: { room: Room }) {
  return (
    <div className="room-info">
      <Tags items={room.tags} />
      <h3>{room.name}</h3>
      <p className="muted room-korean">{room.korean}</p>
      <p className="room-description">{room.description}</p>
      <div className="price-row">
        <p><strong>{formatPrice(room.rates.weekday)}부터</strong> <span className="muted">/ 1박 · 일~목 기준</span></p>
        <ReservationButton className="pill small">예약하기</ReservationButton>
      </div>
    </div>
  );
}

export function RoomDetails({ room }: { room: Room }) {
  return (
    <div className="room-detail-body">
      <Tags items={room.tags} />
      <h2 id="room-detail-title">{room.name}</h2>
      <p className="muted">{room.korean}</p>
      <p className="room-detail-description">{room.description}</p>
      <dl className="room-specs">
        {[["침대", room.bed], ["인원", room.capacity], ["면적", room.area], ["뷰", room.view]].map(([label, value]) => (
          <div key={label}><dt>{label}</dt><dd>{value}</dd></div>
        ))}
      </dl>
      <RoomRateGuide room={room} />
      <div className="room-detail-actions">
        <div className="detail-price">
          <strong>{formatPrice(room.rates.weekday)}부터</strong><span>/ 1박</span>
          <small>일~목 기준 · 공휴일 전일 제외</small>
        </div>
        <ReservationButton className="primary">이 객실 예약하기 →</ReservationButton>
      </div>
    </div>
  );
}

export function Rooms() {
  const [filter, setFilter] = useState("전체");
  const [selected, setSelected] = useState(0);
  const detail = useRef<HTMLElement>(null);
  const list = useRef<HTMLDivElement>(null);
  const visible = roomCatalog.filter((room) => filter === "전체" || room.category === filter);
  const room = getRoom(selected);
  function changeFilter(category: string) {
    setFilter(category);
    const matches = roomCatalog.filter((item) => category === "전체" || item.category === category);
    if (!matches.some((item) => item.id === selected)) setSelected(matches[0].id);
    list.current?.scrollTo({ top: 0 });
  }
  function selectRoom(id: number) {
    setSelected(id);
    if (window.matchMedia("(max-width: 760px)").matches) {
      detail.current?.scrollIntoView({ block: "start", behavior: "instant" });
      detail.current?.focus({ preventScroll: true });
    }
  }
  return (
    <Shell title="객실" english="Rooms & Suites" description="바다를 마주한 공간, 파도 소리와 함께 잔잔한 하루를 담다">
      <div className="container rooms-page">
        <div className="tabs" aria-label="객실 유형">
          {roomCategories.map((category) => (
            <button key={category} onClick={() => changeFilter(category)} aria-pressed={filter === category} className={filter === category ? "active" : ""}>{category}</button>
          ))}
        </div>
        <div className="room-browser">
          <div className="room-list" ref={list} tabIndex={0} role="region" aria-label="객실 목록">
            {visible.map((item) => (
              <article key={item.id} className={`room-list-card ${selected === item.id ? "selected" : ""}`}>
                <MediaBlock photo={roomPhotos[item.id][0]} sizes="(max-width: 640px) 80px, (max-width: 1000px) 100px, 190px" />
                <div>
                  <Tags items={item.tags} />
                  <h3>{item.name}</h3>
                  <p className="muted">{item.korean}</p>
                  <p>{item.description}</p>
                  <div className="price-row">
                    <strong>{formatPrice(item.rates.weekday)}부터</strong><span>/ 1박 · 일~목 기준</span>
                    <button className="room-select" aria-label={`${item.korean} 자세히 보기`} aria-pressed={selected === item.id} aria-controls="room-detail" onClick={() => selectRoom(item.id)}>{selected === item.id ? "선택됨 ✓" : "자세히 보기 →"}</button>
                  </div>
                </div>
              </article>
            ))}
          </div>
          <article className="room-detail" id="room-detail" ref={detail} tabIndex={-1} aria-labelledby="room-detail-title">
            <PhotoGallery key={room.id} photos={roomPhotos[room.id]} label={room.korean} className="room-detail-photo" />
            <RoomDetails room={room} />
          </article>
        </div>
        <RateTable />
      </div>
    </Shell>
  );
}
