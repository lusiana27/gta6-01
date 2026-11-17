// Solara City — the camera and the draw order.
//
// The camera follows Milo (or his car) with a little smoothing and stays
// inside the world. Each frame draws the world, the mission target, the
// pickups, the people, the cars, the bullets and the HUD — in that order,
// so nothing important is ever hidden under the map.

SC.updateCamera = (G, dt) => {
  const p = G.player;
  const tx = SC.clamp(p.x, 640, SC.WORLD.w - 640);
  const ty = SC.clamp(p.y, 360, SC.WORLD.h - 360);
  const k = 1 - Math.pow(0.001, dt); // frame-rate independent smoothing
  G.camera.x = SC.lerp(G.camera.x, tx, k);
  G.camera.y = SC.lerp(G.camera.y, ty, k);
};

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

SC.render = (G) => {
  const ctx = G.ctx;
  ctx.clearRect(0, 0, 1280, 720);
  if (G.state === 'menu') {
    SC.drawMenu(ctx, G);
    return;
  }
  const cam = G.camera;
  SC.drawWorld(ctx, cam);
  SC.drawTargetMarker(ctx, cam, G);
  SC.drawPickups(ctx, cam, G);
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
  SC.drawPlayer(ctx, cam, G);
  SC.drawBullets(ctx, cam, G);
  SC.drawHUD(ctx, G);
  if (G.state === 'paused') SC.drawPaused(ctx, G);
  if (G.state === 'busted') SC.drawBusted(ctx, G);
  if (G.state === 'complete') SC.drawComplete(ctx, G);
};
