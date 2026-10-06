// canvas-draw.js — Drawing canvas for subpages (About, Impressum, Project, …)
//
// Same drawing engine as the homepage (script.js), but WITHOUT the intro
// drawing playback: the canvas simply starts blank and the user can draw
// right away. Uses the same markup/CSS classes as index.html
// (.canvas-layer, .tools-board, .clear-canvas, .save-drawing) so nothing
// about the page layout changes.
//
// Needs GREEN / WHITE from common.js, and nav.js (loaded BEFORE this file)
// to call window.__onThemeChange(dark) after every theme switch.

(function () {
  const canvas = document.querySelector('.canvas-layer canvas');
  if (!canvas) return; // page has no canvas layer

  const clearCanvasBtn = document.querySelector('.clear-canvas');
  const saveDrawingBtn = document.querySelector('.save-drawing');
  if (!clearCanvasBtn || !saveDrawingBtn) return;

  const ctx = canvas.getContext('2d');

  // ── Drawing state ─────────────────────────────────────────────

  let isDrawing = false;
  let hasDrawn  = false;
  const brushWidth = 2.5;

  let selectedColor = document.body.classList.contains('dark') ? WHITE : GREEN;

  // Offscreen canvas holding ONLY the user's strokes (transparent bg).
  // Used to (a) recolour strokes on theme switch and (b) find the
  // bounding box of the drawing so "Save Drawing" can auto-crop.
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

  const isDark = () => document.body.classList.contains('dark');

  const setCanvasBackground = () => {
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = isDark() ? GREEN : WHITE;
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
    canvas.width         = width  * dpr;
    canvas.height        = height * dpr;
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
      setCanvasDimensions();
    }
  });
  bodyResizeObserver.observe(document.body);

  // ── Hit-test: only draw over blank areas ──────────────────────

  // Finds the on-screen box of the single character closest to (x, y),
  // so we can tell "clicking right on/next to a letter" apart from
  // "clicking somewhere else nearby" — even within the same paragraph.
  // Returns null if there's no text at all under the point.
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
  // "on the text", without swallowing the blank space further away —
  // e.g. the padding around a paragraph, or the gap between lines.
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
      'nav, .logo, .nav-links, .lang-switcher, a, footer, button, .project-hero-slideshow'
    )) {
      return false;
    }

    // Otherwise fine to draw here — UNLESS the point is right on or next
    // to an actual letter, which should start a normal text selection.
    return !isNearText(x, y);
  };

  // ── Drawing ───────────────────────────────────────────────────

  const startDraw = (e) => {
    if (!isBlankSpace(e)) return;
    e.preventDefault();
    isDrawing = true;

    if (!hasDrawn) {
      hasDrawn = true;
      syncStrokeCanvas();
      clearCanvasBtn.classList.add('visible');
      saveDrawingBtn.classList.add('visible');
    }

    const dpr = window.devicePixelRatio || 1;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    strokeCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const coords = getCoordinates(e);

    ctx.beginPath();
    ctx.moveTo(coords.x, coords.y);
    ctx.lineWidth   = brushWidth;
    ctx.strokeStyle = selectedColor;
    ctx.lineCap     = 'butt';
    ctx.lineJoin    = 'round';

    strokeCtx.beginPath();
    strokeCtx.moveTo(coords.x, coords.y);
    strokeCtx.lineWidth   = brushWidth;
    strokeCtx.strokeStyle = '#000'; // placeholder colour, recoloured on theme swap
    strokeCtx.lineCap     = 'butt';
    strokeCtx.lineJoin    = 'round';
  };

  const drawing = (e) => {
    if (!isDrawing) return;
    e.preventDefault();
    const coords = getCoordinates(e);
    ctx.lineTo(coords.x, coords.y);
    ctx.stroke();
    strokeCtx.lineTo(coords.x, coords.y);
    strokeCtx.stroke();
  };

  const stopDrawing = () => { isDrawing = false; };

  // ── Bounding box of the drawing (for auto-crop on save) ────────

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

  clearCanvasBtn.addEventListener('click', () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setCanvasBackground();
    strokeCtx.clearRect(0, 0, strokeCanvas.width, strokeCanvas.height);
    hasDrawn = false;
    clearCanvasBtn.classList.remove('visible');
    saveDrawingBtn.classList.remove('visible');
  });

  saveDrawingBtn.addEventListener('click', () => {
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

  // ── Input: unified Pointer Events (mouse, pen/stylus, touch) ───
  //
  // Mouse and touch used to be handled through two completely separate
  // listener sets. Pen/stylus input (e.g. Wacom tablets, pen displays,
  // Windows Ink) is often reported by the browser as touch-like pointer
  // events rather than real "mouse" events. That routed the pen through
  // the touch-only long-press logic below, which intentionally delays
  // drawing by 120ms to distinguish a finger-scroll from a finger-draw
  // on touchscreens. A pen naturally starts moving the instant it
  // touches down, so that movement cancelled the long-press timer
  // before drawing ever started — the pen looked like it "didn't work".
  //
  // Pointer Events give every input device a `pointerType` ('mouse',
  // 'pen', or 'touch'), so we can keep the long-press behaviour for
  // real finger touches only, while mouse and pen draw immediately.

  let longPressTimer  = null;
  let touchMoved      = false;
  let longPressActive = false;

  document.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'touch') {
      touchMoved      = false;
      longPressActive = false;

      longPressTimer = setTimeout(() => {
        if (!touchMoved && isBlankSpace(e)) {
          longPressActive = true;
          startDraw(e);
        }
      }, 120);
    } else {
      // Mouse or pen/stylus: draw immediately, no long-press delay.
      startDraw(e);
    }
  });

  document.addEventListener('pointermove', (e) => {
    if (e.pointerType === 'touch') {
      if (longPressActive) {
        e.preventDefault();
        drawing(e);
      } else {
        clearTimeout(longPressTimer);
        touchMoved = true;
      }
    } else {
      drawing(e);
    }
  }, { passive: false });

  document.addEventListener('pointerup', (e) => {
    if (e.pointerType === 'touch') {
      clearTimeout(longPressTimer);
      longPressActive = false;
    }
    stopDrawing();
  });

  document.addEventListener('pointercancel', () => {
    clearTimeout(longPressTimer);
    longPressActive = false;
    stopDrawing();
  });

  // ── Dark mode: repaint background + recolour strokes ──────────
  // nav.js calls window.__onThemeChange(dark) right after it
  // toggles body.dark, so the canvas stays in sync with the theme switch.

  window.__onThemeChange = (dark) => {
    selectedColor = dark ? WHITE : GREEN;
    if (canvas.width === 0) return;

    setCanvasBackground();
    if (hasDrawn && strokeCanvas.width > 0) {
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
      tc.fillStyle = selectedColor;
      tc.fillRect(0, 0, tinted.width, tinted.height);
      ctx.drawImage(tinted, 0, 0);
      ctx.restore();
    }
  };

  // ── Initialise ─────────────────────────────────────────────────
  // No intro drawing here — canvas starts blank.

  window.addEventListener('load', () => {
    setCanvasDimensions();
    clearCanvasBtn.classList.remove('visible');
    saveDrawingBtn.classList.remove('visible');
  });
})();