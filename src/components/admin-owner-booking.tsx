"use client";

import { useEffect, useState } from "react";
import { roomTypeLabel } from "@/lib/room-type-labels";
import { BookingApplicationForm, bookingRequest, type Application, type Owner, type PageResult } from "./website-booking";

export function AdminOwnerBooking({ onClose, onApplied }: {
  onClose: () => void;
  onApplied: (row: Application) => void;
}) {
  const [owners, setOwners] = useState<Owner[]>([]);
  const [ownerId, setOwnerId] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  const [registrationType, setRegistrationType] = useState("reservation");
  const dbOnly = registrationType !== "reservation";
  const preDeducted = registrationType === "pre-deducted";
  useEffect(() => {
    let disposed = false;
    async function load() {
      try {
        const rows: Owner[] = [];
        for (let page = 1; ; page++) {
          const result = await bookingRequest<PageResult<Owner>>(`admin/owners?page=${page}`);
          if (disposed) return;
          rows.push(...result.items);
          if (rows.length >= result.total || !result.items.length) break;
        }
        setOwners(rows.filter((owner) => owner.is_active).sort((a, b) => a.login_id.localeCompare(b.login_id, "ko", { numeric: true })));
      } catch (e) {
        if (!disposed) setError((e as Error).message);
      } finally {
        if (!disposed) setLoading(false);
      }
    }
    void load();
    return () => { disposed = true; };
  }, [revision]);
  const owner = owners.find((item) => item.id === ownerId);
  const query = search.trim().toLocaleLowerCase();
  const visible = owners.filter((item) => item.id === ownerId ||
    `${item.login_id} ${item.name} ${item.phone}`.toLocaleLowerCase().includes(query) ||
    (query.replace(/\D/g, "").length >= 4 && item.phone.replace(/\D/g, "").includes(query.replace(/\D/g, ""))));

  return <section className="portal-card" aria-labelledby="manual-booking-title">
    <div className="portal-row">
      <h2 id="manual-booking-title">수분양자 수동 예약</h2>
      <button type="button" disabled={busy} onClick={onClose}>닫기</button>
    </div>
    <fieldset className="portal-registration-type" disabled={busy}>
      <legend>등록 유형</legend>
      <div className="portal-registration-options">
        <label>
          <input type="radio" name="registration_type" value="reservation" checked={registrationType === "reservation"} onChange={() => setRegistrationType("reservation")} />
          예약 수동등록
        </label>
        <label>
          <input type="radio" name="registration_type" value="db-only" checked={registrationType === "db-only"} onChange={() => setRegistrationType("db-only")} />
          DB만 등록
        </label>
        <label>
          <input type="radio" name="registration_type" value="pre-deducted" checked={preDeducted} onChange={() => setRegistrationType("pre-deducted")} />
          이미 차감된 내역 등록
        </label>
      </div>
    </fieldset>
    <p>{preDeducted
      ? "엑셀 등에서 이미 잔여 박수에 반영한 이용 내역을 저장합니다. 잔여 0박이어도 등록 가능하며 추가 차감·취소 시 복원·PMS 판매일보 생성·알림톡 발송은 하지 않습니다."
      : dbOnly
      ? "예약 내역 저장과 잔여 박수 차감만 처리합니다. PMS 판매일보를 생성하거나 알림톡을 발송하지 않습니다."
      : "전화 예약을 대신 등록합니다. 등록하면 잔여 박수가 차감되고 PMS 판매일보가 생성되며, 입력한 투숙객 연락처로 예약확정 알림톡 1건이 자동 발송됩니다."}</p>
    <p>{preDeducted ? "과거 이용 내역을 여러 건 등록할 수 있습니다. 날짜·객실·연락처와 이미 박수가 반영된 내역인지 확인해 주세요." : "과거 날짜와 당일 예약도 등록할 수 있습니다. 객실 수·최대 숙박 박수·잔여 혜택 규정은 적용됩니다. 날짜·객실·추가 요금과 연락처를 확인한 후 등록해 주세요."}</p>
    {loading ? <p role="status">수분양자 명부를 불러오는 중…</p> : error ? <div role="alert">
      <p className="portal-error">{error}</p>
      <button type="button" onClick={() => { setError(""); setLoading(true); setRevision((n) => n + 1); }}>다시 불러오기</button>
    </div> : <>
      <fieldset disabled={busy}>
        <div className="portal-grid">
          <label>수분양자 검색
            <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="호실, 이름 또는 전화번호" />
          </label>
          <label>예약할 수분양자
            <select value={ownerId} onChange={(event) => setOwnerId(event.target.value)}>
              <option value="">수분양자를 선택해 주세요</option>
              {visible.map((item) => <option key={item.id} value={item.id}>{item.login_id}호 · {item.name} · {item.phone}</option>)}
            </select>
          </label>
        </div>
      </fieldset>
      {!owners.length && <p>예약 가능한 활성 수분양자 계정이 없습니다.</p>}
      {!!owners.length && !visible.length && <p>검색 결과가 없습니다.</p>}
      {owner && <>
        <p><strong>{owner.login_id}호 · {owner.name}</strong> / 보유 타입: {roomTypeLabel(owner.room_type_name)}</p>
        <p>{owner.benefit_year}년 잔여 {owner.annual_nights + owner.carryover_nights}박 · 올해 {owner.annual_nights}박 / 이월 {owner.carryover_nights}박</p>
        <BookingApplicationForm key={`${owner.id}:${registrationType}`} owner={owner} adminOwnerBooking dbOnly={dbOnly} preDeducted={preDeducted} onBusyChange={setBusy} onApplied={(row) => onApplied({ ...row, owner_login_id: owner.login_id, owner_name: owner.name })} />
      </>}
    </>}
  </section>;
}
