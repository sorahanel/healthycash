import memberOptions from "../shared/member-options.json";
export const neighborhoods = memberOptions.neighborhoods;
export const todayKey = () =>
  new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Seoul" }).format(
    new Date(),
  );
export const dateLabel = () =>
  new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    month: "long",
    day: "numeric",
    weekday: "long",
  }).format(new Date());
export type Transaction = {
  id: string;
  title: string;
  hc: number;
  xp: number;
  source: "운영사" | "스폰서" | "가맹점";
  date: string;
};
export type DemoState = {
  name: string;
  neighborhood: string;
  balance: number;
  xp: number;
  steps: number;
  water: number;
  day: string;
  claims: string[];
  joined: string[];
  coupons: string[];
  transactions: Transaction[];
  onboarded: boolean;
};
export const initialState = (): DemoState => ({
  name: "지민",
  neighborhood: "효자4동",
  balance: 2480,
  xp: 1860,
  steps: 5432,
  water: 3,
  day: todayKey(),
  claims: [],
  joined: ["river"],
  coupons: [],
  onboarded: false,
  transactions: [
    {
      id: "welcome",
      title: "첫 만남을 환영해요",
      hc: 2000,
      xp: 0,
      source: "운영사",
      date: todayKey(),
    },
    {
      id: "sample-read",
      title: "지난 건강글 완독 · 예시",
      hc: 300,
      xp: 120,
      source: "스폰서",
      date: todayKey(),
    },
    {
      id: "sample-walk",
      title: "지난 걷기 미션 · 예시",
      hc: 180,
      xp: 1740,
      source: "운영사",
      date: todayKey(),
    },
  ],
});
export function loadState(): DemoState {
  try {
    const raw = localStorage.getItem("healthycash-demo-v1");
    if (raw) {
      const s = JSON.parse(raw);
      const stringList = (v: unknown): v is string[] =>
        Array.isArray(v) && v.every((x) => typeof x === "string");
      const nonnegativeInt = (v: unknown) =>
        typeof v === "number" && Number.isSafeInteger(v) && v >= 0;
      if (
        s &&
        typeof s.name === "string" &&
        s.name.trim().length > 0 &&
        s.name.length <= 10 &&
        neighborhoods.includes(s.neighborhood) &&
        typeof s.day === "string" &&
        nonnegativeInt(s.balance) &&
        nonnegativeInt(s.xp) &&
        nonnegativeInt(s.steps) &&
        s.steps <= 20000 &&
        nonnegativeInt(s.water) &&
        s.water <= 8 &&
        typeof s.onboarded === "boolean" &&
        stringList(s.claims) &&
        stringList(s.coupons) &&
        stringList(s.joined) &&
        Array.isArray(s.transactions) &&
        s.transactions.every(
          (t: Transaction) =>
            t &&
            typeof t.id === "string" &&
            typeof t.title === "string" &&
            Number.isSafeInteger(t.hc) &&
            nonnegativeInt(t.xp) &&
            ["운영사", "스폰서", "가맹점"].includes(t.source) &&
            typeof t.date === "string",
        )
      )
        return s.day === todayKey()
          ? s
          : {
              ...s,
              day: todayKey(),
              steps: 0,
              water: 0,
              claims: s.claims.filter((c: string) => !c.startsWith("daily:")),
            };
    }
  } catch {
    /* A blocked storage area still allows an in-memory demo. */
  }
  return initialState();
}
export const missions = [
  {
    id: "walk",
    title: "하루 7,000보 걷기",
    sub: "가벼운 산책으로 건강한 하루",
    hc: 30,
    xp: 60,
    icon: "foot",
    color: "green",
  },
  {
    id: "read",
    title: "1분 건강글 읽기",
    sub: "치과의사의 기획으로 시작하는 건강 습관",
    hc: 100,
    xp: 20,
    icon: "book",
    color: "peach",
  },
  {
    id: "water",
    title: "물 8잔 마시기",
    sub: "조금씩, 자주 수분을 채워요",
    hc: 0,
    xp: 15,
    icon: "water",
    color: "blue",
  },
  {
    id: "bp",
    title: "오늘의 혈압 기록하기",
    sub: "작은 기록이 만드는 건강의 변화",
    hc: 10,
    xp: 30,
    icon: "heart",
    color: "pink",
  },
];
export const articles = [
  {
    id: "teeth",
    category: "구강 건강",
    title: "양치 후 가글,\n바로 해도 괜찮을까요?",
    desc: "매일 하는 양치, 작은 순서가 중요해요.",
    image: "clinic",
    time: 1,
    sponsor: false,
    lead: "양치 후에는 치약을 뱉고, 물로 바로 여러 번 헹구지 않는 습관이 도움이 될 수 있어요.",
    sections: [
      [
        "불소가 치아에 머물 시간을 주세요",
        "불소치약으로 양치한 뒤 치약을 뱉어내세요. 곧바로 물이나 구강청결제로 헹구면 치아에 남은 불소가 씻겨 나갈 수 있습니다.",
      ],
      [
        "가글은 다른 시간에 사용해 보세요",
        "구강청결제를 사용한다면 양치 직후보다 점심 식사 후처럼 다른 시간대를 선택하는 것이 좋습니다. 제품 안내를 따르고, 사용 후 30분간은 음식과 음료를 피하세요.",
      ],
      [
        "내게 맞는 습관은 치과에서 확인해요",
        "잇몸 상태, 충치 위험, 사용하는 제품에 따라 권장 방법은 달라질 수 있어요. 통증이나 출혈이 계속된다면 치과의사와 상담하세요.",
      ],
    ],
    question:
      "구강청결제는 양치 직후보다 다른 시간대에 사용하는 것이 권장될까요?",
    answer: true,
    source: "NHS · How to keep your teeth clean",
    url: "https://www.nhs.uk/live-well/healthy-teeth-and-gums/how-to-keep-your-teeth-clean/",
  },
  {
    id: "walk",
    category: "운동·생활",
    title: "식후 10분 산책,\n오늘부터 시작해 볼까요?",
    desc: "거창한 운동보다, 꾸준한 작은 움직임.",
    image: "walk",
    time: 2,
    sponsor: true,
    lead: "운동은 길게 한 번보다 일상에서 꾸준히 이어가는 것이 중요해요. 내 몸에 맞게 천천히 시작하세요.",
    sections: [
      [
        "앉아 있는 시간을 조금 줄여요",
        "걷기는 일상에서 쉽게 시작할 수 있는 신체활동입니다. 엘리베이터 대신 계단을 이용하거나 가까운 거리를 걸어보는 것부터 시작하세요.",
      ],
      [
        "10분은 시작을 위한 작은 목표예요",
        "세계보건기구는 성인에게 주당 중강도 유산소 활동 150~300분을 권장합니다. 짧은 움직임도 신체활동에 포함되니, 처음부터 무리하지 말고 시간을 늘려보세요.",
      ],
      [
        "몸이 보내는 신호를 살펴요",
        "어지러움, 가슴 통증, 심한 호흡곤란이 있다면 운동을 중단하고 의료진에게 문의하세요. 기저질환이 있다면 자신의 상태에 맞는 운동 강도를 상담하세요.",
      ],
    ],
    question: "짧게 나누어 걷는 시간도 신체활동에 포함될까요?",
    answer: true,
    source: "WHO · Physical activity",
    url: "https://www.who.int/news-room/fact-sheets/detail/physical-activity",
  },
  {
    id: "pressure",
    category: "혈압·혈당",
    title: "집에서 재는 혈압,\n이렇게 기록해 보세요",
    desc: "측정 전 5분, 편안히 쉬어 주세요.",
    image: "bp",
    time: 2,
    sponsor: false,
    lead: "같은 조건에서 측정한 혈압 기록은 진료 시 의료진이 상태를 이해하는 데 도움이 됩니다.",
    sections: [
      [
        "측정 전에는 편안히 쉬어요",
        "측정 전 30분 동안 흡연, 카페인, 운동을 피하고 방광을 비우세요. 최소 5분 동안 조용히 앉아 안정을 취합니다.",
      ],
      [
        "자세와 커프 위치를 확인해요",
        "등을 기대고 발은 바닥에 평평하게 놓으세요. 팔은 심장 높이로 받치고, 맨팔에 맞는 크기의 커프를 사용합니다. 측정 중에는 대화하지 마세요.",
      ],
      [
        "기록은 상담을 위한 자료예요",
        "1분 간격으로 두 번 측정하여 기록하세요. 한 번의 수치만으로 진단하거나 약을 바꾸지 말고 의료진에게 기록을 보여주세요.",
      ],
    ],
    question: "혈압 측정 전 최소 5분간 안정을 취하는 것이 좋을까요?",
    answer: true,
    source: "American Heart Association · Home blood pressure monitoring",
    url: "https://www.heart.org/en/health-topics/high-blood-pressure/monitoring-your-blood-pressure-at-home",
  },
];
export const stores = [
  {
    id: "soup",
    name: "온기 가득 국밥",
    category: "건강한 식사",
    image: "gukbap",
    distance: "350m",
    address: "전주시 완산구 효자동 · 시연용 주소",
    desc: "든든한 한 끼로 오늘의 산책을 마무리해요.",
    limit: 10,
    tags: ["따뜻한 한 끼", "혼밥 환영"],
    menu: "맑은 소고기 국밥",
    price: 10000,
  },
  {
    id: "samgye",
    name: "효자 삼계탕",
    category: "건강한 식사",
    image: "samgye",
    distance: "620m",
    address: "전주시 완산구 효자동 · 시연용 주소",
    desc: "정성껏 끓여낸 따뜻하고 든든한 보양 한 그릇.",
    limit: 10,
    tags: ["보양 한 끼", "가족 식사"],
    menu: "한방 삼계탕",
    price: 16000,
  },
  {
    id: "gym",
    name: "오늘의 필라테스",
    category: "운동·웰니스",
    image: "gym",
    distance: "800m",
    address: "전주시 완산구 효자동 · 시연용 주소",
    desc: "내 몸의 균형을 찾는 기분 좋은 움직임.",
    limit: 10,
    tags: ["소그룹 수업", "예약제"],
    menu: "1회 체험 클래스",
    price: 30000,
  },
  {
    id: "bossam",
    name: "바른 한 상",
    category: "건강한 식사",
    image: "bossam",
    distance: "1.2km",
    address: "전주시 완산구 효자동 · 시연용 주소",
    desc: "신선한 채소와 담백한 보쌈으로 함께하는 식탁.",
    limit: 10,
    tags: ["신선한 채소", "동네 맛집"],
    menu: "보쌈 정식",
    price: 14000,
  },
];
export type Store = (typeof stores)[number];
export type Article = (typeof articles)[number];
export const challenges = [
  {
    id: "river",
    title: "전주천 따라, 하루 7천 보",
    subtitle: "우리 동네에서 시작하는 7일의 변화",
    image: "hero",
    sponsor: "헬시라이프 · 예시",
    reward: 300,
    participants: 128,
    days: 7,
  },
  {
    id: "smile",
    title: "일주일, 더 건강한 미소",
    subtitle: "하루 한 번 구강 건강글 읽기",
    image: "clinic",
    sponsor: "스마일케어 · 예시",
    reward: 150,
    participants: 86,
    days: 7,
  },
  {
    id: "morning",
    title: "아침을 여는 가벼운 산책",
    subtitle: "나를 위한 10분, 함께 걸어요",
    image: "park",
    sponsor: "전주 웰니스 · 예시",
    reward: 200,
    participants: 64,
    days: 5,
  },
];
export function tier(xp: number) {
  if (xp >= 20000) return { name: "Diamond", min: 20000, next: 20000 };
  if (xp >= 9000) return { name: "Platinum", min: 9000, next: 20000 };
  if (xp >= 4000) return { name: "Gold", min: 4000, next: 9000 };
  if (xp >= 1500) return { name: "Silver", min: 1500, next: 4000 };
  return { name: "Bronze", min: 0, next: 1500 };
}
export function validateSpend(
  amount: number,
  hc: number,
  balance: number,
  limit = 10,
) {
  if (!Number.isSafeInteger(amount) || amount < 1000 || amount > 10000000)
    return "결제 금액은 1,000원~10,000,000원의 정수로 입력해 주세요.";
  if (!Number.isSafeInteger(hc) || hc < 1)
    return "사용할 HC를 1 이상 정수로 입력해 주세요.";
  if (hc > Math.floor((amount * limit) / 100))
    return `결제 금액의 ${limit}%까지 사용할 수 있어요.`;
  if (hc > balance) return "보유한 HC가 부족해요.";
  return null;
}
