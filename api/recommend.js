/**
 * api/recommend.js – Vercel / Netlify serverless proxy for Groq API.
 *
 * SETUP:
 * 1. Deploy this project to Vercel or Netlify.
 * 2. Set the environment variable GROQ_API_KEY in your dashboard.
 * 3. In the app's Settings, paste the proxy URL:
 *    - Vercel:  https://your-app.vercel.app/api/recommend
 *    - Netlify: https://your-app.netlify.app/.netlify/functions/recommend
 *
 * This function receives the full request body from the frontend,
 * injects the API key, and forwards it to Groq.
 */

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'GROQ_API_KEY is not configured on the server.' });
  }

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify(req.body),
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json(data);
    }

    return res.status(200).json(data);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
