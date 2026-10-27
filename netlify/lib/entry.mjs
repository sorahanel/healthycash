import { getConfig, enabled } from "./config.mjs";
import { firebaseServices } from "./firebase.mjs";
import { createProviders } from "./providers.mjs";
import { createHandlers } from "./service.mjs";
import { setupFailureResponse } from "./diagnostics.mjs";
import { HttpError, json, method } from "./security.mjs";

export async function handle(route, event) {
  try {
    if (route === "auth-config") {
      method(event, "GET");
      let config;
      try {
        config = getConfig();
      } catch {
        /* Missing configuration keeps the public demo usable. */
      }
      return json(200, {
        providers: {
          kakao: Boolean(config && enabled(config, "kakao")),
          naver: Boolean(config && enabled(config, "naver")),
        },
      });
    }
    const config = getConfig();
    return await createHandlers({
      config,
      ...firebaseServices(config),
      providers: createProviders(config),
    })(route, event);
  } catch (error) {
    if (error instanceof HttpError)
      return json(error.status, { error: error.code });
    return setupFailureResponse("firebase_initialize", error, "auth_unavailable");
  }
}
