(function(root,factory){const api=factory();if(typeof module!=="undefined"&&module.exports)module.exports=api;root.PaletteNightUI=api;})(typeof globalThis!=="undefined"?globalThis:this,function(){
  "use strict";
  const INK="#07171e", IVORY="#eee5c5", GOLD="#ccb879", MUTED="#b4bcb3";
  const SERIF='"Songti SC","Noto Serif CJK SC","Source Han Serif SC",serif';
  function round(ctx,x,y,w,h,r){r=Math.min(r,w/2,h/2);ctx.beginPath();ctx.moveTo(x+r,y);ctx.arcTo(x+w,y,x+w,y+h,r);ctx.arcTo(x+w,y+h,x,y+h,r);ctx.arcTo(x,y+h,x,y,r);ctx.arcTo(x,y,x+w,y,r);ctx.closePath();}
  function text(ctx,str,x,y,size,color=IVORY,align="center",weight=400){ctx.fillStyle=color;ctx.textAlign=align;ctx.textBaseline="middle";ctx.font=weight+" "+size+"px "+SERIF;ctx.fillText(str,x,y);}
  function line(ctx,x1,y1,x2,y2,color=GOLD,alpha=1){ctx.save();ctx.globalAlpha=alpha;ctx.strokeStyle=color;ctx.lineWidth=.65;ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke();ctx.restore();}
  function diamond(ctx,x,y,size=2){ctx.save();ctx.translate(x,y);ctx.rotate(Math.PI/4);ctx.strokeStyle=GOLD;ctx.lineWidth=.65;ctx.strokeRect(-size,-size,size*2,size*2);ctx.restore();}
  function safeInsets(info){
    const area=info.safeArea;
    if(!area)return {top:0,bottom:0};
    return {top:Math.max(0,area.top||0),bottom:Math.max(0,(info.screenHeight||info.windowHeight)-area.bottom)};
  }
  function createLayout(width,height,level,levels,scroll,insets={top:0,bottom:0}){
    const top=Math.max(0,insets.top||0),bottom=Math.max(0,insets.bottom||0);
    height-=top+bottom;
    const compact=height<760, small=height<640, margin=Math.max(16,width*.052);
    const header=small?145:compact?180:210;
    const boardSize=Math.min(width-margin*2-16,height-header-(small?224:232));
    const boardY=header+10, boardX=(width-boardSize)/2;
    const paletteSize=small?48:56, gap=Math.min(28,(width-margin*2-paletteSize*4)/3);
    const paletteWidth=paletteSize*4+gap*3, paletteY=boardY+boardSize+72;
    const footerY=height-62, tabWidth=74,tabGap=12;
    const tabsWidth=levels.length*(tabWidth+tabGap)-tabGap;
    const tabBar={x:margin,y:small?64:compact?99:126,w:width-margin*2,h:44};
    const maxTabScroll=Math.max(0,tabsWidth-tabBar.w), offset=Math.max(0,Math.min(scroll,maxTabScroll));
    const result={compact,small,margin,card:{x:margin,y:boardY-50,w:width-margin*2,h:boardSize+112},
      board:{x:boardX,y:boardY,size:boardSize,cell:boardSize/level.cols},
      titleY:small?29:compact?40:55, titleSize:small?37:compact?45:54,
      chapterY:small?61:compact?81:105, statusY:boardY-30,
      book:{x:margin-5,y:small?9:18,w:44,h:44},
      undo:{x:margin,y:footerY,w:44,h:44},restart:{x:margin+52,y:footerY,w:44,h:44},
      sound:{x:margin+104,y:footerY,w:44,h:44},
      hint:{x:width-margin-128,y:footerY,w:128,h:44},
      tabBar,tabWidth,tabGap,tabsWidth,maxTabScroll,
      tabs:levels.map((_,i)=>({x:tabBar.x+i*(tabWidth+tabGap)-offset,y:tabBar.y,w:tabWidth,h:44})),
      palette:{x:(width-paletteWidth)/2,y:paletteY,size:paletteSize,gap},
      tray:{x:margin,y:paletteY-10,w:width-margin*2,h:paletteSize+34},
      footer:{x:margin-2,y:footerY-2,w:width-margin*2+4,h:48}
    };
    for(const name of ["card","board","book","undo","restart","sound","hint","tabBar","palette","tray","footer"])result[name].y+=top;
    for(const rect of result.tabs)rect.y+=top;
    for(const name of ["titleY","chapterY","statusY"])result[name]+=top;
    return result;
  }
  function createAssets(platform){
    const images=new Map();
    function get(kind){
      if(!platform.createImage)return null;
      if(!images.has(kind)){
        const record={image:platform.createImage(),ready:false};
        record.image.onload=()=>{record.ready=true;};
        record.image.onerror=()=>{record.failed=true;};
        record.image.src=kind==="pigments"?"assets/art/pigments.jpg":"assets/art/night-"+kind+".jpg";
        images.set(kind,record);
      }
      const item=images.get(kind);
      return item.ready?item.image:null;
    }
    return {get};
  }
  function background(ctx,v,assets){
    const {width:w,height:h,theme,level}=v;
    ctx.fillStyle=INK;ctx.fillRect(0,0,w,h);
    const bg=assets.get(theme.kind);
    if(bg){
      // A chapter has one quiet painting; each scene samples a subtly different view.
      const zoom=1+(level.number%4)*.018;
      const scale=Math.max(w/bg.width,h/bg.height)*zoom;
      ctx.drawImage(bg,(w-bg.width*scale)/2,(h-bg.height*scale)/2,bg.width*scale,bg.height*scale);
    }
    const shade=ctx.createLinearGradient(0,0,0,h);
    shade.addColorStop(0,"rgba(0,9,15,.12)");shade.addColorStop(.23,"rgba(0,9,15,.06)");
    shade.addColorStop(.78,"rgba(0,9,15,.03)");shade.addColorStop(1,"rgba(0,9,15,.22)");
    ctx.fillStyle=shade;ctx.fillRect(0,0,w,h);
  }
  function surface(ctx,x,y,size,color,assets,alpha=1){
    const atlas=assets.get("pigments");
    if(!atlas)return;
    const sw=atlas.width/2,sh=atlas.height/2;
    ctx.save();round(ctx,x,y,size,size,Math.max(2,size*.065));ctx.clip();ctx.globalAlpha=alpha;
    ctx.drawImage(atlas,(color%2)*sw+2,Math.floor(color/2)*sh+2,sw-4,sh-4,x,y,size,size);ctx.restore();
  }
  function icon(ctx,kind,rect,color=IVORY){
    const cx=rect.x+rect.w/2,cy=rect.y+rect.h/2;
    ctx.save();ctx.translate(cx,cy);ctx.strokeStyle=color;ctx.fillStyle=color;ctx.lineWidth=1.25;ctx.lineCap="round";ctx.lineJoin="round";
    ctx.beginPath();
    if(kind==="undo"){ctx.moveTo(-3,-9);ctx.lineTo(-10,-3);ctx.lineTo(-3,3);ctx.moveTo(-10,-3);ctx.lineTo(1,-3);ctx.bezierCurveTo(14,-3,14,11,4,12);ctx.lineTo(-2,12);}
    if(kind==="restart"){ctx.arc(0,1,10,-Math.PI*.36,Math.PI*1.28);ctx.moveTo(-7,-11);ctx.lineTo(-3,-6);ctx.lineTo(-9,-3);}
    if(kind==="sound"||kind==="mute"){ctx.moveTo(-11,-4);ctx.lineTo(-6,-4);ctx.lineTo(1,-10);ctx.lineTo(1,10);ctx.lineTo(-6,4);ctx.lineTo(-11,4);ctx.closePath();if(kind==="sound"){ctx.moveTo(5,-6);ctx.quadraticCurveTo(11,0,5,6);ctx.moveTo(8,-10);ctx.quadraticCurveTo(18,0,8,10);}else{ctx.moveTo(6,-4);ctx.lineTo(13,4);ctx.moveTo(13,-4);ctx.lineTo(6,4);}}
    if(kind==="book"){ctx.moveTo(-10,-10);ctx.lineTo(-2,-8);ctx.lineTo(0,-5);ctx.lineTo(2,-8);ctx.lineTo(10,-10);ctx.lineTo(10,10);ctx.lineTo(2,12);ctx.lineTo(0,10);ctx.lineTo(-2,12);ctx.lineTo(-10,10);ctx.closePath();ctx.moveTo(0,-5);ctx.lineTo(0,10);ctx.moveTo(-6,-5);ctx.lineTo(-3,-4);ctx.moveTo(5,-5);ctx.lineTo(7,-6);ctx.lineTo(7,3);}
    ctx.stroke();ctx.restore();
  }
  function header(ctx,v){
    const {width:w,layout:l,level,levels,levelIndex,theme,game,soundEnabled}=v;
    text(ctx,"洄彩",w/2,l.titleY,l.titleSize,IVORY,"center",500);
    ctx.save();ctx.strokeStyle="rgba(188,210,202,.25)";ctx.lineWidth=.5;
    for(let i=0;i<3;i++){ctx.beginPath();ctx.ellipse(w/2,l.titleY+l.titleSize*.54,13+i*9,1.3+i*1.2,0,0,Math.PI*2);ctx.stroke();}ctx.restore();
    const title=theme.chapter+" · "+theme.title;
    text(ctx,title,w/2,l.chapterY,l.small?12:14,IVORY);
    const wing=Math.min(w*.27,ctx.measureText(title).width/2+17);
    line(ctx,l.margin+15,l.chapterY,w/2-wing,l.chapterY,GOLD,.55);
    line(ctx,w/2+wing,l.chapterY,w-l.margin-15,l.chapterY,GOLD,.55);
    diamond(ctx,w/2-wing,l.chapterY);diamond(ctx,w/2+wing,l.chapterY);
    ctx.save();ctx.strokeStyle="rgba(204,184,121,.7)";ctx.lineWidth=.65;ctx.beginPath();ctx.arc(l.book.x+22,l.book.y+22,17,0,Math.PI*2);ctx.stroke();ctx.restore();
    icon(ctx,"book",l.book);
    ctx.save();ctx.beginPath();ctx.rect(l.tabBar.x,l.tabBar.y,l.tabBar.w,l.tabBar.h+5);ctx.clip();
    levels.forEach((item,i)=>{
      const r=l.tabs[i],active=i===levelIndex;
      text(ctx,String(item.number).padStart(2,"0")+" "+item.title,r.x+r.w/2,r.y+20,active?15:13,active?"#f8df99":"#b0beb9");
      if(active){line(ctx,r.x+5,r.y+43,r.x+r.w-5,r.y+43,"#a9d5df");diamond(ctx,r.x+r.w/2,r.y+43,1.8);}
    });ctx.restore();
    line(ctx,l.margin,l.tabBar.y+43,w-l.margin,l.tabBar.y+43,GOLD,.5);
    // Secondary controls stay operable after a result, matching the existing undo behavior.
    tools(ctx,v);
  }
  function status(ctx,v){
    const {layout:l,level,game,width:w}=v,y=l.statusY;
    const target=level.colors[level.targetColor];
    ctx.fillStyle=target.value;round(ctx,l.margin+4,y-10,20,20,2);ctx.fill();
    ctx.strokeStyle="rgba(255,238,201,.55)";ctx.lineWidth=.7;ctx.stroke();
    text(ctx,"目标 · "+target.name,l.margin+34,y,14,IVORY,"left");
    text(ctx,"剩余",w-l.margin-79,y,13,MUTED,"right");
    text(ctx,String(game.movesRemaining),w-l.margin-48,y-2,31,game.movesRemaining<=1?"#f29c78":"#f3d383");
    text(ctx,"步",w-l.margin-8,y,13,MUTED);
  }
  function boardFrame(ctx,board){
    const {x,y,size:s}=board;
    ctx.save();ctx.shadowColor="rgba(0,0,0,.5)";ctx.shadowBlur=14;ctx.shadowOffsetY=5;
    const g=ctx.createLinearGradient(x,y,x+s,y+s);g.addColorStop(0,"#284447");g.addColorStop(.5,"#0b232b");g.addColorStop(1,"#345257");
    ctx.fillStyle=g;round(ctx,x-8,y-8,s+16,s+16,13);ctx.fill();ctx.restore();
    ctx.lineWidth=.8;ctx.strokeStyle="#b9aa79";round(ctx,x-8,y-8,s+16,s+16,13);ctx.stroke();
    ctx.strokeStyle="rgba(227,219,170,.58)";round(ctx,x-5,y-5,s+10,s+10,10);ctx.stroke();
    ctx.fillStyle="rgba(3,20,26,.8)";round(ctx,x-2,y-2,s+4,s+4,7);ctx.fill();
  }
  function rules(ctx,v){
    const {layout:l,level,width:w}=v,base=l.board.y+l.board.size+31;
    const lines=level.rules.slice();
    if(v.portalActive)lines[1]="◎ 已接通：两端区域将一起染色。";
    lines.forEach((s,i)=>text(ctx,s,w/2,base+i*17,l.small?11:12,i?MUTED:IVORY));
  }
  function palette(ctx,v){
    const {layout:l,level,game,hint,now}=v,t=l.tray;
    const g=ctx.createLinearGradient(t.x,t.y,t.x,t.y+t.h);g.addColorStop(0,"rgba(23,50,57,.8)");g.addColorStop(1,"rgba(5,22,29,.82)");
    ctx.fillStyle=g;round(ctx,t.x,t.y,t.w,t.h,t.h/2);ctx.fill();ctx.lineWidth=.6;ctx.strokeStyle="rgba(193,184,137,.38)";ctx.stroke();
    level.colors.forEach((color,i)=>{
      const cx=l.palette.x+i*(l.palette.size+l.palette.gap)+l.palette.size/2;
      const cy=l.palette.y+l.palette.size/2-2,r=l.palette.size*.43;
      const selected=game.selectedColor===i, hinted=hint&&hint.color===i&&now<hint.until;
      ctx.save();ctx.shadowColor="rgba(0,0,0,.55)";ctx.shadowBlur=7;ctx.shadowOffsetY=3;
      const fill=ctx.createRadialGradient(cx-r*.35,cy-r*.45,0,cx,cy,r);
      fill.addColorStop(0,color.value);fill.addColorStop(.65,color.value);fill.addColorStop(1,color.shadow);
      ctx.fillStyle=fill;ctx.beginPath();ctx.arc(cx,cy,r,0,Math.PI*2);ctx.fill();ctx.restore();
      ctx.save();ctx.beginPath();ctx.arc(cx,cy,r-1,0,Math.PI*2);ctx.clip();
      surface(ctx,cx-r,cy-r,r*2,i,v.assets,.86);ctx.restore();
      ctx.beginPath();ctx.arc(cx,cy,r,0,Math.PI*2);
      ctx.strokeStyle=selected||hinted?"#f2d58c":"#b3ba9f";ctx.lineWidth=selected?1.5:.7;ctx.stroke();
      ctx.beginPath();ctx.arc(cx,cy,r-2,0,Math.PI*2);ctx.strokeStyle="rgba(250,237,184,.4)";ctx.lineWidth=.6;ctx.stroke();
      ctx.beginPath();ctx.arc(cx,cy,r+2,0,Math.PI*2);ctx.strokeStyle=selected?"#d7b868":"rgba(176,191,176,.35)";ctx.stroke();
      ctx.beginPath();ctx.arc(cx,cy-1,r-3,Math.PI*1.08,Math.PI*1.84);ctx.strokeStyle="rgba(255,255,238,.6)";ctx.lineWidth=1;ctx.stroke();
      if(selected){ctx.fillStyle="#f0d38a";ctx.beginPath();ctx.arc(cx,cy+r+3,1.8,0,Math.PI*2);ctx.fill();}
      text(ctx,color.name,cx,l.palette.y+l.palette.size+12,l.small?11:13,selected?"#f5d789":MUTED);
    });
    rules(ctx,v);
  }
  function tools(ctx,v){
    const {layout:l,game,soundEnabled,adBusy,paintAnimation}=v;
    ctx.fillStyle="rgba(4,23,31,.79)";round(ctx,l.footer.x,l.footer.y,l.footer.w,l.footer.h,22);ctx.fill();
    ctx.strokeStyle="rgba(159,184,177,.19)";ctx.lineWidth=.7;ctx.stroke();
    icon(ctx,"undo",l.undo,game.history.length?IVORY:"#7b8985");
    icon(ctx,"restart",l.restart);icon(ctx,soundEnabled?"sound":"mute",l.sound);
    line(ctx,l.undo.x+47,l.undo.y+12,l.undo.x+47,l.undo.y+32,GOLD,.24);
    line(ctx,l.restart.x+47,l.restart.y+12,l.restart.x+47,l.restart.y+32,GOLD,.24);
    const r=l.hint,g=ctx.createLinearGradient(r.x,r.y,r.x,r.y+r.h);
    g.addColorStop(0,"rgba(85,128,142,.74)");g.addColorStop(1,"rgba(34,75,92,.84)");
    ctx.fillStyle=g;round(ctx,r.x,r.y,r.w,r.h,22);ctx.fill();ctx.strokeStyle="rgba(214,211,170,.75)";ctx.lineWidth=.7;ctx.stroke();
    ctx.fillStyle=paintAnimation||adBusy?"#8d9c9b":IVORY;
    round(ctx,r.x+17,r.y+14,17,15,2);ctx.fill();
    ctx.fillStyle="#315363";ctx.beginPath();ctx.moveTo(r.x+23,r.y+17);ctx.lineTo(r.x+23,r.y+26);ctx.lineTo(r.x+29,r.y+21.5);ctx.closePath();ctx.fill();
    text(ctx,adBusy?"准备视频…":"观看提示",r.x+79,r.y+22,14,IVORY);
  }
  function album(ctx,v){
    const {width:w,height:h,levels,levelIndex,layout:l}=v;
    ctx.fillStyle="rgba(0,9,15,.8)";ctx.fillRect(0,0,w,h);
    const x=18,pw=w-36,top=Math.max(70,(h-376)/2),cell=(pw-32)/4;
    ctx.fillStyle="#102a32";round(ctx,x,top,pw,376,18);ctx.fill();ctx.strokeStyle=GOLD;ctx.lineWidth=.8;ctx.stroke();
    text(ctx,"二十幅 · 关卡册",w/2,top+30,20);
    text(ctx,"轻点选关 · 画面外关闭",w/2,top+57,11,MUTED);
    l.albumTabs=levels.map((item,i)=>{
      const r={x:x+16+(i%4)*cell,y:top+82+Math.floor(i/4)*54,w:cell-8,h:46};
      if(i===levelIndex){ctx.fillStyle="rgba(177,158,97,.2)";round(ctx,r.x,r.y,r.w,r.h,6);ctx.fill();}
      text(ctx,String(item.number).padStart(2,"0"),r.x+r.w/2,r.y+12,10,GOLD);
      text(ctx,item.title,r.x+r.w/2,r.y+32,13,i===levelIndex?"#f6daa0":IVORY);return r;
    });
  }
  return {createLayout,createAssets,background,header,status,boardFrame,palette,album,surface,safeInsets};
});
