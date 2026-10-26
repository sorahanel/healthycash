import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { equal, fail } from "./security.mjs";

export function createStore(db) {
  const date = (ms) => Timestamp.fromMillis(ms);
  return {
    createFlow: (id, data) =>
      db
        .collection("oauthFlows")
        .doc(id)
        .create({ ...data, expiresAt: date(data.expiresAtMs) }),
    async claimFlow(id, bindingHash, provider, now) {
      const ref = db.collection("oauthFlows").doc(id);
      await db.runTransaction(async (tx) => {
        const doc = await tx.get(ref),
          flow = doc.data();
        if (
          !flow ||
          flow.provider !== provider ||
          flow.expiresAtMs <= now ||
          !equal(flow.bindingHash, bindingHash)
        )
          fail(400, "invalid_state");
        tx.delete(ref);
      });
    },
    createTicket: (id, data) =>
      db
        .collection("loginTickets")
        .doc(id)
        .create({ ...data, expiresAt: date(data.expiresAtMs) }),
    async claimTicket(id, bindingHash, now) {
      const ref = db.collection("loginTickets").doc(id);
      return db.runTransaction(async (tx) => {
        const doc = await tx.get(ref),
          ticket = doc.data();
        if (
          !ticket ||
          ticket.expiresAtMs <= now ||
          !equal(ticket.bindingHash, bindingHash)
        )
          fail(401, "login_expired");
        tx.delete(ref);
        return { uid: ticket.uid, provider: ticket.provider };
      });
    },
    async upsertMember(member, now) {
      const ref = db.collection("users").doc(member.uid);
      await db.runTransaction(async (tx) => {
        const doc = await tx.get(ref);
        if (doc.exists) {
          if (doc.data().provider !== member.provider)
            fail(403, "account_conflict");
          tx.update(ref, { lastLoginAt: date(now) });
        } else {
          tx.create(ref, {
            uid: member.uid,
            provider: member.provider,
            nickname: member.nickname,
            neighborhood: "",
            createdAt: date(now),
            updatedAt: date(now),
            lastLoginAt: date(now),
          });
        }
      });
    },
    async updateMember(uid, update, now) {
      const ref = db.collection("users").doc(uid);
      await db.runTransaction(async (tx) => {
        if (!(await tx.get(ref)).exists) fail(404, "member_not_found");
        tx.update(ref, { ...update, updatedAt: date(now) });
      });
    },
  };
}
export function createIdentity(auth) {
  async function activeUser(uid) {
    const user = await auth.getUser(uid);
    if (user.disabled) fail(403, "account_disabled");
    return user;
  }
  return {
    async ensureUser(member) {
      try {
        await activeUser(member.uid);
      } catch (error) {
        if (error.code !== "auth/user-not-found") throw error;
        try {
          await auth.createUser({
            uid: member.uid,
            displayName: member.nickname,
          });
        } catch (creationError) {
          if (creationError.code !== "auth/uid-already-exists")
            throw creationError;
          await activeUser(member.uid);
        }
      }
    },
    async customToken(uid, provider) {
      await activeUser(uid);
      return auth.createCustomToken(uid, { loginProvider: provider });
    },
    verifyToken: (token) => auth.verifyIdToken(token, true),
  };
}
export function firebaseServices(config) {
  const app =
    getApps().find((app) => app.name === "healthycash-auth") ||
    initializeApp(
      {
        credential: cert({
          projectId: config.projectId,
          clientEmail: config.clientEmail,
          privateKey: config.privateKey,
        }),
        projectId: config.projectId,
      },
      "healthycash-auth",
    );
  return {
    store: createStore(getFirestore(app)),
    identity: createIdentity(getAuth(app)),
  };
}
