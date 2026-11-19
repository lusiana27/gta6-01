// Solara City — the map: roads, blocks, buildings, palms and the beach.
//
// The world is generated once from a seed: every block between the roads
// gets one or two buildings, the sidewalks get palm trees, and the south
// edge is sand and water. Named places (garage, bank, docks, safehouse,
// marina) are fixed buildings so missions always find them in the same spot.

SC.world = { buildings: [], palms: [], specials: {} };

SC.buildWorld = (seed) => {
  const rng = SC.mulberry32(seed);
  const W = SC.world;
  W.buildings = [];
  W.palms = [];
  W.specials = {};

  // Fixed special buildings, each inside its own block.
  const specials = [
    { key: 'garage', x: 520, y: 470, w: 220, h: 130, color: '#e07a5f', label: 'SUNSET GARAGE' },
    { key: 'bank', x: 1500, y: 830, w: 260, h: 150, color: '#577590', label: 'SOLARA BANK' },
    { key: 'safehouse', x: 1000, y: 1640, w: 200, h: 120, color: '#90be6d', label: 'SAFEHOUSE' },
    { key: 'docks', x: 2500, y: 1640, w: 240, h: 140, color: '#8d99ae', label: 'EAST DOCKS' },
    { key: 'marina', x: 2040, y: 430, w: 190, h: 110, color: '#f9c74f', label: 'MARINA' },
    { key: 'casino', x: 2500, y: 430, w: 240, h: 130, color: '#b5179e', label: 'SOLARA CASINO' },
    { key: 'airport', x: 2040, y: 180, w: 240, h: 110, color: '#8d99ae', label: 'SOLARA INTL' },
  ];
  for (const s of specials) {
    const b = { x: s.x, y: s.y, w: s.w, h: s.h, color: s.color, roof: SC.pick(rng, SC.PALETTE.roof), label: s.label, special: s.key };
    W.buildings.push(b);
    W.specials[s.key] = b;
  }

  // Ordinary buildings: one or two per block, clear of the roads.
  const xs = [0, ...SC.ROADS_V, SC.WORLD.w];
  const ys = [0, ...SC.ROADS_H, SC.BEACH_Y];
  for (let i = 0; i < xs.length - 1; i++) {
    for (let j = 0; j < ys.length - 1; j++) {
      const bx0 = xs[i] + SC.ROAD_W / 2 + 18;
      const bx1 = xs[i + 1] - SC.ROAD_W / 2 - 18;
      const by0 = ys[j] + SC.ROAD_W / 2 + 18;
      const by1 = ys[j + 1] - SC.ROAD_W / 2 - 18;
      const bw = bx1 - bx0;
      const bh = by1 - by0;
      if (bw < 140 || bh < 110) continue;
      const count = rng() < 0.45 ? 2 : 1;
      for (let k = 0; k < count; k++) {
        const w = SC.range(rng, 110, Math.min(260, bw - 20));
        const h = SC.range(rng, 90, Math.min(180, bh - 20));
        const x = bx0 + (count === 1 ? (bw - w) / 2 : k === 0 ? 6 : bw - w - 6);
        const y = by0 + (bh - h) / 2 + SC.range(rng, -8, 8);
        const b = { x, y, w, h, color: SC.pick(rng, SC.PALETTE.building), roof: SC.pick(rng, SC.PALETTE.roof) };
        if (W.buildings.some((o) => SC.rectsOverlap(b, { x: o.x - 8, y: o.y - 8, w: o.w + 16, h: o.h + 16 }))) continue;
        W.buildings.push(b);
      }
    }
  }

  // Palms along the sidewalks and the beach front.
  for (const rx of SC.ROADS_V) {
    for (let y = 120; y < SC.BEACH_Y - 40; y += 170) {
      if (rng() < 0.6) W.palms.push({ x: rx - 62 + SC.range(rng, -6, 6), y: y + SC.range(rng, -20, 20) });
      if (rng() < 0.6) W.palms.push({ x: rx + 62 + SC.range(rng, -6, 6), y: y + 90 + SC.range(rng, -20, 20) });
    }
  }
  for (let x = 80; x < SC.WORLD.w - 60; x += 130) {
    if (rng() < 0.75) W.palms.push({ x: x + SC.range(rng, -15, 15), y: SC.BEACH_Y + 46 + SC.range(rng, -8, 8) });
  }
};

SC.isOnRoad = (x, y) => {
  for (const rx of SC.ROADS_V) if (Math.abs(x - rx) <= SC.ROAD_W / 2) return true;
  for (const ry of SC.ROADS_H) if (Math.abs(y - ry) <= SC.ROAD_W / 2) return true;
  return false;
};

// Push a circle out of every building and the world edge.
SC.collideCircle = (x, y, r) => {
  let px = SC.clamp(x, r, SC.WORLD.w - r);
  let py = SC.clamp(y, r, SC.WORLD.h - r);
  for (const b of SC.world.buildings) {
    const out = SC.pushCircleOutOfRect(px, py, r, b);
    if (out) {
      px = out.x;
      py = out.y;
    }
  }
  return { x: px, y: py };
};

// A car is two circles (nose and tail); push each out of buildings.
SC.collideCar = (car) => {
  const fx = car.x + Math.cos(car.angle) * 16;
  const fy = car.y + Math.sin(car.angle) * 16;
  const bx = car.x - Math.cos(car.angle) * 16;
  const by = car.y - Math.sin(car.angle) * 16;
  const f2 = SC.collideCircle(fx, fy, 13);
  const b2 = SC.collideCircle(bx, by, 13);
  const hit = f2.x !== fx || f2.y !== fy || b2.x !== bx || b2.y !== by;
  car.x = (f2.x + b2.x) / 2;
  car.y = (f2.y + b2.y) / 2;
  car.angle = Math.atan2(f2.y - b2.y, f2.x - b2.x);
  return hit;
};

SC.drawWorld = (ctx, cam, time) => {
  const P = SC.PALETTE;
  // Screen-space drawing: ox/oy is the world point at the screen's top
  // left. The canvas clips everything outside itself, so no manual
  // clipping is needed.
  const ox = cam.x - 640;
  const oy = cam.y - 360;

  // Ground.
  ctx.fillStyle = P.grass;
  ctx.fillRect(0, 0, 1280, 720);
  // The airport runway along the north edge, with its centre dashes.
  ctx.fillStyle = '#3a3648';
  ctx.fillRect(1500 - ox, 28 - oy, 1200, 46);
  ctx.fillStyle = '#fff';
  for (let x = 1540; x < 2680; x += 90) ctx.fillRect(x - ox, 48 - oy, 44, 5);
  ctx.fillStyle = 'rgba(29,26,43,0.85)';
  ctx.font = 'bold 13px Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('SOLARA INTL  ·  RUNWAY 09', 2100 - ox, 20 - oy);
  // Beach and water.
  ctx.fillStyle = P.sand;
  ctx.fillRect(0, SC.BEACH_Y - oy, 1280, SC.WORLD.h - SC.BEACH_Y);
  ctx.fillStyle = P.water;
  ctx.fillRect(0, SC.WATER_Y - oy, 1280, SC.WORLD.h - SC.WATER_Y);
  ctx.fillStyle = P.waterDeep;
  for (let x = 0; x < SC.WORLD.w; x += 160) {
    ctx.fillRect(x - ox, SC.WATER_Y + 30 - oy, 90, 4);
    ctx.fillRect(x + 70 - ox, SC.WATER_Y + 80 - oy, 70, 4);
  }
  // Boats bobbing off the beach.
  const boats = [
    { x: 420, c: '#f8f9fa' },
    { x: 1420, c: '#ffd166' },
    { x: 2420, c: '#8ecae6' },
  ];
  boats.forEach((b, i) => {
    const bx = b.x - ox;
    const by = SC.WATER_Y + 46 + Math.sin(time * 0.8 + i * 2.1) * 3 - oy;
    if (bx < -60 || bx > 1340) return;
    ctx.fillStyle = b.c;
    ctx.beginPath();
    ctx.roundRect(bx - 34, by - 8, 68, 16, 7);
    ctx.fill();
    ctx.fillStyle = '#1d3557';
    ctx.fillRect(bx - 8, by - 20, 16, 12);
  });
  // Beach umbrellas.
  const umbrellas = [
    { x: 700, c: '#e63946' },
    { x: 1100, c: '#f4a261' },
    { x: 1800, c: '#2a9d8f' },
    { x: 2200, c: '#9b5de5' },
  ];
  for (const u of umbrellas) {
    const ux = u.x - ox;
    const uy = SC.BEACH_Y + 60 - oy;
    if (ux < -30 || ux > 1310) continue;
    ctx.strokeStyle = '#8d5a2b';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(ux, uy);
    ctx.lineTo(ux, uy - 16);
    ctx.stroke();
    ctx.fillStyle = u.c;
    ctx.beginPath();
    ctx.arc(ux, uy - 16, 16, Math.PI, 0);
    ctx.fill();
  }

  // Sidewalks, then roads.
  for (const rx of SC.ROADS_V) {
    ctx.fillStyle = P.sidewalk;
    ctx.fillRect(rx - SC.ROAD_W / 2 - SC.SIDEWALK - ox, -oy, SC.ROAD_W + SC.SIDEWALK * 2, SC.BEACH_Y);
  }
  for (const ry of SC.ROADS_H) {
    ctx.fillStyle = P.sidewalk;
    ctx.fillRect(-ox, ry - SC.ROAD_W / 2 - SC.SIDEWALK - oy, SC.WORLD.w, SC.ROAD_W + SC.SIDEWALK * 2);
  }
  ctx.fillStyle = P.road;
  for (const rx of SC.ROADS_V) ctx.fillRect(rx - SC.ROAD_W / 2 - ox, -oy, SC.ROAD_W, SC.BEACH_Y);
  for (const ry of SC.ROADS_H) ctx.fillRect(-ox, ry - SC.ROAD_W / 2 - oy, SC.WORLD.w, SC.ROAD_W);

  // Centre dashes.
  ctx.fillStyle = P.roadLine;
  for (const rx of SC.ROADS_V) {
    for (let y = 40; y < SC.BEACH_Y; y += 70) ctx.fillRect(rx - 3 - ox, y - oy, 6, 34);
  }
  for (const ry of SC.ROADS_H) {
    for (let x = 40; x < SC.WORLD.w; x += 70) ctx.fillRect(x - ox, ry - 3 - oy, 34, 6);
  }

  // Buildings: body, roof edge and windows.
  for (const b of SC.world.buildings) {
    const sx = b.x - ox;
    const sy = b.y - oy;
    if (sx > 1280 || sx + b.w < 0 || sy > 720 || sy + b.h < 0) continue;
    ctx.fillStyle = b.color;
    ctx.fillRect(sx, sy, b.w, b.h);
    ctx.fillStyle = b.roof;
    ctx.fillRect(sx, sy, b.w, 8);
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    const cols = Math.max(1, Math.floor(b.w / 34));
    const rows = Math.max(1, Math.floor((b.h - 16) / 30));
    for (let i = 0; i < cols; i++) {
      for (let j = 0; j < rows; j++) {
        ctx.fillRect(sx + 12 + i * 34, sy + 20 + j * 30, 14, 16);
      }
    }
    if (b.label) {
      ctx.fillStyle = '#1d1a2b';
      ctx.font = 'bold 13px Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(b.label, sx + b.w / 2, sy + b.h / 2 + 4);
    }
  }

  // Palms.
  for (const p of SC.world.palms) {
    const sx = p.x - ox;
    const sy = p.y - oy;
    if (sx < -20 || sx > 1300 || sy < -20 || sy > 740) continue;
    ctx.strokeStyle = P.trunk;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.lineTo(sx + 3, sy - 14);
    ctx.stroke();
    ctx.fillStyle = P.palm;
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      ctx.beginPath();
      ctx.ellipse(sx + 3 + Math.cos(a) * 9, sy - 15 + Math.sin(a) * 7, 10, 4, a, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Place name labels on the map.
  ctx.fillStyle = 'rgba(29,26,43,0.85)';
  ctx.font = 'bold 15px Arial, sans-serif';
  ctx.textAlign = 'center';
  for (const key of Object.keys(SC.PLACES)) {
    const pl = SC.PLACES[key];
    const sx = pl.x - ox;
    const sy = pl.y - 58 - oy;
    if (sx < -80 || sx > 1360 || sy < -40 || sy > 760) continue;
    ctx.fillText(pl.name, sx, sy);
  }
};
