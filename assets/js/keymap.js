/* ==========================================================================
   Portfolio Console — keymap
   Every keycap, its colour, where it sits on the device and what it opens.

   Coordinates are measured on the 1536 × 1024 device artboard:
     x, y  → centre of the switch well
     w, h  → fitted base size of the keycap
   The case artwork (wells, trays) and the HTML keycaps are both generated
   from these numbers, so they can never drift apart.

   open    → id of a section in SECTIONS (opens the dialog)
   contact → true for keys that jump to the contact section instead
   title / desc → what the device screen types while the key is hovered
   ========================================================================== */

window.PORTFOLIO_KEYS = [
  // ---- Top row: P O R T F ----
  { ltr: 'P', lbl: 'Experience',      x: 379,  y: 590, w: 156, h: 130, c: '#EC6426', b: '#AD4017', ink: '#66271B', open: 'experience',
    title: "Where I've worked",    desc: 'AI Analyst co-op at BC Gov. AI engineering at TechVest.' },
  { ltr: 'O', lbl: 'Research',        x: 580,  y: 580, w: 156, h: 130, c: '#F8A91F', b: '#BC7512', ink: '#66271B', open: 'research',
    title: 'Research',             desc: 'Grounded audit agents at SFU. Robust CNN + LSTM at FDU.' },
  { ltr: 'R', lbl: 'Awards',          x: 782,  y: 570, w: 156, h: 130, c: '#FDE3CF', b: '#CAA58A', ink: '#66271B', open: 'awards',
    title: 'Competition wins',     desc: "1st place, People's Choice and a Top Idea podium." },
  { ltr: 'T', lbl: 'Tech stack',      x: 982,  y: 559, w: 156, h: 130, c: '#2E573A', b: '#193A23', ink: '#FDE3CF', open: 'stack',
    title: 'What I build with',    desc: 'Python, PyTorch, LangGraph, PyRIT, React, Docker.' },
  { ltr: 'F', lbl: 'Projects', x: 1184, y: 548, w: 156, h: 130, c: '#72AC43', b: '#487A26', ink: '#66271B', open: 'builds',
    title: 'See my projects',      desc: 'Safety research, AI products, apps and competition wins.' },

  // ---- Lower row: O L I O ★ + LET'S TALK ----
  { ltr: 'O', lbl: 'About me',        x: 355,  y: 783, w: 98,  h: 108, c: '#E4A5CA', b: '#B76F9B', ink: '#66271B', open: 'about',
    title: 'A little about me',    desc: 'CS major, stats minor at Simon Fraser University.' },
  { ltr: 'L', lbl: 'Leadership',      x: 479,  y: 776, w: 98,  h: 108, c: '#66271B', b: '#40150E', ink: '#FDE3CF', open: 'leadership',
    title: 'Clubs & campus',       desc: 'SFSS Associate VP, ambassador and peer mentor.' },
  { ltr: 'I', lbl: 'Certified',       x: 602,  y: 770, w: 98,  h: 108, c: '#EC6426', b: '#AD4017', ink: '#66271B', open: 'certs',
    title: 'Certifications',       desc: 'CSC, Bloomberg Market Concepts, Certified ScrumMaster.' },
  { ltr: 'O', lbl: 'Say hello',       x: 728,  y: 763, w: 98,  h: 108, c: '#F8A91F', b: '#BC7512', ink: '#66271B', contact: true,
    title: 'Say hello',            desc: 'mma310@sfu.ca' },
  { ltr: '★', lbl: 'Portfolio',       x: 852,  y: 756, w: 98,  h: 108, c: '#E4A5CA', b: '#B76F9B', ink: '#66271B', open: 'timeline',
    title: 'Explore my portfolio', desc: 'Every role, win and milestone since 2023.' },
  { ltr: "LET'S TALK", lbl: '',       x: 1135, y: 745, w: 374, h: 112, c: '#252525', b: '#101010', ink: '#FFFFFF', contact: true, bar: true,
    title: "Let's talk",           desc: 'Co-op, new-grad and AI projects welcome.' },
];

/* Section id → <template> holding its content, and the dialog heading. */
window.PORTFOLIO_SECTIONS = {
  experience: { t: 't-experience', h: 'Experience' },
  research:   { t: 't-research',   h: 'Research' },
  awards:     { t: 't-awards',     h: 'Competition wins' },
  stack:      { t: 't-stack',      h: 'Tech stack' },
  builds:     { t: 't-builds',     h: 'Projects' },
  about:      { t: 't-about',      h: 'About me' },
  leadership: { t: 't-leadership', h: 'Clubs & campus' },
  certs:      { t: 't-certs',      h: 'Certifications' },
  timeline:   { t: 't-timeline',   h: 'Portfolio timeline' },
};

/* "Take a break" game slot. Leave as null to hide the button.
   To turn it on, put an offline game (plain HTML/JS) in games/<name>/ and set:
   window.PORTFOLIO_GAME = { title: 'Game name', src: 'games/<name>/index.html' }; */
window.PORTFOLIO_GAME = null;
