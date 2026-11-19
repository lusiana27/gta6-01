// Solara City — the camera and the draw order.
//
// The camera follows Milo (or his car) with a little smoothing and stays
// inside the world. A day runs about four minutes: golden afternoon,
// dusk, then night, when headlights come on. Each frame draws the world,
// the skid marks, the shops, the mission target, the pickups, the race
// markers, the people, the cars, the helicopter, the bullets, the night
// tint and the HUD — in that order, so nothing important is ever hidden
// under the map.

SC.updateCamera = (G, dt) => {
  const p = G.player;
  const tx = SC.clamp(p.x, 640, SC.WORLD.w - 640);
  const ty = SC.clamp(p.y, 360, SC.WORLD.h - 360);
  const k = 1 - Math.pow(0.001, dt); // frame-rate independent smoothing
  G.camera.x = SC.lerp(G.camera.x, tx, k);
  G.camera.y = SC.lerp(G.camera.y, ty, k);
};

// Time of day in [0, 1): 0.3 is golden afternoon, 0.65 dusk, 0.85 night.
SC.dayTint = (dayT) => {
  if (dayT < 0.55) return null; // daylight
  if (dayT < 0.7) return { color: '255,120,40', alpha: 0.05 + ((dayT - 0.55) / 0.15) * 0.1 }; // dusk
  if (dayT < 0.95) return { color: '10,10,48', alpha: 0.3 }; // night
  return { color: '255,120,40', alpha: 0.08 }; // dawn
};

SC.isNight = (dayT) => dayT >= 0.7 && dayT < 0.95;

SC.drawTargetMarker = (ctx, cam, G) => {
  const stage = SC.currentStage(G);
  if (!stage || stage.x === undefined || G.state !== 'playing') return;
  const sx = stage.x - (cam.x - 640);
  const sy = stage.y - (cam.y - 360);
  const pulse = 26 + Math.sin(G.time * 5) * 6;
  ctx.strokeStyle = '#ffd60a';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(sx, sy, pulse, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = '#ffd60a';
  ctx.beginPath();
  ctx.arc(sx, sy, 5, 0, Math.PI * 2);
  ctx.fill();
  // A beam so the target is visible from far away.
  ctx.fillStyle = 'rgba(255,214,10,0.12)';
  ctx.fillRect(sx - 3, sy - 400, 6, 400);
};

SC.drawSkids = (ctx, cam, G) => {
  for (const s of G.skids) {
    const sx = s.x - (cam.x - 640);
    const sy = s.y - (cam.y - 360);
    if (sx < -30 || sx > 1310 || sy < -30 || sy > 750) continue;
    ctx.save();
    ctx.translate(sx, sy);
    ctx.rotate(s.angle);
    ctx.fillStyle = 'rgba(20,20,28,' + Math.min(0.55, s.life * 0.12) + ')';
    ctx.fillRect(-14, -4, 28, 8);
    ctx.restore();
  }
};

// Headlight cones in front of every car at night.
SC.drawHeadlights = (ctx, cam, G) => {
  for (const car of G.cars) {
    if (car.wrecked) continue;
    const sx = car.x - (cam.x - 640);
    const sy = car.y - (cam.y - 360);
    if (sx < -140 || sx > 1420 || sy < -140 || sy > 860) continue;
    const fx = Math.cos(car.angle);
    const fy = Math.sin(car.angle);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = 'rgba(255,244,170,0.10)';
    ctx.beginPath();
    ctx.moveTo(sx + fx * 20, sy + fy * 20);
    ctx.lineTo(sx + fx * 150 - fy * 34, sy + fy * 150 + fx * 34);
    ctx.lineTo(sx + fx * 150 + fy * 34, sy + fy * 150 - fx * 34);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
};

SC.render = (G) => {
  const ctx = G.ctx;
  ctx.clearRect(0, 0, 1280, 720);
  if (G.state === 'menu') {
    SC.drawMenu(ctx, G);
    return;
  }
  const cam = G.camera;
  SC.drawWorld(ctx, cam, G.time);
  SC.drawSkids(ctx, cam, G);
  SC.drawShops(ctx, cam, G);
  SC.drawTargetMarker(ctx, cam, G);
  SC.drawPickups(ctx, cam, G);
  SC.drawFareMarker(ctx, cam, G);
  SC.drawActivities(ctx, cam, G);
  SC.drawPeds(ctx, cam, G);
  // Cars: traffic first, then the player's car on top.
  for (const car of G.cars) {
    if (car === G.player.inCar) continue;
    const sx = car.x - (cam.x - 640);
    const sy = car.y - (cam.y - 360);
    if (sx < -80 || sx > 1360 || sy < -80 || sy > 800) continue;
    SC.drawCar(ctx, cam, car, G.time);
  }
  if (G.player.inCar) SC.drawCar(ctx, cam, G.player.inCar, G.time);
  SC.drawHeli(ctx, cam, G);
  SC.drawPlayer(ctx, cam, G);
  SC.drawBullets(ctx, cam, G);
  // Night falls over the city; headlights cut through it.
  const tint = SC.dayTint(G.dayT);
  if (tint) {
    ctx.fillStyle = 'rgba(' + tint.color + ',' + tint.alpha + ')';
    ctx.fillRect(0, 0, 1280, 720);
    if (SC.isNight(G.dayT)) SC.drawHeadlights(ctx, cam, G);
  }
  SC.drawHUD(ctx, G);
  SC.drawGaragePrompts(ctx, G);
  SC.drawActivityPrompts(ctx, G);
  if (G.state === 'paused') SC.drawPaused(ctx, G);
  if (G.state === 'busted') SC.drawBusted(ctx, G);
  if (G.state === 'complete') SC.drawComplete(ctx, G);
};
