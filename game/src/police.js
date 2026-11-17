// Solara City — the wanted level and the SCPD.
//
// Heat rises with crime (carjacking, hitting people, shooting, mission
// heat) and cools when Milo keeps his nose clean. The police spawn at the
// edge of the map, chase, ram, and — when Milo is on foot and cornered —
// move in for the bust.

SC.addHeat = (G, amount, why) => {
  if (G.state !== 'playing') return;
  const before = G.wanted;
  G.wanted = SC.clamp(G.wanted + amount, 0, 3);
  G.crimeTimer = 0;
  if (G.wanted > before && why) SC.addMessage(G, why + '  Wanted level up!', '#e63946');
  if (G.wanted >= 1) SC.audio.sirenStart();
};

SC.updateWanted = (G, dt) => {
  G.crimeTimer += dt;
  // Twelve quiet seconds, then one star cools off every eight seconds.
  if (G.wanted > 0 && G.crimeTimer > 12) {
    G.coolTimer += dt;
    if (G.coolTimer > 8) {
      G.coolTimer = 0;
      G.crimeTimer = 0;
      G.wanted -= 1;
      if (G.wanted === 0) {
        SC.audio.sirenStop();
        SC.addMessage(G, 'You lost them. Heat is off.', '#90be6d');
      }
    }
  } else {
    G.coolTimer = 0;
  }
};

SC.spawnPolice = (G) => {
  const p = G.player;
  // Spawn on a road 500-700 px away, off-screen.
  const angle = Math.random() * Math.PI * 2;
  let x = p.x + Math.cos(angle) * 620;
  let y = p.y + Math.sin(angle) * 620;
  x = SC.clamp(x, 80, SC.WORLD.w - 80);
  y = SC.clamp(y, 80, SC.BEACH_Y - 80);
  // Snap to the nearest road so the cruiser starts on asphalt.
  const rx = SC.ROADS_V.reduce((a, b) => (Math.abs(x - a) < Math.abs(x - b) ? a : b));
  const ry = SC.ROADS_H.reduce((a, b) => (Math.abs(y - a) < Math.abs(y - b) ? a : b));
  if (Math.abs(x - rx) < Math.abs(y - ry)) x = rx;
  else y = ry;
  const car = SC.makeCar(x, y, 0, SC.PALETTE.police, 'police');
  car.driver = 'police';
  car.speed = 200;
  G.cars.push(car);
  return car;
};

SC.policeCount = (G) => G.cars.filter((c) => c.driver === 'police' && !c.wrecked).length;

SC.updatePolice = (G, dt) => {
  const want = G.wanted >= 1 ? G.wanted : 0;
  const target = want === 0 ? 0 : want + 1; // 2 cruisers at 1 star, up to 4
  let count = SC.policeCount(G);
  G.policeSpawnTimer -= dt;
  if (count < target && G.policeSpawnTimer <= 0) {
    SC.spawnPolice(G);
    G.policeSpawnTimer = 2.5;
    count++;
  }
  // No heat: cruisers give up and drive off.
  const p = G.player;
  for (const car of G.cars) {
    if (car.driver !== 'police') continue;
    if (want === 0) {
      car.speed = SC.lerp(car.speed, 160, dt);
      car.x += Math.cos(car.angle) * car.speed * dt;
      car.y += Math.sin(car.angle) * car.speed * dt;
      if (SC.dist(car.x, car.y, p.x, p.y) > 900) car.gone = true;
      continue;
    }
    // Chase: steer toward the player, faster than traffic.
    const wantAngle = SC.angleTo(car.x, car.y, p.x, p.y);
    const diff = SC.angleDiff(car.angle, wantAngle);
    car.angle += SC.clamp(diff, -2.6 * dt, 2.6 * dt);
    const top = 300 + want * 45;
    car.speed = SC.lerp(car.speed, top, dt * 0.8);
    car.x += Math.cos(car.angle) * car.speed * dt;
    car.y += Math.sin(car.angle) * car.speed * dt;
    const hitWall = SC.collideCar(car);
    if (hitWall) car.speed *= 0.7;
    // Ram the player's car.
    if (p.inCar) {
      const d = SC.dist(car.x, car.y, p.inCar.x, p.inCar.y);
      if (d < 40) {
        const push = SC.angleTo(car.x, car.y, p.inCar.x, p.inCar.y);
        p.inCar.x += Math.cos(push) * 26;
        p.inCar.y += Math.sin(push) * 26;
        p.inCar.speed *= 0.82;
        SC.damageCar(G, p.inCar, 6);
        SC.audio.crash();
        SC.spawnSparks(G, p.inCar.x, p.inCar.y, 6);
        car.speed *= 0.5;
      }
    } else {
      // On foot and cornered: the bust clock runs.
      const d = SC.dist(car.x, car.y, p.x, p.y);
      if (d < 78) {
        G.bustTimer += dt;
        if (G.bustTimer > 2) {
          SC.bustPlayer(G, 'The SCPD boxed Milo in on foot.');
        }
      } else {
        G.bustTimer = Math.max(0, G.bustTimer - dt * 2);
      }
      // A cruiser that gets too close on foot also hurts.
      if (d < 30 && Math.abs(car.speed) > 60) {
        SC.damagePlayer(G, 12);
        car.speed *= 0.4;
      }
    }
  }
  // Remove cruisers that drove off or wrecked out of the chase.
  G.cars = G.cars.filter((c) => !(c.gone || (c.driver === 'police' && c.wrecked && SC.dist(c.x, c.y, p.x, p.y) > 700)));
};
