// Solara City — HUD, minimap, banners and menus.
//
// Everything the player reads: cash and health top-left, wanted stars
// top-right, the mission objective bottom-centre, a live minimap
// bottom-left, and the start / pause / busted / complete screens.

SC.addBanner = (G, title, sub) => {
  G.banner = { title, sub: sub || '', until: G.time + 4.2 };
};

SC.addMessage = (G, text, color) => {
  G.messages.push({ text, color: color || '#fff', until: G.time + 3 });
  if (G.messages.length > 4) G.messages.shift();
};

SC.drawMinimap = (ctx, G) => {
  const mw = 208;
  const mh = 152;
  const mx = 16;
  const my = 720 - mh - 16;
  const sx = mw / SC.WORLD.w;
  const sy = mh / SC.WORLD.h;
  ctx.fillStyle = 'rgba(10,10,18,0.85)';
  ctx.fillRect(mx - 4, my - 4, mw + 8, mh + 8);
  ctx.fillStyle = '#86b364';
  ctx.fillRect(mx, my, mw, mh);
  ctx.fillStyle = '#2a9d8f';
  ctx.fillRect(mx, my + SC.BEACH_Y * sy, mw, mh - SC.BEACH_Y * sy);
  ctx.fillStyle = '#4a4557';
  for (const rx of SC.ROADS_V) ctx.fillRect(mx + rx * sx - 2, my, 4, mh);
  for (const ry of SC.ROADS_H) ctx.fillRect(mx, my + ry * sy - 2, mw, 4);
  // Mission target.
  const stage = SC.currentStage(G);
  if (stage && (stage.x !== undefined || stage.type === 'bags')) {
    const tx = stage.x !== undefined ? stage.x : 1420;
    const ty = stage.y !== undefined ? stage.y : 760;
    const pulse = 3 + Math.sin(G.time * 5) * 2;
    ctx.fillStyle = '#ffd60a';
    ctx.beginPath();
    ctx.arc(mx + tx * sx, my + ty * sy, pulse + 3, 0, Math.PI * 2);
    ctx.fill();
  }
  // Police, then the player.
  ctx.fillStyle = '#2e6bff';
  for (const car of G.cars) {
    if (car.driver !== 'police') continue;
    ctx.fillRect(mx + car.x * sx - 2, my + car.y * sy - 2, 4, 4);
  }
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(mx + G.player.x * sx, my + G.player.y * sy, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#ffd60a';
  ctx.lineWidth = 1.5;
  ctx.stroke();
};

SC.drawHUD = (ctx, G) => {
  const p = G.player;
  // Top-left: cash, health, and the job count.
  ctx.fillStyle = 'rgba(10,10,18,0.85)';
  ctx.fillRect(12, 12, 250, 84);
  ctx.fillStyle = '#ffd60a';
  ctx.font = 'bold 24px Arial, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('$' + G.cash.toLocaleString('en-US'), 24, 40);
  ctx.fillStyle = '#222';
  ctx.fillRect(24, 52, 180, 12);
  ctx.fillStyle = p.health > 40 ? '#90be6d' : '#e63946';
  ctx.fillRect(24, 52, 180 * (p.health / 100), 12);
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 11px Arial, sans-serif';
  ctx.fillText('HP ' + Math.ceil(p.health), 210, 62);
  ctx.fillStyle = '#ffd60a';
  ctx.font = 'bold 12px Arial, sans-serif';
  ctx.fillText('JOB ' + (G.missionIndex + 1) + '/' + SC.MISSIONS.length + '   ·   HAUL $' + G.earned.toLocaleString('en-US'), 24, 86);
  // Ammo and speed, on a dark pill so it reads over any ground.
  ctx.font = 'bold 15px Arial, sans-serif';
  const speedText = p.inCar ? 'SPEED ' + Math.round(Math.abs(p.inCar.speed) * 0.24) + ' mph' : 'AMMO ' + G.ammo;
  ctx.fillStyle = 'rgba(10,10,18,0.7)';
  ctx.fillRect(12, 100, ctx.measureText(speedText).width + 24, 24);
  ctx.fillStyle = '#fff';
  ctx.fillText(speedText, 24, 117);
  if (p.inCar && p.inCar.wrecked) {
    ctx.fillStyle = '#e63946';
    ctx.fillText('WRECKED — press E to get out', 24, 137);
  }

  // Top-right: the clock and five wanted stars.
  const hours = Math.floor(G.dayT * 24);
  const mins = Math.floor((G.dayT * 24 - hours) * 60);
  const clock = String(hours).padStart(2, '0') + ':' + String(mins).padStart(2, '0');
  ctx.fillStyle = 'rgba(10,10,18,0.85)';
  ctx.fillRect(1280 - 252, 12, 240, 64);
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 13px Arial, sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText(clock, 1264, 30);
  ctx.font = '24px Arial, sans-serif';
  ctx.textAlign = 'left';
  for (let i = 0; i < SC.MAX_WANTED; i++) {
    ctx.fillStyle = i < G.wanted ? '#ffd60a' : 'rgba(255,255,255,0.25)';
    ctx.fillText('★', 1280 - 236 + i * 32, 62);
  }
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 12px Arial, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(G.wanted > 0 ? 'WANTED' : 'CLEAN', 1206, 62);

  // Bottom-centre: mission objective.
  const stage = SC.currentStage(G);
  if (stage && G.state === 'playing') {
    const text = G.mission.title + '  —  ' + stage.text;
    ctx.font = 'bold 16px Arial, sans-serif';
    const w = ctx.measureText(text).width + 32;
    ctx.fillStyle = 'rgba(10,10,18,0.85)';
    ctx.fillRect((1280 - w) / 2, 720 - 56, w, 34);
    ctx.fillStyle = '#ffd60a';
    ctx.textAlign = 'center';
    ctx.fillText(text, 640, 720 - 33);
  }

  // Toast messages under the top bar.
  ctx.textAlign = 'left';
  ctx.font = 'bold 15px Arial, sans-serif';
  G.messages
    .filter((m) => m.until > G.time)
    .forEach((m, i) => {
      ctx.fillStyle = m.color;
      ctx.fillText(m.text, 24, 156 + i * 22);
    });

  // Mission banner.
  if (G.banner && G.banner.until > G.time) {
    const alpha = SC.clamp((G.banner.until - G.time) / 0.8, 0, 1);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = 'rgba(10,10,18,0.8)';
    ctx.fillRect(280, 150, 720, 96);
    ctx.strokeStyle = '#ffd60a';
    ctx.lineWidth = 2;
    ctx.strokeRect(280, 150, 720, 96);
    ctx.fillStyle = '#ffd60a';
    ctx.font = 'bold 30px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(G.banner.title, 640, 192);
    ctx.fillStyle = '#fff';
    ctx.font = '16px Arial, sans-serif';
    ctx.fillText(G.banner.sub, 640, 222);
    ctx.globalAlpha = 1;
  }

  SC.drawMinimap(ctx, G);
  // Radio station, bottom-right.
  if (SC.audio.radio.on) {
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    ctx.font = 'bold 13px Arial, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText('♪ ' + SC.audio.stations[SC.audio.radio.station].name, 1264, 694);
  }
  // Controls hint.
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.font = '12px Arial, sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText('WASD drive · E car · F punch · Mouse shoot · G garage · B shop · T fare/race · R radio · P pause', 1264, 716);
};

SC.drawMenu = (ctx, G) => {
  ctx.fillStyle = '#1d1a2b';
  ctx.fillRect(0, 0, 1280, 720);
  // Sunset bands.
  const bands = ['#ff9e7d', '#f3722c', '#f9c74f', '#90be6d', '#2a9d8f'];
  bands.forEach((c, i) => {
    ctx.fillStyle = c;
    ctx.fillRect(0, 120 + i * 64, 1280, 64);
  });
  ctx.fillStyle = 'rgba(29,26,43,0.9)';
  ctx.fillRect(240, 90, 800, 540);
  ctx.strokeStyle = '#ffd60a';
  ctx.lineWidth = 3;
  ctx.strokeRect(240, 90, 800, 540);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffd60a';
  ctx.font = 'bold 64px Arial, sans-serif';
  ctx.fillText('SOLARA CITY', 640, 190);
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 20px Arial, sans-serif';
  ctx.fillText('An open-world crime game — ten jobs, one sunset.', 640, 226);
  ctx.font = '15px Arial, sans-serif';
  ctx.fillStyle = '#ddd';
  const lines = [
    'Milo Reyes is back in Solara City with nothing but a stolen jacket and a fast right foot.',
    'The Sunset Crew has ten jobs for him: wheels, a pickup, the heat, a bank, one last score —',
    'then a taxi shift, a street race, a casino cut, an airport run, and the crown itself.',
    'Steal cars, lose the SCPD, and bring the money home. Five stars is the top: Air One is watching.',
    '',
    'WASD / Arrows — walk & drive      E — get in / out of a car',
    'Mouse — aim & shoot      F — punch      G — garage repair      C — respray',
    'B — shop      T — taxi fare / street race      R — radio      P — pause      M — mute',
    '',
    'Progress saves after every finished job.',
  ];
  lines.forEach((l, i) => ctx.fillText(l, 640, 268 + i * 26));
  ctx.fillStyle = '#ffd60a';
  ctx.font = 'bold 24px Arial, sans-serif';
  const blink = Math.floor(G.time * 2) % 2 === 0;
  if (blink) ctx.fillText('PRESS ENTER OR CLICK TO START', 640, 560);
  if (G.savedGame) {
    ctx.fillStyle = '#90be6d';
    ctx.font = 'bold 16px Arial, sans-serif';
    ctx.fillText('Saved game found: ' + SC.MISSIONS[G.savedGame.missionIndex].title + '  ·  $' + G.savedGame.cash.toLocaleString('en-US') + '  —  press C to continue', 640, 596);
  }
  if (SC.loadBest() > 0) {
    ctx.fillStyle = '#bbb';
    ctx.font = '14px Arial, sans-serif';
    ctx.fillText('Best haul so far: $' + SC.loadBest().toLocaleString('en-US'), 640, 620);
  }
};

SC.drawOverlay = (ctx, G, title, lines, hint) => {
  ctx.fillStyle = 'rgba(10,10,18,0.78)';
  ctx.fillRect(0, 0, 1280, 720);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffd60a';
  ctx.font = 'bold 48px Arial, sans-serif';
  ctx.fillText(title, 640, 280);
  ctx.fillStyle = '#fff';
  ctx.font = '18px Arial, sans-serif';
  lines.forEach((l, i) => ctx.fillText(l, 640, 330 + i * 30));
  ctx.fillStyle = '#bbb';
  ctx.font = '15px Arial, sans-serif';
  ctx.fillText(hint, 640, 330 + lines.length * 30 + 30);
};

SC.drawPaused = (ctx, G) => {
  SC.drawOverlay(ctx, G, 'PAUSED', ['Take a breath, Milo. The city waits.', 'Cash: $' + G.cash.toLocaleString('en-US') + '   ·   ' + (G.mission ? G.mission.title : '')], 'Press P or Esc to keep playing');
};

SC.drawBusted = (ctx, G) => {
  SC.drawOverlay(ctx, G, 'BUSTED!', [G.bustedReason || 'The SCPD got you.', 'Cash kept: $' + G.cash.toLocaleString('en-US')], 'Press Enter to try again from the start of this job');
};

SC.drawComplete = (ctx, G) => {
  SC.drawOverlay(
    ctx,
    G,
    'YOU OWN SOLARA CITY',
    ['All ten jobs done. The gold car is yours, the crew is rich,', 'and the sunset over the beach has never looked better.', 'Total haul: $' + G.cash.toLocaleString('en-US')],
    'Press Enter to play again',
  );
};
