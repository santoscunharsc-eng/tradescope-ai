export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'Server API key not configured.' });
  }

  const { projectType, detailLevel, brief } = req.body;

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

  const userMessage = `Project Type: ${projectType}\nDetail Level: ${detailLevel}\n\nClient Brief:\n${brief}`;

  // Tentativa com suporte a nova tentativa em caso de pico de demanda
  const maxRetries = 2;
  let attempt = 0;
  let lastError = null;

  while (attempt <= maxRetries) {
    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent?key=${apiKey}`, {
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

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || `HTTP ${response.status}`);
      }

      const textResponse = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!textResponse) {
        throw new Error('No valid response received from Gemini API.');
      }

      return res.status(200).json({ result: textResponse });
    } catch (err) {
      lastError = err;
      attempt++;
      if (attempt <= maxRetries) {
        // Aguarda 1 segundo antes de tentar novamente em caso de pico temporário
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
  }

  return res.status(500).json({ error: `API temporarily busy. Please try again in a few seconds. Details: ${lastError.message}` });
}
