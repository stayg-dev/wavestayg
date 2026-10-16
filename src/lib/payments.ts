export type PaymentConfiguration = { enabled: boolean; ready: boolean; policy_version: string; policy_text: string };
export type PreparedPayment = { order_id: string; application_id: string; reservation_number?: string; expires_at: string; fields: Record<string, string> };
export type PaymentState = { order_id: string; application_id: string; reservation_number?: string; amount: number; refunded_amount: number; status: string; expires_at: string; created_at: string; environment: string };
export const paymentStatusLabels: Record<string, string> = { awaiting_auth: '결제 대기', processing: '승인 확인 중', paid: '결제 완료 · 예약 접수', failed: '결제 미완료 · 예약 취소', expired: '결제 시간 만료', recovery_pending: '결제 결과 확인 중', refund_pending: '환불 처리 중', refunded: '전액 환불 완료', manual_review: '관리자 확인 중' };
export async function paymentRequest<T>(path: string, body?: unknown): Promise<T> {
  const response = await fetch(`/api/payments/${path}/`, { method: body === undefined ? 'GET' : 'POST', cache: 'no-store', headers: body === undefined ? undefined : { 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) });
  const data = await response.json(); if (!response.ok) throw new Error(data.error ?? '결제 상태를 확인하지 못했습니다.'); return data;
}
