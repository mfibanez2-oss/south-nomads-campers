// Contact form — posts to the south-nomads-booking-api Worker's /contact
// endpoint, which logs the lead to the owner's Google Sheet (Apps Script
// handles emailing josefina@/rodrigo@ and the customer from there). If the
// Worker is unreachable or rejects the payload, this fails gracefully and
// points the visitor to WhatsApp instead.
(function () {

const WORKER_BASE_URL = location.hostname === 'localhost'
  ? 'http://localhost:8787'
  : 'https://south-nomads-booking-api.mfibanez2.workers.dev';

const WHATSAPP_URL = 'https://wa.link/m2ahp2';

const STRINGS = {
  en: {
    sending: 'Sending…',
    failed: "Something went wrong sending your message. Try WhatsApp instead:",
    missingName: 'your full name', missingEmail: 'a valid email address',
    missingPhone: 'a complete phone number (with country and area code, not just a country code)',
    missingPickupDate: 'a pick-up date', missingDropoffDate: 'a drop-off date',
    pastPickupDate: 'a pick-up date that is not in the past',
    dropoffBeforePickup: 'a drop-off date on or after the pick-up date',
    fillRequired: (items) => `Please fill in: ${items.join(', ')}.`,
    whatsappCta: 'Chat on WhatsApp',
  },
  es: {
    sending: 'Enviando…',
    failed: 'Hubo un problema al enviar tu mensaje. Prueba por WhatsApp:',
    missingName: 'tu nombre completo', missingEmail: 'un email válido',
    missingPhone: 'un teléfono completo (con código de país y área, no solo el código de país)',
    missingPickupDate: 'una fecha de retiro', missingDropoffDate: 'una fecha de devolución',
    pastPickupDate: 'una fecha de retiro que no sea en el pasado',
    dropoffBeforePickup: 'una fecha de devolución igual o posterior a la de retiro',
    fillRequired: (items) => `Por favor completa: ${items.join(', ')}.`,
    whatsappCta: 'Chatear por WhatsApp',
  },
};

function todayISO() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

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
  const pickupLocationSelect = el.querySelector('[data-role="pickup-location"]');
  const dropoffLocationSelect = el.querySelector('[data-role="dropoff-location"]');
  const pickupDateInput = el.querySelector('[data-role="pickup-date"]');
  const dropoffDateInput = el.querySelector('[data-role="dropoff-date"]');
  const messageInput = el.querySelector('[data-role="message"]');
  // Honeypot: a decoy input positioned off-screen. Real visitors never see or fill it,
  // so any value means an automated submission - dropped without hitting the Worker and
  // without navigating to thank-you.html (which is what fires the Google Ads conversion).
  const honeypot = el.querySelector('[data-role="company"]');
  const statusEl = el.querySelector('[data-role="form-status"]');
  const sendBtn = el.querySelector('[data-role="send-contact"]');

  const today = todayISO();
  pickupDateInput.min = today;
  dropoffDateInput.min = today;
  pickupDateInput.addEventListener('change', () => {
    if (pickupDateInput.value) dropoffDateInput.min = pickupDateInput.value;
  });

  sendBtn.addEventListener('click', async () => {
    if (honeypot && honeypot.value) return;
    const name = nameInput.value.trim();
    const email = emailInput.value.trim();
    const phone = phoneInput.value.trim();
    const message = messageInput.value.trim();
    const pickupDate = pickupDateInput.value;
    const dropoffDate = dropoffDateInput.value;

    const missing = [];
    if (!name) missing.push(t.missingName);
    if (!isValidEmail(email)) missing.push(t.missingEmail);
    if (!isCompletePhone(phone)) missing.push(t.missingPhone);
    if (!pickupDate) missing.push(t.missingPickupDate);
    else if (pickupDate < today) missing.push(t.pastPickupDate);
    if (!dropoffDate) missing.push(t.missingDropoffDate);
    else if (pickupDate && dropoffDate < pickupDate) missing.push(t.dropoffBeforePickup);
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
          pickupLocation: pickupLocationSelect.value,
          dropoffLocation: dropoffLocationSelect.value,
          pickupDate,
          dropoffDate,
          message,
        }),
      });
      if (!res.ok) throw new Error('send failed');
      // Flag consumed once by GTM's conversion trigger on thank-you.html (then
      // cleared) so refreshes, back-button revisits, or someone bookmarking/
      // direct-navigating to thank-you.html don't re-fire generate_lead — only
      // this exact arrival, right after a real successful submission, does.
      try { sessionStorage.setItem('sncLeadJustSubmitted', '1'); } catch (e) {}
      // Full page navigation (not fetch/SPA) so GTM sees a real pageview on
      // the thank-you page — that pageview is the Google Ads conversion signal.
      window.location.href = lang === 'es' ? 'es/thank-you.html' : 'en/thank-you.html';
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
