// Airbnb-style trip date range picker: one field, opens a popover showing two
// months, click a start day then an end day. Writes into the existing hidden
// pickup-date/dropoff-date inputs (dispatching 'change' so contact-form.js's
// validation/min-date logic keeps working unmodified.
(function () {

const STRINGS = {
  en: {
    placeholder: 'Add pick-up and drop-off dates',
    months: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
    weekdays: ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'],
    clear: 'Clear dates',
    dash: ' → ',
  },
  es: {
    placeholder: 'Agrega fechas de retiro y devolución',
    months: ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'],
    weekdays: ['Do', 'Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sa'],
    clear: 'Borrar fechas',
    dash: ' → ',
  },
};

function toISO(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function fromISO(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function formatShort(date, t) {
  return `${t.months[date.getMonth()].slice(0, 3)} ${date.getDate()}`;
}

function startOfDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function initPicker(root) {
  const lang = root.dataset.lang || 'en';
  const t = STRINGS[lang];
  const pickupInput = root.querySelector('[data-role="pickup-date"]');
  const dropoffInput = root.querySelector('[data-role="dropoff-date"]');
  const trigger = root.querySelector('[data-role="date-range-trigger"]');
  const display = root.querySelector('[data-role="date-range-display"]');
  const popover = root.querySelector('[data-role="date-range-popover"]');

  const today = startOfDay(new Date());
  let viewMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  let start = pickupInput.value ? startOfDay(fromISO(pickupInput.value)) : null;
  let end = dropoffInput.value ? startOfDay(fromISO(dropoffInput.value)) : null;
  let hoverDate = null;

  function setHiddenInputs() {
    const pickupVal = start ? toISO(start) : '';
    const dropoffVal = end ? toISO(end) : '';
    if (pickupInput.value !== pickupVal) {
      pickupInput.value = pickupVal;
      pickupInput.dispatchEvent(new Event('change', { bubbles: true }));
    }
    if (dropoffInput.value !== dropoffVal) {
      dropoffInput.value = dropoffVal;
      dropoffInput.dispatchEvent(new Event('change', { bubbles: true }));
    }
  }

  function updateDisplay() {
    if (start && end) {
      display.textContent = `${formatShort(start, t)}${t.dash}${formatShort(end, t)}`;
      display.classList.add('has-value');
    } else if (start) {
      display.textContent = `${formatShort(start, t)}${t.dash}?`;
      display.classList.add('has-value');
    } else {
      display.textContent = t.placeholder;
      display.classList.remove('has-value');
    }
  }

  function inRange(date) {
    if (!start) return false;
    const rangeEnd = end || hoverDate;
    if (!rangeEnd) return false;
    const lo = start < rangeEnd ? start : rangeEnd;
    const hi = start < rangeEnd ? rangeEnd : start;
    return date > lo && date < hi;
  }

  function renderMonth(monthDate) {
    const y = monthDate.getFullYear();
    const m = monthDate.getMonth();
    const first = new Date(y, m, 1);
    const daysInMonth = new Date(y, m + 1, 0).getDate();
    const leadingBlanks = first.getDay();

    const wrap = document.createElement('div');
    wrap.className = 'drp-month';

    const heading = document.createElement('div');
    heading.className = 'drp-month-heading';
    heading.textContent = `${t.months[m]} ${y}`;
    wrap.appendChild(heading);

    const grid = document.createElement('div');
    grid.className = 'drp-grid';
    t.weekdays.forEach((wd) => {
      const cell = document.createElement('div');
      cell.className = 'drp-weekday';
      cell.textContent = wd;
      grid.appendChild(cell);
    });
    for (let i = 0; i < leadingBlanks; i++) {
      grid.appendChild(document.createElement('div'));
    }
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(y, m, day);
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'drp-day';
      btn.textContent = String(day);
      const isPast = date < today;
      if (isPast) {
        btn.disabled = true;
        btn.classList.add('is-disabled');
      }
      if (start && date.getTime() === start.getTime()) btn.classList.add('is-start');
      if (end && date.getTime() === end.getTime()) btn.classList.add('is-end');
      if (start && !end && hoverDate && date.getTime() === hoverDate.getTime() && date >= start) btn.classList.add('is-end-preview');
      if (inRange(date)) btn.classList.add('is-in-range');

      btn.addEventListener('mouseenter', () => {
        if (start && !end) {
          hoverDate = date;
          renderAll();
        }
      });
      btn.addEventListener('click', () => {
        if (!start || (start && end)) {
          start = date;
          end = null;
        } else if (date < start) {
          start = date;
          end = null;
        } else {
          end = date;
        }
        setHiddenInputs();
        updateDisplay();
        renderAll();
        if (start && end) {
          setTimeout(close, 250);
        }
      });
      grid.appendChild(btn);
    }
    wrap.appendChild(grid);
    return wrap;
  }

  function renderAll() {
    popover.innerHTML = '';

    const nav = document.createElement('div');
    nav.className = 'drp-nav';
    const prevBtn = document.createElement('button');
    prevBtn.type = 'button';
    prevBtn.className = 'drp-nav-btn';
    prevBtn.setAttribute('aria-label', 'Previous');
    prevBtn.textContent = '‹';
    prevBtn.addEventListener('click', () => {
      viewMonth = new Date(viewMonth.getFullYear(), viewMonth.getMonth() - 1, 1);
      renderAll();
    });
    const nextBtn = document.createElement('button');
    nextBtn.type = 'button';
    nextBtn.className = 'drp-nav-btn';
    nextBtn.setAttribute('aria-label', 'Next');
    nextBtn.textContent = '›';
    nextBtn.addEventListener('click', () => {
      viewMonth = new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 1);
      renderAll();
    });
    nav.appendChild(prevBtn);
    nav.appendChild(nextBtn);
    popover.appendChild(nav);

    const months = document.createElement('div');
    months.className = 'drp-months';
    const monthTwo = new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 1);
    months.appendChild(renderMonth(viewMonth));
    months.appendChild(renderMonth(monthTwo));
    popover.appendChild(months);

    const footer = document.createElement('div');
    footer.className = 'drp-footer';
    const clearBtn = document.createElement('button');
    clearBtn.type = 'button';
    clearBtn.className = 'drp-clear';
    clearBtn.textContent = t.clear;
    clearBtn.addEventListener('click', () => {
      start = null;
      end = null;
      hoverDate = null;
      setHiddenInputs();
      updateDisplay();
      renderAll();
    });
    footer.appendChild(clearBtn);
    popover.appendChild(footer);
  }

  function open() {
    popover.hidden = false;
    root.classList.add('open');
    viewMonth = new Date((start || today).getFullYear(), (start || today).getMonth(), 1);
    renderAll();
    document.addEventListener('click', onOutsideClick);
  }

  function close() {
    popover.hidden = true;
    root.classList.remove('open');
    document.removeEventListener('click', onOutsideClick);
  }

  function onOutsideClick(e) {
    // Use composedPath (frozen at dispatch time) instead of root.contains(e.target):
    // selecting a day re-renders the popover's DOM mid-click, detaching the
    // clicked button, so by the time this bubbles up e.target is no longer
    // contained in root even though the click was inside the picker.
    const path = e.composedPath ? e.composedPath() : [];
    if (!path.includes(root)) close();
  }

  trigger.addEventListener('click', () => {
    if (popover.hidden) open(); else close();
  });

  updateDisplay();
}

document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('[data-role="date-range"]').forEach(initPicker);
});

})();
