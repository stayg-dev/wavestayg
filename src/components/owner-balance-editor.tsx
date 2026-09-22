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
