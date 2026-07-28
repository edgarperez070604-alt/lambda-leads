async function saveLeadToAirtable({ lead, scrape, scoring }) {
  const apiKey = process.env.AIRTABLE_API_KEY;
  const baseId = process.env.AIRTABLE_BASE_ID;
  const tableName = process.env.AIRTABLE_TABLE_NAME;

  if (!apiKey || !baseId || !tableName) {
    throw new Error('Faltan credenciales de Airtable en el entorno (AIRTABLE_API_KEY, AIRTABLE_BASE_ID, AIRTABLE_TABLE_NAME)');
  }

  const fields = {
    Nombre: lead.nombre,
    Empresa: lead.empresa,
    Email: lead.correo,
    'Sitio web': lead.url || '',
    Presupuesto: lead.presupuesto || '',
    Mensaje: lead.mensaje || '',
    'Puntuación': scoring ? scoring.score : null,
    Prioridad: scoring ? scoring.priority : 'Sin calificar',
    'Razonamiento IA': scoring ? scoring.reasoning : '',
    'Resumen del sitio': scrape && !scrape.error
      ? [scrape.title, scrape.metaDescription].filter(Boolean).join(' — ')
      : '',
    Fecha: new Date().toISOString().slice(0, 10),
  };

  const response = await fetch(
    `https://api.airtable.com/v0/${baseId}/${encodeURIComponent(tableName)}`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ fields, typecast: true }),
    }
  );

  if (!response.ok) {
    const errBody = await response.text().catch(() => '');
    throw new Error(`Airtable API error ${response.status}: ${errBody}`);
  }

  return response.json();
}

module.exports = { saveLeadToAirtable };
