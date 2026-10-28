/* ==========================================================================
   Portfolio Console — background snake
   A translucent snake plays itself behind the page, eating little star
   prizes scattered over the whole screen. It never covers the content:
   the canvas sits under the page and ignores the mouse.

   - Runs by itself all the time (it steers toward the nearest prize).
   - Arrow keys take over. After a few seconds without input it goes
     back to playing itself.
   - Eating a prize makes it longer. It never dies: running into itself
     just trims its tail, so it can keep going forever.
   - Off by default for visitors who prefer reduced motion. A footer
     button turns it on or off and remembers the choice on this device.
   ========================================================================== */
(() => {
  const canvas = document.getElementById('snake');
  const toggle = document.getElementById('snake-toggle');
  if (!canvas || !canvas.getContext) return;
  const ctx = canvas.getContext('2d');
  const reducedMq = matchMedia('(prefers-reduced-motion: reduce)');

  const CELL = 24;               // grid size in CSS pixels
  const TICK = 105;              // ms per step
  const USER_HOLD = 5000;        // ms the arrow keys keep control
  const START_LEN = 7;
  const GROW = 2;                // segments gained per prize
  const SNAKE = [92, 225, 200];  // mint, clearly different from the warm page palette
  const PRIZES = ['#EC6426', '#F8A91F', '#E4A5CA', '#FDE3CF', '#72AC43'];

  let cols = 0, rows = 0, dpr = 1;
  let snake = [], dir = { x: 1, y: 0 }, queued = null, growth = 0;
  let prizes = [];
  let lastInput = -Infinity, acc = 0, last = 0, raf = 0, on = false, eaten = 0;

  const wrap = (v, n) => (v % n + n) % n;
  const same = (a, b) => a.x === b.x && a.y === b.y;
  const hits = (cell, skipTail) => snake.some((s, i) => !(skipTail && i === snake.length - 1) && same(s, cell));
  const rnd = n => Math.floor(Math.random() * n);

  function stored() { try { return localStorage.getItem('portfolio-snake'); } catch (e) { return null; } }
  function remember(v) { try { localStorage.setItem('portfolio-snake', v); } catch (e) {} }

  /* ---------- sizing ---------- */
  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = innerWidth, h = innerHeight;
    canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    cols = Math.max(8, Math.floor(w / CELL)); rows = Math.max(6, Math.floor(h / CELL));
    snake = snake.map(s => ({ x: wrap(s.x, cols), y: wrap(s.y, rows) }));
    prizes = prizes.filter(p => p.x < cols && p.y < rows);
    fillPrizes();
    draw(performance.now());
  }

  /* ---------- prizes ---------- */
  // Keep prizes out from under the console so every one stays visible.
  function blocked(cell) {
    const d = document.getElementById('device');
    if (!d) return false;
    const r = d.getBoundingClientRect();
    const x = cell.x * CELL + CELL / 2, y = cell.y * CELL + CELL / 2;
    return x > r.left - CELL && x < r.right + CELL && y > r.top - CELL && y < r.bottom + CELL;
  }
  function spawn() {
    for (let tries = 0; tries < 80; tries++) {
      const c = { x: rnd(cols), y: rnd(rows) };
      if (hits(c) || prizes.some(p => same(p, c)) || blocked(c)) continue;
      c.color = PRIZES[rnd(PRIZES.length)]; c.phase = Math.random() * 6.28;
      return c;
    }
    return null;
  }
  function fillPrizes() {
    const want = Math.min(12, Math.floor(cols * rows / 60));
    while (prizes.length < want) { const p = spawn(); if (!p) break; prizes.push(p); }
  }

  /* ---------- game ---------- */
  function reset() {
    const y = Math.floor(rows / 2);
    snake = Array.from({ length: START_LEN }, (_, i) => ({ x: wrap(4 - i, cols), y }));
    dir = { x: 1, y: 0 }; queued = null; growth = 0; prizes = []; eaten = 0;
    fillPrizes();
  }
  const dist = (a, b) => {
    const dx = Math.abs(a.x - b.x), dy = Math.abs(a.y - b.y);
    return Math.min(dx, cols - dx) + Math.min(dy, rows - dy);
  };
  function autoSteer() {
    const head = snake[0];
    let target = null, best = Infinity;
    for (const p of prizes) { const d = dist(head, p); if (d < best) { best = d; target = p; } }
    const options = [dir, { x: dir.y, y: -dir.x }, { x: -dir.y, y: dir.x }]
      .map(d => ({ d, cell: { x: wrap(head.x + d.x, cols), y: wrap(head.y + d.y, rows) } }))
      .filter(o => !hits(o.cell, true));
    if (!options.length) return null;
    if (Math.random() < 0.06) return options[rnd(options.length)].d;      // wander a little
    options.sort((a, b) => (target ? dist(a.cell, target) - dist(b.cell, target) : 0));
    return options[0].d;
  }
  function step(now) {
    const userControl = now - lastInput < USER_HOLD;
    let d = null;
    if (userControl && queued) d = queued;
    else if (!userControl) d = autoSteer();
    else d = dir;
    queued = null;
    if (!d) { snake.length = Math.max(START_LEN, Math.floor(snake.length / 2)); d = dir; }   // boxed in: trim and keep going
    dir = d;
    const head = { x: wrap(snake[0].x + dir.x, cols), y: wrap(snake[0].y + dir.y, rows) };
    const bite = snake.findIndex((s, i) => i > 0 && same(s, head));
    if (bite > 0) snake.length = Math.max(START_LEN, bite);                                   // never dies, just trims
    snake.unshift(head);
    const pi = prizes.findIndex(p => same(p, head));
    if (pi >= 0) { prizes.splice(pi, 1); growth += GROW; eaten++; fillPrizes(); }
    if (growth > 0) growth--; else snake.pop();
  }

  /* ---------- drawing ---------- */
  function star(cx, cy, r, color, t, phase) {
    const pulse = 1 + 0.12 * Math.sin(t / 380 + phase);
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(Math.sin(t / 900 + phase) * 0.25); ctx.scale(pulse, pulse);
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const rad = i % 2 ? r * 0.45 : r, a = -Math.PI / 2 + i * Math.PI / 5;
      ctx.lineTo(Math.cos(a) * rad, Math.sin(a) * rad);
    }
    ctx.closePath();
    ctx.shadowColor = color; ctx.shadowBlur = 10; ctx.fillStyle = color; ctx.globalAlpha = 0.85; ctx.fill();
    ctx.restore();
  }
  function draw(t) {
    ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);
    if (!on) return;
    for (const p of prizes) star(p.x * CELL + CELL / 2, p.y * CELL + CELL / 2, CELL * 0.4, p.color, t, p.phase);
    const n = snake.length;
    for (let i = n - 1; i >= 0; i--) {
      const s = snake[i], k = 1 - i / n;
      const r = CELL * (0.28 + 0.2 * k);
      ctx.beginPath();
      ctx.arc(s.x * CELL + CELL / 2, s.y * CELL + CELL / 2, r, 0, 6.2832);
      ctx.fillStyle = `rgba(${SNAKE[0]},${SNAKE[1]},${SNAKE[2]},${(0.22 + 0.4 * k).toFixed(3)})`;
      ctx.fill();
    }
    const h = snake[0], hx = h.x * CELL + CELL / 2, hy = h.y * CELL + CELL / 2;
    ctx.beginPath(); ctx.arc(hx, hy, CELL * 0.5, 0, 6.2832);
    ctx.fillStyle = `rgba(${SNAKE[0]},${SNAKE[1]},${SNAKE[2]},0.7)`; ctx.shadowColor = `rgb(${SNAKE[0]},${SNAKE[1]},${SNAKE[2]})`; ctx.shadowBlur = 14; ctx.fill();
    ctx.shadowBlur = 0; ctx.fillStyle = 'rgba(10,20,18,.85)';
    const px = -dir.y * CELL * 0.16, py = dir.x * CELL * 0.16, fx = dir.x * CELL * 0.14, fy = dir.y * CELL * 0.14;
    for (const sgn of [-1, 1]) { ctx.beginPath(); ctx.arc(hx + fx + sgn * px, hy + fy + sgn * py, CELL * 0.07, 0, 6.2832); ctx.fill(); }
  }
  function frame(now) {
    raf = requestAnimationFrame(frame);
    if (document.hidden) { last = now; return; }
    acc += Math.min(now - last, 250); last = now;
    while (acc >= TICK) { step(now); acc -= TICK; }
    draw(now);
  }

  /* ---------- on / off ---------- */
  function setOn(v, save) {
    on = v;
    canvas.hidden = !v;
    if (toggle) { toggle.setAttribute('aria-pressed', String(v)); toggle.textContent = v ? 'Snake: on' : 'Snake: off'; }
    if (save) remember(v ? 'on' : 'off');
    cancelAnimationFrame(raf);
    if (v) {
      if (!snake.length) reset();
      last = performance.now(); acc = 0; raf = requestAnimationFrame(frame);
    } else {
      ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);
    }
  }
  if (toggle) toggle.addEventListener('click', () => setOn(!on, true));

  /* ---------- arrow keys ---------- */
  const DIRS = { ArrowUp: { x: 0, y: -1 }, ArrowDown: { x: 0, y: 1 }, ArrowLeft: { x: -1, y: 0 }, ArrowRight: { x: 1, y: 0 } };
  document.addEventListener('keydown', e => {
    const d = DIRS[e.key];
    if (!d || !on || e.altKey || e.ctrlKey || e.metaKey) return;
    // Leave the arrow keys alone inside dialogs, the email menu, text fields and menus.
    if (document.querySelector('dialog[open]')) return;
    const mm = document.getElementById('mail-menu');
    if (mm && !mm.hidden) return;
    const t = e.target;
    if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
    e.preventDefault();
    if (d.x === -dir.x && d.y === -dir.y) return;          // no instant U-turns
    queued = d; lastInput = performance.now();
  });

  /* ---------- boot ---------- */
  addEventListener('resize', resize);
  resize();
  const pref = stored();
  setOn(pref ? pref === 'on' : !reducedMq.matches, false);
})();
