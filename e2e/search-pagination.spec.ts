import { expect, test } from "@playwright/test";

const TEST_QUERY = "QA инженер";
const firstJob = {
  id: "hh-page-1",
  name: "QA Engineer — Page 1",
  published_at: "2026-09-20T10:00:00+0300",
  alternate_url: "https://hh.example.test/vacancy/1",
  area: { name: "Москва" },
  employer: { name: "Example Product" },
  experience: { name: "1–3 года" },
  tags: ["QA"],
};

const secondJob = {
  id: "hh-page-2",
  name: "QA Engineer — Page 2",
  published_at: "2026-09-21T10:00:00+0300",
  alternate_url: "https://hh.example.test/vacancy/2",
  area: { name: "Москва" },
  employer: { name: "Example Product" },
  experience: { name: "1–3 года" },
  tags: ["QA"],
};

test("HH pagination requests the next page and appends new vacancies", async ({ page }) => {
  const requestedPages: number[] = [];

  await page.route("**/api/health**", (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ ok: true }),
  }));

  await page.route(/\/api\/jobs(?:\/.*|\?.*)?$/, async (route) => {
    const url = new URL(route.request().url());
    const source = url.searchParams.get("source") || (url.pathname.match(/\/api\/jobs\/(hh)$/)?.[1] ?? null);
    if (source !== "hh") {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ results: [] }) });
      return;
    }

    const pageNumber = Number(url.searchParams.get("page") || "0");
    requestedPages.push(pageNumber);
    const body = pageNumber === 0
      ? { items: [firstJob], page: 0, pages: 2 }
      : { items: [secondJob], page: 1, pages: 2 };

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(body),
    });
  });

  await page.goto("/");
  await page.getByPlaceholder("QA-инженер, дизайнер, разработчик…").fill(TEST_QUERY);
  await page.getByRole("button", { name: "Найти", exact: true }).click();

  await expect(page.getByRole("article").filter({ hasText: "QA Engineer — Page 1" })).toBeVisible();
  await expect(page.getByRole("article").filter({ hasText: "QA Engineer — Page 2" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: /Загрузить ещё/ })).toBeVisible();

  await page.getByRole("button", { name: /Загрузить ещё/ }).click();

  await expect.poll(() => requestedPages).toEqual([0, 1]);
  await expect(page.getByRole("article").filter({ hasText: "QA Engineer — Page 1" })).toHaveCount(1);
  await expect(page.getByRole("article").filter({ hasText: "QA Engineer — Page 2" })).toHaveCount(1);
  await expect(page.getByRole("button", { name: /Загрузить ещё/ })).toBeHidden();
});
