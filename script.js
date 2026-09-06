// ── Constants ─────────────────────────────────────────────────

const GREEN = '#00906A';
const WHITE = '#F6F6F6';


// ── Mobile viewport height fix ──────────────────────────────────
// `100vh` on mobile browsers is unreliable: some measure the full
// screen height as if the address bar were already hidden, so
// bottom-anchored content (like .hero-intro's .draw-hint) can end up
// below what's actually visible on first load. CSS's newer `100svh`
// unit fixes this in most browsers, but support is inconsistent
// across Android browsers (e.g. some Samsung Internet versions).
// This sets a `--vh` custom property from the actual measured
// `window.innerHeight`, which every browser reports correctly — used
// in styles.css as `height: calc(var(--vh, 1vh) * 100)` for the
// most reliable result across devices. Re-run on resize/orientation
// change so it also stays correct if the address bar shows/hides.

const setViewportHeightVar = () => {
  document.documentElement.style.setProperty('--vh', `${window.innerHeight * 0.01}px`);
};
setViewportHeightVar();
window.addEventListener('resize', setViewportHeightVar);
window.addEventListener('orientationchange', setViewportHeightVar);


// Take full control of scroll position on navigation. Without this, the
// browser's own automatic scroll restoration (on back/forward) can kick
// in *after* our own code has scrolled to the right spot and silently
// reset it back to wherever it remembers — which looks exactly like our
// scroll never happened at all.
if ('scrollRestoration' in history) {
  history.scrollRestoration = 'manual';
}


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
    // Don't close menu for contact trigger or lang switcher
    if (link.id === 'nav-contact-trigger') return;
    if (link.closest('.lang-switcher')) return;
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

// Offscreen canvas that holds ONLY the user's strokes (transparent bg).
// On theme-switch we repaint the main canvas background and composite
// these strokes on top in the new ink colour — no colour corruption.
const strokeCanvas = document.createElement('canvas');
const strokeCtx    = strokeCanvas.getContext('2d');

const syncStrokeCanvas = () => {
  strokeCanvas.width  = canvas.width;
  strokeCanvas.height = canvas.height;
};


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
let introVisible   = false; // true while intro drawing is on canvas (playing OR finished)
let introAnimFrame = null;

const fadeOutIntro = () => {
  if (!introVisible) return;
  introPlaying = false;
  introVisible = false;
  cancelAnimationFrame(introAnimFrame);
  // Clear the strokeCanvas so intro strokes don't mix with user strokes
  strokeCtx.clearRect(0, 0, strokeCanvas.width, strokeCanvas.height);
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
  introVisible = true;

  // Mirror intro strokes onto strokeCanvas so theme switches can re-tint them.
  syncStrokeCanvas();
  strokeCtx.clearRect(0, 0, strokeCanvas.width, strokeCanvas.height);

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
    strokeCtx.setTransform(dpr, 0, 0, dpr, 0, 0);

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

        strokeCtx.beginPath();
        strokeCtx.lineWidth   = brushWidth;
        strokeCtx.strokeStyle = '#000';
        strokeCtx.lineCap     = 'round';
        strokeCtx.lineJoin    = 'round';
        strokeCtx.moveTo(pts[0].x * window.innerWidth, pts[0].y * window.innerHeight);
        i = 0;
      }

      while (i >= 0 && i < pts.length - 1 && pts[i + 1].t <= elapsed) {
        ctx.lineTo(pts[i + 1].x * window.innerWidth, pts[i + 1].y * window.innerHeight);
        ctx.stroke();
        strokeCtx.lineTo(pts[i + 1].x * window.innerWidth, pts[i + 1].y * window.innerHeight);
        strokeCtx.stroke();
        i++;
      }

      drawnUpTo[si] = i;
    });

    if (elapsed < totalDuration) {
      introAnimFrame = requestAnimationFrame(draw);
    } else {
      introPlaying = false;
      // introVisible stays true — content is still on canvas until user draws
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
    syncStrokeCanvas();
    clearCanvas.classList.add('visible');
    saveDrawing.classList.add('visible');
    const drawHint = document.querySelector('.draw-hint');
    if (drawHint) drawHint.style.display = 'none';
  }

  const dpr    = window.devicePixelRatio || 1;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  strokeCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const coords = getCoordinates(e);
  recordPoint('start', coords.x, coords.y);

  // Main canvas
  ctx.beginPath();
  ctx.moveTo(coords.x, coords.y);
  ctx.lineWidth   = brushWidth;
  ctx.strokeStyle = selectedColor;
  ctx.lineCap     = 'round';
  ctx.lineJoin    = 'round';

  // Stroke-only canvas (always draws in a normalised colour so we can recolour on theme swap)
  strokeCtx.beginPath();
  strokeCtx.moveTo(coords.x, coords.y);
  strokeCtx.lineWidth   = brushWidth;
  strokeCtx.strokeStyle = '#000'; // placeholder; redrawn in correct colour on theme swap
  strokeCtx.lineCap     = 'round';
  strokeCtx.lineJoin    = 'round';
};

const drawing = (e) => {
  if (!isDrawing) return;
  e.preventDefault();
  const coords = getCoordinates(e);
  recordPoint('move', coords.x, coords.y);
  ctx.lineTo(coords.x, coords.y);
  ctx.stroke();
  strokeCtx.lineTo(coords.x, coords.y);
  strokeCtx.stroke();
};

const stopDrawing = () => {
  isDrawing = false;
};

// Finds the pixel bounding box of the user's strokes on the (transparent-bg)
// strokeCanvas, so "Save Drawing" can crop away the empty surrounding area.
const getStrokeBoundingBox = () => {
  const w = strokeCanvas.width, h = strokeCanvas.height;
  if (!w || !h) return null;
  const data = strokeCtx.getImageData(0, 0, w, h).data;
  let minX = w, minY = h, maxX = -1, maxY = -1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (data[(y * w + x) * 4 + 3] > 10) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX < 0) return null;
  return { minX, minY, maxX, maxY };
};

clearCanvas.addEventListener('click', () => {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  setCanvasBackground();
  strokeCtx.clearRect(0, 0, strokeCanvas.width, strokeCanvas.height);
  hasDrawn = false;
  clearCanvas.classList.remove('visible');
  saveDrawing.classList.remove('visible');
});

saveDrawing.addEventListener('click', () => {
  const dpr  = window.devicePixelRatio || 1;
  const pad  = 24 * dpr; // small margin around the drawing
  const bbox = getStrokeBoundingBox();

  let sx = 0, sy = 0, sw = canvas.width, sh = canvas.height;
  if (bbox) {
    sx = Math.max(0, bbox.minX - pad);
    sy = Math.max(0, bbox.minY - pad);
    sw = Math.min(canvas.width,  bbox.maxX + pad) - sx;
    sh = Math.min(canvas.height, bbox.maxY + pad) - sy;
  }

  const out = document.createElement('canvas');
  out.width  = sw;
  out.height = sh;
  out.getContext('2d').drawImage(canvas, sx, sy, sw, sh, 0, 0, sw, sh);

  const link    = document.createElement('a');
  link.download = `drawing-${Date.now()}.jpg`;
  link.href     = out.toDataURL('image/jpeg');
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
    path.addEventListener('click',      () => window.open('https://youtu.be/nMmstND8BKY', '_blank', 'noopener'));
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


// ── Hide nav on scroll (homepage) ───────────────────────────────
// Same accumulator approach as project-nav.js (survives very slow
// scrolling), but only takes effect once scrolling would carry the nav
// over the showcase — while still inside the hero section, the nav
// always stays visible.

let lastScrollY   = window.scrollY;
let scrollAccum   = 0;
let scrollDir     = 0; // 1 = down, -1 = up
const HIDE_THRESHOLD = 40;
const SHOW_THRESHOLD = 10;

const getWorkOffsetTop = () => document.getElementById('work')?.offsetTop ?? Infinity;

window.addEventListener('scroll', () => {
  const nav = document.querySelector('nav');
  if (!nav) return;

  const currentY = window.scrollY;
  const delta = currentY - lastScrollY;
  lastScrollY = currentY;
  if (delta === 0) return;

  const dir = delta > 0 ? 1 : -1;
  if (dir !== scrollDir) {
    scrollDir   = dir;
    scrollAccum = 0;
  }
  scrollAccum += Math.abs(delta);

  // Still within the hero (hasn't reached the showcase yet) → nav always visible.
  if (currentY < getWorkOffsetTop()) {
    nav.classList.remove('nav-hidden');
    return;
  }

  if (dir === 1 && scrollAccum > HIDE_THRESHOLD) {
    nav.classList.add('nav-hidden');
    if (hamburger && navLinks) {
      hamburger.classList.remove('active');
      navLinks.classList.remove('active');
    }
  }
  if (dir === -1 && scrollAccum > SHOW_THRESHOLD) {
    nav.classList.remove('nav-hidden');
  }
}, { passive: true });


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

  if (canvas.width > 0) {
    setCanvasBackground();
    if ((hasDrawn || introVisible) && strokeCanvas.width > 0) {
      // Redraw the stored strokes in the new ink colour
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 1;
      // Tint the stroke canvas by drawing it through a colour filter:
      // draw strokes onto a temp canvas filled with new ink colour using destination-in
      const tinted = document.createElement('canvas');
      tinted.width  = strokeCanvas.width;
      tinted.height = strokeCanvas.height;
      const tc = tinted.getContext('2d');
      tc.drawImage(strokeCanvas, 0, 0);
      tc.globalCompositeOperation = 'source-in';
      tc.fillStyle = color;
      tc.fillRect(0, 0, tinted.width, tinted.height);
      ctx.drawImage(tinted, 0, 0);
      ctx.restore();
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
    { title: '(most) humans',   slug: 'most-humans',   category: 'graphic-design' },
  ],
  animation: [
    { title: 'Washed Out',      slug: 'washed-out',    category: 'animation' },
  ],
  'paintings-drawings': [
    { title: '105 7336',              slug: '105-7336',              category: 'paintings-drawings' },
    { title: 'Interspaces',           slug: 'interspaces',           category: 'paintings-drawings' },
    { title: 'Holzschnitte',          slug: 'holzschnitte',          category: 'paintings-drawings' },
    { title: 'Sketches',              slug: 'sketches',              category: 'paintings-drawings' },
  ],
};

const portfolioData = {
  ...portfolioCategories,
  all: Object.values(portfolioCategories).flat(),
};


// Escapes text before it's interpolated into an innerHTML template string.
// portfolioCategories/PROJECTS are static, developer-controlled data today,
// so this isn't fixing a live exploit — but renderGrid() builds raw HTML
// strings from these values, and escaping them costs nothing while
// preventing markup injection if titles/paths ever come from an editable
// source (CMS, JSON import, etc.) down the line.
const escapeHtml = (str) => String(str).replace(/[&<>"']/g, (c) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
}[c]));


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
    // The poster (first hero image) is used as the showcase thumbnail, if present
    const heroArr = (typeof PROJECTS !== 'undefined' && PROJECTS[item.slug] && PROJECTS[item.slug].hero) || [];
    const thumb   = heroArr[0] || null;

    // With a real thumbnail, the tile's height follows the image's own
    // aspect ratio (no cropping). Without one, fall back to the varied
    // placeholder ratio so the masonry grid still looks lively.
    const title = escapeHtml(item.title);
    const innerStyle = thumb ? '' : ` style="padding-top:${ratio}"`;
    const thumbImg    = thumb ? `<img src="${escapeHtml(thumb)}" alt="${title}" loading="lazy">` : '';

    return `
      <a class="portfolio-item" href="project.html?id=${encodeURIComponent(item.slug)}" title="${title}">
        <div class="portfolio-item-inner"${innerStyle}>
          ${thumbImg}
          <div class="portfolio-item-overlay">
            <span class="portfolio-item-title">${title}</span>
          </div>
        </div>
      </a>
    `;
  }).join('');
};

const openPanel = () => {
  portfolioPanel.style.height = portfolioGrid.scrollHeight + 'px';
  portfolioPanel.classList.add('open');
  syncPanelHeightWithImages();
};

// Remember which category was active and exactly how far the user had
// scrolled when they open a project, so coming back restores both —
// the precise scroll position, not just an approximation of it.
portfolioGrid.addEventListener('click', (e) => {
  if (e.target.closest('.portfolio-item')) {
    sessionStorage.setItem('lastPortfolioCategory', activeCategory || 'all');
    sessionStorage.setItem('lastScrollY', String(window.scrollY));
    sessionStorage.setItem('cameFromProject', '1');
  }
});

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

// Thumbnail <img> tags have no explicit width/height, so the browser
// reserves no space for them until they've actually loaded — a height
// measured right after renderGrid() is therefore too small and the
// panel (which has overflow: hidden) clips the bottom rows once the
// images pop in. Rather than watching continuously (a ResizeObserver
// here fights the open/close CSS transition and causes jumpy height
// changes), we wait once for every image in the grid to finish
// loading (or fail) and correct the height a single time after that —
// deterministic, and never touches the height mid-transition.
let heightSafetyTimer1 = null;
let heightSafetyTimer2 = null;

const syncPanelHeightWithImages = () => {
  const imgs = Array.from(portfolioGrid.querySelectorAll('img'));
  const pending = imgs.filter(img => !img.complete);

  // Safety net (mainly for mobile): even when every image fires load/error,
  // a slow or flaky connection can mean the browser hasn't finished
  // reflowing everything by the time our Promise.all resolves, or an image
  // silently stalls without ever firing either event. Re-run the height
  // correction a couple more times shortly after so the panel can never
  // get stuck showing a too-small height (looks like the showcase being
  // cut off). Cheap and idempotent — it just re-measures and re-applies.
  clearTimeout(heightSafetyTimer1);
  clearTimeout(heightSafetyTimer2);
  heightSafetyTimer1 = setTimeout(refreshPanelHeight, 400);
  heightSafetyTimer2 = setTimeout(refreshPanelHeight, 1200);

  if (!pending.length) return;

  Promise.all(pending.map(img => new Promise(resolve => {
    img.addEventListener('load', resolve, { once: true });
    img.addEventListener('error', resolve, { once: true });
  }))).then(refreshPanelHeight);
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
        else { refreshPanelHeight(); syncPanelHeightWithImages(); }
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
    else { refreshPanelHeight(); syncPanelHeightWithImages(); }
  });
});

// Recompute the panel height on resize/orientation change too — e.g.
// rotating the phone changes the column count (1 col portrait vs more
// columns landscape), which changes the grid's real height.
let resizeHeightTimer = null;
window.addEventListener('resize', () => {
  clearTimeout(resizeHeightTimer);
  resizeHeightTimer = setTimeout(refreshPanelHeight, 150);
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
  else { refreshPanelHeight(); syncPanelHeightWithImages(); }

  document.querySelector('#work')?.scrollIntoView({ behavior: 'smooth' });
});


// ── Nav "Projects" link — smooth scroll + ensure panel open ──

const navWorkLink = document.getElementById('nav-work-link');
if (navWorkLink) {
  navWorkLink.addEventListener('click', (e) => {
    e.preventDefault();
    // Make sure the portfolio panel is open
    if (!portfolioPanel.classList.contains('open')) {
      const activeTab = document.querySelector('.portfolio-tab.active');
      if (activeTab) {
        activeTab.setAttribute('data-open', '');
        renderGrid(activeCategory || 'all');
        openPanel();
      }
    }
    // Close mobile menu if open
    hamburger.classList.remove('active');
    navLinks.classList.remove('active');
    clearCanvas.style.visibility = '';
    saveDrawing.style.visibility = '';
    // Smooth scroll
    requestAnimationFrame(() => {
      document.getElementById('work')?.scrollIntoView({ behavior: 'smooth' });
    });
  });
}


// ── Nav Contact Icons ─────────────────────────────────────────

const navContactTrigger = document.getElementById('nav-contact-trigger');
const navContactIcons   = document.getElementById('nav-contact-icons');

if (navContactTrigger && navContactIcons) {
  navContactTrigger.addEventListener('click', (e) => {
    e.preventDefault();
    navContactIcons.classList.toggle('open');
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
  clearCanvas.classList.remove('visible');
  saveDrawing.classList.remove('visible');

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

  // Portfolio initial render — if we're coming back from a project page,
  // restore the category the user had open before (instead of always
  // resetting to "All Projects") and land at the exact scroll position
  // they left from — not an approximation of it. Detected via a
  // sessionStorage flag set the moment a project thumbnail is clicked
  // (document.referrer is unreliable/empty for file:// pages, so it
  // can't be used here).
  const returningToWork  = sessionStorage.getItem('cameFromProject') === '1';
  sessionStorage.removeItem('cameFromProject');
  const restoredCategory = returningToWork ? sessionStorage.getItem('lastPortfolioCategory') : null;
  const restoredScrollY  = returningToWork ? Number(sessionStorage.getItem('lastScrollY')) : null;
  const initialCategory  = (restoredCategory && portfolioData[restoredCategory]) ? restoredCategory : 'all';

  if (initialCategory !== 'all') {
    portfolioTabs.forEach(t => { t.classList.remove('active'); t.removeAttribute('data-open'); });
    document.querySelector(`.portfolio-tab[data-category="${initialCategory}"]`)?.classList.add('active');
  }
  activeCategory = initialCategory;

  renderGrid(initialCategory);
  const initialActiveTab = document.querySelector('.portfolio-tab.active');
  if (initialActiveTab) {
    initialActiveTab.setAttribute('data-open', '');
    updateGridCorner(initialActiveTab);
  }

  if (returningToWork) {
    // Skip the open animation entirely and jump straight to the exact
    // pixel position the user scrolled from before opening the project.
    portfolioPanel.style.transition = 'none';
    openPanel();
    const restoreScroll = () => window.scrollTo(0, restoredScrollY || 0);
    restoreScroll();
    requestAnimationFrame(() => requestAnimationFrame(() => {
      portfolioPanel.style.transition = '';
      restoreScroll();
      // Reveal the page now that it's positioned correctly (see the
      // inline head script that hid it to avoid a flash/jump).
      document.documentElement.classList.remove('restoring-scroll');
    }));
    // Safety net: re-assert the position shortly after, in case anything
    // (e.g. a late browser scroll-restore, or images finishing loading
    // and shifting layout) moved it back in the meantime.
    setTimeout(restoreScroll, 60);
    setTimeout(restoreScroll, 250);
  } else {
    requestAnimationFrame(() => {
      portfolioPanel.style.height = portfolioGrid.scrollHeight + 'px';
      syncPanelHeightWithImages();
    });
  }
});