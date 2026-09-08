"use strict";
const assert=require("node:assert/strict");
const UI=require("../src/night-ui.js");
const {levels}=require("../src/level.js");
const fs=require("node:fs");
const path=require("node:path");
for(const [width,height,insets] of [[390,844,{top:0,bottom:0}],[390,844,{top:44,bottom:34}],[375,667,{top:20,bottom:0}],[320,568,{top:0,bottom:0}]]){
  for(const level of levels){
    const l=UI.createLayout(width,height,level,levels,0,insets);
    assert.ok(l.titleY-l.titleSize/2>=insets.top);
    assert.ok(l.book.y>=insets.top);
    assert.ok(l.tabBar.y+l.tabBar.h<l.statusY-10);
    assert.ok(l.statusY+16<l.board.y);
    assert.ok(l.board.size>190);
    assert.ok(l.board.y+l.board.size+50<l.tray.y);
    assert.ok(l.tray.y+l.tray.h<=l.footer.y-4,"短屏颜料盘不得与工具栏重叠");
    assert.ok(l.footer.y+l.footer.h<=height-insets.bottom-12);
    for(const key of ["undo","restart","sound","hint","book"]){
      assert.ok(l[key].w>=44&&l[key].h>=44);
      assert.ok(l[key].x>=0&&l[key].x+l[key].w<=width);
    }
    assert.ok(l.sound.x+l.sound.w+8<=l.hint.x);
  }
}
assert.deepEqual(UI.safeInsets({windowHeight:844,screenHeight:844,safeArea:{top:44,bottom:810}}),{top:44,bottom:34});
assert.deepEqual(UI.safeInsets({windowHeight:667}),{top:0,bottom:0});
let created=0;
const assets=UI.createAssets({createImage(){created++;return {width:800,height:1600,set src(value){this.path=value;this.onload();}};}});
for(const kind of ["spring","creek","river","coast","sea","pigments"]){
  const first=assets.get(kind);
  assert.equal(first,assets.get(kind),"贴图只应加载一次");
  assert.equal(fs.existsSync(path.resolve(__dirname,"..",first.path)),true);
}
assert.equal(created,6);
assert.equal(UI.createAssets({}).get("creek"),null,"无图片API时应保留纯色可玩回退");
const failed=UI.createAssets({createImage(){return {set src(value){this.onerror();}};}});
assert.equal(failed.get("creek"),null,"加载失败不应阻断棋盘绘制");
console.log("NIGHT_UI_TEST=PASS (20 levels x 4 viewport/inset cases; cached assets; graceful fallback)");
