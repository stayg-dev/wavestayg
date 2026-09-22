export type Room = {
  id: number;
  nodeId: string;
  name: string;
  korean: string;
  category: string;
  rates: { weekday: number; friday: number; peak: number };
  baseOccupancy: number;
  maxOccupancy: number;
  available: boolean;
  tags: string[];
  description: string;
  bed: string;
  capacity: string;
  area: string;
  view: string;
};

// Figma standalone room components. Availability is a design preview only.
export const rooms: Room[] = [
  {
    "id": 0,
    "nodeId": "138:933",
    "name": "Standard Double",
    "korean": "스탠다드 더블 X",
    "category": "스탠다드",
    "rates": { "weekday": 170000, "friday": 190000, "peak": 220000 },
    "baseOccupancy": 2,
    "maxOccupancy": 2,
    "available": false,
    "tags": [
      "기준 2인",
      "23㎡",
      "더블 1"
    ],
    "description": "두 분이 편안히 머무르실 수 있는 아늑한 원룸형 객실\n간단한 취사 공간을 갖추어 짧은 여행에 어울립니다.",
    "bed": "Double",
    "capacity": "2인",
    "area": "23㎡",
    "view": "전망 없음"
  },
  {
    "id": 1,
    "nodeId": "138:1085",
    "name": "Deluxe Double Mountain",
    "korean": "디럭스 더블 마운틴",
    "category": "디럭스",
    "rates": { "weekday": 190000, "friday": 210000, "peak": 240000 },
    "baseOccupancy": 2,
    "maxOccupancy": 2,
    "available": true,
    "tags": [
      "기준 2인",
      "23㎡",
      "더블 1"
    ],
    "description": "창밖으로 펼쳐지는 산의 풍경을 벗 삼아 머무는 객실\n조용하고 프라이빗한 분위기 속에서 두 분만의 시간을 보내실 수 있습니다.",
    "bed": "Double",
    "capacity": "2인",
    "area": "23㎡",
    "view": "산 풍경"
  },
  {
    "id": 2,
    "nodeId": "138:1135",
    "name": "Deluxe Double Half Ocean",
    "korean": "디럭스 더블 하프오션",
    "category": "디럭스",
    "rates": { "weekday": 210000, "friday": 230000, "peak": 260000 },
    "baseOccupancy": 2,
    "maxOccupancy": 2,
    "available": true,
    "tags": [
      "기준 2인",
      "23㎡",
      "더블 1"
    ],
    "description": "은은하게 스며드는 바다 풍경을 즐기실 수 있는 객실\n더블 침대 한 개로 연인과의 여정에 어울립니다.",
    "bed": "Double",
    "capacity": "2인",
    "area": "23㎡",
    "view": "오션뷰"
  },
  {
    "id": 3,
    "nodeId": "138:1185",
    "name": "Deluxe Twin Half Ocean",
    "korean": "디럭스 트윈 하프오션",
    "category": "디럭스",
    "rates": { "weekday": 210000, "friday": 230000, "peak": 260000 },
    "baseOccupancy": 2,
    "maxOccupancy": 2,
    "available": true,
    "tags": [
      "기준 2인",
      "23㎡",
      "싱글 2"
    ],
    "description": "더블과 싱글이 함께 놓인 유연한 구성의 객실.\n부분 오션뷰가 조용한 휴식의 배경이 되어 드립니다.",
    "bed": "Single 2",
    "capacity": "2인",
    "area": "23㎡",
    "view": "오션뷰"
  },
  {
    "id": 4,
    "nodeId": "138:1285",
    "name": "Junior Double Ocean",
    "korean": "주니어 더블 오션",
    "category": "주니어",
    "rates": { "weekday": 230000, "friday": 250000, "peak": 280000 },
    "baseOccupancy": 2,
    "maxOccupancy": 3,
    "available": true,
    "tags": [
      "기준 2인 · 최대 3인",
      "39㎡",
      "더블 1"
    ],
    "description": "침실과 거실이 나뉜 여유로운 구조의 오션뷰 객실\n두 분에게 넉넉하고, 한 분이 더해져도 편안합니다.",
    "bed": "Double",
    "capacity": "기준 2인 · 최대 3인",
    "area": "23㎡",
    "view": "오션뷰"
  },
  {
    "id": 5,
    "nodeId": "138:1235",
    "name": "Junior Family Ocean",
    "korean": "주니어 패밀리 오션",
    "category": "주니어",
    "rates": { "weekday": 230000, "friday": 250000, "peak": 280000 },
    "baseOccupancy": 2,
    "maxOccupancy": 3,
    "available": false,
    "tags": [
      "기준 2인 · 최대 3인",
      "32㎡",
      "더블 1 · 싱글 1"
    ],
    "description": "거실과 침실이 분리된 가족을 위한 객실\n바다가 보이는 거실에서 함께하는 시간을 담아냅니다.",
    "bed": "Double · Single",
    "capacity": "기준 2인 · 최대 3인",
    "area": "32㎡",
    "view": "오션뷰"
  },
  {
    "id": 6,
    "nodeId": "138:1335",
    "name": "Premium Double Ocean",
    "korean": "프리미엄 더블 오션",
    "category": "프리미엄",
    "rates": { "weekday": 240000, "friday": 260000, "peak": 290000 },
    "baseOccupancy": 2,
    "maxOccupancy": 3,
    "available": false,
    "tags": [
      "기준 2인 · 최대 3인",
      "39㎡",
      "더블 1"
    ],
    "description": "탁 트인 오션뷰 거실이 인상적인 프리미엄 객실\n여유로운 공간감 속에서 파도 소리와 함께하는 하루를 선사합니다.",
    "bed": "Double",
    "capacity": "기준 2인 · 최대 3인",
    "area": "39㎡",
    "view": "오션뷰"
  },
  {
    "id": 7,
    "nodeId": "138:1385",
    "name": "Premium Twin Ocean",
    "korean": "프리미엄 트윈 오션",
    "category": "프리미엄",
    "rates": { "weekday": 240000, "friday": 260000, "peak": 290000 },
    "baseOccupancy": 2,
    "maxOccupancy": 3,
    "available": true,
    "tags": [
      "기준 2인 · 최대 3인",
      "39㎡",
      "싱글 2"
    ],
    "description": "넓은 오션뷰 거실과 두 개의 싱글 침대로 구성된 프리미엄 트윈\n각자의 공간을 존중하며 함께 머무는 시간을 즐기실 수 있습니다.",
    "bed": "Single 2",
    "capacity": "기준 2인 · 최대 3인",
    "area": "39㎡",
    "view": "오션뷰"
  },
  {
    "id": 8,
    "nodeId": "138:1435",
    "name": "Loft Double Ocean",
    "korean": "로프트 더블 오션",
    "category": "로프트",
    "rates": { "weekday": 240000, "friday": 260000, "peak": 290000 },
    "baseOccupancy": 2,
    "maxOccupancy": 4,
    "available": true,
    "tags": [
      "기준 2인 · 최대 4인",
      "23㎡ · 복층",
      "더블 1"
    ],
    "description": "위층과 아래층이 나뉜 로프트 구조의 오션뷰 객실\n색다른 시선으로 바다를 마주하는 하루를 담아냅니다.",
    "bed": "Double",
    "capacity": "기준 2인 · 최대 4인",
    "area": "23㎡",
    "view": "오션뷰"
  },
  {
    "id": 9,
    "nodeId": "138:1636",
    "name": "Loft Twin Ocean",
    "korean": "로프트 트윈 오션",
    "category": "로프트",
    "rates": { "weekday": 240000, "friday": 260000, "peak": 290000 },
    "baseOccupancy": 2,
    "maxOccupancy": 4,
    "available": true,
    "tags": [
      "기준 2인 · 최대 4인",
      "23㎡ · 복층",
      "싱글 2"
    ],
    "description": "복층 감성이 살아 있는 로프트 트윈 객실\n각자의 침대와 열린 공간이 편안함과 재미를 함께 담아냅니다.",
    "bed": "Single 2",
    "capacity": "기준 2인 · 최대 4인",
    "area": "23㎡",
    "view": "오션뷰"
  },
  {
    "id": 10,
    "nodeId": "138:1686",
    "name": "Loft Family Ocean",
    "korean": "로프트 패밀리 오션",
    "category": "로프트",
    "rates": { "weekday": 250000, "friday": 270000, "peak": 300000 },
    "baseOccupancy": 2,
    "maxOccupancy": 4,
    "available": false,
    "tags": [
      "기준 2인 · 최대 4인",
      "32㎡ · 복층",
      "더블 1 · 싱글 1"
    ],
    "description": "온 가족이 오래 머물 수 있는 복층 패밀리 로프트\n바다 전망과 취사 공간이 집처럼 편안한 휴식을 담아냅니다.",
    "bed": "Double · Single",
    "capacity": "기준 2인 · 최대 4인",
    "area": "32㎡",
    "view": "오션뷰"
  }
];

export const roomCategories = ["전체", "스탠다드", "디럭스", "주니어", "프리미엄", "로프트"];
export const getRoom = (id: number) => rooms.find((room) => room.id === id) ?? rooms[0];


// Display order follows the supplied room rate sheet; IDs remain stable.
export const roomCatalog = [0, 1, 2, 3, 5, 4, 6, 7, 8, 9, 10].map(getRoom);
