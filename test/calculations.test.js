import {test} from 'node:test';
import assert from 'node:assert/strict';
import {prestigeLevel,prestigeThreshold,sugarBakingMultiplier,agingReductionMs,gloveMultiplier,milkMultiplier,cookieMultiplier,centuryMultiplier,luckyReward,spawnHazard,dropSuccessProbability} from '../src/calculations.js';
test('prestige uses reference Math.pow floor, including floating-point boundary behavior',()=>{
  assert.equal(prestigeLevel(1e12-1),0);assert.equal(prestigeLevel(1e12),1);assert.equal(prestigeLevel(8e12),2);assert.equal(prestigeThreshold(100),1e18);
});
test('sugar caps at 100 and attendant aging at 600',()=>{assert.equal(sugarBakingMultiplier(99),1.99);assert.equal(sugarBakingMultiplier(100),2);assert.equal(sugarBakingMultiplier(101),2);assert.equal(agingReductionMs(599),3594000);assert.equal(agingReductionMs(600),3600000);assert.equal(agingReductionMs(601),3600000);});
test('glove cap is 10 unless extended to 20',()=>{assert.equal(gloveMultiplier(20),1.5);assert.equal(gloveMultiplier(19,true),1.9500000000000002);assert.equal(gloveMultiplier(21,true),2);});
test('cookie and milk factors multiply independently',()=>{assert.equal(cookieMultiplier([5,5]),1.05*1.05);assert.equal(milkMultiplier(2,[.1,.125],1.05),(1+2*.1*1.05)*(1+2*.125*1.05));});
test('century growth is cubic with 10-second quantization and 100-day cap',()=>{assert.equal(centuryMultiplier(-1),1);assert.equal(centuryMultiplier(9999),1);assert.equal(centuryMultiplier(50*86400000),1.0875);assert.equal(centuryMultiplier(101*86400000),1.1);});
test('lucky bank/cps cap applies before gain factor, +13 outside multiplier',()=>{assert.equal(luckyReward(100,100,2),43);assert.equal(luckyReward(1e6,1,2),1813);assert.equal(luckyReward(0,100,7),13);});
test('golden spawn is per-frame fifth-power hazard, not uniform interval',()=>{assert.equal(spawnHazard(8999,9000,27000),0);assert.equal(spawnHazard(9000,9000,27000),0);assert.equal(spawnHazard(18000,9000,27000),.03125);assert.equal(spawnHazard(27000,9000,27000),1);});
test('v2.058 drop enhancement acts as exponent on failure chance',()=>{assert.equal(dropSuccessProbability(.9,2),1-.9**2);assert.equal(dropSuccessProbability(0,5),1);assert.equal(dropSuccessProbability(1,5),0);});
