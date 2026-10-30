import { facilities, rules, upgrades, achievements, buffDefinitions, heavenlyUpgrades } from './data.js';
import {prestigeLevel} from './calculations.js';
const byId=new Map(upgrades.map(u=>[u.id,u]));
const heavenlyById=new Map(heavenlyUpgrades.map(u=>[u.id,u]));
const groups=new Map();for(const u of upgrades){if(!groups.has(u.effect.kind))groups.set(u.effect.kind,[]);groups.get(u.effect.kind).push(u);}
const kind=k=>groups.get(k)||[];
const has=(s,id)=>s.upgrades.includes(id);
const sky=(s,id)=>s.heaven.includes(id);
const building=id=>facilities.find(f=>f.id===id);
const validQuantity=q=>Number.isSafeInteger(q)&&q>0&&q<=1000;
const blankCounts=()=>Object.fromEntries(facilities.map(f=>[f.id,0]));
export const createState=(now=Date.now(),{starter=true}={})=>({version:rules.version,cookies:starter?1000:0,starterGift:starter?1000:0,earned:0,clicks:0,handmade:0,owned:blankCounts(),free:blankCounts(),upgrades:[],unlocked:[],achievements:[],buffs:[],updatedAt:now,totalBaked:0,prestige:0,chips:0,ascensions:0,inAscension:false,heaven:[],permanent:Array(5).fill(null),previousUpgrades:[],research:{next:null,remainingMs:0},elder:{stage:0,pledgeMs:0,pledges:0,covenant:false},parasites:[],golden:{frames:0,shimmer:null,clicks:0,totalClicks:0,last:'',chain:0,chainTotal:0,drops:[],dropSerial:0},frameMs:0});
function meets(s,c) {
  switch(c.kind){
    case 'earned':return s.earned>=c.at&&(!c.require||sky(s,c.require));
    case 'raw-cps':return productionBreakdown(s).raw>=c.at;
    case 'handmade':return s.handmade>=c.at;
    case 'milk':return s.achievements.length*.04>=c.at;
    case 'grandma-synergy':return s.owned.grandma>0&&s.owned[c.building]>=c.at;
    case 'synergy':return sky(s,c.require)&&s.owned[c.building]>=c.at&&s.owned[c.other]>=c.at;
    case 'prestige-power':return sky(s,'legacy')&&(!c.previous||has(s,c.previous));
    case 'synergy-count':return kind('grandma-synergy').filter(u=>has(s,u.id)).length>=c.at;
    case 'research-lab':return s.owned.grandma>=6&&s.achievements.includes('elder-crafts');
    case 'research':return false; // unlocked only by the research timer
    case 'golden-clicks':return s.golden.totalClicks>=c.at;
    case 'pledges':return s.elder.pledges>=c.at;
    case 'owned':return s.owned[c.building]>=c.at;
    default:return false;
  }
}
export function reconcile(s){
  const unlocked=new Set(s.unlocked),won=new Set(s.achievements),raw=productionBreakdown(s).raw;
  for(const a of achievements)if(!won.has(a.id)&&(a.condition.kind==='raw-cps'?raw>=a.condition.at:meets(s,a.condition)))won.add(a.id);
  s.achievements=[...won];
  for(const u of upgrades)if(u.condition?meets(s,u.condition):s.owned[u.building]>=u.unlockAt)unlocked.add(u.id);
  s.unlocked=[...unlocked];
}
export function multiplier(s,target){return s.buffs.filter(b=>b.target===target&&b.remainingMs>0).reduce((n,b)=>n*b.multiplier,1);}
function powers(s){
  let doubles=0,fingers=0;for(const u of upgrades.filter(u=>u.building==='cursor'))if(has(s,u.id)){
    if(u.effect.kind==='cursor-click-double')doubles++;
    if(u.effect.kind==='noncursor-add')fingers+=u.effect.value;
    if(u.effect.kind==='noncursor-multiply')fingers*=u.effect.value;
  }
  if(sky(s,'unshackle-cursor'))fingers*=25;
  return {doubles,addition:fingers*facilities.filter(f=>f.id!=='cursor').reduce((n,f)=>n+s.owned[f.id],0)};
}
export function productionBreakdown(s){
  const {doubles,addition}=powers(s);
  const rows=facilities.map(f=>{
    let unit=f.baseCps;
    if(f.id==='cursor')unit=unit*2**doubles+addition;
    else {
      if(f.id==='grandma'){
        if(has(s,'research-5'))unit+=s.owned.grandma*.02;
        if(has(s,'research-7'))unit+=s.owned.grandma*.02;
        if(has(s,'research-9'))unit+=s.owned.portal*.05;
        for(const u of kind('grandma-synergy'))if(has(s,u.id))unit*=2;
        if(has(s,'research-lab'))unit*=4;
        if(has(s,'research-3'))unit*=2;
      }
      for(const u of kind('building-multiply'))if(u.building===f.id&&has(s,u.id))unit*=2+(sky(s,`unshackle-${f.id}`)&&sky(s,`unshackle-tier-${u.tier}`)?(f.referenceId===1?.5:(20-f.referenceId)*.1):0);
    }
    for(const u of kind('grandma-synergy'))if(u.effect.building===f.id&&has(s,u.id))unit*=1+s.owned.grandma*.01/(f.referenceId-1);
    for(const u of kind('synergy'))if(has(s,u.id)){
      if(u.effect.low===f.id)unit*=1+.05*s.owned[u.effect.high];
      if(u.effect.high===f.id)unit*=1+.001*s.owned[u.effect.low];
    }
    return {id:f.id,unit,total:unit*s.owned[f.id]};
  });
  const base=rows.reduce((sum,r)=>sum+r.total,0),milk=s.achievements.length*.04;
  let global=1+s.prestige*.01*kind('prestige-power').filter(u=>has(s,u.id)).reduce((n,u)=>n+u.effect.value,0);
  for(const id of ['heavenly-cookie','aged-cookie'])if(sky(s,id))global*=1.1;
  for(const u of kind('cookie-multiply'))if(has(s,u.id))global*=1+u.effect.value*.01;
  for(const [i,p]of [[1,1],[2,2],[4,3],[6,4],[8,5]])if(has(s,`research-${i}`))global*=1+p*.01;
  let cats=1;for(const u of kind('kitten'))if(has(s,u.id))cats*=1+milk*u.effect.value;
  if(sky(s,'milk-spirit'))cats*=1+milk*.1;
  global*=cats;
  const raw=base*global,unbuffed=raw*(s.elder.covenant?.95:1),buffed=unbuffed*multiplier(s,'production');
  const suckRate=Math.min(1,s.parasites.filter(w=>w.arrivalMs<=0).length*.05);
  return {rows,raw,unbuffed,buffed,milk,kittenMultiplier:cats,suckRate,net:buffed*(1-suckRate)};
}
export const cps=s=>productionBreakdown(s).net;
export function cpc(s){const cursed=s.buffs.find(b=>b.id==='cursed-hand');if(cursed)return cursed.power;const p=powers(s);let extra=0;for(const u of kind('mouse'))if(has(s,u.id))extra+=productionBreakdown(s).buffed*u.effect.value;return (2**p.doubles+p.addition+extra)*multiplier(s,'click')*(sky(s,'click-boost')?1.1:1);}
function credit(s,n){if(!Number.isFinite(n)||n<0||!Number.isFinite(s.cookies+n)||!Number.isFinite(s.earned+n))throw new RangeError('生産量が数値範囲を超えました');s.cookies+=n;s.earned+=n;}
export function addBuff(s,id,durationMs=buffDefinitions[id]?.durationMs,power,extra={}){
  const def=buffDefinitions[id];if(!def||!Number.isFinite(durationMs)||durationMs<=0)throw Error('Unsupported buff');
  const identity=extra.building?`${id}:${extra.building}`:id;
  const current=s.buffs.find(b=>b.id===identity);if(current)current.remainingMs+=durationMs;
  else s.buffs.push({...def,...extra,id:identity,multiplier:power??def.multiplier,remainingMs:durationMs});
}
export function applyBuff(s,id,now=Date.now()){advance(s,now);addBuff(s,id);}
function maxStage(s){return Number(has(s,'research-5'))+Number(has(s,'research-7'))+Number(has(s,'research-9'));}
export function parasiteLimit(s){return 10+(sky(s,'wrinkler-slots')?2:0);}
export function popParasite(s,id,now=Date.now()){
  advance(s,now);const i=s.parasites.findIndex(w=>w.id===id);if(i<0)return 0;
  const w=s.parasites[i],amount=w.sucked*1.1*(w.shiny?3:1)*(sky(s,'wrinkler-payout')?1.05:1);
  credit(s,amount);s.parasites.splice(i,1);return amount;
}
function collectParasites(s){for(const w of s.parasites)credit(s,w.sucked*1.1*(w.shiny?3:1)*(sky(s,'wrinkler-payout')?1.05:1));s.parasites=[];}
export const pledgePrice=s=>Math.pow(8,Math.min(s.elder.pledges+2,14));
export function pledge(s,now=Date.now()){
  advance(s,now);const price=pledgePrice(s);if(s.inAscension||!has(s,'research-9')||s.elder.pledgeMs>0||s.elder.covenant||s.cookies<price)return false;
  s.cookies-=price;s.elder.stage=0;s.elder.pledges++;s.elder.pledgeMs=(has(s,'long-pledge')?3600:1800)*1000;collectParasites(s);return true;
}
export function toggleCovenant(s,now=Date.now()){
  advance(s,now);const price=s.elder.covenant?6666666666:66666666666666;if(s.inAscension||!s.elder.pledges||s.cookies<price)return false;
  s.cookies-=price;s.elder.covenant=!s.elder.covenant;s.elder.pledgeMs=0;s.elder.stage=s.elder.covenant?0:Math.min(1,maxStage(s));if(s.elder.covenant)collectParasites(s);return true;
}
function eventTime(s,seconds){let m=1;if(has(s,'event-upgrade-1'))m/=2;if(has(s,'event-upgrade-2'))m/=2;if(sky(s,'event-frequency'))m*=.95;if(s.golden.chain)m=3/seconds;return Math.ceil(seconds*30*m);}
function spawnStar(s,rng){const wrath=s.elder.stage===3||(s.elder.stage===1&&rng()<1/3)||(s.elder.stage===2&&rng()<2/3);let duration=13;if(has(s,'event-upgrade-1'))duration*=2;if(has(s,'event-upgrade-2'))duration*=2;if(sky(s,'event-life'))duration*=1.05;if(s.golden.chain)duration=Math.max(2,10/s.golden.chain);s.golden.shimmer={wrath:!!wrath,remainingMs:Math.ceil(duration*30)*1000/30};s.golden.frames=0;}
// Injectable RNG covers gameplay draws. Cosmetic draws from the original are omitted.
function randomFrame(s,rng){
  let dirty=false;
  if(s.owned.grandma===0||s.elder.covenant)s.elder.stage=0;
  else if(!s.elder.pledgeMs){if(has(s,'research-5')&&s.elder.stage===0)s.elder.stage=1;if(rng()<.001&&s.elder.stage<maxStage(s))s.elder.stage++;}
  if(s.elder.stage>0)for(let id=0;id<parasiteLimit(s);id++)if(!s.parasites.some(w=>w.id===id)&&rng()<.00001*s.elder.stage*(sky(s,'wrinkler-bait')?5:1))s.parasites.push({id,arrivalMs:10000,sucked:0,shiny:rng()<.0001});
  if(!s.golden.shimmer){s.golden.frames++;const min=eventTime(s,300),max=eventTime(s,900);if(rng()<Math.pow(Math.max(0,(s.golden.frames-min)/(max-min)),5))spawnStar(s,rng);}
  if(s.buffs.some(b=>b.id==='cookie-storm')&&rng()<.5)s.golden.drops.push({id:String(++s.golden.dropSerial),remainingMs:Math.ceil(rng()*4+1)*1000});
  return dirty;
}
export function advance(s,now=Date.now(),rng=Math.random){
  if(!Number.isFinite(now)||now<=s.updatedAt)return;
  if(s.inAscension){s.updatedAt=now;return;}
  let remaining=now-s.updatedAt,rate=productionBreakdown(s);
  while(remaining>0){
    let dt=Math.min(remaining,1000/30-s.frameMs,...s.buffs.map(b=>b.remainingMs),...(s.research.remainingMs>0?[s.research.remainingMs]:[]),...(s.elder.pledgeMs>0?[s.elder.pledgeMs]:[]));
    if(dt<1e-7){s.frameMs=0;dt=Math.min(remaining,1000/30);}
    credit(s,rate.net*dt/1000);
    for(const w of s.parasites){if(w.arrivalMs<=0)w.sucked+=rate.buffed*rate.suckRate*dt/1000;else {w.arrivalMs=Math.max(0,w.arrivalMs-dt);if(w.arrivalMs===0)rate=productionBreakdown(s);}}
    for(const b of s.buffs)b.remainingMs-=dt;
    if(s.buffs.some(b=>b.remainingMs<1e-7)){s.buffs=s.buffs.filter(b=>b.remainingMs>=1e-7);rate=productionBreakdown(s);}
    if(s.research.remainingMs>0){s.research.remainingMs=Math.max(0,s.research.remainingMs-dt);if(s.research.remainingMs<1e-7){if(!s.unlocked.includes(s.research.next))s.unlocked.push(s.research.next);s.research={next:null,remainingMs:0};}}
    if(s.elder.pledgeMs>0){s.elder.pledgeMs=Math.max(0,s.elder.pledgeMs-dt);if(s.elder.pledgeMs<1e-7){s.elder.pledgeMs=0;s.elder.stage=Math.min(1,maxStage(s));}}
    if(s.golden.shimmer){s.golden.shimmer.remainingMs-=dt;if(s.golden.shimmer.remainingMs<=0){s.golden.shimmer=null;s.golden.chain=0;s.golden.frames=0;}}
    for(const d of s.golden.drops)d.remainingMs-=dt;s.golden.drops=s.golden.drops.filter(d=>d.remainingMs>0);
    s.frameMs+=dt;remaining-=dt;
    if(s.frameMs>=1000/30-1e-7){s.frameMs=0;randomFrame(s,rng);}
  }
  s.updatedAt=now;reconcile(s);
}
export function click(s,now=Date.now()){advance(s,now);if(s.inAscension)return 0;const value=cpc(s);credit(s,value);s.handmade+=value;s.clicks++;reconcile(s);return value;}
export function priceAt(base,owned,free=0,discounts=[]){let price=base*rules.priceGrowth**Math.max(0,owned-free);for(const d of discounts)price*=d;return Math.ceil(price);}
const discounts=s=>sky(s,'building-discount')?[.99]:[];
export function cost(s,id,quantity=1){const f=building(id);if(!f||!validQuantity(quantity))return Infinity;let price=0;for(let i=0;i<quantity;i++)price+=priceAt(f.baseCost,s.owned[id]+i,s.free[id],discounts(s));return price;}
export function displayCost(s,id,quantity=1){const f=building(id);if(!f||!validQuantity(quantity))return Infinity;let price=0;for(let i=0;i<quantity;i++)price+=f.baseCost*rules.priceGrowth**Math.max(0,s.owned[id]+i-s.free[id]);for(const d of discounts(s))price*=d;return Math.ceil(price);}
export function buy(s,id,quantity=1,now=Date.now()){advance(s,now);if(s.inAscension||!building(id)||!validQuantity(quantity))return 0;let n=0;for(;n<quantity;n++){const price=cost(s,id);if(!Number.isFinite(price)||price>s.cookies)break;s.cookies-=price;s.owned[id]++;}reconcile(s);return n;}
export function sell(s,id,quantity=1,now=Date.now()){advance(s,now);if(s.inAscension||!building(id)||!validQuantity(quantity))return 0;let n=0;while(n<quantity&&s.owned[id]>0){const refund=Math.floor(cost(s,id)*.25);if(!Number.isFinite(refund)||!Number.isFinite(s.cookies+refund))break;s.cookies+=refund;s.earned=Math.max(s.earned,s.cookies-s.starterGift);s.owned[id]--;n++;}if(s.owned.grandma===0){collectParasites(s);s.elder.stage=0;s.elder.pledgeMs=0;}return n;}
export function upgradePrice(s,id){const u=byId.get(id);if(!u)return Infinity;let p=u.price;if(u.effect.kind==='synergy'&&sky(s,'chimera'))p*=.98;if(sky(s,'upgrade-discount'))p*=.99;if(u.effect.kind==='kitten'&&sky(s,'kitten-discount'))p*=.9;if(u.effect.kind==='cookie-multiply'&&sky(s,'cookie-discount'))p/=5;return Math.ceil(p);}
export function buyUpgrade(s,id,now=Date.now()){
  advance(s,now);const u=byId.get(id),price=upgradePrice(s,id);if(s.inAscension||!u||has(s,id)||!s.unlocked.includes(id)||s.cookies<price)return false;
  s.cookies-=price;s.upgrades.push(id);
  if(u.effect.kind==='research'){
    const i=u.effect.step;if([5,7,9].includes(i))s.elder.stage={5:1,7:2,9:3}[i];
    if(i<9)s.research={next:`research-${i+1}`,remainingMs:sky(s,'research-memory')?180000:1800000};
  }
  reconcile(s);return true;
}
export function ascensionGain(s){if(s.inAscension)return 0;return Math.max(0,prestigeLevel(s.totalBaked+s.earned)-s.prestige);}
export function ascend(s,now=Date.now()){
  advance(s,now);if(s.inAscension)return false;const gain=ascensionGain(s);s.chips+=gain;s.prestige+=gain;s.totalBaked+=s.earned;s.ascensions++;s.inAscension=true;s.previousUpgrades=[...s.upgrades];return gain;
}
export function canBuyHeaven(s,id){const h=heavenlyById.get(id);return !!(s.inAscension&&h?.supported&&Number.isFinite(h.price)&&!sky(s,id)&&s.chips>=Math.ceil(h.price)&&h.parents.every(p=>sky(s,p)));}
export function buyHeaven(s,id){if(!canBuyHeaven(s,id))return false;s.chips-=Math.ceil(heavenlyById.get(id).price);s.heaven.push(id);return true;}
export function assignPermanent(s,slot,id){if(!s.inAscension||!Number.isInteger(slot)||slot<0||slot>4||!sky(s,`permanent-${slot+1}`))return false;if(id!==null){const u=byId.get(id);if(!u||!s.previousUpgrades.includes(id)||['research','prestige-power'].includes(u.effect.kind)||s.permanent.some((value,i)=>i!==slot&&value===id))return false;}s.permanent[slot]=id;return true;}
export function reincarnate(s,now=Date.now()){
  if(!s.inAscension)return false;const fresh=createState(now,{starter:false});fresh.golden.totalClicks=s.golden.totalClicks;for(const key of ['totalBaked','prestige','chips','ascensions','heaven','permanent','achievements'])fresh[key]=structuredClone(s[key]);
  for(let i=0;i<5;i++)if(sky(fresh,`permanent-${i+1}`)&&fresh.permanent[i]){fresh.upgrades.push(fresh.permanent[i]);fresh.unlocked.push(fresh.permanent[i]);}
  if(sky(fresh,'free-cursors'))fresh.owned.cursor=fresh.free.cursor=10;if(sky(fresh,'free-grandmas'))fresh.owned.grandma=fresh.free.grandma=5;
  Object.assign(s,fresh);reconcile(s);return true;
}
export function offlineReward(s,elapsedMs){if(!sky(s,'offline-gate')||s.inAscension)return 0;let seconds=3600,percent=5;for(let i=1;i<=7;i++){if(sky(s,`offline-time-${i}`))seconds*=2;if(sky(s,`offline-rate-${i}`))percent+=10;}if(sky(s,'chimera')){seconds+=172800;percent+=5;}const elapsed=Math.max(0,elapsedMs/1000);return (Math.min(elapsed,seconds)+Math.max(0,elapsed-seconds)*.1)*productionBreakdown({...s,buffs:[]}).unbuffed*percent/100;}
export function chooseGoldenEffect(s,wrath,rng=Math.random){
  let list=wrath?['cold','lucky','ruin']:['rush','lucky'];
  if(wrath&&rng()<.3)list.push('elder','chain','storm');
  else if(rng()<.03&&s.earned>=100000)list.push('chain','storm');
  rng(); // The reference draws here for the seasonal sale before checking season.
  if(rng()<.1&&(rng()<.05||!s.buffs.some(b=>b.id==='dragonflight')))list.push('click');
  if(wrath&&rng()<.1)list.push('cursed');
  if(Object.values(s.owned).reduce((a,b)=>a+b,0)>=10&&rng()<.25)list.push('building');
  // Lump/dragon/season branches are not enabled until their complete systems exist.
  if((!wrath&&rng()<.15)||rng()<.05){rng();rng();}
  if(s.golden.last&&rng()<.8&&list.includes(s.golden.last))list=list.filter(e=>e!==s.golden.last);
  if(rng()<.0001)list.push('quiet');
  const result=list[Math.floor(rng()*list.length)];return s.golden.chain?'chain':result;
}
export function clickGolden(s,now=Date.now(),rng=Math.random){
  advance(s,now,rng);const star=s.golden.shimmer;if(!star||s.inAscension)return null;
  s.golden.clicks++;s.golden.totalClicks++;
  let result=chooseGoldenEffect(s,star.wrath,rng);s.golden.last=result;
  const seconds=n=>Math.ceil(n*(has(s,'event-upgrade-3')?2:1)*(sky(s,'event-duration')?1.1:1))*1000;
  const production=productionBreakdown(s).buffed;
  if(result!=='chain')s.golden.chain=0;
  if(result==='building'){
    const eligible=facilities.filter(f=>s.owned[f.id]>=10);
    if(!eligible.length)result='rush';else{const f=eligible[Math.floor(rng()*eligible.length)],debuff=star.wrath&&rng()<.3,power=1+s.owned[f.id]/10;addBuff(s,debuff?'building-cold':'building-rush',seconds(30),debuff?1/power:power,{building:f.id,snapshotCount:s.owned[f.id]});}
  }
  if(result==='rush')addBuff(s,'warm-rush',seconds(77));
  else if(result==='elder')addBuff(s,'ancient-rush',seconds(6));
  else if(result==='cold')addBuff(s,'cold-oven',seconds(66));
  else if(result==='click')addBuff(s,'hand-rush',seconds(13));
  else if(result==='cursed')addBuff(s,'cursed-hand',seconds(10),0,{power:production*seconds(10)/1000});
  else if(result==='lucky')credit(s,Math.min(s.cookies*.15,production*900)+13);
  else if(result==='ruin')s.cookies-=Math.min(s.cookies,Math.min(s.cookies*.05,production*600)+13);
  else if(result==='storm')addBuff(s,'cookie-storm',seconds(7));
  else if(result==='chain'){
    if(!s.golden.chain)s.golden.chainTotal=0;
    s.golden.chain++;if(s.golden.chain===1)s.golden.chain+=Math.max(0,Math.ceil(Math.log(Math.max(s.cookies,Number.MIN_VALUE))/Math.LN10)-10);
    const digit=star.wrath?6:7,max=Math.min(production*21600,s.cookies*.5),payout=Math.max(digit,Math.min(Math.floor(10**s.golden.chain*digit/9),max)),next=Math.max(digit,Math.min(Math.floor(10**(s.golden.chain+1)*digit/9),max));
    s.golden.chainTotal+=payout;if(rng()<.01||next>=max)s.golden.chain=0;credit(s,payout);
  }
  s.golden.shimmer=null;s.golden.frames=0;reconcile(s);return result;
}
export function clickStormDrop(s,id,now=Date.now(),rng=Math.random){advance(s,now,rng);const index=s.golden.drops.findIndex(d=>d.id===id);if(index<0)return 0;const amount=Math.max(productionBreakdown(s).buffed*60*Math.floor(rng()*7+1),Math.floor(rng()*7+1));s.golden.drops.splice(index,1);credit(s,amount);return amount;}
const nonnegative=(v,label)=>{if(!Number.isFinite(v)||v<0)throw Error(`Invalid ${label}`);return v;};
const integer=(v,label)=>{nonnegative(v,label);if(!Number.isSafeInteger(v))throw Error(`Invalid ${label}`);return v;};
function strings(value,allowed,label){if(!Array.isArray(value)||value.some(id=>!allowed.has(id))||new Set(value).size!==value.length)throw Error(`Invalid ${label}`);return [...value];}
export function restore(raw,now=Date.now()){
  const input=JSON.parse(raw);if(!input||![1,2,3].includes(input.version))throw Error('未対応のセーブ形式です');
  const s=createState(now,{starter:false});
  for(const key of ['cookies','earned','clicks','updatedAt'])s[key]=nonnegative(input[key],key);
  integer(s.clicks,'clicks');if(!input.owned||Array.isArray(input.owned))throw Error('Invalid buildings');
  for(const f of facilities)s.owned[f.id]=integer(input.owned[f.id]??0,f.id);
  if(input.version>=2){
    s.upgrades=strings(input.upgrades,new Set(byId.keys()),'upgrades');s.unlocked=strings(input.unlocked,new Set(byId.keys()),'unlocked');s.achievements=strings(input.achievements,new Set(achievements.map(a=>a.id)),'achievements');
    if(s.upgrades.some(id=>!s.unlocked.includes(id)))throw Error('Missing unlock');
    if(!Array.isArray(input.buffs)||input.buffs.length>50)throw Error('Invalid buffs');
    const ids=new Set();s.buffs=input.buffs.map(b=>{
      const baseId=typeof b.id==='string'?b.id.split(':')[0]:'',def=buffDefinitions[baseId];if(!def||ids.has(b.id)||nonnegative(b.remainingMs,'buff')===0)throw Error('Invalid buff');ids.add(b.id);
      const buff={id:b.id,...def,remainingMs:b.remainingMs};
      if(baseId.startsWith('building-')){if(!building(b.building)||b.id!==`${baseId}:${b.building}`)throw Error('Invalid building buff');buff.building=b.building;buff.snapshotCount=integer(b.snapshotCount,'snapshot');buff.multiplier=baseId==='building-rush'?1+buff.snapshotCount/10:1/(1+buff.snapshotCount/10);}
      else if(baseId==='cursed-hand')buff.power=nonnegative(b.power,'cursed power');
      else if(baseId!==b.id)throw Error('Invalid buff identity');
      return buff;
    });
  }
  if(input.version===3){
    for(const k of ['handmade','totalBaked','prestige','chips','ascensions','starterGift'])s[k]=nonnegative(input[k],k);
    for(const k of ['prestige','chips','ascensions'])if(!Number.isInteger(s[k]))throw Error(`Invalid ${k}`);
    s.heaven=strings(input.heaven,new Set(heavenlyUpgrades.filter(h=>h.supported).map(h=>h.id)),'heaven');
    if(typeof input.inAscension!=='boolean')throw Error('Invalid ascension');s.inAscension=input.inAscension;
    s.previousUpgrades=strings(input.previousUpgrades,new Set(byId.keys()),'previous upgrades');
    if(!Array.isArray(input.permanent)||input.permanent.length!==5)throw Error('Invalid permanent slots');
    s.permanent=input.permanent.map((id,i)=>{if(id===null)return null;const u=byId.get(id);if(!u||!sky(s,`permanent-${i+1}`)||['research','prestige-power'].includes(u.effect.kind))throw Error('Invalid permanent upgrade');return id;});
    const selected=s.permanent.filter(Boolean);if(new Set(selected).size!==selected.length)throw Error('Duplicate permanent upgrade');
    for(const f of facilities)s.free[f.id]=integer(input.free?.[f.id]??0,'free');
    const r=input.research;if(!r||!((r.next===null&&r.remainingMs===0)||(/^research-[1-9]$/.test(r.next)&&Number.isFinite(r.remainingMs)&&r.remainingMs>0&&r.remainingMs<=1800000)))throw Error('Invalid research');s.research={next:r.next,remainingMs:r.remainingMs};
    const e=input.elder;if(!e||!Number.isInteger(e.stage)||e.stage<0||e.stage>3||typeof e.covenant!=='boolean')throw Error('Invalid elder stage');s.elder={stage:e.stage,pledgeMs:nonnegative(e.pledgeMs,'pledge'),pledges:integer(e.pledges,'pledges'),covenant:e.covenant};
    if(s.elder.stage>maxStage(s))throw Error('Invalid elder unlock');
    if(!Array.isArray(input.parasites)||input.parasites.length>parasiteLimit(s))throw Error('Invalid parasites');const parasIds=new Set();
    s.parasites=input.parasites.map(w=>{if(!Number.isInteger(w.id)||w.id<0||w.id>=parasiteLimit(s)||parasIds.has(w.id)||typeof w.shiny!=='boolean')throw Error('Invalid parasite');parasIds.add(w.id);return {id:w.id,shiny:w.shiny,sucked:nonnegative(w.sucked,'sucked'),arrivalMs:nonnegative(w.arrivalMs,'arrival')};});
    const g=input.golden;if(!g||!['','rush','lucky','ruin','cold','elder','chain','storm','click','cursed','building','quiet'].includes(g.last))throw Error('Invalid star');s.golden={...s.golden,frames:integer(g.frames,'event timer'),clicks:integer(g.clicks,'event clicks'),totalClicks:integer(g.totalClicks,'total event clicks'),last:g.last,chain:integer(g.chain,'chain'),chainTotal:nonnegative(g.chainTotal,'chain total')};
    // Reload removes screen events; their outcomes cannot be claimed twice.
    s.golden.chain=0;s.golden.frames=0;
    const reward=offlineReward(s,Math.max(0,now-s.updatedAt));if(reward)credit(s,reward);
    if(s.research.remainingMs>0)s.research.remainingMs=Math.max(1000/30,s.research.remainingMs-Math.max(0,now-s.updatedAt));
  }
  s.updatedAt=now;reconcile(s);if(![cps(s),cpc(s)].every(Number.isFinite))throw Error('数値が範囲外です');return s;
}
