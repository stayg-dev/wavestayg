"use client";
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { bookingRequest, PortalShell, Pagination, type PageResult } from './website-booking';
import { type PaymentState, paymentStatusLabels } from '@/lib/payments';
type AdminPayment = PaymentState & { moid: string; tid: string | null; last_error: string | null; review_note: string; provider?: string; mid?: string; inquiry_state?: string | null; inquiry_error?: string | null; last_inquiry_at?: string | null; observations?: { source: string; state: string; is_verified: boolean; error_code: string | null; observed_at: string }[]; jobs?: { id: string; kind: string; status: string; attempts: number; available_at: string; error_code: string | null }[]; refunds: { id: string; moid: string; status: string; amount: number; reason: string }[] };
const inquiryLabels: Record<string, string> = { queued: '접수 대기', checking: '확인 중', retry_scheduled: '재조회 예정', matched: '기존 결제 내역과 일치', manual_review: '관리자 확인 필요' };
const observationSources: Record<string, string> = { approval: '승인 응답', net_cancel: '망취소 응답', refund: '환불 응답', inquiry: '거래조회', manual: '수동 대사' };
const observationStates: Record<string, string> = { approved: '승인 확인', cancelled: '취소 확인', not_found: '거래 없음', unknown: '미확정' };
export function PaymentAdmin() {
  const [page, setPage] = useState(1), [version, setVersion] = useState(0), [data, setData] = useState<PageResult<AdminPayment> | null>(null), [error, setError] = useState(''), [busy, setBusy] = useState(false);
  const [selected, setSelected] = useState<AdminPayment | null>(null), [reason, setReason] = useState(''), [outcome, setOutcome] = useState('refunded');
  const pending = useRef<{ key: string; id: string } | null>(null);
  async function requestInquiry(row: AdminPayment) {
    setBusy(true); setError('');
    try { await bookingRequest(`admin/payments/${row.order_id}/inquiry`, 'POST', {}); setVersion(value => value + 1); }
    catch (error) { setError((error as Error).message); }
    finally { setBusy(false); }
  }
  useEffect(() => {
    let active = true;
    bookingRequest<PageResult<AdminPayment>>(`admin/payments?page=${page}`).then(value => { if (active) { setData(value); setError(''); } }).catch((e: Error) => { if (active) setError(e.message); });
    return () => { active = false; };
  }, [page, version]);
  async function submit(e: React.FormEvent) {
    e.preventDefault(); if (!selected) return;
    const review = selected.status === 'manual_review';
    if (!window.confirm(review ? `NICEPAY 관리자에서 확인한 결과를 "${paymentStatusLabels[outcome]}"로 기록할까요? 이 작업은 PG에 승인·취소 요청을 보내지 않습니다.` : `${selected.amount.toLocaleString()}원 전액을 카드 취소하고 예약을 취소할까요?`)) return;
    setBusy(true); setError('');
    const key = `${selected.order_id}:${reason}`;
    if (pending.current?.key !== key) pending.current = { key, id: crypto.randomUUID() };
    try {
      await bookingRequest(`admin/payments/${selected.order_id}/${review ? 'reconcile' : 'refund'}`, 'POST', review ? { outcome, evidence: reason } : { request_id: pending.current.id, reason });
      setSelected(null); pending.current = null; setVersion(v => v + 1);
    } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }
  return <PortalShell title="온라인 결제·환불" navigation={<nav><Link href="/admin/reservations/">예약 관리</Link><Link href="/admin/settings/">요금·판매 설정</Link></nav>}>
    <p>결제 완료 후 호텔에서 예약을 확인해 주세요. 환불은 전액 취소를 지원하며, 부분 환불과 이용 완료 예약은 별도 확인이 필요합니다.</p>
    <p>거래조회는 승인·환불 요청을 보내지 않습니다. 조회 상태만으로 승인 금액이나 전액 취소를 확정하지 않습니다.</p>
    <button type="button" onClick={() => setVersion(v => v + 1)} disabled={busy}>결제 상태 새로고침</button>
    {error && <p className="portal-error" role="alert">{error}</p>}
    {selected && <form className="portal-card" onSubmit={submit}><h2>{selected.status === 'manual_review' ? 'NICEPAY 거래 대사' : '카드 전액 환불'}</h2><p>{selected.reservation_number ?? selected.application_id} · {selected.amount.toLocaleString()}원</p>
      <fieldset disabled={busy}>
        {selected.status === 'manual_review' && <><p>NICEPAY 관리자에서 TID·주문번호·금액을 확인한 후 확정하세요. 아래 저장은 확인된 거래 결과를 PMS에 반영합니다.</p><label>확인한 거래 결과<select value={outcome} onChange={e => setOutcome(e.target.value)}><option value="refunded">전액 취소 확인</option><option value="paid">승인 유지 확인</option><option value="failed">승인 없음 확인</option></select></label></>}
        <label>{selected.status === 'manual_review' ? '확인자·확인 시각·거래 근거 (10자 이상)' : '환불 사유'}<textarea required minLength={selected.status === 'manual_review' ? 10 : 2} maxLength={selected.status === 'manual_review' ? 1000 : 300} value={reason} onChange={e => setReason(e.target.value)} /></label>
        <button>{busy ? '처리 중…' : '확인 후 처리'}</button> <button type="button" onClick={() => setSelected(null)}>닫기</button>
      </fieldset>
    </form>}
    {data?.items.map(row => <article key={row.order_id} className="portal-card"><div className="portal-row"><strong>{paymentStatusLabels[row.status] ?? row.status}</strong><span>{row.environment === 'test' ? '테스트' : '운영'} · {row.amount.toLocaleString()}원</span></div><p>예약번호 <span className="portal-reference">{row.reservation_number ?? row.application_id}</span></p><p className="portal-reference">주문 {row.moid}<br />TID {row.tid ?? '인증 전'}</p><p>{new Date(row.created_at).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })} · 환불 {row.refunded_amount.toLocaleString()}원</p>
      {row.last_error && <p>확인 코드: {row.last_error}</p>}{row.review_note && <p>{row.review_note}</p>}
      {row.mid && <p>결제사 {row.provider === 'nicepay' ? 'NICEPAY' : row.provider} · 가맹점 {row.mid}</p>}
      {row.inquiry_state && <p>거래 확인: {inquiryLabels[row.inquiry_state] ?? row.inquiry_state}{row.last_inquiry_at && ` · ${new Date(row.last_inquiry_at).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}`}</p>}
      {row.inquiry_error && <p>조회 확인 코드: {row.inquiry_error} · 거래 내역과 승인·취소 금액을 확인해 주세요.</p>}
      {row.jobs?.filter(job => ['pending', 'running'].includes(job.status)).map(job => <p key={job.id}>{job.kind === 'inquiry' ? '거래조회' : '결제 처리'} {job.status === 'running' ? '실행 중' : '대기'} · {job.attempts}회 시도{job.status === 'pending' && ` · 다음 실행 ${new Date(job.available_at).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}`}</p>)}
      {!!row.observations?.length && <details><summary>거래 확인 이력</summary>{row.observations.map((item, index) => <p key={index}>{new Date(item.observed_at).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })} · {observationSources[item.source] ?? item.source} · {observationStates[item.state] ?? item.state}{item.error_code && ` · ${item.error_code}`}</p>)}</details>}
      {row.tid && <button disabled={busy} type="button" onClick={() => void requestInquiry(row)}>거래 다시 조회</button>}
      {row.refunds.map(refund => <p key={refund.id}>환불 {refund.amount.toLocaleString()}원 · {refund.status} · {refund.reason}</p>)}
      {['paid', 'manual_review'].includes(row.status) && <button disabled={busy} type="button" onClick={() => { setSelected(row); setReason(''); setOutcome('refunded'); }}>{row.status === 'paid' ? '전액 환불' : '거래 확인 후 대사'}</button>}
    </article>)}
    {data && <Pagination page={page} total={data.total} onPage={setPage} />}
  </PortalShell>;
}
