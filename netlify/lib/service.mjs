import options from "../../shared/member-options.json" with { type: "json" };
import { authorizationUrl } from "./providers.mjs";
import { enabled } from "./config.mjs";
import { setupFailureResponse } from "./diagnostics.mjs";
import {
  body,
  clearCookies,
  cookie,
  cookieName,
  fail,
  hash,
  header,
  HttpError,
  json,
  method,
  parameter,
  random,
  redirect,
  sameOrigin,
  setCookie,
  validSecret,
} from "./security.mjs";

export function createHandlers({
  config,
  store,
  identity,
  providers,
  now = Date.now,
  secret = random,
}) {
  const binding = (event) => cookie(event, cookieName(config, "oauth"));
  const complete = (error) =>
    `${config.origin}/auth/complete${error ? `?error=${error}` : ""}`;
  async function callback(event, provider) {
    method(event, "GET");
    try {
      const state = parameter(event, "state"),
        browser = binding(event);
      if (!validSecret(state) || !validSecret(browser))
        fail(400, "invalid_state");
      // Atomically consume before contacting the provider, including denial callbacks.
      await store.claimFlow(hash(state), hash(browser), provider, now());
      if (parameter(event, "error"))
        return redirect(complete("cancelled"), clearCookies(config));
      const code = parameter(event, "code");
      if (!code || code.length > 2048) fail(400, "invalid_request");
      const member = await providers.authenticate(provider, code, state);
      await identity.ensureUser(member);
      await store.upsertMember(member, now());
      const ticket = secret();
      await store.createTicket(hash(ticket), {
        uid: member.uid,
        provider,
        bindingHash: hash(browser),
        expiresAtMs: now() + 60_000,
      });
      return redirect(complete(), [setCookie(config, "login", ticket, 60)]);
    } catch (error) {
      const code =
        error instanceof HttpError &&
        ["invalid_state", "account_disabled"].includes(error.code)
          ? error.code
          : "login_failed";
      return redirect(complete(code), clearCookies(config));
    }
  }
  const handlers = {
    async "auth-start"(event) {
      method(event, "GET");
      const provider = parameter(event, "provider");
      if (!["kakao", "naver"].includes(provider)) fail(400, "invalid_provider");
      if (!enabled(config, provider)) fail(503, "auth_unavailable");
      const state = secret(),
        browser = secret();
      try {
        await store.createFlow(hash(state), {
          provider,
          bindingHash: hash(browser),
          expiresAtMs: now() + 600_000,
        });
      } catch (error) {
        if (error instanceof HttpError) throw error;
        return setupFailureResponse("oauth_state_create", error, "server_error");
      }
      return redirect(authorizationUrl(config, provider, state), [
        setCookie(config, "oauth", browser, 600),
        setCookie(config, "login", "", 0),
      ]);
    },
    "kakao-callback": (event) => callback(event, "kakao"),
    "naver-callback": (event) => callback(event, "naver"),
    async "auth-exchange"(event) {
      method(event, "POST");
      sameOrigin(event, config);
      if (Object.keys(body(event)).length) fail(400, "invalid_request");
      const ticket = cookie(event, cookieName(config, "login")),
        browser = binding(event);
      if (!validSecret(ticket) || !validSecret(browser))
        fail(401, "login_expired");
      const member = await store.claimTicket(
        hash(ticket),
        hash(browser),
        now(),
      );
      const token = await identity.customToken(member.uid, member.provider);
      return json(200, { token }, clearCookies(config));
    },
    async "member-profile"(event) {
      method(event, "PATCH");
      sameOrigin(event, config);
      const authorization = header(event, "authorization");
      if (!/^Bearer [^\s]{1,8192}$/.test(authorization))
        fail(401, "unauthorized");
      let verified;
      try {
        verified = await identity.verifyToken(authorization.slice(7));
      } catch {
        fail(401, "unauthorized");
      }
      if (!verified?.uid) fail(401, "unauthorized");
      const update = body(event),
        fields = Object.keys(update);
      if (
        !fields.length ||
        fields.some((key) => !["nickname", "neighborhood"].includes(key))
      )
        fail(400, "invalid_profile");
      if ("nickname" in update) {
        if (typeof update.nickname !== "string") fail(400, "invalid_profile");
        update.nickname = update.nickname.normalize("NFC").trim();
        if (
          !update.nickname ||
          [...update.nickname].length > 20 ||
          /[\p{Cc}\p{Cf}<>]/u.test(update.nickname)
        )
          fail(400, "invalid_profile");
      }
      if (
        "neighborhood" in update &&
        update.neighborhood !== "" &&
        !options.neighborhoods.includes(update.neighborhood)
      )
        fail(400, "invalid_profile");
      await store.updateMember(verified.uid, update, now());
      return json(200, { ok: true });
    },
    async "auth-logout"(event) {
      method(event, "POST");
      sameOrigin(event, config);
      body(event);
      return json(200, { ok: true }, clearCookies(config));
    },
  };
  return async (route, event) => {
    try {
      if (!handlers[route]) fail(404, "not_found");
      return await handlers[route](event);
    } catch (error) {
      const known = error instanceof HttpError;
      return json(
        known ? error.status : 500,
        { error: known ? error.code : "server_error" },
        route === "auth-exchange" ? clearCookies(config) : [],
      );
    }
  };
}
