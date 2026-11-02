// Verified individual formulas for later stages; not a complete progression engine.
export function prestigeLevel(total) {
  let level=Math.floor(Math.pow(total/1e12,1/3));
  // Correct rounding at cube boundaries without adding an epsilon that grants early levels.
  if(Number.isSafeInteger(level)&&level<Number.MAX_SAFE_INTEGER){
    if(prestigeThreshold(level)>total)level--;
    else if(prestigeThreshold(level+1)<=total)level++;
  }
  return level;
}
export const prestigeThreshold = level => Math.pow(level,3)*1e12;
export const sugarBakingMultiplier = lumps => 1+Math.min(100,lumps)*.01;
export const agingReductionMs = attendants => 6000*Math.min(600,attendants);
export const gloveMultiplier = (level,luminous=false) => 1+.05*Math.min(level,luminous?20:10);
export const milkMultiplier = (milk,coefficients,boost=1) => coefficients.reduce((m,k)=>m*(1+milk*k*boost),1);
export const cookieMultiplier = percentages => percentages.reduce((m,p)=>m*(1+p*.01),1);
export function centuryMultiplier(elapsedMs) {const day=Math.max(0,Math.min(Math.floor(elapsedMs/1000/10)*10/60/60/24,100));return 1+(1-Math.pow(1-day/100,3))*.1;}
export const luckyReward = (bank,cps,gainMultiplier=1) => gainMultiplier*Math.min(bank*.15,cps*900)+13;
export const spawnHazard = (frame,minFrame,maxFrame) => Math.pow(Math.max(0,(frame-minFrame)/(maxFrame-minFrame)),5);
export const dropSuccessProbability = (failureRate,rateMultiplier=1) => 1-Math.pow(failureRate,rateMultiplier);

// Unit progression: https://nanaon.tamura-shippo.com/entertainment/game/cookie-clicker/unit/
const numberUnits=['','万','億','兆','京','垓','秭','穣','溝','澗','正','載','極','恒河沙'];
const buddhistUnits=['頻波羅','矜羯羅','阿伽羅'];
function numberUnit(group){
  let suffix='',blocks=Math.floor(group/numberUnits.length);
  for(let bit=0;blocks>0;bit++,blocks=Math.floor(blocks/2))if(blocks%2)suffix+=buddhistUnits[bit];
  return numberUnits[group%numberUnits.length]+suffix;
}
const decimalFormat=new Intl.NumberFormat('ja-JP',{maximumFractionDigits:1});
const unitFormat=new Intl.NumberFormat('ja-JP',{maximumFractionDigits:2});
export function formatNumber(value) {
  if(Number.isNaN(value))return '—';
  if(!Number.isFinite(value))return value<0?'−上限超過':'上限超過';
  const sign=value<0?'-':'';
  const magnitude=Math.abs(value);
  if(magnitude<10000)return decimalFormat.format(value);
  let group=Math.floor(Math.log10(magnitude)/4);
  let scaled=magnitude/10**(group*4);
  if(Math.round(scaled*100)/100>=10000){group++;scaled=magnitude/10**(group*4);}
  return sign+unitFormat.format(scaled)+numberUnit(group);
}
