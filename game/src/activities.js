// Solara City — free-roam side activities: taxi fares and street races.
//
// Missions are the story; these are the living city. Drive a taxi and
// fares flag you down — pick them up with T and drop them off for cash.
// A checkered flag waits at the Marina: press T in a car to run a
// three-checkpoint street race against the clock. The race runner below
// is shared with the story race mission, so both play by the same rules.

// One race run: checkpoints in order, a countdown, and a prize.
SC.makeRaceRun = (cps, timeLimit) => ({ cps, idx: 0, timeLeft: timeLimit, limit: timeLimit });

// Returns 'done' when every checkpoint is hit, 'timeout' when the clock
// runs out (the run resets so the player can go again), else null.
SC.updateRaceRun = (G, race, dt, radius) => {
  race.timeLeft -= dt;
  if (race.timeLeft <= 0) {
    race.idx = 0;
    race.timeLeft = race.limit;
    SC.addMessage(G, 'Out of time — the race restarts!', '#e63946');
    return 'timeout';
  }
  const cp = race.cps[race.idx];
  if (SC.dist(G.player.x, G.player.y, cp[0], cp[1]) < (radius || 70)) {
    race.idx++;
    SC.audio.pickup();
    if (race.idx >= race.cps.length) return 'done';
    SC.addMessage(G, 'Checkpoint ' + race.idx + '/' + race.cps.length, '#ffd60a');
  }
  return null;
};

SC.drawRaceRun = (ctx, cam, G, race) => {
  const ox = cam.x - 640;
  const oy = cam.y - 360;
  race.cps.forEach((cp, i) => {
    const sx = cp[0] - ox;
    const sy = cp[1] - oy;
    if (sx < -60 || sx > 1340 || sy < -60 || sy > 780) return;
    const current = i === race.idx;
    const done = i < race.idx;
    const pulse = current ? 30 + Math.sin(G.time * 5) * 6 : 24;
    ctx.strokeStyle = done ? '#90be6d' : current ? '#ffd60a' : 'rgba(255,255,255,0.75)';
    ctx.lineWidth = current ? 5 : 3;
    ctx.beginPath();
    ctx.arc(sx, sy, pulse, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = done ? '#90be6d' : current ? '#ffd60a' : '#fff';
    ctx.font = 'bold 16px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(String(i + 1), sx, sy + 5);
  });
  // The clock.
  ctx.fillStyle = 'rgba(10,10,18,0.85)';
  ctx.fillRect(640 - 70, 12, 140, 34);
  ctx.fillStyle = race.timeLeft < 10 ? '#e63946' : '#fff';
  ctx.font = 'bold 20px Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(Math.ceil(race.timeLeft) + 's', 640, 37);
};

SC.RACE_FLAG = { x: 2420, y: 300 };
SC.RACE_CPS = [
  [920, 760],
  [1920, 1560],
  [420, 1960],
];

SC.fareSpot = (G) => {
  // A roadside point a short drive from the player.
  const vertical = Math.random() < 0.5;
  if (vertical) {
    const rx = SC.pick(Math.random, SC.ROADS_V);
    const side = Math.random() < 0.5 ? -62 : 62;
    const y = SC.clamp(G.player.y + SC.range(Math.random, -380, 380), 120, SC.BEACH_Y - 120);
    return { x: rx + side, y };
  }
  const ry = SC.pick(Math.random, SC.ROADS_H);
  const side = Math.random() < 0.5 ? -62 : 62;
  const x = SC.clamp(G.player.x + SC.range(Math.random, -380, 380), 120, SC.WORLD.w - 120);
  return { x, y: ry + side };
};

SC.fareDestination = (from) => {
  const spot = SC.fareSpot({ player: from });
  return { x: spot.x, y: spot.y };
};

SC.spawnFare = (G) => {
  const at = SC.fareSpot(G);
  const ped = SC.makePed(at.x, at.y, Math.random);
  ped.state = 'wait';
  G.peds.push(ped);
  const to = SC.fareDestination({ x: at.x, y: at.y });
  G.fare2 = { px: at.x, py: at.y, dx: to.x, dy: to.y, phase: 'wait', ped, pay: 120 + Math.floor(Math.random() * 130) };
  SC.addMessage(G, 'Taxi fare waiting — drive close and press T', '#ffd60a');
};

SC.updateActivities = (G, dt) => {
  if (G.state !== 'playing') return;
  const p = G.player;
  // --- Taxi fares: only while driving a taxi. ---
  if (p.inCar && p.inCar.kind === 'taxi') {
    if (!G.fare2) {
      G.fareCooldown -= dt;
      if (G.fareCooldown <= 0) SC.spawnFare(G);
    } else if (G.fare2.phase === 'wait') {
      if (SC.dist(p.x, p.y, G.fare2.px, G.fare2.py) < 64 && SC.input.wasPressed('KeyT')) {
        G.fare2.phase = 'ride';
        G.fare2.ped.state = 'riding';
        SC.addMessage(G, 'Passenger aboard — take them to the gold marker', '#ffd60a');
        SC.audio.pickup();
      }
    } else if (G.fare2.phase === 'ride') {
      if (SC.dist(p.x, p.y, G.fare2.dx, G.fare2.dy) < 90) {
        G.cash += G.fare2.pay;
        G.earned += G.fare2.pay;
        SC.addMessage(G, 'Fare paid +$' + G.fare2.pay, '#ffd60a');
        SC.audio.missionDone();
        G.fare2 = null;
        G.fareCooldown = 4;
      }
    }
  }
  // --- Street race flag at the Marina. ---
  if (p.inCar && !G.race2 && SC.dist(p.x, p.y, SC.RACE_FLAG.x, SC.RACE_FLAG.y) < 90) {
    if (SC.input.wasPressed('KeyT')) {
      G.race2 = SC.makeRaceRun(SC.RACE_CPS, 45);
      SC.addMessage(G, 'Street race! Three checkpoints, 45 seconds — $500', '#ffd60a');
      SC.audio.missionStart();
    }
  }
  if (G.race2) {
    const res = SC.updateRaceRun(G, G.race2, dt, 70);
    if (res === 'done') {
      G.cash += 500;
      G.earned += 500;
      SC.addBanner(G, 'RACE WON  +$500', 'The Marina crowd goes wild.');
      SC.audio.missionDone();
      G.race2 = null;
    }
  }
};

SC.drawActivities = (ctx, cam, G) => {
  const ox = cam.x - 640;
  const oy = cam.y - 360;
  // The checkered race flag at the Marina.
  const fx = SC.RACE_FLAG.x - ox;
  const fy = SC.RACE_FLAG.y - oy;
  if (fx > -40 && fx < 1320 && fy > -40 && fy < 760) {
    ctx.fillStyle = '#222';
    for (let i = 0; i < 4; i++) {
      for (let j = 0; j < 3; j++) {
        if ((i + j) % 2 === 0) ctx.fillRect(fx - 16 + i * 8, fy - 24 + j * 8, 8, 8);
      }
    }
    ctx.fillStyle = '#fff';
    for (let i = 0; i < 4; i++) {
      for (let j = 0; j < 3; j++) {
        if ((i + j) % 2 === 1) ctx.fillRect(fx - 16 + i * 8, fy - 24 + j * 8, 8, 8);
      }
    }
    ctx.strokeStyle = '#222';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(fx, fy);
    ctx.lineTo(fx, fy + 18);
    ctx.stroke();
    ctx.fillStyle = 'rgba(29,26,43,0.85)';
    ctx.font = 'bold 11px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('RACE', fx, fy + 32);
  }
  // Taxi fare markers: gold ring at the pickup, gold dot at the drop-off.
  if (G.fare2) {
    if (G.fare2.phase === 'wait') {
      const sx = G.fare2.px - ox;
      const sy = G.fare2.py - oy;
      const pulse = 26 + Math.sin(G.time * 5) * 6;
      ctx.strokeStyle = '#ffd60a';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(sx, sy, pulse, 0, Math.PI * 2);
      ctx.stroke();
    } else {
      const sx = G.fare2.dx - ox;
      const sy = G.fare2.dy - oy;
      ctx.fillStyle = '#ffd60a';
      ctx.beginPath();
      ctx.arc(sx, sy, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,214,10,0.12)';
      ctx.fillRect(sx - 3, sy - 400, 6, 400);
    }
  }
  if (G.race2) SC.drawRaceRun(ctx, cam, G, G.race2);
  if (G.race) SC.drawRaceRun(ctx, cam, G, G.race);
};

SC.drawActivityPrompts = (ctx, G) => {
  if (G.state !== 'playing') return;
  const p = G.player;
  let line = null;
  if (p.inCar && p.inCar.kind === 'taxi' && G.fare2 && G.fare2.phase === 'wait' && SC.dist(p.x, p.y, G.fare2.px, G.fare2.py) < 64) {
    line = 'TAXI FARE — press T to pick up';
  } else if (p.inCar && !G.race2 && SC.dist(p.x, p.y, SC.RACE_FLAG.x, SC.RACE_FLAG.y) < 90) {
    line = 'STREET RACE — press T to run the checkpoints ($500)';
  }
  if (!line) return;
  ctx.font = 'bold 15px Arial, sans-serif';
  ctx.textAlign = 'center';
  const w = ctx.measureText(line).width + 28;
  ctx.fillStyle = 'rgba(10,10,18,0.85)';
  ctx.fillRect((1280 - w) / 2, 720 - 96, w, 30);
  ctx.fillStyle = '#ffd60a';
  ctx.fillText(line, 640, 720 - 75);
};
