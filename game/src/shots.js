// Solara City — screenshot scenes.
//
// `?shot=<name>&seed=<n>` boots the game straight into a staged moment so
// the screenshots are real renders of the game itself: the same update
// loop, the same world, just a chosen starting position, mission and heat.
// The Playwright script waits for window.__shotReady, which main.js sets
// after the scene has run for about 110 frames.

SC.setupShot = (G, name) => {
  const p = G.player;
  const place = (x, y) => {
    p.x = x;
    p.y = y;
    G.camera.x = SC.clamp(x, 640, SC.WORLD.w - 640);
    G.camera.y = SC.clamp(y, 360, SC.WORLD.h - 360);
  };
  // Extra traffic on the roads near the scene, in proper lanes.
  const addTrafficNear = (x, y, n) => {
    for (let i = 0; i < n; i++) {
      const vertical = Math.random() < 0.5;
      const dir = Math.random() < 0.5 ? 1 : -1;
      let cx;
      let cy;
      let angle;
      if (vertical) {
        const rx = SC.ROADS_V.reduce((a, b) => (Math.abs(x - a) < Math.abs(x - b) ? a : b));
        cx = rx + (dir > 0 ? -22 : 22) + SC.range(Math.random, -4, 4);
        cy = y + SC.range(Math.random, -260, 260);
        angle = dir > 0 ? Math.PI / 2 : -Math.PI / 2;
      } else {
        const ry = SC.ROADS_H.reduce((a, b) => (Math.abs(y - a) < Math.abs(y - b) ? a : b));
        cx = x + SC.range(Math.random, -260, 260);
        cy = ry + (dir > 0 ? 22 : -22) + SC.range(Math.random, -4, 4);
        angle = dir > 0 ? 0 : Math.PI;
      }
      const car = SC.makeCar(cx, cy, angle, SC.pick(Math.random, SC.PALETTE.car), 'sedan');
      car.driver = 'traffic';
      car.speed = SC.range(Math.random, 80, 120);
      car.vertical = vertical;
      car.dir = dir;
      G.cars.push(car);
    }
  };
  // Extra pedestrians on the sidewalks near the scene.
  const addPedsNear = (x, y, n) => {
    for (let i = 0; i < n; i++) {
      const vertical = Math.random() < 0.5;
      let px;
      let py;
      if (vertical) {
        const rx = SC.ROADS_V.reduce((a, b) => (Math.abs(x - a) < Math.abs(x - b) ? a : b));
        px = rx + (Math.random() < 0.5 ? -62 : 62);
        py = y + SC.range(Math.random, -260, 260);
      } else {
        const ry = SC.ROADS_H.reduce((a, b) => (Math.abs(y - a) < Math.abs(y - b) ? a : b));
        px = x + SC.range(Math.random, -260, 260);
        py = ry + (Math.random() < 0.5 ? -62 : 62);
      }
      const ped = SC.makePed(px, py, Math.random);
      const fixed = SC.collideCircle(ped.x, ped.y, 10);
      ped.x = fixed.x;
      ped.y = fixed.y;
      G.peds.push(ped);
    }
  };
  // In shot scenes the mission banner fades fast so it does not cover the
  // city (the objective bar at the bottom still shows the mission).
  const fadeBanner = () => {
    if (G.banner) G.banner.until = G.time + 1.0;
  };

  if (name === 'drive') {
    // Cover: driving down the avenue, HUD and minimap live, mission on.
    SC.startMission(G, 1);
    fadeBanner();
    G.shotCruise = true;
    const car = SC.makeCar(1420, 980, Math.PI / 2, '#e63946', 'sedan');
    car.driver = 'player';
    car.speed = 240;
    G.cars.push(car);
    p.inCar = car;
    p.x = car.x;
    p.y = car.y;
    place(1420, 980);
    addTrafficNear(1420, 900, 5);
    addPedsNear(1420, 980, 8);
    SC.audio.engineStart();
  } else if (name === 'street') {
    // On foot in a busy street, pedestrians and traffic everywhere.
    SC.startMission(G, 0);
    fadeBanner();
    place(920, 700);
    p.angle = Math.PI / 2;
    addTrafficNear(920, 700, 6);
    addPedsNear(920, 700, 14);
  } else if (name === 'chase') {
    // Three stars, three cruisers on the tail, the gold car at full speed.
    SC.startMission(G, 4);
    fadeBanner();
    G.shotCruise = true;
    G.missionStage = 1;
    const gold = G.cars.find((c) => c.goldCar);
    gold.driver = 'player';
    gold.parked = false;
    gold.speed = 320;
    gold.x = 1420;
    gold.y = 1160;
    gold.angle = 0;
    p.inCar = gold;
    p.x = gold.x;
    p.y = gold.y;
    place(1420, 1160);
    G.wanted = 3;
    G.crimeTimer = 0;
    for (let i = 0; i < 3; i++) {
      const cop = SC.spawnPolice(G);
      cop.x = 1420 - 140 - i * 70;
      cop.y = 1160 + (i - 1) * 50;
      cop.speed = 330;
      cop.angle = 0;
    }
    addTrafficNear(1420, 1160, 3);
    SC.audio.engineStart();
  } else if (name === 'mission') {
    // The Bank Job in progress: cash bags on the plaza, banner up.
    SC.startMission(G, 3);
    G.missionStage = 1;
    place(1470, 950);
    p.angle = Math.PI / 2;
    addTrafficNear(1420, 760, 2);
    addPedsNear(1420, 760, 5);
  } else {
    // Unknown shot: just start the game at the garage.
    SC.startMission(G, 0);
    place(480, 420);
  }
  G.state = 'playing';
};
