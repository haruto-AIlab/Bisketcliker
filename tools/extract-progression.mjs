import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {parse} from 'acorn';
const raw=await readFile(process.argv[2],'utf8');
if(createHash('sha256').update(raw).digest('hex')!=='10068dd439fc07f6f582db24ed8d9407866a7550409fd15efcd511f1893d8442')throw Error('Wrong reference');
const ast=parse(raw,{ecmaVersion:2020,locations:true}),nodes=[];
function walk(n){if(!n||typeof n!=='object')return;if(n.type)nodes.push(n);for(const[k,v]of Object.entries(n))if(k!=='loc'){if(Array.isArray(v))v.forEach(walk);else if(v&&typeof v==='object')walk(v);}}walk(ast);
const member=n=>n?.object?.name==='Game'?n.property?.name:null;
function val(n){if(n?.type==='Literal')return n.value;if(n?.type==='Identifier')return {angelPriceFactor:7}[n.name]??null;if(n?.type==='UnaryExpression'&&n.operator==='-')return -val(n.argument);if(n?.type==='BinaryExpression'){const a=val(n.left),b=val(n.right);if(typeof a!=='number'||typeof b!=='number')return null;return {'*':()=>a*b,'+':()=>a+b,'-':()=>a-b,'/':()=>a/b}[n.operator]?.()??null;}if(n?.type==='CallExpression'&&n.callee.object?.name==='Math'&&n.callee.property.name==='pow'){const a=val(n.arguments[0]),b=val(n.arguments[1]);return typeof a==='number'&&typeof b==='number'?a**b:null;}if(n?.type==='ArrayExpression')return n.elements.map(val);return null;}
const loc=n=>({file:'main.js',line:n.loc.start.line,endLine:n.loc.end.line});
const core=JSON.parse(await readFile('spec/core.v2.058.json'));
const originalBuildings=nodes.filter(n=>n.type==='NewExpression'&&member(n.callee)==='Object'&&typeof n.arguments[0]?.value==='string').map(n=>n.arguments[0].value);
const f=name=>core.facilities[originalBuildings.indexOf(name)];
const events=nodes.filter(n=>['NewExpression','CallExpression'].includes(n.type)&&['Upgrade','TieredUpgrade','NewUpgradeCookie','GrandmaSynergy','SynergyUpgrade'].includes(member(n.callee))).sort((a,b)=>a.start-b.start);
const defs=new Map();for(const n of events)if(member(n.callee)==='Upgrade'&&typeof val(n.arguments[0])==='string')defs.set(val(n.arguments[0]),{node:n,price:val(n.arguments[2]),pool:'',parents:[]});
for(const n of nodes)if(n.type==='AssignmentExpression'&&n.left.object?.type==='MemberExpression'&&member(n.left.object)==='last'){
 const previous=events.filter(e=>e.start<n.start).at(-1);const d=defs.get(val(previous?.arguments?.[0]));if(!d)continue;
 const key=n.left.property.name;if(['pool','parents'].includes(key))d[key]=val(n.right);
}
const normal=[],heaven=[],unresolved=[];
const supported=new Map([
 ['Heavenly cookies',['heavenly-cookie','巡る焼き印','heavenly-cookie']],['Wrinkly cookies',['aged-cookie','熟成の焼き印','heavenly-cookie']],['Chimera',['chimera','重なる夢','chimera']],
 ['Legacy',['legacy','巡りの継承','legacy']],['Twin Gates of Transcendence',['offline-gate','眠れる工房','offline-gate']],
 ['Persistent memory',['research-memory','研究記録の継承','research-memory']],['Divine discount',['building-discount','施設の優待','building-discount']],['Divine sales',['upgrade-discount','知恵の優待','upgrade-discount']],['Divine bakeries',['cookie-discount','焼き印の優待','cookie-discount']],
 ['Heavenly luck',['event-frequency','星明かりの道','event-frequency']],['Lasting fortune',['event-duration','長い追い風','event-duration']],['Decisive fate',['event-life','消えない光','event-life']],
 ['Unholy bait',['wrinkler-bait','蜜の誘い','wrinkler-bait']],['Sacrilegious corruption',['wrinkler-payout','濃い蜜','wrinkler-payout']],['Elder spice',['wrinkler-slots','蜜の居場所','wrinkler-slots']],
 ['Starter kit',['free-cursors','手しごとの贈り物','free-cursors']],['Starter kitchen',['free-grandmas','炉守りの贈り物','free-grandmas']],['Halo gloves',['click-boost','光の手袋','click-boost']],
 ['Kitten angels',['milk-spirit','乳白の守り','milk-spirit']],['Kitten wages',['kitten-discount','守り手の優待','kitten-discount']],
 ['Synergies Vol. I',['synergy-book-1','共鳴の書・上','synergy-book']],['Synergies Vol. II',['synergy-book-2','共鳴の書・下','synergy-book']],
 ['Tin of british tea biscuits',['recipe-box-1','焼き印の箱・一','recipe-box']],['Box of macarons',['recipe-box-2','焼き印の箱・二','recipe-box']],['Box of brand biscuits',['recipe-box-3','焼き印の箱・三','recipe-box']],['Tin of butter cookies',['recipe-box-4','焼き印の箱・四','recipe-box']],
]);
for(const[names,prefix,type]of [[['Angels','Archangels','Virtues','Dominions','Cherubim','Seraphim','God'],'offline-rate','offline-rate'],[['Belphegor','Mammon','Abaddon','Satan','Asmodeus','Beelzebub','Lucifer'],'offline-time','offline-time']])names.forEach((name,i)=>supported.set(name,[`${prefix}-${i+1}`,`${type==='offline-rate'?'眠りの生産':'眠りの持続'} ${i+1}`,type]));
for(const [i,roman] of ['I','II','III','IV','V'].entries())supported.set('Permanent upgrade slot '+roman,[`permanent-${i+1}`,`永続の記憶 ${i+1}`,'permanent']);
const heavenNames=[...defs].filter(([,d])=>d.pool==='prestige').map(([name])=>name);
for(const name of heavenNames){const d=defs.get(name),effect=supported.get(name),id=effect?.[0]??`heaven-pending-${d.node.loc.start.line}`;heaven.push({id,name:effect?.[1]??`未監査の天界節点 ${d.node.loc.start.line}`,price:typeof d.price==='number'?d.price:null,effect:effect?.[2]??null,parents:d.parents.map(p=>supported.get(p)?.[0]??`heaven-pending-${defs.get(p)?.node.loc.start.line??'unknown'}`),supported:!!effect,source:loc(d.node)});}
// In the reference, unparented heavenly upgrades are attached to Legacy later.
for(const h of heaven)if(h.id!=='legacy'&&!h.parents.length)h.parents=['legacy'];
let cookieCount=0;
for(const n of nodes)if(n.type==='CallExpression'&&member(n.callee)==='NewUpgradeCookie'&&n.arguments[0]?.type==='ObjectExpression'){
 const p=Object.fromEntries(n.arguments[0].properties.map(p=>[p.key.name??p.key.value,p.value]));cookieCount++;const price=val(p.price),power=val(p.power),require=val(p.require);const requirement=require?supported.get(require)?.[0]:null;
 if(typeof price!=='number'||typeof power!=='number'||val(p.locked)||p.season||(require&&!requirement)){unresolved.push({id:`recipe-${cookieCount}`,source:loc(n),reason:'dynamic-power-or-special-unlock',effect:null});continue;}
 normal.push({id:`recipe-${cookieCount}`,name:`焼き印のレシピ ${cookieCount}`,price,condition:{kind:'earned',at:price/20,require:requirement},effect:{kind:'cookie-multiply',value:power},source:loc(n)});
}
const threshold=new Map();
for(const n of nodes)if(n.type==='IfStatement'&&n.test.type==='BinaryExpression'&&n.test.operator==='>='&&n.test.left.type==='MemberExpression'&&n.test.left.object.name==='Game'){
 const key=n.test.left.property.name,at=val(n.test.right);if(!['milkProgress','handmadeCookies'].includes(key)||typeof at!=='number')continue;
 const sub=[];function calls(x){if(!x||typeof x!=='object')return;if(x.type==='CallExpression'&&member(x.callee)==='Unlock')sub.push(val(x.arguments[0]));for(const[k,v]of Object.entries(x))if(k!=='loc'){if(Array.isArray(v))v.forEach(calls);else if(v&&typeof v==='object')calls(v);}}calls(n.consequent);for(const name of sub)if(typeof name==='string')threshold.set(name,{kind:key==='milkProgress'?'milk':'handmade',at});
}
const kittenCoefficients=new Map();for(const line of raw.split('\n')){const match=line.match(/if \(Game.Has\('([^']+)'\)\) catMult\*=\(1\+Game.milkProgress\*([\d.]+)/);if(match)kittenCoefficients.set(match[1],Number(match[2]));}
for(const[name,condition]of threshold){const d=defs.get(name);if(!d||typeof d.price!=='number')continue;const kitten=kittenCoefficients.get(name);if(kitten||condition.kind==='handmade')normal.push({id:kitten?`milk-helper-${normal.filter(u=>u.effect.kind==='kitten').length+1}`:`mouse-${normal.filter(u=>u.effect.kind==='mouse').length+1}`,name:kitten?`乳白の守り手 ${condition.at}`:`手のひらの技法 ${Math.log10(condition.at)}`,price:d.price,condition,effect:{kind:kitten?'kitten':'mouse',value:kitten??.01},source:loc(d.node)});}
for(const n of nodes)if(n.type==='CallExpression'&&member(n.callee)==='GrandmaSynergy'&&f(val(n.arguments[2]))){const b=f(val(n.arguments[2]));normal.push({id:`attendant-${b.id}`,name:`${b.name}の炉守り`,price:b.baseCost*50,condition:{kind:'grandma-synergy',building:b.id,at:15},effect:{kind:'grandma-synergy',building:b.id,value:2},source:loc(n)});}
for(const n of nodes)if(n.type==='CallExpression'&&member(n.callee)==='SynergyUpgrade'){
 let a=f(val(n.arguments[2])),b=f(val(n.arguments[3]));if(!a||!b)continue;if(a.baseCost>b.baseCost)[a,b]=[b,a];const tier=val(n.arguments[4])==='synergy1'?1:2;
 normal.push({id:`pair-${a.id}-${b.id}-${tier}`,name:`${a.name}と${b.name}の共鳴 ${tier}`,price:(a.baseCost*10+b.baseCost)*(tier===1?2e5:2e11),condition:{kind:'synergy',building:a.id,other:b.id,at:tier===1?15:75,require:`synergy-book-${tier}`},effect:{kind:'synergy',low:a.id,high:b.id},source:loc(n)});
}
const prestigeNames=['Heavenly chip secret','Heavenly cookie stand','Heavenly bakery','Heavenly confectionery','Heavenly key'];
prestigeNames.forEach((name,i)=>{const d=defs.get(name);normal.push({id:`prestige-power-${i+1}`,name:`巡りの力 ${i+1}`,price:d.price,condition:{kind:'prestige-power',previous:i?`prestige-power-${i}`:null},effect:{kind:'prestige-power',value:[.05,.2,.25,.25,.25][i]},source:loc(d.node)});});
const researchNames=['Bingo center/Research facility','Specialized chocolate chips','Designer cocoa beans','Ritual rolling pins','Underworld ovens','One mind','Exotic nuts','Communal brainsweep','Arcane sugar','Elder Pact'];
researchNames.forEach((name,i)=>{const d=defs.get(name);normal.push({id:i?`research-${i}`:'research-lab',name:i?['','微細な焼き印','流線の素材','炉守りの儀礼','深層の熱','心の集結','異郷の素材','意思の共鳴','秘めた甘み','太古との契約'][i]:'炉守り研究棟',price:d.price,condition:{kind:i?'research':'research-lab'},effect:{kind:'research',step:i},source:loc(d.node)});});
for(const[name,id,label,at]of [['Lucky day','event-upgrade-1','星の訪れ',7],['Serendipity','event-upgrade-2','星の巡り',27],['Get lucky','event-upgrade-3','続く追い風',77]]){const d=defs.get(name);normal.push({id,name:label,price:d.price,condition:{kind:'golden-clicks',at},effect:{kind:'golden'},source:loc(d.node)});}
for(const[name,id,label]of [['Sacrificial rolling pins','long-pledge','長い休戦'],['Elder spice','unused-normal-spice','unused']]){const d=defs.get(name);if(d?.pool==='prestige')continue;if(d)normal.push({id,name:label,price:d.price,condition:{kind:'pledges',at:10},effect:{kind:'long-pledge'},source:loc(d.node)});}
for(const n of nodes)if(n.type==='CallExpression'&&['NewUnshackleBuilding','NewUnshackleUpgradeTier'].includes(member(n.callee))&&n.arguments[0]?.type==='ObjectExpression'){
 const p=Object.fromEntries(n.arguments[0].properties.map(p=>[p.key.name??p.key.value,p.value]));const b=f(val(p.building)),tier=val(p.tier);
 if(b)heaven.push({id:`unshackle-${b.id}`,name:`${b.name}の解放`,price:Math.pow(b.referenceId+1,7)*15000000,effect:'unshackle-building',building:b.id,parents:[b.referenceId?`unshackle-${core.facilities[b.referenceId-1].id}`:'unshackle-tier-1'],supported:true,source:loc(n)});
 else if(typeof tier==='number')heaven.push({id:`unshackle-tier-${tier}`,name:`改良段階${tier}の解放`,price:Math.pow(tier,7.5)*10000000,effect:'unshackle-tier',tier,parents:[tier===1?`heaven-pending-${defs.get('Label printer').node.loc.start.line}`:`unshackle-tier-${tier-1}`],supported:true,source:loc(n)});
}
if(heaven.length!==129)throw Error(`Heaven data incomplete: ${heaven.length}`);
const extraAchievements=[];
for(const kind of ['BankAchievement','CpsAchievement']){let i=0;for(const n of nodes)if(n.type==='CallExpression'&&member(n.callee)===kind&&typeof val(n.arguments[0])==='string'){const earned=kind==='BankAchievement';const at=earned?(i===0?1:10**Math.floor(i*1.5+2)):10**Math.floor(i*1.2);extraAchievements.push({id:`${earned?'baked':'rate'}-${i}`,name:`${earned?'焼き上げ':'生産速度'}の記録 ${i+1}`,condition:{kind:earned?'earned':'raw-cps',at},milk:.04,source:loc(n)});i++;}}
for(let i=0;i<15;i++)extraAchievements.push({id:`handmade-${i}`,name:`手しごとの記録 ${i+1}`,condition:{kind:'handmade',at:10**(3+i*2)},milk:.04,source:{file:'main.js',line:16820+i,endLine:16820+i}});
for(const [at,id]of [[7,'elder-crafts'],[14,'elder-veteran']])extraAchievements.push({id,name:`炉守りの連携 ${at}`,condition:{kind:'synergy-count',at},milk:.04,source:{file:'main.js',line:16890,endLine:16892}});
const output={targetVersion:'2.058',referenceCommit:'c77f00c51854a667da35a3135120797a579c2d72',normal,heaven,achievements:extraAchievements,unresolved};
await writeFile('spec/progression.v2.058.json',JSON.stringify(output,null,2)+'\n');await writeFile('src/spec/progression.js','// Numeric mechanics with independent presentation names.\nexport default '+JSON.stringify(output)+';\n');console.log({normal:normal.length,heaven:heaven.length,supported:heaven.filter(h=>h.supported).length,achievements:extraAchievements.length,unresolved:unresolved.length});
