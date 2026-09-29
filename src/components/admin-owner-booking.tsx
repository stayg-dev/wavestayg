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
    <p>전화 예약을 대신 등록합니다. 등록하면 잔여 박수가 차감되고 PMS 판매일보가 생성됩니다. 등록 시 접수 알림톡은 발송하지 않습니다.</p>
    <p>수분양자 예약과 동일한 날짜·객실 수·잔여 박수 규정이 적용됩니다. 확정 안내는 PMS에서 발송해 주세요.</p>
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
        <p>아래에 입력한 투숙객 연락처로 PMS 예약확정 시 알림톡 1건을 발송합니다.</p>
        <BookingApplicationForm key={owner.id} owner={owner} adminOwnerBooking onBusyChange={setBusy} onApplied={(row) => onApplied({ ...row, owner_login_id: owner.login_id, owner_name: owner.name })} />
      </>}
    </>}
  </section>;
}
