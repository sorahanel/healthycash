// Test-only HTTP adapter. This file is outside Netlify's functions/public directories.
import { createServer } from "node:http";
import { generateKeyPairSync } from "node:crypto";
import { initializeApp, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { createIdentity, createStore } from "../../netlify/lib/firebase.mjs";
import { createHandlers } from "../../netlify/lib/service.mjs";
import { hash } from "../../netlify/lib/security.mjs";

if (
  !process.env.FIRESTORE_EMULATOR_HOST ||
  !process.env.FIREBASE_AUTH_EMULATOR_HOST
)
  throw Error("Firebase emulators required");
const projectId = "demo-healthycash";
const { privateKey } = generateKeyPairSync("rsa", {
  modulusLength: 2048,
  privateKeyEncoding: { type: "pkcs8", format: "pem" },
  publicKeyEncoding: { type: "spki", format: "pem" },
});
const app = initializeApp({
  projectId,
  credential: cert({
    projectId,
    clientEmail: `test@${projectId}.iam.gserviceaccount.com`,
    privateKey,
  }),
});
const handler = createHandlers({
  config: {
    origin: "http://127.0.0.1:5175",
    secure: false,
    kakao: { clientId: "test-kakao" },
    naver: { clientId: "test-naver", secret: "test-secret" },
  },
  store: createStore(getFirestore(app)),
  identity: createIdentity(getAuth(app)),
  providers: {
    async authenticate(provider, code) {
      return {
        uid: `${provider}_${hash(code)}`,
        provider,
        nickname: "소셜 회원",
      };
    },
  },
});
const server = createServer(async (request, response) => {
  const url = new URL(request.url, "http://127.0.0.1:8889");
  if (url.pathname === "/ready") {
    response.end("ok");
    return;
  }
  const route = url.pathname.split("/").pop();
  if (route === "auth-config") {
    response.setHeader("Content-Type", "application/json");
    response.end(JSON.stringify({ providers: { kakao: true, naver: true } }));
    return;
  }
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  const result = await handler(route, {
    httpMethod: request.method,
    headers: request.headers,
    queryStringParameters: Object.fromEntries(url.searchParams),
    body: Buffer.concat(chunks).toString("utf8"),
  });
  response.writeHead(result.statusCode, {
    ...result.headers,
    ...(result.multiValueHeaders || {}),
  });
  response.end(result.body);
});
server.listen(8889, "127.0.0.1");
