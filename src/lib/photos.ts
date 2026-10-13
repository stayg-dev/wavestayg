export type SitePhoto = { src: string; alt: string; position?: string };

function photo(path: string, alt: string, position = "center"): SitePhoto {
  const src = `/양양 웨이브 스테이지/${path}`.split("/").map(encodeURIComponent).join("/");
  return { src, alt, position };
}

export const sitePhotos = {
  hero: [
    photo("홈 - 파도가 머무는 조용한 시간.webp", "죽도해변 앞 웨이브 스테이지 전경"),
    photo("홈 - 바다를 구경하는 편안한 휴식.webp", "동해를 바라보는 루프탑 테라스", "center 60%"),
    photo("홈 - 건축으로 담아낸 바다의 결.webp", "웨이브 스테이지 건물 입구"),
  ],
  about: photo("홈 - WAVE STAY-G.webp", "바다와 숲 사이에 자리한 웨이브 스테이지"),
  roomsBanner: photo("객실/객실 윗상단 메인 사진.webp", "햇살이 들어오는 객실과 창밖 풍경"),
  facilitiesBanner: photo("부대시설/부대시설 윗 상단 배너.webp", "바다가 펼쳐지는 루프탑 테라스", "center 60%"),
  noticeBanner: photo("공지사항 배너.webp", "야자수와 벤치가 있는 야외 휴식 공간", "center 60%"),
  reservationBanner: photo("예약 조회 및 예약 페이지 배너.webp", "침실과 거실에서 바다가 보이는 객실"),
  location: photo("오시는 길 배너.webp", "죽도해변과 동산항 사이에 위치한 웨이브 스테이지"),
  rooftop: photo("부대시설/루프탑.webp", "바다를 바라보는 루프탑 좌석"),
  lobby: [
    photo("부대시설/로비 (1).webp", "프런트 데스크와 로비 라운지"),
    photo("부대시설/로비 (2).webp", "소파와 테이블이 있는 로비 휴식 공간"),
  ],
  parking: photo("부대시설/주차장.webp", "웨이브 스테이지 주차장 출입구"),
};

// The first photo is shared by room cards, detail galleries, and reservations.
function roomGallery(code: string, name: string, main: number, others: number[]) {
  return [
    photo(`객실/${code}/${name}_메인사진 (${main}).webp`, `${name} 대표 사진`),
    ...others.map((number) => photo(`객실/${code}/${name} (${number}).webp`, `${name} 객실 사진 ${number}`)),
  ];
}

export const roomPhotos: Record<number, SitePhoto[]> = {
  0: roomGallery("SDX", "스탠다드 더블", 4, [2, 1, 3]),
  1: roomGallery("DDM", "디럭스 더블 마운틴", 3, [2, 1]),
  2: roomGallery("DHO", "디럭스 더블 하프오션", 3, [1, 2]),
  3: roomGallery("THO", "디럭스 트윈 하프오션", 4, [1, 2, 3]),
  4: roomGallery("JDO", "주니어 더블 오션", 4, [3, 2, 1]),
  5: roomGallery("JFO", "주니어 패밀리 오션", 1, [2, 3]),
  6: roomGallery("PDO", "프리미엄 더블 오션", 2, [1, 3, 4, 5]),
  7: roomGallery("PTO", "프리미엄 트윈 오션", 2, [1, 3, 4, 5]),
  8: roomGallery("LDM", "로프트 더블 마운틴", 1, [3, 2, 5, 4, 6]),
  9: roomGallery("LTO", "로프트 트윈 오션", 1, [3, 2, 4]),
  10: roomGallery("LFO", "로프트 패밀리 오션", 6, [2, 1, 3, 4, 5]),
};

export const pageBanners: Record<string, SitePhoto> = {
  "Rooms & Suites": sitePhotos.roomsBanner,
  Facilities: sitePhotos.facilitiesBanner,
  Notice: sitePhotos.noticeBanner,
  "Getting Here": sitePhotos.location,
  Contact: sitePhotos.lobby[0],
  Reservation: sitePhotos.reservationBanner,
};

export const momentPhotos = [
  photo("오래 남는 순간들/_BRW1640.webp", "웨이브 스테이지에서의 여행 풍경"),
  photo("오래 남는 순간들/루프탑_OTA_HQ.webp", "바다와 하늘을 마주하는 루프탑"),
  photo("오래 남는 순간들/로프트 패밀리 오션_OTA_3000px (4).webp", "로프트 패밀리 오션 객실에서의 휴식"),
  photo("오래 남는 순간들/야경1_OTA_HQ.webp", "웨이브 스테이지의 밤 풍경"),
];
