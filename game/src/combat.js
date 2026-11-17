// Solara City — combat: pistol, punches, bullets and sparks.
//
// Milo shoots with the mouse (click or hold) and punches with F. Bullets
// fly straight, spark on walls and hurt cars, cops and pedestrians — and
// every shot is a crime, so the heat follows.

SC.updateCombat = (G, dt) => {
  const p = G.player;
  if (G.shootCooldown > 0) G.shootCooldown -= dt;
  // Hold the mouse to fire, while on foot and armed.
  if (G.state === 'playing' && !p.inCar && SC.input.mouse.down && G.ammo > 0 && G.shootCooldown <= 0) {
    SC.shoot(G);
  }
  if (SC.input.wasPressed('KeyF') && !p.inCar && p.punchCooldown <= 0) {
    SC.punch(G);
  }
  // Bullets.
  for (const b of G.bullets) {
    b.x += Math.cos(b.angle) * b.speed * dt;
    b.y += Math.sin(b.angle) * b.speed * dt;
    b.life -= dt;
    let dead = b.life <= 0;
    // Walls stop bullets.
    const fixed = SC.collideCircle(b.x, b.y, 2);
    if (fixed.x !== b.x || fixed.y !== b.y) {
      dead = true;
      SC.spawnSparks(G, b.x, b.y, 3);
    }
    // Cars.
    for (const car of G.cars) {
      if (dead || car.wrecked) continue;
      if (SC.dist(b.x, b.y, car.x, car.y) < 26) {
        dead = true;
        SC.damageCar(G, car, 34);
        SC.spawnSparks(G, b.x, b.y, 5);
        if (car.driver === 'police' || car.driver === 'traffic') SC.addHeat(G, 1, 'Shot at a car!');
      }
    }
    // Pedestrians.
    for (const ped of G.peds) {
      if (dead || ped.state === 'down') continue;
      if (SC.dist(b.x, b.y, ped.x, ped.y) < 14) {
        dead = true;
        ped.state = 'down';
        ped.downTimer = 5;
        SC.addHeat(G, 1, 'Shot a pedestrian!');
        SC.spawnSparks(G, b.x, b.y, 4);
      }
    }
    b.dead = dead;
  }
  G.bullets = G.bullets.filter((b) => !b.dead);
  // Particles fade.
  for (const pt of G.particles) {
    pt.x += pt.vx * dt;
    pt.y += pt.vy * dt;
    pt.life -= dt;
  }
  G.particles = G.particles.filter((pt) => pt.life > 0);
};

SC.shoot = (G) => {
  const p = G.player;
  G.ammo -= 1;
  G.shootCooldown = 0.22;
  const wx = G.camera.x - 640 + SC.input.mouse.x;
  const wy = G.camera.y - 360 + SC.input.mouse.y;
  const angle = SC.angleTo(p.x, p.y, wx, wy) + (Math.random() - 0.5) * 0.05;
  G.bullets.push({
    x: p.x + Math.cos(angle) * 18,
    y: p.y + Math.sin(angle) * 18,
    angle,
    speed: 720,
    life: 0.7,
  });
  p.angle = angle;
  SC.audio.shoot();
  SC.addHeat(G, 0.25);
};

SC.punch = (G) => {
  const p = G.player;
  p.punchTimer = 0.22;
  p.punchCooldown = 0.45;
  SC.audio.punch();
  const reach = 52;
  const fx = p.x + Math.cos(p.angle) * reach;
  const fy = p.y + Math.sin(p.angle) * reach;
  for (const ped of G.peds) {
    if (ped.state === 'down') continue;
    if (SC.dist(fx, fy, ped.x, ped.y) < 26) {
      ped.state = 'down';
      ped.downTimer = 4;
      SC.addHeat(G, 0.5, 'Assault!');
      SC.spawnSparks(G, ped.x, ped.y, 4);
      return;
    }
  }
  for (const car of G.cars) {
    if (car.wrecked) continue;
    if (SC.dist(fx, fy, car.x, car.y) < 30) {
      SC.damageCar(G, car, 5);
      SC.spawnSparks(G, car.x, car.y, 3);
      return;
    }
  }
};

SC.spawnSparks = (G, x, y, n) => {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2;
    const s = SC.range(Math.random, 60, 200);
    G.particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: SC.range(Math.random, 0.2, 0.5), color: '#ffd60a' });
  }
};

SC.drawBullets = (ctx, cam, G) => {
  ctx.fillStyle = '#fff3b0';
  for (const b of G.bullets) {
    const sx = b.x - (cam.x - 640);
    const sy = b.y - (cam.y - 360);
    ctx.beginPath();
    ctx.arc(sx, sy, 3, 0, Math.PI * 2);
    ctx.fill();
  }
  for (const pt of G.particles) {
    const sx = pt.x - (cam.x - 640);
    const sy = pt.y - (cam.y - 360);
    ctx.fillStyle = pt.color;
    ctx.globalAlpha = Math.max(0, pt.life * 2);
    ctx.fillRect(sx - 2, sy - 2, 4, 4);
  }
  ctx.globalAlpha = 1;
};
