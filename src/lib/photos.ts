export type SitePhoto = { src: string; alt: string; position?: string };

function photo(path: string, alt: string, position = "center"): SitePhoto {
  const src = `/양양 웨이브 스테이지/${path}`.split("/").map(encodeURIComponent).join("/");
  return { src, alt, position };
}

export const sitePhotos = {
  hero: [
    photo("홈 - 파도가 머무는 조용한 시간.jpg", "죽도해변 앞 웨이브 스테이지 전경"),
    photo("홈 - 바다를 구경하는 편안한 휴식.jpg", "동해를 바라보는 루프탑 테라스", "center 60%"),
    photo("홈 - 건축으로 담아낸 바다의 결.jpg", "웨이브 스테이지 건물 입구"),
  ],
  about: photo("홈 - WAVE STAY-G.jpg", "바다와 숲 사이에 자리한 웨이브 스테이지"),
  roomsBanner: photo("객실/객실 윗상단 메인 사진.jpg", "햇살이 들어오는 객실과 창밖 풍경"),
  facilitiesBanner: photo("부대시설/부대시설 윗 상단 배너.jpg", "바다가 펼쳐지는 루프탑 테라스", "center 60%"),
  noticeBanner: photo("공지사항 배너.jpg", "야자수와 벤치가 있는 야외 휴식 공간", "center 60%"),
  reservationBanner: photo("예약 조회 및 예약 페이지 배너.jpg", "침실과 거실에서 바다가 보이는 객실"),
  location: photo("오시는 길 배너.jpg", "죽도해변과 동산항 사이에 위치한 웨이브 스테이지"),
  rooftop: photo("부대시설/루프탑.jpg", "바다를 바라보는 루프탑 좌석"),
  lobby: [
    photo("부대시설/로비 (1).jpg", "프런트 데스크와 로비 라운지"),
    photo("부대시설/로비 (2).jpg", "소파와 테이블이 있는 로비 휴식 공간"),
  ],
  parking: photo("부대시설/주차장.jpg", "웨이브 스테이지 주차장 출입구"),
};

function roomGallery(code: string, name: string, order: number[]) {
  return order.map((number) => photo(`객실/${code}/${name} (${number}).jpg`, `${name} 객실 사진 ${number}`));
}

// Keep each photo associated with its exact room type.
export const roomPhotos: Record<number, SitePhoto[]> = {
  0: roomGallery("SDX", "스탠다드 더블", [2, 1, 3]),
  1: roomGallery("DDM", "디럭스 더블 마운틴", [2, 1, 3]),
  2: roomGallery("DHO", "디럭스 더블 하프오션", [1, 2, 3]),
  3: roomGallery("THO", "디럭스 트윈 하프오션", [1, 2, 3]),
  4: roomGallery("JDO", "주니어 더블 오션", [3, 2, 1, 4, 5]),
  5: roomGallery("JFO", "주니어 패밀리 오션", [1, 2, 3]),
  6: roomGallery("PDO", "프리미엄 더블 오션", [1, 2, 3, 4, 5]),
  7: roomGallery("PTO", "프리미엄 트윈 오션", [1, 2, 3, 4, 5]),
  8: [
    photo("객실/LDO/_BRW1684.jpg", "로프트 더블 오션 침실과 바다 전망, 복층 계단"),
    photo("객실/LDO/_BRW1659.jpg", "로프트 더블 오션 더블 침대와 발코니"),
    photo("객실/LDO/_BRW1677.jpg", "로프트 더블 오션 침실과 테이블"),
    photo("객실/LDO/_BRW1680.jpg", "로프트 더블 오션 복층 휴식 공간"),
    photo("객실/LDO/_BRW1654.jpg", "로프트 더블 오션 주방과 세탁기"),
  ],
  9: roomGallery("LTO", "로프트 트윈 오션", [3, 1, 2, 4, 5]),
  10: roomGallery("LFO", "로프트 패밀리 오션", [2, 1, 3, 4, 5, 6]),
};

export const pageBanners: Record<string, SitePhoto> = {
  "Rooms & Suites": sitePhotos.roomsBanner,
  Facilities: sitePhotos.facilitiesBanner,
  Notice: sitePhotos.noticeBanner,
  "Getting Here": sitePhotos.location,
  Contact: sitePhotos.lobby[0],
  Reservation: sitePhotos.reservationBanner,
};

export const momentPhotos = [sitePhotos.hero[2], sitePhotos.rooftop, sitePhotos.lobby[1], sitePhotos.noticeBanner];
