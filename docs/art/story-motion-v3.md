# 入画动效 v3（开发样例）

## 已实现
- 分层水面与透明叶片，不移动整张插画。
- 按钮触点墨色扩张，小叶沿水池向出水口移动与转向，附带一次涟漪及一条水流线。
- 1000ms 起按第 0 关真实棋盘的四邻接 BFS 距离局部揭示；1860ms 后不规则湿边扩展至操作区；2650ms 交出输入。
- 普通模式不对 main 或 iframe 做整体透明度交叉淡化。只有文案短淡出；简化模式明确为 200ms 淡化。
- 加载检查、防重入、返回重看、后台暂停、resize 重测坐标。
- 保持浏览器实验，未接入 wx/tt，未改通关彩带，未重做正式封面。
- 仅 ?motion-debug=1 暴露中间帧按钮和 seek；正常入口不含调试 UI。

## 证据与边界
- 浏览器实看起始、800ms、1500ms、2100ms：原叶位无残影，独立叶片已向下移动；1500ms 仅下部及相邻棋盘区域显露，顶部插画仍完整；2100ms 向外围展开。
- 800ms 检查发现叶片靠左石沿，已收窄轨迹并加强近出水口的缩小幅度。
- node tests/story-flow.test.js 通过：四邻接覆盖、无重复、显影半径单调、轨迹有界。
- npm test 全部通过（现有核心/求解/关卡/应用/音效/构建回归，不等同新增动效性能验收）。
- 尚未验证真机性能、全部屏幕尺寸、用户主观观感。叶片仍为单张平面旋转，非流体物理模拟；显影是局部遮罩，不是实际执行染色操作。

## 生成资产
内置 image_gen 编辑原图 spring-closeup-v2.png，原图保留。未使用 CLI 或代码改图。
- spring-water-v3.png：exec-e6aafbc8-a42c-4bde-be85-292657b895e9.png
- spring-leaf-v3.png：exec-38d2e7c0-146b-49b4-aba8-dfe22fbea9be.png
- sips 确认 leaf hasAlpha=yes；浏览器合成未见矩形底色。

### 水面提示词
Use case: precise-object-edit. Edit the provided portrait watercolor illustration into a clean background plate for animation. Remove ONLY the golden leaf in the middle and its leaf-shaped shadow/wake, reconstruct seamless turquoise watercolor water beneath it. Preserve the exact camera, stone borders, moss, upper droplet and its circular ripples, bottom outlet, colors, lighting and composition. No new objects. Keep same 3:4 portrait proportions, no text.

### 小叶提示词
Use case: background-extraction. Extract ONLY the single golden-green watercolor leaf from the provided illustration as a standalone game sprite on a genuinely TRANSPARENT background (alpha). Preserve its hand-painted style, veins, serrated outline, stem and orientation (stem bottom left, tip upper right). No water, no rocks, no shadow, no ripple, no background or checkerboard. Center the leaf with tight approximately 8% transparent padding, landscape canvas. One leaf only.
