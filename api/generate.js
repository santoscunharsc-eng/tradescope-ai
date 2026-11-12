export default async function handler(req, res) {
  // Configura rigorosamente o cabeçalho para aceitar apenas JSON
  res.setHeader('Content-Type', 'application/json');

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'Server API key not configured in Vercel settings.' });
  }

  const { projectType, detailLevel, brief } = req.body || {};

  if (!brief) {
    return res.status(400).json({ error: 'Project brief is required.' });
  }

  const systemPrompt = `You are TradeScope AI, an elite construction & cabinetry estimator and legal scope engineer for North American contractors. 
Your task is to convert raw project notes into a bulletproof, commercial-grade Statement of Work (SOW).

Enforce the following output structure strictly:
1. PROJECT OVERVIEW & GOALS
2. SPECIFIC SCOPE OF WORK & INCLUSIONS (Categorized by Carpentry, Materials, Prep, and Finish)
3. EXCLUSIONS & CLIENT RESPONSIBILITIES (Crucial for risk mitigation)
4. PROJECT TIMELINE & PAYMENT SCHEDULE (Standard terms: 50% Deposit, 40% Delivery, 10% Final Sign-off)
5. FORMAL ACCEPTANCE & SIGNATURE BLOCK

Tone: Authoritative, highly technical, commercial, clear.
Output language: English.`;

  const userMessage = `Project Type: ${projectType || 'Custom Millwork'}\nDetail Level: ${detailLevel || 'Standard'}\n\nClient Brief:\n${brief}`;

  try {
    // Usando o modelo gemini-2.5-flash e a rota correta da API v1beta
    const apiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [
              { text: systemPrompt + "\n\n" + userMessage }
            ]
          }
        ]
      })
    });

    const data = await apiResponse.json();

    if (!apiResponse.ok) {
      const errorMessage = data.error?.message || `API error status ${apiResponse.status}`;
      return res.status(500).json({ error: errorMessage });
    }

    const textResponse = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!textResponse) {
      return res.status(500).json({ error: 'No valid text structure received from Gemini API.' });
    }

    return res.status(200).json({ result: textResponse });

  } catch (err) {
    return res.status(500).json({ error: 'Server execution error: ' + err.message });
  }
}
