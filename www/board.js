(() => {
  const NS = 'http://www.w3.org/2000/svg';
  const st = document.createElement('style');
  st.textContent = `
html,body{background:#000}
#canvas{background-color:#000;background-image:radial-gradient(rgba(255,255,255,.16) 1px,transparent 1.3px);background-size:44px 44px}
.card{width:200px;border:1px solid rgba(255,255,255,.55);border-radius:22px;background:#0b0b0b;overflow:visible;box-shadow:0 0 0 5px #000,0 0 0 6px rgba(255,255,255,.16)}
.card::before,.card::after{content:"";position:absolute;width:34px;height:34px;border:2px solid #fff;pointer-events:none;opacity:.9}
.card::before{left:-9px;top:-9px;border-right:0;border-bottom:0;border-radius:26px 0 0 0}
.card::after{right:-9px;bottom:-9px;border-left:0;border-top:0;border-radius:0 0 26px 0}
.card.sel{border-color:#fff;box-shadow:0 0 0 5px #000,0 0 0 7px #fff}
.ch{background:none;padding:9px 10px 8px 12px;border-bottom:1px solid #262626;border-radius:22px 22px 0 0;align-items:center}
.ch .g{display:inline-block;width:8px;height:8px;background:#3ddc84;border-radius:2px;margin-right:7px}
.cp{background:#161616;border:1px solid #333;color:#ddd;width:28px;height:24px;border-radius:8px;padding:0;display:grid;place-items:center;font:inherit;font-size:11px}
.cb{padding:10px 12px 12px}
.cb p{background:#151515;border-radius:12px;padding:9px;max-height:110px}
.ctag{position:absolute;right:8px;top:-19px;font-size:8px;letter-spacing:.14em;color:#bbb}
#hdl{position:absolute;left:0;top:0;width:2400px;height:2400px;z-index:3;pointer-events:none}`;
  document.head.appendChild(st);

  const mk = (t, a) => { const e = document.createElementNS(NS, t); for (const k in a) e.setAttribute(k, a[k]); return e; };
  const COPY = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V6a2 2 0 0 1 2-2h9"/></svg>';

  /* CARDS */
  window.renderBoard = function () {
    cv.querySelectorAll('.card').forEach(e => e.remove());
    S.cards.forEach((c, i) => {
      const el = document.createElement('div');
      el.className = 'card' + (sel === c.id ? ' sel' : '');
      el.dataset.id = c.id;
      el.style.left = c.x + 'px';
      el.style.top = c.y + 'px';
      el.innerHTML = '<span class="ctag">N-' + pad(i + 1) + '</span><div class="ch"><span><i class="g"></i>NOTE ' + pad(i + 1) + '</span><button class="cp" aria-label="Copy">' + COPY + '</button></div><div class="cb"><h3></h3><p></p></div>';
      el.querySelector('h3').textContent = c.title || 'UNTITLED';
      el.querySelector('p').textContent = c.body || '';
      cv.appendChild(el);
    });
    drawLinks();
  };

  cv.addEventListener('pointerdown', e => { if (e.target.closest('.cp')) e.stopPropagation(); }, true);
  cv.addEventListener('click', async e => {
    const b = e.target.closest('.cp'); if (!b) return;
    e.stopPropagation();
    const c = card(b.closest('.card').dataset.id);
    const txt = [c.title, c.body].filter(Boolean).join('\n\n');
    try { await navigator.clipboard.writeText(txt); }
    catch (_) { const t = document.createElement('textarea'); t.value = txt; document.body.appendChild(t); t.select(); document.execCommand('copy'); t.remove(); }
    b.textContent = '\u2713';
    setTimeout(() => { b.innerHTML = COPY; }, 900);
  }, true);

  /* CONNECTORS */
  function sides(a, b) {
    const O = 7;
    const A = { x: a.offsetLeft, y: a.offsetTop, w: a.offsetWidth, h: a.offsetHeight };
    const B = { x: b.offsetLeft, y: b.offsetTop, w: b.offsetWidth, h: b.offsetHeight };
    const acx = A.x + A.w / 2, acy = A.y + A.h / 2, bcx = B.x + B.w / 2, bcy = B.y + B.h / 2;
    if (B.x > A.x + A.w - 10) return [{ x: A.x + A.w + O, y: acy, dx: 1, dy: 0 }, { x: B.x - O, y: bcy, dx: -1, dy: 0 }];
    if (B.x + B.w < A.x + 10) return [{ x: A.x - O, y: acy, dx: -1, dy: 0 }, { x: B.x + B.w + O, y: bcy, dx: 1, dy: 0 }];
    return bcy > acy
      ? [{ x: acx, y: A.y + A.h + O, dx: 0, dy: 1 }, { x: bcx, y: B.y - O, dx: 0, dy: -1 }]
      : [{ x: acx, y: A.y - O, dx: 0, dy: -1 }, { x: bcx, y: B.y + B.h + O, dx: 0, dy: 1 }];
  }
  function geo(l) {
    const a = cv.querySelector('[data-id="' + l.a + '"]'), b = cv.querySelector('[data-id="' + l.b + '"]');
    if (!a || !b) return null;
    const [pa, pb] = sides(a, b);
    const d = Math.hypot(pb.x - pa.x, pb.y - pa.y), k = Math.max(50, d * 0.4);
    const bx = l.bx || 0, by = l.by || 0;
    const c1 = { x: pa.x + pa.dx * k + bx, y: pa.y + pa.dy * k + by };
    const c2 = { x: pb.x + pb.dx * k + bx, y: pb.y + pb.dy * k + by };
    const mid = { x: (pa.x + 3 * c1.x + 3 * c2.x + pb.x) / 8, y: (pa.y + 3 * c1.y + 3 * c2.y + pb.y) / 8 };
    return { pa, pb, c1, c2, mid };
  }

  function drawWires() {
    const svg = document.querySelector('#wires');
    svg.innerHTML = '<defs><filter id="gb" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="4"/></filter></defs>';
    S.links.forEach(l => {
      const g = geo(l); if (!g) return;
      const P = (c1, c2, w, o, f) => {
        const p = mk('path', { d: 'M' + g.pa.x + ' ' + g.pa.y + 'C' + c1.x + ' ' + c1.y + ' ' + c2.x + ' ' + c2.y + ' ' + g.pb.x + ' ' + g.pb.y, fill: 'none', stroke: '#fff', 'stroke-width': w, 'stroke-opacity': o, 'stroke-linecap': 'round' });
        if (f) p.setAttribute('filter', 'url(#gb)');
        svg.appendChild(p);
      };
      const dx = g.pb.x - g.pa.x, dy = g.pb.y - g.pa.y, d = Math.hypot(dx, dy) || 1;
      const nx = -dy / d * 14, ny = dx / d * 14;
      P(g.c1, g.c2, 7, 0.22, true);
      P({ x: g.c1.x + nx, y: g.c1.y + ny }, { x: g.c2.x - nx, y: g.c2.y - ny }, 1, 0.7);
      P({ x: g.c1.x - nx, y: g.c1.y - ny }, { x: g.c2.x + nx, y: g.c2.y + ny }, 1, 0.7);
      P(g.c1, g.c2, 1.6, 1);
    });
  }

  function drawHandles() {
    let h = document.querySelector('#hdl');
    if (!h) { h = mk('svg', { id: 'hdl' }); cv.appendChild(h); }
    h.innerHTML = '';
    S.links.forEach(l => {
      const g = geo(l); if (!g) return;
      [g.pa, g.pb].forEach(p => {
        const v = p.dx !== 0;
        h.appendChild(mk('ellipse', { cx: p.x, cy: p.y, rx: v ? 5 : 18, ry: v ? 18 : 5, fill: '#fff', filter: 'url(#gb)' }));
        h.appendChild(mk('ellipse', { cx: p.x, cy: p.y, rx: v ? 1.6 : 10, ry: v ? 10 : 1.6, fill: '#fff' }));
      });
      const ring = mk('circle', { cx: g.mid.x, cy: g.mid.y, r: 6, fill: '#000', stroke: '#fff', 'stroke-width': 1.5 });
      const hit = mk('circle', { cx: g.mid.x, cy: g.mid.y, r: 22, fill: 'transparent' });
      hit.style.pointerEvents = 'all';
      hit.style.touchAction = 'none';
      let s = null, mv = false;
      hit.onpointerdown = e => {
        e.stopPropagation();
        hit.setPointerCapture(e.pointerId);
        s = { x: e.clientX, y: e.clientY, bm: { x: g.mid.x - 0.75 * (l.bx || 0), y: g.mid.y - 0.75 * (l.by || 0) } };
        mv = false;
      };
      hit.onpointermove = e => {
        if (!s) return;
        if (Math.abs(e.clientX - s.x) + Math.abs(e.clientY - s.y) > 6) mv = true;
        if (!mv) return;
        const r = cv.getBoundingClientRect();
        l.bx = (e.clientX - r.left - s.bm.x) / 0.75;
        l.by = (e.clientY - r.top - s.bm.y) / 0.75;
        drawWires();
        const g2 = geo(l);
        [ring, hit].forEach(c => { c.setAttribute('cx', g2.mid.x); c.setAttribute('cy', g2.mid.y); });
      };
      hit.onpointerup = () => {
        if (!s) return;
        s = null;
        if (mv) { save(); drawHandles(); }
        else if (confirm('Remove this connector?')) { S.links = S.links.filter(x => x !== l); save(); drawLinks(); }
      };
      h.appendChild(ring);
      h.appendChild(hit);
    });
  }

  window.drawLinks = function () { drawWires(); drawHandles(); };
  renderBoard();
})();
