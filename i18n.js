// i18n.js — Translations for EN / DE / IT
// Usage: data-i18n="key" on any element

const TRANSLATIONS = {
  en: {
    // Nav
    'nav.contact': 'Contact',
    'nav.about': 'About',
    'nav.work': 'Projects',

    // Hero
    'hero.h1': 'Hannes Oberparleiter — Graphic Designer, Illustrator and Filmmaker from South Tyrol',
    'hero.draw': 'Draw Something<span class="draw-hint-sub">Tap & Hold to Draw</span>',

    // Portfolio tabs
    'tab.all': 'All Projects',
    'tab.graphic-design': 'Graphic Design',
    'tab.animation': 'Animation',
    'tab.paintings-drawings': 'Paintings & Drawings',

    // Footer
    'footer.impressum': 'Imprint',
    'footer.email': 'Email',
    'footer.phone': 'Mobile',

    // Buttons
    'btn.clear': 'Clear Canvas',
    'btn.save': 'Save Drawing',

    'about.popup.text': 'I\'m Hannes: <br><br>graphic designer, animation filmmaker, illustrator, digital painter, pizza maker and eater, hiker, climber, occasional graffiti artist, Mag. art., accordion player, hockey fan, and van traveler.<br><br>Feel free to reach out for projects, collaborations, or anything else!',

    // Impressum page (minimum required by Art. 7 D.Lgs. 70/2003)
    'impressum.title': 'Imprint',
    'impressum.name': 'Hannes Oberparleiter',
    'impressum.role': 'Graphic Designer and Visual Artist',
    'impressum.address': 'Oberplanitzing 13A',
    'impressum.city': '39052 Kaltern an der Weinstraße',
    'impressum.country': 'Italy',
    'impressum.vat': 'Partita IVA: 03362230215',
    'impressum.email': 'hello@hannesoberparleiter.com',

    'project.watchTrailer': 'Watch Trailer',
    'project.image': 'Image',
  },

  de: {
    'nav.contact': 'Kontakt',
    'nav.about': 'Über mich',
    'nav.work': 'Projekte',

    'hero.h1': 'Hannes Oberparleiter — Grafikdesigner, Illustrator und Filmemacher aus Südtirol',
    'hero.draw': 'Zeichne etwas<span class="draw-hint-sub">Tippen & halten zum Zeichnen</span>',

    'tab.all': 'Alle Projekte',
    'tab.graphic-design': 'Grafikdesign',
    'tab.animation': 'Animation',
    'tab.paintings-drawings': 'Malerei & Zeichnungen',

    'footer.impressum': 'Impressum',
    'footer.email': 'E-Mail',
    'footer.phone': 'Mobil',

    'btn.clear': 'Löschen',
    'btn.save': 'Speichern',

    'about.popup.text': 'Ich bin Hannes:<br><br>Grafikdesigner, Animationsfilmemacher, Zeichner, digitaler Maler, Pizzabäcker und -esser, Wanderer, Kletterer, Gelegenheitssprayer, Mag. art., Ziehharmonika-Zieher, Hockeyfan und Van-Urlauber.<br><br>Melde dich gern für Projekte, Kollaborationen oder Sonstigem!',

    'impressum.title': 'Impressum',
    'impressum.name': 'Hannes Oberparleiter',
    'impressum.role': 'Grafiker und visueller Künstler',
    'impressum.address': 'Oberplanitzing 13A',
    'impressum.city': '39052 Kaltern an der Weinstraße',
    'impressum.country': 'Italien',
    'impressum.vat': 'Partita IVA: 03362230215',
    'impressum.email': 'hello@hannesoberparleiter.com',

    'project.watchTrailer': 'Trailer ansehen',
    'project.image': 'Bild',
  },

  it: {
    'nav.contact': 'Contatto',
    'nav.about': 'Chi sono',
    'nav.work': 'Progetti',

    'hero.h1': 'Hannes Oberparleiter — Graphic Designer, Illustratore e Filmmaker dell\'Alto Adige',
    'hero.draw': 'Disegna qualcosa<span class="draw-hint-sub">Tocca e tieni premuto per disegnare</span>',

    'tab.all': 'Tutti i progetti',
    'tab.graphic-design': 'Graphic Design',
    'tab.animation': 'Animazione',
    'tab.paintings-drawings': 'Pitture & Disegni',

    'footer.impressum': 'Note legali',
    'footer.email': 'Email',
    'footer.phone': 'Cellulare',

    'btn.clear': 'Cancella',
    'btn.save': 'Salva disegno',

    'about.popup.text': 'Sono Hannes: <br><br>grafico, filmmaker d\'animazione, disegnatore, pittore digitale, pizzaiolo amatoriale, scalatore, writer occasionale, Mag. art., suonatore di fisarmonica, tifoso di hockey su ghiaccio e amante delle vacanze in furgone.<br><br>Contattami pure per progetti, collaborazioni o altro!',

    'impressum.title': 'Note legali',
    'impressum.name': 'Hannes Oberparleiter',
    'impressum.role': 'Grafico e artista visivo',
    'impressum.address': 'Via Pianizza di Sopra 13A',
    'impressum.city': '39052 Caldaro sulla Strada del Vino',
    'impressum.country': 'Italia',
    'impressum.vat': 'Partita IVA: 03362230215',
    'impressum.email': 'hello@hannesoberparleiter.com',

    'project.watchTrailer': 'Guarda il trailer',
    'project.image': 'Immagine',
  }
};

// ── i18n engine ───────────────────────────────────────────────

const SUPPORTED_LANGS = ['en', 'de', 'it'];

// Picks the best supported language for a first-time visitor, based on
// their browser's language settings. Falls back to English if none of
// the browser's preferred languages match a language we support.
function detectBrowserLang() {
  const candidates = (navigator.languages && navigator.languages.length)
    ? navigator.languages
    : [navigator.language || navigator.userLanguage || 'en'];

  for (const raw of candidates) {
    if (!raw) continue;
    const primary = raw.slice(0, 2).toLowerCase(); // 'de-AT' -> 'de'
    if (SUPPORTED_LANGS.includes(primary)) return primary;
  }
  return 'en';
}

// A saved choice (the user explicitly picked a language before) always
// wins (if it is still a supported language); only first-time visitors get the browser-based guess.
const savedLang = safeLocal.get('lang');
let currentLang = SUPPORTED_LANGS.includes(savedLang) ? savedLang : detectBrowserLang();

function t(key) {
  return TRANSLATIONS[currentLang]?.[key] ?? TRANSLATIONS['en']?.[key] ?? key;
}

function applyTranslations() {
  document.querySelectorAll('[data-i18n]').forEach(el => {
    el.innerHTML = t(el.dataset.i18n);
  });

  document.documentElement.lang = currentLang;
}

function setLang(lang) {
  currentLang = lang;
  safeLocal.set('lang', lang);
  applyTranslations();
  // Pages with language-dependent content that i18n.js can't translate by
  // itself (e.g. project.html) listen for this.
  document.dispatchEvent(new CustomEvent('langchange', { detail: { lang } }));
}

// ── Slider positioning ────────────────────────────────────────
// The language pill is owned entirely by this file (initial placement,
// clicks, resize) — nav.js and script.js don't touch it.
// Must run after fonts and layout are fully rendered.
// We wait for window 'load' (all resources), then an extra rAF
// to ensure the browser has painted with the correct font metrics.

function positionSliderForActive() {
  const active = document.querySelector('.lang-switcher a.lang-active');
  const slider = document.querySelector('.lang-slider');
  if (!active || !slider) return;
  slider.style.width     = active.offsetWidth + 'px';
  slider.style.transform = `translateX(${active.offsetLeft}px) translateY(-50%)`;
}

// Run on page load
document.addEventListener('DOMContentLoaded', () => {
  // Sync active class on switcher
  document.querySelectorAll('.lang-switcher a').forEach(a => {
    a.classList.toggle('lang-active', a.dataset.lang === currentLang);
  });
  applyTranslations();

  // Hook up lang switcher clicks
  document.querySelectorAll('.lang-switcher a').forEach(a => {
    a.addEventListener('click', (e) => {
      e.preventDefault();
      const lang = a.dataset.lang;
      if (!lang) return;
      document.querySelectorAll('.lang-switcher a').forEach(l => l.classList.remove('lang-active'));
      a.classList.add('lang-active');
      setLang(lang);
      positionSliderForActive();
    });
  });
});

// Position slider after full load (fonts rendered) — this is the reliable moment
window.addEventListener('load', () => {
  // Sync lang-active class in case DOMContentLoaded missed it
  document.querySelectorAll('.lang-switcher a').forEach(a => {
    a.classList.toggle('lang-active', a.dataset.lang === currentLang);
  });

  // Place the pill IMMEDIATELY, while the CSS transition is still off, so it
  // appears in the right spot instead of animating in from its start position.
  positionSliderForActive();
  // If the web font swaps in after this, re-measure (still without transition).
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(positionSliderForActive);

  // Only enable the transition after the pill has been painted in place
  // (two rAFs: first ensures layout, second ensures paint).
  requestAnimationFrame(() => requestAnimationFrame(() => {
    const slider = document.querySelector('.lang-slider');
    if (slider) slider.classList.add('ready');
  }));
});

// Also re-position on resize (font-size may change, layout shifts)
window.addEventListener('resize', () => {
  positionSliderForActive();
});