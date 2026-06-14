// i18n.js — Translations for EN / DE / IT
// Usage: data-i18n="key" on any element

const TRANSLATIONS = {
  en: {
    // Nav
    'nav.contact': 'Contact',
    'nav.about': 'About',

    // Hero
    'hero.intro': 'Hi! I\'m a <a class="hero-link" data-category="graphic-design">Graphic Designer</a>, <a class="hero-link" data-category="illustration">Illustrator</a> and <a class="hero-link" data-category="film">Filmmaker</a> from South Tyrol, currently living in Vienna.',
    'hero.draw': 'Draw Something',
    'hero.trailer': '<span class="trailer-line1">Watch the trailer of my</span><span class="trailer-line2"> animated shortfilm</span>',

    // Portfolio tabs
    'tab.all': 'All Projects',
    'tab.graphic-design': 'Graphic Design',
    'tab.illustration': 'Illustration',
    'tab.murals': 'Murals',
    'tab.film': 'Film',

    // Footer
    'footer.rights': '© 2026 Hannes Oberparleiter. All rights reserved.',
    'footer.impressum': 'Imprint',

    // Buttons
    'btn.clear': 'Clear Canvas',
    'btn.save': 'Save Drawing',

    // About page
    'about.title': 'About',
    'about.intro': 'Hi, I\'m Hannes — a graphic designer, illustrator and filmmaker from Kaltern in South Tyrol. I studied Communication Design at the University of Applied Arts Vienna (Mag.Art.) and have been working as a freelance graphic designer since 2020. I love combining drawing, visual storytelling, and typography into work that feels both handcrafted and intentional.',
    'about.cv.title': 'CV',
    'about.cv.education': 'Education',
    'about.cv.edu1.title': 'Kunstgymnasium Cademia, Graphic Arts',
    'about.cv.edu1.date': '2015 – 2019',
    'about.cv.edu2.title': 'Communication Design, University of Applied Arts Vienna — Mag.Art.',
    'about.cv.edu2.date': '2020 – 2026',
    'about.cv.internships': 'Internships',
    'about.cv.int1.title': 'Brand Gorillas',
    'about.cv.int1.date': '2017 · 2 weeks',
    'about.cv.int2.title': 'Mediamacs',
    'about.cv.int2.date': '2018 · 3 weeks',
    'about.cv.int3.title': 'VonKlammsteiner',
    'about.cv.int3.date': '2018 · 1 month',
    'about.cv.experience': 'Work Experience',
    'about.cv.exp1.title': 'Freelance Graphic Designer',
    'about.cv.exp1.date': '2020 – Present',
    'about.cv.languages': 'Languages',
    'about.cv.lang1': 'German (native)',
    'about.cv.lang2': 'Italian',
    'about.cv.lang3': 'English',

    // Impressum page
    'impressum.title': 'Imprint',
    'impressum.info': 'Information according to § 5 ECG',
    'impressum.name': '[Full Name]',
    'impressum.address': '[Street Address]',
    'impressum.city': '[ZIP Code, City]',
    'impressum.country': '[Country]',
    'impressum.contact.title': 'Contact',
    'impressum.email': '[email@example.com]',
    'impressum.phone': '[+43 000 000 000]',
    'impressum.liability.title': 'Liability for Content',
    'impressum.liability.text': 'The contents of this website have been created with the greatest care. However, no guarantee can be given for the accuracy, completeness, and topicality of the content. As a service provider, we are responsible for our own content on these pages in accordance with general law (§ 7 para. 1 TMG). According to §§ 8 to 10 TMG, however, we are not obligated to monitor transmitted or stored third-party information or to investigate circumstances that indicate illegal activity.',
    'impressum.links.title': 'Liability for Links',
    'impressum.links.text': 'Our offer contains links to external third-party websites, the contents of which we have no influence over. Therefore, we cannot assume any liability for these external contents. The respective provider or operator of the linked pages is always responsible for the content of the linked pages.',
    'impressum.copyright.title': 'Copyright',
    'impressum.copyright.text': 'The content and works created by the website operator on these pages are subject to Austrian copyright law. Reproduction, editing, distribution, and any form of utilization outside the limits of copyright require the written consent of the respective author or creator.',

    // Project page
    'project.back': '← Back',
  },

  de: {
    'nav.contact': 'Kontakt',
    'nav.about': 'Über mich',

    'hero.intro': 'Hallo! Ich bin <a class="hero-link" data-category="graphic-design">Grafikdesigner</a>, <a class="hero-link" data-category="illustration">Illustrator</a> und <a class="hero-link" data-category="film">Filmemacher</a> aus Südtirol und lebe derzeit in Wien.',
    'hero.draw': 'Zeichne etwas',
    'hero.trailer': '<span class="trailer-line1">Schau dir den Trailer meines</span><span class="trailer-line2"> Animationskurzfilms an</span>',

    'tab.all': 'Alle Projekte',
    'tab.graphic-design': 'Grafikdesign',
    'tab.illustration': 'Illustration',
    'tab.murals': 'Wandmalerei',
    'tab.film': 'Film',

    'footer.rights': '© 2026 Hannes Oberparleiter. Alle Rechte vorbehalten.',
    'footer.impressum': 'Impressum',

    'btn.clear': 'Löschen',
    'btn.save': 'Speichern',

    'about.title': 'Über mich',
    'about.intro': 'Hallo, ich bin Hannes — Grafikdesigner, Illustrator und Filmemacher aus Kaltern in Südtirol. Ich habe Kommunikationsdesign an der Universität für Angewandte Kunst Wien studiert (Mag.Art.) und arbeite seit 2020 als freiberuflicher Grafikdesigner. Ich verbinde Zeichnung, visuelles Erzählen und Typografie zu Arbeiten, die handgemacht und durchdacht wirken.',
    'about.cv.title': 'Lebenslauf',
    'about.cv.education': 'Ausbildung',
    'about.cv.edu1.title': 'Kunstgymnasium Cademia, Fachrichtung Grafik',
    'about.cv.edu1.date': '2015 – 2019',
    'about.cv.edu2.title': 'Kommunikationsdesign, Universität für Angewandte Kunst Wien — Mag.Art.',
    'about.cv.edu2.date': '2020 – 2026',
    'about.cv.internships': 'Praktika',
    'about.cv.int1.title': 'Brand Gorillas',
    'about.cv.int1.date': '2017 · 2 Wochen',
    'about.cv.int2.title': 'Mediamacs',
    'about.cv.int2.date': '2018 · 3 Wochen',
    'about.cv.int3.title': 'VonKlammsteiner',
    'about.cv.int3.date': '2018 · 1 Monat',
    'about.cv.experience': 'Arbeitserfahrung',
    'about.cv.exp1.title': 'Freiberuflicher Grafikdesigner',
    'about.cv.exp1.date': '2020 – Heute',
    'about.cv.languages': 'Sprachen',
    'about.cv.lang1': 'Deutsch (Muttersprache)',
    'about.cv.lang2': 'Italienisch',
    'about.cv.lang3': 'Englisch',

    'impressum.title': 'Impressum',
    'impressum.info': 'Angaben gemäß § 5 ECG',
    'impressum.name': '[Vollständiger Name]',
    'impressum.address': '[Straße und Hausnummer]',
    'impressum.city': '[PLZ, Ort]',
    'impressum.country': '[Land]',
    'impressum.contact.title': 'Kontakt',
    'impressum.email': '[email@example.com]',
    'impressum.phone': '[+43 000 000 000]',
    'impressum.liability.title': 'Haftung für Inhalte',
    'impressum.liability.text': 'Die Inhalte dieser Website wurden mit größter Sorgfalt erstellt. Für die Richtigkeit, Vollständigkeit und Aktualität der Inhalte kann jedoch keine Gewähr übernommen werden. Als Diensteanbieter sind wir gemäß den allgemeinen Gesetzen für eigene Inhalte auf diesen Seiten verantwortlich (§ 7 Abs. 1 TMG). Gemäß §§ 8 bis 10 TMG sind wir jedoch nicht verpflichtet, übermittelte oder gespeicherte fremde Informationen zu überwachen.',
    'impressum.links.title': 'Haftung für Links',
    'impressum.links.text': 'Unser Angebot enthält Links zu externen Websites Dritter, auf deren Inhalte wir keinen Einfluss haben. Deshalb können wir für diese fremden Inhalte auch keine Gewähr übernehmen. Für die Inhalte der verlinkten Seiten ist stets der jeweilige Anbieter oder Betreiber der Seiten verantwortlich.',
    'impressum.copyright.title': 'Urheberrecht',
    'impressum.copyright.text': 'Die durch den Seitenbetreiber erstellten Inhalte und Werke auf diesen Seiten unterliegen dem österreichischen Urheberrecht. Die Vervielfältigung, Bearbeitung, Verbreitung und jede Art der Verwertung außerhalb der Grenzen des Urheberrechtes bedürfen der schriftlichen Zustimmung des jeweiligen Autors bzw. Erstellers.',

    'project.back': '← Zurück',
  },

  it: {
    'nav.contact': 'Contatto',
    'nav.about': 'Chi sono',

    'hero.intro': 'Ciao! Sono un <a class="hero-link" data-category="graphic-design">Graphic Designer</a>, <a class="hero-link" data-category="illustration">Illustratore</a> e <a class="hero-link" data-category="film">Filmmaker</a> dell\'Alto Adige, attualmente residente a Vienna.',
    'hero.draw': 'Disegna qualcosa',
    'hero.trailer': '<span class="trailer-line1">Guarda il trailer del mio</span><span class="trailer-line2"> cortometraggio animato</span>',

    'tab.all': 'Tutti i progetti',
    'tab.graphic-design': 'Graphic Design',
    'tab.illustration': 'Illustrazione',
    'tab.murals': 'Murales',
    'tab.film': 'Film',

    'footer.rights': '© 2026 Hannes Oberparleiter. Tutti i diritti riservati.',
    'footer.impressum': 'Note legali',

    'btn.clear': 'Cancella',
    'btn.save': 'Salva disegno',

    'about.title': 'Chi sono',
    'about.intro': 'Ciao, sono Hannes — graphic designer, illustratore e filmmaker di Caldaro in Alto Adige. Ho studiato Design della Comunicazione all\'Università delle Arti Applicate di Vienna (Mag.Art.) e lavoro come graphic designer freelance dal 2020. Mi piace combinare disegno, narrazione visiva e tipografia in opere che sembrano artigianali e intenzionali.',
    'about.cv.title': 'Curriculum',
    'about.cv.education': 'Formazione',
    'about.cv.edu1.title': 'Kunstgymnasium Cademia, indirizzo Grafico',
    'about.cv.edu1.date': '2015 – 2019',
    'about.cv.edu2.title': 'Design della Comunicazione, Università delle Arti Applicate di Vienna — Mag.Art.',
    'about.cv.edu2.date': '2020 – 2026',
    'about.cv.internships': 'Tirocini',
    'about.cv.int1.title': 'Brand Gorillas',
    'about.cv.int1.date': '2017 · 2 settimane',
    'about.cv.int2.title': 'Mediamacs',
    'about.cv.int2.date': '2018 · 3 settimane',
    'about.cv.int3.title': 'VonKlammsteiner',
    'about.cv.int3.date': '2018 · 1 mese',
    'about.cv.experience': 'Esperienza lavorativa',
    'about.cv.exp1.title': 'Graphic Designer freelance',
    'about.cv.exp1.date': '2020 – Oggi',
    'about.cv.languages': 'Lingue',
    'about.cv.lang1': 'Tedesco (madrelingua)',
    'about.cv.lang2': 'Italiano',
    'about.cv.lang3': 'Inglese',

    'impressum.title': 'Note legali',
    'impressum.info': 'Informazioni ai sensi del § 5 ECG',
    'impressum.name': '[Nome completo]',
    'impressum.address': '[Via e numero civico]',
    'impressum.city': '[CAP, Città]',
    'impressum.country': '[Paese]',
    'impressum.contact.title': 'Contatto',
    'impressum.email': '[email@example.com]',
    'impressum.phone': '[+43 000 000 000]',
    'impressum.liability.title': 'Responsabilità per i contenuti',
    'impressum.liability.text': 'I contenuti di questo sito web sono stati creati con la massima cura. Tuttavia, non è possibile garantire l\'accuratezza, la completezza e l\'attualità dei contenuti. Come fornitore di servizi, siamo responsabili dei nostri contenuti su queste pagine conformemente alle leggi generali.',
    'impressum.links.title': 'Responsabilità per i link',
    'impressum.links.text': 'La nostra offerta contiene link a siti web di terze parti, sui cui contenuti non abbiamo alcuna influenza. Pertanto non possiamo assumere alcuna responsabilità per questi contenuti esterni. Il rispettivo fornitore o operatore delle pagine collegate è sempre responsabile del contenuto delle pagine collegate.',
    'impressum.copyright.title': 'Copyright',
    'impressum.copyright.text': 'I contenuti e le opere creati dall\'operatore del sito su queste pagine sono soggetti alla legge austriaca sul diritto d\'autore. La riproduzione, la modifica, la distribuzione e qualsiasi forma di utilizzo al di fuori dei limiti del diritto d\'autore richiedono il consenso scritto del rispettivo autore o creatore.',

    'project.back': '← Indietro',
  }
};

// ── i18n engine ───────────────────────────────────────────────

let currentLang = localStorage.getItem('lang') || 'en';

function t(key) {
  return TRANSLATIONS[currentLang]?.[key] ?? TRANSLATIONS['en']?.[key] ?? key;
}

function applyTranslations() {
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.dataset.i18n;
    const val = t(key);
    if (val !== undefined) el.innerHTML = val;
  });

  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    const key = el.dataset.i18nPlaceholder;
    const val = t(key);
    if (val !== undefined) el.placeholder = val;
  });

  document.documentElement.lang = currentLang;
}

function setLang(lang) {
  currentLang = lang;
  localStorage.setItem('lang', lang);
  applyTranslations();
}

// ── Slider positioning ────────────────────────────────────────
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
      // Notify slider (registered by script.js or project-nav.js)
      if (typeof window.__onLangChange === 'function') window.__onLangChange(a);
    });
  });
});

// Position slider after full load (fonts rendered) — this is the reliable moment
window.addEventListener('load', () => {
  // Sync lang-active class in case DOMContentLoaded missed it
  document.querySelectorAll('.lang-switcher a').forEach(a => {
    a.classList.toggle('lang-active', a.dataset.lang === currentLang);
  });

  // Two rAFs: first ensures layout, second ensures paint
  requestAnimationFrame(() => requestAnimationFrame(() => {
    positionSliderForActive();
    const slider = document.querySelector('.lang-slider');
    if (slider) slider.classList.add('ready'); // enable CSS transition only now
  }));
});

// Also re-position on resize (font-size may change, layout shifts)
window.addEventListener('resize', () => {
  positionSliderForActive();
});