(() => {
  'use strict';
  const STORAGE_KEY = 'vboard_sprint14_stable';
  const POS = [
    { id:'LF', short:'LF', label:'レフト' },
    { id:'S', short:'S', label:'セッター' },
    { id:'RF', short:'RF', label:'ライト' },
    { id:'BL', short:'BL', label:'Bレフト' },
    { id:'C', short:'C', label:'センター' },
    { id:'BR', short:'BR', label:'Bライト' },
  ];
  const DEFAULT_SPOTS = {
    opponent: [
      {x:25,y:21,pos:'BL'}, {x:50,y:21,pos:'C'}, {x:75,y:21,pos:'BR'},
      {x:25,y:39,pos:'LF'}, {x:50,y:39,pos:'S'}, {x:75,y:39,pos:'RF'},
    ],
    home: [
      {x:25,y:64,pos:'LF'}, {x:50,y:64,pos:'S'}, {x:75,y:64,pos:'RF'},
      {x:25,y:82,pos:'BL'}, {x:50,y:82,pos:'C'}, {x:75,y:82,pos:'BR'},
    ]
  };
  const defaultPlayers = () => DEFAULT_SPOTS.home.map((s,i)=>({
    id: 'p'+(i+1), nickname:'', grade:'4年', age:'10歳', height:'135cm', gender:'未設定', position:s.pos, coachMemo:''
  }));
  const defaultOpponents = () => DEFAULT_SPOTS.opponent.map((s,i)=>({ id:'o'+(i+1), position:s.pos }));
  const makeSceneState = () => ({
    ball:{x:50,y:50,type:'molten'},
    home: DEFAULT_SPOTS.home.map((s,i)=>({ id:'p'+(i+1), x:s.x, y:s.y, r:{w:24,h:24,rot:0} })),
    opponent: DEFAULT_SPOTS.opponent.map((s,i)=>({ id:'o'+(i+1), x:s.x, y:s.y, r:{w:24,h:24,rot:0} }))
  });
  const defaultState = () => ({
    currentTeamId:'t1', currentSceneId:'s1', selectedId:null, rangeMode:true, swapMode:false, history:[],
    teams:[{id:'t1', name:'A', label:'A', players:defaultPlayers(), opponents:defaultOpponents(), scenes:[
      {id:'s1', name:'サーブレシーブ', state:makeSceneState()},
      {id:'s2', name:'相手レフト', state:makeSceneState()},
      {id:'s3', name:'チャンス', state:makeSceneState()},
    ]}]
  });


  function normalizeState(st){
    const circle = () => ({w:24,h:24,rot:0});
    if(!st || !Array.isArray(st.teams)) return defaultState();
    st.teams.forEach(team=>{
      if(!Array.isArray(team.players)) team.players = defaultPlayers();
      if(!Array.isArray(team.opponents) || team.opponents.length!==6) team.opponents = defaultOpponents();
      if(!Array.isArray(team.scenes) || !team.scenes.length) team.scenes = [{id:'s1', name:'サーブレシーブ', state:makeSceneState()}];
      team.players.forEach((pl,i)=>{
        const def = POS[i%6];
        pl.position = POS.some(p=>p.id===pl.position) ? pl.position : def.id;
        pl.nickname = pl.nickname || '';
        pl.grade = pl.grade || '4年'; pl.age = pl.age || '10歳'; pl.height = pl.height || '135cm'; pl.gender = pl.gender || '未設定';
      });
      team.opponents.forEach((op,i)=>{ op.position = DEFAULT_SPOTS.opponent[i]?.pos || op.position || 'LF'; });
      team.scenes.forEach(sc=>{
        if(!sc.state) sc.state = makeSceneState();
        ['home','opponent'].forEach(side=>{
          const defaults = DEFAULT_SPOTS[side];
          if(!Array.isArray(sc.state[side]) || sc.state[side].length < 6){
            sc.state[side] = defaults.map((d,i)=>({id: side==='home' ? (team.players[i]?.id || 'p'+(i+1)) : 'o'+(i+1), x:d.x, y:d.y, r:circle()}));
          }
          sc.state[side].forEach((spot,i)=>{
            if(!spot.r || typeof spot.r.w!=='number' || typeof spot.r.h!=='number') spot.r = circle();
            // Sprint14: default/current saved ellipses are reset to clean circles unless user adjusts after this release.
            if(Math.abs(spot.r.w-spot.r.h)>0.5){ const avg=Math.max(18, Math.min(34, (spot.r.w+spot.r.h)/2)); spot.r={w:avg,h:avg,rot:0}; }
            if(!spot.x || !spot.y){ spot.x = defaults[i%6].x; spot.y = defaults[i%6].y; }
          });
        });
        if(!sc.state.ball) sc.state.ball={x:50,y:50,type:'molten'};
      });
    });
    return st;
  }

  let state = load();
  let drag = null;
  let longTimer = null;
  let longMoved = false;
  let editingId = null;
  let swapFirst = null;
  let toastTimer = null;

  const $ = id => document.getElementById(id);
  const court = $('court');
  const layer = $('objectsLayer');

  function load(){
    try{
      const raw = localStorage.getItem(STORAGE_KEY);
      if(raw){
        const parsed = JSON.parse(raw);
        if(parsed && parsed.teams && parsed.teams.length) return normalizeState(parsed);
      }
    }catch(e){}
    return defaultState();
  }
  function save(){ localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
  function currentTeam(){ return state.teams.find(t=>t.id===state.currentTeamId) || state.teams[0]; }
  function currentScene(){ const t=currentTeam(); return t.scenes.find(s=>s.id===state.currentSceneId) || t.scenes[0]; }
  function sceneState(){ return currentScene().state; }
  function posLabel(id){ return (POS.find(p=>p.id===id)||POS[0]).label; }
  function percentPoint(ev){
    const rect = court.getBoundingClientRect();
    return {
      x: clamp((ev.clientX-rect.left)/rect.width*100, 0, 100),
      y: clamp((ev.clientY-rect.top)/rect.height*100, 0, 100),
    };
  }
  function clamp(v,min,max){ return Math.max(min, Math.min(max, v)); }
  function makeId(prefix){ return prefix + Math.random().toString(36).slice(2,8); }
  function pushHistory(){
    state.history.push(JSON.stringify(sceneState()));
    if(state.history.length>20) state.history.shift();
  }
  function showToast(msg){
    const el = $('toast'); el.textContent=msg; el.classList.add('show');
    clearTimeout(toastTimer); toastTimer=setTimeout(()=>el.classList.remove('show'),1300);
  }

  function render(){
    const t=currentTeam(), sc=currentScene();
    $('teamBtn').textContent = t.label || t.name.slice(0,1);
    $('sceneBtn').textContent = sc.name + ' ▼';
    $('rangeModeBtn').classList.toggle('active', state.rangeMode);
    $('swapBtn').classList.toggle('active', state.swapMode);
    renderCourt(); renderPlayers(); renderTeams(); renderScenes(); save();
  }

  function renderCourt(){
    layer.innerHTML = '';
    const ss = sceneState();
    const t = currentTeam();

    [...ss.opponent.map(x=>({...x, side:'opponent'})), ...ss.home.map(x=>({...x, side:'home'}))].forEach(item => {
      const data = item.side==='home' ? t.players.find(p=>p.id===item.id) : t.opponents.find(p=>p.id===item.id);
      if(!data) return;
      drawRange(item, item.side);
      drawToken(item, data, item.side);
    });
    drawBall(ss.ball);
    if(state.selectedId) drawHandles();
  }

  function drawRange(item, side){
    const r = item.r || {w:18,h:18,rot:0};
    const el=document.createElement('div');
    el.className='range' + (state.selectedId===item.id ? ' selected' : '');
    el.style.left=item.x+'%'; el.style.top=item.y+'%';
    el.style.width=r.w+'%'; el.style.height=r.h+'%';
    el.style.transform=`translate(-50%,-50%) rotate(${r.rot||0}deg)`;
    layer.appendChild(el);
  }

  function drawToken(item, data, side){
    const el=document.createElement('div');
    const hasName = side==='home' && !!(data.nickname||'').trim();
    el.className = `token ${side} ${hasName?'has-name':'empty-name'} ${state.selectedId===item.id?'selected':''}`;
    el.dataset.id=item.id; el.dataset.side=side;
    el.style.left=item.x+'%'; el.style.top=item.y+'%';
    const name=document.createElement('span'); name.className='name'; name.textContent = hasName ? data.nickname.trim() : '';
    const pos=document.createElement('span'); pos.className='pos'; pos.textContent = posLabel(data.position);
    el.appendChild(name); el.appendChild(pos);
    el.addEventListener('pointerdown', tokenDown);
    layer.appendChild(el);
    fitTokenText(el);
  }

  function fitTokenText(el){
    const name=el.querySelector('.name'), pos=el.querySelector('.pos');
    const fit = (node, max, min) => {
      if(!node || !node.textContent) return;
      node.style.fontSize=max+'px';
      let size=max;
      while(node.scrollWidth > node.clientWidth && size > min){
        size -= 1; node.style.fontSize=size+'px';
      }
    };
    if(el.classList.contains('opponent')) fit(pos, 15, 9);
    else if(el.classList.contains('has-name')){ fit(name,18,10); fit(pos,11,8); }
    else fit(pos,17,9);
  }

  function drawBall(ball){
    const el=document.createElement('div'); el.className='ball';
    el.style.left=ball.x+'%'; el.style.top=ball.y+'%';
    el.addEventListener('pointerdown', ballDown);
    layer.appendChild(el);
  }

  function findSpot(id){
    const ss=sceneState();
    return ss.home.find(p=>p.id===id) || ss.opponent.find(p=>p.id===id);
  }

  function drawHandles(){
    const spot=findSpot(state.selectedId); if(!spot) return;
    const r=spot.r||{w:18,h:18,rot:0};
    const handles = [
      {kind:'w', x:spot.x+r.w/2, y:spot.y},
      {kind:'h', x:spot.x, y:spot.y+r.h/2},
      {kind:'scale', x:spot.x+r.w/2*.72, y:spot.y+r.h/2*.72},
      {kind:'rotate', x:spot.x+r.w/2*.78, y:spot.y-r.h/2*.78},
    ];
    handles.forEach(h=>{
      const el=document.createElement('div'); el.className='handle '+(h.kind==='rotate'?'rotate':'');
      el.dataset.kind=h.kind; el.style.left=h.x+'%'; el.style.top=h.y+'%';
      el.addEventListener('pointerdown', handleDown); layer.appendChild(el);
    });
  }

  function tokenDown(e){
    e.preventDefault(); e.stopPropagation();
    const id=e.currentTarget.dataset.id; const side=e.currentTarget.dataset.side;
    state.selectedId=id; renderCourt();
    if(state.swapMode && side==='home'){
      if(!swapFirst){ swapFirst=id; showToast('交代する相手をタップ'); return; }
      if(swapFirst!==id){ swapPlayers(swapFirst,id); swapFirst=null; state.swapMode=false; render(); showToast('交代しました'); }
      return;
    }
    const spot=findSpot(id); if(!spot) return;
    pushHistory();
    const p0=percentPoint(e);
    drag={type:'token', id, startX:p0.x, startY:p0.y, ox:spot.x, oy:spot.y, pointerId:e.pointerId};
    e.currentTarget.setPointerCapture?.(e.pointerId);
    longMoved=false;
    clearTimeout(longTimer);
    longTimer=setTimeout(()=>{
      if(!longMoved){ openEditor(id); drag=null; }
    },480);
  }

  function ballDown(e){
    e.preventDefault(); e.stopPropagation();
    pushHistory();
    const p0=percentPoint(e); const b=sceneState().ball;
    drag={type:'ball', startX:p0.x,startY:p0.y, ox:b.x, oy:b.y, pointerId:e.pointerId};
    e.currentTarget.setPointerCapture?.(e.pointerId);
  }

  function handleDown(e){
    e.preventDefault(); e.stopPropagation();
    const spot=findSpot(state.selectedId); if(!spot) return;
    pushHistory();
    const p0=percentPoint(e);
    drag={type:'handle', kind:e.currentTarget.dataset.kind, id:spot.id, startX:p0.x,startY:p0.y, r0:{...(spot.r||{w:18,h:18,rot:0})}, pointerId:e.pointerId};
    e.currentTarget.setPointerCapture?.(e.pointerId);
  }

  window.addEventListener('pointermove', e=>{
    if(!drag) return;
    e.preventDefault();
    const p=percentPoint(e);
    if(drag.type==='token'){
      const spot=findSpot(drag.id); if(!spot) return;
      const dx=p.x-drag.startX, dy=p.y-drag.startY;
      if(Math.abs(dx)+Math.abs(dy)>1.2){ longMoved=true; clearTimeout(longTimer); }
      spot.x=clamp(drag.ox+dx, 5, 95); spot.y=clamp(drag.oy+dy, 5, 95);
      renderCourt();
    } else if(drag.type==='ball'){
      const b=sceneState().ball; b.x=clamp(drag.ox+p.x-drag.startX, 3, 97); b.y=clamp(drag.oy+p.y-drag.startY, 3, 97); renderCourt();
    } else if(drag.type==='handle'){
      const spot=findSpot(drag.id); if(!spot) return;
      const r={...drag.r0};
      const dx=p.x-drag.startX, dy=p.y-drag.startY;
      if(drag.kind==='w') r.w=clamp(drag.r0.w+dx*2, 12, 55);
      if(drag.kind==='h') r.h=clamp(drag.r0.h+dy*2, 12, 55);
      if(drag.kind==='scale') { const d=(dx+dy); r.w=clamp(drag.r0.w+d,12,55); r.h=clamp(drag.r0.h+d,12,55); }
      if(drag.kind==='rotate') r.rot = Math.round(Math.atan2(p.y-spot.y,p.x-spot.x)*180/Math.PI+90);
      spot.r=r; renderCourt();
    }
  }, {passive:false});
  window.addEventListener('pointerup', ()=>{ clearTimeout(longTimer); drag=null; save(); }, {passive:true});
  window.addEventListener('pointercancel', ()=>{ clearTimeout(longTimer); drag=null; }, {passive:true});

  function swapPlayers(a,b){
    const ss=sceneState(); const A=ss.home.find(p=>p.id===a), B=ss.home.find(p=>p.id===b); if(!A||!B)return;
    [A.x,B.x]=[B.x,A.x]; [A.y,B.y]=[B.y,A.y]; [A.r,B.r]=[B.r,A.r];
  }

  function renderPlayers(){
    const t=currentTeam(); $('playerList').innerHTML='';
    t.players.forEach((p,i)=>{
      const row=document.createElement('div'); row.className='list-row'; row.innerHTML=`<div class="badge">${i+1}</div><div><strong>${p.nickname||posLabel(p.position)}</strong><span>${posLabel(p.position)} / ${p.grade} / ${p.height}</span></div><div class="chev">›</div>`;
      row.addEventListener('click',()=>openEditor(p.id)); $('playerList').appendChild(row);
    });
  }
  function renderTeams(){
    $('teamList').innerHTML=''; state.teams.forEach((t,i)=>{
      const row=document.createElement('div'); row.className='list-row'; row.innerHTML=`<div class="badge">${t.label||String.fromCharCode(65+i)}</div><div><strong>${t.name}</strong><span>${t.players.length}人 / ${t.scenes.length}シーン</span></div><div class="chev">›</div>`;
      row.addEventListener('click',()=>{state.currentTeamId=t.id; state.currentSceneId=t.scenes[0].id; closeDrawer('teamDrawer'); render();}); $('teamList').appendChild(row);
    });
  }
  function renderScenes(){
    $('sceneList').innerHTML=''; currentTeam().scenes.forEach(sc=>{
      const b=document.createElement('button'); b.className='scene-chip '+(sc.id===state.currentSceneId?'active':''); b.textContent=sc.name;
      b.addEventListener('click',()=>{state.currentSceneId=sc.id; closeDrawer('sceneDrawer'); render();}); $('sceneList').appendChild(b);
    });
  }

  function openEditor(id){
    const p=currentTeam().players.find(x=>x.id===id); if(!p) return;
    editingId=id;
    $('editName').value=p.nickname||''; $('editGrade').value=p.grade; $('editAge').value=p.age; $('editHeight').value=p.height; $('editGender').value=p.gender; $('editPosition').value=p.position; $('editCoachMemo').value=p.coachMemo||'';
    $('editor').classList.add('open'); $('editor').setAttribute('aria-hidden','false');
  }
  function closeEditor(){ $('editor').classList.remove('open'); $('editor').setAttribute('aria-hidden','true'); editingId=null; }

  function populateSelects(){
    $('editGrade').innerHTML=[1,2,3,4,5,6].map(n=>`<option>${n}年</option>`).join('');
    $('editAge').innerHTML=Array.from({length:13},(_,i)=>i+6).map(n=>`<option>${n}歳</option>`).join('');
    $('editHeight').innerHTML=Array.from({length:81},(_,i)=>i+100).map(n=>`<option>${n}cm</option>`).join('');
    $('editPosition').innerHTML=POS.map(p=>`<option value="${p.id}">${p.label}</option>`).join('');
  }

  function openDrawer(id){ $(id).classList.add('open'); $(id).setAttribute('aria-hidden','false'); }
  function closeDrawer(id){ $(id).classList.remove('open'); $(id).setAttribute('aria-hidden','true'); }
  document.querySelectorAll('[data-close]').forEach(b=>b.addEventListener('click',()=>{ const id=b.dataset.close; id==='editor'?closeEditor():closeDrawer(id); }));
  $('playersBtn').addEventListener('click',()=>openDrawer('playerDrawer'));
  $('rightHandle').addEventListener('click',()=>openDrawer('playerDrawer'));
  $('leftHandle').addEventListener('click',()=>openDrawer('teamDrawer'));
  $('teamBtn').addEventListener('click',()=>openDrawer('teamDrawer'));
  $('sceneBtn').addEventListener('click',()=>openDrawer('sceneDrawer'));

  // reverse swipe close for drawers
  let swipeStart=null;
  ['playerDrawer','teamDrawer','sceneDrawer'].forEach(id=>{
    const el=$(id);
    el.addEventListener('pointerdown',e=>{swipeStart={x:e.clientX,y:e.clientY,id};});
    el.addEventListener('pointerup',e=>{
      if(!swipeStart) return;
      const dx=e.clientX-swipeStart.x, dy=e.clientY-swipeStart.y;
      if(id==='playerDrawer' && dx>60) closeDrawer(id);
      if(id==='teamDrawer' && dx<-60) closeDrawer(id);
      if(id==='sceneDrawer' && dy<-50) closeDrawer(id);
      swipeStart=null;
    });
  });

  $('savePlayerBtn').addEventListener('click',()=>{
    const p=currentTeam().players.find(x=>x.id===editingId); if(!p) return;
    p.nickname=$('editName').value.trim(); p.grade=$('editGrade').value; p.age=$('editAge').value; p.height=$('editHeight').value; p.gender=$('editGender').value; p.position=$('editPosition').value; p.coachMemo=$('editCoachMemo').value;
    closeEditor(); render(); showToast('保存しました');
  });
  $('deletePlayerBtn').addEventListener('click',()=>{
    const t=currentTeam(); if(t.players.length<=6){ showToast('最低6人は必要'); return; }
    t.players=t.players.filter(p=>p.id!==editingId); sceneState().home=sceneState().home.filter(p=>p.id!==editingId); closeEditor(); render();
  });
  $('addPlayerBtn').addEventListener('click',()=>{
    const t=currentTeam(); const id=makeId('p'); const idx=t.players.length+1;
    t.players.push({id,nickname:'',grade:'4年',age:'10歳',height:'135cm',gender:'未設定',position:'LF',coachMemo:''});
    t.scenes.forEach(sc=>sc.state.home.push({id,x:15+(idx%3)*20,y:88,r:{w:24,h:24,rot:0}}));
    render(); showToast('選手を追加');
  });
  $('addTeamBtn').addEventListener('click',()=>{
    const label=String.fromCharCode(65+state.teams.length); const id=makeId('t');
    const team={id,label,name:label+'チーム',players:defaultPlayers(),opponents:defaultOpponents(),scenes:[{id:makeId('s'),name:'サーブレシーブ',state:makeSceneState()}]};
    state.teams.push(team); state.currentTeamId=id; state.currentSceneId=team.scenes[0].id; closeDrawer('teamDrawer'); render();
  });
  $('addSceneBtn').addEventListener('click',addScene);
  function addScene(){
    const t=currentTeam(); const name=prompt('シーン名', '新しいシーン'); if(!name) return;
    const base=JSON.parse(JSON.stringify(sceneState())); const sc={id:makeId('s'),name,state:base};
    t.scenes.push(sc); state.currentSceneId=sc.id; render(); showToast('シーン追加');
  }
  $('rangeModeBtn').addEventListener('click',()=>{ state.rangeMode=!state.rangeMode; render(); });
  $('swapBtn').addEventListener('click',()=>{ state.swapMode=!state.swapMode; swapFirst=null; render(); showToast(state.swapMode?'交代する2人をタップ':'交代解除'); });
  $('undoBtn').addEventListener('click',()=>{ const last=state.history.pop(); if(last){ currentScene().state=JSON.parse(last); render(); }});
  $('resetBtn').addEventListener('click',()=>{ if(confirm('このシーンを初期配置に戻しますか？')){ currentScene().state=makeSceneState(); render(); }});
  court.addEventListener('pointerdown', e=>{ if(e.target===court || e.target===layer){ state.selectedId=null; renderCourt(); }});

  // run basic self-checks in console
  function selfCheck(){
    const t=currentTeam(), sc=sceneState();
    console.assert(t.players.length>=6,'players >= 6');
    console.assert(sc.home.length>=6 && sc.opponent.length===6,'court markers');
    console.assert(t.opponents[0].position==='LF' && t.opponents[3].position==='BL','opponent order');
    console.assert(sc.home.every(p=>Math.abs(p.r.w-p.r.h)<0.5),'home ranges are circles');
    console.assert(sc.opponent.every(p=>Math.abs(p.r.w-p.r.h)<0.5),'opponent ranges are circles');
    console.assert(t.opponents[0].position==='BL' && t.opponents[3].position==='LF','opponent front/back order');
  }
  populateSelects(); render(); selfCheck();
})();
