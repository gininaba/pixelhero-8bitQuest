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
    // GLOOMWOOD — Forest
    gr.enemies = [];
    gr.drops.forEach(d => { if (d.type !== 'key') d.active = false; });

    for (let i = 0; i < 6; i++) gr.enemies.push(makeEnemy('slime', rand(120, GAME_W - 120), rand(140, GAME_H - 130), ngScale));
    for (let i = 0; i < 3; i++) gr.enemies.push(makeEnemy('bat', rand(160, GAME_W - 160), rand(120, GAME_H - 170), ngScale));
    gr.enemies.push(makeEnemy('goblin', GAME_W * 0.74, 260, ngScale));

    gr.drops = gr.drops.filter(d => d.type === 'key');
    for (let i = 0; i < 5; i++) {
      spawnDrop(gr, { id: nextId(), type: 'herb', x: rand(90, GAME_W - 90), y: rand(150, GAME_H - 120), bob: Math.random() * 6.28, taken: false });
    }
    for (let i = 0; i < 7; i++) {
      spawnDrop(gr, { id: nextId(), type: 'coin', x: rand(80, GAME_W - 80), y: rand(140, GAME_H - 100), bob: Math.random() * 6.28, taken: false });
    }
    const keyAlready = gr.drops.some(d => d.type === 'key' && d.active && !d.taken);
    if (!gr.hasKey && !keyAlready) {
      spawnDrop(gr, { id: nextId(), type: 'key', x: GAME_W - 140, y: 176, bob: 0, taken: false });
    }

    // Gloomwood Decor
    for (let i = 0; i < 14; i++) {
      gr.decor.push({ id: nextId(), type: 'grass', x: rand(60, GAME_W - 60), y: rand(130, GAME_H - 70), variant: Math.floor(rand(0, 3)) });
    }
    for (let i = 0; i < 6; i++) {
      gr.decor.push({ id: nextId(), type: 'mushroom', x: rand(80, GAME_W - 80), y: rand(130, GAME_H - 80), variant: Math.floor(rand(0, 2)) });
    }
    for (let i = 0; i < 4; i++) {
      gr.decor.push({ id: nextId(), type: 'rock', x: rand(70, GAME_W - 70), y: rand(130, GAME_H - 70), variant: Math.floor(rand(0, 2)) });
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
