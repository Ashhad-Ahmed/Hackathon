import { GoogleGenerativeAI } from '@google/generative-ai';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: "Method not allowed" });
  const { text } = req.body;
  if (!text) return res.status(400).json({ error: "Text is required" });

  let status;
  let model;
  
  if (process.env.GEMINI_API_KEY) {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
  }

  const prompt = `
    A blood donor replied with: "${text}"
    Analyze the intent. Do they agree to donate, refuse, or give an excuse indicating they can't (ineligible)?
    Return ONLY a JSON object with exactly one key "status" which MUST be exactly one of: "Confirmed", "Refused", "Ineligible", "Pending". No markdown.
  `;

  if (model) {
    try {
      const result = await model.generateContent(prompt);
      let aiText = result.response.text().trim();
      aiText = aiText.replace(/```json/g, '').replace(/```/g, '').trim();
      const json = JSON.parse(aiText);
      status = json.status;
    } catch (e) {
      console.error("Gemini Error:", e);
    }
  }

  if (!status) {
    const lowerText = text.toLowerCase();
    if (lowerText.includes('aa') || lowerText.includes('yes') || lowerText.includes('sure') || lowerText.includes('come')) status = "Confirmed";
    else if (lowerText.includes('nahi') || lowerText.includes('no')) status = "Refused";
    else if (lowerText.includes('month') || lowerText.includes('sick')) status = "Ineligible";
    else status = "Pending";
  }

  res.status(200).json({ status });
}
