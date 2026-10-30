import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { facilities,upgrades } from '../src/data.js';
import { createState,click,buy,sell,cost,displayCost,advance,restore,cps,cpc,buyUpgrade,reconcile,applyBuff,productionBreakdown,priceAt } from '../src/engine.js';
const reference=JSON.parse(readFileSync(new URL('./fixtures/reference-core.json',import.meta.url)));
test('20 base prices and CpS match pinned constructor output exactly',()=>{
  assert.equal(facilities.length,20);assert.equal(upgrades.length,300);
  for(const r of reference.buildings){assert.equal(facilities[r.id].baseCost,r.baseCost);assert.equal(facilities[r.id].baseCps,r.baseCps);}
});
test('360 quotes and actual rounded purchase totals match reference output',()=>{
  for(const r of reference.prices){const s=createState(0),id=facilities[r.building].id;s.owned[id]=r.owned;assert.equal(cost(s,id,r.quantity),r.paid);assert.equal(displayCost(s,id,r.quantity),r.quote);}
});
test('24 cursor additive-order and click cases match reference output',()=>{
  for(const r of reference.cursors){const s=createState(0);s.owned.cursor=10;s.owned.grandma=r.nonCursor;s.upgrades=r.tiers.map(t=>`cursor-tier-${t}`);const row=productionBreakdown(s).rows[0];assert.equal(row.unit,r.unit);assert.equal(cpc(s),r.click);}
});
test('click purchase elapsed production and 2035-item-rounded versus 2031 quote',()=>{
  const s=createState(0);assert.equal(buy(s,'cursor',1,0),0);for(let i=0;i<15;i++)click(s,0);assert.equal(buy(s,'cursor',1,0),1);assert.equal(s.cookies,0);advance(s,10000);assert.equal(s.cookies,1);assert.equal(s.earned,16);
  const other=createState(0);assert.equal(cost(other,'grandma',10),2035);assert.equal(displayCost(other,'grandma',10),2031);
});
test('bulk buying is partial when budget cannot cover requested quantity',()=>{
  const s=createState(0);s.cookies=32;assert.equal(buy(s,'cursor',10,0),1);assert.equal(s.cookies,17);assert.equal(s.owned.cursor,1);
});
test('sell uses next price before decrement and floors individual refunds',()=>{
  const s=createState(0);s.cookies=100;buy(s,'cursor',1,0);assert.equal(sell(s,'cursor',10,0),1);assert.equal(s.cookies,89);assert.equal(s.owned.cursor,0);assert.equal(sell(s,'cursor',1,0),0);
});
test('upgrade unlocks persist after sale; cursor exception thresholds; one purchase only',()=>{
  const s=createState(0);s.cookies=1e8;buy(s,'cursor',1,0);assert.ok(s.unlocked.includes('cursor-tier-2'));assert.ok(!s.unlocked.includes('cursor-tier-3'));
  assert.equal(buyUpgrade(s,'cursor-tier-3',0),false);assert.equal(buyUpgrade(s,'cursor-tier-1',0),true);assert.equal(buyUpgrade(s,'cursor-tier-1',0),false);assert.equal(cpc(s),2);assert.equal(cps(s),.2);
  sell(s,'cursor',1,0);assert.ok(s.unlocked.includes('cursor-tier-2'));assert.ok(s.achievements.includes('cursor-owned-1'));
});
test('285 ordinary tiers each double only their associated building',()=>{
  for(const f of facilities.slice(1)){const s=createState(0);s.owned[f.id]=600;reconcile(s);s.cookies=1e100;for(let tier=1;tier<=15;tier++)assert.equal(buyUpgrade(s,`${f.id}-tier-${tier}`,0),true);assert.equal(cps(s),f.baseCps*600*32768);assert.equal(cpc(s),1);}
});
test('all 300 upgrade ownership thresholds are exact and their unlocks persist',()=>{
  for(const u of upgrades){const s=createState(0);s.owned[u.building]=u.unlockAt-1;reconcile(s);assert.ok(!s.unlocked.includes(u.id));s.owned[u.building]++;reconcile(s);assert.ok(s.unlocked.includes(u.id));s.owned[u.building]=0;reconcile(s);assert.ok(s.unlocked.includes(u.id));}
});
test('achievement thresholds, no duplicated milk, persistence',()=>{
  const s=createState(0);s.owned.farm=49;reconcile(s);assert.equal(s.achievements.filter(a=>a.startsWith('farm-')).length,1);s.owned.farm=50;reconcile(s);reconcile(s);assert.equal(s.achievements.filter(a=>a.startsWith('farm-')).length,2);assert.equal(productionBreakdown(s).milk,.08);
});
test('same buff adds time while distinct buffs multiply, with exact expiration boundary',()=>{
  const s=createState(0);s.owned.grandma=1;applyBuff(s,'warm-rush',0);applyBuff(s,'warm-rush',0);applyBuff(s,'ancient-rush',0);assert.equal(s.buffs.length,2);assert.equal(cps(s),4662);assert.equal(s.buffs[0].remainingMs,154000);advance(s,6000);assert.equal(s.cookies,27972);assert.equal(cps(s),7);advance(s,154000);assert.equal(cps(s),1);assert.equal(s.buffs.length,0);
});
test('click buffs act on complete click value, not passive production',()=>{
  const s=createState(0);s.upgrades=['cursor-tier-1','cursor-tier-4'];s.owned.farm=10;applyBuff(s,'hand-rush',0);assert.equal(cpc(s),(2+1)*777);assert.equal(cps(s),80);
});
test('large online advances have no arbitrary eight-hour cap and backwards time earns nothing',()=>{
  const s=createState(0);s.owned.grandma=1;advance(s,36000000);assert.equal(s.cookies,36000);advance(s,0);assert.equal(s.cookies,36000);
});
test('save-load has no offline earnings without heavenly gate; buff remaining duration preserved',()=>{
  const s=createState(0);s.cookies=100;s.owned.grandma=1;applyBuff(s,'warm-rush',0);advance(s,1000);const next=restore(JSON.stringify(s),1e9);assert.equal(next.cookies,107);assert.equal(next.buffs[0].remainingMs,76000);advance(next,1e9+76000);assert.equal(next.cookies,639);assert.equal(cps(next),1);
});
test('v1 migration retains balances and original slots without prototype buffs or offline income',()=>{
  const v1={version:1,cookies:12,earned:15,clicks:15,owned:{cursor:1},buffs:[{target:'click',multiplier:999,expiresAt:1000}],updatedAt:0};const s=restore(JSON.stringify(v1),100000);assert.equal(s.version,2);assert.equal(s.cookies,12);assert.equal(s.owned.you,0);assert.equal(s.buffs.length,0);
});
test('malformed saves, duplicates, unsupported mechanics and nonfinite calculations rejected',()=>{
  assert.throws(()=>restore('{'));assert.throws(()=>restore(JSON.stringify({...createState(0),version:99})));
  for(const mutate of [s=>s.owned.cursor=-1,s=>s.owned.cursor=1.5,s=>s.upgrades=['fake'],s=>s.upgrades=['cursor-tier-1'],s=>s.unlocked=['cursor-tier-1','cursor-tier-1'],s=>s.buffs=[{id:'fake',remainingMs:1}],s=>s.clicks=1.5]){const s=createState(0);mutate(s);assert.throws(()=>restore(JSON.stringify(s),0));}
  const s=createState(0);s.buffs=[{id:'warm-rush',remainingMs:1,multiplier:999}];assert.equal(restore(JSON.stringify(s),0).buffs[0].multiplier,7);
});
test('price discount factors apply in order before ceiling; free count subtracts in exponent',()=>{
  assert.equal(priceAt(15,10,10),15);assert.equal(priceAt(15,9,10),15);assert.equal(priceAt(100,2,0,[.99,.93]),Math.ceil(100*1.15**2*.99*.93));
});
test('invalid transactions do not mutate holdings or balance',()=>{
  const s=createState(0);s.cookies=100;for(const quantity of [-1,0,.5,Infinity,1001]){assert.equal(buy(s,'cursor',quantity,0),0);assert.equal(sell(s,'cursor',quantity,0),0);}assert.equal(buy(s,'unknown',1,0),0);assert.equal(s.cookies,100);
});
