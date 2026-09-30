import { execFile } from "node:child_process";
import { readdir, readFile } from "node:fs/promises";
import { extname, join, relative } from "node:path";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

const execFileAsync = promisify(execFile);
const ROOT = fileURLToPath(new URL("../", import.meta.url));
const SOURCE_DIRS = [
  fileURLToPath(new URL("../src/", import.meta.url)),
  fileURLToPath(new URL("../server/", import.meta.url)),
  fileURLToPath(new URL("../api/", import.meta.url)),
  fileURLToPath(new URL("../tests/", import.meta.url)),
  fileURLToPath(new URL("../e2e/", import.meta.url)),
  fileURLToPath(new URL("../scripts/", import.meta.url)),
];
const ROOT_CODE_FILES = [
  fileURLToPath(new URL("../vite.config.ts", import.meta.url)),
  fileURLToPath(new URL("../playwright.config.ts", import.meta.url)),
];
const MAX_LINES = 800;
const SOURCE_EXTENSIONS = new Set([".js", ".jsx", ".mjs", ".ts", ".tsx", ".css"]);
const NODE_CHECK_EXTENSIONS = new Set([".js", ".mjs"]);
const problems = [];

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await walk(path)));
    else if (SOURCE_EXTENSIONS.has(extname(entry.name))) files.push(path);
  }
  return files;
}

const files = [...ROOT_CODE_FILES];
for (const directory of SOURCE_DIRS) files.push(...(await walk(directory)));
for (const file of files) {
  const content = await readFile(file, "utf8");
  const lineCount = content.split(/\r?\n/).length;
  if (lineCount > MAX_LINES) problems.push(`${relative(ROOT, file)}: ${lineCount} lines (max ${MAX_LINES})`);
}

for (const file of files.filter((candidate) => NODE_CHECK_EXTENSIONS.has(extname(candidate)))) {
  try {
    await execFileAsync(process.execPath, ["--check", file]);
  } catch (error) {
    const detail = error?.stderr?.trim() || error?.message || "syntax check failed";
    problems.push(`${relative(ROOT, file)}: JavaScript syntax error — ${detail}`);
  }
}

if (problems.length) {
  console.error("Structure/syntax check failed:\n" + problems.map((item) => `- ${item}`).join("\n"));
  process.exitCode = 1;
} else {
  console.log(`Structure/syntax check passed: every source/server/api/test file is <= ${MAX_LINES} lines and all JS/MJS files parse.`);
}
