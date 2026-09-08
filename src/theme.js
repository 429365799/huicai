(function(root,factory){const api=factory();if(typeof module!=="undefined"&&module.exports)module.exports=api;root.PaletteTheme=api;})(typeof globalThis!=="undefined"?globalThis:this,function(){
  "use strict";
  const scenes=[
    ["泉醒","石罅初泉","spring"],["泉醒","苔盏","spring"],["泉醒","滴石","spring"],["泉醒","浅漪","spring"],
    ["涧行","芦岸","creek"],["涧行","萤汀","creek"],["涧行","雨渡","creek"],["涧行","荷影","creek"],
    ["河声","山溪","river"],["河声","石桥","river"],["河声","竹湾","river"],["河声","归舟","river"],
    ["潮生","潮痕","coast"],["潮生","风礁","coast"],["潮生","海门","coast"],["潮生","星湾","coast"],
    ["入海","远帆","sea"],["入海","月潮","sea"],["入海","曙海","sea"],["入海","万色归流","sea"],
  ];
  const palettes={
    spring:["#152322","#29413d","#69766b","#b7b69c"],creek:["#142326","#274149","#607b78","#b7b69b"],
    river:["#172126","#35464c","#687876","#b7ad8b"],coast:["#171f27","#334653","#647785","#b9af8e"],sea:["#121b24","#293e50","#587188","#c0b487"],
  };
  const themes=scenes.map(([chapter,title,kind],index)=>({number:index,chapter,title,kind,palette:palettes[kind]}));
  return {themes,get(index){return themes[Math.max(0,Math.min(themes.length-1,index|0))];}};
});
