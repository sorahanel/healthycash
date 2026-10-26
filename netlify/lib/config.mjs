import { fail } from "./security.mjs";

export function getConfig(env = process.env) {
  let url;
  try {
    url = new URL(env.APP_BASE_URL);
  } catch {
    fail(503, "auth_unavailable");
  }
  const development =
    env.NETLIFY_DEV === "true" &&
    ["localhost", "127.0.0.1"].includes(url.hostname);
  if (
    (!development && url.protocol !== "https:") ||
    url.pathname !== "/" ||
    url.search ||
    url.hash ||
    url.username ||
    url.password
  )
    fail(503, "auth_unavailable");
  if (
    !env.FIREBASE_PROJECT_ID ||
    !env.FIREBASE_CLIENT_EMAIL ||
    !env.FIREBASE_PRIVATE_KEY
  )
    fail(503, "auth_unavailable");
  if (
    !development &&
    (env.FIREBASE_AUTH_EMULATOR_HOST || env.FIRESTORE_EMULATOR_HOST)
  )
    fail(503, "auth_unavailable");
  return {
    origin: url.origin,
    secure: url.protocol === "https:",
    projectId: env.FIREBASE_PROJECT_ID,
    clientEmail: env.FIREBASE_CLIENT_EMAIL,
    privateKey: env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
    kakao: {
      clientId: env.KAKAO_REST_API_KEY,
      secret: env.KAKAO_CLIENT_SECRET,
    },
    naver: { clientId: env.NAVER_CLIENT_ID, secret: env.NAVER_CLIENT_SECRET },
  };
}
export function enabled(config, provider) {
  return provider === "kakao"
    ? Boolean(config.kakao.clientId)
    : provider === "naver" &&
        Boolean(config.naver.clientId && config.naver.secret);
}
export const callbackUrl = (config, provider) =>
  `${config.origin}/.netlify/functions/${provider}-callback`;
