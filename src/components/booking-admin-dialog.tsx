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
  const cancelTitle = row.is_pre_deducted ? "내역 등록 취소" : row.is_db_only ? "DB 등록 취소 및 박수 복원" : "예약 취소";

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
      action === "migrate"
        ? "기존 신청을 PMS로 이관하고 무료 박수를 차감할까요? 접수 알림톡은 소급 발송하지 않습니다."
        : row.is_pre_deducted
          ? "이미 차감된 내역 등록만 취소할까요? 잔여 박수는 변경되지 않습니다."
        : row.is_db_only
          ? "DB 등록을 취소하고 차감했던 박수를 복원할까요?"
          : "홈페이지 예약을 취소하고 연결된 판매일보에 취소를 반영할까요?";
    if (!window.confirm(message)) return;
    setBusy(true);
    setError("");
    const retained = fields.get("retained_nights");
    try {
      await bookingRequest(`admin/applications/${row.id}`, "POST", {
        action,
        note: fields.get("note") ?? "",
        is_peak_confirmed: fields.get("peak") === "on",
        is_upgrade_confirmed: fields.get("upgrade") === "on",
        ...(action === "cancel" &&
        !row.is_db_only &&
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
      {row.is_pre_deducted && <p className="admin-muted">이미 차감된 내역입니다. 등록하거나 취소해도 잔여 박수는 변경되지 않습니다.</p>}
      {!row.is_db_only && row.report_ids.length > 0 && (
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
          <h2>{cancelTitle}</h2>
          {row.is_pre_deducted ? (
            <p className="admin-muted">이용 내역 등록만 취소합니다. 박수 복원, 판매일보 처리와 알림톡 발송은 하지 않습니다.</p>
          ) : row.is_db_only ? (
            <p className="admin-muted">
              등록 내역을 취소하고 차감했던 박수를 전부 되돌립니다. 취소 위약 규정은 적용하지 않으며, 판매일보 처리와 알림톡 발송은 하지 않습니다.
            </p>
          ) : row.kind === "owner" && (
            <p className="admin-muted">
              7일 전까지 무료, 3일 전 50% 차감(내림), 당일·노쇼 100% 차감입니다.
              4~6일 전 또는 1~2일 전은 운영 기준 확인 후 차감 유지 박수를 입력해
              주세요. 만료된 박수는 복원하지 않습니다.
            </p>
          )}
          <fieldset disabled={busy}>
            {!row.is_db_only && row.kind === "owner" && (
              <label>
                차감 유지 박수 (명시된 규정 적용 시 비워두세요)
                <input name="retained_nights" type="number" min={0} max={6} />
              </label>
            )}
            <label>
              {row.is_db_only ? "등록 취소 메모 (선택)" : "취소 사유 및 안내"}
              <textarea name="note" required={!row.is_db_only} maxLength={1000} rows={3} />
            </label>
            <div className="admin-actions">
              <button type="submit" className="admin-danger">
                {busy ? "처리 중…" : row.is_db_only ? cancelTitle : "취소 확정"}
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
      ) : ["pending", "registered", "approved"].includes(row.status) ? (
        <form onSubmit={submit}>
          {row.status === "pending" && <p className="admin-muted">기존 대기 신청입니다. 확인 후 PMS로 이관할 수 있습니다. 접수 알림톡은 소급 발송하지 않습니다.</p>}
          <div className="admin-actions">
            {row.status === "pending" && <button type="submit" value="migrate" disabled={busy}>기존 신청 PMS 이관</button>}
            <button type="button" className="admin-danger" disabled={busy} onClick={() => setCancelling(true)}>{row.is_pre_deducted ? "내역 등록 취소" : row.is_db_only ? "DB 등록 취소" : "예약 취소"}</button>
          </div>
        </form>
      ) : null}
    </dialog>
  );
}
