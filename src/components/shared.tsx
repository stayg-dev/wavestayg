"use client";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { BrandLogo } from "./brand-logo";
import { pageBanners, sitePhotos, type SitePhoto } from "@/lib/photos";

export function showReservationNotice() {
  window.alert("준비중입니다.");
}

export function ReservationButton({ children, className }: { children: React.ReactNode; className?: string }) {
  return <button type="button" className={className} onClick={showReservationNotice}>{children}</button>;
}
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
        <BrandLogo white={home} />
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
      <ReservationButton className="header-book">
        예약&조회
      </ReservationButton>
    </header>
  );
}
export function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-grid">
        <div className="footer-brand">
          <Link href="/">
            <BrandLogo white />
          </Link>
          <p>양양 죽도해변, 파도 소리와 함께 시작하는 편안한 스테이.</p>
        </div>
        <div>
          <h3>연락처</h3>
          <p><a href="tel:01080640076">010-8064-0076</a></p>
          <p><a href="mailto:wavestayg0901@gmail.com">wavestayg0901@gmail.com</a></p>
        </div>
        <div>
          <h3>바로가기</h3>
          {navigation.slice(1).map(([t, h]) => (
            <Link key={h} href={h}>
              {t === "문의사항" ? "문의하기" : t}
            </Link>
          ))}
          <ReservationButton className="footer-reservation">예약 및 조회</ReservationButton>
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
  const photo = pageBanners[english] ?? sitePhotos.about;
  return (
    <section className="page-banner">
      <Image
        src={photo.src}
        fill
        alt={photo.alt}
        style={{ objectPosition: photo.position }}
        preload
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
export function MediaBlock({ className = "", photo, sizes = "(max-width: 760px) 100vw, 50vw" }: {
  className?: string;
  photo?: SitePhoto;
  sizes?: string;
}) {
  return (
    <div className={`media-block ${photo ? "media-photo" : "media-empty"} ${className}`}>
      {photo ? <Image src={photo.src} alt={photo.alt} fill sizes={sizes} style={{ objectFit: "cover", objectPosition: photo.position }} /> : <span>객실 사진 준비중</span>}
    </div>
  );
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
