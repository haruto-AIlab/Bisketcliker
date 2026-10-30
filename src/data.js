import spec from './spec/core.js';
export const rules = Object.freeze({ version: 2, targetVersion: spec.targetVersion, baseClick: 1, priceGrowth: 1.15 });
export const facilities = spec.facilities.map(f => ({...f,icon:['◉','♧','❧','◇','▥','▤','✧','⌁','△','⚗','◎','◷','◈','◭','✣','∞','⌘','☁','◌','✺'][f.referenceId],description:`基本生産 ${f.baseCps.toLocaleString('ja-JP')} 枚 / 秒` }));
export const upgrades = spec.upgrades;
export const achievements = spec.achievements;
// Confirmed scalar buffs only. No random spawner in this increment.
export const buffDefinitions = Object.freeze({
  'warm-rush': {name:'焼成の追い風',target:'production',multiplier:7,durationMs:77000},
  'ancient-rush': {name:'太古の熱風',target:'production',multiplier:666,durationMs:6000},
  'cold-oven': {name:'炉の冷え込み',target:'production',multiplier:0.5,durationMs:66000},
  'hand-rush': {name:'手しごとの極意',target:'click',multiplier:777,durationMs:13000},
});
