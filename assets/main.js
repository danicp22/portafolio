/* =========================================================
   Daniel Calvé Pardo · Portafolio
   ========================================================= */
(() => {
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Año del pie ---------- */
  const y = $('#year'); if (y) y.textContent = new Date().getFullYear();

  /* ---------- Barra superior: se oculta al bajar y vuelve al subir ---------- */
  const nav = $('#nav');
  const links = $('#navLinks');
  const toggle = $('#navToggle');
  if (nav) {
    let last = scrollY;
    addEventListener('scroll', () => {
      const cur = scrollY;
      const open = links?.classList.contains('open');
      nav.classList.toggle('hide', cur > last && cur > 300 && !open);
      last = cur;
    }, { passive: true });
  }
  if (toggle && links) {
    toggle.addEventListener('click', () => {
      const open = links.classList.toggle('open');
      toggle.setAttribute('aria-expanded', open);
    });
    $$('a', links).forEach(a => a.addEventListener('click', () => {
      links.classList.remove('open'); toggle.setAttribute('aria-expanded', false);
    }));
  }

  /* ---------- Enlace activo según la sección ---------- */
  const map = new Map($$('.nav-links a[href^="#"]').map(a => [a.getAttribute('href').slice(1), a]));
  if (map.size) {
    const io = new IntersectionObserver(entries => entries.forEach(en => {
      if (en.isIntersecting) { map.forEach(a => a.classList.remove('active')); map.get(en.target.id)?.classList.add('active'); }
    }), { rootMargin: '-45% 0px -50% 0px' });
    map.forEach((_, id) => { const el = document.getElementById(id); if (el) io.observe(el); });
  }

  /* ---------- Aparición suave al hacer scroll ---------- */
  const revealIO = new IntersectionObserver(entries => entries.forEach(en => {
    if (en.isIntersecting) { en.target.classList.add('in'); revealIO.unobserve(en.target); }
  }), { threshold: 0.12 });
  $$('.reveal').forEach(el => revealIO.observe(el));

  /* ---------- Proyectos en cascada ----------
     Cada tarjeta se queda pegada un poco más abajo que la anterior.
     Si es más alta que la pantalla, se pega más arriba para que se vea entera. */
  const cards = $$('.proj');
  const tops = [];
  const layoutStack = () => {
    if (!cards.length) return;
    const base = innerWidth <= 860 ? 76 : 88, step = 14;
    const maxH = Math.max(...cards.map(c => c.offsetHeight));
    const first = Math.min(base, innerHeight - maxH - 12 - (cards.length - 1) * step);
    cards.forEach((c, i) => { tops[i] = first + i * step; c.style.setProperty('--top', `${tops[i]}px`); });
  };
  const onScroll = () => {
    if (!cards.length || reduce) return;
    cards.forEach((c, i) => {
      const next = cards[i + 1];
      if (!next) { c.style.transform = ''; c.style.filter = ''; return; }
      const r = next.getBoundingClientRect();
      const p = Math.min(1, Math.max(0, 1 - (r.top - tops[i + 1]) / (innerHeight * 0.8)));
      c.style.transform = `scale(${1 - p * 0.05})`;
      c.style.filter = `brightness(${1 - p * 0.4})`;
    });
  };
  addEventListener('scroll', onScroll, { passive: true });
  addEventListener('resize', () => { layoutStack(); onScroll(); });
  layoutStack(); onScroll();
  document.fonts?.ready.then(() => { layoutStack(); onScroll(); });
  addEventListener('load', () => { layoutStack(); onScroll(); });

  /* ---------- Formulario de contacto (Web3Forms) ----------
     Los mensajes llegan a danielcalvepardo@hotmail.com.
     La clave de web3forms.com no es secreta: está pensada para ir en el código. */
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
        form.reset(); say('Mensaje enviado. Te respondo lo antes posible.', true);
      } catch {
        say(`No se ha podido enviar. Escríbeme directamente a ${MAIL_TO}.`, false);
      } finally { btn.disabled = false; label.textContent = 'Enviar mensaje'; }
    });
  });

  /* ---------- Copiar email ---------- */
  const toast = $('#toast');
  const showToast = text => {
    if (!toast) return;
    toast.textContent = text; toast.classList.add('show');
    clearTimeout(showToast.t); showToast.t = setTimeout(() => toast.classList.remove('show'), 2000);
  };
  $$('[data-mail]').forEach(btn => btn.addEventListener('click', async () => {
    const mail = btn.dataset.mail;
    try { await navigator.clipboard.writeText(mail); showToast('Email copiado'); }
    catch { location.href = `mailto:${mail}`; }
  }));
})();
