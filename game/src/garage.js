// Solara City — the garage, the lay-low and the shops.
//
// Sunset Garage is more than the crew HQ: roll a car onto the forecourt
// beside it and the crew will fix it up or spray it a new colour, for
// cash. Laying low in the garage forecourt or at the Safehouse cools the
// heat three times as fast. Two street kiosks sell what Milo needs: the
// Gun Runner sells ammo, the Taco Stand sells a hot meal.

// The forecourt is the stretch of road right beside the garage building.
SC.GARAGE_ZONE = { x: 372, y: 470, w: 96, h: 130 };
SC.SAFEHOUSE_ZONE = { x: 1000, y: 1640, w: 200, h: 120 };

SC.SHOPS = [
  { x: 982, y: 1096, kind: 'ammo', name: 'Gun Runner', price: 80, text: 'B — ammo +12 ($80)' },
  { x: 1420, y: 2184, kind: 'health', name: 'Taco Stand', price: 60, text: 'B — hot meal +40 HP ($60)' },
];

SC.inZone = (x, y, z) => x >= z.x && x <= z.x + z.w && y >= z.y && y <= z.y + z.h;

SC.inLayLowZone = (G) => {
  const p = G.player;
  return SC.inZone(p.x, p.y, SC.GARAGE_ZONE) || SC.inZone(p.x, p.y, SC.SAFEHOUSE_ZONE);
};

SC.nearGarage = (G) => {
  const p = G.player;
  if (!p.inCar) return false;
  return SC.inZone(p.inCar.x, p.inCar.y, SC.GARAGE_ZONE);
};

SC.nearShop = (G) => {
  const p = G.player;
  if (p.inCar) return null;
  for (const s of SC.SHOPS) {
    if (SC.dist(p.x, p.y, s.x, s.y) < 78) return s;
  }
  return null;
};

SC.updateGarage = (G, dt) => {
  if (G.state !== 'playing') return;
  const p = G.player;
  // Repair: G, respray: C — only with a car on the forecourt.
  if (SC.nearGarage(G)) {
    if (SC.input.wasPressed('KeyG')) {
      const car = p.inCar;
      if (car.health >= 100) {
        SC.addMessage(G, 'This ride is already mint.', '#ddd');
      } else if (G.cash < 200) {
        SC.addMessage(G, 'Repair costs $200 — you are short.', '#e63946');
      } else {
        G.cash -= 200;
        car.health = 100;
        car.wrecked = false;
        SC.addMessage(G, 'Repaired and detailed — $200', '#90be6d');
        SC.audio.pickup();
        SC.spawnSparks(G, car.x, car.y, 8);
      }
    }
    if (SC.input.wasPressed('KeyC')) {
      const car = p.inCar;
      if (G.cash < 150) {
        SC.addMessage(G, 'A respray costs $150 — you are short.', '#e63946');
      } else {
        G.cash -= 150;
        car.color = SC.pick(Math.random, SC.PALETTE.car);
        SC.addMessage(G, 'Fresh paint — $150', '#90be6d');
        SC.audio.pickup();
        SC.spawnSparks(G, car.x, car.y, 8);
      }
    }
  }
  // Shops: B buys on foot.
  const shop = SC.nearShop(G);
  if (shop && SC.input.wasPressed('KeyB')) {
    if (G.cash < shop.price) {
      SC.addMessage(G, 'You are short — that costs $' + shop.price + '.', '#e63946');
    } else if (shop.kind === 'ammo') {
      G.cash -= shop.price;
      G.ammo += 12;
      SC.addMessage(G, 'Ammo +12 — $' + shop.price, '#90be6d');
      SC.audio.pickup();
    } else if (shop.kind === 'health') {
      if (p.health >= 100) {
        SC.addMessage(G, 'You are already full.', '#ddd');
      } else {
        G.cash -= shop.price;
        p.health = Math.min(100, p.health + 40);
        SC.addMessage(G, 'Patched up +40 HP — $' + shop.price, '#90be6d');
        SC.audio.pickup();
      }
    }
  }
};

SC.drawShops = (ctx, cam, G) => {
  const ox = cam.x - 640;
  const oy = cam.y - 360;
  // Garage forecourt marker: a yellow bay on the road beside the garage.
  const z = SC.GARAGE_ZONE;
  ctx.strokeStyle = 'rgba(255,214,10,0.8)';
  ctx.lineWidth = 3;
  ctx.setLineDash([10, 8]);
  ctx.strokeRect(z.x - ox, z.y - oy, z.w, z.h);
  ctx.setLineDash([]);
  ctx.fillStyle = 'rgba(255,214,10,0.9)';
  ctx.font = 'bold 11px Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('GARAGE', z.x + z.w / 2 - ox, z.y - 8 - oy);
  // Shop kiosks.
  for (const s of SC.SHOPS) {
    const sx = s.x - ox;
    const sy = s.y - oy;
    if (sx < -40 || sx > 1320 || sy < -40 || sy > 760) continue;
    ctx.fillStyle = s.kind === 'ammo' ? '#444' : '#f3722c';
    ctx.fillRect(sx - 16, sy - 12, 32, 24);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 11px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(s.kind === 'ammo' ? 'AMMO' : 'TACO', sx, sy + 4);
    ctx.fillStyle = 'rgba(29,26,43,0.85)';
    ctx.font = 'bold 12px Arial, sans-serif';
    ctx.fillText(s.name, sx, sy - 20);
  }
};

SC.drawGaragePrompts = (ctx, G) => {
  if (G.state !== 'playing') return;
  ctx.font = 'bold 15px Arial, sans-serif';
  ctx.textAlign = 'center';
  let line = null;
  if (SC.nearGarage(G)) {
    const car = G.player.inCar;
    line = 'GARAGE — G repair $200' + (car.health < 100 ? '' : ' (mint)') + ' · C respray $150';
  } else {
    const shop = SC.nearShop(G);
    if (shop) line = shop.name + ' — ' + shop.text;
  }
  if (!line) return;
  const w = ctx.measureText(line).width + 28;
  ctx.fillStyle = 'rgba(10,10,18,0.85)';
  ctx.fillRect((1280 - w) / 2, 720 - 96, w, 30);
  ctx.fillStyle = '#ffd60a';
  ctx.fillText(line, 640, 720 - 75);
};
