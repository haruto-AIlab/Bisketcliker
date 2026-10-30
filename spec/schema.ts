// null means unresolved; consumers must never substitute a guessed default.
export type EvidenceStatus = 'pinned-mirror' | 'report-only' | 'unresolved';
export interface SourceLocation { file: string; line: number; endLine: number }
export interface Facility { id: string; referenceId: number; name: string; baseCost: number; baseCps: number; source: SourceLocation }
export type CoreEffect = { kind: 'building-multiply' | 'cursor-click-double' | 'noncursor-add' | 'noncursor-multiply'; value: number };
export interface CoreUpgrade { id: string; name: string; building: string; tier: number; price: number; unlockAt: number; effect: CoreEffect; source: SourceLocation }
export interface OwnershipAchievement { id: string; name: string; condition: {kind:'owned';building:string;at:number}; milk:number; source:SourceLocation }
export interface UnresolvedDeclaration { id:string; kind:string; source:SourceLocation; literalPrice:number|null; numericPower:number|null; condition:null; effect:null; status:'requires-semantic-review' }
export interface MinigameMetadata { id:string; name:string; values:Record<string,number|null>; children:string[]|null; source:SourceLocation; effects:null; transitions:null; status:'numeric-metadata-only' }

export interface ProgressionCondition { kind:'earned'|'handmade'|'milk'|'grandma-synergy'|'synergy'|'prestige-power'|'research-lab'|'research'|'golden-clicks'|'pledges'; at?:number; building?:string; other?:string; require?:string|null; previous?:string|null }
export interface ProgressionUpgrade { id:string; name:string; price:number; condition:ProgressionCondition; effect:{kind:string; value?:number; building?:string; low?:string; high?:string; step?:number}; source:SourceLocation }
export interface HeavenlyNode { id:string; name:string; price:number|null; effect:string|null; parents:string[]; supported:boolean; building?:string; tier?:number; source:SourceLocation }
export interface ResearchState { next:string|null; remainingMs:number }
export interface ElderState { stage:number; pledgeMs:number; pledges:number; covenant:boolean }
export interface ParasiteState { id:number; arrivalMs:number; sucked:number; shiny:boolean }
