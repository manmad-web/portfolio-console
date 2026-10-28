/* ==========================================================================
   Portfolio Console — background snake
   A translucent snake glides behind the page and eats little star prizes.

   - Like the classic game: it waits as just a head until your first arrow
     press, then keeps gliding forward by itself. The arrow keys only turn
     it. It never plays itself.
   - Motion is continuous (no grid steps): constant slow speed, with turns
     that curve instead of snapping.
   - Forbidden zones: the header, the "Hi, I'm Manish" greeting, every line
     of text, the footer, the email menu and open dialogs. Neither the snake
     nor a prize can enter them, and the snake turns away before it gets
     there. The console is the one exception: the snake may glide behind it
     (prizes are kept off it so every one stays visible).
   - Eating a prize makes it longer and adds to the star counter under
     Let's Talk. It never dies: running into itself just trims its tail.
   - Off by default for visitors who prefer reduced motion. A footer button
     turns it on or off and remembers the choice on this device.
   ========================================================================== */
(() => {
  const canvas = document.getElementById('snake');
  const toggle = document.getElementById('snake-toggle');
  const counter = document.getElementById('star-count');
  const num = document.getElementById('star-num');
  const pauseBtn = document.getElementById('snake-pause');
  if (!canvas || !canvas.getContext) return;
  const ctx = canvas.getContext('2d');
  const reducedMq = matchMedia('(prefers-reduced-motion: reduce)');
  // Phones and touch tablets have no arrow keys: the snake, stars, counter and pause button stay off.
  const phoneMq = matchMedia('(max-width: 820px), (hover: none) and (pointer: coarse)');

  const SPEED = 80;              // px per second: slow and steady
  const TURN = 5;                // radians per second the head can swing (turns curve)
  const SPACING = 15;            // px between body segments
  const GROW = 60;               // px of length gained per prize
  const GROW_RATE = 70;          // px per second the body lengthens after eating
  const LOOK = 22;               // how far ahead the snake checks for text
  const MARGIN = 14;             // px of breathing room kept around text
  const EAT = 20;                // px reach for eating a prize
  let SNAKE = [17, 17, 17], EYE = '#F5EFE3', A0 = 0.34, A1 = 0.5, GLOW = 0, STROKE = '';   // overridden by the theme (see theme.css)
  const PRIZES = ['#EC6426', '#F8A91F', '#E4A5CA', '#FDE3CF', '#72AC43'];
  // Anything with words on it. Measured live, so edits to the page are picked up.
  const TEXT = ['.mark', 'nav.main', '.hdr-right', '.intro-row', '.intro h1', '.intro p', '.hint',
                'footer span', '#mail-menu', '.star-count', 'dialog[open]'];

  let W = 0, H = 0, dpr = 1, textRects = [], dev = null, usable = true;
  let hx = 0, hy = 0, theta = 0, want = 0, moving = false;
  let len = 0, target = 0, path = [], pts = [];
  let stars = [], eaten = 0, flash = 0;
  let raf = 0, on = false, last = 0, lastMeasure = 0;
  let userPaused = false, evading = false, speedK = 1, inside = 0;

  const rnd = (a, b) => a + Math.random() * (b - a);
  const TAU = Math.PI * 2;
  const angDiff = (a, b) => { let d = (a - b) % TAU; if (d > Math.PI) d -= TAU; if (d < -Math.PI) d += TAU; return d; };
  const inRect = (x, y, r) => x > r.l && x < r.r && y > r.t && y < r.b;
  const inText = (x, y) => x < 10 || y < 10 || x > W - 10 || y > H - 10 || textRects.some(r => inRect(x, y, r));
  const ahead = (th, d) => !inText(hx + Math.cos(th) * d, hy + Math.sin(th) * d);

  // Colours come from CSS variables so the snake always matches the page theme.
  function readTheme() {
    const cs = getComputedStyle(document.documentElement), v = n => cs.getPropertyValue(n).trim();
    const rgb = v('--snake-rgb').split(',').map(Number);
    if (rgb.length === 3 && rgb.every(n => n >= 0)) SNAKE = rgb;
    EYE = v('--snake-eye') || EYE;
    A0 = parseFloat(v('--snake-a0')) || A0; A1 = parseFloat(v('--snake-a1')) || A1;
    GLOW = parseFloat(v('--snake-glow')); if (isNaN(GLOW)) GLOW = 0;
    STROKE = v('--star-stroke');
  }
  function stored() { try { return localStorage.getItem('portfolio-snake'); } catch (e) { return null; } }
  function remember(v) { try { localStorage.setItem('portfolio-snake', v); } catch (e) {} }
  function showCount() {
    if (!num) return;
    num.textContent = '★ ' + eaten;
    num.classList.remove('bump'); void num.offsetWidth; num.classList.add('bump');
  }
  function paused() {
    const mm = document.getElementById('mail-menu');
    return userPaused || document.hidden || !!document.querySelector('dialog[open]') || (mm && !mm.hidden);
  }

  /* ---------- forbidden zones ---------- */
  function box(el, pad) {
    const r = el.getBoundingClientRect();
    return (r.width < 2 || r.height < 2) ? null : { l: r.left - pad, r: r.right + pad, t: r.top - pad, b: r.bottom + pad };
  }
  function measure() {
    const rects = [];
    for (const sel of TEXT) document.querySelectorAll(sel).forEach(el => { if (!el.hidden) { const b = box(el, MARGIN); if (b) rects.push(b); } });
    textRects = rects;
    const d = document.getElementById('device');
    dev = d ? box(d, 8) : null;
    // Is there any real room? On a phone the content can fill the whole screen.
    let free = 0, total = 0;
    for (let y = 12; y < H; y += 24) for (let x = 12; x < W; x += 24) { total++; if (!inText(x, y)) free++; }
    usable = free >= 40;
    canvas.style.visibility = usable ? '' : 'hidden';
    stars = stars.filter(s => !inText(s.x, s.y) && !(dev && inRect(s.x, s.y, dev)));
    fillStars();
  }

  /* ---------- sizing ---------- */
  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = innerWidth; H = innerHeight;
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    measure();
    if (!path.length && on) restart();
    draw(performance.now());
  }

  /* ---------- prizes ---------- */
  function spawnStar() {
    for (let tries = 0; tries < 200; tries++) {
      const x = rnd(24, W - 24), y = rnd(24, H - 24);
      if (inText(x, y) || (dev && inRect(x, y, dev)) || stars.some(s => Math.hypot(s.x - x, s.y - y) < 70)) continue;
      return { x, y, color: PRIZES[Math.floor(Math.random() * PRIZES.length)], phase: Math.random() * 6.28 };
    }
    return null;
  }
  function fillStars() {
    if (!usable) return;
    const want = Math.min(12, Math.max(3, Math.floor(W * H / 90000)));
    while (stars.length < want) { const s = spawnStar(); if (!s) break; stars.push(s); }
  }

  /* ---------- game ---------- */
  function restart() {
    let p = null;
    for (let tries = 0; tries < 300 && !p; tries++) {
      const x = rnd(30, W - 30), y = rnd(30, H - 30);
      if (!inText(x, y) && !(dev && inRect(x, y, dev))) p = { x, y };
    }
    if (!p) p = { x: W / 2, y: H / 2 };
    hx = p.x; hy = p.y; theta = want = 0; moving = false;
    len = target = 0; path = [{ x: hx, y: hy }]; evading = false; speedK = 1; inside = 0;
  }

  // Positions of the body, walking back along the path every SPACING px. Index 0 is the head.
  function sample() {
    const out = [{ x: hx, y: hy }];
    let need = SPACING, acc = 0, keep = 0;
    for (let i = path.length - 1; i > 0; i--) {
      const a = path[i], b = path[i - 1], seg = Math.hypot(a.x - b.x, a.y - b.y);
      keep = i - 1;
      while (acc + seg >= need && need <= len + 0.01) {
        const t = (need - acc) / seg;
        out.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
        need += SPACING;
      }
      acc += seg;
      if (acc > len + SPACING * 2) break;
    }
    if (keep > 0) path.splice(0, keep);                              // forget the path behind the tail
    return out;
  }

  function update(dt) {
    if (!moving || !usable || !path.length) return;
    // Text moved onto the snake and it cannot get out: start over somewhere free.
    if (inText(hx, hy)) { inside += dt; if (inside > 1.5) { restart(); return; } } else inside = 0;
    // Turn away from text before reaching it. Pick one side and stick with it until the way is clear
    // (re-picking every frame is what made it jitter).
    const hit = !ahead(theta, LOOK);
    if (!evading && hit) {
      const sides = [theta + Math.PI / 2, theta - Math.PI / 2].sort(() => Math.random() - 0.5);
      const free = sides.find(a => ahead(a, LOOK * 1.6));
      want = free !== undefined ? free : theta + Math.PI;
      evading = true;
    }
    if (evading && !hit && Math.abs(angDiff(want, theta)) < 0.05) evading = false;
    const d = angDiff(want, theta), maxTurn = TURN * dt;
    theta += Math.abs(d) <= maxTurn ? d : Math.sign(d) * maxTurn;
    const goal = (hit || evading) ? 0.45 : 1;                        // ease off while swinging away from text
    speedK += (goal - speedK) * Math.min(1, dt * 5);
    const v = SPEED * speedK * dt;
    hx += Math.cos(theta) * v; hy += Math.sin(theta) * v;
    const lp = path[path.length - 1];
    if (Math.hypot(hx - lp.x, hy - lp.y) >= 2) path.push({ x: hx, y: hy });
    if (len < target) len = Math.min(target, len + GROW_RATE * dt);
    // Eat prizes.
    for (let i = stars.length - 1; i >= 0; i--) {
      if (Math.hypot(stars[i].x - hx, stars[i].y - hy) < EAT) {
        stars.splice(i, 1); target += GROW; eaten++; flash = performance.now(); showCount(); fillStars();
      }
    }
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
    ctx.shadowColor = color; ctx.shadowBlur = GLOW ? 10 : 0; ctx.fillStyle = color; ctx.globalAlpha = 0.95; ctx.fill();
    if (STROKE) { ctx.shadowBlur = 0; ctx.lineWidth = 1.5; ctx.strokeStyle = STROKE; ctx.stroke(); }
    ctx.restore();
  }
  function draw(t) {
    ctx.clearRect(0, 0, W, H);
    if (!on || !usable) return;
    for (const s of stars) star(s.x, s.y, 10, s.color, t, s.phase);
    const n = pts.length;
    if (!n) return;
    for (let i = n - 1; i >= 1; i--) {
      const k = 1 - i / n;
      ctx.beginPath(); ctx.arc(pts[i].x, pts[i].y, 6.5 + 5.5 * k, 0, TAU);
      ctx.fillStyle = `rgba(${SNAKE[0]},${SNAKE[1]},${SNAKE[2]},${(A0 + A1 * k * 0.6).toFixed(3)})`;
      ctx.fill();
    }
    const pop = Math.max(0, 1 - (t - flash) / 450);
    ctx.beginPath(); ctx.arc(hx, hy, 12 + 5 * pop, 0, TAU);
    ctx.fillStyle = `rgba(${SNAKE[0]},${SNAKE[1]},${SNAKE[2]},0.88)`; ctx.shadowColor = `rgb(${SNAKE[0]},${SNAKE[1]},${SNAKE[2]})`; ctx.shadowBlur = GLOW ? 14 : 0; ctx.fill();
    ctx.shadowBlur = 0; ctx.fillStyle = EYE;
    const c = Math.cos(theta), s = Math.sin(theta);
    for (const sg of [-1, 1]) { ctx.beginPath(); ctx.arc(hx + c * 4 - s * 4 * sg, hy + s * 4 + c * 4 * sg, 1.8, 0, TAU); ctx.fill(); }
  }
  function frame(now) {
    raf = requestAnimationFrame(frame);
    if (now - lastMeasure > 500) { lastMeasure = now; measure(); }   // pick up layout changes and the email menu
    const dt = Math.min((now - last) / 1000, 0.05); last = now;
    if (!moving && usable && path.length && inText(hx, hy)) restart();   // idle head: just place it somewhere free
    if (!paused()) update(dt);
    pts = sample();
    // Running into itself only trims the tail.
    for (let i = 7; i < pts.length; i++) {
      if (Math.hypot(pts[i].x - hx, pts[i].y - hy) < 8) { len = target = i * SPACING; pts.length = i; break; }
    }
    draw(now);
  }

  /* ---------- on / off ---------- */
  function setOn(v, save) {
    if (phoneMq.matches) { v = false; save = false; }
    on = v;
    canvas.hidden = !v;
    if (counter) counter.hidden = !v;
    if (toggle) { toggle.setAttribute('aria-pressed', String(v)); toggle.textContent = v ? 'Snake: on (use arrow keys)' : 'Snake: off'; }
    if (save) remember(v ? 'on' : 'off');
    cancelAnimationFrame(raf);
    if (v) {
      measure();
      if (!path.length) restart();
      last = performance.now(); raf = requestAnimationFrame(frame);
    } else {
      ctx.clearRect(0, 0, W, H);
    }
  }
  if (toggle) toggle.addEventListener('click', () => setOn(!on, true));

  /* ---------- pause / play ---------- */
  function setPaused(p) {
    userPaused = p;
    if (pauseBtn) {
      pauseBtn.setAttribute('aria-pressed', String(p));
      pauseBtn.setAttribute('aria-label', p ? 'Resume the snake' : 'Pause the snake');
      pauseBtn.title = p ? 'Play (P)' : 'Pause (P)';
    }
  }
  if (pauseBtn) pauseBtn.addEventListener('click', () => setPaused(!userPaused));

  /* ---------- arrow keys ---------- */
  document.addEventListener('keydown', e => {
    if (e.key !== 'p' && e.key !== 'P') return;
    if (!on || e.altKey || e.ctrlKey || e.metaKey || e.repeat) return;
    if (document.querySelector('dialog[open]')) return;
    const t = e.target;
    if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
    setPaused(!userPaused);
  });
  const ANGLE = { ArrowRight: 0, ArrowDown: Math.PI / 2, ArrowLeft: Math.PI, ArrowUp: -Math.PI / 2 };
  document.addEventListener('keydown', e => {
    const a = ANGLE[e.key];
    if (a === undefined || !on || !usable || e.altKey || e.ctrlKey || e.metaKey) return;
    // Leave the arrow keys alone inside dialogs, the email menu and text fields.
    if (document.querySelector('dialog[open]')) return;
    const mm = document.getElementById('mail-menu');
    if (mm && !mm.hidden) return;
    const t = e.target;
    if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
    e.preventDefault();
    if (e.repeat || userPaused) return;
    if (!ahead(a, LOOK * 2)) return;                                 // never turn toward text
    if (!moving) { moving = true; theta = want = a; return; }        // the first press sets it off
    if (Math.abs(angDiff(a, want)) > Math.PI - 0.2) return;          // no instant U-turn
    want = a;
  });

  /* ---------- boot ---------- */
  addEventListener('resize', resize);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(measure);
  readTheme();
  resize();
  const pref = stored();
  const wanted = () => (stored() ? stored() === 'on' : !reducedMq.matches);
  setOn(wanted(), false);
  phoneMq.addEventListener('change', () => setOn(wanted(), false));      // resized or rotated across the phone breakpoint
})();
