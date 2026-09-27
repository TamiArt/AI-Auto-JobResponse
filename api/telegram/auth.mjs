import { validateTelegramInitData } from "../../server/telegramSecurity.mjs";
import { withSecurityHeaders } from "../../server/httpPolicy.mjs";

export default async function handler(req, res) {
  for (const [name, value] of Object.entries(withSecurityHeaders())) res.setHeader(name, value);
  if (req.method !== "POST") return res.status(405).json({ error: "method_not_allowed" });

  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken) return res.status(503).json({ error: "telegram_bot_not_configured" });

  const initData = typeof req.body?.initData === "string" ? req.body.initData : "";
  const result = validateTelegramInitData(initData, botToken);
  if (!result.ok) return res.status(401).json({ error: result.error });

  return res.status(200).json({ ok: true, authDate: result.authDate, user: result.user });
}
