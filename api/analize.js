export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  const { image, mimeType, prompt } = req.body;
  const r = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [
          { text: prompt || "این عکس رو تحلیل کن" },
          { inline_data: { mime_type: mimeType, data: image } }
        ]}]
      })
    }
  );
  const data = await r.json();
  res.status(r.status).json(data);
}
