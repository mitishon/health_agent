// api/send-message.js  —  تابع سروری: پیام متنی رو به تلگرام می‌فرسته
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "فقط POST" });
  }

  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) {
    return res.status(500).json({ error: "TELEGRAM_BOT_TOKEN یا TELEGRAM_CHAT_ID تنظیم نشده" });
  }

  try {
    const { text } = req.body || {};
    if (!text) return res.status(400).json({ error: "متن خالیه" });

    const r = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text }),
    });
    const data = await r.json();
    if (!data.ok) {
      return res.status(400).json({ error: data.description || "خطای تلگرام" });
    }
    return res.status(200).json({ ok: true });
  } catch (e) {
    return res.status(500).json({ error: String(e) });
  }
}
