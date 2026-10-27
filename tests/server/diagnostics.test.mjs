import test from "node:test";
import assert from "node:assert/strict";
import { setupDiagnostic, setupFailureResponse } from "../../netlify/lib/diagnostics.mjs";
import { createHandlers } from "../../netlify/lib/service.mjs";
import { handle } from "../../netlify/lib/entry.mjs";

const config = {
  origin: "https://healthycash.example",
  secure: true,
  kakao: { clientId: "test-client" },
  naver: {},
};

test("login storage diagnostics distinguish database, IAM, credentials and availability failures", async (t) => {
  const logs = [];
  t.mock.method(console, "error", (line) => logs.push(line));
  const cases = [
    [{ code: 5 }, "firestore_not_found"],
    [{ code: 7 }, "firestore_permission_denied"],
    [{ code: 7, message: "reason: SERVICE_DISABLED" }, "firestore_api_disabled"],
    [{ code: 16 }, "firebase_credentials_rejected"],
    [{ code: 2, message: "Metadata plugin failed: invalid_grant: Invalid JWT Signature." }, "firebase_credentials_rejected"],
    [{ response: { data: { error: "invalid_grant" } } }, "firebase_credentials_rejected"],
    [{ code: 9 }, "firestore_precondition_failed"],
    [{ code: 8 }, "firestore_quota_exceeded"],
    [{ code: 4 }, "firestore_unavailable"],
    [{ code: 14 }, "firestore_unavailable"],
    [{ code: "unknown" }, "auth_setup_failed"],
  ];
  for (const [failure, expected] of cases) {
    let writes = 0, providerCalls = 0;
    const handler = createHandlers({
      config,
      store: { createFlow: async () => { writes++; throw failure; } },
      identity: {},
      providers: { authenticate: async () => { providerCalls++; } },
    });
    const result = await handler("auth-start", {
      httpMethod: "GET",
      queryStringParameters: { provider: "kakao" },
    });
    assert.equal(result.statusCode, 503);
    assert.deepEqual(JSON.parse(result.body), { error: "server_error", diagnostic: expected });
    assert.equal(writes, 1);
    assert.equal(providerCalls, 0);
    assert.equal(result.headers.Location, undefined);
    assert.equal(result.multiValueHeaders, undefined);
    assert.equal(result.headers["Cache-Control"], "no-store, max-age=0");
    assert.deepEqual(JSON.parse(logs.at(-1)), {
      event: "auth_setup_failure",
      stage: "oauth_state_create",
      diagnostic: expected,
    });
  }
});

test("diagnostics never return or log raw errors, tokens, credentials or request data", async (t) => {
  const canary = "SENSITIVE-CANARY-DO-NOT-EMIT";
  const logs = [];
  t.mock.method(console, "error", (line) => logs.push(line));
  const failure = Object.assign(new Error(canary), {
    code: canary,
    details: canary,
    metadata: { authorization: canary },
    response: { data: { error: canary, access_token: canary } },
    stack: canary,
  });
  const handler = createHandlers({
    config,
    store: { createFlow: async () => { throw failure; } },
    identity: {},
    providers: {},
  });
  const response = await handler("auth-start", {
    httpMethod: "GET",
    queryStringParameters: { provider: "kakao", code: canary, state: canary },
    headers: { cookie: canary, authorization: canary },
  });
  const unknownStage = setupFailureResponse(canary, failure, canary);
  assert.equal(JSON.stringify([response, unknownStage, logs]).includes(canary), false);
  assert.equal(JSON.parse(response.body).diagnostic, "auth_setup_failed");
  assert.equal(JSON.parse(logs.at(-1)).stage, "unknown");
});

test("invalid Firebase PEM at the actual function entry returns a safe credential diagnostic", async (t) => {
  const variables = {
    APP_BASE_URL: config.origin,
    FIREBASE_PROJECT_ID: "demo-healthycash",
    FIREBASE_CLIENT_EMAIL: "test@demo-healthycash.iam.gserviceaccount.com",
    FIREBASE_PRIVATE_KEY: "SENSITIVE-INVALID-PEM-CANARY",
    KAKAO_REST_API_KEY: "test-client",
    FIREBASE_AUTH_EMULATOR_HOST: undefined,
    FIRESTORE_EMULATOR_HOST: undefined,
    NETLIFY_DEV: undefined,
  };
  const before = Object.fromEntries(Object.keys(variables).map((key) => [key, process.env[key]]));
  const set = (values) => {
    for (const [key, value] of Object.entries(values)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  };
  t.after(() => set(before));
  set(variables);
  const logs = [];
  t.mock.method(console, "error", (line) => logs.push(line));
  const response = await handle("auth-start", {
    httpMethod: "GET",
    queryStringParameters: { provider: "kakao" },
  });
  assert.equal(response.statusCode, 503);
  assert.deepEqual(JSON.parse(response.body), {
    error: "auth_unavailable",
    diagnostic: "firebase_credentials_invalid",
  });
  assert.equal(JSON.stringify([response, logs]).includes(variables.FIREBASE_PRIVATE_KEY), false);
  assert.equal(JSON.parse(logs[0]).stage, "firebase_initialize");
});

test("database diagnostics are limited to database operations", () => {
  assert.equal(setupDiagnostic("firebase_initialize", { code: 5 }), "auth_setup_failed");
  for (const failure of [null, undefined, new Error("unclassified")]) {
    assert.equal(setupDiagnostic("oauth_state_create", failure), "auth_setup_failed");
  }
});
