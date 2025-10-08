const fetch = require('node-fetch');
const cors = require('cors');

// Initialize CORS middleware
const corsMiddleware = cors({
  methods: ['POST', 'OPTIONS'],
});

// Helper function to run middleware
function runMiddleware(req, res, fn) {
  return new Promise((resolve, reject) => {
    fn(req, res, (result) => {
      if (result instanceof Error) {
        return reject(result);
      }
      return resolve(result);
    });
  });
}

module.exports = async (request, response) => {
  await runMiddleware(request, response, corsMiddleware);

  if (request.method === 'OPTIONS') {
    return response.status(200).json({ message: 'CORS preflight OK' });
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
};
