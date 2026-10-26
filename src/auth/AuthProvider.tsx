import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import {
  onAuthStateChanged,
  signInWithCustomToken,
  signOut,
  type User,
} from "firebase/auth";
import { doc, onSnapshot, type Timestamp } from "firebase/firestore";
import { firebase } from "./firebase";

export type Provider = "kakao" | "naver";
export type Member = {
  uid: string;
  provider: Provider;
  nickname: string;
  neighborhood: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  lastLoginAt: Timestamp;
};
const messages: Record<string, string> = {
  cancelled: "로그인을 취소했어요. 원하실 때 다시 시작할 수 있어요.",
  invalid_state:
    "로그인 요청을 확인할 수 없어요. 이 화면에서 다시 시작해 주세요.",
  login_expired:
    "로그인 연결 시간이 지났거나 이미 사용된 요청이에요. 다시 로그인해 주세요.",
  account_disabled: "이용이 중지된 계정이에요. 운영자에게 문의해 주세요.",
  auth_unavailable:
    "로그인 연결을 준비하고 있어요. 잠시 후 다시 시도해 주세요.",
  invalid_profile: "닉네임은 1~20자로 입력하고 목록에서 동네를 선택해 주세요.",
  unauthorized: "로그인이 만료되었어요. 다시 로그인해 주세요.",
};
function describe(error: unknown) {
  const code = error instanceof Error ? error.message : "";
  return (
    messages[code] ||
    "요청을 완료하지 못했어요. 연결을 확인하고 다시 시도해 주세요."
  );
}
export async function api(path: string, init: RequestInit = {}) {
  const response = await fetch(`/.netlify/functions/${path}`, {
    ...init,
    credentials: "same-origin",
    cache: "no-store",
    headers: { "Content-Type": "application/json", ...init.headers },
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "request_failed");
  return data;
}
let completion: Promise<void> | undefined;
function finishLogin() {
  // One exchange per document, including React StrictMode's effect replay.
  if (!completion)
    completion = (async () => {
      const error = new URLSearchParams(window.location.search).get("error");
      window.history.replaceState(null, "", "/");
      if (error) throw new Error(error);
      if (!firebase) throw new Error("auth_unavailable");
      const { token } = await api("auth-exchange", {
        method: "POST",
        body: "{}",
      });
      await signInWithCustomToken(firebase.auth, token);
    })();
  return completion;
}
type AuthContextValue = {
  user: User | null;
  member: Member | null;
  loading: boolean;
  memberLoading: boolean;
  error: string;
  configured: boolean;
  providers: Record<Provider, boolean>;
  login: (provider: Provider) => void;
  logout: () => Promise<void>;
  updateProfile: (
    data: Pick<Member, "nickname" | "neighborhood">,
  ) => Promise<void>;
  reloadMember: () => void;
};
const AuthContext = createContext<AuthContextValue | null>(null);
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null),
    [member, setMember] = useState<Member | null>(null);
  const [loading, setLoading] = useState(Boolean(firebase));
  const [memberLoading, setMemberLoading] = useState(false),
    [error, setError] = useState("");
  const [providers, setProviders] = useState({ kakao: false, naver: false });
  const [reload, setReload] = useState(0);
  const [completing] = useState(window.location.pathname === "/auth/complete");
  const [exchanging, setExchanging] = useState(completing);
  useEffect(() => {
    let active = true;
    if (firebase)
      api("auth-config")
        .then((data) => {
          if (active)
            setProviders({
              kakao: data.providers?.kakao === true,
              naver: data.providers?.naver === true,
            });
        })
        .catch(() => {
          /* The demo remains available when the backend is not configured. */
        });
    const unsubscribe = firebase
      ? onAuthStateChanged(
          firebase.auth,
          (next) => {
            setMember(null);
            setUser(next);
            setMemberLoading(Boolean(next));
            setLoading(false);
          },
          () => {
            setUser(null);
            setMember(null);
            setLoading(false);
            setError("로그인 상태를 확인하지 못했어요. 새로고침해 주세요.");
          },
        )
      : () => {};
    return () => {
      active = false;
      unsubscribe();
    };
  }, []);
  useEffect(() => {
    if (!completing) return;
    let active = true;
    finishLogin()
      .catch((err) => {
        if (active) setError(describe(err));
      })
      .finally(() => {
        if (active) setExchanging(false);
      });
    return () => {
      active = false;
    };
  }, [completing]);
  useEffect(() => {
    if (!firebase || !user) {
      setMember(null);
      setMemberLoading(false);
      return;
    }
    setMemberLoading(true);
    return onSnapshot(
      doc(firebase.db, "users", user.uid),
      (snapshot) => {
        setMemberLoading(false);
        if (snapshot.exists() && snapshot.data().uid === user.uid) {
          setMember(snapshot.data() as Member);
          setError("");
        } else {
          setMember(null);
          setError(
            "회원정보를 찾지 못했어요. 로그아웃한 뒤 다시 로그인해 주세요.",
          );
        }
      },
      () => {
        setMember(null);
        setMemberLoading(false);
        setError(
          "회원정보를 불러오지 못했어요. 연결을 확인한 뒤 다시 불러와 주세요.",
        );
      },
    );
  }, [user, reload]);
  const value: AuthContextValue = {
    user,
    member,
    loading: loading || exchanging,
    memberLoading,
    error,
    providers,
    configured: Boolean(firebase),
    login(provider) {
      if (!firebase || !providers[provider]) {
        setError(messages.auth_unavailable);
        return;
      }
      window.location.assign(
        `/.netlify/functions/auth-start?provider=${provider}`,
      );
    },
    async logout() {
      if (!firebase) return;
      await signOut(firebase.auth);
      setUser(null);
      setMember(null);
      setError("");
      // Firebase SDK owns refresh-token persistence; no application token is stored manually.
      try {
        await api("auth-logout", { method: "POST", body: "{}" });
      } catch {
        /* Local logout has already completed. */
      }
    },
    async updateProfile(data) {
      const current = firebase?.auth.currentUser;
      if (!current) throw new Error(messages.unauthorized);
      try {
        const token = await current.getIdToken();
        await api("member-profile", {
          method: "PATCH",
          headers: { Authorization: `Bearer ${token}` },
          body: JSON.stringify(data),
        });
      } catch (err) {
        throw new Error(describe(err));
      }
    },
    reloadMember: () => {
      setError("");
      setReload((value) => value + 1);
    },
  };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("AuthProvider is required");
  return value;
}
