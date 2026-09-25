const MAX_PROMPT_CHARS = 40_000;
const DEFAULT_MODEL = process.env.GEMINI_MODEL || "gemini-3.6-flash";

function json(res, status, body) {
  res.status(status).setHeader("Cache-Control", "no-store").json(body);
}

export default async function handler(req, res) {
  if (req.method !== "POST") return json(res, 405, { error: "method_not_allowed" });

  const apiKey = typeof req.body?.apiKey === "string" ? req.body.apiKey.trim() : "";
  const prompt = typeof req.body?.prompt === "string" ? req.body.prompt : "";
  const model = typeof req.body?.model === "string" && /^[a-zA-Z0-9._-]{1,80}$/.test(req.body.model)
    ? req.body.model
    : DEFAULT_MODEL;

  if (!apiKey) return json(res, 400, { error: "gemini_api_key_required" });
  if (!prompt.trim()) return json(res, 400, { error: "prompt_required" });
  if (prompt.length > MAX_PROMPT_CHARS) return json(res, 413, { error: "prompt_too_large" });

  try {
    const upstream = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.25, maxOutputTokens: 3000 },
      }),
    });

    if (!upstream.ok) {
      const details = await upstream.text().catch(() => "");
      return json(res, upstream.status === 429 ? 429 : 502, {
        error: upstream.status === 429 ? "gemini_rate_limited" : "gemini_upstream_error",
        upstreamStatus: upstream.status,
        details: details.slice(0, 500),
      });
    }

    const payload = await upstream.json();
    const text = payload?.candidates?.[0]?.content?.parts
      ?.map((part) => typeof part?.text === "string" ? part.text : "")
      .join("")
      .trim();

    if (!text) return json(res, 502, { error: "gemini_empty_response" });
    return json(res, 200, { text, model });
  } catch {
    return json(res, 502, { error: "gemini_unavailable" });
  }
}
