import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import {
  ArrowDownLeft,
  ArrowRight,
  ArrowUpRight,
  Award,
  Bell,
  BookOpen,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  Clock3,
  Download,
  Droplets,
  Flame,
  Footprints,
  Gift,
  Heart,
  HeartPulse,
  Home,
  LayoutDashboard,
  Leaf,
  MapPin,
  Menu,
  Plus,
  QrCode,
  Search,
  Settings2,
  ShieldCheck,
  Sparkles,
  Sprout,
  Stethoscope,
  Store as StoreIcon,
  Target,
  TrendingUp,
  Trophy,
  Upload,
  Users,
  Wallet,
  X,
  type LucideIcon,
} from "lucide-react";
import QRCode from "qrcode";
import {
  articles,
  challenges,
  dateLabel,
  initialState,
  loadState,
  missions,
  neighborhoods,
  stores,
  tier,
  todayKey,
  validateSpend,
  type Article,
  type DemoState,
  type Store,
} from "./data";

type Page =
  | "home"
  | "missions"
  | "health"
  | "local"
  | "records"
  | "rewards"
  | "wallet"
  | "admin";
type ModalType = {
  kind:
    | "article"
    | "store"
    | "pay"
    | "challenge"
    | "bp"
    | "onboarding"
    | "notifications"
    | "about"
    | "settings"
    | "coupon"
    | "reset"
    | "upload";
  id?: string;
} | null;
type BP = { sys: number; dia: number; date: string };
const nav: { id: Page; label: string; icon: LucideIcon }[] = [
  { id: "home", label: "홈", icon: Home },
  { id: "missions", label: "미션·챌린지", icon: Footprints },
  { id: "health", label: "1분 건강글", icon: BookOpen },
  { id: "local", label: "동네 혜택", icon: MapPin },
  { id: "records", label: "건강 기록", icon: HeartPulse },
  { id: "rewards", label: "리워드", icon: Gift },
];
const num = (n: number) => n.toLocaleString("ko-KR");
const img = (name: string) =>
  name === "clinic" ? "/assets/dental-care.svg" : `/assets/${name}.webp`;
function IconBox({
  icon: Icon,
  color = "green",
}: {
  icon: LucideIcon;
  color?: string;
}) {
  return (
    <span className={`iconbox ${color}`}>
      <Icon size={21} strokeWidth={1.8} />
    </span>
  );
}
function Button({
  children,
  onClick,
  kind = "primary",
  disabled = false,
  type = "button",
}: {
  children: ReactNode;
  onClick?: () => void;
  kind?: string;
  disabled?: boolean;
  type?: "submit" | "button";
}) {
  return (
    <button
      type={type}
      className={`btn ${kind}`}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
}
function SectionHeading({
  title,
  sub,
  action,
  onAction,
}: {
  title: string;
  sub?: string;
  action?: string;
  onAction?: () => void;
}) {
  return (
    <div className="section-heading">
      <div>
        <h2>{title}</h2>
        {sub && <p>{sub}</p>}
      </div>
      {action && (
        <button className="text-btn" onClick={onAction}>
          {action}
          <ChevronRight size={16} />
        </button>
      )}
    </div>
  );
}
function Progress({ value, label }: { value: number; label?: string }) {
  return (
    <div
      className="progress"
      role="progressbar"
      aria-label={label}
      aria-valuenow={Math.round(Math.min(100, value))}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <span style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
    </div>
  );
}
function Logo() {
  return (
    <div className="brand">
      <span className="brand-symbol">
        <HeartPulse size={25} />
      </span>
      <div>
        healthy<span>cash</span>
        <small>건강한 일상의 가치</small>
      </div>
    </div>
  );
}
function WeekChart({ expanded = false }: { expanded?: boolean }) {
  return (
    <div className={`week-chart ${expanded ? "expanded" : ""}`}>
      <div className="chart-axis">
        <span>1만</span>
        <span>5천</span>
        <span>0</span>
      </div>
      <div className="chart-bars">
        {[62, 83, 72, 100, 54, 0, 0].map((v, i) => (
          <div className={`chart-day ${i === 4 ? "current" : ""}`} key={i}>
            <div className="bar-area">
              <div className="bar" style={{ height: `${v}%` }}>
                {i === 4 && <span>오늘</span>}
              </div>
            </div>
            <span>{["월", "화", "수", "목", "금", "토", "일"][i]}</span>
          </div>
        ))}
      </div>
      <span className="chart-goal">목표 7천 보</span>
    </div>
  );
}
function App() {
  const [state, setState] = useState<DemoState>(loadState);
  const [page, setPage] = useState<Page>("home");
  const [modal, setModal] = useState<ModalType>(null);
  const [toast, setToast] = useState("");
  const [mobileNav, setMobileNav] = useState(false);
  const [category, setCategory] = useState("전체");
  const [storeCategory, setStoreCategory] = useState("전체");
  const [search, setSearch] = useState("");
  const [recordConsent, setRecordConsent] = useState(false);
  const [consentChoice, setConsentChoice] = useState(false);
  const [hospitalSubmitted, setHospitalSubmitted] = useState(false);
  const [records, setRecords] = useState<BP[]>([]);
  const [labs, setLabs] = useState<{
    ldl: number;
    glucose: number;
    name: string;
  } | null>(null);
  const [adminTab, setAdminTab] = useState("운영 현황");
  const [reviewed, setReviewed] = useState(false);
  const [reading, setReading] = useState(0);
  const [readEnd, setReadEnd] = useState(false);
  const [quiz, setQuiz] = useState<boolean | null>(null);
  const [qr, setQr] = useState("");
  const [paymentDone, setPaymentDone] = useState<{
    hc: number;
    amount: number;
  } | null>(null);
  const [notify, setNotify] = useState(true);
  const [ledgerFilter, setLedgerFilter] = useState("전체");
  const [onboardStep, setOnboardStep] = useState(0);
  const [onboardName, setOnboardName] = useState(state.name);
  const [onboardTown, setOnboardTown] = useState(state.neighborhood);
  const [onboardTerms, setOnboardTerms] = useState(false);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLElement | null>(null);
  const currentTier = tier(state.xp);
  useEffect(() => {
    try {
      localStorage.setItem("healthycash-demo-v1", JSON.stringify(state));
    } catch {
      /* demo continues without persistence */
    }
  }, [state]);
  useEffect(() => {
    const rollover = () =>
      setState((s) =>
        s.day === todayKey()
          ? s
          : {
              ...s,
              day: todayKey(),
              steps: 0,
              water: 0,
              claims: s.claims.filter((c) => !c.startsWith("daily:")),
            },
      );
    const timer = setInterval(rollover, 60000);
    document.addEventListener("visibilitychange", rollover);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", rollover);
    };
  }, []);
  useEffect(() => {
    if (!modal) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    triggerRef.current = document.activeElement as HTMLElement;
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") setModal(null);
      if (e.key === "Tab") {
        const els = dialogRef.current?.querySelectorAll<HTMLElement>(
          'button:not([disabled]), input:not([disabled]), select, a[href], [tabindex="0"]',
        );
        if (!els?.length) return;
        const first = els[0],
          last = els[els.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", key);
    setTimeout(
      () =>
        dialogRef.current?.querySelector<HTMLElement>("button, input")?.focus(),
      30,
    );
    return () => {
      document.body.style.overflow = original;
      document.removeEventListener("keydown", key);
      triggerRef.current?.focus();
    };
  }, [modal?.kind]);
  useEffect(() => {
    if (modal?.kind !== "article") return;
    setReading(0);
    setReadEnd(false);
    setQuiz(null);
    const timer = setInterval(() => {
      if (document.visibilityState === "visible")
        setReading((v) => Math.min(10, v + 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [modal?.kind, modal?.id]);
  useEffect(() => {
    if (modal?.kind !== "pay") return;
    setPaymentDone(null);
    QRCode.toDataURL(
      JSON.stringify({
        type: "HEALTHYCASH_DEMO_ONLY",
        merchant: modal.id,
        user: "demo-user",
      }),
      { width: 210, margin: 2, color: { dark: "#173e30", light: "#ffffff" } },
    )
      .then(setQr)
      .catch(() => setQr(""));
  }, [modal?.kind, modal?.id]);
  function message(s: string) {
    setToast(s);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(""), 4200);
  }
  function go(p: Page) {
    setPage(p);
    setMobileNav(false);
    window.scrollTo({ top: 0, behavior: "instant" });
  }
  function claim(
    id: string,
    title: string,
    hc: number,
    xp: number,
    source: "운영사" | "스폰서" = "운영사",
  ) {
    if (state.claims.includes(id)) return;
    setState((s) =>
      s.claims.includes(id)
        ? s
        : {
            ...s,
            balance: s.balance + hc,
            xp: s.xp + xp,
            claims: [...s.claims, id],
            transactions: [
              { id, title, hc, xp, source, date: todayKey() },
              ...s.transactions,
            ],
          },
    );
    message(`${hc ? `+${hc} HC · ` : ""}+${xp} XP를 받았어요!`);
  }
  function handleMission(id: string) {
    const key = `daily:${todayKey()}:${id}`;
    if (state.claims.includes(key)) return;
    if (id === "walk") {
      if (state.steps >= 7000) claim(key, "하루 7,000보 달성", 30, 60);
      else go("missions");
    }
    if (id === "read") {
      const unread = articles.find(
        (a) => !state.claims.includes(`article:${a.id}`),
      );
      if (unread) setModal({ kind: "article", id: unread.id });
      else go("health");
    }
    if (id === "water") {
      if (state.water >= 8) claim(key, "물 8잔 마시기", 0, 15);
      else {
        setState((s) => ({ ...s, water: Math.min(8, s.water + 1) }));
        message(`물 한 잔 기록 완료 · ${Math.min(8, state.water + 1)}/8잔`);
      }
    }
    if (id === "bp") {
      if (!recordConsent) {
        go("records");
        message("먼저 건강 기록의 선택 동의를 확인해 주세요.");
      } else setModal({ kind: "bp" });
    }
  }
  function missionDone(id: string) {
    return id === "read"
      ? state.transactions.some(
          (t) => t.id.startsWith("article:") && t.date === todayKey(),
        )
      : state.claims.includes(`daily:${todayKey()}:${id}`);
  }
  function exportLedger() {
    const rows = [
      ["날짜", "내용", "HC", "XP", "재원"],
      ...state.transactions.map((t) => [t.date, t.title, t.hc, t.xp, t.source]),
    ];
    download(
      "healthycash-demo-ledger.csv",
      "\ufeff" +
        rows
          .map((r) =>
            r.map((c) => `"${String(c).replaceAll('"', '""')}"`).join(","),
          )
          .join("\n"),
      "text/csv;charset=utf-8",
    );
    message("시연 원장을 내려받았어요.");
  }
  function download(name: string, content: string, type: string) {
    const url = URL.createObjectURL(new Blob([content], { type }));
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  const selectedArticle =
    articles.find((a) => a.id === modal?.id) || articles[0];
  const selectedStore = stores.find((s) => s.id === modal?.id) || stores[0];
  const selectedChallenge =
    challenges.find((c) => c.id === modal?.id) || challenges[0];
  const title =
    page === "wallet"
      ? "내 HC 지갑"
      : page === "admin"
        ? "운영 대시보드"
        : nav.find((n) => n.id === page)?.label;
  function missionRows(full = false) {
    return (
      <div className="mission-list">
        {missions.slice(0, full ? 4 : 3).map((m) => {
          const done = missionDone(m.id);
          const Icon =
            m.icon === "foot"
              ? Footprints
              : m.icon === "book"
                ? BookOpen
                : m.icon === "water"
                  ? Droplets
                  : HeartPulse;
          return (
            <div className="mission-row" key={m.id}>
              <IconBox icon={Icon} color={m.color} />
              <div className="mission-copy">
                <strong>{m.title}</strong>
                <span>
                  {m.id === "walk"
                    ? `${num(state.steps)} / 7,000보`
                    : m.id === "water"
                      ? `${state.water} / 8잔 · 한 잔씩 기록해요`
                      : m.sub}
                </span>
              </div>
              <div className="mission-reward">
                {m.hc > 0 && <b>+{m.hc} HC</b>}
                <small>+{m.xp} XP</small>
              </div>
              <button
                className={`mission-button ${done ? "done" : ""}`}
                disabled={done}
                onClick={() => handleMission(m.id)}
                aria-label={m.title + (done ? " 완료" : " 참여")}
              >
                {done ? (
                  <Check size={17} />
                ) : m.id === "walk" && state.steps < 7000 ? (
                  <ChevronRight size={18} />
                ) : m.id === "read" ? (
                  "읽기"
                ) : m.id === "water" && state.water < 8 ? (
                  <Plus size={17} />
                ) : (
                  "받기"
                )}
              </button>
            </div>
          );
        })}
      </div>
    );
  }
  function articleCard(a: Article) {
    return (
      <button
        className="article-card"
        key={a.id}
        onClick={() => setModal({ kind: "article", id: a.id })}
      >
        <div className="article-image">
          <img src={img(a.image)} alt="" />
          <span className="image-label">
            <Clock3 size={12} />
            {a.time}분
          </span>
        </div>
        <div className="article-info">
          <span className="category-label">
            {a.category}
            {a.sponsor && <small>광고·예시</small>}
          </span>
          <h3>{a.title}</h3>
          <p>{a.desc}</p>
          <div className="article-meta">
            <ShieldCheck size={14} />
            <span>기획 기반 콘텐츠 샘플</span>
            <b>+100 HC</b>
          </div>
        </div>
      </button>
    );
  }
  function storeCard(s: Store) {
    return (
      <button
        key={s.id}
        className="store-card"
        onClick={() => setModal({ kind: "store", id: s.id })}
      >
        <div className="store-image">
          <img src={img(s.image)} alt={s.menu} />
          <span>HC 사용 가능</span>
        </div>
        <div className="store-info">
          <div className="store-top">
            <span>{s.category}</span>
            <small>
              <MapPin size={12} />
              {s.distance}
            </small>
          </div>
          <h3>{s.name}</h3>
          <p>{s.desc}</p>
          <div className="store-bottom">
            <span>
              결제 금액의 <b>{s.limit}% HC</b>
            </span>
            <span className="circle-arrow">
              <ArrowUpRight size={17} />
            </span>
          </div>
        </div>
      </button>
    );
  }
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main">
        본문으로 이동
      </a>
      {mobileNav && (
        <button
          className="nav-backdrop"
          aria-label="메뉴 닫기"
          onClick={() => setMobileNav(false)}
        />
      )}
      <aside className={`sidebar ${mobileNav ? "open" : ""}`}>
        <button
          className="brand-link"
          aria-label="헬시캐시 홈"
          onClick={() => go("home")}
        >
          <Logo />
        </button>
        <div className="sidebar-label">MY HEALTHY LIFE</div>
        <nav aria-label="주 메뉴">
          {nav.map((n) => (
            <button
              className={`nav-item ${page === n.id ? "active" : ""}`}
              key={n.id}
              onClick={() => go(n.id)}
              aria-current={page === n.id ? "page" : undefined}
            >
              <n.icon size={21} strokeWidth={page === n.id ? 2.2 : 1.7} />
              <span>{n.label}</span>
              {n.id === "missions" && <small>4</small>}
              {page === n.id && <span className="active-dot" />}
            </button>
          ))}
        </nav>
        <div className="sidebar-divider" />
        <button
          className={`nav-item ${page === "wallet" ? "active" : ""}`}
          onClick={() => go("wallet")}
        >
          <Wallet size={20} />
          <span>내 HC 지갑</span>
        </button>
        <button
          className={`nav-item ${page === "admin" ? "active" : ""}`}
          onClick={() => go("admin")}
        >
          <LayoutDashboard size={20} />
          <span>운영 대시보드</span>
          <span className="demo-mini">DEMO</span>
        </button>
        <div className="sidebar-bottom">
          <div className="pilot-card">
            <div className="pilot-icon">
              <Sprout size={23} />
              <span>전주에서 시작하는 변화</span>
            </div>
            <h3>
              우리 동네가
              <br />더 건강해지는 중
            </h3>
            <p>
              작은 습관이 모여,
              <br />
              건강한 동네를 만들어요.
            </p>
            <button onClick={() => setModal({ kind: "about" })}>
              헬시캐시 이야기 <ArrowUpRight size={16} />
            </button>
            <Leaf className="pilot-leaf" size={72} strokeWidth={0.8} />
          </div>
          <button
            className="doctor-note"
            onClick={() => setModal({ kind: "about" })}
          >
            <ShieldCheck size={20} />
            <span>
              현직 치과의사의 기획으로
              <br />
              <b>신뢰할 수 있는 건강한 시작</b>
            </span>
          </button>
          <div className="side-footer">
            <button onClick={() => setModal({ kind: "settings" })}>설정</button>
            <span>·</span>
            <button onClick={() => setModal({ kind: "about" })}>
              서비스 소개
            </button>
            <small>© 2026 Healthy Cash</small>
          </div>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div className="breadcrumb">
            <button
              className="mobile-menu icon-button"
              aria-label="메뉴 열기"
              onClick={() => setMobileNav(true)}
            >
              <Menu size={23} />
            </button>
            <span className="desktop-crumb">
              나의 건강한 일상 <ChevronRight size={13} />
            </span>
            <strong>{title}</strong>
          </div>
          <div className="header-actions">
            <button
              className="town-button"
              onClick={() => {
                setOnboardStep(0);
                setModal({ kind: "onboarding" });
              }}
            >
              <MapPin size={15} />
              <span>전주 {state.neighborhood}</span>
              <ChevronDown size={13} />
            </button>
            <span className="header-divider" />
            <button
              className="icon-button bell"
              aria-label="알림"
              onClick={() => setModal({ kind: "notifications" })}
            >
              <Bell size={20} />
              {notify && <i />}
            </button>
            <button
              className="avatar"
              aria-label="내 프로필 설정"
              onClick={() => setModal({ kind: "settings" })}
            >
              {state.name.slice(0, 1)}
            </button>
          </div>
        </header>
        <main id="main" tabIndex={-1}>
          <div className="demo-ribbon">
            <span>
              <span className="live-dot" /> 전주 파일럿 프로토타입
            </span>
            <span className="ribbon-desc">
              걸음·가맹점·보상은 시연 데이터입니다
            </span>
            <button onClick={() => setModal({ kind: "about" })}>
              서비스 알아보기 <ArrowUpRight size={13} />
            </button>
          </div>
          {page === "home" && (
            <>
              <div className="page-intro">
                <div>
                  <div className="eyebrow">
                    <span /> A LITTLE HEALTHIER, EVERY DAY
                  </div>
                  <h1>
                    {state.name}님, 오늘도 건강을 쌓아볼까요?{" "}
                    <span className="hello-leaf">🌿</span>
                  </h1>
                  <p>작은 실천이 건강이 되고, 우리 동네의 혜택이 돼요.</p>
                </div>
                <span className="date-label">{dateLabel()}</span>
              </div>
              <div className="dashboard-top">
                <section className="walking-card">
                  <div className="walking-photo" />
                  <div className="walk-heading">
                    <span className="small-label">
                      <Footprints size={17} /> 오늘의 걸음
                    </span>
                    <span className="pill light">목표 7,000보</span>
                  </div>
                  <div className="walk-content">
                    <div className="step-ring">
                      <svg
                        viewBox="0 0 200 200"
                        aria-label={`목표 ${Math.round((state.steps / 7000) * 100)}% 달성`}
                      >
                        <circle
                          cx="100"
                          cy="100"
                          r="86"
                          fill="none"
                          stroke="#d8e9d9"
                          strokeWidth="12"
                        />
                        <circle
                          cx="100"
                          cy="100"
                          r="86"
                          fill="none"
                          stroke="#216c50"
                          strokeWidth="12"
                          strokeLinecap="round"
                          strokeDasharray={`${Math.min(1, state.steps / 7000) * 540} 540`}
                          transform="rotate(-90 100 100)"
                        />
                      </svg>
                      <div className="ring-copy">
                        <Footprints size={22} />
                        <strong>{num(state.steps)}</strong>
                        <span>걸음</span>
                      </div>
                      <span className="ring-spark">
                        <Sparkles size={16} />
                      </span>
                    </div>
                    <div className="walk-copy">
                      <span className="walk-kicker">차곡차곡, 건강한 습관</span>
                      <h2>
                        {state.steps < 7000 ? (
                          <>
                            목표까지 <em>{num(7000 - state.steps)}보,</em>
                            <br />
                            조금만 더 걸어볼까요?
                          </>
                        ) : (
                          <>
                            오늘의 목표 달성!
                            <br />
                            <em>정말 잘하셨어요.</em>
                          </>
                        )}
                      </h2>
                      <p>가까운 산책길에서 건강도, 보상도 함께.</p>
                      <button
                        onClick={() =>
                          state.steps >= 7000
                            ? handleMission("walk")
                            : go("missions")
                        }
                      >
                        {state.steps >= 7000
                          ? "미션 보상 확인하기"
                          : "오늘의 미션 보러 가기"}
                        <ArrowRight size={15} />
                      </button>
                    </div>
                  </div>
                  <div className="walk-footer">
                    <span>
                      <Flame size={15} className="orange" />
                      <b>5일째</b> 건강한 루틴을 이어가고 있어요{" "}
                      <small>예시</small>
                    </span>
                    <span>
                      목표의{" "}
                      <b>
                        {Math.min(100, Math.round((state.steps / 7000) * 100))}%
                      </b>{" "}
                      달성
                    </span>
                  </div>
                </section>
                <section className="wallet-card">
                  <div className="wallet-card-top">
                    <span>
                      <Wallet size={17} /> 나의 헬시캐시
                    </span>
                    <button
                      aria-label="HC 지갑 보기"
                      onClick={() => go("wallet")}
                    >
                      <ArrowUpRight size={20} />
                    </button>
                  </div>
                  <div className="balance">
                    <strong>{num(state.balance)}</strong>
                    <span>HC</span>
                    <span className="coin">H</span>
                  </div>
                  <p>건강하게 모으고, 동네에서 사용해요</p>
                  <button
                    className="wallet-cta"
                    onClick={() => {
                      go("local");
                      message(
                        "시연 가맹점을 선택하면 QR 사용을 체험할 수 있어요.",
                      );
                    }}
                  >
                    <QrCode size={18} /> HC 사용하기
                    <ChevronRight size={16} />
                  </button>
                  <div className="tier-row">
                    <span className="tier-medal">
                      <Award size={21} />
                    </span>
                    <strong>{currentTier.name}</strong>
                    <span>
                      {num(state.xp)} <small>XP</small>
                    </span>
                  </div>
                  <Progress
                    value={
                      ((state.xp - currentTier.min) /
                        (currentTier.next - currentTier.min || 1)) *
                      100
                    }
                    label="다음 등급 진행률"
                  />
                  <div className="tier-note">
                    <span>다음 등급까지</span>
                    <b>{num(Math.max(0, currentTier.next - state.xp))} XP</b>
                  </div>
                </section>
              </div>
              <div className="mini-stats">
                <div>
                  <IconBox icon={Flame} color="peach" />
                  <span>
                    연속 달성 <small>예시</small>
                    <strong>
                      5<span>일</span>
                      <i>차근차근 잘하고 있어요!</i>
                    </strong>
                  </span>
                </div>
                <div>
                  <IconBox icon={TrendingUp} color="blue" />
                  <span>
                    이번 주 누적 걸음 <small>예시</small>
                    <strong>
                      37,432<span>보</span>
                      <i>지난주보다 12% ↑</i>
                    </strong>
                  </span>
                </div>
                <div>
                  <IconBox icon={Heart} color="pink" />
                  <span>
                    오늘의 물 마시기
                    <strong>
                      {state.water}
                      <span>/ 8잔</span>
                      <button
                        aria-label="물 한 잔 추가"
                        onClick={() => handleMission("water")}
                        disabled={missionDone("water")}
                      >
                        <Plus size={16} />
                      </button>
                    </strong>
                  </span>
                </div>
              </div>
              <div className="dashboard-body">
                <div className="dashboard-left">
                  <section className="card missions-card">
                    <SectionHeading
                      title="오늘의 작은 실천"
                      sub="하나씩 완성하고, 건강한 보상을 받아요"
                      action="전체 보기"
                      onAction={() => go("missions")}
                    />
                    {missionRows()}
                    <div className="card-footnote">
                      <Sparkles size={13} /> 매일의 작은 실천이 더 큰 변화를
                      만들어요.
                    </div>
                  </section>
                  <section className="home-articles">
                    <SectionHeading
                      title="나를 위한 1분 건강글"
                      sub="가볍게 읽고, 건강한 습관을 알아가요"
                      action="더 보기"
                      onAction={() => go("health")}
                    />
                    <div className="article-grid">
                      {articles.slice(0, 2).map(articleCard)}
                    </div>
                  </section>
                </div>
                <div className="dashboard-right">
                  <section className="card weekly-card">
                    <SectionHeading title="이번 주도 차곡차곡" />
                    <div className="weekly-total">
                      <strong>
                        37,432<span>보</span>
                      </strong>
                      <span>
                        <TrendingUp size={13} /> 12% <small>예시</small>
                      </span>
                    </div>
                    <WeekChart />
                    <div className="weekly-note">
                      <span className="tiny-dot" />
                      하루 평균 <b>7,486보</b>
                      <span>지난주보다 잘하고 있어요</span>
                    </div>
                  </section>
                  <section className="challenge-feature">
                    <img src={img("hero")} alt="전주천 산책길" />
                    <div className="challenge-shade" />
                    <div className="challenge-feature-copy">
                      <span className="pill">
                        함께하는 챌린지 <small>광고·예시</small>
                      </span>
                      <h2>
                        전주천 따라,
                        <br />
                        하루 7천 보
                      </h2>
                      <p>우리 동네 이웃과 건강한 7일</p>
                      <div>
                        <span>
                          <Users size={14} /> 128명 참여 중 · 예시
                        </span>
                        <b>+300 HC</b>
                      </div>
                      <button
                        onClick={() =>
                          setModal({ kind: "challenge", id: "river" })
                        }
                      >
                        챌린지 확인하기
                        <ArrowRight size={16} />
                      </button>
                    </div>
                  </section>
                </div>
              </div>
              <section className="local-home">
                <SectionHeading
                  title="건강하게 모은 캐시, 우리 동네에서"
                  sub="내 곁의 가게에서 일상 속 혜택을 누려보세요 · 모든 가게는 시연용입니다"
                  action="동네 혜택 보기"
                  onAction={() => go("local")}
                />
                <div className="store-grid home-stores">
                  {stores.slice(0, 3).map(storeCard)}
                </div>
              </section>
              <div className="trust-strip">
                <span className="trust-icon">
                  <ShieldCheck size={27} />
                </span>
                <div>
                  <strong>건강을 아는 사람이, 건강한 일상을 위해.</strong>
                  <p>
                    현직 치과의사의 기획을 바탕으로 건강 습관과 동네의 가치를
                    연결합니다.
                  </p>
                </div>
                <button onClick={() => setModal({ kind: "about" })}>
                  헬시캐시의 약속 <ArrowUpRight size={16} />
                </button>
              </div>
            </>
          )}
          {page === "missions" && (
            <>
              <PageIntro
                eyebrow="SMALL STEPS, BIG CHANGE"
                title="오늘의 작은 실천"
                description="나를 위한 건강한 약속, 하나씩 완성해 보세요."
              />
              <div className="two-columns">
                <section className="card">
                  <SectionHeading
                    title="오늘의 미션"
                    sub={`${missions.filter((m) => missionDone(m.id)).length} / 4개 완료`}
                  />
                  {missionRows(true)}
                  <div className="simulation-panel">
                    <span className="pill">걸음 연동 시연</span>
                    <h3>
                      {num(state.steps)} <small>/ 7,000보</small>
                    </h3>
                    <Progress
                      value={(state.steps / 7000) * 100}
                      label="오늘의 걷기 목표"
                    />
                    <p>
                      삼성헬스·Apple 건강 대신 예시 걸음을 추가합니다. 실제 센서
                      연동은 출시 단계에서 연결합니다.
                    </p>
                    <Button
                      kind="secondary"
                      onClick={() => {
                        setState((s) => ({
                          ...s,
                          steps: Math.min(20000, s.steps + 1000),
                        }));
                        message("시연 걸음 1,000보를 추가했어요.");
                      }}
                      disabled={state.steps >= 20000}
                    >
                      <Plus size={17} /> 시연 걸음 1,000보 추가
                    </Button>
                  </div>
                </section>
                <section className="card">
                  <SectionHeading
                    title="우리 동네 걷기 랭킹"
                    sub={`${state.neighborhood} · 시연용 순위`}
                  />
                  {[
                    "산책하는 고양이",
                    "초록빛 하루",
                    "건강한 발걸음",
                    state.name,
                    "전주천 러너",
                  ].map((name, i) => (
                    <div className={`rank-row ${i === 3 ? "me" : ""}`} key={i}>
                      <span>{i < 3 ? <Trophy size={18} /> : i + 1}</span>
                      <span className="rank-avatar">
                        {["🌱", "🌻", "🍀", "🌿", "🌳"][i]}
                      </span>
                      <strong>
                        {name}
                        {i === 3 && <small>나</small>}
                      </strong>
                      <span>
                        {num(
                          i === 3
                            ? state.steps
                            : [9870, 8920, 7640, 0, 4210][i],
                        )}
                        보
                      </span>
                    </div>
                  ))}
                  <div className="info-note">
                    <Users size={16} />
                    <p>
                      익명 예시 데이터입니다. 실제 이웃의 활동 정보가 아닙니다.
                    </p>
                  </div>
                </section>
              </div>
              <SectionHeading
                title="함께 걸으면 더 즐거워요"
                sub="스폰서 재원으로 운영되는 건강 챌린지 · 참여는 진료·예약과 무관합니다"
              />
              <div className="challenge-grid">
                {challenges.map((c) => (
                  <button
                    className="challenge-card"
                    key={c.id}
                    onClick={() => setModal({ kind: "challenge", id: c.id })}
                  >
                    <img src={img(c.image)} alt="" />
                    <div>
                      <span className="category-label">
                        스폰서 챌린지 · 광고·예시
                      </span>
                      <h3>{c.title}</h3>
                      <p>{c.subtitle}</p>
                      <div className="challenge-card-foot">
                        <span>
                          <Users size={14} />
                          {c.participants}명 · 예시
                        </span>
                        <b>+{c.reward} HC</b>
                      </div>
                      <span className="challenge-state">
                        {state.joined.includes(c.id)
                          ? "참여 중인 챌린지"
                          : "챌린지 자세히 보기"}
                        <ArrowRight size={16} />
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </>
          )}
          {page === "health" && (
            <>
              <PageIntro
                eyebrow="ONE MINUTE FOR YOUR HEALTH"
                title="나를 위한 1분 건강글"
                description="건강한 지식이 건강한 습관으로. 매일 조금씩 배워가요."
              />
              <section className="editor-pick">
                <div>
                  <span className="pill light">
                    <Stethoscope size={14} /> 치과의사 기획 · 에디터 픽
                  </span>
                  <h2>
                    매일 하는 양치,
                    <br />
                    제대로 하고 있을까요?
                  </h2>
                  <p>양치 후 가글까지, 나의 구강 습관을 돌아보는 1분.</p>
                  <Button
                    onClick={() => setModal({ kind: "article", id: "teeth" })}
                  >
                    오늘의 건강글 읽기
                    <ArrowRight size={16} />
                  </Button>
                </div>
                <img
                  src={img("clinic")}
                  alt="양치 습관을 안내하는 치아 일러스트"
                />
              </section>
              <div className="list-toolbar">
                <div className="chips">
                  {["전체", "구강 건강", "운동·생활", "혈압·혈당"].map((c) => (
                    <button
                      className={category === c ? "selected" : ""}
                      key={c}
                      onClick={() => setCategory(c)}
                    >
                      {c}
                    </button>
                  ))}
                </div>
                <label className="search-box">
                  <Search size={17} />
                  <input
                    placeholder="건강글 검색"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    aria-label="건강글 검색"
                  />
                </label>
              </div>
              <div className="article-grid full-grid">
                {articles
                  .filter(
                    (a) =>
                      (category === "전체" || a.category === category) &&
                      (a.title + a.desc).includes(search),
                  )
                  .map(articleCard)}
              </div>
              {!articles.some(
                (a) =>
                  (category === "전체" || a.category === category) &&
                  (a.title + a.desc).includes(search),
              ) && (
                <Empty
                  icon={Search}
                  title="검색 결과가 없어요"
                  description="다른 검색어나 카테고리를 선택해 주세요."
                />
              )}
              <div className="info-note">
                <ShieldCheck size={20} />
                <p>
                  프로토타입의 건강글은 공개 자료를 참고한 샘플로, 의료진의 최종
                  감수 전입니다. 일반 건강 정보이며 개인의 진단·치료를 대신하지
                  않습니다. 읽기 보상은 가상 스폰서 재원으로 시연됩니다.
                </p>
              </div>
            </>
          )}
          {page === "local" && (
            <>
              <PageIntro
                eyebrow="GOOD FOR YOU, GOOD FOR YOUR NEIGHBORHOOD"
                title="가까운 곳에서 누리는 건강한 혜택"
                description="차곡차곡 모은 HC, 우리 동네 좋은 가게에서 사용해요."
              />
              <div className="local-banner">
                <div>
                  <MapPin size={22} />
                  <strong>전주 {state.neighborhood}</strong>
                  <span>내 주변 시연 가맹점 {stores.length}곳</span>
                </div>
                <button
                  onClick={() => {
                    setOnboardStep(0);
                    setModal({ kind: "onboarding" });
                  }}
                >
                  동네 변경
                  <ChevronDown size={15} />
                </button>
              </div>
              <div className="map-panel">
                <svg
                  viewBox="0 0 1200 260"
                  preserveAspectRatio="xMidYMid slice"
                  role="img"
                  aria-label="실제 지도가 아닌 시연 가맹점 위치 안내"
                >
                  <defs>
                    <pattern
                      id="mapblocks"
                      width="120"
                      height="90"
                      patternUnits="userSpaceOnUse"
                    >
                      <rect width="120" height="90" fill="#edf0e8" />
                      <rect
                        x="9"
                        y="9"
                        width="99"
                        height="69"
                        rx="9"
                        fill="#e3e8db"
                        stroke="#d7dfd0"
                      />
                    </pattern>
                  </defs>
                  <rect width="1200" height="260" fill="url(#mapblocks)" />
                  <path
                    d="M800 -50 Q680 80 700 150 T580 320"
                    fill="none"
                    stroke="#c2dedc"
                    strokeWidth="70"
                  />
                  <path
                    d="M0 180 1200 70M320 -20 450 300"
                    stroke="#fff"
                    strokeWidth="24"
                  />
                  <path d="M0 180 1200 70" stroke="#e6dfc2" strokeWidth="3" />
                  <text x="735" y="100" fill="#6b9990" fontSize="15">
                    전주천
                  </text>
                  <text x="170" y="225" fill="#8e9a84" fontSize="15">
                    효자동
                  </text>
                </svg>
                {stores.map((s, i) => (
                  <button
                    key={s.id}
                    className={`map-pin pin-${i}`}
                    onClick={() => setModal({ kind: "store", id: s.id })}
                  >
                    <StoreIcon size={15} />
                    {s.name}
                  </button>
                ))}
                <span className="map-disclaimer">
                  시연용 약도 · 실제 위치와 다릅니다
                </span>
              </div>
              <div className="list-toolbar">
                <div className="chips">
                  {["전체", "건강한 식사", "운동·웰니스"].map((c) => (
                    <button
                      className={storeCategory === c ? "selected" : ""}
                      key={c}
                      onClick={() => setStoreCategory(c)}
                    >
                      {c}
                    </button>
                  ))}
                </div>
                <span className="muted">가까운 거리순 · 예시</span>
              </div>
              <div className="store-grid">
                {stores
                  .filter(
                    (s) =>
                      storeCategory === "전체" || s.category === storeCategory,
                  )
                  .map(storeCard)}
              </div>
              <div className="info-note">
                <ShieldCheck size={19} />
                <p>
                  모든 가맹점·거리·혜택은 시연용입니다. HC는 현금으로 교환되지
                  않으며, 병의원·약국·의료기기·치료 효능 상품에는 사용할 수
                  없어요.
                </p>
              </div>
            </>
          )}
          {page === "records" && (
            <>
              <PageIntro
                eyebrow="GET TO KNOW YOURSELF BETTER"
                title="기록할수록 보이는 나의 건강"
                description="내 몸의 작은 변화를 차분히 기록해 보세요."
              />
              {!recordConsent ? (
                <section className="consent-card card">
                  <span className="consent-art">
                    <HeartPulse size={53} strokeWidth={1.5} />
                  </span>
                  <h2>건강 기록은 나의 선택이에요</h2>
                  <p>
                    혈압과 검사 수치를 한곳에서 살펴보고,
                    <br />
                    나에게 맞는 건강 습관을 찾아보세요.
                  </p>
                  <div className="consent-points">
                    <span>
                      <ShieldCheck size={18} /> 별도의 선택 동의로 시작해요
                    </span>
                    <span>
                      <Heart size={18} /> 동의하지 않아도 걷기·리워드는 이용할
                      수 있어요
                    </span>
                    <span>
                      <X size={18} /> 철회하면 입력 기록을 즉시 삭제해요
                    </span>
                  </div>
                  <div className="info-note">
                    <CircleHelp size={18} />
                    <p>
                      이 프로토타입은 서버에 건강 정보를 전송하지 않습니다.
                      입력은 메모리에만 유지되며 새로고침 시 사라집니다. 실제
                      개인정보 대신 예시 수치를 입력해 주세요.
                    </p>
                  </div>
                  <label className="check-label">
                    <input
                      type="checkbox"
                      checked={consentChoice}
                      onChange={(e) => setConsentChoice(e.target.checked)}
                    />
                    <span>
                      [선택] 시연용 건강 기록의 수집·이용에 동의합니다.
                      <small>
                        항목: 혈압·검사 수치 / 목적: 기록 화면 시연 / 보관: 현재
                        페이지 이용 중 / 거부 가능
                      </small>
                    </span>
                  </label>
                  <Button
                    disabled={!consentChoice}
                    onClick={() => {
                      setRecordConsent(true);
                      message(
                        "건강 기록 시연을 시작해요. 실제 개인정보 대신 예시 수치를 사용해 주세요.",
                      );
                    }}
                  >
                    동의하고 기록 시작하기
                    <ArrowRight size={16} />
                  </Button>
                </section>
              ) : (
                <>
                  <div className="two-columns">
                    <section className="card">
                      <SectionHeading
                        title="나의 혈압 기록"
                        sub="매일 같은 시간, 편안한 상태에서 측정해요"
                        action="기록하기"
                        onAction={() => setModal({ kind: "bp" })}
                      />
                      {records.length ? (
                        <>
                          <div className="bp-current">
                            <strong>
                              {records[0].sys}
                              <span>/</span>
                              {records[0].dia}
                            </strong>
                            <small>mmHg · 최근 기록</small>
                          </div>
                          <div className="bp-chart">
                            <svg
                              viewBox="0 0 500 150"
                              role="img"
                              aria-label="입력한 혈압 추이"
                            >
                              <path
                                d="M20 30H480M20 80H480M20 130H480"
                                stroke="#e7ece8"
                                fill="none"
                              />
                              {records.length > 1 && (
                                <polyline
                                  points={[...records]
                                    .reverse()
                                    .slice(-7)
                                    .map(
                                      (r, i) =>
                                        `${30 + i * 65},${140 - (r.sys - 60) * 1.05}`,
                                    )
                                    .join(" ")}
                                  fill="none"
                                  stroke="#257659"
                                  strokeWidth="3"
                                />
                              )}
                              {[...records]
                                .reverse()
                                .slice(-7)
                                .map((r, i) => (
                                  <g key={i}>
                                    <circle
                                      cx={30 + i * 65}
                                      cy={140 - (r.sys - 60) * 1.05}
                                      r="5"
                                      fill="#257659"
                                    />
                                    <circle
                                      cx={30 + i * 65}
                                      cy={140 - (r.dia - 40) * 1.05}
                                      r="4"
                                      fill="#e8a57e"
                                    />
                                  </g>
                                ))}
                            </svg>
                            <div className="chart-legend">
                              <span>● 수축기</span>
                              <span>● 이완기</span>
                            </div>
                          </div>
                          {records.slice(0, 5).map((r, i) => (
                            <div className="record-row" key={i}>
                              <span>
                                {r.date} · 기록 {records.length - i}
                              </span>
                              <b>
                                {r.sys} / {r.dia} mmHg
                              </b>
                            </div>
                          ))}
                          <p className="fine">
                            추이는 최대 최근 7회 기록을 표시합니다. 개인의
                            진단·치료 판단에 사용할 수 없습니다.
                          </p>
                        </>
                      ) : (
                        <Empty
                          icon={HeartPulse}
                          title="첫 혈압을 기록해 볼까요?"
                          description="예시 수치로 입력 흐름을 체험해 보세요."
                          action="혈압 기록하기"
                          onAction={() => setModal({ kind: "bp" })}
                        />
                      )}
                    </section>
                    <section className="card">
                      <SectionHeading
                        title="검사 결과를 한곳에"
                        sub="검사 수치를 직접 확인하고 입력해요"
                      />
                      {labs ? (
                        <>
                          <div className="lab-tile">
                            <span>LDL 콜레스테롤</span>
                            <strong>
                              {labs.ldl}
                              <small>mg/dL</small>
                            </strong>
                            <p>
                              기록한 수치 · 기준 해석은 의료진과 상담하세요.
                            </p>
                          </div>
                          <div className="lab-tile">
                            <span>공복혈당</span>
                            <strong>
                              {labs.glucose}
                              <small>mg/dL</small>
                            </strong>
                            <p>식사·약물·검사 조건에 따라 달라질 수 있어요.</p>
                          </div>
                          <Button
                            kind="secondary"
                            onClick={() => setModal({ kind: "upload" })}
                          >
                            수치 다시 입력하기
                          </Button>
                        </>
                      ) : (
                        <Empty
                          icon={Upload}
                          title="내 몸을 알아가는 첫 기록"
                          description="파일을 전송하지 않고, 예시 검사 수치를 직접 입력합니다."
                          action="검사 기록 체험하기"
                          onAction={() => setModal({ kind: "upload" })}
                        />
                      )}
                    </section>
                  </div>
                  <div className="privacy-row">
                    <span>
                      <ShieldCheck size={18} /> 시연 기록은 현재 페이지의
                      메모리에만 보관됩니다.
                    </span>
                    <button
                      className="danger-text"
                      onClick={() => {
                        setRecordConsent(false);
                        setConsentChoice(false);
                        setRecords([]);
                        setLabs(null);
                        message("건강 기록을 삭제하고 동의를 철회했어요.");
                      }}
                    >
                      동의 철회·기록 삭제
                    </button>
                  </div>
                </>
              )}
              <div className="info-note">
                <Stethoscope size={20} />
                <p>
                  이 서비스는 건강 관리 기록을 돕는 프로토타입이며
                  진단·의료기기가 아닙니다. 불편한 증상이 있거나 수치가 걱정되면
                  의료기관에 상담하세요.
                </p>
              </div>
            </>
          )}
          {page === "rewards" && (
            <>
              <PageIntro
                eyebrow="HEALTHY HABITS, HAPPY REWARDS"
                title="건강한 습관에 기분 좋은 보상"
                description="꾸준히 쌓은 건강, 더 다양한 혜택으로 만나보세요."
              />
              <div className="reward-tier">
                <div className="big-medal">
                  <Award size={52} />
                </div>
                <div>
                  <span className="eyebrow">MY HEALTHY LEVEL</span>
                  <h2>
                    {currentTier.name} <span>건강한 루틴을 만드는 중</span>
                  </h2>
                  <p>
                    누적 {num(state.xp)} XP · XP는 등급을 위한 경험치로, 현금
                    가치가 없어요.
                  </p>
                  <Progress
                    value={(state.xp / 20000) * 100}
                    label="다이아몬드 등급까지"
                  />
                  <div className="tier-steps">
                    {["Bronze", "Silver", "Gold", "Platinum", "Diamond"].map(
                      (t, i) => (
                        <span
                          className={t === currentTier.name ? "selected" : ""}
                          key={t}
                        >
                          {t}
                          <small>{num([0, 1500, 4000, 9000, 20000][i])}</small>
                        </span>
                      ),
                    )}
                  </div>
                </div>
              </div>
              <SectionHeading
                title="나를 위한 동네 쿠폰"
                sub="모든 쿠폰은 시연용이며 실제 매장에서 사용할 수 없습니다"
              />
              <div className="coupon-grid">
                {[
                  {
                    id: "coffee",
                    title: "산책 후, 따뜻한 한 잔",
                    benefit: "아메리카노 1,000원 할인",
                    store: "초록 커피 · 예시",
                    image: "park",
                    min: 0,
                  },
                  {
                    id: "class",
                    title: "나를 돌보는 시간",
                    benefit: "필라테스 체험 20% 할인",
                    store: "오늘의 필라테스 · 예시",
                    image: "gym",
                    min: 1500,
                  },
                  {
                    id: "stay",
                    title: "건강한 주말의 쉼표",
                    benefit: "웰니스 스테이 30% 할인",
                    store: "전주 웰니스 · 예시",
                    image: "hotel",
                    min: 4000,
                  },
                ].map((c) => (
                  <div className="coupon-card" key={c.id}>
                    <img src={img(c.image)} alt="" />
                    <div>
                      <span className="category-label">
                        스폰서 혜택 · 광고·예시
                      </span>
                      <p>{c.store}</p>
                      <h3>{c.benefit}</h3>
                      <span className="fine">
                        {c.title} ·{" "}
                        {c.min === 0
                          ? "모든 등급"
                          : c.min === 1500
                            ? "Silver 이상"
                            : "Gold 이상"}
                      </span>
                      <Button
                        kind={
                          state.coupons.includes(c.id) ? "secondary" : "primary"
                        }
                        disabled={state.xp < c.min}
                        onClick={() => {
                          if (state.coupons.includes(c.id))
                            setModal({ kind: "coupon", id: c.id });
                          else {
                            setState((s) => ({
                              ...s,
                              coupons: [...s.coupons, c.id],
                            }));
                            message(
                              "시연 쿠폰을 받았어요. 내 쿠폰에서 확인할 수 있어요.",
                            );
                          }
                        }}
                      >
                        {state.xp < c.min ? (
                          <>
                            <Award size={16} />
                            Gold 등급에서 열려요
                          </>
                        ) : state.coupons.includes(c.id) ? (
                          <>
                            <Check size={16} />내 쿠폰 보기
                          </>
                        ) : (
                          <>
                            <Gift size={16} />
                            쿠폰 받기
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="reward-info">
                <Gift size={28} />
                <div>
                  <h3>매일의 실천이, 다음 혜택을 열어요</h3>
                  <p>
                    걷기·읽기·기록으로 XP를 모으세요. 경품 추첨·룰렛은 운영
                    규정과 확률 검토 후 출시 단계에서 제공할 예정입니다.
                  </p>
                </div>
                <Button kind="secondary" onClick={() => go("missions")}>
                  미션 보러 가기
                  <ArrowRight size={16} />
                </Button>
              </div>
            </>
          )}
          {page === "wallet" && (
            <>
              <PageIntro
                eyebrow="YOUR HEALTHY VALUE"
                title="차곡차곡 쌓인 건강의 가치"
                description="HC의 적립부터 사용까지, 투명하게 확인하세요."
              />
              <div className="wallet-summary">
                <div>
                  <span>사용 가능한 헬시캐시</span>
                  <strong>
                    {num(state.balance)}
                    <small>HC</small>
                  </strong>
                  <Button onClick={() => go("local")}>
                    <QrCode size={17} />
                    동네에서 사용하기
                  </Button>
                </div>
                <div>
                  <span>누적 적립</span>
                  <strong>
                    {num(
                      state.transactions
                        .filter((t) => t.hc > 0)
                        .reduce((v, t) => v + t.hc, 0),
                    )}
                    <small>HC</small>
                  </strong>
                  <span className="fine">스폰서·운영사 재원 구분</span>
                </div>
                <div>
                  <span>누적 사용</span>
                  <strong>
                    {num(
                      -state.transactions
                        .filter((t) => t.hc < 0)
                        .reduce((v, t) => v + t.hc, 0),
                    )}
                    <small>HC</small>
                  </strong>
                  <span className="fine">동네 가맹점에서 사용한 캐시</span>
                </div>
              </div>
              <section className="card">
                <SectionHeading
                  title="나의 HC·XP 내역"
                  action="CSV 내려받기"
                  onAction={exportLedger}
                />
                <div className="chips ledger-chips">
                  {["전체", "적립", "사용"].map((f) => (
                    <button
                      key={f}
                      className={ledgerFilter === f ? "selected" : ""}
                      onClick={() => setLedgerFilter(f)}
                    >
                      {f}
                    </button>
                  ))}
                </div>
                <div className="ledger-list">
                  {state.transactions
                    .filter(
                      (t) =>
                        ledgerFilter === "전체" ||
                        (ledgerFilter === "적립" ? t.hc >= 0 : t.hc < 0),
                    )
                    .map((t) => (
                      <div className="ledger-row" key={t.id}>
                        <IconBox
                          icon={t.hc < 0 ? ArrowUpRight : ArrowDownLeft}
                          color={t.hc < 0 ? "peach" : "green"}
                        />
                        <div>
                          <strong>{t.title}</strong>
                          <span>
                            {t.date} · {t.source} 재원
                          </span>
                        </div>
                        <div className={t.hc < 0 ? "spent" : "earned"}>
                          <strong>
                            {t.hc !== 0
                              ? `${t.hc > 0 ? "+" : ""}${num(t.hc)} HC`
                              : ""}
                          </strong>
                          {t.xp > 0 && <small>+{num(t.xp)} XP</small>}
                        </div>
                      </div>
                    ))}
                </div>
                {!state.transactions.some(
                  (t) =>
                    ledgerFilter === "전체" ||
                    (ledgerFilter === "적립" ? t.hc >= 0 : t.hc < 0),
                ) && (
                  <Empty
                    icon={Wallet}
                    title="아직 사용 내역이 없어요"
                    description="동네 혜택에서 HC 사용을 체험해 보세요."
                  />
                )}
              </section>
              <div className="info-note">
                <CircleHelp size={19} />
                <p>
                  이 원장은 브라우저에 저장되는 시연 데이터입니다. HC는 현금
                  교환·송금이 불가하며 의료기관에서는 사용할 수 없습니다.
                  유효기간·발행 한도는 실제 서비스 운영 전 확정됩니다.
                </p>
              </div>
            </>
          )}
          {page === "admin" && (
            <>
              <PageIntro
                eyebrow="HEALTHY CASH PARTNERS"
                title="건강한 동네, 지속 가능한 운영"
                description="리워드의 재원부터 사용까지 한눈에 관리합니다. 모든 지표는 예시입니다."
              />
              <div className="admin-alert">
                <LayoutDashboard size={17} /> 운영 시연 모드 · 실제 사업 실적이
                아닌 기획 검증용 예시 데이터입니다.
              </div>
              <div className="chips admin-tabs">
                {[
                  "운영 현황",
                  "HC 경제",
                  "콘텐츠 감수",
                  "스폰서 성과",
                  "병원 파트너",
                ].map((t) => (
                  <button
                    key={t}
                    className={adminTab === t ? "selected" : ""}
                    onClick={() => setAdminTab(t)}
                  >
                    {t}
                  </button>
                ))}
              </div>
              {(adminTab === "운영 현황" || adminTab === "HC 경제") && (
                <>
                  <div className="admin-stats">
                    {[
                      {
                        label: "주간 활성 사용자",
                        value: "682",
                        unit: "명",
                        icon: Users,
                        change: "파일럿 목표 600명",
                      },
                      {
                        label: "미상환 HC",
                        value: num(1480000 + state.balance - 2480),
                        unit: "HC",
                        icon: Wallet,
                        change: "소각 여력 대비 62%",
                      },
                      {
                        label: "활성 시연 가맹점",
                        value: "32",
                        unit: "곳",
                        icon: StoreIcon,
                        change: "의료기관·약국 제외",
                      },
                      {
                        label: "쿠폰 사용률",
                        value: "28.4",
                        unit: "%",
                        icon: Gift,
                        change: "파일럿 목표 25%",
                      },
                    ].map((s) => (
                      <div className="card admin-stat" key={s.label}>
                        <div>
                          <span>{s.label}</span>
                          <s.icon size={19} />
                        </div>
                        <strong>
                          {s.value}
                          <small>{s.unit}</small>
                        </strong>
                        <p>{s.change}</p>
                      </div>
                    ))}
                  </div>
                  <div className="two-columns">
                    <section className="card">
                      <SectionHeading
                        title="HC 경제 건전성"
                        sub="운영사·스폰서 발행과 가맹점 사용의 균형"
                      />
                      <div className="economy-meter">
                        <div>
                          <strong>
                            62<span>%</span>
                          </strong>
                          <small>미상환 / 소각 여력 · 예시</small>
                        </div>
                        <span className="pill light">
                          <CheckCircle2 size={14} />
                          안정 구간
                        </span>
                      </div>
                      <Progress value={62} label="소각 여력 대비 미상환 비율" />
                      <div className="economy-labels">
                        <span>0%</span>
                        <span>발행 축소 기준 80%</span>
                        <span>100%</span>
                      </div>
                      <div className="metric-row">
                        <span>월 발행 캡 · 운영사 재원</span>
                        <strong>
                          500,000 HC <small>예시</small>
                        </strong>
                      </div>
                      <div className="metric-row">
                        <span>스폰서 선입금 재원</span>
                        <strong>
                          1,200,000 HC <small>예시</small>
                        </strong>
                      </div>
                      <div className="metric-row">
                        <span>시연 사용자 현재 잔액</span>
                        <strong>{num(state.balance)} HC</strong>
                      </div>
                      <Button kind="secondary" onClick={exportLedger}>
                        <Download size={16} />
                        시연 사용자 원장 CSV
                      </Button>
                    </section>
                    <section className="card">
                      <SectionHeading
                        title="건강 행동이 동네 소비로"
                        sub="성과 퍼널 · 예시 데이터"
                      />
                      {[
                        { label: "콘텐츠 노출", n: "12,480", v: 100 },
                        { label: "미션 참여", n: "2,416", v: 76 },
                        { label: "챌린지 완주", n: "1,208", v: 54 },
                        { label: "쿠폰 사용", n: "343", v: 32 },
                        { label: "가맹점 재방문", n: "127", v: 19 },
                      ].map((f, i) => (
                        <div className="funnel-row" key={f.label}>
                          <span>{f.label}</span>
                          <div
                            style={{ width: `${f.v}%`, opacity: 1 - i * 0.12 }}
                          />
                          <strong>{f.n}</strong>
                        </div>
                      ))}
                      <div className="info-note">
                        <ShieldCheck size={16} />
                        <p>
                          병원 광고는 월정액 노출형입니다. 상담·예약·내원 건수와
                          과금·보상을 연동하지 않습니다.
                        </p>
                      </div>
                    </section>
                  </div>
                </>
              )}
              {adminTab === "콘텐츠 감수" && (
                <section className="card">
                  <SectionHeading
                    title="신뢰를 만드는 5단계 감수"
                    sub="실제 의료진의 감수·심의는 별도로 진행해야 합니다"
                  />
                  <div className="review-steps">
                    {[
                      "원고 접수",
                      "원장단 검수",
                      "교수 자문",
                      "광고·법무 확인",
                      "발행 준비",
                    ].map((s, i) => (
                      <div
                        key={s}
                        className={
                          i < 2 || (reviewed && i === 2) ? "complete" : ""
                        }
                      >
                        <span>{i + 1}</span>
                        <strong>{s}</strong>
                        <small>
                          {i === 1
                            ? "진행 예시"
                            : i === 2 && reviewed
                              ? "자문 대기"
                              : "워크플로 시연"}
                        </small>
                      </div>
                    ))}
                  </div>
                  <div className="review-item">
                    <BookOpen size={23} />
                    <div>
                      <strong>양치 후 가글, 바로 해도 괜찮을까요?</strong>
                      <p>구강 건강 · 원고 샘플 · 출처 1건</p>
                    </div>
                    <span className="pill light">
                      {reviewed ? "교수 자문 대기" : "원장단 검수 대기"}
                    </span>
                    <Button
                      onClick={() => {
                        setReviewed(true);
                        message(
                          "시연 원고를 교수 자문 단계로 이동했어요. 실제 감수 완료를 의미하지 않습니다.",
                        );
                      }}
                      disabled={reviewed}
                    >
                      {reviewed ? "이동 완료" : "다음 단계로 이동"}
                    </Button>
                  </div>
                  <div className="info-note">
                    <ShieldCheck size={18} />
                    <p>
                      감수자·출처·갱신일·광고 표기가 검증된 원고만 실제 발행할
                      수 있습니다. 이 버튼은 운영 흐름의 시연이며 앱의 건강글을
                      감수 완료 상태로 바꾸지 않습니다.
                    </p>
                  </div>
                </section>
              )}
              {adminTab === "스폰서 성과" && (
                <section className="card">
                  <SectionHeading
                    title="스폰서 챌린지 리포트"
                    sub="선입금 재원 안에서 발행하는 건강 행동 보상 · 예시"
                  />
                  <div className="table-scroll">
                    <table>
                      <thead>
                        <tr>
                          <th>캠페인</th>
                          <th>참여자</th>
                          <th>완주자</th>
                          <th>보상</th>
                          <th>모델</th>
                        </tr>
                      </thead>
                      <tbody>
                        {challenges.map((c) => (
                          <tr key={c.id}>
                            <td>
                              <strong>{c.title}</strong>
                              <small>{c.sponsor}</small>
                            </td>
                            <td>{c.participants}명</td>
                            <td>{Math.floor(c.participants * 0.63)}명</td>
                            <td>{c.reward} HC</td>
                            <td>스폰서 선입금</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="business-models">
                    {[
                      "가맹점: 월정액 입점",
                      "스폰서: 캠페인 예산",
                      "병원: 월정액 노출 광고",
                    ].map((t) => (
                      <div key={t}>
                        <CheckCircle2 size={18} />
                        {t}
                      </div>
                    ))}
                  </div>
                </section>
              )}
              {adminTab === "병원 파트너" && (
                <section className="card">
                  <SectionHeading
                    title="병원 안내는 확인된 정보로만"
                    sub="월정액 노출형 광고 · 환자·상담 건수와 무관한 과금"
                  />
                  <div className="hospital-status">
                    <ShieldCheck size={28} />
                    <div>
                      <strong>
                        {hospitalSubmitted
                          ? "심의 증빙 확인 대기 · 비공개"
                          : "심의 미확인 · 비공개"}
                      </strong>
                      <p>
                        심의번호 입력만으로는 공개되지 않습니다. 운영팀의 심의
                        증빙·유효성 확인 후에만 게시하는 흐름입니다.
                      </p>
                    </div>
                    <span className="pill light">운영 화면 시연</span>
                  </div>
                  <div className="two-columns hospital-columns">
                    <div className="hospital-template">
                      <span className="category-label">
                        광고 · 병원 안내 템플릿 미리보기
                      </span>
                      <h3>병원명 입력 영역</h3>
                      <div className="detail-row">
                        <Stethoscope size={17} />
                        진료과 · 의료진 소개
                      </div>
                      <div className="detail-row">
                        <MapPin size={17} />
                        의료기관 주소 · 주차 정보
                      </div>
                      <div className="detail-row">
                        <Clock3 size={17} />
                        진료시간 · 휴진일
                      </div>
                      <p className="fine">
                        실제 병원이나 승인된 광고가 아닙니다. 심의되지 않은
                        연락처·진료·추천 정보는 사용자에게 노출하지 않습니다.
                      </p>
                      <div className="button-row">
                        <Button kind="secondary" disabled>
                          전화 · 공개 후 활성화
                        </Button>
                        <Button kind="secondary" disabled>
                          홈페이지 · 공개 후 활성화
                        </Button>
                      </div>
                    </div>
                    <form
                      className="hospital-form"
                      onSubmit={(e) => {
                        e.preventDefault();
                        setHospitalSubmitted(true);
                        message(
                          "시연 요청을 확인 대기로 이동했어요. 실제 심의 접수·승인이나 공개는 발생하지 않습니다.",
                        );
                      }}
                    >
                      <label className="form-label">
                        심의번호 등록 시연
                        <input
                          placeholder="실제 번호 대신 예시 문구를 입력하세요"
                          minLength={5}
                          maxLength={60}
                          required
                          aria-label="시연 심의번호"
                        />
                      </label>
                      <p className="fine">
                        입력은 현재 화면의 시연에만 사용하며 저장·전송되지
                        않습니다. 병원 소개 페이지 공개 여부는 서버에서 별도
                        검증해야 합니다.
                      </p>
                      <Button type="submit" disabled={hospitalSubmitted}>
                        {hospitalSubmitted
                          ? "증빙 확인 대기"
                          : "확인 대기 상태로 이동"}
                      </Button>
                    </form>
                  </div>
                  <div className="info-note">
                    <ShieldCheck size={18} />
                    <p>
                      병원 방문·상담·예약에는 HC·XP 보상을 제공하지 않습니다.
                      병의원·약국은 HC 사용 대상에서 제외합니다. 대표자 소속
                      병원의 유료 광고 제외 및 이해상충 공시는 실제 입점 심사 시
                      확인할 항목입니다.
                    </p>
                  </div>
                </section>
              )}
            </>
          )}
          <footer className="main-footer">
            <span>
              <HeartPulse size={14} /> 건강한 나, 건강한 우리 동네.
            </span>
            <span>
              Healthy Cash <b>PROTOTYPE v0.1</b>
            </span>
          </footer>
        </main>
      </div>
      <nav className="mobile-bottom-nav" aria-label="모바일 메뉴">
        {nav
          .filter((n) => n.id !== "records")
          .map((n) => (
            <button
              key={n.id}
              className={page === n.id ? "active" : ""}
              onClick={() => go(n.id)}
            >
              <n.icon size={21} />
              <span>
                {n.label === "미션·챌린지"
                  ? "미션"
                  : n.label === "1분 건강글"
                    ? "건강글"
                    : n.label}
              </span>
            </button>
          ))}
      </nav>
      {toast && (
        <div className="toast" role="status">
          <CheckCircle2 size={19} />
          {toast}
          <button onClick={() => setToast("")} aria-label="메시지 닫기">
            <X size={15} />
          </button>
        </div>
      )}
      {modal && (
        <div
          className="modal-backdrop"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setModal(null);
          }}
        >
          <div
            className={`modal ${modal.kind === "article" ? "article-modal" : ""} ${modal.kind === "about" ? "about-modal" : ""}`}
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
            ref={dialogRef}
          >
            <div className="modal-header">
              <span>
                {modal.kind === "article"
                  ? "1분 건강글"
                  : modal.kind === "pay"
                    ? "HC 사용 시연"
                    : modal.kind === "about"
                      ? "Healthy Cash"
                      : modal.kind === "onboarding"
                        ? "우리 동네부터 시작해요"
                        : "건강한 일상의 시작"}
              </span>
              <button
                className="icon-button"
                aria-label="닫기"
                onClick={() => setModal(null)}
              >
                <X size={21} />
              </button>
            </div>
            <div
              className="modal-body"
              onScroll={(e) => {
                if (modal.kind === "article") {
                  const el = e.currentTarget;
                  if (el.scrollTop + el.clientHeight >= el.scrollHeight - 45)
                    setReadEnd(true);
                }
              }}
            >
              {modal.kind === "article" && (
                <>
                  <div className="article-detail-image">
                    <img src={img(selectedArticle.image)} alt="" />
                    <span className="pill light">
                      {selectedArticle.category} · {selectedArticle.time}분
                    </span>
                  </div>
                  <div className="article-detail-heading">
                    <span className="category-label">
                      {selectedArticle.sponsor
                        ? "광고 · 헬시라이프 스폰서 예시"
                        : "시연 스폰서 재원 · 완독 +100 HC"}
                    </span>
                    <h2 id="modal-title">{selectedArticle.title}</h2>
                    <p>{selectedArticle.desc}</p>
                    <div className="reviewer">
                      <ShieldCheck size={19} />
                      <div>
                        <strong>치과의사 기획 기반 · 콘텐츠 샘플</strong>
                        <small>
                          의료진 최종 감수 전 · 샘플 작성일 2026.10.23
                        </small>
                      </div>
                    </div>
                  </div>
                  <div className="article-prose">
                    <p className="lead">{selectedArticle.lead}</p>
                    {selectedArticle.sections.map(([h, p], i) => (
                      <section key={h}>
                        <span className="article-section-no">0{i + 1}</span>
                        <h3>{h}</h3>
                        <p>{p}</p>
                      </section>
                    ))}
                    <div className="article-source">
                      <strong>출처와 안내</strong>
                      <a
                        href={selectedArticle.url}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {selectedArticle.source}
                        <ArrowUpRight size={14} />
                      </a>
                      <p>
                        공개 자료를 참고한 일반 건강 정보입니다. 개인의
                        진단·치료를 대신하지 않으며 최종 감수 후 실제 서비스에
                        제공됩니다.
                      </p>
                    </div>
                    <div className="hospital-public-note">
                      <Stethoscope size={22} />
                      <div>
                        <strong>병원 안내는 건강글과 분리해요</strong>
                        <p>
                          광고 심의가 확인된 파트너만 안내합니다. 현재 등록된
                          병원은 없으며, 진료·예약에 보상을 제공하지 않습니다.
                        </p>
                      </div>
                      <span className="pill light">광고 영역 · 준비 중</span>
                    </div>
                    <div className="quiz">
                      <span className="category-label">
                        <Sparkles size={14} /> 10초 건강 퀴즈
                      </span>
                      <h3>{selectedArticle.question}</h3>
                      <div>
                        <button
                          className={quiz === true ? "selected" : ""}
                          onClick={() => {
                            setQuiz(true);
                            setReadEnd(true);
                          }}
                        >
                          그렇다 O
                        </button>
                        <button
                          className={quiz === false ? "selected" : ""}
                          onClick={() => {
                            setQuiz(false);
                            setReadEnd(true);
                          }}
                        >
                          아니다 X
                        </button>
                      </div>
                      {quiz !== null && (
                        <p
                          className={
                            quiz === selectedArticle.answer
                              ? "correct"
                              : "incorrect"
                          }
                        >
                          {quiz === selectedArticle.answer
                            ? "맞아요! 오늘 배운 습관을 가볍게 실천해 보세요."
                            : "본문의 안내를 다시 확인해 보세요."}
                        </p>
                      )}
                    </div>
                    <div className="reading-reward">
                      <div>
                        <strong>읽고, 배우고, 건강을 쌓아요</strong>
                        <small>
                          {state.claims.includes(
                            `article:${selectedArticle.id}`,
                          )
                            ? "이 글의 보상을 이미 받았어요"
                            : reading < 10
                              ? `읽기 확인 중 · ${10 - reading}초 후 보상 가능`
                              : "읽기 시간이 충족되었어요 · 퀴즈도 확인해 주세요"}
                        </small>
                      </div>
                      <Button
                        disabled={
                          state.claims.includes(
                            `article:${selectedArticle.id}`,
                          ) ||
                          reading < 10 ||
                          !readEnd ||
                          quiz !== selectedArticle.answer
                        }
                        onClick={() =>
                          claim(
                            `article:${selectedArticle.id}`,
                            "건강글 완독 · " +
                              selectedArticle.title.replace("\n", " "),
                            100,
                            20,
                            "스폰서",
                          )
                        }
                      >
                        {state.claims.includes(
                          `article:${selectedArticle.id}`,
                        ) ? (
                          <>
                            <Check size={17} />
                            적립 완료
                          </>
                        ) : (
                          <>다 읽었어요 +100 HC</>
                        )}
                      </Button>
                    </div>
                    <p className="fine">
                      화면 체류 10초·본문 확인·퀴즈 정답 후 글당 한 번
                      적립됩니다. 실서비스에서는 문서 기준의 완독 검증을 서버와
                      함께 적용합니다.
                    </p>
                  </div>
                </>
              )}
              {modal.kind === "store" && (
                <>
                  <img
                    className="modal-hero"
                    src={img(selectedStore.image)}
                    alt={selectedStore.menu}
                  />
                  <span className="category-label">
                    {selectedStore.category} · 시연 가맹점
                  </span>
                  <h2 id="modal-title">{selectedStore.name}</h2>
                  <p className="modal-sub">{selectedStore.desc}</p>
                  <div className="store-tags">
                    {selectedStore.tags.map((t) => (
                      <span key={t}>{t}</span>
                    ))}
                  </div>
                  <div className="detail-row">
                    <MapPin size={17} />
                    {selectedStore.address}
                  </div>
                  <div className="detail-row">
                    <Clock3 size={17} />
                    11:00–21:00 · 영업시간 예시
                  </div>
                  <div className="store-menu">
                    <span>{selectedStore.menu}</span>
                    <strong>{num(selectedStore.price)}원</strong>
                  </div>
                  <div className="benefit-box">
                    <Gift size={23} />
                    <div>
                      <strong>
                        결제 금액의 {selectedStore.limit}%까지 HC 사용
                      </strong>
                      <p>1 HC = 1원 할인 · 보유 HC 한도 내</p>
                    </div>
                  </div>
                  <p className="fine">
                    실제 제휴되지 않은 가상 가게입니다. 결제는 가상 잔액만
                    차감하며 카드·현금 결제는 발생하지 않습니다.
                  </p>
                  <Button
                    onClick={() =>
                      setModal({ kind: "pay", id: selectedStore.id })
                    }
                  >
                    <QrCode size={18} />
                    HC 사용 체험하기
                  </Button>
                </>
              )}
              {modal.kind === "pay" && (
                <>
                  {paymentDone ? (
                    <div className="payment-success">
                      <span>
                        <Check size={40} />
                      </span>
                      <h2 id="modal-title">HC 사용 시연 완료!</h2>
                      <p>{selectedStore.name}</p>
                      <strong>{num(paymentDone.hc)} HC 사용</strong>
                      <div className="receipt">
                        <div>
                          <span>결제 금액</span>
                          <b>{num(paymentDone.amount)}원</b>
                        </div>
                        <div>
                          <span>HC 할인</span>
                          <b>−{num(paymentDone.hc)}원</b>
                        </div>
                        <div>
                          <span>가게에서 별도 결제할 금액</span>
                          <b>{num(paymentDone.amount - paymentDone.hc)}원</b>
                        </div>
                      </div>
                      <p className="fine">
                        실제 결제는 발생하지 않았습니다.
                        <br />
                        시연 원장과 잔액에만 반영됩니다.
                      </p>
                      <Button
                        onClick={() => {
                          setModal(null);
                          go("wallet");
                        }}
                      >
                        내역 확인하기
                        <ArrowRight size={16} />
                      </Button>
                    </div>
                  ) : (
                    <>
                      <h2 id="modal-title">건강하게 모은 HC를 써볼까요?</h2>
                      <p className="modal-sub">
                        {selectedStore.name} · 가맹점 결제 시연
                      </p>
                      <div className="qr-area">
                        {qr ? (
                          <img
                            src={qr}
                            alt="실제 결제에 사용할 수 없는 시연용 QR 코드"
                          />
                        ) : (
                          <QrCode size={110} />
                        )}
                        <span className="pill light">
                          시연 전용 · 실제 결제 불가
                        </span>
                        <small>
                          실서비스에서는 사장님이 QR을 스캔해요.
                          <br />
                          여기서는 아래 입력으로 스캔 이후를 체험합니다.
                        </small>
                      </div>
                      <PaymentForm
                        store={selectedStore}
                        balance={state.balance}
                        onPay={(amount, hc) => {
                          const error = validateSpend(
                            amount,
                            hc,
                            state.balance,
                            selectedStore.limit,
                          );
                          if (error) {
                            message(error);
                            return;
                          }
                          setState((s) => {
                            if (
                              validateSpend(
                                amount,
                                hc,
                                s.balance,
                                selectedStore.limit,
                              )
                            )
                              return s;
                            return {
                              ...s,
                              balance: s.balance - hc,
                              transactions: [
                                {
                                  id: crypto.randomUUID(),
                                  title: selectedStore.name + " · HC 사용",
                                  hc: -hc,
                                  xp: 0,
                                  source: "가맹점",
                                  date: todayKey(),
                                },
                                ...s.transactions,
                              ],
                            };
                          });
                          setPaymentDone({ amount, hc });
                        }}
                      />
                    </>
                  )}
                </>
              )}
              {modal.kind === "challenge" && (
                <>
                  <img
                    className="modal-hero"
                    src={img(selectedChallenge.image)}
                    alt="챌린지 예시 이미지"
                  />
                  <span className="category-label">
                    광고 · {selectedChallenge.sponsor}
                  </span>
                  <h2 id="modal-title">{selectedChallenge.title}</h2>
                  <p className="modal-sub">{selectedChallenge.subtitle}</p>
                  <div className="challenge-details">
                    <div>
                      <Users size={21} />
                      <strong>{selectedChallenge.participants}명</strong>
                      <small>예시 참여자</small>
                    </div>
                    <div>
                      <Target size={21} />
                      <strong>{selectedChallenge.days}일</strong>
                      <small>목표 기간</small>
                    </div>
                    <div>
                      <Gift size={21} />
                      <strong>{selectedChallenge.reward} HC</strong>
                      <small>완주 보상</small>
                    </div>
                  </div>
                  <h3>함께하는 방법</h3>
                  <ol className="numbered-list">
                    <li>챌린지에 참여하고, 하루 한 번 건강 습관을 실천해요.</li>
                    <li>
                      {selectedChallenge.id === "smile"
                        ? "매일 구강 건강글을 읽으며 새로운 습관을 배워요."
                        : "하루 7,000보를 목표로 내 몸에 맞게 걸어요."}
                    </li>
                    <li>기간 내 목표를 모두 달성하면 스폰서 보상을 받아요.</li>
                  </ol>
                  {state.joined.includes(selectedChallenge.id) && (
                    <div className="info-note">
                      <CheckCircle2 size={18} />
                      <p>
                        참여 중이에요! 시작일:{" "}
                        {state.transactions.find(
                          (t) => t.id === `join:${selectedChallenge.id}`,
                        )?.date || todayKey()}
                        . 다일 챌린지 진행과 완주 보상은 실제 건강 연동 후
                        제공되며 이 시연에서는 지급하지 않습니다.
                      </p>
                    </div>
                  )}
                  <div className="info-note">
                    <ShieldCheck size={18} />
                    <p>
                      챌린지와 보상은 진료·상담·예약과 무관합니다. 스폰서 선입금
                      재원 내에서 발행하며, 참여 인원과 기간은 시연 예시입니다.
                    </p>
                  </div>
                  <Button
                    disabled={state.joined.includes(selectedChallenge.id)}
                    onClick={() => {
                      setState((s) => ({
                        ...s,
                        joined: [...s.joined, selectedChallenge.id],
                        transactions: [
                          {
                            id: `join:${selectedChallenge.id}`,
                            title: selectedChallenge.title + " 참여",
                            hc: 0,
                            xp: 0,
                            source: "스폰서",
                            date: todayKey(),
                          },
                          ...s.transactions,
                        ],
                      }));
                      message(
                        "챌린지에 참여했어요. 오늘의 실천을 이어가 볼까요?",
                      );
                    }}
                  >
                    {state.joined.includes(selectedChallenge.id) ? (
                      <>
                        <Check size={17} />
                        참여 중인 챌린지
                      </>
                    ) : (
                      "함께 시작하기"
                    )}
                  </Button>
                </>
              )}
              {modal.kind === "bp" && (
                <>
                  <span className="modal-icon">
                    <HeartPulse size={28} />
                  </span>
                  <h2 id="modal-title">오늘의 혈압을 기록해요</h2>
                  <p className="modal-sub">
                    5분간 편안히 쉰 뒤, 측정한 수치를 입력해 주세요.
                  </p>
                  <form
                    onSubmit={(e: FormEvent<HTMLFormElement>) => {
                      e.preventDefault();
                      if (!recordConsent) return;
                      const data = new FormData(e.currentTarget);
                      const sys = Number(data.get("sys")),
                        dia = Number(data.get("dia"));
                      if (
                        !Number.isInteger(sys) ||
                        !Number.isInteger(dia) ||
                        sys < 60 ||
                        sys > 250 ||
                        dia < 40 ||
                        dia > 150 ||
                        sys <= dia
                      ) {
                        message(
                          "수축기 60~250, 이완기 40~150 범위에서 수축기가 더 높도록 입력해 주세요.",
                        );
                        return;
                      }
                      setRecords((r) => [{ sys, dia, date: todayKey() }, ...r]);
                      claim(
                        `daily:${todayKey()}:bp`,
                        "오늘의 혈압 기록",
                        10,
                        30,
                      );
                      setModal(null);
                      message(
                        "혈압을 기록했어요. 오늘의 보상은 하루 한 번 제공됩니다.",
                      );
                    }}
                  >
                    <div className="form-columns">
                      <label>
                        수축기 혈압
                        <input
                          name="sys"
                          type="number"
                          placeholder="예: 120"
                          min="60"
                          max="250"
                          required
                        />
                        <small>mmHg</small>
                      </label>
                      <label>
                        이완기 혈압
                        <input
                          name="dia"
                          type="number"
                          placeholder="예: 80"
                          min="40"
                          max="150"
                          required
                        />
                        <small>mmHg</small>
                      </label>
                    </div>
                    <div className="info-note">
                      <ShieldCheck size={17} />
                      <p>
                        실제 개인정보 대신 예시 수치를 입력해 주세요. 기록은
                        서버에 전송되지 않으며 새로고침 시 삭제됩니다.
                      </p>
                    </div>
                    <Button type="submit">
                      기록 저장하기
                      <Check size={16} />
                    </Button>
                  </form>
                </>
              )}
              {modal.kind === "upload" && (
                <>
                  <span className="modal-icon">
                    <Upload size={28} />
                  </span>
                  <h2 id="modal-title">검사 수치를 직접 입력해요</h2>
                  <p className="modal-sub">
                    사진 업로드·OCR 연동 전의 수동 입력 시연입니다.
                  </p>
                  <form
                    onSubmit={(e: FormEvent<HTMLFormElement>) => {
                      e.preventDefault();
                      if (!recordConsent) return;
                      const f = new FormData(e.currentTarget);
                      const ldl = Number(f.get("ldl")),
                        glucose = Number(f.get("glucose"));
                      if (
                        !Number.isInteger(ldl) ||
                        !Number.isInteger(glucose) ||
                        ldl < 10 ||
                        ldl > 500 ||
                        glucose < 30 ||
                        glucose > 600
                      ) {
                        message("입력 범위를 확인해 주세요.");
                        return;
                      }
                      setLabs({ ldl, glucose, name: "시연용 검사 기록" });
                      claim(
                        "lab:first",
                        "첫 검사 기록 · 스폰서 예시",
                        300,
                        50,
                        "스폰서",
                      );
                      setModal(null);
                      message("예시 검사 수치를 기록했어요.");
                    }}
                  >
                    <div className="manual-upload">
                      <Upload size={27} />
                      <strong>결과지 사진은 업로드하지 않아요</strong>
                      <span>민감한 원본 파일 없이 입력 흐름만 체험합니다.</span>
                    </div>
                    <label className="form-label">
                      LDL 콜레스테롤 (mg/dL)
                      <input
                        name="ldl"
                        type="number"
                        min="10"
                        max="500"
                        required
                        placeholder="예: 110"
                      />
                    </label>
                    <label className="form-label">
                      공복혈당 (mg/dL)
                      <input
                        name="glucose"
                        type="number"
                        min="30"
                        max="600"
                        required
                        placeholder="예: 95"
                      />
                    </label>
                    <p className="fine">
                      보상은 첫 입력 1회, 가상 스폰서 재원으로 제공됩니다. 입력
                      수치로 질병을 진단하거나 광고를 추천하지 않습니다.
                    </p>
                    <Button type="submit">확인하고 기록하기</Button>
                  </form>
                </>
              )}
              {modal.kind === "onboarding" && (
                <>
                  <span className="modal-icon">
                    <MapPin size={28} />
                  </span>
                  <div className="onboard-progress">
                    {[0, 1, 2].map((i) => (
                      <span
                        className={onboardStep >= i ? "selected" : ""}
                        key={i}
                      />
                    ))}
                  </div>
                  <h2 id="modal-title">
                    {
                      [
                        "반가워요, 우리 이웃!",
                        "건강한 습관, 나의 선택으로",
                        "건강한 일상, 시작해 볼까요?",
                      ][onboardStep]
                    }
                  </h2>
                  {onboardStep === 0 && (
                    <>
                      <p className="modal-sub">
                        심사 시연을 위한 프로필과 동네를 설정해요.
                      </p>
                      <label className="form-label">
                        닉네임
                        <input
                          maxLength={10}
                          value={onboardName}
                          onChange={(e) => setOnboardName(e.target.value)}
                          placeholder="어떻게 불러드릴까요?"
                        />
                      </label>
                      <label className="form-label">
                        내 동네
                        <select
                          value={onboardTown}
                          onChange={(e) => setOnboardTown(e.target.value)}
                        >
                          {neighborhoods.map((n) => (
                            <option key={n}>{n}</option>
                          ))}
                        </select>
                      </label>
                      <div className="info-note">
                        <MapPin size={18} />
                        <p>
                          위치를 조회하지 않는 시연용 동네 선택입니다. 실제
                          서비스에서는 GPS 기반 동네 인증과 30일 재인증을
                          적용합니다.
                        </p>
                      </div>
                      <Button
                        disabled={!onboardName.trim()}
                        onClick={() => setOnboardStep(1)}
                      >
                        다음
                        <ArrowRight size={16} />
                      </Button>
                    </>
                  )}
                  {onboardStep === 1 && (
                    <>
                      <p className="modal-sub">
                        걷기와 보상은 기본으로, 건강 기록은 별도 선택으로.
                      </p>
                      <div className="info-note">
                        <ShieldCheck size={20} />
                        <p>
                          닉네임·동네·가상 HC 활동은 이 브라우저에 저장됩니다.
                          실제 연락처·주소·건강 개인정보는 입력하지 마세요.
                          초기화 메뉴에서 삭제할 수 있습니다.
                        </p>
                      </div>
                      <label className="check-label">
                        <input
                          type="checkbox"
                          checked={onboardTerms}
                          onChange={(e) => setOnboardTerms(e.target.checked)}
                        />
                        <span>
                          만 14세 이상이며 시연 데이터의 브라우저 저장을
                          확인했습니다.
                        </span>
                      </label>
                      <p className="fine">
                        건강정보 동의는 건강 기록 화면에서 따로 확인합니다.
                        마케팅 동의는 요청하지 않아요.
                      </p>
                      <Button
                        disabled={!onboardTerms}
                        onClick={() => {
                          setState((s) => ({
                            ...s,
                            name: onboardName.trim(),
                            neighborhood: onboardTown,
                            onboarded: true,
                          }));
                          setOnboardStep(2);
                        }}
                      >
                        설정 완료하기
                      </Button>
                    </>
                  )}
                  {onboardStep === 2 && (
                    <div className="onboard-success">
                      <span>🌱</span>
                      <h3>{onboardName}님, 환영해요!</h3>
                      <p>
                        전주 {onboardTown}에서
                        <br />
                        건강한 변화를 함께 만들어가요.
                      </p>
                      <div className="benefit-box">
                        <Gift size={24} />
                        <div>
                          <strong>가입 보상 2,000 HC</strong>
                          <p>
                            시연 지갑의 기본 잔액에 포함되어 있어요.
                            <br />
                            설정을 반복해도 보상은 중복 지급되지 않아요.
                          </p>
                        </div>
                      </div>
                      <Button
                        onClick={() => {
                          setModal(null);
                          go("home");
                        }}
                      >
                        나의 건강한 일상 시작하기
                        <ArrowRight size={16} />
                      </Button>
                    </div>
                  )}
                </>
              )}
              {modal.kind === "notifications" && (
                <>
                  <h2 id="modal-title">나에게 온 소식</h2>
                  <p className="modal-sub">
                    건강한 루틴을 위한 작은 알림 · 시연용
                  </p>
                  {[
                    {
                      icon: Footprints,
                      title: "오늘의 건강한 한 걸음",
                      text: "목표 걸음을 채우고 +30 HC를 받아보세요.",
                      action: () => {
                        setModal(null);
                        go("missions");
                      },
                    },
                    {
                      icon: BookOpen,
                      title: "내 치아를 위한 1분",
                      text: "양치 후 가글, 어떻게 하고 계신가요?",
                      action: () => setModal({ kind: "article", id: "teeth" }),
                    },
                    {
                      icon: Gift,
                      title: "내 동네에서 누리는 혜택",
                      text: "건강하게 모은 HC의 사용 방법을 만나보세요.",
                      action: () => {
                        setModal(null);
                        go("local");
                      },
                    },
                  ].map((n) => (
                    <button
                      className="notification-row"
                      key={n.title}
                      onClick={n.action}
                    >
                      <IconBox icon={n.icon} />
                      <span>
                        <strong>{n.title}</strong>
                        <small>{n.text}</small>
                      </span>
                      <ChevronRight size={17} />
                    </button>
                  ))}
                </>
              )}
              {modal.kind === "coupon" && (
                <div className="coupon-detail">
                  <span className="modal-icon">
                    <Gift size={31} />
                  </span>
                  <h2 id="modal-title">나의 시연 쿠폰</h2>
                  <p className="modal-sub">
                    {modal.id === "coffee"
                      ? "아메리카노 1,000원 할인"
                      : modal.id === "class"
                        ? "필라테스 체험 20% 할인"
                        : "웰니스 스테이 30% 할인"}
                  </p>
                  <div className="coupon-code">HEALTHY · DEMO</div>
                  <div className="info-note">
                    <CircleHelp size={18} />
                    <p>
                      발급 흐름을 보여주는 시연용 쿠폰입니다. 실제 가맹점에서
                      사용할 수 없으며 결제·예약이 발생하지 않습니다. 출시 시
                      사용 조건, 수량, 유효기간이 확정됩니다.
                    </p>
                  </div>
                  <Button onClick={() => setModal(null)}>확인했어요</Button>
                </div>
              )}
              {modal.kind === "settings" && (
                <>
                  <h2 id="modal-title">나의 헬시캐시 설정</h2>
                  <div className="profile-box">
                    <span className="avatar">{state.name.slice(0, 1)}</span>
                    <div>
                      <strong>{state.name}님</strong>
                      <span>
                        전주 {state.neighborhood} · {currentTier.name}
                      </span>
                    </div>
                    <button
                      className="text-btn"
                      onClick={() => {
                        setOnboardStep(0);
                        setModal({ kind: "onboarding" });
                      }}
                    >
                      수정
                      <ChevronRight size={15} />
                    </button>
                  </div>
                  <div className="setting-row">
                    <div>
                      <strong>시연 알림 표시</strong>
                      <small>화면의 알림 점 표시를 켜고 끕니다</small>
                    </div>
                    <button
                      className={`switch ${notify ? "on" : ""}`}
                      role="switch"
                      aria-checked={notify}
                      aria-label="시연 알림 표시"
                      onClick={() => setNotify((v) => !v)}
                    >
                      <span />
                    </button>
                  </div>
                  <div className="setting-row">
                    <div>
                      <strong>건강 기록 동의</strong>
                      <small>
                        {recordConsent
                          ? "현재 페이지에서 동의함"
                          : "동의하지 않음"}
                      </small>
                    </div>
                    <button
                      className="text-btn"
                      onClick={() => {
                        setModal(null);
                        go("records");
                      }}
                    >
                      관리
                      <ChevronRight size={15} />
                    </button>
                  </div>
                  <div className="setting-row">
                    <div>
                      <strong>내 시연 원장 내려받기</strong>
                      <small>실제 거래가 아닌 가상 활동 기록</small>
                    </div>
                    <button
                      className="icon-button"
                      aria-label="시연 원장 다운로드"
                      onClick={exportLedger}
                    >
                      <Download size={20} />
                    </button>
                  </div>
                  <div className="info-note">
                    <ShieldCheck size={18} />
                    <p>
                      가상 활동만 브라우저에 저장됩니다. 건강 기록은 메모리에만
                      유지되며 새로고침 또는 동의 철회 시 삭제됩니다.
                    </p>
                  </div>
                  <Button
                    kind="danger"
                    onClick={() => setModal({ kind: "reset" })}
                  >
                    시연 데이터 초기화
                  </Button>
                </>
              )}
              {modal.kind === "reset" && (
                <>
                  <span className="modal-icon">
                    <Settings2 size={28} />
                  </span>
                  <h2 id="modal-title">처음부터 다시 시연할까요?</h2>
                  <p className="modal-sub">
                    이 브라우저의 가상 잔액·미션·쿠폰·프로필과 현재 건강 기록을
                    초기화합니다. 실제 계정이나 거래에는 영향을 주지 않아요.
                  </p>
                  <div className="button-row">
                    <Button
                      kind="secondary"
                      onClick={() => setModal({ kind: "settings" })}
                    >
                      돌아가기
                    </Button>
                    <Button
                      kind="danger"
                      onClick={() => {
                        setState(initialState());
                        setRecordConsent(false);
                        setConsentChoice(false);
                        setRecords([]);
                        setLabs(null);
                        setReviewed(false);
                        setHospitalSubmitted(false);
                        setOnboardName("지민");
                        setOnboardTown("효자4동");
                        setOnboardTerms(false);
                        setNotify(true);
                        setModal(null);
                        go("home");
                        message("시연 데이터를 처음 상태로 되돌렸어요.");
                      }}
                    >
                      초기화하기
                    </Button>
                  </div>
                </>
              )}
              {modal.kind === "about" && (
                <>
                  <div className="about-hero">
                    <Logo />
                    <span className="pill light">
                      모두의창업 지원사업 발표용 프로토타입
                    </span>
                    <h2 id="modal-title">
                      건강한 나의 일상이,
                      <br />
                      건강한 동네의 시작.
                    </h2>
                    <p>
                      현직 치과의사의 기획을 바탕으로,
                      <br />
                      건강 실천·의료 콘텐츠·동네 소비를 연결합니다.
                    </p>
                  </div>
                  <div className="about-flow">
                    {[
                      {
                        icon: Footprints,
                        title: "건강을 실천하고",
                        text: "걷기·읽기·기록의 작은 습관",
                      },
                      {
                        icon: Sparkles,
                        title: "가치를 쌓고",
                        text: "HC는 동네 혜택, XP는 성장",
                      },
                      {
                        icon: StoreIcon,
                        title: "동네에서 누려요",
                        text: "가맹점 할인으로 지역 순환",
                      },
                    ].map((v, i) => (
                      <div key={v.title}>
                        <span>0{i + 1}</span>
                        <v.icon size={26} />
                        <h3>{v.title}</h3>
                        <p>{v.text}</p>
                      </div>
                    ))}
                  </div>
                  <h3>지속 가능한 보상 구조</h3>
                  <div className="business-models">
                    <div>
                      <StoreIcon size={20} />
                      <strong>가맹점 월정액</strong>
                      <small>입점·프로모션 도구</small>
                    </div>
                    <div>
                      <Target size={20} />
                      <strong>스폰서 캠페인</strong>
                      <small>선입금 재원 기반 보상</small>
                    </div>
                    <div>
                      <Stethoscope size={20} />
                      <strong>병원 월정액 광고</strong>
                      <small>환자 수와 무관한 노출형</small>
                    </div>
                  </div>
                  <h3>이 프로토타입으로 체험할 수 있어요</h3>
                  <div className="demo-checklist">
                    {[
                      "시연 걸음 추가 → 일일 미션 보상 → 중복 적립 차단",
                      "건강글 확인·퀴즈 → 스폰서 보상 적립",
                      "가맹점 선택 → QR·10% 한도 → 가상 HC 차감",
                      "선택 동의 → 혈압·검사 수치 수동 기록",
                      "등급별 쿠폰·거래 원장·운영 대시보드",
                    ].map((t) => (
                      <span key={t}>
                        <CheckCircle2 size={17} />
                        {t}
                      </span>
                    ))}
                  </div>
                  <div className="info-note">
                    <CircleHelp size={21} />
                    <p>
                      반응형 웹앱 시제품입니다. 실제 회원 인증·건강앱/GPS
                      연동·실결제·의료 감수·광고 심의·서버 저장은 연결되어 있지
                      않습니다. 화면의 가맹점·스폰서·운영 성과는 예시이며 실제
                      제휴나 실적이 아닙니다.
                    </p>
                  </div>
                  <div className="button-row">
                    <Button
                      kind="secondary"
                      onClick={() => {
                        setModal(null);
                        go("admin");
                      }}
                    >
                      운영 관점 살펴보기
                      <LayoutDashboard size={16} />
                    </Button>
                    <Button
                      onClick={() => {
                        setOnboardStep(0);
                        setModal({ kind: "onboarding" });
                      }}
                    >
                      내 동네로 시작하기
                      <ArrowRight size={16} />
                    </Button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
function PageIntro({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div className="page-intro standalone">
      <div>
        <div className="eyebrow">
          <span />
          {eyebrow}
        </div>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
    </div>
  );
}
function Empty({
  icon: Icon,
  title,
  description,
  action,
  onAction,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: string;
  onAction?: () => void;
}) {
  return (
    <div className="empty-state">
      <span>
        <Icon size={35} strokeWidth={1.4} />
      </span>
      <h3>{title}</h3>
      <p>{description}</p>
      {action && (
        <Button kind="secondary" onClick={onAction}>
          {action}
          <Plus size={16} />
        </Button>
      )}
    </div>
  );
}
function PaymentForm({
  store,
  balance,
  onPay,
}: {
  store: Store;
  balance: number;
  onPay: (amount: number, hc: number) => void;
}) {
  const [amount, setAmount] = useState(String(store.price));
  const [hc, setHc] = useState(
    String(Math.min(balance, Math.floor(store.price * 0.1))),
  );
  const [error, setError] = useState("");
  const max = Math.min(
    balance,
    Math.floor((Number(amount) * store.limit) / 100) || 0,
  );
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const err = validateSpend(
          Number(amount),
          Number(hc),
          balance,
          store.limit,
        );
        if (err) {
          setError(err);
          return;
        }
        onPay(Number(amount), Number(hc));
      }}
    >
      <label className="form-label">
        가게 결제 금액 (원)
        <input
          type="number"
          min="1000"
          max="10000000"
          step="1"
          required
          value={amount}
          onChange={(e) => {
            setAmount(e.target.value);
            setError("");
          }}
        />
      </label>
      <label className="form-label">
        사용할 HC
        <span className="input-with-button">
          <input
            type="number"
            min="1"
            step="1"
            required
            value={hc}
            onChange={(e) => {
              setHc(e.target.value);
              setError("");
            }}
          />
          <button type="button" onClick={() => setHc(String(max))}>
            최대 사용
          </button>
        </span>
        <small>
          보유 {num(balance)} HC · 사용 가능 {num(max)} HC (결제 금액의{" "}
          {store.limit}%)
        </small>
      </label>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <div className="payment-preview">
        <span>가게에서 별도 결제할 금액</span>
        <strong>{num(Math.max(0, Number(amount) - Number(hc)))}원</strong>
      </div>
      <p className="fine">
        가맹점 할인 시연입니다. 운영사의 현금 정산은 발생하지 않으며 HC는 가상
        원장에 기록됩니다.
      </p>
      <Button type="submit" disabled={balance < 1}>
        가상 HC 사용 확정
        <ArrowRight size={16} />
      </Button>
    </form>
  );
}
export default App;
