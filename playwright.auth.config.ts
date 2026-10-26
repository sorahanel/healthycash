import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests",
  testMatch: "auth.spec.ts",
  fullyParallel: false,
  workers: 1,
  timeout: 45000,
  use: {
    baseURL: "http://127.0.0.1:5175",
    launchOptions: {
      executablePath:
        process.env.CHROMIUM_PATH ||
        (process.env.CI ? undefined : "/usr/bin/chromium"),
      args: ["--no-sandbox"],
    },
    trace: "retain-on-failure",
  },
  webServer: [
    {
      command: "node tests/support/auth-server.mjs",
      url: "http://127.0.0.1:8889/ready",
      reuseExistingServer: false,
    },
    {
      command: "vite --config tests/support/vite.auth.config.ts",
      url: "http://127.0.0.1:5175",
      reuseExistingServer: false,
      env: {
        VITE_FIREBASE_API_KEY: "fake-api-key",
        VITE_FIREBASE_AUTH_DOMAIN: "localhost",
        VITE_FIREBASE_PROJECT_ID: "demo-healthycash",
        VITE_FIREBASE_APP_ID: "test-web-app",
        VITE_USE_FIREBASE_EMULATORS: "true",
      },
    },
  ],
  reporter: [["list"]],
});
