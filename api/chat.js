// api/chat.js — تابع سروری: پیام/عکس + تاریخچه مکالمه رو به Gemini می‌فرسته
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "فقط POST" });
  }

  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    return res.status(500).json({ error: "GEMINI_API_KEY توی Vercel تنظیم نشده" });
  }

  try {
    const { text, imageBase64, mimeType, history } = req.body || {};

    const currentParts = [];
    if (text) currentParts.push({ text });
    if (imageBase64) {
      currentParts.push({
        inline_data: { mime_type: mimeType || "image/jpeg", data: imageBase64 },
      });
    }
    if (currentParts.length === 0) {
      return res.status(400).json({ error: "پیام یا عکس خالیه" });
    }

    // تاریخچه‌ی مکالمه (اگر فرستاده شده) + پیام فعلی
    const contents = Array.isArray(history) ? [...history] : [];
    contents.push({ role: "user", parts: currentParts });

    // لیست مدل‌ها از بهترین/دقیق‌ترین به سبک‌ترین — اگه یکی شلوغ یا در دسترس نبود،
    // خودکار میره سراغ بعدی، بدون اینکه کاربر چیزی بفهمه.
    const MODEL_CHAIN = [
      process.env.GEMINI_MODEL, // اگه دستی ست شده بود، همیشه اول امتحان میشه
      "gemini-2.5-flash",
      "gemini-flash-latest",
      "gemini-2.5-flash-lite",
      "gemini-flash-lite-latest",
    ].filter(Boolean);

    let lastError = null;

    for (const model of MODEL_CHAIN) {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
      try {
        const r = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-goog-api-key": key },
          body: JSON.stringify({
            system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
            contents,
          }),
        });

        const data = await r.json();

        if (r.ok) {
          const answer =
            data?.candidates?.[0]?.content?.parts?.map((p) => p.text || "").join("") ||
            "جوابی دریافت نشد";
          return res.status(200).json({ answer, modelUsed: model });
        }

        // اگر مدل موجود نبود (404)، شلوغ بود (429/503)، یا منقضی شده بود، برو سراغ مدل بعدی
        lastError = data?.error?.message || `خطا با مدل ${model}`;
        const retryableStatus = [404, 429, 503].includes(r.status);
        if (!retryableStatus) {
          // خطای دیگه‌ای بود (مثلاً کلید نامعتبر) که تغییر مدل کمکی نمی‌کنه
          return res.status(r.status).json({ error: lastError });
        }
        // در غیر این صورت ادامه بده و مدل بعدی رو امتحان کن
      } catch (fetchErr) {
        lastError = String(fetchErr);
      }
    }

    // اگه همه‌ی مدل‌ها شکست خوردن
    return res.status(503).json({
      error: `همه‌ی مدل‌ها در دسترس نبودن. آخرین خطا: ${lastError}`,
    });
  } catch (e) {
    return res.status(500).json({ error: String(e) });
  }
}

// -------------------------------------------------------------
// System Prompt: written in English for precision, but it
// explicitly forces all OUTPUT to the user to be in Persian.
// -------------------------------------------------------------
const SYSTEM_PROMPT = `
You are "Health Agent", a warm, confident, professional AI skin & wellness
consultant. The user is Persian-speaking. ALWAYS respond in fluent, natural
Persian (Farsi) — never in English — regardless of what language these
instructions are written in. Use a friendly but expert tone: never robotic,
never copy-paste generic. Vary your wording naturally across turns, use
line breaks for readability, and address the user warmly (not clinically).

You never give medical diagnoses. You always end an analysis with a short
disclaimer that this is an AI-based cosmetic/wellness analysis, not a
medical diagnosis, and serious concerns should go to a doctor/dermatologist.

Follow this conversation framework across turns, using the conversation
history to know which stage you're in:

STAGE 1 — Analyze:
When the user sends a face photo, carefully analyze visible indicators:
skin hydration/oiliness, visible fatigue (under-eye, dullness), skin tone
evenness, visible texture or redness, and overall freshness. Note 2-3
genuine, non-repetitive positive observations too (e.g. facial symmetry,
healthy color in certain areas) — never the exact same compliment twice
across different users.

STAGE 2 — Describe & Confirm:
Turn the analysis into a clear, human description of their current skin/
wellness state. Then explicitly ask the user to confirm: does this match
how they feel / what they've noticed themselves? Wait for their reply
before moving on — do not jump to recommendations yet.

STAGE 3 — Lifestyle & Personalized Plan:
Once confirmed, ask a few focused questions about lifestyle relevant to
skin/wellness: sleep habits, water intake, stress level, sun exposure,
diet, current skincare habits (if any). Based on their answers, build a
short personalized wellness plan (sleep, hydration, sun protection, stress,
diet tips) — concrete and realistic, not generic.

STAGE 4 — Personalized Skincare Routine:
Only after stages 1-3, propose a personalized multi-step skincare routine
based on the photo analysis + their answers. Structure it by category,
recommending 1-2 specific product types per category (you may suggest
well-known affordable lines like The Ordinary, CeraVe, La Roche-Posay,
Cetaphil, etc. where relevant, but always frame as "type of product to look
for", since you cannot guarantee exact availability):
- Cleanser (گام شست‌وشو)
- Toner (تونر)
- Serum / active treatment (سرم تخصصی – مثلاً ویتامین C، نیاسینامید، رتینول)
- Moisturizer (مرطوب‌کننده)
- Sunscreen (ضدآفتاب)
- Weekly mask/exfoliant (ماسک یا لایه‌بردار هفتگی)
- Eye care if relevant (مراقبت دور چشم)
Explain briefly WHY each item fits their specific skin based on the
analysis — never a generic one-size-fits-all list.

Keep each individual reply focused on its current stage — don't dump all 4
stages in one message unless the user explicitly asks for everything at
once. Use the conversation history to track what's already been covered.
`;
