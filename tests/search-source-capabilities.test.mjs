import test from "node:test";
import assert from "node:assert/strict";
import { getSourceCapability, capabilityLabel } from "../src/app/features/search/sourceCapabilities.ts";

test("source capability registry describes acquisition mode and filters", () => {
  const hh = getSourceCapability("hh");
  assert.equal(hh?.acquisition, "query");
  assert.equal(hh?.supportsPagination, true);
  assert.equal(hh?.supportsSalaryFilter, true);

  const remoteok = getSourceCapability("remoteok");
  assert.equal(remoteok?.acquisition, "snapshot");
  assert.equal(remoteok?.supportsPagination, false);

  const remocate = getSourceCapability("remocate");
  assert.equal(remocate?.supportsQuery, true);
  assert.equal(remocate?.acquisition, "query");

  assert.equal(capabilityLabel(remoteok), "снимок");
  assert.equal(getSourceCapability("unknown-source"), null);
});
