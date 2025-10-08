import fetch from 'node-fetch';

export default async function handler(request, response) {
  // Set CORS headers for all responses
  response.setHeader('Access-Control-Allow-Origin', '*');
  response.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle CORS preflight request
  if (request.method === 'OPTIONS') {
    return response.status(200).send('OK');
  }

  if (request.method !== 'POST') {
    return response.status(405).json({ reply: 'Method Not Allowed' });
  }

  const geminiApiKey = process.env.GEMINI_API_KEY;
  if (!geminiApiKey) {
    return response.status(500).json({ reply: 'API key is not configured on the server.' });
  }

  try {
    const userPrompt = request.body.prompt;
    if (!userPrompt) {
      return response.status(400).json({ reply: 'Prompt is missing from the request.' });
    }

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${geminiApiKey}`;
    const payload = { contents: [{ parts: [{ text: userPrompt }] }] };

    const apiResponse = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const data = await apiResponse.json();
    
    if (data.error || !data.candidates) {
       return response.status(500).json({ reply: `Gemini API Error: ${data.error?.message || 'Invalid response from API.'}` });
    }
    
    const replyText = data.candidates[0].content.parts[0].text;
    return response.status(200).json({ reply: replyText });

  } catch (error) {
    return response.status(500).json({ reply: `Server Error: ${error.message}` });
  }
}
