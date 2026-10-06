// nav.js — navigation behaviour shared by EVERY page (home + subpages):
// hamburger menu, About popup, contact icons, sun/moon theme toggle and
// hide-on-scroll. Needs common.js (GREEN, WHITE, safeLocal, safeSession).
//
// Load with `defer`, and BEFORE script.js / canvas-draw.js on pages that
// have a drawing canvas — they hook into window.__onThemeChange, which
// this file calls after every theme change.
//
// The language switcher (pill position + clicks) lives in i18n.js.

(function () {
  const nav       = document.querySelector('nav');
  const hamburger = document.getElementById('hamburger');
  const navLinks  = document.getElementById('nav-links');


  // ── Theme: apply immediately to prevent a flash ──────────────

  let isMoon = safeLocal.get('theme') === 'dark';
  if (isMoon) document.body.classList.add('dark');


  // ── Hamburger ────────────────────────────────────────────────
  // The Clear/Save buttons (only present on pages with a canvas) are
  // hidden while the mobile menu is open.

  const setToolButtonsHidden = (hidden) => {
    document.querySelectorAll('.clear-canvas, .save-drawing').forEach(btn => {
      btn.style.visibility = hidden ? 'hidden' : '';
    });
  };

  const closeMenu = () => {
    if (hamburger) hamburger.classList.remove('active');
    if (navLinks)  navLinks.classList.remove('active');
    setToolButtonsHidden(false);
  };

  if (hamburger && navLinks) {
    hamburger.addEventListener('click', () => {
      hamburger.classList.toggle('active');
      navLinks.classList.toggle('active');
      setToolButtonsHidden(navLinks.classList.contains('active'));
    });

    navLinks.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        // Don't close the menu when clicking the contact trigger or lang switcher
        if (link.id === 'nav-contact-trigger') return;
        if (link.closest('.lang-switcher')) return;
        closeMenu();
      });
    });
  }

  // Lets page scripts (e.g. script.js) close the menu themselves.
  window.siteNav = { closeMenu };


  // ── "Projects" link on subpages — hand off a smooth scroll to the home page ──
  // A '#work' URL fragment would make the browser jump there natively the
  // instant index.html starts loading — before its JS has rendered the
  // portfolio grid or opened the panel. Setting this flag instead lets the
  // home page do one single, deliberate smooth scroll once it's ready.
  // (On the home page itself, script.js owns this link.)

  const navWorkLink = document.getElementById('nav-work-link');
  if (navWorkLink && !document.getElementById('portfolio-panel')) {
    navWorkLink.addEventListener('click', () => {
      safeSession.set('scrollToWork', '1');
      // No preventDefault: the link still navigates to index.html normally.
    });
  }


  // ── About popup ──────────────────────────────────────────────

  const navAboutLink      = document.getElementById('nav-about-link');
  const aboutModalOverlay = document.getElementById('about-modal-overlay');
  const aboutModalClose   = document.getElementById('about-modal-close');

  if (navAboutLink && aboutModalOverlay && aboutModalClose) {
    const closeAboutModal = () => aboutModalOverlay.classList.remove('open');

    navAboutLink.addEventListener('click', (e) => {
      e.preventDefault();
      closeMenu();
      aboutModalOverlay.classList.add('open');
    });

    aboutModalClose.addEventListener('click', closeAboutModal);

    // Click on the dark backdrop (but not the modal box itself) closes it
    aboutModalOverlay.addEventListener('click', (e) => {
      if (e.target === aboutModalOverlay) closeAboutModal();
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && aboutModalOverlay.classList.contains('open')) {
        closeAboutModal();
      }
    });
  }


  // ── Contact icons ────────────────────────────────────────────

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


  // ── Sun / Moon toggle ────────────────────────────────────────

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

  const applyDarkMode = (dark) => {
    document.body.classList.toggle('dark', dark);
    // The anti-flash class set by the inline <head> script is only needed
    // until body.dark takes over; left in place it would keep forcing the
    // green background/light text even after switching back to light mode.
    document.documentElement.classList.remove('dark-loading');

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

    // Let a page-level canvas script (script.js / canvas-draw.js) repaint
    // and recolour its drawing canvas.
    if (typeof window.__onThemeChange === 'function') window.__onThemeChange(dark);
  };

  const toggleSun = () => {
    isMoon = !isMoon;
    safeLocal.set('theme', isMoon ? 'dark' : 'light');
    applyDarkMode(isMoon);
  };

  // Render icon content immediately (before the load event) and apply the
  // moon state right away so there's no sun→moon flash.
  sunIcons.forEach(icon => {
    const color = isMoon ? WHITE : GREEN;
    icon.setAttribute('stroke', color);
    icon.innerHTML = buildSunContent(color);
    if (isMoon) {
      requestAnimationFrame(() => {
        const rays   = icon.querySelector('g');
        const circle = icon.querySelector('circle');
        if (rays)   { rays.style.transition = 'none'; rays.style.opacity = '0'; }
        if (circle) { circle.setAttribute('r', '10'); }
      });
    }
    icon.addEventListener('click', toggleSun);
  });

  window.addEventListener('load', () => applyDarkMode(isMoon));


  // ── Hide nav on scroll ───────────────────────────────────────
  // A very slow scroll fires many events with a tiny delta each (often
  // < 1px), so reacting to a single event's delta almost never crosses a
  // threshold. Instead we accumulate the distance travelled in the current
  // direction and act once that total crosses the threshold.
  //
  // On the home page the nav always stays visible while still inside the
  // hero (above #work); on subpages it only hides once scrolled past 20px.

  let lastScrollY = window.scrollY;
  let scrollAccum = 0;
  let scrollDir   = 0; // 1 = down, -1 = up
  const HIDE_THRESHOLD = 40;
  const SHOW_THRESHOLD = 10;

  const hideFromY = () => document.getElementById('work')?.offsetTop ?? 20;

  window.addEventListener('scroll', () => {
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

    if (currentY < hideFromY()) {
      nav.classList.remove('nav-hidden');
      return;
    }

    if (dir === 1 && scrollAccum > HIDE_THRESHOLD) {
      nav.classList.add('nav-hidden');
      closeMenu();
    }
    if (dir === -1 && scrollAccum > SHOW_THRESHOLD) {
      nav.classList.remove('nav-hidden');
    }
  }, { passive: true });
})();
