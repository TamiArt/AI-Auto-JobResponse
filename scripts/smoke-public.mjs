const baseUrl = String(process.env.PUBLIC_URL || "").trim().replace(/\/$/, "");
if (!baseUrl) {
  console.error("PUBLIC_URL is required, e.g. https://your-project.vercel.app");
  process.exit(2);
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function get(path) {
  return fetch(baseUrl + path, { headers: { Accept: "text/html,application/json,*/*" } });
}

try {
  const healthResponse = await get("/api/health");
  assert(healthResponse.ok, "/api/health is not reachable");
  const health = await healthResponse.json();
  assert(health.ok === true, "/api/health returned invalid payload");
  assert(Array.isArray(health.sources) && health.sources.includes("hh"), "/api/health does not expose active sources");

  const statusResponse = await get("/api/status");
  assert(statusResponse.ok, "/api/status is not reachable");
  const status = await statusResponse.json();
  assert(status.ok === true, "/api/status returned invalid payload");
  assert(status.runtime === "vercel-function", "Public deployment is not using the Vercel function runtime");

  const indexResponse = await get("/");
  assert(indexResponse.ok, "Public SPA entry is not reachable");
  const index = await indexResponse.text();
  assert(index.includes('id="root"'), "Public SPA entry does not contain #root");

  const manifestResponse = await get("/manifest.webmanifest");
  assert(manifestResponse.ok, "PWA manifest is not reachable");
  const manifest = await manifestResponse.json();
  assert(manifest.name && manifest.start_url === "/", "PWA manifest is invalid");

  const iconResponse = await get("/icon.png");
  assert(iconResponse.ok, "PWA icon is not reachable");
  assert((iconResponse.headers.get("content-type") || "").startsWith("image/"), "PWA icon has an invalid content type");

  console.log(`Public deployment smoke passed: ${baseUrl}`);
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
