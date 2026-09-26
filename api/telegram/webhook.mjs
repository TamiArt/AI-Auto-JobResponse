const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const MINI_APP_URL = process.env.TELEGRAM_MINI_APP_URL || process.env.VERCEL_PROJECT_PRODUCTION_URL || "";

async function telegram(method, body) {
  const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return response.json();
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "method_not_allowed" });
  if (!BOT_TOKEN || !MINI_APP_URL) return res.status(503).json({ error: "telegram_bot_not_configured" });

  const message = req.body?.message;
  const chatId = message?.chat?.id;
  const text = typeof message?.text === "string" ? message.text.trim() : "";
  if (!chatId) return res.status(200).json({ ok: true, ignored: true });

  if (text === "/start" || text === "/app") {
    const url = MINI_APP_URL;
    await telegram("sendMessage", {
      chat_id: chatId,
      text: "JOBOS — твой Career Operating System. Открой приложение, чтобы искать вакансии, вести Career Graph и анализировать подходящие предложения.",
      reply_markup: { inline_keyboard: [[{ text: "Открыть JOBOS", web_app: { url } }]] },
    });
  } else if (text === "/help") {
    await telegram("sendMessage", { chat_id: chatId, text: "/start — открыть JOBOS\n/help — помощь" });
  }

  return res.status(200).json({ ok: true });
}
