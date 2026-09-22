import { sitePhotos } from "./photos.ts";

export const facilities = [
  {
    name: "Rooftop", korean: "루프탑", homeKorean: "루프탑 포토존", tab: "루프탑 포토존", tag: "Rooftop",
    photos: [sitePhotos.rooftop],
    description: ["탁 트인 하늘과 바다를 마주하는 오픈 라운지", "노을과 함께하는 저녁의 여유"],
    hours: "Sunset · Late Night", location: "본관 · 최상층", useLabel: "이용", use: "투숙객 무료",
  },
  {
    name: "Front Desk", korean: "프론트 데스크", homeKorean: "프런트 데스크", tab: "프런트 라운지", tag: "09:00~22:00",
    photos: sitePhotos.lobby,
    description: ["체크인부터 컨시어지까지 언제든 곁에서", "요청 사항을 세심히 살펴 드립니다."],
    hours: "09:00 – 22:00", location: "본관 · 로비층", useLabel: "문의", use: "내선 · 대면",
  },
  {
    name: "Parking", korean: "주차장", homeKorean: "전용 주차장", tab: "전용 주차장", tag: "On-site",
    photos: [sitePhotos.parking],
    description: ["투숙객을 위한 부지 내 전용 주차 공간", "체크인 시 차량 등록으로 편리하게 이용"],
    hours: "24시간 이용", location: "본관 지하 · 지상", useLabel: "이용", use: "투숙객 무료",
  },
];

export const sights = [
  ["죽도해변", "Beach", "도보 2분"],
  ["서핑 스팟", "Surf", "도보 3분"],
  ["하조대", "View", "차량 15분"],
  ["송이밸리 자연휴양림", "Nature", "차량 20분"],
  ["낙산사", "Culture", "차량 25분"],
];

export const aboutParagraphs = [
  "멋진 파도를 만날 수 있는 곳, 양양 죽도해변 앞에 위치한 양양 웨이브 스테이지입니다. 서핑의 성지 죽도해변을 도보 3분 거리에서 만날 수 있으며, 객실에서 동해의 파도와 일출을 감상하실 수 있습니다.",
  "전 객실 시몬스 침대, 시스템 에어컨, 헤어드라이기, 무선 고속 충전기, 전자레인지가 구비되어 있으며, 일부 객실에서는 취사가 가능합니다. 부대시설로는 21층 루프탑 테라스(죽도해변·동산항 조망), 편의점이 운영됩니다.",
  "화려한 공간은 아니지만 합리적인 가격에 최적의 서비스를 제공하기 위해 작은 부분까지 정성스럽게 준비했습니다. 멋진 파도를 기다리는 마음으로 고객님과 다시 만나기를 기대합니다.",
];
