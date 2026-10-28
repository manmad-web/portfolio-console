/* ==========================================================================
   Portfolio Console — background snake
   A translucent snake plays itself behind the page, eating little star
   prizes scattered over the screen.

   - Forbidden zones: every piece of text, the header, the console and the
     email menu are off limits. Neither the snake nor a prize can enter
     them, so the content is never covered. The zones are measured from the
     real page and re-measured as it changes.
   - Runs by itself, very slowly. It finds the nearest prize with a
     breadth-first search that goes around the forbidden zones.
   - Arrow keys take over. After a while without input it goes back to
     playing itself. The arrow keys cannot steer it into a forbidden zone.
   - It starts as just a head. Eating a prize makes it longer and adds
     to the star counter under Let's Talk. It never dies: running into itself
     just trims its tail.
   - Off by default for visitors who prefer reduced motion. A footer button
     turns it on or off and remembers the choice on this device.
   ========================================================================== */
(() => {
  const canvas = document.getElementById('snake');
  const toggle = document.getElementById('snake-toggle');
  const counter = document.getElementById('star-count');
  if (!canvas || !canvas.getContext) return;
  const ctx = canvas.getContext('2d');
  const reducedMq = matchMedia('(prefers-reduced-motion: reduce)');

  const CELL = 24;               // grid size in CSS pixels
  const TICK = 450;              // ms per step: very slow
  const USER_HOLD = 15000;       // ms the arrow keys keep control after the last press
  const GROW = 3;                // segments gained per prize
  const MARGIN = 14;             // px of breathing room kept around text
  const SNAKE = [92, 225, 200];  // mint, clearly different from the warm page palette
  const PRIZES = ['#EC6426', '#F8A91F', '#E4A5CA', '#FDE3CF', '#72AC43'];
  // Everything that carries content. Measured live, so edits to the page are picked up.
  const ZONES = ['.mark', 'nav.main', '.hdr-right', '.intro-row', '.intro h1', '.intro p',
                 '#device', 'footer span', '#mail-menu', '.star-count', 'dialog[open]'];

  let cols = 0, rows = 0, dpr = 1, wall = new Uint8Array(0), freeCount = 0, usable = true;
  let snake = [], dir = { x: 1, y: 0 }, queued = null, queue2 = null, growth = 0;
  let prizes = [];
  let lastInput = -Infinity, acc = 0, last = 0, raf = 0, on = false, eaten = 0, flash = 0;

  const wrap = (v, n) => (v % n + n) % n;
  const same = (a, b) => a.x === b.x && a.y === b.y;
  const hits = (cell, skipTail) => snake.some((s, i) => !(skipTail && i === snake.length - 1) && same(s, cell));
  const rnd = n => Math.floor(Math.random() * n);
  const idx = c => c.y * cols + c.x;
  const isWall = c => wall[idx(c)] === 1;

  function stored() { try { return localStorage.getItem('portfolio-snake'); } catch (e) { return null; } }
  function remember(v) { try { localStorage.setItem('portfolio-snake', v); } catch (e) {} }

  /* ---------- forbidden zones ---------- */
  function measure() {
    const grid = new Uint8Array(cols * rows);
    for (const sel of ZONES) {
      document.querySelectorAll(sel).forEach(el => {
        if (el.hidden) return;
        const r = el.getBoundingClientRect();
        if (r.width < 2 || r.height < 2) return;
        const x0 = Math.max(0, Math.floor((r.left - MARGIN) / CELL)), x1 = Math.min(cols - 1, Math.floor((r.right + MARGIN) / CELL));
        const y0 = Math.max(0, Math.floor((r.top - MARGIN) / CELL)), y1 = Math.min(rows - 1, Math.floor((r.bottom + MARGIN) / CELL));
        for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) grid[y * cols + x] = 1;
      });
    }
    wall = grid;
    freeCount = 0; for (let i = 0; i < grid.length; i++) if (!grid[i]) freeCount++;
    usable = freeCount >= 60;                                   // on a phone there may be no free room at all
    canvas.style.visibility = usable ? '' : 'hidden';
    // Anything caught inside a newly forbidden zone is moved out.
    prizes = prizes.filter(p => !isWall(p));
    if (snake.length && snake.some(isWall)) restart();
    fillPrizes();
  }

  /* ---------- sizing ---------- */
  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = innerWidth, h = innerHeight;
    canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    cols = Math.max(8, Math.floor(w / CELL)); rows = Math.max(6, Math.floor(h / CELL));
    prizes = prizes.filter(p => p.x < cols && p.y < rows);
    snake = snake.filter(s => s.x < cols && s.y < rows);
    measure();
    if (!snake.length && on) restart();
    draw(performance.now());
  }

  /* ---------- prizes ---------- */
  function spawn() {
    for (let tries = 0; tries < 120; tries++) {
      const c = { x: rnd(cols), y: rnd(rows) };
      if (isWall(c) || hits(c) || prizes.some(p => same(p, c))) continue;
      c.color = PRIZES[rnd(PRIZES.length)]; c.phase = Math.random() * 6.28;
      return c;
    }
    return null;
  }
  function fillPrizes() {
    if (!usable) return;
    const want = Math.min(12, Math.floor(freeCount / 35));
    while (prizes.length < want) { const p = spawn(); if (!p) break; prizes.push(p); }
  }

  /* ---------- game ---------- */
  // Start (or restart) from a random free cell; the snake grows to full length as it moves.
  function restart() {
    let c = null;
    for (let tries = 0; tries < 300 && !c; tries++) { const t = { x: rnd(cols), y: rnd(rows) }; if (!isWall(t)) c = t; }
    snake = c ? [c] : [];
    growth = 0; queued = queue2 = null; dir = { x: 1, y: 0 };
  }
  function showCount() { if (counter) counter.textContent = '★ ' + eaten; }
  const head = () => snake[0];
  const nextOf = d => ({ x: wrap(head().x + d.x, cols), y: wrap(head().y + d.y, rows) });
  const safe = d => { const c = nextOf(d); return !isWall(c) && !hits(c, true); };
  const open = d => !isWall(nextOf(d));                          // free of text, though it may bite itself
  const turns = () => [dir, { x: dir.y, y: -dir.x }, { x: -dir.y, y: dir.x }];

  // Breadth-first search over free cells, wrapping at the edges, to the nearest prize.
  function pathStep() {
    if (!prizes.length) return null;
    const start = head(), seen = new Int32Array(cols * rows).fill(-1), first = new Int8Array(cols * rows).fill(-1);
    const body = new Set(snake.slice(0, -1).map(idx));
    const dirs = [dir, { x: dir.y, y: -dir.x }, { x: -dir.y, y: dir.x }];
    const targets = new Set(prizes.map(idx));
    const q = [];
    dirs.forEach((d, i) => {
      const c = { x: wrap(start.x + d.x, cols), y: wrap(start.y + d.y, rows) }, k = idx(c);
      if (isWall(c) || body.has(k) || seen[k] >= 0) return;
      seen[k] = 1; first[k] = i; q.push(c);
    });
    for (let h = 0; h < q.length; h++) {
      const c = q[h], k = idx(c);
      if (targets.has(k)) return dirs[first[k]];
      for (const d of [{ x: 1, y: 0 }, { x: -1, y: 0 }, { x: 0, y: 1 }, { x: 0, y: -1 }]) {
        const n = { x: wrap(c.x + d.x, cols), y: wrap(c.y + d.y, rows) }, nk = idx(n);
        if (seen[nk] >= 0 || isWall(n) || body.has(nk)) continue;
        seen[nk] = seen[k] + 1; first[nk] = first[k]; q.push(n);
      }
    }
    return null;
  }
  function autoSteer() {
    const options = turns().filter(safe);
    if (!options.length) return null;
    if (Math.random() < 0.05) return options[rnd(options.length)];   // wander a little
    return pathStep() || (safe(dir) ? dir : options[0]);
  }
  function step(now) {
    if (!usable || !snake.length) return;
    const userControl = now - lastInput < USER_HOLD;
    let d = null;
    if (userControl) {
      if (queued) { const q = queued; queued = queue2; queue2 = null; if (open(q)) d = q; }   // arrows never enter text areas
      if (!d && open(dir)) d = dir;
    } else {
      queued = queue2 = null;
      d = autoSteer();
    }
    if (!d) d = turns().find(safe) || turns().find(open) || (open({ x: -dir.x, y: -dir.y }) ? { x: -dir.x, y: -dir.y } : null);
    if (!d) { restart(); return; }                                   // boxed in by text: start over somewhere free
    dir = d;
    const nh = { x: wrap(head().x + dir.x, cols), y: wrap(head().y + dir.y, rows) };
    const bite = snake.findIndex((s, i) => i > 0 && same(s, nh));
    if (bite > 0) snake.length = Math.max(1, bite);                  // never dies, just trims
    snake.unshift(nh);
    const pi = prizes.findIndex(p => same(p, nh));
    if (pi >= 0) { prizes.splice(pi, 1); growth += GROW; eaten++; flash = performance.now(); showCount(); fillPrizes(); }
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
    if (!on || !usable) return;
    for (const p of prizes) star(p.x * CELL + CELL / 2, p.y * CELL + CELL / 2, CELL * 0.4, p.color, t, p.phase);
    const n = snake.length;
    if (!n) return;
    for (let i = n - 1; i >= 0; i--) {
      const s = snake[i], k = 1 - i / n;
      ctx.beginPath();
      ctx.arc(s.x * CELL + CELL / 2, s.y * CELL + CELL / 2, CELL * (0.3 + 0.22 * k), 0, 6.2832);
      ctx.fillStyle = `rgba(${SNAKE[0]},${SNAKE[1]},${SNAKE[2]},${(0.22 + 0.4 * k).toFixed(3)})`;
      ctx.fill();
    }
    const h = snake[0], hx = h.x * CELL + CELL / 2, hy = h.y * CELL + CELL / 2;
    const pop = Math.max(0, 1 - (t - flash) / 450);
    ctx.beginPath(); ctx.arc(hx, hy, CELL * (0.5 + 0.22 * pop), 0, 6.2832);
    ctx.fillStyle = `rgba(${SNAKE[0]},${SNAKE[1]},${SNAKE[2]},0.7)`; ctx.shadowColor = `rgb(${SNAKE[0]},${SNAKE[1]},${SNAKE[2]})`; ctx.shadowBlur = 14; ctx.fill();
    ctx.shadowBlur = 0; ctx.fillStyle = 'rgba(10,20,18,.85)';
    const px = -dir.y * CELL * 0.16, py = dir.x * CELL * 0.16, fx = dir.x * CELL * 0.14, fy = dir.y * CELL * 0.14;
    for (const sgn of [-1, 1]) { ctx.beginPath(); ctx.arc(hx + fx + sgn * px, hy + fy + sgn * py, CELL * 0.07, 0, 6.2832); ctx.fill(); }
  }
  let lastMeasure = 0;
  function frame(now) {
    raf = requestAnimationFrame(frame);
    if (document.hidden) { last = now; return; }
    if (now - lastMeasure > 500) { lastMeasure = now; measure(); }     // pick up layout changes and the email menu
    acc += Math.min(now - last, 250); last = now;
    while (acc >= TICK) { step(now); acc -= TICK; }
    draw(now);
  }

  /* ---------- on / off ---------- */
  function setOn(v, save) {
    on = v;
    canvas.hidden = !v;
    if (counter) counter.hidden = !v;
    if (toggle) { toggle.setAttribute('aria-pressed', String(v)); toggle.textContent = v ? 'Snake: on (use arrow keys)' : 'Snake: off'; }
    if (save) remember(v ? 'on' : 'off');
    cancelAnimationFrame(raf);
    if (v) {
      measure();
      if (!snake.length) restart();
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
    if (!d || !on || !usable || e.altKey || e.ctrlKey || e.metaKey) return;
    // Leave the arrow keys alone inside dialogs, the email menu and text fields.
    if (document.querySelector('dialog[open]')) return;
    const mm = document.getElementById('mail-menu');
    if (mm && !mm.hidden) return;
    const t = e.target;
    if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
    e.preventDefault();
    const base = queued || dir;
    if (d.x === -base.x && d.y === -base.y) return;                  // no instant U-turns
    if (!queued) queued = d; else queue2 = d;                        // remember a second quick press
    lastInput = performance.now();
  });

  /* ---------- boot ---------- */
  addEventListener('resize', resize);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(measure);
  resize();
  const pref = stored();
  setOn(pref ? pref === 'on' : !reducedMq.matches, false);
})();
