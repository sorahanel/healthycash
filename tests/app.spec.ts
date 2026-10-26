import { test, expect, type Page } from "@playwright/test";
const sidebar = (page: Page) => page.locator(".sidebar");
const stored = (page: Page) =>
  page.evaluate(() => JSON.parse(localStorage.getItem("healthycash-demo-v1")!));
test("인증 설정이 없어도 시연은 유지하고 로그인 준비 상태를 보여준다", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .locator(".header-actions")
    .getByRole("button", { name: "로그인", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "나의 건강한 일상, 함께 시작해요" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "카카오로 시작하기" }),
  ).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "네이버로 시작하기" }),
  ).toBeDisabled();
  await expect(page.getByText("로그인 연결을 준비 중이에요.")).toBeVisible();
  expect((await stored(page)).balance).toBe(2480);
  await page.screenshot({
    path: "test-results/account-desktop.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect
    .poll(() =>
      page
        .locator(".sidebar")
        .evaluate((element) => element.getBoundingClientRect().right <= 0),
    )
    .toBe(true);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "test-results/account-mobile.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "로그인 없이 시연 둘러보기" }).click();
  await expect(
    page.getByText("지민님, 오늘도 건강을 쌓아볼까요?"),
  ).toBeVisible();
});
test("로그인 연결 실패 화면에서 토큰을 남기지 않고 다시 시연으로 돌아간다", async ({
  page,
}) => {
  await page.goto("/auth/complete?error=invalid_state");
  await expect(page.getByRole("alert")).toContainText("다시 시작");
  await expect(page).toHaveURL("http://127.0.0.1:5173/");
  await page.getByRole("button", { name: "로그인 없이 시연 둘러보기" }).click();
  expect((await stored(page)).balance).toBe(2480);
});
test.beforeEach(async ({ page }) => {
  await page.goto("/");
});

test("걷기 목표를 채워야 적립되고, 새로고침해도 하루 한 번만 지급된다", async ({
  page,
}) => {
  await sidebar(page).getByRole("button", { name: "미션·챌린지" }).click();
  const walk = page
    .locator(".mission-row")
    .filter({ hasText: "하루 7,000보 걷기" });
  await expect(walk).toContainText("5,432");
  await walk.getByRole("button").click();
  expect((await stored(page)).balance).toBe(2480);
  await page
    .getByRole("button", { name: "시연 걸음 1,000보 추가" })
    .click({ clickCount: 2, delay: 100 });
  await expect(walk).toContainText("7,432");
  await walk.getByRole("button").click();
  await expect(walk.getByRole("button")).toBeDisabled();
  expect((await stored(page)).balance).toBe(2510);
  expect((await stored(page)).xp).toBe(1920);
  await page.reload();
  await sidebar(page).getByRole("button", { name: "미션·챌린지" }).click();
  await expect(
    page
      .locator(".mission-row")
      .filter({ hasText: "하루 7,000보 걷기" })
      .getByRole("button"),
  ).toBeDisabled();
  expect(
    (await stored(page)).transactions.filter(
      (t: { title: string }) => t.title === "하루 7,000보 달성",
    ),
  ).toHaveLength(1);
});

test("읽기 시간·본문·퀴즈 확인 후 글당 한 번만 보상한다", async ({ page }) => {
  await sidebar(page).getByRole("button", { name: "1분 건강글" }).click();
  await page.getByRole("button", { name: "오늘의 건강글 읽기" }).click();
  const dialog = page.getByRole("dialog");
  const claim = dialog.getByRole("button", { name: "다 읽었어요 +100 HC" });
  await expect(claim).toBeDisabled();
  await dialog.getByRole("button", { name: "아니다 X" }).click();
  await expect(
    dialog.getByText("본문의 안내를 다시 확인해 보세요."),
  ).toBeVisible();
  await expect(claim).toBeDisabled();
  await dialog.getByRole("button", { name: "그렇다 O" }).click();
  await expect(claim).toBeEnabled({ timeout: 15000 });
  await claim.click();
  expect((await stored(page)).balance).toBe(2580);
  await expect(
    dialog.getByRole("button", { name: "적립 완료" }),
  ).toBeDisabled();
  await dialog.getByRole("button", { name: "닫기", exact: true }).click();
  await page.getByRole("button", { name: "오늘의 건강글 읽기" }).click();
  await expect(
    page.getByRole("dialog").getByRole("button", { name: "적립 완료" }),
  ).toBeDisabled();
  expect(
    (await stored(page)).transactions.filter(
      (t: { id: string }) => t.id === "article:teeth",
    ),
  ).toHaveLength(1);
});

test("HC 사용은 10% 한도를 지키며 가상 원장과 잔액에 함께 반영된다", async ({
  page,
}) => {
  await sidebar(page)
    .getByRole("button", { name: "동네 혜택", exact: true })
    .click();
  await page.locator(".store-card").first().click();
  await page.getByRole("button", { name: "HC 사용 체험하기" }).click();
  const dialog = page.getByRole("dialog");
  await expect(
    dialog.getByRole("img", {
      name: "실제 결제에 사용할 수 없는 시연용 QR 코드",
    }),
  ).toBeVisible();
  await dialog.getByLabel("가게 결제 금액 (원)").fill("10000");
  await dialog.getByLabel("사용할 HC").fill("1001");
  await dialog.getByRole("button", { name: "가상 HC 사용 확정" }).click();
  await expect(dialog.getByRole("alert")).toContainText("10%");
  expect((await stored(page)).balance).toBe(2480);
  await dialog.getByRole("button", { name: "최대 사용" }).click();
  await dialog.getByRole("button", { name: "가상 HC 사용 확정" }).click();
  await expect(
    dialog.getByRole("heading", { name: "HC 사용 시연 완료!" }),
  ).toBeVisible();
  expect((await stored(page)).balance).toBe(1480);
  expect((await stored(page)).transactions[0].hc).toBe(-1000);
  await dialog.getByRole("button", { name: "내역 확인하기" }).click();
  await expect(page.locator(".ledger-row").first()).toContainText("-1,000 HC");
});

test("보유 잔액 초과·소수점 HC를 거부한다", async ({ page }) => {
  await sidebar(page)
    .getByRole("button", { name: "동네 혜택", exact: true })
    .click();
  await page.locator(".store-card").nth(2).click();
  await page.getByRole("button", { name: "HC 사용 체험하기" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("사용할 HC").fill("2500");
  await dialog.getByRole("button", { name: "가상 HC 사용 확정" }).click();
  await expect(dialog.getByRole("alert")).toContainText("부족");
  await dialog.getByLabel("사용할 HC").fill("1.5");
  await dialog.getByRole("button", { name: "가상 HC 사용 확정" }).click();
  expect((await stored(page)).balance).toBe(2480);
  await expect(
    dialog.getByRole("heading", { name: "HC 사용 시연 완료!" }),
  ).toHaveCount(0);
});

test("선택 동의 후에만 건강 기록이 가능하고, 브라우저 저장소에 민감 수치를 남기지 않는다", async ({
  page,
}) => {
  await sidebar(page)
    .getByRole("button", { name: "건강 기록", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "건강 기록은 나의 선택이에요" }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "혈압 기록하기" })).toHaveCount(
    0,
  );
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "동의하고 기록 시작하기" }).click();
  await page.getByRole("button", { name: "혈압 기록하기" }).click();
  await page.getByLabel("수축기 혈압").fill("120");
  await page.getByLabel("이완기 혈압").fill("130");
  await page.getByRole("button", { name: "기록 저장하기" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  expect((await stored(page)).balance).toBe(2480);
  await page.getByLabel("이완기 혈압").fill("78");
  await page.getByRole("button", { name: "기록 저장하기" }).click();
  await expect(page.locator(".record-row")).toContainText("120 / 78");
  expect((await stored(page)).balance).toBe(2490);
  const storage = await page.evaluate(() => JSON.stringify(localStorage));
  expect(storage).not.toContain('"sys"');
  expect(storage).not.toContain('"dia"');
  await page.getByRole("button", { name: "기록하기", exact: true }).click();
  await page.getByLabel("수축기 혈압").fill("121");
  await page.getByLabel("이완기 혈압").fill("79");
  await page.getByRole("button", { name: "기록 저장하기" }).click();
  expect((await stored(page)).balance).toBe(2490);
  await page.getByRole("button", { name: "동의 철회·기록 삭제" }).click();
  await expect(
    page.getByRole("heading", { name: "건강 기록은 나의 선택이에요" }),
  ).toBeVisible();
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "동의하고 기록 시작하기" }).click();
  await expect(page.locator(".record-row")).toHaveCount(0);
  await page.reload();
  await sidebar(page)
    .getByRole("button", { name: "건강 기록", exact: true })
    .click();
  await expect(page.getByRole("checkbox")).not.toBeChecked();
});

test("검사 수치 보상은 최초 1회이며 동의 철회로 수치가 삭제된다", async ({
  page,
}) => {
  await sidebar(page)
    .getByRole("button", { name: "건강 기록", exact: true })
    .click();
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "동의하고 기록 시작하기" }).click();
  await page.getByRole("button", { name: "검사 기록 체험하기" }).click();
  await page.getByLabel("LDL 콜레스테롤 (mg/dL)").fill("110");
  await page.getByLabel("공복혈당 (mg/dL)").fill("95");
  await page.getByRole("button", { name: "확인하고 기록하기" }).click();
  await expect(page.locator(".lab-tile").first()).toContainText("110");
  expect((await stored(page)).balance).toBe(2780);
  await page.getByRole("button", { name: "수치 다시 입력하기" }).click();
  await page.getByLabel("LDL 콜레스테롤 (mg/dL)").fill("100");
  await page.getByLabel("공복혈당 (mg/dL)").fill("90");
  await page.getByRole("button", { name: "확인하고 기록하기" }).click();
  expect((await stored(page)).balance).toBe(2780);
  expect(
    await page.evaluate(() => localStorage.getItem("healthycash-demo-v1")),
  ).not.toContain("glucose");
  await page.getByRole("button", { name: "동의 철회·기록 삭제" }).click();
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "동의하고 기록 시작하기" }).click();
  await expect(page.locator(".lab-tile")).toHaveCount(0);
});

test("등급별 쿠폰을 제한하고 중복 발급하지 않는다", async ({ page }) => {
  await sidebar(page)
    .getByRole("button", { name: "리워드", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Gold 등급에서 열려요" }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "쿠폰 받기" }).first().click();
  expect((await stored(page)).coupons).toEqual(["coffee"]);
  await page.getByRole("button", { name: "내 쿠폰 보기" }).click();
  await expect(page.getByRole("dialog")).toContainText(
    "실제 가맹점에서 사용할 수 없으며",
  );
  await page.getByRole("button", { name: "확인했어요" }).click();
  await page.getByRole("button", { name: "내 쿠폰 보기" }).click();
  expect((await stored(page)).coupons).toEqual(["coffee"]);
});

test("프로필 설정을 반복해도 가입 보상이 중복 지급되지 않는다", async ({
  page,
}) => {
  await page.getByRole("button", { name: "전주 효자4동", exact: true }).click();
  await page.getByLabel("닉네임").fill("건강이");
  await page.getByLabel("내 동네").selectOption("효자5동");
  await page.getByRole("button", { name: "다음", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "설정 완료하기" }),
  ).toBeDisabled();
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "설정 완료하기" }).click();
  await page.getByRole("button", { name: "나의 건강한 일상 시작하기" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "건강이님",
  );
  expect((await stored(page)).balance).toBe(2480);
  await page.reload();
  await expect(
    page.getByRole("button", { name: "전주 효자5동", exact: true }),
  ).toBeVisible();
});

test("건강글 검색·분류 및 가맹점 분류가 동작한다", async ({ page }) => {
  await sidebar(page).getByRole("button", { name: "1분 건강글" }).click();
  await page.getByRole("button", { name: "구강 건강", exact: true }).click();
  await expect(page.locator(".article-card")).toHaveCount(1);
  await page.getByRole("textbox", { name: "건강글 검색" }).fill("없는검색어");
  await expect(
    page.getByRole("heading", { name: "검색 결과가 없어요" }),
  ).toBeVisible();
  await sidebar(page)
    .getByRole("button", { name: "동네 혜택", exact: true })
    .click();
  await page.getByRole("button", { name: "운동·웰니스", exact: true }).click();
  await expect(page.locator(".store-card")).toHaveCount(1);
  await expect(page.locator(".store-card")).toContainText("오늘의 필라테스");
});

test("운영 감수 워크플로 시연은 사용자 콘텐츠를 감수 완료로 바꾸지 않는다", async ({
  page,
}) => {
  await sidebar(page).getByRole("button", { name: "운영 대시보드" }).click();
  await page.getByRole("button", { name: "콘텐츠 감수", exact: true }).click();
  await page.getByRole("button", { name: "다음 단계로 이동" }).click();
  await expect(page.getByRole("button", { name: "이동 완료" })).toBeDisabled();
  await sidebar(page).getByRole("button", { name: "1분 건강글" }).click();
  await page.getByRole("button", { name: "오늘의 건강글 읽기" }).click();
  await expect(page.getByRole("dialog")).toContainText("의료진 최종 감수 전");
});

test("모바일 모든 주요 화면에서 가로 넘침·스크립트 오류 없이 메뉴가 동작한다", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(300);
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  for (const name of [
    "홈",
    "미션·챌린지",
    "1분 건강글",
    "동네 혜택",
    "건강 기록",
    "리워드",
    "내 HC 지갑",
    "운영 대시보드",
  ]) {
    await page.getByRole("button", { name: "메뉴 열기" }).click();
    await sidebar(page)
      .getByRole("button", {
        name,
        exact: name !== "미션·챌린지" && name !== "운영 대시보드",
      })
      .click();
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
  expect(errors).toEqual([]);
});

test("CSV 원장 다운로드와 시연 데이터 초기화를 지원한다", async ({ page }) => {
  await sidebar(page).getByRole("button", { name: "내 HC 지갑" }).click();
  const event = page.waitForEvent("download");
  await page.getByRole("button", { name: "CSV 내려받기" }).click();
  expect((await event).suggestedFilename()).toBe("healthycash-demo-ledger.csv");
  await sidebar(page)
    .getByRole("button", { name: "리워드", exact: true })
    .click();
  await page.getByRole("button", { name: "쿠폰 받기" }).first().click();
  await page.getByRole("button", { name: "내 프로필 설정" }).click();
  await page.getByRole("button", { name: "시연 데이터 초기화" }).click();
  await page.getByRole("button", { name: "초기화하기", exact: true }).click();
  expect((await stored(page)).coupons).toEqual([]);
  expect((await stored(page)).balance).toBe(2480);
});

test("병원 광고는 심의번호 등록 시연 이후에도 검증 전 비공개를 유지한다", async ({
  page,
}) => {
  await sidebar(page).getByRole("button", { name: "운영 대시보드" }).click();
  await page.getByRole("button", { name: "병원 파트너", exact: true }).click();
  await expect(page.locator(".hospital-status")).toContainText(
    "심의 미확인 · 비공개",
  );
  await page.getByLabel("시연 심의번호").fill("DEMO-REVIEW-ONLY");
  await page.getByRole("button", { name: "확인 대기 상태로 이동" }).click();
  await expect(page.locator(".hospital-status")).toContainText(
    "심의 증빙 확인 대기 · 비공개",
  );
  await expect(
    page.getByRole("button", { name: "전화 · 공개 후 활성화" }),
  ).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "홈페이지 · 공개 후 활성화" }),
  ).toBeDisabled();
});

test("한국 날짜가 바뀌면 일일 활동만 초기화하고 일회성 쿠폰은 유지한다", async ({
  page,
}) => {
  await page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem("healthycash-demo-v1")!);
    s.day = "2000-01-01";
    s.claims = ["daily:2000-01-01:walk", "article:teeth"];
    s.coupons = ["coffee"];
    localStorage.setItem("healthycash-demo-v1", JSON.stringify(s));
  });
  await page.reload();
  const s = await stored(page);
  expect(s.steps).toBe(0);
  expect(s.water).toBe(0);
  expect(s.balance).toBe(2480);
  expect(s.claims).toEqual(["article:teeth"]);
  expect(s.coupons).toEqual(["coffee"]);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
});

test("잘못된 저장 데이터가 있어도 기본 시연 화면으로 복원한다", async ({
  page,
}) => {
  await page.evaluate(() =>
    localStorage.setItem(
      "healthycash-demo-v1",
      JSON.stringify({
        balance: 100,
        claims: [],
        transactions: [],
        coupons: [],
        joined: [],
      }),
    ),
  );
  await page.reload();
  await expect(page.getByRole("heading", { level: 1 })).toContainText("지민님");
  expect((await stored(page)).balance).toBe(2480);
});
