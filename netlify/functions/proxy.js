const fetch = require('node-fetch');

exports.handler = async function(event) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: 'CORS preflight OK' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ reply: 'Method Not Allowed' }) };
  }

  const geminiApiKey = process.env.GEMINI_API_KEY;
  if (!geminiApiKey) {
    return { statusCode: 500, headers, body: JSON.stringify({ reply: 'API key is not configured on the server.' }) };
  }

  try {
    const body = JSON.parse(event.body);
    const userPrompt = body.prompt;

    if (userPrompt.trim().toLowerCase() === 'list models') {
      const listModelsUrl = `https://generativelanguage.googleapis.com/v1beta/models?key=${geminiApiKey}`;
      const listResponse = await fetch(listModelsUrl);
      const listData = await listResponse.json();
      
      const modelNames = listData.models.map(model => `- ${model.name}`).join('\n');
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ reply: "Available Models:\n" + modelNames })
      };
    }

    // THE NEW, QUOTA-FRIENDLY MODEL NAME IS HERE
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent?key=${geminiApiKey}`;
    const payload = { contents: [{ parts: [{ text: userPrompt }] }] };

    const apiResponse = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const data = await apiResponse.json();

    if (!data.candidates || data.candidates.length === 0) {
      let errorMessage = 'Gemini API returned no candidates.';
      if (data.promptFeedback && data.promptFeedback.blockReason) {
        errorMessage = `Request was blocked. Reason: ${data.promptFeedback.blockReason}`;
      } else if (data.error) {
        errorMessage = `Gemini API Error: ${data.error.message}`;
      }
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ reply: errorMessage })
      };
    }
    
    const replyText = data.candidates[0].content.parts[0].text;

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ reply: replyText })
    };
  } catch (error) {
    return { statusCode: 500, headers, body: JSON.stringify({ reply: `Server Error: ${error.message}` }) };
  }
};
