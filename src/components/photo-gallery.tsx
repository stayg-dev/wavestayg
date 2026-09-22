"use client";

import Image from "next/image";
import { useState } from "react";
import type { SitePhoto } from "@/lib/photos";

export function PhotoGallery({ photos, label, className = "" }: {
  photos: SitePhoto[];
  label: string;
  className?: string;
}) {
  const [index, setIndex] = useState(0);
  const current = photos[index];
  if (!current) return <div className={`media-block media-empty ${className}`}><span>{label} 사진 준비중</span></div>;
  function change(offset: number) { setIndex((value) => (value + offset + photos.length) % photos.length); }
  return (
    <div className={`media-block photo-gallery ${className}`} role="region" aria-label={`${label} 사진`}>
      <Image src={current.src} alt={current.alt} fill sizes="(max-width: 760px) 100vw, 55vw" style={{ objectFit: "cover", objectPosition: current.position }} />
      {photos.length > 1 && (
        <>
          <button type="button" className="gallery-arrow gallery-previous" onClick={() => change(-1)} aria-label={`${label} 이전 사진`}>‹</button>
          <button type="button" className="gallery-arrow gallery-next" onClick={() => change(1)} aria-label={`${label} 다음 사진`}>›</button>
          <div className="gallery-pagination">
            <span aria-live="polite" aria-atomic="true">{index + 1} / {photos.length}</span>
            <div>{photos.map((item, i) => (
              <button type="button" key={item.src} aria-label={`${label} 사진 ${i + 1} 보기`} aria-pressed={index === i} onClick={() => setIndex(i)} />
            ))}</div>
          </div>
        </>
      )}
    </div>
  );
}
