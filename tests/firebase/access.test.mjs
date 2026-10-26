import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { generateKeyPairSync } from "node:crypto";
import {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
} from "@firebase/rules-unit-testing";
import {
  doc,
  getDoc,
  getDocs,
  collection,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
} from "firebase/firestore";
import {
  initializeApp as clientApp,
  deleteApp as deleteClient,
} from "firebase/app";
import {
  getAuth as clientAuth,
  connectAuthEmulator,
  signInWithCustomToken,
  signOut,
} from "firebase/auth";
import { initializeApp, deleteApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";
import { createStore, createIdentity } from "../../netlify/lib/firebase.mjs";
import { hash } from "../../netlify/lib/security.mjs";

let env, admin, db, store;
const projectId = "demo-healthycash";
before(async () => {
  assert.ok(
    process.env.FIRESTORE_EMULATOR_HOST &&
      process.env.FIREBASE_AUTH_EMULATOR_HOST,
    "Run with npm run test:firebase; never point these tests at production.",
  );
  env = await initializeTestEnvironment({
    projectId,
    firestore: { rules: await readFile("firestore.rules", "utf8") },
  });
  await env.clearFirestore();
  const { privateKey } = generateKeyPairSync("rsa", {
    modulusLength: 2048,
    privateKeyEncoding: { type: "pkcs8", format: "pem" },
    publicKeyEncoding: { type: "spki", format: "pem" },
  });
  admin = initializeApp(
    {
      projectId,
      credential: cert({
        projectId,
        clientEmail: `test@${projectId}.iam.gserviceaccount.com`,
        privateKey,
      }),
    },
    "rules-test",
  );
  db = getFirestore(admin);
  store = createStore(db);
  await store.upsertMember(
    { uid: "owner", provider: "kakao", nickname: "원래 이름" },
    1000,
  );
  await store.upsertMember(
    { uid: "other", provider: "naver", nickname: "다른 회원" },
    1000,
  );
});
after(async () => {
  await env?.cleanup();
  if (admin) await deleteApp(admin);
});
test("Firestore permits only own-document get; even owners cannot create, edit, delete or list", async () => {
  const own = env.authenticatedContext("owner").firestore(),
    stranger = env.authenticatedContext("other").firestore(),
    anon = env.unauthenticatedContext().firestore();
  await assertSucceeds(getDoc(doc(own, "users/owner")));
  await assertFails(getDoc(doc(stranger, "users/owner")));
  await assertFails(getDoc(doc(anon, "users/owner")));
  await assertFails(getDocs(collection(own, "users")));
  await assertFails(
    getDocs(query(collection(own, "users"), where("uid", "==", "owner"))),
  );
  await assertFails(
    setDoc(doc(own, "users/owner"), { nickname: "변조", balance: 999999 }),
  );
  await assertFails(updateDoc(doc(own, "users/owner"), { nickname: "변조" }));
  await assertFails(deleteDoc(doc(own, "users/owner")));
  await assertFails(setDoc(doc(anon, "users/new"), { uid: "new" }));
});
test("authentication state, login tickets, health records and rewards deny all browser access", async () => {
  for (const path of [
    "oauthFlows/state",
    "loginTickets/ticket",
    "users/owner/healthRecords/one",
    "balances/owner",
  ]) {
    for (const client of [
      env.authenticatedContext("owner").firestore(),
      env.unauthenticatedContext().firestore(),
    ]) {
      await assertFails(getDoc(doc(client, path)));
      await assertFails(setDoc(doc(client, path), { injected: true }));
    }
  }
});
test("returning members retain creation time and edited profile; no demo balances/health are stored", async () => {
  await store.updateMember(
    "owner",
    { nickname: "수정한 이름", neighborhood: "서신동" },
    2000,
  );
  await Promise.all([
    store.upsertMember(
      { uid: "owner", provider: "kakao", nickname: "소셜 기본 이름" },
      3000,
    ),
    store.upsertMember(
      { uid: "owner", provider: "kakao", nickname: "소셜 기본 이름" },
      3000,
    ),
  ]);
  const member = (await db.doc("users/owner").get()).data();
  assert.equal(member.nickname, "수정한 이름");
  assert.equal(member.neighborhood, "서신동");
  assert.equal(member.createdAt.toMillis(), 1000);
  assert.equal(member.lastLoginAt.toMillis(), 3000);
  assert.deepEqual(
    Object.keys(member).sort(),
    [
      "uid",
      "nickname",
      "neighborhood",
      "provider",
      "createdAt",
      "updatedAt",
      "lastLoginAt",
    ].sort(),
  );
  await assert.rejects(
    store.updateMember("unknown", { nickname: "x" }, 1),
    /member_not_found/,
  );
});
test("Firestore transactions allow exactly one callback and one concurrent ticket redemption", async () => {
  await store.createFlow("state", {
    bindingHash: hash("browser"),
    provider: "kakao",
    expiresAtMs: 2000,
  });
  await assert.rejects(
    store.claimFlow("state", hash("attacker"), "kakao", 1000),
    /invalid_state/,
  );
  const callbacks = await Promise.allSettled(
    Array.from({ length: 4 }, () =>
      store.claimFlow("state", hash("browser"), "kakao", 1000),
    ),
  );
  assert.equal(callbacks.filter((x) => x.status === "fulfilled").length, 1);
  await store.createTicket("ticket", {
    uid: "owner",
    provider: "kakao",
    bindingHash: hash("browser"),
    expiresAtMs: 2000,
  });
  const exchanges = await Promise.allSettled(
    Array.from({ length: 4 }, () =>
      store.claimTicket("ticket", hash("browser"), 1000),
    ),
  );
  assert.equal(exchanges.filter((x) => x.status === "fulfilled").length, 1);
  await store.createTicket("expired", {
    uid: "owner",
    provider: "kakao",
    bindingHash: hash("browser"),
    expiresAtMs: 999,
  });
  await assert.rejects(
    store.claimTicket("expired", hash("browser"), 1000),
    /login_expired/,
  );
});
test("Firebase custom token signs in through Auth emulator; server rejects forged and disabled sessions", async () => {
  const auth = getAuth(admin),
    identity = createIdentity(auth);
  await identity.ensureUser({ uid: "custom-member", nickname: "회원" });
  const token = await identity.customToken("custom-member", "kakao");
  const app = clientApp(
    { apiKey: "fake-api-key", projectId, authDomain: "localhost" },
    "custom-auth-test",
  );
  const client = clientAuth(app);
  connectAuthEmulator(
    client,
    `http://${process.env.FIREBASE_AUTH_EMULATOR_HOST}`,
    { disableWarnings: true },
  );
  try {
    const credentials = await signInWithCustomToken(client, token),
      idToken = await credentials.user.getIdToken();
    assert.equal((await identity.verifyToken(idToken)).uid, "custom-member");
    assert.equal((await identity.verifyToken(idToken)).loginProvider, "kakao");
    await assert.rejects(identity.verifyToken("forged-token"));
    await auth.updateUser("custom-member", { disabled: true });
    await assert.rejects(identity.verifyToken(idToken));
    await assert.rejects(
      identity.customToken("custom-member", "kakao"),
      /account_disabled/,
    );
    await signOut(client);
    assert.equal(client.currentUser, null);
  } finally {
    await deleteClient(app);
  }
});
