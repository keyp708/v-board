const court = document.getElementById('court');
const coverageLayer = document.getElementById('coverageLayer');
const playersLayer = document.getElementById('playersLayer');
const ball = document.getElementById('ball');
const hint = document.getElementById('hint');
const storeKey = 'vboard-sprint2-3';
const colors = ['244,45,45','30,145,235','245,166,18','22,174,93','151,82,230','244,111,20'];
const defaults = {
  players: [
    {id:'o1',side:'opp',label:'LF',x:28,y:18,rw:15,rh:12},{id:'o2',side:'opp',label:'MB',x:50,y:18,rw:15,rh:12},{id:'o3',side:'opp',label:'RF',x:72,y:18,rw:15,rh:12},
    {id:'o4',side:'opp',label:'OH',x:28,y:34,rw:15,rh:12},{id:'o5',side:'opp',label:'S',x:50,y:34,rw:15,rh:12},{id:'o6',side:'opp',label:'OP',x:72,y:34,rw:15,rh:12},
    {id:'h1',side:'home',num:1,name:'リオ',x:24,y:60,rw:13,rh:10,color:0},{id:'h2',side:'home',num:2,name:'ユイ',x:50,y:60,rw:13,rh:10,color:1},{id:'h3',side:'home',num:3,name:'サクラ',x:76,y:60,rw:13,rh:10,color:2},
    {id:'h4',side:'home',num:4,name:'ミオ',x:24,y:78,rw:13,rh:10,color:3},{id:'h5',side:'home',num:5,name:'アヤ',x:50,y:78,rw:13,rh:10,color:4},{id:'h6',side:'home',num:6,name:'ハナ',x:76,y:78,rw:13,rh:10,color:5}
  ],
  ball:{x:50,y:50,h:80}
};
let state = load();
let selectedId = 'h2';
let dragTarget = null;
let pinch = null;
function load(){try{return JSON.parse(localStorage.getItem(storeKey)) || structuredClone(defaults)}catch{return structuredClone(defaults)}}
function save(){localStorage.setItem(storeKey,JSON.stringify(state))}
function render(){coverageLayer.innerHTML='';playersLayer.innerHTML='';state.players.forEach(p=>{const cov=document.createElement('div');cov.className='coverage';const rgb=p.side==='opp'?'34,38,39':colors[p.color];cov.style.setProperty('--rgb',rgb);cov.style.left=p.x+'%';cov.style.top=p.y+'%';cov.style.width=p.rw*2+'%';cov.style.height=p.rh*2+'%';coverageLayer.appendChild(cov);const el=document.createElement('div');el.className='player '+(p.side==='opp'?'opp':'home'+p.num)+(p.id===selectedId?' selected':'');el.dataset.id=p.id;el.style.left=p.x+'%';el.style.top=p.y+'%';el.innerHTML = p.side==='opp' ? `<div><div class="num">${p.label}</div><div class="name">${p.label}</div></div>` : `<div><div class="num">${p.num}</div><div class="name">${p.name}</div></div>`;playersLayer.appendChild(el)});ball.style.left=state.ball.x+'%';ball.style.top=state.ball.y+'%';const y=28+state.ball.h/6; ball.style.setProperty('--shadowY',y+'px');ball.style.setProperty('--shadowBlur',(18+state.ball.h/8)+'px')}
function pos(e){const r=court.getBoundingClientRect();return {x:Math.max(2,Math.min(98,(e.clientX-r.left)/r.width*100)),y:Math.max(2,Math.min(98,(e.clientY-r.top)/r.height*100))}}
function dist(a,b){return Math.hypot(a.clientX-b.clientX,a.clientY-b.clientY)}
function findPlayer(id){return state.players.find(p=>p.id===id)}
court.addEventListener('pointerdown',e=>{const player=e.target.closest('.player'); if(player){selectedId=player.dataset.id; dragTarget={type:'player',id:selectedId,pointerId:e.pointerId}; player.setPointerCapture(e.pointerId); render(); return} if(e.target===ball){dragTarget={type:'ball',pointerId:e.pointerId}; ball.setPointerCapture(e.pointerId); return}});
court.addEventListener('pointermove',e=>{if(!dragTarget || dragTarget.pointerId!==e.pointerId)return; const p=pos(e); if(dragTarget.type==='ball'){state.ball.x=p.x;state.ball.y=p.y}else{const pl=findPlayer(dragTarget.id);pl.x=p.x;pl.y=p.y} save(); render()});
court.addEventListener('pointerup',()=>{dragTarget=null});
court.addEventListener('touchstart',e=>{if(e.touches.length===2 && selectedId){const pl=findPlayer(selectedId); pinch={d:dist(e.touches[0],e.touches[1]),rw:pl.rw,rh:pl.rh}; e.preventDefault()}},{passive:false});
court.addEventListener('touchmove',e=>{if(e.touches.length===2 && pinch && selectedId){const pl=findPlayer(selectedId);const scale=dist(e.touches[0],e.touches[1])/pinch.d;pl.rw=Math.max(7,Math.min(28,pinch.rw*scale));pl.rh=Math.max(6,Math.min(24,pinch.rh*scale));save();render();hint.textContent='守備範囲を調整中';e.preventDefault()}},{passive:false});
court.addEventListener('touchend',()=>{pinch=null;hint.textContent='選手・ボールをドラッグ。選手を選んで2本指ピンチで守備範囲を調整。'});
document.getElementById('fullscreenBtn').addEventListener('click',()=>{document.documentElement.requestFullscreen?.()});
render();
