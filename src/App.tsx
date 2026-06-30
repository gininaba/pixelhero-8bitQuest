import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { GameState, GamePhase, HighScore, Vec } from './game/types';
import { GAME_W, GAME_H, ZONES, getInitialQuests, SHOP_ITEMS, ALL_PERKS } from './game/config';
import { resetWorld, updateWorld, InputState } from './game/engine';
import { renderFrame } from './game/renderer';
import { audio } from './game/audio';
import { clamp } from './game/utils';


export default function App() {
  const canvasRef = useRef<HTMLCanvasElement|null>(null);
  
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
    ngPlusLevel: 0
  });

  const keysRef = useRef<Record<string,boolean>>({});
  const touchMoveRef = useRef<Vec>({x:0,y:0});
  const touchActiveRef = useRef(false);

  const [phase, setPhase] = useState<GamePhase>('menu');
  const [hudTick, setHudTick] = useState(0);
  const [dialog, setDialog] = useState<{speaker:string; lines:string[]; idx:number} | null>(null);
  const [questLogOpen, setQuestLogOpen] = useState(false);
  const [touchAttack, setTouchAttack] = useState(false);
  const [touchDash, setTouchDash] = useState(false);
  const [touchInteract, setTouchInteract] = useState(false);
  const [nameInput, setNameInput] = useState('HERO');
  const [muted, setMuted] = useState(() => audio.isMuted());
  const [highScores, setHighScores] = useState<HighScore[]>(()=> {
    try { return JSON.parse(localStorage.getItem('pixHeroScores')||'[]'); } catch { return []; }
  });

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

  useEffect(()=>{
    if (phase !== 'playing' && phase !== 'paused' && phase !== 'dialog') return;
    const id = setInterval(()=> setHudTick(t=>t+1), 82);
    return ()=>clearInterval(id);
  }, [phase]);

  const startGame = useCallback(()=>{
    audio.init();
    gameRef.current.ngPlus = false;
    gameRef.current.ngPlusLevel = 0;
    resetWorld(gameRef.current);
    gameRef.current.phase = 'playing';
    setPhase('playing');
    setDialog(null);
    setQuestLogOpen(false);
    audio.setZoneMusic(0);
  }, []);

  const toggleMute = () => {
    const nextMuted = audio.toggleMute();
    setMuted(nextMuted);
  };

  // Inputs
  useEffect(()=>{
    const kd = (e:KeyboardEvent)=>{
      keysRef.current[e.key.toLowerCase()] = true;
      if (['arrowup','arrowdown','arrowleft','arrowright',' '].includes(e.key.toLowerCase())) e.preventDefault();
      
      const gr = gameRef.current;
      
      if (e.key === 'Escape') {
        if (gr.phase==='playing') {
          gr.phase='paused';
          setPhase('paused');
          audio.pauseMusic();
        } else if (gr.phase==='paused') {
          gr.phase='playing';
          setPhase('playing');
          audio.resumeMusic();
        } else if (gr.phase==='shop') {
          gr.phase='playing';
          setPhase('playing');
          audio.playSfx('click');
        }
      }
      
      if (e.key.toLowerCase()==='e' && gr.phase==='shop') {
        gr.phase='playing';
        setPhase('playing');
        audio.playSfx('click');
      }

      if (e.key.toLowerCase()==='q') setQuestLogOpen(o=>!o);
      if (e.key.toLowerCase()==='p') {
        if (gr.phase==='playing') {
          gr.phase='paused';
          setPhase('paused');
          audio.pauseMusic();
        } else if (gr.phase==='paused') {
          gr.phase='playing';
          setPhase('playing');
          audio.resumeMusic();
        }
      }
      if (e.key.toLowerCase()==='r') {
        if (gr.phase==='gameover' || gr.phase==='victory' || gr.phase==='playing' || gr.phase==='paused') {
          resetWorld(gr);
          gr.phase='playing';
          setPhase('playing');
          setDialog(null);
          setQuestLogOpen(false);
        }
      }
      if (e.key === ' ' || e.key.toLowerCase()==='enter') {
        if (gr.phase==='dialog') {
          e.preventDefault();
        }
      }
    };
    const ku = (e:KeyboardEvent)=>{ keysRef.current[e.key.toLowerCase()] = false; };
    window.addEventListener('keydown', kd);
    window.addEventListener('keyup', ku);
    return ()=> { window.removeEventListener('keydown', kd); window.removeEventListener('keyup', ku); };
  }, []);

  // Touch joystick handlers
  const joyRef = useRef<HTMLDivElement|null>(null);
  useEffect(()=>{
    const el = joyRef.current;
    if (!el) return;
    let touchId:number|null=null;
    const start = (e:TouchEvent)=>{
      e.preventDefault();
      const t = e.changedTouches[0];
      touchId = t.identifier;
      touchActiveRef.current = true;
      move(e);
    };
    const move = (e:TouchEvent)=>{
      e.preventDefault();
      if (touchId===null) return;
      let t = Array.from(e.touches).find(tt=>tt.identifier===touchId) || Array.from(e.changedTouches).find(tt=>tt.identifier===touchId);
      if (!t) return;
      const rect = el.getBoundingClientRect();
      const cx = rect.left + rect.width/2;
      const cy = rect.top + rect.height/2;
      let dx = (t.clientX - cx) / (rect.width/2 - 14);
      let dy = (t.clientY - cy) / (rect.height/2 - 14);
      const mag = Math.hypot(dx,dy);
      if (mag>1){ dx/=mag; dy/=mag; }
      touchMoveRef.current = {x:dx, y:dy};
    };
    const end = (e:TouchEvent)=>{
      e.preventDefault();
      if (Array.from(e.changedTouches).some(t=>t.identifier===touchId)){
        touchId = null;
        touchActiveRef.current=false;
        touchMoveRef.current={x:0,y:0};
      }
    };
    el.addEventListener('touchstart', start, {passive:false});
    el.addEventListener('touchmove', move, {passive:false});
    el.addEventListener('touchend', end, {passive:false});
    el.addEventListener('touchcancel', end, {passive:false});
    return ()=>{
      el.removeEventListener('touchstart', start);
      el.removeEventListener('touchmove', move);
      el.removeEventListener('touchend', end);
      el.removeEventListener('touchcancel', end);
    };
  },[phase]);

  // Game loop
  useEffect(()=>{
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha:false })!;
    ctx.imageSmoothingEnabled = false;

    let raf = 0;
    let last = performance.now();

    const loop = (now:number)=>{
      raf = requestAnimationFrame(loop);
      const gr = gameRef.current;
      const dtClamp = Math.min(34, now-last);
      last = now;

      // Draw last state static canvas frame if game is paused or overlays are active
      if (gr.phase!=='playing') {
        renderFrame(ctx, gr);
        return;
      }
      if (gr.hitStop > 0){
        gr.hitStop--;
        renderFrame(ctx, gr);
        return;
      }

      const keys = keysRef.current;
      let ix = 0, iy = 0;
      if (keys['arrowleft']||keys['a']) ix -=1;
      if (keys['arrowright']||keys['d']) ix +=1;
      if (keys['arrowup']||keys['w']) iy -=1;
      if (keys['arrowdown']||keys['s']) iy +=1;

      if (touchActiveRef.current){
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
        keys['e']=false; keys['f']=false;
        setTouchInteract(false);
      }

      updateWorld(gr, inputs, dtClamp, setDialog, setPhase);
      renderFrame(ctx, gr);
    };
    raf = requestAnimationFrame(loop);
    return ()=> cancelAnimationFrame(raf);
  }, [phase, touchAttack, touchDash, touchInteract]);

  const saveScore = ()=>{
    const gr = gameRef.current;
    const finalScore = gr.score;
    const entry: HighScore = { name: nameInput.slice(0,8).toUpperCase()||'HERO', score: finalScore, day: new Date().toLocaleDateString('en-CA') };
    const next = [...highScores, entry].sort((a,b)=>b.score-a.score).slice(0,7);
    setHighScores(next);
    localStorage.setItem('pixHeroScores', JSON.stringify(next));
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
    }

    pl.hp = pl.maxHp;
    g.phase = 'playing';
    setPhase('playing');
    audio.playSfx('levelup');
    setHudTick(t => t + 1);
  };

  const topQuests = useMemo(()=>{
    return g.quests.filter(q=>!q.done).slice(0,3);
  }, [hudTick, g.quests]);

  return (
    <div className="min-h-screen w-full bg-[#0b0f14] text-[#e8efe8] flex flex-col items-center" style={{ fontFamily: '"VT323", monospace' }}>
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
        }
        .crt-glow { box-shadow: 0 0 34px rgba(110,255,176,0.085), inset 0 0 120px rgba(0,0,0,0.55); }
        .pixel-border {
          box-shadow: 0 0 0 3px #161f23, 0 0 0 6px #e8d67a, 0 0 0 9px #161f23;
        }
        .touch-btn { user-select:none; -webkit-user-select:none; touch-action:none; }
      `}</style>

      {/* HEADER BAR */}
      <div className="w-full border-b border-[#1f2c28] bg-[#0f151a]/95 backdrop-blur sticky top-0 z-30">
        <div className="max-w-[1100px] mx-auto px-4 sm:px-7 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-[8px] bg-[#16211d] border border-[#263a30] flex items-center justify-center pixelfont text-[9px] sm:text-[10px] text-[#8ef7bf]">8◼</div>
            <div>
              <div className="pixelfont text-[10px] sm:text-[12px] text-[#f1efdb] tracking-wider">PIXEL HERO</div>
              <div className="vtt text-[15px] sm:text-[18px] text-[#78d6a4] -mt-[1px]">The Bean-Curse Saga</div>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-5 vtt text-[19px] text-[#b9cfc0]">
            <span>WASD / arrows • SPACE attack • SHIFT dash • E interact • Q quests • P pause</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              className="pixelfont text-[9px] sm:text-[10px] px-3 py-[9px] rounded bg-[#182722] border border-[#2b4a3a] text-[#8ef7bf] hover:bg-[#20342c] transition cursor-pointer"
              onClick={toggleMute}
            >
              {muted ? '🔇 MUTED' : '🔊 MUSIC'}
            </button>
            <button
              className="pixelfont text-[9px] sm:text-[10px] px-3 py-[9px] rounded bg-[#182722] border border-[#2b4a3a] text-[#aef2c9] hover:bg-[#20342c] transition cursor-pointer"
              onClick={()=> {
                audio.init();
                const gr = gameRef.current;
                if (phase==='playing'){
                  gr.phase='paused';
                  setPhase('paused');
                  audio.pauseMusic();
                } else if (phase==='paused'){
                  gr.phase='playing';
                  setPhase('playing');
                  audio.resumeMusic();
                } else if (phase==='shop') {
                  gr.phase='playing';
                  setPhase('playing');
                } else {
                  startGame();
                }
              }}
            >
              {phase==='playing' ? 'PAUSE' : phase==='paused' ? 'RESUME' : phase==='shop' ? 'RESUME' : 'PLAY'}
            </button>
          </div>
        </div>
      </div>

      <div className="w-full max-w-[1100px] px-3 sm:px-7 py-5 sm:py-8 flex flex-col xl:flex-row gap-5 xl:gap-7">
        {/* GAME COLUMN */}
        <div className="flex-1 min-w-0">
          <div className="relative rounded-[14px] overflow-hidden crt-glow pixel-border bg-[#0e1412]">
            {/* Top HUD over canvas */}
            {phase !== 'menu' && (
              <div className="absolute top-0 left-0 right-0 z-20 pointer-events-none">
                <div className="flex flex-wrap gap-2 sm:gap-3 px-3 sm:px-4 py-[9px] bg-gradient-to-b from-[#09110e]/95 to-[#09110e]/30 text-[10px] pixelfont">
                  <span className="text-[#ffe36a]">SCORE {g.score.toLocaleString()}</span>
                  <span className="text-[#8fffb7]">¢ {g.player?.coins ?? 0}</span>
                  <span className="text-[#ff9ab0]">LV {g.player?.level ?? 1}</span>
                  <span className="text-[#9fdfff] hidden sm:inline">{ZONES[g.zone]?.name}</span>
                  {g.player?.hasFireball && <span className="text-[#ffa043]">🔥</span>}
                  {g.player?.hasVampire && <span className="text-[#bd52ff]">💀</span>}
                  <span className="text-[#d5d6c8] ml-auto">K {g.kills}</span>
                </div>
              </div>
            )}

            <div className="relative scan bg-black">
              <canvas
                ref={canvasRef}
                width={GAME_W}
                height={GAME_H}
                className="w-full h-auto block"
                style={{ aspectRatio: `${GAME_W}/${GAME_H}` }}
              />
              {/* quest ticker (mobile friendly) */}
              {phase==='playing' && (
                <div className="absolute bottom-[94px] sm:bottom-3 left-3 right-3 sm:right-auto sm:max-w-[410px] pointer-events-none">
                  <div className="text-[8px] sm:text-[9px] pixelfont text-[#d5f5d8] bg-[#0b1512]/80 border border-[#224232] rounded-md px-2 sm:px-3 py-[7px] leading-[16px]">
                    {topQuests.length ? topQuests.map(q => (
                      <div key={q.id} className="flex items-center gap-2">
                        <span className={q.progress>0 ? "text-[#ffe96a]": "text-[#93d8aa]"}>▸</span>
                        <span className="truncate">{q.title} {q.target>1 ? `${q.progress}/${q.target}` : ''}</span>
                      </div>
                    )) : <span className="text-[#ffe66b]">ALL TASKS READY → BOSS</span>}
                  </div>
                </div>
              )}
            </div>

            {/* bottom HUD */}
            {phase !== 'menu' && (
              <div className="bg-[#0e1715] border-t border-[#1e3129] px-3 sm:px-4 py-3 flex flex-wrap items-center gap-3 sm:gap-5">
                {/* HP */}
                <div className="flex items-center gap-3">
                  <div className="pixelfont text-[9px] text-[#ff8d98]">HP</div>
                  <div className="w-[144px] sm:w-[200px] h-[13px] bg-[#111c19] border border-[#253c31] rounded-[4px] overflow-hidden relative">
                    <div
                      className="h-full transition-all duration-100"
                      style={{
                        width: `${((g.player?.hp ?? 0) / (g.player?.maxHp ?? 84))*100}%`,
                        background: 'linear-gradient(90deg,#ff5d72,#ff9179)'
                      }}
                    />
                  </div>
                  <div className="vtt text-[20px] text-[#ffd4d8] min-w-[74px]">{g.player?.hp ?? 84}/{g.player?.maxHp ?? 84}</div>
                </div>

                {/* XP */}
                <div className="flex items-center gap-2">
                  <div className="pixelfont text-[8px] text-[#95e9ff]">XP</div>
                  <div className="w-[104px] sm:w-[140px] h-[8px] bg-[#101a20] border border-[#23414f] rounded-[3px] overflow-hidden">
                    <div className="h-full bg-[#6fdfff]" style={{width:`${((g.player?.xp ?? 0)/((g.player?.level ?? 1)*32))*100}%`}} />
                  </div>
                </div>

                <div className="ml-auto flex items-center gap-3 text-[10px] pixelfont">
                  {/* Visual ATK Gauge */}
                  <div className="relative overflow-hidden px-2 py-[4px] rounded border border-[#284034] text-[#8ff9b8] bg-[#0f1b16] min-w-[48px] text-center">
                    <div
                      className="absolute top-0 left-0 bottom-0 bg-[#163b27] transition-all duration-75"
                      style={{ width: `${100 - ((g.player?.attackCd ?? 0) / 19) * 100}%` }}
                    />
                    <span className="relative z-10">ATK</span>
                  </div>

                  {/* Visual DASH Gauge */}
                  <div className="relative overflow-hidden px-2 py-[4px] rounded border border-[#27424c] text-[#b8f5ff] bg-[#0c1820] min-w-[56px] text-center">
                    <div
                      className="absolute top-0 left-0 bottom-0 bg-[#12313d] transition-all duration-75"
                      style={{ width: `${100 - ((g.player?.dashCd ?? 0) / (g.player?.dashCdMax ?? 44)) * 100}%` }}
                    />
                    <span className="relative z-10">DASH</span>
                  </div>

                  <button
                    onClick={()=>setQuestLogOpen(o=>!o)}
                    className="px-[11px] py-[6px] rounded bg-[#19261f] border border-[#345945] text-[#c3f2d2] hover:bg-[#20372b] cursor-pointer"
                  >Q LOG</button>
                </div>
              </div>
            )}

            {/* Touch Controls Overlay (mobile) */}
            {phase==='playing' && (
              <div className="sm:hidden absolute inset-0 z-10 pointer-events-none">
                {/* joystick */}
                <div
                  ref={joyRef}
                  className="absolute left-3 bottom-[100px] w-[135px] h-[135px] pointer-events-auto touch-btn"
                  style={{ touchAction:'none' }}
                >
                  <div className="w-full h-full rounded-full bg-[#0c1713]/65 border-[3px] border-[#29483a] relative">
                    <div
                      className="absolute w-12 h-12 rounded-full bg-[#1f3d30] border-2 border-[#5edfa1] left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
                      style={{
                        transform: `translate(calc(-50% + ${touchMoveRef.current.x*38}px), calc(-50% + ${touchMoveRef.current.y*38}px))`
                      }}
                    />
                    <div className="absolute inset-0 flex items-center justify-center vtt text-[13px] text-[#66dca1] opacity-70">
                      MOVE
                    </div>
                  </div>
                </div>
                {/* right buttons */}
                <div className="absolute right-3 bottom-[96px] flex flex-col gap-3 pointer-events-auto">
                  <button
                    onTouchStart={(e)=>{ e.preventDefault(); setTouchAttack(true); }}
                    className="touch-btn w-[82px] h-[82px] rounded-[18px] bg-[#d84349]/[0.95] border-[3px] border-[#ffb8be] active:scale-95 transition"
                  >
                    <div className="pixelfont text-[11px] text-white">ATK</div>
                  </button>
                  <div className="flex gap-3">
                    <button
                      onTouchStart={(e)=>{ e.preventDefault(); setTouchDash(true); }}
                      className="touch-btn w-[64px] h-[56px] rounded-[14px] bg-[#2688c7]/[0.96] border-[3px] border-[#a8e7ff] active:scale-95"
                    >
                      <div className="pixelfont text-[9px] text-white">DSH</div>
                    </button>
                    <button
                      onTouchStart={(e)=>{ e.preventDefault(); setTouchInteract(true); }}
                      className="touch-btn w-[64px] h-[56px] rounded-[14px] bg-[#f2c242]/[0.97] border-[3px] border-[#fff2b8] active:scale-95"
                    >
                      <div className="pixelfont text-[9px] text-[#301d00]">USE</div>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* overlays */}
            {phase==='menu' && (
              <div className="absolute inset-0 bg-[#060c0b]/[0.93] flex items-center justify-center z-30 px-4">
                <div className="max-w-[500px] w-full text-center">
                  <div className="pixelfont text-[9px] sm:text-[10px] text-[#7ee9a8] tracking-widest uppercase">8-Bit Arcade RPG</div>
                  <img 
                    src="/pixelquest_logo.png" 
                    alt="PixelHero Logo" 
                    className="w-[65%] max-w-[260px] mx-auto my-4 drop-shadow-[0_4px_0_rgba(0,0,0,0.5)]" 
                    style={{ imageRendering: 'pixelated' }} 
                  />
                  <div className="pixelfont text-[9px] sm:text-[10px] text-[#ffcf6b] tracking-wider">THE BEAN-CURSE SAGA</div>
                  <p className="vtt text-[18px] sm:text-[21px] text-[#c9e8ce] mt-4 leading-normal max-w-[420px] mx-auto">
                    Emberwick’s fields wilt. Slimes boil in Gloomwood. Talk to Elder Mael, clear tasks, steal the Hollow Key, and topple Gruk the Rot-Tusk.
                  </p>
                  <div className="mt-6 flex flex-wrap justify-center items-center gap-3">
                    <button 
                      onClick={startGame} 
                      className="pixelfont text-[11px] sm:text-[12px] px-6 py-[12px] sm:px-7 sm:py-[14px] rounded-[8px] bg-[#33d17a] text-[#052116] border-[3px] border-[#b9ffd8] shadow-[0_4px_0_#0a7a43] active:translate-y-[4px] active:shadow-[0_0px_0_#0a7a43] transition-all cursor-pointer"
                    >
                      START QUEST
                    </button>
                    <button 
                      onClick={()=> {
                        const hsEl = document.getElementById('scores');
                        hsEl?.scrollIntoView({behavior:'smooth'});
                      }} 
                      className="pixelfont text-[10px] px-5 py-[11px] sm:px-5 sm:py-[12px] rounded-[8px] bg-[#18251f] text-[#b8f4ce] border-2 border-[#2c5540] cursor-pointer hover:bg-[#203229] transition-all"
                    >
                      HIGH SCORES
                    </button>
                  </div>
                  <div className="pixelfont text-[8px] sm:text-[9px] text-[#709a7f] mt-6">Keyboard + Touch Controls • 60 FPS • Instant Restart</div>
                </div>
              </div>
            )}

            {phase==='paused' && (
              <div className="absolute inset-0 bg-[#050b0a]/80 flex items-center justify-center z-30">
                <div className="bg-[#0d1815] border-[4px] border-[#e9d778] rounded-xl px-8 sm:px-12 py-10 text-center pixel-border">
                  <div className="pixelfont text-[20px] text-[#fff2b8]">PAUSED</div>
                  <div className="vtt text-[22px] text-[#a9d6b6] mt-2">Take a breath, hero.</div>
                  <div className="flex justify-center gap-3 mt-6">
                    <button onClick={()=>{ g.phase='playing'; setPhase('playing'); audio.resumeMusic(); }} className="pixelfont text-[11px] px-5 py-3 bg-[#2fd07b] text-[#072014] border-2 border-[#b8ffe0] rounded cursor-pointer">
                      RESUME
                    </button>
                    <button onClick={()=>{ g.phase='menu'; setPhase('menu'); audio.pauseMusic(); }} className="pixelfont text-[11px] px-5 py-3 bg-[#1a2622] text-[#b8e4c8] border-2 border-[#345a45] rounded cursor-pointer">
                      QUIT
                    </button>
                  </div>
                </div>
              </div>
            )}

            {phase==='dialog' && dialog && (
              <div className="absolute bottom-0 left-0 right-0 z-30">
                <div className="m-3 sm:m-4 bg-[#0c1411]/[0.97] border-[3px] border-[#f2d96a] rounded-[10px] px-4 sm:px-6 py-4 sm:py-5">
                  <div className="pixelfont text-[9px] text-[#ffdf79]">{dialog.speaker}</div>
                  <div className="vtt text-[22px] sm:text-[26px] text-[#e8f7e3] mt-2 min-h-[40px]">
                    {dialog.lines[dialog.idx]}
                  </div>
                  <div className="flex justify-between items-center mt-3">
                    <div className="vtt text-[18px] text-[#82c59a]">{dialog.idx+1}/{dialog.lines.length}</div>
                    <button
                      onClick={()=>{
                        if (dialog.idx < dialog.lines.length-1){
                          setDialog(d=> d ? {...d, idx:d.idx+1} : d);
                          audio.playSfx('click');
                        } else {
                          setDialog(null);
                          g.phase='playing';
                          setPhase('playing');
                          audio.playSfx('click');
                        }
                      }}
                      className="pixelfont text-[10px] px-4 py-2 bg-[#f2d467] text-[#2a1c00] rounded border-2 border-[#fff3b6] cursor-pointer"
                    >NEXT ▶</button>
                  </div>
                </div>
              </div>
            )}

            {phase==='gameover' && (
              <div className="absolute inset-0 bg-[#0a0506]/[0.92] flex items-center justify-center z-30 px-4">
                <div className="w-full max-w-[560px] text-center bg-[#140e13] border-[4px] border-[#ff5f76] rounded-xl px-5 sm:px-9 py-8">
                  <div className="pixelfont text-[10px] text-[#ff9aa8]">EMBERWICK FELL</div>
                  <div className="pixelfont text-[22px] sm:text-[26px] text-[#ffe6e9] mt-2">GAME OVER</div>
                  <div className="vtt text-[26px] text-[#ffcfcf] mt-3">
                    Score {g.score.toLocaleString()} • Kills {g.kills} • Lv {g.player?.level}
                  </div>
                  <div className="mt-5 flex gap-2 justify-center items-center">
                    <input
                      value={nameInput}
                      onChange={e=>setNameInput(e.target.value.toUpperCase().slice(0,8))}
                      className="pixelfont text-[12px] bg-[#1d1419] border-2 border-[#643142] text-[#ffd4db] px-3 py-[10px] rounded w-[170px] text-center tracking-widest outline-none"
                      placeholder="NAME"
                    />
                    <button onClick={saveScore} className="pixelfont text-[10px] px-4 py-[12px] bg-[#17241d] border-2 border-[#3e6b4b] text-[#b4f4c9] rounded cursor-pointer">SAVE</button>
                  </div>
                  <div className="mt-5 flex gap-3 justify-center">
                    <button onClick={startGame} className="pixelfont text-[11px] px-6 py-3 bg-[#ff5f76] text-white border-[3px] border-[#ffd3da] rounded cursor-pointer">RESTART • R</button>
                    <button onClick={()=>{ g.phase='menu'; setPhase('menu'); }} className="pixelfont text-[11px] px-5 py-3 bg-[#1f171c] border-2 border-[#4b2d39] text-[#f0c8d1] rounded cursor-pointer">MENU</button>
                  </div>
                </div>
              </div>
            )}

            {phase==='victory' && (
              <div className="absolute inset-0 bg-[#06100b]/[0.94] flex items-center justify-center z-30 px-4">
                <div className="w-full max-w-[600px] text-center bg-[#0d1a13] border-[4px] border-[#f3dd75] rounded-xl px-5 sm:px-10 py-9">
                  <div className="pixelfont text-[10px] text-[#ffdd6b]">{g.ngPlus ? `NG+ ${g.ngPlusLevel} COMPLETE` : 'QUEST COMPLETE'}</div>
                  <div className="pixelfont text-[22px] sm:text-[27px] text-[#fff6c7] mt-2 leading-tight">THE SHADOW IS VANQUISHED</div>
                  <div className="vtt text-[22px] text-[#c7f7d0] mt-3">
                    Emberwick breathes again.<br/>
                    Final Score {g.score.toLocaleString()} — kills {g.kills} — time {Math.floor((performance.now()-g.gameStartTime)/1000)}s
                  </div>
                  <div className="mt-5 flex gap-2 justify-center items-center">
                    <input
                      value={nameInput}
                      onChange={e=>setNameInput(e.target.value.toUpperCase().slice(0,8))}
                      className="pixelfont text-[12px] bg-[#0f2217] border-2 border-[#3b7955] text-[#cffff0] px-3 py-[10px] rounded w-[170px] text-center tracking-widest outline-none"
                      placeholder="HERO"
                    />
                    <button onClick={saveScore} className="pixelfont text-[10px] px-4 py-[12px] bg-[#f4d86b] text-[#2a1c00] rounded border-2 border-[#fff7cc] cursor-pointer">SAVE</button>
                  </div>
                  <div className="mt-5 flex gap-3 justify-center flex-wrap">
                    <button onClick={()=>{ g.ngPlus = true; g.ngPlusLevel = (g.ngPlusLevel || 0) + 1; resetWorld(g, true); g.phase='playing'; setPhase('playing'); setDialog(null); setQuestLogOpen(false); audio.setZoneMusic(0); }} className="pixelfont text-[11px] px-6 py-3 bg-[#9a5fff] text-[#1a0a30] border-[3px] border-[#d4b8ff] rounded cursor-pointer">NEW GAME+</button>
                    <button onClick={startGame} className="pixelfont text-[11px] px-6 py-3 bg-[#36d884] text-[#052013] border-[3px] border-[#b9ffe0] rounded cursor-pointer">PLAY AGAIN</button>
                    <button onClick={()=>{ g.phase='menu'; setPhase('menu'); }} className="pixelfont text-[11px] px-5 py-3 bg-[#16241c] border-2 border-[#37604a] text-[#c5f3d2] rounded cursor-pointer">MENU</button>
                  </div>
                </div>
              </div>
            )}

            {/* Merchant Shop overlay */}
            {phase==='shop' && (
              <div className="absolute inset-0 bg-[#050b0a]/85 flex items-center justify-center z-30 px-4">
                <div className="w-full max-w-[480px] bg-[#0d1613] border-[4px] border-[#d4be66] rounded-xl px-5 py-6 pixel-border text-center">
                  <div className="pixelfont text-[14px] text-[#ffe06a]">MERCHANT SHOP</div>
                  <div className="vtt text-[19px] text-[#86bf9a] mt-1">Spend your coins on legendary upgrades!</div>
                  
                  <div className="mt-4 text-left space-y-3 pixelfont text-[10px]">
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
                        <div key={item.id} className="flex items-center justify-between p-2.5 rounded bg-[#12221b] border border-[#2b4d3d] hover:bg-[#162e24]">
                          <div className="max-w-[70%]">
                            <div className="text-[#a8ffd0] font-bold">{item.name}{ownedText}</div>
                            <div className="vtt text-[16px] text-[#a4cfae] leading-snug mt-0.5">{item.desc}</div>
                          </div>
                          <button
                            disabled={disableBuy}
                            onClick={() => buyShopItem(item)}
                            className={`px-3 py-2 rounded text-[9px] border-2 transition-all cursor-pointer ${
                              isOwnedMax
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

                  <div className="mt-5 flex justify-between items-center text-[11px] pixelfont">
                    <span className="text-[#ffd75d]">YOUR COINS: {g.player?.coins ?? 0}¢</span>
                    <button
                      onClick={() => {
                        g.phase = 'playing';
                        setPhase('playing');
                        audio.playSfx('click');
                      }}
                      className="px-5 py-2.5 bg-[#db394c] text-white border-2 border-[#ffcbd4] rounded hover:bg-[#b02434] cursor-pointer"
                    >
                      CLOSE [E]
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Level Up Perk Selection Modal */}
            {phase==='levelup' && (
              <div className="absolute inset-0 bg-[#060c0b]/[0.91] flex flex-col items-center justify-center z-30 px-4">
                <div className="max-w-[720px] w-full text-center">
                  <div className="pixelfont text-[12px] text-[#9df7ff] animate-pulse tracking-widest">LEVEL UP!</div>
                  <h2 className="pixelfont text-[22px] sm:text-[30px] text-[#ffeb85] mt-2 drop-shadow-[0_2.5px_0_#9a6a12]">CHOOSE A LEGENDARY PERK</h2>
                  <p className="vtt text-[20px] text-[#c0e0cc] mt-1">Select one blessing to customize your hero.</p>

                  <div className="mt-7 grid grid-cols-1 md:grid-cols-3 gap-4">
                    {g.perkChoices.map(perkId => {
                      const pData = ALL_PERKS.find(p => p.id === perkId);
                      if (!pData) return null;

                      let icon = "⚔️";
                      let color = "border-[#db5a6b] text-[#ffa3af] bg-[#201014]";
                      let hoverGlow = "hover:shadow-[0_0_24px_rgba(219,90,107,0.36)]";
                      
                      if (perkId === 'speed') {
                        icon = "⚡";
                        color = "border-[#5cbfff] text-[#bce7ff] bg-[#101824]";
                        hoverGlow = "hover:shadow-[0_0_24px_rgba(92,191,255,0.36)]";
                      } else if (perkId === 'hp') {
                        icon = "💖";
                        color = "border-[#52df97] text-[#c0ffd8] bg-[#0c2016]";
                        hoverGlow = "hover:shadow-[0_0_24px_rgba(82,223,151,0.36)]";
                      } else if (perkId === 'fireball') {
                        icon = "🔥";
                        color = "border-[#ffa043] text-[#ffe3b8] bg-[#241710]";
                        hoverGlow = "hover:shadow-[0_0_24px_rgba(255,160,67,0.36)]";
                      } else if (perkId === 'vampire') {
                        icon = "💀";
                        color = "border-[#bd52ff] text-[#e8bdff] bg-[#1b1024]";
                        hoverGlow = "hover:shadow-[0_0_24px_rgba(189,82,255,0.36)]";
                      }

                      return (
                        <button
                          key={perkId}
                          onClick={() => selectPerk(perkId)}
                          className={`flex flex-col items-center justify-between p-5 rounded-xl border-[3px] text-center transition-all cursor-pointer ${color} ${hoverGlow} hover:-translate-y-1.5 duration-200`}
                        >
                          <div className="text-[34px] mb-2">{icon}</div>
                          <div className="pixelfont text-[11px] font-bold tracking-wider">{pData.name}</div>
                          <div className="vtt text-[17px] text-[#cbdad0] leading-snug mt-3 flex-grow">{pData.desc}</div>
                          <div className="mt-4 pixelfont text-[8px] text-[#ffe76b] border border-[#ffec94]/40 px-2.5 py-1 rounded bg-[#ffdf6b]/10">
                            SELECT BLESSED
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Quest Log Drawer */}
            {questLogOpen && phase!=='menu' && (
              <div className="absolute right-3 top-[58px] w-[300px] sm:w-[340px] bg-[#0a1612]/[0.97] border-[3px] border-[#dbc56a] rounded-lg px-4 py-4 z-20">
                <div className="flex justify-between items-center">
                  <div className="pixelfont text-[10px] text-[#ffe176]">QUEST LOG</div>
                  <button onClick={()=>setQuestLogOpen(false)} className="vtt text-[17px] text-[#98d0a6] cursor-pointer">✕</button>
                </div>
                <div className="mt-3 space-y-3">
                  {g.quests.map(q=>(
                    <div key={q.id} className={`text-[11px] pixelfont leading-[17px] ${q.done ? 'text-[#7ff0a4] line-through opacity-85' : 'text-[#d7f2df]'}`}>
                      <div>{q.title}</div>
                      <div className="vtt text-[17px] text-[#a9d8b4] -mt-0.5">{q.desc}</div>
                      <div className="text-[9px] text-[#ffe176] mt-[2px]">{q.done ? '✓ COMPLETE' : q.target>1 ? `${q.progress}/${q.target}` : '…'}</div>
                    </div>
                  ))}
                </div>
                <div className="mt-3 text-[9px] pixelfont text-[#8fcfa3]">
                  ZONE: {ZONES[g.zone]?.name}
                </div>
              </div>
            )}

          </div>

          {/* Mobile hint bar */}
          <div className="sm:hidden mt-3 text-[9px] pixelfont text-[#84bc95] bg-[#0f1a16] border border-[#203829] rounded-lg px-3 py-[9px] leading-[14px]">
            LEFT: joystick • RIGHT red=ATK blue=DSH gold=USE • Auto-scroll boundaries to travel
          </div>

          {/* controls card desktop */}
          <div className="hidden sm:block mt-4 grid grid-cols-3 gap-3 text-[10px] pixelfont">
            <div className="bg-[#111b17] border border-[#21382d] rounded-lg p-3 text-[#b7e5c4]">MOVE <br/><span className="text-[#fff2a8] vtt text-[18px]">WASD / arrows</span></div>
            <div className="bg-[#111b17] border border-[#21382d] rounded-lg p-3 text-[#b7e5c4]">ATTACK <br/><span className="text-[#fff2a8] vtt text-[18px]">Space / J</span></div>
            <div className="bg-[#111b17] border border-[#21382d] rounded-lg p-3 text-[#b7e5c4]">DASH / USE <br/><span className="text-[#fff2a8] vtt text-[18px]">Shift • E</span></div>
          </div>
        </div>

        {/* RIGHT SIDEBAR */}
        <div className="xl:w-[340px] flex-shrink-0 space-y-4">
          {/* current tasks */}
          <div className="bg-[#0f1815] border border-[#23372d] rounded-xl p-4">
            <div className="pixelfont text-[10px] text-[#ffe37a]">ACTIVE TASKS</div>
            <div className="mt-3 space-y-[14px]">
              {g.quests.map(q=>(
                <div key={q.id}>
                  <div className={`pixelfont text-[9px] ${q.done ? 'text-[#6be39a]' : 'text-[#daf6e1]'}`}>
                    {q.done ? '✓ ' : '▸ '}{q.title}
                  </div>
                  <div className="vtt text-[17px] text-[#98c9a4]">{q.desc}</div>
                  {q.target>1 && (
                    <div className="mt-1 w-full h-[6px] bg-[#16251d] border border-[#264232] rounded overflow-hidden">
                      <div className="h-full bg-[#ffd75d]" style={{width: `${(q.progress/q.target)*100}%`}} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* zone card */}
          <div className="bg-[#10161b] border border-[#26333c] rounded-xl p-4">
            <div className="pixelfont text-[10px] text-[#9eeaff]">WORLD MAP</div>
            <div className="mt-3 space-y-2 vtt text-[19px]">
              {ZONES.map((z,i)=>(
                <div key={z.id} className={`flex items-center justify-between px-3 py-2 rounded border ${g.zone===i ? 'bg-[#143026] border-[#3aa86d] text-[#b8ffe2]' : 'bg-[#0e1519] border-[#25333c] text-[#8ea6aa]'}`}>
                  <span>{z.name}</span>
                  <span className="pixelfont text-[8px]">{g.zone===i ? '◉' : '○'}</span>
                </div>
              ))}
            </div>
            <div className="pixelfont text-[8px] text-[#7ea597] mt-3 leading-[15px]">
              Walk off the screen edges to travel between zones automatically. Boss gate needs the Rusted Key.
            </div>
          </div>

          {/* scores */}
          <div id="scores" className="bg-[#121314] border border-[#2a2b2b] rounded-xl p-4">
            <div className="pixelfont text-[10px] text-[#ffd86d]">HALL OF HEROES</div>
            {highScores.length===0 ? (
              <div className="vtt text-[18px] text-[#8ba099] mt-2">No scores yet. Be first!</div>
            ) : (
              <ol className="mt-3 space-y-[7px] vtt text-[20px]">
                {highScores.map((s,idx)=>(
                  <li key={idx} className="flex justify-between border-b border-[#1f2622] pb-[6px]">
                    <span className="pixelfont text-[9px] text-[#9feac1]">{idx+1}. {s.name}</span>
                    <span className="text-[#ffe48b]">{s.score.toLocaleString()}</span>
                  </li>
                ))}
              </ol>
            )}
            <button
              onClick={()=>{ localStorage.removeItem('pixHeroScores'); setHighScores([]); }}
              className="mt-3 pixelfont text-[8px] text-[#82a992] hover:text-[#b9efcb] cursor-pointer"
            >clear local</button>
          </div>

          {/* stats sidebar */}
          <div className="bg-[#121016] border border-[#342835] rounded-xl p-4">
            <div className="pixelfont text-[10px] text-[#fea7bb]">HERO STATS</div>
            <div className="vtt text-[18px] text-[#d3b8c2] mt-2 space-y-1.5">
              <div className="flex justify-between">
                <span>Base Sword Damage:</span>
                <span className="text-[#ff9ab0]">{24 + Math.floor((g.player?.level ?? 1) * 2.5) + (g.player?.damageBonus ?? 0)}</span>
              </div>
              <div className="flex justify-between">
                <span>Bonus Shop Damage:</span>
                <span className="text-[#ffdf79]">+{g.player?.damageBonus ?? 0}</span>
              </div>
              <div className="flex justify-between">
                <span>Movement Speed:</span>
                <span className="text-[#9fdfff]">{(2.35 + (g.player?.speedBonus ?? 0)).toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Dash Cooldown:</span>
                <span className="text-[#bce7ff]">{g.player?.dashCdMax ?? 44}f</span>
              </div>
              <div className="flex justify-between">
                <span>Flame Blessing:</span>
                <span className="text-[#ffa043]">{g.player?.hasFireball ? "ACTIVE (Fireballs)" : "LOCKED"}</span>
              </div>
              <div className="flex justify-between">
                <span>Soul Eater (Vamp):</span>
                <span className="text-[#bd52ff]">{g.player?.hasVampire ? "ACTIVE (+3 HP on kill)" : "LOCKED"}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <footer className="w-full border-t border-[#1b2621] mt-2 py-5 text-center vtt text-[18px] text-[#6a8a79]">
        Press Start 2P • built for 60fps • R to quick-restart • Made in canvas • 2026 Pixel Hero
      </footer>
    </div>
  );
}