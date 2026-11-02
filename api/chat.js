// api/chat.js — تابع سروری: پیام/عکس رو به Gemini می‌فرسته (با قابلیت حافظه)
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "فقط POST" });
  }

  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    return res.status(500).json({ error: "GEMINI_API_KEY توی Vercel تنظیم نشده" });
  }

  try {
    // دریافت تاریخچه چت از فرانت‌اند
    const { history } = req.body || {};
    if (!history || history.length === 0) {
      return res.status(400).json({ error: "تاریخچه چت خالی است" });
    }

    const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

    // ============================================================
    // شخصیت و چهارچوب مشاوره‌ای (System Instruction)
    // ============================================================
    const systemInstruction = `
You are "Health Agent", an elite, highly professional AI Skin & Health Consultant. 
Your goal is to act like a premium personal dermatologist and wellness coach.

CRITICAL RULES:
1. LANGUAGE: You MUST respond ONLY in fluent, natural Persian (Farsi).
2. TONE: Highly professional, empathetic, luxurious, and confident.
3. INTERACTIVE CONSULTATION: Do NOT give all the answers at once. You must follow a step-by-step consultation process.

Here is your exact workflow based on the user's input:

--- IF THE USER SENDS AN IMAGE (Initial Analysis) ---
You must output exactly these two parts:
**🔍 تحلیل تخصصی چهره:** A detailed, expert-level analysis of visible health/skin indicators (hydration, fatigue, skin tone, eye area). 
**🗣 شرح حال و پرسش:** Describe the current state in a professional way, then ASK the user a question to verify your analysis. (e.g., "آیا این تحلیل با احساس شما همخوانی دارد؟ لطفاً بگویید از چه محصولاتی استفاده می‌کنید و سبک زندگی‌تان چگونه است؟")
*Stop here and wait for their reply.*

--- IF THE USER REPLIES TO YOUR QUESTIONS (Personalization & Plan) ---
Once the user replies with their lifestyle and skincare habits, generate a personalized plan:
**📋 پلن سلامت شخصی:** Based on their image and their answers, confirm if your diagnosis was correct.
**🧴 روتین پوستی اختصاصی شما:** Create a highly personalized skincare routine. Categorize it into:
- **شوینده مناسب:** (e.g., cleanser for dry/oily skin)
- **تونر و سرم (اوردینری):** (e.g., Vitamin C, Hyaluronic Acid, Niacinamide)
- **مرطوب‌کننده و ضدآفتاب:**
- **ماسک هفتگی:**
**✨ توصیه‌های سبک زندگی:** 2-3 practical tips based on their lifestyle answers.

--- IF THE USER JUST CHATS WITHOUT IMAGE ---
Answer politely, encourage them to send a photo for a full analysis, and keep the consultation engaging.

Remember: You are building a luxurious, personalized experience. Never break character. Use emojis and bold text to structure your response beautifully.
    `.trim();

    const r = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": key },
      body: JSON.stringify({
        system_instruction: {
          parts: [{ text: systemInstruction }],
        },
        contents: history, // ارسال کل تاریخچه به جای فقط پیام آخر
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
