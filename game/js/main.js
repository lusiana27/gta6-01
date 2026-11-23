// main.js — Sunport City bootstrap: game state, the main loop, input, camera,
// car stealing, combat, shops, save/load and the staged screenshot scenes.
// Plain ES modules, no libraries, no network.

import { generateCity, PLACES, WORLD_W, WORLD_H, isRoad, collideBuildings, daylight, clockText } from './city.js';
import { makePlayer, makeCar, spawnTrafficCar, spawnPed, drivePlayerCar, walkPlayer, updateTrafficCar, updatePed, drawCar, drawPed, drawPlayer, CAR_COLORS } from './entities.js';
import { wantedCopCount, wantedSpawnInterval, spawnCop, updateCop, updateHeli, drawHeli, updateRoadblocks, drawRoadblocks, updateWanted, addWanted } from './police.js';
import { MISSIONS, startMission, updateMission, drawMissionMarkers } from './missions.js';
import { drawHUD, drawMenu } from './hud.js';
import { AudioEngine } from './audio.js';
import { drawCity } from './city.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const params = new URLSearchParams(location.search);
const rnd = (() => { let s = 987654321; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; })();

const S = {
  city: generateCity(),
  player: makePlayer(PLACES.start.x, PLACES.start.y),
  cars: [], peds: [], cops: [], roadblocks: [],
  heli: null, rbT: 5, copT: 0,
  money: 250, wanted: 0, wantedHeat: 0,
  clock: 9.2, dayNight: 'DAY',
  missionsDone: 0, mission: null,
  camera: { x: 0, y: 0 },
  keys: {}, mouse: { x: 640, y: 400, down: false },
  state: 'menu', // menu | playing | paused
  flash: '', flashT: 0, missionBrief: '', missionBriefT: 0,
  missionDoneT: 0, missionDoneName: '', missionDoneReward: 0,
  busted: false, wasted: false, allMissionsDone: false,
  shake: 0, tracers: [], hasSave: false,
  audio: new AudioEngine(),
  saveGame: null,
};

S.saveGame = function () {
  try {
    localStorage.setItem('sunport-city-save-v1', JSON.stringify({
      money: S.money, missionsDone: S.missionsDone, health: S.player.health,
      armor: S.player.armor, hasPistol: S.player.hasPistol, ammo: S.player.ammo,
      clock: S.clock, x: S.player.x, y: S.player.y,
    }));
  } catch (e) { /* storage unavailable */ }
};

function loadSave() {
  try {
    const raw = localStorage.getItem('sunport-city-save-v1');
    if (!raw) return false;
    const d = JSON.parse(raw);
    S.money = d.money; S.missionsDone = d.missionsDone;
    S.player.health = d.health; S.player.armor = d.armor;
    S.player.hasPistol = d.hasPistol; S.player.ammo = d.ammo;
    S.clock = d.clock; S.player.x = d.x; S.player.y = d.y;
    return true;
  } catch (e) { return false; }
}
S.hasSave = !!localStorage.getItem('sunport-city-save-v1');

/** Keep the streets busy: top up traffic and pedestrians near the player. */
function maintainPopulation() {
  const p = S.player;
  S.cars = S.cars.filter((c) => c.kind !== 'traffic' || Math.hypot(c.x - p.x, c.y - p.y) < 1400);
  S.peds = S.peds.filter((pd) => Math.hypot(pd.x - p.x, pd.y - p.y) < 1200);
  const trafficTarget = S.scene === 'chase' ? 30 : 26;
  while (S.cars.filter((c) => c.kind === 'traffic').length < trafficTarget) {
    const c = spawnTrafficCar(rnd, p);
    if (c) S.cars.push(c); else break;
  }
  while (S.peds.length < 42) {
    const pd = spawnPed(rnd, p);
    if (pd) S.peds.push(pd); else break;
  }
}

/** Park a few cars along the kerb so the player can steal one. */
function parkCars() {
  const spots = [[860, 560], [1120, 700], [1760, 980], [480, 1300], [2400, 700], [1440, 1600], [2080, 1900], [640, 1900]];
  spots.forEach(([x, y], i) => {
    const c = makeCar(x, y, (i % 2 ? Math.PI / 2 : 0), 'parked', i);
    c.targetSpeed = 0;
    S.cars.push(c);
  });
}

function nearestCar(maxD) {
  const p = S.player;
  let best = null, bestD = maxD;
  for (const c of S.cars) {
    if (c.kind === 'police') continue;
    const d = Math.hypot(c.x - p.x, c.y - p.y);
    if (d < bestD) { bestD = d; best = c; }
  }
  return best;
}

function nearestShop() {
  const p = S.player;
  if (p.onFoot) {
    for (const [key, pl] of Object.entries(PLACES)) {
      if (['garage', 'gun', 'diner'].includes(pl.kind) && Math.hypot(pl.x - p.x, pl.y - p.y) < 90) return pl;
    }
  }
  return null;
}

function useShop(pl) {
  const p = S.player;
  if (pl.kind === 'garage') {
    if (!p.car) { S.flash = 'BRING A CAR TO THE GARAGE'; S.flashT = 2; return; }
    if (S.money >= 200) {
      S.money -= 200;
      p.car.hp = 100;
      p.car.color = CAR_COLORS[Math.floor(rnd() * CAR_COLORS.length)];
      p.armor = 100;
      S.flash = 'GARAGE: REPAIRED + REPAINTED + ARMOR — $200';
      S.audio.sfx('cash');
    } else { S.flash = 'NOT ENOUGH CASH — NEED $200'; }
    S.flashT = 2.5;
  } else if (pl.kind === 'diner') {
    if (S.money >= 50) {
      S.money -= 50;
      p.health = 100;
      S.flash = 'PALM DINER: FULL MEAL, HEALTH RESTORED — $50';
      S.audio.sfx('cash');
    } else { S.flash = 'NOT ENOUGH CASH — NEED $50'; }
    S.flashT = 2.5;
  } else if (pl.kind === 'gun') {
    if (!p.hasPistol && S.money >= 1000) {
      S.money -= 1000;
      p.hasPistol = true;
      p.ammo = 60;
      S.flash = 'IRONWORKS: PISTOL BOUGHT — 60 ROUNDS — $1,000';
      S.audio.sfx('cash');
    } else if (p.hasPistol && S.money >= 200) {
      S.money -= 200;
      p.ammo += 60;
      S.flash = 'IRONWORKS: +60 ROUNDS — $200';
      S.audio.sfx('cash');
    } else if (p.hasPistol) { S.flash = 'NOT ENOUGH CASH — AMMO $200'; }
    else { S.flash = 'PISTOL COSTS $1,000'; }
    S.flashT = 2.5;
  }
}

function enterExitCar() {
  const p = S.player;
  if (p.onFoot) {
    const c = nearestCar(52);
    if (c) {
      const stolen = c.kind === 'traffic' || c.kind === 'parked';
      p.onFoot = false;
      p.car = c;
      c.kind = 'player';
      if (stolen) addWanted(S, 1, 'GRAND THEFT AUTO');
      S.audio.sfx('pickup');
    }
  } else if (p.car) {
    const c = p.car;
    const side = p.angle + Math.PI / 2;
    p.x = c.x + Math.cos(side) * 34;
    p.y = c.y + Math.sin(side) * 34;
    p.onFoot = true;
    p.car = null;
    c.kind = 'player-owned';
    c.speed = 0;
  }
}

function punch() {
  const p = S.player;
  if (!p.onFoot || p.punchT > 0) return;
  p.punchT = 0.28;
  S.audio.sfx('punch');
  const fx = p.x + Math.cos(p.angle) * 26, fy = p.y + Math.sin(p.angle) * 26;
  for (let i = S.peds.length - 1; i >= 0; i--) {
    if (Math.hypot(S.peds[i].x - fx, S.peds[i].y - fy) < 26) {
      S.peds.splice(i, 1);
      addWanted(S, 1, 'ASSAULT');
      break;
    }
  }
  for (let i = S.cops.length - 1; i >= 0; i--) {
    if (Math.hypot(S.cops[i].x - fx, S.cops[i].y - fy) < 34) {
      S.cops[i].x += Math.cos(p.angle) * 60;
      S.cops[i].y += Math.sin(p.angle) * 60;
      addWanted(S, 1, 'ASSAULTING AN OFFICER');
      break;
    }
  }
}

function shoot() {
  const p = S.player;
  if (!p.onFoot || !p.hasPistol || p.ammo <= 0 || p.shootT > 0) return;
  p.ammo--;
  p.shootT = 0.22;
  S.audio.sfx('shoot');
  const rect = canvas.getBoundingClientRect();
  const mx = (S.mouse.x / rect.width) * 1280;
  const my = (S.mouse.y / rect.height) * 800;
  const wx = mx + S.camera.x, wy = my + S.camera.y;
  const ang = Math.atan2(wy - p.y, wx - p.x);
  p.angle = ang;
  const range = 420;
  const ex = p.x + Math.cos(ang) * range, ey = p.y + Math.sin(ang) * range;
  S.tracers.push({ x1: p.x, y1: p.y, x2: ex, y2: ey, t: 0.12 });
  let hit = false;
  for (let i = S.peds.length - 1; i >= 0; i--) {
    const pd = S.peds[i];
    const d = Math.hypot(pd.x - p.x, pd.y - p.y);
    if (d < range) {
      const a = Math.atan2(pd.y - p.y, pd.x - p.x);
      let diff = Math.abs(a - ang);
      if (diff > Math.PI) diff = Math.PI * 2 - diff;
      if (diff < 0.14) { S.peds.splice(i, 1); hit = true; break; }
    }
  }
  if (!hit) {
    for (let i = S.cops.length - 1; i >= 0; i--) {
      const c = S.cops[i];
      const d = Math.hypot(c.x - p.x, c.y - p.y);
      if (d < range) {
        const a = Math.atan2(c.y - p.y, c.x - p.x);
        let diff = Math.abs(a - ang);
        if (diff > Math.PI) diff = Math.PI * 2 - diff;
        if (diff < 0.14) { S.cops.splice(i, 1); hit = true; break; }
      }
    }
  }
  if (hit) addWanted(S, 1, 'SHOOTING');
}

function damagePlayer(n) {
  const p = S.player;
  if (p.armor > 0) {
    const absorbed = Math.min(p.armor, n);
    p.armor -= absorbed;
    n -= absorbed;
  }
  p.health -= n;
  if (p.health <= 0) {
    p.health = 0;
    S.wasted = true;
    S.wanted = 0;
    S.wantedHeat = 0;
    S.money = Math.max(0, S.money - 500);
    if (S.mission && S.mission.active) S.mission.active = false;
  }
}

function respawn() {
  const p = S.player;
  if (S.busted) {
    S.busted = false;
    p.x = PLACES.policeHQ.x; p.y = PLACES.policeHQ.y + 120;
  } else if (S.wasted) {
    S.wasted = false;
    p.x = PLACES.hospital.x; p.y = PLACES.hospital.y + 120;
    p.health = 100;
  }
  p.onFoot = true;
  p.car = null;
  p.bustT = 0;
  S.flash = 'BACK ON THE STREETS';
  S.flashT = 2;
}

/** Staged scenes for the screenshots: real gameplay states, set up instantly. */
function applyScene(name) {
  S.scene = name;
  const p = S.player;
  S.state = 'playing';
  const giveCar = (x, y, colorIdx) => {
    const c = makeCar(x, y, -Math.PI / 2, 'player', colorIdx);
    c.hp = 100;
    S.cars.push(c);
    p.onFoot = false;
    p.car = c;
    p.x = x; p.y = y;
    return c;
  };
  if (name === 'chase') {
    S.clock = 17.6;
    giveCar(1440, 1120, 0);
    startMission(S, 10);
    S.mission.step = 1;
    S.mission.package = true;
    S.wanted = 5; S.wantedHeat = 100;
    // cops already closing in, in frame, plus a roadblock ahead of the player
    const copAt = (x, y, angle) => {
      const c = makeCar(x, y, angle, 'police', 4);
      c.color = '#10203a'; c.targetSpeed = 300; c.siren = 1;
      S.cops.push(c);
    };
    copAt(1440, 760, Math.PI / 2);
    copAt(1080, 1120, 0);
    copAt(1800, 1120, Math.PI);
    copAt(1440, 1500, -Math.PI / 2);
    copAt(1150, 820, Math.PI / 4);
    copAt(1730, 1420, -Math.PI * 0.75);
    S.roadblocks.push({
      x: 1440, y: 800, angle: 0, t: 14,
      cars: [
        { x: 1406, y: 800, angle: 0 },
        { x: 1474, y: 800, angle: 0 },
      ],
    });
  } else if (name === 'night') {
    S.clock = 22.2;
    giveCar(2620, 760, 5);
    startMission(S, 4);
    S.wanted = 3; S.wantedHeat = 90;
    const copAt = (x, y, angle) => {
      const c = makeCar(x, y, angle, 'police', 4);
      c.color = '#10203a'; c.targetSpeed = 300; c.siren = 1;
      S.cops.push(c);
    };
    copAt(2400, 760, 0);
    copAt(2620, 1080, -Math.PI / 2);
    copAt(2860, 480, Math.PI);
    S.money = 8450;
  } else if (name === 'race') {
    S.clock = 10.4;
    giveCar(170, 300, 2);
    S.wanted = 0;
    startMission(S, 2);
    S.money = 3200;
  } else if (name === 'street') {
    S.clock = 14.1;
    p.x = 800; p.y = 1120;
    p.onFoot = true;
    S.wanted = 1; S.wantedHeat = 40;
    S.cops.push(spawnCop(S, rnd));
    startMission(S, 1);
    S.money = 1250;
    const taxi = makeCar(830, 1120, Math.PI / 2, 'traffic', 2);
    taxi.taxi = true;
    S.cars.push(taxi);
  }
  maintainPopulation();
  parkCars();
  // snap the camera and helicopter onto the player instantly (no slow lerp
  // into the frame — screenshots must be composed from the first frame)
  S.camera.x = Math.max(0, Math.min(WORLD_W - 1280, S.player.x - 640));
  S.camera.y = Math.max(0, Math.min(WORLD_H - 800, S.player.y - 400));
  if (S.heli) { S.heli.x = S.player.x; S.heli.y = S.player.y - 40; }
}

function update(dt) {
  const p = S.player;
  S.clock += dt / 40;
  const day = daylight(S.clock);
  S.dayNight = S.clock % 24 < 5 || S.clock % 24 > 20 ? 'NIGHT' : S.clock % 24 < 7 ? 'DAWN' : S.clock % 24 > 17 ? 'DUSK' : 'DAY';
  if (S.flashT > 0) S.flashT -= dt;
  if (S.missionBriefT > 0) S.missionBriefT -= dt;
  if (S.missionDoneT > 0) S.missionDoneT -= dt;
  if (p.punchT > 0) p.punchT -= dt;
  if (p.shootT > 0) p.shootT -= dt;
  if (S.shake > 0) S.shake = Math.max(0, S.shake - dt * 30);

  // --- player ---
  if (!S.busted && !S.wasted) {
    if (p.onFoot) {
      walkPlayer(p, S.keys, dt, S.city);
    } else if (p.car) {
      const c = p.car;
      const prevX = c.x, prevY = c.y;
      drivePlayerCar(c, S.keys, dt);
      const res = collideBuildings(S.city, c.x, c.y, 17);
      if (res.hit) {
        c.x = res.x; c.y = res.y;
        if (Math.abs(c.speed) > 200) {
          c.hp = (c.hp ?? 100) - 6;
          S.shake = Math.min(10, S.shake + 4);
          S.audio.sfx('crash');
          if (c.hp <= 0) { c.speed = Math.min(c.speed, 60); S.flash = 'CAR WRECKED — VISIT THE GARAGE'; S.flashT = 2.5; }
        }
        c.speed *= 0.55;
      }
      p.x = c.x; p.y = c.y; p.angle = c.angle;
      // run over pedestrians
      for (let i = S.peds.length - 1; i >= 0; i--) {
        const pd = S.peds[i];
        if (Math.hypot(pd.x - c.x, pd.y - c.y) < 26 && Math.abs(c.speed) > 70) {
          S.peds.splice(i, 1);
          addWanted(S, 1, 'HIT AND RUN');
          S.shake = Math.min(10, S.shake + 5);
          S.audio.sfx('thud');
        }
      }
      // car vs traffic collisions
      for (const o of S.cars) {
        if (o === c || o.kind === 'player' || o.kind === 'player-owned') continue;
        const d = Math.hypot(o.x - c.x, o.y - c.y);
        if (d < 40 && d > 0.01) {
          const push = (40 - d) / 2;
          const nx = (o.x - c.x) / d, ny = (o.y - c.y) / d;
          o.x += nx * push; o.y += ny * push;
          c.x -= nx * push; c.y -= ny * push;
          const rel = Math.abs(c.speed - o.speed);
          if (rel > 120) {
            c.hp = (c.hp ?? 100) - 4;
            S.shake = Math.min(10, S.shake + 3);
            S.audio.sfx('crash');
            o.speed *= 0.5;
          }
          c.speed *= 0.94;
        }
      }
      void prevX; void prevY;
    }
  }

  // --- traffic + peds ---
  maintainPopulation();
  for (const c of S.cars) {
    if (c.kind === 'traffic') updateTrafficCar(c, dt, rnd, S.cars, S.city);
  }
  const danger = !p.onFoot && p.car && Math.abs(p.car.speed) > 60 ? p.car : null;
  for (const pd of S.peds) updatePed(pd, dt, rnd, danger);

  // --- police ---
  S.copT -= dt;
  const want = wantedCopCount(S.wanted);
  if (S.cops.length < want && S.copT <= 0) {
    S.copT = wantedSpawnInterval(S.wanted);
    S.cops.push(spawnCop(S, rnd));
  }
  S.cops = S.cops.filter((c) => Math.hypot(c.x - p.x, c.y - p.y) < 1600);
  for (const c of S.cops) updateCop(c, S, dt);
  updateHeli(S, dt);
  updateRoadblocks(S, dt);
  updateWanted(S, dt);

  // --- missions ---
  updateMission(S, dt);

  // --- camera ---
  const tx = Math.max(0, Math.min(WORLD_W - 1280, p.x - 640));
  const ty = Math.max(0, Math.min(WORLD_H - 800, p.y - 400));
  S.camera.x += (tx - S.camera.x) * Math.min(1, dt * 6);
  S.camera.y += (ty - S.camera.y) * Math.min(1, dt * 6);

  // --- audio ---
  S.audio.updateMusic();
  S.audio.updateAmbience(S.wanted, p.car ? p.car.speed : 0, p.onFoot);

  for (const t of S.tracers) t.t -= dt;
  S.tracers = S.tracers.filter((t) => t.t > 0);
}

function draw() {
  const p = S.player;
  ctx.save();
  if (S.shake > 0) ctx.translate((rnd() - 0.5) * S.shake, (rnd() - 0.5) * S.shake);
  drawCity(ctx, S.city, S.camera, S.clock);
  // place labels
  ctx.textAlign = 'center';
  for (const pl of Object.values(PLACES)) {
    if (pl.kind === 'start') continue;
    const x = pl.x - S.camera.x, y = pl.y - S.camera.y;
    if (x < -120 || y < -40 || x > 1400 || y > 840) continue;
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.font = 'bold 11px Arial';
    const w = ctx.measureText(pl.name).width + 12;
    ctx.fillRect(x - w / 2, y - 34, w, 16);
    ctx.fillStyle = '#e8f0ff';
    ctx.fillText(pl.name, x, y - 22);
  }
  drawMissionMarkers(ctx, S, S.camera);
  // roadblocks under cars
  drawRoadblocks(ctx, S, S.camera);
  for (const c of S.cars) drawCar(ctx, c, S.camera, c === p.car);
  for (const c of S.cops) drawCar(ctx, c, S.camera, false);
  for (const pd of S.peds) drawPed(ctx, pd, S.camera);
  if (p.onFoot) drawPlayer(ctx, p, S.camera);
  drawHeli(ctx, S, S.camera);
  // tracers
  for (const t of S.tracers) {
    ctx.strokeStyle = `rgba(255,230,120,${Math.max(0, t.t / 0.12)})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(t.x1 - S.camera.x, t.y1 - S.camera.y);
    ctx.lineTo(t.x2 - S.camera.x, t.y2 - S.camera.y);
    ctx.stroke();
  }
  ctx.restore();
  // shop prompt
  const shop = nearestShop();
  if (shop && S.state === 'playing') {
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(0,0,0,0.65)';
    const label = `E — ${shop.name} (${shop.kind === 'garage' ? 'repair $200' : shop.kind === 'diner' ? 'eat $50' : 'pistol $1,000 / ammo $200'})`;
    const w = ctx.measureText(label).width + 24;
    ctx.fillRect(640 - w / 2, 700, w, 24);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 13px Arial';
    ctx.fillText(label, 640, 717);
  }
  drawHUD(ctx, S);
  if (S.state === 'menu') drawMenu(ctx, S, 'start');
  if (S.state === 'paused') drawMenu(ctx, S, 'pause');
}

let last = performance.now();
function loop(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  if (S.state === 'playing' && !S.busted && !S.wasted) update(dt);
  else if (S.state === 'playing') { /* frozen while busted/wasted */ }
  draw();
  requestAnimationFrame(loop);
}

function startGame(fresh) {
  if (fresh) {
    S.money = 250; S.missionsDone = 0; S.wanted = 0; S.wantedHeat = 0;
    S.player = makePlayer(PLACES.start.x, PLACES.start.y);
    S.mission = null;
    S.cops = [];
  }
  S.state = 'playing';
  S.audio.ensure();
}

window.addEventListener('keydown', (e) => {
  const k = e.key.toLowerCase();
  S.keys[k] = true;
  if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(k)) e.preventDefault();
  S.audio.ensure();
  if (S.state === 'menu') {
    if (k === 'enter') startGame(true);
    else if (k === 'l' && S.hasSave) { loadSave(); startGame(false); }
    return;
  }
  if (S.busted || S.wasted) {
    if (k === 'enter') respawn();
    return;
  }
  if (k === 'p') {
    S.state = S.state === 'paused' ? 'playing' : 'paused';
    return;
  }
  if (S.state === 'paused') {
    if (k === 'enter') S.state = 'playing';
    if (k === 'escape') S.state = 'menu';
    if (k === 's') { S.saveGame(); S.flash = 'GAME SAVED'; S.flashT = 2; }
    return;
  }
  if (k === 'e') {
    const shop = nearestShop();
    if (shop) useShop(shop);
    else enterExitCar();
  }
  if (k === 'f') punch();
  if (k === 'q') { S.audio.nextStation(); S.flash = `RADIO: ${S.audio.stationName()}`; S.flashT = 1.5; }
  if (k === 'm') S.audio.toggleMute();
  if (k === 's') { S.saveGame(); S.flash = 'GAME SAVED'; S.flashT = 2; }
  if (k === 'enter') {
    if (!S.mission || !S.mission.active) {
      if (S.missionsDone < 12) startMission(S, S.missionsDone);
    }
  }
});

window.addEventListener('keyup', (e) => { S.keys[e.key.toLowerCase()] = false; });
canvas.addEventListener('mousemove', (e) => {
  const r = canvas.getBoundingClientRect();
  S.mouse.x = e.clientX - r.left;
  S.mouse.y = e.clientY - r.top;
});
canvas.addEventListener('mousedown', (e) => {
  S.audio.ensure();
  const r = canvas.getBoundingClientRect();
  S.mouse.x = e.clientX - r.left;
  S.mouse.y = e.clientY - r.top;
  if (S.state === 'menu') { startGame(true); return; }
  if (S.state === 'playing') shoot();
});
canvas.addEventListener('contextmenu', (e) => e.preventDefault());

// boot
parkCars();
maintainPopulation();
const scene = params.get('scene');
if (scene) applyScene(scene);
requestAnimationFrame(loop);
