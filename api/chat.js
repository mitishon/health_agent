// api/chat.js  —  تابع سروری: پیام/عکس رو به Gemini می‌فرسته
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "فقط POST" });
  }

  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    return res.status(500).json({ error: "GEMINI_API_KEY توی Vercel تنظیم نشده" });
  }

  try {
    const { text, imageBase64, mimeType } = req.body || {};
    const parts = [];
    if (text) parts.push({ text });
    if (imageBase64) {
      parts.push({
        inline_data: { mime_type: mimeType || "image/jpeg", data: imageBase64 },
      });
    }
    if (parts.length === 0) {
      return res.status(400).json({ error: "پیام یا عکس خالیه" });
    }

    const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

    const r = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": key },
      body: JSON.stringify({
        system_instruction: {
          parts: [{ text: "تو یک دستیار سلامت هستی. به فارسی، ساده و کوتاه جواب بده." }],
        },
        contents: [{ role: "user", parts }],
      }),
    });

    const data = await r.json();
    if (!r.ok) {
      return res.status(r.status).json({ error: data?.error?.message || "خطای Gemini" });
    }

    const answer =
      data?.candidates?.[0]?.content?.parts?.map((p) => p.text || "").join("") ||
      "جوابی دریافت نشد";
    return res.status(200).json({ answer });
  } catch (e) {
    return res.status(500).json({ error: String(e) });
  }
}
