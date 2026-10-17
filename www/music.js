(() => {
  const C = window.CFG || {};
  const RED = 'com.v.lumim://callback';
  const SCOPE = 'playlist-read-private playlist-read-collaborative user-library-read';
  const Cap = (window.Capacitor && Capacitor.Plugins) || {};
  const getT = () => { try { return JSON.parse(localStorage.getItem('lumim.sp')); } catch (e) { return null; } };
  const setT = t => t ? localStorage.setItem('lumim.sp', JSON.stringify(t)) : localStorage.removeItem('lumim.sp');
  const b64 = b => btoa(String.fromCharCode(...new Uint8Array(b))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const dec = s => { const t = document.createElement('textarea'); t.innerHTML = s; return t.value; };
  let src = 'sp';

  /* UI */
  const pad = document.querySelector('#music .pad');
  const box = document.createElement('div');
  box.innerHTML =
    '<div class="add" id="lib">' +
    '<button class="btn inv" id="spBtn" style="flex:none"></button>' +
    '<div class="row"><button class="btn" id="lbPl">MY PLAYLISTS</button><button class="btn" id="lbLk">LIKED SONGS</button></div>' +
    '<input id="qIn" placeholder="Search new music..." autocomplete="off">' +
    '<div class="row"><button class="btn on" id="qSp">SPOTIFY</button><button class="btn" id="qYt">YOUTUBE</button><button class="btn inv" id="qGo">SEARCH</button></div>' +
    '</div><div id="res"></div>' +
    '<p style="font-size:9px;letter-spacing:.14em;color:#8a8a8a;margin:18px 0 8px">SAVED TRACKS &amp; MANUAL LINKS</p>';
  pad.insertBefore(box, pad.querySelector('.add'));
  const $r = document.querySelector('#res');

  const status = (m) => { $r.innerHTML = '<div class="empty"></div>'; $r.firstChild.textContent = m; };

  function refreshBtn() {
    document.querySelector('#spBtn').textContent = getT() ? 'SPOTIFY CONNECTED - TAP TO LOG OUT' : 'CONNECT SPOTIFY';
  }

  /* SPOTIFY AUTH (PKCE) */
  async function login() {
    if (getT()) { if (confirm('Log out of Spotify?')) { setT(null); refreshBtn(); status(''); } return; }
    if (!C.SPOTIFY_CLIENT_ID) return alert('Add your Spotify Client ID in www/config.js');
    const v = b64(crypto.getRandomValues(new Uint8Array(48)));
    localStorage.setItem('lumim.pkce', v);
    const ch = b64(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(v)));
    const url = 'https://accounts.spotify.com/authorize?' + new URLSearchParams({
      client_id: C.SPOTIFY_CLIENT_ID, response_type: 'code', redirect_uri: RED,
      scope: SCOPE, code_challenge_method: 'S256', code_challenge: ch
    });
    if (Cap.Browser) Cap.Browser.open({ url }); else location.href = url;
  }
  async function token(body) {
    const r = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ client_id: C.SPOTIFY_CLIENT_ID, ...body })
    });
    const j = await r.json();
    if (!j.access_token) throw new Error(j.error_description || 'Spotify login failed');
    const old = getT() || {};
    setT({ a: j.access_token, r: j.refresh_token || old.r, e: Date.now() + j.expires_in * 1000 - 60000 });
  }
  if (Cap.App) Cap.App.addListener('appUrlOpen', async ({ url }) => {
    if (!url || !url.startsWith(RED)) return;
    try { Cap.Browser && Cap.Browser.close(); } catch (e) {}
    const code = new URL(url).searchParams.get('code');
    if (!code) return;
    try {
      await token({ grant_type: 'authorization_code', code, redirect_uri: RED, code_verifier: localStorage.getItem('lumim.pkce') });
      refreshBtn(); go('music'); status('Spotify connected. Tap MY PLAYLISTS or search.');
    } catch (e) { alert(e.message); }
  });
  async function api(path) {
    let t = getT();
    if (!t) throw new Error('Connect Spotify first.');
    if (Date.now() > t.e) { await token({ grant_type: 'refresh_token', refresh_token: t.r }); t = getT(); }
    const r = await fetch('https://api.spotify.com/v1' + path, { headers: { Authorization: 'Bearer ' + t.a } });
    if (!r.ok) throw new Error('Spotify error ' + r.status);
    return r.json();
  }

  /* ITEMS */
  const sp = (o, type) => o && o.id ? {
    title: o.name, kind: 'SPOTIFY',
    sub: type === 'track' ? (o.artists || []).map(a => a.name).join(', ') : type === 'album' ? 'ALBUM' : ((o.owner && o.owner.display_name) || 'PLAYLIST'),
    src: 'https://open.spotify.com/embed/' + type + '/' + o.id,
    url: (o.external_urls && o.external_urls.spotify) || ''
  } : null;
  const ytEmbed = id => 'https://www.youtube.com/embed/' + id + '?autoplay=1&playsinline=1&enablejsapi=1&origin=' + encodeURIComponent(location.origin);

  function show(items) {
    items = items.filter(Boolean);
    $r.innerHTML = '';
    if (!items.length) return status('Nothing found.');
    items.forEach(it => {
      const row = document.createElement('div');
      row.className = 'trk';
      row.innerHTML = '<div class="t"><b></b><small></small></div><button class="pl">&#9654;</button><button class="sv">+</button>';
      row.querySelector('b').textContent = it.title;
      row.querySelector('small').textContent = it.kind + (it.sub ? ' - ' + it.sub : '');
      row.querySelector('.pl').onclick = () => {
        playing = null;
        const d = document.querySelector('#dock');
        d.dataset.kind = it.kind;
        document.querySelector('#frame').src = it.src;
        d.classList.add('on');
        d.classList.toggle('full', view === 'music');
        renderTracks();
      };
      row.querySelector('.sv').onclick = e => {
        S.tracks.push({ id: uid(), url: it.url, title: it.title, kind: it.kind, src: it.src });
        save(); renderTracks(); e.target.textContent = '\u2713';
      };
      $r.appendChild(row);
    });
  }

  /* ACTIONS */
  async function playlists() {
    try {
      status('Loading...');
      const j = await api('/me/playlists?limit=50');
      show((j.items || []).map(p => sp(p, 'playlist')));
    } catch (e) { status(e.message); }
  }
  async function liked() {
    try {
      status('Loading...');
      const j = await api('/me/tracks?limit=50');
      show((j.items || []).map(x => sp(x.track || x.item, 'track')));
    } catch (e) { status(e.message + ' (liked songs may be unavailable for this app)'); }
  }
  async function search() {
    const q = document.querySelector('#qIn').value.trim();
    if (!q) return;
    status('Searching...');
    try {
      if (src === 'sp') {
        const j = await api('/search?type=track,playlist,album&limit=10&q=' + encodeURIComponent(q));
        show([
          ...((j.tracks && j.tracks.items) || []).map(x => sp(x, 'track')),
          ...((j.albums && j.albums.items) || []).map(x => sp(x, 'album')),
          ...((j.playlists && j.playlists.items) || []).map(x => sp(x, 'playlist'))
        ]);
      } else {
        if (!C.YT_API_KEY) return status('Add your YouTube API key in www/config.js');
        const r = await fetch('https://www.googleapis.com/youtube/v3/search?' + new URLSearchParams({ part: 'snippet', type: 'video', maxResults: 15, q, key: C.YT_API_KEY }));
        const j = await r.json();
        if (!r.ok) throw new Error((j.error && j.error.message) || 'YouTube error');
        show((j.items || []).map(i => ({
          title: dec(i.snippet.title), sub: dec(i.snippet.channelTitle), kind: 'YOUTUBE',
          src: ytEmbed(i.id.videoId), url: 'https://www.youtube.com/watch?v=' + i.id.videoId
        })));
      }
    } catch (e) { status(e.message); }
  }

  const $ = s => document.querySelector(s);
  $('#spBtn').onclick = login;
  $('#lbPl').onclick = playlists;
  $('#lbLk').onclick = liked;
  $('#qGo').onclick = search;
  $('#qIn').addEventListener('keydown', e => { if (e.key === 'Enter') search(); });
  $('#qSp').onclick = () => { src = 'sp'; $('#qSp').classList.add('on'); $('#qYt').classList.remove('on'); };
  $('#qYt').onclick = () => { src = 'yt'; $('#qYt').classList.add('on'); $('#qSp').classList.remove('on'); };
  const bgSet = on => {
    try {
      const b = window.cordova && cordova.plugins && cordova.plugins.backgroundMode;
      if (b) { if (on) b.enable(); else b.disable(); }
    } catch (e) {}
  };
  const _play = window.play, _stop = window.stop;
  window.play = function (id) { _play(id); bgSet(true); };
  window.stop = function () { _stop(); bgSet(false); };
  document.querySelector('#res').addEventListener('click', e => { if (e.target.closest('.pl')) bgSet(true); });
  refreshBtn();
})();
