const POSITIONS = [
  {key:'LF',jp:'レフト'}, {key:'S',jp:'セッター'}, {key:'RF',jp:'ライト'},
  {key:'BL',jp:'Bレフト'}, {key:'C',jp:'センター'}, {key:'BR',jp:'Bライト'}
];
const stateKey='vboard_sprint10_1';
const defaultPlayers = [
  {id:'p1',nickname:'',position:'LF',grade:'4',age:'10',height:'150'},
  {id:'p2',nickname:'',position:'S',grade:'4',age:'10',height:'150'},
  {id:'p3',nickname:'',position:'RF',grade:'4',age:'10',height:'150'},
  {id:'p4',nickname:'',position:'BL',grade:'4',age:'10',height:'150'},
  {id:'p5',nickname:'',position:'C',grade:'4',age:'10',height:'150'},
  {id:'p6',nickname:'',position:'BR',grade:'4',age:'10',height:'150'},
];
const oppPlayers = POSITIONS.map((p,i)=>({id:'o'+i,position:p.key,opponent:true}));
const defaults = {
  team:'A', scene:'サーブレシーブ', selected:'p2', ball:{x:50,y:50,h:12},
  players: defaultPlayers,
  opponent: oppPlayers,
  scenes:[{id:'s1',name:'サーブレシーブ'}],
  teams:[{id:'A',name:'A'}],
  layouts:{s1:{
    p1:{x:25,y:72,w:15,h:15,r:0},p2:{x:50,y:72,w:15,h:15,r:0},p3:{x:75,y:72,w:15,h:15,r:0},
    p4:{x:25,y:86,w:15,h:15,r:0},p5:{x:50,y:86,w:15,h:15,r:0},p6:{x:75,y:86,w:15,h:15,r:0},
    o0:{x:25,y:19,w:15,h:15,r:0},o1:{x:50,y:19,w:15,h:15,r:0},o2:{x:75,y:19,w:15,h:15,r:0},
    o3:{x:25,y:33,w:15,h:15,r:0},o4:{x:50,y:33,w:15,h:15,r:0},o5:{x:75,y:33,w:15,h:15,r:0},
  }}
};
let state = load();
let mode='player', sheet=null, drag=null, longTimer=null;
function load(){try{return {...structuredClone(defaults),...(JSON.parse(localStorage.getItem(stateKey)||'{}'))}}catch{return structuredClone(defaults)}}
function save(){localStorage.setItem(stateKey,JSON.stringify(state)); const el=document.querySelector('.saveStatus'); if(el) el.textContent='保存済み';}
function posLabel(key){return (POSITIONS.find(p=>p.key===key)||{}).jp||key}
function activeScene(){return state.scenes.find(s=>s.name===state.scene)||state.scenes[0]}
function layout(){const s=activeScene(); if(!state.layouts[s.id]) state.layouts[s.id]=structuredClone(defaults.layouts.s1); return state.layouts[s.id]}
function allPlayers(){return [...state.opponent,...state.players]}
function render(){
  document.getElementById('app').innerHTML=`<div class="app">
    <div class="top"><button class="teamBtn" id="teamOpen">${state.team}</button><button class="sceneBtn" id="sceneOpen">${state.scene} ▼</button><button class="playersBtn" id="playersOpen">選手</button></div>
    <div class="courtWrap"><button class="sideHandle leftHandle" id="teamHandle">‹</button><button class="sideHandle rightHandle" id="playerHandle">›</button><div class="court" id="court">
      <div class="courtLabel oppLabel">相手コート</div><div class="line attackTop"></div><div class="line attackBottom"></div><div class="line centerLine"></div><div class="net"></div>
      ${allPlayers().map(p=>renderCoverage(p)).join('')}${allPlayers().map(p=>renderPlayer(p)).join('')}<div class="ball" id="ball" style="left:${state.ball.x}%;top:${state.ball.y}%;--h:${state.ball.h}px"></div>
    </div></div>
    <div class="bottomBar"><button class="tool" id="undoBtn">↶<br>UNDO</button><button class="tool" id="rangeBtn">◌<br>範囲</button><button class="tool" id="swapBtn">⇄<br>交代</button><button class="tool" id="addSceneBtn">＋<br>シーン</button><button class="tool" id="resetBtn">⌫<br>リセット</button></div>
  </div><div class="sheetBackdrop" id="backdrop"></div><div id="sheets"></div><div class="modal" id="modal"></div>`;
  bind();
}
function renderCoverage(p){const l=layout()[p.id]; if(!l)return''; const cls=state.selected===p.id?'coverage selected':'coverage'; return `<div class="${cls}" style="left:${l.x}%;top:${l.y}%;width:${l.w}%;height:${l.h/2}%;transform:translate(-50%,-50%) rotate(${l.r||0}deg)"></div>${state.selected===p.id?renderHandles(l):''}`}
function renderHandles(l){return `<div class="handle" data-h="right" style="left:${l.x+l.w/2}%;top:${l.y}%"></div><div class="handle" data-h="bottom" style="left:${l.x}%;top:${l.y+l.h/4}%"></div><div class="handle" data-h="scale" style="left:${l.x+l.w/2*.7}%;top:${l.y+l.h/4*.7}%"></div><div class="handle" data-h="rotate" style="left:${l.x+l.w/2*.45}%;top:${l.y-l.h/4*.75}%"></div>`}
function renderPlayer(p){const l=layout()[p.id]; if(!l)return''; const name=p.nickname||''; const noName=!name&&!p.opponent; const main=p.opponent?posLabel(p.position):name; const sub=p.opponent?posLabel(p.position):posLabel(p.position); return `<div class="player ${p.opponent?'opponent':''} ${state.selected===p.id?'selected':''} ${noName?'noName':''}" data-id="${p.id}" style="left:${l.x}%;top:${l.y}%"><span class="primaryText ${main?'':'empty'}">${main}</span><span class="positionText">${sub}</span></div>`}
function bind(){
  document.getElementById('playersOpen').onclick=()=>openSheet('players','right'); document.getElementById('playerHandle').onclick=()=>openSheet('players','right');
  document.getElementById('teamOpen').onclick=()=>openSheet('teams','left'); document.getElementById('teamHandle').onclick=()=>openSheet('teams','left');
  document.getElementById('sceneOpen').onclick=()=>openSheet('scenes','right'); document.getElementById('addSceneBtn').onclick=addScene;
  document.getElementById('resetBtn').onclick=()=>{if(confirm('このシーンの配置を初期化しますか？')){state.layouts[activeScene().id]=structuredClone(defaults.layouts.s1); save(); render();}}
  document.getElementById('swapBtn').onclick=()=>alert('交代: 交代したい2人を順にタップして入れ替えます（次版で強化）');
  document.getElementById('rangeBtn').onclick=()=>{mode='range';};
  bindCourt();
}
function bindCourt(){
  const court=document.getElementById('court');
  court.querySelectorAll('.player').forEach(el=>{
    el.addEventListener('pointerdown',e=>{e.preventDefault(); const id=el.dataset.id; state.selected=id; save(); render(); const c=document.getElementById('court').getBoundingClientRect(); drag={type:'player',id,dx:e.clientX,dy:e.clientY,c}; longTimer=setTimeout(()=>openEditor(id),650); el.setPointerCapture(e.pointerId);});
  });
  document.getElementById('ball').addEventListener('pointerdown',e=>{e.preventDefault(); const c=court.getBoundingClientRect(); drag={type:'ball',c}; e.target.setPointerCapture(e.pointerId);});
  court.querySelectorAll('.handle').forEach(el=>{el.addEventListener('pointerdown',e=>{e.preventDefault(); const c=court.getBoundingClientRect(); drag={type:'handle',h:el.dataset.h,id:state.selected,c}; el.setPointerCapture(e.pointerId);});});
  window.onpointermove=e=>{if(!drag)return; clearTimeout(longTimer); const c=drag.c; let x=(e.clientX-c.left)/c.width*100, y=(e.clientY-c.top)/c.height*100; x=Math.max(0,Math.min(100,x)); y=Math.max(0,Math.min(100,y)); const l=layout(); if(drag.type==='player'){l[drag.id].x=x;l[drag.id].y=y;} if(drag.type==='ball'){state.ball.x=x;state.ball.y=y;} if(drag.type==='handle'){const r=l[drag.id]; if(drag.h==='right'){r.w=Math.max(8,Math.min(70,Math.abs(x-r.x)*2));} if(drag.h==='bottom'){r.h=Math.max(8,Math.min(120,Math.abs(y-r.y)*4));} if(drag.h==='scale'){const s=Math.max(8,Math.min(80,Math.hypot(x-r.x,(y-r.y)*2))); r.w=s; r.h=s;} if(drag.h==='rotate'){r.r=Math.atan2(y-r.y,x-r.x)*180/Math.PI+90;} }
    quickUpdate(); save();};
  window.onpointerup=()=>{clearTimeout(longTimer); drag=null;};
}
function quickUpdate(){render();}
function openSheet(kind,side){const backdrop=document.getElementById('backdrop'); const sheets=document.getElementById('sheets'); sheet=kind; backdrop.classList.add('show'); backdrop.onclick=closeSheet; sheets.innerHTML=`<div class="sheet ${side} show" id="sheet"><div class="sheetHeader"><h2>${kind==='players'?'選手一覧':kind==='teams'?'チーム':'シーン'}</h2><button class="close" id="closeSheet">×</button></div>${sheetContent(kind)}</div>`; document.getElementById('closeSheet').onclick=closeSheet; const sh=document.getElementById('sheet'); let startX=null; sh.addEventListener('touchstart',e=>startX=e.touches[0].clientX); sh.addEventListener('touchend',e=>{if(startX==null)return; const dx=e.changedTouches[0].clientX-startX; if((side==='right'&&dx>70)||(side==='left'&&dx<-70))closeSheet();}); bindSheet(kind);}
function closeSheet(){document.getElementById('backdrop')?.classList.remove('show'); document.getElementById('sheets').innerHTML='';}
function sheetContent(kind){if(kind==='players')return state.players.map((p,i)=>`<div class="listItem" data-edit="${p.id}"><div class="miniToken">${i+1}</div><div class="itemMain"><div class="itemName">${p.nickname||'未入力'}</div><div class="itemSub">${posLabel(p.position)} / ${p.grade}年 / ${p.height}cm</div></div><div>›</div></div>`).join('')+`<button class="addBtn" id="addPlayer">＋ 選手追加</button>`; if(kind==='teams')return state.teams.map(t=>`<div class="listItem" data-team="${t.id}"><div class="miniToken">${t.id}</div><div class="itemMain"><div class="itemName">${t.name}</div></div><div>›</div></div>`).join('')+`<button class="addBtn" id="addTeam">＋ チーム追加</button>`; return state.scenes.map(s=>`<div class="listItem" data-scene="${s.name}"><div class="miniToken">🏐</div><div class="itemMain"><div class="itemName">${s.name}</div></div><div>›</div></div>`).join('')+`<button class="addBtn" id="addSceneInSheet">＋ シーン追加</button>`}
function bindSheet(kind){document.querySelectorAll('[data-edit]').forEach(el=>el.onclick=()=>openEditor(el.dataset.edit)); const ap=document.getElementById('addPlayer'); if(ap)ap.onclick=addPlayer; const at=document.getElementById('addTeam'); if(at)at.onclick=addTeam; const as=document.getElementById('addSceneInSheet'); if(as)as.onclick=addScene; document.querySelectorAll('[data-team]').forEach(el=>el.onclick=()=>{state.team=el.dataset.team;save();closeSheet();render();}); document.querySelectorAll('[data-scene]').forEach(el=>{el.onclick=()=>{state.scene=el.dataset.scene;save();closeSheet();render();}; el.oncontextmenu=e=>{e.preventDefault(); renameScene(el.dataset.scene)}})}
function addPlayer(){const id='p'+Date.now(); state.players.push({id,nickname:'',position:'LF',grade:'4',age:'10',height:'140'}); layout()[id]={x:50,y:80,w:15,h:15,r:0}; save(); closeSheet(); render(); openEditor(id);}
function addTeam(){const name=prompt('チーム名','B'); if(!name)return; const id=name.slice(0,1).toUpperCase(); state.teams.push({id,name}); state.team=id; save(); closeSheet(); render();}
function addScene(){const name=prompt('シーン名','新しいシーン'); if(!name)return; const id='s'+Date.now(); state.scenes.push({id,name}); state.layouts[id]=structuredClone(layout()); state.scene=name; save(); closeSheet(); render();}
function openEditor(id){const p=state.players.find(x=>x.id===id); if(!p) return; const modal=document.getElementById('modal'); modal.classList.add('show'); modal.innerHTML=`<div class="editor"><h2>選手情報</h2><div class="grid"><div class="field full"><label>ニックネーム</label><input id="edName" value="${p.nickname||''}" placeholder="例：みはな"></div><div class="field"><label>学年</label><select id="edGrade">${[1,2,3,4,5,6].map(n=>`<option ${p.grade==n?'selected':''}>${n}</option>`).join('')}</select></div><div class="field"><label>年齢</label><select id="edAge">${Array.from({length:8},(_,i)=>i+6).map(n=>`<option ${p.age==n?'selected':''}>${n}</option>`).join('')}</select></div><div class="field"><label>身長</label><select id="edHeight">${Array.from({length:81},(_,i)=>i+100).map(n=>`<option ${p.height==n?'selected':''}>${n}</option>`).join('')}</select></div><div class="field"><label>ポジション</label><select id="edPos">${POSITIONS.map(pos=>`<option value="${pos.key}" ${p.position===pos.key?'selected':''}>${pos.jp}</option>`).join('')}</select></div><div class="field full"><label>コーチ専用メモ</label><textarea id="edMemo" rows="3">${p.memo||''}</textarea></div></div><div class="actions"><button class="cancel" id="cancelEdit">キャンセル</button><button class="save" id="saveEdit">保存</button></div></div>`; document.getElementById('cancelEdit').onclick=()=>modal.classList.remove('show'); document.getElementById('saveEdit').onclick=()=>{p.nickname=document.getElementById('edName').value.trim();p.grade=document.getElementById('edGrade').value;p.age=document.getElementById('edAge').value;p.height=document.getElementById('edHeight').value;p.position=document.getElementById('edPos').value;p.memo=document.getElementById('edMemo').value;modal.classList.remove('show');save();render();};}
render();
