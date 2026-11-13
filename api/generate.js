export default async function handler(req, res) {
  // Garante uma resposta com cabeçalho JSON estrito
  res.setHeader('Content-Type', 'application/json');

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'A chave da API do servidor não está configurada no ambiente Vercel.' });
  }

  const { projectType, detailLevel, brief } = req.body || {};

  if (!brief) {
    return res.status(400).json({ error: 'Um briefing do projeto é obrigatório.' });
  }

  const systemPrompt = `Você é a TradeScope AI, uma empresa de elite em estimativa de construção e marcenaria, além de engenharia de escopo legal para empreiteiras norte-americanas. 
Sua tarefa é converter anotações brutas do projeto em uma Declaração de Trabalho (SOW) impecável e de nível comercial.

Siga rigorosamente a seguinte estrutura de saída:
1. VISÃO GERAL E OBJETIVOS DO PROJETO
2. ESCOPO DE TRABALHO ESPECÍFICO E INCLUSÕES (Categorizado por Carpintaria, Materiais, Preparação e Acabamento)
3. EXCLUSÕES E RESPONSABILIDADES DO CLIENTE (Cruciais para mitigação de riscos)
4. CRONOGRAMA DO PROJETO E PLANO DE PAGAMENTO (Condições padrão: 50% de Depósito, 40% na Entrega, 10% na Aprovação Final)
5. ACEITAÇÃO FORMAL E BLOCO DE ASSINATURA

Tom: Autoritário, altamente técnico, comercial e claro.
Idioma de saída: Inglês.`;

  const userMessage = `Tipo de Projeto: ${projectType || 'Custom Millwork'}\nNível de Detalhe: ${detailLevel || 'Standard'}\n\nResumo do Cliente:\n${brief}`;

  try {
    // Chamando a API Gemini com estabilidade de produção
    const apiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
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
      const errorMessage = data.error?.message || `Status de erro da API ${apiResponse.status}`;
      return res.status(500).json({ error: errorMessage });
    }

    const textResponse = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!textResponse) {
      return res.status(500).json({ error: 'Nenhuma estrutura de texto válida recebida da API Gemini.' });
    }

    return res.status(200).json({ result: textResponse });

  } catch (err) {
    return res.status(500).json({ error: 'Erro de execução do servidor: ' + err.message });
  }
}
