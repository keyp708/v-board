const court = document.getElementById('court');
const coverageLayer = document.getElementById('coverageLayer');
const playersLayer = document.getElementById('playersLayer');
const ball = document.getElementById('ball');
const hint = document.getElementById('hint');
const sceneTitle = document.getElementById('sceneTitle');
const saveStatus = document.getElementById('saveStatus');
const modalRoot = document.getElementById('modalRoot');
const storeKey = 'vboard-sprint3-minimum-v1';
const colors = ['244,45,45','30,145,235','245,166,18','22,174,93','151,82,230','244,111,20'];

const defaultState = {
  scenario: 'serveReceive',
  ball: { x: 50, y: 49, h: 80 },
  players: [
    { id:'o1', side:'opp', label:'LF', x:28, y:18, rw:10, rh:10, rot:0 },
    { id:'o2', side:'opp', label:'MB', x:50, y:18, rw:10, rh:10, rot:0 },
    { id:'o3', side:'opp', label:'RF', x:72, y:18, rw:10, rh:10, rot:0 },
    { id:'o4', side:'opp', label:'OH', x:28, y:34, rw:10, rh:10, rot:0 },
    { id:'o5', side:'opp', label:'S',  x:50, y:34, rw:10, rh:10, rot:0 },
    { id:'o6', side:'opp', label:'OP', x:72, y:34, rw:10, rh:10, rot:0 },
    { id:'h1', side:'home', num:1, nickname:'リオ', age:'', grade:'4年', gender:'女子', height:'', position:'', x:25, y:61, rw:10, rh:10, rot:0, color:0, traits:{growth:'3',active:'3',teamwork:'3',understanding:'3',physical:'3'}, publicMemo:'', privateMemo:'' },
    { id:'h2', side:'home', num:2, nickname:'ユイ', age:'', grade:'4年', gender:'女子', height:'', position:'', x:50, y:61, rw:10, rh:10, rot:0, color:1, traits:{growth:'3',active:'3',teamwork:'3',understanding:'3',physical:'3'}, publicMemo:'', privateMemo:'' },
    { id:'h3', side:'home', num:3, nickname:'サクラ', age:'', grade:'4年', gender:'女子', height:'', position:'', x:75, y:61, rw:10, rh:10, rot:0, color:2, traits:{growth:'3',active:'3',teamwork:'3',understanding:'3',physical:'3'}, publicMemo:'', privateMemo:'' },
    { id:'h4', side:'home', num:4, nickname:'ミオ', age:'', grade:'4年', gender:'女子', height:'', position:'', x:25, y:80, rw:10, rh:10, rot:0, color:3, traits:{growth:'3',active:'3',teamwork:'3',understanding:'3',physical:'3'}, publicMemo:'', privateMemo:'' },
    { id:'h5', side:'home', num:5, nickname:'アヤ', age:'', grade:'4年', gender:'女子', height:'', position:'', x:50, y:80, rw:10, rh:10, rot:0, color:4, traits:{growth:'3',active:'3',teamwork:'3',understanding:'3',physical:'3'}, publicMemo:'', privateMemo:'' },
    { id:'h6', side:'home', num:6, nickname:'ハナ', age:'', grade:'4年', gender:'女子', height:'', position:'', x:75, y:80, rw:10, rh:10, rot:0, color:5, traits:{growth:'3',active:'3',teamwork:'3',understanding:'3',physical:'3'}, publicMemo:'', privateMemo:'' }
  ]
};
const scenarioNames = { serveReceive:'サーブレシーブ', leftAttack:'相手レフト攻撃', chance:'チャンスボール' };
let state = loadState();
let selectedId = 'h2';
let drag = null;
let pressTimer = null;
let pressPoint = null;
let pinch = null;
let lastTap = 0;

function clone(obj){ return JSON.parse(JSON.stringify(obj)); }
function normalizeState(s){
  const base = clone(defaultState);
  if(!s || !Array.isArray(s.players)) return base;
  base.scenario = s.scenario || base.scenario;
  base.ball = {...base.ball, ...(s.ball || {})};
  base.players = base.players.map(bp => ({...bp, ...(s.players.find(p=>p.id===bp.id)||{})}));
  base.players.forEach(p=>{
    if(p.side==='home'){
      p.traits = {...{growth:'3',active:'3',teamwork:'3',understanding:'3',physical:'3'}, ...(p.traits||{})};
      p.nickname = p.nickname || p.name || `選手${p.num}`;
    }
  });
  return base;
}
function loadState(){
  try { return normalizeState(JSON.parse(localStorage.getItem(storeKey))); } catch { return clone(defaultState); }
}
function saveState(){
  localStorage.setItem(storeKey, JSON.stringify(state));
  saveStatus.textContent = '保存済み';
  saveStatus.classList.remove('saving');
}
function markSaving(){ saveStatus.textContent = '保存中'; saveStatus.classList.add('saving'); window.clearTimeout(markSaving.t); markSaving.t = setTimeout(saveState, 120); }
function findPlayer(id){ return state.players.find(p=>p.id===id); }
function clamp(v,min,max){ return Math.max(min, Math.min(max, v)); }
function courtPosFromEvent(e){
  const r = court.getBoundingClientRect();
  return { x: clamp((e.clientX-r.left)/r.width*100, 3, 97), y: clamp((e.clientY-r.top)/r.height*100, 3, 97) };
}
function distTouches(a,b){ return Math.hypot(a.clientX-b.clientX, a.clientY-b.clientY); }
function setHint(t){ hint.textContent = t; }
function rgbFor(p){ return p.side==='opp' ? '34,38,39' : colors[p.color || 0]; }
function getHandlePosition(p, kind){
  const rw=p.rw, rh=p.rh;
  if(kind==='x') return {x:p.x+rw, y:p.y};
  if(kind==='y') return {x:p.x, y:p.y+rh};
  if(kind==='scale') return {x:p.x+rw*.78, y:p.y+rh*.78};
  if(kind==='rotate') return {x:p.x+rw*.78, y:p.y-rh*.92};
  return {x:p.x,y:p.y};
}
function applyCoverageHandle(p, point, kind){
  const dx = point.x - p.x;
  const dy = point.y - p.y;
  if(kind==='x') p.rw = clamp(Math.abs(dx), 6, 32);
  if(kind==='y') p.rh = clamp(Math.abs(dy), 6, 32);
  if(kind==='scale') { const m = clamp(Math.max(Math.abs(dx), Math.abs(dy)), 6, 32); p.rw=m; p.rh=m; }
  if(kind==='rotate') p.rot = Math.round(Math.atan2(dy, dx) * 180 / Math.PI + 45);
}
function render(){
  sceneTitle.textContent = scenarioNames[state.scenario] || 'フォーメーション';
  document.querySelectorAll('.scenario').forEach(b=>b.classList.toggle('active', b.dataset.scenario === state.scenario));
  coverageLayer.innerHTML = '';
  playersLayer.innerHTML = '';

  state.players.forEach(p=>{
    const coverage = document.createElement('div');
    coverage.className = 'coverage' + (p.id === selectedId ? ' selected' : '');
    coverage.style.setProperty('--rgb', rgbFor(p));
    coverage.style.setProperty('--rot', `${p.rot || 0}deg`);
    coverage.style.left = `${p.x}%`;
    coverage.style.top = `${p.y}%`;
    coverage.style.width = `${p.rw*2}%`;
    coverage.style.height = `${p.rh*2}%`;
    coverageLayer.appendChild(coverage);

    const el = document.createElement('div');
    el.className = `player ${p.side === 'opp' ? 'opp' : `home${p.color || 0}`} ${p.id===selectedId?'selected':''}`;
    el.dataset.id = p.id;
    el.style.left = `${p.x}%`;
    el.style.top = `${p.y}%`;
    el.innerHTML = p.side === 'opp'
      ? `<div><div class="num">${p.label}</div><div class="name">${p.label}</div></div>`
      : `<div><div class="num">${p.num}</div><div class="name">${escapeHtml(p.nickname)}</div></div>`;
    playersLayer.appendChild(el);
  });

  const p = findPlayer(selectedId);
  if(p){
    ['x','y','scale','rotate'].forEach(kind=>{
      const h = document.createElement('button');
      h.className = `handle ${kind}`;
      h.dataset.kind = kind;
      h.dataset.id = p.id;
      const hp = getHandlePosition(p, kind);
      h.style.left = `${clamp(hp.x, 1, 99)}%`;
      h.style.top = `${clamp(hp.y, 1, 99)}%`;
      h.textContent = kind === 'x' ? '横' : kind === 'y' ? '縦' : kind === 'scale' ? '○' : '↻';
      playersLayer.appendChild(h);
    });
  }

  ball.style.left = `${state.ball.x}%`;
  ball.style.top = `${state.ball.y}%`;
  ball.style.setProperty('--shadowY', `${24 + state.ball.h/5}px`);
  ball.style.setProperty('--shadowBlur', `${18 + state.ball.h/8}px`);
}
function escapeHtml(str){ return String(str ?? '').replace(/[&<>"]/g, m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m])); }
function openPlayerEditor(id){
  const p = findPlayer(id); if(!p) return;
  selectedId = id; render();
  if(p.side === 'opp') return openOpponentEditor(p);
  modalRoot.innerHTML = `
    <div class="modal-backdrop">
      <div class="modal-card">
        <h3>${escapeHtml(p.nickname)} の選手情報</h3>
        <div class="modal-section">
          <h4>表情報：選手・保護者にも見せられる</h4>
          <div class="field-grid">
            <label>ニックネーム<input id="fNickname" value="${escapeHtml(p.nickname)}" maxlength="10" required></label>
            <label>背番号<input id="fNum" value="${escapeHtml(p.num)}" inputmode="numeric" maxlength="3"></label>
            <label>年齢<input id="fAge" value="${escapeHtml(p.age)}" inputmode="numeric" placeholder="10"></label>
            <label>学年<select id="fGrade">${['1年','2年','3年','4年','5年','6年'].map(g=>`<option ${p.grade===g?'selected':''}>${g}</option>`).join('')}</select></label>
            <label>性別<select id="fGender">${['女子','男子','その他'].map(g=>`<option ${p.gender===g?'selected':''}>${g}</option>`).join('')}</select></label>
            <label>身長cm<input id="fHeight" value="${escapeHtml(p.height)}" inputmode="decimal" placeholder="136"></label>
            <label>ポジション<input id="fPosition" value="${escapeHtml(p.position||'')}" placeholder="レフト/セッター等"></label>
          </div>
          <label style="margin-top:10px">保護者・選手に見せてもよいメモ<textarea id="fPublicMemo" placeholder="最近の成長、今週の目標など">${escapeHtml(p.publicMemo || '')}</textarea></label>
        </div>
        <div class="modal-section">
          <h4>裏情報：監督・コーチ専用</h4>
          <div class="field-grid">
            ${traitField('growth','向上心',p.traits.growth)}
            ${traitField('active','積極性',p.traits.active)}
            ${traitField('teamwork','協調性',p.traits.teamwork)}
            ${traitField('understanding','理解力',p.traits.understanding)}
            ${traitField('physical','身体能力',p.traits.physical)}
          </div>
          <label style="margin-top:10px">コーチ専用メモ<textarea id="fPrivateMemo" placeholder="声かけのコツ、緊張しやすさ、配置時の注意など">${escapeHtml(p.privateMemo || '')}</textarea></label>
        </div>
        <p class="help-text">まずは必須のニックネーム・年齢・学年・性別・身長だけでOK。AIコーチ用の深い情報はあとから増やせます。</p>
        <div class="modal-actions"><button id="cancelModal">閉じる</button><button id="saveModal" class="primary">保存</button></div>
      </div>
    </div>`;
  modalRoot.querySelector('#cancelModal').onclick = closeModal;
  modalRoot.querySelector('#saveModal').onclick = () => {
    p.nickname = val('fNickname') || p.nickname;
    p.num = val('fNum') || p.num;
    p.age = val('fAge');
    p.grade = val('fGrade') || p.grade;
    p.gender = val('fGender') || p.gender;
    p.height = val('fHeight');
    p.position = val('fPosition');
    p.publicMemo = val('fPublicMemo');
    p.privateMemo = val('fPrivateMemo');
    p.traits = { growth:val('t_growth'), active:val('t_active'), teamwork:val('t_teamwork'), understanding:val('t_understanding'), physical:val('t_physical') };
    closeModal(); saveState(); render();
  };
}
function openOpponentEditor(p){
  modalRoot.innerHTML = `
    <div class="modal-backdrop"><div class="modal-card">
      <h3>相手選手</h3>
      <div class="modal-section"><h4>表示情報</h4><label>ポジション<input id="oppLabel" value="${escapeHtml(p.label)}" maxlength="4"></label></div>
      <div class="modal-actions"><button id="cancelModal">閉じる</button><button id="saveModal" class="primary">保存</button></div>
    </div></div>`;
  modalRoot.querySelector('#cancelModal').onclick = closeModal;
  modalRoot.querySelector('#saveModal').onclick = () => { p.label = val('oppLabel').toUpperCase() || p.label; closeModal(); saveState(); render(); };
}
function traitField(key,label,value){ return `<label>${label}<select id="t_${key}">${[1,2,3,4,5].map(n=>`<option value="${n}" ${String(value)===String(n)?'selected':''}>${n}</option>`).join('')}</select></label>`; }
function val(id){ const el = modalRoot.querySelector('#'+id); return el ? el.value.trim() : ''; }
function closeModal(){ modalRoot.innerHTML=''; }
function openPlayersList(){
  const homes = state.players.filter(p=>p.side==='home');
  modalRoot.innerHTML = `
    <div class="modal-backdrop"><div class="modal-card">
      <h3>選手一覧</h3>
      <div class="player-list">
        ${homes.map(p=>`<div class="player-row"><div><b>${p.num}番 ${escapeHtml(p.nickname)}</b><br><span>${escapeHtml(p.grade||'-')} / ${escapeHtml(p.gender||'-')} / ${escapeHtml(p.height||'-')}cm</span></div><button data-edit="${p.id}">編集</button></div>`).join('')}
      </div>
      <div class="modal-actions"><button id="cancelModal">閉じる</button></div>
    </div></div>`;
  modalRoot.querySelector('#cancelModal').onclick = closeModal;
  modalRoot.querySelectorAll('[data-edit]').forEach(btn=>btn.onclick=()=>openPlayerEditor(btn.dataset.edit));
}

court.addEventListener('pointerdown', (e) => {
  const handle = e.target.closest('.handle');
  if(handle){
    e.preventDefault();
    selectedId = handle.dataset.id;
    drag = { type:'handle', id:selectedId, kind:handle.dataset.kind, pointerId:e.pointerId };
    handle.setPointerCapture?.(e.pointerId);
    setHint('守備範囲を調整中。横・縦・○・回転を使えます。');
    return;
  }
  if(e.target === ball){
    e.preventDefault();
    drag = { type:'ball', pointerId:e.pointerId };
    ball.classList.add('dragging');
    ball.setPointerCapture?.(e.pointerId);
    return;
  }
  const player = e.target.closest('.player');
  if(player){
    e.preventDefault();
    selectedId = player.dataset.id;
    const now = Date.now();
    if(now - lastTap < 260){ clearTimeout(pressTimer); openPlayerEditor(selectedId); lastTap = 0; return; }
    lastTap = now;
    pressPoint = { x:e.clientX, y:e.clientY };
    drag = { type:'player', id:selectedId, pointerId:e.pointerId, moved:false };
    player.classList.add('dragging');
    player.setPointerCapture?.(e.pointerId);
    clearTimeout(pressTimer);
    pressTimer = setTimeout(()=>{ if(drag && !drag.moved){ drag = null; openPlayerEditor(selectedId); } }, 620);
    render();
  }
});

court.addEventListener('pointermove', (e) => {
  if(!drag || drag.pointerId !== e.pointerId) return;
  e.preventDefault();
  const p = courtPosFromEvent(e);
  if(pressPoint && Math.hypot(e.clientX-pressPoint.x, e.clientY-pressPoint.y) > 7){ clearTimeout(pressTimer); drag.moved = true; }
  if(drag.type === 'ball') { state.ball.x = p.x; state.ball.y = p.y; }
  if(drag.type === 'player') { const pl = findPlayer(drag.id); if(pl){ pl.x = p.x; pl.y = p.y; } }
  if(drag.type === 'handle') { const pl = findPlayer(drag.id); if(pl) applyCoverageHandle(pl, p, drag.kind); }
  markSaving(); render();
});
function endDrag(){ clearTimeout(pressTimer); drag = null; pressPoint = null; document.querySelectorAll('.dragging').forEach(e=>e.classList.remove('dragging')); setHint('選手・ボールをドラッグ。選手を長押しで情報編集。選択中の守備範囲はハンドルか2本指で調整。'); }
court.addEventListener('pointerup', endDrag); court.addEventListener('pointercancel', endDrag);

court.addEventListener('touchstart', e => {
  if(e.touches.length === 2 && selectedId){
    const pl = findPlayer(selectedId);
    pinch = { d: distTouches(e.touches[0], e.touches[1]), rw: pl.rw, rh: pl.rh };
    e.preventDefault();
  }
}, {passive:false});
court.addEventListener('touchmove', e => {
  if(e.touches.length === 2 && pinch && selectedId){
    const pl = findPlayer(selectedId); const scale = distTouches(e.touches[0], e.touches[1]) / pinch.d;
    const m = clamp(Math.max(pinch.rw, pinch.rh) * scale, 6, 32);
    pl.rw = m; pl.rh = m;
    markSaving(); render();
    setHint('2本指で円を大きく/小さくしています。自由変形は白いハンドルを使ってください。');
    e.preventDefault();
  }
}, {passive:false});
court.addEventListener('touchend', () => { pinch = null; });
document.addEventListener('gesturestart', e => e.preventDefault());
document.addEventListener('touchmove', e => { if(e.touches.length > 1 && e.target.closest('#court')) e.preventDefault(); }, {passive:false});

document.querySelectorAll('.scenario[data-scenario]').forEach(btn => btn.onclick = () => { state.scenario = btn.dataset.scenario; markSaving(); render(); });
document.getElementById('resetBtn').onclick = () => { if(confirm('配置と選手情報を初期状態に戻しますか？')){ state = clone(defaultState); selectedId = 'h2'; saveState(); render(); } };
document.getElementById('fullscreenBtn').onclick = () => document.documentElement.requestFullscreen?.();
document.getElementById('playersListBtn').onclick = openPlayersList;

render();
saveState();
