import { useEffect, useState, type FormEvent } from "react";
import {
  ArrowRight,
  HeartPulse,
  LogOut,
  MessageCircle,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { neighborhoods } from "../data";
import { useAuth } from "./AuthProvider";
import "./account.css";

export function AccountPage({ onDemo }: { onDemo: () => void }) {
  const auth = useAuth();
  const [nickname, setNickname] = useState(""),
    [neighborhood, setNeighborhood] = useState("");
  const [saving, setSaving] = useState(false),
    [feedback, setFeedback] = useState("");
  const [formError, setFormError] = useState("");
  useEffect(() => {
    setNickname(auth.member?.nickname || "");
    setNeighborhood(auth.member?.neighborhood || "");
    setFormError("");
  }, [auth.member?.uid, auth.member?.nickname, auth.member?.neighborhood]);
  useEffect(() => {
    setFeedback("");
  }, [auth.member?.uid]);
  async function save(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setFeedback("");
    setFormError("");
    try {
      await auth.updateProfile({ nickname, neighborhood });
      setFeedback("회원정보를 저장했어요.");
    } catch (error) {
      setFormError(
        error instanceof Error ? error.message : "저장하지 못했어요.",
      );
    } finally {
      setSaving(false);
    }
  }
  async function logout() {
    setSaving(true);
    setFormError("");
    try {
      await auth.logout();
      setFeedback("로그아웃했어요.");
    } catch {
      setFormError("로그아웃하지 못했어요. 다시 시도해 주세요.");
    } finally {
      setSaving(false);
    }
  }
  return (
    <section className="account-page" aria-labelledby="account-title">
      <div className="page-intro">
        <div>
          <div className="eyebrow">
            <span /> MY HEALTHY ACCOUNT
          </div>
          <h1 id="account-title">
            {auth.user ? "마이페이지" : "나의 건강한 일상, 함께 시작해요"}
          </h1>
          <p>
            {auth.user
              ? "내 계정과 회원정보를 관리하세요."
              : "익숙한 계정으로 로그인하고 내 프로필을 저장하세요."}
          </p>
        </div>
      </div>
      {(auth.error || formError) && (
        <div className="account-alert" role="alert">
          {formError || auth.error}
        </div>
      )}
      {feedback && (
        <p className="account-feedback" role="status">
          {feedback}
        </p>
      )}
      {auth.loading ? (
        <div className="account-card" role="status">
          로그인 상태를 확인하고 있어요…
        </div>
      ) : !auth.user ? (
        <div className="account-grid">
          <div className="account-card login-card">
            <span className="account-symbol">
              <HeartPulse size={32} />
            </span>
            <h2>헬시캐시에 오신 걸 환영해요</h2>
            <p>
              로그인한 계정으로 내 닉네임과 동네를
              <br />
              다른 기기에서도 이어서 사용할 수 있어요.
            </p>
            <div className="social-logins">
              <button
                className="social-login kakao"
                disabled={!auth.providers.kakao}
                onClick={() => auth.login("kakao")}
              >
                <span aria-hidden="true">
                  <MessageCircle size={20} fill="currentColor" />
                </span>
                카카오로 시작하기
              </button>
              <button
                className="social-login naver"
                disabled={!auth.providers.naver}
                onClick={() => auth.login("naver")}
              >
                <b aria-hidden="true">N</b>네이버로 시작하기
              </button>
            </div>
            {(!auth.configured ||
              (!auth.providers.kakao && !auth.providers.naver)) && (
              <p className="account-availability">
                로그인 연결을 준비 중이에요.
                <br />
                아래 버튼으로 서비스 시연을 먼저 둘러보세요.
              </p>
            )}
            <p className="account-privacy">
              로그인하면 계정 식별정보, 로그인 서비스, 닉네임과 가입·접속 시각을
              저장합니다. 동네는 직접 선택한 경우에만 저장해요.
            </p>
          </div>
          <div className="account-card account-demo">
            <ShieldCheck size={30} />
            <h2>시연은 가볍게, 회원정보는 따로</h2>
            <p>걷기·HC 적립·동네 혜택은 로그인 없이도 체험할 수 있어요.</p>
            <p>
              화면의 예시 HC 잔액과 건강 기록은 내 계정에 저장되거나 실제
              보상으로 전환되지 않아요.
            </p>
            <button className="btn secondary" onClick={onDemo}>
              로그인 없이 시연 둘러보기 <ArrowRight size={17} />
            </button>
          </div>
        </div>
      ) : (
        <div className="account-grid">
          <div className="account-card">
            <div className="account-heading">
              <span className="account-symbol">
                <UserRound size={27} />
              </span>
              <div>
                <h2>내 회원정보</h2>
                <p>
                  {auth.member?.provider === "kakao"
                    ? "카카오"
                    : auth.member?.provider === "naver"
                      ? "네이버"
                      : "소셜"}{" "}
                  계정으로 로그인했어요
                </p>
              </div>
            </div>
            {auth.memberLoading ? (
              <p role="status">회원정보를 불러오고 있어요…</p>
            ) : auth.member ? (
              <form onSubmit={save}>
                <label className="form-label">
                  회원 닉네임
                  <input
                    autoComplete="nickname"
                    value={nickname}
                    maxLength={20}
                    required
                    onChange={(e) => setNickname(e.target.value)}
                  />
                </label>
                <label className="form-label">
                  회원 동네
                  <select
                    value={neighborhood}
                    onChange={(e) => setNeighborhood(e.target.value)}
                  >
                    <option value="">선택하지 않음</option>
                    {neighborhoods.map((town) => (
                      <option key={town}>{town}</option>
                    ))}
                  </select>
                </label>
                <p className="account-meta">
                  가입일 ·{" "}
                  {auth.member.createdAt
                    ?.toDate()
                    .toLocaleDateString("ko-KR", { timeZone: "Asia/Seoul" })}
                </p>
                <button
                  type="submit"
                  className="btn primary"
                  disabled={saving || !nickname.trim()}
                >
                  {saving ? "저장 중…" : "회원정보 저장"}
                </button>
              </form>
            ) : (
              <button className="btn secondary" onClick={auth.reloadMember}>
                회원정보 다시 불러오기
              </button>
            )}
            <button
              className="account-logout"
              onClick={logout}
              disabled={saving}
            >
              <LogOut size={17} />
              로그아웃
            </button>
          </div>
          <div className="account-card account-demo">
            <ShieldCheck size={30} />
            <h2>내 계정과 시연 데이터</h2>
            <p>
              회원정보는 로그인한 본인만 확인할 수 있어요. 이곳에서 저장한
              프로필은 시연용 프로필과 별도로 관리해요.
            </p>
            <p>
              HC·XP·걸음·건강 기록은 계속 시연용으로 제공됩니다. 기존 시연
              데이터는 내 계정으로 옮겨지지 않아요.
            </p>
            <button className="btn secondary" onClick={onDemo}>
              서비스 시연으로 이동 <ArrowRight size={17} />
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
