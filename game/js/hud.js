// hud.js — everything the player sees on top of the world: wanted stars,
// health and armour bars, cash, clock, radio, speed, the minimap, the mission
// objective, flash messages, and the start / pause / busted / wasted screens.

import { drawMinimapBase, clockText, WORLD_W, WORLD_H } from './city.js';
import { MISSIONS, missionTarget } from './missions.js';
import { WANTED_NAMES } from './police.js';

function drawStars(ctx, n, x, y) {
  for (let i = 0; i < 5; i++) {
    ctx.fillStyle = i < n ? '#ffd23a' : 'rgba(255,255,255,0.25)';
    ctx.strokeStyle = 'rgba(0,0,0,0.7)';
    ctx.lineWidth = 1;
    const cx = x + i * 30, cy = y;
    ctx.beginPath();
    for (let k = 0; k < 5; k++) {
      const a = -Math.PI / 2 + (k * 4 * Math.PI) / 5;
      const px = cx + Math.cos(a) * 11, py = cy + Math.sin(a) * 11;
      if (k === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
}

function bar(ctx, x, y, w, h, frac, color, bg) {
  ctx.fillStyle = bg || 'rgba(0,0,0,0.55)';
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = color;
  ctx.fillRect(x + 1, y + 1, Math.max(0, (w - 2) * Math.max(0, Math.min(1, frac))), h - 2);
  ctx.strokeStyle = 'rgba(255,255,255,0.5)';
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 0.5, y + 0.5, w, h);
}

export function drawHUD(ctx, S) {
  const p = S.player;
  // --- top left: wanted stars + health/armor ---
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  ctx.fillRect(14, 8, 200, 122);
  ctx.textAlign = 'left';
  drawStars(ctx, S.wanted, 26, 30);
  if (S.wanted > 0) {
    ctx.fillStyle = '#ffd23a';
    ctx.font = 'bold 12px Arial';
    ctx.fillText(WANTED_NAMES[S.wanted], 26, 52);
  }
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 11px Arial';
  ctx.fillText('HEALTH', 26, 74);
  bar(ctx, 26, 80, 170, 12, p.health / 100, p.health > 30 ? '#40d060' : '#e04040');
  ctx.fillText('ARMOR', 26, 108);
  bar(ctx, 26, 114, 170, 12, p.armor / 100, '#60a0e0');
  // --- top right: money, clock, radio ---
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  ctx.fillRect(1040, 8, 224, 82);
  ctx.textAlign = 'right';
  ctx.fillStyle = '#7dff8a';
  ctx.font = 'bold 26px Arial';
  ctx.fillText(`$${S.money.toLocaleString('en-US')}`, 1254, 38);
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 16px Arial';
  ctx.fillText(`${clockText(S.clock)}  ${S.dayNight}`, 1254, 62);
  ctx.fillStyle = '#ffd23a';
  ctx.font = 'bold 13px Arial';
  ctx.fillText(`♪ ${S.audio.stationName()} ${S.audio.muted ? '(MUTED)' : ''}`, 1254, 82);
  // --- bottom left: minimap ---
  const mmX = 24, mmY = 800 - 24 - 150, mmW = 200, mmH = 150;
  drawMinimapBase(ctx, S.city, mmX, mmY, mmW, mmH);
  ctx.strokeStyle = 'rgba(255,255,255,0.7)';
  ctx.lineWidth = 2;
  ctx.strokeRect(mmX, mmY, mmW, mmH);
  const sx = mmW / WORLD_W, sy = mmH / WORLD_H;
  // mission target on minimap
  const tgt = missionTarget(S);
  if (tgt) {
    ctx.fillStyle = '#ffd23a';
    ctx.beginPath(); ctx.arc(mmX + tgt.x * sx, mmY + tgt.y * sy, 5, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 1;
    ctx.stroke();
  }
  // cops on minimap
  ctx.fillStyle = '#4080ff';
  for (const c of S.cops) {
    ctx.beginPath(); ctx.arc(mmX + c.x * sx, mmY + c.y * sy, 3, 0, Math.PI * 2); ctx.fill();
  }
  // traffic dots
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  for (const c of S.cars) {
    if (c.kind !== 'traffic') continue;
    ctx.fillRect(mmX + c.x * sx - 1, mmY + c.y * sy - 1, 2, 2);
  }
  // player arrow on minimap
  const px = mmX + p.x * sx, py = mmY + p.y * sy;
  ctx.save();
  ctx.translate(px, py);
  ctx.rotate(p.angle);
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.moveTo(8, 0); ctx.lineTo(-6, -5); ctx.lineTo(-6, 5);
  ctx.closePath(); ctx.fill();
  ctx.restore();
  // --- bottom right: speed ---
  if (!p.onFoot && p.car) {
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.fillRect(1090, 688, 174, 82);
    ctx.textAlign = 'right';
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 34px Arial';
    ctx.fillText(`${Math.round(Math.abs(p.car.speed) * 0.36)}`, 1254, 740);
    ctx.font = 'bold 13px Arial';
    ctx.fillStyle = '#c0c8d8';
    ctx.fillText('km/h', 1254, 760);
    ctx.fillStyle = '#ffd23a';
    ctx.font = 'bold 13px Arial';
    ctx.fillText(p.car.name.toUpperCase(), 1254, 700);
  }
  // --- bottom centre: mission objective ---
  const step = S.mission && S.mission.active ? MISSIONS[S.mission.idx].steps[S.mission.step] : null;
  if (step) {
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    const label = `MISSION ${MISSIONS[S.mission.idx].id} — ${step.label}`;
    const w = ctx.measureText(label).width + 28;
    ctx.fillRect(640 - w / 2, 748, w, 26);
    ctx.fillStyle = '#ffd23a';
    ctx.font = 'bold 14px Arial';
    ctx.fillText(label, 640, 766);
    if (step.time) {
      const left = Math.max(0, step.time - S.mission.t);
      ctx.fillStyle = left < 15 ? '#ff5040' : '#fff';
      ctx.font = 'bold 15px Arial';
      ctx.fillText(`${Math.ceil(left)}s`, 640, 742);
    }
  } else if (S.missionsDone < 12) {
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    const label = `Go to the yellow M — MISSION ${MISSIONS[S.missionsDone].id}: ${MISSIONS[S.missionsDone].name}  (Enter to start)`;
    const w = ctx.measureText(label).width + 28;
    ctx.fillRect(640 - w / 2, 748, w, 26);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 13px Arial';
    ctx.fillText(label, 640, 766);
  } else {
    ctx.textAlign = 'center';
    ctx.fillStyle = '#7dff8a';
    ctx.font = 'bold 15px Arial';
    ctx.fillText('★ KING OF SUNPORT — ALL 12 MISSIONS COMPLETE ★', 640, 762);
  }
  // --- flash message ---
  if (S.flashT > 0) {
    ctx.textAlign = 'center';
    ctx.font = 'bold 22px Arial';
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    const w = ctx.measureText(S.flash).width + 36;
    ctx.fillRect(640 - w / 2, 92, w, 36);
    ctx.fillStyle = '#ffd23a';
    ctx.fillText(S.flash, 640, 117);
  }
  // --- mission brief card ---
  if (S.missionBriefT > 0 && S.missionBrief) {
    ctx.textAlign = 'left';
    ctx.fillStyle = 'rgba(0,0,0,0.65)';
    ctx.fillRect(300, 140, 680, 74);
    ctx.strokeStyle = '#ffd23a';
    ctx.lineWidth = 2;
    ctx.strokeRect(300, 140, 680, 74);
    ctx.fillStyle = '#ffd23a';
    ctx.font = 'bold 14px Arial';
    ctx.fillText('NEW MISSION', 318, 164);
    ctx.fillStyle = '#fff';
    ctx.font = '14px Arial';
    wrapText(ctx, S.missionBrief, 318, 186, 644, 18);
  }
  // --- mission passed banner ---
  if (S.missionDoneT > 0) {
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect(390, 300, 500, 110);
    ctx.strokeStyle = '#7dff8a';
    ctx.lineWidth = 3;
    ctx.strokeRect(390, 300, 500, 110);
    ctx.fillStyle = '#7dff8a';
    ctx.font = 'bold 30px Arial';
    ctx.fillText('MISSION PASSED', 640, 345);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 18px Arial';
    ctx.fillText(`${S.missionDoneName}   +$${S.missionDoneReward}`, 640, 378);
  }
  // --- busted / wasted ---
  if (S.busted) {
    ctx.fillStyle = 'rgba(20,20,60,0.75)';
    ctx.fillRect(0, 0, 1280, 800);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#6080ff';
    ctx.font = 'bold 64px Arial';
    ctx.fillText('BUSTED', 640, 380);
    ctx.fillStyle = '#fff';
    ctx.font = '18px Arial';
    ctx.fillText('The cops took you in. Bail cost you $300. Press Enter to get out.', 640, 420);
  }
  if (S.wasted) {
    ctx.fillStyle = 'rgba(60,10,10,0.75)';
    ctx.fillRect(0, 0, 1280, 800);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ff5040';
    ctx.font = 'bold 64px Arial';
    ctx.fillText('WASTED', 640, 380);
    ctx.fillStyle = '#fff';
    ctx.font = '18px Arial';
    ctx.fillText('You woke up at Sunport General, $500 lighter. Press Enter to continue.', 640, 420);
  }
  // --- objective arrow at screen edge ---
  if (tgt) {
    const px2 = p.onFoot ? p.x : p.car.x;
    const py2 = p.onFoot ? p.y : p.car.y;
    const dx = tgt.x - px2, dy = tgt.y - py2;
    const d = Math.hypot(dx, dy);
    if (d > 520) {
      const ang = Math.atan2(dy, dx);
      const ax = 640 + Math.cos(ang) * 300;
      const ay = 400 + Math.sin(ang) * 220;
      ctx.save();
      ctx.translate(ax, ay);
      ctx.rotate(ang);
      ctx.fillStyle = '#ffd23a';
      ctx.beginPath();
      ctx.moveTo(16, 0); ctx.lineTo(-10, -10); ctx.lineTo(-10, 10);
      ctx.closePath(); ctx.fill();
      ctx.restore();
      ctx.textAlign = 'center';
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 12px Arial';
      ctx.fillText(`${Math.round(d)}m`, ax, ay + 26);
    }
  }
}

function wrapText(ctx, text, x, y, maxW, lh) {
  const words = text.split(' ');
  let line = '';
  let yy = y;
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (ctx.measureText(test).width > maxW) {
      ctx.fillText(line, x, yy);
      line = w;
      yy += lh;
    } else line = test;
  }
  ctx.fillText(line, x, yy);
}

/** Full-screen menu screens. `kind` is 'start' or 'pause'. */
export function drawMenu(ctx, S, kind) {
  ctx.fillStyle = 'rgba(4,6,14,0.82)';
  ctx.fillRect(0, 0, 1280, 800);
  ctx.textAlign = 'center';
  // sun + skyline silhouette
  ctx.fillStyle = '#ff9a3a';
  ctx.beginPath(); ctx.arc(640, 210, 64, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#ff5a7a';
  ctx.beginPath(); ctx.arc(640, 210, 44, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#0e1526';
  const skyline = [90, 150, 110, 190, 130, 170, 100, 210, 140, 120, 180, 100, 160];
  let sx = 240;
  for (const h of skyline) {
    ctx.fillRect(sx, 300 - h, 62, h + 200);
    sx += 64;
  }
  ctx.fillStyle = '#ffd23a';
  ctx.font = 'bold 15px Arial';
  ctx.fillText('★ 12 MISSIONS · 5-STAR WANTED · AIR ONE HELICOPTER · ROADBLOCKS · TAXI & STREET RACES ★', 640, 330);
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 76px Arial';
  ctx.fillText('SUNPORT CITY', 640, 420);
  ctx.fillStyle = '#ffd23a';
  ctx.font = 'bold 22px Arial';
  ctx.fillText('AN OPEN-WORLD CRIME GAME', 640, 452);
  ctx.fillStyle = '#c0c8d8';
  ctx.font = '15px Arial';
  ctx.fillText('Steal cars, outrun the Sunport PD, run 12 missions from Mara Voss, Rico and The Fixer,', 640, 500);
  ctx.fillText('and take the city — from Palm Beach to the Neon Palms Casino.', 640, 522);
  if (kind === 'start') {
    ctx.fillStyle = '#7dff8a';
    ctx.font = 'bold 20px Arial';
    ctx.fillText('PRESS ENTER TO START', 640, 580);
    ctx.fillStyle = '#8fa3c0';
    ctx.font = '14px Arial';
    ctx.fillText('WASD walk / drive · E enter & exit car · F punch · Mouse click to shoot (buy a pistol at Ironworks Guns)', 640, 612);
    ctx.fillText('Q switch radio · M mute · S save game · P pause · Near a shop, press E to use it', 640, 634);
    if (S.hasSave) {
      ctx.fillStyle = '#ffd23a';
      ctx.font = 'bold 15px Arial';
      ctx.fillText('Saved game found — press L to LOAD it, or Enter for a new game', 640, 668);
    }
    ctx.fillStyle = '#8fa3c0';
    ctx.font = '13px Arial';
    ctx.fillText('Missions pay up to $12,000 · Shops: Sunport Garage (repair) · Palm Diner (health) · Ironworks Guns (pistol $1,000)', 640, 700);
  } else {
    ctx.fillStyle = '#7dff8a';
    ctx.font = 'bold 20px Arial';
    ctx.fillText('PAUSED — PRESS P OR ENTER TO RESUME', 640, 580);
    ctx.fillStyle = '#c0c8d8';
    ctx.font = '15px Arial';
    ctx.fillText(`Missions complete: ${S.missionsDone} / 12   ·   Cash: $${S.money.toLocaleString('en-US')}   ·   Wanted: ${S.wanted} star${S.wanted === 1 ? '' : 's'}`, 640, 612);
    ctx.fillText('S save game · Esc back to menu', 640, 640);
  }
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  ctx.font = '12px Arial';
  ctx.fillText('Sunport City is an original game. Not affiliated with Rockstar Games or Grand Theft Auto.', 640, 770);
}
