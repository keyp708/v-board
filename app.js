const POSITIONS = [
  { id: 's',  jp: 'セッター', short: 'S'  },
  { id: 'lf', jp: 'レフト',   short: 'LF' },
  { id: 'c',  jp: 'センター', short: 'C'  },
  { id: 'rf', jp: 'ライト',   short: 'RF' },
  { id: 'bl', jp: 'Bレフト',  short: 'BL' },
  { id: 'br', jp: 'Bライト',  short: 'BR' }
];
const SELF_DEFAULT = {
  s: { x: 50, y: 60 }, lf: { x: 26, y: 69 }, c: { x: 50, y: 69 }, rf: { x: 74, y: 69 }, bl: { x: 35, y: 84 }, br: { x: 65, y: 84 }
};
const OPP_DEFAULT = {
  s: { x: 50, y: 43 }, lf: { x: 26, y: 43 }, c: { x: 50, y: 28 }, rf: { x: 74, y: 43 }, bl: { x: 35, y: 19 }, br: { x: 65, y: 19 }
};
const STORAGE_KEY = 'vboard16_beta';
const defaultPlayers = POSITIONS.map((p, i) => ({
  id: `p${i+1}`, name: '', grade: '4', age: '10', height: '135', sex: '未設定', position: p.id, coachMemo: ''
}));
const baseScene = () => ({
  ball: { x: 50, y: 50 }, placements: {}, oppPlacements: {}, areas: {}, oppAreas: {}
});
let state = load();
let drag = null;
let longTimer = null;
let swapFirst = null;
let drawerTouch = null;

function load() {
  try { return normalize(JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}); }
  catch { return normalize({}); }
}
function normalize(raw) {
  const s = {
    team: 'A', teams: ['A'], view: 'top', ballType: 'molten', sceneId: 'serve',
    scenes: [{ id: 'serve', name: 'サーブレシーブ' }], mode: 'select', selected: 'p1', players: defaultPlayers,
    byScene: { serve: baseScene() }, ...raw
  };
  if (!Array.isArray(s.teams) || !s.teams.length) s.teams = ['A'];
  if (!Array.isArray(s.scenes) || !s.scenes.length) s.scenes = [{ id: 'serve', name: 'サーブレシーブ' }];
  if (!s.sceneId || !s.scenes.some(sc => sc.id === s.sceneId)) s.sceneId = s.scenes[0].id;
  if (!Array.isArray(s.players) || !s.players.length) s.players = structuredClone(defaultPlayers);
  s.players = POSITIONS.map((pos, i) => ({ ...defaultPlayers[i], ...(s.players[i] || {}), id: (s.players[i] && s.players[i].id) || `p${i+1}`, position: (s.players[i] && s.players[i].position) || pos.id }));
  if (!s.byScene) s.byScene = {};
  s.scenes.forEach(sc => {
    if (!s.byScene[sc.id]) s.byScene[sc.id] = baseScene();
    const bs = s.byScene[sc.id];
    bs.ball = { x: 50, y: 50, ...(bs.ball || {}) };
    bs.placements = bs.placements || {};
    bs.oppPlacements = bs.oppPlacements || {};
    bs.areas = bs.areas || {};
    bs.oppAreas = bs.oppAreas || {};
    // Important: reset legacy elliptical defaults to true circles unless user later edits in this version.
    [...s.players.map(p => p.id), ...POSITIONS.map(p => `o_${p.id}`)].forEach(id => {
      const bucket = id.startsWith('o_') ? bs.oppAreas : bs.areas;
      if (!bucket[id]) bucket[id] = { r: 16, edited: false };
      if (!bucket[id].edited) bucket[id] = { r: 16, edited: false };
      bucket[id].r = Math.max(10, Math.min(32, Number(bucket[id].r) || 16));
    });
  });
  return s;
}
function persist(silent=false) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  if (!silent) toast('保存済み');
}
function currentScene() { return state.byScene[state.sceneId]; }
function pos(id) { return POSITIONS.find(p => p.id === id) || POSITIONS[0]; }
function posLabel(id) { return pos(id).jp; }
function fontSize(label, type='pos') {
  const len = [...String(label || '')].length;
  if (type === 'name') return len <= 3 ? 17 : len === 4 ? 15 : 13;
  return len <= 3 ? 14 : len === 4 ? 12 : 10;
}
function selfPlace(player) {
  const sc = currentScene();
  if (!sc.placements[player.id]) sc.placements[player.id] = { ...SELF_DEFAULT[player.position] };
  return sc.placements[player.id];
}
function oppPlace(positionId) {
  const sc = currentScene();
  const key = `o_${positionId}`;
  if (!sc.oppPlacements[key]) sc.oppPlacements[key] = { ...OPP_DEFAULT[positionId] };
  return sc.oppPlacements[key];
}
function areaFor(id, opp=false) {
  const sc = currentScene();
  const bucket = opp ? sc.oppAreas : sc.areas;
  if (!bucket[id]) bucket[id] = { r: 16, edited: false };
  bucket[id].r = Math.max(10, Math.min(32, Number(bucket[id].r) || 16));
  return bucket[id];
}
function render() {
  const sceneName = state.scenes.find(s => s.id === state.sceneId)?.name || 'シーン';
  document.getElementById('app').innerHTML = `
    <div class="app">
      <div class="topbar">
        <button class="pill teamBtn" id="teamBtn">${escapeHtml(state.team)}</button>
        <button class="pill sceneBtn" id="sceneBtn">${escapeHtml(sceneName)} ▼</button>
        <button class="pill playersBtn" id="playersBtn">選手</button>
      </div>
      <div class="viewSwitch"><button id="topView" class="${state.view==='top'?'active':''}">トップビュー</button><button id="sideView" class="${state.view==='side'?'active':''}">サイドビュー</button></div>
      <main class="main">${state.view === 'top' ? courtHtml() : sideHtml()}</main>
      ${bottomBarHtml()}
      ${drawerHtml()}
      ${sheetHtml()}
      <div class="toast" id="toast"></div>
    </div>`;
  bind();
}
function courtHtml() {
  const sc = currentScene();
  return `<div class="courtFrame" id="courtFrame">
    <button class="edgeHandle left" id="teamHandle">‹</button>
    <button class="edgeHandle right" id="playerHandle">›</button>
    <div class="court" id="court">
      <div class="attack top"></div><div class="attack bottom"></div><div class="net"></div><div class="courtLabel">相手コート</div>
      ${POSITIONS.map(p => areaHtml(`o_${p.id}`, oppPlace(p.id), true)).join('')}
      ${POSITIONS.map(p => markerHtml({ id:`o_${p.id}`, position:p.id, opp:true }, oppPlace(p.id), true)).join('')}
      ${state.players.map(p => areaHtml(p.id, selfPlace(p), false)).join('')}
      ${state.players.map(p => markerHtml(p, selfPlace(p), false)).join('')}
      ${ballHtml(sc.ball)}
    </div>
  </div>`;
}
function areaHtml(id, place, opp) {
  const a = areaFor(id, opp);
  const selected = state.selected === id ? ' selected' : '';
  return `<div class="area${selected}" style="left:${place.x}%;top:${place.y}%;--areaPx:${areaPx(a.r)}px"></div>`;
}
function markerHtml(player, place, opp) {
  const id = player.id;
  const selected = state.selected === id ? ' selected' : '';
  const positionText = posLabel(player.position);
  let content;
  if (opp) {
    content = `<div class="pos only" style="--posSize:${fontSize(positionText)}px">${escapeHtml(positionText)}</div>`;
  } else if (player.name && player.name.trim()) {
    content = `<div class="name" style="font-size:${fontSize(player.name,'name')}px">${escapeHtml(player.name)}</div><div class="pos" style="font-size:${fontSize(positionText)}px">${escapeHtml(positionText)}</div>`;
  } else {
    content = `<div class="pos only" style="--posSize:${fontSize(positionText)}px">${escapeHtml(positionText)}</div>`;
  }
  return `<div class="player ${opp?'opp':''}${selected}" data-player="${escapeHtml(id)}" data-opp="${opp?'1':'0'}" style="left:${place.x}%;top:${place.y}%"><div class="marker">${content}</div>${!opp && state.selected === id ? handlesHtml() : ''}</div>`;
}
function handlesHtml() {
  return `<div class="handles"><div class="handle move" data-handle="move"></div><div class="handle size" data-handle="size"></div><div class="handle rot" data-handle="rot"></div></div>`;
}
function areaPx(r) {
  const court = document.getElementById('court');
  const w = court ? court.clientWidth : 420;
  return Math.round(w * r / 100);
}
function ballHtml(ball) {
  return `<div class="ball" id="ball" style="left:${ball.x}%;top:${ball.y}%"><div class="ballCore ${state.ballType}"></div></div>`;
}
function sideHtml() {
  return `<section class="sideView">
    <div class="sideCanvas"><div class="floor"></div><div class="sideNet"></div><div class="netText">ネット 2.0m</div><div class="arc"></div><div class="sideBall"><div class="ballCore ${state.ballType}"></div></div><div class="person p1"></div><div class="person p2"></div></div>
    <p class="sideHint">サイドビューβ：今日は固まらないことを最優先。高さ・軌道・選手身長の連動は次のSprintで広げます。</p>
  </section>`;
}
function bottomBarHtml() {
  return `<div class="bottomBar">
    <button id="undo"><span class="icon">↶</span>UNDO</button>
    <button id="range" class="${state.mode==='range'?'active':''}"><span class="icon">◌</span>範囲</button>
    <button id="swap" class="${state.mode==='swap'?'active':''}"><span class="icon">⇄</span>交代</button>
    <button id="addScene"><span class="icon">＋</span>シーン</button>
    <button id="reset"><span class="icon">⌫</span>リセット</button>
  </div>`;
}
function drawerHtml() {
  return `<aside class="drawer left" id="teamDrawer"><button class="close" data-close>×</button><h2>チーム</h2>${state.teams.map(t=>`<div class="item" data-team="${escapeHtml(t)}"><div class="badge">${escapeHtml(t[0]||'T')}</div><div><strong>${escapeHtml(t)}チーム</strong><small>タップで切替</small></div><div>›</div></div>`).join('')}<button class="wideBtn" id="addTeam">＋ チーム追加</button></aside>
  <aside class="drawer right" id="playerDrawer"><button class="close" data-close>×</button><h2>選手一覧</h2>${state.players.map((p,i)=>`<div class="item" data-edit="${escapeHtml(p.id)}"><div class="badge">${i+1}</div><div><strong>${escapeHtml(p.name || posLabel(p.position))}</strong><small>${escapeHtml(posLabel(p.position))} / ${escapeHtml(p.grade)}年 / ${escapeHtml(p.height)}cm</small></div><div>›</div></div>`).join('')}<button class="wideBtn" id="addPlayer">＋ 選手追加</button><button class="wideBtn" id="ballSwitch">ボール：${state.ballType==='molten'?'モルテン風':'ミカサ風'}</button></aside>
  <aside class="drawer right" id="sceneDrawer"><button class="close" data-close>×</button><h2>シーン</h2>${state.scenes.map(sc=>`<div class="item" data-scene="${escapeHtml(sc.id)}"><div class="badge">▶</div><div><strong>${escapeHtml(sc.name)}</strong><small>タップで切替</small></div><div>›</div></div>`).join('')}<button class="wideBtn" id="newScene">＋ シーン追加</button></aside>`;
}
function sheetHtml() {
  return `<div class="sheetBack" id="sheetBack"><div class="sheet"><h2>選手情報</h2><div class="grid">
    <div class="field"><label>ニックネーム</label><input id="fName" placeholder="例：みはな"></div>
    <div class="field"><label>性別</label><select id="fSex"><option>未設定</option><option>女</option><option>男</option></select></div>
    <div class="field"><label>学年</label><select id="fGrade">${[1,2,3,4,5,6].map(n=>`<option value="${n}">${n}年</option>`).join('')}</select></div>
    <div class="field"><label>年齢</label><select id="fAge">${Array.from({length:13},(_,i)=>i+6).map(n=>`<option value="${n}">${n}歳</option>`).join('')}</select></div>
    <div class="field"><label>身長</label><select id="fHeight">${Array.from({length:81},(_,i)=>i+100).map(n=>`<option value="${n}">${n}cm</option>`).join('')}</select></div>
    <div class="field"><label>ポジション</label><select id="fPos">${POSITIONS.map(p=>`<option value="${p.id}">${p.jp}</option>`).join('')}</select></div>
  </div><div class="field" style="margin-top:12px"><label>コーチ専用メモ</label><textarea id="fMemo" rows="3"></textarea></div><button class="saveBtn" id="savePlayer">保存</button><button class="deleteBtn" id="deletePlayer">選手を削除</button></div></div>`;
}
function bind() {
  byId('teamBtn').onclick = () => openDrawer('teamDrawer');
  byId('teamHandle')?.addEventListener('click', () => openDrawer('teamDrawer'));
  byId('playersBtn').onclick = () => openDrawer('playerDrawer');
  byId('playerHandle')?.addEventListener('click', () => openDrawer('playerDrawer'));
  byId('sceneBtn').onclick = () => openDrawer('sceneDrawer');
  byId('addScene').onclick = () => openDrawer('sceneDrawer');
  byId('topView').onclick = () => { state.view = 'top'; persist(true); render(); };
  byId('sideView').onclick = () => { state.view = 'side'; persist(true); render(); };
  byId('range').onclick = () => { state.mode = state.mode === 'range' ? 'select' : 'range'; render(); };
  byId('swap').onclick = () => { state.mode = state.mode === 'swap' ? 'select' : 'swap'; swapFirst = null; toast('交代：2人を順にタップ'); render(); };
  byId('reset').onclick = () => { if(confirm('現在のシーンを初期化しますか？')) { state.byScene[state.sceneId] = baseScene(); persist(); render(); } };
  document.querySelectorAll('[data-close]').forEach(b => b.onclick = closeDrawers);
  document.querySelectorAll('[data-team]').forEach(el => el.onclick = () => { state.team = el.dataset.team; closeDrawers(); persist(); render(); });
  byId('addTeam').onclick = () => { const n = prompt('チーム名', nextTeamName()); if(n) { state.teams.push(n); state.team = n; persist(); render(); } };
  document.querySelectorAll('[data-scene]').forEach(el => el.onclick = () => { state.sceneId = el.dataset.scene; closeDrawers(); persist(); render(); });
  byId('newScene').onclick = () => { const name = prompt('シーン名', '相手レフト'); if(name) { const id = `scene_${Date.now()}`; state.scenes.push({id,name}); state.byScene[id] = structuredClone(currentScene()); state.sceneId = id; persist(); render(); } };
  document.querySelectorAll('[data-edit]').forEach(el => el.onclick = () => openSheet(el.dataset.edit));
  byId('addPlayer').onclick = () => addPlayer();
  byId('ballSwitch').onclick = () => { state.ballType = state.ballType === 'molten' ? 'mikasa' : 'molten'; persist(); render(); };
  byId('sheetBack').onclick = e => { if(e.target.id === 'sheetBack') closeSheet(); };
  byId('savePlayer').onclick = savePlayer;
  byId('deletePlayer').onclick = deletePlayer;
  bindDrawerSwipe();
  if(state.view === 'top') bindCourt();
}
function bindCourt() {
  const court = byId('court');
  if (!court) return;
  court.querySelectorAll('.player').forEach(el => {
    el.addEventListener('pointerdown', onPlayerDown);
    el.addEventListener('pointermove', onPointerMove);
    el.addEventListener('pointerup', onPointerUp);
    el.addEventListener('pointercancel', onPointerUp);
  });
  court.querySelectorAll('.handle').forEach(el => {
    el.addEventListener('pointerdown', onHandleDown);
    el.addEventListener('pointermove', onPointerMove);
    el.addEventListener('pointerup', onPointerUp);
    el.addEventListener('pointercancel', onPointerUp);
  });
  const ball = byId('ball');
  ball.addEventListener('pointerdown', e => { drag = { type:'ball', id:'ball', start:point(e), startBall:{...currentScene().ball} }; ball.setPointerCapture(e.pointerId); });
  ball.addEventListener('pointermove', onPointerMove);
  ball.addEventListener('pointerup', onPointerUp);
  ball.addEventListener('pointercancel', onPointerUp);
}
function onPlayerDown(e) {
  const el = e.currentTarget;
  const id = el.dataset.player;
  const isOpp = el.dataset.opp === '1';
  if (isOpp) {
    state.selected = id;
    drag = { type:'opp', id, start:point(e), startPlace:{...oppPlace(id.replace('o_',''))} };
  } else {
    state.selected = id;
    if (state.mode === 'swap') { handleSwap(id); e.preventDefault(); return; }
    longTimer = setTimeout(() => { longTimer = null; openSheet(id); }, 620);
    drag = { type:'player', id, start:point(e), startPlace:{...selfPlace(state.players.find(p=>p.id===id))} };
  }
  el.setPointerCapture(e.pointerId);
  renderSoftSelection();
}
function onHandleDown(e) {
  e.stopPropagation();
  const h = e.currentTarget.dataset.handle;
  const id = state.selected;
  const a = areaFor(id, false);
  drag = { type:'handle', handle:h, id, start:point(e), startArea:{...a} };
  e.currentTarget.setPointerCapture(e.pointerId);
}
function onPointerMove(e) {
  if (!drag) return;
  const pt = point(e);
  const rect = byId('court').getBoundingClientRect();
  const dxPct = (pt.x - drag.start.x) / rect.width * 100;
  const dyPct = (pt.y - drag.start.y) / rect.height * 100;
  if ((Math.abs(pt.x-drag.start.x) + Math.abs(pt.y-drag.start.y)) > 7) clearTimeout(longTimer);
  if (drag.type === 'player') {
    const p = state.players.find(p=>p.id===drag.id); const pl = selfPlace(p);
    pl.x = clamp(drag.startPlace.x + dxPct, 5, 95); pl.y = clamp(drag.startPlace.y + dyPct, 52, 95);
    renderSoftPositions();
  } else if (drag.type === 'opp') {
    const key = drag.id.replace('o_',''); const pl = oppPlace(key);
    pl.x = clamp(drag.startPlace.x + dxPct, 5, 95); pl.y = clamp(drag.startPlace.y + dyPct, 5, 48);
    renderSoftPositions();
  } else if (drag.type === 'ball') {
    const b = currentScene().ball;
    b.x = clamp(drag.startBall.x + dxPct, 3, 97); b.y = clamp(drag.startBall.y + dyPct, 3, 97);
    renderSoftPositions();
  } else if (drag.type === 'handle') {
    const a = areaFor(drag.id, false);
    const delta = Math.max((pt.x - drag.start.x), (pt.y - drag.start.y));
    a.r = clamp(drag.startArea.r + delta / rect.width * 100, 10, 34);
    a.edited = true;
    renderSoftPositions();
  }
}
function onPointerUp() {
  clearTimeout(longTimer);
  longTimer = null;
  if (drag) { drag = null; persist(true); }
}
function renderSoftSelection() {
  document.querySelectorAll('.player,.area').forEach(el => el.classList.remove('selected'));
  const target = document.querySelector(`[data-player="${CSS.escape(state.selected)}"]`);
  if(target) target.classList.add('selected');
}
function renderSoftPositions() {
  const sc = currentScene();
  state.players.forEach(p => {
    const pl = selfPlace(p);
    const el = document.querySelector(`[data-player="${CSS.escape(p.id)}"]`); if(el) { el.style.left = `${pl.x}%`; el.style.top = `${pl.y}%`; }
    const ar = document.querySelector(`.area:nth-of-type`); // unused safeguard
  });
  POSITIONS.forEach(p => {
    const pl = oppPlace(p.id);
    const el = document.querySelector(`[data-player="o_${CSS.escape(p.id)}"]`); if(el) { el.style.left = `${pl.x}%`; el.style.top = `${pl.y}%`; }
  });
  const ball = byId('ball'); if(ball) { ball.style.left = `${sc.ball.x}%`; ball.style.top = `${sc.ball.y}%`; }
  // Area nodes are easier and safer to fully re-render because only circles, not expensive.
  render();
}
function handleSwap(id) {
  if (!swapFirst) { swapFirst = id; state.selected = id; toast('交代する相手を選択'); render(); return; }
  if (swapFirst === id) { swapFirst = null; return; }
  const p1 = state.players.find(p=>p.id===swapFirst), p2 = state.players.find(p=>p.id===id);
  const a = {...selfPlace(p1)}, b = {...selfPlace(p2)};
  currentScene().placements[p1.id] = b; currentScene().placements[p2.id] = a;
  swapFirst = null; state.mode = 'select'; state.selected = id; persist(); render();
}
function openDrawer(id) { closeDrawers(); byId(id).classList.add('open'); }
function closeDrawers() { document.querySelectorAll('.drawer').forEach(d => d.classList.remove('open')); }
function bindDrawerSwipe() {
  document.querySelectorAll('.drawer').forEach(d => {
    d.addEventListener('pointerdown', e => { drawerTouch = { drawer:d, x:e.clientX, y:e.clientY }; });
    d.addEventListener('pointerup', e => {
      if (!drawerTouch || drawerTouch.drawer !== d) return;
      const dx = e.clientX - drawerTouch.x;
      if ((d.classList.contains('right') && dx > 55) || (d.classList.contains('left') && dx < -55)) closeDrawers();
      drawerTouch = null;
    });
  });
}
function openSheet(id) {
  const p = state.players.find(p=>p.id===id); if(!p) return;
  state.selected = id;
  byId('fName').value = p.name || '';
  byId('fSex').value = p.sex || '未設定';
  byId('fGrade').value = p.grade || '4';
  byId('fAge').value = p.age || '10';
  byId('fHeight').value = p.height || '135';
  byId('fPos').value = p.position || 's';
  byId('fMemo').value = p.coachMemo || '';
  byId('sheetBack').classList.add('open');
}
function closeSheet() { byId('sheetBack').classList.remove('open'); }
function savePlayer() {
  const p = state.players.find(p=>p.id===state.selected); if(!p) return;
  p.name = byId('fName').value.trim(); p.sex = byId('fSex').value; p.grade = byId('fGrade').value; p.age = byId('fAge').value; p.height = byId('fHeight').value; p.position = byId('fPos').value; p.coachMemo = byId('fMemo').value;
  closeSheet(); persist(); render();
}
function deletePlayer() {
  const p = state.players.find(p=>p.id===state.selected); if(!p) return;
  if (!confirm('この選手を削除しますか？')) return;
  p.name = ''; p.sex='未設定'; p.grade='4'; p.age='10'; p.height='135'; p.coachMemo='';
  closeSheet(); persist(); render();
}
function addPlayer() {
  const ix = state.players.length;
  const base = POSITIONS[ix % POSITIONS.length];
  const p = { id:`p_${Date.now()}`, name:'', grade:'4', age:'10', height:'135', sex:'未設定', position:base.id, coachMemo:'' };
  state.players.push(p); persist(); render(); openSheet(p.id);
}
function nextTeamName() { return String.fromCharCode(65 + Math.min(25, state.teams.length)); }
function byId(id) { return document.getElementById(id); }
function point(e) { return { x:e.clientX, y:e.clientY }; }
function clamp(v,min,max) { return Math.max(min, Math.min(max, v)); }
function escapeHtml(s) { return String(s || '').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); }
function toast(msg) { const t=byId('toast'); if(!t) return; t.textContent=msg; t.style.display='block'; clearTimeout(t._timer); t._timer=setTimeout(()=>t.style.display='none',900); }

render();
