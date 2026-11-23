// missions.js — the 12-mission story of Sunport City.
// A tiny data-driven engine: each mission is a list of objectives
// (goto / drive / pickup / deliver / race / steal / lose / survive).
// Completing a mission pays cash, unlocks the next one and saves the game.

import { PLACES } from './city.js';
import { makeCar } from './entities.js';
import { addWanted } from './police.js';

export const MISSIONS = [
  {
    id: 1, name: 'FIRST WHEELS', giver: 'MARA VOSS', reward: 500,
    brief: 'Mara needs wheels. Steal the parked sedan by the garage, then bring it to her.',
    steps: [
      { kind: 'steal', label: 'Steal the sedan', x: 860, y: 560, r: 60 },
      { kind: 'drive', label: 'Drive it to the garage', x: 800, y: 480, r: 70 },
    ],
  },
  {
    id: 2, name: 'TAXI RUSH', giver: 'CAB CO.', reward: 800,
    brief: 'A fare is waiting at the taxi stand. Pick them up and get them to the Grand Marina Hotel. Fast.',
    steps: [
      { kind: 'pickup', label: 'Pick up the fare', x: 800, y: 1120, r: 60 },
      { kind: 'deliver', label: 'Drop them at the hotel', x: 1440, y: 480, r: 70, time: 90 },
    ],
  },
  {
    id: 3, name: 'BEACH DASH', giver: 'RICO', reward: 1200,
    brief: 'Street race down Palm Beach. Hit every checkpoint before the clock runs out.',
    steps: [
      { kind: 'race', label: 'Race the beach checkpoints', time: 75, points: [[170, 400], [170, 900], [170, 1500], [170, 2100]] },
    ],
  },
  {
    id: 4, name: 'AIRPORT RUN', giver: 'MARA VOSS', reward: 1500,
    brief: 'A package lands at Sunport Intl. Collect it and bring it downtown. No questions.',
    steps: [
      { kind: 'goto', label: 'Reach the airport', x: 2720, y: 2080, r: 80 },
      { kind: 'pickup', label: 'Collect the package', x: 2720, y: 2080, r: 60 },
      { kind: 'deliver', label: 'Deliver it downtown', x: 1440, y: 800, r: 70, time: 120 },
    ],
  },
  {
    id: 5, name: 'GETAWAY CAR', giver: 'RICO', reward: 2000,
    brief: 'The crew needs a fast car. Lift the sports coupe outside the Neon Palms Casino and lose the heat.',
    startWanted: 2,
    steps: [
      { kind: 'steal', label: 'Steal the sports coupe', x: 2720, y: 620, r: 60 },
      { kind: 'drive', label: 'Bring it to the garage', x: 800, y: 480, r: 70 },
    ],
  },
  {
    id: 6, name: 'PORT SMUGGLE', giver: 'THE FIXER', reward: 2500,
    brief: 'A crate at the container port. Haul it to Warehouse 7. The cops are already sniffing around.',
    startWanted: 2,
    steps: [
      { kind: 'pickup', label: 'Grab the crate at the port', x: 480, y: 2400, r: 70 },
      { kind: 'deliver', label: 'Deliver it to Warehouse 7', x: 1120, y: 2080, r: 70, time: 150 },
    ],
  },
  {
    id: 7, name: 'MIDNIGHT GETAWAY', giver: 'MARA VOSS', reward: 3000,
    brief: 'Three stars and the whole city hunting you. Shake every cop and go dark.',
    startWanted: 3,
    steps: [
      { kind: 'lose', label: 'Lose the cops', time: 60 },
    ],
  },
  {
    id: 8, name: 'DOWNTOWN DELIVERY', giver: 'CAB CO.', reward: 3500,
    brief: 'Three drops across downtown, two minutes on the clock. The meter is running.',
    steps: [
      { kind: 'deliver', label: 'Drop 1 of 3 — Palm Court', x: 1120, y: 800, r: 60, time: 120 },
      { kind: 'deliver', label: 'Drop 2 of 3 — Market St', x: 1760, y: 1120, r: 60 },
      { kind: 'deliver', label: 'Drop 3 of 3 — Marina Walk', x: 1440, y: 1440, r: 60 },
    ],
  },
  {
    id: 9, name: 'HIGH ROLLER', giver: 'RICO', reward: 4000,
    brief: 'Rico bet the house on you. Beat the clock through five downtown checkpoints.',
    steps: [
      { kind: 'race', label: 'Beat the clock — 5 checkpoints', time: 90, points: [[1120, 480], [1760, 480], [2080, 800], [2080, 1440], [1440, 1440]] },
    ],
  },
  {
    id: 10, name: 'EVIDENCE BURN', giver: 'THE FIXER', reward: 5000,
    brief: 'Lift the evidence file from Sunport PD HQ, then vanish to the safehouse. Four stars, no mistakes.',
    startWanted: 4,
    steps: [
      { kind: 'pickup', label: 'Grab the evidence at PD HQ', x: 2080, y: 1440, r: 70 },
      { kind: 'deliver', label: 'Reach the safehouse', x: 480, y: 2080, r: 70 },
    ],
  },
  {
    id: 11, name: 'THE BIG SCORE', giver: 'MARA VOSS', reward: 8000,
    brief: 'The Neon Palms vault. Five stars, the Air One chopper, roadblocks — and a safehouse waiting.',
    startWanted: 5,
    steps: [
      { kind: 'pickup', label: 'Hit the casino vault', x: 2720, y: 480, r: 80 },
      { kind: 'deliver', label: 'Escape to the safehouse', x: 480, y: 2080, r: 80, time: 180 },
    ],
  },
  {
    id: 12, name: 'KING OF SUNPORT', giver: 'RICO', reward: 12000,
    brief: 'The final run. Six checkpoints across the whole city, three stars on your tail. Win this and the city is yours.',
    startWanted: 3,
    steps: [
      { kind: 'race', label: 'Final run — 6 checkpoints', time: 180, points: [[480, 480], [2720, 480], [2720, 2080], [480, 2400], [1440, 1120], [800, 800]] },
    ],
  },
];

export function startMission(S, idx) {
  const m = MISSIONS[idx];
  if (!m) return;
  S.mission = { idx, step: 0, t: 0, cpIdx: 0, passenger: false, package: false, targetCar: null, active: true, done: false, failed: false };
  S.flash = `MISSION ${m.id}: ${m.name} — ${m.giver}`;
  S.flashT = 3.5;
  S.missionBrief = m.brief;
  S.missionBriefT = 6;
  if (m.startWanted) addWanted(S, m.startWanted, 'MISSION HEAT');
  S.audio.sfx('mission');
}

export function currentStep(S) {
  if (!S.mission || !S.mission.active) return null;
  return MISSIONS[S.mission.idx].steps[S.mission.step] || null;
}

/** Where the objective arrow and minimap marker should point. */
export function missionTarget(S) {
  const step = currentStep(S);
  if (!step) return null;
  if (step.kind === 'race') {
    const p = step.points[S.mission.cpIdx];
    return p ? { x: p[0], y: p[1], label: step.label } : null;
  }
  if (step.kind === 'lose' || step.kind === 'survive') return null;
  return { x: step.x, y: step.y, label: step.label };
}

function distTo(S, x, y) {
  const p = S.player;
  const cx = p.onFoot ? p.x : p.car.x;
  const cy = p.onFoot ? p.y : p.car.y;
  return Math.hypot(cx - x, cy - y);
}

function advanceStep(S) {
  const m = MISSIONS[S.mission.idx];
  S.mission.step++;
  S.mission.t = 0;
  S.mission.cpIdx = 0;
  if (S.mission.step >= m.steps.length) completeMission(S);
  else S.audio.sfx('checkpoint');
}

function completeMission(S) {
  const m = MISSIONS[S.mission.idx];
  S.money += m.reward;
  S.missionsDone = Math.max(S.missionsDone, m.id);
  S.mission.active = false;
  S.mission.done = true;
  S.missionDoneT = 4;
  S.missionDoneName = m.name;
  S.missionDoneReward = m.reward;
  S.flash = `MISSION PASSED — ${m.name}  +$${m.reward}`;
  S.flashT = 4;
  S.audio.sfx('pass');
  if (m.id === 12) S.allMissionsDone = true;
  S.saveGame();
}

export function failMission(S, why) {
  if (!S.mission || !S.mission.active) return;
  S.mission.active = false;
  S.mission.failed = true;
  S.flash = `MISSION FAILED — ${why}`;
  S.flashT = 3.5;
  S.audio.sfx('fail');
}

/** Called every frame while a mission is active. */
export function updateMission(S, dt) {
  const M = S.mission;
  if (!M || !M.active) return;
  const step = currentStep(S);
  if (!step) return;
  M.t += dt;
  if (step.time && M.t > step.time) { failMission(S, 'OUT OF TIME'); return; }
  switch (step.kind) {
    case 'goto':
      if (distTo(S, step.x, step.y) < step.r) advanceStep(S);
      break;
    case 'drive':
      if (!S.player.onFoot && distTo(S, step.x, step.y) < step.r) advanceStep(S);
      break;
    case 'pickup':
      if (distTo(S, step.x, step.y) < step.r) {
        M.package = true;
        M.passenger = true;
        S.audio.sfx('pickup');
        advanceStep(S);
      }
      break;
    case 'deliver':
      if (M.package && distTo(S, step.x, step.y) < step.r) {
        M.package = false;
        M.passenger = false;
        advanceStep(S);
      }
      break;
    case 'steal': {
      if (!M.targetCar) {
        const c = makeCar(step.x, step.y, -Math.PI / 2, 'target', 1);
        c.color = '#e8c840';
        S.cars.push(c);
        M.targetCar = c;
      }
      if (S.player.car === M.targetCar) {
        addWanted(S, 1, 'GRAND THEFT AUTO');
        advanceStep(S);
      }
      break;
    }
    case 'race': {
      const p = step.points[M.cpIdx];
      if (p && distTo(S, p[0], p[1]) < 80) {
        M.cpIdx++;
        S.audio.sfx('checkpoint');
        if (M.cpIdx >= step.points.length) advanceStep(S);
      }
      break;
    }
    case 'lose':
      if (S.wanted === 0) advanceStep(S);
      break;
    case 'survive':
      if (M.t > step.time) advanceStep(S);
      break;
  }
}

/** Yellow mission markers, checkpoint rings and the objective arrow. */
export function drawMissionMarkers(ctx, S, cam) {
  const M = S.mission;
  const step = currentStep(S);
  if (M && M.active && step) {
    const t = performance.now() / 300;
    if (step.kind === 'race') {
      step.points.forEach((p, i) => {
        const x = p[0] - cam.x, y = p[1] - cam.y;
        if (x < -60 || y < -60 || x > 1340 || y > 860) return;
        const done = i < M.cpIdx;
        const next = i === M.cpIdx;
        ctx.strokeStyle = done ? '#40c060' : next ? '#ffd23a' : 'rgba(255,210,58,0.45)';
        ctx.lineWidth = next ? 5 : 3;
        ctx.beginPath(); ctx.arc(x, y, next ? 46 + Math.sin(t) * 5 : 42, 0, Math.PI * 2); ctx.stroke();
        ctx.fillStyle = done ? '#40c060' : '#ffd23a';
        ctx.font = 'bold 15px Arial'; ctx.textAlign = 'center';
        ctx.fillText(String(i + 1), x, y + 5);
      });
    } else if (step.x !== undefined) {
      const x = step.x - cam.x, y = step.y - cam.y;
      if (x > -80 && y > -80 && x < 1360 && y < 880) {
        const r = 34 + Math.sin(t) * 6;
        ctx.strokeStyle = '#ffd23a';
        ctx.lineWidth = 4;
        ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.stroke();
        ctx.fillStyle = 'rgba(255,210,58,0.25)';
        ctx.beginPath(); ctx.arc(x, y, r - 6, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#ffd23a';
        ctx.beginPath();
        ctx.moveTo(x, y - 26); ctx.lineTo(x + 10, y - 8); ctx.lineTo(x - 10, y - 8);
        ctx.closePath(); ctx.fill();
      }
    }
  }
  // next-mission start marker (yellow M) when idle
  if ((!M || !M.active) && S.missionsDone < 12) {
    const next = MISSIONS[S.missionsDone];
    const s0 = next.steps[0];
    const mx = s0.x !== undefined ? s0.x : (s0.points ? s0.points[0][0] : PLACES.start.x);
    const my = s0.y !== undefined ? s0.y : (s0.points ? s0.points[0][1] : PLACES.start.y);
    const x = mx - cam.x, y = my - cam.y;
    if (x > -40 && y > -40 && x < 1320 && y < 840) {
      ctx.fillStyle = '#ffd23a';
      ctx.font = 'bold 22px Arial'; ctx.textAlign = 'center';
      ctx.fillText('M', x, y - 18);
      ctx.font = 'bold 11px Arial';
      ctx.fillText(`MISSION ${next.id}: ${next.name}`, x, y - 34);
    }
  }
}
