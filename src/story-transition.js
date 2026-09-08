/* Development-only: per-region masks over a preloaded playable canvas. */
(() => {
  const $ = selector => document.querySelector(selector);
  const start = $('.start'), cover = $('main'), leaf = $('.leaf'), figure = $('figure');
  const replay = $('.replay'), gentle = $('#gentle'), status = $('#status');
  const current = $('.current'), impact = $('.impact'), flow = window.StoryFlow;
  const preference = matchMedia('(prefers-reduced-motion: reduce)');
  const frame = document.createElement('iframe');
  frame.className = 'game-frame'; frame.title = '洄彩第 0 关试玩'; frame.inert = true;
  let ready = false, busy = false, tick = 0, began = 0, elapsed = 0;
  let geometry = null, regions = [], reduced = false, artReady = false;
  gentle.checked = preference.matches;
  preference.addEventListener('change', e => { gentle.checked = e.matches; });
  const updateStatus = () => { status.textContent = ready && artReady ? '水面与小叶已就绪 · 落笔入画' : '正在准备分层画卷…'; };
  Promise.all([...figure.querySelectorAll('img')].map(img => img.decode())).then(() => { artReady = true; updateStatus(); }).catch(() => { status.textContent = '插画加载失败，请刷新；仍可直接进入试玩'; });
  frame.addEventListener('load', () => { ready = frame.contentWindow.__storyReady === true; updateStatus(); });
  frame.src = 'preview.html?level=0&story=1&v=3'; document.body.append(frame);
  const timeout = setTimeout(() => { if (!ready || !artReady) status.textContent = '加载较慢，点击按钮可直接进入试玩'; }, 8000);
  function measure() {
    const data = frame.contentWindow.__storyGeometry();
    const canvas = frame.contentDocument.querySelector('canvas').getBoundingClientRect();
    const rect = cover.getBoundingClientRect();
    geometry = { width: rect.width, height: rect.height, x: canvas.left + data.board.x - rect.left, y: canvas.top + data.board.y - rect.top, cell: data.board.cell };
    regions = flow.flood(data.cells);
  }
  function mask(ms) {
    const g = geometry;
    const holes = regions.map(([r,c,d]) => {
      const radius = flow.radius(ms,d,g.cell);
      if (!radius) return '';
      const x=g.x+(c+.5)*g.cell, y=g.y+(r+.5)*g.cell;
      return '<ellipse cx="'+x+'" cy="'+y+'" rx="'+radius+'" ry="'+radius*.92+'" fill="black"/>';
    }).join('');
    const end = flow.ease((ms-1860)/790);
    const radius = end * Math.hypot(g.width,g.height)*1.2;
    const edge = Array.from({length:96},(_,i) => {
      const angle=i/96*Math.PI*2;
      const r=radius*(1+.035*Math.sin(angle*5)+.025*Math.cos(angle*9));
      return (i?'L':'M')+(g.width*.5+Math.cos(angle)*r)+','+(g.y+g.cell*3+Math.sin(angle)*r*.9);
    }).join(' ')+'Z';
    const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="'+g.width+'" height="'+g.height+'"><defs><filter id="soft"><feGaussianBlur stdDeviation="2"/></filter><mask id="m"><rect width="100%" height="100%" fill="white"/><g filter="url(#soft)">'+holes+'<path d="'+edge+'" fill="black"/></g></mask></defs><rect width="100%" height="100%" fill="white" mask="url(#m)"/></svg>';
    const value = 'url("data:image/svg+xml,'+encodeURIComponent(svg)+'")';
    cover.style.maskImage = value; cover.style.webkitMaskImage = value;
  }
  function paint(ms) {
    elapsed = ms;
    if (reduced) { cover.style.opacity = String(1-flow.clamp(ms/200)); return; }
    const p = flow.leafAt(ms);
    leaf.style.left = p.x+'%'; leaf.style.top = p.y+'%';
    leaf.style.transform = 'translate(-50%,-50%) rotate('+p.angle+'deg) scale('+p.scale+')';
    current.style.opacity = String(.7*(1-flow.ease((ms-1250)/500)));
    current.style.strokeDashoffset = String(90*(1-flow.ease((ms-180)/1100)));
    const ripple = flow.clamp((ms-80)/1000);
    impact.setAttribute('rx', String(1+ripple*27)); impact.setAttribute('ry', String(.4+ripple*10));
    impact.style.opacity = String(Math.sin(ripple*Math.PI)*.85);
    start.style.setProperty('--ink','1');
    // Typography can settle out; the painting stays opaque until locally erased.
    for (const item of cover.querySelectorAll('header,.story,footer,.start span')) item.style.opacity = String(1-flow.ease((ms-250)/450));
    mask(ms);
  }
  function finish() {
    cancelAnimationFrame(tick);
    document.body.classList.remove('entering'); document.body.classList.add('playing');
    frame.inert = false; frame.focus(); replay.hidden = false;
  }
  function run(now) {
    paint(now-began);
    if (elapsed >= (reduced ? 200 : flow.duration)) finish();
    else tick = requestAnimationFrame(run);
  }
  start.addEventListener('pointerdown', e => {
    const rect = start.getBoundingClientRect();
    start.style.setProperty('--touch-x', (e.clientX-rect.left)+'px');
    start.style.setProperty('--touch-y', (e.clientY-rect.top)+'px');
  });
  start.addEventListener('click', e => {
    if (busy) { e.preventDefault(); return; }
    if (!ready || !artReady) return;
    e.preventDefault(); clearTimeout(timeout); measure();
    busy = true; reduced = gentle.checked; cover.inert = true;
    start.setAttribute('aria-disabled','true'); document.body.classList.add('entering');
    began = performance.now(); tick = requestAnimationFrame(run);
  });
  replay.addEventListener('click', () => {
    frame.inert = true; document.body.classList.remove('playing'); cover.inert = false;
    cover.style.maskImage = ''; cover.style.webkitMaskImage = ''; cover.style.opacity = '';
    leaf.removeAttribute('style'); current.removeAttribute('style'); impact.removeAttribute('style');
    for (const item of cover.querySelectorAll('header,.story,footer,.start span')) item.style.opacity = '';
    start.style.setProperty('--ink','0'); start.removeAttribute('aria-disabled');
    replay.hidden = true; busy = false; start.focus();
  });
  window.addEventListener('resize', () => { if (busy && !document.body.classList.contains('playing')) measure(); });
  document.addEventListener('visibilitychange', () => {
    if (!busy || document.body.classList.contains('playing')) return;
    if (document.hidden) cancelAnimationFrame(tick);
    else { began = performance.now()-elapsed; tick = requestAnimationFrame(run); }
  });
  // Explicit development-only frame inspection, unavailable on ordinary preview URLs.
  if (new URLSearchParams(location.search).has('motion-debug')) {
    window.__storyMotion = { seek(ms) { if (!ready || !artReady) return false; cancelAnimationFrame(tick); measure(); busy = true; reduced = false; cover.inert = true; document.body.classList.add('entering'); paint(ms); return true; }, finish };
    const inspection = document.createElement('aside');
    inspection.style.cssText = 'position:fixed;z-index:10;top:0;left:0;display:flex;gap:4px;background:#faf7ef;padding:4px';
    for (const ms of [0,800,1500,2100]) {
      const button = document.createElement('button'); button.textContent = ms+'ms';
      button.style.minHeight = '44px';
      button.addEventListener('click', () => { document.body.classList.remove('playing'); frame.inert = true; replay.hidden = true; window.__storyMotion.seek(ms); });
      inspection.append(button);
    }
    document.body.append(inspection);
  }
})();
