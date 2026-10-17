(() => {
  const q = s => document.querySelector(s);
  const st = document.createElement('style');
  st.textContent = `
#nav{display:none!important}
.view{bottom:var(--sab)!important}
.pad{padding-bottom:110px!important}
#top span:first-child{cursor:pointer;gap:8px}
#top img{width:11px;height:13px;filter:invert(1)}
.notch{cursor:pointer}
.notch canvas{display:none;width:36px;height:44px;margin:-2px auto 0}
.notch.pl canvas{display:block}
.notch.pl img{display:none}
/* player in the app's black/white language */
.plc{background:#0b0b0b!important;border:1px solid rgba(255,255,255,.5)!important;border-radius:22px!important;box-shadow:0 0 0 5px #000,0 0 0 6px rgba(255,255,255,.16)!important;font-family:'Space Mono',ui-monospace,monospace!important;color:#f4f4f2!important;margin:30px 18px 0!important;position:relative}
.plc button{background:#000!important;border:1px solid rgba(255,255,255,.6)!important;color:#f4f4f2!important}
.plc #plPlay{background:#f4f4f2!important;color:#000!important}
.plx button{border:0!important;background:none!important}
.plx span{display:flex;align-items:center}
.plx button.on,.plt button.on{color:#f4f4f2!important;opacity:1}
.plx button{opacity:.45}
#plArt{border-radius:14px!important;border:1px solid rgba(255,255,255,.35)}
.plm.yt #plArt{height:auto!important;aspect-ratio:16/9}
.pli h4{font-family:'Anton',Impact,sans-serif!important;font-weight:400!important;text-transform:uppercase;font-size:24px!important;line-height:1.05!important}
.pli small{color:#8a8a8a!important;font-size:10px!important;letter-spacing:.14em}
#plFill{background:#f4f4f2!important}
#plBar{background:#2a2a2a!important;height:3px!important}
.plx{color:#8a8a8a!important;font-size:10px!important}
/* menu */
#menu{position:fixed;inset:0;z-index:80;background:rgba(0,0,0,.78);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);display:none;flex-direction:column;justify-content:center;gap:14px;padding:24px}
#menu.on{display:flex}
.mi{opacity:0;border:1px solid #fff;border-radius:22px;padding:16px 20px;display:flex;justify-content:space-between;align-items:flex-end;background:#050505;color:#f4f4f2}
.mi.cur{background:#f4f4f2;color:#000}
.mi b{font-family:'Anton',Impact,sans-serif;font-weight:400;font-size:16vw;line-height:1;text-transform:uppercase}
.mi span{font-size:10px;letter-spacing:.2em}
#menu.on .mi{animation:mpop .55s cubic-bezier(.2,.9,.3,1.15) forwards}
#menu.on .mi:nth-child(2){animation-delay:.08s}
#menu.on .mi:nth-child(3){animation-delay:.16s}
@keyframes mpop{from{opacity:0;transform:translateY(60px) scale(.94)}to{opacity:1;transform:none}}
/* mini player */
#mini{position:fixed;left:12px;right:12px;bottom:calc(10px + var(--sab));z-index:40;height:56px;border:1px solid rgba(255,255,255,.6);border-radius:18px;background:#050505;display:none;align-items:center;gap:10px;padding:0 10px}
#mini.on{display:flex}
#mini i{width:38px;height:38px;border-radius:10px;background:#222 center/cover;flex:none}
#mini b{flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-size:11px}
#mini button{width:38px;height:38px;border-radius:50%;border:0;background:#f4f4f2;color:#000;display:grid;place-items:center;padding:0}
#mini svg{width:16px;height:16px;fill:currentColor}
#err{margin:10px 18px 0;font-size:9px;color:#d88;letter-spacing:.08em;word-break:break-all}`;
  document.head.appendChild(st);

  /* last-error banner (helps diagnose JS errors) */
  window.addEventListener('error', e => localStorage.setItem('lumim.err', (e.message || 'error') + ' @' + String(e.filename || '').split('/').pop() + ':' + e.lineno));
  const le = localStorage.getItem('lumim.err');
  if (le) { const d = document.createElement('div'); d.id = 'err'; d.textContent = 'LAST ERROR (tap to clear): ' + le; d.onclick = () => { localStorage.removeItem('lumim.err'); d.remove(); }; q('#home').prepend(d); }

  /* menu */
  const top = q('#top span:first-child');
  top.innerHTML = '<img src="leaf.png" alt="">LUMIM';
  const menu = document.createElement('div');
  menu.id = 'menu';
  menu.innerHTML = [['home', '01', 'Home'], ['board', '02', 'Board'], ['music', '03', 'Music']].map(a => '<div class="mi" data-v="' + a[0] + '"><b>' + a[2] + '</b><span>' + a[1] + '</span></div>').join('');
  document.body.appendChild(menu);
  const openMenu = () => { menu.querySelectorAll('.mi').forEach(m => m.classList.toggle('cur', m.dataset.v === view)); menu.classList.add('on'); };
  menu.onclick = e => { const m = e.target.closest('.mi'); if (m) go(m.dataset.v); menu.classList.remove('on'); };
  top.onclick = openMenu;
  q('.notch').onclick = openMenu;

  /* mini player */
  const mini = document.createElement('div');
  mini.id = 'mini';
  mini.innerHTML = '<i></i><b></b><button aria-label="Play/Pause"></button>';
  document.body.appendChild(mini);
  mini.querySelector('b').onclick = () => go('home');
  mini.querySelector('button').onclick = () => q('#plPlay').click();
  const PLAY = '<svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>', PAUSE = '<svg viewBox="0 0 24 24"><path d="M7 5h4v14H7zM13 5h4v14h-4z"/></svg>';
  function sync() {
    const P = window.PS; if (!P) return;
    mini.classList.toggle('on', !!P.kind && view !== 'home');
    mini.querySelector('b').textContent = ((P.track || {}).title || '').toUpperCase();
    mini.querySelector('i').style.backgroundImage = (P.track && P.track.art) ? 'url("' + P.track.art + '")' : '';
    mini.querySelector('button').innerHTML = P.playing ? PAUSE : PLAY;
  }
  window.addEventListener('lumim-player', sync);
  const _go = window.go;
  window.go = v => { _go(v); sync(); };

  /* ASCII pulsing leaf */
  const cols = 18, rows = 22, RAMP = ' .:-=+*#%@';
  const cvs = document.createElement('canvas');
  const dpr = window.devicePixelRatio || 1;
  cvs.width = 36 * dpr; cvs.height = 44 * dpr;
  q('.notch div').appendChild(cvs);
  const ctx = cvs.getContext('2d');
  let A = null;
  const im = new Image();
  im.onload = () => {
    const m = document.createElement('canvas'); m.width = cols; m.height = rows;
    const c = m.getContext('2d'); c.drawImage(im, 0, 0, cols, rows);
    const d = c.getImageData(0, 0, cols, rows).data; A = [];
    for (let i = 0; i < cols * rows; i++) A.push(d[i * 4 + 3] / 255);
  };
  im.src = 'leaf.png';
  setInterval(() => {
    const P = window.PS, on = !!(P && P.playing && view === 'home' && A);
    q('.notch').classList.toggle('pl', on);
    if (!on) return;
    const cw = cvs.width / cols, ch = cvs.height / rows, t = Date.now();
    ctx.clearRect(0, 0, cvs.width, cvs.height);
    ctx.fillStyle = '#fff';
    ctx.font = (ch * 1.15) + 'px monospace';
    const pulse = .5 + .5 * Math.sin(t / 280);
    for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
      const a = A[y * cols + x]; if (a < .25) continue;
      const w = .5 + .5 * Math.sin(t / 240 - (x * .5 + y * .4));
      const l = Math.min(1, a * (.3 + .7 * (w * .65 + pulse * .35)));
      const chr = RAMP[Math.floor(l * (RAMP.length - 1))];
      if (chr !== ' ') ctx.fillText(chr, x * cw, (y + 1) * ch);
    }
  }, 90);
  sync();
})();
