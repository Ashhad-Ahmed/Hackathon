import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import csv from 'csv-parser';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());

// ---------------------------------------------------------
// 1. Geography & Data Layer (The Logic)
// ---------------------------------------------------------

const KARACHI_LOCATIONS = {
  'Landhi': { lat: 24.8436, lng: 67.1824 },
  'Orangi Town': { lat: 24.9450, lng: 66.9984 },
  'Kharadar': { lat: 24.8519, lng: 66.9944 },
  'DHA': { lat: 24.8050, lng: 67.0543 },
  'Shah Faisal Colony': { lat: 24.8850, lng: 67.1472 },
  'Scheme 33': { lat: 24.9667, lng: 67.1333 },
  'Defence View': { lat: 24.8402, lng: 67.0737 },
  'North Nazimabad': { lat: 24.9388, lng: 67.0425 },
  'PECHS': { lat: 24.8716, lng: 67.0661 },
  'New Karachi': { lat: 24.9904, lng: 67.0674 },
  'Safoora': { lat: 24.9380, lng: 67.1350 },
  'Federal B Area': { lat: 24.9351, lng: 67.0754 },
  'Tariq Road': { lat: 24.8741, lng: 67.0583 },
  'Garden': { lat: 24.8705, lng: 67.0188 },
  'Gulshan-e-Iqbal': { lat: 24.9200, lng: 67.0989 },
  'Indus Hospital': { lat: 24.8239, lng: 67.1082 },
  'Liaquat National': { lat: 24.8918, lng: 67.0731 },
  'Agha Khan': { lat: 24.8925, lng: 67.0758 },
  'Ziauddin': { lat: 24.8190, lng: 67.0163 }
};

function getDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; 
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

let donorsDb = [];

fs.createReadStream(path.join(__dirname, '../donors.csv'))
  .pipe(csv())
  .on('data', (data) => donorsDb.push(data))
  .on('end', () => {
    console.log(`✅ Loaded ${donorsDb.length} donors into memory.`);
  });

// ---------------------------------------------------------
// 2. AI Integration (Gemini API with Fallback)
// ---------------------------------------------------------
let genAI;
let model;
try {
  const genaiModule = await import('@google/generative-ai');
  if (process.env.GEMINI_API_KEY) {
    genAI = new genaiModule.GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    console.log(`✅ Google Gemini API Key found. Real AI mode active.`);
  } else {
    console.warn(`⚠️ No GEMINI_API_KEY found. Running in Fallback Mock Mode.`);
  }
} catch (e) {
  console.warn(`⚠️ @google/generative-ai module not found. Running in Fallback Mock Mode.`);
}

async function callGemini(prompt, isJSON = false) {
  if (model) {
    try {
      const result = await model.generateContent(prompt);
      const text = result.response.text();
      let cleanText = text.trim();
      if (isJSON) {
        // Remove markdown backticks if present
        cleanText = cleanText.replace(/```json/g, '').replace(/```/g, '').trim();
      }
      return cleanText;
    } catch (e) {
      console.error("Gemini Error, falling back to mock:", e);
    }
  }
  return null;
}

// ---------------------------------------------------------
// 3. API Endpoints
// ---------------------------------------------------------

app.post('/api/request', async (req, res) => {
  const { text } = req.body;
  if (!text) return res.status(400).json({ error: "Text is required" });

  let parsedData;
  const prompt = `
    Extract the blood request details from this message: "${text}"
    Return ONLY a raw JSON object with the following keys, no markdown wrapping:
    - bloodGroup (e.g. "O+", "A-", etc.)
    - count (integer, default 1)
    - location (closest neighbourhood name)
    - hospital (hospital name if mentioned, else "Unknown")
    - urgency ("High" or "Normal", default "High" if words like urgent/jaldi are used)
  `;

  const aiResponse = await callGemini(prompt, true);
  if (aiResponse) {
    try {
      parsedData = JSON.parse(aiResponse);
    } catch (e) {
      console.log("Failed to parse Gemini JSON:", aiResponse);
    }
  }

  // Fallback Mock Logic
  if (!parsedData) {
    parsedData = {
      bloodGroup: text.match(/(A|B|AB|O)[+-]/i)?.[0].toUpperCase() || "O+",
      count: parseInt(text.match(/\d+/)?.[0]) || 5,
      location: "Gulshan-e-Iqbal",
      hospital: text.toLowerCase().includes('indus') ? "Indus Hospital" : "Agha Khan",
      urgency: text.toLowerCase().includes('urgent') || text.toLowerCase().includes('jaldi') ? "High" : "Normal"
    };
  }

  const targetHospitalCoords = KARACHI_LOCATIONS[parsedData.hospital] || KARACHI_LOCATIONS['Indus Hospital'];
  
  const eligibleDonors = donorsDb.filter(d => 
    d['Blood Group'] === parsedData.bloodGroup && 
    d['is_active'] === 'True'
  ).map(d => {
    const lastDonationDate = new Date(d['Last donation date']);
    const today = new Date('2026-06-06');
    const monthsElapsed = (today - lastDonationDate) / (1000 * 60 * 60 * 24 * 30);
    const isEligible = monthsElapsed > 3;

    const donorCoords = KARACHI_LOCATIONS[d['Neighbourhood']] || { lat: 24.8607, lng: 67.0011 };
    const distanceKm = getDistance(targetHospitalCoords.lat, targetHospitalCoords.lng, donorCoords.lat, donorCoords.lng);

    const responseRate = parseFloat(d['response_rate']) || 0.5;
    const recentRequests = parseInt(d['recent_requests_received']) || 0;
    const score = responseRate / ((recentRequests * 0.5) + (distanceKm * 0.1) + 1);

    return {
      id: d.id,
      name: d.Name,
      status: "Pending",
      distance: distanceKm.toFixed(1) + " km",
      lastDonation: monthsElapsed.toFixed(0) + " months ago",
      isEligible,
      score
    };
  }).filter(d => d.isEligible);

  const topDonors = eligibleDonors.sort((a, b) => b.score - a.score).slice(0, 8);

  res.json({
    parsedData,
    wave: 1,
    donors: topDonors
  });
});

app.post('/api/donor-reply', async (req, res) => {
  const { text, donorName } = req.body;
  if (!text) return res.status(400).json({ error: "Text is required" });

  let status;
  const prompt = `
    A blood donor replied with: "${text}"
    Analyze the intent. Do they agree to donate, refuse, or give an excuse indicating they can't (ineligible)?
    Return ONLY a JSON object with exactly one key "status" which MUST be exactly one of: "Confirmed", "Refused", "Ineligible", "Pending". No markdown.
  `;

  const aiResponse = await callGemini(prompt, true);
  if (aiResponse) {
    try {
      const json = JSON.parse(aiResponse);
      status = json.status;
    } catch (e) {
      console.log("Failed to parse Gemini JSON", e);
    }
  }

  if (!status) {
    const lowerText = text.toLowerCase();
    if (lowerText.includes('aa') || lowerText.includes('yes') || lowerText.includes('sure') || lowerText.includes('come')) status = "Confirmed";
    else if (lowerText.includes('nahi') || lowerText.includes('no')) status = "Refused";
    else if (lowerText.includes('month') || lowerText.includes('sick')) status = "Ineligible";
    else status = "Pending";
  }

  res.json({ status });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Al-Khidmat Backend running on http://localhost:${PORT}`);
});
