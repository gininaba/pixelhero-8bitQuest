export type GamePhase = 'menu' | 'playing' | 'paused' | 'gameover' | 'victory' | 'dialog' | 'shop' | 'levelup';
export type ZoneId = 0 | 1 | 2 | 3 | 4;
export type Facing = 'up' | 'down' | 'left' | 'right';

export interface Vec { x: number; y: number; }

export interface Player {
  x: number; y: number;
  vx: number; vy: number;
  hp: number; maxHp: number;
  facing: Facing;
  attackCd: number;
  attackActive: number;
  dashCd: number;
  dashTime: number;
  invuln: number;
  level: number;
  xp: number;
  coins: number;
  spriteBob: number;
  // Upgrades
  damageBonus: number;
  speedBonus: number;
  dashCdMax: number;
  hasFireball: boolean;
  hasVampire: boolean;
  hasShield: boolean;
  hasLightning: boolean;
}

export interface Enemy {
  id: number;
  type: 'slime' | 'bat' | 'goblin' | 'boss' | 'scorpion' | 'wraith' | 'skeleton' | 'sandwyrm' | 'shadow_warden';
  x: number; y: number;
  vx: number; vy: number;
  hp: number; maxHp: number;
  hitFlash: number;
  stun: number;
  wander: number;
  attackCd: number;
  // Boss attack states (shared by boss, sandwyrm, shadow_warden)
  bossChargeState?: 'idle' | 'warning' | 'charge';
  bossChargeTimer?: number;
  bossChargeDir?: Vec;
  bossStompTimer?: number;
  // Sand Wyrm states
  burrowTimer?: number;
  burrowed?: boolean;
  // Shadow Warden states
  teleportTimer?: number;
  laserTimer?: number;
  laserAngle?: number;
  cloneIds?: number[];
  isClone?: boolean;
}

export interface Projectile {
  id: number;
  type: 'fireball' | 'boss_bullet' | 'sand_blast' | 'laser';
  x: number; y: number;
  vx: number; vy: number;
  active: boolean;
  life: number;
}

export interface Decor {
  id: number;
  type: 'grass' | 'flower' | 'rock' | 'mushroom' | 'cactus' | 'bones' | 'pillar' | 'rune' | 'stairs' | 'merchant';
  x: number; y: number;
  variant: number;
}

export interface Drop {
  id: number;
  type: 'coin' | 'herb' | 'heart' | 'key' | 'relic' | 'hollow_key' | 'sanctum_seal';
  x: number; y: number;
  bob: number;
  taken: boolean;
  active?: boolean;
}

export interface Particle {
  x: number; y: number;
  vx: number; vy: number;
  life: number; maxLife: number;
  color: string;
  size: number;
  gravity?: number;
  active?: boolean;
}

export interface FloatText {
  x: number; y: number;
  text: string;
  life: number;
  color: string;
  vy: number;
  active?: boolean;
}

export interface Quest {
  id: string;
  title: string;
  desc: string;
  target: number;
  progress: number;
  done: boolean;
  zoneHint: ZoneId | 'any';
}

export interface HighScore {
  name: string;
  score: number;
  day: string;
  ngPlus?: boolean;
}

export interface GameState {
  phase: GamePhase;
  zone: ZoneId;
  time: number;
  frame: number;
  kills: number;
  score: number;
  hitStop: number;
  shake: number;
  camera: Vec;
  player: Player | null;
  enemies: Enemy[];
  drops: Drop[];
  particles: Particle[];
  floaters: FloatText[];
  quests: Quest[];
  bossSpawned: boolean;
  elderTalked: boolean;
  hasKey: boolean;
  gameStartTime: number;
  // Overhaul states
  projectiles: Projectile[];
  decor: Decor[];
  perkChoices: string[];
  // Content expansion states
  hasHollowKey: boolean;
  hasSanctumSeal: boolean;
  sandwyrmDefeated: boolean;
  grukDefeated: boolean;
  // Wave system (zone 4)
  waveNumber: number;
  waveTimer: number;
  waveCleared: boolean;
  waveEnemiesLeft: number;
  // New Game+
  ngPlus: boolean;
  ngPlusLevel: number;
  // Infinite Dungeon
  dungeonFloor: number;
  lightningStrike: { x: number; y: number; life: number } | null;
}
