// Promo video stage: every visual state is a function of the timeline time t (seconds).
// film.mjs registers scene switches, step captions, cursor moves and clicks as they happen,
// then calls __seek(t) before each frame. No CSS transitions or timers are involved.
(() => {
  const FADE = 0.5; // scene cross-fade
  const scenes = []; // { id, at }
  const steps = []; // { n, text, at }
  const moves = []; // { from: [x, y], to: [x, y], at, dur }
  const clicks = []; // { x, y, at }
  const cursorVis = []; // { on, at }
  const ripples = [];

  const clamp = (v) => Math.max(0, Math.min(1, v));
  const ease = (p) => (p < 0.5 ? 4 * p * p * p : 1 - (-2 * p + 2) ** 3 / 2);
  const last = (list, t) => {
    let found = null;
    for (const e of list) if (e.at <= t) found = e;
    return found;
  };
  const cursorAt = (t) => {
    let pos = [640, 400];
    for (const m of moves) {
      if (m.at > t) break;
      const p = ease(clamp((t - m.at) / m.dur));
      pos = [m.from[0] + (m.to[0] - m.from[0]) * p, m.from[1] + (m.to[1] - m.from[1]) * p];
    }
    return pos;
  };

  window.__stage = {
    scene: (id, at) => scenes.push({ id, at }),
    step: (n, text, at) => steps.push({ n, text, at }),
    cursor: (on, at) => cursorVis.push({ on, at }),
    move: (to, at, dur) => {
      const from = cursorAt(at);
      moves.push({ from, to, at, dur });
    },
    click: (x, y, at) => clicks.push({ x, y, at }),
    cursorAt,
  };

  window.__seek = (t) => {
    // Scenes: the current one fades in over FADE; the one before it fades out.
    const cur = last(scenes, t);
    const idx = cur ? scenes.indexOf(cur) : -1;
    const prev = idx > 0 ? scenes[idx - 1] : null;
    for (const el of document.querySelectorAll('.scene')) {
      let o = 0;
      if (cur && el.id === cur.id) o = idx === 0 ? 1 : clamp((t - cur.at) / FADE);
      else if (prev && el.id === prev.id) o = 1 - clamp((t - cur.at) / FADE);
      el.style.opacity = String(o);
      el.style.visibility = o > 0 ? 'visible' : 'hidden';
    }
    // Reveals inside the current scene, and a slow zoom of its background art.
    if (cur) {
      const el = document.getElementById(cur.id);
      const local = t - cur.at;
      for (const r of el.querySelectorAll('.reveal')) {
        const p = ease(clamp((local - 0.15 - Number(r.dataset.delay || 0)) / 0.7));
        r.style.opacity = String(p);
        r.style.transform = `translateY(${(1 - p) * 16}px)`;
      }
      const bg = el.querySelector('.bg');
      if (bg) bg.style.transform = `scale(${1 + 0.06 * clamp(local / 9)})`;
      const img = el.id === 'studio' && el.querySelector('img');
      if (img) img.style.transform = `scale(${1 + 0.05 * ease(clamp(local / 2.4))})`;
    }
    // Step caption: cross-fade the text when it changes.
    const s = last(steps, t);
    if (s) {
      document.getElementById('step-n').textContent = String(s.n);
      const text = document.getElementById('step-text');
      text.textContent = s.text;
      text.style.opacity = String(clamp((t - s.at) / 0.35));
    }
    // Cursor.
    const vis = last(cursorVis, t);
    const cursor = document.getElementById('cursor');
    cursor.style.opacity = String(vis ? (vis.on ? clamp((t - vis.at) / 0.3) : 1 - clamp((t - vis.at) / 0.3)) : 0);
    const [x, y] = cursorAt(t);
    cursor.style.transform = `translate(${x - 4}px, ${y - 2}px)`;
    // Click ripples: 0.6 s each.
    clicks.forEach((c, i) => {
      if (!ripples[i]) {
        ripples[i] = document.createElement('div');
        ripples[i].className = 'ripple';
        document.body.append(ripples[i]);
      }
      const p = (t - c.at) / 0.6;
      const r = ripples[i];
      r.style.left = `${c.x}px`;
      r.style.top = `${c.y}px`;
      r.style.opacity = p >= 0 && p <= 1 ? String(1 - p) : '0';
      r.style.transform = `scale(${0.3 + clamp(p)})`;
    });
  };

  window.__seek(0);
})();
