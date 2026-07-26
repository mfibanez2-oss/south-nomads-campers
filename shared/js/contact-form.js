// Contact form — posts to the south-nomads-booking-api Worker's /contact
// endpoint, which emails the captured info to josefina@ and rodrigo@ via
// Resend. Requires that Worker to be deployed and Resend's domain
// verification for southnomadscampers.com to be complete; until then this
// will fail gracefully and point the visitor to WhatsApp instead.
(function () {

const WORKER_BASE_URL = location.hostname === 'localhost'
  ? 'http://localhost:8787'
  : 'https://south-nomads-booking-api.workers.dev'; // replace with the real *.workers.dev URL after `wrangler deploy`

const WHATSAPP_URL = 'https://wa.link/m2ahp2';

const STRINGS = {
  en: {
    sending: 'Sending…',
    sent: "Message sent — we'll get back to you soon.",
    failed: "Something went wrong sending your message. Try WhatsApp instead:",
    missingName: 'your full name', missingEmail: 'a valid email address',
    missingPhone: 'a complete phone number (with country and area code, not just a country code)',
    missingMessage: 'a message',
    fillRequired: (items) => `Please fill in: ${items.join(', ')}.`,
    whatsappCta: 'Chat on WhatsApp',
  },
  es: {
    sending: 'Enviando…',
    sent: 'Mensaje enviado — te respondemos pronto.',
    failed: 'Hubo un problema al enviar tu mensaje. Probá por WhatsApp:',
    missingName: 'tu nombre completo', missingEmail: 'un email válido',
    missingPhone: 'un teléfono completo (con código de país y área, no solo el código de país)',
    missingMessage: 'un mensaje',
    fillRequired: (items) => `Por favor completa: ${items.join(', ')}.`,
    whatsappCta: 'Chatear por WhatsApp',
  },
};

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// Rejects inputs like "+1" or "+56" — requires enough digits for a real,
// complete phone number (country code + area code + subscriber number).
function isCompletePhone(phone) {
  const digits = phone.replace(/\D/g, '');
  return digits.length >= 8;
}

function initContactForm(el) {
  const lang = el.dataset.lang || 'en';
  const t = STRINGS[lang];
  const nameInput = el.querySelector('[data-role="name"]');
  const emailInput = el.querySelector('[data-role="email"]');
  const phoneInput = el.querySelector('[data-role="phone"]');
  const camperSelect = el.querySelector('[data-role="camper"]');
  const messageInput = el.querySelector('[data-role="message"]');
  const statusEl = el.querySelector('[data-role="form-status"]');
  const sendBtn = el.querySelector('[data-role="send-contact"]');

  sendBtn.addEventListener('click', async () => {
    const name = nameInput.value.trim();
    const email = emailInput.value.trim();
    const phone = phoneInput.value.trim();
    const message = messageInput.value.trim();

    const missing = [];
    if (!name) missing.push(t.missingName);
    if (!isValidEmail(email)) missing.push(t.missingEmail);
    if (!isCompletePhone(phone)) missing.push(t.missingPhone);
    if (!message) missing.push(t.missingMessage);
    if (missing.length) {
      statusEl.textContent = t.fillRequired(missing);
      return;
    }

    sendBtn.disabled = true;
    statusEl.textContent = t.sending;

    try {
      const res = await fetch(`${WORKER_BASE_URL}/contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          email,
          phone,
          camper: camperSelect.value,
          message,
        }),
      });
      if (!res.ok) throw new Error('send failed');
      statusEl.textContent = t.sent;
      [nameInput, emailInput, phoneInput, messageInput].forEach((i) => { i.value = ''; });
      camperSelect.value = '';
    } catch (e) {
      statusEl.innerHTML = `${t.failed} <a href="${WHATSAPP_URL}" target="_blank" rel="noopener">${t.whatsappCta}</a>`;
    } finally {
      sendBtn.disabled = false;
    }
  });
}

document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.contact-form[data-lang]').forEach(initContactForm);
});

})();
