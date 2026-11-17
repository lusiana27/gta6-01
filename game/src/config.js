// Solara City — shared constants, palette and helpers.
//
// The city is a fixed grid: five vertical roads and five horizontal roads
// crossing a 2840 x 2320 world, with a beach along the south edge. Every
// module reads these values, so the map, the traffic and the missions all
// agree on where the streets are. No network, no assets: flat colours only.

const SC = window.SC || (window.SC = {});

SC.WORLD = { w: 2840, h: 2320 };
SC.ROADS_V = [420, 920, 1420, 1920, 2420]; // vertical road centre x
SC.ROADS_H = [360, 760, 1160, 1560, 1960]; // horizontal road centre y
SC.ROAD_W = 96; // road width in pixels (centre +/- 48)
SC.SIDEWALK = 16; // sidewalk band on each side of a road
SC.BEACH_Y = 2120; // sand starts here
SC.WATER_Y = 2240; // water starts here

// Sun-soaked coastal palette: warm asphalt, terracotta roofs, palm green.
SC.PALETTE = {
  grass: '#86b364',
  road: '#4a4557',
  roadEdge: '#6b6580',
  roadLine: '#e8d44d',
  sidewalk: '#c9b8a3',
  sand: '#f2d38a',
  water: '#2a9d8f',
  waterDeep: '#21867a',
  building: ['#ff9e7d', '#ffd166', '#8ecae6', '#f3722c', '#90be6d', '#f9c74f', '#577590', '#e07a5f', '#81b29a', '#f2cc8f'],
  roof: ['#c96f4a', '#b5651d', '#7d5a50', '#946b2d'],
  palm: '#2f9e44',
  trunk: '#8d5a2b',
  car: ['#e63946', '#457b9d', '#f4a261', '#2a9d8f', '#e9c46a', '#9b5de5', '#f15bb5', '#00bbf9', '#fefae0', '#6c757d'],
  police: '#f8f9fa',
  gold: '#ffd60a',
};

// Key places on the map (all on or just beside a road).
SC.PLACES = {
  garage: { x: 420, y: 360, name: 'Sunset Garage', blurb: 'Crew HQ' },
  bank: { x: 1420, y: 760, name: 'Solara Bank', blurb: 'Big money' },
  docks: { x: 2700, y: 1560, name: 'East Docks', blurb: 'No questions' },
  safehouse: { x: 920, y: 1960, name: 'Safehouse', blurb: 'Lay low' },
  marina: { x: 2420, y: 360, name: 'Marina', blurb: 'Gold car' },
  beach: { x: 1420, y: 2220, name: 'Solara Beach', blurb: 'Sunset strip' },
};

SC.clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
SC.lerp = (a, b, t) => a + (b - a) * t;
SC.dist = (x1, y1, x2, y2) => Math.hypot(x2 - x1, y2 - y1);
SC.angleTo = (x1, y1, x2, y2) => Math.atan2(y2 - y1, x2 - x1);

// Smallest signed turn from angle a to angle b, in (-PI, PI].
SC.angleDiff = (a, b) => {
  let d = (b - a) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d <= -Math.PI) d += Math.PI * 2;
  return d;
};

// Deterministic RNG so screenshot scenes replay the same every time.
SC.mulberry32 = (seed) => {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

SC.pick = (rng, arr) => arr[Math.floor(rng() * arr.length)];
SC.range = (rng, a, b) => a + rng() * (b - a);

SC.rectsOverlap = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

// Push a circle out of a solid rectangle; returns true when it overlapped.
SC.pushCircleOutOfRect = (cx, cy, r, rect) => {
  const nx = SC.clamp(cx, rect.x, rect.x + rect.w);
  const ny = SC.clamp(cy, rect.y, rect.y + rect.h);
  const dx = cx - nx;
  const dy = cy - ny;
  const d2 = dx * dx + dy * dy;
  if (d2 >= r * r) return null;
  if (d2 > 0.0001) {
    const d = Math.sqrt(d2);
    return { x: nx + (dx / d) * r, y: ny + (dy / d) * r };
  }
  // Centre is inside the rect: push out along the shortest side.
  const left = cx - rect.x;
  const right = rect.x + rect.w - cx;
  const top = cy - rect.y;
  const bottom = rect.y + rect.h - cy;
  const m = Math.min(left, right, top, bottom);
  if (m === left) return { x: rect.x - r, y: cy };
  if (m === right) return { x: rect.x + rect.w + r, y: cy };
  if (m === top) return { x: cx, y: rect.y - r };
  return { x: cx, y: rect.y + rect.h + r };
};
