// Verified individual formulas for later stages; not a complete progression engine.
export const prestigeLevel = total => Math.floor(Math.pow(total / 1e12,1/3));
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
