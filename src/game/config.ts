import { ZoneId, Quest } from './types';

export const GAME_W = 960;
export const GAME_H = 540;
export const TILE = 24;

export const ZONES: { id: ZoneId; name: string; colorTop: string; colorBot: string; floor: string; safe: boolean; music: string; }[] = [
  { id:0, name:'EMBERWICK', colorTop:'#18241d', colorBot:'#0e1812', floor:'#203027', safe:true, music:'village' },
  { id:1, name:'GLOOMWOOD', colorTop:'#11211b', colorBot:'#0a1613', floor:'#1a2b20', safe:false, music:'woods' },
  { id:2, name:'SCORCHED WASTES', colorTop:'#2e1f0a', colorBot:'#1a1206', floor:'#3a2a14', safe:false, music:'desert' },
  { id:3, name:'HOLLOW DEPTH', colorTop:'#221522', colorBot:'#10101a', floor:'#2a1b2e', safe:false, music:'dungeon' },
  { id:4, name:'ABYSSAL SANCTUM', colorTop:'#0a0812', colorBot:'#05040a', floor:'#161226', safe:false, music:'sanctum' },
];

export const getInitialQuests = (): Quest[] => [
  { id:'floor', title:'FLOOR RUNNER', desc:'Descend deeper into the dungeon', target:10, progress:0, done:false, zoneHint:'any' },
  { id:'kills', title:'MONSTER SLAYER', desc:'Defeat dungeon monsters', target:25, progress:0, done:false, zoneHint:'any' },
  { id:'coins', title:'GOLD COLLECTOR', desc:'Gather coins from fallen foes', target:50, progress:0, done:false, zoneHint:'any' },
  { id:'bosses', title:'BOSS CRUSHER', desc:'Defeat floor mini-bosses', target:3, progress:0, done:false, zoneHint:'any' },
];

export function getFloorTheme(floor: number) {
  if (floor === 0) return ZONES[0];
  const cycle = Math.floor((floor - 1) / 3) % 4;
  return ZONES[cycle + 1];
}

export const ENEMY_STATS: Record<string, { hp: number; dmg: number; spd: number; attackCd: number }> = {
  slime:          { hp: 30,  dmg: 8,  spd: 0.88, attackCd: 68 },
  bat:            { hp: 22,  dmg: 6,  spd: 1.62, attackCd: 68 },
  goblin:         { hp: 58,  dmg: 13, spd: 1.12, attackCd: 68 },
  scorpion:       { hp: 45,  dmg: 11, spd: 1.30, attackCd: 52 },
  wraith:         { hp: 36,  dmg: 14, spd: 1.70, attackCd: 58 },
  skeleton:       { hp: 72,  dmg: 16, spd: 0.80, attackCd: 78 },
  boss:           { hp: 340, dmg: 19, spd: 0.92, attackCd: 36 },
  sandwyrm:       { hp: 200, dmg: 15, spd: 0.70, attackCd: 44 },
  shadow_warden:  { hp: 520, dmg: 22, spd: 1.00, attackCd: 32 },
};

export const XP_PER_LEVEL = (level: number) => level * 48 + 10;

export interface ShopItem {
  id: string;
  name: string;
  desc: string;
  cost: number;
  costMult: number;
}

export const SHOP_ITEMS: ShopItem[] = [
  { id: 'potion', name: 'HEALTH POTION', desc: 'Restores 35 HP instantly', cost: 5, costMult: 1 },
  { id: 'sword', name: 'SHARP SWORD', desc: 'Increase sword damage by +6', cost: 12, costMult: 1.35 },
  { id: 'boots', name: 'SWIFT BOOTS', desc: '+20% Speed, dash CD reduced', cost: 18, costMult: 1 },
  { id: 'armor', name: 'PLATE ARMOR', desc: 'Increase Max HP by +25 & full heal', cost: 22, costMult: 1 },
];

export interface Perk {
  id: string;
  name: string;
  desc: string;
}

export const ALL_PERKS: Perk[] = [
  { id: 'sword', name: 'SWORD MASTER', desc: 'Gain +6 base damage to your sword strikes' },
  { id: 'speed', name: 'SWIFT FOOT', desc: '+15% Move Speed and -15% Dash Cooldown' },
  { id: 'hp', name: 'GIANT BLOOD', desc: 'Gain +25 Max HP and restore health to full' },
  { id: 'fireball', name: 'FLAME BLESSING', desc: 'Sword attacks launch piercing fireballs' },
  { id: 'vampire', name: 'SOUL EATER', desc: 'Defeated enemies restore +3 HP' },
  { id: 'lightning', name: 'THUNDER SPELL', desc: 'Call down lightning bolts to strike and stun random nearby enemies' },
  { id: 'shield', name: 'SHIELD AURA', desc: 'Summon a spinning orbital shield that damages any enemy it contacts' }
];

// Wave definitions for zone 4 (Abyssal Sanctum)
export const WAVE_DEFS: { enemies: { type: string; count: number }[] }[] = [
  { enemies: [{ type: 'wraith', count: 4 }, { type: 'skeleton', count: 2 }] },
  { enemies: [{ type: 'wraith', count: 6 }, { type: 'skeleton', count: 3 }, { type: 'goblin', count: 2 }] },
  { enemies: [{ type: 'wraith', count: 4 }, { type: 'skeleton', count: 4 }, { type: 'scorpion', count: 2 }] },
];
