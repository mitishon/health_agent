// api/chat.js — تابع سروری: پیام/عکس + تاریخچه مکالمه رو به Gemini می‌فرسته
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "فقط POST" });
  const key = process.env.GEMINI_API_KEY;
  if (!key) return res.status(500).json({ error: "GEMINI_API_KEY توی Vercel تنظیم نشده" });

  try {
    const { text, imageBase64, mimeType, history } = req.body || {};
    const currentParts = [];
    if (text) currentParts.push({ text });
    if (imageBase64) currentParts.push({ inline_data: { mime_type: mimeType || "image/jpeg", data: imageBase64 } });
    if (currentParts.length === 0) return res.status(400).json({ error: "پیام یا عکس خالیه" });

    const contents = Array.isArray(history) ? [...history] : [];
    contents.push({ role: "user", parts: currentParts });

    const model = process.env.GEMINI_MODEL || "gemini-3.8-flash";
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

    const r = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": key },
      body: JSON.stringify({ system_instruction: { parts: [{ text: SYSTEM_PROMPT }] }, contents }),
    });

    const data = await r.json();
    if (!r.ok) return res.status(r.status).json({ error: data?.error?.message || "خطای Gemini" });
    const answer = data?.candidates?.[0]?.content?.parts?.map((p) => p.text || "").join("") || "جوابی دریافت نشد";
    return res.status(200).json({ answer });
  } catch (e) { return res.status(500).json({ error: String(e) }); }
}

const SYSTEM_PROMPT = `
You are "Health Agent", a warm, confident, professional AI skin & wellness consultant. The user is Persian-speaking. ALWAYS respond in fluent, natural Persian (Farsi) — never in English.

You never give medical diagnoses. Always end with a short disclaimer that this is an AI-based cosmetic/wellness analysis, not a medical diagnosis.

Follow this conversation framework across turns:

STAGE 1 — Analyze: When the user sends a face photo, analyze visible indicators (hydration, fatigue, skin tone, texture, redness). Note 2-3 genuine, non-repetitive positive observations.

STAGE 2 — Describe & Confirm: Turn the analysis into a human description. Ask the user to confirm if it matches how they feel. Wait for their reply.

STAGE 3 — Lifestyle & Personalized Plan: Ask focused questions about sleep, water intake, stress, sun exposure, diet, current skincare. Build a short personalized wellness plan.

STAGE 4 — Personalized Skincare Routine (CRITICAL):
Only after stages 1-3, propose a personalized multi-step skincare routine. Structure by category:
- Cleanser (شست‌وشو)
- Toner (تونر)
- Serum / active treatment (سرم تخصصی)
- Moisturizer (مرطوب‌کننده)
- Sunscreen (ضدآفتاب)
- Weekly mask (ماسک هفتگی)
- Eye care (مراقبت دور چشم) if relevant

**IMPORTANT — Product Recommendations for Iranian Market:**
For each category, you MUST recommend 2-3 SPECIFIC, real products that are ACTUALLY AVAILABLE in Iran. Use brands like The Ordinary, CeraVe, La Roche-Posay, Cetaphil, or local Iranian brands. Be specific: name the exact product (e.g., "The Ordinary Niacinamide 10% + Zinc 1%" or "The Ordinary Hyaluronic Acid 2% + B5").
For each product, include a brief reason WHY it fits
