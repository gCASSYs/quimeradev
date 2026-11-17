/* =========================================================
   BLESSED LAWN & GARDEN — main.js
   Preloader · header · mobile menu · scroll reveal · counters
   reviews carousel · lightbox · contact modal · custom cursor
   ========================================================= */
(() => {
  'use strict';

  const $ = (s, ctx = document) => ctx.querySelector(s);
  const $$ = (s, ctx = document) => Array.from(ctx.querySelectorAll(s));
  const body = document.body;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  /* ---------- Scroll lock (shared by menu, modal, lightbox) ---------- */
  const locks = new Set();
  function lockScroll(key) {
    if (!locks.size) {
      const sw = window.innerWidth - document.documentElement.clientWidth;
      body.style.paddingRight = sw ? `${sw}px` : '';
      body.style.overflow = 'hidden';
    }
    locks.add(key);
  }
  function unlockScroll(key) {
    locks.delete(key);
    if (!locks.size) { body.style.overflow = ''; body.style.paddingRight = ''; }
  }

  /* ---------- Focus trap helper ---------- */
  const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])';
  function trapFocus(container, e) {
    if (e.key !== 'Tab') return;
    const items = $$(FOCUSABLE, container).filter(el => el.offsetParent !== null);
    if (!items.length) return;
    const first = items[0], last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }

  /* =========================================================
     1. PRELOADER
     ========================================================= */
  function initPreloader(onDone) {
    const loader = $('#preloader');
    if (!loader) { onDone(); return; }
    const logo = $('#preloaderLogo');
    const countEl = $('#preloaderCount');
    const bar = $('#preloaderBar');

    // Real progress: above-the-fold images + web fonts
    const critical = $$('img:not([loading="lazy"])');
    const total = critical.length + 1; // +1 for fonts
    let loaded = 0;
    const tick = () => { loaded = Math.min(total, loaded + 1); };
    critical.forEach(img => {
      if (img.complete) tick();
      else { img.addEventListener('load', tick, { once: true }); img.addEventListener('error', tick, { once: true }); }
    });
    (document.fonts ? document.fonts.ready : Promise.resolve()).then(tick);

    const MIN_DURATION = reduceMotion ? 400 : 2000; // keeps the drawing readable on fast connections
    const MAX_WAIT = 7000;                           // never trap the visitor
    const start = performance.now();
    let shown = 0;
    let finished = false;

    function frame(now) {
      const elapsed = now - start;
      const real = elapsed > MAX_WAIT ? 1 : loaded / total;
      const timeCap = Math.min(1, elapsed / MIN_DURATION);
      const goal = Math.min(real, timeCap);
      shown += (goal - shown) * 0.12;
      if (goal === 1 && 1 - shown < 0.004) shown = 1;

      const pct = Math.round(shown * 100);
      countEl.textContent = pct;
      bar.style.transform = `scaleX(${shown})`;
      logo.style.setProperty('--p', shown.toFixed(4));

      if (shown < 1) requestAnimationFrame(frame);
      else if (!finished) finish();
    }

    function finish() {
      finished = true;
      loader.classList.add('is-complete');
      setTimeout(() => {
        loader.classList.add('is-done');
        body.classList.remove('is-loading');
        loader.setAttribute('aria-hidden', 'true');
        onDone();
        setTimeout(() => loader.remove(), 900);
      }, reduceMotion ? 100 : 650);
    }

    requestAnimationFrame(frame);
  }

  /* =========================================================
     2. HEADER — blur on scroll, hide on scroll down, scroll spy
     ========================================================= */
  function initHeader() {
    const header = $('#header');
    let lastY = window.scrollY;
    let ticking = false;

    function update() {
      const y = window.scrollY;
      header.classList.toggle('is-scrolled', y > 12);
      const menuOpen = $('#mobileMenu')?.classList.contains('is-open');
      if (!menuOpen) header.classList.toggle('is-hidden', y > 640 && y > lastY + 4);
      if (y < lastY - 4) header.classList.remove('is-hidden');
      lastY = y;
      ticking = false;
    }
    window.addEventListener('scroll', () => {
      if (!ticking) { requestAnimationFrame(update); ticking = true; }
    }, { passive: true });
    update();

    // Show header again when keyboard focus lands inside it
    header.addEventListener('focusin', () => header.classList.remove('is-hidden'));

    // Scroll spy
    const links = $$('.nav__link');
    const map = new Map(links.map(l => [l.getAttribute('href').slice(1), l]));
    const spy = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        const link = map.get(entry.target.id);
        if (!link) return;
        if (entry.isIntersecting) {
          links.forEach(l => { l.classList.remove('is-active'); l.removeAttribute('aria-current'); });
          link.classList.add('is-active');
          link.setAttribute('aria-current', 'true');
        }
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    map.forEach((_, id) => { const s = document.getElementById(id); if (s) spy.observe(s); });
  }

  /* =========================================================
     3. MOBILE MENU
     ========================================================= */
  const menu = {
    el: null, burger: null,
    init() {
      this.el = $('#mobileMenu');
      this.burger = $('#burger');
      if (!this.el || !this.burger) return;
      this.el.inert = true;
      this.burger.addEventListener('click', () => this.isOpen() ? this.close() : this.open());
      $$('a', this.el).forEach(a => a.addEventListener('click', () => this.close(false)));
      document.addEventListener('keydown', e => {
        if (this.isOpen() && e.key === 'Escape') this.close();
      });
      window.matchMedia('(min-width: 1024px)').addEventListener('change', e => { if (e.matches) this.close(false); });
    },
    isOpen() { return this.el?.classList.contains('is-open'); },
    open() {
      this.el.classList.add('is-open');
      this.el.inert = false;
      this.el.setAttribute('aria-hidden', 'false');
      this.burger.setAttribute('aria-expanded', 'true');
      this.burger.setAttribute('aria-label', 'Fechar menu');
      $('#header').classList.remove('is-hidden');
      lockScroll('menu');
    },
    close(returnFocus = true) {
      if (!this.isOpen()) return;
      this.el.classList.remove('is-open');
      this.el.inert = true;
      this.el.setAttribute('aria-hidden', 'true');
      this.burger.setAttribute('aria-expanded', 'false');
      this.burger.setAttribute('aria-label', 'Abrir menu');
      unlockScroll('menu');
      if (returnFocus) this.burger.focus();
    }
  };

  /* =========================================================
     4. SCROLL REVEAL (Intersection Observer)
     ========================================================= */
  function initReveal() {
    const items = $$('[data-reveal]');
    // Stagger siblings that enter together
    const groups = new Map();
    items.forEach(el => {
      const p = el.parentElement;
      if (!groups.has(p)) groups.set(p, []);
      groups.get(p).push(el);
    });
    groups.forEach(list => list.forEach((el, i) => el.style.setProperty('--d', `${Math.min(i, 6) * 0.08}s`)));

    if (!('IntersectionObserver' in window) || reduceMotion) {
      items.forEach(el => el.classList.add('is-visible'));
      return;
    }
    const io = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
    items.forEach(el => io.observe(el));
  }

  /* =========================================================
     5. NUMBER COUNTERS
     ========================================================= */
  function initCounters() {
    const els = $$('[data-count]');
    const fmt = (n, d) => n.toLocaleString('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d });
    const run = el => {
      const target = parseFloat(el.dataset.count);
      const decimals = parseInt(el.dataset.decimals || '0', 10);
      if (reduceMotion) { el.textContent = fmt(target, decimals); return; }
      const dur = 1800;
      const t0 = performance.now();
      const step = now => {
        const p = Math.min(1, (now - t0) / dur);
        const eased = p === 1 ? 1 : 1 - Math.pow(2, -10 * p); // easeOutExpo
        el.textContent = fmt(target * eased, decimals);
        if (p < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    };
    const io = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) { run(entry.target); io.unobserve(entry.target); }
      });
    }, { threshold: 0.6 });
    els.forEach(el => io.observe(el));
  }

  /* =========================================================
     6. REVIEWS CAROUSEL (mobile/tablet) — arrows + dots
     ========================================================= */
  function initCarousel() {
    const track = $('#reviewsTrack');
    const dotsWrap = $('#reviewsDots');
    const prev = $('#revPrev');
    const next = $('#revNext');
    if (!track) return;
    const cards = $$('.review', track);

    const dots = cards.map((_, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.setAttribute('aria-label', `Ir para a avaliação ${i + 1} de ${cards.length}`);
      b.addEventListener('click', () => goTo(i));
      dotsWrap.appendChild(b);
      return b;
    });

    const behavior = reduceMotion ? 'auto' : 'smooth';
    function goTo(i) {
      const card = cards[Math.max(0, Math.min(cards.length - 1, i))];
      const padLeft = parseFloat(getComputedStyle(track).paddingLeft) || 0;
      track.scrollTo({ left: card.offsetLeft - track.offsetLeft - padLeft, behavior });
    }
    function current() {
      const padLeft = parseFloat(getComputedStyle(track).paddingLeft) || 0;
      const probe = track.scrollLeft + track.clientWidth * 0.35;
      let idx = 0;
      cards.forEach((c, i) => { if (c.offsetLeft - track.offsetLeft - padLeft <= probe) idx = i; });
      return idx;
    }
    function update() {
      const atStart = track.scrollLeft <= 2;
      const atEnd = track.scrollLeft + track.clientWidth >= track.scrollWidth - 2;
      const idx = atEnd ? cards.length - 1 : current();
      dots.forEach((d, i) => d.setAttribute('aria-current', i === idx ? 'true' : 'false'));
      prev.disabled = atStart;
      next.disabled = atEnd;
    }
    prev.addEventListener('click', () => goTo(current() - 1));
    next.addEventListener('click', () => goTo(current() + 1));
    track.addEventListener('keydown', e => {
      if (e.key === 'ArrowRight') { e.preventDefault(); goTo(current() + 1); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); goTo(current() - 1); }
    });
    let raf;
    track.addEventListener('scroll', () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(update); }, { passive: true });
    window.addEventListener('resize', update);
    update();
  }

  /* =========================================================
     7. LIGHTBOX (native, no library)
     ========================================================= */
  function initLightbox() {
    const box = $('#lightbox');
    const img = $('#lightboxImg');
    const cap = $('#lightboxCap');
    const count = $('#lightboxCount');
    const triggers = $$('.gallery__btn');
    if (!box || !triggers.length) return;
    const items = triggers.map(t => ({ src: t.dataset.full, caption: t.dataset.caption, alt: $('img', t).alt }));
    let index = 0;
    let lastFocus = null;
    box.inert = true;

    function show(i) {
      index = (i + items.length) % items.length;
      const item = items[index];
      img.classList.remove('is-ready');
      const loader = new Image();
      loader.onload = () => {
        img.src = item.src;
        img.alt = item.alt;
        requestAnimationFrame(() => img.classList.add('is-ready'));
      };
      loader.src = item.src;
      cap.textContent = item.caption;
      count.textContent = `${String(index + 1).padStart(2, '0')} / ${String(items.length).padStart(2, '0')}`;
      // Preload neighbours
      [index + 1, index - 1].forEach(n => { const p = new Image(); p.src = items[(n + items.length) % items.length].src; });
    }
    function open(i) {
      lastFocus = document.activeElement;
      box.classList.add('is-open');
      box.inert = false;
      box.setAttribute('aria-hidden', 'false');
      lockScroll('lightbox');
      show(i);
      $('.lightbox__close', box).focus();
    }
    function close() {
      box.classList.remove('is-open');
      box.inert = true;
      box.setAttribute('aria-hidden', 'true');
      unlockScroll('lightbox');
      lastFocus?.focus();
    }

    triggers.forEach((t, i) => t.addEventListener('click', () => open(i)));
    $('.lightbox__close', box).addEventListener('click', close);
    $('.lightbox__prev', box).addEventListener('click', () => show(index - 1));
    $('.lightbox__next', box).addEventListener('click', () => show(index + 1));
    box.addEventListener('click', e => { if (e.target === box || e.target.classList.contains('lightbox__figure')) close(); });
    document.addEventListener('keydown', e => {
      if (!box.classList.contains('is-open')) return;
      if (e.key === 'Escape') close();
      else if (e.key === 'ArrowRight') show(index + 1);
      else if (e.key === 'ArrowLeft') show(index - 1);
      else trapFocus(box, e);
    });

    // Swipe
    let x0 = null;
    box.addEventListener('touchstart', e => { x0 = e.touches[0].clientX; }, { passive: true });
    box.addEventListener('touchend', e => {
      if (x0 === null) return;
      const dx = e.changedTouches[0].clientX - x0;
      if (Math.abs(dx) > 50) show(index + (dx < 0 ? 1 : -1));
      x0 = null;
    });
  }

  /* =========================================================
     8. CONTACT MODAL — circular reveal from the clicked button
     ========================================================= */
  function initModal() {
    const modal = $('#contactModal');
    const panel = $('#modalPanel');
    const form = $('#contactForm');
    const formWrap = $('#modalForm');
    const success = $('#modalSuccess');
    const submitBtn = $('#submitBtn');
    if (!modal) return;
    let lastFocus = null;
    modal.inert = true;

    function setOrigin(trigger) {
      const p = panel.getBoundingClientRect();
      if (trigger) {
        const r = trigger.getBoundingClientRect();
        panel.style.setProperty('--ox', `${r.left + r.width / 2 - p.left}px`);
        panel.style.setProperty('--oy', `${r.top + r.height / 2 - p.top}px`);
      } else {
        panel.style.setProperty('--ox', '50%');
        panel.style.setProperty('--oy', '100%');
      }
    }

    function open(trigger) {
      if (menu.isOpen()) menu.close(false);
      lastFocus = trigger || document.activeElement;
      setOrigin(trigger);
      // force style flush so the clip-path starts from the new origin
      void panel.offsetWidth;
      modal.classList.add('is-open');
      modal.inert = false;
      modal.setAttribute('aria-hidden', 'false');
      lockScroll('modal');
      setTimeout(() => $('#f-name').focus({ preventScroll: true }), reduceMotion ? 50 : 450);
    }
    function close() {
      if (!modal.classList.contains('is-open')) return;
      if (lastFocus && document.contains(lastFocus)) setOrigin(lastFocus);
      modal.classList.remove('is-open');
      modal.inert = true;
      modal.setAttribute('aria-hidden', 'true');
      unlockScroll('modal');
      lastFocus?.focus({ preventScroll: true });
      // reset after a successful send
      if (!success.hidden) setTimeout(() => {
        success.hidden = true; formWrap.hidden = false; form.reset();
      }, 700);
    }

    document.addEventListener('click', e => {
      const t = e.target.closest('[data-open-modal]');
      if (t) { e.preventDefault(); open(t); }
      if (e.target.closest('[data-close-modal]')) close();
    });
    document.addEventListener('keydown', e => {
      if (!modal.classList.contains('is-open')) return;
      if (e.key === 'Escape') close();
      else trapFocus(panel, e);
    });

    /* --- Phone mask (US format) --- */
    const phone = $('#f-phone');
    phone.addEventListener('input', () => {
      let d = phone.value.replace(/\D/g, '');
      if (d.length === 11 && d.startsWith('1')) d = d.slice(1);
      d = d.slice(0, 10);
      let out = d;
      if (d.length > 6) out = `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
      else if (d.length > 3) out = `(${d.slice(0, 3)}) ${d.slice(3)}`;
      else if (d.length) out = `(${d}`;
      phone.value = out;
    });

    /* --- Validation --- */
    const rules = {
      name: v => v.trim().length >= 2 || 'Por favor, informe seu nome.',
      email: v => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()) || 'Por favor, informe um e-mail válido.',
      phone: v => v.replace(/\D/g, '').length >= 10 || 'Por favor, informe um telefone com 10 dígitos.'
    };
    function validate(input) {
      const result = rules[input.name](input.value);
      const field = input.closest('.field');
      const err = $('.field__error', field);
      const ok = result === true;
      field.classList.toggle('is-invalid', !ok);
      input.setAttribute('aria-invalid', String(!ok));
      err.textContent = ok ? '' : result;
      if (!ok) input.setAttribute('aria-describedby', err.id); else input.removeAttribute('aria-describedby');
      return ok;
    }
    $$('input', form).forEach(input => {
      input.addEventListener('blur', () => { if (input.value) validate(input); });
      input.addEventListener('input', () => { if (input.closest('.field').classList.contains('is-invalid')) validate(input); });
    });

    form.addEventListener('submit', async e => {
      e.preventDefault();
      const inputs = $$('input', form);
      const results = inputs.map(validate);
      const firstBad = inputs[results.indexOf(false)];
      if (firstBad) { firstBad.focus(); return; }

      submitBtn.classList.add('is-loading');
      submitBtn.disabled = true;
      const data = Object.fromEntries(new FormData(form));

      try {
        /* TODO: connect to your backend / CRM / form service, e.g.:
           await fetch('https://your-endpoint.example/leads', {
             method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data)
           });
        */
        void data;
        await new Promise(r => setTimeout(r, 1100));
        formWrap.hidden = true;
        success.hidden = false;
        $('#successTitle').focus();
      } catch (err) {
        $('#f-phone-err').textContent = 'Algo deu errado. Tente novamente ou fale com a gente pelo WhatsApp.';
      } finally {
        submitBtn.classList.remove('is-loading');
        submitBtn.disabled = false;
      }
    });
  }

  /* =========================================================
     9. CUSTOM CURSOR (fine pointers only)
     ========================================================= */
  function initCursor() {
    if (!finePointer || reduceMotion) return;
    const cursor = $('.cursor');
    const dot = $('.cursor__dot');
    const ring = $('.cursor__ring');
    document.documentElement.classList.add('has-cursor');
    let mx = -100, my = -100, rx = -100, ry = -100;

    window.addEventListener('pointermove', e => {
      mx = e.clientX; my = e.clientY;
      dot.style.transform = `translate3d(${mx}px, ${my}px, 0)`;
      cursor.classList.remove('is-hidden');
    }, { passive: true });
    document.addEventListener('pointerleave', () => cursor.classList.add('is-hidden'));
    document.addEventListener('pointerover', e => {
      const view = e.target.closest('.gallery__btn');
      const link = e.target.closest('a, button, input, label, [role="button"]');
      cursor.classList.toggle('is-view', !!view);
      cursor.classList.toggle('is-link', !view && !!link);
    });

    (function loop() {
      rx += (mx - rx) * 0.18;
      ry += (my - ry) * 0.18;
      ring.style.transform = `translate3d(${rx}px, ${ry}px, 0)`;
      requestAnimationFrame(loop);
    })();
  }

  /* =========================================================
     BOOT
     ========================================================= */
  const year = $('#year');
  if (year) year.textContent = new Date().getFullYear();

  initHeader();
  menu.init();
  initCarousel();
  initLightbox();
  initModal();
  initCursor();

  initPreloader(() => {
    initReveal();
    initCounters();
  });
})();
