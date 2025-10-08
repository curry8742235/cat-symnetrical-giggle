export async function onRequest(context) {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  if (context.request.method === 'OPTIONS') {
    return new Response('OK', { headers: corsHeaders });
  }

  if (context.request.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405, headers: corsHeaders });
  }

  const geminiApiKey = context.env.GEMINI_API_KEY;
  if (!geminiApiKey) {
    return new Response(JSON.stringify({ reply: 'API key is not configured on the server.' }), { status: 500, headers: corsHeaders });
  }

  try {
    const body = await context.request.json();
    const userPrompt = body.prompt;
    
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${geminiApiKey}`;
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
      return new Response(JSON.stringify({ reply: errorMessage }), { status: 400, headers: corsHeaders });
    }
    
    const replyText = data.candidates[0].content.parts[0].text;

    return new Response(JSON.stringify({ reply: replyText }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ reply: `Server Error: ${error.message}` }), { status: 500, headers: corsHeaders });
  }
}
