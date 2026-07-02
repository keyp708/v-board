const COLORS = ['#ef4444','#0ea5e9','#f59e0b','#22c55e','#8b5cf6','#f97316'];
const STORE_KEY = 'v-board-sprint1-state';
const defaultPlayers = ['1','2','3','4','5','6'].map((n,i)=>({id:`p${i+1}`,number:n,name:`選手${n}`,color:COLORS[i],x:[28,50,72,28,50,72][i],y:[34,34,34,66,66,66][i],range:[20,22,21,23,20,21][i]}));
const defaultState = {tab:'board',selected:'p1',playing:false,sceneIndex:0,scenes:[{id:crypto.randomUUID?.()||'s1',name:'基本配置',ball:{x:50,y:52},players:defaultPlayers}]};
let state = load();
let drag = null;
let toastTimer = null;
function clone(o){return JSON.parse(JSON.stringify(o));}
function load(){try{return {...defaultState,...JSON.parse(localStorage.getItem(STORE_KEY)||'{}')}}catch{return clone(defaultState)}}
function save(){localStorage.setItem(STORE_KEY, JSON.stringify(state));}
function current(){return state.scenes[state.sceneIndex];}
function setState(patch){state={...state,...patch};save();render();}
function updateScene(mutator){mutator(current());save();render();}
function showToast(msg){const t=document.querySelector('.toast'); if(!t)return; t.textContent=msg; t.classList.add('show'); clearTimeout(toastTimer); toastTimer=setTimeout(()=>t.classList.remove('show'),1600)}
function h(tag, attrs={}, children=[]){const el=document.createElement(tag); Object.entries(attrs).forEach(([k,v])=>{if(k==='class')el.className=v; else if(k==='style')Object.assign(el.style,v); else if(k.startsWith('on'))el.addEventListener(k.slice(2).toLowerCase(),v); else el.setAttribute(k,v)}); (Array.isArray(children)?children:[children]).forEach(c=>{if(c==null)return; el.append(c.nodeType?c:document.createTextNode(c))}); return el;}
function distance(a,b){return Math.hypot(a.x-b.x,a.y-b.y)}
function receiverInfo(){const s=current(); const ball=s.ball; if(!ball)return {text:'ボールを置くと判定します',type:'none'}; const ranked=s.players.map(p=>({...p,d:distance(p,ball)})).sort((a,b)=>a.d-b.d); const first=ranked[0], second=ranked[1]; const inRange=first.d <= first.range; if(!inRange)return {text:'穴：誰も届きにくい',type:'danger',x:ball.x,y:ball.y}; if(Math.abs(first.d-second.d)<5)return {text:`お見合い注意：${first.number}番 / ${second.number}番`,type:'warn'}; return {text:`${first.number}番が取りやすい`,type:'ok'};}
function render(){const app=document.getElementById('app'); app.innerHTML=''; app.append(h('div',{class:'app'},[Header(),Main(),h('div',{class:'toast'})]));}
function Header(){return h('header',{class:'header'},[h('div',{class:'brand'},[h('div',{class:'logo'},'V'),h('div',{},[h('h1',{},'V Board'),h('p',{},'Visual Volleyball Coaching')])]),h('button',{class:'pill',onclick:()=>{showToast('自動保存されています')}},'保存済み')]);}
function Main(){return h('main',{class:'main'},[Tabs(),h('section',{class:'screen'}, state.tab==='board'?Board(): state.tab==='players'?Players(): state.tab==='practice'?Placeholder('今日の練習','90分メニュー・テーマ別練習は次スプリントで追加予定です。'):Placeholder('試合メモ','対戦相手・セット結果・良かった点・課題を記録できるようにします。'))]);}
function Tabs(){const tabs=[['board','🏐','作戦盤'],['players','👧','選手'],['practice','📅','練習'],['match','📊','試合']];return h('nav',{class:'tabs'},tabs.map(([id,icon,label])=>h('button',{class:`tab ${state.tab===id?'active':''}`,onclick:()=>setState({tab:id})},[h('span',{},icon),label])))}
function Board(){const info=receiverInfo();return h('div',{class:'board'},[Toolbar(),h('div',{class:'court-wrap'},Court(info)),Panel(info)]);}
function Toolbar(){return h('div',{class:'toolbar'},[
  h('button',{class:'tool primary',onclick:addScene},'＋ シーン'),
  h('button',{class:'tool',onclick:prevScene},'← 前'),
  h('button',{class:'tool',onclick:nextScene},'次 →'),
  h('button',{class:'tool',onclick:play},'▶ 再生'),
  h('button',{class:'tool warn',onclick:resetScene},'リセット'),
  h('button',{class:'tool danger',onclick:clearAll},'全消去')
]);}
function Court(info){const s=current(); const court=h('div',{class:'court',onpointerdown:onCourtDown},[h('div',{class:'zone-label op'},'相手コート'),h('div',{class:'zone-label my'},'自チーム')]);
 s.players.forEach(p=>{court.append(h('div',{class:'coverage',style:{left:p.x+'%',top:p.y+'%',width:(p.range*2)+'%',height:(p.range*2)+'%',background:p.color}}));});
 s.players.forEach(p=>{court.append(h('div',{class:`player ${state.selected===p.id?'selected':''}`,style:{left:p.x+'%',top:p.y+'%',background:p.color},'data-id':p.id,onpointerdown:onPlayerDown},[p.number,h('small',{},p.name)]));});
 if(s.ball)court.append(h('div',{class:'ball',style:{left:s.ball.x+'%',top:s.ball.y+'%'},onpointerdown:onBallDown}));
 if(info.type==='danger')court.append(h('div',{class:'hole',style:{left:info.x+'%',top:info.y+'%'}},'穴'));
 return court;}
function Panel(info){const s=current(); return h('aside',{class:'panel'},[h('div',{class:'status'},[h('div',{},[h('strong',{},`${s.name}（${state.sceneIndex+1}/${state.scenes.length}）`),h('br'),h('span',{},info.text)]),h('button',{class:'tool primary',onclick:()=>showToast('保存しました')},'保存')]),h('div',{class:'player-list'},s.players.map(p=>h('div',{class:`chip ${state.selected===p.id?'active':''}`,onclick:()=>setState({selected:p.id})},[h('b',{},`${p.number}番 ${p.name}`),h('label',{},`守備範囲 ${p.range}`),h('input',{type:'range',min:'10',max:'38',value:p.range,oninput:e=>{p.range=Number(e.target.value);save();render();}})])))])}
function Players(){const s=current();return h('div',{class:'list'},[h('div',{class:'hero'},[h('h2',{},'選手管理'),h('p',{},'まずは番号・名前・守備範囲だけ。入力項目を増やしすぎず、毎週使えることを優先します。')]),...s.players.map(p=>h('div',{class:'row'},[h('div',{class:'avatar',style:{background:p.color}},p.number),h('div',{style:{flex:'1'}},[h('b',{},p.name),h('span',{},`守備範囲 ${p.range} / 位置 ${Math.round(p.x)}, ${Math.round(p.y)}`)]),h('button',{class:'tool',onclick:()=>renamePlayer(p.id)},'編集')]))]);}
function Placeholder(title,body){return h('div',{class:'list'},[h('div',{class:'hero'},[h('h2',{},title),h('p',{},body)]),h('div',{class:'quick'},[h('div',{class:'card'},[h('h3',{},'Sprint 1'),h('p',{},'まずは作戦盤を体育館で触れる状態にします。')]),h('div',{class:'card'},[h('h3',{},'次に追加'),h('p',{},'練習メニュー、試合メモ、選手カルテを順番に追加します。')])])]);}
function addScene(){const ns=clone(current()); ns.id=crypto.randomUUID?.()||String(Date.now()); ns.name=`シーン${state.scenes.length+1}`; state.scenes.splice(state.sceneIndex+1,0,ns); state.sceneIndex++; save();render();showToast('シーンを追加しました')}
function prevScene(){if(state.sceneIndex>0)setState({sceneIndex:state.sceneIndex-1})}
function nextScene(){if(state.sceneIndex<state.scenes.length-1)setState({sceneIndex:state.sceneIndex+1})}
function resetScene(){state.scenes[state.sceneIndex]={...clone(defaultState.scenes[0]),id:current().id,name:current().name}; save();render();}
function clearAll(){if(confirm('全データを初期化しますか？')){state=clone(defaultState);save();render();}}
function play(){let i=0; const start=state.sceneIndex; const timer=setInterval(()=>{state.sceneIndex=(start+i)%state.scenes.length;render();i++; if(i>state.scenes.length*2)clearInterval(timer)},700)}
function renamePlayer(id){const p=current().players.find(x=>x.id===id); const name=prompt('選手名',p.name); if(name){current().players.forEach(pp=>{if(pp.id===id)pp.name=name});save();render();}}
function posFromEvent(e, court){const r=court.getBoundingClientRect(); return {x:Math.max(0,Math.min(100,((e.clientX-r.left)/r.width)*100)),y:Math.max(0,Math.min(100,((e.clientY-r.top)/r.height)*100))};}
function onPlayerDown(e){e.stopPropagation(); const id=e.currentTarget.dataset.id; state.selected=id; drag={type:'player',id,el:e.currentTarget}; e.currentTarget.setPointerCapture(e.pointerId); window.addEventListener('pointermove',move); window.addEventListener('pointerup',up,{once:true}); render();}
function onBallDown(e){e.stopPropagation(); drag={type:'ball',el:e.currentTarget}; e.currentTarget.setPointerCapture(e.pointerId); window.addEventListener('pointermove',move); window.addEventListener('pointerup',up,{once:true});}
function onCourtDown(e){const court=e.currentTarget; const pos=posFromEvent(e,court); if(state.selected){updateScene(s=>{const p=s.players.find(x=>x.id===state.selected); p.x=pos.x; p.y=pos.y;});} else {updateScene(s=>s.ball=pos);} }
function move(e){const court=document.querySelector('.court'); if(!drag||!court)return; const pos=posFromEvent(e,court); if(drag.type==='player'){const p=current().players.find(x=>x.id===drag.id); p.x=pos.x; p.y=pos.y;} else current().ball=pos; save(); render();}
function up(){drag=null; window.removeEventListener('pointermove',move)}
if('serviceWorker' in navigator){/* service workerは次版で追加 */}
render();
