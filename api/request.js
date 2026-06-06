import fs from 'fs';
import path from 'path';
import { GoogleGenerativeAI } from '@google/generative-ai';

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

// Simple manual CSV parser for serverless execution
function parseCSV(csvText) {
  const lines = csvText.split('\n').filter(l => l.trim() !== '');
  const headers = lines[0].split(',');
  return lines.slice(1).map(line => {
    const values = line.split(',');
    let obj = {};
    headers.forEach((h, i) => { obj[h.trim()] = values[i]?.trim(); });
    return obj;
  });
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: "Method not allowed" });
  const { text } = req.body;
  if (!text) return res.status(400).json({ error: "Text is required" });

  let parsedData;
  let model;
  
  if (process.env.GEMINI_API_KEY) {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
  }

  const prompt = `
    Extract the blood request details from this message: "${text}"
    Return ONLY a raw JSON object with the following keys, no markdown wrapping:
    - bloodGroup (e.g. "O+", "A-", etc.)
    - count (integer, default 1)
    - location (closest neighbourhood name)
    - hospital (hospital name if mentioned, else "Unknown")
    - urgency ("High" or "Normal", default "High" if words like urgent/jaldi are used)
  `;

  if (model) {
    try {
      const result = await model.generateContent(prompt);
      let aiText = result.response.text().trim();
      aiText = aiText.replace(/```json/g, '').replace(/```/g, '').trim();
      parsedData = JSON.parse(aiText);
    } catch (e) {
      console.error("Gemini Error:", e);
    }
  }

  if (!parsedData) {
    parsedData = {
      bloodGroup: text.match(/(A|B|AB|O)[+-]/i)?.[0].toUpperCase() || "O+",
      count: parseInt(text.match(/\d+/)?.[0]) || 5,
      location: "Gulshan-e-Iqbal",
      hospital: text.toLowerCase().includes('indus') ? "Indus Hospital" : "Agha Khan",
      urgency: text.toLowerCase().includes('urgent') || text.toLowerCase().includes('jaldi') ? "High" : "Normal"
    };
  }

  // Load CSV directly in Serverless Function
  const csvPath = path.join(process.cwd(), 'donors.csv');
  const csvText = fs.readFileSync(csvPath, 'utf8');
  const donorsDb = parseCSV(csvText);

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

  res.status(200).json({ parsedData, wave: 1, donors: topDonors });
}
