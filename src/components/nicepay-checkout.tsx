"use client";
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { type PreparedPayment } from '@/lib/payments';
declare global { interface Window { goPay?: (form: HTMLFormElement) => void; nicepaySubmit?: () => void; nicepayClose?: () => void; } }
let sdk: Promise<void> | null = null;
function loadNicepay() {
  if (window.goPay) return Promise.resolve();
  if (!sdk) sdk = new Promise<void>((resolve, reject) => {
    const script = document.createElement('script'); script.src = 'https://pg-web.nicepay.co.kr/v3/common/js/nicepay-pgweb.js'; script.async = true;
    script.onload = () => window.goPay ? resolve() : reject(new Error('결제창을 준비하지 못했습니다.'));
    script.onerror = () => { sdk = null; script.remove(); reject(new Error('NICEPAY 결제창을 불러오지 못했습니다.')); }; document.head.appendChild(script);
  });
  return sdk;
}
export function NicepayCheckout({ prepared }: { prepared: PreparedPayment }) {
  const form = useRef<HTMLFormElement>(null), opened = useRef(false);
  const [ready, setReady] = useState(false), [error, setError] = useState(''), [busy, setBusy] = useState(false), [launched, setLaunched] = useState(false);
  useEffect(() => {
    let active = true;
    window.nicepaySubmit = () => { if (form.current) HTMLFormElement.prototype.submit.call(form.current); };
    window.nicepayClose = () => { if (active) { setBusy(false); setError('결제창이 닫혔습니다. 아래에서 결제 결과를 확인해 주세요.'); } };
    loadNicepay().then(() => { if (active) setReady(true); }).catch((e: Error) => { if (active) setError(e.message); });
    return () => { active = false; delete window.nicepaySubmit; delete window.nicepayClose; };
  }, []);
  function pay() {
    if (!form.current || !window.goPay || opened.current) return;
    if (Date.now() >= Date.parse(prepared.expires_at)) { setError('결제 시간이 만료되었습니다. 결제 상태를 확인해 주세요.'); return; }
    opened.current = true; setLaunched(true); setBusy(true); setError('');
    try { window.goPay(form.current); } catch { setBusy(false); setError('결제창을 열지 못했습니다. 결제 상태를 확인해 주세요.'); }
  }
  return <section className="portal-card">
    <h2>카드 결제</h2><p>신청 번호: <strong className="portal-reference">{prepared.application_id}</strong></p>
    <p>{Number(prepared.fields.Amt).toLocaleString()}원 · 결제 가능 시간 {new Date(prepared.expires_at).toLocaleTimeString('ko-KR', { timeZone: 'Asia/Seoul', hour: '2-digit', minute: '2-digit' })}까지</p>
    <p>신청 번호를 보관해 주세요. 결제 결과는 신청 번호와 설정한 비밀번호로 다시 조회할 수 있습니다.</p>
    <form ref={form} name="nicepayForm" method="post" action={prepared.fields.ReturnURL} acceptCharset="euc-kr">
      {Object.entries(prepared.fields).map(([key, value]) => <input type="hidden" key={key} name={key} value={value} />)}
    </form>
    <button type="button" disabled={!ready || busy || launched} onClick={pay}>{busy ? '결제창에서 진행해 주세요' : 'NICEPAY 카드 결제창 열기'}</button>
    <p><Link href={`/reservation/payment/?order=${prepared.order_id}`}>결제 결과 확인</Link></p>
    {error && <p className="portal-error" role="alert">{error}</p>}
  </section>;
}
