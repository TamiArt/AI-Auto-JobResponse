import { expect, test, type Page } from "@playwright/test";

const TEST_JOB_URL = "https://example.com/jobs/qa-engineer";
const TEST_QUERY = "QA инженер";

const emptyPayload = { results: [] };
const jobicyPayload = {
  results: [{
    id: "jobicy-e2e-1",
    title: "QA Engineer",
    company: "Example Product",
    salary: "120000 USD",
    location: "Москва",
    experience: "Опыт не указан",
    publishedTimestamp: 1_787_050_800_000,
    url: TEST_JOB_URL,
    tags: ["QA", "Remote"],
    description: "QA инженер, тестирование качества продукта",
  }],
  meta: {
    lastUpdated: 1_787_050_800_000,
    nextRefresh: 1_787_054_400_000,
    refreshIntervalMs: 3_600_000,
    cached: true,
    stale: false,
  },
};

async function mockJobSources(page: Page, onJobicyRequest?: () => void) {
  await page.route("**/api/health**", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ ok: true }),
    }),
  );
  await page.route("**/api/jobs*", async (route) => {
    const url = new URL(route.request().url());
    const source = url.searchParams.get("source");
    console.log("E2E_SOURCE_REQUEST", source, route.request().url());
    const body = source === "jobicy"
      ? jobicyPayload
      : source === "hh"
        ? { items: [], page: 0, pages: 0 }
        : emptyPayload;
    if (source === "jobicy") { onJobicyRequest?.(); console.log("E2E_JOBICY_REQUEST", route.request().url(), JSON.stringify(body)); }

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(body),
    });
  });

  await page.route("https://www.arbeitnow.com/**", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ data: [] }),
    }),
  );

  await page.context().route("https://example.com/jobs/**", (route) =>
    route.fulfill({
      status: 200,
      contentType: "text/html",
      body: "<title>Example vacancy</title><h1>QA Engineer</h1>",
    }),
  );
}

test("critical job search flow works in a real browser", async ({ page }) => {
  let jobicyRequests = 0;
  await mockJobSources(page, () => { jobicyRequests += 1; });
  await page.goto("/");

  const searchInput = page.getByPlaceholder("QA-инженер, дизайнер, разработчик…");
  await expect(page.getByRole("heading", { name: "Найти работу" })).toBeVisible();
  const regionSelect = page.locator("label").filter({ hasText: "Регион" }).getByRole("combobox");
  const workModeSelect = page.locator("label").filter({ hasText: "Формат работы" }).getByRole("combobox");
  const employmentSelect = page.locator("label").filter({ hasText: "Тип занятости" }).getByRole("combobox");
  const experienceSelect = page.locator("label").filter({ hasText: "Опыт" }).getByRole("combobox");
  await regionSelect.selectOption("0");
  await workModeSelect.selectOption("any");
  await employmentSelect.selectOption("any");
  await experienceSelect.selectOption("any");
  await expect(regionSelect).toHaveValue("0");
  await expect(workModeSelect).toHaveValue("any");
  await expect(employmentSelect).toHaveValue("any");
  await expect(experienceSelect).toHaveValue("any");
  await searchInput.fill(TEST_QUERY);
  await page.getByRole("button", { name: "Найти", exact: true }).click();

  await expect.poll(() => jobicyRequests).toBeGreaterThan(0);
  const card = page.getByRole("article").filter({ hasText: "QA Engineer" });
  const resultBody = await page.locator("body").innerText();
  console.log("E2E_RESULT_STATUS", resultBody.includes("Найдено 0 вакансий") ? "ZERO" : resultBody.match(/Найдено\\s+\\d+\\s+вакансий/)?.[0] || "NO_COUNT", resultBody.includes("По этому запросу ничего не найдено") ? "EMPTY_STATE" : "");
  await expect(card).toBeVisible();
  await expect(card).toContainText("Example Product");

  const directLink = card.getByRole("link", { name: /Открыть вакансию/ });
  await expect(directLink).toHaveAttribute("href", TEST_JOB_URL);
  const popupPromise = page.waitForEvent("popup");
  await directLink.click();
  const popup = await popupPromise;
  await expect(popup).toHaveURL(TEST_JOB_URL);
  await expect(popup.getByRole("heading", { name: "QA Engineer" })).toBeVisible();
  await popup.close();

  await card.getByRole("button", { name: "Добавить в избранное" }).click();
  await expect(page.getByRole("button", { name: /Избранное · 1/ })).toBeVisible();

  await page.reload();
  await expect(page.getByRole("button", { name: /Избранное · 1/ })).toBeVisible();
  await page.getByRole("button", { name: /Избранное · 1/ }).click();
  await expect(page.getByRole("article").filter({ hasText: "QA Engineer" })).toBeVisible();

  await page.getByRole("button", { name: "Последние запросы" }).click();
  const historyItem = page.getByRole("button", { name: /QA инженер/ });
  await expect(historyItem).toBeVisible();
  await searchInput.fill("");
  await historyItem.click();
  await expect(searchInput).toHaveValue(TEST_QUERY);
  await expect(page.getByRole("article").filter({ hasText: "QA Engineer" })).toBeVisible();
});

test("static preview never calls HH directly and keeps browser-safe search", async ({ page }) => {
  let bffJobRequests = 0;
  let directHhRequests = 0;

  await page.route("**/api/health", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ ok: true }),
    }),
  );

  await page.route("**/api/jobs*", async (route) => {
    bffJobRequests += 1;
    const url = new URL(route.request().url());
    const source = url.searchParams.get("source");

    if (source === "jobicy") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          results: [{
            id: "static-qa",
            title: "QA Engineer",
            company: "Static Preview Company",
            salary: "120000 USD",
            location: "Remote",
            experience: "Опыт не указан",
            publishedTimestamp: 1_787_050_800_000,
            url: TEST_JOB_URL,
            tags: ["QA"],
            description: "QA инженер",
          }],
        }),
      });
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ results: [] }),
    });
  });

  await page.route("https://api.hh.ru/**", (route) => {
    directHhRequests += 1;
    return route.abort();
  });

  await page.route("https://www.arbeitnow.com/**", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ data: [] }),
    }),
  );

  await page.goto("/");
  await page.locator("label").filter({ hasText: "Регион" }).getByRole("combobox").selectOption("0");
  await page.getByPlaceholder("QA-инженер, дизайнер, разработчик…").fill(TEST_QUERY);
  await page.getByRole("button", { name: "Найти", exact: true }).click();

  const card = page.getByRole("article").filter({ hasText: "QA Engineer" });
  await expect(card).toBeVisible();
  await expect(card).toContainText("Static Preview Company");
  expect(bffJobRequests).toBeGreaterThan(0);
  expect(directHhRequests).toBe(0);
});
