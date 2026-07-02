const scenarios = [
  { id:'receive', label:'サーブレシーブ', small:'フォーメーション' },
  { id:'left', label:'レフト攻撃', small:'相手攻撃' },
  { id:'right', label:'ライト攻撃', small:'相手攻撃' },
  { id:'chance', label:'チャンス', small:'切替' },
  { id:'free', label:'フリー', small:'つなぎ' },
];
const ownColors = ['red','blue','yellow','green','purple','orange'];
const initialPlayers = [
  {id:'o4',team:'opponent',main:'LF',sub:'',x:25,y:17,rx:16,ry:13},
  {id:'o3',team:'opponent',main:'MB',sub:'',x:50,y:17,rx:16,ry:13},
  {id:'o2',team:'opponent',main:'RF',sub:'',x:75,y:17,rx:16,ry:13},
  {id:'o5',team:'opponent',main:'OH',sub:'',x:25,y:33,rx:16,ry:13},
  {id:'o6',team:'opponent',main:'S',sub:'',x:50,y:33,rx:16,ry:13},
  {id:'o1',team:'opponent',main:'OP',sub:'',x:75,y:33,rx:16,ry:13},
  {id:'p1',team:'own',main:'1',sub:'リオ',x:23,y:62,rx:17,ry:12,color:'red'},
  {id:'p2',team:'own',main:'2',sub:'ユイ',x:50,y:62,rx:17,ry:12,color:'blue'},
  {id:'p3',team:'own',main:'3',sub:'サクラ',x:77,y:62,rx:17,ry:12,color:'yellow'},
  {id:'p4',team:'own',main:'4',sub:'ミオ',x:23,y:82,rx:19,ry:14,color:'green'},
  {id:'p5',team:'own',main:'5',sub:'アヤ',x:50,y:82,rx:19,ry:14,color:'purple'},
  {id:'p6',team:'own',main:'6',sub:'ハナ',x:77,y:82,rx:19,ry:14,color:'orange'},
];
let state = load() || { scenario:'receive', players: initialPlayers, selectedId:'p2', ball:{x:50,y:50,h:35}, sceneIndex:0, rangeShape:'oval'};
const court = document.getElementById('court');
const coverageLayer = document.getElementById('coverageLayer');
const playerLayer = document.getElementById('playerLayer');
const ball = document.getElementById('ball');
function save(){ localStorage.setItem('vboard-sprint2', JSON.stringify(state)); document.body.classList.add('saved'); setTimeout(()=>document.body.classList.remove('saved'),400)}
function load(){ try{return JSON.parse(localStorage.getItem('vboard-sprint2'))}catch{return null} }
function pctToPx(x,y){ const r=court.getBoundingClientRect(); return {x:r.width*x/100,y:r.height*y/100}; }
function pxToPct(clientX,clientY){ const r=court.getBoundingClientRect(); return {x:Math.max(2,Math.min(98,(clientX-r.left)/r.width*100)), y:Math.max(2,Math.min(98,(clientY-r.top)/r.height*100))};}
function renderTabs(){ const el=document.getElementById('scenarioTabs'); el.innerHTML=''; scenarios.forEach(s=>{const b=document.createElement('button'); b.className='tab'+(state.scenario===s.id?' active':''); b.innerHTML=`<small>${s.small}</small>${s.label}`; b.onclick=()=>{state.scenario=s.id; save(); renderTabs();}; el.appendChild(b);}); }
function render(){ renderTabs(); coverageLayer.innerHTML=''; playerLayer.innerHTML=''; state.players.forEach(p=>{ const pos=pctToPx(p.x,p.y); const cov=document.createElement('div'); cov.className='coverage '+(state.rangeShape==='circle'?'circle':'oval'); cov.style.left=pos.x+'px'; cov.style.top=pos.y+'px'; const w=(state.rangeShape==='circle'?Math.max(p.rx,p.ry):p.rx)*2; const h=(state.rangeShape==='circle'?Math.max(p.rx,p.ry):p.ry)*2; cov.style.width=w+'%'; cov.style.height=h+'%'; cov.style.color=p.team==='opponent'?'#30383a':colorFor(p); coverageLayer.appendChild(cov);
    const el=document.createElement('div'); el.className=`player ${p.team} ${p.color||''}`; el.dataset.id=p.id; el.style.left=pos.x+'px'; el.style.top=pos.y+'px'; el.innerHTML=`<span class="main">${p.main}</span><span class="sub">${p.team==='opponent'?p.main:p.sub}</span>`; if(p.id===state.selectedId) el.style.outline='4px solid rgba(14,168,109,.45)'; makeDraggable(el,p); playerLayer.appendChild(el); });
  const bp=pctToPx(state.ball.x,state.ball.y); ball.style.left=bp.x+'px'; ball.style.top=bp.y+'px'; const h=state.ball.h; ball.style.setProperty('--shadow-size', `${54 - h*0.25}px`); ball.style.setProperty('--height-shadow', `${9 + h*0.18}px`); ball.style.setProperty('--ball-shadow-y', `${24 + h*0.12}px`); ball.style.setProperty('--ball-shadow-blur', `${12 + h*0.12}px`); ball.style.setProperty('--ball-shadow-alpha', `${0.28 - h*0.0014}`); document.getElementById('heightSlider').value=h; document.getElementById('heightLabel').textContent=h; updateRangeLabels(); }
function colorFor(p){ const map={red:'#ff3b3b',blue:'#1a8df0',yellow:'#f6a400',green:'#19b95b',purple:'#8c43df',orange:'#ff6b0a'}; return map[p.color]||'#444';}
function selected(){ return state.players.find(p=>p.id===state.selectedId) || state.players[6]; }
function updateRangeLabels(){ const p=selected(); document.getElementById('rangeWLabel').textContent=Math.round(p.rx/17*100)+'%'; document.getElementById('rangeHLabel').textContent=Math.round(p.ry/12*100)+'%'; document.getElementById('ellipseBtn').classList.toggle('active', state.rangeShape==='oval'); document.getElementById('circleBtn').classList.toggle('active', state.rangeShape==='circle'); }
function makeDraggable(el,p){ let active=false; el.addEventListener('pointerdown',e=>{active=true;state.selectedId=p.id;el.setPointerCapture(e.pointerId);el.classList.add('dragging');render();}); el.addEventListener('pointermove',e=>{if(!active)return; const n=pxToPct(e.clientX,e.clientY); p.x=n.x;p.y=n.y; save(); render();}); el.addEventListener('pointerup',()=>{active=false;el.classList.remove('dragging');save();render();}); }
let ballActive=false; ball.addEventListener('pointerdown',e=>{ballActive=true;ball.setPointerCapture(e.pointerId)}); ball.addEventListener('pointermove',e=>{if(!ballActive)return; const n=pxToPct(e.clientX,e.clientY); state.ball.x=n.x; state.ball.y=n.y; save(); render();}); ball.addEventListener('pointerup',()=>{ballActive=false;save();render();});
function adjust(which,delta){ const p=selected(); if(which==='w') p.rx=Math.max(8,Math.min(28,p.rx+delta)); else p.ry=Math.max(7,Math.min(23,p.ry+delta)); if(state.rangeShape==='circle'){const m=Math.max(p.rx,p.ry);p.rx=m;p.ry=m} save();render(); }
document.getElementById('rangeWMinus').onclick=()=>adjust('w',-1);document.getElementById('rangeWPlus').onclick=()=>adjust('w',1);document.getElementById('rangeHMinus').onclick=()=>adjust('h',-1);document.getElementById('rangeHPlus').onclick=()=>adjust('h',1);document.getElementById('ellipseBtn').onclick=()=>{state.rangeShape='oval';save();render()};document.getElementById('circleBtn').onclick=()=>{state.rangeShape='circle';save();render()};document.getElementById('heightSlider').oninput=e=>{state.ball.h=+e.target.value;save();render()};
document.getElementById('fullscreenBtn').onclick=()=>{document.body.classList.toggle('fullscreen')};document.getElementById('saveBtn').onclick=()=>save();document.getElementById('shareBtn').onclick=async()=>{ if(navigator.share) await navigator.share({title:'V Board',url:location.href});};
document.getElementById('prevScene').onclick=()=>{state.sceneIndex=Math.max(0,state.sceneIndex-1);document.getElementById('sceneCount').textContent=`${state.sceneIndex+1}/5`;save()};document.getElementById('nextScene').onclick=()=>{state.sceneIndex=Math.min(4,state.sceneIndex+1);document.getElementById('sceneCount').textContent=`${state.sceneIndex+1}/5`;save()};document.getElementById('playBtn').onclick=()=>{document.getElementById('sceneHint').textContent='再生イメージ：次Sprintで動きを追加します';setTimeout(()=>document.getElementById('sceneHint').textContent='ボール位置と守備範囲を調整できます',1600)};
// Two finger pinch on selected player's coverage
let pinchStart=null; court.addEventListener('touchstart',e=>{ if(e.touches.length===2){ const [a,b]=e.touches; const d=Math.hypot(a.clientX-b.clientX,a.clientY-b.clientY); const p=selected(); pinchStart={d,rx:p.rx,ry:p.ry}; } },{passive:true});
court.addEventListener('touchmove',e=>{ if(e.touches.length===2 && pinchStart){ const [a,b]=e.touches; const d=Math.hypot(a.clientX-b.clientX,a.clientY-b.clientY); const scale=d/pinchStart.d; const p=selected(); p.rx=Math.max(8,Math.min(30,pinchStart.rx*scale)); p.ry=Math.max(7,Math.min(24,pinchStart.ry*scale)); if(state.rangeShape==='circle'){const m=Math.max(p.rx,p.ry);p.rx=p.ry=m} save(); render(); } },{passive:true});
court.addEventListener('touchend',()=>pinchStart=null,{passive:true});
render();
