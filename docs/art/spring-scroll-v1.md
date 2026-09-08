# 洄彩连续画卷样例（已退出主入口）

状态：概念实验存档。`story-preview.html` 已改为纯画板入口，不再加载长卷、叶子跟镜和局部复色流程。

来源：本轮内置 imagegen 生成；原始文件 exec-d8bd82d1-4032-402d-93bf-47b97f1cd9f7.png。复制原图到 spring-scroll-v1.png，没有离线重绘或裁切。

实际尺寸 724 × 2172（1:3）。这是第一程样例，不是覆盖 20 关的生产级巨幅资产。

## 生成提示词

Use case: illustration-story. Create one continuous vertical watercolor scroll painting, aspect ratio 1:3, requested 1024x3072, for a mobile game camera to travel DOWN a tiny spring into a creek. Fully colored original artwork, no grayscale areas. Oblique overhead view, NO sky or horizon. At the TOP 5-28%: one intimate shallow round turquoise spring hollow in mossy pale stone, a dripping stone lip, spring centered x=50%, y=20%. It narrows into an outlet at x=52%, y=32%. MIDDLE 30-65%: the SAME connected narrow watercourse runs down through an S bend among just a few rounded rocks, passing x=58%,y=44%, then x=43%,y=55%, then x=50%,y=66%. BOTTOM 65-100%: that SAME creek gently widens into a quiet pool, x=52%,y=82%, a few soft grasses at the banks, exits bottom center. This is ONE seamless continuous place at consistent close-up scale, not stacked panels, not separate illustrations, not a grand mountain scene. Waterway must be continuous and visibly navigable along the specified central route. Warm ivory paper, luminous jade and turquoise water, soft sage moss, modest honey-gold sunlight, large clean forms, delicate hand-painted watercolor/gouache with controlled paper texture, reduced detail in water. No floating leaves (hero leaf animated separately), no people, no buildings, no UI, no writing, no black borders, no montage. Keep all important waterway features in central 60% width for portrait camera crops.

## 实现边界

- 同一原图生成运行时灰度底层和彩色局部遮罩，避免双图错位。
- 小叶使用既有 spring-leaf-v3.png 透明资源，与镜头共享画卷坐标。
- 第 0 关「初染」真实胜利事件驱动泉眼复色，然后自动跟镜到溪流，浮出第 1 关「聚流」（复用现有四步关卡）。
- 第 1 关胜利恢复下游颜色，第一关的遮罩保持完成状态；小叶随后进入下方浅潭。当前到这里结束，没有第三关或大海资产。
- 第二关重试只重置当前谜题，不重置画卷已恢复的颜色。刷新/重走仍从零开始，尚未增加持久化存档。
- 回望画卷展示保留的复色区域。重走按钮显式重载本样例。
- 当前仅用于 story-preview.html 浏览器样例，尚未接入微信/抖音原生平台构建；真机内存、帧率和画质未验证。
