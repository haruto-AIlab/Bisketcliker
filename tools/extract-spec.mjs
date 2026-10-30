// Offline research tool. Never evaluates or republishes upstream game code/text.
import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { parse } from 'acorn';
import path from 'node:path';
const root = process.argv[2];
if (!root) throw new Error('Usage: node tools/extract-spec.mjs /path/to/research-sources');
const commit = 'c77f00c51854a667da35a3135120797a579c2d72';
const input = await readFile(path.join(root,'main-2.058.js'),'utf8');
const hash = createHash('sha256').update(input).digest('hex');
const expected = '10068dd439fc07f6f582db24ed8d9407866a7550409fd15efcd511f1893d8442';
if (hash !== expected) throw new Error('Reference checksum mismatch');
const ast = parse(input, {ecmaVersion:2020,locations:true});
function walk(node, fn) { if (!node || typeof node !== 'object') return; if (node.type) fn(node); for (const [key,value] of Object.entries(node)) if(key!=='loc') { if(Array.isArray(value)) value.forEach(n=>walk(n,fn)); else if(value && typeof value==='object') walk(value,fn); } }
const member = n => n?.type==='MemberExpression' && n.object?.name==='Game' ? n.property.name : null;
function numeric(n) {
  if(n?.type==='Literal' && typeof n.value==='number') return n.value;
  if(n?.type==='UnaryExpression' && n.operator==='-') {const v=numeric(n.argument);return v===null?null:-v;}
  if(n?.type==='BinaryExpression') {const a=numeric(n.left),b=numeric(n.right);if(a===null||b===null)return null;return ({'+':()=>a+b,'-':()=>a-b,'*':()=>a*b,'/':()=>a/b,'**':()=>a**b})[n.operator]?.()??null;}
  if(n?.type==='CallExpression' && n.callee?.object?.name==='Math' && n.callee.property.name==='pow') {const a=numeric(n.arguments[0]),b=numeric(n.arguments[1]);return a===null||b===null?null:a**b;}
  return null;
}
const buildings=[]; walk(ast,n=>{if(n.type==='NewExpression'&&member(n.callee)==='Object'&&typeof n.arguments[0]?.value==='string')buildings.push(n.arguments[0].value);});
if(buildings.length!==20)throw new Error('Expected 20 buildings');
const originalNames=['手しごと機','炉守り隊','麦の庭','琥珀採掘場','円盤工場','穀物金庫','星祈り堂','風読み塔','空路便','蜜の研究所','虹の扉','時環装置','真空窯','光の製粉機','偶然織り機','連環工房','論理焼成機','夢の分室','記憶の窯','分身工房'];
const ids=['cursor','grandma','farm','mine','factory','bank','temple','tower','shipment','alchemy','portal','time','antimatter','prism','chance','fractal','console','idleverse','cortex','you'];
const source = (n) => ({file:'main.js',line:n.loc.start.line,endLine:n.loc.end.line});
let tiersNode;walk(ast,n=>{if(n.type==='AssignmentExpression'&&member(n.left)==='Tiers')tiersNode=n.right;});
const tiers=tiersNode.properties.filter(p=>Number.isInteger(Number(p.key.value??p.key.name))).map(p=>{const v=Object.fromEntries(p.value.properties.map(q=>[q.key.name??q.key.value,q.value]));return {tier:Number(p.key.value??p.key.name),unlock:numeric(v.unlock),achievementAt:numeric(v.achievUnlock),priceFactor:numeric(v.price),source:source(p)};});
const facilities=ids.map((id,n)=>{
  let baseCost=15,baseCps=0.1;
  if(n){baseCps=Math.ceil(n**(n*.5+2)*10)/10;let d=10**Math.ceil(Math.log(Math.ceil(baseCps))/Math.LN10)/100;baseCps=Math.round(baseCps/d)*d;baseCost=(n+9+(n<5?0:(n-5)**1.75*5))*10**n*Math.max(1,n-14);d=10**Math.ceil(Math.log(Math.ceil(baseCost))/Math.LN10)/100;baseCost=Math.round(baseCost/d)*d;if(n>=16)baseCost*=10;if(n>=17)baseCost*=10;if(n>=18)baseCost*=10;if(n>=19)baseCost*=20;}
  return {id,referenceId:n,name:originalNames[n],baseCost,baseCps,source:{file:'main.js',line:n===0?8979:8014,endLine:n===0?9001:8030}};
});
const upgrades=[];const achievements=[];const inventory=[];
walk(ast,n=>{
  const type=(n.type==='NewExpression'||n.type==='CallExpression')&&member(n.callee);
  if(!['Upgrade','TieredUpgrade','SynergyUpgrade','GrandmaSynergy','NewUpgradeCookie','Achievement','TieredAchievement','ProductionAchievement','BankAchievement','CpsAchievement'].includes(type))return;
  // Entries identify declaration sites, NOT runtime IDs or complete unlock rules.
  const cookieProps=type==='NewUpgradeCookie'&&n.arguments[0]?.type==='ObjectExpression'?Object.fromEntries(n.arguments[0].properties.map(p=>[p.key.name??p.key.value,p.value])):null;
  inventory.push({id:`declaration-${n.start}`,kind:type,source:source(n),literalPrice:type==='Upgrade'?numeric(n.arguments[2]):cookieProps?numeric(cookieProps.price):null,numericPower:cookieProps?numeric(cookieProps.power):null,condition:null,effect:null,status:'requires-semantic-review'});
  if(type==='TieredUpgrade'&&Number.isInteger(n.arguments[3]?.value)){
    const building=buildings.indexOf(n.arguments[2].value),tier=n.arguments[3].value;
    if(building<1)throw new Error('Unexpected tier building');
    const f=facilities[building],t=tiers.find(t=>t.tier===tier);
    upgrades.push({id:`${f.id}-tier-${tier}`,name:`${f.name}・改良${tier}`,building:f.id,tier,price:f.baseCost*t.priceFactor,unlockAt:t.unlock,effect:{kind:'building-multiply',value:2},source:source(n)});
  }
  if(type==='TieredAchievement'&&Number.isInteger(n.arguments[3]?.value)){
    const building=buildings.indexOf(n.arguments[2]?.value),tier=n.arguments[3].value;
    if(building<1)return;
    const f=facilities[building],t=tiers.find(t=>t.tier===tier);
    if(t)achievements.push({id:`${f.id}-owned-${t.achievementAt}`,name:`${f.name}・保有${t.achievementAt}`,condition:{kind:'owned',building:f.id,at:t.achievementAt},milk:0.04,source:source(n)});
  }
});
const cursorNames=['Reinforced index finger','Carpal tunnel prevention cream','Ambidextrous','Thousand fingers','Million fingers','Billion fingers','Trillion fingers','Quadrillion fingers','Quintillion fingers','Sextillion fingers','Septillion fingers','Octillion fingers','Nonillion fingers','Decillion fingers','Undecillion fingers'];
const cursorUnlocks=[1,1,10,25,50,100,150,200,250,300,350,400,450,500,550];
walk(ast,n=>{if(n.type!=='NewExpression'||member(n.callee)!=='Upgrade')return;const i=cursorNames.indexOf(n.arguments[0]?.value);if(i<0)return;upgrades.push({id:`cursor-tier-${i+1}`,name:`手しごとの知恵 ${i+1}`,building:'cursor',tier:i+1,price:numeric(n.arguments[2]),unlockAt:cursorUnlocks[i],effect:i<3?{kind:'cursor-click-double',value:2}:i===3?{kind:'noncursor-add',value:0.1}:{kind:'noncursor-multiply',value:i===4?5:i===5?10:20},source:source(n)});});
for(const at of [1,2,50,100,200,300,400,500,600,700,800,900,1000]) achievements.push({id:`cursor-owned-${at}`,name:`手しごと機・保有${at}`,condition:{kind:'owned',building:'cursor',at},milk:0.04,source:{file:'main.js',line:9019,endLine:9019}});
if(upgrades.length!==300 || new Set(upgrades.map(u=>u.id)).size!==300)throw new Error(`Incomplete tiers: ${upgrades.length}`);
const output={targetVersion:'2.058',evidence:'pinned-unofficial-source-mirror',commit,mainSha256:hash,facilities,tiers,upgrades:upgrades.sort((a,b)=>facilities.findIndex(f=>f.id===a.building)-facilities.findIndex(f=>f.id===b.building)||a.tier-b.tier),achievements,limits:{fullUpgradeRuntimeCount:null,fullAchievementRuntimeCount:null,reason:'Declaration sites include helpers, loops and conditional definitions. They are not a runtime registry.'}};
await writeFile('spec/core.v2.058.json',JSON.stringify(output,null,2)+'\n');
await writeFile('src/spec/core.js',`// Generated numeric mechanics and independently written labels; see spec/sources.json.\nexport default ${JSON.stringify(output)};\n`);
await writeFile('spec/declaration-inventory.json',JSON.stringify({commit,mainSha256:hash,scope:'main.js static declaration sites only; not runtime registry; minigame declarations excluded',runtimeCount:null,entries:inventory},null,2)+'\n');
console.log(JSON.stringify({facilities:facilities.length,upgrades:upgrades.length,achievements:achievements.length,declarationSites:inventory.length}));
const modules=[
  ['Garden','plants','dcdb8cf6a91b7bd4810ecdd81e7877649b341e98897782383798878c01918a7c',['cost','costM','ageTick','ageTickR','mature']],
  ['Grimoire','spells','469382386f157c0bd3b1c85f3068e20b68f61f432b73756b7dc60da091a34ec6',['costMin','costPercent']],
  ['Pantheon','gods','2e7b9cfdaf847cc51f0d42ed06943462111f88cb779bc6f62645e1e632431867',[]],
  ['Market','goods','9d60751475062efc023e776280a0daad7418b369bd7f412f8f3b1cda8eca7c4e',[]],
];
const minigames=[];
for(const [name,registry,expectedHash,fields]of modules){
  const filename=`minigame${name}.js`,raw=await readFile(path.join(root,filename),'utf8');
  const sha256=createHash('sha256').update(raw).digest('hex');if(sha256!==expectedHash)throw new Error(`Checksum mismatch: ${filename}`);
  const parsed=parse(raw,{ecmaVersion:2020,locations:true});let object;
  walk(parsed,n=>{if(n.type==='AssignmentExpression'&&n.left.object?.name==='M'&&n.left.property?.name===registry)object=n.right;});
  const names=object.properties.map(p=>p.key.value??p.key.name);
  const entries=object.properties.map((p,i)=>{
    const props=Object.fromEntries(p.value.properties.map(p=>[p.key.name??p.key.value,p.value]));
    const values=Object.fromEntries(fields.map(f=>[f,numeric(props[f])]));
    const children=props.children?.elements?.map(n=>`${name.toLowerCase()}-${names.indexOf(n.value)+1}`)??null;
    return {id:`${name.toLowerCase()}-${i+1}`,name:`${{Garden:'育種標本',Grimoire:'風の術式',Pantheon:'星の守り',Market:'交易品'}[name]} ${i+1}`,values,children,source:{file:filename,line:p.loc.start.line,endLine:p.loc.end.line},effects:null,transitions:null,status:'numeric-metadata-only'};
  });
  minigames.push({id:name.toLowerCase(),source:{file:filename,sha256,commit},entries,status:'not-implemented',missing:['effect semantics','ordered random draws','state transitions','cross-system effects','offline behavior']});
}
await writeFile('spec/minigames.v2.058.json',JSON.stringify({targetVersion:'2.058',commit,minigames},null,2)+'\n');
