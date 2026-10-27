import { callbackUrl } from "./config.mjs";
import { fail, hash, HttpError } from "./security.mjs";

function providerFailure(phase, payload) {
  let diagnostic = phase === "profile"
    ? "provider_profile_failed"
    : "provider_token_failed";
  // Classify only known provider error names; discard the entire raw payload.
  if (phase === "token") {
    if (payload?.error === "invalid_client" || payload?.error_code === "KOE010")
      diagnostic = "provider_client_rejected";
    else if (payload?.error === "invalid_grant")
      diagnostic = "provider_code_rejected";
  }
  throw Object.assign(new HttpError(502, "provider_failed"), { diagnostic });
}

export function authorizationUrl(config, provider, state) {
  const url = new URL(
    provider === "kakao"
      ? "https://kauth.kakao.com/oauth/authorize"
      : "https://nid.naver.com/oauth2.0/authorize",
  );
  url.search = new URLSearchParams({
    response_type: "code",
    client_id: config[provider].clientId,
    redirect_uri: callbackUrl(config, provider),
    state,
  }).toString();
  return url.href;
}
export function cleanNickname(value) {
  if (typeof value !== "string") return "헬시 이웃";
  const result = [
    ...value
      .normalize("NFC")
      .replace(/[\p{Cc}\p{Cf}<>]/gu, "")
      .trim(),
  ]
    .slice(0, 20)
    .join("");
  return result || "헬시 이웃";
}
export function createProviders(config, request = fetch) {
  async function call(url, options, phase) {
    let response;
    try {
      response = await request(url, {
        ...options,
        redirect: "error",
        signal: AbortSignal.timeout(10000),
      });
    } catch {
      fail(502, "provider_unavailable");
    }
    let payload;
    try {
      payload = await response.json();
    } catch {
      providerFailure(phase);
    }
    if (!response.ok || !payload || typeof payload !== "object" || Array.isArray(payload) || payload.error)
      providerFailure(phase, payload);
    return payload;
  }
  return {
    async authenticate(provider, code, state) {
      const fields = {
        grant_type: "authorization_code",
        client_id: config[provider].clientId,
        code,
        redirect_uri: callbackUrl(config, provider),
      };
      if (config[provider].secret)
        fields.client_secret = config[provider].secret;
      if (provider === "naver") fields.state = state;
      const token = await call(
        provider === "kakao"
          ? "https://kauth.kakao.com/oauth/token"
          : "https://nid.naver.com/oauth2.0/token",
        {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams(fields).toString(),
        },
        "token",
      );
      if (
        typeof token.access_token !== "string" ||
        !token.access_token ||
        token.access_token.length > 8192
      )
        providerFailure("token");
      const profile = await call(
        provider === "kakao"
          ? "https://kapi.kakao.com/v2/user/me"
          : "https://openapi.naver.com/v1/nid/me",
        {
          headers: { Authorization: `Bearer ${token.access_token}` },
        },
        "profile",
      );
      let id, nickname;
      if (provider === "kakao") {
        if (
          (typeof profile.id !== "number" ||
            !Number.isSafeInteger(profile.id) ||
            profile.id <= 0) &&
          (typeof profile.id !== "string" ||
            !/^[1-9]\d{0,30}$/.test(profile.id))
        )
          providerFailure("profile");
        id = String(profile.id);
        nickname = profile.kakao_account?.profile?.nickname;
      } else {
        if (
          profile.resultcode !== "00" ||
          typeof profile.response?.id !== "string" ||
          !profile.response.id ||
          profile.response.id.length > 256
        )
          providerFailure("profile");
        id = profile.response.id;
        nickname = profile.response.nickname;
      }
      // No email matching/account merging. Provider tokens and raw provider IDs are never persisted.
      return {
        uid: `${provider}_${hash(id)}`,
        provider,
        nickname: cleanNickname(nickname),
      };
    },
  };
}
