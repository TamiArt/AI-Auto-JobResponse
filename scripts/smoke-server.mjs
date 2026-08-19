import { spawn } from "node:child_process";

const HOST = "127.0.0.1";
const PORT = 4199;
const BASE_URL = `http://${HOST}:${PORT}`;
const REQUIRED_SECURITY_HEADERS = {
  "x-content-type-options": "nosniff",
  "referrer-policy": "strict-origin-when-cross-origin",
  "x-frame-options": "DENY",
  "permissions-policy": "camera=(), microphone=(), geolocation=()",
};

const server = spawn(process.execPath, ["server/index.mjs"], {
  env: { ...process.env, HOST, PORT: String(PORT) },
  stdio: ["ignore", "pipe", "pipe"],
});

let stderr = "";
server.stderr.on("data", (chunk) => {
  stderr += chunk.toString();
});

function assertSecurityHeaders(response, label) {
  for (const [name, expected] of Object.entries(REQUIRED_SECURITY_HEADERS)) {
    if (response.headers.get(name) !== expected) {
      throw new Error(`${label} is missing security header ${name}`);
    }
  }
}

async function waitForServer() {
  let lastError;
  for (let attempt = 0; attempt < 30; attempt += 1) {
    try {
      const response = await fetch(`${BASE_URL}/api/health`);
      if (response.ok) return response;
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw lastError || new Error("Server did not become ready");
}

try {
  const healthResponse = await waitForServer();
  assertSecurityHeaders(healthResponse, "/api/health");
  const health = await healthResponse.json();
  if (health.ok !== true || !Array.isArray(health.sources) || !health.sources.includes("ats")) {
    throw new Error("Invalid /api/health response");
  }

  const statusResponse = await fetch(`${BASE_URL}/api/status`);
  assertSecurityHeaders(statusResponse, "/api/status");
  const status = await statusResponse.json();
  if (!statusResponse.ok || status.ok !== true || !Number.isInteger(status.uptimeSeconds)) {
    throw new Error("Invalid /api/status response");
  }
  if (status.cache?.feeds?.entries !== 0 || status.cache?.ats?.entries !== 0) {
    throw new Error("Fresh server status should start with empty caches");
  }
  if (status.limits?.upstreamTimeoutMs !== 12000 || status.limits?.atsConcurrency !== 4) {
    throw new Error("Invalid /api/status limits");
  }

  const indexResponse = await fetch(`${BASE_URL}/`);
  assertSecurityHeaders(indexResponse, "/");
  const indexBody = await indexResponse.text();
  if (!indexResponse.ok || !indexBody.includes('id="root"')) {
    throw new Error("Production index.html is not served correctly");
  }

  const fallbackResponse = await fetch(`${BASE_URL}/search/smoke-route`);
  assertSecurityHeaders(fallbackResponse, "SPA fallback");
  const fallbackBody = await fallbackResponse.text();
  if (!fallbackResponse.ok || !fallbackBody.includes('id="root"')) {
    throw new Error("SPA fallback is not served correctly");
  }

  console.log("Production server smoke check passed.");
} finally {
  server.kill("SIGTERM");
  await new Promise((resolve) => {
    if (server.exitCode !== null) resolve();
    else server.once("exit", resolve);
  });
  if (server.exitCode && server.exitCode !== 0 && stderr) process.stderr.write(stderr);
}
