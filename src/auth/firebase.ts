import { initializeApp } from "firebase/app";
import { connectAuthEmulator, getAuth } from "firebase/auth";
import { connectFirestoreEmulator, getFirestore } from "firebase/firestore";

const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};
function initialize() {
  if (
    Object.values(config).some((value) => !value || value.startsWith("your-"))
  )
    return null;
  try {
    const app = initializeApp(config),
      auth = getAuth(app),
      db = getFirestore(app);
    // Emulators are unreachable from production builds, even if a flag was accidentally set.
    if (
      import.meta.env.DEV &&
      import.meta.env.VITE_USE_FIREBASE_EMULATORS === "true" &&
      ["localhost", "127.0.0.1"].includes(window.location.hostname)
    ) {
      connectAuthEmulator(auth, "http://127.0.0.1:9099", {
        disableWarnings: true,
      });
      connectFirestoreEmulator(db, "127.0.0.1", 8080);
    }
    return { auth, db };
  } catch {
    return null;
  }
}
export const firebase = initialize();
