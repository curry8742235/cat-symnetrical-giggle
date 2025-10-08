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

  const geminiApiKey = process.env.GEMINI_API_KEY;
  if (!geminiApiKey) {
    return { statusCode: 500, headers, body: JSON.stringify({ reply: 'API key is not configured.' }) };
  }

  try {
    // THIS IS THE NEW PART: CALL ListModels INSTEAD OF generateContent
    const listModelsUrl = `https://generativelanguage.googleapis.com/v1beta/models?key=${geminiApiKey}`;

    const apiResponse = await fetch(listModelsUrl, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    const data = await apiResponse.json();

    // Format the list of models to be readable in the chat
    let modelList = "Available Models:\n";
    if (data.models && data.models.length > 0) {
      data.models.forEach(model => {
        modelList += `- ${model.name}\n`;
      });
    } else {
      modelList = "Could not retrieve any models. Response: " + JSON.stringify(data);
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ reply: modelList })
    };

  } catch (error) {
    return { statusCode: 500, headers, body: JSON.stringify({ reply: `Server Error: ${error.message}` }) };
  }
};
