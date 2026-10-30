import { facilities, rules, upgrades, achievements, buffDefinitions } from './data.js';
const byId = new Map(upgrades.map(u=>[u.id,u]));
const building = id => facilities.find(f=>f.id===id);
const validQuantity = q => Number.isSafeInteger(q) && q>0 && q<=1000;
export const createState = (now=Date.now()) => ({version:rules.version,cookies:0,earned:0,clicks:0,owned:Object.fromEntries(facilities.map(f=>[f.id,0])),upgrades:[],unlocked:[],achievements:[],buffs:[],updatedAt:now});
export function reconcile(state) {
  const unlocked=new Set(state.unlocked),won=new Set(state.achievements);
  for(const u of upgrades) if(state.owned[u.building]>=u.unlockAt) unlocked.add(u.id);
  for(const a of achievements) if(state.owned[a.condition.building]>=a.condition.at)won.add(a.id);
  state.unlocked=[...unlocked];state.achievements=[...won];
}
export function multiplier(state,target) {return state.buffs.filter(b=>b.target===target&&b.remainingMs>0).reduce((n,b)=>n*b.multiplier,1);}
function powers(state) {
  const purchased=new Set(state.upgrades);let doubles=0,fingers=0;
  for(const u of upgrades.filter(u=>u.building==='cursor')) if(purchased.has(u.id)) {
    if(u.effect.kind==='cursor-click-double')doubles++;
    if(u.effect.kind==='noncursor-add')fingers+=u.effect.value;
    if(u.effect.kind==='noncursor-multiply')fingers*=u.effect.value;
  }
  const nonCursor=facilities.filter(f=>f.id!=='cursor').reduce((n,f)=>n+state.owned[f.id],0);
  return {purchased,doubles,addition:fingers*nonCursor};
}
export function productionBreakdown(state) {
  const {purchased,doubles,addition}=powers(state);
  const rows=facilities.map(f=>{
    let unit=f.baseCps;
    if(f.id==='cursor')unit=unit*2**doubles+addition;
    else for(const u of upgrades)if(u.building===f.id&&purchased.has(u.id))unit*=u.effect.value;
    return {id:f.id,unit,total:unit*state.owned[f.id]};
  });
  const raw=rows.reduce((sum,row)=>sum+row.total,0);
  return {rows,raw,unbuffed:raw,buffed:raw*multiplier(state,'production'),milk:state.achievements.length*.04};
}
export const cps = state => productionBreakdown(state).buffed;
export function cpc(state) {const p=powers(state);return (2**p.doubles+p.addition)*multiplier(state,'click');}
function credit(state,n) {if(!Number.isFinite(n)||n<0||!Number.isFinite(state.cookies+n)||!Number.isFinite(state.earned+n))throw new RangeError('生産量が数値範囲を超えました');state.cookies+=n;state.earned+=n;}
export function advance(state,now=Date.now()) {
  if(!Number.isFinite(now)||now<=state.updatedAt)return;
  let remaining=now-state.updatedAt;
  while(remaining>0) {
    const step=Math.min(remaining,...state.buffs.filter(b=>b.remainingMs>0).map(b=>b.remainingMs));
    credit(state,cps(state)*step/1000);
    for(const b of state.buffs)b.remainingMs-=step;
    state.buffs=state.buffs.filter(b=>b.remainingMs>0);remaining-=step;
  }
  state.updatedAt=now;reconcile(state);
}
export function click(state,now=Date.now()) {advance(state,now);const value=cpc(state);credit(state,value);state.clicks++;return value;}
export function priceAt(base,owned,free=0,discounts=[]) {let price=base*rules.priceGrowth**Math.max(0,owned-free);for(const factor of discounts)price*=factor;return Math.ceil(price);}
export function cost(state,id,quantity=1) {
  const f=building(id);if(!f||!validQuantity(quantity))return Infinity;
  let price=0;for(let i=0;i<quantity;i++)price+=priceAt(f.baseCost,state.owned[id]+i);
  return price;
}
// Reference store quote rounds the sum once; purchase rounds each item.
export function displayCost(state,id,quantity=1) {
  const f=building(id);if(!f||!validQuantity(quantity))return Infinity;
  let price=0;for(let i=0;i<quantity;i++)price+=f.baseCost*rules.priceGrowth**(state.owned[id]+i);
  return Math.ceil(price);
}
export function buy(state,id,quantity=1,now=Date.now()) {
  advance(state,now);const f=building(id);if(!f||!validQuantity(quantity))return 0;
  let bought=0;for(let i=0;i<quantity;i++) {const price=cost(state,id);if(!Number.isFinite(price)||price>state.cookies)break;state.cookies-=price;state.owned[id]++;bought++;}
  reconcile(state);return bought;
}
export function sell(state,id,quantity=1,now=Date.now()) {
  advance(state,now);if(!building(id)||!validQuantity(quantity))return 0;
  let sold=0;while(sold<quantity&&state.owned[id]>0){const refund=Math.floor(cost(state,id)*.25);if(!Number.isFinite(refund)||!Number.isFinite(state.cookies+refund))break;state.cookies+=refund;state.earned=Math.max(state.earned,state.cookies);state.owned[id]--;sold++;}
  return sold;
}
export function buyUpgrade(state,id,now=Date.now()) {
  advance(state,now);const u=byId.get(id);
  if(!u||state.upgrades.includes(id)||!state.unlocked.includes(id)||state.cookies<u.price)return false;
  state.cookies-=u.price;state.upgrades.push(id);return true;
}
export function applyBuff(state,id,now=Date.now()) {
  const def=buffDefinitions[id];if(!def)throw new Error('Unsupported buff');advance(state,now);
  const current=state.buffs.find(b=>b.id===id);
  if(current)current.remainingMs+=def.durationMs;
  else state.buffs.push({id,...def,remainingMs:def.durationMs});
}
// No offline income before heavenly unlocks are implemented. Buff timers pause on load.
export function restore(raw,now=Date.now()) {
  const input=JSON.parse(raw);
  if(!input||![1,2].includes(input.version))throw new Error('未対応のセーブ形式です');
  const state=createState(now);
  for(const key of ['cookies','earned','clicks','updatedAt']) {if(!Number.isFinite(input[key])||input[key]<0)throw new Error('数値が不正です');state[key]=input[key];}
  if(!Number.isSafeInteger(state.clicks)||!input.owned||Array.isArray(input.owned))throw new Error('セーブ形式が不正です');
  for(const f of facilities){const count=input.owned[f.id]??0;if(!Number.isSafeInteger(count)||count<0)throw new Error('施設数が不正です');state.owned[f.id]=count;}
  if(input.version===2){
    for(const [key,allowed] of [['upgrades',new Set(upgrades.map(u=>u.id))],['unlocked',new Set(upgrades.map(u=>u.id))],['achievements',new Set(achievements.map(a=>a.id))]]){
      if(!Array.isArray(input[key])||input[key].some(id=>!allowed.has(id))||new Set(input[key]).size!==input[key].length)throw new Error('未対応の項目があります');state[key]=[...input[key]];
    }
    if(state.upgrades.some(id=>!state.unlocked.includes(id)))throw new Error('強化の解禁情報が不正です');
    if(!Array.isArray(input.buffs)||input.buffs.length>Object.keys(buffDefinitions).length)throw new Error('効果データが不正です');
    const ids=new Set();state.buffs=input.buffs.map(b=>{const def=buffDefinitions[b.id];if(!def||ids.has(b.id)||!Number.isFinite(b.remainingMs)||b.remainingMs<=0)throw new Error('効果データが不正です');ids.add(b.id);return {id:b.id,...def,remainingMs:b.remainingMs};});
  }
  // v1 balances are retained; arbitrary prototype buffs are not migrated.
  state.updatedAt=now;reconcile(state);
  if(![cps(state),cpc(state)].every(Number.isFinite))throw new Error('数値が範囲外です');return state;
}
