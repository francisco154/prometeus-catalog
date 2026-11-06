// SRT 3.30.52 · cues ↔ SRT (mismo formato tolerante del motor de la app).

export function srtTiempo(ms) {
  const t = Math.max(0, Math.round(ms));
  const h = Math.floor(t / 3600000), mn = Math.floor((t % 3600000) / 60000);
  const s = Math.floor((t % 60000) / 1000), mls = t % 1000;
  return `${String(h).padStart(2, '0')}:${String(mn).padStart(2, '0')}:${String(s).padStart(2, '0')},${String(mls).padStart(3, '0')}`;
}

export function srtDe(cues) {
  return cues
    .slice()
    .sort((a, b) => a.desdeMs - b.desdeMs)
    .map((c, i) => `${i + 1}\n${srtTiempo(c.desdeMs)} --> ${srtTiempo(c.hastaMs)}\n${c.texto.trim()}`)
    .join('\n') + '\n';
}

export function parseSrt(txt) {
  const re = /(\d+):(\d+):(\d+)[,.](\d+)\s*-->\s*(\d+):(\d+):(\d+)[,.](\d+)/;
  const ms = (h, m, s, x) => (+h) * 3600000 + (+m) * 60000 + (+s) * 1000 + String(x).padEnd(3, '0').slice(0, 3) * 1;
  return txt.split(/\n\s*\n/).map(b => {
    const lineas = b.split('\n').filter(l => l.trim());
    const m = lineas.find(l => re.test(l))?.match(re);
    if (!m) return null;
    const d = ms(m[1], m[2], m[3], m[4]), h = ms(m[5], m[6], m[7], m[8]);
    const texto = lineas.slice(lineas.findIndex(l => re.test(l)) + 1).join(' ').trim();
    return (h > d && texto) ? { desdeMs: d, hastaMs: h, texto } : null;
  }).filter(Boolean).sort((a, b) => a.desdeMs - b.desdeMs);
}

/** Divide textos largos en 2 líneas (estética de subtítulo). */
export function dosLineas(texto, max = 42) {
  if (texto.length <= max) return texto;
  const palabras = texto.split(' ');
  let l1 = '', l2 = '';
  for (const p of palabras) {
    if ((l1 + ' ' + p).trim().length <= max || !l1) l1 = (l1 + ' ' + p).trim();
    else l2 = (l2 + ' ' + p).trim();
  }
  return l2 ? `${l1}\n${l2}` : l1;
}
