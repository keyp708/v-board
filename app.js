const POSITIONS=[
 {id:'lf',jp:'レフト',short:'LF',x:25,y:58},{id:'s',jp:'セッター',short:'S',x:50,y:58},{id:'rf',jp:'ライト',short:'RF',x:75,y:58},
 {id:'bl',jp:'Bレフト',short:'BL',x:25,y:78},{id:'c',jp:'センター',short:'C',x:50,y:78},{id:'br',jp:'Bライト',short:'BR',x:75,y:78}
];
const OPP_POS=[
 {id:'lf',jp:'レフト',short:'LF',x:25,y:17},{id:'s',jp:'セッター',short:'S',x:50,y:17},{id:'rf',jp:'ライト',short:'RF',x:75,y:17},
 {id:'bl',jp:'Bレフト',short:'BL',x:25,y:32},{id:'c',jp:'センター',short:'C',x:50,y:32},{id:'br',jp:'Bライト',short:'BR',x:75,y:32}
];
const defaultPlayers=POSITIONS.map((p,i)=>({id:'p'+(i+1),no:i+1,name:'',grade:'4',age:'10',height:'135',sex:'未設定',position:p.id,coachMemo:'',publicMemo:''}));
const defaultState={team:'A',teams:['A'],sceneId:'serve',scenes:[{id:'serve',name:'サーブレシーブ'}],view:'top',ballType:'molten',selected:'p2',mode:'select',players:defaultPlayers,byScene:{serve:{ball:{x:50,y:50,h:70},placements:{},areas:{}}}};
let state=load(); let longTimer=null, drag=null, startTouch=null;
function load(){try{const s=JSON.parse(localStorage.getItem('vboard15'));return normalize(s||defaultState)}catch{return structuredClone(defaultState)}}
function save(){localStorage.setItem('vboard15',JSON.stringify(state));toast('保存済み')}
function normalize(s){s={...structuredClone(defaultState),...s}; if(!s.scenes?.length)s.scenes=structuredClone(defaultState.scenes); if(!s.sceneId)s.sceneId=s.scenes[0].id; if(!s.byScene)s.byScene={}; s.scenes.forEach(sc=>{if(!s.byScene[sc.id])s.byScene[sc.id]={ball:{x:50,y:50,h:70},placements:{},areas:{}}}); if(!s.players?.length)s.players=structuredClone(defaultPlayers); s.players=s.players.map((p,i)=>({...defaultPlayers[i%6],...p,position:p.position||POSITIONS[i%6].id})); return s}
function scene(){return state.byScene[state.sceneId]}
function area(id){const sc=scene(); if(!sc.areas[id]) sc.areas[id]={w:15,h:15,rot:0}; const a=sc.areas[id]; if(!a.w)a.w=15;if(!a.h)a.h=a.w;if(!a.rot)a.rot=0; return a}
function place(p){const sc=scene(); if(!sc.placements[p.id]){const pos=POSITIONS.find(x=>x.id===p.position)||POSITIONS[0]; sc.placements[p.id]={x:pos.x,y:pos.y}} return sc.placements[p.id]}
function oppPlace(p){return OPP_POS.find(x=>x.id===p.id)||OPP_POS[0]}
function posLabel(id,short=false){const p=POSITIONS.find(x=>x.id===id)||POSITIONS[0];return short?p.short:p.jp}
function render(){document.getElementById('app').innerHTML=`<div class="app">
 <div class="topbar"><button class="teamBtn" id="teamBtn">${state.team}</button><button class="sceneBtn" id="sceneBtn">${state.scenes.find(s=>s.id===state.sceneId)?.name||'シーン'} ▼</button><button class="playersBtn" id="playersBtn">選手</button></div>
 <div class="viewSwitch"><button id="topView" class="${state.view==='top'?'active':''}">トップビュー</button><button id="sideView" class="${state.view==='side'?'active':''}">サイドビュー</button></div>
 <div class="main">${state.view==='top'?courtHtml():sideHtml()}</div>
 <div class="bottomBar"><button id="undo">↶<br>UNDO</button><button id="range" class="${state.mode==='range'?'active':''}">◌<br>範囲</button><button id="swap" class="${state.mode==='swap'?'active':''}">⇄<br>交代</button><button id="addScene">＋<br>シーン</button><button id="reset">⌫<br>リセット</button></div>
 ${drawers()}${sheetHtml()}<div class="toast" id="toast"></div>
 </div>`; bind();}
function courtHtml(){const sc=scene();return `<div class="courtWrap" id="courtWrap"><button class="sideHandle left" id="teamHandle">‹</button><button class="sideHandle right" id="playerHandle">›</button><div class="court" id="court"><div class="attack top"></div><div class="attack bottom"></div><div class="net"></div><div class="label opp">相手コート</div>${OPP_POS.map(p=>markerHtml({id:'o_'+p.id,position:p.id,opp:true},oppPlace(p),true)).join('')}${state.players.slice(0,6).map(p=>{const pl=place(p);return areaHtml(p,pl)+markerHtml(p,pl,false)}).join('')}${ballHtml(sc.ball)}</div></div>`}
function areaHtml(p,pl){const a=area(p.id);return `<div class="area ${state.selected===p.id?'selected':''}" style="left:${pl.x}%;top:${pl.y}%;width:${a.w}%;height:${a.h/2}%;transform:translate(-50%,-50%) rotate(${a.rot}deg)"></div>`}
function markerHtml(p,pl,opp){const selected=state.selected===p.id?' selected':'';let name='',pos=''; if(opp){pos=posLabel(p.position||p.id,false)}else{name=p.name||'';pos=posLabel(p.position,false)}return `<div class="player ${opp?'opp':''}${selected}" data-id="${p.id}" data-opp="${opp?1:0}" style="left:${pl.x}%;top:${pl.y}%"><div class="marker"><div class="name">${escapeHtml(name)}</div><div class="pos">${escapeHtml(pos)}</div></div>${!opp&&state.selected===p.id?handles():''}</div>`}
function handles(){return `<div class="handles"><div class="handle r" data-h="r"></div><div class="handle b" data-h="b"></div><div class="handle s" data-h="s"></div></div>`}
function ballHtml(b){return `<div class="ball" id="ball" style="left:${b.x}%;top:${b.y}%"><div class="ballCore ${state.ballType}"></div></div>`}
function sideHtml(){return `<div class="sideView"><div class="sideCanvas"><div class="floor"></div><div class="sideNet"></div><div class="netHeight">ネット 2.0m</div><div class="arc"></div><div class="ball sideBall"><div class="ballCore ${state.ballType}"></div></div><div class="person p1"></div><div class="person p2"></div></div><p class="hint">サイドビューβ：ネット高さ、ボール軌道、選手の位置関係を横から説明するための表示です。トップビューの配置と連動する設計です。</p></div>`}
function drawers(){return `<div class="drawer left" id="teamDrawer"><button class="close" data-close>×</button><h2>チーム</h2>${state.teams.map(t=>`<div class="listItem" data-team="${t}"><div class="num">${t}</div><div><strong>${t}チーム</strong><small>タップで切替</small></div><div>›</div></div>`).join('')}<button class="wideBtn" id="addTeam">＋ チーム追加</button></div>
<div class="drawer right" id="playerDrawer"><button class="close" data-close>×</button><h2>選手一覧</h2>${state.players.map((p,i)=>`<div class="listItem" data-edit="${p.id}"><div class="num">${i+1}</div><div><strong>${escapeHtml(p.name||posLabel(p.position,false))}</strong><small>${posLabel(p.position,false)} / ${p.grade}年 / ${p.height}cm</small></div><div>›</div></div>`).join('')}<button class="wideBtn" id="addPlayer">＋ 選手追加</button><button class="wideBtn" id="ballSwitch">ボール：${state.ballType==='molten'?'モルテン風':'ミカサ風'}</button></div>
<div class="drawer right" id="sceneDrawer"><button class="close" data-close>×</button><h2>シーン</h2>${state.scenes.map(sc=>`<div class="listItem" data-scene="${sc.id}"><div class="num">▶</div><div><strong>${escapeHtml(sc.name)}</strong><small>タップで切替</small></div><div>›</div></div>`).join('')}<button class="wideBtn" id="newScene">＋ シーン追加</button></div>`}
function sheetHtml(){return `<div class="sheetBack" id="sheetBack"><div class="sheet"><h2>選手情報</h2><div class="grid"><div class="field"><label>ニックネーム</label><input id="fName" /></div><div class="field"><label>性別</label><select id="fSex"><option>未設定</option><option>女</option><option>男</option></select></div><div class="field"><label>学年</label><select id="fGrade">${[1,2,3,4,5,6].map(n=>`<option value="${n}">${n}年</option>`).join('')}</select></div><div class="field"><label>年齢</label><select id="fAge">${Array.from({length:13},(_,i)=>i+6).map(n=>`<option value="${n}">${n}歳</option>`).join('')}</select></div><div class="field"><label>身長</label><select id="fHeight">${Array.from({length:81},(_,i)=>i+100).map(n=>`<option value="${n}">${n}cm</option>`).join('')}</select></div><div class="field"><label>ポジション</label><select id="fPos">${POSITIONS.map(p=>`<option value="${p.id}">${p.jp}</option>`).join('')}</select></div></div><div class="field" style="margin-top:12px"><label>コーチ専用メモ</label><textarea id="fMemo" rows="3"></textarea></div><button class="saveBtn" id="savePlayer">保存</button></div></div>`}
function bind(){
 document.getElementById('playersBtn').onclick=()=>openDrawer('playerDrawer');document.getElementById('playerHandle').onclick=()=>openDrawer('playerDrawer');document.getElementById('teamBtn').onclick=()=>openDrawer('teamDrawer');document.getElementById('teamHandle').onclick=()=>openDrawer('teamDrawer');document.getElementById('sceneBtn').onclick=()=>openDrawer('sceneDrawer');
 document.getElementById('topView').onclick=()=>{state.view='top';save();render()};document.getElementById('sideView').onclick=()=>{state.view='side';save();render()};
 document.querySelectorAll('[data-close]').forEach(b=>b.onclick=closeDrawers);
 document.querySelectorAll('[data-team]').forEach(el=>el.onclick=()=>{state.team=el.dataset.team;save();render()});
 document.getElementById('addTeam').onclick=()=>{const n=prompt('チーム名','B');if(n){state.teams.push(n);state.team=n;save();render()}};
 document.querySelectorAll('[data-scene]').forEach(el=>el.onclick=()=>{state.sceneId=el.dataset.scene;save();render()});
 document.getElementById('newScene').onclick=()=>{const n=prompt('シーン名','相手レフト');if(n){const id='s'+Date.now();state.scenes.push({id,name:n});state.sceneId=id;state.byScene[id]=structuredClone(scene());save();render()}};
 document.getElementById('addScene').onclick=()=>openDrawer('sceneDrawer');
 document.getElementById('addPlayer').onclick=()=>{const p={...defaultPlayers[0],id:'p'+Date.now(),name:'',no:state.players.length+1,position:'lf'};state.players.push(p);save();render()};
 document.getElementById('ballSwitch').onclick=()=>{state.ballType=state.ballType==='molten'?'mikasa':'molten';save();render()};
 document.querySelectorAll('[data-edit]').forEach(el=>el.onclick=()=>openSheet(el.dataset.edit));
 document.getElementById('sheetBack').onclick=e=>{if(e.target.id==='sheetBack')closeSheet()};document.getElementById('savePlayer').onclick=savePlayer;
 document.getElementById('range').onclick=()=>{state.mode=state.mode==='range'?'select':'range';render()};document.getElementById('swap').onclick=()=>{state.mode=state.mode==='swap'?'select':'swap';swapFirst=null;render()};document.getElementById('reset').onclick=()=>{if(confirm('現在のシーンをリセットしますか？')){state.byScene[state.sceneId]=structuredClone(defaultState.byScene.serve);save();render()}};
 bindCourt();
}
let swapFirst=null;
function bindCourt(){const court=document.getElementById('court'); if(!court)return;
 court.querySelectorAll('.player').forEach(el=>{if(el.dataset.opp==='1')return;el.addEventListener('pointerdown',pd);});
 const ball=document.getElementById('ball'); if(ball)ball.addEventListener('pointerdown',e=>{drag={type:'ball',id:'ball'};ball.setPointerCapture(e.pointerId);});
 document.querySelectorAll('.handle').forEach(h=>h.addEventListener('pointerdown',e=>{e.stopPropagation();drag={type:'handle',h:h.dataset.h,id:state.selected};h.setPointerCapture(e.pointerId)}));
 window.onpointermove=pm;window.onpointerup=pu;
}
function pd(e){const el=e.currentTarget,id=el.dataset.id;state.selected=id;if(state.mode==='swap'){if(!swapFirst){swapFirst=id;toast('交代相手を選択')}else if(swapFirst!==id){const a=place(state.players.find(p=>p.id===swapFirst)),b=place(state.players.find(p=>p.id===id));[a.x,b.x]=[b.x,a.x];[a.y,b.y]=[b.y,a.y];swapFirst=null;state.mode='select';save();render()}return}longTimer=setTimeout(()=>openSheet(id),550);drag={type:'player',id,moved:false};el.setPointerCapture(e.pointerId)}
function pm(e){if(!drag)return; const c=document.getElementById('court'); if(!c)return; const r=c.getBoundingClientRect(); const x=Math.max(3,Math.min(97,(e.clientX-r.left)/r.width*100)); const y=Math.max(3,Math.min(97,(e.clientY-r.top)/r.height*100)); if(drag.type==='player'){clearTimeout(longTimer);drag.moved=true;const p=state.players.find(p=>p.id===drag.id);const pl=place(p);pl.x=x;pl.y=y;renderLite()} if(drag.type==='ball'){scene().ball.x=x;scene().ball.y=y;renderLite()} if(drag.type==='handle'){const p=state.players.find(p=>p.id===drag.id);const pl=place(p);const a=area(p.id);const dx=Math.abs(x-pl.x),dy=Math.abs(y-pl.y)*2;if(drag.h==='r')a.w=Math.max(12,Math.min(50,dx*2)); if(drag.h==='b')a.h=Math.max(12,Math.min(70,dy*2)); if(drag.h==='s'){const d=Math.max(dx*2,dy*2);a.w=a.h=Math.max(12,Math.min(60,d))} renderLite()}}
function pu(){clearTimeout(longTimer); if(drag){save();drag=null}}
function renderLite(){const old=window.onpointermove;render();window.onpointermove=old;}
function openDrawer(id){closeDrawers();document.getElementById(id).classList.add('open')}function closeDrawers(){document.querySelectorAll('.drawer').forEach(d=>d.classList.remove('open'))}
function openSheet(id){const p=state.players.find(p=>p.id===id); if(!p)return; state.selected=id;document.getElementById('sheetBack').classList.add('open');['Name','Sex','Grade','Age','Height','Pos','Memo'].forEach(()=>{});fName.value=p.name||'';fSex.value=p.sex||'未設定';fGrade.value=p.grade||'4';fAge.value=p.age||'10';fHeight.value=p.height||'135';fPos.value=p.position||'lf';fMemo.value=p.coachMemo||''}
function closeSheet(){document.getElementById('sheetBack').classList.remove('open')}
function savePlayer(){const p=state.players.find(p=>p.id===state.selected); if(!p)return;p.name=fName.value.trim();p.sex=fSex.value;p.grade=fGrade.value;p.age=fAge.value;p.height=fHeight.value;p.position=fPos.value;p.coachMemo=fMemo.value;closeSheet();save();render()}
function toast(t){const el=document.getElementById('toast'); if(!el)return;el.textContent=t;el.style.display='block';clearTimeout(el._t);el._t=setTimeout(()=>el.style.display='none',900)}
function escapeHtml(s){return String(s||'').replace(/[&<>"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m]))}
render();
