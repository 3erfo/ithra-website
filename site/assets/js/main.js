/* Ithra United — interactions, scroll animations & parallax */
(() => {
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const root = document.documentElement;
  const RTL = root.dir === 'rtl';
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const store = {
    get(k) { try { return sessionStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { sessionStorage.setItem(k, v); } catch (e) {} }
  };

  /* ---------- Preloader & page curtain ---------- */
  const pre = $('.preloader');
  const curtain = $('.curtain');
  const startReveal = () => document.body.classList.add('ready');
  if (pre) {
    const seen = store.get('ithra-seen');
    const delay = seen ? 150 : 1300;
    window.addEventListener('load', () => setTimeout(() => {
      pre.classList.add('done'); store.set('ithra-seen', '1'); startReveal();
      setTimeout(() => pre.remove(), 1200);
    }, delay));
    setTimeout(() => { if (document.body.contains(pre)) { pre.classList.add('done'); startReveal(); } }, 4000);
  } else startReveal();

  const curtainOff = () => { if (curtain) curtain.classList.remove('c-in', 'c-out'); };
  if (curtain && store.get('ithra-transition')) {
    curtain.classList.add('c-in');
    requestAnimationFrame(() => requestAnimationFrame(() => { curtain.classList.remove('c-in'); curtain.classList.add('c-out'); setTimeout(curtainOff, 1000); }));
    store.set('ithra-transition', '');
  }
  document.addEventListener('click', e => {
    const a = e.target.closest('a[href]');
    if (!a || !curtain || reduce) return;
    const href = a.getAttribute('href');
    if (!href || href.startsWith('#') || a.target === '_blank' || /^(mailto|tel|https?):/i.test(href) || e.metaKey || e.ctrlKey || a.hasAttribute('download')) return;
    if (!/\.html(#.*)?$/.test(href) && !href.endsWith('/')) return;
    const dest = new URL(a.href, location.href);
    if (dest.pathname === location.pathname && dest.hash) return; // same-page anchor: no wipe
    e.preventDefault();
    store.set('ithra-transition', '1');
    curtain.classList.remove('c-out'); curtain.classList.add('c-in');
    setTimeout(() => { window.location.href = a.href; }, 650);
  });
  window.addEventListener('pageshow', ev => { if (ev.persisted) curtainOff(); });

  /* ---------- Smooth scroll (Lenis, optional) ---------- */
  let lenis = null;
  if (window.Lenis && !reduce) {
    lenis = new window.Lenis({ duration: 1.15, smoothWheel: true, easing: t => Math.min(1, 1.001 - Math.pow(2, -10 * t)) });
    const raf = t => { lenis.raf(t); requestAnimationFrame(raf); };
    requestAnimationFrame(raf);
  }
  const scrollToY = y => lenis ? lenis.scrollTo(y) : window.scrollTo({ top: y, behavior: 'smooth' });

  /* ---------- Header behaviour ---------- */
  const header = $('.header');
  const progress = $('.progress');
  const toTop = $('.to-top');
  let lastY = 0;
  const onScroll = () => {
    const y = window.scrollY;
    if (header) {
      header.classList.toggle('scrolled', y > 40);
      header.classList.toggle('hide', y > lastY && y > 500 && !document.body.classList.contains('menu-open'));
    }
    lastY = y;
    const h = document.documentElement.scrollHeight - innerHeight;
    if (progress) progress.style.transform = `scaleX(${h > 0 ? y / h : 0})`;
    if (toTop) toTop.classList.toggle('show', y > 900);
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
  toTop && toTop.addEventListener('click', () => scrollToY(0));

  /* mobile menu */
  const burger = $('.burger');
  burger && burger.addEventListener('click', () => {
    const open = document.body.classList.toggle('menu-open');
    burger.setAttribute('aria-expanded', open);
    open ? lenis && lenis.stop() : lenis && lenis.start();
    $$('.mobile-menu .m-link').forEach((l, i) => l.style.transitionDelay = open ? `${0.25 + i * 0.05}s` : '0s');
  });


  /* mobile menu: collapsible solutions */
  $$('.m-toggle').forEach(t => t.addEventListener('click', () => {
    const sub = t.closest('.m-group').querySelector('.m-sub'); const open = sub.classList.toggle('open'); t.setAttribute('aria-expanded', open);
  }));

  /* ---------- Split text ---------- */
  $$('[data-split]').forEach(el => {
    const words = el.textContent.trim().split(/\s+/);
    el.innerHTML = words.map((w, i) => `<span class="w"><span style="--i:${i}">${w}</span></span>`).join(' ');
    el.classList.add('split');
  });

  /* stagger children */
  $$('[data-stagger]').forEach(p => [...p.children].forEach((c, i) => {
    if (!c.hasAttribute('data-reveal')) c.setAttribute('data-reveal', p.dataset.stagger || 'up');
    c.style.setProperty('--d', `${i * 0.09}s`);
  }));

  /* ---------- Reveal on scroll ---------- */
  const io = new IntersectionObserver(entries => {
    entries.forEach(en => {
      if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
  const armReveal = () => $$('[data-reveal],[data-split]').forEach(el => io.observe(el));
  if (document.body.classList.contains('ready')) armReveal();
  else {
    const mo = new MutationObserver(() => { if (document.body.classList.contains('ready')) { armReveal(); mo.disconnect(); } });
    mo.observe(document.body, { attributes: true, attributeFilter: ['class'] });
  }
  /* ---------- Counters ---------- */
  const cio = new IntersectionObserver(entries => entries.forEach(en => {
    if (!en.isIntersecting) return;
    const el = en.target; cio.unobserve(el);
    const m = el.dataset.count.match(/^(\D*)(\d+)(.*)$/);
    if (!m) return;
    const [, pre, num, suf] = m; const target = +num; const dur = 1800; const t0 = performance.now();
    const step = t => {
      const p = Math.min(1, (t - t0) / dur); const v = Math.round(target * (1 - Math.pow(1 - p, 4)));
      el.innerHTML = `${pre}<span>${v}</span>${suf}`;
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }), { threshold: 0.5 });
  $$('[data-count]').forEach(el => cio.observe(el));

  /* ---------- Parallax engine ---------- */
  const px = $$('[data-parallax]');
  const heroMedia = $('.hero-media, .phero-bg');
  const statement = $('.statement');
  const sWords = statement ? $$('.sw', statement) : [];
  const bigtype = $$('.bigtype');
  let ticking = false;
  const update = () => {
    ticking = false;
    const vh = innerHeight;
    px.forEach(el => {
      const r = el.getBoundingClientRect();
      if (r.bottom < -200 || r.top > vh + 200) return;
      const speed = parseFloat(el.dataset.parallax) || 0.2;
      const c = r.top + r.height / 2 - vh / 2;
      el.style.transform = `translate3d(0,${(-c * speed).toFixed(1)}px,0)`;
    });
    if (heroMedia) {
      const y = scrollY; const h = heroMedia.parentElement.offsetHeight;
      if (y < h * 1.2) {
        const p = y / h;
        heroMedia.style.transform = `translate3d(0,${y * 0.4}px,0) scale(${1 + p * 0.12})`;
        heroMedia.style.opacity = `${1 - p * 0.6}`;
      }
    }
    if (sWords.length) {
      const r = statement.getBoundingClientRect();
      const p = Math.min(1, Math.max(0, (vh * 0.85 - r.top) / (r.height + vh * 0.35)));
      const n = Math.floor(p * sWords.length * 1.1);
      sWords.forEach((w, i) => w.classList.toggle('on', i < n));
    }
    bigtype.forEach(el => {
      const r = el.getBoundingClientRect();
      const p = Math.min(1, Math.max(0, 1 - (r.top + r.height / 2) / vh));
      el.style.transform = `scale(${0.82 + p * 0.25})`;
      el.style.opacity = `${0.25 + p * 0.95}`;
    });
  };
  const req = () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } };
  if (!reduce) { window.addEventListener('scroll', req, { passive: true }); window.addEventListener('resize', req); update(); }
  else sWords.forEach(w => w.classList.add('on'));

  /* ---------- Cursor glow, spotlight cards, magnetic ---------- */
  const glow = $('.cursor-glow');
  if (window.matchMedia('(hover:hover)').matches && !reduce) {
    let gx = 0, gy = 0, cx = 0, cy = 0;
    window.addEventListener('pointermove', e => { gx = e.clientX; gy = e.clientY; });
    const loop = () => { cx += (gx - cx) * 0.12; cy += (gy - cy) * 0.12; if (glow) glow.style.transform = `translate(${cx - 260}px,${cy - 260}px)`; requestAnimationFrame(loop); };
    if (glow) { glow.style.left = '0'; glow.style.top = '0'; loop(); }
    $$('.card').forEach(c => c.addEventListener('pointermove', e => {
      const r = c.getBoundingClientRect();
      c.style.setProperty('--mx', `${e.clientX - r.left}px`); c.style.setProperty('--my', `${e.clientY - r.top}px`);
    }));
    $$('[data-tilt]').forEach(c => {
      c.addEventListener('pointermove', e => {
        const r = c.getBoundingClientRect(); const x = (e.clientX - r.left) / r.width - 0.5; const y = (e.clientY - r.top) / r.height - 0.5;
        c.style.transform = `perspective(900px) rotateY(${x * 7}deg) rotateX(${-y * 7}deg) translateY(-4px)`;
      });
      c.addEventListener('pointerleave', () => c.style.transform = '');
    });
    $$('.btn').forEach(b => {
      b.addEventListener('pointermove', e => {
        const r = b.getBoundingClientRect();
        b.style.setProperty('--bx', `${(e.clientX - r.left - r.width / 2) * 0.18}px`);
        b.style.setProperty('--by', `${(e.clientY - r.top - r.height / 2) * 0.3}px`);
      });
      b.addEventListener('pointerleave', () => { b.style.setProperty('--bx', '0px'); b.style.setProperty('--by', '0px'); });
    });
  } else if (glow) glow.remove();

  /* ---------- Product tabs (auto-advance) ---------- */
  $$('[data-ptabs]').forEach(wrap => {
    const tabs = $$('.ptab', wrap); const panels = $$('.ppanel', wrap); let i = 0; let timer;
    const go = n => {
      i = (n + tabs.length) % tabs.length;
      tabs.forEach((t, k) => { t.classList.toggle('active', k === i); t.setAttribute('aria-selected', k === i); });
      panels.forEach((p, k) => p.classList.toggle('active', k === i));
      tabs[i].style.animation = 'none'; void tabs[i].offsetWidth; tabs[i].style.animation = '';
      clearTimeout(timer); timer = setTimeout(() => go(i + 1), 8000);
    };
    tabs.forEach((t, k) => t.addEventListener('click', () => { go(k); clearTimeout(timer); tabs.forEach(x => x.classList.add('stopped')); }));
    const vis = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { go(i); } else clearTimeout(timer); }), { threshold: 0.3 });
    vis.observe(wrap);
  });
  /* generic tabs */
  $$('[data-tabs]').forEach(wrap => {
    const btns = $$('.tabs-nav button', wrap); const panels = $$('.tab-panel', wrap);
    btns.forEach((b, k) => b.addEventListener('click', () => {
      btns.forEach((x, j) => { x.classList.toggle('active', j === k); x.setAttribute('aria-selected', j === k); });
      panels.forEach((p, j) => p.classList.toggle('active', j === k));
    }));
  });

  /* ---------- Slider ---------- */
  $$('[data-slider]').forEach(sl => {
    const slides = $$('.slide', sl); const dots = $$('.dots button', sl); const cnt = $('.counter b', sl);
    const dur = +(sl.dataset.slider || 7000); let i = 0; let t;
    sl.style.setProperty('--dur', `${dur}ms`);
    const go = n => {
      i = (n + slides.length) % slides.length;
      slides.forEach((s, k) => s.classList.toggle('active', k === i));
      dots.forEach((d, k) => { d.classList.remove('active'); d.classList.toggle('done', k < i); });
      if (dots[i]) { void dots[i].offsetWidth; dots[i].classList.add('active'); }
      if (cnt) cnt.textContent = String(i + 1).padStart(2, '0');
      clearTimeout(t); if (slides.length > 1) t = setTimeout(() => go(i + 1), dur);
    };
    dots.forEach((d, k) => d.addEventListener('click', () => go(k)));
    const prev = $('[data-prev]', sl), next = $('[data-next]', sl);
    prev && prev.addEventListener('click', () => go(i - 1));
    next && next.addEventListener('click', () => go(i + 1));
    go(0);
  });

  /* ---------- Modals ---------- */
  const openModal = m => { m.classList.add('open'); m.setAttribute('aria-hidden', 'false'); lenis && lenis.stop(); const f = $('input,button', m); f && setTimeout(() => f.focus(), 300); };
  const closeModal = m => { m.classList.remove('open'); m.setAttribute('aria-hidden', 'true'); lenis && lenis.start(); };
  document.addEventListener('click', e => {
    const o = e.target.closest('[data-modal]');
    if (o) { e.preventDefault(); const m = document.getElementById(o.dataset.modal); m && openModal(m); return; }
    const lb = e.target.closest('[data-lightbox]');
    if (lb) {
      e.preventDefault(); const m = $('#lightbox'); if (!m) return;
      $('img', m).src = lb.dataset.img; $('h3', m).textContent = lb.dataset.title; openModal(m); return;
    }
    const c = e.target.closest('[data-close]');
    if (c) closeModal(c.closest('.modal'));
  });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') $$('.modal.open').forEach(closeModal); });

  /* ---------- Forms: FormSubmit + math captcha + honeypot ---------- */
  const T = (en, ar) => RTL ? ar : en;
  const newQ = f => {
    const q = $('.cq', f); if (!q) return;
    const a = 2 + Math.floor(Math.random() * 9), b = 1 + Math.floor(Math.random() * 9);
    const op = Math.random() > 0.5 ? '+' : '×';
    f.dataset.ans = op === '+' ? a + b : a * b; q.textContent = `${a} ${op} ${b}`;
    const inp = $('[name=captcha_answer]', f); if (inp) inp.value = '';
  };
  const okTypes = /\.(pdf|docx?)$/i; const MAX = 5 * 1024 * 1024;
  $$('[data-file]').forEach(inp => inp.addEventListener('change', () => {
    const box = inp.closest('.file-drop'); const nm = $('.fd-name', box);
    if (!nm.dataset.def) nm.dataset.def = nm.textContent;
    const files = [...inp.files];
    nm.textContent = files.length ? files.map(f => f.name).join(', ') : nm.dataset.def;
    box.classList.toggle('has', files.length > 0);
  }));
  const show = (f, cls) => { $$('.form-msg', f).forEach(m => m.classList.remove('ok', 'err')); if (cls) { const m = $(cls, f); if (m) m.classList.add(cls === '.ok-msg' ? 'ok' : 'err'); } };
  if (/[?&]sent=1/.test(location.search)) {
    const f = $('form[data-fs="post"]'); if (f) { show(f, '.ok-msg'); setTimeout(() => f.scrollIntoView({ block: 'center' }), 600); }
  }
  $$('form[data-fs]').forEach(f => {
    newQ(f);
    f.addEventListener('submit', async e => {
      show(f, null);
      const hp = $('[name=_honey]', f); if (hp && hp.value) { e.preventDefault(); return; }
      if (!f.checkValidity()) { e.preventDefault(); f.reportValidity(); return; }
      if (f.dataset.ans && String($('[name=captcha_answer]', f).value).trim() !== String(f.dataset.ans)) {
        e.preventDefault(); show(f, '.cap-msg'); newQ(f); return;
      }
      const files = $$('input[type=file]', f).flatMap(i => [...i.files]);
      if (files.some(x => !okTypes.test(x.name) || x.size > MAX)) { e.preventDefault(); show(f, '.file-msg'); return; }
      const btn = $('button[type=submit]', f); const lbl = btn && $('.lbl', btn);
      if (f.dataset.fs === 'post') {
        const nx = $('[name=_next]', f);
        if (nx) { if (/^https?:/.test(location.protocol)) nx.value = location.href.split('?')[0].split('#')[0] + '?sent=1#apply'; else nx.remove(); }
        $('[name=captcha_answer]', f) && $('[name=captcha_answer]', f).setAttribute('disabled', '');
        if (btn) btn.setAttribute('disabled', ''); if (lbl) lbl.textContent = T('Sending…', 'جارٍ الإرسال…');
        return; // native multipart POST (attachments)
      }
      e.preventDefault();
      const data = Object.fromEntries(new FormData(f).entries()); delete data.captcha_answer;
      const old = lbl ? lbl.textContent : ''; if (btn) btn.setAttribute('disabled', ''); if (lbl) lbl.textContent = T('Sending…', 'جارٍ الإرسال…');
      try {
        const r = await fetch(f.action, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(data) });
        const j = await r.json().catch(() => ({}));
        if (!r.ok || j.success === 'false' || j.success === false) throw new Error(j.message || r.status);
        show(f, '.ok-msg'); f.reset(); newQ(f);
      } catch (err) { show(f, '.err-msg'); }
      if (btn) btn.removeAttribute('disabled'); if (lbl) lbl.textContent = old;
    });
  });

  /* ---------- AI animated shape (transparent canvas) ---------- */
  $$('.ai-canvas').forEach(cv => {
    const ctx = cv.getContext('2d'); let W, H, dpr; const N = 520; const pts = [];
    for (let i = 0; i < N; i++) { const y = 1 - (i / (N - 1)) * 2; const r = Math.sqrt(1 - y * y); const th = Math.PI * (3 - Math.sqrt(5)) * i; pts.push([Math.cos(th) * r, y, Math.sin(th) * r]); }
    const size = () => { dpr = Math.min(2, devicePixelRatio || 1); const b = cv.getBoundingClientRect(); W = b.width; H = b.height; cv.width = W * dpr; cv.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); };
    size(); window.addEventListener('resize', size);
    let t = 0, mx = 0, my = 0, vis = true;
    cv.parentElement.addEventListener('pointermove', e => { const b = cv.getBoundingClientRect(); mx = (e.clientX - b.left) / b.width - .5; my = (e.clientY - b.top) / b.height - .5; });
    new IntersectionObserver(es => es.forEach(x => vis = x.isIntersecting)).observe(cv);
    const draw = () => {
      requestAnimationFrame(draw); if (!vis) return; t += reduce ? 0 : 0.006;
      ctx.clearRect(0, 0, W, H);
      const cx = W / 2, cy = H / 2, R = Math.min(W, H) * 0.34;
      const g = ctx.createRadialGradient(cx, cy, R * .1, cx, cy, R * 1.45);
      g.addColorStop(0, 'rgba(79,199,243,.22)'); g.addColorStop(.5, 'rgba(50,190,166,.08)'); g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, R * 1.45, 0, Math.PI * 2); ctx.fill();
      const ay = t + mx * .8, ax = .35 + my * .6, sa = Math.sin(ay), ca = Math.cos(ay), sx = Math.sin(ax), cxs = Math.cos(ax);
      const P = [];
      for (let i = 0; i < N; i++) {
        let [x, y, z] = pts[i];
        const n = 1 + 0.16 * Math.sin(x * 3.1 + t * 2.2) * Math.cos(y * 2.7 - t * 1.7) + 0.08 * Math.sin(z * 5 + t * 3);
        x *= n; y *= n; z *= n;
        let X = x * ca - z * sa, Z = x * sa + z * ca; let Y = y * cxs - Z * sx; Z = y * sx + Z * cxs;
        const s = 1.8 / (2.6 - Z); P.push([cx + X * R * s, cy + Y * R * s, Z, s]);
      }
      ctx.lineWidth = .6;
      for (let i = 0; i < N; i += 3) { const a = P[i], b = P[(i + 21) % N]; if (a[2] > -.2 && b[2] > -.2) { ctx.strokeStyle = `rgba(79,199,243,${0.08 + a[2] * 0.12})`; ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke(); } }
      for (const [x, y, z, s] of P) {
        const k = (z + 1) / 2; const r = 0.6 + k * 2.1;
        ctx.fillStyle = `rgba(${Math.round(50 + 29 * k)},${Math.round(190 + 9 * k)},${Math.round(166 + 77 * k)},${0.18 + k * 0.8})`;
        ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
      }
      for (let k = 0; k < 3; k++) {
        ctx.strokeStyle = `rgba(50,190,166,${0.25 - k * 0.07})`; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.ellipse(cx, cy, R * (1.25 + k * .14), R * (0.42 + k * .05), t * (k % 2 ? -1 : 1) * .6 + k, 0, Math.PI * 2); ctx.stroke();
        const ang = t * (2 + k) + k * 2; const ex = R * (1.25 + k * .14), ey = R * (.42 + k * .05), rot = t * (k % 2 ? -1 : 1) * .6 + k;
        const px = cx + ex * Math.cos(ang) * Math.cos(rot) - ey * Math.sin(ang) * Math.sin(rot), py = cy + ex * Math.cos(ang) * Math.sin(rot) + ey * Math.sin(ang) * Math.cos(rot);
        ctx.fillStyle = k === 1 ? '#4FC7F3' : '#32BEA6'; ctx.shadowColor = ctx.fillStyle; ctx.shadowBlur = 16; ctx.beginPath(); ctx.arc(px, py, 4, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0;
      }
    };
    draw();
  });

  /* ---------- Locations: Google map iframe switcher ---------- */
  const gm = $('#gmap');
  if (gm) $$('.map-loc').forEach(card => {
    const go = ev => { if (ev && ev.target.closest('a')) return; $$('.map-loc').forEach(x => x.classList.toggle('active', x === card)); if (gm.src !== card.dataset.src) gm.src = card.dataset.src; };
    card.addEventListener('click', go); card.addEventListener('keydown', ev => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); go(); } });
  });

  /* ---------- About: facilities shape follows hovered point ---------- */
  $$('.fac-rows').forEach(list => {
    const stage = list.closest('section').querySelector('.fac-stage'); if (!stage) return;
    const blob = $('.fac-blob', stage); const slides = $$('.fac-slide', stage); const rows = $$('.fac-row', list);
    const set = i => { rows.forEach((r, k) => r.classList.toggle('active', k === i)); slides.forEach((s, k) => s.classList.toggle('active', k === i)); blob.dataset.shape = i % 5; };
    rows.forEach((r, i) => { r.addEventListener('mouseenter', () => set(i)); r.addEventListener('focus', () => set(i)); r.addEventListener('click', () => set(i)); });
  });

  /* anchor links */
  $$('a[href^="#"]').forEach(a => a.addEventListener('click', e => {
    const id = a.getAttribute('href'); if (id.length < 2 || a.dataset.modal) return;
    const t = $(id); if (!t) return; e.preventDefault(); scrollToY(t.getBoundingClientRect().top + scrollY - 90);
  }));
})();
