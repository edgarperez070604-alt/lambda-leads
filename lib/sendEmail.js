const FROM = process.env.EMAIL_FROM || 'Lambda <onboarding@resend.dev>';

function buildEmailHtml(lead, scoring) {
  const personalized = scoring?.emailMessage
    ? `<p>${scoring.emailMessage}</p>`
    : '<p>Nos encantaría mostrarte cómo Lambda puede ayudar a tu equipo a trabajar de forma más inteligente.</p>';

  return `
    <div style="font-family: Arial, sans-serif; color: #1b1b18; max-width: 480px; margin: 0 auto;">
      <h2 style="font-weight: 600;">¡Gracias, ${lead.nombre}!</h2>
      <p>Recibimos tu solicitud de demo para <strong>${lead.empresa}</strong>.</p>
      ${personalized}
      <p>En breve un miembro de nuestro equipo se pondrá en contacto contigo para coordinar los siguientes pasos.</p>
      <p style="margin-top: 24px; color: #6b6b66; font-size: 13px;">— El equipo de Lambda</p>
    </div>
  `;
}

async function sendConfirmationEmail({ lead, scoring }) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error('Falta RESEND_API_KEY en el entorno');

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: FROM,
      to: [lead.correo],
      subject: `Gracias por tu interés en Lambda, ${lead.nombre}`,
      html: buildEmailHtml(lead, scoring),
    }),
  });

  if (!response.ok) {
    const errBody = await response.text().catch(() => '');
    throw new Error(`Resend API error ${response.status}: ${errBody}`);
  }

  return response.json();
}

module.exports = { sendConfirmationEmail };
