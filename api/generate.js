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

  // Lista de modelos ordenados por prioridade recomendada pela API atual
  const modelsToTry = ['gemini-3.8-flash', 'gemini-1.5-flash'];

  for (const model of modelsToTry) {
    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
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

      if (response.ok && data.candidates?.[0]?.content?.parts?.[0]?.text) {
        return res.status(200).json({ result: data.candidates[0].content.parts[0].text });
      }
    } catch (err) {
      // Tenta o próximo modelo da lista caso ocorra erro ou pico de demanda
      continue;
    }
  }

  return res.status(500).json({ error: 'API temporarily busy or model unavailable. Please try again in a few moments.' });
}
