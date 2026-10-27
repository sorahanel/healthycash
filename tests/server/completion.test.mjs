import test from "node:test";
import assert from "node:assert/strict";
import { createProviders } from "../../netlify/lib/providers.mjs";
import { createHandlers } from "../../netlify/lib/service.mjs";
import { HttpError, fail } from "../../netlify/lib/security.mjs";

const origin = "https://healthycash.example";
const config = { origin, secure: true, kakao: { clientId: "app-id", secret: "app-secret" } };
const canary = "PRIVATE-TOKEN-ERROR-PAYLOAD-DO-NOT-LEAK";
const event = (query) => ({
  httpMethod: "GET",
  queryStringParameters: { state: "s".repeat(43), code: canary, ...query },
  headers: { cookie: `__Host-hc_oauth=${"b".repeat(43)}` },
});

test("provider errors retain only a fixed category for both HTTP and JSON failures", async () => {
  for (const [ok, payload, expected] of [
    [false, { error: "invalid_client", error_description: canary }, "provider_client_rejected"],
    [true, { error: "invalid_client", access_token: canary }, "provider_client_rejected"],
    [false, { error_code: "KOE010", error_description: canary }, "provider_client_rejected"],
    [false, { error: "invalid_grant", error_description: canary }, "provider_code_rejected"],
    [false, { error: canary, access_token: canary }, "provider_token_failed"],
    [true, null, "provider_token_failed"],
  ]) {
    const providers = createProviders(config, async () => ({ ok, json: async () => payload }));
    await assert.rejects(providers.authenticate("kakao", "auth-code", "state"), (error) => {
      assert.equal(error.code, "provider_failed");
      assert.equal(error.diagnostic, expected);
      assert.equal(JSON.stringify(error).includes(canary), false);
      assert.equal(error.message.includes(canary), false);
      return true;
    });
  }
  let requests = 0;
  const providers = createProviders(config, async () => ({
    ok: true,
    json: async () => ++requests === 1 ? { access_token: canary } : { id: null },
  }));
  await assert.rejects(providers.authenticate("kakao", "code", "state"), (error) =>
    error.diagnostic === "provider_profile_failed");
});

test("callback failures identify their stage, clear cookies and never deliver a login ticket", async (t) => {
  const logs = [];
  t.mock.method(console, "error", (line) => logs.push(line));
  const cases = [
    ["claimFlow", { code: 7 }, "firestore_permission_denied", "oauth_state_claim"],
    ["authenticate", Object.assign(new HttpError(502, "provider_failed"), { diagnostic: "provider_client_rejected" }), "provider_client_rejected", "provider_authenticate"],
    ["ensureUser", { code: "auth/insufficient-permission" }, "firebase_auth_permission_denied", "firebase_user_ensure"],
    ["ensureUser", { code: "auth/configuration-not-found" }, "firebase_auth_not_configured", "firebase_user_ensure"],
    ["upsertMember", { code: 7 }, "firestore_permission_denied", "member_upsert"],
    ["createTicket", { code: 14 }, "firestore_unavailable", "login_ticket_create"],
  ];
  for (const [operation, failure, expected, stage] of cases) {
    const calls = [];
    const step = (name, value) => async () => {
      calls.push(name);
      if (name === operation)
        throw failure instanceof HttpError
          ? Object.assign(failure, { message: canary })
          : Object.assign(new Error(canary), failure);
      return value;
    };
    const handler = createHandlers({
      config,
      store: {
        claimFlow: step("claimFlow"),
        upsertMember: step("upsertMember"),
        createTicket: step("createTicket"),
      },
      identity: { ensureUser: step("ensureUser") },
      providers: { authenticate: step("authenticate", { uid: "test-user", provider: "kakao", nickname: "이웃" }) },
    });
    const result = await handler("kakao-callback", event());
    const url = new URL(result.headers.Location);
    assert.equal(url.origin, origin);
    assert.equal(url.pathname, "/auth/complete");
    assert.deepEqual([...url.searchParams.keys()].sort(), ["diagnostic", "error"]);
    assert.equal(url.searchParams.get("error"), "login_failed");
    assert.equal(url.searchParams.get("diagnostic"), expected);
    assert.equal(calls.at(-1), operation);
    assert.ok(result.multiValueHeaders["Set-Cookie"].every((cookie) => cookie.includes("Max-Age=0")));
    assert.equal(JSON.stringify([result, logs]).includes(canary), false);
    assert.equal(JSON.parse(logs.at(-1)).stage, stage);
  }
});

test("a missing provider secret is diagnosed after consent; matching secret permits completion", async (t) => {
  t.mock.method(console, "error", () => {});
  for (const correctSecret of [false, true]) {
    let tokenRequests = 0, members = 0, tickets = 0;
    const current = { ...config, kakao: { ...config.kakao, secret: correctSecret ? "app-secret" : undefined } };
    const providers = createProviders(current, async (url, init) => {
      if (url.endsWith("/oauth/token")) {
        tokenRequests++;
        const matches = new URLSearchParams(init.body).get("client_secret") === "app-secret";
        return {
          ok: matches,
          json: async () => matches
            ? { access_token: canary }
            : { error: "invalid_client", error_description: canary },
        };
      }
      return { ok: true, json: async () => ({ id: 12345 }) };
    });
    const handler = createHandlers({
      config: current,
      providers,
      identity: { ensureUser: async () => { members++; } },
      store: { claimFlow: async () => {}, upsertMember: async () => {}, createTicket: async () => { tickets++; } },
    });
    const result = await handler("kakao-callback", event());
    const url = new URL(result.headers.Location);
    assert.equal(tokenRequests, 1);
    assert.equal(members, correctSecret ? 1 : 0);
    assert.equal(tickets, correctSecret ? 1 : 0);
    assert.equal(url.searchParams.get("diagnostic"), correctSecret ? null : "provider_client_rejected");
    assert.equal(JSON.stringify(result).includes(canary), false);
  }
});

test("failed custom token creation clears cookies and cannot reuse the consumed login ticket", async (t) => {
  t.mock.method(console, "error", () => {});
  let consumed = false, tokens = 0;
  const handler = createHandlers({
    config,
    providers: {},
    store: { claimTicket: async () => {
      if (consumed) fail(401, "login_expired");
      consumed = true;
      return { uid: "test-user", provider: "kakao" };
    } },
    identity: { customToken: async () => {
      tokens++;
      throw Object.assign(new Error(canary), { code: "auth/insufficient-permission" });
    } },
  });
  const request = {
    httpMethod: "POST",
    headers: {
      origin,
      "content-type": "application/json",
      cookie: `__Host-hc_oauth=${"b".repeat(43)}; __Host-hc_login=${"t".repeat(43)}`,
    },
    body: "{}",
  };
  const result = await handler("auth-exchange", request);
  assert.equal(result.statusCode, 503);
  assert.deepEqual(JSON.parse(result.body), { error: "server_error", diagnostic: "firebase_auth_permission_denied" });
  assert.ok(result.multiValueHeaders["Set-Cookie"].every((cookie) => cookie.includes("Max-Age=0")));
  assert.equal(JSON.stringify(result).includes(canary), false);
  assert.equal((await handler("auth-exchange", request)).statusCode, 401);
  assert.equal(tokens, 1);
});
