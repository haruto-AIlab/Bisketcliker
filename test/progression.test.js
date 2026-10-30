import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createState,restore,click,buy,sell,cps,cpc,advance,reconcile,buyUpgrade,upgradePrice,productionBreakdown,ascend,reincarnate,ascensionGain,buyHeaven,canBuyHeaven,assignPermanent,offlineReward,pledge,pledgePrice,toggleCovenant,popParasite,applyBuff,addBuff,chooseGoldenEffect,clickGolden} from '../src/engine.js';
import {upgrades,heavenlyUpgrades} from '../src/data.js';
const empty=()=>createState(0,{starter:false});
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-9*Math.max(1,Math.abs(b)),`${a} != ${b}`);
const noRare=()=>.999999;
test('starter grants 1000 once, excludes gift from production and prestige, preserves saved balances',()=>{
  const s=createState(0);assert.equal(s.cookies,1000);assert.equal(s.earned,0);assert.equal(ascensionGain(s),0);
  buy(s,'cursor',1,0);sell(s,'cursor',1,0);assert.equal(s.earned,0);assert.equal(s.cookies,989);
  const restored=restore(JSON.stringify(s),1000);assert.equal(restored.cookies,989);assert.equal(restored.starterGift,1000);
  const old={version:2,cookies:7,earned:12,clicks:1,owned:{cursor:0},upgrades:[],unlocked:[],achievements:[],buffs:[],updatedAt:0};assert.equal(restore(JSON.stringify(old),0).cookies,7);
});
test('progression catalogue contains 129 unique heavenly nodes with valid parent references',()=>{
  assert.equal(heavenlyUpgrades.length,129);const ids=new Set(heavenlyUpgrades.map(h=>h.id));assert.equal(ids.size,129);assert.equal(heavenlyUpgrades.filter(h=>h.supported).length,80);
  for(const h of heavenlyUpgrades)for(const p of h.parents)assert.ok(ids.has(p),`${h.id} -> ${p}`);
  assert.equal(upgrades.length,517);
});
test('cookie recipes use earnings not gifted bank, and multiply rather than add',()=>{
  const s=createState(0);s.cookies=1e9;s.owned.grandma=1;reconcile(s);const recipes=upgrades.filter(u=>u.effect.kind==='cookie-multiply').slice(0,2);
  assert.ok(!s.unlocked.includes(recipes[0].id));s.earned=1e9;reconcile(s);
  for(const u of recipes)assert.ok(buyUpgrade(s,u.id,0));close(cps(s),(1+recipes[0].effect.value*.01)*(1+recipes[1].effect.value*.01));
});
test('mouse adds current buffed CpS before click multiplier; kitten factors multiply independently',()=>{
  const s=empty();s.owned.grandma=100;const mouse=upgrades.find(u=>u.effect.kind==='mouse');s.upgrades=[mouse.id];applyBuff(s,'warm-rush',0);applyBuff(s,'hand-rush',0);close(cpc(s),(1+700*.01)*777);
  const cats=upgrades.filter(u=>u.effect.kind==='kitten').slice(0,2);s.buffs=[];s.upgrades=cats.map(u=>u.id);s.achievements=Array.from({length:25},(_,i)=>'test-'+i);close(cps(s),100*(1+cats[0].effect.value)*(1+cats[1].effect.value));
});
test('grandma synergy doubles attendants and gives building-dependent internal multiplier',()=>{
  const s=empty();s.owned.grandma=10;s.owned.farm=15;s.upgrades=['attendant-farm'];close(cps(s),10*2+15*8*(1+10*.01));
});
test('synergy book gates paired unlocks and asymmetric effects',()=>{
  const u=upgrades.find(u=>u.effect.kind==='synergy'),s=empty();s.owned[u.effect.low]=15;s.owned[u.effect.high]=15;reconcile(s);assert.ok(!s.unlocked.includes(u.id));s.heaven=['synergy-book-1'];reconcile(s);assert.ok(s.unlocked.includes(u.id));s.upgrades=[u.id];const rows=productionBreakdown(s).rows;assert.equal(rows.find(r=>r.id===u.effect.low).unit,productionBreakdown({...s,upgrades:[]}).rows.find(r=>r.id===u.effect.low).unit*(1+.05*15));
});
test('ascension awards only incremental prestige and chips; gift is not renewed; no duplicate award',()=>{
  const s=empty();s.earned=1e12;s.cookies=1e6;s.owned.cursor=20;s.upgrades=['cursor-tier-1'];s.unlocked=['cursor-tier-1'];s.golden.totalClicks=77;
  assert.equal(ascend(s,0),1);assert.equal(s.chips,1);assert.equal(ascend(s,0),false);assert.equal(click(s,0),0);assert.equal(buy(s,'cursor',1,0),0);
  assert.equal(buyHeaven(s,'offline-gate'),false);assert.equal(buyHeaven(s,'legacy'),true);assert.equal(buyHeaven(s,'legacy'),false);
  assert.ok(reincarnate(s,0));assert.equal(s.cookies,0);assert.equal(s.owned.cursor,0);assert.equal(s.upgrades.length,0);assert.ok(s.heaven.includes('legacy'));assert.equal(s.golden.totalClicks,77);
  assert.equal(ascensionGain(s),0);s.earned=7e12;assert.equal(ascensionGain(s),1);assert.equal(ascend(s,0),1);assert.equal(s.prestige,2);assert.equal(s.totalBaked,8e12);
});
test('prestige power is purchased anew each run, adds within activation layer',()=>{
  const s=empty();s.heaven=['legacy'];s.prestige=100;s.cookies=1e15;s.owned.grandma=1;reconcile(s);assert.equal(cps(s),1);
  assert.ok(buyUpgrade(s,'prestige-power-1',0));close(cps(s),1.05);assert.ok(buyUpgrade(s,'prestige-power-2',0));close(cps(s),1.25);
});
test('heavenly prerequisites, cost and permanent slot restrictions enforced',()=>{
  const s=empty();s.inAscension=true;s.chips=1000;assert.ok(buyHeaven(s,'legacy'));assert.ok(buyHeaven(s,'permanent-1'));s.previousUpgrades=['cursor-tier-1','research-lab'];assert.ok(assignPermanent(s,0,'cursor-tier-1'));assert.equal(assignPermanent(s,0,'research-lab'),false);assert.equal(assignPermanent(s,1,'cursor-tier-1'),false);assert.equal(canBuyHeaven(s,'recipe-box-1'),false);assert.ok(buyHeaven(s,'heavenly-cookie'));assert.ok(buyHeaven(s,'recipe-box-1'));assert.ok(reincarnate(s,0));assert.ok(s.upgrades.includes('cursor-tier-1'));close(cpc(s),2);
});
test('free starters subtract from price exponent and unlocked tier boosts require both flags',()=>{
  const s=empty();s.inAscension=true;s.heaven=['free-cursors','free-grandmas','unshackle-farm'];assert.ok(reincarnate(s,0));assert.equal(s.owned.cursor,10);assert.equal(s.owned.grandma,5);const t=empty();t.owned.farm=1;t.upgrades=['farm-tier-1'];t.heaven=['unshackle-farm'];assert.equal(cps(t),16);t.heaven.push('unshackle-tier-1');close(cps(t),8*3.8);
});
test('offline optimal and reduced duration, excludes buffs and is credited once per saved interval',()=>{
  const s=empty();s.owned.grandma=1;assert.equal(offlineReward(s,7200000),0);s.heaven=['offline-gate'];assert.equal(offlineReward(s,7200000),198);applyBuff(s,'warm-rush',0);close(offlineReward(s,7200000),198);
  const loaded=restore(JSON.stringify(s),7200000);close(loaded.cookies,198);const again=restore(JSON.stringify(loaded),7200000);close(again.cookies,198);assert.equal(again.buffs[0].remainingMs,77000);
});
test('research requires 7 synergies; each purchased discovery starts 30-minute next timer',()=>{
  const s=empty();s.cookies=1e30;s.owned.grandma=6;s.upgrades=upgrades.filter(u=>u.effect.kind==='grandma-synergy').slice(0,6).map(u=>u.id);reconcile(s);assert.ok(!s.unlocked.includes('research-lab'));s.upgrades.push(upgrades.filter(u=>u.effect.kind==='grandma-synergy')[6].id);reconcile(s);assert.ok(s.unlocked.includes('research-lab'));assert.ok(buyUpgrade(s,'research-lab',0));assert.equal(s.research.remainingMs,1800000);assert.equal(buyUpgrade(s,'research-1',0),false);advance(s,1799999,noRare);assert.ok(!s.unlocked.includes('research-1'));advance(s,1800000,noRare);assert.ok(s.unlocked.includes('research-1'));assert.ok(buyUpgrade(s,'research-1',1800000));assert.equal(s.research.next,'research-2');assert.equal(s.research.remainingMs,1800000);
});
test('research memory shortens future timers to 3 minutes; research progresses while offline',()=>{
  const s=empty();s.cookies=1e30;s.heaven=['research-memory'];s.unlocked=['research-lab'];assert.ok(buyUpgrade(s,'research-lab',0));assert.equal(s.research.remainingMs,180000);const loaded=restore(JSON.stringify(s),200000);close(loaded.research.remainingMs,1000/30);advance(loaded,200034,noRare);assert.ok(loaded.unlocked.includes('research-1'));
});
test('apocalypse stages, pledge escalation/cap, covenant and revocation',()=>{
  const s=empty();s.cookies=1e30;s.owned.grandma=10;
  for(const n of [5,7,9]){s.unlocked.push(`research-${n}`);assert.ok(buyUpgrade(s,`research-${n}`,0));assert.equal(s.elder.stage,{5:1,7:2,9:3}[n]);}
  assert.equal(pledgePrice(s),64);assert.ok(pledge(s,0));assert.equal(s.elder.stage,0);assert.equal(s.elder.pledgeMs,1800000);assert.equal(pledge(s,0),false);assert.equal(pledgePrice(s),512);advance(s,1800000,noRare);assert.equal(s.elder.pledgeMs,0);assert.equal(s.elder.stage,1);
  const before=productionBreakdown(s).raw;assert.ok(toggleCovenant(s,1800000));close(cps(s),before*.95);assert.equal(s.elder.stage,0);assert.ok(toggleCovenant(s,1800000));close(cps(s),before);s.elder.pledges=100;assert.equal(pledgePrice(s),8**14);
});
test('wrinklers each store pooled suction and return 110%, shiny triples, payout bonus stacks',()=>{
  const s=empty();s.owned.grandma=10;s.upgrades=['research-5'];s.elder.stage=1;s.parasites=[{id:0,arrivalMs:0,sucked:0,shiny:false},{id:1,arrivalMs:0,sucked:0,shiny:true}];const gross=productionBreakdown(s).buffed;advance(s,1000,noRare);close(s.cookies,gross*.9);close(s.parasites[0].sucked,gross*.1);close(s.parasites[1].sucked,gross*.1);s.heaven=['wrinkler-payout'];close(popParasite(s,0,1000),gross*.1*1.1*1.05);close(popParasite(s,1,1000),gross*.1*1.1*3*1.05);assert.equal(s.parasites.length,0);
});
test('golden candidate selection is conditional; Lucky uses pre-reward bank and cannot be claimed twice',()=>{
  const s=empty();s.cookies=100;s.owned.grandma=1;s.golden.shimmer={wrath:false,remainingMs:13000};assert.equal(chooseGoldenEffect(s,false,noRare),'lucky');assert.equal(clickGolden(s,0,noRare),'lucky');assert.equal(s.cookies,128);assert.equal(s.golden.totalClicks,1);assert.equal(clickGolden(s,0,noRare),null);
});
test('building buffs distinguish source facilities and retain snapshot strength on extension',()=>{
  const s=empty();s.owned.grandma=1;addBuff(s,'building-rush',30000,11,{building:'farm',snapshotCount:100});addBuff(s,'building-rush',30000,21,{building:'mine',snapshotCount:200});assert.equal(cps(s),231);addBuff(s,'building-rush',30000,61,{building:'farm',snapshotCount:600});assert.equal(cps(s),231);assert.equal(s.buffs[0].remainingMs,60000);const saved=restore(JSON.stringify(s),0);assert.equal(cps(saved),231);
});
test('v3 save preserves progression and rejects malformed nested state',()=>{
  const s=empty();s.earned=1e12;ascend(s,0);buyHeaven(s,'legacy');const loaded=restore(JSON.stringify(s),10);assert.equal(loaded.prestige,1);assert.equal(loaded.inAscension,true);assert.deepEqual(loaded.heaven,['legacy']);
  for(const mutate of [s=>s.heaven=['unknown'],s=>s.elder.stage=4,s=>s.research={next:'research-1',remainingMs:-1},s=>s.chips=-1,s=>s.permanent=['fake',null,null,null,null],s=>s.parasites=[{id:0,shiny:false,sucked:-1,arrivalMs:0}]]){const s=empty();mutate(s);assert.throws(()=>restore(JSON.stringify(s),0));}
});
test('24 expanded CpS/CpC combinations match pinned reference CalculateGains output',async()=>{
  const {readFile}=await import('node:fs/promises');const fixture=JSON.parse(await readFile(new URL('./fixtures/reference-progression.json',import.meta.url)));
  for(const [i,r]of fixture.cases.entries()){
    const s=empty();Object.assign(s.owned,r.owned);s.upgrades=r.upgrades;s.heaven=r.heaven;s.prestige=r.prestige;s.achievements=Array.from({length:r.achievements},(_,i)=>'oracle-'+i);s.elder.covenant=r.covenant;
    const result=productionBreakdown(s);for(const key of ['raw','unbuffed'])assert.ok(Math.abs(result[key]-r[key])<=1e-12*Math.max(1,r[key]),`case ${i} ${key}: ${result[key]} != ${r[key]}`);
    close(cps(s),r.cps);close(cpc(s),r.cpc);
  }
});
test('heavenly prices are ceiled before spending, preserving whole chip balances',()=>{
  const s=empty();s.inAscension=true;s.chips=1e15;s.heaven=['unshackle-tier-1'];const u=heavenlyUpgrades.find(h=>h.id==='unshackle-tier-2');const before=s.chips;assert.ok(buyHeaven(s,u.id));assert.equal(s.chips,before-Math.ceil(u.price));assert.equal(Number.isInteger(s.chips),true);
});
test('ascension preview does not double count the forfeited run while in heaven',()=>{
  const s=empty();s.earned=1e18;ascend(s,0);assert.equal(ascensionGain(s),0);assert.equal(ascend(s,0),false);
});
test('elder collaboration achievement survives ascension and re-unlocks lab with six attendants',()=>{
  const s=empty();s.owned.grandma=6;s.upgrades=upgrades.filter(u=>u.effect.kind==='grandma-synergy').slice(0,7).map(u=>u.id);s.unlocked=[...s.upgrades];reconcile(s);assert.ok(s.achievements.includes('elder-crafts'));ascend(s,0);reincarnate(s,0);assert.ok(!s.unlocked.includes('research-lab'));s.owned.grandma=6;reconcile(s);assert.ok(s.unlocked.includes('research-lab'));
});
test('pledge-duration upgrade is eligible for a permanent slot like other normal upgrades',()=>{
  const s=empty();s.inAscension=true;s.heaven=['permanent-1'];s.previousUpgrades=['long-pledge'];assert.ok(assignPermanent(s,0,'long-pledge'));reincarnate(s,0);assert.ok(s.upgrades.includes('long-pledge'));
});
