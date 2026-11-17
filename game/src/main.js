// Solara City — boot and the main loop.
//
// Builds the world, spawns the city, and runs the frame loop. States:
// menu -> playing -> paused / busted / complete. In shot mode (?shot=...)
// the game skips the menu and stages a scene for screenshots.

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
SC.input.attach(canvas);

const params = new URLSearchParams(window.location.search);
const shotName = params.get('shot');
const seed = Number(params.get('seed') || 7);

SC.buildWorld(seed);
const rng = SC.mulberry32(seed + 101);

const G = {
  ctx,
  time: 0,
  frame: 0,
  state: 'menu',
  seed,
  shotMode: shotName,
  shotCruise: false, // screenshot scenes keep the car rolling on their own
  player: SC.makePlayer(480, 420),
  cars: [],
  peds: [],
  bullets: [],
  particles: [],
  pickups: [],
  wanted: 0,
  crimeTimer: 0,
  coolTimer: 0,
  policeSpawnTimer: 0,
  bustTimer: 0,
  cash: 0,
  ammo: 24,
  shootCooldown: 0,
  missionIndex: 0,
  mission: null,
  missionStage: 0,
  missionBags: 0,
  camera: { x: 480, y: 420 },
  banner: null,
  messages: [],
  bustedReason: '',
  savedGame: SC.loadSave(),
  pickupRespawn: 30,
};
window.__game = G;

SC.spawnParkedCars(G, rng);
SC.spawnTraffic(G, rng, 11);
SC.spawnPeds(G, rng, 26);
// A few ammo and health caches around the city.
for (const [x, y, kind] of [
  [920, 1160, 'ammo'],
  [1920, 360, 'ammo'],
  [420, 1560, 'ammo'],
  [1420, 1960, 'health'],
  [2420, 760, 'health'],
]) {
  G.pickups.push({ x, y, kind, value: 0, taken: false });
}

function startNewGame(fromSave) {
  if (fromSave && G.savedGame) {
    G.cash = G.savedGame.cash;
    G.missionIndex = Math.min(G.savedGame.missionIndex, SC.MISSIONS.length - 1);
  } else {
    G.cash = 0;
    G.missionIndex = 0;
    SC.clearSave();
  }
  G.wanted = 0;
  G.crimeTimer = 0;
  G.bustTimer = 0;
  G.player = SC.makePlayer(480, 420);
  G.player.x = 480;
  G.player.y = 420;
  G.bullets = [];
  G.particles = [];
  G.messages = [];
  G.banner = null;
  for (const car of G.cars) {
    if (car.driver === 'police') car.gone = true;
    if (car.driver === 'player') car.driver = 'none';
  }
  G.cars = G.cars.filter((c) => !c.gone);
  G.state = 'playing';
  SC.audio.ensure();
  SC.startMission(G, G.missionIndex);
}

function restartMission() {
  const p = G.player;
  p.health = 100;
  p.inCar = null;
  p.x = 480;
  p.y = 420;
  G.wanted = 0;
  G.crimeTimer = 0;
  G.bustTimer = 0;
  G.bullets = [];
  G.messages = [];
  for (const car of G.cars) {
    if (car.driver === 'police') car.gone = true;
  }
  G.cars = G.cars.filter((c) => !c.gone);
  G.camera.x = 480;
  G.camera.y = 420;
  G.state = 'playing';
  SC.startMission(G, G.missionIndex);
}

function update(dt) {
  if (G.state === 'menu') {
    if (SC.input.wasPressed('Enter') || SC.input.mouse.clicked) startNewGame(false);
    else if (SC.input.wasPressed('KeyC') && G.savedGame) startNewGame(true);
    return;
  }
  if (G.state === 'paused') {
    if (SC.input.wasPressed('KeyP') || SC.input.wasPressed('Escape')) G.state = 'playing';
    return;
  }
  if (G.state === 'busted') {
    if (SC.input.wasPressed('Enter')) restartMission();
    return;
  }
  if (G.state === 'complete') {
    if (SC.input.wasPressed('Enter')) {
      SC.clearSave();
      window.location.href = window.location.pathname;
    }
    return;
  }

  // Playing.
  if (SC.input.wasPressed('KeyP') || SC.input.wasPressed('Escape')) {
    G.state = 'paused';
    return;
  }
  if (SC.input.wasPressed('KeyM')) SC.audio.toggleMute();
  if (SC.input.wasPressed('KeyE')) {
    if (G.player.inCar) SC.exitCar(G);
    else SC.tryEnterCar(G);
  }
  if (G.player.inCar) {
    if (G.player.inCar.wrecked) SC.exitCar(G);
    else SC.updatePlayerCar(G, dt);
  } else {
    SC.updatePlayer(G, dt);
  }
  SC.updateTraffic(G, dt);
  SC.updatePeds(G, dt);
  SC.updateWanted(G, dt);
  SC.updatePolice(G, dt);
  SC.updateMissions(G, dt);
  SC.updatePickups(G, dt);
  SC.updateCombat(G, dt);
  SC.updateCamera(G, dt);

  // A fresh ammo cache turns up somewhere in the city now and then.
  G.pickupRespawn -= dt;
  if (G.pickupRespawn <= 0) {
    G.pickupRespawn = 45;
    const rx = SC.pick(Math.random, SC.ROADS_V);
    const ry = SC.pick(Math.random, SC.ROADS_H);
    G.pickups.push({ x: rx + 70, y: ry + 70, kind: Math.random() < 0.6 ? 'ammo' : 'health', value: 0, taken: false });
  }
  if (G.frame % 30 === 0) SC.saveGame(G);
}

let last = performance.now();
function loop(now) {
  try {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    G.time += dt;
    G.frame++;
    update(dt);
    SC.render(G);
    SC.input.endFrame();
    if (G.shotMode && G.frame >= 110 && !window.__shotReady) {
      window.__shotReady = true;
    }
  } catch (err) {
    window.__shotError = String(err && err.stack ? err.stack : err);
  }
  requestAnimationFrame(loop);
}

if (shotName) {
  SC.setupShot(G, shotName);
} else {
  G.camera.x = SC.clamp(G.player.x, 640, SC.WORLD.w - 640);
  G.camera.y = SC.clamp(G.player.y, 360, SC.WORLD.h - 360);
}
requestAnimationFrame(loop);
