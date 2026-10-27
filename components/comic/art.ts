/* eslint-disable */
// @ts-nocheck
/** Scene and character drawing, ported from the comic prototype (svg.js). Returns SVG markup. */

/* ===== MediDeutsch comic art: flat inline SVG characters & scenes (no external assets) ===== */
export const ART = (() => {
  const INK = '#2b2f3a';
  const SK = { lena: '#f6cfa8', tom: '#eebf96', becker: '#efc29f', oa: '#f1c8a3', anna: '#f3c9a4', samir: '#e0b090', petra: '#f6d0b0' };
  const SKS = { lena: '#e8b98f', tom: '#dca97f', becker: '#dcab86', oa: '#dfb18a', anna: '#e3b58c', samir: '#c99574', petra: '#e4b892' };
  const ln = (d, c = INK, w = 3) => `<path d="${d}" fill="none" stroke="${c}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;
  const mirror = d => d; // helper placeholder (paths are written explicitly)

  function eyes(m) {
    const dot = (x, dy = 0, dx = 0) => `<ellipse cx="${x + dx}" cy="${-185 + dy}" rx="4.6" ry="5.6" fill="${INK}"/><circle cx="${x + dx + 1.6}" cy="${-187 + dy}" r="1.5" fill="#fff"/>`;
    if (m === 'relieved' || m === 'calm') return ln('M-23 -184 q7 -8 14 0') + ln('M9 -184 q7 -8 14 0');
    if (m === 'pain') return ln('M-23 -191 l10 6 l-10 6') + ln('M23 -191 l-10 6 l10 6');
    if (m === 'tired') return `<ellipse cx="-16" cy="-183" rx="4.6" ry="3.4" fill="${INK}"/><ellipse cx="16" cy="-183" rx="4.6" ry="3.4" fill="${INK}"/>` + ln('M-23 -186 h14', INK, 3) + ln('M9 -186 h14', INK, 3) + ln('M-22 -175 q6 3 12 0', '#c08a6a', 2) + ln('M10 -175 q6 3 12 0', '#c08a6a', 2);
    if (m === 'think') return dot(-16, -2, 2) + dot(16, -2, 2);
    return dot(-16) + dot(16);
  }
  function brows(m, c = INK, w = 3.2) {
    if (m === 'serious') return ln('M-25 -205 l15 5', c, w) + ln('M25 -205 l-15 5', c, w);
    if (m === 'worried' || m === 'pain' || m === 'sad') return ln('M-25 -199 l15 -6', c, w) + ln('M25 -199 l-15 -6', c, w);
    if (m === 'think') return ln('M-25 -201 q8 -4 15 0', c, w) + ln('M10 -207 q8 -5 15 0', c, w);
    if (m === 'tired') return ln('M-25 -200 q8 -2 15 1', c, w) + ln('M10 -199 q8 -3 15 -1', c, w);
    return ln('M-25 -202 q8 -5 15 0', c, w) + ln('M10 -202 q8 -5 15 0', c, w);
  }
  function mouth(m) {
    switch (m) {
      case 'smile': return ln('M-12 -165 q12 12 24 0');
      case 'relieved': return `<path d="M-13 -166 q13 17 26 0 z" fill="#9f1239"/><path d="M-9 -165 h18 l-2 4 h-14z" fill="#fff"/>`;
      case 'talk': return `<path d="M-11 -167 q11 16 22 0 q-11 -4 -22 0z" fill="#7f1d1d"/><path d="M-5 -158 q5 -4 10 0" fill="#f472b6"/>`;
      case 'tired': return ln('M-7 -161 q7 -3 14 0');
      case 'think': return ln('M-8 -161 q9 -4 16 2');
      case 'serious': return ln('M-10 -161 h20', INK, 3.4);
      case 'pain': return ln('M-14 -160 q3.5 -6 7 0 q3.5 6 7 0 q3.5 -6 7 0 q3.5 6 7 0', INK, 3);
      case 'worried': return `<ellipse cx="0" cy="-160" rx="5.5" ry="4.5" fill="#7f1d1d"/>`;
      case 'calm': return ln('M-10 -164 q10 9 20 0');
      case 'sad': return ln('M-10 -157 q10 -8 20 0');
      default: return ln('M-9 -162 h18');
    }
  }
  const cheeks = m => /smile|relieved|calm|talk/.test(m) ? `<ellipse cx="-27" cy="-170" rx="7" ry="4" fill="#f87171" opacity=".25"/><ellipse cx="27" cy="-170" rx="7" ry="4" fill="#f87171" opacity=".25"/>` : '';
  const sweat = m => m === 'pain' ? `<path d="M38 -222 q7 10 0 14 q-7 -4 0 -14z" fill="#7dd3fc" stroke="#0ea5e9" stroke-width="1.5"/>` : '';
  const torso = (fill, stroke) => `<path d="M-86 2 C-86 -70 -72 -114 -40 -122 L40 -122 C72 -114 86 -70 86 2 Z" fill="${fill}" stroke="${stroke}" stroke-width="2.5"/>`;
  const headBase = c => `<rect x="-14" y="-146" width="28" height="30" rx="8" fill="${SKS[c]}"/>
    <circle cx="-42" cy="-181" r="8.5" fill="${SKS[c]}"/><circle cx="42" cy="-181" r="8.5" fill="${SKS[c]}"/>
    <ellipse cx="0" cy="-185" rx="42" ry="46" fill="${SK[c]}"/>`;
  const nose = c => ln('M-1 -180 q5 8 -2 10', SKS[c], 3);
  const face = (c, m, browC, browW) => eyes(m) + brows(m, browC, browW) + nose(c) + mouth(m) + cheeks(m) + sweat(m);
  const badge = (x, y, t, bg) => `<g transform="translate(${x} ${y})"><rect x="-22" y="-8" width="44" height="16" rx="4" fill="#fff" stroke="${bg}" stroke-width="2"/><rect x="-22" y="-8" width="8" height="16" rx="3" fill="${bg}"/><text x="4" y="4" font-size="8" font-weight="700" text-anchor="middle" fill="#1e293b" font-family="Inter,Arial,sans-serif">${t}</text></g>`;

  function props(prop, c, sleeve, sleeveStroke) {
    const hand = (x, y, r = 12) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${SK[c]}" stroke="${SKS[c]}" stroke-width="2"/>`;
    const arm = d => `<path d="${d}" fill="none" stroke="${sleeveStroke}" stroke-width="27" stroke-linecap="round"/><path d="${d}" fill="none" stroke="${sleeve}" stroke-width="22" stroke-linecap="round"/>`;
    if (prop === 'coffee') return arm('M-74 -18 Q-44 -46 -4 -52') + hand(2, -54) +
      `<g><rect x="-12" y="-96" width="34" height="40" rx="6" fill="#fff" stroke="#94a3b8" stroke-width="2.5"/><path d="M22 -86 q12 0 12 10 q0 10 -12 10" fill="none" stroke="#94a3b8" stroke-width="4"/><rect x="-12" y="-84" width="34" height="9" fill="#14b8a6"/>
      ${ln('M-2 -104 q-5 -7 0 -14 q5 -7 0 -14', '#94a3b8', 2.5)}${ln('M10 -104 q-5 -7 0 -14 q5 -7 0 -14', '#94a3b8', 2.5)}</g>` + hand(-10, -64, 10);
    if (prop === 'clipboard') return `<g transform="rotate(-10 -40 -70)"><rect x="-80" y="-120" width="70" height="92" rx="6" fill="#b7791f" stroke="#92400e" stroke-width="2"/><rect x="-74" y="-108" width="58" height="74" rx="3" fill="#fff"/>
      <rect x="-56" y="-126" width="22" height="12" rx="3" fill="#94a3b8"/>${[-96, -86, -76, -66, -56, -46].map((y, i) => ln(`M-68 ${y} h${i % 2 ? 36 : 46}`, '#93c5fd', 2.5)).join('')}<text x="-66" y="-36" font-size="8" fill="#e11d48" font-weight="700" font-family="Inter,Arial,sans-serif">Zi. 12</text></g>` + arm('M-84 -6 Q-60 -26 -24 -34') + hand(-20, -36);
    if (prop === 'phone') return arm('M62 -108 Q86 -150 48 -170') + `<rect x="33" y="-214" width="16" height="50" rx="5" fill="#334155" transform="rotate(-12 41 -189)"/>` + hand(44, -172, 13);
    if (prop === 'chest') return arm('M-84 -12 Q-60 -54 -12 -76') + hand(-6, -78, 14) + ln('M-10 -88 l10 4 M-12 -80 l12 3 M-12 -71 l11 1', SKS[c], 2);
    if (prop === 'stetho') return arm('M64 -104 Q46 -58 -4 -64') + `<path d="M-22 -66 Q-46 -96 -26 -124" fill="none" stroke="#0f766e" stroke-width="4"/>` + hand(-6, -64) + `<circle cx="-24" cy="-64" r="10" fill="#cbd5e1" stroke="#0f766e" stroke-width="4"/>`;
    if (prop === 'cables') return arm('M-74 -18 Q-44 -46 -4 -52') + ['#e11d48', '#facc15', '#16a34a', '#111827'].map((c, i) => `<path d="M2 -54 q${-14 + i * 10} 26 ${-20 + i * 12} 40" fill="none" stroke="${c}" stroke-width="3"/><circle cx="${-18 + i * 12}" cy="-14" r="5" fill="#fff" stroke="${c}" stroke-width="3"/>`).join('') + hand(2, -54);
    if (prop === 'tourniquet') return arm('M-74 -18 Q-44 -46 -4 -52') + `<rect x="4" y="-74" width="20" height="10" rx="3" fill="#16a34a"/><rect x="8" y="-82" width="12" height="9" rx="2" fill="#bbf7d0" stroke="#16a34a"/>${ln('M24 -69 h22', '#94a3b8', 2)}` + hand(2, -58);
    if (prop === 'jacket') return `<path d="M-86 2 C-86 -70 -72 -114 -40 -122 L-20 -122 L-12 2 Z" fill="#475569" stroke="#334155" stroke-width="2.5"/><path d="M86 2 C86 -70 72 -114 40 -122 L20 -122 L12 2 Z" fill="#475569" stroke="#334155" stroke-width="2.5"/>
      <path d="M-40 -122 L-20 -122 L-24 -96 Z M40 -122 L20 -122 L24 -96 Z" fill="#64748b"/>${ln('M-62 -116 L-56 2', '#f97316', 11)}`;
    if (prop === 'probe') return arm('M64 -20 Q90 -70 70 -110') + hand(68, -112, 13) +
      `<g transform="rotate(-20 70 -130)"><rect x="58" y="-168" width="22" height="46" rx="8" fill="#0f766e" stroke="#115e59" stroke-width="2"/><rect x="62" y="-128" width="14" height="18" rx="3" fill="#99f6e4"/><path d="M64 -110 q8 16 0 28" fill="none" stroke="#0f766e" stroke-width="4"/></g>`;
    return '';
  }

  function lena(m, prop) {
    return `<ellipse cx="0" cy="-192" rx="47" ry="50" fill="#6b3f25"/><circle cx="0" cy="-240" r="21" fill="#6b3f25"/><path d="M-10 -230 q10 -8 20 0" stroke="#4a2a17" stroke-width="3" fill="none"/>
      ${torso('#ffffff', '#cbd5e1')}
      <path d="M-22 -122 L0 -66 L22 -122Z" fill="#0d9488"/>
      <path d="M-22 -122 L0 -66 L-12 -30 L-40 -112Z" fill="#fff" stroke="#cbd5e1" stroke-width="2"/><path d="M22 -122 L0 -66 L12 -30 L40 -112Z" fill="#fff" stroke="#cbd5e1" stroke-width="2"/>
      <rect x="-70" y="-58" width="30" height="34" rx="4" fill="#fff" stroke="#cbd5e1" stroke-width="2"/><rect x="-62" y="-70" width="4" height="16" rx="1" fill="#2563eb"/><rect x="-54" y="-68" width="4" height="14" rx="1" fill="#e11d48"/>
      ${badge(52, -78, 'Dr. Weber', '#0d9488')}
      ${headBase('lena')}
      <path d="M-44 -186 C-46 -238 46 -240 45 -190 C34 -214 6 -224 -14 -210 C-26 -202 -36 -194 -44 -186Z" fill="#7c4a2d"/><path d="M-45 -188 Q-50 -166 -42 -150 L-38 -176Z M45 -190 Q50 -166 42 -150 L38 -176Z" fill="#7c4a2d"/>
      ${face('lena', m, '#4a2a17', 3.4)}
      <circle cx="-16" cy="-185" r="12" fill="#fff" fill-opacity=".22" stroke="#334155" stroke-width="2.6"/><circle cx="16" cy="-185" r="12" fill="#fff" fill-opacity=".22" stroke="#334155" stroke-width="2.6"/>${ln('M-4 -186 q4 -3 8 0', '#334155', 2.6)}
      <path d="M-28 -124 C-34 -84 -14 -64 0 -64 C14 -64 34 -84 28 -124" fill="none" stroke="#0f766e" stroke-width="5" stroke-linecap="round"/>${ln('M0 -64 L0 -38', '#0f766e', 5)}<circle cx="0" cy="-30" r="9" fill="#cbd5e1" stroke="#0f766e" stroke-width="4"/>
      ${props(prop, 'lena', '#ffffff', '#cbd5e1')}`;
  }
  function tom(m, prop) {
    return `${torso('#60a5fa', '#3b82f6')}
      <path d="M-22 -122 L0 -90 L22 -122Z" fill="${SKS.tom}"/>${ln('M-22 -122 L0 -90 L22 -122', '#2563eb', 4)}
      <rect x="30" y="-96" width="30" height="30" rx="3" fill="#3b82f6" opacity=".55"/><rect x="38" y="-108" width="4" height="18" rx="1" fill="#0f2a3d"/>
      ${badge(-46, -84, 'Tom · Pflege', '#2563eb')}
      ${headBase('tom')}
      <path d="M-45 -184 L-48 -212 L-34 -206 L-32 -232 L-18 -216 L-8 -242 L4 -220 L18 -240 L22 -216 L38 -228 L36 -206 L48 -200 L45 -184 C34 -212 -32 -212 -45 -184Z" fill="#eab949" stroke="#c9952a" stroke-width="2.5" stroke-linejoin="round"/>
      ${face('tom', m, '#a87a1e', 3.6)}
      ${props(prop, 'tom', '#60a5fa', '#3b82f6')}`;
  }
  function becker(m, prop, uid) {
    return `<rect x="-128" y="-236" width="256" height="240" rx="18" fill="#cbd5e1"/><rect x="-118" y="-226" width="236" height="230" rx="12" fill="#e2e8f0"/>
      <ellipse cx="0" cy="-138" rx="104" ry="48" fill="#fff" stroke="#e2e8f0" stroke-width="3"/>
      <defs><pattern id="${uid}gd" width="16" height="16" patternUnits="userSpaceOnUse"><rect width="16" height="16" fill="#bfdbfe"/><circle cx="4" cy="4" r="2" fill="#93c5fd"/><circle cx="12" cy="12" r="2" fill="#93c5fd"/></pattern></defs>
      ${torso(`url(#${uid}gd)`, '#93c5fd')}
      <path d="M-24 -122 Q0 -100 24 -122" fill="${SKS.becker}" stroke="#93c5fd" stroke-width="3"/>
      ${headBase('becker')}
      <path d="M-44 -194 C-50 -168 -44 -150 -36 -150 L-34 -192Z M44 -194 C50 -168 44 -150 36 -150 L34 -192Z" fill="#c7ccd3"/><path d="M-36 -206 C-30 -228 30 -228 36 -206 C24 -220 -24 -220 -36 -206Z" fill="#d6dbe1"/>
      ${ln('M-14 -214 h28 M-10 -207 h20', '#d9a481', 2)}
      ${face('becker', m, '#9ca3af', 5)}
      <path d="M-18 -170 q18 -10 36 0 q-18 7 -36 0z" fill="#cfd4da"/>
      ${props(prop, 'becker', `url(#${uid}gd)`, '#93c5fd')}
      <path d="M-134 4 L-134 -46 Q0 -64 134 -46 L134 4Z" fill="#e0f2fe" stroke="#bae6fd" stroke-width="3"/><path d="M-134 -46 Q0 -64 134 -46 L134 -34 Q0 -52 -134 -34Z" fill="#fff"/>${ln('M-80 -20 q20 -6 40 0 M30 -14 q22 -6 46 0', '#bae6fd', 3)}`;
  }
  function anna(m, prop) {
    return `<path d="M-50 -188 C-58 -246 58 -246 50 -188 L56 -128 Q40 -118 28 -132 L-28 -132 Q-40 -118 -56 -128Z" fill="#3b2417"/>
      ${torso('#e8a33d', '#c9852a')}<path d="M-26 -122 L0 -76 L26 -122Z" fill="#fff7ed"/>${ln('M-26 -122 L-6 -40 M26 -122 L6 -40', '#c9852a', 3)}
      <circle cx="-4" cy="-66" r="3" fill="#c9852a"/><circle cx="-2" cy="-44" r="3" fill="#c9852a"/>
      ${headBase('anna')}
      <path d="M-45 -186 C-44 -236 44 -238 47 -190 C34 -206 12 -214 -8 -214 C-22 -208 -34 -198 -45 -186Z" fill="#4a2e1d"/>
      <circle cx="-42" cy="-166" r="3.5" fill="#fbbf24"/><circle cx="42" cy="-166" r="3.5" fill="#fbbf24"/>
      ${face('anna', m, '#3b2417', 3.2)}${props(prop, 'anna', '#e8a33d', '#c9852a')}`;
  }
  function samir(m, prop) {
    return `${torso('#ffffff', '#cbd5e1')}
      <path d="M-22 -122 L0 -66 L22 -122Z" fill="#1d4ed8"/>
      <path d="M-22 -122 L0 -66 L-12 -30 L-40 -112Z" fill="#fff" stroke="#cbd5e1" stroke-width="2"/><path d="M22 -122 L0 -66 L12 -30 L40 -112Z" fill="#fff" stroke="#cbd5e1" stroke-width="2"/>
      ${badge(52, -78, 'Dr. Haddad', '#1d4ed8')}
      ${headBase('samir')}
      <path d="M-46 -196 C-42 -238 46 -238 46 -196 C28 -218 -28 -218 -46 -196Z" fill="#1c1917"/>
      <path d="M-18 -214 h36" stroke="#1c1917" stroke-width="6" stroke-linecap="round"/>
      ${face('samir', m, '#1c1917', 3.4)}
      ${props(prop, 'samir', '#ffffff', '#cbd5e1')}`;
  }
  function petra(m, prop) {
    return `<path d="M-50 -188 C-56 -246 56 -246 50 -188 L54 -128 Q38 -116 26 -130 L-26 -130 Q-38 -116 -54 -128Z" fill="#7c2d12"/>
      ${torso('#fb7185', '#e11d48')}
      <path d="M-24 -122 L0 -78 L24 -122Z" fill="#fff1f2"/>
      ${headBase('petra')}
      <path d="M-46 -186 C-44 -238 46 -240 48 -188 C34 -210 8 -218 -10 -214 C-28 -206 -38 -196 -46 -186Z" fill="#9a3412"/>
      ${face('petra', m, '#7c2d12', 3.2)}
      ${props(prop, 'petra', '#fb7185', '#e11d48')}`;
  }
  function ines(m, prop) {
    return lena(m, prop).replace('Dr. Weber', 'Dr. Vogt');
  }
  function oa(m) {
    return `${torso('#ffffff', '#cbd5e1')}<path d="M-22 -122 L0 -70 L22 -122Z" fill="#bfdbfe"/><path d="M-5 -116 h10 l4 40 l-9 10 l-9 -10z" fill="#7c3aed"/>
      <path d="M-22 -122 L0 -70 L-12 -30 L-40 -112Z M22 -122 L0 -70 L12 -30 L40 -112Z" fill="#fff" stroke="#cbd5e1" stroke-width="2"/>
      ${headBase('oa')}<path d="M-44 -190 C-48 -234 46 -236 44 -190 C38 -210 20 -214 0 -214 C-20 -214 -38 -208 -44 -190Z" fill="#6b7280"/>
      ${face('oa', m, '#4b5563', 3.4)}<rect x="-29" y="-195" width="24" height="18" rx="4" fill="#fff" fill-opacity=".2" stroke="#1f2937" stroke-width="2.6"/><rect x="5" y="-195" width="24" height="18" rx="4" fill="#fff" fill-opacity=".2" stroke="#1f2937" stroke-width="2.6"/>${ln('M-5 -188 h10', '#1f2937', 2.6)}`;
  }
  function character(c, m = 'neutral', prop, uid = 'x', x = 0, y = 340, s = 1) {
    const body = c === 'lena' ? lena(m, prop) : c === 'tom' ? tom(m, prop) : c === 'becker' ? becker(m, prop, uid + c) : c === 'anna' ? anna(m, prop) : c === 'samir' ? samir(m, prop) : c === 'petra' ? petra(m, prop) : c === 'ines' ? ines(m, prop) : oa(m);
    return `<g transform="translate(${x} ${y}) scale(${s})">${body}</g>`;
  }

  function clock(cx, cy, r, t) {
    const [h, mi] = (t || '7:00').split(':').map(Number);
    const ma = mi / 60 * 360, ha = ((h % 12) + mi / 60) / 12 * 360;
    const hand = (a, len, w, col) => `<line x1="${cx}" y1="${cy}" x2="${cx + len * Math.sin(a * Math.PI / 180)}" y2="${cy - len * Math.cos(a * Math.PI / 180)}" stroke="${col}" stroke-width="${w}" stroke-linecap="round"/>`;
    const ticks = [...Array(12)].map((_, i) => { const a = i * 30 * Math.PI / 180; return `<line x1="${cx + (r - 4) * Math.sin(a)}" y1="${cy - (r - 4) * Math.cos(a)}" x2="${cx + (r - 9) * Math.sin(a)}" y2="${cy - (r - 9) * Math.cos(a)}" stroke="#64748b" stroke-width="2"/>`; }).join('');
    return `<circle cx="${cx}" cy="${cy}" r="${r + 4}" fill="#334155"/><circle cx="${cx}" cy="${cy}" r="${r}" fill="#fff"/>${ticks}${hand(ha, r * .5, 4, '#0f2a3d')}${hand(ma, r * .78, 2.5, '#0f2a3d')}<circle cx="${cx}" cy="${cy}" r="3" fill="#e11d48"/>`;
  }
  const T = (x, y, s, txt, o = '') => `<text x="${x}" y="${y}" font-size="${s}" font-family="Inter,Arial,sans-serif" ${o}>${txt}</text>`;

  function station(u, p) {
    const [hh, mm] = (p.clock || '6:45').split(':').map(Number), late = hh * 60 + mm >= 440, done = hh * 60 + mm >= 510;
    return `<defs><linearGradient id="${u}w" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#eaf6f8"/><stop offset="1" stop-color="#d5ebf0"/></linearGradient>
      <linearGradient id="${u}s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${late ? '#7dd3fc' : '#93c5fd'}"/><stop offset=".55" stop-color="${late ? '#bae6fd' : '#fbcfe8'}"/><stop offset="1" stop-color="#fde68a"/></linearGradient></defs>
      <rect width="720" height="340" fill="url(#${u}w)"/>
      <rect x="36" y="30" width="178" height="158" rx="8" fill="#fff" stroke="#cbd5e1" stroke-width="2"/><rect x="45" y="39" width="160" height="140" fill="url(#${u}s)"/>
      <circle cx="160" cy="${late ? 105 : 150}" r="18" fill="#fdba74"/>
      <path d="M45 179 V146 h22 v-20 h18 v28 h20 v-36 h22 v44 h18 v-24 h26 v14 h18 v-12 h16 V179Z" fill="#7aa3c9" opacity=".75"/>
      <rect x="122" y="39" width="6" height="140" fill="#fff"/><rect x="45" y="106" width="160" height="6" fill="#fff"/>
      ${clock(664, 70, 30, p.clock)}
      <rect x="618" y="160" width="96" height="7" rx="2" fill="#94a3b8"/>${['#0d9488', '#2563eb', '#f59e0b', '#e11d48'].map((c, i) => `<rect x="${628 + i * 20}" y="${120 + (i % 2) * 4}" width="16" height="${40 - (i % 2) * 4}" rx="2" fill="${c}"/><rect x="${631 + i * 20}" y="${130 + (i % 2) * 4}" width="10" height="5" fill="#fff" opacity=".8"/>`).join('')}
      <rect x="282" y="28" width="164" height="150" rx="6" fill="#fff" stroke="#94a3b8" stroke-width="4"/>
      ${T(294, 52, 15, 'Station 4B', 'font-weight="800" fill="#0f766e"')}
      ${T(294, 78, 13, 'Zi. 10  Schulz', 'fill="#334155"')}${T(294, 100, 13, 'Zi. 11  Yilmaz', 'fill="#334155"')}
      ${T(294, 122, 13, 'Zi. 12  Becker', 'fill="#334155" font-weight="700"')}${done ? T(392, 122, 13, '→ CPU', 'fill="#15803d" font-weight="800"') + ln('M294 117 h92', '#64748b', 2) : T(397, 122, 13, 'NEU!', 'fill="#e11d48" font-weight="800"') + ln('M294 128 h140', '#e11d48', 2)}${T(294, 150, 13, 'Zi. 14  Neumann', 'fill="#334155"')}${ln('M300 172 h60', '#cbd5e1', 5)}
      <rect x="0" y="282" width="720" height="58" fill="#c3d5de"/><rect x="0" y="278" width="720" height="8" fill="#a9c0cc"/>`;
  }
  function room(u) {
    return `<defs><linearGradient id="${u}w" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f0f8f3"/><stop offset="1" stop-color="#dcefe6"/></linearGradient></defs>
      <rect width="720" height="340" fill="url(#${u}w)"/>
      <rect x="520" y="26" width="170" height="150" rx="8" fill="#fff" stroke="#cbd5e1" stroke-width="2"/><rect x="529" y="35" width="152" height="132" fill="#bfe3fb"/>
      <circle cx="580" cy="150" r="34" fill="#86efac"/><circle cx="640" cy="160" r="28" fill="#4ade80"/><rect x="604" y="35" width="6" height="132" fill="#fff"/>
      ${ln('M500 22 H710', '#94a3b8', 4)}<path d="M500 24 h34 q-6 60 4 150 h-38z" fill="#99f6e4" opacity=".7"/>${ln('M512 30 v140 M524 30 v140', '#5eead4', 2)}
      <rect x="292" y="34" width="140" height="84" rx="10" fill="#1f2937"/><rect x="300" y="42" width="124" height="68" rx="4" fill="#0b1220"/>
      <path d="M304 70 h14 l4 -8 l4 8 h6 l4 -22 l5 34 l4 -12 h14 l4 -8 l4 8 h6 l4 -22 l5 34 l4 -12 h14 l4 -8 l4 8 h6 l4 -22 l4 18" fill="none" stroke="#22c55e" stroke-width="2"/>
      <path d="M304 98 q8 -10 16 0 t16 0 t16 0 t16 0 t16 0 t16 0 t16 0" fill="none" stroke="#38bdf8" stroke-width="2"/>${ln('M362 118 v30', '#64748b', 5)}
      <rect x="0" y="178" width="720" height="14" fill="#cbd5e1"/><circle cx="452" cy="185" r="5" fill="#22c55e"/><circle cx="472" cy="185" r="5" fill="#3b82f6"/><circle cx="430" cy="185" r="5" fill="#f8fafc" stroke="#94a3b8"/>
      ${ln('M40 30 V340', '#94a3b8', 5)}${ln('M22 34 H58', '#94a3b8', 4)}<rect x="24" y="40" width="30" height="46" rx="8" fill="#e0f2fe" stroke="#7dd3fc" stroke-width="2"/>${T(30, 66, 9, 'NaCl', 'fill="#0369a1" font-weight="700"')}${ln('M39 86 q0 60 30 90', '#7dd3fc', 2)}`;
  }
  function monitor(u, p) {
    const v = p.vitals || { time: '05:30', hf: '96', spo2: '94', rr: '150/90', temp: '36,8' };
    const ecg = [...Array(5)].map((_, i) => { const x = 96 + i * 66; return `h18 l4 -6 l4 6 h6 l4 -30 l6 44 l4 -14 h10 q6 -10 12 0`; }).join(' ');
    return `<rect width="720" height="340" fill="#1e293b"/><rect x="56" y="16" width="608" height="308" rx="20" fill="#0f172a" stroke="#334155" stroke-width="6"/>
      <rect x="76" y="36" width="568" height="268" rx="6" fill="#020617"/>
      ${T(92, 58, 13, 'Zi. 12 · Becker · 67 J.', 'fill="#94a3b8" font-weight="600"')}${T(628, 58, 13, v.time, 'fill="#94a3b8" text-anchor="end" font-weight="700"')}
      <path d="M92 120 ${ecg}" fill="none" stroke="#22c55e" stroke-width="2.5"/>
      <path d="M92 190 q14 -26 28 0 t28 0 t28 0 t28 0 t28 0 t28 0 t28 0 t28 0 t28 0 t28 0 t28 0 t28 0" fill="none" stroke="#38bdf8" stroke-width="2.5"/>
      ${ln('M440 72 V290', '#1e293b', 2)}
      ${T(460, 84, 14, 'HF /min', 'fill="#22c55e" font-weight="700"')}${T(626, 124, 46, v.hf, 'fill="#22c55e" text-anchor="end" font-weight="800"')}
      ${T(460, 160, 14, 'SpO₂ %', 'fill="#38bdf8" font-weight="700"')}${T(626, 200, 46, v.spo2, 'fill="#38bdf8" text-anchor="end" font-weight="800"')}
      ${ln('M92 228 H626', '#1e293b', 2)}
      ${T(96, 252, 14, v.rr2 ? 'RR li mmHg' : 'RR mmHg (NIBP)', 'fill="#f87171" font-weight="700"')}${T(96, 292, 38, v.rr, 'fill="#f87171" font-weight="800"')}${v.rr2 ? T(222, 252, 13, v.rr2, 'fill="#fca5a5" font-weight="700"') : ''}
      ${T(300, 252, 14, 'Temp °C', 'fill="#facc15" font-weight="700"')}${T(300, 292, 38, v.temp, 'fill="#facc15" font-weight="800"')}
      ${T(460, 252, 14, 'Sauerstoff', 'fill="#94a3b8" font-weight="700"')}${T(460, 288, 18, 'Raumluft', 'fill="#e2e8f0" font-weight="700"')}`;
  }
  function ekg(u) {
    const beat = 'h22 q6 -8 12 0 h8 l4 6 l6 -58 l7 66 l5 -14 h16 q12 22 24 0 h24';
    const rows = ['V2', 'V3', 'V4'].map((l, i) => { const y = 100 + i * 78; return `${T(60, y - 22, 15, l, 'fill="#9f1239" font-weight="800"')}<path d="M60 ${y} ${beat} ${beat} ${beat} ${beat} h20" fill="none" stroke="#111827" stroke-width="2.4" stroke-linejoin="round"/>`; }).join('');
    return `<defs><pattern id="${u}g" width="40" height="40" patternUnits="userSpaceOnUse"><rect width="40" height="40" fill="#fff1f2"/><path d="M8 0V40M16 0V40M24 0V40M32 0V40M0 8H40M0 16H40M0 24H40M0 32H40" stroke="#fecdd3" stroke-width="1"/><path d="M0 0H40V40" fill="none" stroke="#fda4af" stroke-width="1.6"/></pattern></defs>
      <rect width="720" height="340" fill="#cbd5e1"/><g transform="rotate(-1.2 360 170)"><rect x="34" y="20" width="652" height="300" rx="4" fill="url(#${u}g)" stroke="#e2e8f0" stroke-width="3"/>
      ${T(666, 306, 11, '25 mm/s · 10 mm/mV', 'fill="#9f1239" text-anchor="end"')}${rows}
      <ellipse cx="280" cy="187" rx="24" ry="18" fill="none" stroke="#e11d48" stroke-width="3" stroke-dasharray="6 4"/>${ln('M300 174 L330 152', '#e11d48', 2.5)}
      <rect x="326" y="132" width="150" height="26" rx="6" fill="#fff" stroke="#e11d48" stroke-width="2"/>${T(401, 150, 15, 'T negativ – neu!', 'text-anchor="middle" fill="#e11d48" font-weight="800"')}</g>`;
  }
  function meds(u) {
    return `<rect width="720" height="340" fill="#eaf3f6"/><rect x="0" y="196" width="720" height="144" fill="#dfe8ee"/><rect x="0" y="192" width="720" height="8" fill="#c3d5de"/>
      <rect x="76" y="214" width="440" height="108" rx="22" fill="#e2e8f0" stroke="#cbd5e1" stroke-width="3"/>
      <g><rect x="110" y="120" width="56" height="112" rx="10" fill="#fff" stroke="#94a3b8" stroke-width="3"/><rect x="118" y="106" width="40" height="18" rx="4" fill="#2563eb"/><rect x="110" y="152" width="56" height="48" fill="#e0f2fe"/>
      ${T(138, 172, 15, 'ASS', 'text-anchor="middle" font-weight="800" fill="#1d4ed8"')}${T(138, 190, 10, '500 mg i.v.', 'text-anchor="middle" fill="#1e3a8a"')}</g>
      <g><rect x="190" y="272" width="170" height="26" rx="6" fill="#fff" stroke="#94a3b8" stroke-width="2.5"/><rect x="194" y="276" width="96" height="18" rx="3" fill="#e0f2fe"/>${[0, 1, 2, 3, 4, 5, 6].map(i => ln(`M${206 + i * 20} 272 v8`, '#94a3b8', 1.5)).join('')}
      <rect x="360" y="278" width="40" height="14" rx="3" fill="#cbd5e1"/><rect x="398" y="268" width="8" height="34" rx="2" fill="#94a3b8"/>${ln('M190 285 H146', '#64748b', 2)}<rect x="214" y="254" width="96" height="18" rx="3" fill="#fef3c7" stroke="#f59e0b"/>${T(262, 267, 11, 'ASS 250 mg', 'text-anchor="middle" font-weight="700" fill="#92400e"')}</g>
      <g><rect x="410" y="104" width="62" height="134" rx="14" fill="#dc2626"/><rect x="420" y="80" width="42" height="30" rx="6" fill="#f1f5f9" stroke="#94a3b8" stroke-width="2"/><rect x="434" y="64" width="14" height="20" rx="3" fill="#cbd5e1"/><rect x="410" y="142" width="62" height="56" fill="#fff"/>
      ${T(441, 166, 15, 'Nitro', 'text-anchor="middle" font-weight="800" fill="#b91c1c"')}${T(441, 186, 9, 'Spray 0,4 mg', 'text-anchor="middle" fill="#7f1d1d"')}</g>
      <g><path d="M210 172 q-6 -40 12 -50 q18 10 12 50z" fill="#fff" fill-opacity=".85" stroke="#94a3b8" stroke-width="2"/><rect x="211" y="172" width="22" height="42" rx="5" fill="#fff" stroke="#94a3b8" stroke-width="2"/>${T(222, 198, 7, 'Morphin', 'text-anchor="middle" fill="#334155" font-weight="700"')}</g>
      <g transform="rotate(4 620 110)"><rect x="556" y="40" width="140" height="124" fill="#fecaca" stroke="#fca5a5"/><rect x="556" y="40" width="140" height="14" fill="#fca5a5"/>
      ${T(626, 92, 18, 'Allergie:', 'text-anchor="middle" fill="#b91c1c" font-weight="800"')}${T(626, 120, 20, 'Penicillin!', 'text-anchor="middle" fill="#b91c1c" font-weight="800"')}${T(626, 146, 12, 'Zi. 12 · Becker', 'text-anchor="middle" fill="#7f1d1d"')}</g>`;
  }
  function sbarCard(active) {
    const rows = [['S', 'Situation'], ['B', 'Hintergrund'], ['A', 'Einschätzung'], ['R', 'Empfehlung']];
    return `<g transform="rotate(-2 460 205)"><rect x="372" y="118" width="178" height="168" rx="10" fill="#fff" stroke="#94a3b8" stroke-width="3"/><rect x="372" y="118" width="178" height="26" rx="10" fill="#0f2a3d"/>${T(461, 136, 13, 'SBAR · Telefonat', 'text-anchor="middle" fill="#fff" font-weight="800"')}
      ${rows.map(([k, w], i) => { const on = k === active, y = 152 + i * 32; return `<rect x="380" y="${y}" width="162" height="27" rx="7" fill="${on ? '#0d9488' : '#f1f5f9'}"/><text x="392" y="${y + 19}" font-size="16" font-weight="900" font-family="Inter,Arial,sans-serif" fill="${on ? '#fff' : '#94a3b8'}">${k}</text>${T(414, y + 18, 13, w, `font-weight="${on ? 800 : 600}" fill="${on ? '#fff' : '#64748b'}"`)}`; }).join('')}</g>`;
  }
  function phone(u, p) {
    return `<defs><linearGradient id="${u}w" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#eaf6f8"/><stop offset="1" stop-color="#d5ebf0"/></linearGradient><clipPath id="${u}c"><circle cx="608" cy="112" r="78"/></clipPath></defs>
      <rect width="720" height="340" fill="url(#${u}w)"/>
      ${p.sbar ? sbarCard(p.sbar) : `      <rect x="370" y="150" width="170" height="112" rx="8" fill="#1f2937"/><rect x="378" y="158" width="154" height="92" rx="3" fill="#f8fafc"/>${ln('M445 262 v18 M420 282 h50', '#475569', 6)}
      ${T(386, 176, 11, 'EKG-Befund', 'font-weight="800" fill="#0f766e"')}${ln('M386 188 h80 M386 198 h120 M386 208 h100', '#cbd5e1', 3)}
      <path d="M386 232 h14 l3 -14 l4 22 l3 -8 h8 q5 9 10 0 h14 l3 -14 l4 22 l3 -8 h8 q5 9 10 0 h14 l3 -14 l4 22 l3 -8 h8 q5 9 10 0 h8" fill="none" stroke="#e11d48" stroke-width="1.8"/>`}
      <rect x="0" y="282" width="720" height="58" fill="#c3d5de"/><rect x="0" y="278" width="720" height="8" fill="#a9c0cc"/><rect x="560" y="268" width="90" height="12" rx="3" fill="#475569"/>
      ${ln('M330 110 q12 12 0 24 M342 100 q22 22 0 44', '#0d9488', 3.5)}
      <circle cx="608" cy="112" r="84" fill="#fff" stroke="#7c3aed" stroke-width="4" stroke-dasharray="10 6"/>
      <g clip-path="url(#${u}c)"><rect x="520" y="20" width="180" height="190" fill="#ede9fe"/>${character('oa', 'serious', null, u, 608, 282, 0.95)}</g>
      <rect x="548" y="186" width="120" height="24" rx="12" fill="#7c3aed"/>${T(608, 203, 12, '📞 Dr. Krüger · OA', 'text-anchor="middle" fill="#fff" font-weight="700"')}`;
  }

  function scale(u, p) {
    const cols = ['#22c55e', '#4ade80', '#86efac', '#bef264', '#fde047', '#facc15', '#fb923c', '#f97316', '#ef4444', '#dc2626', '#b91c1c'];
    const fc = (x, y, mood) => `<circle cx="${x}" cy="${y}" r="24" fill="#fff" stroke="#334155" stroke-width="3"/><circle cx="${x - 8}" cy="${y - 5}" r="3" fill="#334155"/><circle cx="${x + 8}" cy="${y - 5}" r="3" fill="#334155"/>${ln(mood > 0 ? `M${x - 10} ${y + 10} q10 -9 20 0` : mood < 0 ? `M${x - 10} ${y + 6} q10 10 20 0` : `M${x - 9} ${y + 8} h18`, '#334155', 3)}`;
    return `<rect width="720" height="340" fill="#f0f8f3"/><rect x="34" y="24" width="652" height="292" rx="18" fill="#fff" stroke="#cbd5e1" stroke-width="3"/>
      ${T(360, 58, 18, 'Wie stark sind Ihre Schmerzen?', 'text-anchor="middle" font-weight="800" fill="#0f2a3d"')}
      ${fc(84, 104, -1)}${fc(360, 104, 0)}${fc(636, 104, 1)}
      ${cols.map((c, i) => `<rect x="${62 + i * 54}" y="150" width="50" height="58" rx="8" fill="${c}" ${i === (Number.isInteger(p.scaleMark) ? p.scaleMark : 7) ? 'stroke="#0f2a3d" stroke-width="5"' : ''}/>${T(87 + i * 54, 188, 22, i, 'text-anchor="middle" font-weight="800" fill="#fff"')}`).join('')}
      ${T(84, 236, 13, 'keine Schmerzen', 'text-anchor="middle" fill="#475569" font-weight="700"')}${T(636, 236, 13, 'stärkste Schmerzen', 'text-anchor="middle" fill="#475569" font-weight="700"')}
      <path d="M${(Number.isInteger(p.scaleMark) ? p.scaleMark : 7) * 54 + 87} 290 l-12 -40 l24 0z" fill="#0f2a3d"/><rect x="${(Number.isInteger(p.scaleMark) ? p.scaleMark : 7) * 54 + 20}" y="252" width="134" height="30" rx="15" fill="#0f2a3d"/>${T((Number.isInteger(p.scaleMark) ? p.scaleMark : 7) * 54 + 87, 273, 13, p.scaleLabel || 'Herr Becker: 7', 'text-anchor="middle" fill="#fff" font-weight="800"')}`;
  }
  function lab(u) {
    const tube = (x, cap, lbl, sub) => `<g><rect x="${x}" y="96" width="44" height="170" rx="20" fill="#f8fafc" stroke="#94a3b8" stroke-width="3"/><rect x="${x + 3}" y="150" width="38" height="112" rx="17" fill="#b91c1c" opacity=".85"/><rect x="${x - 4}" y="70" width="52" height="40" rx="8" fill="${cap}" stroke="#64748b" stroke-width="2"/>
      <rect x="${x + 2}" y="160" width="40" height="64" fill="#fff" stroke="#cbd5e1"/>${T(x + 22, 182, 10, 'Becker', 'text-anchor="middle" fill="#0f2a3d" font-weight="800"')}${T(x + 22, 196, 9, '67 J.', 'text-anchor="middle" fill="#475569"')}${ln(`M${x + 8} 206 v12 M${x + 13} 206 v12 M${x + 20} 206 v12 M${x + 24} 206 v12 M${x + 31} 206 v12 M${x + 36} 206 v12`, '#0f2a3d', 2)}
      ${T(x + 22, 292, 13, lbl, 'text-anchor="middle" fill="#0f2a3d" font-weight="800"')}${T(x + 22, 310, 11, sub, 'text-anchor="middle" fill="#475569"')}</g>`;
    return `<rect width="720" height="340" fill="#eef4f8"/><rect x="40" y="236" width="440" height="22" rx="4" fill="#94a3b8"/>
      ${tube(70, '#ef4444', 'EDTA', 'Blutbild')}${tube(190, '#22c55e', 'Citrat', 'Gerinnung')}${tube(310, '#f97316', 'Li-Heparin', 'Troponin, Elyte, Krea')}
      <g transform="rotate(5 600 160)"><rect x="512" y="44" width="176" height="230" rx="6" fill="#fff" stroke="#cbd5e1" stroke-width="3"/>${T(528, 74, 15, 'Laborauftrag', 'font-weight="800" fill="#0f2a3d"')}
      ${['Troponin T (hs)', 'Blutbild', 'Na, K, Kreatinin', 'Gerinnung (Quick, PTT)'].map((t, i) => `<rect x="528" y="${92 + i * 28}" width="14" height="14" rx="3" fill="#fff" stroke="#0f2a3d" stroke-width="2"/>${ln(`M531 ${99 + i * 28} l3 4 l6 -8`, '#0d9488', 2.5)}${T(550, 104 + i * 28, 12, t, 'fill="#334155"')}`).join('')}
      <g transform="rotate(-12 600 235)"><rect x="540" y="214" width="120" height="38" rx="6" fill="none" stroke="#e11d48" stroke-width="3.5"/>${T(600, 241, 20, 'NOTFALL', 'text-anchor="middle" fill="#e11d48" font-weight="900"')}</g></g>`;
  }
  function cath(u) {
    return `<rect width="720" height="340" fill="#eef4f8"/><rect x="30" y="18" width="660" height="304" rx="22" fill="#1f2937"/><rect x="44" y="32" width="632" height="276" rx="12" fill="#fff"/>
      <path d="M70 290 C140 250 190 220 250 170 L300 130 L318 152 L270 196 C210 246 160 280 110 300Z" fill="#fde2c8" stroke="#e8b98f" stroke-width="3"/>
      <circle cx="122" cy="270" r="8" fill="#0ea5e9"/>${T(96, 300, 13, 'Handgelenk', 'fill="#0369a1" font-weight="800"')}
      <path d="M380 92 C350 60 300 80 310 130 C318 170 380 205 400 230 C420 205 482 170 490 130 C500 80 450 60 420 92 C410 104 390 104 380 92Z" fill="#fca5a5" stroke="#dc2626" stroke-width="3"/>
      ${ln('M398 102 C380 130 360 150 352 180 M402 104 C420 132 440 150 456 170', '#b91c1c', 4)}
      <path d="M122 270 C200 230 250 190 300 150 C330 126 360 104 396 100" fill="none" stroke="#0ea5e9" stroke-width="4" stroke-dasharray="9 7"/>
      ${T(300, 70, 14, 'dünner Schlauch (Katheter)', 'fill="#0369a1" font-weight="800"')}
      ${ln('M456 168 L540 150', '#64748b', 2)}<circle cx="590" cy="150" r="64" fill="#fff" stroke="#64748b" stroke-width="3"/>
      <path d="M534 136 h34 q12 6 24 0 h50 v28 h-50 q-12 -6 -24 0 h-34z" fill="#fecaca" stroke="#b91c1c" stroke-width="2.5"/>
      <rect x="566" y="134" width="30" height="32" fill="none" stroke="#475569" stroke-width="2"/>${ln('M566 134 l10 32 M576 134 l10 32 M586 134 l10 32 M566 166 l10 -32 M576 166 l10 -32 M586 166 l10 -32', '#475569', 1.6)}
      ${T(586, 236, 12, 'Stent im engen Gefäß', 'text-anchor="middle" fill="#334155" font-weight="800"')}${T(404, 262, 14, 'Herzkranzgefäße', 'text-anchor="middle" fill="#b91c1c" font-weight="800"')}`;
  }
  function desk(u) {
    return `<rect width="720" height="340" fill="#eaf6f8"/>${clock(380, 54, 24, '8:10')}
      <rect x="276" y="104" width="200" height="140" rx="8" fill="#1f2937"/><rect x="284" y="112" width="184" height="118" rx="3" fill="#f8fafc"/>${ln('M376 244 v22 M346 268 h60', '#475569', 6)}
      ${T(294, 132, 12, 'Verlegungsbericht', 'font-weight="800" fill="#0f766e"')}${T(294, 152, 9, 'Diagnose: V. a. NSTE-ACS', 'fill="#334155" font-weight="700"')}
      ${T(294, 168, 9, 'EKG: neue T-Negativierungen V2–V4', 'fill="#334155"')}${T(294, 184, 9, 'Therapie: ASS, Nitro, Heparin', 'fill="#334155"')}${T(294, 200, 9, 'Allergie: Penicillin!', 'fill="#e11d48" font-weight="700"')}${ln('M294 214 h120', '#cbd5e1', 3)}
      <rect x="0" y="282" width="720" height="58" fill="#c3d5de"/><rect x="0" y="278" width="720" height="8" fill="#a9c0cc"/><rect x="300" y="270" width="150" height="12" rx="3" fill="#475569"/>`;
  }
  function corridor(u) {
    return `<rect width="720" height="340" fill="#e2ecef"/><path d="M0 0 L250 110 L470 110 L720 0Z" fill="#f1f5f9"/><path d="M0 340 L250 190 L470 190 L720 340Z" fill="#cbd5e1"/>
      <path d="M0 0 L250 110 L250 190 L0 340Z" fill="#dbe7ec"/><path d="M720 0 L470 110 L470 190 L720 340Z" fill="#dbe7ec"/><rect x="250" y="110" width="220" height="80" fill="#bfdbfe"/>
      ${ln('M0 200 L250 158 M720 200 L470 158', '#94a3b8', 5)}
      <path d="M60 60 L120 80 L120 250 L60 280Z" fill="#a7c4d4"/><path d="M600 80 L660 60 L660 280 L600 250Z" fill="#a7c4d4"/>
      ${ln('M300 30 V58 M420 30 V58', '#64748b', 3)}<rect x="270" y="56" width="180" height="40" rx="6" fill="#15803d"/>${T(360, 82, 15, 'Kardiologie · CPU →', 'text-anchor="middle" fill="#fff" font-weight="800"')}
      <rect x="0" y="0" width="720" height="10" fill="#cbd5e1"/>`;
  }
  function aufnahme(u, p) {
    return `<defs><linearGradient id="${u}w" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f8fafc"/><stop offset="1" stop-color="#e2e8f0"/></linearGradient></defs>
      <rect width="720" height="340" fill="url(#${u}w)"/>
      <rect x="28" y="24" width="200" height="150" rx="8" fill="#fff" stroke="#cbd5e1" stroke-width="2"/><rect x="38" y="34" width="180" height="130" fill="#bae6fd"/>
      <circle cx="150" cy="150" r="22" fill="#fdba74"/>
      ${clock(640, 64, 28, p.clock || '9:10')}
      <rect x="250" y="36" width="250" height="46" rx="10" fill="#0f766e"/>${T(375, 66, 18, 'Aufnahme', 'text-anchor="middle" fill="#fff" font-weight="800"')}
      <rect x="80" y="210" width="150" height="70" rx="12" fill="#fff" stroke="#94a3b8" stroke-width="3"/>
      <rect x="300" y="200" width="170" height="80" rx="12" fill="#fff" stroke="#94a3b8" stroke-width="3"/>
      <rect x="0" y="286" width="720" height="54" fill="#cbd5e1"/>`;
  }
  function leg(u) {
    const calf = (x, thick, fill, label) => `<g><path d="M${x} 40 C${x - thick} 90 ${x - thick - 6} 160 ${x - 8} 250 L${x + thick} 250 C${x + thick + 10} 160 ${x + thick} 90 ${x + 10} 40 Z" fill="${fill}" stroke="#e8b98f" stroke-width="3"/>
      <ellipse cx="${x + 4}" cy="262" rx="${thick + 8}" ry="16" fill="${fill}" stroke="#e8b98f" stroke-width="3"/>
      ${T(x + 6, 300, 16, label, 'text-anchor="middle" fill="#0f2a3d" font-weight="800"')}</g>`;
    return `<rect width="720" height="340" fill="#f8fafc"/>
      <rect x="40" y="18" width="640" height="304" rx="18" fill="#fff" stroke="#cbd5e1" stroke-width="3"/>
      ${T(360, 48, 16, 'Unterschenkel im Vergleich', 'text-anchor="middle" fill="#0f2a3d" font-weight="800"')}
      ${calf(230, 28, '#f6d0b0', 'links')}
      ${calf(470, 46, '#fecaca', 'rechts')}
      <path d="M430 120 q20 10 8 28 q-16 8 -8 -10" fill="none" stroke="#e11d48" stroke-width="3"/>
      <rect x="500" y="150" width="130" height="28" rx="8" fill="#fff" stroke="#e11d48" stroke-width="2"/>${T(565, 169, 13, 'warm · geschwollen', 'text-anchor="middle" fill="#be123c" font-weight="800"')}`;
  }
  function sono(u) {
    return `<rect width="720" height="340" fill="#e2e8f0"/>
      <rect x="36" y="28" width="400" height="250" rx="16" fill="#0f172a" stroke="#334155" stroke-width="6"/>
      <rect x="54" y="48" width="364" height="210" rx="6" fill="#020617"/>
      ${T(70, 72, 13, 'Kompressionssonografie · V. poplitea', 'fill="#94a3b8" font-weight="700"')}
      <ellipse cx="230" cy="160" rx="70" ry="48" fill="#1e293b" stroke="#38bdf8" stroke-width="3"/>
      <ellipse cx="230" cy="160" rx="28" ry="36" fill="#0ea5e9" opacity=".85"/>
      <path d="M150 210 Q230 120 310 210" fill="none" stroke="#e2e8f0" stroke-width="2" stroke-dasharray="5 4"/>
      ${T(236, 230, 13, 'Sonde drückt kurz', 'text-anchor="middle" fill="#e2e8f0" font-weight="800"')}
      <g transform="translate(520 80)"><rect x="0" y="0" width="70" height="150" rx="16" fill="#0f766e"/><rect x="18" y="150" width="34" height="40" rx="6" fill="#99f6e4"/><path d="M28 190 q8 24 0 40" fill="none" stroke="#115e59" stroke-width="6"/>${T(35, 80, 12, 'Sonde', 'text-anchor="middle" fill="#fff" font-weight="800"')}</g>
      <rect x="0" y="292" width="720" height="48" fill="#cbd5e1"/>`;
  }
  function panel(p, i) {
    const u = 'p' + i;
    const scenes = { station, room, monitor, ekg, meds, phone, scale, lab, cath, desk, corridor, aufnahme, leg, sono };
    let bg = (scenes[p.scene] || station)(u, p);
    const figs = p.chars.map(c => character(c.c, c.mood, c.prop, u, c.x, 340, c.c === 'becker' ? 0.94 : 1)).join('');
    return `<svg class="art" viewBox="0 0 720 340" width="720" height="340" preserveAspectRatio="xMidYMid slice" role="img" aria-label="Comic panel ${i + 1}">${bg}${figs}</svg>`;
  }
  function cast(ids) {
    const list = (ids && ids.length ? ids : ['lena', 'tom', 'becker']).slice(0, 3);
    const xs = [120, 280, 450];
    const figs = list.map((id, i) => character(id, id === 'petra' ? 'worried' : 'smile', null, 'cast' + i, xs[i], 290, 0.86)).join('');
    return `<svg viewBox="0 0 560 270" width="560" height="270" class="lineup" role="img" aria-label="Cast">${figs}</svg>`;
  }
  function lineup() {
    return `<svg viewBox="0 0 560 270" width="560" height="270" class="lineup" role="img" aria-label="Dr. Lena Weber, Pfleger Tom and Herr Becker">
      ${character('becker', 'worried', 'chest', 'lu', 300, 280, 0.72)}${character('tom', 'smile', 'clipboard', 'lu', 120, 290, 0.92)}${character('lena', 'smile', null, 'lu', 450, 290, 0.92)}</svg>`;
  }
  const quizPic = {
    bp: `<svg viewBox="0 0 220 150" width="220" height="150"><rect x="20" y="20" width="110" height="110" rx="16" fill="#f8fafc" stroke="#94a3b8" stroke-width="3"/><rect x="34" y="34" width="82" height="58" rx="6" fill="#d1fae5"/><text x="75" y="60" font-size="20" font-weight="800" text-anchor="middle" fill="#065f46" font-family="Inter,Arial">150</text><text x="75" y="84" font-size="20" font-weight="800" text-anchor="middle" fill="#065f46" font-family="Inter,Arial">90</text><circle cx="75" cy="112" r="9" fill="#0d9488"/><path d="M130 76 C170 76 160 40 196 46" fill="none" stroke="#64748b" stroke-width="4"/><rect x="168" y="44" width="42" height="80" rx="12" fill="#2563eb"/><path d="M174 60h30M174 74h30M174 88h30" stroke="#93c5fd" stroke-width="3"/></svg>`,
    ekg: `<svg viewBox="0 0 220 150" width="220" height="150"><rect x="10" y="22" width="200" height="106" rx="6" fill="#fff1f2" stroke="#fda4af" stroke-width="2"/><path d="M10 54h200M10 76h200M10 98h200M54 22v106M98 22v106M142 22v106M186 22v106" stroke="#fecdd3"/><path d="M14 84 h14 q4 -6 8 0 h6 l3 4 l4 -42 l5 48 l3 -10 h10 q8 -14 16 0 h18 q4 -6 8 0 h6 l3 4 l4 -42 l5 48 l3 -10 h10 q8 -14 16 0 h18 q4 -6 8 0 h6 l3 4 l4 -42 l5 48 l3 -10 h8" fill="none" stroke="#111827" stroke-width="2.2"/></svg>`,
    spray: `<svg viewBox="0 0 220 150" width="220" height="150"><rect x="84" y="46" width="52" height="96" rx="12" fill="#dc2626"/><rect x="92" y="26" width="36" height="24" rx="5" fill="#f1f5f9" stroke="#94a3b8" stroke-width="2"/><rect x="104" y="12" width="12" height="16" rx="3" fill="#cbd5e1"/><rect x="84" y="74" width="52" height="40" fill="#fff"/><text x="110" y="99" font-size="13" font-weight="800" text-anchor="middle" fill="#b91c1c" font-family="Inter,Arial">• • •</text><path d="M78 20 q-14 -4 -26 6 M76 30 q-18 2 -30 14 M78 12 q-12 -10 -26 -8" stroke="#94a3b8" stroke-width="3" fill="none" stroke-linecap="round"/></svg>`,
    leg: `<svg viewBox="0 0 220 150" width="220" height="150"><rect width="220" height="150" rx="12" fill="#fff"/><path d="M70 18 C48 50 46 90 58 120 L92 120 C100 90 96 50 78 18 Z" fill="#f6d0b0" stroke="#e8b98f" stroke-width="2"/><path d="M140 12 C108 48 104 92 118 124 L168 124 C184 92 180 48 156 12 Z" fill="#fecaca" stroke="#f87171" stroke-width="3"/><text x="74" y="142" font-size="12" text-anchor="middle" fill="#334155" font-family="Inter,Arial">links</text><text x="146" y="142" font-size="12" font-weight="800" text-anchor="middle" fill="#be123c" font-family="Inter,Arial">rechts</text></svg>`
  };
  const logo = `<svg class="brand-logo" viewBox="0 0 40 40" aria-hidden="true"><defs><linearGradient id="lg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#14b8a6"/><stop offset="1" stop-color="#2563eb"/></linearGradient></defs><rect width="40" height="40" rx="11" fill="url(#lg)"/><path d="M9 12a4 4 0 0 1 4-4h14a4 4 0 0 1 4 4v10a4 4 0 0 1-4 4h-8l-6 5v-5h0a4 4 0 0 1-4-4z" fill="#fff"/><path d="M18 11h4v4h4v4h-4v4h-4v-4h-4v-4h4z" fill="#0d9488"/></svg>`;
  const avatar = c => `<svg viewBox="-50 -240 100 100" width="100" height="100" class="av">${character(c, 'smile', null, 'av' + c, 0, 0, 1)}</svg>`;
  return { panel, lineup, cast, quizPic, logo, character, avatar };
})();
