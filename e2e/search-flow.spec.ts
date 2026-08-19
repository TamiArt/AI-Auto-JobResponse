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
    location: "Remote",
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

async function mockJobSources(page: Page) {
  await page.route("**/api/jobs/**", async (route) => {
    const url = new URL(route.request().url());
    const body = url.pathname === "/api/jobs/jobicy"
      ? jobicyPayload
      : url.pathname === "/api/jobs/hh"
        ? { items: [], page: 0, pages: 0 }
        : emptyPayload;
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(body) });
  });
  await page.route("https://www.arbeitnow.com/**", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ data: [] }) }),
  );
  await page.context().route("https://example.com/jobs/**", (route) =>
    route.fulfill({ status: 200, contentType: "text/html", body: "<title>Example vacancy</title><h1>QA Engineer</h1>" }),
  );
}

test("critical job search flow works in a real browser", async ({ page }) => {
  await mockJobSources(page);
  await page.goto("/");

  const searchInput = page.getByPlaceholder("QA-инженер, дизайнер, разработчик…");
  await expect(page.getByRole("heading", { name: "Найти работу" })).toBeVisible();
  await searchInput.fill(TEST_QUERY);
  await page.getByRole("button", { name: "Найти", exact: true }).click();

  const card = page.getByRole("article").filter({ hasText: "QA Engineer" });
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
    route.fulfill({ status: 200, contentType: "text/html", body: "<!doctype html><div id=\"root\"></div>" }),
  );
  await page.route("**/api/jobs/**", (route) => {
    bffJobRequests += 1;
    return route.abort();
  });
  await page.route("https://api.hh.ru/**", (route) => {
    directHhRequests += 1;
    return route.abort();
  });
  await page.route("https://www.arbeitnow.com/**", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ data: [{
        slug: "static-qa",
        title: "QA Engineer",
        company_name: "Static Preview Company",
        description: "QA инженер",
        tags: ["QA"],
        location: "Москва",
        remote: true,
        created_at: 1_787_050_800,
        url: TEST_JOB_URL,
      }] }),
    }),
  );

  await page.goto("/");
  await page.getByPlaceholder("QA-инженер, дизайнер, разработчик…").fill(TEST_QUERY);
  await page.getByRole("button", { name: "Найти", exact: true }).click();

  const card = page.getByRole("article").filter({ hasText: "QA Engineer" });
  await expect(card).toBeVisible();
  await expect(card).toContainText("Static Preview Company");
  expect(bffJobRequests).toBe(0);
  expect(directHhRequests).toBe(0);
});
