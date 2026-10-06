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

// BUG FIX: on mobile browsers, `resize` doesn't only fire on real size
// changes — it also fires whenever the address bar hides/shows while
// scrolling, since that changes `window.innerHeight`. Recomputing --vh
// on every one of those events made .hero-intro (height: calc(var(--vh)
// * 100)) grow/shrink live mid-scroll, which looked like the hero text
// jumping up and down. Real resizes/rotations always change the width
// too, so only recompute when the width actually changed; orientation
// changes are still handled explicitly below.
let lastViewportWidth = window.innerWidth;
window.addEventListener('resize', () => {
  if (window.innerWidth !== lastViewportWidth) {
    lastViewportWidth = window.innerWidth;
    setViewportHeightVar();
  }
});
window.addEventListener('orientationchange', () => {
  lastViewportWidth = window.innerWidth;
  setViewportHeightVar();
});


// Take full control of scroll position on navigation. Without this, the
// browser's own automatic scroll restoration (on back/forward) can kick
// in *after* our own code has scrolled to the right spot and silently
// reset it back to wherever it remembers — which looks exactly like our
// scroll never happened at all.
if ('scrollRestoration' in history) {
  history.scrollRestoration = 'manual';
}


// ── DOM refs ──────────────────────────────────────────────────

const canvas      = document.querySelector('canvas');
const clearCanvas = document.querySelector('.clear-canvas');
const saveDrawing = document.querySelector('.save-drawing');
const ctx         = canvas.getContext('2d');


// ── Drawing state ─────────────────────────────────────────────

let isDrawing    = false;
let hasDrawn     = false;
const brushWidth = 2.5;

// Resolve initial draw colour from the current theme
// (nav.js has already applied body.dark from the saved theme at this point)
let selectedColor = document.body.classList.contains('dark') ? WHITE : GREEN;

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

// Finds the on-screen box of the single character closest to (x, y), so
// we can tell "clicking right on/next to a letter" apart from "clicking
// somewhere else nearby" — even within the same paragraph. Returns null
// if there's no text at all under the point.
const closestGlyphRect = (x, y) => {
  let range = null;
  if (document.caretRangeFromPoint) {
    range = document.caretRangeFromPoint(x, y);
  } else if (document.caretPositionFromPoint) {
    const pos = document.caretPositionFromPoint(x, y);
    if (pos && pos.offsetNode) {
      range = document.createRange();
      range.setStart(pos.offsetNode, pos.offset);
      range.setEnd(pos.offsetNode, pos.offset);
    }
  }
  if (!range || range.startContainer.nodeType !== Node.TEXT_NODE) return null;

  const textNode = range.startContainer;
  const offset = Math.min(range.startOffset, textNode.length - 1);
  if (offset < 0) return null;

  const charRange = document.createRange();
  charRange.setStart(textNode, offset);
  charRange.setEnd(textNode, offset + 1);
  return charRange.getClientRects()[0] || null;
};

// A few px of slack so clicking right beside a letter still counts as
// "on the text", without swallowing the blank space further away — e.g.
// the padding around a paragraph, or the gap between lines.
const TEXT_HIT_PADDING = 5;

const isNearText = (x, y) => {
  const rect = closestGlyphRect(x, y);
  if (!rect) return false;
  return (
    x >= rect.left - TEXT_HIT_PADDING && x <= rect.right + TEXT_HIT_PADDING &&
    y >= rect.top - TEXT_HIT_PADDING && y <= rect.bottom + TEXT_HIT_PADDING
  );
};

const isBlankSpace = (e) => {
  const x = e.clientX ?? e.touches?.[0]?.clientX;
  const y = e.clientY ?? e.touches?.[0]?.clientY;
  if (typeof x !== 'number' || typeof y !== 'number') return false;

  canvas.style.pointerEvents = 'none';
  const underlying = document.elementFromPoint(x, y);
  canvas.style.pointerEvents = 'auto';

  if (!underlying) return false;

  if (underlying.closest(
    'nav, .portfolio-item, .portfolio-image, .portfolio-info, ' +
    '.logo, .nav-links, .lang-switcher, a, footer, button'
  )) {
    return false;
  }

  // Otherwise fine to draw here — UNLESS the point is right on or next
  // to an actual letter, which should start a normal text selection.
  return !isNearText(x, y);
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

// Loads ONE random intro drawing. Every drawing lives in its own small
// file (drawings/desktop-<n>.js / mobile-<n>.js, written by
// bundle-drawings.js) and is pulled in with a <script> tag — that works
// without a server (file://) and means a visit only downloads one drawing,
// no matter how many exist. drawings-manifest.js tells us how many there
// are, so adding drawings only needs `node bundle-drawings.js` to be re-run.
const loadIntroDrawing = (isMobile) => new Promise((resolve) => {
  const kind  = isMobile ? 'mobile' : 'desktop';
  const count = (typeof DRAWINGS_MANIFEST !== 'undefined' && DRAWINGS_MANIFEST[kind]) || 0;
  if (!count) {
    console.warn('Intro drawing: no drawings-manifest.js found (or it lists 0 drawings for "' + kind +
                 '"). Run "node bundle-drawings.js" and upload drawings-manifest.js + the drawings/ folder.');
    resolve(null);
    return;
  }

  const script = document.createElement('script');
  script.src = `drawings/${kind}-${Math.floor(Math.random() * count)}.js`;
  script.onload = () => {
    const strokes = window.__introDrawing || null;
    if (!strokes) console.warn('Intro drawing: ' + script.src + ' loaded but contains no drawing.');
    delete window.__introDrawing;
    script.remove();
    resolve(strokes);
  };
  script.onerror = () => {
    console.warn('Intro drawing: could not load ' + script.src +
                 ' — is the drawings/ folder uploaded, and does the manifest match it?');
    script.remove();
    resolve(null);
  };
  document.head.appendChild(script);
});

const playIntroDrawing = async () => {
  let strokes = await loadIntroDrawing(window.innerWidth <= 768);

  // The file loads asynchronously — if the visitor already started drawing
  // in the meantime, don't play the intro over their strokes.
  if (hasDrawn) return;
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
        ctx.lineCap     = 'butt';
        ctx.lineJoin    = 'round';
        ctx.moveTo(pts[0].x * window.innerWidth, pts[0].y * window.innerHeight);

        strokeCtx.beginPath();
        strokeCtx.lineWidth   = brushWidth;
        strokeCtx.strokeStyle = '#000';
        strokeCtx.lineCap     = 'butt';
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
  ctx.lineCap     = 'butt';
  ctx.lineJoin    = 'round';

  // Stroke-only canvas (always draws in a normalised colour so we can recolour on theme swap)
  strokeCtx.beginPath();
  strokeCtx.moveTo(coords.x, coords.y);
  strokeCtx.lineWidth   = brushWidth;
  strokeCtx.strokeStyle = '#000'; // placeholder; redrawn in correct colour on theme swap
  strokeCtx.lineCap     = 'butt';
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
  // The canvas is empty again — bring the draw-hint back (it's only
  // hidden once the user actually starts drawing, see startDraw above).
  const drawHint = document.querySelector('.draw-hint');
  if (drawHint) drawHint.style.display = '';
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
      longPressActive = true;
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
  longPressActive = false;
  stopDrawing();
});


// ── Theme change: repaint background + recolour strokes ────────
// nav.js toggles body.dark and then calls this, so the canvas stays in
// sync with the theme (also runs once on page load).

window.__onThemeChange = (dark) => {
  const color = dark ? WHITE : GREEN;
  selectedColor = color;
  if (canvas.width === 0) return;

  setCanvasBackground();
  if ((hasDrawn || introVisible) && strokeCanvas.width > 0) {
    // Redraw the stored strokes in the new ink colour: tint a copy of the
    // stroke-only canvas (source-in keeps its alpha, replaces the colour).
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
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
};


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
let lastCategory   = 'all'; // remembered while the panel is closed, so "Projects" can reopen it

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
    // "loading=lazy" is intentionally NOT used here: every thumbnail in
    // this grid is already preloaded (see preloadCategoryImages) before
    // this function ever runs, so the browser has the bytes in hand —
    // lazy-loading would still withhold layout for off-screen rows until
    // they scroll into view, undoing the point of preloading them.
    const thumbImg    = thumb ? `<img src="${escapeHtml(thumb)}" alt="${title}">` : '';

    return `
      <a class="portfolio-item" href="project.html?id=${encodeURIComponent(item.slug)}" title="${title}">
        <div class="portfolio-item-inner"${innerStyle}>
          ${thumbImg}
          <div class="portfolio-item-tint"></div>
          <div class="portfolio-item-overlay">
            <span class="portfolio-item-title"><span class="portfolio-item-title-text">${title}</span></span>
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
    safeSession.set('lastPortfolioCategory', activeCategory || 'all');
    safeSession.set('lastScrollY', String(window.scrollY));
    safeSession.set('cameFromProject', '1');
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

// Preloads every thumbnail a category needs via throwaway Image() objects
// (pure network fetch + decode — nothing here touches the DOM), so that
// by the time the visible grid is actually swapped in, every image is
// already in the browser's cache and paints at its full size immediately.
// This is what stops switching category from visibly collapsing the
// panel and then re-opening it as thumbnails trickle in: the swap below
// only ever measures a grid whose images are already loaded, so the
// height only ever changes once, in one smooth step.
const preloadCategoryImages = (category) => {
  const items = portfolioData[category] || [];
  const srcs = items
    .map(item => (typeof PROJECTS !== 'undefined' && PROJECTS[item.slug] && PROJECTS[item.slug].hero && PROJECTS[item.slug].hero[0]) || null)
    .filter(Boolean);

  const loaders = srcs.map(src => new Promise(resolve => {
    const img = new Image();
    img.addEventListener('load', resolve, { once: true });
    img.addEventListener('error', resolve, { once: true });
    img.src = src;
  }));

  // Cap the wait so one slow or broken thumbnail can't delay switching
  // categories indefinitely — past this point we swap with whatever's
  // ready; syncPanelHeightWithImages() below still catches anything
  // that missed the window (it only ever grows the panel, which doesn't
  // move the current scroll position, so no jump either way).
  const timeout = new Promise(resolve => setTimeout(resolve, 600));

  return Promise.race([Promise.all(loaders), timeout]);
};

// Swaps the grid to `category`, but only once its thumbnails are already
// cached — the single entry point every tab/link that changes the active
// category goes through, so the "flush, then reveal" behaviour is
// consistent everywhere instead of being duplicated per call site.
// Returns the promise so callers can chain something (e.g. a scroll) onto
// "once the grid is actually showing the new category".
const updatePortfolioContent = (category) => {
  const wasOpen = portfolioPanel.classList.contains('open');

  return preloadCategoryImages(category).then(() => {
    renderGrid(category);
    if (!wasOpen) {
      openPanel();
    } else {
      refreshPanelHeight();
      syncPanelHeightWithImages();
    }
  });
};

// Marks `tab` as the active one and shows its category (desktop behaviour).
// Returns the promise from updatePortfolioContent so callers can chain a
// scroll onto "the grid is now showing".
const selectTab = (tab) => {
  portfolioTabs.forEach(t => { t.classList.remove('active'); t.removeAttribute('data-open'); });
  tab.classList.add('active');
  tab.setAttribute('data-open', '');
  activeCategory = tab.dataset.category;
  updateGridCorner(tab);
  return updatePortfolioContent(activeCategory);
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
        portfolioTabsContainer.classList.remove('mobile-open');
        portfolioTabsContainer.appendChild(tab);
        updatePortfolioContent(category);
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
      lastCategory   = activeCategory;
      activeCategory = null;
      return;
    }

    selectTab(tab);
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

// ── Nav "Projects" link — smooth scroll + ensure panel open ──
// (menu closing is handled generically by nav.js)

const navWorkLink = document.getElementById('nav-work-link');
if (navWorkLink) {
  navWorkLink.addEventListener('click', (e) => {
    e.preventDefault();
    const scrollToWork = () => document.getElementById('work')?.scrollIntoView({ behavior: 'smooth' });

    if (portfolioPanel.classList.contains('open')) {
      requestAnimationFrame(scrollToWork);
      return;
    }

    // The panel is closed (clicking the active tab closes it): reopen it
    // with the category that was showing, then scroll once it's rendered.
    //
    // The panel must reach its full height BEFORE we scroll: a smooth scroll
    // fixes its target when it starts, and while the panel is still
    // collapsed (or mid-animation) the page is too short to reach #work's
    // top — it would stop lower than when the panel was already open. So
    // open it without the height animation, scroll, then restore the
    // transition (same trick as the "returning from a project" path).
    const tab = document.querySelector(`.portfolio-tab[data-category="${lastCategory}"]`) || portfolioTabs[0];
    portfolioPanel.style.transition = 'none';
    selectTab(tab).then(() => {
      requestAnimationFrame(() => {
        scrollToWork();
        requestAnimationFrame(() => { portfolioPanel.style.transition = ''; });
      });
    });
  });
}


// ── Initialise on load ────────────────────────────────────────

window.addEventListener('load', () => {
  // Canvas
  setCanvasDimensions();
  clearCanvas.classList.remove('visible');
  saveDrawing.classList.remove('visible');

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


  // Portfolio initial render — if we're coming back from a project page,
  // restore the category the user had open before (instead of always
  // resetting to "All Projects") and land at the exact scroll position
  // they left from — not an approximation of it. Detected via a
  // sessionStorage flag set the moment a project thumbnail is clicked
  // (document.referrer is unreliable/empty for file:// pages, so it
  // can't be used here).
  const returningToWork  = safeSession.get('cameFromProject') === '1';
  safeSession.remove('cameFromProject');
  const restoredCategory = returningToWork ? safeSession.get('lastPortfolioCategory') : null;
  const restoredScrollY  = returningToWork ? Number(safeSession.get('lastScrollY')) : null;

  // Set by the "Projects" nav link on other pages (About, Impressum, Project)
  // right before navigating here — see nav.js for why a flag + JS
  // scroll is used instead of a '#work' URL fragment. Only relevant when we
  // AREN'T already doing the precise pixel-restore above.
  const scrollToWork = safeSession.get('scrollToWork') === '1';
  safeSession.remove('scrollToWork');
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
    if (scrollToWork) {
      requestAnimationFrame(() => {
        document.getElementById('work')?.scrollIntoView({ behavior: 'smooth' });
      });
    }
  }
});