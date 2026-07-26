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
    fillRequired: 'Please fill in your name, a valid email, and a message.',
    whatsappCta: 'Chat on WhatsApp',
  },
  es: {
    sending: 'Enviando…',
    sent: 'Mensaje enviado — te respondemos pronto.',
    failed: 'Hubo un problema al enviar tu mensaje. Probá por WhatsApp:',
    fillRequired: 'Por favor completa tu nombre, un email válido, y un mensaje.',
    whatsappCta: 'Chatear por WhatsApp',
  },
};

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
    const message = messageInput.value.trim();
    const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    if (!name || !emailValid || !message) {
      statusEl.textContent = t.fillRequired;
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
          phone: phoneInput.value.trim(),
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
