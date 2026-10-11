/* ==========================================================================
   Portfolio Console — behaviour
   1. Build the 3D case (extruded slabs, key trays, wells, coil hinge)
   2. Build the keycaps
   3. Display name (saved on this device only)
   4. Screen typing engine
   5. Hover / focus → screen preview
   6. Idle key wave
   7. Section dialog + contact links
   ========================================================================== */
(() => {
  const KEYS = window.PORTFOLIO_KEYS;
  const SECTIONS = window.PORTFOLIO_SECTIONS;
  const W = 1536, H = 1024;               // device artboard
  const NS = 'http://www.w3.org/2000/svg';
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const device = document.getElementById('device');
  const $ = id => document.getElementById(id);

  /* ---------- 1. Case ---------- */
  const BASE = { cx: 768, cy: 665, rot: -3.2, skew: 4.8 };   // must match the base <g> transform in index.html
  const rad = d => d * Math.PI / 180;
  const svgEl = (tag, attrs) => {
    const el = document.createElementNS(NS, tag);
    for (const k in attrs) el.setAttribute(k, attrs[k]);
    return el;
  };
  const mix = (a, b, t) => {
    const p = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
    const [A, B] = [p(a), p(b)];
    return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, '0')).join('');
  };

  // Extrude a slab: stacked copies of its outline stepping down-left, dark at the back, lit at the lip.
  function extrude(groupId, shapeId, layers, dx, dy) {
    const g = $(groupId);
    for (let k = layers; k >= 1; k--) {
      const t = 1 - k / layers;                               // 0 = back, 1 = front
      let fill = mix('#0b0b0d', '#34353a', Math.pow(t, 1.6));
      if (Math.abs(k - Math.round(layers * .55)) < 1) fill = '#09090a'; // shell seam
      g.appendChild(svgEl('use', { href: '#' + shapeId, fill, transform: `translate(${(k * dx).toFixed(2)} ${(k * dy).toFixed(2)})` }));
    }
  }
  extrude('lid-side', 'lid-shape', 22, -1.05, 1.25);
  extrude('base-side', 'base-shape', 30, -1.05, 1.35);

  // World → base-local coordinates (inverse of translate · rotate · skewX).
  function toBaseLocal(x, y) {
    const dx = x - BASE.cx, dy = y - BASE.cy;
    const a = rad(-BASE.rot), c = Math.cos(a), s = Math.sin(a);
    const rx = c * dx - s * dy, ry = s * dx + c * dy;
    return [rx - Math.tan(rad(BASE.skew)) * ry, ry];
  }

  // Recessed trays, sized from the keys they hold.
  const trays = $('trays');
  [KEYS.slice(0, 5), KEYS.slice(5)].forEach(row => {
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    row.forEach(k => {
      const [lx, ly] = toBaseLocal(k.x, k.y);
      x0 = Math.min(x0, lx - k.w / 2); x1 = Math.max(x1, lx + k.w / 2);
      y0 = Math.min(y0, ly - k.h / 2); y1 = Math.max(y1, ly + k.h / 2);
    });
    const pad = 24, r = { x: x0 - pad, y: y0 - pad, width: x1 - x0 + pad * 2, height: y1 - y0 + pad * 2, rx: 34 };
    trays.appendChild(svgEl('rect', { ...r, x: r.x - 4, y: r.y - 4, width: r.width + 8, height: r.height + 8, rx: 38, fill: 'url(#g-tray-rim)' }));
    trays.appendChild(svgEl('rect', { ...r, fill: 'url(#g-tray)' }));
    trays.appendChild(svgEl('rect', { ...r, fill: 'none', stroke: '#000', 'stroke-width': 6, opacity: .55 }));
    trays.appendChild(svgEl('rect', { x: r.x + 18, y: r.y + r.height - 3, width: r.width - 36, height: 2, rx: 1, fill: '#6a6b72', opacity: .55 }));
  });

  // Switch wells, one per key, in world coordinates.
  const wells = $('wells');
  KEYS.forEach(k => {
    const g = svgEl('g', { transform: `translate(${k.x} ${k.y}) rotate(-3.2) skewX(4.8)` });
    const p = 8, w = k.w + p * 2, h = k.h + p * 2;
    g.appendChild(svgEl('rect', { x: -w / 2, y: -h / 2, width: w, height: h, rx: 20, fill: '#050506' }));
    g.appendChild(svgEl('rect', { x: -w / 2 + 3, y: -h / 2 + 3, width: w - 6, height: 12, rx: 6, fill: '#000', opacity: .7 }));
    g.appendChild(svgEl('rect', { x: -w / 2 + 10, y: h / 2 - 3, width: w - 20, height: 2, rx: 1, fill: '#4a4b51', opacity: .6 }));
    wells.appendChild(g);
  });

  // Copper coil hinge.
  const coil = $('coil-rings');
  for (let x = -76; x <= 76; x += 8) {
    coil.appendChild(svgEl('path', { d: `M${x} -21 L${x + 5} 21`, stroke: '#3d1303', 'stroke-width': 3, 'stroke-linecap': 'round', opacity: .85 }));
    coil.appendChild(svgEl('path', { d: `M${x + 2.4} -19 L${x + 6.4} 13`, stroke: '#ffd2ad', 'stroke-width': 1.1, 'stroke-linecap': 'round', opacity: .55 }));
  }

  /* ---------- 2. Keycaps ---------- */
  const pct = (v, d) => (v / d * 100).toFixed(4) + '%';
  KEYS.forEach((k, i) => {
    const el = document.createElement(k.contact ? 'a' : 'button');
    if (k.contact) { el.href = '#contact'; el.setAttribute('data-contact', ''); }
    else { el.type = 'button'; el.dataset.open = k.open; el.setAttribute('aria-haspopup', 'dialog'); }
    el.className = 'key' + (k.w < 120 ? ' sm' : '') + (k.bar ? ' bar' : '');
    el.style.cssText = `left:${pct(k.x - k.w / 2, W)};top:${pct(k.y - k.h / 2, H)};width:${pct(k.w, W)};height:${pct(k.h, H)};--c:${k.c};--b:${k.b};--ink:${k.ink};--i:${i}`;
    el.setAttribute('aria-label', k.bar ? "Let's talk: contact" : `${k.ltr === '★' ? 'Portfolio' : k.ltr}: ${k.title}`);
    el.innerHTML = '<span class="key-base"></span><span class="key-face" aria-hidden="true">' +
      (k.bar ? `<span class="ltr">LET'S TALK</span><span class="ret">↵</span>`
             : `<span class="ltr">${k.ltr}</span><span class="lbl">${k.lbl}</span>`) + '</span>';
    el._k = k;
    device.appendChild(el);
  });
  const keyEls = [...device.querySelectorAll('.key')];
  const isKey = el => !!(el && el.classList && el.classList.contains('key'));

  /* ---------- 3. Display name ---------- */
  const NAME_KEY = 'portfolio-console-name';
  let name = 'Manish';
  try { const s = localStorage.getItem(NAME_KEY); if (s && s.trim()) name = s.trim().slice(0, 24); } catch (e) {}
  const nameBtn = $('name-btn');
  function applyName() {
    nameBtn.textContent = name;
    nameBtn.setAttribute('aria-label', `Edit display name, currently ${name}`);
    $('scr-owner').textContent = `${name.toUpperCase()} / CAREER INDEX`;
  }
  applyName();
  nameBtn.addEventListener('click', () => {
    const input = document.createElement('input');
    input.className = 'name-input'; input.id = 'name-input'; input.value = name; input.maxLength = 24;
    input.setAttribute('aria-label', 'Display name');
    nameBtn.replaceWith(input); input.focus(); input.select();
    let done = false;
    const finish = save => {
      if (done) return; done = true;
      if (save && input.value.trim()) {
        name = input.value.trim();
        try { localStorage.setItem(NAME_KEY, name); } catch (e) {}
      }
      input.replaceWith(nameBtn); applyName(); nameBtn.focus();
      currentText = null; showWelcome();
    };
    input.addEventListener('keydown', e => {
      if (e.key === 'Enter') finish(true);
      if (e.key === 'Escape') { e.preventDefault(); finish(false); }
    });
    input.addEventListener('blur', () => finish(true));
  });

  /* ---------- 4. Typing engine ---------- */
  // One timer only: every new request cancels the previous one, so text never interleaves.
  const titleEl = $('scr-title'), textEl = $('scr-text'), descEl = $('scr-desc'), statusEl = $('scr-status');
  let typeTimer = null, currentText = null;
  function typeTo(text, desc, pause = 350) {
    if (text === currentText) return;                 // ignore redundant requests
    clearTimeout(typeTimer); typeTimer = null;
    currentText = text;
    titleEl.setAttribute('aria-label', text);         // full label for assistive tech
    descEl.textContent = desc;
    if (reduced.matches) { textEl.textContent = text; statusEl.textContent = 'READY'; return; }
    textEl.textContent = ''; statusEl.textContent = 'TYPING';
    let i = 0;
    const step = () => {
      i++; textEl.textContent = text.slice(0, i);
      if (i < text.length) typeTimer = setTimeout(step, 110);
      else { typeTimer = null; statusEl.textContent = 'READY'; }
    };
    typeTimer = setTimeout(step, pause);
  }
  const showWelcome = () => typeTo(`${name}'s portfolio`, 'CS at SFU. AI agents, evals and red-teaming.');

  /* ---------- 5. Hover / focus preview ---------- */
  const panel = $('panel');
  let hoverKey = null, restoreTimer = null, lastInteract = 0;
  function scheduleRestore() {
    clearTimeout(restoreTimer);
    restoreTimer = setTimeout(() => {
      if (panel.open || hoverKey || isKey(document.activeElement)) return;
      showWelcome();
    }, 350);
  }
  function previewKey(el) { clearTimeout(restoreTimer); typeTo(el._k.title, el._k.desc, 60); }
  keyEls.forEach(el => {
    el.addEventListener('pointerenter', () => { hoverKey = el; stopWave(); previewKey(el); });
    el.addEventListener('pointerleave', () => { if (hoverKey === el) hoverKey = null; scheduleRestore(); });
    el.addEventListener('focus', () => { stopWave(); previewKey(el); });
    el.addEventListener('blur', scheduleRestore);
  });

  /* ---------- 6. Idle wave ---------- */
  let waveEnd = null;
  function stopWave() { device.classList.remove('wave'); lastInteract = Date.now(); }
  function wave() {
    if (reduced.matches || document.hidden || panel.open || hoverKey) return;
    if (Date.now() - lastInteract < 2500 || isKey(document.activeElement)) return;
    device.classList.remove('wave'); void device.offsetWidth; device.classList.add('wave');
    clearTimeout(waveEnd);
    waveEnd = setTimeout(() => device.classList.remove('wave'), 1100 + 85 * KEYS.length + 60);
  }
  device.addEventListener('pointermove', () => { lastInteract = Date.now(); });
  device.addEventListener('pointerdown', stopWave);
  document.addEventListener('visibilitychange', () => { if (document.hidden) device.classList.remove('wave'); });
  setInterval(wave, 7000);

  /* ---------- 7. Dialog + contact ---------- */
  let opener = null;
  function openSection(id, from) {
    const s = SECTIONS[id]; if (!s) return;
    const k = KEYS.find(key => key.open === id);
    opener = from || null;
    $('panel-title').textContent = s.h;
    const eyebrow = $('panel-eyebrow');
    eyebrow.innerHTML = '';
    if (k) {
      const chip = document.createElement('span');
      chip.className = 'chip-key'; chip.textContent = k.ltr;
      chip.style.cssText = `--c:${k.c};--b:${k.b};--ink:${k.ink}`;
      eyebrow.append(chip, document.createTextNode(`${k.ltr === '★' ? '' : k.ltr + ' / '}${k.lbl}`));
    }
    $('panel-body').replaceChildren($(s.t).content.cloneNode(true));
    stopWave();
    panel.showModal();                                 // native modal: focus trap + Escape
    panel.querySelector('.sheet').scrollTop = 0;
    $('panel-close').focus();
  }
  $('panel-close').addEventListener('click', () => panel.close());
  panel.addEventListener('click', e => { if (e.target === panel) panel.close(); });   // click outside
  panel.addEventListener('close', () => {
    if (opener && document.contains(opener)) opener.focus();                          // focus restoration
    opener = null; scheduleRestore();
  });
  document.addEventListener('click', e => {
    const b = e.target.closest('[data-open]');
    if (b) { openSection(b.dataset.open, b); return; }
    const c = e.target.closest('[data-contact]');
    if (c) {
      e.preventDefault();
      $('contact').scrollIntoView({ behavior: reduced.matches ? 'auto' : 'smooth', block: 'start' });
      $('contact-h').focus({ preventScroll: true });
    }
  });

  // Copy email, with a select-the-text fallback when the clipboard is blocked.
  const copied = $('copied');
  $('copy-email').addEventListener('click', () => {
    const addr = $('email').textContent.trim();
    const fallback = () => {
      const r = document.createRange(); r.selectNodeContents($('email'));
      const sel = getSelection(); sel.removeAllRanges(); sel.addRange(r);
      copied.textContent = 'Email selected. Press Ctrl/Cmd + C to copy.';
    };
    try { navigator.clipboard.writeText(addr).then(() => { copied.textContent = 'Email copied.'; }, fallback); }
    catch (e) { fallback(); }
  });

  /* ---------- Boot ---------- */
  showWelcome();
  setTimeout(wave, 2800);
})();
