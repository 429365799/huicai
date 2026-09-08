/* Normalized artwork coordinates. Camera and leaf remain in the same world. */
(function(root) {
  const clamp=v=>Math.max(0,Math.min(1,v));
  const ease=v=>{const t=clamp(v);return t*t*(3-2*t);};
  // Authored against spring-scroll-v1.png, not screen coordinates.
  const route=[[.51,.14],[.53,.19],[.52,.23],[.58,.27],[.61,.32],[.50,.37],[.43,.41],[.57,.47],[.59,.51]];
  function point(t) {
    if(t>1){const u=clamp(t-1);return {x:.59-.10*ease(u),y:.51+.29*u};}
    const n=clamp(t)*(route.length-1),i=Math.min(route.length-2,Math.floor(n)),u=n-i;
    const a=route[i],b=route[i+1],prev=route[Math.max(0,i-1)],next=route[Math.min(route.length-1,i+2)];
    const value=k=>.5*((2*a[k])+(-prev[k]+b[k])*u+(2*prev[k]-5*a[k]+4*b[k]-next[k])*u*u+(-prev[k]+3*a[k]-3*b[k]+next[k])*u*u*u);
    return {x:value(0),y:value(1)};
  }
  function camera(w,h,iw,ih,p,travel=0,overview=0) {
    const scale=Math.max(w/iw,h/(ih*.30))*(1-.16*ease(travel));
    const wide=Math.min(w/iw,h/ih);
    const s=scale+(wide-scale)*overview;
    const desiredY=p.y*ih*s-h*(.90-.38*ease(travel));
    return {scale:s,x:(w-iw*s)/2,y:-Math.max(0,Math.min(ih*s-h,desiredY))*(1-overview)+(h-ih*s)/2*overview};
  }
  const patches=[{x:.51,y:.125,rx:.48,ry:.12,at:0},...route.slice(1).map(([x,y],i)=>({x,y,rx:.20,ry:.05,at:.10+i*.08}))];
  const downstream=Array.from({length:8},(_,i)=>{const p=point(1+i/7);return {...p,rx:.25,ry:.065,at:i*.08};});
  const api={clamp,ease,point,camera,patches,downstream};
  if(typeof module!=='undefined') module.exports=api;
  root.ScrollModel=api;
})(typeof globalThis!=='undefined'?globalThis:this);
