import { facilities, upgrades } from './data.js';
import { createState, restore, advance, click, buy, sell, cost, cps, cpc, buyUpgrade, productionBreakdown } from './engine.js';
const $ = id => document.getElementById(id);
const key = 'bisket-save-v2';
let state = createState(), quantity = 1, mode = 'buy', loadFailed = false;
try { const saved = localStorage.getItem(key) ?? localStorage.getItem('bisket-save-v1'); if (saved) state = restore(saved); } catch { loadFailed = true; $('save-status').textContent = '保存データを読み込めません。自動保存を停止しています'; }
const format = n => n >= 1e12 ? n.toExponential(3) : n.toLocaleString('ja-JP',{maximumFractionDigits:1});
$('facilities').innerHTML = facilities.map(f => `<button class="facility" id="buy-${f.id}"><span class="facility-icon">${f.icon}</span><span class="facility-info"><b>${f.name}</b><small>${f.description}</small><span class="price" id="price-${f.id}"></span></span><span class="facility-owned" id="owned-${f.id}"></span></button>`).join('');
for (const f of facilities) $(`buy-${f.id}`).addEventListener('click', () => { (mode==='buy'?buy:sell)(state,f.id,quantity); render(); });
$('upgrades').innerHTML=upgrades.map(u=>`<button class="upgrade" id="upgrade-${u.id}"><b>${u.name}</b><span>${u.effect.kind==='building-multiply'?'施設生産 ×2':u.effect.kind==='cursor-click-double'?'手しごと機とクリックの基本値 ×2':u.effect.kind==='noncursor-add'?'他施設1台ごとに +0.1':'他施設による加算値 ×'+u.effect.value}</span><small>${format(u.price)} 枚</small></button>`).join('');
for(const u of upgrades)$(`upgrade-${u.id}`).addEventListener('click',()=>{buyUpgrade(state,u.id);render();});
function render() {
  advance(state);
  for (const id of ['cookies','earned','clicks']) $(id).textContent = format(state[id]);
  $('cps').textContent = format(cps(state));
  $('owned').textContent = Object.values(state.owned).reduce((a,b)=>a+b,0);
  for (const f of facilities) { const price = cost(state,f.id,quantity); $(`price-${f.id}`).textContent = mode==='buy'?`● ${format(price)} 枚 / ${quantity}台（予算内まで購入）`:`${quantity}台まで売却`; $(`owned-${f.id}`).textContent = state.owned[f.id]; $(`buy-${f.id}`).disabled = mode==='buy'?state.cookies < cost(state,f.id):state.owned[f.id]===0; }
  for(const u of upgrades){const button=$(`upgrade-${u.id}`);button.hidden=!state.unlocked.includes(u.id)||state.upgrades.includes(u.id);button.disabled=state.cookies<u.price;}
  $('upgrade-empty').hidden=state.unlocked.some(id=>!state.upgrades.includes(id));
  $('buffs').textContent = state.buffs.map(b => `${b.name} ×${b.multiplier} · ${Math.ceil(b.remainingMs/1000)}秒`).join(' / ');
  $('click-power').textContent=`+${format(cpc(state))} / CLICK`;
  $('record-click').textContent=format(cpc(state));$('record-raw').textContent=format(productionBreakdown(state).raw);
  $('record-upgrades').textContent=state.upgrades.length+' / 300';$('record-achievements').textContent=state.achievements.length+' / 298';
  $('record-milk').textContent=format(productionBreakdown(state).milk*100)+'%';
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
