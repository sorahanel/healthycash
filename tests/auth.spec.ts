import { test, expect, type Page } from "@playwright/test";
import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { createHash } from "node:crypto";
const db = getFirestore(
  initializeApp({ projectId: "demo-healthycash" }, "browser-check"),
);
const memberId = (provider: string, code: string) =>
  provider + "_" + createHash("sha256").update(code).digest("hex");
const profile = (provider: string, code: string) =>
  db.collection("users").doc(memberId(provider, code));

async function providerScreen(
  page: Page,
  provider: "kakao" | "naver",
  code: string,
  cancelled = false,
) {
  const pattern =
    provider === "kakao"
      ? "https://kauth.kakao.com/oauth/authorize**"
      : "https://nid.naver.com/oauth2.0/authorize**";
  await page.route(pattern, async (route) => {
    const url = new URL(route.request().url());
    const callback = new URL(url.searchParams.get("redirect_uri")!);
    callback.searchParams.set("state", url.searchParams.get("state")!);
    callback.searchParams.set(
      cancelled ? "error" : "code",
      cancelled ? "access_denied" : code,
    );
    await route.fulfill({
      status: 302,
      headers: { Location: callback.href },
      body: "",
    });
  });
}
async function openAccount(page: Page) {
  await page
    .locator(".header-actions")
    .getByRole("button", { name: /로그인|마이페이지/ })
    .click();
}
async function login(page: Page, provider: "kakao" | "naver") {
  await page
    .getByRole("button", {
      name: provider === "kakao" ? "카카오로 시작하기" : "네이버로 시작하기",
    })
    .click();
  await expect(page.getByLabel("회원 닉네임")).toBeVisible();
}
test("first login, profile edit, reload, logout and returning login keep one member without migrating demo data", async ({
  page,
  context,
}) => {
  const code = "browser-returning-member";
  await profile("kakao", code).delete();
  await providerScreen(page, "kakao", code);
  await page.goto("/");
  const before = await page.evaluate(() =>
    localStorage.getItem("healthycash-demo-v1"),
  );
  await openAccount(page);
  await login(page, "kakao");
  const first = (await profile("kakao", code).get()).data()!;
  expect(first.nickname).toBe("소셜 회원");
  expect(first.neighborhood).toBe("");
  expect(Object.keys(first).sort()).toEqual(
    [
      "uid",
      "provider",
      "nickname",
      "neighborhood",
      "createdAt",
      "updatedAt",
      "lastLoginAt",
    ].sort(),
  );
  await expect(page).toHaveURL("http://127.0.0.1:5175/");
  expect(
    (await context.cookies()).filter((cookie) => cookie.name.startsWith("hc_")),
  ).toHaveLength(0);
  expect(
    await page.evaluate(() => localStorage.getItem("healthycash-demo-v1")),
  ).toBe(before);
  await page.getByLabel("회원 닉네임").fill("다시 만난 이웃");
  await page.getByLabel("회원 동네").selectOption("서신동");
  await page
    .getByRole("button", { name: "회원정보 저장", exact: true })
    .click();
  await expect
    .poll(async () => (await profile("kakao", code).get()).data()?.nickname)
    .toBe("다시 만난 이웃");
  await page.reload();
  await openAccount(page);
  await expect(page.getByLabel("회원 닉네임")).toHaveValue("다시 만난 이웃");
  await page.getByRole("button", { name: "로그아웃", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "카카오로 시작하기" }),
  ).toBeVisible();
  await expect(page.getByLabel("회원 닉네임")).toHaveCount(0);
  await login(page, "kakao");
  await expect(page.getByLabel("회원 닉네임")).toHaveValue("다시 만난 이웃");
  await expect(page.getByLabel("회원 동네")).toHaveValue("서신동");
  expect(
    (await profile("kakao", code).get()).data()!.createdAt.toMillis(),
  ).toBe(first.createdAt.toMillis());
});
test("Naver login creates a separate account; switching account never shows previous profile", async ({
  page,
}) => {
  await providerScreen(page, "kakao", "switch-account");
  await providerScreen(page, "naver", "switch-account");
  await page.goto("/");
  await openAccount(page);
  await login(page, "kakao");
  await page.getByLabel("회원 닉네임").fill("이전 계정");
  await page
    .getByRole("button", { name: "회원정보 저장", exact: true })
    .click();
  await expect
    .poll(
      async () =>
        (await profile("kakao", "switch-account").get()).data()?.nickname,
    )
    .toBe("이전 계정");
  await page.getByRole("button", { name: "로그아웃", exact: true }).click();
  await login(page, "naver");
  await expect(page.getByLabel("회원 닉네임")).toHaveValue("소셜 회원");
  await expect(page.getByText("네이버 계정으로 로그인했어요")).toBeVisible();
  expect((await profile("naver", "switch-account").get()).exists).toBe(true);
});
test("cancelled and expired callbacks explain retry; no token is placed in URL", async ({
  page,
}) => {
  await providerScreen(page, "kakao", "unused", true);
  await page.goto("/");
  await openAccount(page);
  await page.getByRole("button", { name: "카카오로 시작하기" }).click();
  await expect(page.getByRole("alert")).toContainText("취소");
  expect(page.url()).toBe("http://127.0.0.1:5175/");
  await page.goto("/auth/complete");
  await expect(page.getByRole("alert")).toContainText("다시 로그인");
  await expect(page.getByLabel("회원 닉네임")).toHaveCount(0);
});
test("member API rejects unauthenticated and cross-site mutations", async ({
  request,
}) => {
  const own = await request.patch("/.netlify/functions/member-profile", {
    headers: { Origin: "http://127.0.0.1:5175" },
    data: { nickname: "변조" },
  });
  expect(own.status()).toBe(401);
  const foreign = await request.patch("/.netlify/functions/member-profile", {
    headers: { Origin: "https://foreign.example" },
    data: { nickname: "변조" },
  });
  expect(foreign.status()).toBe(403);
});
