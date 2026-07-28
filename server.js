require('dotenv').config();

const path = require('path');
const fs = require('fs');
const express = require('express');

const { scrapeWebsite } = require('./lib/scrapeWebsite');
const { scoreLead } = require('./lib/scoreLead');
const { saveLeadToAirtable } = require('./lib/airtable');
const { sendConfirmationEmail } = require('./lib/sendEmail');

const app = express();
const PORT = process.env.PORT || 3000;
const FALLBACK_LOG = path.join(__dirname, 'leads_fallback.jsonl');

app.use(express.json());
app.use(express.static(__dirname));

function appendFallbackLog(entry) {
  fs.appendFile(FALLBACK_LOG, JSON.stringify(entry) + '\n', (err) => {
    if (err) console.error('No se pudo escribir el respaldo local de leads:', err);
  });
}

app.post('/api/leads', async (req, res) => {
  const { nombre, empresa, correo, url, presupuesto, mensaje } = req.body || {};

  if (!nombre || !empresa || !correo) {
    return res.status(400).json({ ok: false, error: 'Faltan campos obligatorios (nombre, empresa, correo).' });
  }

  const lead = {
    nombre: String(nombre).trim(),
    empresa: String(empresa).trim(),
    correo: String(correo).trim(),
    url: url ? String(url).trim() : '',
    presupuesto: presupuesto ? String(presupuesto).trim() : '',
    mensaje: mensaje ? String(mensaje).trim() : '',
  };

  let scrape = null;
  if (lead.url) {
    try {
      scrape = await scrapeWebsite(lead.url);
    } catch (err) {
      console.error('Error al escrapear el sitio:', err);
    }
  }

  let scoring = null;
  try {
    scoring = await scoreLead(lead, scrape);
  } catch (err) {
    console.error('Error al calificar el lead con Gemini:', err);
  }

  try {
    await saveLeadToAirtable({ lead, scrape, scoring });
  } catch (err) {
    console.error('Error al guardar en Airtable, usando respaldo local:', err);
    appendFallbackLog({ lead, scrape, scoring, savedAt: new Date().toISOString() });
  }

  try {
    await sendConfirmationEmail({ lead, scoring });
  } catch (err) {
    console.error('Error al enviar el correo de confirmación:', err);
  }

  res.json({ ok: true, message: 'Gracias, hemos recibido tu solicitud. Nos pondremos en contacto pronto.' });
});

app.listen(PORT, () => {
  console.log(`Servidor escuchando en http://localhost:${PORT}`);
});
