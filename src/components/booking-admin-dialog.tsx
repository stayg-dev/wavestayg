"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  ApplicationCard,
  bookingRequest,
  type Application,
} from "./website-booking";

export function BookingAdminDialog({
  application: row,
  onClose,
  onChanged,
}: {
  application: Application;
  onClose: () => void;
  onChanged: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [cancelling, setCancelling] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const element = dialog.current!;
    const overflow = document.body.style.overflow;
    element.showModal();
    document.body.style.overflow = "hidden";
    return () => {
      element.close();
      document.body.style.overflow = overflow;
    };
  }, []);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    const fields = new FormData(e.currentTarget);
    const action = cancelling
      ? "cancel"
      : ((e.nativeEvent as SubmitEvent).submitter as HTMLButtonElement)?.value;
    if (!action) return;
    const message =
      action === "approve"
        ? "예약을 승인하고 호실 미배정 상태로 PMS 판매일보를 생성할까요?"
        : action === "reject"
          ? "이 신청을 반려할까요?"
          : "홈페이지 예약을 취소하고 연결된 판매일보에 취소를 반영할까요?";
    if (!window.confirm(message)) return;
    setBusy(true);
    setError("");
    const retained = fields.get("retained_nights");
    try {
      await bookingRequest(`admin/applications/${row.id}`, "POST", {
        action,
        note: fields.get("note"),
        is_peak_confirmed: fields.get("peak") === "on",
        is_upgrade_confirmed: fields.get("upgrade") === "on",
        ...(action === "cancel" &&
        row.kind === "owner" &&
        typeof retained === "string" &&
        retained !== ""
          ? { retained_nights: Number(retained) }
          : {}),
      });
      onChanged();
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }

  return (
    <dialog
      ref={dialog}
      className="booking-detail-dialog"
      aria-labelledby="booking-detail-title"
      onCancel={(e) => {
        e.preventDefault();
        if (!busy) onClose();
      }}
      onClick={(e) => {
        if (e.target !== e.currentTarget || busy) return;
        const rect = e.currentTarget.getBoundingClientRect();
        if (
          e.clientX < rect.left ||
          e.clientX > rect.right ||
          e.clientY < rect.top ||
          e.clientY > rect.bottom
        )
          onClose();
      }}
    >
      <div className="portal-row booking-detail-heading">
        <div>
          <h2 id="booking-detail-title">예약 상세</h2>
          <p>
            {row.kind === "owner"
              ? `수분양자 · ${row.owner_login_id ?? "미등록"}호 ${row.owner_name ?? ""}`
              : "일반 예약"}
          </p>
        </div>
        <button
          type="button"
          className="admin-secondary"
          disabled={busy}
          onClick={onClose}
          autoFocus
        >
          닫기
        </button>
      </div>
      <ApplicationCard row={row} />
      {row.report_ids.length > 0 && (
        <p className="admin-muted">
          PMS 판매일보 반영 {row.report_ids.length}실
          {row.status === "cancelled" ? " · 취소 처리" : ""}
        </p>
      )}
      {error && (
        <p role="alert" className="portal-error">
          {error}
        </p>
      )}
      {cancelling ? (
        <form onSubmit={submit}>
          <h2>예약 취소</h2>
          {row.kind === "owner" && (
            <p className="admin-muted">
              7일 전까지 무료, 3일 전 50% 차감(내림), 당일·노쇼 100% 차감입니다.
              4~6일 전 또는 1~2일 전은 운영 기준 확인 후 차감 유지 박수를 입력해
              주세요. 만료된 박수는 복원하지 않습니다.
            </p>
          )}
          <fieldset disabled={busy}>
            {row.kind === "owner" && (
              <label>
                차감 유지 박수 (명시된 규정 적용 시 비워두세요)
                <input name="retained_nights" type="number" min={0} max={6} />
              </label>
            )}
            <label>
              취소 사유 및 안내
              <textarea name="note" required maxLength={1000} rows={3} />
            </label>
            <div className="admin-actions">
              <button type="submit" className="admin-danger">
                {busy ? "처리 중…" : "취소 확정"}
              </button>
              <button
                type="button"
                className="admin-secondary"
                onClick={() => {
                  setCancelling(false);
                  setError("");
                }}
              >
                돌아가기
              </button>
            </div>
          </fieldset>
        </form>
      ) : row.status === "pending" ? (
        <form onSubmit={submit}>
          <h2>예약 승인</h2>
          <p className="admin-muted">
            승인하면 신청한 객실 타입과 수량으로 판매일보가 생성됩니다. 호실은
            PMS에서 배정할 수 있습니다.
          </p>
          <fieldset disabled={busy}>
            {row.kind === "owner" && (
              <>
                <label className="portal-check">
                  <input name="peak" type="checkbox" />
                  성수기 이용 조건·연 1회·운영 일정을 확인했습니다.
                </label>
                <label className="portal-check">
                  <input name="upgrade" type="checkbox" />
                  보유 타입과 다른 객실의 이용 가능 여부 및 차액 50% 현장 정산을
                  안내했습니다.
                </label>
              </>
            )}
            <label>
              승인 / 반려 안내 (선택 · 고객에게 표시)
              <textarea name="note" maxLength={1000} rows={3} />
            </label>
            <div className="admin-actions">
              <button value="approve" type="submit">
                {busy ? "처리 중…" : "승인 및 PMS 반영"}
              </button>
              <button value="reject" type="submit" className="admin-secondary">
                반려
              </button>
              <button
                type="button"
                className="admin-danger"
                onClick={() => {
                  setCancelling(true);
                  setError("");
                }}
              >
                예약 취소
              </button>
            </div>
          </fieldset>
        </form>
      ) : row.status === "approved" ? (
        <button
          type="button"
          className="admin-danger"
          onClick={() => setCancelling(true)}
        >
          예약 취소
        </button>
      ) : null}
    </dialog>
  );
}
