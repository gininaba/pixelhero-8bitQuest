import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { GameState, GamePhase, HighScore, Vec } from './game/types';
import { GAME_W, GAME_H, ZONES, getInitialQuests, SHOP_ITEMS, ALL_PERKS } from './game/config';
import { resetWorld, updateWorld, InputState } from './game/engine';
import { renderFrame } from './game/renderer';
import { audio } from './game/audio';
import { clamp } from './game/utils';


// Retro Pixel-Art SVG Icons
const QuestIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="square" style={{ shapeRendering: 'crispEdges' }}>
    <path d="M3 2h10v12H3z" fill="#1b241e" stroke="currentColor" strokeWidth="1" />
    <path d="M5 5h6M5 8h6M5 11h4" stroke="currentColor" strokeWidth="1" />
    <path d="M2 1h12v1H2zm0 13h12v1H2z" fill="currentColor" />
  </svg>
);

const MapIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="square" style={{ shapeRendering: 'crispEdges' }}>
    <rect x="2" y="2" width="12" height="12" fill="#0f191d" stroke="currentColor" />
    <path d="M5 2v12M11 2v12" stroke="currentColor" strokeDasharray="1 1" />
    <path d="M8 5l2 3H6z" fill="#ff5a5a" />
    <path d="M8 11l-2-3h4z" fill="#7ea6aa" />
  </svg>
);

const StatsIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="square" style={{ shapeRendering: 'crispEdges' }}>
    <path d="M3 2h10v4c0 4-5 7-5 7s-5-3-5-7V2z" fill="#1e131d" stroke="currentColor" />
    <path d="M8 4v5M6 6h4" stroke="currentColor" />
  </svg>
);

const HofIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="square" style={{ shapeRendering: 'crispEdges' }}>
    <path d="M2 11h12v2H2z" fill="currentColor" />
    <path d="M2 5l3 3 3-4 3 4 3-4v6H2z" fill="#201a10" stroke="currentColor" />
    <rect x="4" y="4" width="2" height="2" fill="#ff5a5a" />
    <rect x="10" y="4" width="2" height="2" fill="#5cbfff" />
  </svg>
);

const SwordIcon = ({ className = "w-9 h-9" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 16 16" fill="none" style={{ shapeRendering: 'crispEdges' }}>
    <path d="M7 7l5-5 2 2-5 5z" fill="#e2e8f0" stroke="#94a3b8" strokeWidth="1" />
    <path d="M9 5l3-3 1 1-3 3z" fill="#ffffff" />
    <path d="M5 8l3 3M4 9l3 3" stroke="#f59e0b" strokeWidth="1" />
    <path d="M3 11l2 2" stroke="#78350f" strokeWidth="1.5" />
    <rect x="2" y="13" width="1" height="1" fill="#ef4444" />
  </svg>
);

const SpeedIcon = ({ className = "w-9 h-9" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 16 16" fill="none" style={{ shapeRendering: 'crispEdges' }}>
    <path d="M10 1H6L3 8h4v7l6-8H8z" fill="#facc15" stroke="#ca8a04" strokeWidth="1" />
    <path d="M9 2H7L4.5 8H8v5l4.5-6H8z" fill="#fef08a" />
  </svg>
);

const HeartIcon = ({ className = "w-9 h-9" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 16 16" fill="none" style={{ shapeRendering: 'crispEdges' }}>
    <path d="M2 3h3v1H2zm7 0h3v1H9zm-8 1h14v3H1zm1 3h12v1H2zm1 1h10v1H3zm1 1h8v1H4zm1 1h6v1H5zm1 1h4v1H6zm1 1h2v1H7z" fill="#ef4444" />
    <path d="M2 2h3v1H2zm7 0h3v1H9zM1 3h1v1H1zm5 0h1v1H6zm2 0h1v1H8zm5 0h1v1H13zM0 4h1v3H0zm15 0h1v3H15zM1 7h1v1H1zm13 0h1v1H13zM2 8h1v1H2zm11 0h1v1H13zM3 9h1v1H3zm9 0h1v1H12zM4 10h1v1H4zm7 0h1v1H11zM5 11h1v1H5zm5 0h1v1H10zM6 12h1v1H6zm3 0h1v1H9zM7 13h2v1H7z" fill="#450a0a" />
    <rect x="3" y="4" width="2" height="2" fill="#ffffff" />
  </svg>
);

const FireballIcon = ({ className = "w-9 h-9" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 16 16" fill="none" style={{ shapeRendering: 'crispEdges' }}>
    <path d="M8 1c0 0-4 3-4 6a4 4 0 008 0c0-3-4-6-4-6z" fill="#f97316" stroke="#c2410c" strokeWidth="1" />
    <path d="M8 4c0 0-2 2-2 4a2 2 0 004 0c0-2-2-4-2-4z" fill="#eab308" />
    <path d="M8 6c0 0-1 1-1 2a1 1 0 002 0c0-1-1-2-1-2z" fill="#ffffff" />
  </svg>
);

const SkullIcon = ({ className = "w-9 h-9" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 16 16" fill="none" style={{ shapeRendering: 'crispEdges' }}>
    <path d="M3 5v5h1v2h2v1h4v-1h2v-2h1V5c0-3-3-4-5-4S3 2 3 5z" fill="#e2e8f0" stroke="#475569" strokeWidth="1" />
    <rect x="5" y="5" width="2" height="2" fill="#bd52ff" />
    <rect x="9" y="5" width="2" height="2" fill="#bd52ff" />
    <rect x="7" y="8" width="2" height="1" fill="#475569" />
    <path d="M5 10h1v1H5zm2 0h1v1H7zm2 0h1v1H9zm2 0h1v1H11z" fill="#ffffff" />
  </svg>
);


export default function App() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const gameRef = useRef<GameState>({
    phase: 'menu',
    zone: 0,
    time: 0,
    frame: 0,
    kills: 0,
    score: 0,
    hitStop: 0,
    shake: 0,
    camera: { x: 0, y: 0 },
    player: null,
    enemies: [],
    drops: [],
    particles: [],
    floaters: [],
    quests: getInitialQuests(),
    bossSpawned: false,
    elderTalked: false,
    hasKey: false,
    gameStartTime: 0,
    projectiles: [],
    decor: [],
    perkChoices: [],
    hasHollowKey: false,
    hasSanctumSeal: false,
    sandwyrmDefeated: false,
    grukDefeated: false,
    waveNumber: 0,
    waveTimer: 0,
    waveCleared: false,
    waveEnemiesLeft: 0,
    ngPlus: false,
    ngPlusLevel: 0,
    dungeonFloor: 0,
    lightningStrike: null
  });

  const keysRef = useRef<Record<string, boolean>>({});
  const touchMoveRef = useRef<Vec>({ x: 0, y: 0 });
  const touchActiveRef = useRef(false);

  const [phase, setPhase] = useState<GamePhase>('menu');
  const [hudTick, setHudTick] = useState(0);
  const [dialog, setDialog] = useState<{ speaker: string; lines: string[]; idx: number } | null>(null);
  const [questLogOpen, setQuestLogOpen] = useState(false);
  const [touchAttack, setTouchAttack] = useState(false);
  const [touchDash, setTouchDash] = useState(false);
  const [touchInteract, setTouchInteract] = useState(false);
  const [nameInput, setNameInput] = useState('HERO');
  const [muted, setMuted] = useState(() => audio.isMuted());
  const [highScores, setHighScores] = useState<HighScore[]>(() => {
    try { return JSON.parse(localStorage.getItem('pixHeroScores') || '[]'); } catch { return []; }
  });
  const [activeSidebarTab, setActiveSidebarTab] = useState<'quests' | 'map' | 'stats' | 'scores'>('quests');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scoreSaved, setScoreSaved] = useState(false);

  const g = gameRef.current;

  // Initialize Web Audio Engine on first interaction
  useEffect(() => {
    const initAudio = () => {
      audio.init();
    };
    window.addEventListener('click', initAudio, { once: true });
    window.addEventListener('keydown', initAudio, { once: true });
    return () => {
      window.removeEventListener('click', initAudio);
      window.removeEventListener('keydown', initAudio);
    };
  }, []);

  useEffect(() => {
    if (phase !== 'playing' && phase !== 'paused' && phase !== 'dialog') return;
    const id = setInterval(() => setHudTick(t => t + 1), 82);
    return () => clearInterval(id);
  }, [phase]);

  const startGame = useCallback(() => {
    audio.init();
    gameRef.current.ngPlus = false;
    gameRef.current.ngPlusLevel = 0;
    resetWorld(gameRef.current);
    gameRef.current.phase = 'playing';
    setPhase('playing');
    setDialog(null);
    setQuestLogOpen(false);
    setScoreSaved(false);
    audio.setZoneMusic(0);
  }, []);

  const toggleMute = () => {
    const nextMuted = audio.toggleMute();
    setMuted(nextMuted);
  };

  // Inputs
  useEffect(() => {
    const kd = (e: KeyboardEvent) => {
      keysRef.current[e.key.toLowerCase()] = true;
      if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(e.key.toLowerCase())) e.preventDefault();

      const gr = gameRef.current;

      if (e.key === 'Escape') {
        if (gr.phase === 'playing') {
          gr.phase = 'paused';
          setPhase('paused');
          audio.pauseMusic();
        } else if (gr.phase === 'paused') {
          gr.phase = 'playing';
          setPhase('playing');
          audio.resumeMusic();
        } else if (gr.phase === 'shop') {
          gr.phase = 'playing';
          setPhase('playing');
          audio.playSfx('click');
        }
      }

      if (e.key.toLowerCase() === 'e' && gr.phase === 'shop') {
        gr.phase = 'playing';
        setPhase('playing');
        audio.playSfx('click');
      }

      if (e.key.toLowerCase() === 'q') setQuestLogOpen(o => !o);
      if (e.key.toLowerCase() === 'p') {
        if (gr.phase === 'playing') {
          gr.phase = 'paused';
          setPhase('paused');
          audio.pauseMusic();
        } else if (gr.phase === 'paused') {
          gr.phase = 'playing';
          setPhase('playing');
          audio.resumeMusic();
        }
      }
      if (e.key.toLowerCase() === 'r') {
        if (gr.phase === 'gameover' || gr.phase === 'victory' || gr.phase === 'playing' || gr.phase === 'paused') {
          resetWorld(gr);
          gr.phase = 'playing';
          setPhase('playing');
          setDialog(null);
          setQuestLogOpen(false);
          setScoreSaved(false);
        }
      }
      if (e.key === ' ' || e.key.toLowerCase() === 'enter') {
        if (gr.phase === 'dialog') {
          e.preventDefault();
        }
      }
    };
    const ku = (e: KeyboardEvent) => { keysRef.current[e.key.toLowerCase()] = false; };
    window.addEventListener('keydown', kd);
    window.addEventListener('keyup', ku);
    return () => { window.removeEventListener('keydown', kd); window.removeEventListener('keyup', ku); };
  }, []);

  // Touch joystick handlers (Callback Refs to handle mounting/unmounting across layouts dynamically)
  const joystickLandscapeCleanupRef = useRef<(() => void) | null>(null);
  const joystickPortraitCleanupRef = useRef<(() => void) | null>(null);

  const setupJoystick = useCallback((node: HTMLDivElement | null, cleanupRef: React.MutableRefObject<(() => void) | null>) => {
    if (cleanupRef.current) {
      cleanupRef.current();
      cleanupRef.current = null;
    }
    if (node !== null) {
      let activePointerId: number | null = null;

      const start = (e: PointerEvent) => {
        // Only trigger on primary pointer (left click, touch contact)
        if (e.button !== undefined && e.button !== 0) return;
        node.setPointerCapture(e.pointerId);
        activePointerId = e.pointerId;
        touchActiveRef.current = true;
        updatePosition(e);
      };

      const updatePosition = (e: PointerEvent) => {
        if (activePointerId === null || e.pointerId !== activePointerId) return;
        const rect = node.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        let dx = (e.clientX - cx) / (rect.width / 2 - 14);
        let dy = (e.clientY - cy) / (rect.height / 2 - 14);
        const mag = Math.hypot(dx, dy);
        if (mag > 1) { dx /= mag; dy /= mag; }
        touchMoveRef.current = { x: dx, y: dy };

        // Update DOM element directly for high performance 60fps smooth movement
        const knob = node.querySelector('.joystick-knob') as HTMLDivElement | null;
        if (knob) {
          const maxOffset = node.clientWidth / 2 - 18;
          knob.style.transform = `translate(calc(-50% + ${dx * maxOffset}px), calc(-50% + ${dy * maxOffset}px))`;
        }
      };

      const end = (e: PointerEvent) => {
        if (activePointerId === null || e.pointerId !== activePointerId) return;
        try {
          node.releasePointerCapture(e.pointerId);
        } catch {
          // Ignore if pointer capture was already lost
        }
        activePointerId = null;
        touchActiveRef.current = false;
        touchMoveRef.current = { x: 0, y: 0 };

        const knob = node.querySelector('.joystick-knob') as HTMLDivElement | null;
        if (knob) {
          knob.style.transform = 'translate(-50%, -50%)';
        }
      };

      node.addEventListener('pointerdown', start);
      node.addEventListener('pointermove', updatePosition);
      node.addEventListener('pointerup', end);
      node.addEventListener('pointercancel', end);

      cleanupRef.current = () => {
        node.removeEventListener('pointerdown', start);
        node.removeEventListener('pointermove', updatePosition);
        node.removeEventListener('pointerup', end);
        node.removeEventListener('pointercancel', end);
      };
    }
  }, []);

  const joyLandscapeRef = useCallback((node: HTMLDivElement | null) => {
    setupJoystick(node, joystickLandscapeCleanupRef);
  }, [setupJoystick]);

  const joyPortraitRef = useCallback((node: HTMLDivElement | null) => {
    setupJoystick(node, joystickPortraitCleanupRef);
  }, [setupJoystick]);

  // Game loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: false })!;
    ctx.imageSmoothingEnabled = false;

    let raf = 0;
    let last = performance.now();

    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      const gr = gameRef.current;
      const dtClamp = Math.min(34, now - last);
      last = now;

      // Draw last state static canvas frame if game is paused or overlays are active
      if (gr.phase !== 'playing') {
        renderFrame(ctx, gr);
        return;
      }
      if (gr.hitStop > 0) {
        gr.hitStop--;
        renderFrame(ctx, gr);
        return;
      }

      const keys = keysRef.current;
      let ix = 0, iy = 0;
      if (keys['arrowleft'] || keys['a']) ix -= 1;
      if (keys['arrowright'] || keys['d']) ix += 1;
      if (keys['arrowup'] || keys['w']) iy -= 1;
      if (keys['arrowdown'] || keys['s']) iy += 1;

      if (touchActiveRef.current) {
        ix += touchMoveRef.current.x;
        iy += touchMoveRef.current.y;
      }

      const inputs: InputState = {
        ix, iy,
        attack: keys[' '] || keys['j'] || keys['k'] || touchAttack,
        dash: keys['shift'] || keys['l'] || touchDash,
        interact: keys['e'] || keys['f'] || touchInteract
      };

      if (inputs.attack) setTouchAttack(false);
      if (inputs.dash) setTouchDash(false);
      if (inputs.interact) {
        keys['e'] = false; keys['f'] = false;
        setTouchInteract(false);
      }

      updateWorld(gr, inputs, dtClamp, setDialog, setPhase);
      renderFrame(ctx, gr);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [phase, touchAttack, touchDash, touchInteract]);

  const saveScore = () => {
    if (scoreSaved) return;
    const gr = gameRef.current;
    const finalScore = gr.score;
    const entry: HighScore = { name: nameInput.slice(0, 8).toUpperCase() || 'HERO', score: finalScore, day: new Date().toLocaleDateString('en-CA') };
    const next = [...highScores, entry].sort((a, b) => b.score - a.score).slice(0, 7);
    setHighScores(next);
    localStorage.setItem('pixHeroScores', JSON.stringify(next));
    setScoreSaved(true);
  };

  const buyShopItem = (item: any) => {
    const pl = g.player;
    if (!pl) return;

    let cost = item.cost;
    if (item.id === 'sword') {
      const swordLvl = Math.floor(pl.damageBonus / 6);
      cost = Math.floor(item.cost * Math.pow(item.costMult, swordLvl));
    }

    if (pl.coins < cost) {
      audio.playSfx('hurt');
      return;
    }

    if (item.id === 'potion') {
      if (pl.hp >= pl.maxHp) {
        audio.playSfx('click');
        return;
      }
      pl.coins -= cost;
      pl.hp = Math.min(pl.hp + 35, pl.maxHp);
      audio.playSfx('shop');
    } else if (item.id === 'sword') {
      pl.coins -= cost;
      pl.damageBonus += 6;
      audio.playSfx('shop');
    } else if (item.id === 'boots') {
      if (pl.speedBonus > 0) return;
      pl.coins -= cost;
      pl.speedBonus = 0.45;
      pl.dashCdMax = 30;
      audio.playSfx('shop');
    } else if (item.id === 'armor') {
      if (pl.maxHp >= 180) {
        audio.playSfx('click');
        return;
      }
      pl.coins -= cost;
      pl.maxHp += 25;
      pl.hp = pl.maxHp;
      audio.playSfx('shop');
    }

    setHudTick(t => t + 1);
  };

  const selectPerk = (perkId: string) => {
    const pl = g.player;
    if (!pl) return;

    pl.level++;
    pl.maxHp += 10;

    if (perkId === 'sword') {
      pl.damageBonus += 6;
    } else if (perkId === 'speed') {
      pl.speedBonus += 0.35;
      pl.dashCdMax = Math.max(22, pl.dashCdMax - 8);
    } else if (perkId === 'hp') {
      pl.maxHp += 15;
    } else if (perkId === 'fireball') {
      pl.hasFireball = true;
    } else if (perkId === 'vampire') {
      pl.hasVampire = true;
    } else if (perkId === 'lightning') {
      pl.hasLightning = true;
    } else if (perkId === 'shield') {
      pl.hasShield = true;
    }

    pl.hp = pl.maxHp;
    g.phase = 'playing';
    setPhase('playing');
    audio.playSfx('levelup');
    setHudTick(t => t + 1);
  };
  const topQuests = useMemo(() => {
    return g.quests.filter(q => !q.done).slice(0, 3);
  }, [hudTick, g.quests]);

  const renderSidebarContent = () => {
    switch (activeSidebarTab) {
      case 'quests':
        return (
          <div className="space-y-[12px] animate-fade-in">
            <div className="flex items-center justify-between border-b border-[#1c2923] pb-2">
              <span className="pixelfont text-[9px] text-[#ffe37a] tracking-wider">ACTIVE TASKS</span>
              <span className="vtt text-[15px] text-[#7ea58e]">{g.quests.filter(q => q.done).length}/{g.quests.length} Done</span>
            </div>
            <div className="space-y-3">
              {g.quests.map(q => (
                <div key={q.id} className="p-2.5 bg-[#0d1613] border border-[#1e3328] rounded-lg hover:border-[#2b4d3a] transition-all duration-150">
                  <div className="flex items-center justify-between gap-2">
                    <div className={`pixelfont text-[9px] leading-relaxed ${q.done ? 'text-[#6be39a] line-through opacity-70' : 'text-[#daf6e1]'}`}>
                      {q.done ? '✓ ' : '▸ '}{q.title}
                    </div>
                    {q.done && <span className="text-[7px] pixelfont text-[#6be39a] bg-[#142d1f] px-1.5 py-0.5 rounded border border-[#234d35]">DONE</span>}
                  </div>
                  <div className="vtt text-[16px] text-[#98c9a4] mt-0.5 leading-snug">{q.desc}</div>
                  {q.target > 1 && !q.done && (
                    <div className="mt-1.5">
                      <div className="w-full h-[5px] bg-[#121c17] border border-[#21382d] rounded overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-[#ffd75d] to-[#ffe58c]" style={{ width: `${(q.progress / q.target) * 100}%` }} />
                      </div>
                      <div className="text-right vtt text-[13px] text-[#8fc49f] mt-0.5">{q.progress}/{q.target}</div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        );
      case 'map':
        return (
          <div className="space-y-3 animate-fade-in">
            <div className="border-b border-[#182329] pb-2">
              <span className="pixelfont text-[9px] text-[#9eeaff] tracking-wider">WORLD MAP</span>
            </div>
            <div className="space-y-2 vtt text-[18px]">
              {ZONES.map((z, i) => (
                <div key={z.id} className={`flex items-center justify-between px-3 py-2 rounded-lg border transition-all duration-200 ${g.zone === i ? 'bg-[#122820] border-[#39a06b] text-[#b8ffe2] shadow-[0_0_10px_rgba(57,160,107,0.1)]' : 'bg-[#0b1115] border-[#1c2930] text-[#8ea6aa] hover:bg-[#0f171d]'}`}>
                  <div className="flex flex-col">
                    <span className="font-bold tracking-wide">{z.name}</span>
                    <span className="text-[12px] text-[#708a90] -mt-1">{z.safe ? 'Safe Town' : 'Combat Zone'}</span>
                  </div>
                  <span className="pixelfont text-[7px]">{g.zone === i ? '● ACTIVE' : '○'}</span>
                </div>
              ))}
            </div>
            <div className="pixelfont text-[8px] text-[#7ea597] bg-[#0c1311] border border-[#1c2c26] rounded-lg p-2.5 mt-3 leading-[14px]">
              Travel between zones automatically by walking off the screen edges (Left/Right). The Boss gate in Scorched Wastes requires the Rusted Key.
            </div>
          </div>
        );
      case 'stats':
        return (
          <div className="space-y-3 animate-fade-in">
            <div className="border-b border-[#291f2a] pb-2">
              <span className="pixelfont text-[9px] text-[#fea7bb] tracking-wider">HERO STATS</span>
            </div>
            <div className="bg-[#0f0b12] border border-[#2b1c2e] rounded-lg p-3 vtt text-[17px] text-[#d3b8c2] space-y-1.5">
              <div className="flex justify-between border-b border-[#211624]/40 pb-1">
                <span>Base Sword Damage:</span>
                <span className="text-[#ff9ab0] font-bold">{24 + Math.floor((g.player?.level ?? 1) * 2.5) + (g.player?.damageBonus ?? 0)}</span>
              </div>
              <div className="flex justify-between border-b border-[#211624]/40 pb-1">
                <span>Bonus Shop Damage:</span>
                <span className="text-[#ffdf79] font-bold">+{g.player?.damageBonus ?? 0}</span>
              </div>
              <div className="flex justify-between border-b border-[#211624]/40 pb-1">
                <span>Movement Speed:</span>
                <span className="text-[#9fdfff] font-bold">{(2.35 + (g.player?.speedBonus ?? 0)).toFixed(2)}</span>
              </div>
              <div className="flex justify-between border-b border-[#211624]/40 pb-1">
                <span>Dash Cooldown:</span>
                <span className="text-[#bce7ff] font-bold">{g.player?.dashCdMax ?? 44}f</span>
              </div>
              <div className="flex justify-between border-b border-[#211624]/40 pb-1">
                <span>Flame Blessing:</span>
                <span className="text-[#ffa043] font-bold">{g.player?.hasFireball ? "ACTIVE (Fireballs)" : "LOCKED"}</span>
              </div>
              <div className="flex justify-between">
                <span>Soul Eater (Vamp):</span>
                <span className="text-[#bd52ff] font-bold">{g.player?.hasVampire ? "ACTIVE (+3 HP)" : "LOCKED"}</span>
              </div>
            </div>

            <div className="border-b border-[#242525] pb-2 pt-1">
              <span className="pixelfont text-[9px] text-[#b7e5c4] tracking-wider">KEYBOARD CONTROLS</span>
            </div>
            <div className="bg-[#0b100d] border border-[#1b2620] rounded-lg p-2.5 space-y-1.5 pixelfont text-[8px] leading-[14px] text-[#a4c2ae]">
              <div><span className="text-[#ffec85]">MOVE:</span> WASD / Arrow Keys</div>
              <div><span className="text-[#ffec85]">ATTACK:</span> Space / J key</div>
              <div><span className="text-[#ffec85]">DASH:</span> Shift / L key</div>
              <div><span className="text-[#ffec85]">INTERACT/SHOP:</span> E / F key</div>
              <div><span className="text-[#ffec85]">QUEST LOG:</span> Q key</div>
              <div><span className="text-[#ffec85]">PAUSE:</span> Esc / P key</div>
            </div>
          </div>
        );
      case 'scores':
        return (
          <div className="space-y-3 animate-fade-in">
            <div className="flex items-center justify-between border-b border-[#202021] pb-2">
              <span className="pixelfont text-[9px] text-[#ffd86d] tracking-wider">HALL OF HEROES</span>
              {highScores.length > 0 && (
                <button
                  onClick={() => { if (confirm('Clear all scores?')) { localStorage.removeItem('pixHeroScores'); setHighScores([]); } }}
                  className="pixelfont text-[7px] text-[#82a992] hover:text-[#ff9ab0] cursor-pointer transition-colors"
                >RESET</button>
              )}
            </div>
            {highScores.length === 0 ? (
              <div className="vtt text-[18px] text-[#8ba099] py-4 text-center">No scores recorded yet. Save your glory!</div>
            ) : (
              <ol className="space-y-1.5 vtt text-[18px]">
                {highScores.map((s, idx) => (
                  <li key={idx} className="flex justify-between items-center bg-[#0d0e0f] border border-[#1c1e20] px-3 py-1.5 rounded-lg hover:border-[#2a2b2d] transition-all">
                    <div className="flex items-center gap-2.5">
                      <span className={`pixelfont text-[8px] ${idx === 0 ? 'text-[#ffcf6b]' : idx === 1 ? 'text-[#dedede]' : idx === 2 ? 'text-[#b98a58]' : 'text-[#7a8a83]'}`}>{idx + 1}.</span>
                      <span className="pixelfont text-[8px] text-[#b8ffd8]">{s.name}</span>
                    </div>
                    <span className="text-[#ffeb85] font-bold">{s.score.toLocaleString()}</span>
                  </li>
                ))}
              </ol>
            )}
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="h-screen w-full bg-[#05080a] text-[#e8efe8] flex flex-col overflow-hidden select-none" style={{ fontFamily: '"VT323", monospace' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&family=VT323&display=swap');
        .pixelfont { font-family: "Press Start 2P", monospace; }
        .vtt { font-family: "VT323", monospace; }
        canvas { image-rendering: pixelated; image-rendering: crisp-edges; }
        .scan::after{
          content:"";
          position:absolute; inset:0;
          background: repeating-linear-gradient(0deg, rgba(0,0,0,0.11) 0px, rgba(0,0,0,0.11) 1px, transparent 2px, transparent 3px);
          pointer-events:none;
          z-index: 5;
        }
        .crt-glow { box-shadow: 0 0 34px rgba(110,255,176,0.085), inset 0 0 120px rgba(0,0,0,0.55); }
        .pixel-border {
          box-shadow: 0 0 0 3px #161f23, 0 0 0 6px #e8d67a, 0 0 0 9px #161f23;
        }
        .touch-btn { user-select:none; -webkit-user-select:none; touch-action:none; }
      `}</style>

      {/* HEADER BAR */}
      <div className="w-full h-14 border-b border-[#1c2924] bg-[#0c1218]/90 backdrop-blur-md flex items-center justify-between px-4 sm:px-6 z-30 shrink-0 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-[#16211d] border border-[#263a30] flex items-center justify-center pixelfont text-[9px] text-[#8ef7bf]">8◼</div>
          <div>
            <div className="pixelfont text-[9px] sm:text-[11px] text-[#f1efdb] tracking-wider">PIXEL HERO</div>
            <div className="vtt text-[13px] sm:text-[15px] text-[#78d6a4] -mt-[3px]">The Bean-Curse Saga</div>
          </div>
        </div>

        <div className="hidden md:flex desktop-controls-hint items-center gap-5 vtt text-[17px] text-[#7da289]">
          <span>WASD/arrows • SPACE attack • SHIFT dash • E interact • Q quests • Escape pause</span>
        </div>

        <div className="flex items-center gap-2">
          {/* Mobile Menu Toggle */}
          <button
            className="lg:hidden pixelfont text-[8px] sm:text-[9px] px-2.5 py-[8px] rounded bg-[#13221b] border border-[#2e523f] text-[#ffd86d] hover:bg-[#1a3327] cursor-pointer"
            onClick={() => {
              setMobileMenuOpen(true);
              audio.playSfx('click');
            }}
          >
            MENU
          </button>

          <button
            className="pixelfont text-[8px] sm:text-[9px] px-2.5 py-[8px] rounded bg-[#13221b] border border-[#2e523f] text-[#8ef7bf] hover:bg-[#1a3327] cursor-pointer"
            onClick={toggleMute}
          >
            {muted ? 'MUTED' : 'MUSIC'}
          </button>

          <button
            className="pixelfont text-[8px] sm:text-[9px] px-2.5 py-[8px] rounded bg-[#13221b] border border-[#2e523f] text-[#aef2c9] hover:bg-[#1a3327] cursor-pointer"
            onClick={() => {
              audio.init();
              const gr = gameRef.current;
              if (phase === 'playing') {
                gr.phase = 'paused';
                setPhase('paused');
                audio.pauseMusic();
              } else if (phase === 'paused') {
                gr.phase = 'playing';
                setPhase('playing');
                audio.resumeMusic();
              } else if (phase === 'shop') {
                gr.phase = 'playing';
                setPhase('playing');
              } else {
                startGame();
              }
            }}
          >
            {phase === 'playing' ? 'PAUSE' : phase === 'paused' ? 'RESUME' : phase === 'shop' ? 'RESUME' : 'PLAY'}
          </button>
        </div>
      </div>

      {/* MAIN CONTAINER */}
      <div className="flex-1 min-h-0 w-full flex flex-col lg:flex-row gap-4 p-3 sm:p-4 overflow-hidden max-w-[1400px] mx-auto w-full">
        {/* GAME COLUMN */}
        <div className="flex-1 min-w-0 flex flex-col h-full bg-[#070b0e] border border-[#172520] rounded-xl p-3 max-sm:p-0 max-sm:border-none max-sm:rounded-none shadow-2xl relative">

          {/* Top HUD overlay (inside game box) */}
          {phase !== 'menu' && (
            <div className="absolute top-4 left-4 right-4 z-20 pointer-events-none">
              <div className="flex flex-wrap gap-2.5 px-3 py-2 bg-[#09110e]/85 backdrop-blur-sm border border-[#1b2f26] rounded-md text-[8px] sm:text-[9px] pixelfont shadow-md">
                <span className="text-[#ffe36a]">SCORE {g.score.toLocaleString()}</span>
                <span className="text-[#8fffb7]">¢ {g.player?.coins ?? 0}</span>
                <span className="text-[#ff9ab0]">LV {g.player?.level ?? 1}</span>
                <span className="text-[#9fdfff]">{ZONES[g.zone]?.name}</span>
                {g.player?.hasFireball && (
                  <span className="inline-flex items-center gap-1 text-[#ffa043] animate-pulse text-[10px] font-bold tracking-widest">
                    <FireballIcon className="w-3.5 h-3.5 shrink-0" />
                    FIRE
                  </span>
                )}
                {g.player?.hasVampire && (
                  <span className="inline-flex items-center gap-1 text-[#bd52ff] animate-pulse text-[10px] font-bold tracking-widest">
                    <SkullIcon className="w-3.5 h-3.5 shrink-0" />
                    VAMP
                  </span>
                )}
                <span className="text-[#d5d6c8] ml-auto">KILLS {g.kills}</span>
              </div>
            </div>
          )}

          {/* Canvas viewport container */}
          <div className="flex-1 min-h-0 w-full flex items-center justify-center relative bg-[#030506] rounded-lg overflow-hidden border border-[#121a17] scan crt-screen shadow-inner portrait:max-sm:flex-initial portrait:max-sm:h-auto portrait:max-sm:aspect-[16/9] portrait:max-sm:w-full portrait:max-sm:shrink-0 portrait:max-sm:rounded-none portrait:max-sm:border-none">
            <canvas
              ref={canvasRef}
              width={GAME_W}
              height={GAME_H}
              className="max-w-full max-h-full object-contain block shadow-[0_0_30px_rgba(0,0,0,0.9)]"
              style={{ aspectRatio: `${GAME_W}/${GAME_H}` }}
            />

            {/* Quest Ticker (overlay inside canvas area to avoid joystick) */}
            {phase === 'playing' && (
              <div className="absolute top-[48px] left-3 right-3 sm:right-auto sm:max-w-[400px] pointer-events-none z-10 portrait:max-sm:bottom-3 portrait:max-sm:top-auto">
                <div className="text-[8px] sm:text-[9px] pixelfont text-[#d5f5d8] bg-[#09110e]/90 backdrop-blur-sm border border-[#1c3527] rounded-md px-3 py-2 leading-relaxed shadow-lg">
                  {topQuests.length ? topQuests.map(q => (
                    <div key={q.id} className="flex items-center gap-2">
                      <span className={q.progress > 0 ? "text-[#ffe96a]" : "text-[#93d8aa]"}>▸</span>
                      <span className="truncate">{q.title} {q.target > 1 ? `${q.progress}/${q.target}` : ''}</span>
                    </div>
                  )) : <span className="text-[#ffe66b] animate-pulse">ALL TASKS READY → CHALLENGE BOSS</span>}
                </div>
              </div>
            )}

            {/* FLOATING LANDSCAPE TOUCH CONTROLS (Rendered inside canvas area to float above HUD) */}
            {phase === 'playing' && (
              <div className="touch-controls pointer-events-none absolute inset-0 z-10 portrait:max-sm:hidden">
                {/* joystick */}
                <div
                  ref={joyLandscapeRef}
                  className="pointer-events-auto touch-btn w-[110px] h-[110px] absolute left-6 bottom-6"
                  style={{ touchAction: 'none' }}
                >
                  <div className="w-full h-full rounded-full bg-[#0c1713]/80 border-2 border-[#29483a] relative shadow-lg pointer-events-none">
                    <div
                      className="absolute joystick-knob w-10 h-10 rounded-full bg-[#1f3d30] border border-[#5edfa1] left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
                      style={{
                        transform: `translate(calc(-50% + ${touchMoveRef.current.x * 28}px), calc(-50% + ${touchMoveRef.current.y * 28}px))`
                      }}
                    />
                    <div className="absolute inset-0 flex items-center justify-center vtt text-[11px] text-[#66dca1] opacity-70 pointer-events-none">
                      MOVE
                    </div>
                  </div>
                </div>
                {/* right action buttons */}
                <div className="pointer-events-auto absolute right-6 bottom-6 flex flex-col gap-2.5">
                  <button
                    onPointerDown={(e) => { e.preventDefault(); setTouchAttack(true); }}
                    className="touch-btn w-[68px] h-[68px] rounded-full bg-[#d84349]/90 border-2 border-[#ffb8be] active:scale-95 transition flex items-center justify-center shadow-lg cursor-pointer"
                  >
                    <div className="pixelfont text-[10px] text-white pointer-events-none">ATK</div>
                  </button>
                  <div className="flex gap-2">
                    <button
                      onPointerDown={(e) => { e.preventDefault(); setTouchDash(true); }}
                      className="touch-btn w-[52px] h-[46px] rounded-[10px] bg-[#2688c7]/90 border-2 border-[#a8e7ff] active:scale-95 flex items-center justify-center shadow-md cursor-pointer"
                    >
                      <div className="pixelfont text-[8px] text-white pointer-events-none">DSH</div>
                    </button>
                    <button
                      onPointerDown={(e) => { e.preventDefault(); setTouchInteract(true); }}
                      className="touch-btn w-[52px] h-[46px] rounded-[10px] bg-[#f2c242]/90 border-2 border-[#fff2b8] active:scale-95 flex items-center justify-center shadow-md cursor-pointer"
                    >
                      <div className="pixelfont text-[8px] text-[#301d00] pointer-events-none">USE</div>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Bottom compact HUD */}
          {phase !== 'menu' && (
            <div className="bg-[#0b120f]/90 border border-[#192b22] rounded-lg px-3 sm:px-4 py-2 flex flex-wrap items-center justify-between gap-2.5 shrink-0 mt-3 shadow-md portrait:max-sm:mt-0 portrait:max-sm:rounded-none portrait:max-sm:border-x-0 portrait:max-sm:border-t-0 portrait:max-sm:border-b portrait:max-sm:bg-[#070b0e] portrait:max-sm:px-2.5 portrait:max-sm:py-2">
              {/* HP Bar */}
              <div className="flex items-center gap-2.5">
                <div className="pixelfont text-[9px] text-[#ff8d98] tracking-wider">HP</div>
                <div className="w-[100px] sm:w-[150px] h-[10px] bg-[#111c19] border border-[#253c31] rounded-[2px] overflow-hidden relative">
                  <div
                    className="h-full transition-all duration-100"
                    style={{
                      width: `${((g.player?.hp ?? 0) / (g.player?.maxHp ?? 84)) * 100}%`,
                      background: 'linear-gradient(90deg, #ff4d60, #ff8060)'
                    }}
                  />
                </div>
                <div className="vtt text-[18px] text-[#ffd4d8] min-w-[65px] font-bold">{g.player?.hp ?? 84}/{g.player?.maxHp ?? 84}</div>
              </div>

              {/* XP Bar */}
              <div className="flex items-center gap-2">
                <div className="pixelfont text-[8px] text-[#95e9ff] tracking-wider">XP</div>
                <div className="w-[70px] sm:w-[110px] h-[7px] bg-[#101a20] border border-[#23414f] rounded-[1.5px] overflow-hidden">
                  <div className="h-full bg-[#3ebfff] shadow-[0_0_6px_rgba(62,191,255,0.5)]" style={{ width: `${((g.player?.xp ?? 0) / ((g.player?.level ?? 1) * 32)) * 100}%` }} />
                </div>
              </div>

              {/* Action CD Gauges & Buttons */}
              <div className="ml-auto flex items-center gap-2.5 text-[9px] pixelfont">
                {/* Visual ATK Gauge */}
                <div className="relative overflow-hidden px-2 py-[3px] rounded border border-[#284034] text-[#8ff9b8] bg-[#0f1b16] min-w-[44px] text-center shadow-inner">
                  <div
                    className="absolute top-0 left-0 bottom-0 bg-[#144229] transition-all duration-75"
                    style={{ width: `${100 - ((g.player?.attackCd ?? 0) / 19) * 100}%` }}
                  />
                  <span className="relative z-10">ATK</span>
                </div>

                {/* Visual DASH Gauge */}
                <div className="relative overflow-hidden px-2 py-[3px] rounded border border-[#27424c] text-[#b8f5ff] bg-[#0c1820] min-w-[50px] text-center shadow-inner">
                  <div
                    className="absolute top-0 left-0 bottom-0 bg-[#0f3442] transition-all duration-75"
                    style={{ width: `${100 - ((g.player?.dashCd ?? 0) / (g.player?.dashCdMax ?? 44)) * 100}%` }}
                  />
                  <span className="relative z-10">DASH</span>
                </div>

                <button
                  onClick={() => setQuestLogOpen(o => !o)}
                  className="px-2.5 py-1.5 rounded bg-[#13221b] border border-[#2e523f] text-[#c3f2d2] hover:bg-[#1a3327] hover:text-white transition cursor-pointer text-[8px]"
                >Q LOG</button>
              </div>
            </div>
          )}

          {/* PORTRAIT GAMEPAD AREA (Only visible on mobile portrait viewports) */}
          {phase === 'playing' && (
            <div className="touch-controls pointer-events-none relative flex-1 min-h-0 bg-[#05080a] border-t border-[#121c17] shrink-0 w-full hidden portrait:max-sm:block">
              {/* joystick */}
              <div
                ref={joyPortraitRef}
                className="pointer-events-auto touch-btn w-[120px] h-[120px] absolute left-[8%] top-1/2 -translate-y-1/2"
                style={{ touchAction: 'none' }}
              >
                <div className="w-full h-full rounded-full bg-[#0c1713] border-2 border-[#29483a] relative shadow-lg pointer-events-none">
                  <div
                    className="absolute joystick-knob w-12 h-12 rounded-full bg-[#1f3d30] border border-[#5edfa1] left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
                    style={{
                      transform: `translate(calc(-50% + ${touchMoveRef.current.x * 32}px), calc(-50% + ${touchMoveRef.current.y * 32}px))`
                    }}
                  />
                  <div className="absolute inset-0 flex items-center justify-center vtt text-[12px] text-[#66dca1] opacity-70 pointer-events-none">
                    MOVE
                  </div>
                </div>
              </div>
              {/* right action buttons */}
              <div className="pointer-events-auto absolute right-[8%] top-1/2 -translate-y-1/2 flex flex-col gap-3">
                <button
                  onPointerDown={(e) => { e.preventDefault(); setTouchAttack(true); }}
                  className="touch-btn w-[80px] h-[80px] rounded-full bg-[#d84349] border-2 border-[#ffb8be] active:scale-95 transition flex items-center justify-center shadow-lg cursor-pointer"
                >
                  <div className="pixelfont text-[11px] text-white pointer-events-none">ATK</div>
                </button>
                <div className="flex gap-3">
                  <button
                    onPointerDown={(e) => { e.preventDefault(); setTouchDash(true); }}
                    className="touch-btn w-[56px] h-[48px] rounded-[10px] bg-[#2688c7] border-2 border-[#a8e7ff] active:scale-95 flex items-center justify-center shadow-md cursor-pointer"
                  >
                    <div className="pixelfont text-[8px] text-white pointer-events-none">DSH</div>
                  </button>
                  <button
                    onPointerDown={(e) => { e.preventDefault(); setTouchInteract(true); }}
                    className="touch-btn w-[56px] h-[48px] rounded-[10px] bg-[#f2c242] border-2 border-[#fff2b8] active:scale-95 flex items-center justify-center shadow-md cursor-pointer"
                  >
                    <div className="pixelfont text-[8px] text-[#301d00] pointer-events-none">USE</div>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Main Menu Overlay */}
          {phase === 'menu' && (
            <div className="absolute inset-0 bg-[#05090b] flex items-center justify-center z-30 px-4 py-6 overflow-hidden">
              {/* Animated Retro Grid */}
              <div className="grid-container">
                <div className="grid-fade"></div>
                <div className="retro-grid"></div>
              </div>

              {/* Menu Content */}
              <div className="max-w-[460px] h-full w-full flex flex-col justify-between items-center text-center relative z-10">
                <div className="pixelfont text-[9px] text-[#56f4a3] tracking-widest uppercase neon-glow-emerald">
                  8-Bit Arcade RPG
                </div>

                <div className="h-[30%] max-h-[150px] min-h-[70px] flex items-center justify-center my-2">
                  <img
                    src="/pixelquest_logo.png"
                    alt="PixelHero Logo"
                    className="h-full w-auto object-contain drop-shadow-[0_4px_0_rgba(0,0,0,0.65)] hover:scale-105 transition-transform duration-300"
                    style={{ imageRendering: 'pixelated' }}
                  />
                </div>

                <div className="pixelfont text-[11px] text-[#ffe06b] tracking-wider glow-pulse neon-glow-gold">
                  THE BEAN-CURSE SAGA
                </div>

                <p className="vtt text-[17px] sm:text-[19px] text-[#a4c2ae] leading-relaxed max-w-[400px] mx-auto my-2 font-semibold">
                  Emberwick’s fields wilt. Slimes boil in Gloomwood. Talk to Elder Mael, clear tasks, steal the Hollow Key, and topple Gruk the Rot-Tusk.
                </p>

                <div className="flex flex-wrap justify-center items-center gap-4 my-3">
                  <button
                    onClick={startGame}
                    className="pixelfont text-[9px] sm:text-[10px] px-6 py-3 rounded btn-pixel-green cursor-pointer transition-all duration-150"
                  >
                    START QUEST
                  </button>
                  <button
                    onClick={() => {
                      setActiveSidebarTab('scores');
                      setMobileMenuOpen(true);
                    }}
                    className="pixelfont text-[8px] sm:text-[9px] px-5 py-3 rounded btn-pixel-dark cursor-pointer transition-all duration-150"
                  >
                    HIGH SCORES
                  </button>
                </div>

                <div className="pixelfont text-[7px] sm:text-[8px] text-[#6ea281] border-t border-[#1b2f23] pt-3 w-full">
                  Keyboard [WASD+Space] • Responsive Mobile Controls • Procedural Synthesizer
                </div>
              </div>
            </div>
          )}

          {/* Pause Screen Overlay */}
          {phase === 'paused' && (
            <div className="absolute inset-0 bg-[#050b0a]/85 backdrop-blur-xs flex items-center justify-center z-30">
              <div className="bg-[#0d1815] border-[3px] border-[#e9d778] rounded-xl px-8 py-8 text-center pixel-border animate-fade-in">
                <div className="pixelfont text-[16px] text-[#fff2b8]">GAME PAUSED</div>
                <div className="vtt text-[19px] text-[#a9d6b6] mt-2">Take a breath, hero.</div>
                <div className="flex justify-center gap-3.5 mt-6">
                  <button onClick={() => { g.phase = 'playing'; setPhase('playing'); audio.resumeMusic(); }} className="pixelfont text-[9px] px-4 py-2.5 bg-[#2fd07b] text-[#072014] border-2 border-[#b8ffe0] rounded cursor-pointer hover:scale-105 transition-all">
                    RESUME
                  </button>
                  <button onClick={() => { g.phase = 'menu'; setPhase('menu'); audio.pauseMusic(); }} className="pixelfont text-[9px] px-4 py-2.5 bg-[#1a2622] text-[#b8e4c8] border-2 border-[#345a45] rounded cursor-pointer hover:bg-[#22332c] transition-all">
                    QUIT
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Dialog System Overlay */}
          {phase === 'dialog' && dialog && (
            <div className="absolute bottom-3 left-3 right-3 z-30 animate-fade-in">
              <div className="bg-[#0c1411]/95 backdrop-blur-sm border-[3px] border-[#f2d96a] rounded-lg px-4 py-3.5">
                <div className="pixelfont text-[8px] text-[#ffdf79]">{dialog.speaker}</div>
                <div className="vtt text-[19px] sm:text-[22px] text-[#e8f7e3] mt-1.5 min-h-[38px] leading-snug">
                  {dialog.lines[dialog.idx]}
                </div>
                <div className="flex justify-between items-center mt-2 pt-1 border-t border-[#203027]">
                  <div className="vtt text-[16px] text-[#82c59a]">{dialog.idx + 1}/{dialog.lines.length}</div>
                  <button
                    onClick={() => {
                      if (dialog.idx < dialog.lines.length - 1) {
                        setDialog(d => d ? { ...d, idx: d.idx + 1 } : d);
                        audio.playSfx('click');
                      } else {
                        setDialog(null);
                        g.phase = 'playing';
                        setPhase('playing');
                        audio.playSfx('click');
                      }
                    }}
                    className="pixelfont text-[9px] px-3.5 py-1.5 bg-[#f2d467] text-[#2a1c00] rounded border border-[#fff3b6] hover:scale-105 active:scale-95 transition-all cursor-pointer"
                  >NEXT ▶</button>
                </div>
              </div>
            </div>
          )}

          {/* Game Over Screen Overlay */}
          {phase === 'gameover' && (
            <div className="absolute inset-0 bg-[#0a0506]/95 backdrop-blur-xs flex items-center justify-center z-30 px-4">
              <div className="w-full max-w-[500px] text-center bg-[#140e13] border-[3px] border-[#ff5f76] rounded-xl p-6 shadow-2xl animate-fade-in">
                <div className="pixelfont text-[9px] text-[#ff9aa8]">EMBERWICK HAS FALLEN</div>
                <div className="pixelfont text-[18px] sm:text-[22px] text-[#ffe6e9] mt-2">GAME OVER</div>
                <div className="vtt text-[22px] text-[#ffcfcf] mt-2 bg-[#251016] border border-[#4d1f2a] rounded-lg py-2.5 px-4 inline-block">
                  Score: <span className="text-[#ffe06a] font-bold">{g.score.toLocaleString()}</span> • Kills: {g.kills} • Lv: {g.player?.level}
                </div>

                <div className="mt-5 flex gap-2 justify-center items-center">
                  <input
                    value={nameInput}
                    onChange={e => setNameInput(e.target.value.toUpperCase().slice(0, 8))}
                    className="pixelfont text-[10px] bg-[#1d1419] border border-[#643142] text-[#ffd4db] px-3 py-[9px] rounded w-[150px] text-center tracking-widest outline-none focus:border-[#ff5f76]"
                    placeholder="HERO"
                  />
                  <button
                    disabled={scoreSaved}
                    onClick={saveScore}
                    className={`pixelfont text-[9px] px-4 py-[11px] rounded transition-all cursor-pointer ${scoreSaved
                        ? 'bg-[#1b1c1e] border border-[#303336] text-[#60676a] cursor-not-allowed'
                        : 'bg-[#17241d] border border-[#3e6b4b] text-[#b4f4c9] hover:bg-[#203229]'
                      }`}
                  >
                    {scoreSaved ? 'SAVED' : 'SAVE SCORE'}
                  </button>
                </div>
                <div className="mt-5 flex gap-3 justify-center">
                  <button onClick={startGame} className="pixelfont text-[10px] px-5 py-3 bg-[#ff5f76] text-white border-2 border-[#ffd3da] rounded cursor-pointer hover:scale-105 transition-all">RESTART [R]</button>
                  <button onClick={() => { g.phase = 'menu'; setPhase('menu'); }} className="pixelfont text-[10px] px-4 py-3 bg-[#1f171c] border border-[#4b2d39] text-[#f0c8d1] rounded cursor-pointer hover:bg-[#2c2027] transition-all">MENU</button>
                </div>
              </div>
            </div>
          )}

          {/* Victory Screen Overlay */}
          {phase === 'victory' && (
            <div className="absolute inset-0 bg-[#06100b]/95 backdrop-blur-xs flex items-center justify-center z-30 px-4">
              <div className="w-full max-w-[520px] text-center bg-[#0d1a13] border-[3px] border-[#f3dd75] rounded-xl p-6 shadow-2xl animate-fade-in">
                <div className="pixelfont text-[9px] text-[#ffdd6b] tracking-wider">{g.ngPlus ? `NEW GAME+ ${g.ngPlusLevel} COMPLETE` : 'THE GREAT QUEST COMPLETE'}</div>
                <div className="pixelfont text-[18px] sm:text-[22px] text-[#fff6c7] mt-1.5 leading-snug">THE SHADOW IS VANQUISHED</div>

                <div className="vtt text-[20px] text-[#c7f7d0] mt-2 bg-[#12241b] border border-[#234735] rounded-lg p-3">
                  Emberwick breathes again under the light.<br />
                  Score: <span className="text-[#ffe06a] font-bold">{g.score.toLocaleString()}</span> — Kills: {g.kills} — Time: {Math.floor((performance.now() - g.gameStartTime) / 1000)}s
                </div>

                <div className="mt-5 flex gap-2 justify-center items-center">
                  <input
                    value={nameInput}
                    onChange={e => setNameInput(e.target.value.toUpperCase().slice(0, 8))}
                    className="pixelfont text-[10px] bg-[#0f2217] border border-[#3b7955] text-[#cffff0] px-3 py-[9px] rounded w-[150px] text-center tracking-widest outline-none focus:border-[#42a86c]"
                    placeholder="HERO"
                  />
                  <button
                    disabled={scoreSaved}
                    onClick={saveScore}
                    className={`pixelfont text-[9px] px-4 py-[11px] rounded border transition-all cursor-pointer ${scoreSaved
                        ? 'bg-[#1b1c1e] border-[#303336] text-[#60676a] cursor-not-allowed'
                        : 'bg-[#f4d86b] text-[#2a1c00] border-[#fff7cc] hover:scale-105'
                      }`}
                  >
                    {scoreSaved ? 'SAVED' : 'SAVE SCORE'}
                  </button>
                </div>
                <div className="mt-5 flex gap-3.5 justify-center flex-wrap">
                  <button onClick={() => { g.ngPlus = true; g.ngPlusLevel = (g.ngPlusLevel || 0) + 1; resetWorld(g, true); g.phase = 'playing'; setPhase('playing'); setDialog(null); setQuestLogOpen(false); setScoreSaved(false); audio.setZoneMusic(0); }} className="pixelfont text-[9px] px-5 py-3 bg-[#9a5fff] text-[#1a0a30] border-2 border-[#d4b8ff] rounded cursor-pointer hover:scale-105 transition-all">NEW GAME+</button>
                  <button onClick={startGame} className="pixelfont text-[9px] px-5 py-3 bg-[#36d884] text-[#052013] border-2 border-[#b9ffe0] rounded cursor-pointer hover:scale-105 transition-all">PLAY AGAIN</button>
                  <button onClick={() => { g.phase = 'menu'; setPhase('menu'); }} className="pixelfont text-[9px] px-4 py-3 bg-[#16241c] border border-[#37604a] text-[#c5f3d2] rounded cursor-pointer hover:bg-[#203427] transition-all">MENU</button>
                </div>
              </div>
            </div>
          )}

          {/* Merchant Shop Overlay */}
          {phase === 'shop' && (
            <div className="absolute inset-0 bg-[#050b0a]/90 backdrop-blur-xs flex items-center justify-center z-30 px-4">
              <div className="w-full max-w-[450px] bg-[#0d1613] border-[3px] border-[#d4be66] rounded-xl p-5 pixel-border animate-fade-in flex flex-col max-h-[90vh]">
                <div className="shrink-0 text-center pb-2">
                  <div className="pixelfont text-[12px] text-[#ffe06a] tracking-wider">MERCHANT SHOP</div>
                  <div className="vtt text-[17px] text-[#86bf9a] mt-0.5">Upgrade your hero with legendary equipment!</div>
                </div>

                {/* Shop items list (scrollable if screen height is constrained) */}
                <div className="flex-1 min-h-0 overflow-y-auto pr-1 my-3 space-y-2.5 custom-scrollbar text-left pixelfont text-[9px]">
                  {SHOP_ITEMS.map(item => {
                    const pl = g.player;
                    let cost = item.cost;
                    let ownedText = "";
                    let isOwnedMax = false;

                    if (pl) {
                      if (item.id === 'sword') {
                        const swordLvl = Math.floor(pl.damageBonus / 6);
                        cost = Math.floor(item.cost * Math.pow(item.costMult, swordLvl));
                        ownedText = ` (Lvl ${swordLvl})`;
                      } else if (item.id === 'boots') {
                        isOwnedMax = pl.speedBonus > 0;
                        ownedText = isOwnedMax ? " (MAX)" : "";
                      } else if (item.id === 'armor') {
                        isOwnedMax = pl.maxHp >= 180;
                        const count = Math.floor((pl.maxHp - 84 - (pl.level - 1) * 10) / 25);
                        ownedText = isOwnedMax ? " (MAX)" : ` (${clamp(count, 0, 3)}/3)`;
                      }
                    }

                    const canAfford = pl ? pl.coins >= cost : false;
                    const disableBuy = isOwnedMax || !canAfford;

                    return (
                      <div key={item.id} className="flex items-center justify-between p-2 rounded-lg bg-[#111e18] border border-[#233d31] hover:bg-[#15271e] transition-all">
                        <div className="max-w-[70%]">
                          <div className="text-[#a8ffd0] font-bold">{item.name}{ownedText}</div>
                          <div className="vtt text-[15px] text-[#a4cfae] leading-snug mt-0.5">{item.desc}</div>
                        </div>
                        <button
                          disabled={disableBuy}
                          onClick={() => buyShopItem(item)}
                          className={`px-3 py-2 rounded text-[8px] border-2 transition-all cursor-pointer shrink-0 ${isOwnedMax
                            ? 'border-[#3f4a44] bg-[#222a25] text-[#556b5e]'
                            : canAfford
                              ? 'border-[#ffec85] bg-[#ebd056] text-[#2a1c00] hover:scale-105 active:scale-95'
                              : 'border-[#423b2c] bg-[#262118] text-[#705e43]'
                            }`}
                        >
                          {isOwnedMax ? 'SOLD' : `${cost}¢`}
                        </button>
                      </div>
                    );
                  })}
                </div>

                <div className="shrink-0 mt-2 border-t border-[#1a2f26] pt-3 flex justify-between items-center text-[10px] pixelfont">
                  <span className="text-[#ffd75d]">YOUR WALLET: {g.player?.coins ?? 0}¢</span>
                  <button
                    onClick={() => {
                      g.phase = 'playing';
                      setPhase('playing');
                      audio.playSfx('click');
                    }}
                    className="px-4 py-2 bg-[#db394c] text-white border border-[#ffcbd4] rounded hover:bg-[#b02434] cursor-pointer transition-all"
                  >
                    CLOSE [E]
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Level Up Perk Selection Modal */}
          {phase === 'levelup' && (
            <div className="absolute inset-0 bg-[#060c0b]/90 backdrop-blur-xs flex flex-col items-center justify-center z-30 px-4 py-6">
              <div className="max-w-[680px] w-full text-center flex flex-col max-h-[90vh] animate-fade-in">
                <div className="shrink-0 pb-2">
                  <div className="pixelfont text-[11px] text-[#9df7ff] animate-pulse tracking-widest">LEVEL UP!</div>
                  <h2 className="pixelfont text-[18px] sm:text-[24px] text-[#ffeb85] mt-1 drop-shadow-[0_2px_0_#9a6a12]">CHOOSE A BLESSING</h2>
                  <p className="vtt text-[18px] text-[#c0e0cc]">Select one permanent perk to empower your run.</p>
                </div>

                {/* Perk columns (scrolls on narrow viewports if necessary) */}
                <div className="flex-1 min-h-0 overflow-y-auto my-4 grid grid-cols-1 md:grid-cols-3 gap-3.5 pr-1 custom-scrollbar">
                  {g.perkChoices.map(perkId => {
                    const pData = ALL_PERKS.find(p => p.id === perkId);
                    if (!pData) return null;

                    let icon: React.ReactNode = <SwordIcon className="w-10 h-10" />;
                    let color = "border-[#db5a6b] text-[#ffa3af] bg-[#201014]";
                    let hoverGlow = "hover:shadow-[0_0_20px_rgba(219,90,107,0.3)]";

                    if (perkId === 'speed') {
                      icon = <SpeedIcon className="w-10 h-10" />;
                      color = "border-[#5cbfff] text-[#bce7ff] bg-[#101824]";
                      hoverGlow = "hover:shadow-[0_0_20px_rgba(92,191,255,0.3)]";
                    } else if (perkId === 'hp') {
                      icon = <HeartIcon className="w-10 h-10" />;
                      color = "border-[#52df97] text-[#c0ffd8] bg-[#0c2016]";
                      hoverGlow = "hover:shadow-[0_0_20px_rgba(82,223,151,0.3)]";
                    } else if (perkId === 'fireball') {
                      icon = <FireballIcon className="w-10 h-10" />;
                      color = "border-[#ffa043] text-[#ffe3b8] bg-[#241710]";
                      hoverGlow = "hover:shadow-[0_0_20px_rgba(255,160,67,0.3)]";
                    } else if (perkId === 'vampire') {
                      icon = <SkullIcon className="w-10 h-10" />;
                      color = "border-[#bd52ff] text-[#e8bdff] bg-[#1b1024]";
                      hoverGlow = "hover:shadow-[0_0_20px_rgba(189,82,255,0.3)]";
                    }

                    return (
                      <button
                        key={perkId}
                        onClick={() => selectPerk(perkId)}
                        className={`flex flex-col items-center justify-between p-4 rounded-xl border-[2.5px] text-center transition-all cursor-pointer duration-200 ${color} ${hoverGlow} hover:-translate-y-1`}
                      >
                        <div className="flex justify-center mb-2">{icon}</div>
                        <div className="pixelfont text-[10px] font-bold tracking-wider">{pData.name}</div>
                        <div className="vtt text-[16px] text-[#cbdad0] leading-snug mt-2.5 flex-grow">{pData.desc}</div>
                        <div className="mt-3.5 pixelfont text-[8px] text-[#ffe76b] border border-[#ffec94]/30 px-2.5 py-1 rounded bg-[#ffdf6b]/5 shrink-0">
                          CHOOSE PERK
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Simple Inline Quest Log Drawer overlay */}
          {questLogOpen && phase !== 'menu' && (
            <div className="absolute right-3 top-[54px] w-[260px] sm:w-[300px] bg-[#0a1612]/95 border-[2.5px] border-[#dbc56a] rounded-lg p-3.5 z-20 shadow-xl animate-fade-in">
              <div className="flex justify-between items-center border-b border-[#223d32] pb-1.5">
                <div className="pixelfont text-[9px] text-[#ffe176]">QUEST DIARY</div>
                <button onClick={() => setQuestLogOpen(false)} className="vtt text-[16px] text-[#98d0a6] hover:text-white cursor-pointer">✕</button>
              </div>
              <div className="mt-2.5 space-y-2.5 max-h-[220px] overflow-y-auto custom-scrollbar">
                {g.quests.map(q => (
                  <div key={q.id} className={`text-[10px] pixelfont leading-normal ${q.done ? 'text-[#6be39a] line-through opacity-70' : 'text-[#d7f2df]'}`}>
                    <div>{q.title}</div>
                    <div className="vtt text-[15px] text-[#a9d8b4] -mt-0.5 leading-snug">{q.desc}</div>
                    <div className="text-[8px] text-[#ffe176] mt-[1px]">{q.done ? '✓ COMPLETED' : q.target > 1 ? `${q.progress}/${q.target}` : 'ACTIVE'}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

        {/* RIGHT SIDEBAR (DESKTOP) */}
        <div className="hidden lg:flex flex-col w-[340px] lg:w-[350px] flex-shrink-0 bg-[#080c0f] border border-[#182329] rounded-xl overflow-hidden shadow-2xl h-full">
          {/* Tab Navigation */}
          <div className="flex border-b border-[#141f26] bg-[#0b1216] shrink-0">
            {(['quests', 'map', 'stats', 'scores'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => {
                  setActiveSidebarTab(tab);
                  audio.playSfx('click');
                }}
                className={`flex-1 py-3 text-[9px] pixelfont transition-colors cursor-pointer text-center ${activeSidebarTab === tab
                  ? tab === 'quests'
                    ? 'bg-[#12221b] text-[#ffe37a] border-b-2 border-[#ffe37a]'
                    : tab === 'map'
                      ? 'bg-[#101b22] text-[#9eeaff] border-b-2 border-[#9eeaff]'
                      : tab === 'stats'
                        ? 'bg-[#151119] text-[#fea7bb] border-b-2 border-[#fea7bb]'
                        : 'bg-[#121314] text-[#ffd86d] border-b-2 border-[#ffd86d]'
                  : 'text-[#7ea6aa] hover:bg-[#0f171c]/40 hover:text-white'
                  }`}
              >
                <span className="flex items-center justify-center gap-1.5 font-bold tracking-wider">
                  {tab === 'quests' && <QuestIcon className="w-3.5 h-3.5 shrink-0" />}
                  {tab === 'map' && <MapIcon className="w-3.5 h-3.5 shrink-0" />}
                  {tab === 'stats' && <StatsIcon className="w-3.5 h-3.5 shrink-0" />}
                  {tab === 'scores' && <HofIcon className="w-3.5 h-3.5 shrink-0" />}
                  {tab === 'quests' ? 'QST' : tab === 'map' ? 'MAP' : tab === 'stats' ? 'STS' : 'HOF'}
                </span>
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="flex-1 min-h-0 overflow-y-auto p-4 custom-scrollbar bg-[#060a0c]">
            {renderSidebarContent()}
          </div>
        </div>
      </div>

      {/* MOBILE COMPASS DRAWER / OVERLAY */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 bg-[#05080a]/95 flex flex-col p-4 animate-fade-in lg:hidden">
          <div className="flex justify-between items-center pb-2.5 border-b border-[#1c2930] mb-3">
            <span className="pixelfont text-[10px] text-[#8ef7bf]">HERO DASHBOARD</span>
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                audio.playSfx('click');
              }}
              className="pixelfont text-[8px] px-3 py-1.5 bg-[#db394c] text-white border border-[#ffcbd4] rounded cursor-pointer"
            >
              CLOSE
            </button>
          </div>

          {/* Tab Navigation */}
          <div className="flex border border-[#141f26] rounded-lg overflow-hidden bg-[#0c1418] shrink-0 mb-3.5">
            {(['quests', 'map', 'stats', 'scores'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => {
                  setActiveSidebarTab(tab);
                  audio.playSfx('click');
                }}
                className={`flex-1 py-3 text-[9px] pixelfont transition-colors cursor-pointer text-center ${activeSidebarTab === tab
                  ? tab === 'quests'
                    ? 'bg-[#12221b] text-[#ffe37a]'
                    : tab === 'map'
                      ? 'bg-[#101b22] text-[#9eeaff]'
                      : tab === 'stats'
                        ? 'bg-[#151119] text-[#fea7bb]'
                        : 'bg-[#121314] text-[#ffd86d]'
                  : 'text-[#7ea6aa] hover:bg-[#0f171c]/50'
                  }`}
              >
                <span className="flex items-center justify-center gap-1.5 font-bold tracking-wider">
                  {tab === 'quests' && <QuestIcon className="w-3.5 h-3.5 shrink-0" />}
                  {tab === 'map' && <MapIcon className="w-3.5 h-3.5 shrink-0" />}
                  {tab === 'stats' && <StatsIcon className="w-3.5 h-3.5 shrink-0" />}
                  {tab === 'scores' && <HofIcon className="w-3.5 h-3.5 shrink-0" />}
                  {tab === 'quests' ? 'QST' : tab === 'map' ? 'MAP' : tab === 'stats' ? 'STS' : 'HOF'}
                </span>
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="flex-1 min-h-0 overflow-y-auto p-4 custom-scrollbar bg-[#060a0c] border border-[#152329] rounded-xl">
            {renderSidebarContent()}
          </div>
        </div>
      )}

      {/* Tiny Footer */}
      <footer className="w-full text-center py-1 bg-[#040608] border-t border-[#121c18] text-[13px] vtt text-[#546e5f] shrink-0">
        Press Start 2P • built for 60fps • R to quick-restart • 2026 PixelHero
      </footer>
    </div>
  );
}