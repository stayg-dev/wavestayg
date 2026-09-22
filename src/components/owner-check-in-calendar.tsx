"use client";

import { useId, useRef, useState } from "react";
import { firstOwnerCheckIn, ownerCheckInAllowed } from "@/lib/owner-booking-dates";

export function OwnerCheckInCalendar({ value, today, onChange }: {
  value: string;
  today: string;
  onChange: (value: string) => void;
}) {
  const id = useId();
  const trigger = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState(() => (value || firstOwnerCheckIn(today) || today).slice(0, 7));
  const first = new Date(`${month}-01T00:00:00Z`);
  const year = first.getUTCFullYear(), m = first.getUTCMonth();
  const days = new Date(Date.UTC(year, m + 1, 0)).getUTCDate();
  const moveMonth = (offset: number) => setMonth(new Date(Date.UTC(year, m + offset, 1)).toISOString().slice(0, 7));
  return (
    <div className="owner-date-picker" onKeyDown={(event) => {
      if (event.key === "Escape") { setOpen(false); trigger.current?.focus(); }
    }}>
      <span id={`${id}-label`}>체크인</span>
      <button type="button" ref={trigger} className="owner-date-trigger" aria-labelledby={`${id}-label ${id}-value`}
        aria-expanded={open} aria-controls={`${id}-calendar`} onClick={() => setOpen(!open)}>
        <span id={`${id}-value`}>{value || "날짜 선택"}</span><span aria-hidden="true">▦</span>
      </button>
      {open && <div id={`${id}-calendar`} className="owner-date-calendar" role="group" aria-label="체크인 날짜 선택">
        <div className="owner-date-month">
          <button type="button" aria-label="이전 달" disabled={month <= today.slice(0, 7)} onClick={() => moveMonth(-1)}>‹</button>
          <strong aria-live="polite">{year}년 {m + 1}월</strong>
          <button type="button" aria-label="다음 달" disabled={month >= "2027-12"} onClick={() => moveMonth(1)}>›</button>
        </div>
        <div className="owner-date-days">
          {["일", "월", "화", "수", "목", "금", "토"].map(day => <span key={day}>{day}</span>)}
          {Array.from({ length: first.getUTCDay() }, (_, i) => <span key={`blank-${i}`} />)}
          {Array.from({ length: days }, (_, i) => {
            const date = `${month}-${String(i + 1).padStart(2, "0")}`;
            return <button type="button" key={date} disabled={!ownerCheckInAllowed(date, today)} aria-label={date} aria-pressed={date === value}
              onClick={() => { onChange(date); setOpen(false); trigger.current?.focus(); }}>{i + 1}</button>;
          })}
        </div>
        <p>비수기는 입실 최소 14일 전에 신청해야 합니다.</p>
      </div>}
    </div>
  );
}
