// Research-only oracle: executes selected, checksum-pinned mathematical routines
// in an isolated VM. Upstream source stays outside the application/repository.
import { readFile,writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import vm from 'node:vm';
import { parse } from 'acorn';
const text=await readFile(process.argv[2],'utf8');
const hash=createHash('sha256').update(text).digest('hex');
if(hash!=='10068dd439fc07f6f582db24ed8d9407866a7550409fd15efcd511f1893d8442')throw new Error('Reference checksum mismatch');
const tree=parse(text,{ecmaVersion:2020,locations:true}),nodes=[];
function walk(n){if(!n||typeof n!=='object')return;if(n.type)nodes.push(n);for(const [k,v]of Object.entries(n))if(k!=='loc'){if(Array.isArray(v))v.forEach(walk);else if(v&&typeof v==='object')walk(v);}}walk(tree);
const assignment=(object,property)=>nodes.find(n=>n.type==='AssignmentExpression'&&n.left.object?.name===object&&n.left.property?.name===property);
function method(property){const n=nodes.find(n=>n.type==='AssignmentExpression'&&n.left.object?.type==='ThisExpression'&&n.left.property?.name===property);if(!n)throw new Error(property);return text.slice(n.right.start,n.right.end);}
function run(expression,Game,me){const context=vm.createContext({Game,me});return vm.runInContext(expression,context,{timeout:1000});}
const start=text.indexOf('this.n=this.id;'),end=text.indexOf('this.totalCookies=0;',start);
const numericInit=text.slice(start,end);
const prices=[],buildings=[];
for(let id=0;id<20;id++){
  const me={id,basePrice:15,baseCps:.1,amount:0,free:0};
  run(`(function(){${numericInit}}).call(me)`,{},me);
  buildings.push({id,baseCost:me.basePrice,baseCps:me.baseCps});
  for(const owned of [0,1,5,25,100,600])for(const quantity of [1,10,100]){
    me.amount=owned;
    const Game={priceIncrease:1.15,modifyBuildingPrice:(_b,p)=>p};
    const quote=run(`(${method('getSumPrice')}).call(me,${quantity})`,Game,me);
    let paid=0;
    for(let i=0;i<quantity;i++){me.amount=owned+i;paid+=run(`(${method('getPrice')}).call(me)`,Game,me);}
    prices.push({building:id,owned,quantity,quote,paid});
  }
}
const cursorNode=nodes.find(n=>n.type==='NewExpression'&&n.callee.object?.name==='Game'&&n.callee.property?.name==='Object'&&n.arguments[0]?.value==='Cursor');
const cursorSource=text.slice(cursorNode.arguments[7].start,cursorNode.arguments[7].end);
const mouse=assignment('Game','mouseCps').right,compute=assignment('Game','ComputeCps').right;
const names=['Reinforced index finger','Carpal tunnel prevention cream','Ambidextrous','Thousand fingers','Million fingers','Billion fingers','Trillion fingers','Quadrillion fingers','Quintillion fingers','Sextillion fingers','Septillion fingers','Octillion fingers','Nonillion fingers','Decillion fingers','Undecillion fingers'];
const cursors=[];
for(const tiers of [[],[1],[2],[1,2,3],[4],[1,2,3,4],[4,5,6],[...Array(15)].map((_,i)=>i+1)])for(const nonCursor of [0,1,100]){
  const purchased=new Set(tiers.map(t=>names[t-1]));
  const Game={Has:n=>Number(purchased.has(n)),Objects:{Cursor:{name:'Cursor',amount:10},Grandma:{name:'Grandma',amount:nonCursor}},GetTieredCpsMult:()=>1,magicCpS:()=>1,eff:()=>1,auraMult:()=>0,buffs:{},cookiesPs:0,runModHookOnValue:(_key,value)=>value,hasBuff:()=>false};
  const context=vm.createContext({Game,me:Game.Objects.Cursor});
  vm.runInContext(`Game.ComputeCps=${text.slice(compute.start,compute.end)}`,context,{timeout:1000});
  const unit=vm.runInContext(`(${cursorSource})(me)`,context,{timeout:1000});
  const click=vm.runInContext(`(${text.slice(mouse.start,mouse.end)})()`,context,{timeout:1000});
  cursors.push({tiers,nonCursor,unit,click});
}
await writeFile('test/fixtures/reference-core.json',JSON.stringify({commit:'c77f00c51854a667da35a3135120797a579c2d72',sha256:hash,method:'selected functions from pinned source mirror; not a live-game comparison',buildings,prices,cursors},null,2)+'\n');
console.log(JSON.stringify({buildings:buildings.length,priceCases:prices.length,cursorCases:cursors.length}));
