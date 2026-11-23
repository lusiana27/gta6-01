// police.js — the wanted system: stars, patrol cars, the Air One helicopter,
// roadblocks, bust and wanted decay. The higher the stars, the harder the heat.

import { WORLD_W, WORLD_H, ROADS_X, ROADS_Y, mulberry32 } from './city.js';
import { makeCar } from './entities.js';

export const WANTED_NAMES = ['', 'SUSPECT', 'WANTED', 'DANGEROUS', 'ARMED & DANGEROUS', 'MOST WANTED'];

export function wantedCopCount(stars) {
  return [0, 1, 2, 3, 4, 6][stars] || 0;
}

export function wantedSpawnInterval(stars) {
  return [999, 6, 4.5, 3.5, 2.5, 2][stars] || 999;
}

/** Raise the wanted level (max 5) and add heat. */
export function addWanted(S, n, reason) {
  const before = S.wanted;
  S.wanted = Math.min(5, S.wanted + n);
  S.wantedHeat = Math.min(100, S.wantedHeat + n * 25);
  if (S.wanted > before) S.flash = `WANTED LEVEL ${S.wanted} — ${reason}`;
  S.flashT = 2.2;
}

/** Spawn a police car at a road near the player, just off-screen. */
export function spawnCop(S, rnd) {
  const px = S.player.x, py = S.player.y;
  const vertical = rnd() < 0.5;
  const road = vertical ? ROADS_X[Math.floor(rnd() * ROADS_X.length)] : ROADS_Y[Math.floor(rnd() * ROADS_Y.length)];
  const dist = 520 + rnd() * 300;
  const sign = rnd() < 0.5 ? -1 : 1;
  let x, y, angle;
  if (vertical) {
    x = road; y = py + sign * dist; angle = sign > 0 ? -Math.PI / 2 : Math.PI / 2;
  } else {
    x = px + sign * dist; y = road; angle = sign > 0 ? Math.PI : 0;
  }
  x = Math.max(60, Math.min(WORLD_W - 60, x));
  y = Math.max(60, Math.min(WORLD_H - 60, y));
  const cop = makeCar(x, y, angle, 'police', 4);
  cop.color = '#10203a';
  cop.targetSpeed = 300;
  cop.siren = 1;
  return cop;
}

/** Police chase AI: steer toward the player, ram, and try to stop the car. */
export function updateCop(cop, S, dt) {
  const p = S.player;
  const tx = p.onFoot ? p.x : p.car.x;
  const ty = p.onFoot ? p.y : p.car.y;
  const dx = tx - cop.x, dy = ty - cop.y;
  const dist = Math.hypot(dx, dy);
  const desired = Math.atan2(dy, dx);
  let diff = desired - cop.angle;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  cop.angle += Math.max(-3.2, Math.min(3.2, diff * 2.2)) * dt;
  const target = dist > 700 ? 420 : dist > 240 ? 360 : 300;
  cop.speed += (target - cop.speed) * Math.min(1, dt * 1.2);
  cop.x += Math.cos(cop.angle) * cop.speed * dt;
  cop.y += Math.sin(cop.angle) * cop.speed * dt;
  cop.x = Math.max(20, Math.min(WORLD_W - 20, cop.x));
  cop.y = Math.max(20, Math.min(WORLD_H - 20, cop.y));
  // ram the player's car
  if (!p.onFoot && p.car && dist < 46) {
    p.car.speed *= 0.92;
    p.car.angle += (Math.random() - 0.5) * 0.06;
    S.shake = Math.min(8, S.shake + 3);
    if (Math.random() < dt * 0.5) S.audio.sfx('thud');
  }
  // bust the player on foot
  if (p.onFoot && dist < 34) {
    p.bustT += dt;
    if (p.bustT > 1.4) {
      S.busted = true;
      S.wanted = 0;
      S.wantedHeat = 0;
      S.money = Math.max(0, S.money - 300);
      p.bustT = 0;
    }
  } else if (p.onFoot) {
    p.bustT = Math.max(0, p.bustT - dt * 2);
  }
  return dist;
}

/** The Air One helicopter: hovers over the player from 3 stars up, spotlight at night. */
export function updateHeli(S, dt) {
  if (S.wanted < 3) { S.heli = null; return; }
  if (!S.heli) {
    S.heli = { x: S.player.onFoot ? S.player.x : S.player.car.x, y: (S.player.onFoot ? S.player.y : S.player.car.y) - 40, angle: 0, t: 0 };
  }
  const h = S.heli;
  h.t += dt;
  const tx = S.player.onFoot ? S.player.x : S.player.car.x;
  const ty = S.player.onFoot ? S.player.y : S.player.car.y;
  h.x += (tx - h.x) * Math.min(1, dt * 0.9) + Math.sin(h.t * 1.3) * 22 * dt;
  h.y += (ty - 40 - h.y) * Math.min(1, dt * 0.9) + Math.cos(h.t * 1.1) * 18 * dt;
  h.angle = Math.atan2(ty - h.y, tx - h.x);
}

export function drawHeli(ctx, S, cam) {
  if (!S.heli) return;
  const h = S.heli;
  const x = h.x - cam.x, y = h.y - cam.y;
  if (x < -120 || y < -120 || x > 1400 || y > 920) return;
  // spotlight cone on the player
  const px = (S.player.onFoot ? S.player.x : S.player.car.x) - cam.x;
  const py = (S.player.onFoot ? S.player.y : S.player.car.y) - cam.y;
  ctx.save();
  ctx.fillStyle = 'rgba(255,244,180,0.16)';
  ctx.beginPath();
  ctx.moveTo(x - 14, y);
  ctx.lineTo(x + 14, y);
  ctx.lineTo(px + 70, py + 70);
  ctx.lineTo(px - 70, py + 70);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = 'rgba(255,244,180,0.28)';
  ctx.beginPath(); ctx.arc(px, py, 58, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
  // body
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(h.angle);
  ctx.fillStyle = 'rgba(0,0,0,0.4)';
  ctx.fillRect(-24, -10, 48, 24);
  ctx.fillStyle = '#20304a';
  ctx.beginPath(); ctx.roundRect(-22, -9, 44, 18, 8); ctx.fill();
  ctx.fillStyle = '#9fd8ff';
  ctx.fillRect(6, -6, 12, 12);
  ctx.fillStyle = '#e8e8e8';
  ctx.font = 'bold 8px Arial'; ctx.textAlign = 'center';
  ctx.fillText('AIR-1', -6, 3);
  const blade = (performance.now() / 40) % Math.PI;
  ctx.strokeStyle = 'rgba(200,200,200,0.8)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-30, 0); ctx.lineTo(30, 0);
  ctx.moveTo(-30 * Math.cos(blade), -30 * Math.sin(blade));
  ctx.lineTo(30 * Math.cos(blade), 30 * Math.sin(blade));
  ctx.stroke();
  ctx.restore();
}

/** Roadblocks from 4 stars: two police cars parked across the road ahead. */
export function updateRoadblocks(S, dt) {
  if (S.wanted < 4) { S.roadblocks = []; return; }
  S.rbT -= dt;
  if (S.rbT <= 0 && S.roadblocks.length < 2) {
    S.rbT = 9;
    const p = S.player;
    const cx = p.onFoot ? p.x : p.car.x;
    const cy = p.onFoot ? p.y : p.car.y;
    const ahead = p.onFoot ? p.angle : p.car.angle;
    const bx = cx + Math.cos(ahead) * 420;
    const by = cy + Math.sin(ahead) * 420;
    const perp = ahead + Math.PI / 2;
    S.roadblocks.push({
      x: bx, y: by, angle: perp,
      cars: [
        { x: bx + Math.cos(perp) * 34, y: by + Math.sin(perp) * 34, angle: perp },
        { x: bx - Math.cos(perp) * 34, y: by - Math.sin(perp) * 34, angle: perp },
      ],
      t: 14,
    });
    S.flash = 'ROADBLOCK AHEAD — POLICE CORDON';
    S.flashT = 2;
  }
  for (const rb of S.roadblocks) rb.t -= dt;
  S.roadblocks = S.roadblocks.filter((rb) => rb.t > 0);
}

export function drawRoadblocks(ctx, S, cam) {
  for (const rb of S.roadblocks) {
    for (const c of rb.cars) {
      const fake = { x: c.x, y: c.y, angle: c.angle, speed: 0, kind: 'police', color: '#10203a', targetSpeed: 0, siren: 1 };
      const save = ctx.save;
      // draw via a light inline car shape (avoid importing the drawer)
      const x = c.x - cam.x, y = c.y - cam.y;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(c.angle);
      ctx.fillStyle = '#10203a';
      ctx.beginPath(); ctx.roundRect(-20, -11, 44, 22, 6); ctx.fill();
      ctx.fillStyle = '#f0f0f0';
      ctx.fillRect(-8, -11, 16, 22);
      ctx.fillStyle = Math.floor(performance.now() / 180) % 2 ? '#ff2020' : '#2040ff';
      ctx.fillRect(-16, -13, 8, 4);
      ctx.restore();
      void save;
    }
    const bx = rb.x - cam.x, by = rb.y - cam.y;
    ctx.fillStyle = '#e8c840';
    ctx.font = 'bold 11px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('⚠ ROADBLOCK ⚠', bx, by - 34);
  }
}

/** Wanted decay: hide from the cops and the heat cools off. */
export function updateWanted(S, dt) {
  if (S.wanted === 0) { S.wantedHeat = 0; return; }
  const nearestCop = S.cops.reduce((m, c) => Math.min(m, Math.hypot(c.x - S.player.x, c.y - S.player.y)), 1e9);
  const seen = nearestCop < 420;
  if (!seen) {
    S.wantedHeat -= dt * (S.wanted >= 4 ? 2.5 : 5);
    if (S.wantedHeat <= 0) {
      S.wanted = Math.max(0, S.wanted - 1);
      S.wantedHeat = S.wanted > 0 ? 60 : 0;
      if (S.wanted === 0) { S.flash = 'YOU LOST THE COPS'; S.flashT = 2.5; }
    }
  } else {
    S.wantedHeat = Math.min(100, S.wantedHeat + dt * 1.5);
  }
}
