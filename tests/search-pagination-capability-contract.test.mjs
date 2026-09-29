import test from "node:test";
import assert from "node:assert/strict";
import { getSourceCapability } from "../src/app/features/search/sourceCapabilities.ts";

test("only sources with explicit pagination capability can load another page", () => {
  assert.equal(getSourceCapability("hh")?.supportsPagination, true);
  for (const source of ["remoteok","weworkremotely","remotive","jobicy","arbeitnow","remocate","trudvsem","ats","telegram"]) {
    assert.equal(getSourceCapability(source)?.supportsPagination, false, source);
  }
});

test("pagination is capability-driven rather than source-name driven", () => {
  assert.equal(getSourceCapability("hh")?.supportsPagination, true);
  assert.equal(getSourceCapability("remoteok")?.supportsPagination, false);
});
