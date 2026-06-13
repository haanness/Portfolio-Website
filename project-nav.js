// project-nav.js — nav interactions for subpages (no canvas)

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
let isMoon = false;
const GREEN = '#00906A';
const WHITE = '#F9F8F1';

const sunIcons = [
  document.getElementById('theme-icon'),
  document.getElementById('theme-icon-desktop')
].filter(Boolean);

const buildSunContent = (color) => `
  <circle cx="12" cy="12" r="4" fill="${color}" style="transition: r 0.35s ease;"/>
  <g stroke="${color}" style="transition: opacity 0.25s ease;">
    <line x1="12" y1="2" x2="12" y2="6.5"/>
    <line x1="12" y1="17.5" x2="12" y2="22"/>
    <line x1="2" y1="12" x2="6.5" y2="12"/>
    <line x1="17.5" y1="12" x2="22" y2="12"/>
    <line x1="4.93" y1="4.93" x2="7.88" y2="7.88"/>
    <line x1="16.12" y1="16.12" x2="19.07" y2="19.07"/>
    <line x1="19.07" y1="4.93" x2="16.12" y2="7.88"/>
    <line x1="7.88" y1="16.12" x2="4.93" y2="19.07"/>
  </g>
`;

sunIcons.forEach(icon => {
  icon.setAttribute('stroke', GREEN);
  icon.innerHTML = buildSunContent(GREEN);
});

const toggleSun = () => {
  isMoon = !isMoon;
  const color = isMoon ? WHITE : GREEN;
  document.body.classList.toggle('dark', isMoon);

  sunIcons.forEach(icon => {
    icon.setAttribute('stroke', color);
    const circle = icon.querySelector('circle');
    const rays   = icon.querySelector('g');
    if (!circle || !rays) return;
    circle.setAttribute('fill', color);
    rays.setAttribute('stroke', color);
    if (isMoon) {
      rays.style.transition  = 'opacity 0.2s ease';
      rays.style.opacity     = '0';
      circle.setAttribute('r', '10');
    } else {
      circle.setAttribute('r', '4');
      rays.style.transition  = 'opacity 0.35s ease 0.1s';
      rays.style.opacity     = '1';
    }
  });

  const hamburgerIcon = document.querySelector('.plus-icon');
  if (hamburgerIcon) hamburgerIcon.setAttribute('stroke', color);
};

sunIcons.forEach(icon => icon.addEventListener('click', toggleSun));

// ── Language switcher slider ──────────────────────────────────
const langLinks  = document.querySelectorAll('.lang-switcher a');
const langSlider = document.querySelector('.lang-slider');

const moveSlider = (link) => {
  if (!link || !langSlider) return;
  langSlider.style.width     = link.offsetWidth + 'px';
  langSlider.style.transform = `translateX(${link.offsetLeft}px) translateY(-50%)`;
};

// Position after full load so font metrics are correct
window.addEventListener('load', () => {
  document.querySelectorAll('.lang-switcher a').forEach(a => {
    const stored = localStorage.getItem('lang') || 'en';
    a.classList.toggle('lang-active', a.dataset.lang === stored);
  });
  requestAnimationFrame(() => requestAnimationFrame(() => {
    const active = document.querySelector('.lang-switcher a.lang-active');
    if (active) moveSlider(active);
    if (langSlider) langSlider.classList.add('ready');
  }));
});

window.addEventListener('resize', () => {
  const active = document.querySelector('.lang-switcher a.lang-active');
  if (active) moveSlider(active);
});
