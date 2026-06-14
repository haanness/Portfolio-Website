// project-nav.js — nav interactions for subpages (no canvas)

// ── Constants ─────────────────────────────────────────────────

const GREEN = '#00906A';
const WHITE = '#F9F8F1';


// ── Dark Mode: apply immediately to prevent flash ─────────────
// Reading localStorage and toggling body.dark here (before any paint)
// prevents the brief white flash when the user has dark mode enabled.

let isMoon = localStorage.getItem('theme') === 'dark';
if (isMoon) document.body.classList.add('dark');


// ── Hamburger ─────────────────────────────────────────────────

const hamburger = document.getElementById('hamburger');
const navLinks  = document.getElementById('nav-links');

if (hamburger && navLinks) {
  hamburger.addEventListener('click', () => {
    hamburger.classList.toggle('active');
    navLinks.classList.toggle('active');
  });

  navLinks.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
      hamburger.classList.remove('active');
      navLinks.classList.remove('active');
    });
  });
}


// ── Sun / Moon toggle ─────────────────────────────────────────

// BUG FIX: filter out nulls so forEach never throws on missing elements.
const sunIcons = [
  document.getElementById('theme-icon'),
  document.getElementById('theme-icon-desktop'),
].filter(Boolean);

const buildSunContent = (color) => `
  <circle cx="12" cy="12" r="4" fill="${color}" style="transition: r 0.35s ease;"/>
  <g stroke="${color}" style="transition: opacity 0.25s ease;">
    <line x1="12" y1="2"    x2="12" y2="6.5"/>
    <line x1="12" y1="17.5" x2="12" y2="22"/>
    <line x1="2"  y1="12"   x2="6.5" y2="12"/>
    <line x1="17.5" y1="12" x2="22"  y2="12"/>
    <line x1="4.93"  y1="4.93"  x2="7.88"  y2="7.88"/>
    <line x1="16.12" y1="16.12" x2="19.07" y2="19.07"/>
    <line x1="19.07" y1="4.93"  x2="16.12" y2="7.88"/>
    <line x1="7.88"  y1="16.12" x2="4.93"  y2="19.07"/>
  </g>
`;

// BUG FIX: read persisted theme from localStorage so subpages
// remember the user's choice across navigation.
// (isMoon is already declared and body.dark already applied above.)

const applyDarkMode = (dark) => {
  document.body.classList.toggle('dark', dark);
  const color = dark ? WHITE : GREEN;

  const hamburgerIcon = document.querySelector('.plus-icon');
  if (hamburgerIcon) hamburgerIcon.setAttribute('stroke', color);

  sunIcons.forEach(icon => {
    icon.setAttribute('stroke', color);
    const circle = icon.querySelector('circle');
    const rays   = icon.querySelector('g');
    if (!circle || !rays) return;
    circle.setAttribute('fill', color);
    rays.setAttribute('stroke', color);
    if (dark) {
      rays.style.transition = 'opacity 0.2s ease';
      rays.style.opacity    = '0';
      circle.setAttribute('r', '10');
    } else {
      circle.setAttribute('r', '4');
      rays.style.transition = 'opacity 0.35s ease 0.1s';
      rays.style.opacity    = '1';
    }
  });
};

const toggleSun = () => {
  isMoon = !isMoon;
  localStorage.setItem('theme', isMoon ? 'dark' : 'light');
  applyDarkMode(isMoon);
};

// Render icon content immediately (before load event)
sunIcons.forEach(icon => {
  icon.setAttribute('stroke', isMoon ? WHITE : GREEN);
  icon.innerHTML = buildSunContent(isMoon ? WHITE : GREEN);
});

sunIcons.forEach(icon => icon.addEventListener('click', toggleSun));


// ── Language switcher slider ──────────────────────────────────

const langSlider = document.querySelector('.lang-slider');

// `animated=false` for initial placement so the pill appears instantly
// in the correct spot rather than sliding in from x=0 on page load.
const moveSlider = (link, animated = true) => {
  if (!link || !langSlider) return;
  const apply = () => {
    langSlider.style.width     = link.offsetWidth + 'px';
    langSlider.style.transform = `translateX(${link.offsetLeft}px) translateY(-50%)`;
  };
  if (animated) {
    requestAnimationFrame(apply);
  } else {
    apply();
  }
};

// Click handling is owned by i18n.js. project-nav.js only registers the
// slider callback so i18n.js can move the pill after each click.
window.__onLangChange = (link) => moveSlider(link, true);

window.addEventListener('resize', () => {
  const active = document.querySelector('.lang-switcher a.lang-active');
  if (active) moveSlider(active, true);
});


// ── Initialise on load ────────────────────────────────────────

window.addEventListener('load', () => {
  // Restore dark mode
  applyDarkMode(isMoon);

  // Sync active lang class
  const stored = localStorage.getItem('lang') || 'en';
  document.querySelectorAll('.lang-switcher a').forEach(a => {
    a.classList.toggle('lang-active', a.dataset.lang === stored);
  });

  // Position pill synchronously before enabling the CSS transition,
  // so it appears instantly in the right spot (no slide-in jump on load).
  const active = document.querySelector('.lang-switcher a.lang-active');
  if (active) moveSlider(active, false);
  requestAnimationFrame(() => requestAnimationFrame(() => {
    if (langSlider) langSlider.classList.add('ready');
  }));
});