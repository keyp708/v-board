(() => {
  const $ = (s) => document.querySelector(s);
  const court = $('#court');
  const rangeLayer = $('#rangeLayer');
  const playerLayer = $('#playerLayer');
  const ballEl = $('#ball');
  const sceneNameEl = $('#sceneName');
  const toastEl = $('#toast');

  const STORAGE = 'vboard_sprint5_v1';
  const defaultOwn = [
    ['1','ユイ',.24,.70],['2','ミオ',.50,.70],['3','ナナ',.76,.70],
    ['4','アオ',.24,.88],['5','リオ',.50,.88],['6','ハル',.76,.88]
  ];
  const defaultOpp = [
    ['OH',.24,.12],['MB',.50,.12],['OP',.76,.12],['S',.24,.30],['L',.50,.30],['OH',.76,.30]
  ];
  const makePlayer = (team, i, arr) => ({
    id: `${team}-${i+1}`,
    team,
    number: team === 'own' ? arr[0] : '',
    nick: team === 'own' ? arr[1] : arr[0],
    position: team === 'own' ? '' : arr[0],
    age:'', grade:'', gender:'未設定', height:'',
    ambition:'未設定', aggressive:'未設定', teamwork:'未設定', iq:'未設定', memo:'',
    x: arr[team === 'own' ? 2 : 1], y: arr[team === 'own' ? 3 : 2],
    range: { rx:.085, ry:.085, rotate:0 }
  });
  const defaultScene = (name='サーブレシーブ') => ({
    id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()+Math.random()),
    name,
    players: [...defaultOwn.map((p,i)=>makePlayer('own',i,p)), ...defaultOpp.map((p,i)=>makePlayer('opp',i,p))],
    ball: { x:.50, y:.50, height:25 },
    selectedId:'own-1'
  });

  let state = load() || {
    activeTeam:'Aチーム', teams:['Aチーム'], activeSceneId:'', scenes:[defaultScene('サーブレシーブ'), defaultScene('相手レフト'), defaultScene('チャンス')]
  };
  if (!state.activeSceneId) state.activeSceneId = state.scenes[0].id;
  let activePointer = null;
  let longPressTimer = null;
  let editingPlayerId = null;
  let rangeVisible = true;

  const scene = () => state.scenes.find(s=>s.id===state.activeSceneId) || state.scenes[0];
  const selectedPlayer = () => scene().players.find(p=>p.id===scene().selectedId);
  const clamp = (v,min,max)=>Math.max(min,Math.min(max,v));
  const pctToPx = (x,y) => ({ x:x*court.clientWidth, y:y*court.clientHeight });
  const pxToPct = (x,y) => ({ x:clamp(x/court.clientWidth,0,1), y:clamp(y/court.clientHeight,0,1) });
  const currentSize = (p) => p.team === 'own' ? 48 : 42;

  function load(){ try { return JSON.parse(localStorage.getItem(STORAGE)); } catch { return null; } }
  function save(){ localStorage.setItem(STORAGE, JSON.stringify(state)); }
  function toast(msg='保存しました'){ toastEl.textContent=msg; toastEl.classList.add('show'); setTimeout(()=>toastEl.classList.remove('show'),1200); }

  function render(){
    const sc = scene();
    sceneNameEl.textContent = sc.name;
    playerLayer.innerHTML=''; rangeLayer.innerHTML='';
    sc.players.forEach(p=>{
      if (rangeVisible && p.team === 'own') renderRange(p);
      renderPlayer(p);
    });
    renderBall(sc.ball);
    renderLists();
    save();
  }

  function renderRange(p){
    const pos = pctToPx(p.x,p.y); const rx = p.range.rx*court.clientWidth; const ry = p.range.ry*court.clientHeight;
    const r = document.createElement('div'); r.className = 'range' + (p.id===scene().selectedId?' selected':'');
    Object.assign(r.style,{ width:`${rx*2}px`, height:`${ry*2}px`, left:`${pos.x-rx}px`, top:`${pos.y-ry}px`, borderRadius:'50%', transform:`rotate(${p.range.rotate}deg)` });
    rangeLayer.appendChild(r);
    if (p.id===scene().selectedId) renderHandles(p,pos,rx,ry);
  }

  function addHandle(type, x, y){
    const h = document.createElement('div'); h.className='handle'; h.dataset.handle=type;
    h.style.left = `${x-7}px`; h.style.top = `${y-7}px`;
    h.addEventListener('pointerdown', onHandleDown, {passive:false});
    rangeLayer.appendChild(h);
  }
  function renderHandles(p,pos,rx,ry){
    const rad = (p.range.rotate||0) * Math.PI/180;
    const rot = (dx,dy)=>({x:pos.x+dx*Math.cos(rad)-dy*Math.sin(rad), y:pos.y+dx*Math.sin(rad)+dy*Math.cos(rad)});
    const right = rot(rx,0), bottom = rot(0,ry), corner = rot(rx*.72, ry*.72), top = rot(0,-ry-22);
    addHandle('x', right.x, right.y); addHandle('y', bottom.x, bottom.y); addHandle('scale', corner.x, corner.y); addHandle('rotate', top.x, top.y);
  }

  function renderPlayer(p){
    const pos = pctToPx(p.x,p.y); const el = document.createElement('div');
    el.className = `player ${p.team==='opp'?'opp':''} ${p.id===scene().selectedId?'selected':''}`;
    el.dataset.id = p.id; el.textContent = p.team==='own' ? (p.nick || p.number || '選手') : (p.position || 'OPP');
    el.style.left = `${pos.x}px`; el.style.top = `${pos.y}px`; el.style.transform = 'translate(-50%,-50%)';
    el.addEventListener('pointerdown', onPlayerDown, {passive:false});
    playerLayer.appendChild(el);
  }
  function renderBall(b){
    const pos = pctToPx(b.x,b.y); ballEl.style.left=`${pos.x}px`; ballEl.style.top=`${pos.y}px`;
    const h = b.height ?? 25;
    ballEl.style.setProperty('--ball-shadow-y', `${22 - h*0.13}px`);
    ballEl.style.setProperty('--ball-shadow-blur', `${22 + h*0.08}px`);
    ballEl.style.setProperty('--ball-shadow-alpha', `${0.30 - h*0.0018}`);
    ballEl.style.setProperty('--ball-scale', `${1 + h*0.002}`);
    $('#heightText').textContent = h < 34 ? '低' : h < 67 ? '中' : '高';
  }

  function onPlayerDown(e){
    e.preventDefault(); e.stopPropagation();
    const id = e.currentTarget.dataset.id; scene().selectedId = id; render();
    const p = selectedPlayer(); const start = {x:e.clientX, y:e.clientY, px:p.x, py:p.y};
    e.currentTarget.setPointerCapture(e.pointerId); e.currentTarget.classList.add('dragging');
    activePointer = {type:'player', id, start, moved:false};
    clearTimeout(longPressTimer);
    longPressTimer = setTimeout(()=>{ if(activePointer && !activePointer.moved){ openPlayerEditor(id); activePointer=null; } },520);
  }
  function onHandleDown(e){
    e.preventDefault(); e.stopPropagation();
    const p = selectedPlayer(); if(!p) return;
    const pos = pctToPx(p.x,p.y); const start = {x:e.clientX,y:e.clientY, rx:p.range.rx, ry:p.range.ry, rotate:p.range.rotate||0, cx:pos.x, cy:pos.y};
    activePointer = {type:'handle', handle:e.currentTarget.dataset.handle, start};
  }
  ballEl.addEventListener('pointerdown', e=>{
    e.preventDefault(); e.stopPropagation();
    const b = scene().ball; activePointer={type:'ball', start:{x:e.clientX,y:e.clientY,bx:b.x,by:b.y}};
  }, {passive:false});

  window.addEventListener('pointermove', e=>{
    if(!activePointer) return;
    e.preventDefault();
    if(activePointer.type==='player'){
      const ap=activePointer; const dx=e.clientX-ap.start.x, dy=e.clientY-ap.start.y; if(Math.hypot(dx,dy)>6){ap.moved=true; clearTimeout(longPressTimer)}
      const p=scene().players.find(x=>x.id===ap.id); if(!p) return;
      p.x=clamp(ap.start.px+dx/court.clientWidth,.04,.96); p.y=clamp(ap.start.py+dy/court.clientHeight,.04,.96); fastRenderPositions();
    } else if(activePointer.type==='ball'){
      const ap=activePointer; const b=scene().ball; b.x=clamp(ap.start.bx+(e.clientX-ap.start.x)/court.clientWidth,.04,.96); b.y=clamp(ap.start.by+(e.clientY-ap.start.y)/court.clientHeight,.04,.96); renderBall(b);
    } else if(activePointer.type==='handle'){
      const ap=activePointer, p=selectedPlayer(); if(!p) return;
      const dx=e.clientX-ap.start.cx, dy=e.clientY-ap.start.cy;
      if(ap.handle==='x'){ p.range.rx=clamp(Math.abs(dx)/court.clientWidth,.055,.32); }
      if(ap.handle==='y'){ p.range.ry=clamp(Math.abs(dy)/court.clientHeight,.035,.25); }
      if(ap.handle==='scale'){ const d=Math.hypot(dx,dy); p.range.rx=clamp(d/court.clientWidth*.78,.055,.32); p.range.ry=clamp(d/court.clientHeight*.78,.035,.25); }
      if(ap.handle==='rotate'){ p.range.rotate = Math.round(Math.atan2(dy,dx)*180/Math.PI + 90); }
      render();
    }
  }, {passive:false});
  window.addEventListener('pointerup', ()=>{ if(activePointer){ clearTimeout(longPressTimer); activePointer=null; render(); } });

  function fastRenderPositions(){ render(); }

  court.addEventListener('pointerdown', e=>{
    if(e.target === court || e.target.classList.contains('court-half')){ scene().selectedId=''; render(); }
  });

  function open(el){ el.classList.add('open'); el.setAttribute('aria-hidden','false'); }
  function close(el){ el.classList.remove('open'); el.setAttribute('aria-hidden','true'); }
  document.querySelectorAll('.sheet,.drawer').forEach(el=>el.addEventListener('click',e=>{ if(e.target===el) close(el); }));
  $('#sceneBtn').onclick=()=>{ renderSceneList(); open($('#sceneSheet')); };
  $('#playersBtn').onclick=()=>{ renderPlayerList(); open($('#playerDrawer')); };
  $('#teamBtn').onclick=()=>{ renderTeamList(); open($('#teamDrawer')); };
  $('#rangeToggle').onclick=()=>{ rangeVisible=!rangeVisible; $('#rangeToggle').classList.toggle('active',rangeVisible); render(); };
  $('#ballHeightBtn').onclick=()=>{ $('#heightRange').value=scene().ball.height; open($('#heightSheet')); };
  $('#heightRange').oninput=e=>{ scene().ball.height=Number(e.target.value); renderBall(scene().ball); save(); };

  // simple edge swipes
  let touchStart=null;
  window.addEventListener('touchstart', e=>{ const t=e.touches[0]; touchStart={x:t.clientX,y:t.clientY,time:Date.now()}; }, {passive:true});
  window.addEventListener('touchend', e=>{
    if(!touchStart) return; const t=e.changedTouches[0]; const dx=t.clientX-touchStart.x, dy=t.clientY-touchStart.y;
    if(Math.abs(dx)>85 && Math.abs(dx)>Math.abs(dy)*1.3){ dx>0 ? (renderPlayerList(),open($('#playerDrawer'))) : (renderTeamList(),open($('#teamDrawer'))); }
    if(dy>90 && Math.abs(dy)>Math.abs(dx)*1.2 && touchStart.y<110){ renderSceneList(); open($('#sceneSheet')); }
    touchStart=null;
  }, {passive:true});

  function renderSceneList(){
    const list=$('#sceneList'); list.innerHTML='';
    state.scenes.forEach(sc=>{
      const row=document.createElement('div'); row.className='row '+(sc.id===state.activeSceneId?'active':'');
      row.innerHTML=`<div class="row-main"><div class="row-title">${escapeHtml(sc.name)}</div><div class="row-sub">配置・守備範囲を保存済み</div></div>`;
      const edit=btn('名前'), copy=btn('複製'), del=btn('削除');
      row.onclick=()=>{ state.activeSceneId=sc.id; close($('#sceneSheet')); render(); };
      edit.onclick=(e)=>{e.stopPropagation(); const n=prompt('シーン名',sc.name); if(n){sc.name=n; renderSceneList(); render(); toast('変更しました')}};
      copy.onclick=(e)=>{e.stopPropagation(); const cp=JSON.parse(JSON.stringify(sc)); cp.id=crypto.randomUUID?crypto.randomUUID():String(Date.now()); cp.name=sc.name+' コピー'; state.scenes.push(cp); state.activeSceneId=cp.id; renderSceneList(); render(); toast('複製しました')};
      del.onclick=(e)=>{e.stopPropagation(); if(state.scenes.length<=1) return alert('最低1つ必要です'); if(confirm('削除しますか？')){state.scenes=state.scenes.filter(x=>x.id!==sc.id); state.activeSceneId=state.scenes[0].id; renderSceneList(); render();}};
      row.append(edit,copy,del); list.appendChild(row);
    });
  }
  $('#addSceneBtn').onclick=()=>{ const base=JSON.parse(JSON.stringify(scene())); base.id=crypto.randomUUID?crypto.randomUUID():String(Date.now()); base.name=prompt('新しいシーン名','新しいシーン')||'新しいシーン'; state.scenes.push(base); state.activeSceneId=base.id; renderSceneList(); render(); toast('追加しました'); };

  function renderPlayerList(){
    const list=$('#playerList'); list.innerHTML='';
    scene().players.filter(p=>p.team==='own').forEach(p=>{
      const row=document.createElement('div'); row.className='row';
      row.innerHTML=`<div class="player" style="position:static;transform:none;width:38px;height:38px;font-size:11px">${escapeHtml(p.nick||p.number)}</div><div class="row-main"><div class="row-title">${escapeHtml(p.nick||'未設定')}</div><div class="row-sub">${escapeHtml(p.grade||'学年未設定')} / ${escapeHtml(p.height||'-')}cm</div></div>`;
      row.onclick=()=>{ close($('#playerDrawer')); scene().selectedId=p.id; render(); openPlayerEditor(p.id); };
      list.appendChild(row);
    });
  }
  function renderTeamList(){
    const list=$('#teamList'); list.innerHTML='';
    state.teams.forEach(t=>{ const row=document.createElement('div'); row.className='row '+(t===state.activeTeam?'active':''); row.innerHTML=`<div class="row-main"><div class="row-title">${escapeHtml(t)}</div><div class="row-sub">現在の作戦盤</div></div>`; row.onclick=()=>{state.activeTeam=t; $('#teamBtn').textContent=t.slice(0,1); close($('#teamDrawer')); render();}; list.appendChild(row); });
  }
  $('#addTeamBtn').onclick=()=>{ const n=prompt('チーム名','Bチーム'); if(n&&!state.teams.includes(n)){state.teams.push(n); state.activeTeam=n; renderTeamList(); render();} };

  function openPlayerEditor(id){
    editingPlayerId=id; const p=scene().players.find(x=>x.id===id); if(!p) return;
    $('#editorTitle').textContent = p.team==='own' ? '選手情報' : '相手選手';
    $('#editNick').value=p.nick||''; $('#editNumber').value=p.number||''; $('#editAge').value=p.age||''; $('#editGrade').value=p.grade||''; $('#editGender').value=p.gender||'未設定'; $('#editHeight').value=p.height||''; $('#editPosition').value=p.position||'';
    $('#editAmbition').value=p.ambition||'未設定'; $('#editAggressive').value=p.aggressive||'未設定'; $('#editTeamwork').value=p.teamwork||'未設定'; $('#editIq').value=p.iq||'未設定'; $('#editMemo').value=p.memo||'';
    open($('#playerSheet'));
  }
  $('#savePlayerBtn').onclick=()=>{
    const p=scene().players.find(x=>x.id===editingPlayerId); if(!p) return;
    Object.assign(p,{nick:$('#editNick').value, number:$('#editNumber').value, age:$('#editAge').value, grade:$('#editGrade').value, gender:$('#editGender').value, height:$('#editHeight').value, position:$('#editPosition').value, ambition:$('#editAmbition').value, aggressive:$('#editAggressive').value, teamwork:$('#editTeamwork').value, iq:$('#editIq').value, memo:$('#editMemo').value});
    close($('#playerSheet')); render(); toast('保存しました');
  };
  document.querySelectorAll('.tab').forEach(tab=>tab.onclick=()=>{
    document.querySelectorAll('.tab').forEach(t=>t.classList.remove('active')); tab.classList.add('active');
    $('#publicTab').classList.toggle('hidden',tab.dataset.tab!=='public'); $('#coachTab').classList.toggle('hidden',tab.dataset.tab!=='coach');
  });

  function btn(txt){ const b=document.createElement('button'); b.className='mini-btn'; b.textContent=txt; return b; }
  function escapeHtml(str=''){ return String(str).replace(/[&<>"]/g, m=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;' }[m])); }
  window.addEventListener('resize', render);
  render();
})();
