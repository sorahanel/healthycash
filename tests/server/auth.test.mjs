import test from "node:test";
import assert from "node:assert/strict";
import { createHandlers } from "../../netlify/lib/service.mjs";
import { getConfig } from "../../netlify/lib/config.mjs";
import { createProviders } from "../../netlify/lib/providers.mjs";
import { createIdentity } from "../../netlify/lib/firebase.mjs";
import { fail, hash, random } from "../../netlify/lib/security.mjs";

const config = {
  origin: "https://healthycash.example",
  secure: true,
  kakao: { clientId: "public-kakao-id", secret: "private-kakao-secret" },
  naver: { clientId: "public-naver-id", secret: "private-naver-secret" },
};
const event = (httpMethod = "GET", query = {}, extra = {}) => ({
  httpMethod,
  queryStringParameters: query,
  headers: {
    origin: config.origin,
    "content-type": "application/json",
    ...extra.headers,
  },
  body: "{}",
  ...extra,
});
const cookies = (result) => result.multiValueHeaders?.["Set-Cookie"] || [];
function harness() {
  const flows = new Map(),
    tickets = new Map(),
    updates = [];
  let timestamp = 1000,
    providerCalls = 0;
  const store = {
    async createFlow(id, value) {
      flows.set(id, value);
    },
    async claimFlow(id, binding, provider, now) {
      const flow = flows.get(id);
      if (
        !flow ||
        flow.bindingHash !== binding ||
        flow.provider !== provider ||
        flow.expiresAtMs <= now
      )
        fail(400, "invalid_state");
      flows.delete(id);
    },
    async createTicket(id, value) {
      tickets.set(id, value);
    },
    async claimTicket(id, binding, now) {
      const ticket = tickets.get(id);
      if (
        !ticket ||
        ticket.bindingHash !== binding ||
        ticket.expiresAtMs <= now
      )
        fail(401, "login_expired");
      tickets.delete(id);
      return ticket;
    },
    async upsertMember() {},
    async updateMember(uid, update) {
      updates.push({ uid, update });
    },
  };
  const identity = {
    async ensureUser() {},
    async customToken(uid) {
      return `firebase-custom-token-for-${uid}`;
    },
    async verifyToken(token) {
      if (token !== "valid-id-token") throw Error("invalid");
      return { uid: "server-derived-uid" };
    },
  };
  const providers = {
    async authenticate(provider) {
      providerCalls++;
      return { uid: `${provider}_member`, provider, nickname: "회원" };
    },
  };
  const handle = createHandlers({
    config,
    store,
    identity,
    providers,
    now: () => timestamp,
  });
  async function start(provider = "kakao") {
    const response = await handle("auth-start", event("GET", { provider }));
    const state = new URL(response.headers.Location).searchParams.get("state");
    const binding = cookies(response)[0].split(";")[0];
    return { state, binding, response };
  }
  async function callback(flow, provider = "kakao", query = {}) {
    return handle(
      `${provider}-callback`,
      event(
        "GET",
        { state: flow.state, code: "provider-code", ...query },
        { headers: { cookie: flow.binding } },
      ),
    );
  }
  const exchange = (cookie) =>
    handle(
      "auth-exchange",
      event(
        "POST",
        {},
        {
          headers: {
            origin: config.origin,
            "content-type": "application/json",
            cookie,
          },
        },
      ),
    );
  return {
    handle,
    start,
    callback,
    exchange,
    updates,
    tickets,
    flows,
    advance: (ms) => {
      timestamp += ms;
    },
    calls: () => providerCalls,
  };
}
test("OAuth start uses independent state/binding and secure HttpOnly host cookies", async () => {
  const h = harness(),
    flow = await h.start();
  assert.equal(flow.response.statusCode, 303);
  const url = new URL(flow.response.headers.Location);
  assert.equal(url.origin, "https://kauth.kakao.com");
  assert.equal(
    url.searchParams.get("redirect_uri"),
    config.origin + "/.netlify/functions/kakao-callback",
  );
  assert.notEqual(flow.state, flow.binding.split("=")[1]);
  assert.match(
    cookies(flow.response)[0],
    /^__Host-hc_oauth=.*HttpOnly; SameSite=Lax; Max-Age=600; Secure$/,
  );
  assert.equal(h.flows.has(hash(flow.state)), true);
  assert.equal(
    JSON.stringify(flow.response).includes("private-kakao-secret"),
    false,
  );
});
test("callback carries no credential in URL, cookie exchange is bound and single-use", async () => {
  const h = harness(),
    flow = await h.start(),
    callback = await h.callback(flow);
  assert.equal(callback.headers.Location, config.origin + "/auth/complete");
  assert.equal(callback.body.includes("token"), false);
  const ticket = cookies(callback)[0].split(";")[0];
  assert.match(
    cookies(callback)[0],
    /HttpOnly; SameSite=Lax; Max-Age=60; Secure$/,
  );
  const wrongBrowser = await h.exchange(
    `${ticket}; __Host-hc_oauth=${random()}`,
  );
  assert.equal(wrongBrowser.statusCode, 401);
  const good = await h.exchange(`${ticket}; ${flow.binding}`);
  assert.equal(good.statusCode, 200);
  assert.equal(
    JSON.parse(good.body).token,
    "firebase-custom-token-for-kakao_member",
  );
  assert.equal(good.headers["Cache-Control"], "no-store, max-age=0");
  assert.ok(cookies(good).every((value) => value.includes("Max-Age=0")));
  assert.equal(
    (await h.exchange(`${ticket}; ${flow.binding}`)).statusCode,
    401,
  );
});
test("expired, missing, mismatched, replayed and cross-provider state never authenticate", async () => {
  const h = harness(),
    flow = await h.start();
  for (const result of [
    await h.callback({ ...flow, binding: "" }),
    await h.callback({ ...flow, state: random() }),
    await h.callback(flow, "naver"),
  ]) {
    assert.match(result.headers.Location, /error=invalid_state$/);
  }
  assert.equal(h.calls(), 0);
  await h.callback(flow);
  await h.callback(flow);
  assert.equal(h.calls(), 1);
  const expired = await h.start();
  h.advance(600_001);
  assert.match(
    (await h.callback(expired)).headers.Location,
    /error=invalid_state$/,
  );
  assert.equal(h.calls(), 1);
});
test("provider denial consumes state, sanitizes error and clears cookies", async () => {
  const h = harness(),
    flow = await h.start();
  const response = await h.callback(flow, "kakao", {
    error: "<script>private-token</script>",
  });
  assert.match(response.headers.Location, /error=cancelled$/);
  assert.ok(cookies(response).every((value) => value.includes("Max-Age=0")));
  assert.equal(h.calls(), 0);
  assert.match(
    (await h.callback(flow)).headers.Location,
    /error=invalid_state$/,
  );
});
test("exchange expiry and cross-origin or GET requests fail closed", async () => {
  const h = harness(),
    flow = await h.start(),
    callback = await h.callback(flow);
  const cookie = `${cookies(callback)[0].split(";")[0]}; ${flow.binding}`;
  assert.equal((await h.handle("auth-exchange", event("GET"))).statusCode, 405);
  assert.equal(
    (
      await h.handle(
        "auth-exchange",
        event(
          "POST",
          {},
          {
            headers: {
              origin: "https://attacker.example",
              cookie,
              "content-type": "application/json",
            },
          },
        ),
      )
    ).statusCode,
    403,
  );
  assert.equal(
    (
      await h.handle(
        "auth-exchange",
        event(
          "POST",
          {},
          { headers: { cookie, "content-type": "application/json" } },
        ),
      )
    ).statusCode,
    403,
  );
  h.advance(60_001);
  assert.equal((await h.exchange(cookie)).statusCode, 401);
});
test("profile writes derive UID from a verified ID token, restrict editable fields", async () => {
  const h = harness();
  const patch = (data, token = "valid-id-token") =>
    h.handle(
      "member-profile",
      event(
        "PATCH",
        {},
        {
          headers: {
            origin: config.origin,
            authorization: `Bearer ${token}`,
            "content-type": "application/json",
          },
          body: JSON.stringify(data),
        },
      ),
    );
  assert.equal(
    (await patch({ nickname: "새이름", neighborhood: "서신동" })).statusCode,
    200,
  );
  assert.deepEqual(h.updates[0], {
    uid: "server-derived-uid",
    update: { nickname: "새이름", neighborhood: "서신동" },
  });
  assert.equal(
    (await patch({ nickname: "이름" }, "forged-token")).statusCode,
    401,
  );
  for (const data of [
    { uid: "victim", nickname: "이름" },
    { balance: 9999 },
    { provider: "admin" },
    { createdAt: 1 },
    { nickname: " " },
    { nickname: "<script>" },
    { neighborhood: "invalid-town" },
    { neighborhood: null },
    {},
  ]) {
    assert.equal((await patch(data)).statusCode, 400);
  }
  assert.equal(h.updates.length, 1);
});
test("server configuration rejects insecure production origins and emulator leakage", () => {
  const env = {
    APP_BASE_URL: config.origin,
    FIREBASE_PROJECT_ID: "example",
    FIREBASE_CLIENT_EMAIL: "service@example",
    FIREBASE_PRIVATE_KEY: "key\\nvalue",
  };
  assert.equal(getConfig(env).privateKey, "key\nvalue");
  for (const extra of [
    { APP_BASE_URL: "http://example.com" },
    { APP_BASE_URL: config.origin + "/redirect" },
    { APP_BASE_URL: "https://user:pass@example.com" },
    { FIREBASE_AUTH_EMULATOR_HOST: "127.0.0.1:9099" },
    { FIREBASE_PRIVATE_KEY: "" },
  ]) {
    assert.throws(() => getConfig({ ...env, ...extra }), /auth_unavailable/);
  }
  assert.equal(
    getConfig({
      ...env,
      APP_BASE_URL: "http://localhost:8888",
      NETLIFY_DEV: "true",
    }).secure,
    false,
  );
});
test("provider tokens are exchanged on server and user ID comes only from user-info response", async () => {
  for (const provider of ["kakao", "naver"]) {
    const calls = [];
    const client = createProviders(config, async (url, init) => {
      calls.push({ url, init });
      return {
        ok: true,
        json: async () =>
          calls.length === 1
            ? { access_token: "private-access-token" }
            : provider === "kakao"
              ? {
                  id: 1234,
                  kakao_account: { profile: { nickname: "진짜 회원" } },
                }
              : {
                  resultcode: "00",
                  response: { id: "provider-id", nickname: "진짜 회원" },
                },
      };
    });
    const member = await client.authenticate(
      provider,
      "code-from-callback",
      "state",
    );
    assert.equal(
      member.uid,
      `${provider}_${hash(provider === "kakao" ? "1234" : "provider-id")}`,
    );
    assert.equal(calls[0].init.method, "POST");
    assert.equal(
      new URLSearchParams(calls[0].init.body).get("client_secret"),
      config[provider].secret,
    );
    assert.equal(
      calls[1].init.headers.Authorization,
      "Bearer private-access-token",
    );
    assert.equal(calls[0].init.redirect, "error");
    assert.equal(JSON.stringify(member).includes("token"), false);
  }
});
test("provider failures, missing IDs and disabled Firebase users cannot authenticate", async () => {
  for (const response of [
    { ok: false },
    {
      ok: true,
      json: async () => ({
        error: "invalid_client",
        access_token: "sensitive",
      }),
    },
  ]) {
    await assert.rejects(
      createProviders(config, async () => response).authenticate(
        "naver",
        "code",
        "state",
      ),
      /provider_failed/,
    );
  }
  let count = 0;
  await assert.rejects(
    createProviders(config, async () => ({
      ok: true,
      json: async () =>
        ++count === 1
          ? { access_token: "x" }
          : { resultcode: "00", response: {} },
    })).authenticate("naver", "code", "state"),
    /provider_failed/,
  );
  const identity = createIdentity({
    getUser: async () => ({ disabled: true }),
  });
  await assert.rejects(
    identity.ensureUser({ uid: "disabled" }),
    /account_disabled/,
  );
  await assert.rejects(
    identity.customToken("disabled", "kakao"),
    /account_disabled/,
  );
});
