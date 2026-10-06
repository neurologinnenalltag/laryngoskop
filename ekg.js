/* Gemeinsame Inhalte: Abbildungen + Folien + Fragen. Läuft in Node (PPTX) und im Browser (Handy-Quiz). */
(function (root) {
  'use strict';

  /* ---------- EKG-Synthese ---------- */
  const g = (t, c, a, s) => { const d = (t - c) / s; return d * d > 30 ? 0 : a * Math.exp(-0.5 * d * d); };
  const pw = (t, tp) => g(t, tp + 0.045, 0.13, 0.022);
  function beatN(t, tq, rr, noT) {
    const tOff = Math.min(0.30, rr * 0.48), ts = Math.min(0.055, rr * 0.105);
    return g(t, tq + 0.012, -0.07, 0.007) + g(t, tq + 0.035, 1.05, 0.010) + g(t, tq + 0.058, -0.22, 0.009) +
      (noT ? 0 : g(t, tq + tOff, rr < 0.4 ? 0.17 : 0.26, ts));
  }
  const beatW = (t, tq) => g(t, tq + 0.06, 0.95, 0.035) + g(t, tq + 0.16, -0.55, 0.04) + g(t, tq + 0.40, -0.3, 0.07);
  const TAU = 2 * Math.PI;
  const AF_RR = [0.42, 0.6, 0.38, 0.7, 0.45, 0.52, 0.36, 0.64, 0.4, 0.58, 0.47, 0.34, 0.66, 0.43, 0.55, 0.39];

  function sinus(rr, pq, start) {
    return (t) => { let y = 0; for (let k = -1; k < 12 / rr; k++) { const tq = start + k * rr; if (Math.abs(t - tq) < 1) y += pw(t, tq - pq) + beatN(t, tq, rr); } return y; };
  }
  const STRIP = {
    sinus: sinus(0.8, 0.16, 0.45),
    sbrady: sinus(1.35, 0.16, 0.6),
    stachy: sinus(0.5, 0.15, 0.4),
    avb1: sinus(0.9, 0.30, 0.6),
    avb2: (t) => { let y = 0; for (let k = -1; k < 12; k++) { const tp = 0.25 + k * 0.8; if (Math.abs(t - tp) > 1.2) continue; y += pw(t, tp); if (((k % 3) + 3) % 3 !== 2) y += beatN(t, tp + 0.18, 0.8); } return y; },
    avb3: (t) => { let y = 0; for (let k = -1; k < 12; k++) y += pw(t, 0.15 + k * 0.72); for (let j = -1; j < 6; j++) y += beatW(t, 0.6 + j * 1.7); return y; },
    af: (t) => { let y = 0.045 * (Math.sin(TAU * 6.3 * t) + 0.7 * Math.sin(TAU * 8.7 * t + 1) + 0.5 * Math.sin(TAU * 4.9 * t + 2)); let tq = 0.3; for (let k = 0; k < AF_RR.length; k++) { if (Math.abs(t - tq) < 0.6) y += beatN(t, tq, 0.36); tq += AF_RR[k]; } return y; },
    svt: sinus(0.34, -1, 0.2),
    vt: (t) => 0.95 * Math.sin(TAU * 3.0 * t) + 0.28 * Math.sin(TAU * 6.0 * t + 0.9),
    vf: (t) => (0.62 + 0.38 * Math.sin(TAU * 0.33 * t + 1)) * (0.36 * Math.sin(TAU * 3.7 * t) + 0.3 * Math.sin(TAU * 4.9 * t + 1.3) + 0.2 * Math.sin(TAU * 6.1 * t + 2.1) + 0.12 * Math.sin(TAU * 7.6 * t + 0.4)),
    asys: (t) => 0.025 * Math.sin(TAU * 0.25 * t) + 0.008 * Math.sin(TAU * 1.3 * t),
    ves: (t) => { let y = 0; for (let k = -1; k < 9; k++) { const tq = 0.45 + k * 0.8; if (k === 3) y += beatW(t, tq - 0.28); else y += pw(t, tq - 0.16) + beatN(t, tq, 0.8); } return y; }
  };
  STRIP.stelev = (t) => { let y = STRIP.sinus(t); for (let k = -1; k < 9; k++) { const tq = 0.45 + k * 0.8; if (Math.abs(t - tq) < 0.7) y += 0.3 * (1 / (1 + Math.exp(-(t - tq - 0.078) / 0.007))) * (1 - 1 / (1 + Math.exp(-(t - tq - 0.33) / 0.03))) + g(t, tq + 0.30, 0.15, 0.058); } return y; };
  // SVT ohne sichtbare P-Welle
  STRIP.svt = (t) => { let y = 0; for (let k = -1; k < 20; k++) { const tq = 0.2 + k * 0.34; if (Math.abs(t - tq) < 0.6) y += beatN(t, tq, 0.34); } return y; };

  const NAME = {
    sinus: 'Sinusrhythmus', sbrady: 'Sinusbradykardie', stachy: 'Sinustachykardie',
    avb1: 'AV-Block I°', avb2: 'AV-Block II° (Typ Mobitz)', avb3: 'AV-Block III°',
    af: 'Vorhofflimmern', svt: 'Supraventrikuläre Tachykardie', vt: 'Ventrikuläre Tachykardie',
    vf: 'Kammerflimmern', asys: 'Asystolie', ves: 'Ventrikuläre Extrasystole'
  };

  /* pal: {fg, muted, paper, grid, gridBold, trace, accent, surface} – CSS-Farbwerte (auch var(--x)) */
  function strip(key, pal, o) {
    o = o || {};
    const dur = o.dur || 6, W = dur * 125, H = 170, base = 100, sc = 50, f = STRIP[key];
    let thin = '', bold = '';
    for (let x = 0; x <= W; x += 5) (x % 25 ? (thin += `M${x} 0V${H}`) : (bold += `M${x} 0V${H}`));
    for (let y = 0; y <= H; y += 5) (y % 25 ? (thin += `M0 ${y}H${W}`) : (bold += `M0 ${y}H${W}`));
    let d = '';
    for (let i = 0; i <= dur * 200; i++) { const t = i / 200; d += (i ? 'L' : 'M') + (t * 125).toFixed(1) + ' ' + (base - sc * f(t)).toFixed(1); }
    const tag = o.tag ? `<g><rect x="6" y="6" width="${22 + String(o.tag).length * 11}" height="30" rx="6" style="fill:${pal.fg}"/><text x="${17 + String(o.tag).length * 5.5}" y="28" text-anchor="middle" style="fill:${pal.paper};font:700 20px Arial,Helvetica,sans-serif">${o.tag}</text></g>` : '';
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="EKG-Streifen${o.tag ? ' ' + o.tag : ''}">` +
      `<rect width="${W}" height="${H}" style="fill:${pal.paper}"/>` +
      `<path d="${thin}" style="stroke:${pal.grid};stroke-width:1;fill:none"/><path d="${bold}" style="stroke:${pal.gridBold};stroke-width:1.2;fill:none"/>` +
      `<path d="${d}" style="stroke:${pal.trace};stroke-width:2.6;fill:none;stroke-linejoin:round;stroke-linecap:round"/>${tag}</svg>`;
  }

  const marker = (n, x, y, pal) => `<circle cx="${x}" cy="${y}" r="15" style="fill:${pal.fg}"/><text x="${x}" y="${y + 6.5}" text-anchor="middle" style="fill:${pal.paper};font:700 18px Arial,Helvetica,sans-serif">${n}</text>`;
  const lead = (x1, y1, x2, y2, pal) => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" style="stroke:${pal.fg};stroke-width:1.6"/><circle cx="${x2}" cy="${y2}" r="3.2" style="fill:${pal.fg}"/>`;

  function heart(pal) {
    const a = `stroke:${pal.accent};fill:none;stroke-linecap:round;stroke-linejoin:round`;
    const o = `stroke:${pal.fg};stroke-width:2.2;stroke-linejoin:round`;
    const wall = pal.wall || pal.surface;
    const tx = (x, y, s, c) => `<text x="${x}" y="${y}" text-anchor="middle" style="fill:${c || pal.muted};font:600 13px Arial,Helvetica,sans-serif">${s}</text>`;
    const tube = (d, w) => `<path d="${d}" style="stroke:${pal.fg};stroke-width:${w + 4.4};fill:none;stroke-linecap:butt"/><path d="${d}" style="stroke:${pal.surface};stroke-width:${w};fill:none;stroke-linecap:butt"/>`;
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 460 420" width="460" height="420" role="img" aria-label="Frontalschnitt durch das Herz mit Erregungsleitungssystem">` +
      `<rect width="460" height="420" style="fill:${pal.paper}"/>` +
      tube('M113,250 L106,345', 30) + tube('M143,22 L143,125', 30) +
      tube('M250,6 L250,24 M275,4 L275,22 M300,8 L300,26', 9) +
      tube('M212,125 C212,60 240,34 276,34 C312,34 336,44 338,62', 30) +
      tube('M264,128 C264,108 276,104 298,104 L350,104', 26) +
      `<path d="M118,108 C92,120 78,160 82,205 C84,240 96,262 118,272 C140,300 190,350 250,385 C285,402 318,392 330,368 C372,310 392,240 380,185 C372,150 345,128 312,122 C280,116 250,112 222,112 C185,108 150,100 118,108 Z" style="fill:${wall};${o}"/>` +
      `<path d="M120,125 C100,140 95,180 98,215 C100,240 110,255 125,258 L215,222 C215,180 200,140 175,122 C155,112 135,115 120,125 Z" style="fill:${pal.surface};stroke:${pal.fg};stroke-width:1.3"/>` +
      `<path d="M240,128 C235,160 235,190 240,212 L352,172 C345,150 325,135 300,130 C278,126 255,124 240,128 Z" style="fill:${pal.surface};stroke:${pal.fg};stroke-width:1.3"/>` +
      `<path d="M134,270 L224,236 L284,362 C278,372 268,374 258,370 C205,345 160,305 134,270 Z" style="fill:${pal.surface};stroke:${pal.fg};stroke-width:1.3"/>` +
      `<path d="M250,226 L346,190 C356,230 350,290 322,345 C314,358 304,360 298,352 Z" style="fill:${pal.surface};stroke:${pal.fg};stroke-width:1.3"/>` +
      `<path d="M134,268 L164,286 M222,236 L196,264 M252,226 L276,254 M344,191 L318,228" style="stroke:${pal.fg};stroke-width:2;fill:none;stroke-linecap:round"/>` +
      tx(138, 232, 're. Vorhof') + tx(296, 160, 'li. Vorhof') + tx(207, 300, 're. Kammer') + tx(308, 286, 'li. Kammer') +
      tx(76, 16, 'obere Hohlvene') + tx(392, 40, 'Aorta') + tx(402, 84, 'Lungenarterie') +
      `<path d="M140,130 Q162,192 226,217" style="${a};stroke-width:2;stroke-dasharray:4 5"/>` +
      `<ellipse cx="138" cy="126" rx="13" ry="8" transform="rotate(35 138 126)" style="fill:${pal.accent}"/>` +
      `<circle cx="229" cy="218" r="8.5" style="fill:${pal.accent}"/>` +
      `<path d="M232,224 L242,246" style="${a};stroke-width:6"/>` +
      `<path d="M242,246 L238,258 L281,350 M242,246 L257,256 L294,344" style="${a};stroke-width:3.6"/>` +
      `<path d="M281,350 C262,370 215,345 176,310 M260,360 C240,356 222,346 206,334 M294,344 C320,362 346,300 349,240 M300,348 C330,330 342,290 344,262" style="${a};stroke-width:1.9"/>` +
      lead(54, 64, 131, 121, pal) + marker(1, 42, 56, pal) +
      lead(52, 206, 222, 218, pal) + marker(2, 38, 205, pal) +
      lead(418, 168, 240, 236, pal) + marker(3, 430, 162, pal) +
      lead(416, 306, 278, 306, pal) + marker(4, 430, 306, pal) +
      lead(74, 376, 204, 333, pal) + marker(5, 62, 384, pal) +
      `</svg>`;
  }

  function ecg(pal) {
    const X = (t) => 40 + t * 600, base = 150, sc = 105;
    const f = (t) => pw(t, 0.16) + g(t, 0.322, -0.09, 0.008) + g(t, 0.345, 1.05, 0.011) + g(t, 0.372, -0.25, 0.010) + g(t, 0.62, 0.3, 0.048);
    let d = '';
    for (let i = 0; i <= 320; i++) { const t = i / 400; d += (i ? 'L' : 'M') + X(t).toFixed(1) + ' ' + (base - sc * f(t)).toFixed(1); }
    const br = (t1, t2, y, n) => { const x1 = X(t1), x2 = X(t2), m = (x1 + x2) / 2; return `<path d="M${x1},${y - 8}V${y}H${x2}V${y - 8}" style="stroke:${pal.fg};stroke-width:1.6;fill:none"/>` + marker(n, m, y + 20, pal); };
    const dash = (t) => `<line x1="${X(t)}" y1="40" x2="${X(t)}" y2="268" style="stroke:${pal.muted};stroke-width:1;stroke-dasharray:3 4"/>`;
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 540 320" width="540" height="320" role="img" aria-label="EKG-Zyklus mit nummerierten Abschnitten">` +
      `<rect width="540" height="320" style="fill:${pal.paper}"/>` +
      [0.16, 0.312, 0.39, 0.50, 0.745].map(dash).join('') +
      `<path d="${d}" style="stroke:${pal.trace};stroke-width:3;fill:none;stroke-linejoin:round"/>` +
      lead(X(0.205), 92, X(0.205), 130, pal) + marker(1, X(0.205), 78, pal) +
      br(0.16, 0.312, 196, 2) + br(0.312, 0.39, 196, 3) + br(0.39, 0.50, 196, 4) +
      lead(X(0.62), 70, X(0.62), 112, pal) + marker(5, X(0.62), 56, pal) +
      br(0.312, 0.745, 262, 6) + `</svg>`;
  }

  const EL = { rot: '#d43c33', gelb: '#e8b90a', gruen: '#2e9e55', schwarz: '#1c1c1c' };
  function torso(pal, mode) {
    const dot = (x, y, c, lab, dx) => `<circle cx="${x}" cy="${y}" r="13" style="fill:${c};stroke:${pal.fg};stroke-width:2"/>` + (lab ? `<text x="${x}" y="${y + (dx === 1 ? -20 : 32)}" text-anchor="middle" style="fill:${pal.fg};font:700 14px Arial,Helvetica,sans-serif">${lab}</text>` : '');
    const P = [[135, 128], [285, 128], [258, 338], [162, 338]];
    let over = '';
    if (mode === 'num') {
      over = P.map((p, i) => `<circle cx="${p[0]}" cy="${p[1]}" r="17" style="fill:${pal.paper};stroke:${pal.fg};stroke-width:2;stroke-dasharray:4 3"/>` + `<text x="${p[0]}" y="${p[1] + 6.5}" text-anchor="middle" style="fill:${pal.fg};font:700 18px Arial,Helvetica,sans-serif">${i + 1}</text>`).join('');
    } else {
      over = dot(P[0][0], P[0][1], EL.rot, 'rot') + dot(P[1][0], P[1][1], EL.gelb, 'gelb') + dot(P[2][0], P[2][1], EL.gruen, 'grün', 1) + dot(P[3][0], P[3][1], EL.schwarz, 'schwarz', 1);
      const V = [[196, 196], [224, 196], [240, 208], [257, 221], [277, 224], [296, 227]];
      over += V.map((v, i) => `<circle cx="${v[0]}" cy="${v[1]}" r="9" style="fill:${pal.mark || pal.accent}"/><text x="${v[0]}" y="${v[1] + 4}" text-anchor="middle" style="fill:${pal.markFg || pal.paper};font:700 10.5px Arial,Helvetica,sans-serif">${i + 1}</text>`).join('');
      over += `<text x="246" y="262" text-anchor="middle" style="fill:${pal.fg};font:700 13px Arial,Helvetica,sans-serif">V1 – V6</text>`;
    }
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 420 400" width="420" height="400" role="img" aria-label="Oberkörper mit Elektrodenpositionen">` +
      `<rect width="420" height="400" style="fill:${pal.paper}"/>` +
      `<circle cx="210" cy="48" r="30" style="fill:${pal.surface};stroke:${pal.fg};stroke-width:2.5"/>` +
      `<path d="M120,112 Q210,84 300,112 L340,126 Q360,136 356,166 L342,238 L312,238 L316,172 L300,172 L296,384 L124,384 L120,172 L104,172 L108,238 L78,238 L64,166 Q60,136 80,126 Z" style="fill:${pal.surface};stroke:${pal.fg};stroke-width:2.5;stroke-linejoin:round"/>` +
      `<path d="M210,118 V236 M150,150 Q210,138 270,150" style="stroke:${pal.muted};stroke-width:1.5;fill:none"/>` +
      `<text x="48" y="24" text-anchor="middle" style="fill:${pal.muted};font:600 13px Arial,Helvetica,sans-serif">rechts</text><text x="372" y="24" text-anchor="middle" style="fill:${pal.muted};font:600 13px Arial,Helvetica,sans-serif">links</text>` +
      `<text x="210" y="398" text-anchor="middle" style="fill:${pal.muted};font:12px Arial,Helvetica,sans-serif">Seiten aus Sicht des Patienten</text>` +
      over + `</svg>`;
  }


  function cabrera(pal) {
    const cx = 212, cy = 192, R = 150, rad = (d) => d * Math.PI / 180;
    const pt = (d, r) => [cx + r * Math.cos(rad(d)), cy + r * Math.sin(rad(d))];
    const wedge = (a, b, fill) => { const [x1, y1] = pt(a, R), [x2, y2] = pt(b, R); return `<path d="M${cx},${cy} L${x1.toFixed(1)},${y1.toFixed(1)} A${R},${R} 0 0 1 ${x2.toFixed(1)},${y2.toFixed(1)} Z" style="fill:${fill};stroke:${pal.fg};stroke-width:1"/>`; };
    const wall = pal.wall || pal.surface;
    const T = [[-90, -30, 'Überdrehter Linkstyp', wall], [-30, 30, 'Linkstyp', pal.surface], [30, 60, 'Indifferenztyp', wall], [60, 90, 'Steiltyp', pal.surface], [90, 120, 'Rechtstyp', wall], [120, 180, 'Überdrehter Rechtstyp', pal.surface]];
    const L = [[-30, 'aVL', '−30°'], [0, 'I', '0°'], [30, '−aVR', '+30°'], [60, 'II', '+60°'], [90, 'aVF', '+90°'], [120, 'III', '+120°']];
    let h = T.map(t => wedge(t[0], t[1], t[3])).join('');
    h += `<path d="M${pt(180, R)[0]},${cy} A${R},${R} 0 0 1 ${pt(-90, R)[0]},${pt(-90, R)[1]}" style="fill:none;stroke:${pal.muted};stroke-width:1;stroke-dasharray:4 4"/>`;
    T.forEach(t => { const m = (t[0] + t[1]) / 2, flip = m > 90 || m < -90, rr = (34 + R - 6) / 2, two = t[2].indexOf(' ') > 0 && (t[1] - t[0]) > 30;
      const tr = `rotate(${flip ? m + 180 : m} ${cx} ${cy})`, x = flip ? cx - rr : cx + rr;
      if (two) { const [a, b] = t[2].split(' '); h += `<text transform="${tr}" x="${x}" y="${cy - 3}" text-anchor="middle" style="fill:${pal.fg};font:700 13.5px Arial,Helvetica,sans-serif">${a}</text><text transform="${tr}" x="${x}" y="${cy + 13}" text-anchor="middle" style="fill:${pal.fg};font:700 13.5px Arial,Helvetica,sans-serif">${b}</text>`; }
      else h += `<text transform="${tr}" x="${x}" y="${cy + 4.5}" text-anchor="middle" style="fill:${pal.fg};font:700 13.5px Arial,Helvetica,sans-serif">${t[2]}</text>`; });
    L.forEach(l => { const [x, y] = pt(l[0], R), [tx, ty] = pt(l[0], R + 14), c = Math.cos(rad(l[0])); const anchor = c > 0.3 ? 'start' : c < -0.3 ? 'end' : 'middle';
      h += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="5" style="fill:${pal.accent}"/>`;
      h += `<text x="${tx.toFixed(1)}" y="${(ty + (l[0] >= 60 ? 14 : 4)).toFixed(1)}" text-anchor="${anchor}" style="fill:${pal.accent};font:700 17px Arial,Helvetica,sans-serif">${l[1]} <tspan style="fill:${pal.muted};font-weight:400;font-size:13px">${l[2]}</tspan></text>`; });
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 460 400" width="460" height="400" role="img" aria-label="Cabrera-Kreis mit Ableitungen und Lagetypen"><rect width="460" height="400" style="fill:${pal.paper}"/>${h}<circle cx="${cx}" cy="${cy}" r="4" style="fill:${pal.fg}"/></svg>`;
  }

  function lage(pal, v) {
    const W = 540, H = 160, pw = W / 3, names = ['I', 'II', 'III'];
    let h = `<rect width="${W}" height="${H}" style="fill:${pal.paper}"/>`;
    v.forEach((a, i) => { const x0 = i * pw, base = 80, sg = a < 0 ? -1 : 1; let d = '';
      for (let k = 0; k <= 160; k++) { const t = 0.1 + k / 160 * 0.27; const y = g(t, 0.212, -0.14 * sg * Math.min(1, Math.abs(a) + 0.3), 0.008) + g(t, 0.235, a, 0.011) + g(t, 0.26, -0.12 * sg * Math.abs(a), 0.009); d += (k ? 'L' : 'M') + (x0 + 40 + (t - 0.1) / 0.27 * 120).toFixed(1) + ' ' + (base - 52 * y).toFixed(1); }
      if (i) h += `<line x1="${x0}" y1="12" x2="${x0}" y2="${H - 12}" style="stroke:${pal.muted};stroke-width:1;stroke-dasharray:3 4"/>`;
      h += `<line x1="${x0 + 40}" y1="${base}" x2="${x0 + 160}" y2="${base}" style="stroke:${pal.grid};stroke-width:1.5"/>`;
      h += `<path d="${d}" style="stroke:${pal.trace};stroke-width:2.8;fill:none;stroke-linejoin:round"/>`;
      h += `<text x="${x0 + 16}" y="30" style="fill:${pal.fg};font:700 20px Arial,Helvetica,sans-serif">${names[i]}</text>`; });
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="QRS-Komplexe in den Ableitungen I, II und III">${h}</svg>`;
  }

  const sig = (x) => 1 / (1 + Math.exp(-x));
  const L12 = {
    I: { p: .1, r: .6, s: -.1, t: .2 }, II: { p: .13, r: 1.0, s: -.15, t: .3 }, III: { p: .06, r: .4, s: -.1, t: .12 },
    aVR: { p: -.1, r: -.8, s: .1, t: -.25 }, aVL: { p: .03, r: .15, s: -.08, t: .05 }, aVF: { p: .1, r: .7, s: -.12, t: .2 },
    V1: { p: .06, r: .15, s: -.9, t: .08 }, V2: { p: .08, r: .3, s: -1.15, t: .32 }, V3: { p: .08, r: .6, s: -.8, t: .34 },
    V4: { p: .1, r: 1.1, s: -.4, t: .3 }, V5: { p: .1, r: 1.0, s: -.2, t: .25 }, V6: { p: .1, r: .8, s: -.1, t: .2 } };
  const ST_INF = { I: -.13, II: .26, III: .39, aVR: -.065, aVL: -.26, aVF: .325 };
  /* Deutsches Standardlayout: links Extremitäten-, rechts Brustwandableitungen, 50 mm/s, Eichzacke 10 mm/mV */
  function ekg12(pal, kind) {
    const cols = [['I', 'II', 'III', 'aVR', 'aVL', 'aVF'], ['V1', 'V2', 'V3', 'V4', 'V5', 'V6']];
    const CW = 500, RH = 100, W = 1000, H = 630, rr = kind === 'stemi' ? 0.8 : 1.0, PX = 200, MV = 40;
    let thin = '', bold = '';
    for (let x = 0; x <= W; x += 4) (x % 20 ? (thin += `M${x} 0V${H - 30}`) : (bold += `M${x} 0V${H - 30}`));
    for (let y = 0; y <= H - 30; y += 4) (y % 20 ? (thin += `M0 ${y}H${W}`) : (bold += `M0 ${y}H${W}`));
    let h = `<rect width="${W}" height="${H}" style="fill:${pal.paper}"/><path d="${thin}" style="stroke:${pal.grid};stroke-width:.8;fill:none"/><path d="${bold}" style="stroke:${pal.gridBold};stroke-width:1;fill:none"/>`;
    cols.forEach((col, ci) => col.forEach((name, ri) => { const L = L12[name], st = kind === 'stemi' ? (ST_INF[name] || 0) : 0, base = ri * RH + 60, x0 = ci * CW;
      let d = `M${x0 + 44} ${base}H${x0 + 50}V${base - MV}H${x0 + 70}V${base}H${x0 + 80}`;
      for (let k = 0; k <= 520; k++) { const t = k / 520 * 2.08; let y = 0;
        for (let b = -1; b < 4; b++) { const tq = 0.3 + b * rr; if (Math.abs(t - tq) > 0.7) continue;
          y += g(t, tq - 0.115, L.p, 0.022) + g(t, tq + 0.035, L.r, 0.011) + g(t, tq + 0.062, L.s, 0.011) + g(t, tq + 0.30, L.t + st * 0.5, 0.058) + st * sig((t - tq - 0.078) / 0.007) * (1 - sig((t - tq - 0.33) / 0.03)); }
        d += 'L' + (x0 + 80 + t * PX).toFixed(1) + ' ' + (base - MV * y).toFixed(1); }
      h += `<path d="${d}" style="stroke:${pal.trace};stroke-width:2;fill:none;stroke-linejoin:round"/>`;
      h += `<text x="${x0 + 8}" y="${base - 22}" style="fill:${pal.fg};font:700 17px Arial,Helvetica,sans-serif">${name}</text>`; }));
    h += `<line x1="${CW}" y1="0" x2="${CW}" y2="${H - 30}" style="stroke:${pal.fg};stroke-width:1"/>`;
    h += `<text x="10" y="${H - 9}" style="fill:${pal.fg};font:600 15px Arial,Helvetica,sans-serif">50 mm/s   ·   10 mm/mV   ·   Eichzacke = 1 mV</text>`;
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="12-Kanal-EKG im Standardausdruck">${h}</svg>`;
  }

  function achse(pal) {
    const arrow = (x1, y1, x2, y2, c, w) => { const a = Math.atan2(y2 - y1, x2 - x1), L = 13 + w, bx = x2 - L * Math.cos(a), by = y2 - L * Math.sin(a), nx = Math.sin(a) * (5 + w), ny = -Math.cos(a) * (5 + w);
      return `<line x1="${x1}" y1="${y1}" x2="${bx.toFixed(1)}" y2="${by.toFixed(1)}" style="stroke:${c};stroke-width:${w}"/><path d="M${x2},${y2} L${(bx + nx).toFixed(1)},${(by + ny).toFixed(1)} L${(bx - nx).toFixed(1)},${(by - ny).toFixed(1)} Z" style="fill:${c}"/>`; };
    const tx = (x, y, t, c, sz, anchor) => `<text x="${x}" y="${y}" text-anchor="${anchor || 'middle'}" style="fill:${c};font:700 ${sz}px Arial,Helvetica,sans-serif">${t}</text>`;
    const wall = pal.wall || pal.surface, RA = [95, 85], LA = [365, 85], LL = [230, 345];
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 460 400" width="460" height="400" role="img" aria-label="Elektrische Herzachse im Einthoven-Dreieck"><rect width="460" height="400" style="fill:${pal.paper}"/>` +
      `<path d="M196,138 C176,144 168,170 170,196 C173,228 208,262 262,286 C282,292 296,282 300,266 C314,232 314,196 304,170 C294,150 268,140 244,140 C226,138 210,134 196,138 Z" style="fill:${wall};stroke:${pal.fg};stroke-width:2"/>` +
      arrow(RA[0] + 22, RA[1], LA[0] - 22, LA[1], pal.fg, 2.5) + arrow(RA[0] + 10, RA[1] + 20, LL[0] - 12, LL[1] - 22, pal.fg, 2.5) + arrow(LA[0] - 10, LA[1] + 20, LL[0] + 12, LL[1] - 22, pal.fg, 2.5) +
      tx(230, 72, 'I', pal.fg, 20) + tx(134, 228, 'II', pal.fg, 20) + tx(326, 228, 'III', pal.fg, 20) +
      [[RA, 'rechter Arm', -1], [LA, 'linker Arm', -1], [LL, 'linkes Bein', 1]].map(v => `<circle cx="${v[0][0]}" cy="${v[0][1]}" r="9" style="fill:${pal.paper};stroke:${pal.fg};stroke-width:2"/>` + tx(v[0][0], v[0][1] + (v[2] < 0 ? -20 : 32), v[1], pal.muted, 14)).join('') +
      arrow(204, 160, 288, 268, pal.accent, 6) + tx(318, 300, 'Herzachse', pal.accent, 16, 'start') + `</svg>`;
  }

  function lagetab(pal) {
    const rows = [['Überdrehter Linkstyp', '', -60], ['Linkstyp', '', 0], ['Indifferenztyp', 'I größer als III', 45], ['Steiltyp', 'III größer als I', 75], ['Rechtstyp', '', 105], ['Überdrehter Rechtstyp', 'II positiv oder negativ', 140]];
    const W = 760, HH = 42, RH = 68, NW = 250, CW = 170, H = HH + RH * rows.length, wall = pal.wall || pal.surface, rad = Math.PI / 180;
    let h = `<rect width="${W}" height="${H}" style="fill:${pal.paper}"/><rect width="${W}" height="${HH}" style="fill:${pal.accent}"/>`;
    h += `<text x="14" y="28" style="fill:${pal.paper};font:700 18px Arial,Helvetica,sans-serif">Lagetyp</text>`;
    ['I', 'II', 'III'].forEach((n, i) => { h += `<text x="${NW + i * CW + CW / 2}" y="28" text-anchor="middle" style="fill:${pal.paper};font:700 18px Arial,Helvetica,sans-serif">${n}</text>`; });
    rows.forEach((r, ri) => { const y0 = HH + ri * RH, base = y0 + RH / 2 + 2, amp = [Math.cos(r[2] * rad), Math.cos((r[2] - 60) * rad), Math.cos((r[2] - 120) * rad)];
      if (ri % 2) h += `<rect x="0" y="${y0}" width="${W}" height="${RH}" style="fill:${wall}"/>`;
      h += `<text x="14" y="${y0 + (r[1] ? 30 : 40)}" style="fill:${pal.fg};font:700 17px Arial,Helvetica,sans-serif">${r[0]}</text>`;
      if (r[1]) h += `<text x="14" y="${y0 + 50}" style="fill:${pal.muted};font:13px Arial,Helvetica,sans-serif">${r[1]}</text>`;
      amp.forEach((a, i) => { const x0 = NW + i * CW, sg = a < 0 ? -1 : 1; let d = '';
        for (let k = 0; k <= 120; k++) { const t = 0.12 + k / 120 * 0.23; const y = g(t, 0.212, -0.12 * sg * Math.min(1, Math.abs(a) + 0.3), 0.008) + g(t, 0.235, a, 0.011) + g(t, 0.26, -0.1 * sg * Math.abs(a), 0.009); d += (k ? 'L' : 'M') + (x0 + 30 + (t - 0.12) / 0.23 * 90).toFixed(1) + ' ' + (base - 31 * y).toFixed(1); }
        h += `<path d="${d}" style="stroke:${pal.trace};stroke-width:2.6;fill:none;stroke-linejoin:round"/>`;
        const weak = Math.abs(a) < 0.25; h += `<text x="${x0 + 140}" y="${y0 + RH / 2 + 8}" text-anchor="middle" style="fill:${sg > 0 ? pal.accent : pal.fg};font:700 22px Arial,Helvetica,sans-serif">${weak && ri === 5 ? '±' : sg > 0 ? '+' : '−'}</text>`; }); });
    for (let i = 0; i < 3; i++) h += `<line x1="${NW + i * CW}" y1="0" x2="${NW + i * CW}" y2="${H}" style="stroke:${pal.muted};stroke-width:1"/>`;
    h += `<rect x=".5" y=".5" width="${W - 1}" height="${H - 1}" style="fill:none;stroke:${pal.muted};stroke-width:1"/>`;
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="Lagetypen mit QRS-Komplexen in I, II und III">${h}</svg>`;
  }

  /* fig-Beschreibung -> SVG. fig: {k:'strip',key,tag?} | {k:'heart'} | {k:'ecg'} | {k:'torso',mode} */
  function figSVG(fig, pal) {
    if (fig.k === 'strip') return strip(fig.key, pal, { tag: fig.tag });
    if (fig.k === 'heart') return heart(pal);
    if (fig.k === 'ecg') return ecg(pal);
    if (fig.k === 'torso') return torso(pal, fig.mode);
    if (fig.k === 'cabrera') return cabrera(pal);
    if (fig.k === 'ekg12') return ekg12(pal, fig.kind);
    if (fig.k === 'achse') return achse(pal);
    if (fig.k === 'lagetab') return lagetab(pal);
    if (fig.k === 'lage') return lage(pal, fig.v);
    return '';
  }

  /* ---------- Folien und Fragen ---------- */
  const D = [];
  const S = (o) => { o.t = 'slide'; D.push(o); };
  const Q = (o) => { D.push(o); };
  const st = (key, tag) => ({ k: 'strip', key, tag });
  let sec = '';
  const SEC = (s) => { sec = s; };
  const push = D.push.bind(D);
  D.push = function (o) { o.sec = sec; return push(o); };

  /* ===== TEIL 1 ===== */
  SEC('Einstieg');
  S({ kind: 'title', title: 'EKG und Herzrhythmusstörungen', sub: 'Unterricht für Anästhesietechnische Assistenz · 2. Lehrjahr',
    notes: 'Begrüßung. Kurz erklären, wie der Vormittag läuft: zwei Blöcke à 90 Minuten mit 30 Minuten Pause. Die Schüler scannen jetzt den QR-Code und öffnen das Quiz auf dem Handy. Jede Frage hat eine Nummer, die auch auf der Folie steht. Bei Auswahlfragen zeigt das Handy nach der Wahl den Buchstaben groß und farbig: Handys hochhalten lassen, dann sehen Sie die Verteilung. Erst danach die Lösungsfolie zeigen. Zeitplan: Teil 1 von 8:00 bis 9:10 (Erregungsleitung bis ca. 8:25, EKG-Grundlagen bis 8:45, Ableitungen bis 9:00, Befundung und Lagetyp bis 9:10), Praxis am EKG-Gerät von 9:10 bis 9:30, Pause bis 10:00, Teil 2 bis 11:30 (ST-Hebungsinfarkt bis 10:10, Bradykardien bis 10:30, Tachykardien und Kreislaufstillstand bis 11:00, Fälle bis 11:25). Teil 1 ist mit dem Lagetyp-Block dicht gefüllt. Wenn die Zeit knapp wird, lassen sich diese Fragen ohne Verlust überspringen: {SKIP}.' });
  S({ title: 'Was Sie heute mitnehmen', bullets: [
      ['Verstehen:', 'wie die Erregung entsteht und wie daraus die EKG-Kurve wird'],
      ['Anlegen:', 'Elektroden für Monitor-EKG und 12-Kanal-EKG richtig platzieren'],
      ['Erkennen:', 'Sinusrhythmus und die wichtigsten Rhythmusstörungen am Monitor'],
      ['Handeln:', 'stabil oder instabil? Was bereite ich als ATA vor?']],
    fig: st('sinus'),
    notes: 'Die vier Lernziele bauen aufeinander auf. Betonen: Niemand muss heute ein 12-Kanal-EKG wie ein Kardiologe befunden. Ziel ist, am Monitor im OP und im Aufwachraum sicher zu erkennen, ob etwas nicht stimmt, und zu wissen, was dann als Nächstes gebraucht wird.' });
  Q({ t: 'mc', q: 'Wer ist beim gesunden Herzen der Taktgeber?', opts: ['AV-Knoten', 'Sinusknoten', 'His-Bündel', 'Purkinje-Fasern'], correct: 1,
    why: 'Der Sinusknoten im rechten Vorhof hat die höchste Eigenfrequenz (60–80/min) und gibt deshalb den Takt vor.',
    notes: 'Aufwärmfrage, um das Handy-Quiz einmal durchzuspielen. Ablauf erklären: antworten, Handy hochhalten, dann Auflösung.' });

  SEC('Vom Sinusknoten zur Kammer');
  Q({ t: 'sel', q: 'Beschriften Sie das Erregungsleitungssystem.', fig: { k: 'heart' }, rows: [['1', 'Sinusknoten'], ['2', 'AV-Knoten'], ['3', 'His-Bündel'], ['4', 'Tawara-Schenkel'], ['5', 'Purkinje-Fasern']],
    why: 'Reihenfolge von oben nach unten: Sinusknoten, AV-Knoten, His-Bündel, Tawara-Schenkel, Purkinje-Fasern.',
    notes: 'Diese Frage kommt bewusst vor der Erklärung, um das Vorwissen aus dem ersten Lehrjahr abzurufen. Die folgende Folie löst auf. Die Abbildung zeigt einen Frontalschnitt, so wie man den Patienten von vorn sieht: Die rechte Herzseite liegt im Bild links, die Herzspitze zeigt nach links unten. Der Sinusknoten liegt an der Einmündung der oberen Hohlvene in den rechten Vorhof, der AV-Knoten am Übergang von den Vorhöfen zu den Kammern. Das His-Bündel zieht in die Kammerscheidewand und teilt sich dort in die beiden Tawara-Schenkel.' });
  S({ title: 'Zwei Sorten Herzmuskelzellen', bullets: [
      ['Erregungsbildungs- und Leitungssystem:', 'erzeugt den Impuls selbst und leitet ihn weiter'],
      ['Arbeitsmyokard:', 'zieht sich auf den Impuls hin zusammen – die „Pumpe“'],
      ['1 Sinusknoten · 2 AV-Knoten · 3 His-Bündel', ''], ['4 Tawara-Schenkel · 5 Purkinje-Fasern', '']],
    fig: { k: 'heart' },
    notes: 'Die Zellen des Leitungssystems depolarisieren spontan, sie brauchen keinen Nerv als Auslöser (Autonomie des Herzens). Das Arbeitsmyokard hat ein stabiles Ruhepotenzial und kontrahiert nur, wenn es erregt wird. Vorhöfe und Kammern sind durch die Ventilebene elektrisch voneinander isoliert. Der AV-Knoten ist normalerweise die einzige Verbindung.' });
  Q({ t: 'mc', q: 'Der Sinusknoten fällt aus, der AV-Knoten übernimmt. Welche Herzfrequenz erwarten Sie?', opts: ['20–40/min', '40–60/min', '60–80/min', '100–120/min'], correct: 1,
    why: 'Der AV-Knoten hat eine Eigenfrequenz von etwa 40–60/min. Im EKG fehlt dann die normale P-Welle vor dem QRS-Komplex.',
    notes: 'Diese Frage kommt vor der Erklärung, die nächste Folie löst auf. Bei einem AV-Knoten-Ersatzrhythmus sind die QRS-Komplexe meist schmal, weil die Kammern weiter über das normale Leitungssystem erregt werden. Erst ein Ersatzrhythmus aus der Kammer macht breite Komplexe.' });
  S({ title: 'Jede Station kann den Takt übernehmen – nur langsamer', table: { head: ['Schrittmacher', 'Eigenfrequenz', 'Bedeutung'], rows: [
      ['Sinusknoten', '60–80/min', 'normaler Taktgeber'],
      ['AV-Knoten', '40–60/min', 'Ersatzrhythmus, wenn der Sinusknoten ausfällt'],
      ['Kammer (His-Bündel)', '25–40/min', 'letzte Reserve, oft zu langsam für den Kreislauf']] },
    bullets: [['AV-Knoten bremst die Überleitung:', 'die Vorhöfe füllen die Kammern, bevor diese pumpen']],
    notes: 'Prinzip: Der schnellste Schrittmacher bestimmt den Rhythmus und unterdrückt die langsameren. Fällt er aus, springt der nächste ein. Je tiefer der Ersatzschrittmacher sitzt, desto langsamer und desto breiter der QRS-Komplex. Die Verzögerung im AV-Knoten sieht man im EKG als PQ-Zeit.' });
  Q({ t: 'mc', q: 'Halsoperation: Der Operateur drückt auf die Karotis, die Herzfrequenz fällt von 70 auf 35/min. Was ist die wahrscheinlichste Ursache?', opts: ['Sympathikus-Aktivierung durch Schmerz', 'Vagusreiz', 'Lose EKG-Elektrode', 'Zu flache Narkose'], correct: 1,
    why: 'Druck auf die Karotis löst einen Vagusreiz aus, der Parasympathikus senkt die Frequenz. Sofort den Operateur informieren, damit der Reiz aufhört.',
    notes: 'Diese Frage kommt vor der Erklärung, die nächste Folie löst auf. Nachfragen: Was tun Sie als Erstes? Antwort: laut ansagen. Bleibt die Bradykardie bestehen und ist der Patient instabil, folgt die Behandlung nach dem Bradykardie-Schema in Teil 2.' });
  S({ title: 'Das vegetative Nervensystem stellt die Frequenz ein', cols: [
      { h: 'Sympathikus', items: ['Frequenz steigt', 'Kontraktionskraft steigt', 'Auslöser im OP: Schmerz, zu flache Narkose'] },
      { h: 'Parasympathikus (Vagus)', items: ['Frequenz sinkt', 'Auslöser im OP: Vagusreiz durch den Eingriff, Druck auf die Karotis'] }],
    notes: 'Aus dem bisherigen Vortrag: Sympathikus steigert Frequenz und Kontraktilität, Parasympathikus senkt die Frequenz. Vagusreiz und Karotisdruck stehen dort als chirurgische Auslöser von Rhythmusstörungen. Praxisbezug: Fällt die Frequenz während einer Manipulation plötzlich ab, zuerst den Operateur informieren, damit der Reiz aufhört. Eigene Beispiele aus dem OP ergänzen. Umgekehrt ist eine Tachykardie unter Narkose ein Hinweis, nach Schmerz und Narkosetiefe zu schauen.' });
  Q({ t: 'mc', q: 'Warum ist eine Tachykardie für Patienten mit koronarer Herzkrankheit gefährlich?', opts: ['Die Diastole wird kürzer, das Herz wird schlechter durchblutet', 'Die Systole wird länger, der Blutdruck steigt zu stark', 'Die Vorhöfe schlagen nicht mehr mit', 'Das Blut wird nicht mehr mit Sauerstoff beladen'], correct: 0,
    why: 'Die Koronararterien werden zum größten Teil in der Diastole durchblutet. Bei hoher Frequenz wird die Diastole kürzer.',
    notes: 'Diese Frage kommt vor der Erklärung, die nächste Folie löst auf. Kann bei Zeitmangel übersprungen werden.' });
  S({ title: 'Warum eine Tachykardie dem Herzen schadet', bullets: [
      ['Die Koronararterien werden vor allem in der Diastole durchblutet', ''],
      ['Hohe Frequenz:', 'die Diastole wird kürzer, das Herz wird schlechter durchblutet'],
      ['Niedrige Frequenz:', 'längere Diastole, bessere Durchblutung'],
      ['Mögliche Folge bei Herzkranken:', 'Minderversorgung, im EKG als ST-Senkung sichtbar']],
    notes: 'Aus dem bisherigen Vortrag: Die Durchblutung der Koronararterien erfolgt zum größten Teil in der Diastole. Eine niedrige Herzfrequenz verlängert die Diastole und verbessert die Durchblutung des Herzens. Eine Tachykardie verkürzt vor allem die Diastole. Horizontale oder absteigende ST-Senkungen sind ein Hinweis auf eine Minderversorgung der Innenschicht des Herzmuskels.' });
  SEC('Das EKG verstehen');
  S({ title: 'Was das EKG misst – und was nicht', bullets: [
      ['Es misst', 'Spannungsänderungen von wenigen Millivolt an der Hautoberfläche'],
      ['Es zeigt', 'die Summe der elektrischen Erregung aller Herzmuskelzellen im Zeitverlauf'],
      ['Es zeigt nicht,', 'ob das Herz tatsächlich pumpt'],
      ['Deshalb gilt:', 'ein EKG ersetzt nie das Tasten des Pulses']],
    fig: st('sinus'),
    notes: 'Die Ableitungen sind nach Einthoven, Goldberger und Wilson benannt. Wichtigster Punkt der Folie: Elektrische Aktivität ohne Auswurf gibt es. Sie heißt pulslose elektrische Aktivität und kommt in Teil 2 wieder.' });
  Q({ t: 'mc', q: 'Papiervorschub 25 mm/s: Wie lange dauert ein großes Kästchen (5 mm)?', opts: ['0,04 Sekunden', '0,1 Sekunden', '0,2 Sekunden', '1 Sekunde'], correct: 2,
    why: 'Bei 25 mm/s entspricht 1 mm 0,04 s. Ein großes Kästchen hat 5 mm, also 0,2 s. Fünf große Kästchen sind eine Sekunde.', notes: 'Diese Frage kommt vor der Erklärung, die nächste Folie löst auf. Rechenweg an der Tafel zeigen: 25 mm pro Sekunde, also 1 mm = 1/25 s = 0,04 s.' });
  S({ title: 'EKG-Papier lesen: Kästchen sind Zeit', table: { head: ['Papiervorschub', '1 kleines Kästchen (1 mm)', '1 großes Kästchen (5 mm)'], rows: [
      ['25 mm/s (Monitor, Rhythmusstreifen)', '0,04 s', '0,2 s'], ['50 mm/s (12-Kanal-EKG in Deutschland)', '0,02 s', '0,1 s']] },
    bullets: [['Höhe:', '10 mm entsprechen 1 mV'], ['Frequenz bei 25 mm/s:', '300 geteilt durch die Zahl der großen Kästchen zwischen zwei R-Zacken']],
    notes: 'Immer zuerst den Papiervorschub ablesen, er steht auf dem Ausdruck. Die 300er-Regel gilt nur bei 25 mm/s, bei 50 mm/s rechnet man mit 600. Alle Streifen in diesem Vortrag sind mit 25 mm/s gezeichnet und 6 Sekunden lang.' });
  Q({ t: 'mc', q: 'Der Streifen läuft mit 25 mm/s. Zwischen zwei R-Zacken liegen 4 große Kästchen. Wie hoch ist die Herzfrequenz?', fig: st('sinus'), opts: ['50/min', '60/min', '75/min', '100/min'], correct: 2,
    why: '300 geteilt durch 4 große Kästchen ergibt 75/min. Probe: 4 × 0,2 s = 0,8 s pro Schlag, 60 s geteilt durch 0,8 s = 75.', notes: 'Die Schüler am Beamerbild nachzählen lassen. Merkreihe für 1 bis 6 Kästchen: 300, 150, 100, 75, 60, 50.' });
  Q({ t: 'sel', q: 'Beschriften Sie den EKG-Zyklus.', fig: { k: 'ecg' }, rows: [['1', 'P-Welle'], ['2', 'PQ-Zeit'], ['3', 'QRS-Komplex'], ['4', 'ST-Strecke'], ['5', 'T-Welle'], ['6', 'QT-Zeit']],
    why: 'P-Welle, dann PQ-Zeit bis zum Beginn des QRS-Komplexes, ST-Strecke, T-Welle. Die QT-Zeit reicht vom Beginn des QRS-Komplexes bis zum Ende der T-Welle.', notes: 'Diese Frage kommt bewusst vor der Erklärung: Die Beschriftung schaffen die Schüler aus dem Vorwissen. Die nächste Folie ergänzt Bedeutung und Normwerte. Häufiger Fehler: PQ-Zeit und ST-Strecke werden verwechselt. Auf die Klammern in der Abbildung hinweisen.' });
  S({ title: 'Die Abschnitte der EKG-Kurve', fig: { k: 'ecg' }, table: { head: ['Nr.', 'Abschnitt', 'Bedeutung', 'Normwert'], rows: [
      ['1', 'P-Welle', 'Erregung der Vorhöfe', 'bis 0,11 s'],
      ['2', 'PQ-Zeit', 'Überleitung von den Vorhöfen auf die Kammern', '0,12–0,20 s'],
      ['3', 'QRS-Komplex', 'Erregung der Kammern', 'bis 0,10 s, breit ab 0,12 s'],
      ['4', 'ST-Strecke', 'Kammern vollständig erregt', 'auf der Nulllinie'],
      ['5', 'T-Welle', 'Erregungsrückbildung der Kammern', '–'],
      ['6', 'QT-Zeit', 'gesamte Erregungsdauer der Kammern', 'ca. 0,35–0,44 s, frequenzabhängig']] },
    notes: 'Korrektur gegenüber der alten Folie: Es heißt P-Welle und T-Welle, Zacken sind nur Q, R und S. Die ST-Strecke ist nicht die Depolarisation, sondern die Phase, in der alle Kammerzellen erregt sind. Deshalb fließt kein Strom und die Linie ist isoelektrisch. Die PQ-Zeit wird vom Beginn der P-Welle bis zum Beginn des QRS-Komplexes gemessen. Eine verlängerte QT-Zeit begünstigt gefährliche Kammertachykardien (Torsade de pointes). Auch Medikamente können sie verlängern, zum Beispiel Antiarrhythmika, Antidepressiva und Antibiotika.' });
  Q({ t: 'sel', q: 'Was bedeutet welcher Abschnitt? Ordnen Sie zu.', rows: [['P-Welle', 'Erregung der Vorhöfe'], ['PQ-Zeit', 'Überleitung auf die Kammern'], ['QRS-Komplex', 'Erregung der Kammern'], ['ST-Strecke', 'Kammern vollständig erregt'], ['T-Welle', 'Erregungsrückbildung der Kammern']],
    why: 'P = Vorhöfe, PQ = Überleitung, QRS = Kammererregung, ST = vollständig erregte Kammern, T = Rückbildung.', notes: 'Falls die Klasse sicher ist, direkt weiter.' });
  Q({ t: 'mc', q: 'Welche Aussage zur ST-Strecke stimmt?', opts: ['Sie zeigt die Erregung der Vorhöfe', 'Die Kammern sind vollständig erregt, sie verläuft normalerweise auf der Nulllinie', 'Sie zeigt die Verzögerung im AV-Knoten', 'Sie zeigt die Erregungsrückbildung der Vorhöfe'], correct: 1,
    why: 'Während der ST-Strecke sind alle Kammerzellen erregt, es gibt keine Spannungsunterschiede. Hebungen oder Senkungen sprechen für eine Durchblutungsstörung.', notes: 'Kann bei Zeitmangel übersprungen werden. Ausblick: ST-Hebung in zwei benachbarten Ableitungen plus passende Beschwerden = Verdacht auf Herzinfarkt.' });

  SEC('Ableitungen und Elektroden');
  S({ title: 'Zwölf Ableitungen schauen aus zwölf Richtungen auf das Herz', table: { head: ['Gruppe', 'Ableitungen', 'Ebene'], rows: [
      ['Einthoven (bipolar)', 'I, II, III', 'Frontalebene'], ['Goldberger (unipolar)', 'aVR, aVL, aVF', 'Frontalebene'], ['Wilson (unipolar)', 'V1 bis V6', 'Horizontalebene']] },
    bullets: [['12-Kanal-EKG:', '10 Elektroden – 4 an den Extremitäten, 6 an der Brustwand'], ['Monitor-EKG:', 'weniger Elektroden, reicht für Rhythmus und Frequenz']],
    notes: 'Bild für die Schüler: Jede Ableitung ist eine Kamera, die aus einer anderen Richtung auf das Herz schaut. Bipolar heißt, die Spannung wird zwischen zwei Elektroden gemessen. Unipolar heißt, eine Elektrode wird gegen einen rechnerischen Nullpunkt gemessen. Zuordnung grob: II, III und aVF schauen auf die Unterseite des Herzens, V1 bis V4 auf Septum und Vorderwand, I, aVL, V5 und V6 auf die Seitenwand.' });
  Q({ t: 'sel', q: 'Monitor-EKG: Welche Elektrodenfarbe gehört an welche Position?', fig: { k: 'torso', mode: 'num' }, rows: [['1', 'rot'], ['2', 'gelb'], ['3', 'grün'], ['4', 'schwarz']],
    why: 'Wie eine Ampel im Uhrzeigersinn, beginnend rechts oben: rot, gelb, grün. Schwarz kommt nach rechts unten.', notes: 'Diese Frage kommt bewusst vor der Erklärung, die Farben kennen die Schüler aus der Praxis. Rechts und links immer aus Sicht des Patienten. Position 1 ist also die rechte Schulter des Patienten.' });
  S({ title: 'Elektroden richtig anlegen', fig: { k: 'torso', mode: 'color' }, bullets: [
      ['Ampel im Uhrzeigersinn:', 'rot rechter Arm, gelb linker Arm, grün linkes Bein, schwarz rechtes Bein'],
      ['V1 / V2:', '4. Zwischenrippenraum rechts und links neben dem Brustbein'],
      ['V4:', '5. Zwischenrippenraum in der Medioklavikularlinie'],
      ['V3:', 'zwischen V2 und V4'],
      ['V5 / V6:', 'Höhe V4, vordere und mittlere Axillarlinie']],
    notes: 'Am Monitor werden die Extremitätenelektroden auf den Rumpf geklebt, wie in der Abbildung. Die Brustwandelektroden haben ebenfalls Farben: V1 rot, V2 gelb, V3 grün, V4 braun, V5 schwarz, V6 violett. Verdeckt die Brust die Orientierungspunkte, V4 bis V6 unterhalb der Brust kleben. Bei einem Lungenemphysem mit Fassthorax können die Brustwandelektroden versuchsweise einen Zwischenrippenraum tiefer geklebt werden. Eine negative P-Welle in Ableitung I entsteht meist durch vertauschte Elektroden.' });
  Q({ t: 'sel', q: 'Wohin gehört welche Brustwandelektrode?', rows: [['V1', '4. ICR rechts neben dem Brustbein'], ['V2', '4. ICR links neben dem Brustbein'], ['V4', '5. ICR, Medioklavikularlinie links'], ['V6', 'mittlere Axillarlinie links, Höhe V4']],
    why: 'V1 und V2 liegen im 4. Zwischenrippenraum (ICR) beidseits des Brustbeins. V4 liegt im 5. ICR in der Medioklavikularlinie, V5 und V6 auf gleicher Höhe weiter außen.', notes: 'Praktischer Tipp: zuerst V1, V2 und V4 kleben, dann V3 dazwischen, dann V5 und V6 auf Höhe von V4.' });
  Q({ t: 'mc', q: 'Wie viele Elektroden kleben Sie für ein 12-Kanal-EKG?', opts: ['6', '10', '12', '14'], correct: 1,
    why: '4 Extremitätenelektroden plus 6 Brustwandelektroden. Aus diesen 10 Elektroden berechnet das Gerät 12 Ableitungen.', notes: 'Kann bei Zeitmangel übersprungen werden.' });
  S({ title: 'Monitor-EKG im OP: Ableitung II und V5', table: { head: ['Kabel', 'Ableitungen', 'Einsatz'], rows: [
      ['3-polig', 'I, II, III', 'Standardüberwachung'],
      ['5-polig', 'I, II, III, aVR, aVL, aVF und eine Brustwandableitung', 'kardiale Risikopatienten, Herzchirurgie']] },
    bullets: [['Ableitung II:', 'P-Welle gut sichtbar, am besten für den Rhythmus'], ['Ableitung V5:', 'erkennt ST-Veränderungen, am besten für Ischämien'], ['Auffälligkeit am Monitor:', '12-Kanal-EKG schreiben']],
    notes: 'Die Kombination aus II und V5 erkennt den Großteil der intraoperativen Ischämien, in der alten Folie stand rund 80 Prozent. Die Monitorableitung entspricht nicht exakt einer Standardableitung, weil die Elektroden auf dem Rumpf kleben und so gewählt werden, dass sie das OP-Gebiet nicht stören. Für eine Diagnose braucht es deshalb immer das 12-Kanal-EKG.' });
  Q({ t: 'mc', q: 'Welche zwei Ableitungen zeigen Sie bei einem kardialen Risikopatienten auf dem Monitor an?', opts: ['I und aVR', 'II und V5', 'III und V1', 'aVL und aVF'], correct: 1,
    why: 'Ableitung II zeigt die P-Welle am besten und eignet sich für den Rhythmus. V5 erkennt ST-Veränderungen und damit Ischämien.', notes: 'Kurz und knapp halten.' });
  S({ title: 'Erst der Patient, dann der Monitor', bullets: [
      ['Häufige Artefakte:', 'Bewegung, lose Elektrode, Elektrokauter'],
      ['Gegenprobe:', 'Patient ansprechen, Puls tasten'],
      ['Zweite Kurve nutzen:', 'Pulsoxymetrie oder arterielle Druckkurve'],
      ['Stimmen Kurve und Patient nicht überein,', 'zählt der Patient']],
    fig: st('vf'),
    notes: 'Der Streifen sieht aus wie Kammerflimmern. Genau so kann aber auch ein Artefakt aussehen, etwa durch eine wackelnde Elektrode. Wenn der Patient wach ist und spricht, ist es kein Kammerflimmern. Umgekehrt gilt: Eine saubere EKG-Kurve beweist keinen Kreislauf. Die Pulsoxymetriekurve ist die schnellste Gegenprobe, weil sie nur bei echtem Auswurf pulsiert.' });
  Q({ t: 'mc', q: 'Aufwachraum: Der Monitor alarmiert und zeigt dieses Bild. Der Patient unterhält sich gerade mit Ihnen. Was liegt am ehesten vor?', fig: st('vf'), opts: ['Kammerflimmern – sofort defibrillieren', 'Ein Artefakt – Patient und Elektroden prüfen', 'Asystolie', 'Vorhofflimmern'], correct: 1,
    why: 'Wer spricht, hat einen Kreislauf. Kammerflimmern führt innerhalb von Sekunden zur Bewusstlosigkeit. Puls tasten, Elektroden und Kabel kontrollieren.', notes: 'Wichtigste Sicherheitsregel des Vormittags. Gern mit einer eigenen Anekdote untermauern.' });

  SEC('Ein EKG beurteilen');
  S({ title: 'Sechs Fragen an jedes EKG', numbered: [
      ['Frequenz:', 'bradykard (unter 60/min), normal oder tachykard (über 100/min)?'],
      ['Rhythmus:', 'regelmäßig oder unregelmäßig?'],
      ['P-Wellen:', 'vorhanden? Folgt auf jede P-Welle ein QRS-Komplex?'],
      ['PQ-Zeit:', 'höchstens 0,2 s und immer gleich?'],
      ['QRS-Komplex:', 'schmal oder breit (ab 0,12 s)?'],
      ['ST-Strecke:', 'auf der Nulllinie, gehoben oder gesenkt?']],
    notes: 'Immer in derselben Reihenfolge vorgehen, dann übersieht man nichts. Schmal bedeutet: Die Erregung kommt von oberhalb der Kammern und läuft über das schnelle Leitungssystem. Breit bedeutet: Die Erregung entsteht in der Kammer oder ein Schenkel ist blockiert. Für den Monitor im OP reichen meist die Fragen 1 bis 5. Die Bradykardie-Grenze wird je nach Quelle bei 50 oder 60/min gezogen.' });
  S({ title: 'Der Normalbefund: Sinusrhythmus', fig: st('sinus'), bullets: [
      ['Frequenz', '60–100/min, regelmäßig'], ['Vor jedem QRS-Komplex', 'steht eine P-Welle'], ['Auf jede P-Welle', 'folgt ein QRS-Komplex'], ['PQ-Zeit', 'konstant und höchstens 0,2 s, QRS schmal']],
    notes: 'Am Streifen gemeinsam die sechs Fragen durchgehen: Frequenz 75/min, regelmäßig, P-Wellen vorhanden, PQ-Zeit rund 0,16 s (4 kleine Kästchen), QRS schmal, ST-Strecke auf der Nulllinie. So formuliert man einen Normalbefund: Sinusrhythmus, Frequenz 75/min, PQ-Zeit nicht verlängert, QRS nicht verbreitert, keine ST-Veränderungen.' });
  Q({ t: 'sel', q: 'Dreimal Sinusknoten, drei Frequenzen. Ordnen Sie zu.', figs: [st('stachy', 'EKG 1'), st('sinus', 'EKG 2'), st('sbrady', 'EKG 3')], rows: [['EKG 1', 'Sinustachykardie'], ['EKG 2', 'Sinusrhythmus'], ['EKG 3', 'Sinusbradykardie']],
    why: 'Alle drei haben eine P-Welle vor jedem QRS-Komplex. EKG 1 läuft mit 120/min, EKG 2 mit 75/min, EKG 3 mit etwa 45/min.', notes: 'Frequenzen mit der 300er-Regel bestimmen lassen. Eine Sinusbradykardie ist bei Sportlern und im Schlaf normal, eine Sinustachykardie ist fast immer ein Symptom: Ursache suchen.' });
  Q({ t: 'mc', q: 'Was fällt in diesem EKG auf?', fig: st('ves'), opts: ['Vorhofflimmern', 'AV-Block III°', 'Eine ventrikuläre Extrasystole', 'Ein Artefakt durch den Elektrokauter'], correct: 2,
    why: 'Ein Schlag kommt zu früh, ist breit und hat keine P-Welle davor. Danach folgt eine Pause, dann geht der Sinusrhythmus weiter.', notes: 'Im EKG erkennt man die ventrikuläre Extrasystole am verbreiterten QRS-Komplex. Treten sie gehäuft oder in Serie auf, dem Anästhesisten melden: Mehr als fünf aufeinanderfolgende ventrikuläre Extrasystolen gelten als ventrikuläre Tachykardie.' });
  S({ title: 'Die elektrische Herzachse', fig: { k: 'achse' }, bullets: [
      ['Herzachse:', 'Hauptrichtung der Kammererregung in der Frontalebene'],
      ['Normal', 'zeigt sie nach links unten, Richtung Herzspitze'],
      ['Zeigt die Achse auf eine Ableitung zu:', 'großer positiver Ausschlag'],
      ['Steht sie quer zur Ableitung:', 'positiver und negativer Anteil etwa gleich groß']],
    notes: 'Quelle: AMBOSS, Kapitel EKG. Das Dreieck zeigt die drei Ableitungen nach Einthoven: I vom rechten zum linken Arm, II vom rechten Arm zum linken Bein, III vom linken Arm zum linken Bein. Jede Ableitung sieht nur den Anteil der Erregung, der in ihre Richtung läuft. Im Bild läuft die Herzachse fast parallel zu Ableitung II, deshalb ist dort der Ausschlag am größten. Der Lagetyp beschreibt, in welche Richtung die Herzachse zeigt. Die Achse verschiebt sich im Lauf des Lebens von rechts nach links. Eine Vergrößerung der linken oder rechten Kammer kann sie in die entsprechende Richtung verschieben.' });
  S({ title: 'Der Cabrera-Kreis', fig: { k: 'cabrera' }, bullets: [
      ['Sechs Ableitungen der Frontalebene,', 'benachbarte liegen 30° auseinander'],
      ['Reihenfolge:', 'aVL, I, −aVR, II, aVF, III'],
      ['Größter positiver Ausschlag:', 'die Herzachse zeigt ungefähr in Richtung dieser Ableitung'],
      ['Lagetyp:', 'Richtung der elektrischen Herzachse in der Frontalebene']],
    notes: 'Quelle: AMBOSS, Kapitel EKG. Der Cabrera-Kreis fasst die Ableitungen nach Einthoven und Goldberger in einem Bild zusammen. −aVR ist die gespiegelte Ableitung aVR. Prinzipien zum Ablesen: Ist der QRS-Komplex in einer Ableitung überwiegend positiv, liegt die Herzachse auf der Kreishälfte, in die diese Ableitung zeigt. Ist er überwiegend negativ, liegt sie auf der anderen Hälfte. Sind positiver und negativer Anteil etwa gleich groß, steht die Herzachse ungefähr im rechten Winkel zu dieser Ableitung. Ein QRS-Vektor von 0° zeigt waagerecht nach links und entspricht einem Linkstyp. Die Gradgrenzen zwischen den Lagetypen in der Abbildung sind Lehrbuchwissen und stammen nicht wörtlich aus dem AMBOSS-Kapitel.' });
  S({ kind: 'bigfig', title: 'Lagetyp bestimmen mit I, II und III', fig: { k: 'lagetab' }, cap: 'So lesen Sie ab: Ist der QRS-Komplex in I, II und III überwiegend positiv (+) oder überwiegend negativ (−)? Sind alle drei positiv, entscheidet der Vergleich von I und III.',
    notes: 'Quelle: AMBOSS, Kapitel EKG, vereinfachte Lagetypbestimmung über die Einthoven-Ableitungen. Diese Methode kommt ohne Cabrera-Kreis und ohne Messen aus. Vorgehen: Für I, II und III jeweils entscheiden, ob der QRS-Komplex überwiegend nach oben oder nach unten zeigt, dann in der Tabelle ablesen. Sind alle drei positiv, entscheidet der Vergleich von I und III zwischen Indifferenztyp und Steiltyp. Die Zacken in der Abbildung zeigen die typische Größe der Ausschläge für jeden Lagetyp, sie sind gezeichnet. Beim überdrehten Rechtstyp kann II positiv oder negativ sein. Im OP-Alltag bestimmt die ATA den Lagetyp selten selbst, aber der Begriff steht in jedem EKG-Befund.' });
  Q({ t: 'mc', q: 'Welcher Lagetyp liegt vor?', fig: { k: 'lage', v: [1.0, 0.6, -0.45] }, opts: ['Linkstyp', 'Indifferenztyp', 'Steiltyp', 'Rechtstyp'], correct: 0,
    why: 'I und II sind überwiegend positiv, III ist überwiegend negativ: Linkstyp.', notes: 'In der Tabelle ablesen lassen: plus, plus, minus. Der Linkstyp ist bei älteren Personen ein normaler Befund.' });
  Q({ t: 'mc', q: 'Und welcher Lagetyp ist das?', fig: { k: 'lage', v: [0.7, 1.0, 0.3] }, opts: ['Linkstyp', 'Indifferenztyp', 'Steiltyp', 'Überdrehter Rechtstyp'], correct: 1,
    why: 'Alle drei Ableitungen sind positiv, der Ausschlag in I ist größer als in III: Indifferenztyp.', notes: 'Der Indifferenztyp ist der klassische Lagetyp bei Erwachsenen. Wäre der Ausschlag in III größer als in I, läge ein Steiltyp vor.' });
  S({ title: 'Was der Lagetyp aussagt', cols: [
      { h: 'Normal je nach Alter', items: ['Rechtstyp: Neugeborene und Säuglinge', 'Steiltyp: Kinder, schlanke Jugendliche und Erwachsene', 'Indifferenztyp: klassisch bei Erwachsenen', 'Linkstyp: ältere Personen'] },
      { h: 'Auffällig', items: ['Rechtstyp oder überdrehter Rechtstyp beim Erwachsenen: an eine Rechtsherzbelastung denken, zum Beispiel Lungenembolie', 'Verschiebung der Achse: Hypertrophie möglich'] },
      { h: 'Vorsicht', items: ['Der Lagetyp allein beweist nichts', 'Passt der Lagetyp nicht zur Person: Sind die Elektroden richtig angelegt?'] }],
    notes: 'Quelle: AMBOSS, Kapitel EKG. Die Herzachse verschiebt sich im Lauf des Lebens von rechts nach links, auch mit zunehmendem Gewicht. Deshalb erlaubt der Lagetyp allein keine sichere Aussage. Sensitivität und Spezifität von Lagetypveränderungen sind gering, andere Befunde müssen einbezogen werden. Wichtig für die Praxis: Ein unerwarteter Lagetyp ist oft ein Hinweis auf vertauschte Extremitätenelektroden. Sonderformen wie der SI-QIII-Typ können Folge einer Rechtsherzbelastung sein, etwa bei einer Lungenembolie.' });
  Q({ t: 'mc', q: 'Ein 60-jähriger Patient bekommt nach der OP plötzlich Luftnot. Das EKG zeigt neu diesen Lagetyp. Woran müssen Sie denken?', fig: { k: 'lage', v: [-0.4, 0.6, 1.0] }, opts: ['Das ist bei Erwachsenen normal', 'Rechtsherzbelastung, zum Beispiel durch eine Lungenembolie', 'AV-Block III°', 'Vagusreiz'], correct: 1,
    why: 'I ist negativ, II und III sind positiv: Rechtstyp. Beim Erwachsenen lässt ein Rechtstyp an eine Rechtsherzbelastung denken, zum Beispiel bei einer Lungenembolie.', notes: 'Sofort den Anästhesisten informieren. Der Lagetyp allein beweist keine Lungenembolie, er ist aber zusammen mit der plötzlichen Luftnot ein Warnzeichen. Auch hier zuerst prüfen, ob die Elektroden richtig kleben.' });
  S({ kind: 'bigfig', title: 'So sieht ein 12-Kanal-EKG im Krankenhaus aus', fig: { k: 'ekg12', kind: 'normal' }, cap: 'Links die Extremitätenableitungen, rechts die Brustwandableitungen. Am Anfang jeder Zeile steht die Eichzacke: 10 mm entsprechen 1 mV. Unten steht der Papiervorschub.',
    satz: 'Sinusrhythmus, Herzfrequenz 60/min, Indifferenztyp, PQ-Zeit und QRS-Dauer normal, keine höhergradigen Erregungsrückbildungsstörungen.',
    notes: 'Quelle: AMBOSS, Kapitel EKG. Das Bild zeigt einen Normalbefund in dem Aufbau, wie ihn viele Geräte in Deutschland drucken: sechs Extremitätenableitungen links, sechs Brustwandableitungen rechts, Papiervorschub 50 mm/s. Je nach Gerät gibt es auch andere Anordnungen, zum Beispiel vier Spalten mit einem Rhythmusstreifen darunter und 25 mm/s. Deshalb immer zuerst auf Papiervorschub und Eichzacke schauen. Der Standardsatz folgt immer derselben Reihenfolge: Rhythmus, Frequenz, Lagetyp, Zeiten, Erregungsrückbildung. Erregungsrückbildungsstörungen, kurz ERBST, sind krankhafte Veränderungen der ST-Strecke und der T-Welle. AMBOSS formuliert den Normalbefund so: Sinusrhythmus mit einer Frequenz von X/min, Lagetyp, PQ-Zeit nicht verlängert, QRS nicht verbreitert, keine signifikanten ST-Streckenveränderungen, keine Erregungsrückbildungsstörungen. Was man am Bild zeigen kann: aVR ist negativ. In den Brustwandableitungen wird die R-Zacke von V1 nach V5 größer, die S-Zacke kleiner. Das EKG ist gezeichnet, keine Originalregistrierung.' });
  Q({ t: 'mc', q: 'Dieses EKG läuft mit 50 mm/s. Zwischen zwei R-Zacken liegen 10 große Kästchen. Wie hoch ist die Herzfrequenz?', fig: { k: 'ekg12', kind: 'normal' }, opts: ['30/min', '60/min', '100/min', '120/min'], correct: 1,
    why: 'Bei 50 mm/s dauert ein großes Kästchen 0,1 s. 10 Kästchen sind 1 s pro Schlag, das ergibt 60/min. Kurzformel bei 50 mm/s: 600 geteilt durch 10.', notes: 'Typischer Fehler: Wer mit der 300er-Regel für 25 mm/s rechnet, kommt auf 30/min und hält ein normales EKG für eine schwere Bradykardie. Am Bild nachzählen lassen.' });
  Q({ t: 'sel', q: 'Befunden Sie dieses EKG im Standardsatz.', fig: { k: 'ekg12', kind: 'normal' }, rows: [['Rhythmus', 'Sinusrhythmus'], ['Herzfrequenz', '60/min'], ['Lagetyp', 'Indifferenztyp'], ['Rückbildung', 'keine höhergradigen Störungen']],
    extra: ['Vorhofflimmern', '120/min', 'Rechtstyp', 'ST-Hebung in II, III, aVF'],
    why: 'Vor jedem QRS-Komplex steht eine P-Welle: Sinusrhythmus. 10 große Kästchen bei 50 mm/s: 60/min. I, II und III positiv, I größer als III: Indifferenztyp. ST-Strecken auf der Nulllinie, T-Wellen unauffällig.', notes: 'Den vollständigen Satz gemeinsam laut formulieren lassen: Sinusrhythmus, Herzfrequenz 60/min, Indifferenztyp, PQ-Zeit und QRS-Dauer normal, keine höhergradigen Erregungsrückbildungsstörungen. Diesen Satz verwenden die Schüler gleich in der Praxis für das eigene EKG.' });
  S({ title: 'Praxis: Schreiben Sie sich gegenseitig ein EKG', numbered: [
      ['Gruppen bilden:', 'eine Person liegt, eine klebt, die anderen prüfen die Positionen'],
      ['Extremitäten:', 'rot, gelb, grün, schwarz nach der Ampel'],
      ['Brustwand:', 'V1 und V2 im 4. Zwischenrippenraum, V4 im 5., dann V3, V5, V6'],
      ['Ruhig liegen, EKG schreiben,', 'Papiervorschub notieren'],
      ['Befunden im Standardsatz:', 'Rhythmus, Frequenz, Lagetyp, Zeiten, Erregungsrückbildung']],
    notes: 'Gruppenarbeit, etwa 20 Minuten. Mit einem Gerät: Eine Gruppe schreibt, die anderen befunden den Ausdruck der Vorgruppe, dann wird gewechselt. Nur Freiwillige als Probanden, auf Sichtschutz achten. Die Schüler sollen die Zwischenrippenräume wirklich tasten und abzählen. Typische Fehler gemeinsam am Ausdruck anschauen: vertauschte Extremitätenelektroden, Brustwandelektroden zu hoch geklebt, Muskelzittern als Artefakt. Die Frequenz mit der 300er-Regel bestimmen lassen und dabei auf den Papiervorschub achten: Bei 50 mm/s gilt 600 geteilt durch die großen Kästchen. Wichtig: Im Unterricht wird keine Diagnose gestellt. Fällt etwas Ungewöhnliches auf, die Person unter vier Augen ansprechen und eine ärztliche Abklärung empfehlen.' });
  S({ title: 'Teil 1 in vier Sätzen', numbered: [
      ['Der schnellste Schrittmacher bestimmt den Rhythmus,', 'normalerweise der Sinusknoten'],
      ['P-Welle, QRS-Komplex und T-Welle', 'bilden Vorhoferregung, Kammererregung und Rückbildung ab'],
      ['Elektroden nach der Ampel,', 'am Monitor Ableitung II und V5'],
      ['Erst der Patient,', 'dann der Monitor']],
    notes: 'Kurz zusammenfassen und offene Fragen sammeln. Dann 30 Minuten Pause. Das Quiz auf dem Handy bleibt offen, die Schüler können nach der Pause einfach weitermachen.' });
  S({ kind: 'section', title: 'Pause', sub: 'Weiter um 10:00 Uhr mit Teil 2: Herzinfarkt im EKG und Rhythmusstörungen', notes: 'Pause von 9:30 bis 10:00 Uhr.' });

  /* ===== TEIL 2 ===== */
  SEC('ST-Hebungsinfarkt im EKG');
  Q({ t: 'mc', q: 'Ein Patient hat seit 30 Minuten Brustschmerzen. Was zeigt dieses EKG?', fig: { k: 'ekg12', kind: 'stemi' }, opts: ['ST-Hebungen in II, III und aVF', 'AV-Block III°', 'Vorhofflimmern', 'Einen Normalbefund'], correct: 0,
    why: 'Der Rhythmus ist ein regelmäßiger Sinusrhythmus. Auffällig ist die ST-Strecke: In II, III und aVF geht sie deutlich oberhalb der Nulllinie in die T-Welle über. In I und aVL ist sie gesenkt: Das ist das Spiegelbild. Die Brustwandableitungen sind unauffällig.', notes: 'Diese Frage kommt bewusst vor der Erklärung und nennt die ST-Strecke nicht. Die Schüler sollen mit den sechs Fragen selbst darauf kommen: Frequenz und Rhythmus sind unauffällig, erst der Blick auf die ST-Strecke zeigt den Befund. Zum Vergleich das normale EKG von vorhin danebenhalten. Am Handy lässt sich das EKG seitlich verschieben.' });
  S({ kind: 'bigfig', title: 'ST-Hebungsinfarkt (STEMI) im 12-Kanal-EKG', fig: { k: 'ekg12', kind: 'stemi' }, cap: 'ST-Hebung in II, III und aVF, spiegelbildliche Senkung in I und aVL: Infarkt der Hinterwand (inferior)',
    notes: 'Quelle: AMBOSS, Kapitel EKG. Die ST-Hebung wird am J-Punkt gemessen, dem Übergang vom QRS-Komplex in die ST-Strecke. Als Nulllinie gilt die PQ-Strecke vor dem QRS-Komplex. Signifikant ist eine Hebung von mehr als 0,1 mV, das entspricht 1 mm. Voraussetzung für den Verdacht auf eine Ischämie sind Veränderungen in zwei benachbarten Ableitungen. Beim Infarkt geht die Hebung meist vom absteigenden Schenkel der R-Zacke ab. In den gegenüberliegenden Extremitätenableitungen zeigt sich oft das Spiegelbild als ST-Senkung. Das EKG ist gezeichnet und zeigt den Befund in Reinform. Bezug zum OP: Ableitung II läuft am Monitor mit, ein Hinterwandinfarkt ist dort also sichtbar.' });
  S({ title: 'ST-Hebung erkennen und zuordnen', table: { head: ['Ableitungen', 'Bereich des Herzens'], rows: [
      ['II, III, aVF', 'Hinterwand (inferior)'], ['V1, V2', 'Kammerscheidewand (Septum)'], ['V3, V4', 'Vorderwand und Herzspitze'], ['I, aVL, V5, V6', 'Seitenwand']] },
    bullets: [['Signifikant:', 'mehr als 0,1 mV (1 mm) in zwei benachbarten Ableitungen'], ['Am Monitor entdeckt:', 'Anästhesisten informieren, sofort 12-Kanal-EKG schreiben']],
    notes: 'Quelle: AMBOSS, Kapitel EKG, Projektionen der Ableitungen. Benachbart heißt: nebeneinander im Cabrera-Kreis oder aufeinanderfolgende Brustwandableitungen. Nicht jede ST-Hebung ist ein Infarkt. In V1 bis V3 ist eine leichte Hebung häufig normal, weitere Ursachen sind zum Beispiel eine Herzbeutelentzündung oder die frühe Repolarisation bei jungen, sportlichen Menschen. Deshalb gehören Beschwerden und EKG immer zusammen. Bei Verdacht auf einen Herzinfarkt wird das 12-Kanal-EKG sofort geschrieben und beurteilt, innerhalb von 10 Minuten nach dem ersten Kontakt. Bei einem Linksschenkelblock können ST-Hebungen verdeckt sein.' });
  Q({ t: 'sel', q: 'Welche Ableitungen schauen auf welchen Bereich des Herzens?', rows: [['II, III, aVF', 'Hinterwand (inferior)'], ['V1, V2', 'Kammerscheidewand (Septum)'], ['V3, V4', 'Vorderwand und Herzspitze'], ['I, aVL, V5, V6', 'Seitenwand']],
    why: 'II, III und aVF zeigen die Hinterwand, V1 und V2 das Septum, V3 und V4 die Vorderwand, I, aVL, V5 und V6 die Seitenwand.', notes: 'Merkhilfe: Die Brustwandableitungen wandern von der Mitte nach außen, vom Septum über die Vorderwand zur Seitenwand.' });
  Q({ t: 'mc', q: 'Im OP: Der Monitor zeigt in Ableitung II plötzlich dieses Bild. Was sehen Sie, und was tun Sie?', fig: st('stelev'), opts: ['Normaler Sinusrhythmus – nichts weiter', 'ST-Hebung – Anästhesisten informieren, 12-Kanal-EKG vorbereiten', 'Kammerflimmern – sofort defibrillieren', 'AV-Block – Atropin aufziehen'], correct: 1,
    why: 'Rhythmus und Frequenz sind normal, aber die ST-Strecke liegt deutlich über der Nulllinie. Jede Auffälligkeit am Monitor ist Anlass für ein 12-Kanal-EKG. Eine neue ST-Hebung kann eine Durchblutungsstörung des Herzens anzeigen und muss sofort gemeldet werden.', notes: 'Die Diagnose stellt der Arzt am 12-Kanal-EKG. Aufgabe der ATA ist, die Veränderung zu bemerken, sie laut anzusagen und das EKG-Gerät zu holen.' });

  SEC('Rhythmusstörungen einordnen');
  S({ title: 'Sieben Fragen, bevor Sie handeln', cols: [
      { h: 'Zum Patienten', items: ['Atmet er?', 'Hat er einen Puls?', 'Ist er stabil oder instabil?'] },
      { h: 'Zum EKG', items: ['Bradykard oder tachykard?', 'Regelmäßig oder unregelmäßig?', 'QRS schmal oder breit?', 'P-Wellen vorhanden?'] },
      { h: 'Daraus folgt', items: ['Medikamente?', 'Elektrotherapie: Schrittmacher, Kardioversion oder Defibrillation?', 'Sedierung oder Narkose nötig?'] }],
    notes: 'Das ist das Raster aus dem alten Vortrag, jetzt in eine Reihenfolge gebracht. Die Fragen zum Patienten kommen zuerst. Kein Puls bedeutet Reanimation, egal was das EKG zeigt. Mit Puls entscheidet die Frage stabil oder instabil darüber, wie schnell und wie invasiv gehandelt wird. Alle vier Fälle am Ende werden nach diesem Raster eingeordnet.' });
  S({ title: 'Instabil heißt: Der Kreislauf reicht nicht mehr', cols: [
      { h: 'Schock', items: ['Blutdruck systolisch unter 90 mmHg', 'blass, kaltschweißig'] },
      { h: 'Synkope', items: ['kurze Bewusstlosigkeit', 'das Gehirn wird zu wenig durchblutet'] },
      { h: 'Herzinsuffizienz', items: ['Lungenödem, Luftnot', 'gestaute Halsvenen'] },
      { h: 'Myokardischämie', items: ['Brustschmerz', 'ST-Veränderungen im EKG'] }],
    notes: 'Diese vier Zeichen stammen aus den Leitlinien des Europäischen Rats für Wiederbelebung (ERC) von 2025. Liegt eines davon vor, wird nicht abgewartet. Bei einer Tachykardie bedeutet das Kardioversion, bei einer Bradykardie Atropin und gegebenenfalls Schrittmacher. Neu seit 2025: Auch eine Rhythmusstörung direkt nach einer erfolgreichen Reanimation gilt als instabil.' });
  Q({ t: 'mc', q: 'Was ist KEIN Zeichen der Instabilität?', opts: ['Synkope', 'Blutdruck 75/40 mmHg, kaltschweißig', 'Lungenödem mit Luftnot', 'Herzfrequenz 110/min bei einem wachen, beschwerdefreien Patienten'], correct: 3,
    why: 'Eine Frequenz allein macht nicht instabil. Entscheidend sind Schock, Synkope, Herzinsuffizienz und Myokardischämie.', notes: 'Nachfragen: Was könnte hinter 110/min bei einem beschwerdefreien Patienten stecken? Schmerz, Aufregung, Fieber, Volumenmangel.' });

  SEC('Zu langsam: Bradykardien');
  S({ title: 'Bradykarde Rhythmusstörungen', grid: [
      { fig: st('sbrady'), cap: 'Sinusbradykardie: normaler Ablauf, nur langsamer als 60/min' },
      { fig: st('avb1'), cap: 'AV-Block I°: PQ-Zeit über 0,2 s, jede P-Welle wird übergeleitet' },
      { fig: st('avb2'), cap: 'AV-Block II°: einzelne P-Wellen werden nicht übergeleitet' },
      { fig: st('avb3'), cap: 'AV-Block III°: Vorhöfe und Kammern schlagen unabhängig voneinander' }],
    notes: 'AV-Block I° ist eine reine Verzögerung der Überleitung. Beim AV-Block II° gibt es zwei Typen. Typ Wenckebach: Die PQ-Zeit wird von Schlag zu Schlag länger, bis ein QRS-Komplex ausfällt. Typ Mobitz, hier im Bild: Die PQ-Zeit bleibt gleich und plötzlich fehlt ein QRS-Komplex. Beim AV-Block III°, dem totalen AV-Block, kommt keine Erregung mehr in den Kammern an. Ein Ersatzschrittmacher in der Kammer übernimmt mit 25 bis 40/min, die QRS-Komplexe sind dann breit. Diese Einteilung ist Lehrbuchwissen und stammt nicht aus der Reanimationsleitlinie.' });
  Q({ t: 'sel', q: 'Drei AV-Blöcke. Ordnen Sie jedem EKG den richtigen Grad zu.', figs: [st('avb3', 'EKG 1'), st('avb1', 'EKG 2'), st('avb2', 'EKG 3')], rows: [['EKG 1', 'AV-Block III°'], ['EKG 2', 'AV-Block I°'], ['EKG 3', 'AV-Block II° (Typ Mobitz)']],
    why: 'EKG 1: P-Wellen und breite QRS-Komplexe haben nichts miteinander zu tun. EKG 2: lange, aber konstante PQ-Zeit. EKG 3: jede dritte P-Welle bleibt ohne QRS-Komplex.', notes: 'Tipp zum Erkennen: P-Wellen mit einem Stift markieren und schauen, ob der Abstand zum nächsten QRS-Komplex gleich bleibt. Beim AV-Block III° laufen die P-Wellen in ihrem eigenen Takt durch und verstecken sich manchmal im QRS-Komplex oder in der T-Welle.' });
  S({ title: 'Bradykardie behandeln', numbered: [
      ['Ursache beheben:', 'Vagusreiz stoppen, Hypoxie ausschließen, Medikamente prüfen'],
      ['Atropin 0,5 mg i.v.,', 'bei Bedarf alle 3–5 Minuten wiederholen, höchstens 3 mg'],
      ['Wirkt Atropin nicht:', 'Adrenalin 2–10 µg/min oder Isoprenalin über Perfusor'],
      ['Bleibt der Patient instabil:', 'Schrittmacher, zuerst transkutan über Klebeelektroden']],
    aside: 'Kein Atropin bei höhergradigem AV-Block mit breitem QRS-Komplex: Es kann den Block verschlechtern.',
    notes: 'Quelle: ERC-Leitlinien 2025. Atropin kann intravenös oder intraossär gegeben werden. Isoprenalin wird mit 5 µg/min begonnen. Neu in den Leitlinien 2025: kein Atropin bei höhergradigem AV-Block mit breitem QRS-Komplex. Bei Patienten nach Herztransplantation oder mit Rückenmarksverletzung wird statt Atropin Aminophyllin gegeben. Sind Betablocker oder Kalziumkanalblocker die Ursache, kommt Glukagon in Betracht. Ist kein Schrittmacher sofort verfügbar und Atropin unwirksam, nennt die Leitlinie die Fauststimulation als Überbrückung. Aufgaben der ATA: Atropin aufziehen, Perfusor vorbereiten, Defibrillator mit Schrittmacherfunktion und Klebeelektroden holen.' });
  Q({ t: 'mc', q: 'Bradykardie 32/min, Blutdruck 70/40 mmHg. Der Anästhesist ordnet Atropin an. Welche Einzeldosis ziehen Sie für einen Erwachsenen auf?', opts: ['0,05 mg', '0,5 mg', '3 mg', '5 mg'], correct: 1,
    why: '0,5 mg (500 µg) Atropin intravenös, bei Bedarf alle 3–5 Minuten wiederholen bis zu einer Gesamtdosis von 3 mg.', notes: 'Quelle: ERC-Leitlinien 2025. Ampullengröße und Hausstandard der eigenen Klinik ansprechen.' });
  S({ title: 'Schrittmacher: wenn Medikamente nicht reichen', cols: [
      { h: 'Transkutan', items: ['über die Klebeelektroden des Defibrillators', 'Überbrückung, bis eine Sonde gelegt ist', 'Erfolg am Puls prüfen', 'wacher Patient: Analgosedierung klären'] },
      { h: 'Transvenös', items: ['Schrittmachersonde über eine Vene', 'bei instabilen Patienten frühzeitig'] },
      { h: 'Patient mit ICD', items: ['ICD = implantierter Defibrillator', 'Klebeelektroden mehr als 8 cm vom Gerät entfernt', 'gibt der ICD unnötige Schocks ab, kann ein Magnet sie vorübergehend stoppen'] }],
    notes: 'Quelle: ERC-Leitlinien 2025. Pacing wird bei instabilen Patienten mit symptomatischer Bradykardie erwogen, die auf Medikamente nicht ansprechen: entweder frühzeitig eine Schrittmachersonde oder transkutane Stimulation als Überbrückung. Bei einer Asystolie das EKG sorgfältig auf P-Wellen prüfen, denn diese Form spricht wahrscheinlich auf einen Schrittmacher an. Der Magnet auf dem ICD stoppt die Schocks, ohne die Stimulation abzuschalten, sofern das Gerät so programmiert ist. Helfer können einen ICD-Schock während der Herzdruckmassage in den Armen spüren.' });

  SEC('Zu schnell: Tachykardien');
  Q({ t: 'sel', q: 'Vier Rhythmen, die Sie sofort erkennen müssen. Ordnen Sie zu.', figs: [st('vt', 'EKG 1'), st('asys', 'EKG 2'), st('af', 'EKG 3'), st('vf', 'EKG 4')], rows: [['EKG 1', 'Ventrikuläre Tachykardie'], ['EKG 2', 'Asystolie'], ['EKG 3', 'Vorhofflimmern'], ['EKG 4', 'Kammerflimmern']],
    why: 'EKG 1: regelmäßig und breit. EKG 2: Nulllinie. EKG 3: schmale Komplexe in unregelmäßigen Abständen, keine P-Wellen. EKG 4: chaotische Wellen ohne erkennbare Komplexe.', notes: 'Diese Frage kommt vor der Erklärung, die beiden nächsten Folien lösen auf. Nachfragen: Bei welchen dieser Rhythmen kann der Patient noch einen Puls haben? Bei Vorhofflimmern immer, bei ventrikulärer Tachykardie manchmal, bei den beiden anderen nie.' });
  S({ title: 'Tachykardien mit schmalem QRS-Komplex', grid: [
      { fig: st('stachy'), cap: 'Sinustachykardie: P-Welle vor jedem QRS, Ursache suchen (zum Beispiel Schmerz)' },
      { fig: st('svt'), cap: 'Supraventrikuläre Tachykardie: regelmäßig, schmal, P-Wellen nicht sicher erkennbar' },
      { fig: st('af'), cap: 'Vorhofflimmern: keine P-Wellen, völlig unregelmäßig' }],
    notes: 'Schmaler QRS-Komplex bedeutet: Der Ursprung liegt oberhalb der Kammern, die Erregung läuft über das schnelle Leitungssystem. Bei der Sinustachykardie wird die Ursache behandelt. Vorhofflimmern ist eine sehr häufige Rhythmusstörung im Alter. Im EKG fehlen die P-Wellen, die Abstände zwischen den QRS-Komplexen sind völlig unregelmäßig. Je nach Kammerfrequenz spricht man von bradykardem oder tachykardem Vorhofflimmern.' });
  S({ title: 'Breiter QRS-Komplex und Kreislaufstillstand', grid: [
      { fig: st('vt'), cap: 'Ventrikuläre Tachykardie: regelmäßig, breit, mit oder ohne Puls' },
      { fig: st('vf'), cap: 'Kammerflimmern: chaotisch, kein QRS abgrenzbar, nie ein Puls' },
      { fig: st('asys'), cap: 'Asystolie: Nulllinie, keine elektrische Aktivität' },
      { fig: st('sinus'), cap: 'Pulslose elektrische Aktivität: geordnetes EKG, aber kein Puls' }],
    notes: 'Ventrikuläre Tachykardie im EKG: regelmäßige, breite QRS-Komplexe ab 0,12 s, Frequenz um 100 bis 200/min. Sie kann mit oder ohne Puls einhergehen, deshalb immer Puls tasten. Bei Asystolie das EKG sorgfältig auf P-Wellen prüfen, dann kann ein Schrittmacher helfen. Die pulslose elektrische Aktivität zeigt, warum das EKG allein nie reicht: Das Bild unten rechts ist ein normaler Sinusrhythmus, der Patient kann trotzdem pulslos sein, zum Beispiel bei massiver Blutung oder Lungenembolie.' });
  Q({ t: 'mc', q: 'Welche Rhythmen werden bei einem Kreislaufstillstand defibrilliert?', opts: ['Asystolie und pulslose elektrische Aktivität', 'Kammerflimmern und pulslose ventrikuläre Tachykardie', 'Alle Rhythmen ohne Puls', 'Nur Kammerflimmern'], correct: 1,
    why: 'Schockbar sind Kammerflimmern und die pulslose ventrikuläre Tachykardie. Bei Asystolie und pulsloser elektrischer Aktivität hilft kein Schock, hier zählen Herzdruckmassage, Adrenalin und die Suche nach der Ursache.', notes: 'Seit 2025 ausdrücklich: Auch feines Kammerflimmern mit kleiner Amplitude wird defibrilliert.' });
  S({ title: 'Drei Arten der Elektrotherapie', cols: [
      { h: 'Defibrillation', items: ['unsynchronisierter Schock', 'bei Kammerflimmern und pulsloser ventrikulärer Tachykardie', 'Patient ist bewusstlos'] },
      { h: 'Kardioversion', items: ['Schock synchron zur R-Zacke', 'bei instabiler Tachykardie mit Puls', 'wacher Patient: Kurznarkose'] },
      { h: 'Schrittmacher', items: ['regelmäßige kleine Impulse', 'bei instabiler Bradykardie', 'wacher Patient: Analgosedierung'] }],
    notes: 'Alle drei laufen über dasselbe Gerät und dieselben Klebeelektroden. Der Unterschied liegt in der Einstellung. Bei der Kardioversion muss die Sync-Taste gedrückt sein. Das Gerät gibt den Schock dann synchron zur R-Zacke ab. Die Bedienung am Gerät der eigenen Klinik zeigen. Vor jedem Schock: Sauerstoffquelle mindestens einen Meter vom Brustkorb entfernen, niemand berührt den Patienten.' });
  S({ title: 'Tachykardie mit Puls behandeln', cols: [
      { h: 'Instabil', items: ['synchronisierte Kardioversion', 'vorher Kurznarkose oder Sedierung', 'ohne Erfolg: Amiodaron 300 mg i.v. über 10–20 min, dann erneut'] },
      { h: 'Stabil, Vorhofflimmern', items: ['Frequenz senken, zum Beispiel mit Betablocker', 'Ursache behandeln', 'fachlichen Rat einholen'] },
      { h: 'Stabile Kammertachykardie', items: ['Kardioversion empfohlen, wenn eine Herzerkrankung vorliegt oder unklar ist', 'Medikamente, wenn Narkose oder Sedierung zu riskant sind'] }],
    notes: 'Quelle: ERC-Leitlinien 2025. Energien für den ersten synchronisierten Schock: bei Vorhofflimmern die maximale Energie des Geräts, bei Vorhofflattern und paroxysmaler supraventrikulärer Tachykardie 70 bis 120 Joule, bei ventrikulärer Tachykardie mit Puls 120 bis 150 Joule. An die Aufsättigung mit 300 mg Amiodaron kann sich eine Infusion von 900 mg über 24 Stunden anschließen. Bei stabilem Vorhofflimmern und eingeschränkter Pumpfunktion: Betablocker in der geringsten Dosis, Zielfrequenz unter 110/min. Hinweis: Die Behandlung der stabilen regelmäßigen Schmalkomplextachykardie steht im Tachykardie-Algorithmus des ERC. Diesen Teil konnte ich nicht im Wortlaut prüfen, bitte das Poster 2025 danebenlegen. Aufgaben der ATA: Defibrillator, Klebeelektroden, Narkosemedikamente, Absaugung und Beatmungsmöglichkeit bereitstellen.' });
  Q({ t: 'order', q: 'Eine Person bricht vor Ihnen zusammen. Bringen Sie die Basismaßnahmen in die richtige Reihenfolge.', items: ['Eigene Sicherheit beachten, Person ansprechen und anfassen', 'Notruf 112 absetzen, Telefon auf Lautsprecher', 'Atmung beurteilen', 'Herzdruckmassage beginnen, 30 : 2', 'Defibrillator (AED) einschalten, sobald er da ist'],
    why: 'Prüfen, Rufen, Drücken. Seit 2025 wird der Notruf direkt nach der Bewusstseinsprüfung abgesetzt, die Atmung wird beurteilt, während die Verbindung aufgebaut wird.', notes: 'Diese Frage kommt bewusst vor der Übersichtsfolie, die Basismaßnahmen sind bekannt. Änderung der Leitlinien 2025: Der Notruf kommt jetzt vor der Atemkontrolle. Schnappatmung ist keine normale Atmung und gilt als Zeichen des Kreislaufstillstands. Wer nicht beatmen kann oder will, drückt ohne Unterbrechung.' });
  S({ title: 'Kreislaufstillstand: der Ablauf', cols: [
      { h: 'Immer', items: ['Herzdruckmassage 100–120/min, 5–6 cm tief', '30 Kompressionen : 2 Beatmungen', 'alle 2 Minuten Rhythmus prüfen'] },
      { h: 'Schockbar', items: ['sofort defibrillieren, mindestens 150 J', 'direkt weiterdrücken', 'nach dem 3. Schock: Adrenalin 1 mg und Amiodaron 300 mg'] },
      { h: 'Nicht schockbar', items: ['Adrenalin 1 mg so früh wie möglich', 'alle 3–5 Minuten wiederholen', 'Ursache suchen'] }],
    aside: 'Behebbare Ursachen: Hypoxie, Hypovolämie, Hypo-/Hyperkaliämie, Hypothermie – Herzbeuteltamponade, Intoxikation, Thrombose (Herzinfarkt, Lungenembolie), Spannungspneumothorax.',
    notes: 'Quelle: ERC-Leitlinien 2025. Nach dem fünften Schock weitere 150 mg Amiodaron. Bleibt das Kammerflimmern nach drei Schocks bestehen, kann die Position der Klebeelektroden gewechselt werden, von vorn-seitlich auf vorn-hinten. Im Krankenhaus wird ein beobachtetes Kammerflimmern am Monitor mit bis zu drei Schocks direkt hintereinander behandelt. Die behebbaren Ursachen merkt man sich als 4 H und HITS. Für den OP besonders wichtig: Hypoxie, Blutung, Kaliumstörungen, Lungenembolie und Spannungspneumothorax.' });
  Q({ t: 'mc', q: 'Reanimation bei Kammerflimmern: Wann geben Sie zum ersten Mal Adrenalin?', opts: ['Sofort, noch vor dem ersten Schock', 'Nach dem 1. Schock', 'Nach dem 3. Schock', 'Erst nach 10 Minuten'], correct: 2,
    why: 'Bei schockbarem Rhythmus 1 mg Adrenalin nach dem 3. Schock, danach alle 3–5 Minuten. Bei Asystolie und pulsloser elektrischer Aktivität so früh wie möglich.', notes: 'Quelle: ERC-Leitlinien 2025. Als ATA: Adrenalin nach Hausstandard aufziehen und beschriften, laut ansagen, wann gegeben wurde. Eine Person führt Protokoll über Zeiten und Medikamente.' });
  Q({ t: 'mc', q: 'Welche Ursache gehört NICHT zu den behebbaren Ursachen eines Kreislaufstillstands (4 H und HITS)?', opts: ['Hypoxie', 'Hypovolämie', 'Hyperglykämie', 'Spannungspneumothorax'], correct: 2,
    why: 'Die 4 H sind Hypoxie, Hypovolämie, Hypo-/Hyperkaliämie und Hypothermie. HITS steht für Herzbeuteltamponade, Intoxikation, Thrombose und Spannungspneumothorax.', notes: 'Quelle: ERC-Leitlinien 2025. Bei jedem Kreislaufstillstand werden diese acht Ursachen durchgegangen.' });

  SEC('Vier Fälle aus der Praxis');
  S({ kind: 'case', title: 'Fall 1: Die Geburtstagsfeier', text: 'Sie sind auf einer großen Geburtstagsfeier. Der ältere Herr gegenüber wird plötzlich blass, sackt auf dem Stuhl zusammen und ist bewusstlos. Der Puls ist nur schwach und sehr langsam zu tasten. Nach etwa 30 Sekunden öffnet er die Augen. Der Rettungsdienst schreibt dieses EKG.', fig: st('avb3'),
    notes: 'Ersetzt die Gruppenarbeit 1. Den Fall vorlesen lassen, dann die Klasse am EKG die sechs Fragen durchgehen lassen: Frequenz der Kammern etwa 35/min, regelmäßig, P-Wellen vorhanden, aber ohne festen Bezug zu den QRS-Komplexen, QRS breit.' });
  Q({ t: 'mc', q: 'Fall 1: Welche Rhythmusstörung zeigt das EKG?', fig: st('avb3'), opts: ['Sinusbradykardie', 'AV-Block I°', 'AV-Block III°', 'Vorhofflimmern'], correct: 2,
    why: 'Die P-Wellen laufen regelmäßig durch, die breiten QRS-Komplexe kommen unabhängig davon mit etwa 35/min. Vorhöfe und Kammern schlagen ohne Verbindung.', notes: 'Definition für die Mitschrift: Beim AV-Block III° ist die Überleitung von den Vorhöfen auf die Kammern vollständig unterbrochen. Ein Ersatzrhythmus aus der Kammer hält den Kreislauf aufrecht.' });
  Q({ t: 'mc', q: 'Fall 1: Wie ordnen Sie Patient und EKG ein, und was wird gebraucht?', opts: ['Stabil, tachykard – abwarten', 'Instabil (Synkope), bradykard, breite QRS-Komplexe – Schrittmacher vorbereiten', 'Kein Puls – sofort defibrillieren', 'Stabil, bradykard – Betablocker geben'], correct: 1,
    why: 'Puls vorhanden, aber Synkope: instabil. Bradykard, regelmäßig, breite QRS-Komplexe. Spricht er auf Medikamente nicht an, braucht er einen Schrittmacher.', notes: 'Nach den ERC-Leitlinien 2025 wird bei höhergradigem AV-Block mit breitem QRS-Komplex kein Atropin gegeben. Als Medikamente der zweiten Wahl nennt die Leitlinie Isoprenalin und Adrenalin über Perfusor, dazu Pacing bei instabilen Patienten.' });
  S({ kind: 'case', title: 'Fall 2: Im Pflegeheim', text: 'Sie hospitieren beim Notarzt. Einsatzmeldung: Verschlechterung des Allgemeinzustands. Frau Müller liegt im Bett, ist ansprechbar, atmet schnell, über der Lunge brodelt es, sie fühlt sich fiebrig an und hat heute kaum getrunken. Der Puls rast, ist schwach und „holprig“. Sie klagt über Schwindel.', fig: st('af'),
    notes: 'Ersetzt die Gruppenarbeit 2. Hinweis aus dem alten Fall: Im OP hat der Anästhesist am Vortag bei einem ähnlichen EKG gesagt, das sei eine sehr häufige Rhythmusstörung im Alter. Sechs Fragen: Frequenz etwa 120 bis 130/min, unregelmäßig, keine P-Wellen, stattdessen eine unruhige Grundlinie, QRS schmal.' });
  Q({ t: 'mc', q: 'Fall 2: Welche Rhythmusstörung liegt vor?', fig: st('af'), opts: ['Sinustachykardie', 'Vorhofflimmern mit schneller Überleitung', 'Ventrikuläre Tachykardie', 'AV-Block II°'], correct: 1,
    why: 'Keine P-Wellen, unruhige Grundlinie, schmale QRS-Komplexe in völlig unregelmäßigen Abständen: Vorhofflimmern, hier als Tachyarrhythmie.', notes: 'Der „holprige“ Puls passt zu den völlig unregelmäßigen Abständen zwischen den QRS-Komplexen.' });
  Q({ t: 'mc', q: 'Fall 2: Die Patientin ist wach, der Blutdruck beträgt 105/60 mmHg. Was steht im Vordergrund?', opts: ['Sofortige Defibrillation', 'Auslöser behandeln (Infekt, Flüssigkeitsmangel) und die Frequenz senken', 'Atropin 0,5 mg', 'Externer Schrittmacher'], correct: 1,
    why: 'Die Patientin ist nicht im Schock. Infekt und Flüssigkeitsmangel treiben die Frequenz. Behandelt werden die Auslöser, zusätzlich wird die Frequenz medikamentös gesenkt. Bei Instabilität: synchronisierte Kardioversion.', notes: 'Diskussionspunkt: Das Brodeln über der Lunge kann eine Lungenentzündung oder ein beginnendes Lungenödem sein. Flüssigkeit deshalb vorsichtig und unter Kontrolle geben. Weitere Maßnahmen: Monitoring, Zugang, 12-Kanal-EKG, Klinikeinweisung.' });
  S({ kind: 'case', title: 'Fall 3: In der Straßenbahn', text: 'Ein älterer Herr fasst sich immer wieder an die Brust, er ist aschfahl und schwitzt. Als Sie zu ihm gehen, sackt er zusammen und reagiert nicht mehr. Ein Mitfahrer wählt die 112. Der Mann atmet nicht normal. Sie beginnen mit der Wiederbelebung, Ihre Freundin hilft. Der Rettungsdienst leitet diesen Rhythmus ab.', fig: st('vf'),
    notes: 'Ersetzt die Gruppenarbeit 3. Zuerst fragen: Wie sehen die Wiederbelebungsmaßnahmen aus? Antwort: Herzdruckmassage in der Mitte des Brustkorbs, 100 bis 120/min, 5 bis 6 cm tief, 30 zu 2, alle zwei Minuten abwechseln, nach einem AED schicken. Brustschmerz, Blässe und Schweiß vor dem Kollaps sprechen für einen Herzinfarkt als Ursache.' });
  Q({ t: 'mc', q: 'Fall 3: Welcher Rhythmus ist das?', fig: st('vf'), opts: ['Asystolie', 'Ventrikuläre Tachykardie', 'Kammerflimmern', 'Vorhofflimmern'], correct: 2,
    why: 'Chaotische, unregelmäßige Wellen ohne abgrenzbare QRS-Komplexe: Kammerflimmern. Die Kammern zucken nur noch, es wird kein Blut ausgeworfen.', notes: 'Wahrscheinlichste Ursache hier: akuter Herzinfarkt. Das ist das T für Thrombose bei den behebbaren Ursachen.' });
  Q({ t: 'mc', q: 'Fall 3: Was ist jetzt die wichtigste Maßnahme?', opts: ['So schnell wie möglich defibrillieren, bis dahin und direkt danach weiterdrücken', 'Zuerst einen Zugang legen und Adrenalin geben', 'Zuerst ein 12-Kanal-EKG schreiben', 'Atropin geben'], correct: 0,
    why: 'Bei Kammerflimmern zählt jede Minute bis zum Schock. Die Herzdruckmassage wird nur für die Analyse und den Schock kurz unterbrochen. Adrenalin folgt erst nach dem 3. Schock.', notes: 'Nach erfolgreicher Reanimation: 12-Kanal-EKG, bei ST-Hebungen notfallmäßige Herzkatheteruntersuchung. Einordnung nach dem Raster: keine Atmung, kein Puls, schockbarer Rhythmus, Defibrillation.' });
  S({ kind: 'case', title: 'Fall 4: Im Aufwachraum', text: 'Sie betreuen einen herzkranken Patienten nach einer Wirbelsäulenoperation. Der Monitor alarmiert. Der Patient atmet spontan, ist ansprechbar, klagt über Schwindel und Herzrasen. Der Puls am Handgelenk ist extrem schnell. Zunehmend atmet er schwer.', fig: st('vt'),
    notes: 'Ersetzt die Gruppenarbeit 4. Sechs Fragen: Frequenz etwa 180/min, regelmäßig, keine P-Wellen erkennbar, QRS breit. Erste Handgriffe der ATA: Hilfe rufen, Anästhesist informieren, Sauerstoff geben, Blutdruck messen, Defibrillator holen. Nach der Ursache suchen, zum Beispiel Durchblutungsstörung des Herzens oder Kaliumstörung.' });
  Q({ t: 'mc', q: 'Fall 4: Welche Rhythmusstörung zeigt der Monitor?', fig: st('vt'), opts: ['Sinustachykardie', 'Vorhofflimmern', 'Ventrikuläre Tachykardie', 'Kammerflimmern'], correct: 2,
    why: 'Regelmäßige Tachykardie mit breiten QRS-Komplexen: ventrikuläre Tachykardie. Der Patient hat noch einen Puls.', notes: 'Abgrenzung zum Kammerflimmern: Bei der ventrikulären Tachykardie sehen alle Komplexe gleich aus und kommen regelmäßig.' });
  Q({ t: 'mc', q: 'Fall 4: Der Patient bekommt Luftnot, der Blutdruck fällt auf 80/50 mmHg. Was bereiten Sie vor?', opts: ['Atropin', 'Synchronisierte Kardioversion in Kurznarkose', 'Externen Schrittmacher', 'Nichts, weiter beobachten'], correct: 1,
    why: 'Luftnot und Blutdruckabfall bedeuten Instabilität. Eine instabile Tachykardie mit Puls wird synchronisiert kardiovertiert, beim wachen Patienten in Kurznarkose.', notes: 'Vorbereiten: Klebeelektroden, Defibrillator mit Sync-Funktion, Narkosemedikament nach Ansage, Beatmungsbeutel mit Maske, Absaugung, Amiodaron. Erster Schock bei ventrikulärer Tachykardie mit Puls: 120 bis 150 Joule.' });
  Q({ t: 'mc', q: 'Fall 4: Noch bevor es losgeht, wird der Patient bewusstlos. Sie tasten keinen Puls mehr, das EKG-Bild bleibt gleich. Und jetzt?', opts: ['Weiter die Kardioversion vorbereiten', 'Herzdruckmassage beginnen und unsynchronisiert defibrillieren', 'Adenosin geben', 'Abwarten, ob der Puls zurückkommt'], correct: 1,
    why: 'Pulslose ventrikuläre Tachykardie ist ein Kreislaufstillstand mit schockbarem Rhythmus: sofort drücken und defibrillieren, Notfallteam alarmieren.', notes: 'Kernaussage: Dasselbe EKG-Bild, aber eine völlig andere Behandlung. Entscheidend ist der Puls.' });

  SEC('Abschluss');
  S({ title: 'Warum Rhythmusstörungen im OP auftreten', table: { head: ['Narkoseführung', 'Vorerkrankung', 'Operation'], rows: [
      ['Narkosetiefe, Schmerz', 'Herzerkrankungen', 'Vagusreiz'], ['Beatmung', 'hormonelle Störungen', 'Druck auf die Karotis'],
      ['Katheteranlage', 'Hirndruck', ''], ['Körpertemperatur', 'Schock, Lungenembolie', ''], ['Medikamente', '', '']] },
    notes: 'Tabelle aus dem bisherigen Vortrag. Die meisten Rhythmusstörungen im OP haben eine behebbare Ursache. Deshalb lautet die erste Frage immer: Was hat sich gerade geändert? Und nicht vergessen: Artefakte sind häufiger als echte Rhythmusstörungen.' });
  S({ title: 'Ihre Aufgaben, wenn der Monitor alarmiert', numbered: [
      ['Patient ansehen und Puls tasten:', 'Artefakt oder echt?'],
      ['Laut ansagen,', 'was Sie sehen – Anästhesist und Operateur informieren'],
      ['Sauerstoff, Blutdruck, Pulsoxymetrie', 'prüfen'],
      ['Defibrillator und Notfallmedikamente', 'holen: Atropin, Adrenalin, Amiodaron'],
      ['12-Kanal-EKG', 'schreiben, sobald die Lage es erlaubt'],
      ['Zeiten und Medikamente', 'dokumentieren']],
    notes: 'Diese Folie ist die Antwort auf die Frage, was heute für den Alltag hängen bleiben soll. Betonen: Als ATA stellen Sie keine Diagnose und ordnen keine Medikamente an. Aber Sie sind oft die Ersten, die die Veränderung sehen, und Ihre Vorbereitung entscheidet darüber, wie schnell behandelt werden kann.' });
  S({ title: 'Das Wichtigste zum Mitnehmen', numbered: [
      ['Erst der Patient, dann der Monitor', ''],
      ['Kein Puls:', 'drücken, schockbare Rhythmen defibrillieren'],
      ['Puls und instabil:', 'zu schnell – Kardioversion, zu langsam – Atropin und Schrittmacher'],
      ['Puls und stabil:', 'Ursache suchen, Zeit für ein 12-Kanal-EKG'],
      ['Breiter QRS-Komplex und schnell:', 'an eine ventrikuläre Tachykardie denken und den Puls tasten']],
    fig: st('sinus'),
    notes: 'Zum Schluss fragen, welche Frage aus dem Quiz am schwierigsten war, und diese noch einmal gemeinsam durchgehen. Das Quiz bleibt über den QR-Code erreichbar und eignet sich zur Wiederholung vor der Prüfung.' });
  S({ title: 'Quellen', bullets: [
      ['Leitlinien des European Resuscitation Council 2025:', 'cprguidelines.eu, deutsche Fassung beim Deutschen Rat für Wiederbelebung, grc-org.de/wissenschaft/leitlinien'],
      ['Kurzfassung der ERC-Leitlinien 2025:', 'Notfall + Rettungsmedizin, doi.org/10.1007/s10049-025-01642-0'],
      ['AMBOSS:', 'Kapitel „EKG“ (Grundlagen, Normwerte, Elektroden, Lagetyp, ST-Strecke), amboss.com/de/wissen/ekg, abgerufen am 06.10.2026'],
      ['Bisherige Vorträge:', '„Herzrhythmusstörungen“ und „EKG, Herzrhythmusstörung und Schrittmacher“'],
      ['Abbildungen:', 'für diesen Vortrag gezeichnet, keine Originalregistrierungen']],
    notes: 'Therapieangaben und Dosierungen folgen den ERC-Leitlinien 2025. Gelesen wurden sie in der deutschsprachigen Zusammenfassung auf foamio.org/erc-2025, nicht im Volltext der Leitlinie. Vor dem Unterricht bitte einmal mit den Algorithmus-Postern des Deutschen Rats für Wiederbelebung und dem Hausstandard abgleichen. EKG-Grundlagen, Normwerte und Elektrodenpositionen stammen aus dem AMBOSS-Kapitel EKG. Anatomie, Physiologie und die OP-Bezüge stammen aus den beiden bisherigen Vorträgen. Die EKG-Streifen sind rechnerisch erzeugt und zeigen die typischen Merkmale in Reinform.' });

  let n = 0;
  D.forEach((o) => { if (o.t !== 'slide') o.n = ++n; });
  const skip = D.filter((o) => o.q && /koronarer Herzkrankheit|ST-Strecke stimmt|für ein 12-Kanal-EKG|Und welcher Lagetyp/.test(o.q)).map((o) => o.n).join(', ');
  D[0].notes = D[0].notes.replace('{SKIP}', skip);

  const API = { DECK: D, figSVG, strip, NAME, EL };
  if (typeof module !== 'undefined' && module.exports) module.exports = API; else root.EKG = API;
})(typeof window !== 'undefined' ? window : this);
