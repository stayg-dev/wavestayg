"use client";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
export const navigation = [
  ["홈", "/"],
  ["객실", "/rooms/"],
  ["부대시설", "/facilities/"],
  ["오시는 길", "/location/"],
  ["공지사항", "/notice/"],
  ["문의사항", "/contact/"],
];
export function Header({ home = false }: { home?: boolean }) {
  const [open, setOpen] = useState(false);
  const path = usePathname();
  return (
    <header className={`site-header ${home ? "over-hero" : ""}`}>
      <Link href="/" aria-label="Wave STAY-G 홈" className="logo">
        <Image
          src={`/assets/logo-${home ? "white" : "color"}.png`}
          alt="WAVE STAY-G"
          width={189}
          height={104}
          priority
        />
      </Link>
      <button
        className="menu-toggle"
        aria-label="메뉴"
        aria-expanded={open}
        aria-controls="navigation"
        onClick={() => setOpen(!open)}
      >
        {open ? "닫기" : "메뉴"}
      </button>
      <nav id="navigation" className={open ? "open" : ""} aria-label="주 메뉴">
        {navigation.map(([title, href]) => (
          <Link
            key={href}
            href={href}
            aria-current={path === href ? "page" : undefined}
            onClick={() => setOpen(false)}
          >
            {title}
          </Link>
        ))}
      </nav>
      <Link className="header-book" href="/reservation/">
        예약&조회
      </Link>
    </header>
  );
}
export function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-grid">
        <div className="footer-brand">
          <Link href="/">
            <Image
              src="/assets/logo-white.png"
              width={189}
              height={101}
              alt="WAVE STAY-G"
            />
          </Link>
          <p>양양 죽도해변, 파도 소리와 함께 시작하는 편안한 스테이.</p>
        </div>
        <div>
          <h3>연락처</h3>
          <p>010-0000-0000</p>
          <p>010-0000-0000</p>
        </div>
        <div>
          <h3>바로가기</h3>
          {navigation.slice(1).map(([t, h]) => (
            <Link key={h} href={h}>
              {t === "문의사항" ? "문의하기" : t}
            </Link>
          ))}
          <Link href="/reservation/">예약 및 조회</Link>
        </div>
        <div>
          <h3>주소</h3>
          <a href="https://naver.me/FhUgubIv" target="_blank" rel="noreferrer">
            강원 양양군 현남면 동산큰길 17-5
          </a>
        </div>
      </div>
      <div className="copyright">© 2026 Wave STAYG. All rights reserved</div>
    </footer>
  );
}
export function Banner({
  title,
  english,
  description,
}: {
  title: string;
  english: string;
  description?: string;
}) {
  return (
    <section className="page-banner">
      <Image
        src="/assets/50-145-imgRectangle29.png"
        fill
        alt="햇살이 들어오는 오션뷰 객실"
        priority
        sizes="100vw"
      />
      <div className="banner-shade" />
      <div className="container banner-text">
        <p>{english}</p>
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
    </section>
  );
}
export function Shell({
  children,
  title,
  english,
  description,
}: {
  children: React.ReactNode;
  title: string;
  english: string;
  description?: string;
}) {
  return (
    <>
      <Header />
      <main id="main">
        <Banner title={title} english={english} description={description} />
        {children}
      </main>
      <Footer />
    </>
  );
}
// Solid gray media areas intentionally match unfilled media regions in Figma.
export function MediaBlock({ className = "" }: { className?: string }) {
  return <div className={`media-block ${className}`} aria-hidden="true" />;
}
export function Tags({
  items = ["Ocean Front", "78㎡", "King"],
}: {
  items?: string[];
}) {
  return (
    <div className="tags">
      {items.map((x, i) => (
        <span key={i}>{x}</span>
      ))}
    </div>
  );
}
export function SectionTitle({
  eyebrow,
  children,
}: {
  eyebrow: string;
  children: React.ReactNode;
}) {
  return (
    <div className="section-title">
      <p className="eyebrow">{eyebrow}</p>
      <h2>{children}</h2>
    </div>
  );
}
export const formatPrice = (n: number) => "₩" + n.toLocaleString("ko-KR");
export const description = "바다를 정면으로 마주하는 최상위 스위트";
export const description2 = "개별 테라스와 프리미엄 어메니티가 제공됩니다.";
export function RoomInfo({
  price = 580000,
  href = "/reservation/book/",
}: {
  price?: number;
  href?: string;
}) {
  return (
    <div className="room-info">
      <Tags />
      <h3>Ocean Suite</h3>
      <p className="muted room-korean">오션 스위트</p>
      <p className="room-description">
        {description}
        <br />
        {description2}
      </p>
      <div className="price-row">
        <p>
          <strong>{formatPrice(price)}</strong>{" "}
          <span className="muted">/ 1박</span>
        </p>
        <Link className="pill small" href={href}>
          예약하기
        </Link>
      </div>
    </div>
  );
}
