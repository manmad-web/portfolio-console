# Design notes

Reference for anyone adjusting the console's geometry or motion.

## Coordinate system

Everything on the device lives on a **1536 × 1024** artboard. The `.device` element keeps that aspect ratio (`aspect-ratio: 1536 / 1024`) and is a size container. Every overlay is positioned in percentages of the artboard and sized in `cqw` (1 cqw = 1% of the device width), so the case, keys and screen scale as one object.

Overlay position formula, for a key with centre `(x, y)` and size `w × h`:

```
left   = (x − w/2) / 1536 × 100%
top    = (y − h/2) / 1024 × 100%
width  = w / 1536 × 100%
height = h / 1024 × 100%
```

Rotation and skew are applied around each element's own centre.

## Key fit table

| Key | Centre X | Centre Y | Width | Height |
| --- | ---: | ---: | ---: | ---: |
| P — Experience | 379 | 590 | 156 | 130 |
| O — Research | 580 | 580 | 156 | 130 |
| R — Awards | 782 | 570 | 156 | 130 |
| T — Tech stack | 982 | 559 | 156 | 130 |
| F — Featured builds | 1184 | 548 | 156 | 130 |
| O — About me | 355 | 783 | 98 | 108 |
| L — Leadership | 479 | 776 | 98 | 108 |
| I — Certified | 602 | 770 | 98 | 108 |
| O — Say hello | 728 | 763 | 98 | 108 |
| ★ — Portfolio | 852 | 756 | 98 | 108 |
| ↵ — Let's talk | 1135 | 745 | 374 | 112 |

Keys use `rotate(-3.2deg) skewX(4.8deg)`.

## Case geometry

| Part | Transform (artboard px) | Size |
| --- | --- | --- |
| Lid | `translate(772 262) rotate(-3) skewX(5)` | 1112 × 320, r 78 |
| Screen glass | inside lid | 936 × 196, r 28 |
| Screen text box | left 21.8%, top 17.9%, width 56.9%, height 15.3% | `rotate(-3deg) skewX(5deg)` |
| Coil hinge | `translate(770 440) rotate(-3.1)` | 172 × 46 coil in a 208 × 68 slot |
| Base | `translate(768 665) rotate(-3.2) skewX(4.8)` | 1236 × 428, r 70 |

**Extrusion:** the lid gets 22 layers at (−1.05, +1.25) px per layer and the base gets 30 layers at (−1.05, +1.35). Layer colour goes from `#0b0b0d` at the back to `#34353a` at the lip, with a dark seam a little past the middle.

If you change the base transform in `index.html`, update the `BASE` constant in `console.js` to match. The trays are computed from it.

## Palette

| Key | Face | Sidewall | Ink |
| --- | --- | --- | --- |
| P, I | `#EC6426` orange | `#AD4017` | `#66271B` |
| O (Research), O (Say hello) | `#F8A91F` amber | `#BC7512` | `#66271B` |
| R | `#FDE3CF` cream | `#CAA58A` | `#66271B` |
| T | `#2E573A` forest | `#193A23` | `#FDE3CF` |
| F | `#72AC43` leaf | `#487A26` | `#66271B` |
| O (About), ★ | `#E4A5CA` pink | `#B76F9B` | `#66271B` |
| L | `#66271B` brown | `#40150E` | `#FDE3CF` |
| Let's talk | `#252525` black | `#101010` | `#FFFFFF` |

Page `#111113` · screen title `#FDE3CF` · metadata and caret `#F8A91F`.

## Motion

Face height is measured as a percentage of device width:

| State | Lift |
| --- | --- |
| Rest | 1.1 cqw |
| Hover / focus | 2.9 cqw, 400 ms `cubic-bezier(.22,1.5,.4,1)` |
| Pressed | 0.25 cqw, 80 ms |
| Idle wave | 1.1 → 3.8 → 0.3 → 1.5 → 1.1 cqw over 1.1 s, staggered 85 ms per key, every 7 s |

The wave pauses while the visitor is interacting, while a dialog is open, while the tab is hidden, and while a key has keyboard focus.

## Typing

- On load: 350 ms caret pause, then about 110 ms per character.
- On key hover or focus: a 60 ms pause, then the same speed.
- Status reads `TYPING` during the reveal and `READY` after it.
- After leaving the keys, the welcome title comes back 350 ms later, unless a key is still focused or a dialog is open.
- With `prefers-reduced-motion`, full text appears immediately.
