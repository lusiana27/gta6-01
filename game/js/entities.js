// entities.js — the player on foot and in cars, traffic cars and pedestrians.
// All movement is top-down arcade physics: accelerate, steer, brake, collide.

import { WORLD_W, WORLD_H, ROADS_X, ROADS_Y, ROAD_W, isRoad, collideBuildings, mulberry32 } from './city.js';

export const CAR_COLORS = ['#d84040', '#4070d8', '#e8c840', '#40a050', '#e8e8e8', '#c060c0', '#e88030', '#30c0c0', '#909090', '#28304a'];
export const CAR_NAMES = ['Vulcar Comet', 'Bravado Banshee', 'Pfister Comet', 'Grotti Turismo', 'Declasse Vigero', 'Ocelot F620', 'Annis Elegy', 'Dinka Jester', 'Vapid Dominator', 'Karin Sultan'];

export function makePlayer(x, y) {
  return {
    x, y, angle: -Math.PI / 2, speed: 0,
    onFoot: true, car: null, health: 100, armor: 0,
    run: false, punchT: 0, shootT: 0, ammo: 0, hasPistol: false,
    bustT: 0, deadT: 0,
  };
}

export function makeCar(x, y, angle, kind, colorIdx) {
  return {
    x, y, angle, speed: 0, kind: kind || 'traffic',
    color: CAR_COLORS[colorIdx % CAR_COLORS.length],
    name: CAR_NAMES[colorIdx % CAR_NAMES.length],
    targetSpeed: 0, turn: 0, stuckT: 0, siren: 0,
    roadAxis: 'x', roadAt: x, dir: 1, lane: 0, taxi: false, fare: 0,
  };
}

/** Spawn a traffic car on a random road. */
export function spawnTrafficCar(rnd, avoid) {
  for (let tries = 0; tries < 20; tries++) {
    const vertical = rnd() < 0.5;
    const road = vertical ? ROADS_X[Math.floor(rnd() * ROADS_X.length)] : ROADS_Y[Math.floor(rnd() * ROADS_Y.length)];
    const along = 120 + rnd() * (vertical ? WORLD_H - 240 : WORLD_W - 240);
    const lane = (rnd() < 0.5 ? -1 : 1) * 22;
    const x = vertical ? road + lane : along;
    const y = vertical ? along : road + lane;
    if (avoid && Math.hypot(x - avoid.x, y - avoid.y) < 420) continue;
    const dir = rnd() < 0.5 ? 1 : -1;
    const angle = vertical ? (dir > 0 ? Math.PI / 2 : -Math.PI / 2) : (dir > 0 ? 0 : Math.PI);
    const c = makeCar(x, y, angle, 'traffic', Math.floor(rnd() * CAR_COLORS.length));
    c.roadAxis = vertical ? 'x' : 'y';
    c.roadAt = road;
    c.dir = dir;
    c.lane = lane;
    c.targetSpeed = 90 + rnd() * 70;
    return c;
  }
  return null;
}

export function makePed(x, y, rnd) {
  const shirts = ['#e04040', '#4080e0', '#e0c040', '#40a060', '#c060c0', '#e08030', '#f0f0f0', '#303030'];
  return {
    x, y, angle: rnd() * Math.PI * 2, speed: 22 + rnd() * 18,
    shirt: shirts[Math.floor(rnd() * shirts.length)],
    skin: ['#e8b890', '#c89068', '#8a5a38', '#f0c8a0'][Math.floor(rnd() * 4)],
    walkT: rnd() * 10, turnT: 0, panic: 0, dead: false,
  };
}

export function spawnPed(rnd, avoid) {
  for (let tries = 0; tries < 20; tries++) {
    const vertical = rnd() < 0.5;
    const road = vertical ? ROADS_X[Math.floor(rnd() * ROADS_X.length)] : ROADS_Y[Math.floor(rnd() * ROADS_Y.length)];
    const along = 120 + rnd() * (vertical ? WORLD_H - 240 : WORLD_W - 240);
    const off = (rnd() < 0.5 ? -1 : 1) * (ROAD_W / 2 + 14 + rnd() * 30);
    const x = vertical ? road + off : along;
    const y = vertical ? along : road + off;
    if (avoid && Math.hypot(x - avoid.x, y - avoid.y) < 320) continue;
    if (x < 60 || x > WORLD_W - 20 || y < 20 || y > WORLD_H - 20) continue;
    return makePed(x, y, rnd);
  }
  return null;
}

/** Car physics for the player car: arcade acceleration + steering. */
export function drivePlayerCar(car, keys, dt) {
  const up = keys['w'] || keys['arrowup'];
  const down = keys['s'] || keys['arrowdown'];
  const left = keys['a'] || keys['arrowleft'];
  const right = keys['d'] || keys['arrowright'];
  const brake = keys[' '];
  const maxSpeed = 460;
  const accel = up ? 340 : down ? -260 : 0;
  car.speed += accel * dt;
  if (!up && !down) car.speed *= Math.pow(0.35, dt);
  if (brake) car.speed *= Math.pow(0.02, dt);
  car.speed = Math.max(-160, Math.min(maxSpeed, car.speed));
  const steer = (left ? -1 : 0) + (right ? 1 : 0);
  const grip = Math.min(1, Math.abs(car.speed) / 120);
  car.angle += steer * 2.6 * grip * dt * (car.speed >= 0 ? 1 : -1);
  const nx = car.x + Math.cos(car.angle) * car.speed * dt;
  const ny = car.y + Math.sin(car.angle) * car.speed * dt;
  car.x = nx; car.y = ny;
  car.x = Math.max(20, Math.min(WORLD_W - 20, car.x));
  car.y = Math.max(20, Math.min(WORLD_H - 20, car.y));
  return car.speed;
}

/** Move the player on foot. */
export function walkPlayer(p, keys, dt, city) {
  const run = keys['shift'];
  const sp = run ? 210 : 125;
  let dx = 0, dy = 0;
  if (keys['w'] || keys['arrowup']) dy -= 1;
  if (keys['s'] || keys['arrowdown']) dy += 1;
  if (keys['a'] || keys['arrowleft']) dx -= 1;
  if (keys['d'] || keys['arrowright']) dx += 1;
  if (dx || dy) {
    const len = Math.hypot(dx, dy);
    p.angle = Math.atan2(dy / len, dx / len);
    const nx = p.x + (dx / len) * sp * dt;
    const ny = p.y + (dy / len) * sp * dt;
    const res = collideBuildings(city, nx, ny, 12);
    p.x = Math.max(16, Math.min(WORLD_W - 16, res.x));
    p.y = Math.max(16, Math.min(WORLD_H - 16, res.y));
    p.speed = sp;
  } else {
    p.speed = 0;
  }
  p.run = run;
}

/** Traffic AI: follow the road, turn at intersections, avoid piling up. */
export function updateTrafficCar(c, dt, rnd, others, city) {
  c.speed += (c.targetSpeed - c.speed) * Math.min(1, dt * 0.8);
  // slow down for a car ahead
  for (const o of others) {
    if (o === c) continue;
    const dx = o.x - c.x, dy = o.y - c.y;
    const d = Math.hypot(dx, dy);
    if (d < 70) {
      const ahead = dx * Math.cos(c.angle) + dy * Math.sin(c.angle);
      if (ahead > 0) c.speed = Math.min(c.speed, Math.max(0, c.targetSpeed * 0.25));
    }
  }
  const atIntersection =
    ROADS_X.some((rx) => Math.abs(c.x - rx) < 50) && ROADS_Y.some((ry) => Math.abs(c.y - ry) < 50);
  if (atIntersection && rnd() < dt * 0.5) {
    // turn onto the crossing road
    if (c.roadAxis === 'x') {
      const ry = ROADS_Y.reduce((a, b) => (Math.abs(b - c.y) < Math.abs(a - c.y) ? b : a));
      c.roadAxis = 'y'; c.roadAt = ry; c.lane = (rnd() < 0.5 ? -1 : 1) * 22;
      c.dir = rnd() < 0.5 ? 1 : -1;
      c.angle = c.dir > 0 ? 0 : Math.PI;
    } else {
      const rx = ROADS_X.reduce((a, b) => (Math.abs(b - c.x) < Math.abs(a - c.x) ? b : a));
      c.roadAxis = 'x'; c.roadAt = rx; c.lane = (rnd() < 0.5 ? -1 : 1) * 22;
      c.dir = rnd() < 0.5 ? 1 : -1;
      c.angle = c.dir > 0 ? Math.PI / 2 : -Math.PI / 2;
    }
  }
  // steer back to lane centre
  const target = c.roadAxis === 'x' ? c.roadAt + c.lane : c.roadAt + c.lane;
  const off = c.roadAxis === 'x' ? c.x - target : c.y - target;
  const desired = c.roadAxis === 'x'
    ? (c.dir > 0 ? Math.PI / 2 : -Math.PI / 2)
    : (c.dir > 0 ? 0 : Math.PI);
  let diff = desired - c.angle;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  c.angle += diff * Math.min(1, dt * 3) + Math.max(-0.6, Math.min(0.6, -off * 0.004));
  c.x += Math.cos(c.angle) * c.speed * dt;
  c.y += Math.sin(c.angle) * c.speed * dt;
  const res = collideBuildings(city, c.x, c.y, 16);
  if (res.hit) { c.speed *= 0.4; c.x = res.x; c.y = res.y; }
  if (c.x < 40 || c.x > WORLD_W - 40 || c.y < 40 || c.y > WORLD_H - 40) {
    c.speed = 0;
    c.angle += Math.PI;
    c.x = Math.max(40, Math.min(WORLD_W - 40, c.x));
    c.y = Math.max(40, Math.min(WORLD_H - 40, c.y));
  }
}

/** Pedestrian AI: stroll the sidewalks, panic and run from danger. */
export function updatePed(p, dt, rnd, danger) {
  p.walkT += dt;
  if (danger && Math.hypot(p.x - danger.x, p.y - danger.y) < 220) p.panic = 2.5;
  if (p.panic > 0) {
    p.panic -= dt;
    const away = Math.atan2(p.y - danger.y, p.x - danger.x);
    p.angle = away;
    p.x += Math.cos(away) * 150 * dt;
    p.y += Math.sin(away) * 150 * dt;
    return;
  }
  p.turnT -= dt;
  if (p.turnT <= 0) {
    p.turnT = 1.5 + rnd() * 3;
    const r = rnd();
    if (r < 0.6) p.angle += (rnd() - 0.5) * 0.9;
    else p.angle = Math.floor(rnd() * 4) * Math.PI / 2;
  }
  let nx = p.x + Math.cos(p.angle) * p.speed * dt;
  let ny = p.y + Math.sin(p.angle) * p.speed * dt;
  if (!isRoad(nx, ny) && Math.abs(nx - p.x) > 0) {
    // stay near roads: bounce off blocks
    p.angle += Math.PI / 2;
    nx = p.x; ny = p.y;
  }
  p.x = Math.max(14, Math.min(WORLD_W - 14, nx));
  p.y = Math.max(14, Math.min(WORLD_H - 14, ny));
}

export function drawCar(ctx, c, cam, isPlayer) {
  const x = c.x - cam.x, y = c.y - cam.y;
  if (x < -60 || y < -60 || x > 1340 || y > 860) return;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(c.angle);
  ctx.fillStyle = 'rgba(0,0,0,0.4)';
  ctx.fillRect(-20, -11, 44, 26);
  ctx.fillStyle = c.color;
  ctx.beginPath();
  ctx.roundRect(-20, -11, 44, 22, 6);
  ctx.fill();
  ctx.fillStyle = '#1a2230';
  ctx.fillRect(-4, -9, 14, 18);
  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  ctx.fillRect(14, -9, 3, 4);
  ctx.fillRect(14, 5, 3, 4);
  ctx.fillStyle = '#ffe9a0';
  ctx.fillRect(19, -8, 2, 4);
  ctx.fillRect(19, 4, 2, 4);
  ctx.fillStyle = '#ff4030';
  ctx.fillRect(-21, -8, 2, 4);
  ctx.fillRect(-21, 4, 2, 4);
  if (c.kind === 'police') {
    ctx.fillStyle = '#f0f0f0';
    ctx.fillRect(-8, -11, 16, 22);
    ctx.fillStyle = '#202020';
    ctx.font = 'bold 7px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('PD', 0, 3);
    const t = performance.now() / 180;
    ctx.fillStyle = Math.floor(t) % 2 ? '#ff2020' : '#2040ff';
    ctx.fillRect(-16, -13, 8, 4);
    ctx.fillStyle = Math.floor(t) % 2 ? '#2040ff' : '#ff2020';
    ctx.fillRect(8, -13, 8, 4);
  }
  if (c.taxi) {
    ctx.fillStyle = '#e8c840';
    ctx.fillRect(-20, -11, 44, 22);
    ctx.fillStyle = '#202020';
    ctx.fillRect(-6, -13, 12, 5);
    ctx.fillStyle = '#e8c840';
    ctx.font = 'bold 6px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('TAXI', 0, -9);
  }
  if (isPlayer) {
    ctx.strokeStyle = 'rgba(255,255,255,0.9)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, 30, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
}

export function drawPed(ctx, p, cam) {
  const x = p.x - cam.x, y = p.y - cam.y;
  if (x < -20 || y < -20 || x > 1300 || y > 820) return;
  const bob = Math.sin(p.walkT * 10) * 2;
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.beginPath(); ctx.ellipse(x, y + 6, 6, 3, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = p.skin;
  ctx.beginPath(); ctx.arc(x, y - 8 + bob * 0.3, 5, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = p.shirt;
  ctx.fillRect(x - 5, y - 4 + bob * 0.3, 10, 10);
  ctx.fillStyle = '#2a2a3a';
  ctx.fillRect(x - 5, y + 6, 4, 6);
  ctx.fillRect(x + 1, y + 6, 4, 6);
}

export function drawPlayer(ctx, p, cam) {
  const x = p.x - cam.x, y = p.y - cam.y;
  const bob = p.speed > 0 ? Math.sin(performance.now() / 90) * 2 : 0;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(p.angle + Math.PI / 2);
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.beginPath(); ctx.ellipse(0, 8, 8, 4, 0, 0, Math.PI * 2); ctx.fill();
  // jacket: teal hoodie, jeans
  ctx.fillStyle = '#18a0a8';
  ctx.fillRect(-6, -5 + bob * 0.2, 12, 12);
  ctx.fillStyle = '#f0c8a0';
  ctx.beginPath(); ctx.arc(0, -10 + bob * 0.2, 6, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#20242e';
  ctx.beginPath(); ctx.arc(0, -12 + bob * 0.2, 6, Math.PI, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#2a3a5a';
  ctx.fillRect(-6, 7, 5, 8);
  ctx.fillRect(1, 7, 5, 8);
  if (p.hasPistol) {
    ctx.fillStyle = '#222';
    ctx.fillRect(4, -14, 3, 10);
  }
  ctx.restore();
  // punch arc
  if (p.punchT > 0) {
    ctx.strokeStyle = 'rgba(255,255,255,0.8)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(x, y, 22, p.angle - 0.7, p.angle + 0.7);
    ctx.stroke();
  }
}
