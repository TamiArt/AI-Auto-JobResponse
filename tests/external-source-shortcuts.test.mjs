import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourceTypes = fs.readFileSync(path.join(root, "src/app/domain/types.ts"), "utf8");
const sourceDefinitions = fs.readFileSync(path.join(root, "src/app/data/jobSources.ts"), "utf8");
const searchPanel = fs.readFileSync(path.join(root, "src/app/features/search/SearchPanel.tsx"), "utf8");

test("Russian job boards without confirmed aggregator APIs are available as external-search shortcuts", () => {
  for (const source of ["avito", "rabota", "zarplata"]) {
    assert.match(sourceTypes, new RegExp('"' + source + '"'));
    assert.match(sourceDefinitions, new RegExp("^\\s*" + source + ": \\{", "m"));
    assert.match(searchPanel, new RegExp('EXTERNAL_SOURCES: JobSource\\[\\] = \\[.*"' + source + '"', "s"));
  }
});

test("Avito shortcut is explicitly a manual search, not a claimed API integration", () => {
  assert.match(sourceDefinitions, /avito: \{[^\n]*access: "external-search"/);
  assert.match(sourceDefinitions, /https:\/\/www\.avito\.ru\/rossiya\/vakansii\?q=\{q\}/);
  assert.match(sourceDefinitions, /публичный API для агрегированного поиска пока не подтверждён/);
});
