// Solara City — keyboard and mouse input.
//
// Tracks held keys, edge-triggered presses and the mouse position in canvas
// coordinates. The game loop consumes `pressed` once per frame (main.js
// clears it after each update), so a single key tap fires exactly once.

SC.input = {
  keys: {}, // code -> true while held
  pressed: {}, // code -> true only on the frame it went down
  mouse: { x: 640, y: 360, down: false, clicked: false },
};

SC.input.isDown = (code) => !!SC.input.keys[code];
SC.input.wasPressed = (code) => !!SC.input.pressed[code];

SC.input.attach = (canvas) => {
  const block = (e) => {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
  };
  window.addEventListener('keydown', (e) => {
    block(e);
    if (!SC.input.keys[e.code]) SC.input.pressed[e.code] = true;
    SC.input.keys[e.code] = true;
  });
  window.addEventListener('keyup', (e) => {
    SC.input.keys[e.code] = false;
  });
  window.addEventListener('blur', () => {
    SC.input.keys = {};
  });
  canvas.addEventListener('mousemove', (e) => {
    const r = canvas.getBoundingClientRect();
    SC.input.mouse.x = e.clientX - r.left;
    SC.input.mouse.y = e.clientY - r.top;
  });
  canvas.addEventListener('mousedown', (e) => {
    if (e.button === 0) {
      SC.input.mouse.down = true;
      SC.input.mouse.clicked = true;
    }
  });
  window.addEventListener('mouseup', () => {
    SC.input.mouse.down = false;
  });
};

// Call once per frame, after the update, so presses do not leak into the
// next frame.
SC.input.endFrame = () => {
  SC.input.pressed = {};
  SC.input.mouse.clicked = false;
};

// Movement vector from WASD or arrows, normalised.
SC.input.moveVector = () => {
  const k = SC.input.keys;
  let x = 0;
  let y = 0;
  if (k.KeyA || k.ArrowLeft) x -= 1;
  if (k.KeyD || k.ArrowRight) x += 1;
  if (k.KeyW || k.ArrowUp) y -= 1;
  if (k.KeyS || k.ArrowDown) y += 1;
  if (x !== 0 && y !== 0) {
    const inv = 1 / Math.hypot(x, y);
    x *= inv;
    y *= inv;
  }
  return { x, y };
};
