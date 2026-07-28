const FROM = process.env.EMAIL_FROM || 'Lambda <onboarding@resend.dev>';
const SITE_URL = process.env.SITE_URL || 'https://lambda-leads.onrender.com';

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function buildEmailHtml(lead, scoring) {
  const nombre = escapeHtml(lead.nombre);
  const empresa = escapeHtml(lead.empresa);
  const personalized = scoring?.emailMessage
    ? escapeHtml(scoring.emailMessage)
    : 'Nos encantaría mostrarte cómo Lambda puede ayudar a tu equipo a trabajar de forma más inteligente.';

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Gracias por tu interés en Lambda</title>
</head>
<body style="margin:0; padding:0; background-color:#f4f2ec; font-family: Helvetica, Arial, sans-serif;">
  <div style="display:none; max-height:0; overflow:hidden; opacity:0;">Gracias por tu interés en Lambda, ${nombre} — esto es lo que sigue.</div>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f2ec; padding: 40px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%; max-width:600px; background-color:#ffffff; border-radius:16px; overflow:hidden; border:1px solid #eee7db;">

          <!-- Top accent bar -->
          <tr>
            <td style="height:6px; line-height:6px; font-size:0; background-color:#c084fc; background-image: linear-gradient(90deg, #c084fc, #f472b6);">&nbsp;</td>
          </tr>

          <!-- Header -->
          <tr>
            <td align="center" style="padding: 36px 40px 8px;">
              <span style="font-family: Georgia, 'Times New Roman', serif; font-size: 22px; font-weight:700; color:#1b1b18; letter-spacing: -0.02em;">Lambda</span>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 16px 40px 8px;">
              <h1 style="font-family: Georgia, 'Times New Roman', serif; font-size: 24px; line-height:1.3; color:#1b1b18; margin: 0 0 16px; text-align:center;">
                ¡Gracias, ${nombre}! 🎉
              </h1>
              <p style="font-size: 15px; line-height:1.6; color:#4a4a45; margin: 0 0 20px; text-align:center;">
                Recibimos tu solicitud de demo para <strong style="color:#1b1b18;">${empresa}</strong>. Este es un resumen de por qué creemos que Lambda encaja bien contigo:
              </p>
            </td>
          </tr>

          <!-- Personalized callout -->
          <tr>
            <td style="padding: 0 40px 24px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f7f4ee; border-radius:12px;">
                <tr>
                  <td style="padding: 24px 28px;">
                    <span style="font-family: Georgia, serif; font-size:28px; color:#1b1b1826; line-height:0;">&#10077;</span>
                    <p style="font-size: 15px; line-height:1.6; color:#1b1b18; margin: 4px 0 0;">
                      ${personalized}
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- CTA -->
          <tr>
            <td align="center" style="padding: 0 40px 32px;">
              <table role="presentation" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="border-radius: 999px; background-color:#c56bd6; background-image: linear-gradient(90deg, #c084fc, #f472b6);">
                    <a href="${SITE_URL}" style="display:inline-block; padding: 14px 32px; font-size: 14px; font-weight:600; color:#ffffff; text-decoration:none;">
                      Conocer más sobre Lambda
                    </a>
                  </td>
                </tr>
              </table>
              <p style="font-size: 13px; line-height:1.6; color:#8a8a83; margin: 20px 0 0;">
                En breve un miembro de nuestro equipo se pondrá en contacto contigo para coordinar los siguientes pasos.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 24px 40px; background-color:#faf8f4; border-top:1px solid #eee7db;" align="center">
              <p style="font-size: 12px; color:#a3a39c; margin:0 0 4px;">— El equipo de Lambda</p>
              <p style="font-size: 11px; color:#c2c2ba; margin:0;">Recibiste este correo porque solicitaste una demo en nuestro sitio.</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
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
