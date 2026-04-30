// =============================================================
// 키위 경쟁 게임 — main script
// =============================================================

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

// ============== Game definitions ==============
const GAMES = {
  swim: {
    name: '🏊 수영 게임',
    theme: 'theme-swim',
    laneHeight: 56,
    duration: { min: 18, max: 30 },
    // base transform per token: tilt + bobbing
    tokenStyle: (p, t) => {
      const bob = Math.sin(t / 220 + p.bobPhase) * 10;
      return `translate(0, calc(-50% + ${bob}px)) rotate(-45deg)`;
    },
    events: [
      { id: 'shark',  prob: 0.012, label: '🦈 상어가 나타났다!', apply: applyShark },
      { id: 'cramp',  prob: 0.010, label: '💢 발에 쥐가 났다!',  apply: applyCramp },
      { id: 'jelly',  prob: 0.012, label: '🪼 해파리에 올라탔다!', apply: applyJelly },
    ],
  },
  run: {
    name: '🏃 달리기 게임',
    theme: 'theme-run',
    laneHeight: 56,
    duration: { min: 14, max: 22 },
    tokenStyle: (p, t) => {
      const bounce = Math.abs(Math.sin(t / 90 + p.bobPhase)) * 8;
      return `translate(0, calc(-50% - ${bounce}px))`;
    },
    events: [
      { id: 'banana', prob: 0.012, label: '🍌 바나나에 미끄러졌다!', apply: applyBanana },
      { id: 'energy', prob: 0.012, label: '⚡ 에너지 드링크 획득!',  apply: applyEnergy },
      { id: 'hurdle', prob: 0.010, label: '🚧 허들에 걸렸다!',       apply: applyHurdle },
    ],
  },
  space: {
    name: '🚀 우주 날기 게임',
    theme: 'theme-space',
    laneHeight: 78,
    duration: { min: 20, max: 32 },
    tokenStyle: (p, t) => {
      const driftY = Math.sin(t / 380 + p.bobPhase) * 26;
      const tilt = Math.sin(t / 450 + p.bobPhase * 1.3) * 24;
      const scale = 0.92 + Math.abs(Math.sin(t / 700 + p.bobPhase)) * 0.16;
      return `translate(0, calc(-50% + ${driftY}px)) rotate(${tilt}deg) scale(${scale})`;
    },
    events: [
      { id: 'blackhole', prob: 0.010, label: '🕳️ 블랙홀에 끌려간다!', apply: applyBlackhole },
      { id: 'asteroid',  prob: 0.012, label: '☄️ 운석 충돌!',         apply: applyAsteroid },
      { id: 'warp',      prob: 0.012, label: '✨ 워프 부스트!',         apply: applyWarp },
    ],
  },
  drink: {
    name: '🍺 술 마시기 게임',
    theme: 'theme-drink',
    laneHeight: 78,
    duration: { min: 16, max: 26 },
    stationary: true, // 자리에 앉아 마시는 모드 — 진행은 잔 진행바로 표현
    tokenStyle: (p, t) => {
      // 약 3초마다 잔을 기울여 마시는 동작
      const cycleMs = 3000;
      const ms = (t + p.bobPhase * 1000) % cycleMs;
      let drink = 0;
      if (ms > 1800 && ms < 2500) {
        const phase = (ms - 1800) / 700;
        drink = -Math.sin(phase * Math.PI) * 34;
      }
      const sway = Math.sin(t / 600 + p.bobPhase) * 4;
      return `translate(0, -50%) rotate(${drink + sway}deg)`;
    },
    events: [
      { id: 'oneshot',  prob: 0.013, label: '🍻 원샷! 텐션 폭발!',     apply: applyOneshot },
      { id: 'vomit',    prob: 0.011, label: '🤢 토하느라 멈췄다…',     apply: applyVomit },
      { id: 'cheers',   prob: 0.009, label: '🥂 건배! 모두 한 모금!', apply: applyCheers, group: true },
      { id: 'blackout', prob: 0.008, label: '😵 필름 끊겼다!',         apply: applyBlackout },
      { id: 'snack',    prob: 0.012, label: '🍤 안주 보충!',           apply: applySnack },
    ],
  },
};

// ============== State ==============
const state = {
  selectedGame: 'swim',
  players: [],   // [{id, name, image}]
  running: null, // active game state
};

// ============== Avatar generation ==============
const AVATAR_PALETTE = [
  ['#ff8a8a', '#ff4d6d'], ['#ffd166', '#f48c06'],
  ['#a0e7a0', '#06a77d'], ['#8ad7ff', '#0466c8'],
  ['#c5a3ff', '#7b2cbf'], ['#ffb3de', '#d62976'],
  ['#9ef2e8', '#0aa39d'], ['#ffe066', '#fb8500'],
  ['#b0ffe7', '#1a8a7a'], ['#cdb4db', '#6a4c93'],
];
function hashStr(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}
function generateAvatarSVG(name) {
  const safe = (name || '?').trim() || '?';
  const ch = [...safe][0].toUpperCase();
  const idx = hashStr(safe) % AVATAR_PALETTE.length;
  const [c1, c2] = AVATAR_PALETTE[idx];
  const id = 'g' + (hashStr(safe) % 99999);
  return `
<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <defs>
    <linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${c1}"/>
      <stop offset="100%" stop-color="${c2}"/>
    </linearGradient>
  </defs>
  <rect width="64" height="64" fill="url(#${id})"/>
  <circle cx="32" cy="26" r="11" fill="rgba(255,255,255,.92)"/>
  <path d="M12 60 C 12 44, 52 44, 52 60 Z" fill="rgba(255,255,255,.92)"/>
  <text x="32" y="32" text-anchor="middle" font-family="-apple-system,Segoe UI,sans-serif"
        font-size="14" font-weight="700" fill="${c2}">${escapeXml(ch)}</text>
</svg>`.trim();
}
function escapeXml(s) {
  return s.replace(/[<>&"']/g, c => ({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;',"'":'&apos;'}[c]));
}

// ============== Lobby ==============
function renderPlayers() {
  const list = $('#players-list');
  list.innerHTML = '';
  state.players.forEach((p, i) => {
    const row = document.createElement('div');
    row.className = 'player-row';
    row.innerHTML = `
      <label class="player-avatar" title="이미지 등록">
        ${p.image
          ? `<img src="${p.image}" alt="">`
          : generateAvatarSVG(p.name || `P${i+1}`)}
        <input type="file" accept="image/*" hidden data-action="upload" data-id="${p.id}">
      </label>
      <input class="player-input" type="text" maxlength="12"
             placeholder="플레이어 ${i+1}" value="${escapeAttr(p.name)}"
             data-action="rename" data-id="${p.id}">
      <div class="player-actions">
        ${p.image ? `<button class="icon-btn" title="이미지 제거" data-action="clear-img" data-id="${p.id}">🗑</button>` : ''}
        <button class="icon-btn danger" title="플레이어 제거" data-action="remove" data-id="${p.id}">✕</button>
      </div>
    `;
    list.appendChild(row);
  });
  $('#player-count').textContent = state.players.length;
  $('#add-player').disabled = state.players.length >= 10;
  $('#start-btn').disabled = state.players.length < 1;
}
function escapeAttr(s) {
  return (s || '').replace(/[<>&"']/g, c => ({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;',"'":'&#39;'}[c]));
}

let nextPlayerId = 1;
function addPlayer() {
  if (state.players.length >= 10) return;
  state.players.push({ id: nextPlayerId++, name: '', image: null });
  renderPlayers();
}

// Lobby event delegation
$('#players-list').addEventListener('input', (e) => {
  const t = e.target;
  if (t.dataset.action === 'rename') {
    const id = +t.dataset.id;
    const p = state.players.find(x => x.id === id);
    if (p) {
      p.name = t.value;
      // refresh just the avatar (if still default)
      if (!p.image) {
        const ava = t.closest('.player-row').querySelector('.player-avatar');
        ava.innerHTML = generateAvatarSVG(p.name || '?')
          + `<input type="file" accept="image/*" hidden data-action="upload" data-id="${p.id}">`;
      }
    }
  }
});
$('#players-list').addEventListener('change', (e) => {
  const t = e.target;
  if (t.dataset.action === 'upload' && t.files && t.files[0]) {
    const id = +t.dataset.id;
    const p = state.players.find(x => x.id === id);
    if (!p) return;
    const reader = new FileReader();
    reader.onload = () => { p.image = reader.result; renderPlayers(); };
    reader.readAsDataURL(t.files[0]);
  }
});
$('#players-list').addEventListener('click', (e) => {
  const btn = e.target.closest('[data-action]');
  if (!btn) return;
  const id = +btn.dataset.id;
  const p = state.players.find(x => x.id === id);
  if (!p) return;
  if (btn.dataset.action === 'clear-img') { p.image = null; renderPlayers(); }
  if (btn.dataset.action === 'remove') {
    state.players = state.players.filter(x => x.id !== id);
    renderPlayers();
  }
});

$('#add-player').addEventListener('click', addPlayer);

// Game card selection
$$('.game-card').forEach(card => {
  card.addEventListener('click', () => {
    state.selectedGame = card.dataset.game;
    $$('.game-card').forEach(c => c.setAttribute('aria-checked', c === card ? 'true' : 'false'));
  });
});

// Start
$('#start-btn').addEventListener('click', () => {
  if (state.players.length === 0) return;
  // Default name fill
  state.players.forEach((p, i) => {
    if (!p.name.trim()) p.name = `P${i+1}`;
  });
  startGame();
});

// Back
$('#back-btn').addEventListener('click', () => {
  if (state.running) cancelAnimationFrame(state.running.rafId);
  state.running = null;
  document.body.classList.remove('in-game-swim','in-game-run','in-game-space','in-game-drink');
  showScreen('lobby');
});

// ============== Game runtime ==============
function showScreen(name) {
  ['lobby', 'game', 'result'].forEach(s => {
    $('#' + s).hidden = (s !== name);
  });
}

function startGame() {
  const g = GAMES[state.selectedGame];
  $('#game-title').textContent = g.name;

  // Body theming per game (no black screen — vivid bg)
  document.body.classList.remove('in-game-swim','in-game-run','in-game-space','in-game-drink');
  document.body.classList.add('in-game-' + state.selectedGame);

  // Hide finish line for stationary games (drink — players sit at seat)
  $('#finish-line').style.display = g.stationary ? 'none' : '';

  const track = $('#track');
  track.className = ''; // reset
  track.classList.add(g.theme);
  track.style.setProperty('--lane-h', g.laneHeight + 'px');
  track.innerHTML = '';

  // Build lanes & tokens
  const runners = state.players.map((p, i) => {
    const lane = document.createElement('div');
    lane.className = 'lane';
    lane.innerHTML = `<span class="lane-label">${i + 1}레인 · ${escapeAttr(p.name)}</span>`;

    // Progress track (stationary mode shows fill bar)
    let progressFill = null;
    if (g.stationary) {
      const bar = document.createElement('div');
      bar.className = 'progress-track';
      bar.innerHTML = '<div class="progress-fill"></div>';
      lane.appendChild(bar);
      progressFill = bar.querySelector('.progress-fill');
    }

    // Token: image-as-is when uploaded (.bare), circular SVG avatar otherwise
    const useBare = !!p.image;
    const token = document.createElement('div');
    token.className = 'token ' + g.theme + '-token' + (useBare ? ' bare' : '');
    token.dataset.id = p.id;
    token.innerHTML = `
      <span class="name-tag">${escapeAttr(p.name)}</span>
      <div class="ava">${useBare
        ? `<img src="${p.image}" alt="">`
        : generateAvatarSVG(p.name)}</div>
      <div class="deco"></div>
    `;
    lane.appendChild(token);

    // Status label as sibling of token (so it never inherits token rotation)
    const statusEl = document.createElement('div');
    statusEl.className = 'status-label';
    lane.appendChild(statusEl);

    track.appendChild(lane);

    return {
      ...p,
      el: token,
      statusEl,
      progressFill,
      x: 0,
      baseSpeed: 0.04 + Math.random() * 0.02,
      speed: 0.04,
      jitter: 0,
      bobPhase: Math.random() * Math.PI * 2,
      effects: {},
      finished: false,
      finishTime: null,
      rank: null,
    };
  });

  state.running = {
    game: g,
    runners,
    startTs: performance.now(),
    lastTs: performance.now(),
    eventCooldown: 1.5,   // seconds before first events
    finished: 0,
    rafId: 0,
    elapsed: 0,
  };

  showScreen('game');
  state.running.rafId = requestAnimationFrame(loop);
}

function loop(ts) {
  const r = state.running;
  if (!r) return;
  const dtMs = ts - r.lastTs;
  const dt = Math.min(0.05, dtMs / 1000);
  r.lastTs = ts;
  r.elapsed += dt;

  updateTimer(r.elapsed);
  updateRunners(r, dt, ts);
  maybeFireEvents(r, dt);
  renderTokens(r, ts);

  if (r.finished >= r.runners.length) {
    cancelAnimationFrame(r.rafId);
    setTimeout(showResult, 700);
    return;
  }
  r.rafId = requestAnimationFrame(loop);
}

function updateTimer(t) {
  const m = Math.floor(t / 60).toString().padStart(2, '0');
  const s = Math.floor(t % 60).toString().padStart(2, '0');
  $('#timer').textContent = `${m}:${s}`;
}

function updateRunners(r, dt, ts) {
  const targetDur = (r.game.duration.min + r.game.duration.max) / 2;
  // base: a runner with avg modifier (1.0) reaches x=1 around targetDur
  const norm = 1 / targetDur;

  r.runners.forEach((p) => {
    if (p.finished) return;

    // Random jitter on speed (organic accel/decel)
    p.jitter += (Math.random() - 0.5) * dt * 0.6;
    p.jitter = Math.max(-0.35, Math.min(0.35, p.jitter * (1 - dt * 0.4)));

    // Apply effects
    let mult = 1 + p.jitter;
    let pull = 0;

    for (const key of Object.keys(p.effects)) {
      const fx = p.effects[key];
      fx.until -= dt;
      if (fx.until <= 0) {
        delete p.effects[key];
        p.el.classList.remove('effect-' + key);
        continue;
      }
      if (fx.mult != null) mult *= fx.mult;
      if (fx.pull != null) pull += fx.pull;
      p.el.classList.add('effect-' + key);
    }

    const speed = (p.baseSpeed / 0.05) * norm * mult; // scaled
    p.x += speed * dt + pull * dt;
    if (p.x < 0) p.x = 0;
    if (p.x >= 1 && !p.finished) {
      p.x = 1;
      p.finished = true;
      p.finishTime = r.elapsed;
      p.rank = ++r.finished;
      p.el.classList.add('finished');
      // Clear ongoing visual fx
      Object.keys(p.effects).forEach(k => p.el.classList.remove('effect-' + k));
      p.effects = {};
    }
  });
}

// Effect → status label (Korean) and tone (good/bad/party)
const EFFECT_LABELS = {
  shark:     { text: '🦈 도망 중!',   tone: 'bad'  },
  cramp:     { text: '💢 다리 쥐!',   tone: 'bad'  },
  jelly:     { text: '🪼 해파리 부스트', tone: 'good' },
  banana:    { text: '🍌 미끄럼!',     tone: 'bad'  },
  energy:    { text: '⚡ 에너지 폭주!', tone: 'good' },
  hurdle:    { text: '🚧 허들 걸림!',   tone: 'bad'  },
  blackhole: { text: '🕳️ 블랙홀에 끌림', tone: 'bad'  },
  asteroid:  { text: '☄️ 운석 충돌!',   tone: 'bad'  },
  warp:      { text: '✨ 워프 부스트!', tone: 'good' },
  oneshot:   { text: '🍻 원샷!',       tone: 'party'},
  vomit:     { text: '🤢 토하는 중…',   tone: 'bad'  },
  cheers:    { text: '🥂 건배!',       tone: 'party'},
  blackout:  { text: '😵 필름 끊김!',   tone: 'bad'  },
  snack:     { text: '🍤 안주 보충!',   tone: 'good' },
};

function updateStatusLabel(p) {
  const el = p.statusEl;
  if (!el) return;
  const keys = Object.keys(p.effects);
  if (keys.length === 0 || p.finished) {
    el.classList.remove('on');
    return;
  }
  // Pick effect with most time remaining
  keys.sort((a, b) => p.effects[b].until - p.effects[a].until);
  const meta = EFFECT_LABELS[keys[0]];
  if (!meta) { el.classList.remove('on'); return; }
  el.textContent = meta.text;
  el.dataset.tone = meta.tone;
  el.classList.add('on');
}

function renderTokens(r, ts) {
  const track = $('#track');
  const trackW = track.clientWidth;
  const tokenW = 60;
  const rightPad = 32;
  const usable = trackW - tokenW - rightPad;
  const stationary = !!r.game.stationary;
  const seatLeft = 24; // fixed left position for stationary mode

  r.runners.forEach((p) => {
    const tform = r.game.tokenStyle(p, ts);
    let xPx;
    if (stationary) {
      xPx = seatLeft;
      p.el.style.left = xPx + 'px';
      if (p.progressFill) p.progressFill.style.width = (p.x * 100) + '%';
    } else {
      xPx = p.x * usable + 4;
      p.el.style.left = xPx + 'px';
    }
    p.el.style.transform = tform;
    // Status label sits below token center horizontally; doesn't rotate
    if (p.statusEl) {
      p.statusEl.style.left = (xPx + tokenW / 2) + 'px';
    }
    updateStatusLabel(p);
  });
}

// ============== Events ==============
function maybeFireEvents(r, dt) {
  r.eventCooldown -= dt;
  if (r.eventCooldown > 0) return;

  // Pick a random event from this game
  const events = r.game.events;
  for (const ev of events) {
    if (Math.random() < ev.prob) {
      const candidates = r.runners.filter(p => !p.finished);
      if (candidates.length === 0) return;
      if (ev.group) {
        candidates.forEach(p => ev.apply(p, r));
        showBanner(ev.label);
      } else {
        const target = candidates[Math.floor(Math.random() * candidates.length)];
        ev.apply(target, r);
        showBanner(`${target.name}: ${ev.label}`);
      }
      r.eventCooldown = 1.0 + Math.random() * 1.2;
      return;
    }
  }
}

function showBanner(text) {
  const el = $('#event-banner');
  el.textContent = text;
  el.hidden = false;
  clearTimeout(showBanner._t);
  showBanner._t = setTimeout(() => { el.hidden = true; }, 1600);
}

// Effect appliers — modify p.effects
function applyShark(p)     { p.effects.shark   = { until: 2.5, mult: 1.45 }; } // panic boost (running away)
function applyCramp(p)     { p.effects.cramp   = { until: 2.0, mult: 0.25 }; }
function applyJelly(p)     { p.effects.jelly   = { until: 2.0, mult: 1.6  }; }
function applyBanana(p)    { p.effects.banana  = { until: 1.4, mult: 0.15, pull: -0.04 }; }
function applyEnergy(p)    { p.effects.energy  = { until: 2.5, mult: 1.7  }; }
function applyHurdle(p)    { p.effects.hurdle  = { until: 1.6, mult: 0.2  }; }
function applyBlackhole(p) { p.effects.blackhole = { until: 2.2, mult: 0.4, pull: -0.06 }; }
function applyAsteroid(p)  { p.effects.asteroid  = { until: 1.4, mult: 0.1  }; }
function applyWarp(p)      { p.effects.warp      = { until: 1.8, mult: 1.9  }; }
function applyOneshot(p)   { p.effects.oneshot   = { until: 2.2, mult: 1.8  }; }
function applyVomit(p)     { p.effects.vomit     = { until: 1.8, mult: 0.0, pull: -0.02 }; }
function applyCheers(p)    { p.effects.cheers    = { until: 1.0, mult: 1.3  }; }
function applyBlackout(p)  { p.effects.blackout  = { until: 2.6, mult: 0.0  }; }
function applySnack(p)     { p.effects.snack     = { until: 2.0, mult: 1.5  }; }

// ============== Result ==============
function showResult() {
  const r = state.running;
  if (!r) return;
  const sorted = [...r.runners].sort((a, b) => {
    if (a.rank && b.rank) return a.rank - b.rank;
    if (a.rank) return -1;
    if (b.rank) return 1;
    return b.x - a.x;
  });
  const list = $('#rankings');
  list.innerHTML = '';
  const medals = { 1: 'gold', 2: 'silver', 3: 'bronze' };
  sorted.forEach((p, i) => {
    const rank = i + 1;
    const tStr = p.finishTime != null
      ? p.finishTime.toFixed(2) + 's'
      : '-';
    const li = document.createElement('li');
    li.innerHTML = `
      <span class="rank ${medals[rank] || ''}">${rank}</span>
      <div class="ava-sm">${p.image ? `<img src="${p.image}" alt="">` : generateAvatarSVG(p.name)}</div>
      <span class="name">${escapeAttr(p.name)}</span>
      <span class="time">${tStr}</span>
    `;
    list.appendChild(li);
  });
  showScreen('result');
}

$('#rematch').addEventListener('click', () => {
  startGame();
});
$('#to-lobby').addEventListener('click', () => {
  state.running = null;
  document.body.classList.remove('in-game-swim','in-game-run','in-game-space','in-game-drink');
  showScreen('lobby');
});

// ============== Init ==============
addPlayer();
addPlayer();
addPlayer();
renderPlayers();
showScreen('lobby');
