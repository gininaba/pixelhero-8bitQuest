import { GameState, ZoneId, Enemy, Drop, Particle, FloatText } from './types';
import { GAME_W, GAME_H, ENEMY_STATS } from './config';
import { rand, nextId } from './utils';

export function spawnParticle(gr: GameState, p: Omit<Particle, 'active'>) {
  let found = false;
  for (let i = 0; i < gr.particles.length; i++) {
    if (!gr.particles[i].active) {
      gr.particles[i] = { ...p, active: true };
      found = true;
      break;
    }
  }
  if (!found) gr.particles.push({ ...p, active: true });
}

export function burstParticles(gr: GameState, x: number, y: number, n: number, color: string) {
  for (let i = 0; i < n; i++) {
    const ang = Math.random() * Math.PI * 2;
    const sp = rand(1.2, 3.9);
    spawnParticle(gr, {
      x: x + rand(-3, 3), y: y + rand(-3, 3),
      vx: Math.cos(ang) * sp,
      vy: Math.sin(ang) * sp - rand(0, 1.5),
      life: rand(18, 34),
      maxLife: 34,
      color,
      size: rand(1.4, 3.1),
      gravity: 0.092
    });
  }
}

export function spawnFloater(gr: GameState, f: Omit<FloatText, 'active'>) {
  let found = false;
  for (let i = 0; i < gr.floaters.length; i++) {
    if (!gr.floaters[i].active) {
      gr.floaters[i] = { ...f, active: true };
      found = true;
      break;
    }
  }
  if (!found) gr.floaters.push({ ...f, active: true });
}

export function spawnDrop(gr: GameState, d: Omit<Drop, 'active'>) {
  let found = false;
  for (let i = 0; i < gr.drops.length; i++) {
    if (!gr.drops[i].active) {
      gr.drops[i] = { ...d, active: true };
      found = true;
      break;
    }
  }
  if (!found) gr.drops.push({ ...d, active: true });
}

export const makeEnemy = (type: Enemy['type'], x: number, y: number, ngScale = 1): Enemy => {
  const stats = ENEMY_STATS[type];
  return {
    id: nextId(),
    type, x, y,
    vx: 0, vy: 0,
    hp: Math.floor(stats.hp * ngScale), maxHp: Math.floor(stats.hp * ngScale),
    hitFlash: 0,
    stun: 0,
    wander: Math.random() * 6,
    attackCd: rand(30, 90)
  };
};

export const seedZone = (gr: GameState, zone: ZoneId) => {
  gr.decor = [];
  gr.projectiles = []; // Clear projectiles when changing zones
  gr.bossSpawned = false; // Reset boss spawned flag so they spawn when entering their zone

  const ngScale = gr.ngPlus ? 1.5 + gr.ngPlusLevel * 0.25 : 1;

  if (zone === 0) {
    // EMBERWICK — Safe Town
    gr.enemies = [];
    gr.drops.forEach(d => d.active = false);

    for (let i = 0; i < 9; i++) {
      gr.decor.push({ id: nextId(), type: 'grass', x: rand(60, GAME_W - 60), y: rand(130, GAME_H - 70), variant: Math.floor(rand(0, 3)) });
    }
    for (let i = 0; i < 5; i++) {
      gr.decor.push({ id: nextId(), type: 'flower', x: rand(80, GAME_W - 80), y: rand(140, GAME_H - 80), variant: Math.floor(rand(0, 2)) });
    }
    for (let i = 0; i < 3; i++) {
      gr.decor.push({ id: nextId(), type: 'rock', x: rand(90, GAME_W - 90), y: rand(150, GAME_H - 90), variant: Math.floor(rand(0, 2)) });
    }

  } else if (zone === 1) {
    // PROCEDURAL INFINITE DUNGEON
    gr.enemies = [];
    gr.drops = []; // Clear old drops
    
    const floor = gr.dungeonFloor || 1;
    const cycle = Math.floor((floor - 1) / 3) % 4; // Cycles: 0=Forest, 1=Desert, 2=Dungeon, 3=Sanctum

    // Spawn stairs/portal down
    const stairsX = Math.floor(rand(650, GAME_W - 100));
    const stairsY = Math.floor(rand(180, GAME_H - 100));
    gr.decor.push({ id: nextId(), type: 'stairs', x: stairsX, y: stairsY, variant: 0 });

    // Boss floor check (every 5th floor)
    const isBossFloor = floor % 5 === 0;

    if (isBossFloor) {
      const bossType = floor === 5 ? 'sandwyrm' : floor === 10 ? 'boss' : 'shadow_warden';
      const bossX = GAME_W / 2;
      const bossY = GAME_H / 2 + 30;
      const bossScale = ngScale * (1.0 + (floor - 5) * 0.12);
      gr.enemies.push(makeEnemy(bossType, bossX, bossY, bossScale));
      
      const bossName = bossType === 'sandwyrm' ? 'SAND WYRM' : bossType === 'boss' ? 'GRUK THE ROT-TUSK' : 'SHADOW WARDEN';
      spawnFloater(gr, { x: bossX, y: bossY - 45, text: `${bossName} FLOOR`, color: '#ff3366', life: 90, vy: -0.5 });
    } else {
      // Regular Floor
      const enemyCount = Math.floor(rand(3, 5) + floor * 0.85);
      const enemyPools: Record<number, Enemy['type'][]> = {
        0: ['slime', 'bat', 'goblin'],
        1: ['scorpion', 'goblin', 'bat'],
        2: ['skeleton', 'goblin', 'wraith'],
        3: ['wraith', 'skeleton', 'scorpion']
      };
      const pool = enemyPools[cycle] || ['slime', 'bat'];

      for (let i = 0; i < enemyCount; i++) {
        // Spawn enemies away from the left start area (player starts at x=48)
        const ex = rand(260, GAME_W - 80);
        const ey = rand(150, GAME_H - 80);
        const etype = pool[Math.floor(Math.random() * pool.length)];
        const enemyScale = ngScale * (1.0 + (floor - 1) * 0.08);
        gr.enemies.push(makeEnemy(etype, ex, ey, enemyScale));
      }
    }

    // Spawn theme-specific decor
    const decorPools: Record<number, string[]> = {
      0: ['grass', 'flower', 'rock', 'mushroom'],
      1: ['cactus', 'bones', 'rock'],
      2: ['rock', 'mushroom', 'bones'],
      3: ['pillar', 'rune', 'bones']
    };
    const pDecor = decorPools[cycle] || ['rock'];
    const decorCount = Math.floor(rand(8, 14));
    for (let i = 0; i < decorCount; i++) {
      const dx = rand(150, GAME_W - 100);
      const dy = rand(150, GAME_H - 80);
      if (Math.hypot(dx - 48, dy - (GAME_H / 2)) < 60 || Math.hypot(dx - stairsX, dy - stairsY) < 40) {
        continue;
      }
      const dtype = pDecor[Math.floor(Math.random() * pDecor.length)] as any;
      gr.decor.push({ id: nextId(), type: dtype, x: dx, y: dy, variant: Math.floor(rand(0, 3)) });
    }

    // Scatter coins and hearts
    const coinCount = Math.floor(rand(2, 5));
    for (let i = 0; i < coinCount; i++) {
      spawnDrop(gr, { id: nextId(), type: 'coin', x: rand(150, GAME_W - 120), y: rand(150, GAME_H - 100), bob: Math.random() * 6.28, taken: false });
    }
    if (Math.random() < 0.35) {
      spawnDrop(gr, { id: nextId(), type: 'heart', x: rand(200, GAME_W - 200), y: rand(200, GAME_H - 120), bob: 0, taken: false });
    }

  } else if (zone === 2) {
    // SCORCHED WASTES — Desert
    gr.enemies = [];
    gr.drops.forEach(d => d.active = false);

    for (let i = 0; i < 5; i++) gr.enemies.push(makeEnemy('scorpion', rand(120, GAME_W - 120), rand(145, GAME_H - 120), ngScale));
    for (let i = 0; i < 3; i++) gr.enemies.push(makeEnemy('goblin', rand(140, GAME_W - 140), rand(150, GAME_H - 130), ngScale));

    // Spawn Sand Wyrm mini-boss if not yet defeated
    if (!gr.sandwyrmDefeated) {
      gr.enemies.push(makeEnemy('sandwyrm', GAME_W / 2, 250, ngScale));
    }

    // Scatter relics
    gr.drops = gr.drops.filter(() => false); // Clear all drops
    if (gr.sandwyrmDefeated && !gr.hasHollowKey) {
      spawnDrop(gr, { id: nextId(), type: 'hollow_key', x: GAME_W / 2, y: 250, bob: 0, taken: false });
    }
    for (let i = 0; i < 4; i++) {
      spawnDrop(gr, { id: nextId(), type: 'relic', x: rand(100, GAME_W - 100), y: rand(150, GAME_H - 100), bob: Math.random() * 6.28, taken: false });
    }
    for (let i = 0; i < 5; i++) {
      spawnDrop(gr, { id: nextId(), type: 'coin', x: rand(80, GAME_W - 80), y: rand(140, GAME_H - 100), bob: Math.random() * 6.28, taken: false });
    }
    if (Math.random() < 0.4) {
      spawnDrop(gr, { id: nextId(), type: 'heart', x: rand(200, GAME_W - 200), y: rand(200, GAME_H - 150), bob: 0, taken: false });
    }

    // Scorched Wastes Decor
    for (let i = 0; i < 5; i++) {
      gr.decor.push({ id: nextId(), type: 'cactus', x: rand(80, GAME_W - 80), y: rand(140, GAME_H - 80), variant: Math.floor(rand(0, 2)) });
    }
    for (let i = 0; i < 7; i++) {
      gr.decor.push({ id: nextId(), type: 'bones', x: rand(60, GAME_W - 60), y: rand(130, GAME_H - 70), variant: Math.floor(rand(0, 3)) });
    }
    for (let i = 0; i < 6; i++) {
      gr.decor.push({ id: nextId(), type: 'rock', x: rand(70, GAME_W - 70), y: rand(130, GAME_H - 70), variant: Math.floor(rand(0, 2)) });
    }

  } else if (zone === 3) {
    // HOLLOW DEPTH — Dungeon (Gruk boss zone)
    gr.enemies = [];
    gr.drops.forEach(d => d.active = false);

    // Regular enemies in the depths
    for (let i = 0; i < 4; i++) gr.enemies.push(makeEnemy('bat', rand(120, GAME_W - 120), rand(140, GAME_H - 130), ngScale));
    for (let i = 0; i < 3; i++) gr.enemies.push(makeEnemy('wraith', rand(140, GAME_W - 140), rand(150, GAME_H - 120), ngScale));
    for (let i = 0; i < 2; i++) gr.enemies.push(makeEnemy('skeleton', rand(160, GAME_W - 160), rand(160, GAME_H - 130), ngScale));

    // Gruk boss
    if (!gr.grukDefeated && !gr.bossSpawned) {
      gr.enemies.push(makeEnemy('boss', GAME_W / 2, 238, ngScale));
      gr.bossSpawned = true;
    }

    gr.drops = gr.drops.filter(() => false);
    if (gr.grukDefeated && !gr.hasSanctumSeal) {
      spawnDrop(gr, { id: nextId(), type: 'sanctum_seal', x: GAME_W / 2, y: 238, bob: 0, taken: false });
    }
    for (let i = 0; i < 4; i++) {
      spawnDrop(gr, { id: nextId(), type: 'coin', x: rand(80, GAME_W - 80), y: rand(140, GAME_H - 100), bob: Math.random() * 6.28, taken: false });
    }

    // Hollow Depth Decor
    for (let i = 0; i < 8; i++) {
      gr.decor.push({ id: nextId(), type: 'rock', x: rand(80, GAME_W - 80), y: rand(140, GAME_H - 80), variant: Math.floor(rand(0, 2)) });
    }
    for (let i = 0; i < 7; i++) {
      gr.decor.push({ id: nextId(), type: 'mushroom', x: rand(90, GAME_W - 90), y: rand(150, GAME_H - 90), variant: 1 });
    }

  } else if (zone === 4) {
    // ABYSSAL SANCTUM — Final boss arena
    gr.enemies = [];
    gr.drops.forEach(d => d.active = false);
    gr.drops = gr.drops.filter(() => false);

    // Waves will be spawned dynamically by the wave system in engine.ts
    // Start wave 1 if not started
    if (gr.waveNumber === 0) {
      gr.waveNumber = 1;
      gr.waveTimer = 120; // 2 second delay before first wave spawns
      gr.waveCleared = false;
      gr.waveEnemiesLeft = 0;
    }

    // Sanctum Decor
    for (let i = 0; i < 6; i++) {
      gr.decor.push({ id: nextId(), type: 'pillar', x: 80 + i * 160, y: rand(135, 155), variant: Math.floor(rand(0, 2)) });
    }
    for (let i = 0; i < 8; i++) {
      gr.decor.push({ id: nextId(), type: 'rune', x: rand(100, GAME_W - 100), y: rand(180, GAME_H - 100), variant: Math.floor(rand(0, 3)) });
    }
    for (let i = 0; i < 5; i++) {
      gr.decor.push({ id: nextId(), type: 'bones', x: rand(60, GAME_W - 60), y: rand(140, GAME_H - 70), variant: Math.floor(rand(0, 3)) });
    }
  }
};
