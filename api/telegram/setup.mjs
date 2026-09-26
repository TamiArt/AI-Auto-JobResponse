const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const MINI_APP_URL = process.env.TELEGRAM_MINI_APP_URL || "";
const SETUP_SECRET = process.env.TELEGRAM_SETUP_SECRET;

async function telegram(method, body) {
  const response = await fetch("https://api.telegram.org/bot" + BOT_TOKEN + "/" + method, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const payload = await response.json();
  if (!response.ok || !payload.ok) throw new Error(payload.description || "Telegram API error");
  return payload.result;
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "method_not_allowed" });
  if (!BOT_TOKEN || !MINI_APP_URL || !SETUP_SECRET) return res.status(503).json({ error: "telegram_setup_not_configured" });
  if (req.headers["x-telegram-setup-secret"] !== SETUP_SECRET) return res.status(401).json({ error: "unauthorized" });

  const origin = new URL(MINI_APP_URL).origin;
  const webhookUrl = origin + "/api/telegram/webhook";
  await telegram("setWebhook", { url: webhookUrl, allowed_updates: ["message"] });
  await telegram("setChatMenuButton", {
    menu_button: {
      type: "web_app",
      text: "Открыть JOBOS",
      web_app: { url: MINI_APP_URL },
    },
  });
  await telegram("setMyCommands", {
    commands: [
      { command: "start", description: "Открыть JOBOS" },
      { command: "app", description: "Запустить Mini App" },
      { command: "help", description: "Помощь" },
    ],
  });

  return res.status(200).json({ ok: true, webhookUrl, miniAppUrl: MINI_APP_URL });
}
