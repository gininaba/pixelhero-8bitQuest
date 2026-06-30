import { GameState, Player, Enemy, ZoneId, Decor } from './types';
import { GAME_W, GAME_H, TILE, ZONES } from './config';
import { clamp } from './utils';

let cachedVignette: CanvasGradient | null = null;
const cachedLinearGradients: Record<number, CanvasGradient> = {};
let lightCanvas: HTMLCanvasElement | null = null;
let lightCtx: CanvasRenderingContext2D | null = null;

export function renderFrame(ctx: CanvasRenderingContext2D, gr: GameState) {
  if (!cachedVignette) {
    cachedVignette = ctx.createRadialGradient(GAME_W / 2, GAME_H / 2, 210, GAME_W / 2, GAME_H / 2, 640);
    cachedVignette.addColorStop(0, 'rgba(0,0,0,0)');
    cachedVignette.addColorStop(1, 'rgba(0,0,0,0.36)');
  }
  if (!cachedLinearGradients[gr.zone]) {
    const zone = ZONES[gr.zone] ?? ZONES[0];
    const grad = ctx.createLinearGradient(0, 0, 0, GAME_H);
    grad.addColorStop(0, zone.colorTop);
    grad.addColorStop(1, zone.colorBot);
    cachedLinearGradients[gr.zone] = grad;
  }

  const shakeX = gr.shake > 0.4 ? (Math.random() - 0.5) * gr.shake * 2.4 : 0;
  const shakeY = gr.shake > 0.4 ? (Math.random() - 0.5) * gr.shake * 1.6 : 0;
  ctx.save();
  ctx.translate(Math.round(shakeX), Math.round(shakeY));

  const zone = ZONES[gr.zone] ?? ZONES[0];
  
  ctx.fillStyle = cachedLinearGradients[gr.zone];
  ctx.fillRect(0, 0, GAME_W, GAME_H);

  ctx.globalAlpha = 0.07;
  for (let y = 0; y < GAME_H; y += 3) {
    ctx.fillStyle = y % 6 === 0 ? '#000' : '#fff';
    ctx.fillRect(0, y, GAME_W, 1);
  }
  ctx.globalAlpha = 1;

  ctx.fillStyle = zone.floor;
  ctx.fillRect(0, 110, GAME_W, GAME_H - 110);

  // Grid overlay
  ctx.globalAlpha = 0.11;
  ctx.strokeStyle = gr.zone === 2 ? '#b0a070' : gr.zone === 4 ? '#6644aa' : '#b7e3b0';
  ctx.lineWidth = 1;
  for (let gx = 0; gx < GAME_W; gx += TILE * 2) {
    ctx.beginPath();
    ctx.moveTo(gx, 110);
    ctx.lineTo(gx, GAME_H);
    ctx.stroke();
  }
  for (let gy = 118; gy < GAME_H; gy += TILE * 2) {
    ctx.beginPath();
    ctx.moveTo(0, gy);
    ctx.lineTo(GAME_W, gy);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  drawZoneDecor(ctx, gr.zone, gr.frame);

  // Draw ground details
  if (gr.decor) {
    for (const dec of gr.decor) {
      drawDecorItem(ctx, dec, gr.zone);
    }
  }

  // Edge glow transitions
  const edgeGlow = (x: number, txt: string, color = '#ffd75b') => {
    ctx.save();
    ctx.globalAlpha = 0.26 + Math.sin(gr.frame * 0.11) * 0.11;
    ctx.fillStyle = color;
    ctx.fillRect(x, 118, 8, GAME_H - 118);
    ctx.globalAlpha = 1;
    ctx.font = '10px "Press Start 2P"';
    ctx.fillStyle = '#ffe59a';
    ctx.textAlign = 'center';
    ctx.fillText('▶', x + 4, 138);
    if (txt) {
      ctx.font = '8px "Press Start 2P"';
      ctx.fillStyle = '#ffe69a';
      ctx.fillText(txt, x + 4, 160);
    }
    ctx.restore();
  };

  const lockedEdge = (x: number, _label: string, _keyName: string) => {
    ctx.save();
    ctx.globalAlpha = 0.22;
    ctx.fillStyle = '#666';
    ctx.fillRect(x, 118, 16, GAME_H - 118);
    ctx.font = '7px "Press Start 2P"';
    ctx.fillStyle = '#adadad';
    ctx.textAlign = 'center';
    ctx.fillText('LOCK', x + 8, 147);
    ctx.fillText('ED', x + 8, 160);
    ctx.globalAlpha = 1;
    ctx.restore();
  };

  const unlockedEdge = (x: number, label: string, color: string) => {
    ctx.save();
    ctx.globalAlpha = 0.5 + Math.sin(gr.frame * 0.13) * 0.15;
    ctx.fillStyle = color;
    ctx.fillRect(x, 118, 16, GAME_H - 118);
    ctx.font = '8px "Press Start 2P"';
    ctx.fillStyle = '#ffd3df';
    ctx.textAlign = 'center';
    ctx.fillText(label, x + 8, 156);
    ctx.globalAlpha = 1;
    ctx.restore();
  };
  
  // Zone-specific edge indicators
  if (gr.zone === 0) {
    edgeGlow(GAME_W - 14, 'WOOD');
  } else if (gr.zone === 1) {
    edgeGlow(18, 'TOWN');
    if (gr.hasKey) {
      unlockedEdge(GAME_W - 24, 'WASTE', '#ffb86a');
    } else {
      lockedEdge(GAME_W - 24, 'WASTE', 'KEY');
    }
  } else if (gr.zone === 2) {
    edgeGlow(18, 'WOOD', '#8cf7ab');
    if (gr.hasHollowKey) {
      unlockedEdge(GAME_W - 24, 'DEPTH', '#ff8f9d');
    } else {
      lockedEdge(GAME_W - 24, 'DEPTH', 'KEY');
    }
  } else if (gr.zone === 3) {
    edgeGlow(18, 'WASTE', '#ffb86a');
    if (gr.hasSanctumSeal) {
      unlockedEdge(GAME_W - 24, 'ABYSS', '#d88fff');
    } else {
      lockedEdge(GAME_W - 24, 'ABYSS', 'SEAL');
    }
  } else if (gr.zone === 4) {
    edgeGlow(18, 'DEPTH', '#ff8f9d');
  }

  // Draw NPCs in town
  if (gr.zone === 0) {
    drawElder(ctx, 236, 258, gr.frame);
    drawMerchant(ctx, 680, 220, gr.frame);
  }

  // Draw Drops
  for (const d of gr.drops) {
    if (!d.active) continue;
    const bobY = Math.sin(d.bob) * 3.5;
    if (d.type === 'coin') {
      drawCoin(ctx, d.x, d.y + bobY, gr.frame);
    } else if (d.type === 'herb') {
      drawHerb(ctx, d.x, d.y + bobY, gr.frame);
    } else if (d.type === 'heart') {
      drawHeartPickup(ctx, d.x, d.y + bobY);
    } else if (d.type === 'key' || d.type === 'hollow_key' || d.type === 'sanctum_seal') {
      drawKey(ctx, d.x, d.y + bobY, gr.frame, d.type);
    } else if (d.type === 'relic') {
      drawRelic(ctx, d.x, d.y + bobY, gr.frame);
    }
  }

  // Draw Enemies and Boss Telegraphs
  for (const e of gr.enemies) {
    if (e.hp <= 0) continue;

    // Sand Wyrm: don't draw sprite while burrowed
    if (e.type === 'sandwyrm' && e.burrowed) {
      // Draw rumble indicator
      ctx.save();
      ctx.globalAlpha = 0.35 + Math.sin(gr.frame * 0.3) * 0.15;
      ctx.fillStyle = '#d4a84f';
      ctx.beginPath();
      ctx.ellipse(e.x, e.y, 20 + Math.sin(gr.frame * 0.2) * 4, 10, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      continue;
    }

    // Boss charge Warning Telegraph
    if (e.type === 'boss' && e.bossChargeState === 'warning') {
      ctx.save();
      ctx.globalAlpha = 0.24 + Math.sin(gr.frame * 0.28) * 0.08;
      ctx.fillStyle = '#ff2b47';
      ctx.translate(e.x, e.y);
      const angle = Math.atan2(e.bossChargeDir!.y, e.bossChargeDir!.x);
      ctx.rotate(angle);
      ctx.fillRect(0, -45, 600, 90);
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2.5;
      ctx.setLineDash([10, 6]);
      ctx.strokeRect(0, -45, 600, 90);
      ctx.restore();
    }

    // Boss stomp telegraph ring
    if (e.type === 'boss' && e.bossStompTimer !== undefined && e.bossStompTimer < 25) {
      ctx.save();
      ctx.globalAlpha = 0.44 * (1 - e.bossStompTimer / 25);
      ctx.strokeStyle = '#ff3b55';
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.arc(e.x, e.y, 80 * (1 - e.bossStompTimer / 25), 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // Shadow
    ctx.globalAlpha = 0.22;
    ctx.fillStyle = '#000';
    const sw = isBigEnemy(e.type) ? 52 : e.type === 'goblin' || e.type === 'skeleton' ? 28 : 22;
    ctx.beginPath();
    ctx.ellipse(e.x, e.y + 12, sw / 2, 7, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    drawEnemy(ctx, e, gr.frame);
  }

  // Draw Player
  const pl = gr.player;
  if (pl) {
    ctx.globalAlpha = 0.23;
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.ellipse(pl.x, pl.y + 13, 15, 7, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;

    if (pl.dashTime > 2) {
      ctx.globalAlpha = 0.19;
      drawHeroSprite(ctx, pl.x - pl.vx * 2.1, pl.y - pl.vy * 2.1, pl, gr.frame, true);
      ctx.globalAlpha = 1;
    }

    if (pl.invuln <= 0 || Math.floor(gr.frame / 3) % 2 === 0) {
      drawHeroSprite(ctx, pl.x, pl.y, pl, gr.frame, false);
    }

    if (pl.attackActive > 0) {
      drawSlash(ctx, pl, pl.attackActive);
    }
  }

  // Draw Projectiles
  if (gr.projectiles) {
    for (const p of gr.projectiles) {
      ctx.save();
      ctx.translate(Math.round(p.x), Math.round(p.y));
      if (p.type === 'fireball') {
        const rot = (gr.frame * 0.24) % (Math.PI * 2);
        ctx.rotate(rot);
        ctx.fillStyle = '#ff601b';
        ctx.fillRect(-7, -7, 14, 14);
        ctx.fillStyle = '#ffd649';
        ctx.fillRect(-4, -4, 8, 8);
        ctx.fillStyle = '#fff';
        ctx.fillRect(-1.5, -1.5, 3, 3);
      } else if (p.type === 'boss_bullet') {
        const pulse = Math.sin(gr.frame * 0.12) * 1.5;
        ctx.fillStyle = '#e82b4b';
        ctx.beginPath();
        ctx.arc(0, 0, 7.5 + pulse, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffcbd4';
        ctx.beginPath();
        ctx.arc(-2, -2, 2.5, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.type === 'sand_blast') {
        const pulse = Math.sin(gr.frame * 0.15) * 1;
        ctx.fillStyle = '#d4a84f';
        ctx.beginPath();
        ctx.arc(0, 0, 6 + pulse, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffd88a';
        ctx.beginPath();
        ctx.arc(-1, -1, 2, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
  }

  // Draw Particles
  for (const p of gr.particles) {
    if (!p.active) continue;
    const a = p.life / p.maxLife;
    ctx.globalAlpha = a;
    ctx.fillStyle = p.color;
    ctx.fillRect(Math.round(p.x), Math.round(p.y), Math.ceil(p.size), Math.ceil(p.size));
  }
  ctx.globalAlpha = 1;

  // Draw Floaters
  ctx.textAlign = 'center';
  ctx.font = '12px "Press Start 2P"';
  for (const f of gr.floaters) {
    if (!f.active) continue;
    const a = clamp(f.life / 30, 0, 1);
    ctx.globalAlpha = a;
    ctx.fillStyle = '#10151b';
    ctx.fillText(f.text, Math.round(f.x + 1), Math.round(f.y + 1));
    ctx.fillStyle = f.color;
    ctx.fillText(f.text, Math.round(f.x), Math.round(f.y));
  }
  ctx.globalAlpha = 1;
  ctx.textAlign = 'left';

  // Draw lighting mask in dark zones (1=Gloomwood, 3=Hollow Depth, 4=Abyssal Sanctum)
  if (gr.zone === 1 || gr.zone === 3 || gr.zone === 4) {
    drawLightingEngine(ctx, gr);
  }

  ctx.fillStyle = cachedVignette!;
  ctx.fillRect(0, 0, GAME_W, GAME_H);

  // Wave announcement overlay (zone 4)
  if (gr.zone === 4 && gr.waveTimer > 0 && gr.waveNumber > 0) {
    const t = gr.waveTimer / 120;
    ctx.save();
    ctx.globalAlpha = Math.min(t * 2, 0.85);
    ctx.font = '28px "Press Start 2P"';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#10051a';
    ctx.fillText(`WAVE ${gr.waveNumber}`, GAME_W / 2 + 2, GAME_H / 2 - 18);
    ctx.fillStyle = '#ff55aa';
    ctx.fillText(`WAVE ${gr.waveNumber}`, GAME_W / 2, GAME_H / 2 - 20);
    ctx.font = '10px "Press Start 2P"';
    ctx.fillStyle = '#cc88dd';
    ctx.fillText('GET READY', GAME_W / 2, GAME_H / 2 + 10);
    ctx.restore();
  }

  ctx.restore();
}

function isBigEnemy(type: string): boolean {
  return type === 'boss' || type === 'sandwyrm' || type === 'shadow_warden';
}

function drawDecorItem(ctx: CanvasRenderingContext2D, dec: Decor, zone: number) {
  ctx.save();
  ctx.translate(dec.x, dec.y);

  if (dec.type === 'grass') {
    ctx.fillStyle = zone === 0 ? '#436d4a' : zone === 2 ? '#8a7a4a' : '#2b4d36';
    if (dec.variant === 0) {
      ctx.fillRect(-2, 0, 1, -4);
      ctx.fillRect(0, 0, 1, -6);
      ctx.fillRect(2, 0, 1, -3);
    } else if (dec.variant === 1) {
      ctx.fillRect(-1, 0, 1, -5);
      ctx.fillRect(1, 0, 1, -4);
    } else {
      ctx.fillRect(0, 0, 1, -5);
    }
  } else if (dec.type === 'flower') {
    ctx.fillStyle = '#3c6d3b';
    ctx.fillRect(0, 0, 1, -4);
    ctx.fillStyle = dec.variant === 0 ? '#ff859d' : '#ffd34d';
    ctx.fillRect(-1, -6, 3, 2);
    ctx.fillRect(0, -7, 1, 1);
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, -5, 1, 1);
  } else if (dec.type === 'rock') {
    ctx.fillStyle = zone === 3 || zone === 4 ? '#4a3554' : zone === 2 ? '#7a6a4a' : '#5f676b';
    if (dec.variant === 0) {
      ctx.fillRect(-3, 0, 6, -3);
      ctx.fillRect(-2, -4, 4, 1);
      ctx.fillStyle = zone === 3 || zone === 4 ? '#6c4a7c' : zone === 2 ? '#998a5a' : '#7d878c';
      ctx.fillRect(-1, -3, 2, 1);
    } else {
      ctx.fillRect(-2, 0, 4, -2);
      ctx.fillRect(-1, -3, 2, 1);
    }
  } else if (dec.type === 'mushroom') {
    ctx.fillStyle = '#fdf0d5';
    ctx.fillRect(0, 0, 1, -3);
    if (zone === 3 || zone === 4) {
      ctx.fillStyle = '#bd52ff';
      ctx.fillRect(-2, -5, 5, 2);
      ctx.fillRect(-1, -6, 3, 1);
      ctx.fillStyle = '#f0c7ff';
      ctx.fillRect(0, -5, 1, 1);
    } else {
      ctx.fillStyle = '#db3b4c';
      ctx.fillRect(-2, -5, 5, 2);
      ctx.fillRect(-1, -6, 3, 1);
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, -5, 1, 1);
    }
  } else if (dec.type === 'cactus') {
    // Desert cactus
    ctx.fillStyle = '#5a8a3a';
    ctx.fillRect(-2, 0, 4, -14);
    ctx.fillRect(-2, -12, 1, 1);
    if (dec.variant === 0) {
      ctx.fillRect(-6, -10, 4, 2);
      ctx.fillRect(-6, -10, 2, -4);
      ctx.fillRect(4, -8, 4, 2);
      ctx.fillRect(6, -8, 2, -3);
    } else {
      ctx.fillRect(4, -11, 4, 2);
      ctx.fillRect(6, -11, 2, -4);
    }
    ctx.fillStyle = '#7aaa5a';
    ctx.fillRect(-1, -14, 2, 1);
  } else if (dec.type === 'bones') {
    // Scattered bones
    ctx.fillStyle = zone === 4 ? '#8a7aaa' : '#e9dfd1';
    if (dec.variant === 0) {
      ctx.fillRect(-4, 0, 8, 2);
      ctx.fillRect(-5, -1, 2, 2);
      ctx.fillRect(3, -1, 2, 2);
    } else if (dec.variant === 1) {
      ctx.fillRect(-3, 0, 6, 2);
      ctx.fillRect(0, -2, 2, 4);
    } else {
      // Skull
      ctx.fillRect(-3, -3, 6, 5);
      ctx.fillRect(-2, -4, 4, 1);
      ctx.fillStyle = zone === 4 ? '#4a3a6a' : '#1a1a1a';
      ctx.fillRect(-2, -1, 1, 1);
      ctx.fillRect(1, -1, 1, 1);
    }
  } else if (dec.type === 'pillar') {
    // Dark stone pillar for Abyssal Sanctum
    ctx.fillStyle = '#2a2244';
    ctx.fillRect(-6, -40, 12, 52);
    ctx.fillStyle = '#3a3264';
    ctx.fillRect(-8, -42, 16, 4);
    ctx.fillRect(-8, 8, 16, 4);
    ctx.fillStyle = '#5544aa';
    ctx.globalAlpha = 0.6;
    ctx.fillRect(-2, -30, 4, 2);
    ctx.fillRect(-2, -20, 4, 2);
    ctx.globalAlpha = 1;
  } else if (dec.type === 'rune') {
    // Glowing floor rune for Abyssal Sanctum
    ctx.globalAlpha = 0.3 + Math.sin(dec.x * 0.1 + dec.y * 0.07) * 0.15;
    ctx.strokeStyle = dec.variant < 2 ? '#7744bb' : '#ff3366';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(0, 0, 8 + dec.variant * 2, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-4, -4); ctx.lineTo(4, 4);
    ctx.moveTo(4, -4); ctx.lineTo(-4, 4);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  ctx.restore();
}

function drawMerchant(ctx: CanvasRenderingContext2D, x: number, y: number, frame: number) {
  const bob = Math.sin(frame * 0.064) * 1.2;
  ctx.save();
  ctx.translate(x, y + bob);

  ctx.globalAlpha = 0.2;
  ctx.fillStyle = '#000';
  ctx.beginPath();
  ctx.ellipse(0, 14, 17, 6, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;

  ctx.fillStyle = '#6b369c';
  ctx.fillRect(-10, -20, 20, 30);
  ctx.fillStyle = '#4c2373';
  ctx.fillRect(-10, 4, 20, 6);
  ctx.fillStyle = '#8f4ebf';
  ctx.fillRect(-10, -26, 20, 8);
  ctx.fillRect(-8, -30, 16, 4);
  ctx.fillStyle = '#ebcbaf';
  ctx.fillRect(-6, -18, 12, 6);
  ctx.fillStyle = '#eff3f8';
  ctx.fillRect(-7, -12, 14, 11);
  ctx.fillStyle = '#cbd2d9';
  ctx.fillRect(-5, -1, 10, 3);
  ctx.fillStyle = '#1b1b1f';
  ctx.fillRect(-3, -16, 1, 1);
  ctx.fillRect(2, -16, 1, 1);
  ctx.fillStyle = '#6b462c';
  ctx.fillRect(-22, -14, 4, 28);
  ctx.fillRect(-27, -24, 14, 10);
  ctx.fillStyle = '#ffcf3b';
  ctx.font = '7px "Press Start 2P"';
  ctx.textAlign = 'center';
  ctx.fillText('$', -20, -16);

  ctx.restore();

  ctx.font = '8px "Press Start 2P"';
  ctx.textAlign = 'center';
  ctx.fillStyle = '#e8c9ff';
  ctx.fillText('MERCHANT', x, y - 48);
  ctx.fillStyle = '#ffec9a';
  ctx.font = '7px "Press Start 2P"';
  ctx.fillText('[E] SHOP', x, y + 34);
  ctx.textAlign = 'left';
}

function drawLightingEngine(ctx: CanvasRenderingContext2D, gr: GameState) {
  if (!lightCanvas || !lightCtx) {
    lightCanvas = document.createElement('canvas');
    lightCanvas.width = GAME_W;
    lightCanvas.height = GAME_H;
    lightCtx = lightCanvas.getContext('2d')!;
  }

  // Ambient darkness varies by zone
  lightCtx.clearRect(0, 0, GAME_W, GAME_H);
  const darkness = gr.zone === 1 ? 'rgba(5, 7, 18, 0.73)'
    : gr.zone === 4 ? 'rgba(8, 4, 18, 0.88)'
    : 'rgba(18, 5, 24, 0.82)';
  lightCtx.fillStyle = darkness;
  lightCtx.fillRect(0, 0, GAME_W, GAME_H);

  lightCtx.save();
  lightCtx.globalCompositeOperation = 'destination-out';

  const lights: { x: number; y: number; r: number }[] = [];

  if (gr.player) {
    lights.push({ x: gr.player.x, y: gr.player.y - 8, r: 122 });
  }

  // Boss lights
  for (const en of gr.enemies) {
    if (en.hp <= 0) continue;
    if (en.type === 'boss') lights.push({ x: en.x, y: en.y - 20, r: 175 });
    if (en.type === 'sandwyrm' && !en.burrowed) lights.push({ x: en.x, y: en.y - 15, r: 140 });
    if (en.type === 'shadow_warden') lights.push({ x: en.x, y: en.y - 20, r: 160 });
  }

  // Key/relic lights
  for (const d of gr.drops) {
    if (!d.active || d.taken) continue;
    if (d.type === 'key' || d.type === 'hollow_key' || d.type === 'sanctum_seal' || d.type === 'relic') {
      lights.push({ x: d.x, y: d.y, r: 56 });
    }
  }

  // Projectile lights
  if (gr.projectiles) {
    for (const p of gr.projectiles) {
      if (p.active) {
        lights.push({ x: p.x, y: p.y, r: p.type === 'fireball' ? 66 : 42 });
      }
    }
  }

  for (const lt of lights) {
    const radG = lightCtx.createRadialGradient(lt.x, lt.y, 0, lt.x, lt.y, lt.r);
    radG.addColorStop(0, 'rgba(0, 0, 0, 1.0)');
    radG.addColorStop(0.35, 'rgba(0, 0, 0, 0.85)');
    radG.addColorStop(1, 'rgba(0, 0, 0, 0.0)');
    lightCtx.fillStyle = radG;
    lightCtx.beginPath();
    lightCtx.arc(lt.x, lt.y, lt.r, 0, Math.PI * 2);
    lightCtx.fill();
  }

  lightCtx.restore();
  ctx.drawImage(lightCanvas, 0, 0);

  // Screen blend colored glows
  ctx.save();
  ctx.globalCompositeOperation = 'screen';

  if (gr.projectiles) {
    for (const p of gr.projectiles) {
      if (p.active) {
        if (p.type === 'fireball') {
          const grad = ctx.createRadialGradient(p.x, p.y, 2, p.x, p.y, 48);
          grad.addColorStop(0, 'rgba(255, 96, 27, 0.38)');
          grad.addColorStop(1, 'rgba(255, 96, 27, 0.0)');
          ctx.fillStyle = grad;
          ctx.beginPath(); ctx.arc(p.x, p.y, 48, 0, Math.PI * 2); ctx.fill();
        } else if (p.type === 'sand_blast') {
          const grad = ctx.createRadialGradient(p.x, p.y, 2, p.x, p.y, 30);
          grad.addColorStop(0, 'rgba(212, 168, 79, 0.3)');
          grad.addColorStop(1, 'rgba(212, 168, 79, 0.0)');
          ctx.fillStyle = grad;
          ctx.beginPath(); ctx.arc(p.x, p.y, 30, 0, Math.PI * 2); ctx.fill();
        } else {
          const grad = ctx.createRadialGradient(p.x, p.y, 2, p.x, p.y, 34);
          grad.addColorStop(0, 'rgba(232, 43, 75, 0.32)');
          grad.addColorStop(1, 'rgba(232, 43, 75, 0.0)');
          ctx.fillStyle = grad;
          ctx.beginPath(); ctx.arc(p.x, p.y, 34, 0, Math.PI * 2); ctx.fill();
        }
      }
    }
  }

  for (const d of gr.drops) {
    if (!d.active || d.taken) continue;
    if (d.type === 'key' || d.type === 'hollow_key' || d.type === 'sanctum_seal') {
      const c = d.type === 'key' ? '255, 207, 59' : d.type === 'hollow_key' ? '122, 239, 255' : '216, 143, 255';
      const grad = ctx.createRadialGradient(d.x, d.y, 2, d.x, d.y, 36);
      grad.addColorStop(0, `rgba(${c}, 0.32)`);
      grad.addColorStop(1, `rgba(${c}, 0.0)`);
      ctx.fillStyle = grad;
      ctx.beginPath(); ctx.arc(d.x, d.y, 36, 0, Math.PI * 2); ctx.fill();
    }
  }

  ctx.restore();
}

function drawZoneDecor(ctx: CanvasRenderingContext2D, zone: ZoneId, frame: number) {
  if (zone === 0) {
    pixelRect(ctx, 74, 62, 96, 44, '#2e3b47', '#1a2630');
    pixelRect(ctx, 86, 78, 18, 18, '#f6d56a', '#d9b34b');
    pixelRect(ctx, 126, 78, 18, 18, '#f6d56a', '#d9b34b');
    pixelRect(ctx, 650, 54, 120, 52, '#32424f', '#1e2a33');
    for (let i = 0; i < 4; i++) {
      const lx = 150 + i * 178;
      const glowAlpha = 0.13 + Math.sin(frame * 0.11 + i) * 0.05;
      const grad = ctx.createRadialGradient(lx, 119, 0, lx, 119, 28);
      grad.addColorStop(0, `rgba(255, 216, 117, ${glowAlpha})`);
      grad.addColorStop(0.5, `rgba(255, 216, 117, ${glowAlpha * 0.5})`);
      grad.addColorStop(1, 'rgba(255, 216, 117, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(lx, 119, 28, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.font = '10px "Press Start 2P"';
    ctx.fillStyle = '#bfeac8';
    ctx.fillText('EMBERWICK', 374, 86);
  } else if (zone === 1) {
    // Gloomwood trees
    const trees = [[120, 138], [300, 124], [520, 152], [760, 132], [170, 480], [835, 470]];
    for (const [tx, ty] of trees) {
      ctx.fillStyle = '#1b3a29';
      ctx.fillRect(tx - 5, ty - 8, 10, 34);
      ctx.fillStyle = '#256541';
      ctx.fillRect(tx - 21, ty - 32, 42, 30);
      ctx.fillStyle = '#2f7f53';
      ctx.fillRect(tx - 15, ty - 44, 30, 20);
    }
    // Fireflies
    for (let i = 0; i < 9; i++) {
      const fx = 110 + ((frame * 0.63 + i * 98) % (GAME_W - 180));
      const fy = 140 + Math.sin(frame * 0.04 + i) * 18 + (i % 3) * 70;
      ctx.globalAlpha = 0.63 + Math.sin(frame * 0.16 + i) * 0.34;
      ctx.fillStyle = '#a7ffd3';
      ctx.fillRect(Math.round(fx), Math.round(fy), 2, 2);
    }
    ctx.globalAlpha = 1;
  } else if (zone === 2) {
    // Scorched Wastes — heat haze lines, cracked earth
    ctx.globalAlpha = 0.08;
    for (let i = 0; i < 12; i++) {
      const hx = (frame * 0.3 + i * 80) % GAME_W;
      ctx.fillStyle = '#ffd88a';
      ctx.fillRect(hx, 115 + Math.sin(frame * 0.02 + i) * 5, 40, 1);
    }
    ctx.globalAlpha = 0.12;
    ctx.strokeStyle = '#5a4a2a';
    ctx.lineWidth = 1;
    // Cracked earth pattern
    for (let i = 0; i < 8; i++) {
      const cx = 80 + i * 120;
      const cy = 200 + (i % 3) * 100;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + 30, cy - 20);
      ctx.lineTo(cx + 50, cy + 10);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    // Zone name
    ctx.font = '10px "Press Start 2P"';
    ctx.fillStyle = '#d4a84f';
    ctx.globalAlpha = 0.5;
    ctx.fillText('SCORCHED WASTES', 320, 86);
    ctx.globalAlpha = 1;
  } else if (zone === 3) {
    // Hollow Depth — ritual circles, boss arena marks
    ctx.strokeStyle = '#ff6b8a';
    ctx.lineWidth = 2;
    ctx.globalAlpha = 0.43;
    ctx.beginPath();
    ctx.arc(GAME_W / 2, 274, 122 + Math.sin(frame * 0.058) * 4, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(GAME_W / 2, 274, 84, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
    for (let i = 0; i < 6; i++) {
      const bx = 170 + i * 125;
      ctx.fillStyle = '#e9dfd1';
      ctx.fillRect(bx, 470, 14, 6);
      ctx.fillRect(bx + 3, 462, 8, 10);
    }
  } else if (zone === 4) {
    // Abyssal Sanctum — dark energy vortex, rune circles
    ctx.save();
    ctx.strokeStyle = '#9a5fff';
    ctx.lineWidth = 2;
    ctx.globalAlpha = 0.35 + Math.sin(frame * 0.04) * 0.1;
    ctx.beginPath();
    ctx.arc(GAME_W / 2, GAME_H / 2, 140 + Math.sin(frame * 0.03) * 6, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = '#ff3366';
    ctx.globalAlpha = 0.25 + Math.sin(frame * 0.06) * 0.08;
    ctx.beginPath();
    ctx.arc(GAME_W / 2, GAME_H / 2, 90, 0, Math.PI * 2);
    ctx.stroke();
    // Rotating inner rune
    ctx.translate(GAME_W / 2, GAME_H / 2);
    ctx.rotate(frame * 0.005);
    ctx.strokeStyle = '#7744bb';
    ctx.globalAlpha = 0.2;
    ctx.strokeRect(-50, -50, 100, 100);
    ctx.restore();
  }
}

function pixelRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, fill: string, outline: string) {
  ctx.fillStyle = fill; ctx.fillRect(x, y, w, h);
  ctx.fillStyle = outline;
  ctx.fillRect(x, y, w, 2);
  ctx.fillRect(x, y, 2, h);
  ctx.fillRect(x + w - 2, y, 2, h);
  ctx.fillRect(x, y + h - 2, w, 2);
}

function drawElder(ctx: CanvasRenderingContext2D, x: number, y: number, frame: number) {
  const bob = Math.sin(frame * 0.074) * 1.3;
  ctx.save();
  ctx.translate(x, y + bob);
  ctx.globalAlpha = 0.2; ctx.fillStyle = '#000';
  ctx.beginPath(); ctx.ellipse(0, 14, 16, 6, 0, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1;
  ctx.fillStyle = '#5b4b8e';
  ctx.fillRect(-13, -22, 26, 32);
  ctx.fillStyle = '#7362a9';
  ctx.fillRect(-9, -18, 18, 10);
  ctx.fillStyle = '#e8e3d8';
  ctx.fillRect(-9, -7, 18, 14);
  ctx.fillStyle = '#f7d7b0';
  ctx.fillRect(-9, -30, 18, 16);
  ctx.fillStyle = '#3d2f6b';
  ctx.fillRect(-12, -37, 24, 10);
  ctx.fillRect(-5, -48, 10, 12);
  ctx.fillStyle = '#b6864a';
  ctx.fillRect(14, -33, 3, 43);
  ctx.fillStyle = '#77f7ff';
  ctx.globalAlpha = 0.88 + Math.sin(frame * 0.21) * 0.1;
  ctx.fillRect(12, -38, 7, 7);
  ctx.globalAlpha = 1;
  ctx.restore();
  ctx.font = '8px "Press Start 2P"';
  ctx.textAlign = 'center';
  ctx.fillStyle = '#d8ccff';
  ctx.fillText('ELDER', x, y - 52);
  ctx.fillStyle = '#ffec9a';
  ctx.font = '7px "Press Start 2P"';
  ctx.fillText('[E]', x, y + 34);
  ctx.textAlign = 'left';
}

function drawHeroSprite(ctx: CanvasRenderingContext2D, x: number, y: number, pl: Player, _frame: number, faded: boolean) {
  ctx.save();
  ctx.translate(Math.round(x), Math.round(y));
  const bob = Math.sin(pl.spriteBob) * 1.5;
  ctx.translate(0, bob);
  ctx.fillStyle = faded ? '#8b5d33' : '#c93a37';
  ctx.fillRect(-9, -5, 18, 17);
  ctx.fillStyle = '#2c78d6';
  ctx.fillRect(-8, -12, 16, 18);
  ctx.fillStyle = '#f7d1a8';
  ctx.fillRect(-12, -10, 4, 10);
  ctx.fillRect(8, -10, 4, 10);
  ctx.fillStyle = '#f8d8a9';
  ctx.fillRect(-7, -27, 14, 13);
  ctx.fillStyle = '#6b3a1a';
  ctx.fillRect(-8, -28, 16, 5);
  ctx.fillRect(-9, -24, 3, 6);
  ctx.fillRect(6, -24, 3, 6);
  ctx.fillStyle = '#1a1620';
  if (pl.facing === 'left') { ctx.fillRect(-5, -21, 2, 2); }
  else if (pl.facing === 'right') { ctx.fillRect(3, -21, 2, 2); }
  else { ctx.fillRect(-4, -21, 2, 2); ctx.fillRect(2, -21, 2, 2); }
  const sx = pl.facing === 'left' ? -18 : pl.facing === 'right' ? 10 : 7;
  const sy = pl.facing === 'up' ? -22 : -8;
  ctx.fillStyle = '#d9e9f8';
  ctx.fillRect(sx, sy, 3, 16);
  ctx.fillStyle = '#f3c84b';
  ctx.fillRect(sx - 1, sy + 14, 5, 3);
  ctx.fillStyle = '#29426b';
  const legSwing = Math.sin(pl.spriteBob * 1.9) * 2;
  ctx.fillRect(-7, 6, 5, 9 + legSwing * 0.12);
  ctx.fillRect(2, 6, 5, 9 - legSwing * 0.12);
  ctx.restore();
}

function drawSlash(ctx: CanvasRenderingContext2D, pl: Player, active: number) {
  const t = active / 7;
  ctx.save();
  ctx.translate(pl.x, pl.y - 6);
  ctx.globalAlpha = 0.78 * t;
  ctx.strokeStyle = '#fff8d8';
  ctx.lineWidth = 3;
  const baseA = pl.facing === 'right' ? -0.7 : pl.facing === 'left' ? Math.PI + 0.7 : pl.facing === 'up' ? -2.35 : 0.95;
  const sweep = 1.75;
  ctx.beginPath();
  ctx.arc(0, 0, 34, baseA, baseA + sweep * (1 - t + 0.32));
  ctx.stroke();
  ctx.lineWidth = 7;
  ctx.globalAlpha = 0.22 * t;
  ctx.strokeStyle = '#ffe59a';
  ctx.beginPath();
  ctx.arc(0, 0, 34, baseA, baseA + sweep * (1 - t + 0.32));
  ctx.stroke();
  ctx.restore();
}

function drawEnemy(ctx: CanvasRenderingContext2D, e: Enemy, frame: number) {
  ctx.save();
  ctx.translate(Math.round(e.x), Math.round(e.y));
  if (e.hitFlash > 0 && frame % 2 === 0) {
    ctx.globalAlpha = 0.78;
    ctx.filter = 'brightness(1.9) saturate(0.4)';
  }

  // Clone: ghostly transparency
  if (e.isClone) {
    ctx.globalAlpha = 0.5 + Math.sin(frame * 0.15) * 0.15;
  }

  if (e.type === 'slime') {
    const squish = Math.sin(frame * 0.22 + e.id) * 1.3;
    ctx.fillStyle = '#59d679';
    ctx.fillRect(-14, -10 + squish * 0.5, 28, 16 - squish);
    ctx.fillStyle = '#42b562';
    ctx.fillRect(-14, 2, 28, 4);
    ctx.fillStyle = '#0d2817';
    ctx.fillRect(-7, -5, 3, 3);
    ctx.fillRect(4, -5, 3, 3);
    ctx.fillStyle = '#b8ffd3';
    ctx.fillRect(-10, -8, 3, 2);
  } else if (e.type === 'bat') {
    const flap = Math.sin(frame * 0.52 + e.id * 1.7);
    ctx.fillStyle = '#5b3b6f';
    ctx.fillRect(-7, -5, 14, 9);
    ctx.fillStyle = '#7a4f95';
    ctx.fillRect(-18, -4 + flap * 2, 11, 4);
    ctx.fillRect(7, -4 - flap * 2, 11, 4);
    ctx.fillStyle = '#f8b0b8';
    ctx.fillRect(-3, -2, 2, 2); ctx.fillRect(1, -2, 2, 2);
  } else if (e.type === 'goblin') {
    ctx.fillStyle = '#6ba652';
    ctx.fillRect(-10, -16, 20, 22);
    ctx.fillStyle = '#52853e';
    ctx.fillRect(-10, 4, 20, 4);
    ctx.fillStyle = '#7fc563';
    ctx.fillRect(-9, -28, 18, 14);
    ctx.fillStyle = '#6ba652';
    ctx.fillRect(-14, -26, 5, 5);
    ctx.fillRect(9, -26, 5, 5);
    ctx.fillStyle = '#ff4747';
    ctx.fillRect(-5, -23, 3, 3);
    ctx.fillRect(2, -23, 3, 3);
    ctx.fillStyle = '#93633a';
    ctx.fillRect(11, -8, 4, 17);
  } else if (e.type === 'scorpion') {
    // Dark red scorpion
    const wiggle = Math.sin(frame * 0.3 + e.id) * 1;
    ctx.fillStyle = '#8b3a2a';
    ctx.fillRect(-12, -6, 24, 10);
    ctx.fillStyle = '#a04a38';
    ctx.fillRect(-10, -8, 20, 4);
    // Pincers
    ctx.fillStyle = '#6b2a1a';
    ctx.fillRect(-16, -10 + wiggle, 5, 6);
    ctx.fillRect(11, -10 - wiggle, 5, 6);
    // Tail
    ctx.fillStyle = '#a04a38';
    ctx.fillRect(0, -14, 3, 8);
    ctx.fillRect(1, -18, 2, 5);
    // Stinger
    ctx.fillStyle = '#ff6644';
    ctx.fillRect(0, -20, 3, 3);
    // Eyes
    ctx.fillStyle = '#ffaa44';
    ctx.fillRect(-6, -7, 2, 2);
    ctx.fillRect(4, -7, 2, 2);
  } else if (e.type === 'wraith') {
    // Ghostly wraith
    const bob = Math.sin(frame * 0.12 + e.id) * 3;
    ctx.globalAlpha = (e.isClone ? 0.35 : 0.65) + Math.sin(frame * 0.08 + e.id) * 0.15;
    ctx.fillStyle = '#8866bb';
    ctx.fillRect(-10, -18 + bob, 20, 26);
    ctx.fillStyle = '#aa88dd';
    ctx.fillRect(-8, -24 + bob, 16, 8);
    // Ragged bottom edge
    ctx.fillStyle = '#6644aa';
    ctx.fillRect(-10, 4 + bob, 6, 4);
    ctx.fillRect(4, 4 + bob, 6, 4);
    // Eyes
    ctx.fillStyle = '#ff3366';
    ctx.globalAlpha = 0.9;
    ctx.fillRect(-5, -16 + bob, 3, 3);
    ctx.fillRect(2, -16 + bob, 3, 3);
    ctx.globalAlpha = 1;
  } else if (e.type === 'skeleton') {
    // Skeletal knight
    ctx.fillStyle = '#d8d0c0';
    // Body armor
    ctx.fillRect(-10, -16, 20, 24);
    ctx.fillStyle = '#6a6a7a';
    ctx.fillRect(-12, -18, 24, 4); // Shoulders
    // Skull head
    ctx.fillStyle = '#e8e0d0';
    ctx.fillRect(-8, -30, 16, 14);
    ctx.fillStyle = '#1a1a2a';
    ctx.fillRect(-5, -26, 3, 4); // Left eye socket
    ctx.fillRect(2, -26, 3, 4);  // Right eye socket
    ctx.fillRect(-3, -22, 6, 2);  // Mouth
    // Red glow in eyes
    ctx.fillStyle = '#ff4444';
    ctx.fillRect(-4, -25, 1, 2);
    ctx.fillRect(3, -25, 1, 2);
    // Shield
    ctx.fillStyle = '#4a4a5a';
    ctx.fillRect(-16, -14, 5, 16);
    ctx.fillStyle = '#6a6a8a';
    ctx.fillRect(-15, -12, 3, 12);
    // Sword
    ctx.fillStyle = '#c0c0d0';
    ctx.fillRect(12, -20, 3, 22);
    ctx.fillStyle = '#8a7a5a';
    ctx.fillRect(11, -2, 5, 3);
    // Legs
    ctx.fillStyle = '#b0a890';
    ctx.fillRect(-7, 6, 5, 8);
    ctx.fillRect(2, 6, 5, 8);
  } else if (e.type === 'sandwyrm') {
    // Sand Wyrm — large segmented worm
    const pulse = Math.sin(frame * 0.08) * 2;
    // Body segments
    ctx.fillStyle = '#c4883a';
    ctx.fillRect(-28, -18 + pulse * 0.5, 56, 30);
    ctx.fillStyle = '#a06828';
    ctx.fillRect(-28, 8, 56, 5);
    // Head
    ctx.fillStyle = '#d4a84f';
    ctx.fillRect(-24, -36, 48, 22);
    // Mandibles
    ctx.fillStyle = '#8a5a20';
    ctx.fillRect(-28, -30, 6, 12);
    ctx.fillRect(22, -30, 6, 12);
    // Eyes
    ctx.fillStyle = '#ffcc00';
    ctx.globalAlpha = 0.9 + Math.sin(frame * 0.25) * 0.1;
    ctx.fillRect(-14, -32, 6, 5);
    ctx.fillRect(8, -32, 6, 5);
    ctx.globalAlpha = 1;
    // Plates
    ctx.fillStyle = '#e0b860';
    ctx.fillRect(-20, -14, 40, 4);
    ctx.fillRect(-16, -6, 32, 4);
  } else if (e.type === 'shadow_warden') {
    // Shadow Warden — tall dark figure
    const pulse = Math.sin(frame * 0.07) * 2;
    const floatBob = Math.sin(frame * 0.05) * 4;
    ctx.translate(0, floatBob);
    // Dark robe body
    ctx.fillStyle = e.isClone ? '#3a2860' : '#1a1030';
    ctx.fillRect(-22, -24 + pulse * 0.3, 44, 36);
    ctx.fillStyle = e.isClone ? '#4a3870' : '#2a1840';
    ctx.fillRect(-26, 6, 52, 8);
    // Ragged cloak edges
    ctx.fillRect(-26, 10, 10, 4);
    ctx.fillRect(16, 10, 10, 4);
    // Hood
    ctx.fillStyle = e.isClone ? '#5a4880' : '#2a1840';
    ctx.fillRect(-18, -44, 36, 24);
    ctx.fillRect(-14, -50, 28, 8);
    // Glowing eyes
    ctx.fillStyle = '#ff3366';
    ctx.globalAlpha = 0.85 + Math.sin(frame * 0.2) * 0.15;
    ctx.fillRect(-10, -38, 5, 4);
    ctx.fillRect(5, -38, 5, 4);
    ctx.globalAlpha = 1;
    // Crown of dark energy
    ctx.fillStyle = '#9a5fff';
    ctx.globalAlpha = 0.7 + Math.sin(frame * 0.15) * 0.2;
    ctx.fillRect(-16, -56, 32, 6);
    ctx.fillRect(-10, -60, 6, 6);
    ctx.fillRect(4, -60, 6, 6);
    ctx.fillRect(-3, -62, 6, 8);
    ctx.globalAlpha = 1;
    // Staff
    ctx.fillStyle = '#4a3a6a';
    ctx.fillRect(24, -50, 3, 58);
    ctx.fillStyle = '#9a5fff';
    ctx.globalAlpha = 0.8 + Math.sin(frame * 0.3) * 0.2;
    ctx.fillRect(22, -56, 7, 7);
    ctx.globalAlpha = 1;
  } else {
    // Boss rot-tusk (Gruk)
    const pulse = Math.sin(frame * 0.09) * 2;
    ctx.fillStyle = '#b03a4b';
    ctx.fillRect(-26, -22 + pulse * 0.4, 52, 34);
    ctx.fillStyle = '#902434';
    ctx.fillRect(-26, 8, 52, 5);
    ctx.fillStyle = '#ce4a5d';
    ctx.fillRect(-22, -46, 44, 28);
    ctx.fillStyle = '#f3e7cf';
    ctx.fillRect(-18, -22, 5, 14);
    ctx.fillRect(13, -22, 5, 14);
    ctx.fillStyle = '#fff06a';
    ctx.globalAlpha = 0.9 + Math.sin(frame * 0.34) * 0.1;
    ctx.fillRect(-12, -38, 6, 5);
    ctx.fillRect(6, -38, 6, 5);
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#e2b64b';
    ctx.fillRect(-18, -52, 36, 6);
    ctx.fillRect(-12, -58, 6, 8);
    ctx.fillRect(-3, -60, 6, 10);
    ctx.fillRect(6, -58, 6, 8);
  }
  ctx.filter = 'none';
  ctx.restore();

  // HP bar
  const hpPct = e.hp / e.maxHp;
  if (hpPct < 0.999) {
    const big = isBigEnemy(e.type);
    const bw = big ? 72 : 34;
    const barY = big ? -62 : -30;
    ctx.fillStyle = '#10161d';
    ctx.fillRect(e.x - bw / 2 - 1, e.y + barY - 1, bw + 2, 6);
    ctx.fillStyle = hpPct > 0.55 ? '#6df29a' : hpPct > 0.27 ? '#ffd35a' : '#ff5a6e';
    ctx.fillRect(e.x - bw / 2, e.y + barY, Math.round(bw * hpPct), 4);
  }
}

function drawCoin(ctx: CanvasRenderingContext2D, x: number, y: number, frame: number) {
  ctx.save();
  ctx.translate(x, y);
  const spin = Math.sin(frame * 0.18 + x * 0.04);
  ctx.scale(Math.abs(spin) * 0.9 + 0.28, 1);
  ctx.fillStyle = '#ffcf44';
  ctx.beginPath(); ctx.arc(0, 0, 7, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#fff1a8';
  ctx.beginPath(); ctx.arc(-2, -2, 2.4, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

function drawHerb(ctx: CanvasRenderingContext2D, x: number, y: number, frame: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = '#3fbf73';
  ctx.fillRect(-2, 0, 4, 8);
  for (let i = 0; i < 3; i++) {
    const ang = -0.55 + i * 0.55 + Math.sin(frame * 0.09 + i) * 0.08;
    ctx.save();
    ctx.rotate(ang);
    ctx.fillStyle = '#6affa2';
    ctx.fillRect(0, -7, 3, 7);
    ctx.restore();
  }
  ctx.globalAlpha = 0.7 + Math.sin(frame * 0.23 + x) * 0.3;
  ctx.fillStyle = '#c7ffe4';
  ctx.fillRect(-1, -9, 2, 2);
  ctx.globalAlpha = 1;
  ctx.restore();
}

function drawHeartPickup(ctx: CanvasRenderingContext2D, x: number, y: number) {
  ctx.fillStyle = '#ff5d78';
  ctx.fillRect(x - 5, y - 2, 10, 7);
  ctx.fillRect(x - 7, y - 5, 6, 5);
  ctx.fillRect(x + 1, y - 5, 6, 5);
}

function drawKey(ctx: CanvasRenderingContext2D, x: number, y: number, frame: number, type = 'key') {
  ctx.save();
  ctx.translate(x, y);
  ctx.globalAlpha = 0.95;
  const color = type === 'hollow_key' ? '#7aefff' : type === 'sanctum_seal' ? '#d88fff' : '#f5d45a';
  const darkColor = type === 'hollow_key' ? '#3a8a99' : type === 'sanctum_seal' ? '#6a3a8a' : '#1a1916';
  ctx.fillStyle = color;
  if (type === 'sanctum_seal') {
    // Draw as a seal/medallion
    ctx.fillRect(-8, -8, 16, 16);
    ctx.fillStyle = darkColor;
    ctx.fillRect(-4, -4, 8, 8);
    ctx.fillStyle = '#ff55aa';
    ctx.fillRect(-2, -2, 4, 4);
  } else {
    ctx.fillRect(-10, -2, 14, 4);
    ctx.fillRect(-14, -5, 6, 10);
    ctx.fillStyle = darkColor;
    ctx.fillRect(-12, -2, 2, 2);
    ctx.fillStyle = color;
    ctx.fillRect(3, 0, 3, 4);
    ctx.fillRect(3, 4, 5, 3);
  }
  ctx.globalAlpha = 0.55 + Math.sin(frame * 0.22) * 0.45;
  ctx.fillStyle = '#fff8c8';
  ctx.fillRect(-16, -8, 2, 2);
  ctx.fillRect(8, -6, 2, 2);
  ctx.restore();
}

function drawRelic(ctx: CanvasRenderingContext2D, x: number, y: number, frame: number) {
  ctx.save();
  ctx.translate(x, y);
  // Ancient relic — glowing artifact
  ctx.globalAlpha = 0.85 + Math.sin(frame * 0.15 + x) * 0.15;
  ctx.fillStyle = '#ffa94d';
  ctx.fillRect(-6, -8, 12, 12);
  ctx.fillStyle = '#ffcc77';
  ctx.fillRect(-4, -6, 8, 8);
  ctx.fillStyle = '#fff';
  ctx.fillRect(-2, -4, 4, 4);
  // Glowing effect
  ctx.globalAlpha = 0.3 + Math.sin(frame * 0.12 + x) * 0.15;
  ctx.fillStyle = '#ffa94d';
  ctx.fillRect(-10, -12, 20, 20);
  ctx.globalAlpha = 1;
  ctx.restore();
}
