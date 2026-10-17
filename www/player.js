(() => {
  const q = s => document.querySelector(s);
  const st = document.createElement('style');
  st.textContent = `
#dock{display:none!important}
.plc{margin:22px 14px 0;padding:16px;border-radius:30px;background:linear-gradient(160deg,#1b212c,#0f131a);box-shadow:0 18px 40px rgba(0,0,0,.5);font-family:-apple-system,'Inter','Segoe UI',Roboto,sans-serif;color:#e8ecf2}
.plc button{border:0;color:#dfe5ee;background:#2a3340;display:grid;place-items:center;padding:0;font:inherit}
.plt{display:flex;justify-content:space-between}
.plt button{width:38px;height:38px;border-radius:50%}
.plm{display:flex;gap:14px;align-items:flex-end;margin-top:14px}
#plArt{width:112px;height:112px;flex:none;border-radius:18px;background:#202733 center/cover;overflow:hidden}
#plArt iframe{width:100%;height:100%;border:0}
.plm.yt{flex-direction:column;align-items:stretch}
.plm.yt #plArt{width:100%;height:190px}
.pli{min-width:0;flex:1}
.pli small{color:#8e99aa;font-size:12px}
.pli h4{margin:4px 0 12px;font-size:19px;line-height:1.2;font-weight:700;overflow:hidden;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical}
.plb{display:flex;gap:8px}
.plb button{width:44px;height:44px;border-radius:50%}
.plb #plPlay{width:56px;height:56px}
#plBar{height:5px;border-radius:5px;background:#2a303b;margin:16px 0 8px;position:relative;touch-action:none}
#plBar:before{content:"";position:absolute;left:0;right:0;top:-12px;bottom:-12px}
#plFill{display:block;height:100%;width:0;border-radius:5px;background:linear-gradient(90deg,#8d99ae,#d4bb85)}
.plx{display:flex;justify-content:space-between;align-items:center;font-size:12px;color:#8e99aa}
.plx span button{background:none;width:34px;height:30px;color:#8e99aa}
.plx button.on,.plt button.on{color:#d4bb85}
.plc svg{width:18px;height:18px;fill:currentColor}`;
  document.head.appendChild(st);

  const I = {
    play: '<svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>',
    pause: '<svg viewBox="0 0 24 24"><path d="M7 5h4v14H7zM13 5h4v14h-4z"/></svg>',
    prev: '<svg viewBox="0 0 24 24"><path d="M6 5h2v14H6zM20 5v14L9 12z"/></svg>',
    next: '<svg viewBox="0 0 24 24"><path d="M16 5h2v14h-2zM4 5v14l11-7z"/></svg>',
    heart: '<svg viewBox="0 0 24 24"><path d="M12 21s-8-5.2-8-11a4.5 4.5 0 0 1 8-2.8A4.5 4.5 0 0 1 20 10c0 5.8-8 11-8 11z"/></svg>',
    lib: '<svg viewBox="0 0 24 24"><path d="M4 6h16v2H4zM4 11h16v2H4zM4 16h10v2H4z"/></svg>',
    shuf: '<svg viewBox="0 0 24 24"><path d="M16 4h4v4l-1.5-1.5L5.4 19.6 4 18.2 17.1 5.1zM4 6.5L5.5 5l5 5L9 11.5zM14.5 14l1.5-1.5 2.5 2.5L20 13.5V18h-4.5l1.5-1.5z"/></svg>',
    rep: '<svg viewBox="0 0 24 24"><path d="M7 7h10v3l4-4-4-4v3H5v6h2zM17 17H7v-3l-4 4 4 4v-3h12v-6h-2z"/></svg>'
  };
  const card = document.createElement('div');
  card.className = 'plc';
  card.innerHTML =
    '<div class="plt"><button id="plHeart">' + I.heart + '</button><button id="plLib">' + I.lib + '</button></div>' +
    '<div class="plm" id="plM"><div id="plArt"></div><div class="pli"><small id="plSub">NOTHING PLAYING</small><h4 id="plTitle">Pick a track in Music</h4>' +
    '<div class="plb"><button id="plPlay">' + I.play + '</button><button id="plPrev">' + I.prev + '</button><button id="plNext">' + I.next + '</button></div></div></div>' +
    '<div id="plBar"><i id="plFill"></i></div>' +
    '<div class="plx"><span id="plCur">0:00</span><span><button id="plShuf">' + I.shuf + '</button><button id="plRep">' + I.rep + '</button></span><span id="plDur">0:00</span></div>';
  const home = q('#home');
  home.insertBefore(card, home.querySelector('.stats'));

  const L = window.LSP;
  const P = { kind: null, playing: false, pos: 0, dur: 0, t0: Date.now(), track: null, shuf: false, rep: 'off', fr: null };
  const fmt = ms => { const s = Math.max(0, Math.floor(ms / 1000)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };
  const call = (p, m, b) => L.api(p, m, b);

  function ui() {
    q('#plPlay').innerHTML = P.playing ? I.pause : I.play;
    q('#plShuf').classList.toggle('on', P.shuf);
    q('#plRep').classList.toggle('on', P.rep !== 'off');
    q('#plDur').textContent = fmt(P.dur);
    window.dispatchEvent(new Event('lumim-player'));
    const t = P.track;
    q('#plHeart').classList.toggle('on', !!(t && S.tracks.some(x => x.url && x.url === t.url)));
  }
  function meta(t) {
    P.track = t;
    q('#plTitle').textContent = t.title || '';
    q('#plSub').textContent = t.sub || t.kind || '';
    if (P.kind === 'sp') q('#plArt').style.backgroundImage = t.art ? 'url("' + t.art + '")' : '';
    ui();
  }
  setInterval(() => {
    const now = Date.now();
    if (P.playing) P.pos += now - P.t0;
    P.t0 = now;
    if (P.dur) { q('#plFill').style.width = Math.min(100, P.pos / P.dur * 100) + '%'; q('#plCur').textContent = fmt(P.pos); }
  }, 500);

  /* SPOTIFY (remote control of the Spotify app) */
  async function sync() {
    if (P.kind !== 'sp' || !L.connected()) return;
    try {
      const j = await call('/me/player');
      if (!j || !j.item) return;
      P.playing = j.is_playing; P.pos = j.progress_ms; P.dur = j.item.duration_ms; P.t0 = Date.now();
      P.shuf = j.shuffle_state; P.rep = j.repeat_state;
      meta({ title: j.item.name, sub: (j.item.artists || []).map(a => a.name).join(', '), kind: 'SPOTIFY', art: ((j.item.album || {}).images || [])[0] ? j.item.album.images[0].url : '', url: (j.item.external_urls || {}).spotify });
    } catch (e) {}
  }
  setInterval(sync, 4000);
  async function spPlay(it) {
    P.kind = 'sp'; clearYt(); meta(it);
    const body = it.uri.includes(':track:') ? { uris: [it.uri] } : { context_uri: it.uri };
    try { await call('/me/player/play', 'PUT', body); }
    catch (e) {
      try {
        const d = await call('/me/player/devices');
        const dev = (d.devices || [])[0];
        if (!dev) throw 0;
        await call('/me/player/play?device_id=' + dev.id, 'PUT', body);
      } catch (e2) {
        alert('Open the Spotify app once (and play anything), then try again. Spotify Premium is required.');
        location.href = 'spotify://';
        return;
      }
    }
    P.playing = true; P.pos = 0; P.t0 = Date.now(); ui();
    setTimeout(sync, 1200);
  }

  /* YOUTUBE (video shown in the art slot) */
  function clearYt() { q('#plM').classList.remove('yt'); q('#plArt').innerHTML = ''; P.fr = null; }
  function ytCmd(f, a) { if (P.fr && P.fr.contentWindow) P.fr.contentWindow.postMessage(JSON.stringify({ event: 'command', func: f, args: a || [] }), '*'); }
  function ytPlay(it) {
    P.kind = 'yt'; P.playing = true; P.pos = 0; P.dur = 0; P.t0 = Date.now(); meta(it);
    q('#plM').classList.add('yt'); q('#plArt').style.backgroundImage = '';
    const f = document.createElement('iframe');
    f.allow = 'autoplay; encrypted-media';
    f.src = 'https://www.youtube.com/embed/' + it.yt + '?autoplay=1&playsinline=1&controls=0&enablejsapi=1&origin=' + encodeURIComponent(location.origin);
    f.onload = () => f.contentWindow.postMessage(JSON.stringify({ event: 'listening', id: 1 }), '*');
    q('#plArt').innerHTML = ''; q('#plArt').appendChild(f); P.fr = f;
  }
  window.addEventListener('message', e => {
    if (!P.fr || e.source !== P.fr.contentWindow) return;
    let d; try { d = JSON.parse(e.data); } catch (x) { return; }
    const i = d && d.info; if (!i) return;
    if (i.currentTime != null) { P.pos = i.currentTime * 1000; P.t0 = Date.now(); }
    if (i.duration) P.dur = i.duration * 1000;
    if (i.playerState != null) {
      P.playing = i.playerState === 1;
      if (i.playerState === 0) { if (P.rep !== 'off') { ytCmd('seekTo', [0, true]); ytCmd('playVideo'); } else step(1); }
    }
    ui();
  });
  function ytList() { return S.tracks.filter(t => t.kind === 'YOUTUBE'); }
  const ytOf = t => { const m = (t.src || t.url || '').match(/(?:embed\/|v=)([\w-]{11})/); return m ? m[1] : null; };
  function step(dir) {
    const l = ytList(); if (!l.length) return;
    let i = l.findIndex(t => t.url === (P.track || {}).url);
    i = P.shuf ? Math.floor(Math.random() * l.length) : (i + dir + l.length) % l.length;
    ytPlay(Object.assign({}, l[i], { yt: ytOf(l[i]) }));
  }

  /* CONTROLS */
  q('#plPlay').onclick = async () => {
    if (!P.kind) return;
    if (P.kind === 'yt') { ytCmd(P.playing ? 'pauseVideo' : 'playVideo'); P.playing = !P.playing; ui(); return; }
    try { await call(P.playing ? '/me/player/pause' : '/me/player/play', 'PUT'); P.playing = !P.playing; P.t0 = Date.now(); ui(); } catch (e) { sync(); }
  };
  q('#plNext').onclick = async () => { if (P.kind === 'yt') return step(1); if (P.kind === 'sp') { try { await call('/me/player/next', 'POST'); setTimeout(sync, 800); } catch (e) {} } };
  q('#plPrev').onclick = async () => { if (P.kind === 'yt') return step(-1); if (P.kind === 'sp') { try { await call('/me/player/previous', 'POST'); setTimeout(sync, 800); } catch (e) {} } };
  q('#plShuf').onclick = async () => {
    P.shuf = !P.shuf; ui();
    if (P.kind === 'sp') try { await call('/me/player/shuffle?state=' + P.shuf, 'PUT'); } catch (e) {}
  };
  q('#plRep').onclick = async () => {
    P.rep = P.rep === 'off' ? 'context' : P.rep === 'context' ? 'track' : 'off'; ui();
    if (P.kind === 'sp') try { await call('/me/player/repeat?state=' + P.rep, 'PUT'); } catch (e) {}
  };
  q('#plBar').onclick = async e => {
    if (!P.dur) return;
    const r = q('#plBar').getBoundingClientRect();
    const ms = Math.round(Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)) * P.dur);
    P.pos = ms; P.t0 = Date.now();
    if (P.kind === 'yt') ytCmd('seekTo', [ms / 1000, true]);
    else try { await call('/me/player/seek?position_ms=' + ms, 'PUT'); } catch (x) {}
  };
  q('#plHeart').onclick = () => {
    const t = P.track; if (!t || !t.url) return;
    if (!S.tracks.some(x => x.url === t.url)) {
      S.tracks.push({ id: uid(), url: t.url, title: t.title, kind: t.kind, src: t.src || (t.kind === 'YOUTUBE' ? 'https://www.youtube.com/embed/' + t.yt : 'https://open.spotify.com/embed/' + t.url.split('.com/')[1]) });
      save(); renderTracks();
    }
    ui();
  };
  q('#plLib').onclick = () => go('music');

  /* PUBLIC API + hooks for the SAVED list */
  window.Player = {
    play(it) { if (it.kind === 'YOUTUBE') ytPlay(it); else spPlay(it); }
  };
  window.play = id => {
    const t = S.tracks.find(x => x.id === id); if (!t) return;
    window.playing = null;
    if (t.kind === 'YOUTUBE') { const y = ytOf(t); if (y) window.Player.play({ title: t.title, kind: 'YOUTUBE', yt: y, url: t.url, src: t.src }); }
    else if (t.kind === 'SPOTIFY') { const m = (t.url || t.src || '').match(/(track|album|playlist|episode|show|artist)\/(\w+)/); if (m) window.Player.play({ title: t.title, kind: 'SPOTIFY', uri: 'spotify:' + m[1] + ':' + m[2], url: t.url, src: t.src }); }
    else alert('SoundCloud links are not supported in the new player.');
  };
  window.PS = P;
  window.stop = () => { if (P.kind === 'yt') ytCmd('pauseVideo'); else if (P.kind === 'sp') call('/me/player/pause', 'PUT').catch(() => {}); P.playing = false; ui(); };
  ui();
})();
