import { facilities, upgrades, achievements, heavenlyUpgrades } from './data.js';
import { createState, restore, advance, click, buy, sell, cost, cps, cpc, buyUpgrade, productionBreakdown, upgradePrice, ascensionGain, ascend, buyHeaven, canBuyHeaven, reincarnate, assignPermanent, pledge, pledgePrice, toggleCovenant, popParasite, clickGolden, clickStormDrop } from './engine.js';
const $ = id => document.getElementById(id);
const key = 'bisket-save-v3';
let state = createState(), quantity = 1, mode = 'buy', loadFailed = false;
try { const saved = localStorage.getItem(key) ?? localStorage.getItem('bisket-save-v2') ?? localStorage.getItem('bisket-save-v1'); if (saved) state = restore(saved); } catch { loadFailed = true; $('save-status').textContent = '保存データを読み込めません。自動保存を停止しています'; }
const format = n => n >= 1e12 ? n.toExponential(3) : n.toLocaleString('ja-JP',{maximumFractionDigits:1});
$('facilities').innerHTML = facilities.map(f => `<button class="facility" id="buy-${f.id}"><span class="facility-icon">${f.icon}</span><span class="facility-info"><b>${f.name}</b><small>${f.description}</small><span class="price" id="price-${f.id}"></span></span><span class="facility-owned" id="owned-${f.id}"></span></button>`).join('');
for (const f of facilities) $(`buy-${f.id}`).addEventListener('click', () => { (mode==='buy'?buy:sell)(state,f.id,quantity); render(); });
function describeUpgrade(u) {
  const e=u.effect;
  return ({'building-multiply':'施設生産 ×2','cursor-click-double':'手しごと機とクリックの基本値 ×2','noncursor-add':'他施設1台ごとに +0.1','noncursor-multiply':'他施設の加算値 ×'+e.value,'cookie-multiply':'全体生産 +'+e.value+'%','kitten':'ミルクを生産力に変える','mouse':'クリックに現在の毎秒生産の1%を加算','grandma-synergy':'炉守り ×2、対応施設と共鳴','synergy':'2施設の保有数に応じた相互強化','prestige-power':'巡りの力を '+Math.round((e.value||0)*100)+'% 有効化','research':'研究を進める（次の発見まで30分）','golden':'光の出現・持続を強化','long-pledge':'休戦の時間を2倍にする'})[e.kind]||'強化';
}
$('upgrades').innerHTML=upgrades.map(u=>`<button class="upgrade" id="upgrade-${u.id}"><b>${u.name}</b><span>${describeUpgrade(u)}</span><small id="upgrade-price-${u.id}"></small></button>`).join('');
for(const u of upgrades)$(`upgrade-${u.id}`).addEventListener('click',()=>{if(['research-5','research-7','research-9'].includes(u.id)&&!confirm('炉守りたちの異変が進みます。研究を進めますか？'))return;buyUpgrade(state,u.id);render();});
const skyNames=new Map(heavenlyUpgrades.map(h=>[h.id,h.supported?h.name:'今後登場する節点']));
const heavenIndex=new Map(heavenlyUpgrades.map(h=>[h.id,h]));
function depth(h,seen=new Set()){if(!h||seen.has(h.id))return 0;const next=new Set(seen);next.add(h.id);return h.parents.length?1+Math.max(...h.parents.map(id=>depth(heavenIndex.get(id),next))):0;}
const heavenDisplay=heavenlyUpgrades.filter(h=>h.supported).sort((a,b)=>depth(a)-depth(b)||a.price-b.price);
$('heaven-list').innerHTML=heavenDisplay.map(h=>`<button class="upgrade" id="heaven-${h.id}"><b>${h.name}</b><span>${h.parents.length?'前提：'+h.parents.map(id=>skyNames.get(id)||'未監査の節点').join('・'):'天界の最初の節点'}</span><small>${format(Math.ceil(h.price))} 天界チップ</small></button>`).join('');
for(const h of heavenlyUpgrades.filter(h=>h.supported))$(`heaven-${h.id}`).addEventListener('click',()=>{buyHeaven(state,h.id);save();render();});
$('ascend').addEventListener('click',()=>{if(confirm('転生すると施設・通常強化・残高がリセットされます。天界へ進みますか？')){ascend(state);save();render();}});
$('reincarnate').addEventListener('click',()=>{reincarnate(state);save();render();});
$('pledge').addEventListener('click',()=>{pledge(state);render();});
$('covenant').addEventListener('click',()=>{toggleCovenant(state);render();});
$('golden-cookie').addEventListener('click',()=>{const result=clickGolden(state);if(result)$('event-status').textContent=({rush:'焼成の追い風！',lucky:'光からの贈り物！',elder:'太古の熱風！',cold:'炉が冷え込みました',click:'手しごとの極意！',cursed:'静寂の手',building:'施設が共鳴しました',storm:'焼き菓子の雨！',chain:'光の連鎖！',ruin:'一部を失いました',quiet:'光が静かに消えました'})[result];render();});
function renderPermanent(){
  const signature=JSON.stringify([state.heaven,state.previousUpgrades,state.permanent,state.inAscension]);if($('permanent-slots').dataset.signature===signature)return;$('permanent-slots').dataset.signature=signature;$('permanent-slots').replaceChildren();
  for(let i=0;i<5;i++)if(state.heaven.includes(`permanent-${i+1}`)){
    const label=document.createElement('label');label.textContent=`永続の記憶 ${i+1} `;const select=document.createElement('select');select.disabled=!state.inAscension;
    for(const id of [null,...state.previousUpgrades.filter(id=>!['research','prestige-power'].includes(upgrades.find(u=>u.id===id)?.effect.kind))]){const option=document.createElement('option');option.value=id||'';option.textContent=id?upgrades.find(u=>u.id===id)?.name:'空き';option.selected=id===state.permanent[i];select.append(option);}
    select.addEventListener('change',()=>{assignPermanent(state,i,select.value||null);$('permanent-slots').dataset.signature='';render();});label.append(select);$('permanent-slots').append(label);
  }
}
function renderVisitors(){
  $('golden-cookie').hidden=!state.golden.shimmer||state.inAscension;$('golden-cookie').classList.toggle('wrath',!!state.golden.shimmer?.wrath);
  const ids=state.parasites.map(w=>w.id).join(',');if($('parasites').dataset.ids!==ids){$('parasites').dataset.ids=ids;$('parasites').replaceChildren();for(const w of state.parasites){const button=document.createElement('button');button.id=`parasite-${w.id}`;button.addEventListener('click',()=>{const amount=popParasite(state,w.id);$('event-status').textContent=`蜜の回収：${format(amount)} 枚`;render();});$('parasites').append(button);}}
  for(const w of state.parasites)$(`parasite-${w.id}`).textContent=`${w.shiny?'✧':'◌'} 蜜の精 ${w.id+1} · ${w.arrivalMs>0?'接近中':format(w.sucked)+' 枚'}`;
  const drops=state.golden.drops.map(d=>d.id).join(',');if($('storm-drops').dataset.ids!==drops){$('storm-drops').dataset.ids=drops;$('storm-drops').replaceChildren();for(const d of state.golden.drops){const button=document.createElement('button');button.textContent='✦';button.setAttribute('aria-label','降ってきた焼き菓子を拾う');button.addEventListener('click',()=>{clickStormDrop(state,d.id);render();});$('storm-drops').append(button);}}
}
function render() {
  advance(state);
  for (const id of ['cookies','earned','clicks']) $(id).textContent = format(state[id]);
  $('cps').textContent = format(cps(state));
  $('owned').textContent = Object.values(state.owned).reduce((a,b)=>a+b,0);
  for (const f of facilities) { const price = cost(state,f.id,quantity); $(`price-${f.id}`).textContent = mode==='buy'?`● ${format(price)} 枚 / ${quantity}台（予算内まで購入）`:`${quantity}台まで売却`; $(`owned-${f.id}`).textContent = state.owned[f.id]; $(`buy-${f.id}`).disabled = state.inAscension||(mode==='buy'?state.cookies < cost(state,f.id):state.owned[f.id]===0); }
  for(const u of upgrades){const button=$(`upgrade-${u.id}`);button.hidden=!state.unlocked.includes(u.id)||state.upgrades.includes(u.id);button.disabled=state.inAscension||state.cookies<upgradePrice(state,u.id);$(`upgrade-price-${u.id}`).textContent=format(upgradePrice(state,u.id))+' 枚';}
  $('upgrade-empty').hidden=state.unlocked.some(id=>!state.upgrades.includes(id));
  $('buffs').textContent = state.buffs.map(b => `${b.name} ×${b.multiplier} · ${Math.ceil(b.remainingMs/1000)}秒`).join(' / ');
  $('click-power').textContent=`+${format(cpc(state))} / CLICK`;
  $('record-click').textContent=format(cpc(state));$('record-raw').textContent=format(productionBreakdown(state).raw);
  $('record-upgrades').textContent=state.upgrades.length+' / '+upgrades.length;$('record-achievements').textContent=state.achievements.length+' / '+achievements.length;
  $('record-milk').textContent=format(productionBreakdown(state).milk*100)+'%';
  $('cookie').disabled=state.inAscension;
  $('prestige').textContent=format(state.prestige);$('chips').textContent=format(state.chips);$('ascension-gain').textContent=format(ascensionGain(state));
  $('ascend').hidden=state.inAscension;$('reincarnate').hidden=!state.inAscension;
  $('sky-help').textContent=state.inAscension?'天界チップで節点を購入し、次の工房へ進んでください。':'転生で施設と通常強化を手放し、獲得したチップで永続効果を選べます。';
  for(const h of heavenlyUpgrades.filter(h=>h.supported)){const button=$(`heaven-${h.id}`);button.disabled=!canBuyHeaven(state,h.id);button.classList.toggle('purchased',state.heaven.includes(h.id));button.hidden=state.heaven.includes(h.id);}
  const next=upgrades.find(u=>u.id===state.research.next);$('research-status').textContent=next?`${next.name} · 残り ${Math.ceil(state.research.remainingMs/60000)}分`:'進行中の研究はありません';
  $('elder-stage').textContent=state.elder.covenant?'永久休戦中':state.elder.pledgeMs>0?`休戦中 · 残り ${Math.ceil(state.elder.pledgeMs/60000)}分`:`異変の段階 ${state.elder.stage} / 3`;
  $('pledge').disabled=state.inAscension||!state.upgrades.includes('research-9')||state.elder.pledgeMs>0||state.elder.covenant||state.cookies<pledgePrice(state);$('pledge').textContent=`休戦する · ${format(pledgePrice(state))} 枚`;
  $('covenant').disabled=state.inAscension||!state.elder.pledges||state.cookies<(state.elder.covenant?6666666666:66666666666666);$('covenant').textContent=state.elder.covenant?'永久休戦を解除':'永久休戦（生産 −5%）';
  document.body.dataset.elder=state.elder.stage;renderPermanent();renderVisitors();

}
$('cookie').addEventListener('click', () => {
  const amount = click(state); const label = document.createElement('span'); label.className='floating'; label.textContent=`+${format(amount)}`; document.querySelector('.cookie-stage').append(label); setTimeout(()=>label.remove(),900); render();
});
document.querySelectorAll('[data-quantity]').forEach(button => button.addEventListener('click',()=> { quantity=Number(button.dataset.quantity); document.querySelectorAll('[data-quantity]').forEach(b=>b.classList.toggle('active',b===button)); render(); }));
document.querySelectorAll('[data-mode]').forEach(button=>button.addEventListener('click',()=>{mode=button.dataset.mode;document.querySelectorAll('[data-mode]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));render();}));
document.querySelectorAll('[data-panel]').forEach(button=>button.addEventListener('click',()=>{for(const b of document.querySelectorAll('[data-panel]')){const selected=b===button;b.setAttribute('aria-pressed',String(selected));$(b.dataset.panel).hidden=!selected;}}));
function save(explicit = false) {
  if (loadFailed && !explicit) return;
  if (loadFailed && !confirm('読み込めなかった保存データを現在の進行で上書きしますか？')) return;
  try { advance(state); localStorage.setItem(key,JSON.stringify(state)); loadFailed=false; $('save-status').textContent='保存しました · '+new Date().toLocaleTimeString('ja-JP'); } catch { $('save-status').textContent='保存できません。書き出しで保管してください'; }
}
$('save').addEventListener('click',()=>save(true));
$('export').addEventListener('click',()=> { advance(state); const url=URL.createObjectURL(new Blob([JSON.stringify(state)],{type:'application/json'})); const a=document.createElement('a'); a.href=url; a.download='bisket-save.json'; a.click(); setTimeout(()=>URL.revokeObjectURL(url),1000); });
$('import').addEventListener('click',()=>$('file').click());
$('file').addEventListener('change',async e=> { const file=e.target.files[0]; if (!file) return; try { if(file.size>1000000) throw new Error('ファイルが大きすぎます'); const next=restore(await file.text()); if(confirm('現在の進行を読み込んだデータに置き換えますか？')) {state=next;loadFailed=false;save();render();} } catch { $('save-status').textContent='読み込み失敗：有効なセーブJSONを選んでください'; } e.target.value=''; });
setInterval(render,100); setInterval(()=>save(),10000); document.addEventListener('visibilitychange',()=>{if(document.hidden)save();}); render();
