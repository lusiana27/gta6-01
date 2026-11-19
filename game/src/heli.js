// Solara City — the SCPD Air One helicopter.
//
// At three stars and above the police call in a helicopter. It cannot be
// outrun on the ground: it hovers over Milo, paints him with a
// searchlight so cruisers find him faster, and only leaves when the heat
// has been off for a while. It is a flying billboard for how hot Milo is.

SC.spawnHeli = (G) => {
  const p = G.player;
  G.heli = {
    x: p.x,
    y: p.y - 320,
    angle: 0,
    rotor: 0,
    wobble: Math.random() * Math.PI * 2,
  };
  G.heliLeave = 0;
  SC.addMessage(G, 'Air One is overhead — lose them!', '#e63946');
};

SC.updateHeli = (G, dt) => {
  if (!G.heli) {
    if (G.wanted >= 3) SC.spawnHeli(G);
    return;
  }
  const h = G.heli;
  h.rotor += dt * 28;
  h.wobble += dt;
  if (G.wanted < 3) {
    // Heat off: the heli circles away and leaves after a few seconds.
    G.heliLeave += dt;
    h.y -= 40 * dt;
    if (G.heliLeave > 4) G.heli = null;
    return;
  }
  G.heliLeave = 0;
  // Hover above Milo with a lazy wobble, never quite on top of him.
  const p = G.player;
  const tx = p.x + Math.sin(h.wobble * 0.7) * 70;
  const ty = p.y - 130 + Math.cos(h.wobble * 0.9) * 40;
  h.x = SC.lerp(h.x, tx, dt * 1.4);
  h.y = SC.lerp(h.y, ty, dt * 1.4);
  h.angle = SC.angleTo(h.x, h.y, p.x, p.y);
};

SC.drawHeli = (ctx, cam, G) => {
  const h = G.heli;
  if (!h) return;
  const p = G.player;
  const hx = h.x - (cam.x - 640);
  const hy = h.y - (cam.y - 360);
  const px = p.x - (cam.x - 640);
  const py = p.y - (cam.y - 360);
  // Searchlight cone down onto Milo.
  ctx.save();
  ctx.fillStyle = 'rgba(255,244,170,0.16)';
  ctx.beginPath();
  ctx.moveTo(hx, hy);
  ctx.lineTo(px - 46, py - 10);
  ctx.lineTo(px + 46, py - 10);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = 'rgba(255,244,170,0.35)';
  ctx.beginPath();
  ctx.ellipse(px, py, 34, 16, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  // Shadow on the ground, offset by the sun.
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.beginPath();
  ctx.ellipse(hx + 18, hy + 26, 26, 10, 0, 0, Math.PI * 2);
  ctx.fill();
  // Body: dark fuselage, tail, SCPD band.
  ctx.save();
  ctx.translate(hx, hy);
  ctx.rotate(h.angle);
  ctx.fillStyle = '#1d3557';
  ctx.beginPath();
  ctx.roundRect(-16, -9, 32, 18, 8);
  ctx.fill();
  ctx.fillStyle = '#f8f9fa';
  ctx.fillRect(-16, -3, 32, 6);
  ctx.fillStyle = '#1d3557';
  ctx.fillRect(-34, -3, 20, 6);
  ctx.fillStyle = '#dfe8ff';
  ctx.beginPath();
  ctx.arc(10, 0, 5, 0, Math.PI * 2);
  ctx.fill();
  // Rotor blur.
  ctx.strokeStyle = 'rgba(20,24,40,0.5)';
  ctx.lineWidth = 3;
  const r = h.rotor;
  ctx.beginPath();
  ctx.moveTo(Math.cos(r) * -30, Math.sin(r) * -30);
  ctx.lineTo(Math.cos(r) * 30, Math.sin(r) * 30);
  ctx.moveTo(Math.cos(r + Math.PI / 2) * -30, Math.sin(r + Math.PI / 2) * -30);
  ctx.lineTo(Math.cos(r + Math.PI / 2) * 30, Math.sin(r + Math.PI / 2) * 30);
  ctx.stroke();
  ctx.restore();
  // "AIR ONE" tag.
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 10px Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('AIR ONE', hx, hy - 22);
};
