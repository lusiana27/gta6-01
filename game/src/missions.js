// Solara City — the story: five jobs for Milo Reyes, wheelman of the
// Sunset Crew. Each mission is a short chain of stages (go somewhere, get
// in a car, pick something up, lose the heat, deliver). Finishing a job
// pays cash; finishing all five means Milo owns Solara City.

SC.MISSIONS = [
  {
    id: 'first-wheels',
    title: '1 — First Wheels',
    intro: 'The crew needs wheels. Steal any car, then bring it to the Sunset Garage.',
    reward: 500,
    stages: [
      { type: 'enterCar', text: 'Steal any car (walk up to one and press E)' },
      { type: 'goto', x: 420, y: 360, r: 110, text: 'Drive the car to the Sunset Garage', inCar: true },
    ],
  },
  {
    id: 'the-pickup',
    title: '2 — The Pickup',
    intro: 'A package is waiting at the East Docks. Fetch it — on foot — and bring it home.',
    reward: 1200,
    stages: [
      { type: 'goto', x: 2700, y: 1560, r: 110, text: 'Drive to the East Docks' },
      { type: 'collect', x: 2680, y: 1500, r: 46, text: 'Get out and grab the package (walk over it)' },
      { type: 'goto', x: 420, y: 360, r: 110, text: 'Deliver the package to the Garage' },
    ],
  },
  {
    id: 'heat-on-the-strip',
    title: '3 — Heat on the Strip',
    intro: 'The SCPD made the crew. Lose the heat, then lay low at the Safehouse.',
    reward: 1500,
    heat: 2,
    stages: [
      { type: 'escape', text: 'Lose the cops — stay clean until the stars drop' },
      { type: 'goto', x: 920, y: 1960, r: 110, text: 'Reach the Safehouse' },
    ],
  },
  {
    id: 'the-bank-job',
    title: '4 — The Bank Job',
    intro: 'Solara Bank, three bags of cash, no alarms if you are quick. Get in, grab it, get out.',
    reward: 2400,
    bags: 3,
    stages: [
      { type: 'goto', x: 1420, y: 760, r: 130, text: 'Get to Solara Bank' },
      { type: 'bags', count: 3, text: 'Grab the cash bags (walk over them)' },
      { type: 'goto', x: 420, y: 360, r: 110, text: 'Escape to the Sunset Garage' },
    ],
  },
  {
    id: 'the-big-score',
    title: '5 — The Big Score',
    intro: 'A gold convertible sits at the Marina, keys in it, owner nowhere. Take it to the Docks.',
    reward: 5000,
    heat: 3,
    stages: [
      { type: 'stealGold', text: 'Steal the gold convertible at the Marina (press E)' },
      { type: 'goto', x: 2700, y: 1560, r: 110, text: 'Deliver the gold car to the East Docks', inCar: true },
    ],
  },
];

SC.startMission = (G, index) => {
  const m = SC.MISSIONS[index];
  if (!m) {
    G.state = 'complete';
    SC.saveBest(G);
    return;
  }
  G.missionIndex = index;
  G.mission = m;
  G.missionStage = 0;
  G.missionBags = 0;
  if (m.heat) {
    G.wanted = m.heat;
    G.crimeTimer = 0;
    SC.audio.sirenStart();
  }
  if (m.bags) {
    // Cash bags on the plaza around the bank (outside the building itself,
    // so Milo can actually walk over them).
    const spots = [
      { x: 1470, y: 1000 },
      { x: 1780, y: 860 },
      { x: 1620, y: 1010 },
    ];
    for (const s of spots) G.pickups.push({ x: s.x, y: s.y, kind: 'cash', value: 800, taken: false });
  }
  if (m.id === 'the-pickup') {
    G.pickups.push({ x: 2680, y: 1500, kind: 'package', value: 0, taken: false });
  }
  SC.addBanner(G, m.title, m.intro);
  SC.audio.missionStart();
};

SC.currentStage = (G) => {
  if (!G.mission) return null;
  return G.mission.stages[G.missionStage] || null;
};

SC.updateMissions = (G, dt) => {
  const stage = SC.currentStage(G);
  if (!stage || G.state !== 'playing') return;
  const p = G.player;
  const at = (x, y, r) => SC.dist(p.x, p.y, x, y) < r;

  let done = false;
  if (stage.type === 'enterCar') {
    done = !!p.inCar;
  } else if (stage.type === 'goto') {
    done = at(stage.x, stage.y, stage.r) && (!stage.inCar || p.inCar);
  } else if (stage.type === 'collect') {
    done = !p.inCar && at(stage.x, stage.y, stage.r);
    if (done) {
      const pk = G.pickups.find((u) => u.kind === 'package' && !u.taken);
      if (pk) {
        pk.taken = true;
        SC.audio.pickup();
      }
    }
  } else if (stage.type === 'escape') {
    done = G.wanted === 0;
  } else if (stage.type === 'bags') {
    done = G.missionBags >= stage.count;
  } else if (stage.type === 'stealGold') {
    done = !!p.inCar && p.inCar.goldCar === true;
    if (done) {
      G.wanted = 3;
      G.crimeTimer = 0;
      SC.audio.sirenStart();
      SC.addMessage(G, 'The whole city is after that car!', '#e63946');
    }
  }

  if (done) {
    G.missionStage++;
    SC.audio.pickup();
    if (G.missionStage >= G.mission.stages.length) {
      G.cash += G.mission.reward;
      SC.addBanner(G, 'JOB DONE  +$' + G.mission.reward, G.mission.title + ' — the crew is happy.');
      SC.audio.missionDone();
      SC.saveGame(G);
      SC.startMission(G, G.missionIndex + 1);
    }
  }
};

// Cash and ammo pickups lying in the world.
SC.updatePickups = (G, dt) => {
  const p = G.player;
  for (const pk of G.pickups) {
    if (pk.taken) continue;
    if (SC.dist(p.x, p.y, pk.x, pk.y) < 34) {
      if (pk.kind === 'cash') {
        pk.taken = true;
        G.cash += pk.value;
        G.missionBags++;
        SC.addMessage(G, 'Cash bag  +$' + pk.value, '#ffd60a');
        SC.audio.pickup();
      } else if (pk.kind === 'ammo') {
        pk.taken = true;
        G.ammo += 12;
        SC.addMessage(G, 'Ammo  +12', '#90be6d');
        SC.audio.pickup();
      } else if (pk.kind === 'health') {
        pk.taken = true;
        p.health = Math.min(100, p.health + 40);
        SC.addMessage(G, 'Patched up  +40 HP', '#90be6d');
        SC.audio.pickup();
      }
    }
  }
  G.pickups = G.pickups.filter((pk) => !pk.taken);
};

SC.drawPickups = (ctx, cam, G) => {
  for (const pk of G.pickups) {
    if (pk.taken) continue;
    const sx = pk.x - (cam.x - 640);
    const sy = pk.y - (cam.y - 360);
    if (sx < -30 || sx > 1310 || sy < -30 || sy > 750) continue;
    const bob = Math.sin(G.time * 4 + pk.x) * 3;
    if (pk.kind === 'cash') {
      ctx.fillStyle = '#2b9348';
      ctx.fillRect(sx - 12, sy - 8 + bob, 24, 16);
      ctx.fillStyle = '#ffd60a';
      ctx.font = 'bold 11px Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('$', sx, sy + 4 + bob);
    } else if (pk.kind === 'package') {
      ctx.fillStyle = '#b08968';
      ctx.fillRect(sx - 11, sy - 11 + bob, 22, 22);
      ctx.strokeStyle = '#6c4a2f';
      ctx.lineWidth = 2;
      ctx.strokeRect(sx - 11, sy - 11 + bob, 22, 22);
    } else if (pk.kind === 'ammo') {
      ctx.fillStyle = '#444';
      ctx.fillRect(sx - 9, sy - 6 + bob, 18, 12);
      ctx.fillStyle = '#ffd60a';
      ctx.fillRect(sx - 5, sy - 9 + bob, 3, 18);
      ctx.fillRect(sx + 2, sy - 9 + bob, 3, 18);
    } else if (pk.kind === 'health') {
      ctx.fillStyle = '#fff';
      ctx.fillRect(sx - 11, sy - 11 + bob, 22, 22);
      ctx.fillStyle = '#e63946';
      ctx.fillRect(sx - 3, sy - 8 + bob, 6, 16);
      ctx.fillRect(sx - 8, sy - 3 + bob, 16, 6);
    }
  }
};
