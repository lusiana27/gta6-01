// city.js — Sunport City: the map, its districts, buildings, roads and collision.
// The world is a 3200 x 2560 grid of streets. Everything is drawn from data, no images.

export const WORLD_W = 3200;
export const WORLD_H = 2560;
export const ROAD_W = 96;
export const BLOCK = 320;

export const ROADS_X = [160, 480, 800, 1120, 1440, 1760, 2080, 2400, 2720, 3040];
export const ROADS_Y = [160, 480, 800, 1120, 1440, 1760, 2080, 2400];

/** Deterministic RNG so the city is identical every run. */
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const DISTRICTS = [
  { name: 'BEACHFRONT', x: 0, y: 0, w: 340, h: 2560, tint: '#e8d9a0' },
  { name: 'OLD TOWN', x: 340, y: 0, w: 900, h: 900, tint: '#c9a86a' },
  { name: 'DOWNTOWN', x: 1240, y: 320, w: 1100, h: 1100, tint: '#7fa8d8' },
  { name: 'CASINO ROW', x: 2340, y: 0, w: 860, h: 900, tint: '#e07fb0' },
  { name: 'PORT', x: 340, y: 1760, w: 900, h: 800, tint: '#8fb8a0' },
  { name: 'AIRPORT', x: 2080, y: 1760, w: 1120, h: 800, tint: '#b8b8c8' },
  { name: 'SUBURBS', x: 1240, y: 1420, w: 840, h: 340, tint: '#a8c88f' },
];

export function districtAt(x, y) {
  for (const d of DISTRICTS) {
    if (x >= d.x && x < d.x + d.w && y >= d.y && y < d.y + d.h) return d;
  }
  return DISTRICTS[2];
}

/** Fixed points of interest the missions and shops use. */
export const PLACES = {
  garage: { x: 800, y: 480, name: 'SUNPORT GARAGE', kind: 'garage' },
  gunShop: { x: 1760, y: 800, name: 'IRONWORKS GUNS', kind: 'gun' },
  diner: { x: 1120, y: 1440, name: 'PALM DINER', kind: 'diner' },
  hospital: { x: 2400, y: 1120, name: 'SUNPORT GENERAL', kind: 'hospital' },
  safehouse: { x: 480, y: 2080, name: 'SAFEHOUSE', kind: 'safehouse' },
  casino: { x: 2720, y: 480, name: 'NEON PALMS CASINO', kind: 'casino' },
  airport: { x: 2720, y: 2080, name: 'SUNPORT INTL', kind: 'airport' },
  port: { x: 480, y: 2400, name: 'CONTAINER PORT', kind: 'port' },
  beach: { x: 170, y: 1120, name: 'PALM BEACH', kind: 'beach' },
  hotel: { x: 1440, y: 480, name: 'GRAND MARINA HOTEL', kind: 'hotel' },
  policeHQ: { x: 2080, y: 1440, name: 'SUNPORT PD HQ', kind: 'police' },
  warehouse: { x: 1120, y: 2080, name: 'WAREHOUSE 7', kind: 'warehouse' },
  taxiStand: { x: 800, y: 1120, name: 'TAXI STAND', kind: 'taxi' },
  start: { x: 800, y: 800, name: 'START', kind: 'start' },
};

function buildingPalette(district, rnd) {
  const palettes = {
    DOWNTOWN: ['#5a6b8c', '#6b7ba0', '#4a5a78', '#7a8aa8', '#55648a'],
    'CASINO ROW': ['#8c4a72', '#a05a80', '#7a3a62', '#b06a90'],
    'OLD TOWN': ['#a08050', '#b09060', '#907040', '#c0a070'],
    BEACHFRONT: ['#d8b890', '#e0c8a0', '#c8a878'],
    PORT: ['#6a7a72', '#7a8a7a', '#5a6a62'],
    AIRPORT: ['#8a8a98', '#9a9aa8', '#7a7a88'],
    SUBURBS: ['#b09878', '#a08868', '#c0a888'],
  };
  const p = palettes[district.name] || palettes.DOWNTOWN;
  return p[Math.floor(rnd() * p.length)];
}

/** Build every building, park, tree and lamp of the city. */
export function generateCity() {
  const rnd = mulberry32(20261123);
  const buildings = [];
  const parks = [];
  const trees = [];
  const lamps = [];
  for (let bx = 0; bx < ROADS_X.length - 1; bx++) {
    for (let by = 0; by < ROADS_Y.length - 1; by++) {
      const x0 = ROADS_X[bx] + ROAD_W / 2 + 8;
      const y0 = ROADS_Y[by] + ROAD_W / 2 + 8;
      const x1 = ROADS_X[bx + 1] - ROAD_W / 2 - 8;
      const y1 = ROADS_Y[by + 1] - ROAD_W / 2 - 8;
      const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
      const d = districtAt(cx, cy);
      if (d.name === 'AIRPORT') continue; // runway block, no buildings
      if (d.name === 'BEACHFRONT') continue; // sand, no buildings
      if (rnd() < 0.14) { // park block
        parks.push({ x: x0, y: y0, w: x1 - x0, h: y1 - y0 });
        for (let t = 0; t < 7; t++) {
          trees.push({ x: x0 + 20 + rnd() * (x1 - x0 - 40), y: y0 + 20 + rnd() * (y1 - y0 - 40), r: 9 + rnd() * 7 });
        }
        continue;
      }
      const n = 1 + Math.floor(rnd() * 3);
      for (let i = 0; i < n; i++) {
        const bw = 52 + rnd() * 90;
        const bh = 52 + rnd() * 90;
        const px = x0 + 8 + rnd() * Math.max(1, x1 - x0 - bw - 16);
        const py = y0 + 8 + rnd() * Math.max(1, y1 - y0 - bh - 16);
        const tall = d.name === 'DOWNTOWN' && rnd() < 0.45;
        buildings.push({
          x: px, y: py, w: bw, h: bh,
          color: buildingPalette(d, rnd),
          roof: tall ? '#2c3a55' : '#3a3f4a',
          tall,
          district: d.name,
        });
      }
      for (let t = 0; t < 3; t++) {
        trees.push({ x: x0 + 12 + rnd() * (x1 - x0 - 24), y: y0 + 12 + rnd() * (y1 - y0 - 24), r: 7 + rnd() * 6 });
      }
    }
  }
  // Airport runway + terminal
  buildings.push({ x: 2240, y: 1920, w: 700, h: 90, color: '#7a7a88', roof: '#5a5a68', tall: false, district: 'AIRPORT' });
  buildings.push({ x: 2240, y: 2120, w: 260, h: 120, color: '#8a8a98', roof: '#6a6a78', tall: false, district: 'AIRPORT' });
  // Casino tower
  buildings.push({ x: 2620, y: 380, w: 180, h: 150, color: '#a05a80', roof: '#ff2e88', tall: true, district: 'CASINO ROW' });
  // Port containers
  for (let i = 0; i < 8; i++) {
    buildings.push({ x: 420 + i * 90, y: 2260, w: 70, h: 34, color: ['#b0503a', '#3a70a0', '#c09030', '#508050'][i % 4], roof: '#333', tall: false, district: 'PORT' });
  }
  // Street lamps along every road intersection
  for (const rx of ROADS_X) for (const ry of ROADS_Y) lamps.push({ x: rx + 58, y: ry + 58 });
  return { buildings, parks, trees, lamps };
}

/** True when the point is on a road (drivable / walkable street). */
export function isRoad(x, y) {
  if (x < 0 || y < 0 || x > WORLD_W || y > WORLD_H) return false;
  for (const rx of ROADS_X) if (Math.abs(x - rx) <= ROAD_W / 2) return true;
  for (const ry of ROADS_Y) if (Math.abs(y - ry) <= ROAD_W / 2) return true;
  return false;
}

/** Nearest road centre line to a point (used by traffic AI). */
export function nearestRoad(x, y) {
  let best = null, bestD = 1e9;
  for (const rx of ROADS_X) { const d = Math.abs(x - rx); if (d < bestD) { bestD = d; best = { axis: 'x', at: rx }; } }
  for (const ry of ROADS_Y) { const d = Math.abs(y - ry); if (d < bestD) { bestD = d; best = { axis: 'y', at: ry }; } }
  return best;
}

/** Push a circle out of every building it overlaps. Returns true if it hit something. */
export function collideBuildings(city, x, y, r) {
  let hit = false;
  for (const b of city.buildings) {
    const cx = Math.max(b.x, Math.min(x, b.x + b.w));
    const cy = Math.max(b.y, Math.min(y, b.y + b.h));
    const dx = x - cx, dy = y - cy;
    const d2 = dx * dx + dy * dy;
    if (d2 < r * r) {
      hit = true;
      const d = Math.sqrt(d2) || 0.001;
      const push = (r - d) / d;
      x += dx * push; y += dy * push;
    }
  }
  return { x, y, hit };
}

/** Day factor 0 (midnight) .. 1 (noon) from the game clock in hours. */
export function daylight(clock) {
  const h = ((clock % 24) + 24) % 24;
  if (h < 5 || h > 20) return 0.12;
  if (h < 7) return 0.12 + ((h - 5) / 2) * 0.6;
  if (h < 17) return 1;
  if (h < 20) return 1 - ((h - 17) / 3) * 0.88;
  return 0.12;
}

export function clockText(clock) {
  const h = Math.floor(((clock % 24) + 24) % 24);
  const m = Math.floor((((clock % 24) + 24) % 24 - h) * 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function drawBuilding(ctx, b, cam, night) {
  const x = b.x - cam.x, y = b.y - cam.y;
  if (x > 1320 || y > 840 || x + b.w < -40 || y + b.h < -40) return;
  if (b.tall) { // fake 3D: offset top face
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fillRect(x + 8, y + 10, b.w, b.h);
    ctx.fillStyle = b.color;
    ctx.fillRect(x, y, b.w, b.h);
    ctx.fillStyle = b.roof;
    ctx.fillRect(x + 4, y + 4, b.w - 8, b.h - 8);
    ctx.fillStyle = 'rgba(255,230,150,0.85)';
    for (let wy = y + 14; wy < y + b.h - 10; wy += 18) {
      for (let wx = x + 10; wx < x + b.w - 10; wx += 16) {
        if (((wx * 7 + wy * 13) % 5) < 2) ctx.fillRect(wx, wy, 5, 7);
      }
    }
    if (night) {
      ctx.fillStyle = 'rgba(255,220,120,0.9)';
      for (let wy = y + 14; wy < y + b.h - 10; wy += 18) {
        for (let wx = x + 10; wx < x + b.w - 10; wx += 16) {
          if (((wx * 7 + wy * 13) % 5) < 2) ctx.fillRect(wx, wy, 5, 7);
        }
      }
    }
  } else {
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.fillRect(x + 4, y + 5, b.w, b.h);
    ctx.fillStyle = b.color;
    ctx.fillRect(x, y, b.w, b.h);
    ctx.fillStyle = b.roof;
    ctx.fillRect(x + 3, y + 3, b.w - 6, b.h - 6);
    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    ctx.fillRect(x + 6, y + 6, b.w - 12, 4);
  }
}

/** Draw the whole visible slice of the city. */
export function drawCity(ctx, city, cam, clock) {
  const day = daylight(clock);
  const night = day < 0.5;
  // ground
  ctx.fillStyle = '#3f5a3a';
  ctx.fillRect(0, 0, 1280, 800);
  // beach sand + water on the west edge
  ctx.fillStyle = '#e8d9a0';
  ctx.fillRect(0 - cam.x, 0 - cam.y, 130, WORLD_H);
  ctx.fillStyle = '#2e7fa8';
  ctx.fillRect(0 - cam.x, 0 - cam.y, 62, WORLD_H);
  ctx.fillStyle = 'rgba(255,255,255,0.25)';
  for (let y = 0; y < WORLD_H; y += 90) ctx.fillRect(56 - cam.x, y - cam.y, 6, 26);
  // district tint blocks (subtle)
  for (const d of DISTRICTS) {
    ctx.fillStyle = 'rgba(255,255,255,0.03)';
    ctx.fillRect(d.x - cam.x, d.y - cam.y, d.w, d.h);
  }
  // roads
  ctx.fillStyle = '#2b2f38';
  for (const rx of ROADS_X) ctx.fillRect(rx - ROAD_W / 2 - cam.x, -cam.y, ROAD_W, WORLD_H);
  for (const ry of ROADS_Y) ctx.fillRect(-cam.x, ry - ROAD_W / 2 - cam.y, WORLD_W, ROAD_W);
  // centre dashes
  ctx.fillStyle = '#e8c840';
  for (const rx of ROADS_X) {
    for (let y = 0; y < WORLD_H; y += 64) ctx.fillRect(rx - 2 - cam.x, y - cam.y, 4, 30);
  }
  for (const ry of ROADS_Y) {
    for (let x = 0; x < WORLD_W; x += 64) ctx.fillRect(x - cam.x, ry - 2 - cam.y, 30, 4);
  }
  // airport runway
  ctx.fillStyle = '#3a3a44';
  ctx.fillRect(2160 - cam.x, 2320 - cam.y, 880, 60);
  ctx.fillStyle = '#f0f0f0';
  for (let x = 2180; x < 3020; x += 80) ctx.fillRect(x - cam.x, 2347 - cam.y, 40, 6);
  // parks
  for (const p of city.parks) {
    const x = p.x - cam.x, y = p.y - cam.y;
    if (x > 1320 || y > 840 || x + p.w < 0 || y + p.h < 0) continue;
    ctx.fillStyle = '#4a7a44';
    ctx.fillRect(x, y, p.w, p.h);
    ctx.strokeStyle = '#6a9a5a';
    ctx.lineWidth = 3;
    ctx.strokeRect(x + 4, y + 4, p.w - 8, p.h - 8);
  }
  // trees
  for (const t of city.trees) {
    const x = t.x - cam.x, y = t.y - cam.y;
    if (x < -20 || y < -20 || x > 1300 || y > 820) continue;
    ctx.fillStyle = '#2a5a2a';
    ctx.beginPath(); ctx.arc(x, y, t.r, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#3f8a3f';
    ctx.beginPath(); ctx.arc(x - 2, y - 2, t.r * 0.7, 0, Math.PI * 2); ctx.fill();
  }
  // buildings
  for (const b of city.buildings) drawBuilding(ctx, b, cam, night);
  // lamps glow at night
  if (night) {
    ctx.fillStyle = 'rgba(255,220,120,0.10)';
    for (const l of city.lamps) {
      const x = l.x - cam.x, y = l.y - cam.y;
      if (x < -40 || y < -40 || x > 1320 || y > 840) continue;
      ctx.beginPath(); ctx.arc(x, y, 26, 0, Math.PI * 2); ctx.fill();
    }
  }
  // day/night tint over the world
  if (day < 1) {
    ctx.fillStyle = `rgba(8,12,38,${(1 - day) * 0.42})`;
    ctx.fillRect(0, 0, 1280, 800);
  }
  if (day > 0.9) {
    ctx.fillStyle = 'rgba(255,200,90,0.05)';
    ctx.fillRect(0, 0, 1280, 800);
  }
}

/** Tiny version of the city for the minimap. */
export function drawMinimapBase(ctx, city, x, y, w, h) {
  const sx = w / WORLD_W, sy = h / WORLD_H;
  ctx.fillStyle = '#16202e';
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = '#2e7fa8';
  ctx.fillRect(x, y, 62 * sx, h);
  ctx.fillStyle = '#e8d9a0';
  ctx.fillRect(x + 62 * sx, y, 68 * sx, h);
  ctx.fillStyle = '#3a3f4a';
  for (const rx of ROADS_X) ctx.fillRect(x + (rx - ROAD_W / 2) * sx, y, ROAD_W * sx, h);
  for (const ry of ROADS_Y) ctx.fillRect(x, y + (ry - ROAD_W / 2) * sy, w, ROAD_W * sy);
  ctx.fillStyle = '#4a7a44';
  for (const p of city.parks) ctx.fillRect(x + p.x * sx, y + p.y * sy, p.w * sx, p.h * sy);
  ctx.fillStyle = '#8a8a98';
  ctx.fillRect(x + 2160 * sx, y + 2320 * sy, 880 * sx, 60 * sy);
}
