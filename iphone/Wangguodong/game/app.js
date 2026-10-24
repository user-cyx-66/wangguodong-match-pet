(function () {
  'use strict';
  const { Game, PopGame, cluster, LEVELS, possibleMoves } = MatchPet;
  const $ = id => document.getElementById(id), wait = ms => new Promise(r => setTimeout(r, ms));
  const CONFIG = window.MATCH_PET_CONFIG || {}, KEY = 'wangguodong.matchpet.v1';
  const COLORS = ['小鱼', '爱心', '叶子', '星星', '花朵', '草莓'];
  const rooms = [ { name: '奶油晴天', cost: 0, className: '' }, { name: '薄荷花园', cost: 50, className: 'room-mint' }, { name: '莓莓晚安', cost: 80, className: 'room-rose' } ];
  const paths = {
    paw: '<ellipse cx="12" cy="15.5" rx="6" ry="4.5" fill="currentColor"/><ellipse cx="5" cy="9" rx="2.3" ry="3" fill="currentColor" transform="rotate(-25 5 9)"/><ellipse cx="10" cy="5.5" rx="2.2" ry="3" fill="currentColor"/><ellipse cx="15.3" cy="5.8" rx="2.2" ry="3" fill="currentColor"/><ellipse cx="19.5" cy="10" rx="2.2" ry="2.8" fill="currentColor" transform="rotate(25 19 10)"/>',
    heart: '<path d="M20.5 5.5c-3-3-6-1.5-8.5 1-2.5-2.5-5.5-4-8.5-1C-1 10 5 16 12 21c7-5 13-11 8.5-15.5Z"/>',
    fish: '<path d="M3 12c4-7 10-7 14-2l4-4v12l-4-4c-4 5-10 5-14-2Z"/><circle cx="7" cy="11" r=".8" fill="currentColor" stroke="none"/>',
    leaf: '<path d="M20 3C9 2 2 8 5 16s17 3 15-13Z"/><path d="m3 22 12-13M8 17l-1-6m5 2 5 1"/>',
    flag: '<path d="M5 22V3c5-5 9 5 15 0v11c-6 5-10-5-15 0"/>',
    settings: '<path d="m9 3-1 3-3 .5-2 3 2 2v2l-2 2 2 3 3 .5 1 3h5l1-3 3-.5 2-3-2-2v-2l2-2-2-3-3-.5-1-3Z"/><circle cx="11.5" cy="12" r="3"/>',
    sound: '<path d="m10 4-5 5H2v6h3l5 5V4Zm5 4c3 2 3 6 0 8m3-11c5 4 5 10 0 14"/>',
    music: '<path d="M9 18V5l12-3v13M9 8l12-3"/><ellipse cx="5.5" cy="19" rx="3.5" ry="2.5"/><ellipse cx="17.5" cy="16" rx="3.5" ry="2.5"/>',
    mute: '<path d="m10 4-5 5H2v6h3l5 5V4Zm6 5 6 6m0-6-6 6"/>',
    bulb: '<path d="M8 17c0-4-4-4-4-9a8 8 0 0 1 16 0c0 5-4 5-4 9H8Zm1 4h6M12 17v-6m-3-2 3 2 3-2"/>',
    shuffle: '<path d="M3 5h3c5 0 7 14 12 14h3m-4-4 4 4-4 4M3 19h3c2 0 3-2 5-5m3-5c2-3 2-4 4-4h3m-4-4 4 4-4 4"/>',
    hammer: '<path d="m5 5 5-3 8 8-5 4-8-9Zm7 8L3 22l-2-2 9-9m6-3 4-4 3 3-5 4"/>',
    pause: '<path d="M7 4v16M17 4v16" stroke-width="4"/>',
    moon: '<path d="M20.5 15.5A9.5 9.5 0 0 1 8.5 3a9.5 9.5 0 1 0 12 12.5Z"/>',
    book: '<path d="M12 5c-4-3-8-3-10-1v16c3-2 7-2 10 0 3-2 7-2 10 0V4c-3-2-7-2-10 1Zm0 0v15"/>',
    sparkle: '<path d="m12 2 3 7 7 3-7 3-3 7-3-7-7-3 7-3 3-7Z"/>',
    monitor: '<rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 22h8m-4-5v5"/>',
    lock: '<rect x="5" y="10" width="14" height="12" rx="3"/><path d="M8 10V6a4 4 0 0 1 8 0v4m-4 5v3"/>',
    ice: '<path d="M12 2v20M3 7l18 10M3 17 21 7M9 4l3 3 3-3M9 20l3-3 3 3"/>'
  };
  function icon(name) { return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || paths.sparkle}</svg>`; }
  document.querySelectorAll('[data-icon]').forEach(el => { el.innerHTML = icon(el.dataset.icon); });
  const pieces = [
    '<path d="M5 19C10 5 24 5 32 16l11-7v25l-11-7C24 38 10 34 5 22Z" fill="#78aec4" stroke="#6598af" stroke-width="1.3"/><path d="M15 15c6-5 11-3 15 1" fill="none" stroke="#b4d9e5" stroke-width="3" stroke-linecap="round"/><circle cx="13" cy="20" r="1.8" fill="#4e778b"/><path d="m24 11 4-6 3 8" fill="#78aec4" stroke="#6598af" stroke-width="1.3"/>',
    '<path d="M24 40C4 28 1 17 10 10c6-5 12-1 14 3 3-4 9-8 15-3 10 8 5 20-15 30Z" fill="#dd9a9c" stroke="#cb848c" stroke-width="1.3"/><path d="M9 19c-1-5 3-9 8-7" fill="none" stroke="#f4c6c4" stroke-width="3.5" stroke-linecap="round"/>',
    '<path d="M39 7C19 2 3 14 9 31c8 16 34 0 30-24Z" fill="#a3bb82" stroke="#8ba566" stroke-width="1.4"/><path d="m9 39 22-24M17 30l-3-10m9 4 9 1" stroke="#7b995e" stroke-width="2.3" fill="none" stroke-linecap="round"/><path d="M15 15c4-5 10-6 15-6" stroke="#c7d9ad" stroke-width="3" fill="none" stroke-linecap="round"/>',
    '<path d="m24 5 6.1 12.4 13.7 2-9.9 9.7 2.3 13.7L24 36.3l-12.2 6.5 2.3-13.7-9.9-9.7 13.7-2Z" fill="#e4bf68" stroke="#d3ab51" stroke-width="1.3" stroke-linejoin="round"/><path d="m23 12-3.5 8-7 .8" fill="none" stroke="#f9dea0" stroke-width="3" stroke-linecap="round"/>',
    '<path d="M19 15C9-1 0 13 12 22-5 26 4 41 18 32c0 19 18 16 15 1 15 11 23-7 8-13 12-14-6-22-13-7-1-9-11-11-9 2Z" transform="translate(-1 0) scale(.95)" fill="#b5a0c8" stroke="#a28db7" stroke-width="1.3"/><circle cx="24" cy="24" r="7.2" fill="#eee0bc" stroke="#d5c196" stroke-width="1.2"/><circle cx="22" cy="22" r="2" fill="#fff1d1"/>',
    '<path d="M11 16c-9 6 1 24 13 28 12-4 22-22 13-28-8-5-18-5-26 0Z" fill="#dc9b7e" stroke="#c88368" stroke-width="1.3"/><path d="m24 14-9-1 3-6 6 4 5-6 3 8 8 1-9 7-7-7-7 6-7-6Z" fill="#90a87a" stroke="#80976b" stroke-width="1"/><path d="m16 25 1 2m9-4 1 2m8 1-1 2m-11 6 1 2" stroke="#fff0cc" stroke-width="2" stroke-linecap="round"/>'
  ];
  const rainbow = '<path d="m24 4 6 13 14 2-10 10 2 14-12-7-12 7 2-14L4 19l14-2Z" fill="#ead5e6" stroke="#a88eae" stroke-width="1.4"/><path d="M13 26a11 11 0 0 1 22 0" fill="none" stroke="#db9e98" stroke-width="5"/><path d="M16 26a8 8 0 0 1 16 0" fill="none" stroke="#e7c980" stroke-width="4"/><path d="M19 26a5 5 0 0 1 10 0" fill="none" stroke="#91b79d" stroke-width="3"/>';
  const pieceSVG = t => `<svg class="piece" viewBox="0 0 48 48" aria-hidden="true">${t.special === 'rainbow' ? rainbow : pieces[t.color]}</svg>`;
  const escape = text => String(text).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  function defaults() { return { version: 1, audioVersion: 2, music: true, sound: true, volume: .45, popBest: 0, popProgress: { stage: 1, score: 0 }, lastMode: 'story', wallet: 15, bond: 0, unlocked: 0, stars: Array(12).fill(0), ownedRooms: [0], room: 0, sleeping: false, nickname: String(CONFIG.nickname || '你').slice(0, 16), seenIntro: false, session: null, zenBest: 0, lettersRead: 0 }; }
  function validate(raw) {
    if (!raw || typeof raw !== 'object' || raw.version !== 1) throw new Error('不支持的存档格式');
    const d = defaults();
    for (const key of ['wallet', 'bond', 'zenBest', 'lettersRead']) { if (!Number.isSafeInteger(raw[key]) || raw[key] < 0 || raw[key] > 1000000000) throw new Error('存档数值有误'); d[key] = raw[key]; }
    if (!Array.isArray(raw.stars) || raw.stars.length !== 12 || raw.stars.some(n => !Number.isInteger(n) || n < 0 || n > 3)) throw new Error('关卡存档有误');
    d.stars = raw.stars.slice(); d.unlocked = Math.min(11, Math.max(0, raw.unlocked | 0));
    d.ownedRooms = Array.isArray(raw.ownedRooms) ? [...new Set([0, ...raw.ownedRooms.filter(n => [0, 1, 2].includes(n))])] : [0];
    d.room = d.ownedRooms.includes(raw.room) ? raw.room : 0; d.sound = raw.sound === true; d.sleeping = raw.sleeping === true;
    d.sound = raw.audioVersion === 2 ? raw.sound === true : true; d.music = raw.music !== false;
    d.volume = Number.isFinite(raw.volume) ? Math.max(0, Math.min(.8, raw.volume)) : .45;
    d.popBest = Number.isSafeInteger(raw.popBest) && raw.popBest >= 0 ? Math.min(1000000000, raw.popBest) : 0;
    if (Number.isInteger(raw.popProgress?.stage) && raw.popProgress.stage > 0 && raw.popProgress.stage <= 999 && Number.isSafeInteger(raw.popProgress.score) && raw.popProgress.score >= 0 && raw.popProgress.score <= 1000000000) d.popProgress = { stage: raw.popProgress.stage, score: raw.popProgress.score };
    d.lastMode = ['story', 'zen', 'pop'].includes(raw.lastMode) ? raw.lastMode : 'story';
    d.nickname = typeof raw.nickname === 'string' ? raw.nickname.slice(0, 16) : d.nickname; d.seenIntro = raw.seenIntro === true;
    d.session = validSession(raw.session) ? raw.session : null; return d;
  }
  function validSession(s) {
    if (s?.mode === 'pop') return validPopSession(s);
    return s && ['story', 'zen'].includes(s.mode) && Number.isInteger(s.level) && s.level >= 0 && s.level < 12 &&
      Array.isArray(s.board) && s.board.length === 64 && s.board.every(t => t && Number.isInteger(t.id) && t.id > 0 && Number.isInteger(t.color) && t.color >= 0 && t.color < 6 && [null, 'row', 'column', 'bomb', 'rainbow'].includes(t.special)) && new Set(s.board.map(t => t.id)).size === 64 &&
      Array.isArray(s.ice) && s.ice.length === 64 && s.ice.every(v => typeof v === 'boolean') &&
      ['score', 'collected', 'moves', 'charge', 'turns', 'totalCleared', 'id', 'hammer'].every(k => Number.isSafeInteger(s[k]) && s[k] >= 0 && s[k] <= 1000000000) && s.charge <= 24 && s.hammer <= 1 && s.status === 'playing' && (s.mode === 'zen' || s.moves > 0) && !MatchPet.matches(s.board).cells.length;
  }
  function validPopSession(s) {
    return Number.isInteger(s.stage) && s.stage > 0 && s.stage <= 999 && Array.isArray(s.board) && s.board.length === 64 &&
      s.board.every(t => t === null || (t && Number.isInteger(t.id) && t.id > 0 && Number.isInteger(t.color) && t.color >= 0 && t.color < 6 && t.special === null)) &&
      new Set(s.board.filter(Boolean).map(t => t.id)).size === s.board.filter(Boolean).length &&
      ['score', 'roundStart', 'collected', 'moves', 'charge', 'turns', 'totalCleared', 'id', 'hammer', 'shuffles'].every(k => Number.isSafeInteger(s[k]) && s[k] >= 0 && s[k] <= 1000000000) && s.charge <= 24 && s.hammer <= 1 && s.shuffles <= 1 && s.roundStart <= s.score && s.status === 'playing' && MatchPet.clusters(s.board).length > 0;
  }
  let state = defaults(), game, busy = false, paused = false, armed = null, bridge = null, toastTimer, petTimer, lastTouch = 0, pendingFocus = null;
  const audio = new CozyAudio(), effects = new BoardEffects($('effects-canvas'), $('board'));
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const animWait = ms => wait(reduceMotion ? 1 : ms);
  function toast(text) { $('toast').textContent = text; $('toast').classList.add('show'); clearTimeout(toastTimer); toastTimer = setTimeout(() => $('toast').classList.remove('show'), 2800); }
  function snapshot() {
    if (!game || game.status !== 'playing') return null;
    const keys = ['mode', 'level', 'score', 'collected', 'moves', 'charge', 'hammer', 'turns', 'totalCleared', 'id', 'status', ...(game.mode === 'pop' ? ['stage', 'roundStart', 'shuffles'] : [])];
    const out = Object.fromEntries(keys.map(k => [k, game[k]])); out.board = game.board.map(t => t ? { ...t } : null); out.ice = game.ice.slice(); return out;
  }
  function persist(includeGame = true) {
    if (includeGame && !busy) state.session = snapshot();
    try {
      const data = JSON.stringify(state);
      if (bridge) bridge.save(data); else localStorage.setItem(KEY, data);
      $('save-status').innerHTML = '<i></i>进度已保存在这台设备';
    } catch { $('save-status').textContent = '自动保存不可用，可在设置中导出存档'; }
  }
  function restoreGame(session) {
    const mode = session?.mode ?? state.lastMode;
    game = mode === 'pop' ? new PopGame(session ? { stage: session.stage, score: session.score } : state.popProgress) : new Game({ level: session?.level ?? state.unlocked, mode });
    if (session) { Object.assign(game, session); game.board = session.board.map(t => t ? { ...t } : null); game.ice = Array.isArray(session.ice) ? session.ice.slice() : Array(64).fill(false); game.id = Math.max(game.id, ...game.board.filter(Boolean).map(t => t.id)); if (game.mode !== 'pop' && !possibleMoves(game.board).length) game.shuffle(); }
  }
  function canAct() { return !busy && !paused && !$('modal').open && game.status === 'playing'; }
  function syncAudio() { audio.configure(state); }
  function sound(kind = 'match', chain = 1, count = 3) { syncAudio(); audio.play(kind, chain, count); }
  function renderBoard(animate = false) {
    const focused = document.activeElement?.closest?.('.tile')?.dataset.index;
    if (focused !== undefined) pendingFocus = focused;
    else if (document.activeElement !== document.body) pendingFocus = null;
    const old = new Map([...$('board').querySelectorAll('[data-id]')].map(el => [el.dataset.id, el.getBoundingClientRect()]));
    $('board').innerHTML = game.board.map((t, i) => t ? `<button class="tile color-${t.color}${game.ice[i] ? ' iced' : ''}${t.special ? ' special-' + t.special : ''}" data-index="${i}" data-id="${t.id}" role="gridcell" aria-label="第${(i / 8 | 0) + 1}行第${i % 8 + 1}列 ${t.special === 'rainbow' ? '彩虹星' : COLORS[t.color]}${t.special && t.special !== 'rainbow' ? ' 特效点心' : ''}${game.ice[i] ? ' 薄冰' : ''}" aria-rowindex="${(i / 8 | 0) + 1}" aria-colindex="${i % 8 + 1}" tabindex="${i === 0 ? 0 : -1}">${pieceSVG(t)}${t.special && t.special !== 'rainbow' ? `<span class="special-badge">${{ row: '↔', column: '↕', bomb: '✹' }[t.special]}</span>` : ''}</button>` : `<button class="tile empty" data-index="${i}" role="gridcell" disabled></button>`).join('');
    if (animate && !reduceMotion) for (const el of $('board').querySelectorAll('[data-id]')) {
      const prev = old.get(el.dataset.id), next = el.getBoundingClientRect();
      const dx = prev ? prev.x - next.x : 0, dy = prev ? prev.y - next.y : -65;
      if (dx || dy) el.animate([{ transform: `translate(${dx}px,${dy}px) scale(.94)`, opacity: prev ? 1 : .2 }, { transform: 'translate(0,4px) scale(1.03,.94)', opacity: 1, offset: .82 }, { transform: 'translate(0,0) scale(1)', opacity: 1 }], { duration: 280, easing: 'cubic-bezier(.22,.65,.36,1)' });
    }
    let focusTile = pendingFocus !== null ? $('board').children[pendingFocus] : null;
    if (focusTile?.disabled && game.mode === 'pop') { const candidates = [...$('board').querySelectorAll('.tile:not(:disabled)')]; focusTile = candidates.sort((a, b) => Math.abs(+a.dataset.index - pendingFocus) - Math.abs(+b.dataset.index - pendingFocus))[0]; if (focusTile) pendingFocus = focusTile.dataset.index; }
    if (focusTile && !focusTile.disabled) { $('board').children[0].tabIndex = -1; focusTile.tabIndex = 0; focusTile.focus({ preventScroll: true }); }
  }
  function renderHUD() {
    $('moves').textContent = game.mode === 'zen' ? '∞' : game.moves; $('moves').classList.toggle('low-moves', game.mode === 'story' && game.moves < 6);
    $('moves-caption').textContent = game.mode === 'zen' ? '慢慢来呀' : '剩余步数';
    $('level-label').textContent = game.mode === 'zen' ? 'TAKE YOUR TIME' : `CHAPTER ${String(game.level + 1).padStart(2, '0')}`;
    $('level-name').textContent = game.mode === 'zen' ? '没有终点的小快乐' : game.spec.name;
    $('mode-badge').textContent = game.mode === 'zen' ? '不限步数' : game.level < 3 ? '轻轻松松' : '慢慢想一想';
    $('score').textContent = game.score.toLocaleString(); $('score-goal').textContent = game.mode === 'zen' ? '' : ` / ${game.spec.score.toLocaleString()}`;
    $('score-fill').style.width = (game.mode === 'zen' ? game.score % 1500 / 15 : Math.min(100, game.score / game.spec.score * 100)) + '%';
    $('score-caption').textContent = game.mode === 'zen' ? `甜蜜积分 · 最高 ${state.zenBest.toLocaleString()}` : '甜蜜积分';
    $('extra-goals').innerHTML = game.mode === 'zen' ? '<span>每消除 30 颗，获得 1 条小鱼干</span>' : `${game.spec.fish ? `<span class="${game.collected >= game.spec.fish ? 'goal-done' : ''}">${icon('fish')} ${Math.min(game.collected, game.spec.fish)}/${game.spec.fish}</span>` : ''}${game.spec.ice ? `<span class="${!game.ice.some(Boolean) ? 'goal-done' : ''}">${icon('ice')} ${game.ice.filter(Boolean).length} 块薄冰</span>` : ''}`;
    $('skill-count').textContent = `${game.charge}/24`; $('skill-fill').style.width = game.charge / 24 * 100 + '%';
    $('skill-caption').textContent = armed === 'skill' ? '点一种点心，果冻帮你消除全盘同色' : game.charge >= 24 ? '能量满啦！点击后选择一种点心' : '消除 24 颗点心，攒满猫爪能量';
    $('cat-skill').classList.toggle('ready', game.charge >= 24); $('cat-skill').classList.toggle('armed', armed === 'skill');
    $('hammer').classList.toggle('armed', armed === 'hammer'); $('hammer-count').textContent = `${game.hammer} 次`;
    document.querySelector('.board-shell').classList.toggle('armed', !!armed);
    $('story-mode').classList.toggle('active', game.mode === 'story'); $('zen-mode').classList.toggle('active', game.mode === 'zen');
    $('journey-count').textContent = `${state.stars.filter(Boolean).length} / 12`;
    $('level-map').innerHTML = LEVELS.map((l, i) => `<button class="level-button${i <= state.unlocked ? ' unlocked' : ''}${i === game.level && game.mode === 'story' ? ' current' : ''}" data-level="${i}" ${i > state.unlocked ? 'disabled' : ''} title="${escape(l.name)}" aria-label="第${i + 1}关 ${escape(l.name)}${state.stars[i] ? ' ' + state.stars[i] + '星' : ''}">${i <= state.unlocked ? i + 1 : icon('lock')}${state.stars[i] ? `<span class="level-stars">${'★'.repeat(state.stars[i])}</span>` : ''}</button>`).join('');
    const pop = game.mode === 'pop';
    $('pop-mode').classList.toggle('active', pop); $('board').classList.toggle('pop-board', pop);
    document.querySelector('.journey').hidden = pop; $('pop-guide').hidden = !pop;
    $('shuffle').querySelector('small').textContent = pop ? `${game.shuffles} 次` : '免费';
    if (pop) {
      $('moves').textContent = game.remaining(); $('moves-caption').textContent = '剩余点心';
      $('level-label').textContent = `POP STAGE ${String(game.stage).padStart(2, '0')}`; $('mode-badge').textContent = '点一片 · 消一片';
      $('score-caption').textContent = '累计积分';
      $('extra-goals').innerHTML = `<span>清空奖励 +2000</span><span>最高 ${state.popBest.toLocaleString()}</span>`;
      $('flow-banner').firstElementChild.textContent = '✦ 点相连的同色点心，2 颗起消';
      $('board-tip').innerHTML = icon('sparkle') + ' 消得越大分越高，清空后积分带入下一关。';
    } else {
      $('flow-banner').firstElementChild.textContent = '✦ 特效可直接点爆，两个特效交换有惊喜';
    }
  }
  function petName() { return CONFIG.petName || '王果冻'; }
  function renderPet() {
    document.querySelectorAll('[data-petname]').forEach(el => { el.textContent = petName(); });
    $('wallet').textContent = state.wallet; $('bond').textContent = state.bond; $('bond-fill').style.width = state.bond % 50 * 2 + '%';
    $('bond-label').textContent = state.bond < 20 ? '慢慢熟悉你' : state.bond < 70 ? '喜欢黏着你' : state.bond < 150 ? '最好的朋友' : '全宇宙最喜欢你';
    $('pet-level').textContent = `Lv. ${1 + Math.floor(state.bond / 50)}`;
    $('pet-room').className = 'pet-room ' + rooms[state.room].className;
    $('room-caption').textContent = `${['一', '二', '三'][state.room]}号小窝 · ${rooms[state.room].name}`;
    $('cat-image').src = state.sleeping ? 'assets/cat-sleep.png' : 'assets/cat-idle.png'; $('cat-image').classList.toggle('sleeping', state.sleeping);
    $('pet-sleep').innerHTML = `${icon(state.sleeping ? 'sparkle' : 'moon')}${state.sleeping ? '叫醒啦' : '睡个觉'}`;
    $('pet-feed').title = '花费 5 条小鱼干，亲密度 +8';
    $('room-options').innerHTML = rooms.map((r, i) => `<button class="room-option${i === state.room ? ' active' : ''}" data-room="${i}" aria-label="${r.name} ${state.ownedRooms.includes(i) ? '已拥有' : r.cost + '小鱼干'}"><span class="room-swatch"></span><span>${r.name}</span><small>${i === state.room ? '使用中' : state.ownedRooms.includes(i) ? '已拥有' : r.cost + ' 小鱼干'}</small></button>`).join('');
    $('sound').innerHTML = icon(state.sound ? 'sound' : 'mute'); $('sound').title = state.sound ? '关闭音效' : '开启音效'; $('sound').setAttribute('aria-label', $('sound').title);
    $('music').innerHTML = icon('music'); $('music').classList.toggle('audio-off', !state.music); $('music').title = state.music ? '关闭背景音乐' : '开启背景音乐'; $('music').setAttribute('aria-label', $('music').title);
    syncAudio();
  }
  function say(message, img = null) {
    clearTimeout(petTimer); $('pet-speech').textContent = message;
    if (img && !state.sleeping) $('cat-image').src = `assets/cat-${img}.gif`;
    petTimer = setTimeout(() => { $('pet-speech').textContent = state.sleeping ? '呼噜呼噜……梦里也有你。' : '你慢慢玩，我就在这里。'; $('cat-image').src = state.sleeping ? 'assets/cat-sleep.png' : 'assets/cat-idle.png'; }, 4000);
  }
  function hearts() {
    for (let i = 0; i < 4; i++) { const el = document.createElement('span'); el.className = 'floating-heart'; el.textContent = '♡'; el.style.left = 33 + Math.random() * 35 + '%'; el.style.top = '54%'; el.style.animationDelay = i * .12 + 's'; $('pet-hearts').append(el); setTimeout(() => el.remove(), 1900); }
    $('cat-image').classList.remove('bounce'); void $('cat-image').offsetWidth; $('cat-image').classList.add('bounce');
  }
  function touch() {
    if (state.sleeping) { say('小声一点，果冻在做甜甜的梦。'); return; }
    hearts(); sound('touch');
    if (Date.now() - lastTouch >= 3000) { lastTouch = Date.now(); state.bond++; persist(); renderPet(); }
    say(['呼噜呼噜……再摸一下嘛。', '这一刻，最喜欢你啦。', '喵！你的手心暖暖的。'][Math.floor(Math.random() * 3)]);
    bridge?.petAction('touch');
  }
  function feed() {
    if (state.wallet < 5) { toast('还差一点小鱼干，玩一会儿消消乐就有啦。'); return; }
    state.wallet -= 5; state.bond += 8; state.sleeping = false; persist(); renderPet(); hearts(); say('啊呜！今天的小鱼干有幸福的味道。', 'watch'); sound('touch'); bridge?.petAction('feed');
  }
  function toggleSleep() { state.sleeping = !state.sleeping; persist(); renderPet(); say(state.sleeping ? '晚安啦，我就在这里睡一会儿。' : '睡醒啦！继续陪你玩。'); bridge?.petAction(state.sleeping ? 'sleep' : 'wake'); }
  function announce(wave, label = null) {
    const tier = wave.count >= 25 ? '全场大扫除！' : wave.count >= 12 ? '一大片，超痛快！' : wave.count >= 7 ? '甜蜜暴击！' : '消得漂亮！';
    const title = label || (wave.chain >= 3 ? `${wave.chain} 连消 · 停不下来！` : wave.chain > 1 ? `${wave.chain} 连消！` : tier);
    $('combo-pop').innerHTML = `<span>${escape(title)}</span><strong>+${wave.points.toLocaleString()}</strong>${wave.count >= 6 ? `<small>${wave.count} 颗一起消除</small>` : ''}`;
    $('combo-pop').classList.remove('pop'); void $('combo-pop').offsetWidth; $('combo-pop').classList.add('pop');
    $('chain-label').textContent = wave.kind === 'pop' ? `${wave.count} POP · +${wave.points}` : `${wave.chain} CHAIN${wave.chain > 1 ? ' · ×' + Math.min(wave.chain, 5) : ''}`;
    $('flow-banner').classList.toggle('hot', wave.count >= 10 || wave.chain >= 3);
  }
  async function animateWave(wave, label) {
    wave.cells.forEach((i, n) => { const el = $('board').children[i]; if (el) { el.style.animationDelay = Math.min(n * 4, 80) + 'ms'; el.classList.add('clearing'); } });
    effects.burst(wave); sound(wave.specials?.length ? 'special' : wave.kind === 'pop' ? 'pop' : 'match', wave.chain, wave.count); announce(wave, label);
    renderHUD(); await animWait(230); renderBoard(); game.drop(); renderBoard(true); await animWait(285);
  }
  function endTurn(before, n, biggest = 0) {
    const autoShuffle = game.finishTurn();
    if (autoShuffle) { renderBoard(true); toast('没有可走的点心啦，已免费换好一盘。'); }
    state.wallet += Math.floor(game.totalCleared / 30) - Math.floor(before / 30);
    if (game.mode === 'zen') state.zenBest = Math.max(state.zenBest, game.score);
    if (game.mode === 'pop') state.popBest = Math.max(state.popBest, game.score);
    busy = false; document.querySelector('.board-shell').classList.remove('busy'); renderHUD(); renderPet(); persist();
    if (n >= 3 || biggest >= 12) { say(n >= 3 ? '连消停不下来！给你跳个猫猫舞。' : '一口气消了这么多！太厉害啦。', 'dance'); bridge?.petAction('celebrate'); }
    if (game.status === 'won') game.mode === 'pop' ? popResult(true) : win();
    if (game.status === 'lost') game.mode === 'pop' ? popResult(false) : lose();
  }
  async function resolvePop(wave, before, label) { await animateWave(wave, label); endTurn(before, 1, wave.count); }
  async function resolve(initial = null, preferred = [], combo = null) {
    const before = game.totalCleared; let n = 0, wave;
    while ((wave = game.wave(n === 0 ? initial : null, n === 0 ? preferred : [], n + 1))) {
      await animateWave(wave, n === 0 ? combo : null);
      if (++n >= 100) { game.board = game.freshBoard(); renderBoard(true); break; }
    }
    endTurn(before, n);
  }
  function clearSelection() { $('board').querySelectorAll('.selected,.hint').forEach(el => el.classList.remove('selected', 'hint')); selected = null; }
  let selected = null;
  async function choose(index) {
    if (!canAct() || !game.board[index]) return;
    if (armed) {
      const targets = armed === 'skill' ? game.skill(index) : game.hammerAt(index);
      const isSkill = armed === 'skill'; armed = null; clearSelection(); renderHUD(); if (!targets) return;
      busy = true; document.querySelector('.board-shell').classList.add('busy');
      if (isSkill) { state.sleeping = false; say('交给我啦！猫爪出击——', 'pounce'); bridge?.petAction('skill'); }
      if (game.mode === 'pop') { const before = game.totalCleared; await resolvePop(game.clear(targets), before, isSkill ? '猫爪扫场！' : '小锤子出击！'); }
      else await resolve(targets, [], isSkill ? '猫爪扫场！' : null);
      return;
    }
    if (game.mode === 'pop') {
      const before = game.totalCleared, wave = game.pop(index); clearSelection();
      if (!wave) { sound('invalid'); if (!reduceMotion) $('board').children[index].animate([{ transform: 'rotate(-7deg)' }, { transform: 'rotate(7deg)' }, { transform: 'rotate(0)' }], { duration: 160 }); toast('至少要有两颗同色点心连在一起哦。'); return; }
      busy = true; document.querySelector('.board-shell').classList.add('busy'); await resolvePop(wave, before); return;
    }
    if (selected === null && game.board[index].special) { busy = true; clearSelection(); document.querySelector('.board-shell').classList.add('busy'); const activated = game.activate(index); await resolve(activated.initial, [], activated.combo); return; }
    if (selected === index) { clearSelection(); return; }
    if (selected === null || !MatchPet.adjacent(selected, index)) { clearSelection(); selected = index; $('board').children[index].classList.add('selected'); return; }
    const from = selected; clearSelection(); busy = true; document.querySelector('.board-shell').classList.add('busy');
    const result = game.swap(from, index);
    if (!result.valid) {
      const a = $('board').children[from], b = $('board').children[index]; const ar = a.getBoundingClientRect(), br = b.getBoundingClientRect();
      for (const [el, dx, dy] of [[a, br.x - ar.x, br.y - ar.y], [b, ar.x - br.x, ar.y - br.y]]) if (!reduceMotion) el.animate([{ transform: 'translate(0,0)' }, { transform: `translate(${dx}px,${dy}px)` }, { transform: 'translate(0,0)' }], { duration: 300 });
      sound('invalid'); await animWait(310); busy = false; document.querySelector('.board-shell').classList.remove('busy'); toast('这两个还凑不成三消哦，换一对试试。'); return;
    }
    renderBoard(true); renderHUD(); await animWait(210); await resolve(result.initial, result.preferred, result.combo);
  }
  function modal(html) { $('modal-content').innerHTML = html; if (!$('modal').open) $('modal').showModal(); }
  function closeModal() { $('modal').close(); }
  function nextGame(level, mode = 'story') { closeModal(); busy = false; paused = false; armed = null; clearSelection(); $('pause-cover').hidden = true; audio.setPaused(false); state.lastMode = mode; game = mode === 'pop' ? new PopGame(state.popProgress) : new Game({ level, mode }); renderBoard(true); renderHUD(); renderPet(); $('board-tip').innerHTML = icon('sparkle') + ' ' + (mode === 'zen' ? '不用赶路，也没有失败。每一步开心都算数。' : mode === 'pop' ? '消得越大分越高，清空后积分带入下一关。' : escape(game.spec.note)); $('chain-label').textContent = 'READY TO POP'; persist(); }
  function requestSwitch(level, mode) {
    if (busy) return;
    if (game.turns && game.status === 'playing') modal(`<span class="modal-eyebrow">A LITTLE PAUSE</span><h2>换个地方继续玩吗？</h2><p>当前棋盘会重新开始。已获得的小鱼干、亲密度和通关星星都会保留；点点连消会从最近通过的关卡继续。</p><button class="primary" data-action="switch" data-level="${level}" data-mode="${mode}">去${mode === 'zen' ? '无限放松' : mode === 'pop' ? '点点连消' : '第 ' + (level + 1) + ' 关'}</button><button class="text-button" data-action="close">继续这一局</button>`);
    else nextGame(level, mode);
  }
  function win() {
    const first = state.stars[game.level] === 0, stars = game.stars(), reward = (first ? 20 : 8) + game.level * 3;
    state.stars[game.level] = Math.max(state.stars[game.level], stars); state.unlocked = Math.min(11, Math.max(state.unlocked, game.level + 1)); state.wallet += reward; state.bond += 5; state.session = null; state.lettersRead++; persist(false); renderHUD(); renderPet(); sound('win'); say('通关啦！抱抱今天超棒的你。', 'dance'); bridge?.petAction('celebrate');
    const letters = CONFIG.letters?.length ? CONFIG.letters : ['今天也要开开心心呀。'];
    modal(`<div class="modal-center"><span class="modal-eyebrow">SWEET LITTLE VICTORY</span><div class="modal-stars">${'★'.repeat(stars)}${'☆'.repeat(3 - stars)}</div><h2>${game.level === 11 ? '我们的糖果小宇宙，完成啦！' : '又攒到一份小快乐！'}</h2><p>${game.score.toLocaleString()} 分 · 还剩 ${game.moves} 步</p><div class="reward"><span>${icon('fish')} +${reward} 小鱼干</span><span>${icon('heart')} +5 亲密度</span></div><p class="letter">给${escape(state.nickname || '你')}：<br>${escape(letters[(state.lettersRead - 1) % letters.length])}</p><button class="primary" data-action="${game.level < 11 ? 'next' : 'zen'}">${game.level < 11 ? '去下一站 →' : '去无限模式继续开心'}</button><button class="text-button" data-action="replay">再玩一次这一关</button></div>`);
  }
  function popResult(won) {
    const reward = won ? 12 + Math.min(50, game.stage * 2) : 0;
    if (won) { state.wallet += reward; state.bond += 3; state.popProgress = { stage: Math.min(999, game.stage + 1), score: game.score }; sound('win'); say('这一大片快乐，都是你的！', 'dance'); bridge?.petAction('celebrate'); }
    else say('抱抱！换个消法，这关还能再试一次。');
    state.session = null; state.lastMode = 'pop'; state.popBest = Math.max(state.popBest, game.score); persist(false); renderPet();
    modal(`<div class="modal-center"><span class="modal-eyebrow">${won ? 'A BIG LITTLE VICTORY' : 'TRY ANOTHER LITTLE STRATEGY'}</span><div class="modal-stars">${game.remaining() === 0 ? '✦ 全清 ✦' : won ? '✦ ✦ ✦' : '♡'}</div><h2>${won ? '这一关，消得痛快！' : '差一点就过关啦'}</h2><p>本轮消除 +${(game.score - game.roundStart - game.bonus).toLocaleString()}<br>剩 ${game.remaining()} 颗 · 清场奖励 <b>+${game.bonus.toLocaleString()}</b><br>累计 ${game.score.toLocaleString()} / 目标 ${game.target.toLocaleString()}</p>${won ? `<div class="reward">${icon('fish')} +${reward} 小鱼干　${icon('heart')} +3 亲密度</div>` : ''}<button class="primary" data-action="pop-continue">${won ? '积分带上，下一关 →' : '重试这一关'}</button><button class="text-button" data-action="zen">去交换三消放松一下</button></div>`);
  }
  function showPopCompleted() { modal(`<div class="modal-center"><h2>${game.status === 'won' ? '下一大片快乐在等你' : '再试一个好消法'}</h2><p>已获得的积分奖励和小鱼干都保存好了。</p><button class="primary" data-action="pop-continue">${game.status === 'won' ? '继续下一关' : '重试这一关'}</button><button class="text-button" data-action="zen">去无限放松</button></div>`); }
  function lose() { state.session = null; persist(false); say('没关系呀，我陪你再试一次。'); modal(`<div class="modal-center"><span class="modal-eyebrow">IT'S OKAY, TAKE YOUR TIME</span><img class="modal-cat" src="assets/cat-idle.png" alt="王果冻"><h2>就差一点点啦</h2><p>你已经得到 ${game.score.toLocaleString()} 分。<br>赚到的小鱼干都留下了，再来一局吧。</p><button class="primary" data-action="replay">抱抱果冻，再试一次</button><button class="secondary" data-action="zen">去无限放松，不用算步数</button></div>`); }
  function help() { if (busy) return; modal(`<span class="modal-eyebrow">TWO WAYS TO FEEL GOOD</span><h2>今天，想怎么消个痛快？</h2><ol class="guide-steps"><li><b>点点连消：</b>直接点相连的同色点心，2 颗起消。一片消除得分为「颗数² × 5」，10 颗就是 500 分。点心只下落、不补新点心，空列向左靠拢。</li><li>没有相连点心时结算，剩余越少奖励越多，全部清空 +2000 分。累计积分达到本关目标后，带着积分进下一关。每关有 <b>1 次免费换盘</b>，可先用提示找最大的一片。</li><li><b>交换三消：</b>点击两颗相邻点心，或滑动交换，凑齐横竖 3 颗同色消除。4 连造清行/列，5 连造彩虹星，T/L 形造范围炸弹。</li><li><b>特效可以直接点爆！</b>把两颗特效滑动到一起：条纹＋条纹清十字，炸弹＋条纹清 3 行 3 列，双炸弹大范围爆破，彩虹＋特效把同色都变成特效再一起引爆。</li><li>两个玩法都有小锤子与<b>猫爪技能</b>。消除 24 颗充满，点「果冻来帮忙」，再选点心，清除全盘同色。每消除 30 颗赚 1 条鱼；喂鱼花 5 条，亲密度 +8。</li><li>右上角 ♪ 控制背景音乐，喇叭控制音效，设置中可调音量。第一次点击后音乐开始；切到后台或暂停时音乐暂停。Esc 取消选择或暂停，键盘方向键与空格也能操作。</li></ol><button class="primary" data-action="close" style="margin-top:20px">开始消个痛快</button>`); }
  function settings() { if (busy) return; modal(`<span class="modal-eyebrow">KEEP YOUR LITTLE MEMORIES</span><h2>小窝的设置</h2><label class="settings-field">小纸条称呼<input id="nickname-input" maxlength="16" value="${escape(state.nickname)}" placeholder="你"></label><label class="settings-field">音乐与音效音量<input id="volume-input" type="range" min="0" max="80" value="${Math.round(state.volume * 100)}" aria-label="音乐与音效音量"></label><p>右上角 ♪ 和喇叭可以分别开关音乐与音效。</p><button class="primary" data-action="save-settings">保存设置</button><button class="secondary" data-action="guide">查看两种玩法</button><button class="secondary" data-action="export">导出存档备份</button><button class="secondary" data-action="import">从备份恢复</button><input id="save-file" type="file" accept=".json,application/json" hidden><p>每台手机和浏览器分别保存进度。换设备时可用 JSON 存档迁移。旧版鱼干、亲密度和关卡进度会保留。</p><button class="text-button" data-action="close">回到小窝</button>`); }
  function exportSave() { persist(); if (window.MatchPetNative?.exportSave) { window.MatchPetNative.exportSave(JSON.stringify(state, null, 2)); return; } const url = URL.createObjectURL(new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' })); const link = document.createElement('a'); link.href = url; link.download = '王果冻-消消小窝存档.json'; document.body.append(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 10000); toast('已导出存档，请把它保管好。'); }
  let pendingImport = null;
  async function importFile(file) {
    try { if (file.size > 1000000) throw new Error('文件过大'); pendingImport = validate(JSON.parse(await file.text())); modal(`<span class="modal-eyebrow">WELCOME BACK</span><h2>恢复这份小窝回忆？</h2><p>这份存档有 ${pendingImport.wallet} 条小鱼干、${pendingImport.bond} 亲密度，已完成 ${pendingImport.stars.filter(Boolean).length} 关。恢复后会替换当前进度。</p><button class="primary" data-action="confirm-import">确认恢复</button><button class="text-button" data-action="close">取消</button>`); } catch { toast('这份存档无法识别，当前进度没有改动。'); }
  }
  $('modal-content').addEventListener('click', e => {
    const el = e.target.closest('[data-action]'); if (!el) return;
    const action = el.dataset.action;
    if (action === 'close') closeModal();
    if (action === 'next') nextGame(Math.min(11, game.level + 1));
    if (action === 'replay') nextGame(game.level, game.mode);
    if (action === 'zen') nextGame(0, 'zen');
    if (action === 'pop-continue') nextGame(0, 'pop');
    if (action === 'guide') help();
    if (action === 'switch') nextGame(+el.dataset.level, el.dataset.mode);
    if (action === 'save-settings') { state.nickname = $('nickname-input').value.trim() || '你'; persist(); closeModal(); toast('称呼记好啦。'); }
    if (action === 'export') exportSave();
    if (action === 'import') $('save-file').click();
    if (action === 'confirm-import' && pendingImport) { state = pendingImport; pendingImport = null; restoreGame(state.session); closeModal(); clearSelection(); armed = null; paused = false; $('pause-cover').hidden = true; renderBoard(); renderHUD(); renderPet(); persist(); toast('小窝回忆恢复啦。'); }
  });
  $('modal-content').addEventListener('change', e => { if (e.target.id === 'save-file' && e.target.files[0]) importFile(e.target.files[0]); });
  $('modal-content').addEventListener('input', e => { if (e.target.id === 'volume-input') { state.volume = +e.target.value / 100; syncAudio(); persist(); } });
  $('modal').addEventListener('cancel', () => { if (game.status !== 'playing') setTimeout(() => { if (!$('modal').open) game.mode === 'pop' ? showPopCompleted() : game.status === 'won' ? showCompleted() : lose(); }, 0); });
  function showCompleted() { modal(`<div class="modal-center"><span class="modal-eyebrow">NICE TO HAVE YOU HERE</span><h2>这一站已经完成啦</h2><p>奖励已保存，下一站还在等你。</p><button class="primary" data-action="${game.level < 11 ? 'next' : 'zen'}">继续玩</button><button class="text-button" data-action="replay">重玩这一关</button></div>`); }
  $('hint').onclick = () => { if (!canAct()) return; clearSelection(); const move = game.mode === 'pop' ? game.groups()[0] : possibleMoves(game.board)[0]; if (move) { move.forEach(i => $('board').children[i].classList.add('hint')); toast(game.mode === 'pop' ? `最大这一片有 ${move.length} 颗，点一下 +${move.length ** 2 * 5} 分。` : '交换发光的点心，或直接点击特效点心。'); } };
  $('shuffle').onclick = async () => { if (!canAct()) return; if (game.mode === 'pop' && !game.shuffles) { toast('这关已经换过一次啦，试试猫爪和小锤子。'); return; } busy = true; armed = null; clearSelection(); game.shuffle(); renderBoard(true); sound('touch'); await animWait(290); busy = false; renderHUD(); persist(); toast('给你换一盘新的好心情。'); };
  $('hammer').onclick = () => { if (!canAct()) return; if (!game.hammer) { toast('本关小锤子用过啦，试试猫爪技能吧。'); return; } clearSelection(); armed = armed === 'hammer' ? null : 'hammer'; renderHUD(); toast(armed ? '点一颗要敲掉的点心；再点小锤子可取消。' : '小锤子收好啦。'); };
  $('cat-skill').onclick = () => { if (!canAct()) return; if (game.charge < 24) { toast(`再消除 ${24 - game.charge} 颗点心，果冻就能帮忙啦。`); return; } clearSelection(); armed = armed === 'skill' ? null : 'skill'; renderHUD(); toast(armed ? '点一种点心，果冻帮你消除全盘同色。' : '猫爪技能已收好。'); };
  function pauseToggle() { if (busy || $('modal').open || game.status !== 'playing') return; paused = !paused; $('pause-cover').hidden = !paused; audio.setPaused(paused); if (paused) persist(); }
  $('pause').onclick = pauseToggle; $('resume').onclick = pauseToggle;
  $('pet-touch').onclick = touch; $('pet-cat').onclick = touch; $('pet-feed').onclick = feed; $('pet-sleep').onclick = toggleSleep;
  $('help').onclick = help; $('settings').onclick = settings;
  $('sound').onclick = () => { state.sound = !state.sound; renderPet(); persist(); audio.unlock(); if (state.sound) sound('touch'); toast(state.sound ? '消除音效打开啦。' : '消除音效已关闭。'); };
  $('music').onclick = () => { state.music = !state.music; renderPet(); persist(); audio.unlock(); toast(state.music ? '小窝的钢琴音乐打开啦。' : '背景音乐已关闭。'); };
  $('level-map').onclick = e => { const b = e.target.closest('[data-level]'); if (b && !b.disabled) requestSwitch(+b.dataset.level, 'story'); };
  $('story-mode').onclick = () => { if (game.mode !== 'story') requestSwitch(state.unlocked, 'story'); };
  $('zen-mode').onclick = () => { if (game.mode !== 'zen') requestSwitch(0, 'zen'); };
  $('pop-mode').onclick = () => { if (game.mode !== 'pop') requestSwitch(0, 'pop'); };
  $('room-options').onclick = e => { const el = e.target.closest('[data-room]'); if (!el) return; const id = +el.dataset.room;
    if (!state.ownedRooms.includes(id)) { if (state.wallet < rooms[id].cost) { toast(`还差 ${rooms[id].cost - state.wallet} 条小鱼干，就能搬进${rooms[id].name}啦。`); return; } state.wallet -= rooms[id].cost; state.ownedRooms.push(id); }
    state.room = id; persist(); renderPet(); say('换个小窝，还是最喜欢和你待一起。');
  };
  $('desktop-mode').onclick = () => { if (bridge) { bridge.showPet(); toast('果冻到桌面陪你啦，右键可以打开菜单。'); } else modal(`<span class="modal-eyebrow">TAKE YOUR CAT WITH YOU</span><h2>让果冻坐到桌面上</h2><p>打开本游戏文件夹里的「Windows桌宠版」，双击「王果冻的消消小窝.exe」。就能同时拥有消消乐和透明悬浮桌宠。</p><p>桌宠可以拖动、摸摸、睡觉，右键菜单能回到游戏。网页版里的果冻也会一直陪你。</p><button class="primary" data-action="close">知道啦</button>`); };
  let pointer = null, suppressClickUntil = 0;
  $('board').addEventListener('pointerdown', e => { const el = e.target.closest('[data-index]'); if (!el || !canAct()) return; pointer = { x: e.clientX, y: e.clientY, index: +el.dataset.index, id: e.pointerId }; $('board').setPointerCapture(e.pointerId); });
  $('board').addEventListener('pointerup', async e => { if (!pointer || e.pointerId !== pointer.id) return; const p = pointer; pointer = null; const dx = e.clientX - p.x, dy = e.clientY - p.y; suppressClickUntil = Date.now() + 400;
    if (game.mode !== 'pop' && Math.max(Math.abs(dx), Math.abs(dy)) > 18 && !armed) { const next = p.index + (Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 1 : -1) : (dy > 0 ? 8 : -8)); if (MatchPet.adjacent(p.index, next)) { clearSelection(); selected = p.index; await choose(next); } }
    else await choose(p.index);
  });
  $('board').addEventListener('pointercancel', () => { pointer = null; });
  $('board').addEventListener('click', e => { if (Date.now() < suppressClickUntil) return; const el = e.target.closest('[data-index]'); if (el) choose(+el.dataset.index); });
  $('board').addEventListener('keydown', e => { const el = e.target.closest('[data-index]'); if (!el || !canAct()) return; let index = +el.dataset.index; const delta = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -8, ArrowDown: 8 }[e.key]; if (!delta) return; e.preventDefault(); while (MatchPet.adjacent(index, index + delta)) { index += delta; if (game.board[index]) { $('board').children[index].focus(); break; } } });
  let hoverIndex = null;
  $('board').addEventListener('pointermove', e => { if (game?.mode !== 'pop' || !canAct() || armed) return; const el = e.target.closest('[data-index]'), index = el ? +el.dataset.index : null; if (index === hoverIndex) return; hoverIndex = index; $('board').querySelectorAll('.cluster-hover').forEach(t => t.classList.remove('cluster-hover')); const group = cluster(game.board, index); if (group.length >= 2) { group.forEach(i => $('board').children[i].classList.add('cluster-hover')); $('flow-banner').firstElementChild.textContent = `✦ ${group.length} 颗连在一起 · 点一下 +${group.length ** 2 * 5} 分`; } });
  $('board').addEventListener('pointerleave', () => { hoverIndex = null; $('board').querySelectorAll('.cluster-hover').forEach(t => t.classList.remove('cluster-hover')); });
  document.addEventListener('keydown', e => { if (e.key !== 'Escape' || $('modal').open || e.target.matches('input')) return; if (armed || selected !== null) { armed = null; clearSelection(); renderHUD(); } else pauseToggle(); });
  window.addEventListener('beforeunload', () => persist(!busy));
  document.addEventListener('visibilitychange', () => { if (document.hidden) persist(!busy); audio.setPaused(document.hidden || paused); });
  document.addEventListener('pointerdown', e => { if (!['sound', 'music'].includes(e.target.closest('button')?.id)) audio.unlock(); }, { capture: true });
  document.addEventListener('keydown', e => { if (!e.repeat) audio.unlock(); }, { capture: true });
  async function init() {
    let loaded = null;
    if (window.qt?.webChannelTransport) {
      try { await new Promise((resolve, reject) => { const s = document.createElement('script'); s.src = 'qrc:///qtwebchannel/qwebchannel.js'; s.onload = resolve; s.onerror = reject; document.head.append(s); });
        bridge = await new Promise(r => new QWebChannel(qt.webChannelTransport, channel => r(channel.objects.petBridge)));
        loaded = await new Promise(r => bridge.load(r));
        bridge.saveError.connect(message => { $('save-status').textContent = message; toast(message); });
        bridge.changed.connect(data => { try { const incoming = validate(JSON.parse(data)); state = { ...incoming, session: state.session }; renderPet(); } catch { /* Ignore incomplete native writes. */ } });
        $('desktop-caption').textContent = '点击呼出透明桌宠，右键可回到游戏';
      } catch { toast('桌宠连接暂不可用，消消乐仍可正常游玩。'); }
    }
    try { loaded = loaded || localStorage.getItem(KEY); if (loaded) state = validate(JSON.parse(loaded)); }
    catch { $('save-status').textContent = '存档读取失败，可在设置中恢复备份'; }
    restoreGame(state.session); renderBoard(); renderHUD(); renderPet();
    if (state.sleeping) say('呼噜呼噜……梦里也有你。');
    if (!state.seenIntro) { state.seenIntro = true; persist(); modal(`<div class="modal-center"><span class="modal-eyebrow">A LITTLE MATCH, A LOT OF LOVE</span><img class="modal-cat" src="assets/cat-idle.png" alt="王果冻"><h2>欢迎来到${escape(petName())}的小窝</h2><p>消掉一点烦恼，攒下好多喜欢。<br>交换相邻点心，凑齐三颗相同的就能消除。<br>赚来的小鱼干，可以喂饱身边这只小可爱。</p><button class="primary" data-action="close">和果冻一起开始吧</button><p>送你 15 条小鱼干，先给果冻加个餐也可以。</p></div>`); }
    window.MatchPetUI = { get game() { return game; }, get state() { return state; }, get busy() { return busy; }, audio, effects, snapshot, validate, renderBoard, renderHUD, persist };
  }
  init();
})();
