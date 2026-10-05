/* =========================================================
   Daniel Calvé Pardo — Portafolio · interacciones
   ========================================================= */
(() => {
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const lerp = (a, b, t) => a + (b - a) * t;

  /* ---------- Año del footer ---------- */
  const y = $('#year'); if (y) y.textContent = new Date().getFullYear();

  /* ---------- Cursor personalizado ---------- */
  if (finePointer && !reduce) {
    const ring = $('.cursor'), dot = $('.cursor-dot'), label = $('.cursor-label');
    if (ring && dot) {
      document.body.classList.add('has-cursor');
      let mx = innerWidth / 2, my = innerHeight / 2, rx = mx, ry = my;
      let hidden = false;
      addEventListener('mousemove', e => {
        mx = e.clientX; my = e.clientY;
        dot.style.transform = `translate(${mx}px, ${my}px) translate(-50%, -50%)`;
        ring.style.opacity = hidden ? 0 : 1;
      });
      document.addEventListener('mouseleave', () => { ring.style.opacity = dot.style.opacity = 0; });
      (function loop() {
        rx = lerp(rx, mx, 0.18); ry = lerp(ry, my, 0.18);
        ring.style.transform = `translate(${rx}px, ${ry}px) translate(-50%, -50%)`;
        if (label) label.style.transform = `translate(${rx}px, ${ry}px) translate(-50%, -50%)`;
        requestAnimationFrame(loop);
      })();
      document.addEventListener('mouseover', e => {
        // Sobre cajas de texto: se oculta el cursor animado y se ve el cursor normal de escribir
        hidden = !!e.target.closest('input, textarea, select, .field');
        const v = !hidden && e.target.closest('[data-view]');
        const h = !hidden && e.target.closest('a, button, label, [data-hover]');
        ring.classList.toggle('is-view', !!v);
        ring.classList.toggle('is-hover', !v && !!h);
        ring.style.opacity = hidden ? 0 : 1;
        dot.style.opacity = hidden || v || h ? 0 : 1;
        if (label) label.classList.toggle('show', !!v);
      });

    }
  }

  /* ---------- Navegación: se oculta al bajar, aparece al subir ---------- */
  const nav = $('#nav');
  if (nav) {
    let last = scrollY;
    addEventListener('scroll', () => {
      const cur = scrollY;
      const menuOpen = $('#navLinks')?.classList.contains('open');
      nav.classList.toggle('hide', cur > last && cur > 200 && !menuOpen);
      last = cur;
    }, { passive: true });

    const toggle = $('#navToggle'), links = $('#navLinks');
    if (toggle && links) {
      toggle.addEventListener('click', () => {
        const open = links.classList.toggle('open');
        toggle.setAttribute('aria-expanded', open);
      });
      $$('a', links).forEach(a => a.addEventListener('click', () => {
        links.classList.remove('open'); toggle.setAttribute('aria-expanded', false);
      }));
    }

    // Enlace activo según sección visible
    const map = new Map($$('.nav-links a[href^="#"]').map(a => [a.getAttribute('href').slice(1), a]));
    if (map.size) {
      const io = new IntersectionObserver(entries => entries.forEach(en => {
        if (en.isIntersecting) { map.forEach(a => a.classList.remove('active')); map.get(en.target.id)?.classList.add('active'); }
      }), { rootMargin: '-45% 0px -50% 0px' });
      map.forEach((_, id) => { const el = document.getElementById(id); if (el) io.observe(el); });
    }
  }

  /* ---------- Aparición al hacer scroll ---------- */
  const revealIO = new IntersectionObserver(entries => entries.forEach(en => {
    if (en.isIntersecting) { en.target.classList.add('in'); revealIO.unobserve(en.target); }
  }), { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });
  $$('.reveal').forEach(el => revealIO.observe(el));

  /* ---------- Contadores ---------- */
  const countIO = new IntersectionObserver(entries => entries.forEach(en => {
    if (!en.isIntersecting) return;
    const el = en.target, end = +el.dataset.count, dur = reduce ? 1 : 1600, t0 = performance.now();
    const tick = now => {
      const p = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - p, 4);
      el.textContent = Math.round(end * e);
      if (p < 1) requestAnimationFrame(tick);
    };
    setTimeout(() => requestAnimationFrame(tick), 700);
    countIO.unobserve(el);
  }), { threshold: 0.6 });
  $$('[data-count]').forEach(el => countIO.observe(el));

  /* ---------- Texto que se "descifra" ---------- */
  const scr = $('#scramble');
  if (scr) {
    const words = ['que venden.', 'que suenan.', 'con estilo.', 'que funcionan.', 'a medida.'];
    const chars = '!<>-_\\/[]{}—=+*^?#01';
    let i = 0;
    const scramble = to => new Promise(res => {
      const from = scr.textContent, len = Math.max(from.length, to.length);
      const q = [...Array(len)].map((_, k) => ({ f: from[k] || '', t: to[k] || '', s: Math.floor(Math.random() * 18), e: Math.floor(Math.random() * 18) + 18 }));
      let frame = 0;
      const step = () => {
        let out = '', done = 0;
        for (const c of q) {
          if (frame >= c.e) { done++; out += c.t; }
          else if (frame >= c.s) out += chars[Math.floor(Math.random() * chars.length)];
          else out += c.f;
        }
        scr.textContent = out;
        if (done === q.length) res(); else { frame++; requestAnimationFrame(step); }
      };
      step();
    });
    if (!reduce) setInterval(() => { i = (i + 1) % words.length; scramble(words[i]); }, 2600);
  }

  /* ---------- Campo de puntos interactivo del hero ---------- */
  const cv = $('#field');
  if (cv && !reduce) {
    const ctx = cv.getContext('2d');
    let W, H, dpr, pts = [], mouse = { x: -9999, y: -9999, tx: -9999, ty: -9999 }, t = 0, running = true;
    const GAP = innerWidth < 700 ? 26 : 32;
    const cols = [[167, 139, 250], [96, 165, 250], [34, 211, 238]];
    const resize = () => {
      dpr = Math.min(devicePixelRatio || 1, 2);
      W = cv.clientWidth; H = cv.clientHeight;
      cv.width = W * dpr; cv.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      pts = [];
      for (let y = GAP / 2; y < H; y += GAP) for (let x = GAP / 2; x < W; x += GAP) pts.push({ x, y, ox: x, oy: y });
    };
    resize(); addEventListener('resize', resize);
    const hero = cv.parentElement;
    hero.addEventListener('pointermove', e => { const r = cv.getBoundingClientRect(); mouse.tx = e.clientX - r.left; mouse.ty = e.clientY - r.top; });
    hero.addEventListener('pointerleave', () => { mouse.tx = -9999; mouse.ty = -9999; });
    new IntersectionObserver(([en]) => { running = en.isIntersecting; if (running) draw(); }).observe(cv);

    const R = 180;
    function draw() {
      if (!running) return;
      t += 0.012;
      mouse.x = mouse.tx < -999 ? mouse.tx : lerp(mouse.x < -999 ? mouse.tx : mouse.x, mouse.tx, 0.12);
      mouse.y = mouse.ty < -999 ? mouse.ty : lerp(mouse.y < -999 ? mouse.ty : mouse.y, mouse.ty, 0.12);
      ctx.clearRect(0, 0, W, H);
      for (const p of pts) {
        const wave = Math.sin(p.ox * 0.008 + t) * Math.cos(p.oy * 0.01 + t * 0.8);
        const dx = p.ox - mouse.x, dy = p.oy - mouse.y, d = Math.hypot(dx, dy);
        let tx = p.ox, ty = p.oy + wave * 4, s = 1 + wave * 0.35, a = 0.13 + (wave + 1) * 0.05;
        let k = 0;
        if (d < R) {
          k = 1 - d / R; const f = k * k * 26;
          tx += (dx / (d || 1)) * f; ty += (dy / (d || 1)) * f; s += k * 2.2; a += k * 0.75;
        }
        p.x = lerp(p.x, tx, 0.2); p.y = lerp(p.y, ty, 0.2);
        const m = (p.ox / W) * 2, ci = Math.min(1, Math.floor(m)), fr = m - ci;
        const c0 = cols[ci], c1 = cols[ci + 1];
        const r = c0[0] + (c1[0] - c0[0]) * fr, g = c0[1] + (c1[1] - c0[1]) * fr, b = c0[2] + (c1[2] - c0[2]) * fr;
        ctx.fillStyle = k > 0 ? `rgba(${r|0},${g|0},${b|0},${Math.min(a, 1)})` : `rgba(210,208,230,${a})`;
        ctx.beginPath(); ctx.arc(p.x, p.y, 1.1 * s, 0, 6.283); ctx.fill();
      }
      requestAnimationFrame(draw);
    }
    draw();
  }

  /* ---------- Botones magnéticos ---------- */
  if (finePointer && !reduce) {
    $$('.magnetic').forEach(el => {
      el.addEventListener('mousemove', e => {
        const r = el.getBoundingClientRect();
        const x = e.clientX - r.left - r.width / 2, y = e.clientY - r.top - r.height / 2;
        el.style.transform = `translate(${x * 0.25}px, ${y * 0.35}px)`;
      });
      el.addEventListener('mouseleave', () => { el.style.transform = ''; });
    });
  }

  /* ---------- Mockups con inclinación 3D ---------- */
  if (finePointer && !reduce) {
    $$('.tilt').forEach(el => {
      el.addEventListener('mousemove', e => {
        const r = el.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width - 0.5, py = (e.clientY - r.top) / r.height - 0.5;
        el.style.setProperty('--ry', `${px * 14}deg`);
        el.style.setProperty('--rx', `${-py * 12}deg`);
        el.style.setProperty('--shine', 0.25 + (0.5 - py) * 0.6);
      });
      el.addEventListener('mouseleave', () => { el.style.removeProperty('--ry'); el.style.removeProperty('--rx'); el.style.removeProperty('--shine'); });
    });
  }

  /* ---------- Foco que sigue al ratón en las tarjetas ---------- */
  $$('.tile').forEach(el => el.addEventListener('pointermove', e => {
    const r = el.getBoundingClientRect();
    el.style.setProperty('--mx', `${e.clientX - r.left}px`);
    el.style.setProperty('--my', `${e.clientY - r.top}px`);
  }));

  /* ---------- Color ambiente según la sección ---------- */
  const glowEls = $$('[data-glow]');
  if (glowEls.length) {
    const io = new IntersectionObserver(entries => entries.forEach(en => {
      if (en.isIntersecting) document.body.style.setProperty('--glow', en.target.dataset.glow);
    }), { rootMargin: '-40% 0px -40% 0px' });
    glowEls.forEach(el => io.observe(el));
  }

  /* ---------- Tarjetas de proyecto apiladas (cascada) + progreso de la trayectoria ---------- */
  const cards = $$('.proj');
  const tl = $('#timeline');
  const tops = [];
  // Cada tarjeta se queda pegada un poco más abajo que la anterior (efecto cascada).
  // Si una tarjeta es más alta que la pantalla, se pega por abajo para que se vea entera.
  const layoutStack = () => {
    const base = innerWidth <= 860 ? 74 : 96, step = innerWidth <= 860 ? 12 : 16;
    const maxH = Math.max(...cards.map(c => c.offsetHeight));
    const first = Math.min(base, innerHeight - maxH - 12 - (cards.length - 1) * step);
    cards.forEach((c, i) => {
      tops[i] = first + i * step; c.style.setProperty('--top', `${tops[i]}px`);
    });
  };
  const onScroll = () => {
    if (cards.length && !reduce) {
      cards.forEach((c, i) => {
        const next = cards[i + 1];
        if (!next) { c.style.transform = ''; c.style.filter = ''; return; }
        const r = next.getBoundingClientRect();
        const p = Math.min(1, Math.max(0, 1 - (r.top - tops[i + 1]) / (innerHeight * 0.8)));
        c.style.transform = `scale(${1 - p * 0.06})`;
        c.style.filter = `brightness(${1 - p * 0.5})`;
      });
    }
    if (tl) {
      const r = tl.getBoundingClientRect();
      const p = Math.min(1, Math.max(0, (innerHeight * 0.6 - r.top) / r.height));
      tl.style.setProperty('--p', `${p * 100}%`);
    }
  };
  addEventListener('scroll', onScroll, { passive: true });
  addEventListener('resize', () => { layoutStack(); onScroll(); });
  layoutStack(); onScroll();
  document.fonts?.ready.then(() => { layoutStack(); onScroll(); });
  addEventListener('load', () => { layoutStack(); onScroll(); });

  /* ---------- Letras que saltan en el "¿Hablamos?" ---------- */
  const big = $('#bigCta');
  if (big) big.innerHTML = [...big.textContent].map(ch => `<span>${ch}</span>`).join('');

  /* ---------- Formulario de contacto (Web3Forms) ----------
     Los mensajes llegan a danielcalvepardo@hotmail.com.
     Clave de https://web3forms.com (no es secreta, va en el código). */
  const ACCESS_KEY = 'd89dc97d-4ea8-4568-803d-11bf8d4776fb';
  const MAIL_TO = 'danielcalvepardo@hotmail.com';
  $$('form[data-contact]').forEach(form => {
    const btn = $('.send', form), label = $('.send-label', form), msg = $('.msg', form);
    const say = (text, ok) => { msg.textContent = text; msg.className = 'msg ' + (ok ? 'ok' : 'err'); };
    form.addEventListener('submit', async e => {
      e.preventDefault();
      if (!form.checkValidity()) { say('Rellena tu nombre, un email válido y el mensaje.', false); form.reportValidity(); return; }
      const d = Object.fromEntries(new FormData(form));
      if (d.botcheck) return;
      if (!ACCESS_KEY) {
        location.href = `mailto:${MAIL_TO}?subject=${encodeURIComponent(`${d.motivo} · ${d.name}`)}&body=${encodeURIComponent(`${d.message}\n\n${d.name} (${d.email})`)}`;
        return;
      }
      btn.disabled = true; label.textContent = 'Enviando…';
      try {
        const res = await fetch('https://api.web3forms.com/submit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
          body: JSON.stringify({
            access_key: ACCESS_KEY,
            subject: `Portafolio · ${d.motivo} · ${d.name}`,
            from_name: 'Portafolio de Daniel Calvé',
            name: d.name, email: d.email, motivo: d.motivo, message: d.message
          })
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok || !json.success) throw new Error(json.message);
        form.reset(); say('¡Mensaje enviado! Te respondo lo antes posible.', true);
      } catch {
        say(`No se ha podido enviar. Escríbeme directamente a ${MAIL_TO}.`, false);
      } finally { btn.disabled = false; label.textContent = 'Enviar mensaje'; }
    });
  });

  /* ---------- Copiar email ---------- */
  const toast = $('#toast');
  const showToast = msg => { if (!toast) return; toast.textContent = msg; toast.classList.add('show'); clearTimeout(showToast.t); showToast.t = setTimeout(() => toast.classList.remove('show'), 2200); };
  $$('[data-mail]').forEach(btn => btn.addEventListener('click', async () => {
    const mail = btn.dataset.mail;
    try { await navigator.clipboard.writeText(mail); showToast('Email copiado ✓'); }
    catch { location.href = `mailto:${mail}`; }
  }));

  /* ---------- Guiño en la pestaña ---------- */
  const title = document.title;
  document.addEventListener('visibilitychange', () => { document.title = document.hidden ? '👀 ¡Vuelve! Aún hay más…' : title; });

  /* ---------- Para quien mire la consola ---------- */
  console.log('%c¡Hola! 👋', 'font: 800 28px system-ui; color: #a78bfa');
  console.log('%cSi estás mirando el código es que te interesa. Hablemos: danielcalvepardo@hotmail.com', 'font: 14px system-ui; color: #60a5fa');
})();
