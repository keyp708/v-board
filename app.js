const POSITIONS = [
  {code:'LF', label:'レフト', short:'LF'},
  {code:'S', label:'セッター', short:'S'},
  {code:'RF', label:'ライト', short:'RF'},
  {code:'BL', label:'Bレフト', short:'BL'},
  {code:'C', label:'センター', short:'C'},
  {code:'BR', label:'Bライト', short:'BR'},
];
const KEY='vboard-sprint10';
const TEAMS=[{id:'A',name:'試合用チーム'},{id:'B',name:'練習用チーム'}];
const SCENES=[{id:'serve',name:'サーブレシーブ'},{id:'left',name:'相手レフト'},{id:'chance',name:'チャンス'}];
const slotDefault=[
  {slot:'LF',x:22,y:72},{slot:'S',x:50,y:72},{slot:'RF',x:78,y:72},
  {slot:'BL',x:22,y:86},{slot:'C',x:50,y:86},{slot:'BR',x:78,y:86},
];
const oppDefault=[
  {id:'oLF',position:'LF',x:22,y:18,rx:10,ry:10,rot:0},
  {id:'oS',position:'S',x:50,y:18,rx:10,ry:10,rot:0},
  {id:'oRF',position:'RF',x:78,y:18,rx:10,ry:10,rot:0},
  {id:'oBL',position:'BL',x:22,y:32,rx:10,ry:10,rot:0},
  {id:'oC',position:'C',x:50,y:32,rx:10,ry:10,rot:0},
  {id:'oBR',position:'BR',x:78,y:32,rx:10,ry:10,rot:0},
];
const rosterDefault=[
  {id:'p1',name:'みはな',position:'S',grade:'5',height:'135',age:'10',gender:'未設定',memo:''},
  {id:'p2',name:'ユイ',position:'LF',grade:'4',height:'158',age:'10',gender:'未設定',memo:''},
  {id:'p3',name:'ナナ',position:'RF',grade:'4',height:'159',age:'10',gender:'未設定',memo:''},
  {id:'p4',name:'アオ',position:'BL',grade:'4',height:'157',age:'10',gender:'未設定',memo:''},
  {id:'p5',name:'リオ',position:'C',grade:'4',height:'154',age:'10',gender:'未設定',memo:''},
  {id:'p6',name:'ハル',position:'BR',grade:'4',height:'156',age:'10',gender:'未設定',memo:''},
];
const lineupDefault={LF:'p2',S:'p1',RF:'p3',BL:'p4',C:'p5',BR:'p6'};
const $=id=>document.getElementById(id);
let state=load()||{teamId:'A',sceneId:'serve',teams:TEAMS,scenes:SCENES,rosters:{A:structuredClone(rosterDefault),B:structuredClone(rosterDefault)},data:{}};
let selected={side:'own',id:'p1'}, dragging=null, longTimer=null, activeDrawer=null, subFromSlot=null;
const court=$('court'), playersEl=$('players'), rangesEl=$('ranges'), ballEl=$('ball');
function posLabel(code){return POSITIONS.find(p=>p.code===code)?.label||code}
function posShort(code){return POSITIONS.find(p=>p.code===code)?.short||code}
function load(){try{return JSON.parse(localStorage.getItem(KEY))}catch{return null}}
function save(){localStorage.setItem(KEY,JSON.stringify(state));}
function teamRoster(){ if(!state.rosters[state.teamId]) state.rosters[state.teamId]=structuredClone(rosterDefault); return state.rosters[state.teamId]; }
function sceneKey(){return `${state.teamId}:${state.sceneId}`}
function ensureScene(){const k=sceneKey(); if(!state.data[k]) state.data[k]={opp:structuredClone(oppDefault),slots:structuredClone(slotDefault),lineup:structuredClone(lineupDefault),ball:{x:50,y:50,h:55}}; return state.data[k];}
function getRosterPlayer(id){return teamRoster().find(p=>p.id===id)}
function pctToPx(x,y){const r=court.getBoundingClientRect();return {x:r.width*x/100,y:r.height*y/100,w:r.width,h:r.height}}
function render(){ensureScene(); $('teamBtn').textContent=state.teamId; $('sceneBtn').textContent=(state.scenes.find(s=>s.id===state.sceneId)?.name||'シーン')+' ▼'; renderPlayers(); renderDrawers(); save();}
function getOwnSlotByPlayerId(id){const d=ensureScene(); return Object.keys(d.lineup).find(slot=>d.lineup[slot]===id)}
function ownMarkers(){const d=ensureScene(); return d.slots.map(s=>{const pid=d.lineup[s.slot]; const rp=getRosterPlayer(pid)||{id:pid,name:'未設定',position:s.slot}; return {...s,...rp,side:'own',rx:s.rx??10,ry:s.ry??10,rot:s.rot??0,playerId:pid};});}
function oppMarkers(){return ensureScene().opp.map(o=>({...o,side:'opp'}));}
function getMarker(side,id){const d=ensureScene(); if(side==='opp') return d.opp.find(p=>p.id===id); const slot=getOwnSlotByPlayerId(id); return d.slots.find(s=>s.slot===slot);}
function renderPlayers(){playersEl.innerHTML='';rangesEl.innerHTML=''; document.querySelectorAll('.handle').forEach(e=>e.remove()); const d=ensureScene();
  [...oppMarkers(),...ownMarkers()].forEach(p=>{
    const pos=pctToPx(p.x,p.y); const rx=p.rx??10, ry=p.ry??10;
    const range=document.createElement('div'); range.className='range '+p.side+(selected?.id===p.id?' selected':''); range.style.left=pos.x+'px'; range.style.top=pos.y+'px'; range.style.width=(pos.w*rx/50)+'px'; range.style.height=(pos.h*ry/50)+'px'; range.style.transform=`translate(-50%,-50%) rotate(${p.rot||0}deg)`; rangesEl.appendChild(range);
    const el=document.createElement('div'); el.className='player '+(p.side==='opp'?'opp':'own')+(selected?.id===p.id?' selected':''); el.style.left=pos.x+'px'; el.style.top=pos.y+'px'; el.dataset.side=p.side; el.dataset.id=p.side==='opp'?p.id:p.playerId;
    if(p.side==='opp'){ el.innerHTML=`<span class="main">${posLabel(p.position)}</span><span class="sub"></span>`; }
    else { el.innerHTML=`<span class="main">${p.name}</span><span class="sub">${posLabel(p.position)}</span>`; }
    playersEl.appendChild(el);
  });
  const b=pctToPx(d.ball.x,d.ball.y); ballEl.style.left=b.x+'px'; ballEl.style.top=b.y+'px'; ballEl.style.transform=`translate(-50%,-50%) scale(${0.85+d.ball.h/180})`; ballEl.style.boxShadow=`0 ${16+d.ball.h/5}px ${14+d.ball.h/5}px rgba(0,0,0,.28)`;
  if(selected) addHandles(selected); bindDraggables();
}
function addHandles(sel){const m=getMarker(sel.side,sel.id); if(!m) return; const base=pctToPx(m.x,m.y); const rx=m.rx??10, ry=m.ry??10; const pts=[['r',rx,0],['b',0,ry],['s',rx*.72,ry*.72],['rot',rx*.55,-ry*.75]]; pts.forEach(([type,dx,dy])=>{const h=document.createElement('div'); h.className='handle '+(type==='rot'?'rot':''); h.dataset.type=type; h.style.left=(base.x+base.w*dx/100)+'px'; h.style.top=(base.y+base.h*dy/100)+'px'; court.appendChild(h);});}
function bindDraggables(){document.querySelectorAll('.player').forEach(el=>el.onpointerdown=startPlayer); document.querySelectorAll('.handle').forEach(el=>el.onpointerdown=startHandle); ballEl.onpointerdown=startBall;}
function startPlayer(e){e.preventDefault(); const side=e.currentTarget.dataset.side, id=e.currentTarget.dataset.id; selected={side,id}; const m=getMarker(side,id); const start={x:e.clientX,y:e.clientY,px:m.x,py:m.y}; longTimer=setTimeout(()=>{ if(side==='own')openEditor(id); },650); dragging={type:'player',side,id,start}; e.currentTarget.setPointerCapture(e.pointerId); renderPlayers();}
function startHandle(e){e.preventDefault(); if(!selected)return; const m=getMarker(selected.side,selected.id); dragging={type:'handle',handle:e.currentTarget.dataset.type,start:{x:e.clientX,y:e.clientY,rx:m.rx??10,ry:m.ry??10,rot:m.rot||0}}; e.currentTarget.setPointerCapture(e.pointerId);}
function startBall(e){e.preventDefault(); const d=ensureScene(); dragging={type:'ball',start:{x:e.clientX,y:e.clientY,bx:d.ball.x,by:d.ball.y}}; ballEl.setPointerCapture(e.pointerId);}
document.addEventListener('pointermove',e=>{ if(!dragging)return; clearTimeout(longTimer); const d=ensureScene(); const r=court.getBoundingClientRect();
  if(dragging.type==='player'){const m=getMarker(dragging.side,dragging.id); m.x=Math.max(5,Math.min(95,dragging.start.px+(e.clientX-dragging.start.x)/r.width*100)); m.y=Math.max(5,Math.min(95,dragging.start.py+(e.clientY-dragging.start.y)/r.height*100)); renderPlayers();}
  if(dragging.type==='ball'){d.ball.x=Math.max(3,Math.min(97,dragging.start.bx+(e.clientX-dragging.start.x)/r.width*100)); d.ball.y=Math.max(3,Math.min(97,dragging.start.by+(e.clientY-dragging.start.y)/r.height*100)); renderPlayers();}
  if(dragging.type==='handle'){const m=getMarker(selected.side,selected.id); const dx=(e.clientX-dragging.start.x)/r.width*100, dy=(e.clientY-dragging.start.y)/r.height*100; if(dragging.handle==='r')m.rx=Math.max(6,Math.min(32,dragging.start.rx+dx)); if(dragging.handle==='b')m.ry=Math.max(6,Math.min(32,dragging.start.ry+dy)); if(dragging.handle==='s'){const delta=(dx+dy)/2; m.rx=Math.max(6,Math.min(32,dragging.start.rx+delta)); m.ry=Math.max(6,Math.min(32,dragging.start.ry+delta));} if(dragging.handle==='rot')m.rot=(dragging.start.rot+dx*4)%360; renderPlayers();}
  save();
});
document.addEventListener('pointerup',()=>{clearTimeout(longTimer); dragging=null;});
function setupEditor(){POSITIONS.forEach(p=>$('editPosition').append(new Option(p.label,p.code))); for(let i=1;i<=6;i++)$('editGrade').append(new Option(`${i}年`,String(i))); for(let i=100;i<=180;i++)$('editHeight').append(new Option(`${i}cm`,String(i))); for(let i=6;i<=13;i++)$('editAge').append(new Option(`${i}歳`,String(i))); $('cancelEdit').onclick=()=>$('editorSheet').classList.add('hidden'); $('saveEdit').onclick=saveEditor;}
function openEditor(id){const p=getRosterPlayer(id); if(!p)return; selected={side:'own',id}; $('editName').value=p.name||''; $('editPosition').value=p.position||'S'; $('editGrade').value=p.grade||'4'; $('editHeight').value=p.height||'150'; $('editAge').value=p.age||'10'; $('editGender').value=p.gender||'未設定'; $('editCoachMemo').value=p.memo||''; $('editorSheet').classList.remove('hidden');}
function saveEditor(){const p=getRosterPlayer(selected.id); if(p){p.name=$('editName').value||p.name; p.position=$('editPosition').value; p.grade=$('editGrade').value; p.height=$('editHeight').value; p.age=$('editAge').value; p.gender=$('editGender').value; p.memo=$('editCoachMemo').value;} $('editorSheet').classList.add('hidden'); render();}
function renderDrawers(){const roster=teamRoster(); const d=ensureScene(); const onCourt=new Set(Object.values(d.lineup));
  $('playerList').innerHTML=roster.map((p,i)=>`<div class="list-row" data-id="${p.id}"><span class="mini-token">${i+1}</span><span>${p.name}<small>${posLabel(p.position)} / ${p.grade||''}年 / ${p.height||''}cm ${onCourt.has(p.id)?' / 出場中':' / 控え'}</small></span><b>›</b></div>`).join('');
  document.querySelectorAll('#playerList .list-row').forEach(r=>r.onclick=()=>openEditor(r.dataset.id));
  $('teamList').innerHTML=state.teams.map(t=>`<div class="list-row" data-team="${t.id}"><span class="mini-token">${t.id}</span><span>${t.name}<small>${t.id===state.teamId?'選択中':'タップで切替'}</small></span><b>›</b></div>`).join('');
  document.querySelectorAll('#teamList .list-row').forEach(r=>r.onclick=()=>{state.teamId=r.dataset.team; closeDrawers(); render();});
  $('sceneList').innerHTML=state.scenes.map(s=>`<div class="list-row" data-scene="${s.id}"><span class="mini-token">◇</span><span>${s.name}<small>${s.id===state.sceneId?'選択中':'タップで切替'}</small></span><b>›</b></div>`).join('');
  document.querySelectorAll('#sceneList .list-row').forEach(r=>r.onclick=()=>{state.sceneId=r.dataset.scene; closeDrawers(); render();}); renderSubSheet();}
function openDrawer(name){closeDrawers(false); activeDrawer=name; $('drawerBackdrop').classList.remove('hidden'); $(`${name}Drawer`).classList.remove('hidden');}
function closeDrawers(hide=true){['players','team','scene'].forEach(n=>$(`${n}Drawer`).classList.add('hidden')); if(hide)$('drawerBackdrop').classList.add('hidden'); activeDrawer=null;}
$('playersBtn').onclick=()=>openDrawer('players'); $('rightHandle').onclick=()=>openDrawer('players'); $('leftHandle').onclick=()=>openDrawer('team'); $('teamBtn').onclick=()=>openDrawer('team'); $('sceneBtn').onclick=()=>openDrawer('scene'); document.querySelectorAll('.closeDrawer').forEach(b=>b.onclick=()=>closeDrawers()); $('drawerBackdrop').onclick=()=>closeDrawers();
let sx=0; document.addEventListener('touchstart',e=>sx=e.touches[0].clientX,{passive:true}); document.addEventListener('touchend',e=>{if(!activeDrawer)return; const dx=e.changedTouches[0].clientX-sx; if(activeDrawer==='players'&&dx>70)closeDrawers(); if(activeDrawer==='team'&&dx<-70)closeDrawers(); if(activeDrawer==='scene'&&Math.abs(dx)>100)closeDrawers();},{passive:true});
$('addPlayerBtn').onclick=()=>{const r=teamRoster(); const n=r.length+1; r.push({id:'p'+Date.now(),name:`新規${n}`,position:'S',grade:'4',height:'150',age:'10',gender:'未設定',memo:''}); render();};
$('addTeamBtn').onclick=()=>{const name=prompt('チーム名','Cチーム'); if(!name)return; const id=String.fromCharCode(65+state.teams.length); state.teams.push({id,name}); state.rosters[id]=structuredClone(rosterDefault); state.teamId=id; render();};
function addScene(){const name=prompt('シーン名','新規シーン'); if(!name)return; const old=structuredClone(ensureScene()); const id='s'+Date.now(); state.scenes.push({id,name}); state.sceneId=id; state.data[sceneKey()]=old; render();}
$('addSceneBtn').onclick=addScene; $('drawerAddSceneBtn').onclick=addScene;
$('resetBtn').onclick=()=>{if(confirm('現在のシーンを初期配置に戻しますか？')){delete state.data[sceneKey()]; selected={side:'own',id:'p1'}; render();}}; $('undoBtn').onclick=()=>alert('UNDOは次のSprintで安定化します'); $('rangeBtn').onclick=()=>{selected=selected||{side:'own',id:Object.values(ensureScene().lineup)[0]}; renderPlayers();};
function openSub(){subFromSlot=null; renderSubSheet(); $('subSheet').classList.remove('hidden');}
$('subBtn').onclick=openSub; $('openSubBtn').onclick=openSub; $('closeSub').onclick=()=>$('subSheet').classList.add('hidden'); $('addBenchBtn').onclick=()=>{$('addPlayerBtn').click(); renderSubSheet();};
function renderSubSheet(){const d=ensureScene(); const roster=teamRoster(); const onCourt=new Set(Object.values(d.lineup));
  $('courtPlayersForSub').innerHTML=Object.entries(d.lineup).map(([slot,pid])=>{const p=getRosterPlayer(pid)||{name:'未設定'}; return `<button class="sub-card ${subFromSlot===slot?'selected':''}" data-slot="${slot}">${posLabel(slot)}<br>${p.name}</button>`}).join('');
  document.querySelectorAll('#courtPlayersForSub .sub-card').forEach(b=>b.onclick=()=>{subFromSlot=b.dataset.slot; renderSubSheet();});
  const bench=roster.filter(p=>!onCourt.has(p.id)); $('benchPlayersForSub').innerHTML=(bench.length?bench.map(p=>`<button class="sub-card" data-id="${p.id}">${p.name}<br>${posLabel(p.position)}</button>`).join(''):'<p class="hint">控え選手がいません。選手追加から登録できます。</p>');
  document.querySelectorAll('#benchPlayersForSub .sub-card').forEach(b=>b.onclick=()=>{if(!subFromSlot){alert('先に交代するコート上の選手を選んでください');return;} const old=d.lineup[subFromSlot]; d.lineup[subFromSlot]=b.dataset.id; const np=getRosterPlayer(b.dataset.id); if(np) np.position=subFromSlot; const op=getRosterPlayer(old); if(op) op.position=op.position||subFromSlot; selected={side:'own',id:b.dataset.id}; $('subSheet').classList.add('hidden'); render();});
}
setupEditor(); render();
