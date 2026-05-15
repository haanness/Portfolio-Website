const hamburger = document.getElementById('hamburger');
const navLinks = document.getElementById('nav-links');

const canvas = document.querySelector("canvas"),
clearCanvas = document.querySelector(".clear-canvas"),
saveDrawing = document.querySelector(".save-drawing"),
ctx = canvas.getContext("2d");

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

let prevMouseX, prevMouseY, snapshot,
isDrawing = false,
hasDrawn = false,
brushWidth = 2,
selectedColor = "#00906A";

const getCoordinates = (e) => {
  const rect = canvas.getBoundingClientRect();
  const x = (e.clientX || e.touches?.[0]?.clientX) - rect.left;
  const y = (e.clientY || e.touches?.[0]?.clientY) - rect.top;
  return { x, y };
};

const setCanvasDimensions = () => {
  const dpr = window.devicePixelRatio || 1;
  const width = window.innerWidth;
  const height = document.body.offsetHeight;

  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  canvas.width = width * dpr;
  canvas.height = height * dpr;

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  setCanvasBackground();
};

const setCanvasBackground = () => {
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = selectedColor;
};

const isBlankSpace = (e) => {
  const x = e.clientX || e.touches?.[0]?.clientX;
  const y = e.clientY || e.touches?.[0]?.clientY;
  if (typeof x !== "number" || typeof y !== "number") return false;

  canvas.style.pointerEvents = "none";
  const underlying = document.elementFromPoint(x, y);
  canvas.style.pointerEvents = "auto";

  if (!underlying) return false;
  return !underlying.closest(
    "nav, .portfolio-item, .portfolio-image, .portfolio-info, .logo, .nav-links, .lang-switcher, a, footer, button, img"
  );
};

window.addEventListener("load", () => {
  setCanvasDimensions();
  clearCanvas.style.display = "none";
  saveDrawing.style.display = "none";
});

window.addEventListener("resize", () => {
  setCanvasDimensions();
});

const startDraw = (e) => {
  if (!isBlankSpace(e)) return;
  e.preventDefault();
  isDrawing = true;
  if (!hasDrawn) {
    hasDrawn = true;
    clearCanvas.style.display = "block";
    saveDrawing.style.display = "block";
  }
  const coords = getCoordinates(e);
  prevMouseX = coords.x;
  prevMouseY = coords.y;
  ctx.beginPath();
  ctx.moveTo(coords.x, coords.y);
  ctx.lineWidth = brushWidth;
  ctx.strokeStyle = selectedColor;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
};

const drawing = (e) => {
  if (!isDrawing) return;
  e.preventDefault();
  const coords = getCoordinates(e);
  ctx.lineTo(coords.x, coords.y);
  ctx.stroke();
};

const stopDrawing = () => {
  isDrawing = false;
};

clearCanvas.addEventListener("click", () => {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  setCanvasBackground();
  hasDrawn = false;
  clearCanvas.style.display = "none";
  saveDrawing.style.display = "none";
});

saveDrawing.addEventListener("click", () => {
  const link = document.createElement("a");
  link.download = `drawing-${Date.now()}.jpg`;
  link.href = canvas.toDataURL("image/jpeg");
  link.click();
});

const pointerDown = (e) => startDraw(e);
const pointerMove = (e) => drawing(e);

document.addEventListener("mousedown", pointerDown);
document.addEventListener("mousemove", pointerMove);
document.addEventListener("mouseup", stopDrawing);

document.addEventListener("touchstart", pointerDown, { passive: false });
document.addEventListener("touchmove", pointerMove, { passive: false });
document.addEventListener("touchend", stopDrawing);

canvas.style.touchAction = "none";

// ── Language switcher ─────────────────────────────────────────────────────────

const langLinks = document.querySelectorAll('.lang-switcher a');
const langSlider = document.querySelector('.lang-slider');

const moveSlider = (link) => {
  langSlider.style.width = link.offsetWidth + 'px';
  langSlider.style.transform = `translateX(${link.offsetLeft}px)`;
};

// Init slider on active link
const initActive = document.querySelector('.lang-switcher a.lang-active');
if (initActive) moveSlider(initActive);

langLinks.forEach(link => {
  link.addEventListener('click', (e) => {
    e.preventDefault();
    langLinks.forEach(l => l.classList.remove('lang-active'));
    link.classList.add('lang-active');
    moveSlider(link);
  });
});

// ── Sun / Moon toggle ─────────────────────────────────────────────────────────

let isMoon = false;

const sunIcons = [
  document.getElementById('theme-icon'),
  document.getElementById('theme-icon-desktop')
];

const sunContent = `
  <circle cx="12" cy="12" r="4" fill="#00906A" style="transition: r 0.35s ease;"/>
  <g style="transition: opacity 0.25s ease;">
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

sunIcons.forEach(icon => { icon.innerHTML = sunContent; });

const toggleSun = () => {
  isMoon = !isMoon;
  sunIcons.forEach(icon => {
    const circle = icon.querySelector('circle');
    const rays = icon.querySelector('g');
    if (isMoon) {
      rays.style.transition = 'opacity 0.2s ease';
      rays.style.opacity = '0';
      circle.setAttribute('r', '10');
      circle.style.transition = 'r 0.35s ease';
    } else {
      circle.setAttribute('r', '4');
      circle.style.transition = 'r 0.35s ease';
      rays.style.transition = 'opacity 0.35s ease 0.1s';
      rays.style.opacity = '1';
    }
  });
};

sunIcons.forEach(icon => icon.addEventListener('click', toggleSun));