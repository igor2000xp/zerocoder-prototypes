/* ============================================================
   VIBEFLOW — interactions
   ============================================================ */
(() => {
  'use strict';
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isTouch = matchMedia('(hover: none)').matches;
  const $  = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];

  /* ---------- Reveal on scroll (staggered) ---------- */
  const revealIO = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      const el = e.target;
      // stagger siblings inside the same parent group
      const siblings = [...el.parentElement.children].filter(c => c.classList.contains('reveal'));
      const idx = Math.max(0, siblings.indexOf(el));
      el.style.setProperty('--d', `${Math.min(idx, 8) * 0.09}s`);
      el.classList.add('in');
      revealIO.unobserve(el);
    }
  }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
  $$('.reveal').forEach(el => revealIO.observe(el));

  /* Belt & braces: show everything already above the fold on load
     (IntersectionObserver can lag on freshly-loaded / background tabs) */
  requestAnimationFrame(() => {
    $$('.reveal').forEach(el => {
      const r = el.getBoundingClientRect();
      if (r.top < innerHeight * 0.96 && r.bottom > 0) {
        const siblings = [...el.parentElement.children].filter(c => c.classList.contains('reveal'));
        const idx = Math.max(0, siblings.indexOf(el));
        el.style.setProperty('--d', `${Math.min(idx, 8) * 0.09}s`);
        el.classList.add('in');
        revealIO.unobserve(el);
      }
    });
  });

  /* ---------- Nav ---------- */
  const nav = $('#nav');
  const onScroll = () => nav.classList.toggle('scrolled', scrollY > 24);
  addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ---------- Burger menu ---------- */
  const burger = $('#burger');
  const menu = $('#mobileMenu');
  burger.addEventListener('click', () => {
    const open = menu.classList.toggle('open');
    burger.classList.toggle('open', open);
  });

  $$('#mobileMenu a').forEach(a => a.addEventListener('click', () => {
    menu.classList.remove('open');
    burger.classList.remove('open');
  }));

  /* ---------- Hero title: letters pop in ---------- */
  /* NB: не режем градиентные слова (.grad-text*) на буквы — анимируемые
     подэлементы ломают background-clip:text в WebKit (сплошные блоки
     вместо градиентного текста). Их плавно проявит reveal родительской строки. */
  $$('.hero-title .word').forEach(w => {
    if (/grad-text/.test(w.className)) return;
    const text = w.textContent;
    w.setAttribute('aria-label', text);
    w.textContent = '';
    [...text].forEach((ch, i) => {
      const s = document.createElement('span');
      s.className = 'ch';
      s.textContent = ch;
      s.style.animationDelay = `${0.25 + i * 0.035}s`;
      w.appendChild(s);
    });
  });

  /* ---------- Live terminal ---------- */
  const termBody = $('#terminalBody');
  const termLines = [
    { cls: 't-prompt', pre: '❯ ', text: 'claude "сделай мне сайт с градиентом"' },
    { cls: 't-out',    pre: '',   text: '  ✳ Думаю… спроектировал структуру' },
    { cls: 't-out',    pre: '',   text: '  ⏺ Пишу index.html, styles.css…' },
    { cls: 't-out',    pre: '',   text: '  ⏺ Добавляю анимации и свечение' },
    { cls: 't-ok',     pre: '',   text: '  ✔ Сайт готов — вы написали 0 строк кода' },
    { cls: 't-ok',     pre: '',   text: '  ✔ Так выглядит каждый день на курсе' },
  ];
  let started = false;
  const caret = document.createElement('span');
  caret.className = 't-caret';

  function typeLine(line, done) {
    const span = document.createElement('span');
    span.className = line.cls;
    span.textContent = line.pre;
    termBody.appendChild(span);
    let i = 0;
    (function tick() {
      if (reduced) { span.textContent += line.text; return done(); }
      if (i < line.text.length) {
        span.textContent += line.text[i++];
        if (i % 2 === 0) termBody.scrollTop = termBody.scrollHeight;
        setTimeout(tick, 14 + Math.random() * 30);
      } else {
        termBody.appendChild(document.createTextNode('\n'));
        done();
      }
    })();
  }

  function runTerm() {
    let k = 0;
    (function next() {
      if (k >= termLines.length) {
        const last = termBody.lastElementChild;
        if (last) last.appendChild(caret);
        return;
      }
      typeLine(termLines[k++], next);
    })();
  }
  new IntersectionObserver((ents, io) => {
    ents.forEach(e => {
      if (e.isIntersecting && !started) { started = true; runTerm(); io.disconnect(); }
    });
  }, { threshold: 0.3 }).observe($('#terminal'));

  /* ---------- Animated counters ---------- */
  $$('[data-count]').forEach(el => {
    const target = +el.dataset.count;
    const suffix = el.dataset.suffix || '';
    const zero = el.dataset.zero;
    if (zero) { el.textContent = zero.slice(0, 1); return; } // custom text handled below
    const io = new IntersectionObserver((ents, io) => {
      ents.forEach(e => {
        if (!e.isIntersecting) return;
        io.disconnect();
        const dur = 1600, t0 = performance.now();
        (function frame(t) {
          const p = Math.min(1, (t - t0) / dur);
          const eased = 1 - Math.pow(1 - p, 3);
          el.textContent = Math.round(target * eased) + suffix;
          if (p < 1) requestAnimationFrame(frame);
        })(t0);
      });
    }, { threshold: 0.5 });
    io.observe(el);
  });

  /* ---------- 3D tilt + glow tracking ---------- */
  if (!isTouch && !reduced) {
    $$('[data-tilt], .persona, .review, .week, .plan').forEach(card => {
      const glow = document.createElement('div');
      glow.className = 'tilt-glow';
      card.appendChild(glow);

      const max = 7;
      card.addEventListener('pointermove', (ev) => {
        const r = card.getBoundingClientRect();
        const px = (ev.clientX - r.left) / r.width;
        const py = (ev.clientY - r.top) / r.height;
        card.style.setProperty('--gx', `${px * 100}%`);
        card.style.setProperty('--gy', `${py * 100}%`);
        card.style.setProperty('--mx', `${px * 100}%`);
        card.style.setProperty('--my', `${py * 100}%`);
        card.style.transform =
          `perspective(900px) rotateY(${(px - 0.5) * 2 * max}deg) rotateX(${(0.5 - py) * 2 * max}deg) translateY(-4px)`;
      });
      card.addEventListener('pointerleave', () => { card.style.transform = ''; });
    });
  }

  /* ---------- Magnetic buttons ---------- */
  if (!isTouch && !reduced) {
    $$('.magnetic').forEach(btn => {
      btn.addEventListener('pointermove', (ev) => {
        const r = btn.getBoundingClientRect();
        const dx = ev.clientX - (r.left + r.width / 2);
        const dy = ev.clientY - (r.top + r.height / 2);
        btn.style.transform = `translate(${dx * 0.18}px, ${dy * 0.18 - 3}px) scale(1.03)`;
      });
      btn.addEventListener('pointerleave', () => { btn.style.transform = ''; });
    });
  }

  /* ---------- Cursor glow ---------- */
  const cg = $('.cursor-glow');
  if (!isTouch && !reduced) {
    addEventListener('pointermove', (e) => {
      cg.style.opacity = '1';
      cg.style.left = e.clientX + 'px';
      cg.style.top = e.clientY + 'px';
    }, { passive: true });
    document.addEventListener('mouseleave', () => cg.style.opacity = '0');
  }

  /* ---------- Marquee: duplicate content for seamless loop ---------- */
  $$('[data-marquee]').forEach(track => { track.innerHTML += track.innerHTML; });

  /* ---------- Starfield ---------- */
  const canvas = $('#stars');
  const ctx = canvas.getContext('2d');
  let stars = [], W = 0, H = 0, mouse = { x: -9999, y: -9999 };

  function resize() {
    W = canvas.width = innerWidth * devicePixelRatio;
    H = canvas.height = innerHeight * devicePixelRatio;
    const n = Math.min(140, Math.floor(innerWidth * innerHeight / 14000));
    stars = Array.from({ length: n }, () => ({
      x: Math.random() * W, y: Math.random() * H,
      r: (Math.random() * 1.3 + 0.4) * devicePixelRatio,
      vx: (Math.random() - 0.5) * 0.12 * devicePixelRatio,
      vy: (Math.random() - 0.5) * 0.12 * devicePixelRatio,
      hue: [262, 195, 330, 160][Math.floor(Math.random() * 4)],
      tw: Math.random() * Math.PI * 2,
    }));
  }
  resize();
  addEventListener('resize', resize);
  if (!isTouch) addEventListener('pointermove', (e) => {
    mouse.x = e.clientX * devicePixelRatio; mouse.y = e.clientY * devicePixelRatio;
  }, { passive: true });

  (function draw(t) {
    ctx.clearRect(0, 0, W, H);
    for (const s of stars) {
      s.x += s.vx; s.y += s.vy; s.tw += 0.02;
      if (s.x < 0) s.x = W; if (s.x > W) s.x = 0;
      if (s.y < 0) s.y = H; if (s.y > H) s.y = 0;
      // gentle repulsion from cursor
      const dx = s.x - mouse.x, dy = s.y - mouse.y, d2 = dx * dx + dy * dy;
      if (d2 < 15000) { s.x += dx / Math.sqrt(d2) * 0.6; s.y += dy / Math.sqrt(d2) * 0.6; }
      const alpha = 0.25 + 0.45 * (0.5 + 0.5 * Math.sin(s.tw));
      ctx.beginPath();
      ctx.fillStyle = `hsla(${s.hue},90%,78%,${alpha})`;
      ctx.arc(s.x, s.y, s.r, 0, 7);
      ctx.fill();
    }
    if (!reduced) requestAnimationFrame(draw);
  })(0);

  /* ---------- Smooth anchor offset (fixed header) ---------- */
  $$('a[href^="#"]').forEach(a => a.addEventListener('click', (e) => {
    const id = a.getAttribute('href');
    if (id.length < 2) return;
    const target = $(id);
    if (!target) return;
    e.preventDefault();
    const y = target.getBoundingClientRect().top + scrollY - 70;
    scrollTo({ top: y, behavior: reduced ? 'auto' : 'smooth' });
  }));
})();
