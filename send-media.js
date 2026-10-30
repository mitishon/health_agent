// api/send-media.js — تابع سروری برای ارسال عکس و ویس به تلگرام
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb', // افزایش محدودیت حجم برای عکس‌ها و ویس‌ها
    },
  },
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "فقط POST" });
  }

  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) {
    return res.status(500).json({ error: "توکن یا چت آیدی تنظیم نشده" });
  }

  try {
    const { type, fileBase64, fileName, mimeType, caption } = req.body || {};
    if (!fileBase64) return res.status(400).json({ error: "فایلی نیومد" });

    // تبدیل Base64 به بافر برای ارسال
    const buffer = Buffer.from(fileBase64, "base64");
    const form = new FormData();
    form.append("chat_id", chatId);
    
    // اگر کپشن (متن) داشت، اضافه کن
    if (caption) form.append("caption", caption);

    let endpoint = "";

    // تشخیص نوع فایل (عکس یا ویس)
    if (type === "photo") {
      endpoint = "sendPhoto";
      form.append("photo", new Blob([buffer], { type: mimeType || "image/jpeg" }), fileName || "photo.jpg");
    } else if (type === "voice") {
      endpoint = "sendVoice";
      form.append("voice", new Blob([buffer], { type: mimeType || "audio/webm" }), fileName || "voice.webm");
    } else {
      return res.status(400).json({ error: "نوع فایل نامعتبر است" });
    }

    const r = await fetch(`https://api.telegram.org/bot${token}/${endpoint}`, {
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
