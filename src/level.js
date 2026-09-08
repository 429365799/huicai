(function (root, factory) {
  const api = factory();
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
  root.PaletteGameLevel = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const colors = [
    { name: "珊瑚", value: "#EF754E", shadow: "#A4432D" },
    { name: "晴蓝", value: "#3E9DCF", shadow: "#256684" },
    { name: "蜜柚", value: "#F3C331", shadow: "#B18022" },
    { name: "青芽", value: "#71B75F", shadow: "#3C723D" },
  ];

  const legacyLevels = [
      {
        id: "garden-01",
        difficulty: "简单",
        chapter: "晨光花园",
        title: "初绽",
        rows: 6,
        cols: 6,
        targetColor: 1,
        moveLimit: 3,
        initialColor: 2,
        colors,
        board: [
          [-1, 0, 0, 1, 1, -1],
          [0, 0, 2, 2, 1, 1],
          [0, 3, 2, 1, 1, 1],
          [3, 3, 2, 2, 0, 1],
          [3, 2, 2, 0, 0, 0],
          [-1, 3, 3, 0, 0, -1],
        ],
      },
      {
        id: "garden-02",
        difficulty: "困难",
        chapter: "交织花庭",
        title: "回环",
        rows: 10,
        cols: 10,
        targetColor: 3,
        moveLimit: 5,
        initialColor: 0,
        mechanicNote: "五次调色，让交织的色块汇成一片青芽",
        colors,
        board: [
          [2, 2, 2, 3, 3, 3, 0, 0, 0, 0],
          [2, 2, -2, 0, 3, 3, 0, 0, 0, 2],
          [2, 1, 1, 0, 0, 2, 2, -2, 2, 3],
          [2, 1, 1, 1, 0, 2, 2, 2, 3, 3],
          [1, 1, 2, 2, -2, 1, 1, 1, 3, 3],
          [2, 2, 2, 2, 2, 2, 1, 1, 0, 0],
          [1, -2, 2, 2, 2, 2, 2, 1, 1, 0],
          [1, 1, 1, 1, 2, 2, 2, -2, 3, 1],
          [3, 3, 1, 1, -2, 2, 0, 3, 3, 1],
          [3, 3, 3, 1, 1, 0, 0, 0, 1, 1],
        ],
      },
      {
        id: "garden-03",
        difficulty: "挑战",
        chapter: "霞光温室",
        title: "盛放",
        rows: 6,
        cols: 6,
        targetColor: 0,
        moveLimit: 5,
        initialColor: 1,
        colors,
        board: [
          [-1, 1, 3, 0, 3, -1],
          [3, 3, 1, 1, 0, 0],
          [3, 2, 1, 0, 0, 0],
          [2, 2, 1, 1, 3, 0],
          [2, 1, 1, 3, 3, 3],
          [-1, 2, 2, 3, 3, -1],
        ],
      },
    ];
  const challenges = typeof require === "function" ? require("./challenge-levels.js") : globalThis.PaletteChallenges;
  const introduction = {
    ...legacyLevels[0],
    id: "intro-00", number: 0, title: "初染", chapter: "泉醒", mechanic: "intro",
    mechanics: ["expand"], focus: "初次落笔", story: "石罅里的一滴泉水，等你为它染回第一抹颜色。",
    rules: ["先选下方颜料，再点画中的一片色块。", "把所有色块变成晴蓝，就完成了。"],
  };
  return { colors, legacyLevels, levels: [introduction, ...challenges.map((item, index) => ({
    ...item,
    colors,
    rows: item.board.length,
    cols: item.board[0].length,
    initialColor: 0,
    difficulty: item.difficulty,
    number: index + 1,
  }))] };
});
