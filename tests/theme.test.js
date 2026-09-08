"use strict";
const assert=require("node:assert/strict");
const Theme=require("../src/theme");
assert.equal(Theme.themes.length,20);
assert.equal(new Set(Theme.themes.map(t=>t.title)).size,20);
assert.deepEqual(Theme.themes.map(t=>t.chapter),["泉醒","泉醒","泉醒","泉醒","涧行","涧行","涧行","涧行","河声","河声","河声","河声","潮生","潮生","潮生","潮生","入海","入海","入海","入海"]);
for(const [i,t] of Theme.themes.entries()){assert.equal(t.number,i);assert.equal(t.palette.length,4);assert.ok(["spring","creek","river","coast","sea"].includes(t.kind));}
console.log("PALETTE_THEME_TEST=PASS (20 unique scenes across 5 chapters)");
