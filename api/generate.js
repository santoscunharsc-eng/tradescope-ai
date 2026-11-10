export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { brief, type, detail } = req.body;

  if (!process.env.OPENAI_API_KEY) {
    return res.status(500).json({ error: 'API Key missing in Vercel settings.' });
  }

  const SYSTEM_PROMPT = `You are TradeScope AI, an elite construction & cabinetry estimator and legal scope engineer for North American contractors. 
Your task is to convert raw project notes into a bulletproof, commercial-grade Statement of Work (SOW).

Enforce the following output structure strictly:
1. PROJECT OVERVIEW & GOALS
2. SPECIFIC SCOPE OF WORK & INCLUSIONS (Categorized by Carpentry, Materials, Prep, and Finish)
3. EXCLUSIONS & CLIENT RESPONSIBILITIES (Crucial for risk mitigation)
4. PROJECT TIMELINE & PAYMENT SCHEDULE (Standard terms: 50% Deposit, 40% Delivery, 10% Final Sign-off)
5. FORMAL ACCEPTANCE & SIGNATURE BLOCK

Tone: Authoritative, highly technical, commercial, clear.
Output language: English.`;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY.trim()}`
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: `Project Type: ${type}\nDetail Level: ${detail}\n\nClient Brief:\n${brief}` }
        ],
        temperature: 0.3
      })
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({ error: `OpenAI Error [${response.status}]: ${data.error?.message || 'Unknown error'}` });
    }

    return res.status(200).json({ sow: data.choices[0].message.content });
  } catch (error) {
    return res.status(500).json({ error: `Server Error: ${error.message}` });
  }
}
