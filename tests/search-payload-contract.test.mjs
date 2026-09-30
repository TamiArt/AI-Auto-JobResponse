import test from "node:test";
import assert from "node:assert/strict";
import { requireArrayField, requireHhPayload } from "../src/app/features/search/searchPayload.js";

test("requireArrayField accepts a valid empty result set", () => {
  assert.deepEqual(requireArrayField({ results: [] }, "results"), []);
});

test("requireArrayField rejects missing or non-array result envelopes", () => {
  assert.throws(() => requireArrayField({}, "results"), /malformed_source_payload/);
  assert.throws(() => requireArrayField({ results: {} }, "results"), /malformed_source_payload/);
  assert.throws(() => requireArrayField(null, "results"), /malformed_source_payload/);
});

test("requireHhPayload accepts a valid paginated response", () => {
  assert.deepEqual(requireHhPayload({ items: [], page: 0, pages: 0 }), { items: [], page: 0, pages: 0 });
});

test("requireHhPayload rejects malformed pagination envelopes", () => {
  assert.throws(() => requireHhPayload({ items: [], pages: 1 }), /malformed_source_payload/);
  assert.throws(() => requireHhPayload({ items: {}, page: 0, pages: 1 }), /malformed_source_payload/);
  assert.throws(() => requireHhPayload({ items: [], page: -1, pages: 1 }), /malformed_source_payload/);
});

test("all BFF adapters use the malformed-envelope guard", async () => {
  const source = await (await import("node:fs/promises")).readFile(
    new URL("../src/app/features/search/searchService.ts", import.meta.url),
    "utf8",
  );
  assert.match(source, /searchTelegram[\s\S]*requireArrayField\(payload, "results"\)/);
  assert.match(source, /searchAts[\s\S]*requireArrayField\(payload, "results"\)/);
  assert.match(source, /searchArbeitnow[\s\S]*requireArrayField\(payload, "results"\)/);
});
