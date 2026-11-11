"use client";

import { useState, type FormEvent } from "react";
import { bookingRequest, type Owner } from "./website-booking";

export function OwnerBalanceEditor({
  owner,
  disabled,
  onSaved,
}: {
  owner: Owner;
  disabled: boolean;
  onSaved: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    const data = new FormData(e.currentTarget);
    setBusy(true);
    setError("");
    try {
      await bookingRequest(`admin/owners/${owner.id}/balance`, "POST", {
        year: owner.benefit_year,
        annual_nights: Number(data.get("annual_nights")),
        carryover_nights: owner.carryover_editable
          ? Number(data.get("carryover_nights"))
          : 0,
        expected_annual_nights: owner.annual_nights,
        expected_carryover_nights: owner.carryover_nights,
        annual_bonus_nights: Number(data.get("annual_bonus_nights")),
        expected_annual_bonus_nights: owner.annual_bonus_nights ?? 0,
      });
      setEditing(false);
      onSaved();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (!editing)
    return (
      <div className="owner-balance">
        <span>
          올해 {owner.annual_nights} · 이월 {owner.carryover_nights}
        </span>
        {owner.next_benefit_year !== undefined && <span>
          {owner.next_benefit_year}년 선사용 {owner.next_year_advance_nights} · 예약 가능 {owner.next_year_remaining_nights}
        </span>}
        {!!owner.annual_bonus_nights && <span>매년 추가 {owner.annual_bonus_nights}박 ({owner.next_benefit_year}년부터)</span>}
        <button
          type="button"
          className="admin-secondary"
          disabled={disabled || !owner.benefit_year}
          aria-label={`${owner.login_id}호 잔여 박수 수정`}
          onClick={() => {
            setError("");
            setEditing(true);
          }}
        >
          수정
        </button>
      </div>
    );

  return (
    <form
      className="owner-balance-form"
      onSubmit={save}
      aria-label={`${owner.login_id}호 잔여 박수 수정`}
    >
      <strong>{owner.benefit_year}년 잔여 박수</strong>
      <fieldset disabled={busy || disabled}>
        <div className="owner-balance-inputs">
          <label>
            올해
            <input
              name="annual_nights"
              type="number"
              min={0}
              max={365}
              step={1}
              required
              defaultValue={owner.annual_nights}
              autoFocus
            />
          </label>
          <label>
            이월
            <input
              name="carryover_nights"
              type="number"
              min={0}
              max={365}
              step={1}
              required
              defaultValue={owner.carryover_nights}
              disabled={!owner.carryover_editable}
            />
          </label>
        </div>
        {!owner.carryover_editable && (
          <p className="admin-muted">
            이월 박수는 2028년부터 매년 3월 31일까지 수정할 수 있습니다.
          </p>
        )}
        <label>
          매년 추가 박수 ({owner.next_benefit_year}년부터)
          <input name="annual_bonus_nights" type="number" min={0} max={350} step={1} required defaultValue={owner.annual_bonus_nights ?? 0} />
        </label>
        <p className="admin-muted">
          기본 15박에 매년 더합니다. 0박이면 추가 지급하지 않습니다.
          올해 잔여 박수는 위 입력값으로 저장되며, 추가분에도 기존 이월 규정이 적용됩니다.
        </p>
        {error && (
          <p role="alert" className="portal-error">
            {error}
          </p>
        )}
        <div className="admin-actions">
          <button type="submit">{busy ? "저장 중…" : "저장"}</button>
          <button
            type="button"
            className="admin-secondary"
            onClick={() => setEditing(false)}
          >
            취소
          </button>
        </div>
      </fieldset>
    </form>
  );
}
