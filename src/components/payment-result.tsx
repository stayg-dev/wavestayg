"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ReservationFrame, ReservationSteps } from "./general-reservation";
import styles from "./general-reservation.module.css";
import {
  paymentRequest,
  paymentStatusLabels,
  type PaymentState,
} from "@/lib/payments";
export function PaymentResult({ orderId }: { orderId: string }) {
  const [state, setState] = useState<PaymentState | null>(null),
    [error, setError] = useState("");
  const [reload, setReload] = useState(0);
  useEffect(() => {
    let active = true,
      timer: ReturnType<typeof setTimeout> | undefined;
    const until = Date.now() + 120000;
    async function poll() {
      try {
        const data = await paymentRequest<PaymentState>(`${orderId}/status`);
        if (!active) return;
        setState(data);
        setError("");
        if (
          [
            "awaiting_auth",
            "processing",
            "recovery_pending",
            "refund_pending",
          ].includes(data.status) &&
          Date.now() < until
        )
          timer = setTimeout(poll, 3000);
      } catch (e) {
        if (active) setError((e as Error).message);
      }
    }
    void poll();
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [orderId, reload]);
  return (
    <ReservationFrame>
      <ReservationSteps step={4} />
      <section className={styles.receipt} aria-live="polite">
        {state?.status === "paid" && (
          <span className={styles.successIcon} aria-hidden="true">
            <Image
              src="/assets/reservation/success-circle.svg"
              width={102}
              height={102}
              alt=""
            />
            <Image
              src="/assets/reservation/success-check.svg"
              width={54}
              height={39}
              alt=""
            />
          </span>
        )}
        <h2>
          {state
            ? (paymentStatusLabels[state.status] ?? state.status)
            : "결제 상태 확인"}
        </h2>
        {state && (
          <>
            <div className={styles.receiptNumber}>
              <small>예약번호</small>
              <strong>{state.reservation_number ?? state.application_id}</strong>
            </div>
            <p>
              결제 요청 금액 {state.amount.toLocaleString()}원
              {state.refunded_amount > 0
                ? ` · 환불 ${state.refunded_amount.toLocaleString()}원`
                : ""}
            </p>
            {state.status === "paid" ? (
              <p>
                카드 결제가 완료되어 예약이 접수되었습니다. 호텔에서 확인 후
                예약 확정 알림톡을 발송합니다. 취소·변경은 프런트에 문의해
                주세요.
              </p>
            ) : ["failed", "expired", "refunded"].includes(state.status) ? (
              <p>해당 예약은 종료되었습니다.</p>
            ) : (
              <p>
                결제 결과를 확인 중입니다. 중복 결제를 피할 수 있도록 상태 확인
                전에는 새로 예약하지 마세요. 확인이 계속 지연되면 신청 번호와
                함께 프런트에 문의해 주세요.
              </p>
            )}
          </>
        )}
        {error && (
          <p className={styles.error} role="alert">
            {error}
          </p>
        )}
        <div className={styles.receiptActions}>
          <button
            className={styles.secondary}
            type="button"
            onClick={() => setReload((v) => v + 1)}
          >
            상태 새로고침
          </button>
          <Link
            className={styles.primary}
            href={
              state
                ? `/reservation/lookup/?id=${state.reservation_number ?? state.application_id}`
                : "/reservation/lookup/"
            }
          >
            예약 조회
          </Link>
        </div>
      </section>
    </ReservationFrame>
  );
}
