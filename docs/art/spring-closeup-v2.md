# 唤泉近景样张 v2

状态：独立开发预览，未接入小游戏运行时，不进入平台构建。入口为 `story-preview.html`。未批量制作后四幕。

来源：内置 image_gen，原始输出 exec-b10064d9-d3ca-43a8-9755-94d677b78655.png，完整复制为 spring-closeup-v2.png。实际尺寸 1086 × 1448，3:4。未拉伸、重绘或压缩。

构图：手掌大小的石窝，叶片、水滴与出水口。画外排版，避免文字盖住主体。短屏缩小插画，极小屏允许纵向滚动。PNG 为验收原图，量产接入前需另行压缩与真机测试。

## 最终提示词

## 预览检查

- 已在真实浏览器渲染检查，1280 × 720 视口内为 430px 宽章节列，短屏插画 260 × 347px。叶片、水滴、出水口均可见，文字与按钮不覆盖插画，按钮与页脚完整显示。
- 浏览器另一个预览标签已到达 `preview.html?level=0`；未将此当作自动点击测试证据。
- 使用 game-visual-qa 的有限范围排版检查，不对 WIP 样张做整游戏评分。STATUS: DONE_WITH_CONCERNS。真机、安全区、多尺寸适配、加载性能和主观画风验收仍待验证。Next Step: 样张确认后再进行 asset-review 与平台接入。
- 当前环境未使用 gstack-game 的全局遥测/报告辅助，证据保留在本项目文档。

### 生成提示词（内置 image_gen）

Use case: illustration-story. Asset type: portrait chapter illustration for a mobile watercolor puzzle game, chapter one 'Awakening the Spring'. Create a vertical 3:4 illustration (1152x1536), no text or UI. Extreme intimate close-up, looking obliquely down at one small shallow water-filled hollow in a rounded mossy stone. The entire visible world is only about a handspan wide. One clearly recognizable little warm golden-green leaf floats on luminous pale turquoise water at the focal center, large enough to read on a small phone card (leaf about 18% of image width). A single clear droplet falls from a short mossy stone lip above, with a delicate circular ripple beside the leaf. The water gently finds a tiny outlet at the bottom edge, hinting at a future journey. Simple rounded stone forms occupy the margins, a few soft moss patches only. Tender hand-painted children's storybook gouache and watercolor, warm ivory paper grain, soft sage green, jade and turquoise, restrained warm gold, large simplified shapes, clear subject separation, peaceful tactile softness. Highest contrast around leaf and water ripple, edges quieter. Full-bleed painting; no frame. Absolutely NO panorama, mountains, sky, horizon, valley, ocean, architecture, epic fantasy scale, humans, flowers, glitter, dense botanical detail, photorealism, words, lettering, watermark. This is the very small beginning of a journey that will reach the sea much later.
