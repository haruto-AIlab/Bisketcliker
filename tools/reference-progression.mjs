import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import vm from 'node:vm';
import {parse} from 'acorn';
import core from '../src/spec/core.js';
import progression from '../src/spec/progression.js';
const source=await readFile(process.argv[2],'utf8');const hash=createHash('sha256').update(source).digest('hex');if(hash!=='10068dd439fc07f6f582db24ed8d9407866a7550409fd15efcd511f1893d8442')throw Error('Wrong reference');
const ast=parse(source,{ecmaVersion:2020,locations:true}),nodes=[];
function walk(n){if(!n||typeof n!=='object')return;if(n.type)nodes.push(n);for(const[k,v]of Object.entries(n))if(k!=='loc'){if(Array.isArray(v))v.forEach(walk);else if(v&&typeof v==='object')walk(v);}}walk(ast);
const member=n=>n?.object?.name==='Game'?n.property?.name:null;
const functionCode=name=>{const n=nodes.find(n=>n.type==='AssignmentExpression'&&member(n.left)===name);return source.slice(n.right.start,n.right.end);};
const creators=nodes.filter(n=>['NewExpression','CallExpression'].includes(n.type)&&['Upgrade','TieredUpgrade','NewUpgradeCookie','GrandmaSynergy','SynergyUpgrade'].includes(member(n.callee)));
const named=n=>member(n.callee)==='NewUpgradeCookie'?n.arguments[0].properties.find(p=>p.key.name==='name')?.value.value:n.arguments[0]?.value;
const aliases=new Map();for(const u of [...progression.normal,...progression.heaven]){const n=creators.find(n=>n.loc.start.line===u.source.line&&typeof named(n)==='string');if(n)aliases.set(named(n),u.id);}
const objects=nodes.filter(n=>n.type==='NewExpression'&&member(n.callee)==='Object'&&typeof n.arguments[0]?.value==='string');
for(const u of core.upgrades){if(u.building==='cursor')continue;const n=creators.find(n=>member(n.callee)==='TieredUpgrade'&&n.arguments[2]?.value===objects[core.facilities.find(f=>f.id===u.building).referenceId].arguments[0].value&&n.arguments[3]?.value===u.tier);aliases.set(named(n),u.id);}
const cursorNames=['Reinforced index finger','Carpal tunnel prevention cream','Ambidextrous','Thousand fingers','Million fingers','Billion fingers','Trillion fingers','Quadrillion fingers','Quintillion fingers','Sextillion fingers','Septillion fingers','Octillion fingers','Nonillion fingers','Decillion fingers','Undecillion fingers'];cursorNames.forEach((n,i)=>aliases.set(n,`cursor-tier-${i+1}`));aliases.set('Unshackled cursors','unshackle-cursor');
const cases=[];
for(let scenario=0;scenario<8;scenario++)for(const milkCount of [0,25,100]){
 const owned=Object.fromEntries(core.facilities.map((f,i)=>[f.id,scenario===0?(i===1?1:0):(i+1)*3]));
 const bought=scenario===0?[]:[...core.upgrades.filter(u=>u.tier<=Math.min(scenario,5)).map(u=>u.id),...progression.normal.filter(u=>['cookie-multiply','kitten','mouse','grandma-synergy','synergy'].includes(u.effect.kind)).filter((u,i)=>i%(9-scenario)===0).map(u=>u.id)];
 if(scenario>=3)bought.push('prestige-power-1','prestige-power-2');if(scenario>=4)bought.push('research-lab','research-1','research-2','research-3','research-4','research-5','research-6','research-7','research-8','research-9');
 const heaven=scenario>=2?['heavenly-cookie','milk-spirit']:[];if(scenario>=5)heaven.push('unshackle-farm','unshackle-tier-1','unshackle-grandma');
 const purchased=new Set([...bought,...heaven]),covenant=scenario===7;if(covenant)purchased.add('Elder Covenant');
 const Game={Has:n=>Number(purchased.has(aliases.get(n)??n)),auraMult:()=>0,eff:()=>1,magicCpS:()=>1,Objects:{},ObjectsById:[],Tiers:{},ascensionMode:0,prestige:scenario>=3?100:0,heavenlyPower:1,AchievementsOwned:milkCount,cookiesPsByType:{},cookiesMultByType:{},cookieUpgrades:[],CpsAchievements:[],cookiesPsRawHighest:0,shimmerTypes:{golden:{n:0}},bakeryName:'bisket',wrinklers:[],buffs:{},runModHookOnValue:(_key,v)=>v,Win:()=>{},computeLumpTimes:()=>{},hasBuff:()=>false};
 const context=vm.createContext({Game});
 for(const name of ['GetHeavenlyMultiplier','ComputeCps','GetTieredCpsMult','mouseCps','CalculateGains'])vm.runInContext(`Game.${name}=${functionCode(name)}`,context,{timeout:1000});
 for(const t of core.tiers)Game.Tiers[t.tier]={special:0,unshackleUpgrade:`unshackle-tier-${t.tier}`};
 for(const f of core.facilities){const n=objects[f.referenceId],name=n.arguments[0].value;const b={id:f.referenceId,name,baseCps:f.baseCps,amount:owned[f.id],level:0,tieredUpgrades:{},synergies:[],unshackleUpgrade:`unshackle-${f.id}`};Game.Objects[name]=b;Game.ObjectsById.push(b);
  for(const u of core.upgrades.filter(u=>u.building===f.id&&f.id!=='cursor'))b.tieredUpgrades[u.tier]={name:[...aliases].find(([,id])=>id===u.id)[0],tier:u.tier};
  b.cps=vm.runInContext('('+source.slice(n.arguments[7].start,n.arguments[7].end)+')',context,{timeout:1000});
 }
 Game.GrandmaSynergies=[];
 for(const u of progression.normal){const name=[...aliases].find(([,id])=>id===u.id)?.[0];if(u.effect.kind==='cookie-multiply')Game.cookieUpgrades.push({name,power:u.effect.value});
  if(u.effect.kind==='grandma-synergy'){const b=Game.ObjectsById[core.facilities.find(f=>f.id===u.effect.building).referenceId];b.grandma={name};Game.GrandmaSynergies.push(name);}
  if(u.effect.kind==='synergy'){const low=Game.ObjectsById[core.facilities.find(f=>f.id===u.effect.low).referenceId],high=Game.ObjectsById[core.facilities.find(f=>f.id===u.effect.high).referenceId];const syn={name,buildingTie1:low,buildingTie2:high};low.synergies.push(syn);high.synergies.push(syn);}
 }
 for(const id of ['heavenly-cookie','aged-cookie'])Game.cookieUpgrades.push({name:[...aliases].find(([,own])=>own===id)[0],power:10});
 vm.runInContext('Game.CalculateGains()',context,{timeout:1000});
 cases.push({owned,upgrades:bought,heaven,prestige:Game.prestige,achievements:milkCount,covenant,raw:Game.cookiesPsRaw,unbuffed:Game.unbuffedCps,cps:Game.cookiesPs,cpc:Game.computedMouseCps});
}
await writeFile('test/fixtures/reference-progression.json',JSON.stringify({commit:progression.referenceCommit,sha256:hash,scope:'24 selected progression combinations; minigames, auras, external heralds and random events disabled',cases},null,2)+'\n');console.log('Reference progression outputs:',cases.length);
