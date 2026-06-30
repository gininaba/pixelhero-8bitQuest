import { GameState, Enemy } from './types';
import { GAME_W, GAME_H, getInitialQuests, ENEMY_STATS, XP_PER_LEVEL, WAVE_DEFS } from './config';
import { clamp, dist, nextId, rand } from './utils';
import { spawnDrop, spawnFloater, burstParticles, spawnParticle, seedZone, makeEnemy } from './entities';
import { audio } from './audio';

export function resetWorld(gr: GameState, keepPerks = false) {
  const prevPlayer = gr.player;
  gr.zone = 0;
  gr.time = 0;
  gr.frame = 0;
  gr.kills = 0;
  gr.score = 0;
  gr.hitStop = 0;
  gr.shake = 0;
  gr.camera = { x: 0, y: 0 };
  gr.bossSpawned = false;
  gr.elderTalked = false;
  gr.hasKey = false;
  gr.hasHollowKey = false;
  gr.hasSanctumSeal = false;
  gr.sandwyrmDefeated = false;
  gr.grukDefeated = false;
  gr.quests = getInitialQuests();
  gr.decor = [];
  gr.projectiles = [];
  gr.perkChoices = [];
  gr.waveNumber = 0;
  gr.waveTimer = 0;
  gr.waveCleared = false;
  gr.waveEnemiesLeft = 0;

  gr.player = {
    x: GAME_W / 2, y: GAME_H / 2 + 40,
    vx: 0, vy: 0,
    hp: 84, maxHp: 84,
    facing: 'down',
    attackCd: 0, attackActive: 0,
    dashCd: 0, dashTime: 0,
    invuln: 0,
    level: 1, xp: 0, coins: 0,
    spriteBob: 0,
    damageBonus: 0,
    speedBonus: 0,
    dashCdMax: 44,
    hasFireball: false,
    hasVampire: false
  };

  // NG+ carries over perks & upgrades
  if (keepPerks && prevPlayer) {
    gr.player.damageBonus = prevPlayer.damageBonus;
    gr.player.speedBonus = prevPlayer.speedBonus;
    gr.player.dashCdMax = prevPlayer.dashCdMax;
    gr.player.hasFireball = prevPlayer.hasFireball;
    gr.player.hasVampire = prevPlayer.hasVampire;
    gr.player.maxHp = prevPlayer.maxHp;
    gr.player.hp = gr.player.maxHp;
    gr.player.level = prevPlayer.level;
  }

  gr.enemies = [];
  gr.drops.forEach(d => d.active = false);
  gr.particles.forEach(p => p.active = false);
  gr.floaters.forEach(f => f.active = false);
  gr.gameStartTime = performance.now();

  seedZone(gr, 0);
  audio.setZoneMusic(0);
}

export function completeQuestProgress(gr: GameState, questId: string, amt = 1) {
  const q = gr.quests.find(x => x.id === questId);
  if (!q || q.done) return;
  q.progress = clamp(q.progress + amt, 0, q.target);
  if (q.progress >= q.target) {
    q.done = true;
    burstParticles(gr, gr.player!.x, gr.player!.y - 14, 16, '#ffe16b');
    spawnFloater(gr, { x: gr.player!.x, y: gr.player!.y - 30, text: 'QUEST DONE', color: '#fff56a', life: 56, vy: -0.62 });
    gr.score += 240;
    audio.playSfx('quest');
  }
}

export function doAttack(gr: GameState) {
  const pl = gr.player;
  if (!pl || pl.attackCd > 0) return;
  pl.attackCd = 19;
  pl.attackActive = 7;
  gr.shake = Math.max(gr.shake, 2.2);
  audio.playSfx('slash');

  // Launch Fireball projectile if perk is unlocked
  if (pl.hasFireball) {
    const fvx = pl.facing === 'left' ? -7 : pl.facing === 'right' ? 7 : 0;
    const fvy = pl.facing === 'up' ? -7 : pl.facing === 'down' ? 7 : 0;
    gr.projectiles.push({
      id: nextId(),
      type: 'fireball',
      x: pl.x,
      y: pl.y - 6,
      vx: fvx,
      vy: fvy,
      active: true,
      life: 80
    });
  }

  const dir = pl.facing;
  const ax = pl.x + (dir === 'left' ? -26 : dir === 'right' ? 26 : 0);
  const ay = pl.y + (dir === 'up' ? -20 : dir === 'down' ? 18 : -6);
  burstParticles(gr, ax, ay, 7, '#fff8bf');

  const hitRadius = 44;
  for (const e of gr.enemies) {
    if (e.hp <= 0) continue;
    // Sand Wyrm: can't hit while burrowed
    if (e.type === 'sandwyrm' && e.burrowed) continue;
    // Shadow Warden clones handled normally

    const ex = e.x;
    const ey = e.y;
    let inArc = false;
    if (dir === 'left' && ex < pl.x && Math.abs(ey - pl.y) < 28 && pl.x - ex < hitRadius) inArc = true;
    if (dir === 'right' && ex > pl.x && Math.abs(ey - pl.y) < 28 && ex - pl.x < hitRadius) inArc = true;
    if (dir === 'up' && ey < pl.y && Math.abs(ex - pl.x) < 30 && pl.y - ey < hitRadius) inArc = true;
    if (dir === 'down' && ey > pl.y && Math.abs(ex - pl.x) < 30 && ey - pl.y < hitRadius) inArc = true;
    
    if (!inArc) {
      if (dist(pl, e) < 41) inArc = true;
    }

    if (inArc) {
      const ngDmgScale = gr.ngPlus ? 1 : 1;
      const dmg = Math.floor((24 + Math.floor(pl.level * 2.5) + pl.damageBonus) * ngDmgScale);
      e.hp -= dmg;
      e.hitFlash = 7;
      e.stun = 10;
      const isBoss = e.type === 'boss' || e.type === 'sandwyrm' || e.type === 'shadow_warden';
      const knock = isBoss ? 2.5 : 6.2;
      const ang = Math.atan2(e.y - pl.y, e.x - pl.x);
      e.vx += Math.cos(ang) * knock;
      e.vy += Math.sin(ang) * knock;
      burstParticles(gr, e.x, e.y - 8, 10, isBoss ? '#ff657a' : '#ffd66a');
      spawnFloater(gr, { x: e.x, y: e.y - 18, text: String(dmg), color: '#fff4b8', life: 56, vy: -0.62 });
      gr.shake = Math.max(gr.shake, 4.6);
      gr.hitStop = 2;
      audio.playSfx('hit');
    }
  }
}

export function doDash(gr: GameState) {
  const pl = gr.player;
  if (!pl || pl.dashCd > 0) return;
  pl.dashCd = pl.dashCdMax;
  pl.dashTime = 11;
  pl.invuln = Math.max(pl.invuln, 13);
  burstParticles(gr, pl.x, pl.y + 6, 14, '#9be8ff');
  gr.shake = Math.max(gr.shake, 2.1);
  audio.playSfx('dash');
}

export function tryInteract(gr: GameState, setDialog: any, setPhase: any) {
  const pl = gr.player;
  if (!pl) return;

  if (gr.zone === 0) {
    // Interact with Elder Mael
    const dx = pl.x - 236;
    const dy = pl.y - 258;
    if (Math.hypot(dx, dy) < 54) {
      audio.playSfx('click');
      if (!gr.elderTalked) {
        setDialog({
          speaker: 'ELDER MAEL',
          lines: [
            "The bean fields rot, child.",
            "Gruk stole the Seed Ember!",
            "Slay 7 slimes. Gather 4 moon herbs.",
            "The Rusted Key waits in the wood.",
            "Cross the Wastes. Brave the Depths.",
            "End the Shadow that festers below."
          ],
          idx: 0
        });
        gr.phase = 'dialog';
        setPhase('dialog');
        gr.elderTalked = true;
        completeQuestProgress(gr, 'talk', 1);
      } else {
        const allDone = gr.quests.every(q => q.done);
        setDialog({
          speaker: 'ELDER MAEL',
          lines: [
            allDone
              ? "You did it! Emberwick breathes again."
              : gr.grukDefeated
              ? "The Shadow Warden awaits in the Sanctum..."
              : "The woods whisper your name, hero."
          ],
          idx: 0
        });
        gr.phase = 'dialog';
        setPhase('dialog');
      }
      return;
    }

    // Interact with Merchant NPC
    const mdx = pl.x - 680;
    const mdy = pl.y - 220;
    if (Math.hypot(mdx, mdy) < 54) {
      gr.phase = 'shop';
      setPhase('shop');
      audio.playSfx('click');
      return;
    }
  }
}

export interface InputState {
  ix: number;
  iy: number;
  attack: boolean;
  dash: boolean;
  interact: boolean;
}

// Helper: get NG+ damage scale for enemies
function ngDmgScale(gr: GameState): number {
  return gr.ngPlus ? 1.3 + gr.ngPlusLevel * 0.15 : 1;
}

export function updateWorld(gr: GameState, inputs: InputState, dtClamp: number, setDialog: any, setPhase: any) {
  gr.frame++;
  gr.time += dtClamp;

  const pl = gr.player!;

  let ix = inputs.ix;
  let iy = inputs.iy;
  
  const im = Math.hypot(ix, iy) || 1;
  ix /= im; iy /= im;
  if (Math.abs(ix) < 0.12 && Math.abs(iy) < 0.12) { ix = 0; iy = 0; }

  if (ix !== 0 || iy !== 0) {
    if (Math.abs(ix) > Math.abs(iy)) pl.facing = ix > 0 ? 'right' : 'left';
    else pl.facing = iy > 0 ? 'down' : 'up';
  }

  if (inputs.attack && pl.attackCd <= 0) doAttack(gr);
  if (inputs.dash && pl.dashCd <= 0) doDash(gr);
  if (inputs.interact) tryInteract(gr, setDialog, setPhase);

  // Apply speed bonus
  let speed = 2.35 + pl.speedBonus;
  if (pl.dashTime > 0) { speed = 5.1 + pl.speedBonus * 1.4; pl.dashTime--; }
  pl.vx = ix * speed;
  pl.vy = iy * speed;

  pl.x += pl.vx;
  pl.y += pl.vy;

  // ===== Auto-Travel Zone Transitions =====
  // Zone 0 (Emberwick) → Zone 1 (Gloomwood): right edge
  if (gr.zone === 0 && pl.x > GAME_W - 27) {
    gr.zone = 1;
    pl.x = 48;
    seedZone(gr, 1);
    audio.setZoneMusic(1);
    spawnFloater(gr, { x: pl.x, y: pl.y - 20, text: 'GLOOMWOOD', color: '#8cf7ab', life: 56, vy: -0.62 });
  }
  // Zone 1 (Gloomwood) → Zone 0 (Emberwick): left edge
  else if (gr.zone === 1 && pl.x < 27) {
    gr.zone = 0;
    pl.x = GAME_W - 48;
    seedZone(gr, 0);
    audio.setZoneMusic(0);
    spawnFloater(gr, { x: pl.x, y: pl.y - 20, text: 'EMBERWICK', color: '#8cf7ab', life: 56, vy: -0.62 });
  }
  // Zone 1 (Gloomwood) → Zone 2 (Scorched Wastes): right edge, needs Rusted Key
  else if (gr.zone === 1 && pl.x > GAME_W - 27) {
    if (gr.hasKey) {
      gr.zone = 2;
      pl.x = 48;
      seedZone(gr, 2);
      audio.setZoneMusic(2);
      spawnFloater(gr, { x: pl.x, y: pl.y - 20, text: 'SCORCHED WASTES', color: '#ffb86a', life: 56, vy: -0.62 });
    } else {
      pl.x = GAME_W - 44;
      pl.vx = -4;
      spawnFloater(gr, { x: pl.x - 30, y: pl.y - 26, text: 'NEED KEY', color: '#ff6c6c', life: 56, vy: -0.62 });
      burstParticles(gr, pl.x + 18, pl.y, 6, '#ff6c6c');
      audio.playSfx('hurt');
    }
  }
  // Zone 2 (Scorched Wastes) → Zone 1 (Gloomwood): left edge
  else if (gr.zone === 2 && pl.x < 27) {
    gr.zone = 1;
    pl.x = GAME_W - 48;
    seedZone(gr, 1);
    audio.setZoneMusic(1);
    spawnFloater(gr, { x: pl.x, y: pl.y - 20, text: 'GLOOMWOOD', color: '#8cf7ab', life: 56, vy: -0.62 });
  }
  // Zone 2 (Scorched Wastes) → Zone 3 (Hollow Depth): right edge, needs Hollow Key
  else if (gr.zone === 2 && pl.x > GAME_W - 27) {
    if (gr.hasHollowKey) {
      gr.zone = 3;
      pl.x = 48;
      seedZone(gr, 3);
      audio.setZoneMusic(3);
      spawnFloater(gr, { x: pl.x, y: pl.y - 20, text: 'HOLLOW DEPTH', color: '#ff8f9d', life: 56, vy: -0.62 });
    } else {
      pl.x = GAME_W - 44;
      pl.vx = -4;
      spawnFloater(gr, { x: pl.x - 30, y: pl.y - 26, text: 'NEED HOLLOW KEY', color: '#ff6c6c', life: 56, vy: -0.62 });
      burstParticles(gr, pl.x + 18, pl.y, 6, '#ff6c6c');
      audio.playSfx('hurt');
    }
  }
  // Zone 3 (Hollow Depth) → Zone 2 (Scorched Wastes): left edge
  else if (gr.zone === 3 && pl.x < 27) {
    gr.zone = 2;
    pl.x = GAME_W - 48;
    seedZone(gr, 2);
    audio.setZoneMusic(2);
    spawnFloater(gr, { x: pl.x, y: pl.y - 20, text: 'SCORCHED WASTES', color: '#ffb86a', life: 56, vy: -0.62 });
  }
  // Zone 3 (Hollow Depth) → Zone 4 (Abyssal Sanctum): right edge, needs Sanctum Seal
  else if (gr.zone === 3 && pl.x > GAME_W - 27) {
    if (gr.hasSanctumSeal) {
      gr.zone = 4;
      pl.x = 48;
      seedZone(gr, 4);
      audio.setZoneMusic(4);
      spawnFloater(gr, { x: pl.x, y: pl.y - 20, text: 'ABYSSAL SANCTUM', color: '#d88fff', life: 56, vy: -0.62 });
    } else {
      pl.x = GAME_W - 44;
      pl.vx = -4;
      spawnFloater(gr, { x: pl.x - 30, y: pl.y - 26, text: 'NEED SANCTUM SEAL', color: '#ff6c6c', life: 56, vy: -0.62 });
      burstParticles(gr, pl.x + 18, pl.y, 6, '#ff6c6c');
      audio.playSfx('hurt');
    }
  }
  // Zone 4 (Abyssal Sanctum) → Zone 3 (Hollow Depth): left edge
  else if (gr.zone === 4 && pl.x < 27) {
    gr.zone = 3;
    pl.x = GAME_W - 48;
    seedZone(gr, 3);
    audio.setZoneMusic(3);
    spawnFloater(gr, { x: pl.x, y: pl.y - 20, text: 'HOLLOW DEPTH', color: '#ff8f9d', life: 56, vy: -0.62 });
  }

  pl.x = clamp(pl.x, 26, GAME_W - 26);
  pl.y = clamp(pl.y, 118, GAME_H - 46);

  if (pl.attackCd > 0) pl.attackCd--;
  if (pl.attackActive > 0) pl.attackActive--;
  if (pl.dashCd > 0) pl.dashCd--;
  if (pl.invuln > 0) pl.invuln--;

  pl.spriteBob += 0.24 + (Math.abs(pl.vx) + Math.abs(pl.vy)) * 0.14;

  // ===== Update Projectiles =====
  let pIdx = 0;
  while (pIdx < gr.projectiles.length) {
    const p = gr.projectiles[pIdx];
    p.x += p.vx;
    p.y += p.vy;
    p.life--;
    
    let deleted = false;
    if (p.life <= 0) {
      gr.projectiles.splice(pIdx, 1);
      deleted = true;
    } else if (p.type === 'fireball') {
      for (const e of gr.enemies) {
        if (e.hp <= 0) continue;
        if (e.type === 'sandwyrm' && e.burrowed) continue;
        const d = dist(p, e);
        const isBoss = e.type === 'boss' || e.type === 'sandwyrm' || e.type === 'shadow_warden';
        const hitRange = isBoss ? 38 : 24;
        if (d < hitRange) {
          const dmg = 16 + Math.floor(pl.level * 2.2) + Math.floor(pl.damageBonus * 0.5);
          e.hp -= dmg;
          e.hitFlash = 7;
          e.stun = 6;
          e.vx += p.vx * 0.35;
          e.vy += p.vy * 0.35;
          burstParticles(gr, e.x, e.y - 8, 8, '#ff7a3b');
          spawnFloater(gr, { x: e.x, y: e.y - 18, text: String(dmg), color: '#ffb36a', life: 56, vy: -0.62 });
          audio.playSfx('hit');
          gr.projectiles.splice(pIdx, 1);
          deleted = true;
          break;
        }
      }
    } else if (p.type === 'boss_bullet' || p.type === 'sand_blast') {
      const d = dist(p, pl);
      if (d < 22 && pl.invuln <= 0) {
        const dmg = p.type === 'sand_blast' ? 12 : 10;
        pl.hp -= Math.floor(dmg * ngDmgScale(gr));
        pl.invuln = 48;
        const ang = Math.atan2(pl.y - p.y, pl.x - p.x);
        pl.vx += Math.cos(ang) * 4.2;
        pl.vy += Math.sin(ang) * 4.2;
        gr.shake = 7;
        burstParticles(gr, pl.x, pl.y - 8, 9, '#ff5a6e');
        spawnFloater(gr, { x: pl.x, y: pl.y - 22, text: `-${dmg}`, color: '#ff6262', life: 56, vy: -0.62 });
        audio.playSfx('hurt');
        gr.projectiles.splice(pIdx, 1);
        deleted = true;
        
        if (pl.hp <= 0) {
          pl.hp = 0;
          gr.phase = 'gameover';
          setPhase('gameover');
        }
      }
    }

    if (!deleted) {
      pIdx++;
    }
  }

  // ===== Wave System (Zone 4) =====
  if (gr.zone === 4) {
    updateWaveSystem(gr, setPhase);
  }

  // ===== Update Enemies =====
  for (const e of gr.enemies) {
    if (e.hp <= 0) continue;
    if (e.stun > 0) { e.stun--; e.vx *= 0.86; e.vy *= 0.86; } else {

      // ----- BOSS AI: Gruk the Rot-Tusk -----
      if (e.type === 'boss') {
        updateBossAI(gr, e, pl);
      }
      // ----- SAND WYRM AI -----
      else if (e.type === 'sandwyrm') {
        updateSandWyrmAI(gr, e, pl);
      }
      // ----- SHADOW WARDEN AI -----
      else if (e.type === 'shadow_warden') {
        updateShadowWardenAI(gr, e, pl);
      }
      // ----- WRAITH AI (erratic phasing) -----
      else if (e.type === 'wraith') {
        const dx = pl.x - e.x;
        const dy = pl.y - e.y;
        const d = Math.hypot(dx, dy) || 1;
        const spd = ENEMY_STATS.wraith.spd;
        if (d > 22) {
          e.vx += (dx / d) * spd * 0.14;
          e.vy += (dy / d) * spd * 0.14;
        }
        // Erratic phasing movement
        e.vx += Math.sin(gr.frame * 0.31 + e.id * 1.7) * 0.28;
        e.vy += Math.cos(gr.frame * 0.27 + e.id * 2.1) * 0.25;
        e.wander += 0.12;
      }
      // ----- SCORPION AI (quick lunges) -----
      else if (e.type === 'scorpion') {
        const dx = pl.x - e.x;
        const dy = pl.y - e.y;
        const d = Math.hypot(dx, dy) || 1;
        let spd = ENEMY_STATS.scorpion.spd;
        // Lunge when close
        if (d < 120 && d > 30) {
          spd *= 1.6;
        }
        if (d > 22) {
          e.vx += (dx / d) * spd * 0.14;
          e.vy += (dy / d) * spd * 0.14;
        }
        e.wander += 0.09;
        e.vx += Math.sin(e.wander + e.id * 0.5) * 0.02;
        e.vy += Math.cos(e.wander * 1.2 + e.id) * 0.02;
      }
      // ----- SKELETON AI (slow, tanky) -----
      else if (e.type === 'skeleton') {
        const dx = pl.x - e.x;
        const dy = pl.y - e.y;
        const d = Math.hypot(dx, dy) || 1;
        const spd = ENEMY_STATS.skeleton.spd;
        if (d > 22) {
          e.vx += (dx / d) * spd * 0.14;
          e.vy += (dy / d) * spd * 0.14;
        }
        e.wander += 0.06;
        e.vx += Math.sin(e.wander + e.id) * 0.01;
        e.vy += Math.cos(e.wander * 0.9 + e.id) * 0.01;
      }
      // ----- Standard pathing (slime, bat, goblin) -----
      else {
        const dx = pl.x - e.x;
        const dy = pl.y - e.y;
        const d = Math.hypot(dx, dy) || 1;
        const spd = ENEMY_STATS[e.type]?.spd ?? 1;
        if (d > 22) {
          e.vx += (dx / d) * spd * 0.14;
          e.vy += (dy / d) * spd * 0.14;
        }
        if (e.type === 'bat') {
          e.vx += Math.sin(gr.frame * 0.23 + e.id) * 0.14;
          e.vy += Math.cos(gr.frame * 0.19 + e.id) * 0.12;
        }
        e.wander += 0.09;
        e.vx += Math.sin(e.wander + e.id * 0.77) * 0.017;
        e.vy += Math.cos(e.wander * 1.11 + e.id) * 0.017;
      }
    }

    // Don't apply physics to burrowed Sand Wyrm
    if (e.type === 'sandwyrm' && e.burrowed) {
      e.vx = 0;
      e.vy = 0;
    } else {
      e.vx *= 0.88;
      e.vy *= 0.88;
      e.x += e.vx;
      e.y += e.vy;
      e.x = clamp(e.x, 28, GAME_W - 28);
      e.y = clamp(e.y, 122, GAME_H - 48);
    }
    if (e.hitFlash > 0) e.hitFlash--;
    if (e.attackCd > 0) e.attackCd--;

    // Collision with player
    if (e.type === 'sandwyrm' && e.burrowed) continue; // Can't touch while burrowed
    const cd = dist(e, pl);
    const isBoss = e.type === 'boss' || e.type === 'sandwyrm' || e.type === 'shadow_warden';
    const hurtRange = isBoss ? 34 : 22;
    if (cd < hurtRange && pl.invuln <= 0 && e.attackCd <= 0) {
      let dmg = Math.floor((ENEMY_STATS[e.type]?.dmg ?? 10) * ngDmgScale(gr));
      if (e.type === 'boss' && e.bossChargeState === 'charge') {
        dmg = Math.floor(dmg * 1.5);
      }
      pl.hp -= dmg;
      pl.invuln = 52;
      e.attackCd = ENEMY_STATS[e.type]?.attackCd ?? 60;
      const ang = Math.atan2(pl.y - e.y, pl.x - e.x);
      pl.vx += Math.cos(ang) * 3.6;
      pl.vy += Math.sin(ang) * 3.6;
      gr.shake = 9;
      burstParticles(gr, pl.x, pl.y - 8, 11, '#ff7a7a');
      spawnFloater(gr, { x: pl.x, y: pl.y - 22, text: `-${dmg}`, color: '#ff7272', life: 56, vy: -0.62 });
      audio.playSfx('hurt');
      if (pl.hp <= 0) {
        pl.hp = 0;
        gr.phase = 'gameover';
        setPhase('gameover');
      }
    }
  }

  // ===== Handle Enemy Death =====
  let i = 0;
  while (i < gr.enemies.length) {
    const e = gr.enemies[i];
    if (e.hp <= 0) {
      const isBoss = e.type === 'boss' || e.type === 'sandwyrm' || e.type === 'shadow_warden';
      burstParticles(gr, e.x, e.y, isBoss ? 34 : 17, '#ffe8a0');

      gr.kills++;
      const xpTable: Record<string, number> = {
        slime: 9, bat: 8, goblin: 17, scorpion: 14, wraith: 12, skeleton: 20,
        boss: 90, sandwyrm: 70, shadow_warden: 120
      };
      const scoreTable: Record<string, number> = {
        slime: 65, bat: 55, goblin: 120, scorpion: 85, wraith: 75, skeleton: 130,
        boss: 980, sandwyrm: 640, shadow_warden: 1500
      };
      const coinTable: Record<string, number> = {
        slime: 1, bat: 1, goblin: 4, scorpion: 2, wraith: 2, skeleton: 3,
        boss: 14, sandwyrm: 10, shadow_warden: 20
      };

      pl.xp += xpTable[e.type] ?? 9;
      gr.score += scoreTable[e.type] ?? 65;
      pl.coins += coinTable[e.type] ?? 1;
      spawnFloater(gr, { x: e.x, y: e.y - 8, text: `+${scoreTable[e.type] ?? 65}`, color: '#aaffc9', life: 56, vy: -0.62 });

      // Quest completions
      if (e.type === 'slime') completeQuestProgress(gr, 'slimes', 1);
      if (e.type === 'scorpion') completeQuestProgress(gr, 'scorpions', 1);

      // Depth kills quest (zone 3 enemies)
      if (gr.zone === 3) completeQuestProgress(gr, 'depthkills', 1);

      // Boss-specific drops and quest completions
      if (e.type === 'sandwyrm') {
        completeQuestProgress(gr, 'sandwyrm', 1);
        gr.sandwyrmDefeated = true;
        // Drop Hollow Key
        spawnDrop(gr, { id: nextId(), type: 'hollow_key', x: e.x, y: e.y, bob: 0, taken: false });
        spawnFloater(gr, { x: e.x, y: e.y - 34, text: 'HOLLOW KEY!', color: '#7aefff', life: 72, vy: -0.7 });
      }
      if (e.type === 'boss') {
        completeQuestProgress(gr, 'boss', 1);
        gr.grukDefeated = true;
        // Drop Sanctum Seal
        spawnDrop(gr, { id: nextId(), type: 'sanctum_seal', x: e.x, y: e.y, bob: 0, taken: false });
        spawnFloater(gr, { x: e.x, y: e.y - 34, text: 'SANCTUM SEAL!', color: '#d88fff', life: 72, vy: -0.7 });
      }
      if (e.type === 'shadow_warden' && !e.isClone) {
        completeQuestProgress(gr, 'shadow_warden', 1);
        gr.phase = 'victory';
        setPhase('victory');
      }

      // Clone death: just remove, no drops
      if (e.isClone) {
        burstParticles(gr, e.x, e.y, 12, '#8855cc');
        gr.enemies.splice(i, 1);
        continue;
      }

      // Soul Eater Perk: Heal on kill
      if (pl.hasVampire) {
        pl.hp = clamp(pl.hp + 3, 0, pl.maxHp);
        spawnFloater(gr, { x: pl.x, y: pl.y - 26, text: '+3 HP', color: '#ff86a4', life: 48, vy: -0.5 });
      }

      const coinN = coinTable[e.type] ?? 1;
      for (let c = 0; c < coinN; c++) {
        spawnDrop(gr, { id: nextId(), type: 'coin', x: e.x + rand(-17, 17), y: e.y + rand(-9, 9), bob: Math.random() * 6, taken: false });
      }
      if (Math.random() < 0.24) {
        spawnDrop(gr, { id: nextId(), type: 'heart', x: e.x, y: e.y, bob: 0, taken: false });
      }
      gr.enemies.splice(i, 1);
      continue;
    }
    i++;
  }

  // ===== Handle Items Pickup =====
  for (const drop of gr.drops) {
    if (!drop.active || drop.taken) continue;
    drop.bob += 0.11;
    if (dist(drop, pl) < 26) {
      drop.taken = true;
      drop.active = false;
      if (drop.type === 'coin') {
        pl.coins++;
        gr.score += 15;
        spawnFloater(gr, { x: drop.x, y: drop.y - 10, text: '+1¢', color: '#ffe76a', life: 56, vy: -0.62 });
        burstParticles(gr, drop.x, drop.y, 6, '#ffd34d');
        audio.playSfx('coin');
      }
      if (drop.type === 'herb') {
        completeQuestProgress(gr, 'herbs', 1);
        spawnFloater(gr, { x: drop.x, y: drop.y - 10, text: 'HERB', color: '#7dff9a', life: 56, vy: -0.62 });
        burstParticles(gr, drop.x, drop.y, 8, '#71f3a2');
        audio.playSfx('quest');
      }
      if (drop.type === 'heart') {
        pl.hp = clamp(pl.hp + 22, 0, pl.maxHp);
        spawnFloater(gr, { x: drop.x, y: drop.y - 10, text: '+HP', color: '#ff8da3', life: 56, vy: -0.62 });
        burstParticles(gr, drop.x, drop.y, 10, '#ff7a8a');
        audio.playSfx('quest');
      }
      if (drop.type === 'key') {
        gr.hasKey = true;
        completeQuestProgress(gr, 'key', 1);
        spawnFloater(gr, { x: drop.x, y: drop.y - 13, text: 'KEY!', color: '#ffd86b', life: 56, vy: -0.62 });
        burstParticles(gr, drop.x, drop.y, 20, '#ffe56d');
        audio.playSfx('levelup');
      }
      if (drop.type === 'relic') {
        completeQuestProgress(gr, 'relics', 1);
        spawnFloater(gr, { x: drop.x, y: drop.y - 10, text: 'RELIC', color: '#ffb86a', life: 56, vy: -0.62 });
        burstParticles(gr, drop.x, drop.y, 12, '#ffa94d');
        audio.playSfx('quest');
      }
      if (drop.type === 'hollow_key') {
        gr.hasHollowKey = true;
        spawnFloater(gr, { x: drop.x, y: drop.y - 13, text: 'HOLLOW KEY!', color: '#7aefff', life: 72, vy: -0.62 });
        burstParticles(gr, drop.x, drop.y, 20, '#7aefff');
        audio.playSfx('levelup');
      }
      if (drop.type === 'sanctum_seal') {
        gr.hasSanctumSeal = true;
        spawnFloater(gr, { x: drop.x, y: drop.y - 13, text: 'SANCTUM SEAL!', color: '#d88fff', life: 72, vy: -0.62 });
        burstParticles(gr, drop.x, drop.y, 20, '#d88fff');
        audio.playSfx('levelup');
      }
    }
  }

  // ===== Level Up Check =====
  const xpNeed = XP_PER_LEVEL(pl.level);
  if (pl.xp >= xpNeed) {
    pl.xp -= xpNeed;
    gr.phase = 'levelup';
    setPhase('levelup');

    const perkPool = ['sword', 'speed', 'hp', 'fireball', 'vampire'];
    const chosen: string[] = [];
    while (chosen.length < 3) {
      const p = perkPool[Math.floor(Math.random() * perkPool.length)];
      if (!chosen.includes(p)) chosen.push(p);
    }
    gr.perkChoices = chosen;

    audio.playSfx('levelup');
    burstParticles(gr, pl.x, pl.y, 22, '#9df7ff');
    gr.shake = 6;
  }

  // ===== Ambient Enemy Spawns =====
  // Gloomwood: respawn slimes
  if (gr.zone === 1 && gr.frame % 420 === 0) {
    const slimeCount = gr.enemies.filter(e => e.type === 'slime').length;
    if (slimeCount < 5) {
      const ngScale = gr.ngPlus ? 1.5 + gr.ngPlusLevel * 0.25 : 1;
      gr.enemies.push(makeEnemy('slime', rand(120, GAME_W - 120), rand(145, GAME_H - 120), ngScale));
    }
  }
  // Scorched Wastes: respawn scorpions
  if (gr.zone === 2 && gr.frame % 480 === 0) {
    const scorpCount = gr.enemies.filter(e => e.type === 'scorpion').length;
    if (scorpCount < 4) {
      const ngScale = gr.ngPlus ? 1.5 + gr.ngPlusLevel * 0.25 : 1;
      gr.enemies.push(makeEnemy('scorpion', rand(120, GAME_W - 120), rand(145, GAME_H - 120), ngScale));
    }
  }
  // Hollow Depth: respawn bats and wraiths
  if (gr.zone === 3 && gr.frame % 360 === 0) {
    const mobCount = gr.enemies.filter(e => e.type !== 'boss').length;
    if (mobCount < 6) {
      const ngScale = gr.ngPlus ? 1.5 + gr.ngPlusLevel * 0.25 : 1;
      const t = Math.random() < 0.5 ? 'bat' : 'wraith';
      gr.enemies.push(makeEnemy(t as Enemy['type'], rand(120, GAME_W - 120), rand(145, GAME_H - 120), ngScale));
    }
  }

  // ===== Ambient Particles =====
  if (gr.zone === 1 && gr.frame % 16 === 0) {
    spawnParticle(gr, {
      x: rand(100, GAME_W + 100), y: 90,
      vx: rand(-1.2, -0.6), vy: rand(0.5, 1.1),
      life: 300, maxLife: 300,
      color: Math.random() < 0.5 ? '#2f6b3e' : '#578e47',
      size: rand(2.2, 4.0), gravity: 0
    });
  } else if (gr.zone === 2 && gr.frame % 10 === 0) {
    // Heat haze / sand particles
    spawnParticle(gr, {
      x: rand(40, GAME_W - 40), y: GAME_H - 10,
      vx: rand(-0.3, 0.3), vy: rand(-1.2, -0.5),
      life: 160, maxLife: 160,
      color: Math.random() < 0.5 ? '#d4a84f' : '#c4883a',
      size: rand(1.4, 2.6), gravity: -0.008
    });
  } else if ((gr.zone === 3) && gr.frame % 12 === 0) {
    spawnParticle(gr, {
      x: rand(40, GAME_W - 40), y: GAME_H - 10,
      vx: rand(-0.4, 0.4), vy: rand(-1.8, -0.9),
      life: 180, maxLife: 180,
      color: Math.random() < 0.6 ? '#ff603b' : '#b02a7b',
      size: rand(1.6, 2.9), gravity: -0.015
    });
  } else if (gr.zone === 4 && gr.frame % 8 === 0) {
    // Dark energy particles rising
    spawnParticle(gr, {
      x: rand(40, GAME_W - 40), y: GAME_H - 5,
      vx: rand(-0.5, 0.5), vy: rand(-2.2, -1.0),
      life: 200, maxLife: 200,
      color: Math.random() < 0.4 ? '#9a5fff' : Math.random() < 0.5 ? '#4a2f8a' : '#ff3366',
      size: rand(1.2, 2.8), gravity: -0.012
    });
  }

  // ===== Update Particles =====
  for (const pt of gr.particles) {
    if (!pt.active) continue;
    pt.x += pt.vx;
    pt.y += pt.vy;
    if (pt.gravity) pt.vy += pt.gravity;
    pt.vx *= 0.97;
    pt.vy *= 0.97;
    pt.life--;
    if (pt.life <= 0) pt.active = false;
  }

  // ===== Update Floater Texts =====
  for (const f of gr.floaters) {
    if (!f.active) continue;
    f.y += f.vy;
    f.vy *= 0.985;
    f.life--;
    if (f.life <= 0) f.active = false;
  }

  // ===== Camera Tracking =====
  const targetCamX = pl.x - GAME_W / 2;
  const targetCamY = pl.y - GAME_H / 2;
  gr.camera.x += (targetCamX - gr.camera.x) * 0.14;
  gr.camera.y += (targetCamY - gr.camera.y) * 0.14;

  if (gr.shake > 0) gr.shake *= 0.82;

  // Score computation
  const surviveSec = Math.floor((performance.now() - gr.gameStartTime) / 1000);
  const ngMult = gr.ngPlus ? 2 : 1;
  gr.score = (pl.coins * 15 + gr.kills * 44 + pl.level * 60 + surviveSec * 2 + gr.quests.filter(q => q.done).length * 240) * ngMult;
}

// ===== BOSS AI FUNCTIONS =====

function updateBossAI(gr: GameState, e: Enemy, pl: GameState['player'] & {}) {
  if (!e.bossChargeState) e.bossChargeState = 'idle';
  if (e.bossChargeTimer === undefined) e.bossChargeTimer = 150;
  if (e.bossStompTimer === undefined) e.bossStompTimer = 100;

  const hpPct = e.hp / e.maxHp;
  const ngScale = gr.ngPlus ? 1.5 + gr.ngPlusLevel * 0.25 : 1;

  // Phase 3 (HP <= 35%): Stomp attack
  if (hpPct <= 0.35) {
    e.bossStompTimer--;
    if (e.bossStompTimer <= 0) {
      e.bossStompTimer = 220;
      gr.shake = 8;
      audio.playSfx('hit');
      burstParticles(gr, e.x, e.y, 22, '#ff4b62');
      spawnFloater(gr, { x: e.x, y: e.y - 48, text: 'STOMP!', color: '#ff4c62', life: 60, vy: -0.8 });
      
      for (let ai = 0; ai < 8; ai++) {
        const ang = (ai * Math.PI) / 4;
        gr.projectiles.push({
          id: nextId(), type: 'boss_bullet',
          x: e.x, y: e.y,
          vx: Math.cos(ang) * 3.8, vy: Math.sin(ang) * 3.8,
          active: true, life: 140
        });
      }

      if (gr.enemies.length < 5) {
        const mtype = Math.random() < 0.5 ? 'slime' : 'bat';
        gr.enemies.push(makeEnemy(mtype as Enemy['type'], e.x + rand(-60, 60), e.y + rand(40, 100), ngScale));
      }
    }
  }

  // Phase 2 (HP <= 65%): Charge Attack
  if (hpPct <= 0.65) {
    e.bossChargeTimer--;
    if (e.bossChargeState === 'idle' && e.bossChargeTimer <= 0) {
      e.bossChargeState = 'warning';
      e.bossChargeTimer = 45;
      const ang = Math.atan2(pl.y - e.y, pl.x - e.x);
      e.bossChargeDir = { x: Math.cos(ang), y: Math.sin(ang) };
    } else if (e.bossChargeState === 'warning' && e.bossChargeTimer <= 0) {
      e.bossChargeState = 'charge';
      e.bossChargeTimer = 25;
      audio.playSfx('dash');
    } else if (e.bossChargeState === 'charge' && e.bossChargeTimer <= 0) {
      e.bossChargeState = 'idle';
      e.bossChargeTimer = 160 + rand(0, 80);
    }
  }

  // Apply movement
  if (e.bossChargeState === 'warning') {
    e.vx = 0; e.vy = 0;
    if (gr.frame % 5 === 0) burstParticles(gr, e.x + rand(-24, 24), e.y - 12 + rand(-12, 12), 3, '#ff2e43');
  } else if (e.bossChargeState === 'charge') {
    const dspd = 6.4;
    e.vx = e.bossChargeDir!.x * dspd;
    e.vy = e.bossChargeDir!.y * dspd;
    gr.shake = Math.max(gr.shake, 1.8);
    if (gr.frame % 2 === 0) burstParticles(gr, e.x, e.y, 2, '#ff3b3b');
  } else {
    const dx = pl.x - e.x;
    const dy = pl.y - e.y;
    const d = Math.hypot(dx, dy) || 1;
    let spd = ENEMY_STATS.boss.spd;
    if (hpPct <= 0.65) spd *= 1.25;
    if (d > 22) {
      e.vx += (dx / d) * spd * 0.14;
      e.vy += (dy / d) * spd * 0.14;
    }
  }
}

function updateSandWyrmAI(gr: GameState, e: Enemy, pl: GameState['player'] & {}) {
  if (e.burrowTimer === undefined) e.burrowTimer = 180;
  if (e.burrowed === undefined) e.burrowed = false;

  e.burrowTimer--;

  if (!e.burrowed) {
    // Above ground: chase player
    const dx = pl.x - e.x;
    const dy = pl.y - e.y;
    const d = Math.hypot(dx, dy) || 1;
    const spd = ENEMY_STATS.sandwyrm.spd;
    if (d > 28) {
      e.vx += (dx / d) * spd * 0.12;
      e.vy += (dy / d) * spd * 0.12;
    }

    // Burrow when timer expires
    if (e.burrowTimer <= 0) {
      e.burrowed = true;
      e.burrowTimer = 90; // Stay burrowed for 90 frames
      burstParticles(gr, e.x, e.y, 16, '#d4a84f');
      spawnFloater(gr, { x: e.x, y: e.y - 20, text: 'BURROW!', color: '#d4a84f', life: 40, vy: -0.7 });
      audio.playSfx('dash');
    }

    // Occasional sand blast projectiles
    if (gr.frame % 120 === 0) {
      for (let ai = 0; ai < 6; ai++) {
        const ang = (ai * Math.PI) / 3;
        gr.projectiles.push({
          id: nextId(), type: 'sand_blast',
          x: e.x, y: e.y,
          vx: Math.cos(ang) * 3.0, vy: Math.sin(ang) * 3.0,
          active: true, life: 100
        });
      }
      gr.shake = 5;
      burstParticles(gr, e.x, e.y, 14, '#c4883a');
      audio.playSfx('hit');
    }
  } else {
    // Burrowed: invisible, moving toward player
    e.x += (pl.x - e.x) * 0.025;
    e.y += (pl.y - e.y) * 0.025;

    // Particles showing underground movement
    if (gr.frame % 6 === 0) {
      spawnParticle(gr, {
        x: e.x + rand(-12, 12), y: e.y + rand(-8, 8),
        vx: rand(-0.5, 0.5), vy: rand(-1.5, -0.5),
        life: 30, maxLife: 30,
        color: '#d4a84f', size: rand(2, 4), gravity: 0.05
      });
    }

    // Emerge
    if (e.burrowTimer <= 0) {
      e.burrowed = false;
      e.burrowTimer = 200 + Math.floor(rand(0, 80));
      burstParticles(gr, e.x, e.y, 22, '#ffa94d');
      spawnFloater(gr, { x: e.x, y: e.y - 20, text: 'EMERGE!', color: '#ffa94d', life: 40, vy: -0.7 });
      gr.shake = 6;
      audio.playSfx('hit');

      // AoE damage on emerge
      const d = dist(e, pl);
      if (d < 80 && pl.invuln <= 0) {
        const dmg = Math.floor(12 * ngDmgScale(gr));
        pl.hp -= dmg;
        pl.invuln = 48;
        const ang = Math.atan2(pl.y - e.y, pl.x - e.x);
        pl.vx += Math.cos(ang) * 5;
        pl.vy += Math.sin(ang) * 5;
        burstParticles(gr, pl.x, pl.y - 8, 10, '#ff5a6e');
        spawnFloater(gr, { x: pl.x, y: pl.y - 22, text: `-${dmg}`, color: '#ff6262', life: 56, vy: -0.62 });
        audio.playSfx('hurt');
      }
    }
  }
}

function updateShadowWardenAI(gr: GameState, e: Enemy, pl: GameState['player'] & {}) {
  if (e.teleportTimer === undefined) e.teleportTimer = 240;
  if (e.laserTimer === undefined) e.laserTimer = 360;

  const hpPct = e.hp / e.maxHp;

  // Standard chasing
  const dx = pl.x - e.x;
  const dy = pl.y - e.y;
  const d = Math.hypot(dx, dy) || 1;
  const spd = ENEMY_STATS.shadow_warden.spd * (hpPct < 0.5 ? 1.3 : 1);
  if (d > 28) {
    e.vx += (dx / d) * spd * 0.12;
    e.vy += (dy / d) * spd * 0.12;
  }

  // Teleport behind player (only main boss teleports)
  if (!e.isClone) {
    e.teleportTimer--;
    if (e.teleportTimer <= 0) {
      e.teleportTimer = 180 + Math.floor(rand(0, 80));
      const behindAng = Math.atan2(pl.y - e.y, pl.x - e.x);
      const tpX = clamp(pl.x + Math.cos(behindAng + Math.PI) * 60, 60, GAME_W - 60);
      const tpY = clamp(pl.y + Math.sin(behindAng + Math.PI) * 60, 130, GAME_H - 60);
      burstParticles(gr, e.x, e.y, 14, '#7744bb');
      e.x = tpX;
      e.y = tpY;
      e.vx = 0; e.vy = 0;
      burstParticles(gr, e.x, e.y, 14, '#aa66ee');
      spawnFloater(gr, { x: e.x, y: e.y - 24, text: 'WARP!', color: '#bb88ff', life: 40, vy: -0.7 });
      audio.playSfx('dash');
      gr.shake = 4;
    }
  }

  // Shadow bullet barrage
  e.laserTimer--;
  if (e.laserTimer <= 0) {
    e.laserTimer = hpPct < 0.5 ? 180 + Math.floor(rand(0, 60)) : 280 + Math.floor(rand(0, 80));
    
    // Fire 12-directional shadow bullets
    const bulletCount = hpPct < 0.3 ? 16 : 12;
    for (let ai = 0; ai < bulletCount; ai++) {
      const ang = (ai * Math.PI * 2) / bulletCount;
      gr.projectiles.push({
        id: nextId(), type: 'boss_bullet',
        x: e.x, y: e.y,
        vx: Math.cos(ang) * 3.2, vy: Math.sin(ang) * 3.2,
        active: true, life: 160
      });
    }
    gr.shake = 6;
    burstParticles(gr, e.x, e.y, 18, '#9a5fff');
    spawnFloater(gr, { x: e.x, y: e.y - 48, text: 'SHADOW BURST!', color: '#9a5fff', life: 60, vy: -0.8 });
    audio.playSfx('hit');
  }

  // Spawn shadow clones at low HP (only main boss spawns clones)
  if (!e.isClone && hpPct <= 0.4 && gr.frame % 600 === 0) {
    const cloneCount = gr.enemies.filter(en => en.isClone).length;
    if (cloneCount < 2) {
      const clone = makeEnemy('shadow_warden', e.x + rand(-80, 80), e.y + rand(-60, 60), 0.35);
      clone.isClone = true;
      clone.teleportTimer = 999; // Clones don't teleport
      clone.laserTimer = 400;
      gr.enemies.push(clone);
      burstParticles(gr, clone.x, clone.y, 12, '#8855cc');
      spawnFloater(gr, { x: clone.x, y: clone.y - 24, text: 'CLONE!', color: '#8855cc', life: 40, vy: -0.7 });
      audio.playSfx('quest');
    }
  }
}

// ===== Wave System =====
function updateWaveSystem(gr: GameState, _setPhase: any) {
  if (gr.waveCleared) return; // All waves done, boss is active

  const waveIdx = gr.waveNumber - 1;
  if (waveIdx < 0 || waveIdx >= WAVE_DEFS.length) return;

  // Waiting to spawn
  if (gr.waveTimer > 0) {
    gr.waveTimer--;
    if (gr.waveTimer === 0) {
      // Spawn wave enemies
      const waveDef = WAVE_DEFS[waveIdx];
      const ngScale = gr.ngPlus ? 1.5 + gr.ngPlusLevel * 0.25 : 1;
      let totalSpawned = 0;
      for (const entry of waveDef.enemies) {
        for (let j = 0; j < entry.count; j++) {
          gr.enemies.push(makeEnemy(
            entry.type as Enemy['type'],
            rand(100, GAME_W - 100),
            rand(160, GAME_H - 100),
            ngScale
          ));
          totalSpawned++;
        }
      }
      gr.waveEnemiesLeft = totalSpawned;
      spawnFloater(gr, { x: GAME_W / 2, y: 200, text: `WAVE ${gr.waveNumber}`, color: '#ff55aa', life: 80, vy: -0.5 });
      burstParticles(gr, GAME_W / 2, GAME_H / 2, 20, '#9a5fff');
      gr.shake = 5;
      audio.playSfx('quest');
    }
    return;
  }

  // Check if wave enemies are all dead
  const aliveCount = gr.enemies.filter(e => e.hp > 0).length;
  if (aliveCount === 0 && gr.waveEnemiesLeft > 0) {
    // Wave cleared
    gr.waveEnemiesLeft = 0;
    completeQuestProgress(gr, 'waves', 1);

    if (gr.waveNumber >= WAVE_DEFS.length) {
      // All waves done — spawn Shadow Warden
      gr.waveCleared = true;
      const ngScale = gr.ngPlus ? 1.5 + gr.ngPlusLevel * 0.25 : 1;
      gr.enemies.push(makeEnemy('shadow_warden', GAME_W / 2, 220, ngScale));
      spawnFloater(gr, { x: GAME_W / 2, y: 180, text: 'SHADOW WARDEN AWAKENS!', color: '#ff3366', life: 90, vy: -0.5 });
      burstParticles(gr, GAME_W / 2, 220, 30, '#9a5fff');
      gr.shake = 8;
      audio.playSfx('levelup');
    } else {
      // Next wave after delay
      gr.waveNumber++;
      gr.waveTimer = 150; // ~2.5s delay
      spawnFloater(gr, { x: GAME_W / 2, y: 280, text: 'WAVE CLEARED!', color: '#88ff88', life: 60, vy: -0.5 });

      // Drop some hearts between waves
      for (let h = 0; h < 2; h++) {
        spawnDrop(gr, { id: nextId(), type: 'heart', x: rand(200, GAME_W - 200), y: rand(200, GAME_H - 150), bob: 0, taken: false });
      }
    }
  }
}
