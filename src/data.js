import spec from './spec/core.js';
import progression from './spec/progression.js';
export const rules = Object.freeze({ version: 3, targetVersion: spec.targetVersion, baseClick: 1, priceGrowth: 1.15 });
export const facilities = spec.facilities.map(f => ({...f,icon:['◉','♧','❧','◇','▥','▤','✧','⌁','△','⚗','◎','◷','◈','◭','✣','∞','⌘','☁','◌','✺'][f.referenceId],description:`基本生産 ${f.baseCps.toLocaleString('ja-JP')} 枚 / 秒` }));
export const upgrades = [...spec.upgrades,...progression.normal];
export const heavenlyUpgrades = progression.heaven;
export const achievements = [...spec.achievements,...progression.achievements];
// Confirmed scalar buffs only. No random spawner in this increment.
export const buffDefinitions = Object.freeze({
  'warm-rush': {name:'焼成の追い風',target:'production',multiplier:7,durationMs:77000},
  'ancient-rush': {name:'太古の熱風',target:'production',multiplier:666,durationMs:6000},
  'cold-oven': {name:'炉の冷え込み',target:'production',multiplier:0.5,durationMs:66000},
  'hand-rush': {name:'手しごとの極意',target:'click',multiplier:777,durationMs:13000},
  'building-rush': {name:'施設の目覚め',target:'production',multiplier:1,durationMs:30000},
  'building-cold': {name:'施設のまどろみ',target:'production',multiplier:1,durationMs:30000},
  'cursed-hand': {name:'静寂の手',target:'production',multiplier:0,durationMs:10000},
  'cookie-storm': {name:'焼き菓子の雨',target:'none',multiplier:1,durationMs:7000},
});
