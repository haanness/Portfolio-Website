// ── Constants ─────────────────────────────────────────────────

const GREEN = '#00906A';
const WHITE = '#F9F8F1';


// ── Dark Mode: apply immediately to prevent flash ─────────────
// Reading localStorage and toggling body.dark here (before first paint)
// prevents the brief white flash when the user has dark mode enabled.

let isMoon = localStorage.getItem('theme') === 'dark';
if (isMoon) document.body.classList.add('dark');


// ── DOM refs ──────────────────────────────────────────────────

const hamburger   = document.getElementById('hamburger');
const navLinks    = document.getElementById('nav-links');
const canvas      = document.querySelector('canvas');
const clearCanvas = document.querySelector('.clear-canvas');
const saveDrawing = document.querySelector('.save-drawing');
const ctx         = canvas.getContext('2d');


// ── Hamburger ─────────────────────────────────────────────────

hamburger.addEventListener('click', () => {
  hamburger.classList.toggle('active');
  navLinks.classList.toggle('active');
  const menuOpen = navLinks.classList.contains('active');
  clearCanvas.style.visibility = menuOpen ? 'hidden' : '';
  saveDrawing.style.visibility = menuOpen ? 'hidden' : '';
});

navLinks.querySelectorAll('a').forEach(link => {
  link.addEventListener('click', () => {
    hamburger.classList.remove('active');
    navLinks.classList.remove('active');
    clearCanvas.style.visibility = '';
    saveDrawing.style.visibility = '';
  });
});


// ── Drawing state ─────────────────────────────────────────────

let isDrawing    = false;
let hasDrawn     = false;
const brushWidth = 2;

// Resolve initial draw color from stored theme
let selectedColor = (localStorage.getItem('theme') === 'dark') ? WHITE : GREEN;


// ── Canvas helpers ────────────────────────────────────────────

const getCoordinates = (e) => {
  const rect = canvas.getBoundingClientRect();
  const x = (e.clientX ?? e.touches?.[0]?.clientX) - rect.left;
  const y = (e.clientY ?? e.touches?.[0]?.clientY) - rect.top;
  return { x, y };
};

const setCanvasBackground = () => {
  const isDark = document.body.classList.contains('dark');
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = isDark ? GREEN : WHITE;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.restore();
  ctx.fillStyle = selectedColor;
};

const setCanvasDimensions = () => {
  const dpr    = window.devicePixelRatio || 1;
  const width  = window.innerWidth;
  const height = document.body.offsetHeight;

  // Preserve user drawing across resize
  let savedBitmap = null;
  if (hasDrawn && canvas.width > 0 && canvas.height > 0) {
    const offscreen = document.createElement('canvas');
    offscreen.width  = canvas.width;
    offscreen.height = canvas.height;
    offscreen.getContext('2d').drawImage(canvas, 0, 0);
    savedBitmap = offscreen;
  }

  canvas.style.width  = `${width}px`;
  canvas.style.height = `${height}px`;
  canvas.width        = width  * dpr;
  canvas.height       = height * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  setCanvasBackground();

  if (savedBitmap) {
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(savedBitmap, 0, 0);
    ctx.restore();
  }
};

// Keep canvas in sync whenever page layout changes
const bodyResizeObserver = new ResizeObserver(() => {
  const dpr       = window.devicePixelRatio || 1;
  const newHeight = document.body.offsetHeight;
  const newWidth  = window.innerWidth;

  if (canvas.height !== newHeight * dpr || canvas.width !== newWidth * dpr) {
    if (introPlaying) {
      introPlaying = false;
      cancelAnimationFrame(introAnimFrame);
      setCanvasDimensions();
      playIntroDrawing();
    } else {
      setCanvasDimensions();
    }
  }
});
bodyResizeObserver.observe(document.body);


// ── Hit-test: only draw over blank areas ──────────────────────

const isBlankSpace = (e) => {
  const x = e.clientX ?? e.touches?.[0]?.clientX;
  const y = e.clientY ?? e.touches?.[0]?.clientY;
  if (typeof x !== 'number' || typeof y !== 'number') return false;

  canvas.style.pointerEvents = 'none';
  const underlying = document.elementFromPoint(x, y);
  canvas.style.pointerEvents = 'auto';

  if (!underlying) return false;

  return !underlying.closest(
    'nav, .portfolio-item, .portfolio-image, .portfolio-info, ' +
    '.logo, .nav-links, .lang-switcher, a, footer, button, .st0'
  );
};


// ── Intro Drawing: Record & Playback ──────────────────────────

const isExportMode = new URLSearchParams(window.location.search).has('export');

let recordedStrokes  = [];
let currentStroke    = null;
let recordingStart   = Date.now();

const recordPoint = (type, x, y) => {
  if (!isExportMode) return;
  const t  = Date.now() - recordingStart;
  const rx = x / window.innerWidth;
  const ry = y / window.innerHeight;
  if (type === 'start') {
    currentStroke = { points: [{ t, x: rx, y: ry }] };
    recordedStrokes.push(currentStroke);
  } else if (currentStroke) {
    currentStroke.points.push({ t, x: rx, y: ry });
  }
};

let introPlaying   = false;
let introAnimFrame = null;

const fadeOutIntro = () => {
  if (!introPlaying) return;
  introPlaying = false;
  cancelAnimationFrame(introAnimFrame);
  setCanvasBackground();
};

const playIntroDrawing = async () => {
  const isMobile = window.innerWidth <= 768;
  let strokes = null;

  if (typeof DRAWINGS_BUNDLE !== 'undefined') {
    const pool = isMobile ? DRAWINGS_BUNDLE.mobile : DRAWINGS_BUNDLE.desktop;
    if (pool && pool.length > 0) {
      strokes = pool[Math.floor(Math.random() * pool.length)];
    }
  }

  if (!strokes) {
    const folder = isMobile
      ? 'Startup_Drawings/Mobile_Drawings'
      : 'Startup_Drawings/Desktop_Drawings';
    const random = Math.floor(Math.random() * 4) + 1;
    try {
      const res = await fetch(`${folder}/drawing-${random}.json`);
      if (!res.ok) return;
      strokes = await res.json();
    } catch {
      return;
    }
  }

  if (!strokes || strokes.length === 0) return;

  // Normalise timestamps so the first point starts at t=0
  const firstT = strokes[0].points[0].t;
  strokes = strokes.map(stroke => ({
    points: stroke.points.map(p => ({ ...p, t: p.t - firstT }))
  }));

  introPlaying = true;

  const color         = document.body.classList.contains('dark') ? WHITE : GREEN;
  const startTime     = performance.now();
  const allPoints     = strokes.flatMap(s => s.points);
  const totalDuration = allPoints[allPoints.length - 1].t;
  const speed         = totalDuration / 5000;
  const drawnUpTo     = new Array(strokes.length).fill(-1);

  const draw = (now) => {
    if (!introPlaying) return;
    const elapsed = (now - startTime) * speed;
    const dpr     = window.devicePixelRatio || 1;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    strokes.forEach((stroke, si) => {
      const pts = stroke.points;
      let i = drawnUpTo[si];

      if (i === -1 && pts[0].t <= elapsed) {
        ctx.beginPath();
        ctx.lineWidth   = brushWidth;
        ctx.strokeStyle = color;
        ctx.lineCap     = 'round';
        ctx.lineJoin    = 'round';
        ctx.moveTo(pts[0].x * window.innerWidth, pts[0].y * window.innerHeight);
        i = 0;
      }

      while (i >= 0 && i < pts.length - 1 && pts[i + 1].t <= elapsed) {
        ctx.lineTo(pts[i + 1].x * window.innerWidth, pts[i + 1].y * window.innerHeight);
        ctx.stroke();
        i++;
      }

      drawnUpTo[si] = i;
    });

    if (elapsed < totalDuration) {
      introAnimFrame = requestAnimationFrame(draw);
    } else {
      // BUG FIX: was incorrectly set to `true`, keeping the flag alive forever.
      introPlaying = false;
    }
  };

  introAnimFrame = requestAnimationFrame(draw);
};


// ── Drawing ───────────────────────────────────────────────────

const startDraw = (e) => {
  if (!isBlankSpace(e)) return;
  e.preventDefault();
  fadeOutIntro();
  isDrawing = true;

  if (!hasDrawn) {
    hasDrawn = true;
    clearCanvas.style.display = 'block';
    saveDrawing.style.display = 'block';
    const drawHint = document.querySelector('.draw-hint');
    if (drawHint) drawHint.style.display = 'none';
  }

  const dpr    = window.devicePixelRatio || 1;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const coords = getCoordinates(e);
  recordPoint('start', coords.x, coords.y);
  ctx.beginPath();
  ctx.moveTo(coords.x, coords.y);
  ctx.lineWidth   = brushWidth;
  ctx.strokeStyle = selectedColor;
  ctx.lineCap     = 'round';
  ctx.lineJoin    = 'round';
};

const drawing = (e) => {
  if (!isDrawing) return;
  e.preventDefault();
  const coords = getCoordinates(e);
  recordPoint('move', coords.x, coords.y);
  ctx.lineTo(coords.x, coords.y);
  ctx.stroke();
};

const stopDrawing = () => {
  isDrawing = false;
};

clearCanvas.addEventListener('click', () => {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  setCanvasBackground();
  hasDrawn = false;
  clearCanvas.style.display = 'none';
  saveDrawing.style.display = 'none';
});

saveDrawing.addEventListener('click', () => {
  const link      = document.createElement('a');
  link.download   = `drawing-${Date.now()}.jpg`;
  link.href       = canvas.toDataURL('image/jpeg');
  link.click();
});

document.addEventListener('mousedown', startDraw);
document.addEventListener('mousemove', drawing);
document.addEventListener('mouseup',   stopDrawing);


// ── Touch: Long Press to draw ─────────────────────────────────

let longPressTimer  = null;
let touchMoved      = false;
let longPressActive = false;

const isTouchDevice = () => window.matchMedia('(pointer: coarse)').matches;

document.addEventListener('touchstart', (e) => {
  if (!isTouchDevice()) return;
  touchMoved      = false;
  longPressActive = false;

  longPressTimer = setTimeout(() => {
    if (!touchMoved && isBlankSpace(e)) {
      longPressActive            = true;
      canvas.style.touchAction   = 'none';
      startDraw(e);
    }
  }, 120);
}, { passive: true });

document.addEventListener('touchmove', (e) => {
  if (!isTouchDevice()) return;
  if (longPressActive) {
    e.preventDefault();
    drawing(e);
  } else {
    clearTimeout(longPressTimer);
    touchMoved = true;
  }
}, { passive: false });

document.addEventListener('touchend', () => {
  clearTimeout(longPressTimer);
  if (!longPressActive) canvas.style.touchAction = 'auto';
  longPressActive = false;
  stopDrawing();
});

canvas.style.touchAction = 'auto';


// ── Teddy GIF Hover ───────────────────────────────────────────

const initTeddy = () => {
  const teddyWrapper = document.querySelector('.teddy-wrapper');
  const teddySVG     = document.querySelector('#Ebene_1');
  if (!teddyWrapper || !teddySVG) return;

  teddySVG.querySelectorAll('.st0').forEach(path => {
    path.addEventListener('mouseenter', () => teddyWrapper.classList.add('teddy-hovered'));
    path.addEventListener('mouseleave', () => teddyWrapper.classList.remove('teddy-hovered'));
    path.addEventListener('click',      () => window.open('https://www.youtube.com', '_blank'));
  });
};


// ── Hero scroll animation ─────────────────────────────────────

const heroObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      heroObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.2 });

document.querySelectorAll('.hero-item').forEach(item => heroObserver.observe(item));


// ── Language switcher slider ──────────────────────────────────
// Click handling and setLang() calls are owned by i18n.js (DOMContentLoaded).
// This file is only responsible for moving the slider indicator, which requires
// layout metrics unavailable to i18n.js at parse time.

const langSlider = document.querySelector('.lang-slider');

// Moves the slider pill. `animated` controls whether the CSS transition fires.
// Pass animated=false for the initial placement (before first paint) so the
// pill appears instantly in the right spot rather than sliding in from x=0.
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

// Register as a callback so i18n.js can trigger slider movement after a click.
window.__onLangChange = (link) => moveSlider(link, true);

window.addEventListener('resize', () => {
  const active = document.querySelector('.lang-switcher a.lang-active');
  if (active) moveSlider(active, true);
});


// ── Sun / Moon toggle ─────────────────────────────────────────

// BUG FIX: filter out nulls so forEach never throws on missing elements
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

// BUG FIX: persist dark mode in localStorage and restore it on load.
// isMoon is already declared and body.dark already applied above.

const applySunIcons = (color) => {
  sunIcons.forEach(icon => {
    icon.setAttribute('stroke', color);
    icon.innerHTML = buildSunContent(color);
  });
};

const applyDarkMode = (dark) => {
  document.body.classList.toggle('dark', dark);
  const color = dark ? WHITE : GREEN;

  selectedColor = color;

  // Swap canvas background while preserving any user drawing.
  // Strategy: if the user has drawn something, capture the strokes as a
  // composite snapshot, repaint the new background, then draw the snapshot
  // back on top with 'difference' blending so the stroke colour inverts
  // correctly (cream on green ↔ green on cream).
  if (canvas.width > 0) {
    if (hasDrawn) {
      // Save current canvas content
      const offscreen = document.createElement('canvas');
      offscreen.width  = canvas.width;
      offscreen.height = canvas.height;
      offscreen.getContext('2d').drawImage(canvas, 0, 0);

      // Paint the new background
      setCanvasBackground();

      // Re-composite the drawing with 'difference' blend so strokes
      // flip from the old ink colour to the new one automatically.
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalCompositeOperation = 'difference';
      ctx.drawImage(offscreen, 0, 0);
      ctx.restore();
    } else {
      setCanvasBackground();
    }
  }

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

sunIcons.forEach(icon => icon.addEventListener('click', toggleSun));

// Render initial sun icon content before page load event fires
applySunIcons(isMoon ? WHITE : GREEN);


// ── Portfolio data ────────────────────────────────────────────
// BUG FIX: 'all' is derived at runtime so it never gets out of sync
// with the per-category lists.

const portfolioCategories = {
  'graphic-design': [
    { title: 'Poster Series',    slug: 'poster-series',    category: 'graphic-design' },
    { title: 'Brand Identity',   slug: 'brand-identity',   category: 'graphic-design' },
    { title: 'Editorial Design', slug: 'editorial-design', category: 'graphic-design' },
  ],
  illustration: [
    { title: 'Character Studies', slug: 'character-studies', category: 'illustration' },
    { title: 'Book Cover',        slug: 'book-cover',        category: 'illustration' },
    { title: 'Zine Vol. 1',       slug: 'zine-vol-1',        category: 'illustration' },
    { title: 'Zine Vol. 2',       slug: 'zine-vol-2',        category: 'illustration' },
  ],
  murals: [
    { title: 'Mural Vienna', slug: 'mural-vienna', category: 'murals' },
    { title: 'Mural Bozen',  slug: 'mural-bozen',  category: 'murals' },
  ],
  film: [
    { title: 'Washed Out',   slug: 'washed-out',   category: 'film' },
    { title: 'Short Film 02', slug: 'short-film-02', category: 'film' },
    { title: 'Music Video',  slug: 'music-video',  category: 'film' },
  ],
};

const portfolioData = {
  ...portfolioCategories,
  all: Object.values(portfolioCategories).flat(),
};


// ── Portfolio UI ──────────────────────────────────────────────

const portfolioTabs          = document.querySelectorAll('.portfolio-tab');
const portfolioTabsContainer = document.querySelector('.portfolio-tabs');
const portfolioPanel         = document.getElementById('portfolio-panel');
const portfolioGrid          = document.getElementById('portfolio-grid');

let activeCategory = 'all';

const isMobileLayout = () => window.innerWidth <= 768;

const aspectRatios = [
  '75%',   // 4:3 landscape
  '125%',  // 4:5 portrait
  '100%',  // 1:1 square
  '56%',   // 16:9 wide
  '140%',  // tall portrait
  '85%',   // slightly portrait
  '66%',   // 3:2 landscape
  '110%',  // medium portrait
];

const updateGridCorner = (activeTab) => {
  if (!activeTab || !portfolioGrid) return;
  portfolioGrid.style.borderRadius = '10px';
  if (Array.from(portfolioTabs).indexOf(activeTab) === 0) {
    portfolioGrid.style.borderTopLeftRadius = '0';
  } else {
    portfolioGrid.style.borderTopLeftRadius = '10px';
  }
};

const renderGrid = (category) => {
  const items = portfolioData[category] || [];
  portfolioGrid.innerHTML = items.map((item, i) => {
    const ratio = aspectRatios[i % aspectRatios.length];
    return `
      <a class="portfolio-item" href="projects/${item.slug}.html" title="${item.title}">
        <div class="portfolio-item-inner" style="padding-top:${ratio}"></div>
        <span class="portfolio-item-label">${item.title}</span>
      </a>
    `;
  }).join('');
};

const openPanel = () => {
  portfolioPanel.style.height = portfolioGrid.scrollHeight + 'px';
  portfolioPanel.classList.add('open');
};

const closePanel = () => {
  portfolioPanel.style.height = portfolioPanel.scrollHeight + 'px';
  requestAnimationFrame(() => {
    portfolioPanel.style.height = '0';
  });
  portfolioPanel.classList.remove('open');
};

const refreshPanelHeight = () => {
  if (!portfolioPanel.classList.contains('open')) return;
  portfolioPanel.style.height = 'auto';
  portfolioPanel.style.height = portfolioGrid.scrollHeight + 'px';
};

portfolioTabs.forEach(tab => {
  tab.addEventListener('click', () => {
    const category = tab.dataset.category;

    if (isMobileLayout()) {
      if (portfolioTabsContainer.classList.contains('mobile-open') && category !== activeCategory) {
        portfolioTabs.forEach(t => { t.classList.remove('active'); t.removeAttribute('data-open'); });
        tab.classList.add('active');
        tab.setAttribute('data-open', '');
        activeCategory = category;
        renderGrid(category);
        portfolioTabsContainer.classList.remove('mobile-open');
        portfolioTabsContainer.appendChild(tab);
        if (!portfolioPanel.classList.contains('open')) openPanel();
        else refreshPanelHeight();
        return;
      }
      portfolioTabsContainer.classList.toggle('mobile-open');
      return;
    }

    // Desktop: clicking the active tab closes the panel
    if (activeCategory === category) {
      tab.classList.remove('active');
      tab.removeAttribute('data-open');
      closePanel();
      activeCategory = null;
      return;
    }

    portfolioTabs.forEach(t => { t.classList.remove('active'); t.removeAttribute('data-open'); });
    tab.classList.add('active');
    tab.setAttribute('data-open', '');
    activeCategory = category;
    renderGrid(category);
    updateGridCorner(tab);
    if (!portfolioPanel.classList.contains('open')) openPanel();
    else refreshPanelHeight();
  });
});

// Close mobile dropdown when clicking outside
document.addEventListener('click', (e) => {
  if (isMobileLayout() && !e.target.closest('.portfolio-tabs')) {
    portfolioTabsContainer.classList.remove('mobile-open');
  }
});

// Hero links → filter portfolio by category.
// Uses event delegation on the stable parent so listeners survive i18n.js
// replacing the hero paragraph's innerHTML on every language change.
document.querySelector('.hero-intro')?.addEventListener('click', (e) => {
  const link = e.target.closest('.hero-link');
  if (!link) return;

  const category = link.dataset.category;
  const tab = document.querySelector(`.portfolio-tab[data-category="${category}"]`);
  if (!tab) return;

  portfolioTabs.forEach(t => { t.classList.remove('active'); t.removeAttribute('data-open'); });
  tab.classList.add('active');
  tab.setAttribute('data-open', '');
  activeCategory = category;
  renderGrid(category);
  updateGridCorner(tab);
  if (!portfolioPanel.classList.contains('open')) openPanel();
  else refreshPanelHeight();

  document.querySelector('#work')?.scrollIntoView({ behavior: 'smooth' });
});


// ── Nav Contact Icons ─────────────────────────────────────────

const navContactTrigger = document.getElementById('nav-contact-trigger');
const navContactIcons   = document.getElementById('nav-contact-icons');

if (navContactTrigger && navContactIcons) {
  navContactTrigger.addEventListener('click', (e) => {
    e.preventDefault();
    const isOpen = navContactIcons.classList.toggle('open');
    // If icons are now closed, also scroll to contact section
    if (!isOpen) {
      document.querySelector('#contact')?.scrollIntoView({ behavior: 'smooth' });
    }
  });

  // Close icons when clicking anywhere outside the nav-contact-item
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.nav-contact-item')) {
      navContactIcons.classList.remove('open');
    }
  });
}


// ── Initialise on load ────────────────────────────────────────

window.addEventListener('load', () => {
  // Canvas
  setCanvasDimensions();
  clearCanvas.style.display = 'none';
  saveDrawing.style.display = 'none';

  // Restore dark mode *after* canvas dimensions are set so the
  // background fill uses the correct colour from the start.
  applyDarkMode(isMoon);

  // Intro playback (skipped in export mode)
  if (!isExportMode) playIntroDrawing();

  // Export button (only visible with ?export in URL)
  const exportBtn = document.querySelector('.export-drawing');
  if (exportBtn) {
    if (isExportMode) {
      exportBtn.style.display = 'block';
      console.log('Export mode active ✓');
    }
    exportBtn.addEventListener('click', () => {
      const json = JSON.stringify(recordedStrokes, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const a    = document.createElement('a');
      a.href     = URL.createObjectURL(blob);
      a.download = 'intro-drawing.json';
      a.click();
    });
  }

  // Teddy
  initTeddy();

  // Language slider — position synchronously before enabling the CSS transition,
  // so the pill appears instantly in the right spot on load (no slide-in jump).
  const activeLink = document.querySelector('.lang-switcher a.lang-active');
  if (activeLink) moveSlider(activeLink, false);
  // Enable CSS transition only after the position is painted.
  requestAnimationFrame(() => requestAnimationFrame(() => {
    if (langSlider) langSlider.classList.add('ready');
  }));

  // Portfolio initial render
  renderGrid('all');
  const initialActiveTab = document.querySelector('.portfolio-tab.active');
  if (initialActiveTab) {
    initialActiveTab.setAttribute('data-open', '');
    updateGridCorner(initialActiveTab);
  }
  requestAnimationFrame(() => {
    portfolioPanel.style.height = portfolioGrid.scrollHeight + 'px';
  });
});