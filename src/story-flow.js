/* Deterministic browser prototype choreography; also exercised by Node tests. */
(function(root) {
  const clamp = v => Math.max(0, Math.min(1, v));
  const ease = v => { const p = clamp(v); return p*p*(3-2*p); };
  function leafAt(ms) {
    const t = ease((ms-160)/1100);
    return { x: 58+2*Math.sin(t*Math.PI)-8*t, y: 50+46*t, angle: 95*t, scale: 1-.65*t };
  }
  function flood(cells) {
    const rows=cells.length, cols=cells[0].length;
    let origin=null;
    for (let r=rows-1;r>=0 && !origin;r--) {
      const valid=cells[r].map((v,c)=>({v,c})).filter(p=>p.v>=0).sort((a,b)=>Math.abs(a.c-cols/2)-Math.abs(b.c-cols/2));
      if(valid.length) origin=[r,valid[0].c];
    }
    if(!origin) return [];
    const queue=[[...origin,0]], seen=new Set([origin.join(',')]);
    for(let i=0;i<queue.length;i++) {
      const [r,c,d]=queue[i];
      for(const [dr,dc] of [[-1,0],[0,-1],[0,1],[1,0]]) {
        const nr=r+dr,nc=c+dc,key=`${nr},${nc}`;
        if(cells[nr]?.[nc]>=0 && !seen.has(key)) { seen.add(key); queue.push([nr,nc,d+1]); }
      }
    }
    return queue;
  }
  const radius=(ms,d,cell)=>ease((ms-1000-d*95)/360)*cell*.86;
  const api={clamp,ease,leafAt,flood,radius,duration:2650};
  if(typeof module!=='undefined') module.exports=api;
  root.StoryFlow=api;
})(typeof globalThis!=='undefined'?globalThis:this);
