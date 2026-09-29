[object Object]

test("pagination request state is stored per source", async () => {
  const fs = await import("node:fs/promises");
  const service = await fs.readFile(new URL("../src/app/features/search/searchService.ts", import.meta.url), "utf8");
  assert.match(service, /pages\?: Partial<Record<SearchSource, number>>/);
  assert.match(service, /request\.pages\?\.hh/);
});
