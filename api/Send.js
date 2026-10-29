// api/send.js  —  تابع سروری: فایل آپلودشده رو به ربات تلگرام می‌فرسته
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
    const { fileBase64, fileName, mimeType } = req.body || {};
    if (!fileBase64) return res.status(400).json({ error: "فایلی نیومد" });

    const buffer = Buffer.from(fileBase64, "base64");
    const form = new FormData();
    form.append("chat_id", chatId);
    form.append(
      "document",
      new Blob([buffer], { type: mimeType || "application/octet-stream" }),
      fileName || "file"
    );

    const r = await fetch(`https://api.telegram.org/bot${token}/sendDocument`, {
      method: "POST",
      body: form,
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
