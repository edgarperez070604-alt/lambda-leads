const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-flash-latest';

function buildPrompt(lead, scrape) {
  const siteSummary = !scrape
    ? 'El prospecto no proporcionó una URL de sitio web.'
    : scrape.error
      ? `No se pudo analizar el sitio web (${scrape.url}). Error: ${scrape.error}`
      : [
          `URL: ${scrape.url}`,
          `Título: ${scrape.title || 'N/D'}`,
          `Meta descripción: ${scrape.metaDescription || 'N/D'}`,
          `Contenido extraído de la página: ${scrape.bodyText || 'N/D'}`,
        ].join('\n');

  return `Eres un analista de calificación de leads (lead scoring) para un equipo de ventas B2B.

Evalúa al siguiente prospecto que llenó un formulario de contacto y asígnale una puntuación de 1 a 100 sobre qué tan buen cliente potencial es.

Datos del formulario:
- Nombre: ${lead.nombre}
- Empresa: ${lead.empresa}
- Correo electrónico: ${lead.correo}
- Presupuesto declarado: ${lead.presupuesto || 'No especificado'}
- Información adicional escrita por el prospecto: ${lead.mensaje || 'N/D'}

Información del sitio web de la empresa:
${siteSummary}

Criterios a considerar (no son excluyentes, pondera todos):
- ¿Parece un negocio B2B (vende a otras empresas) en lugar de B2C?
- ¿Hay señales de presupuesto alto (precios propios altos, lenguaje "enterprise", equipo de ventas, clientes corporativos)?
- ¿Es una empresa mediana o grande (equipo, oficinas, clientes conocidos) en vez de un individuo o micro-negocio?
- ¿El correo es corporativo (dominio propio) en vez de genérico (gmail, hotmail, etc.)?
- ¿El mensaje libre muestra intención de compra clara, urgencia o un caso de uso concreto?
- ¿El sitio web (si existe) se ve profesional, activo y relevante para este producto?

Responde ÚNICAMENTE con un objeto JSON, sin texto adicional ni markdown, con este formato exacto:
{
  "score": <entero 1-100>,
  "priority": "Alta" | "Media" | "Baja",
  "reasoning": "<explicación breve en español, 2-3 frases>",
  "signals": {
    "b2b": true | false,
    "high_budget": true | false,
    "company_size": "pequeña" | "mediana" | "grande" | "desconocida"
  }
}`;
}

function extractJson(text) {
  const cleaned = text.replace(/```json|```/g, '').trim();
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start === -1 || end === -1) throw new Error('Gemini no devolvió JSON válido');
  return JSON.parse(cleaned.slice(start, end + 1));
}

async function scoreLead(lead, scrape) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('Falta GEMINI_API_KEY en el entorno');

  const prompt = buildPrompt(lead, scrape);

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.2, responseMimeType: 'application/json' },
      }),
    }
  );

  if (!response.ok) {
    const errBody = await response.text().catch(() => '');
    throw new Error(`Gemini API error ${response.status}: ${errBody}`);
  }

  const data = await response.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('Respuesta de Gemini sin contenido');

  const parsed = extractJson(text);

  const score = Math.max(1, Math.min(100, Math.round(Number(parsed.score))));
  if (Number.isNaN(score)) throw new Error('Gemini devolvió un score inválido');

  return {
    score,
    priority: parsed.priority || 'Media',
    reasoning: parsed.reasoning || '',
    signals: parsed.signals || {},
  };
}

module.exports = { scoreLead };
