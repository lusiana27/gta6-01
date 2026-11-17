// Solara City — Milo Reyes on foot.
//
// Walks with WASD or arrows, faces the mouse while shooting, punches with
// F. Health regenerates slowly out of trouble; at zero the crew picks him
// up and the run ends busted.

SC.makePlayer = (x, y) => ({
  x,
  y,
  angle: -Math.PI / 2,
  r: 12,
  health: 100,
  walkPhase: 0,
  moving: false,
  punchTimer: 0,
  punchCooldown: 0,
  regenTimer: 0,
});

SC.updatePlayer = (G, dt) => {
  const p = G.player;
  if (p.inCar) return;
  const mv = SC.input.moveVector();
  p.moving = mv.x !== 0 || mv.y !== 0;
  const speed = 225;
  if (p.moving) {
    p.x += mv.x * speed * dt;
    p.y += mv.y * speed * dt;
    p.walkPhase += dt * 11;
    // Face the direction of travel, unless aiming with the mouse held.
    if (!SC.input.mouse.down) p.angle = Math.atan2(mv.y, mv.x);
  }
  if (SC.input.mouse.down && G.ammo > 0) {
    const wx = G.camera.x - 640 + SC.input.mouse.x;
    const wy = G.camera.y - 360 + SC.input.mouse.y;
    p.angle = SC.angleTo(p.x, p.y, wx, wy);
  }
  const fixed = SC.collideCircle(p.x, p.y, p.r);
  p.x = fixed.x;
  p.y = fixed.y;
  if (p.punchTimer > 0) p.punchTimer -= dt;
  if (p.punchCooldown > 0) p.punchCooldown -= dt;
  // Slow health regen when no cop is near.
  p.regenTimer += dt;
  if (p.regenTimer > 5 && p.health > 0 && p.health < 100) {
    p.health = Math.min(100, p.health + 6 * dt);
  }
};

SC.damagePlayer = (G, amount) => {
  const p = G.player;
  if (p.inCar || G.state !== 'playing') return;
  p.health -= amount;
  p.regenTimer = 0;
  if (p.health <= 0) {
    p.health = 0;
    SC.bustPlayer(G, 'Milo got caught flat-footed.');
  }
};

SC.bustPlayer = (G, reason) => {
  if (G.state !== 'playing') return;
  G.state = 'busted';
  G.bustedReason = reason;
  SC.audio.busted();
  SC.audio.engineStop();
  SC.audio.sirenStop();
  SC.saveBest(G);
};

SC.drawPlayer = (ctx, cam, G) => {
  const p = G.player;
  if (p.inCar) return;
  const sx = p.x - (cam.x - 640);
  const sy = p.y - (cam.y - 360);
  // Shadow.
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.beginPath();
  ctx.ellipse(sx, sy + 9, 11, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  // Body: teal jacket, dark jeans, skin head; a swinging arm when punching.
  ctx.save();
  ctx.translate(sx, sy);
  ctx.rotate(p.angle);
  const bob = p.moving ? Math.sin(p.walkPhase) * 2 : 0;
  ctx.fillStyle = '#1f6f8b';
  ctx.fillRect(-8, -8 + bob * 0.4, 16, 16);
  ctx.fillStyle = '#22223b';
  ctx.fillRect(-8, 6, 7, 8);
  ctx.fillRect(1, 6, 7, 8);
  if (p.punchTimer > 0) {
    ctx.fillStyle = '#e8b98a';
    ctx.fillRect(8, -4, 14, 7);
  } else {
    ctx.fillStyle = '#e8b98a';
    ctx.fillRect(8, -9, 8, 6);
    ctx.fillRect(8, 3, 8, 6);
  }
  ctx.fillStyle = '#e8b98a';
  ctx.beginPath();
  ctx.arc(10, 0, 7, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#2b2d42';
  ctx.beginPath();
  ctx.arc(10, -2, 7, Math.PI, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  // Health ring when hurt.
  if (p.health < 100) {
    ctx.strokeStyle = 'rgba(0,0,0,0.5)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(sx, sy, 17, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = p.health > 40 ? '#90be6d' : '#e63946';
    ctx.beginPath();
    ctx.arc(sx, sy, 17, -Math.PI / 2, -Math.PI / 2 + (p.health / 100) * Math.PI * 2);
    ctx.stroke();
  }
};
