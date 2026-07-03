(() => {
  'use strict';
  const KEY = 'vboard_sprint19_polished_v1';
  const POS = [
    { id:'S', jp:'セッター', short:'S' },
    { id:'L', jp:'レフト', short:'L' },
    { id:'C', jp:'センター', short:'C' },
    { id:'R', jp:'ライト', short:'R' },
    { id:'BL', jp:'Bレフト', short:'BL' },
    { id:'BR', jp:'Bライト', short:'BR' },
  ];
  // 画面上の位置。自分側はネットが上、相手側はネットが下なので反転配置。
  const SELF_LAYOUT = {
    S:[50,56], L:[25,67], C:[50,69], R:[75,67], BL:[33,84], BR:[67,84]
  };
  const OPP_LAYOUT = {
    S:[50,44], L:[25,39], C:[50,31], R:[75,39], BL:[33,17], BR:[67,17]
  };
  const $ = (q, root=document) => root.querySelector(q);
  const court = $('#court');
  const ball = $('#ball');
  const drawer = $('#drawer');
  const drawerBackdrop = $('#drawerBackdrop');
  const sheet = $('#playerSheet');
  const sheetBackdrop = $('#sheetBackdrop');

  let state = load();
  let selectedId = null;
  let dragging = null;
  let longTimer = null;
  let swapMode = false;
  let swapFirst = null;
  let activePlayerId = null;
  let undoStack = [];

  function defaultState(){
    const players = [];
    POS.forEach((p, idx) => {
      const [x,y] = SELF_LAYOUT[p.id];
      players.push({ id:'self-'+p.id, side:'self', slot:idx+1, name:'', grade:'4年', age:'10歳', gender:'未設定', height:'135cm', pos:p.id, x,y, r:58, memo:'' });
    });
    POS.forEach((p, idx) => {
      const [x,y] = OPP_LAYOUT[p.id];
      players.push({ id:'opp-'+p.id, side:'opponent', slot:idx+1, name:'', grade:'4年', age:'10歳', gender:'未設定', height:'135cm', pos:p.id, x,y, r:58, memo:'' });
    });
    return {
      team:'A', scene:'サーブレシーブ', view:'top', ballBrand:'molten', ball:{x:50,y:50},
      teams:['A','B'], scenes:['サーブレシーブ'], players
    };
  }
  function load(){
    try { return JSON.parse(localStorage.getItem(KEY)) || defaultState(); } catch { return defaultState(); }
  }
  function save(){ localStorage.setItem(KEY, JSON.stringify(state)); }
  function snapshot(){ undoStack.push(JSON.stringify(state)); if(undoStack.length>20) undoStack.shift(); }
  function posLabel(id){ return (POS.find(p=>p.id===id)||POS[0]).jp; }
  function shortLabel(id){ return (POS.find(p=>p.id===id)||POS[0]).short; }

  function initSelects(){
    const grade = $('#fGrade'), age = $('#fAge'), height = $('#fHeight'), pos = $('#fPosition');
    grade.innerHTML = Array.from({length:6},(_,i)=>`<option>${i+1}年</option>`).join('');
    age.innerHTML = Array.from({length:13},(_,i)=>`<option>${i+6}歳</option>`).join('');
    height.innerHTML = Array.from({length:81},(_,i)=>`<option>${i+100}cm</option>`).join('');
    pos.innerHTML = POS.map(p=>`<option value="${p.id}">${p.jp}</option>`).join('');
  }

  function render(){
    $('#teamBtn').textContent = state.team;
    $('#sceneBtn').textContent = state.scene + ' ▼';
    $('#topViewBtn').classList.toggle('active', state.view==='top');
    $('#sideViewBtn').classList.toggle('active', state.view==='side');
    $('#courtWrap').classList.toggle('hidden', state.view!=='top');
    $('#sideView').classList.toggle('hidden', state.view!=='side');
    ball.className = 'ball ' + state.ballBrand;
    ball.style.left = state.ball.x + '%'; ball.style.top = state.ball.y + '%';
    court.querySelectorAll('.player,.range,.handle').forEach(e=>e.remove());
    state.players.forEach(p => {
      const range = document.createElement('div');
      range.className = 'range' + (p.id===selectedId ? ' selected' : '');
      range.style.left = p.x + '%'; range.style.top = p.y + '%';
      range.style.setProperty('--range', (p.r*2) + 'px');
      court.appendChild(range);

      const marker = document.createElement('div');
      marker.className = 'player ' + p.side + (p.id===selectedId?' selected':'');
      marker.dataset.id = p.id;
      marker.style.left = p.x + '%'; marker.style.top = p.y + '%';
      const hasName = p.side === 'self' && p.name.trim();
      if (!hasName) marker.classList.add('onlyPos');
      if (p.side === 'opponent') {
        marker.innerHTML = `<span class="pos">${fit(posLabel(p.pos), 4)}</span>`;
      } else if (hasName) {
        marker.innerHTML = `<span class="name">${fit(p.name.trim(), 4)}</span><span class="pos">${fit(posLabel(p.pos), 4)}</span>`;
      } else {
        marker.innerHTML = `<span class="pos">${fit(posLabel(p.pos), 4)}</span>`;
      }
      court.appendChild(marker);
      bindMarker(marker, p);
      if(p.id===selectedId) renderHandles(p);
    });
    save();
  }
  function fit(text, max){ return text.length > max ? text.slice(0, max-1) + '…' : text; }
  function renderHandles(p){
    ['r','b','rot'].forEach(cls=>{
      const h = document.createElement('div'); h.className = 'handle '+cls; h.dataset.kind = cls; h.style.left = p.x + '%'; h.style.top = p.y + '%';
      h.style.setProperty('--range', (p.r*2)+'px'); court.appendChild(h); bindHandle(h,p);
    });
  }
  function pctFromEvent(e){
    const rect = court.getBoundingClientRect();
    const x = Math.max(3, Math.min(97, ((e.clientX - rect.left)/rect.width)*100));
    const y = Math.max(3, Math.min(97, ((e.clientY - rect.top)/rect.height)*100));
    return {x,y};
  }
  function bindMarker(el,p){
    el.addEventListener('pointerdown', e => {
      e.preventDefault(); e.stopPropagation();
      selectedId = p.id; render();
      longTimer = setTimeout(()=> openPlayerSheet(p.id), 520);
      const start = pctFromEvent(e); dragging = {type:'player', id:p.id, dx:p.x-start.x, dy:p.y-start.y, moved:false};
      el.setPointerCapture?.(e.pointerId);
    });
  }
  function bindHandle(el,p){
    el.addEventListener('pointerdown', e => {
      e.preventDefault(); e.stopPropagation(); clearTimeout(longTimer); snapshot();
      dragging = {type:'range', id:p.id}; el.setPointerCapture?.(e.pointerId);
    });
  }
  ball.addEventListener('pointerdown', e => { e.preventDefault(); snapshot(); dragging={type:'ball'}; ball.setPointerCapture?.(e.pointerId); });
  window.addEventListener('pointermove', e => {
    if(!dragging) return;
    e.preventDefault();
    if(dragging.type==='player'){
      const p = state.players.find(x=>x.id===dragging.id); if(!p) return;
      const pt = pctFromEvent(e); if(!dragging.moved){ snapshot(); dragging.moved=true; }
      p.x = pt.x + dragging.dx; p.y = pt.y + dragging.dy;
      p.x = Math.max(8, Math.min(92,p.x)); p.y = Math.max(7, Math.min(93,p.y));
      clearTimeout(longTimer); render();
    } else if(dragging.type==='ball'){
      const pt = pctFromEvent(e); state.ball = pt; render();
    } else if(dragging.type==='range'){
      const p = state.players.find(x=>x.id===dragging.id); if(!p) return;
      const rect = court.getBoundingClientRect();
      const cx = rect.left + rect.width*p.x/100, cy = rect.top + rect.height*p.y/100;
      const dist = Math.hypot(e.clientX-cx, e.clientY-cy);
      p.r = Math.max(46, Math.min(120, Math.round(dist))); render();
    }
  }, {passive:false});
  window.addEventListener('pointerup', e => { dragging=null; clearTimeout(longTimer); });

  court.addEventListener('click', e => {
    const marker = e.target.closest('.player');
    if(!marker) return;
    const id = marker.dataset.id;
    if(swapMode){
      if(!swapFirst){ swapFirst=id; selectedId=id; render(); }
      else if(swapFirst!==id){
        snapshot(); const a=state.players.find(p=>p.id===swapFirst), b=state.players.find(p=>p.id===id);
        [a.x,b.x]=[b.x,a.x]; [a.y,b.y]=[b.y,a.y]; swapFirst=null; swapMode=false; $('#swapBtn').classList.remove('active'); render();
      }
    }
  });

  function openPlayerSheet(id){
    const p = state.players.find(x=>x.id===id); if(!p || p.side==='opponent') return;
    activePlayerId = id;
    $('#fName').value = p.name || ''; $('#fGender').value = p.gender || '未設定'; $('#fGrade').value=p.grade||'4年'; $('#fAge').value=p.age||'10歳'; $('#fHeight').value=p.height||'135cm'; $('#fPosition').value=p.pos||'S'; $('#fMemo').value=p.memo||'';
    sheet.classList.remove('hidden'); sheetBackdrop.classList.remove('hidden'); sheet.setAttribute('aria-hidden','false');
  }
  function closePlayerSheet(){ sheet.classList.add('hidden'); sheetBackdrop.classList.add('hidden'); sheet.setAttribute('aria-hidden','true'); activePlayerId=null; }
  $('#savePlayer').onclick = () => {
    const p = state.players.find(x=>x.id===activePlayerId); if(!p) return closePlayerSheet(); snapshot();
    Object.assign(p,{ name:$('#fName').value.trim(), gender:$('#fGender').value, grade:$('#fGrade').value, age:$('#fAge').value, height:$('#fHeight').value, pos:$('#fPosition').value, memo:$('#fMemo').value });
    closePlayerSheet(); render();
  };
  $('#deletePlayer').onclick = () => { if(!activePlayerId) return; snapshot(); state.players = state.players.filter(p=>p.id!==activePlayerId); closePlayerSheet(); render(); };
  $('#closeSheet').onclick = closePlayerSheet; sheetBackdrop.onclick = closePlayerSheet;

  function openDrawer(type){
    drawer.className = 'drawer ' + (type==='teams' ? 'left' : 'right');
    drawer.innerHTML = '';
    if(type==='players'){
      drawer.innerHTML = `<h2>選手一覧</h2>` + state.players.filter(p=>p.side==='self').sort((a,b)=>POS.findIndex(x=>x.id===a.pos)-POS.findIndex(x=>x.id===b.pos)).map((p,i)=>`<div class="drawerItem" data-id="${p.id}"><div class="badge">${i+1}</div><div><strong>${p.name || posLabel(p.pos)}</strong><span>${posLabel(p.pos)} / ${p.grade} / ${p.height}</span></div><b>›</b></div>`).join('') + `<button class="add" id="drawerAddPlayer">＋ 選手追加</button><button class="add" id="ballToggle">ボール：${state.ballBrand==='molten'?'モルテン風':'ミカサ風'}</button>`;
      drawer.querySelectorAll('.drawerItem').forEach(item=> item.onclick=()=>openPlayerSheet(item.dataset.id));
      $('#drawerAddPlayer').onclick = addPlayer; $('#ballToggle').onclick = () => { state.ballBrand = state.ballBrand==='molten'?'mikasa':'molten'; render(); openDrawer('players'); };
    } else {
      drawer.innerHTML = `<h2>チーム</h2>` + state.teams.map(t=>`<div class="drawerItem" data-team="${t}"><div class="badge">${t}</div><div><strong>${t}チーム</strong><span>${t===state.team?'選択中':'タップで切替'}</span></div><b>›</b></div>`).join('') + `<button class="add" id="drawerAddTeam">＋ チーム追加</button>`;
      drawer.querySelectorAll('.drawerItem').forEach(item=> item.onclick=()=>{ state.team=item.dataset.team; closeDrawer(); render(); });
      $('#drawerAddTeam').onclick = () => { const n = prompt('チーム名', String.fromCharCode(65+state.teams.length)); if(n){ state.teams.push(n); state.team=n; closeDrawer(); render(); } };
    }
    drawer.classList.remove('hidden'); drawerBackdrop.classList.remove('hidden'); drawer.setAttribute('aria-hidden','false');
  }
  function closeDrawer(){ drawer.classList.add('hidden'); drawerBackdrop.classList.add('hidden'); drawer.setAttribute('aria-hidden','true'); }
  drawerBackdrop.onclick = closeDrawer; $('#playersBtn').onclick=()=>openDrawer('players'); $('#rightHandle').onclick=()=>openDrawer('players'); $('#teamBtn').onclick=()=>openDrawer('teams'); $('#leftHandle').onclick=()=>openDrawer('teams');
  let drawerTouch=null;
  drawer.addEventListener('touchstart', e=>{ drawerTouch=e.touches[0].clientX; }, {passive:true});
  drawer.addEventListener('touchend', e=>{ if(drawerTouch==null) return; const dx=e.changedTouches[0].clientX-drawerTouch; if(Math.abs(dx)>70) closeDrawer(); drawerTouch=null; }, {passive:true});

  function addPlayer(){
    snapshot(); const id='self-extra-'+Date.now();
    state.players.push({id,side:'self',slot:state.players.length+1,name:'',grade:'4年',age:'10歳',gender:'未設定',height:'135cm',pos:'S',x:50,y:74,r:58,memo:''});
    closeDrawer(); render(); setTimeout(()=>openPlayerSheet(id),100);
  }

  $('#topViewBtn').onclick=()=>{state.view='top'; render();}; $('#sideViewBtn').onclick=()=>{state.view='side'; render();};
  $('#undoBtn').onclick=()=>{ const s=undoStack.pop(); if(s){ state=JSON.parse(s); render(); } };
  $('#rangeBtn').onclick=()=>{ if(selectedId) render(); };
  $('#swapBtn').onclick=()=>{ swapMode=!swapMode; swapFirst=null; $('#swapBtn').classList.toggle('active',swapMode); };
  $('#addSceneBtn').onclick=()=>{ const n=prompt('シーン名','新しいシーン'); if(n){ state.scenes.push(n); state.scene=n; render(); } };
  $('#sceneBtn').onclick=()=>{
    const n=prompt('シーンを選択/作成', state.scene); if(n){ if(!state.scenes.includes(n)) state.scenes.push(n); state.scene=n; render(); }
  };
  $('#resetBtn').onclick=()=>{ if(confirm('配置を初期状態に戻しますか？')){ snapshot(); const fresh=defaultState(); state.players=fresh.players; state.ball=fresh.ball; render(); } };

  // 初期化・古い楕円データの補正：rだけに統一し、幅/高さ系は使用しない。
  state.players.forEach(p=>{ if(!p.r || p.r < 46) p.r=58; if(!p.pos) p.pos='S'; });
  initSelects(); render();
})();
