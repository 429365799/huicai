/* Development-only continuous-scroll story slice. The real puzzle owns victory. */
(async function() {
  const M=ScrollModel, body=document.body, main=document.querySelector('main');
  const caption=document.querySelector('.journey-caption'), actions=document.querySelector('.journey-actions');
  const status=document.querySelector('#status'), gentle=document.querySelector('#gentle');
  const canvas=document.createElement('canvas'); canvas.className='scroll-scene'; body.prepend(canvas);
  const ctx=canvas.getContext('2d');
  const frame=document.createElement('iframe'); frame.className='game-frame'; frame.title='洄彩 · 初染';
  frame.src='preview.html?level=0&story=scroll&v=2'; frame.inert=true; body.append(frame);
  let phase='loading', elapsed=0, leafT=0, travel=0, restored=0, overview=0, overviewTarget=0;
  let chapter=0, nextFrameReady=false;
  frame.addEventListener('load',()=>{nextFrameReady=!!frame.contentWindow?.__storyReady;});
  let w=430,h=844, last=0, ripple=0;
  gentle.checked=matchMedia('(prefers-reduced-motion: reduce)').matches;
  const quiet=()=>body.classList.toggle('quiet',gentle.checked); gentle.onchange=quiet; quiet();
  function resize(){w=Math.min(innerWidth,430);h=innerHeight;const d=Math.min(devicePixelRatio||1,2);canvas.width=Math.round(w*d);canvas.height=Math.round(h*d);ctx.setTransform(d,0,0,d,0,0);}
  addEventListener('resize',resize);resize();
  function say(text){caption.textContent=text;caption.hidden=!text;}
  function enter(next){phase=next;elapsed=0;}
  const picture=new Image(),leaf=new Image();
  picture.src='docs/art/spring-scroll-v1.png';leaf.src='docs/art/spring-leaf-v3.png';
  try {await Promise.all([picture.decode(),leaf.decode()]);} catch(error){status.textContent='画卷未能载入，可点击按钮直接进入第 0 关。';return;}
  const iw=picture.naturalWidth,ih=picture.naturalHeight;
  function layer(){const c=document.createElement('canvas');c.width=iw;c.height=ih;return c;}
  const gray=layer(),color=layer(),mask=layer();
  const g=gray.getContext('2d');g.filter='grayscale(1) contrast(.83) brightness(1.12)';g.drawImage(picture,0,0);
  function restore(p){
    const m=mask.getContext('2d');m.clearRect(0,0,iw,ih);
    const regions=[...M.patches.map(patch=>({patch,progress:chapter?1:p})),...M.downstream.map(patch=>({patch,progress:chapter?p:0}))];
    for(const {patch,progress} of regions){const a=M.ease((progress-patch.at)/.34);if(!a)continue;
      m.save();m.translate(patch.x*iw,patch.y*ih);m.scale(patch.rx*iw*a,patch.ry*ih*a);
      const grad=m.createRadialGradient(0,0,.58,0,0,1);grad.addColorStop(0,'white');grad.addColorStop(1,'transparent');m.fillStyle=grad;m.fillRect(-1,-1,2,2);m.restore();
    }
    const c=color.getContext('2d');c.clearRect(0,0,iw,ih);c.globalCompositeOperation='source-over';c.drawImage(picture,0,0);c.globalCompositeOperation='destination-in';c.drawImage(mask,0,0);c.globalCompositeOperation='source-over';
  }
  restore(0);enter('intro');status.textContent='随一叶入水，唤醒第一段画卷';
  document.querySelector('.start').onclick=e=>{
    e.preventDefault();if(phase!=='intro')return;
    if(!frame.contentWindow?.__storyReady){status.textContent='谜题正在准备，请稍候再试。';return;}
    body.classList.add('departing');enter('approach');
  };
  addEventListener('message',e=>{
    if(e.origin!==location.origin||e.source!==frame.contentWindow||e.data?.kind!=='huicai-story'||phase!=='puzzle')return;
    if(e.data.type==='paint')ripple=1;
    if(e.data.type==='won'){frame.inert=true;enter('restore');say(chapter?'散开的水色汇在一起，溪流向远处延伸。':'杂色归位，泉水重新有了颜色。');}
  });
  document.querySelector('#lookback').onclick=()=>{overviewTarget=overviewTarget?0:1;document.querySelector('#lookback').textContent=overviewTarget?'回到小叶':'回望画卷';};
  document.querySelector('.replay').onclick=()=>location.reload();
  function tick(now){
    const dt=document.hidden?0:Math.min(50,last?now-last:0);last=now;elapsed+=dt;ripple=Math.max(0,ripple-dt/1600);
    const short=gentle.checked;
    if(phase==='approach'){
      leafT=.375*M.ease(elapsed/(short?600:2600));
      if(elapsed>600)main.hidden=true;
      if(elapsed>(short?650:2700)){main.hidden=true;body.classList.add('puzzle');frame.inert=false;enter('puzzle');}
    }else if(phase==='restore'){
      if(elapsed>550){body.classList.remove('puzzle');body.classList.add('leaving');}
      const next=M.clamp((elapsed-550)/(short?700:2800));if(next!==restored){restored=next;restore(restored);}
      if(restored===1){enter('travel');say('泉水流动起来，小叶继续向前。');}
    }else if(phase==='travel'){
      const progress=M.ease(elapsed/(short?1000:5200));
      if(!chapter){travel=progress;leafT=.375+.625*progress;}else{leafT=1+progress;}
      if(progress===1){
        if(!chapter){chapter=1;restored=0;nextFrameReady=false;frame.title='洄彩 · 溪行 · 聚流';frame.src='preview.html?level=3&story=scroll&v=campaign-20-1';enter('settle');say('溪行 · 聚流。让分散的颜色重新相连。');}
        else{enter('arrived');say('泉水汇成了溪流。下一程，将从这里继续。');actions.hidden=false;}
      }
    }else if(phase==='settle'){
      if(elapsed>(short?500:1800)&&nextFrameReady){say('');body.classList.remove('leaving');body.classList.add('puzzle');frame.inert=false;enter('puzzle');}
      else if(elapsed>15000&&!nextFrameReady){say('溪流谜题未能载入，请重走这一程再试。');actions.hidden=false;}
    }
    overview+=(overviewTarget-overview)*Math.min(1,dt/(short?80:260));
    const p=M.point(leafT),cam=M.camera(w,h,iw,ih,p,travel,overview);
    ctx.clearRect(0,0,w,h);ctx.fillStyle='#e6e4db';ctx.fillRect(0,0,w,h);
    ctx.save();ctx.translate(cam.x,cam.y);ctx.scale(cam.scale,cam.scale);ctx.drawImage(gray,0,0);ctx.drawImage(color,0,0);
    const x=p.x*iw,y=p.y*ih;
    if(!short){for(let i=0;i<2;i++){const a=(now/2600+i*.5)%1;ctx.beginPath();ctx.ellipse(x,y+9,20+a*25,7+a*9,0,0,Math.PI*2);ctx.strokeStyle=`rgba(238,244,229,${(1-a)*(.18+ripple*.2)})`;ctx.lineWidth=1;ctx.stroke();}}
    ctx.translate(x,y);ctx.rotate(.2+Math.sin(leafT*Math.PI*4)*.15);ctx.filter=chapter||restored>.05?'none':'grayscale(1)';ctx.drawImage(leaf,-48,-32,96,64);ctx.restore();
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
})();
