/* Persistent spring + real level 0. Signals are emitted by accepted game actions. */
(() => {
  const cover=document.querySelector('main'), start=document.querySelector('.start');
  const scene=document.createElement('div'); scene.className='scene';
  scene.append(document.querySelector('figure')); document.body.prepend(scene);
  const gentle=document.querySelector('#gentle'), status=document.querySelector('#status'), replay=document.querySelector('.replay');
  const preference=matchMedia('(prefers-reduced-motion: reduce)');
  gentle.checked=preference.matches;
  const quiet=()=>document.body.classList.toggle('quiet',gentle.checked);
  gentle.addEventListener('change',quiet); preference.addEventListener('change',e=>{gentle.checked=e.matches;quiet();}); quiet();
  const frame=document.createElement('iframe'); frame.className='game-frame'; frame.title='洄彩 · 唤泉第 0 关'; frame.inert=true;
  let gameReady=false,artReady=false,busy=false,responseTimer=0;
  const statusText=()=>{status.textContent=gameReady&&artReady?'泉水常在 · 落笔唤醒第 0 关':'正在准备泉水与画布…';};
  Promise.all([...scene.querySelectorAll('img')].map(img=>img.decode())).then(()=>{artReady=true;statusText();}).catch(()=>{status.textContent='插画加载失败，请刷新重试';});
  frame.addEventListener('load',()=>{gameReady=frame.contentWindow.__storyReady===true;statusText();});
  frame.src='preview.html?level=0&story=live'; document.body.append(frame);
  start.addEventListener('click',async e=>{
    if(busy){e.preventDefault();return;}
    if(!gameReady||!artReady){e.preventDefault();status.textContent='画卷尚未就绪，请稍候或刷新';return;}
    e.preventDefault();busy=true;cover.inert=true;document.body.classList.add('entering');
    await new Promise(resolve=>setTimeout(resolve,gentle.checked?160:720));
    document.body.classList.remove('entering');document.body.classList.add('playing');
    frame.inert=false;frame.focus();replay.hidden=false;
  });
  window.addEventListener('message',e=>{
    if(e.source!==frame.contentWindow||e.origin!==location.origin||e.data?.kind!=='huicai-story') return;
    const type=e.data.type;
    if(type==='paint'){
      scene.classList.add('answer');clearTimeout(responseTimer);
      responseTimer=setTimeout(()=>scene.classList.remove('answer'),1300);
    } else if(type==='won') {scene.classList.add('flowing');}
    else if(type==='reset') {scene.classList.remove('flowing','answer');clearTimeout(responseTimer);}
  });
  replay.addEventListener('click',()=>{
    frame.inert=true;document.body.classList.remove('playing');cover.inert=false;replay.hidden=true;busy=false;start.focus();
  });
  document.addEventListener('visibilitychange',()=>{
    scene.querySelectorAll('*').forEach(el=>el.style.animationPlayState=document.hidden?'paused':'running');
  });
})();
