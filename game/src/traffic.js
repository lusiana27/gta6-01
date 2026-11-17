// Solara City — traffic cars and pedestrians.
//
// Traffic drives the road grid in lanes and turns at intersections; it
// slows for the car ahead. Pedestrians stroll the sidewalks and run when a
// car bears down on them. Both are cheap on purpose: the city has to feel
// alive at a glance, not simulate a real traffic jam.

SC.spawnTraffic = (G, rng, count) => {
  for (let i = 0; i < count; i++) {
    const vertical = rng() < 0.5;
    const road = vertical ? SC.pick(rng, SC.ROADS_V) : SC.pick(rng, SC.ROADS_H);
    const along = SC.range(rng, 100, (vertical ? SC.WORLD.h : SC.WORLD.w) - 100);
    const dir = rng() < 0.5 ? 1 : -1;
    // Right-hand traffic: eastbound sits south of centre, southbound west.
    const lane = vertical ? (dir > 0 ? -22 : 22) : dir > 0 ? 22 : -22;
    const car = SC.makeCar(
      vertical ? road + lane : along,
      vertical ? along : road + lane,
      vertical ? (dir > 0 ? Math.PI / 2 : -Math.PI / 2) : dir > 0 ? 0 : Math.PI,
      SC.pick(rng, SC.PALETTE.car),
      rng() < 0.1 ? 'taxi' : 'sedan',
    );
    car.driver = 'traffic';
    car.speed = SC.range(rng, 85, 130);
    car.vertical = vertical;
    car.dir = dir;
    car.lane = lane;
    G.cars.push(car);
  }
};

SC.updateTraffic = (G, dt) => {
  for (const car of G.cars) {
    if (car.driver !== 'traffic' || car.wrecked) continue;
    // Slow down for the car ahead on the same road.
    let target = car.baseSpeed || 110;
    for (const other of G.cars) {
      if (other === car || other.wrecked) continue;
      const dx = other.x - car.x;
      const dy = other.y - car.y;
      const ahead = car.vertical ? Math.sign(dy) === car.dir && Math.abs(dx) < 30 && dy * car.dir > 0 && dy * car.dir < 70
        : Math.sign(dx) === car.dir && Math.abs(dy) < 30 && dx * car.dir > 0 && dx * car.dir < 70;
      if (ahead) target = Math.min(target, 30);
    }
    car.speed = SC.lerp(car.speed, target, dt * 2);
    car.x += Math.cos(car.angle) * car.speed * dt;
    car.y += Math.sin(car.angle) * car.speed * dt;

    // At an intersection, sometimes turn onto the crossing road.
    const nearV = SC.ROADS_V.find((rx) => Math.abs(car.x - rx) < 26);
    const nearH = SC.ROADS_H.find((ry) => Math.abs(car.y - ry) < 26);
    if (nearV !== undefined && nearH !== undefined && Math.random() < dt * 0.35) {
      const turnVertical = !car.vertical;
      if (turnVertical) {
        car.vertical = true;
        car.dir = Math.random() < 0.5 ? 1 : -1;
        car.lane = car.dir > 0 ? -22 : 22;
        car.x = nearV + car.lane;
        car.y = nearH;
        car.angle = car.dir > 0 ? Math.PI / 2 : -Math.PI / 2;
      } else {
        car.vertical = false;
        car.dir = Math.random() < 0.5 ? 1 : -1;
        car.lane = car.dir > 0 ? 22 : -22;
        car.x = nearV;
        car.y = nearH + car.lane;
        car.angle = car.dir > 0 ? 0 : Math.PI;
      }
    }
    // Wrap around the world edge so traffic never runs out.
    if (car.x < -60) car.x = SC.WORLD.w + 40;
    if (car.x > SC.WORLD.w + 60) car.x = -40;
    if (car.y < -60) car.y = SC.BEACH_Y + 40;
    if (car.y > SC.BEACH_Y + 60) car.y = -40;
  }
};

SC.makePed = (x, y, rng) => ({
  x,
  y,
  angle: rng() * Math.PI * 2,
  speed: SC.range(rng, 28, 52),
  color: SC.pick(rng, ['#e63946', '#457b9d', '#f4a261', '#2a9d8f', '#e9c46a', '#9b5de5', '#f15bb5']),
  state: 'walk', // walk | flee | down
  walkPhase: rng() * 6,
  downTimer: 0,
  targetX: x,
  targetY: y,
  retarget: 0,
});

SC.addPed = (G, x, y, state) => {
  const ped = SC.makePed(x, y, Math.random);
  ped.state = state || 'walk';
  G.peds.push(ped);
  return ped;
};

SC.spawnPeds = (G, rng, count) => {
  for (let i = 0; i < count; i++) {
    // On a sidewalk beside a random road.
    const vertical = rng() < 0.5;
    let x;
    let y;
    if (vertical) {
      const rx = SC.pick(rng, SC.ROADS_V);
      x = rx + (rng() < 0.5 ? -62 : 62);
      y = SC.range(rng, 100, SC.BEACH_Y - 100);
    } else {
      const ry = SC.pick(rng, SC.ROADS_H);
      x = SC.range(rng, 100, SC.WORLD.w - 100);
      y = ry + (rng() < 0.5 ? -62 : 62);
    }
    // Keep them out of buildings.
    const fixed = SC.collideCircle(x, y, 10);
    G.peds.push(SC.makePed(fixed.x, fixed.y, rng));
  }
};

SC.updatePeds = (G, dt) => {
  const playerCar = G.player.inCar;
  for (const ped of G.peds) {
    if (ped.state === 'down') {
      ped.downTimer -= dt;
      if (ped.downTimer <= 0) {
        ped.state = 'walk';
        ped.retarget = 0;
      }
      continue;
    }
    // Flee a speeding car nearby.
    let fleeing = false;
    if (playerCar && Math.abs(playerCar.speed) > 80) {
      const d = SC.dist(ped.x, ped.y, playerCar.x, playerCar.y);
      if (d < 130) {
        ped.state = 'flee';
        ped.angle = SC.angleTo(playerCar.x, playerCar.y, ped.x, ped.y);
        fleeing = true;
      }
    }
    if (ped.state === 'flee' && !fleeing) {
      ped.state = 'walk';
      ped.retarget = 0;
    }
    const speed = ped.state === 'flee' ? 150 : ped.speed;
    if (ped.state === 'walk') {
      ped.retarget -= dt;
      if (ped.retarget <= 0) {
        ped.retarget = SC.range(Math.random, 2, 5);
        // Stroll along the sidewalk: keep the same axis, random direction.
        if (Math.random() < 0.5) {
          const rx = SC.ROADS_V.reduce((a, b) => (Math.abs(ped.x - a) < Math.abs(ped.x - b) ? a : b));
          ped.targetX = rx + (ped.x < rx ? -62 : 62);
          ped.targetY = ped.y + SC.range(Math.random, -220, 220);
        } else {
          const ry = SC.ROADS_H.reduce((a, b) => (Math.abs(ped.y - a) < Math.abs(ped.y - b) ? a : b));
          ped.targetX = ped.x + SC.range(Math.random, -220, 220);
          ped.targetY = ry + (ped.y < ry ? -62 : 62);
        }
      }
      const d = SC.dist(ped.x, ped.y, ped.targetX, ped.targetY);
      if (d > 8) ped.angle = SC.angleTo(ped.x, ped.y, ped.targetX, ped.targetY);
      else ped.retarget = 0;
    }
    ped.x += Math.cos(ped.angle) * speed * dt;
    ped.y += Math.sin(ped.angle) * speed * dt;
    ped.walkPhase += dt * 9;
    const fixed = SC.collideCircle(ped.x, ped.y, 10);
    ped.x = fixed.x;
    ped.y = fixed.y;
  }
};

SC.drawPeds = (ctx, cam, G) => {
  for (const ped of G.peds) {
    const sx = ped.x - (cam.x - 640);
    const sy = ped.y - (cam.y - 360);
    if (sx < -30 || sx > 1310 || sy < -30 || sy > 750) continue;
    ctx.save();
    ctx.translate(sx, sy);
    if (ped.state === 'down') {
      ctx.rotate(ped.angle + Math.PI / 2);
      ctx.fillStyle = ped.color;
      ctx.fillRect(-9, -5, 18, 10);
      ctx.fillStyle = '#e8b98a';
      ctx.beginPath();
      ctx.arc(11, 0, 5, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.rotate(ped.angle);
      const bob = Math.sin(ped.walkPhase) * 2;
      ctx.fillStyle = ped.color;
      ctx.fillRect(-6, -6, 12, 12);
      ctx.fillStyle = '#22223b';
      ctx.fillRect(-6, 4, 5, 7 + bob * 0.3);
      ctx.fillRect(1, 4, 5, 7 - bob * 0.3);
      ctx.fillStyle = '#e8b98a';
      ctx.beginPath();
      ctx.arc(8, 0, 5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
};
