// Solara City — cars: driving, parking, stealing and crashing.
//
// Arcade handling on purpose: accelerate, brake and reverse on one axis,
// steering that bites harder the faster you go, and a handbrake slide on
// Space. A car has a driver ('player', 'traffic', 'police' or 'none' when
// parked) and health; a wrecked car smokes and stops.

SC.makeCar = (x, y, angle, color, kind) => {
  const k = kind || 'sedan'; // sedan | taxi | police | gold | sports | van
  // Top speed by kind: a sports car outruns the SCPD; a van lumbers.
  const top = k === 'sports' ? 480 : k === 'gold' ? 450 : k === 'police' ? 470 : k === 'van' ? 360 : 430;
  return {
    x,
    y,
    angle,
    speed: 0,
    len: k === 'van' ? 56 : 48,
    wid: k === 'van' ? 26 : 24,
    color,
    kind: k,
    maxSpeed: top,
    driver: 'none',
    health: 100,
    wrecked: false,
    brakeLight: false,
    honkTimer: 0,
    targetAngle: angle,
  };
};

SC.spawnParkedCars = (G, rng) => {
  const spots = [];
  // Park along the edges of the vertical roads, just off the asphalt.
  for (const rx of SC.ROADS_V) {
    for (const ry of SC.ROADS_H) {
      if (rng() < 0.7) spots.push({ x: rx - 64, y: ry + SC.range(rng, -160, 160), angle: Math.PI / 2 });
      if (rng() < 0.7) spots.push({ x: rx + 64, y: ry + SC.range(rng, -160, 160), angle: -Math.PI / 2 });
    }
  }
  for (const s of spots) {
    const car = SC.makeCar(s.x, s.y, s.angle, SC.pick(rng, SC.PALETTE.car), rng() < 0.12 ? 'taxi' : 'sedan');
    car.parked = true;
    G.cars.push(car);
  }
  // The gold convertible at the marina, for the final mission.
  const gold = SC.makeCar(2500, 430, Math.PI / 2, SC.PALETTE.gold, 'gold');
  gold.parked = true;
  gold.goldCar = true;
  G.cars.push(gold);
};

SC.nearestCar = (G, x, y, maxD) => {
  let best = null;
  let bestD = maxD;
  for (const c of G.cars) {
    if (c.wrecked) continue;
    const d = SC.dist(x, y, c.x, c.y);
    if (d < bestD) {
      bestD = d;
      best = c;
    }
  }
  return best;
};

// Milo gets in: a parked car is free, a traffic car is a carjacking.
SC.tryEnterCar = (G) => {
  const p = G.player;
  if (p.inCar) return false;
  const car = SC.nearestCar(G, p.x, p.y, 64);
  if (!car) return false;
  if (car.driver === 'traffic') {
    car.driver = 'player';
    car.parked = false;
    SC.addHeat(G, 1, 'Carjacking!');
    SC.addPed(G, car.x - Math.cos(car.angle) * 30, car.y - Math.sin(car.angle) * 30, 'flee');
    SC.audio.crash();
  } else if (car.driver === 'police') {
    return false;
  } else {
    car.driver = 'player';
    car.parked = false;
  }
  p.inCar = car;
  p.x = car.x;
  p.y = car.y;
  SC.audio.engineStart();
  return true;
};

SC.exitCar = (G) => {
  const p = G.player;
  if (!p.inCar) return;
  const car = p.inCar;
  car.driver = 'none';
  car.parked = true;
  car.speed = 0;
  p.inCar = null;
  p.x = car.x + Math.cos(car.angle + Math.PI / 2) * 30;
  p.y = car.y + Math.sin(car.angle + Math.PI / 2) * 30;
  const fixed = SC.collideCircle(p.x, p.y, p.r);
  p.x = fixed.x;
  p.y = fixed.y;
  SC.audio.engineStop();
};

// One physics step for a player-driven car.
SC.updatePlayerCar = (G, dt) => {
  const p = G.player;
  const car = p.inCar;
  if (!car) return;
  const k = SC.input.keys;
  const forward = k.KeyW || k.ArrowUp || G.shotCruise; // shot scenes cruise on their own
  const back = k.KeyS || k.ArrowDown;
  const left = k.KeyA || k.ArrowLeft;
  const right = k.KeyD || k.ArrowRight;
  const handbrake = k.Space;
  const maxSpeed = car.maxSpeed || 430;
  const maxReverse = 150;
  if (forward) car.speed += 300 * dt;
  if (back) car.speed -= car.speed > 20 ? 420 * dt : 200 * dt;
  if (!forward && !back) car.speed -= Math.sign(car.speed) * Math.min(Math.abs(car.speed), 140 * dt);
  if (handbrake) car.speed -= Math.sign(car.speed) * Math.min(Math.abs(car.speed), 520 * dt);
  car.speed = SC.clamp(car.speed, -maxReverse, maxSpeed);
  // Handbrake slides leave skid marks on the asphalt.
  if (handbrake && Math.abs(car.speed) > 150) {
    G.skidTimer -= dt;
    if (G.skidTimer <= 0) {
      G.skidTimer = 0.05;
      const bx = car.x - Math.cos(car.angle) * 18;
      const by = car.y - Math.sin(car.angle) * 18;
      G.skids.push({ x: bx, y: by, angle: car.angle, life: 6 });
      if (G.skids.length > 150) G.skids.shift();
    }
  }
  const steer = (left ? -1 : 0) + (right ? 1 : 0);
  const grip = handbrake ? 1.9 : 1;
  car.angle += steer * 2.5 * grip * (car.speed / maxSpeed) * dt * (car.speed < 0 ? -1 : 1);
  car.x += Math.cos(car.angle) * car.speed * dt;
  car.y += Math.sin(car.angle) * car.speed * dt;
  car.brakeLight = back || handbrake;
  const hit = SC.collideCar(car);
  if (hit && Math.abs(car.speed) > 120) {
    car.speed *= 0.45;
    SC.damageCar(G, car, 8);
    SC.audio.crash();
    SC.spawnSparks(G, car.x, car.y, 8);
  } else if (hit) {
    car.speed *= 0.6;
  }
  p.x = car.x;
  p.y = car.y;
  p.angle = car.angle;
  SC.audio.engineSet(Math.abs(car.speed) / maxSpeed);
  // Run over a pedestrian standing in the way.
  for (const ped of G.peds) {
    if (ped.state === 'down') continue;
    if (SC.dist(car.x, car.y, ped.x, ped.y) < 26 && Math.abs(car.speed) > 60) {
      ped.state = 'down';
      ped.downTimer = 4;
      SC.addHeat(G, 1, 'Hit a pedestrian!');
      SC.audio.crash();
      SC.spawnSparks(G, ped.x, ped.y, 6);
    }
  }
};

SC.damageCar = (G, car, amount) => {
  if (car.wrecked) return;
  car.health -= amount;
  if (car.health <= 0) {
    car.health = 0;
    car.wrecked = true;
    car.speed = 0;
    SC.spawnExplosion(G, car.x, car.y);
    if (car.driver === 'player') {
      SC.audio.engineStop();
      SC.addMessage(G, 'Your ride is wrecked — get out!', '#e63946');
    }
    if (car.driver === 'traffic') {
      car.driver = 'none';
      SC.addPed(G, car.x, car.y, 'flee');
    }
    if (car.driver === 'police') car.driver = 'none';
  }
};

SC.drawCar = (ctx, cam, car, time) => {
  const sx = car.x - (cam.x - 640);
  const sy = car.y - (cam.y - 360);
  ctx.save();
  ctx.translate(sx, sy);
  ctx.rotate(car.angle);
  ctx.fillStyle = 'rgba(0,0,0,0.28)';
  ctx.fillRect(-car.len / 2 + 2, -car.wid / 2 + 3, car.len, car.wid);
  ctx.fillStyle = car.color;
  ctx.beginPath();
  ctx.roundRect(-car.len / 2, -car.wid / 2, car.len, car.wid, 7);
  ctx.fill();
  // Cabin and windows.
  ctx.fillStyle = 'rgba(20,24,40,0.85)';
  ctx.beginPath();
  ctx.roundRect(-8, -car.wid / 2 + 4, 18, car.wid - 8, 4);
  ctx.fill();
  ctx.fillStyle = '#dfe8ff';
  ctx.fillRect(car.len / 2 - 8, -car.wid / 2 + 4, 4, 5);
  ctx.fillRect(car.len / 2 - 8, car.wid / 2 - 9, 4, 5);
  // Headlights and brake lights.
  ctx.fillStyle = '#fff8c4';
  ctx.fillRect(car.len / 2 - 2, -car.wid / 2 + 2, 3, 5);
  ctx.fillRect(car.len / 2 - 2, car.wid / 2 - 7, 3, 5);
  ctx.fillStyle = car.brakeLight ? '#ff2e2e' : '#a31621';
  ctx.fillRect(-car.len / 2 - 1, -car.wid / 2 + 2, 3, 5);
  ctx.fillRect(-car.len / 2 - 1, car.wid / 2 - 7, 3, 5);
  if (car.kind === 'taxi') {
    ctx.fillStyle = '#222';
    ctx.font = 'bold 9px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('TAXI', 0, 3);
  }
  if (car.kind === 'sports') {
    // Rear spoiler and a racing stripe.
    ctx.fillStyle = '#1d1a2b';
    ctx.fillRect(-car.len / 2 - 2, -car.wid / 2 - 1, 4, car.wid + 2);
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    ctx.fillRect(-4, -3, car.len - 4, 6);
  }
  if (car.kind === 'van') {
    ctx.fillStyle = '#222';
    ctx.font = 'bold 9px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('VAN', 0, 3);
  }
  if (car.kind === 'gold') {
    ctx.strokeStyle = '#fff3b0';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(-car.len / 2 + 3, -car.wid / 2 + 3, car.len - 6, car.wid - 6, 5);
    ctx.stroke();
  }
  if (car.kind === 'police') {
    ctx.fillStyle = '#1d3557';
    ctx.font = 'bold 8px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('SCPD', 0, 3);
    // Flashing light bar.
    const phase = Math.floor(time * 4) % 2 === 0;
    ctx.fillStyle = phase ? '#ff2e2e' : '#2e6bff';
    ctx.fillRect(-6, -car.wid / 2 - 3, 5, 4);
    ctx.fillStyle = phase ? '#2e6bff' : '#ff2e2e';
    ctx.fillRect(1, -car.wid / 2 - 3, 5, 4);
  }
  ctx.restore();
  // Smoke when damaged.
  if (car.health < 55 && !car.wrecked) {
    ctx.fillStyle = 'rgba(120,120,120,0.5)';
    ctx.beginPath();
    ctx.arc(sx + Math.cos(car.angle) * 18, sy + Math.sin(car.angle) * 18, 5 + Math.sin(time * 9) * 2, 0, Math.PI * 2);
    ctx.fill();
  }
  if (car.wrecked) {
    ctx.fillStyle = 'rgba(40,40,40,0.6)';
    ctx.beginPath();
    ctx.arc(sx, sy - 6, 9, 0, Math.PI * 2);
    ctx.fill();
  }
};
