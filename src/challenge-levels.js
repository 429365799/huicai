(function (root, factory) {
  const levels = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = levels;
  root.PaletteChallenges = levels;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  // 19 fixed campaign puzzles plus intro-00 in level.js = 20 levels.
  // Authoring seeds, solutions and mechanic-ablation evidence live in docs/.
  // No generation or difficulty search runs on startup.
  return [
  {
    "id": "river-01",
    "number": 1,
    "title": "相映",
    "mechanic": "expand",
    "board": [
      [
        2,
        2,
        3,
        2,
        2,
        2
      ],
      [
        2,
        2,
        3,
        3,
        2,
        2
      ],
      [
        2,
        2,
        3,
        3,
        3,
        0
      ],
      [
        2,
        3,
        3,
        3,
        0,
        0
      ],
      [
        1,
        1,
        3,
        3,
        0,
        0
      ],
      [
        1,
        3,
        3,
        3,
        3,
        0
      ]
    ],
    "targetColor": 0,
    "moveLimit": 3,
    "portals": [],
    "chapter": "泉醒",
    "difficulty": "进阶",
    "mechanics": [
      "expand"
    ],
    "focus": "同色相接",
    "story": "一滴水落进苔盏，两片颜色第一次相映。",
    "rules": [
      "四向相邻的同色块会一起染色。",
      "换一种颜色，接上身旁的另一片。"
    ]
  },
  {
    "id": "river-02",
    "number": 2,
    "title": "汇色",
    "mechanic": "expand",
    "board": [
      [
        2,
        2,
        0,
        0,
        1,
        1
      ],
      [
        1,
        1,
        1,
        0,
        1,
        0
      ],
      [
        1,
        1,
        0,
        0,
        0,
        0
      ],
      [
        3,
        0,
        2,
        2,
        2,
        0
      ],
      [
        3,
        0,
        0,
        2,
        2,
        1
      ],
      [
        0,
        0,
        0,
        2,
        2,
        1
      ]
    ],
    "targetColor": 3,
    "moveLimit": 4,
    "portals": [],
    "chapter": "泉醒",
    "difficulty": "进阶",
    "mechanics": [
      "expand"
    ],
    "focus": "一笔汇流",
    "story": "水珠越过滴石，散开的水色汇向一处。",
    "rules": [
      "留意能同时接上几片颜色的位置。",
      "连成的大色块，还能继续换色。"
    ]
  },
  {
    "id": "river-03",
    "number": 3,
    "title": "聚流",
    "mechanic": "expand",
    "board": [
      [
        2,
        0,
        0,
        3,
        3,
        3,
        2,
        2
      ],
      [
        2,
        2,
        2,
        1,
        3,
        3,
        3,
        2
      ],
      [
        0,
        2,
        3,
        1,
        1,
        3,
        3,
        2
      ],
      [
        0,
        0,
        3,
        1,
        1,
        1,
        3,
        3
      ],
      [
        3,
        1,
        0,
        1,
        1,
        1,
        0,
        0
      ],
      [
        3,
        1,
        0,
        0,
        1,
        0,
        0,
        0
      ],
      [
        2,
        2,
        0,
        0,
        0,
        0,
        0,
        0
      ],
      [
        2,
        2,
        2,
        2,
        0,
        0,
        0,
        0
      ]
    ],
    "targetColor": 2,
    "moveLimit": 4,
    "portals": [],
    "chapter": "泉醒",
    "difficulty": "章末挑战",
    "mechanics": [
      "expand"
    ],
    "focus": "选择起点",
    "story": "泉面泛起浅漪，几条细流终于找到彼此。",
    "rules": [
      "先找能接上多条支流的落笔处。",
      "让同一片颜色越染越大。"
    ]
  },
  {
    "id": "river-04",
    "number": 4,
    "title": "借色",
    "mechanic": "return",
    "board": [
      [
        1,
        1,
        1,
        3,
        3,
        0
      ],
      [
        0,
        1,
        1,
        3,
        3,
        2
      ],
      [
        0,
        1,
        1,
        3,
        3,
        2
      ],
      [
        1,
        2,
        2,
        3,
        3,
        1
      ],
      [
        1,
        0,
        0,
        1,
        0,
        1
      ],
      [
        2,
        0,
        0,
        1,
        0,
        0
      ]
    ],
    "targetColor": 1,
    "moveLimit": 4,
    "portals": [],
    "chapter": "涧行",
    "difficulty": "机制入门",
    "mechanics": [
      "expand",
      "return"
    ],
    "focus": "再次借色",
    "story": "水来到芦岸，借过的颜色还要再借一次。",
    "rules": [
      "用过的颜色，也能再借一次。",
      "长大后的色块会遇到新的邻居。"
    ]
  },
  {
    "id": "river-05",
    "number": 5,
    "title": "回环",
    "mechanic": "return",
    "board": [
      [
        2,
        2,
        3,
        3,
        1,
        1,
        1,
        1
      ],
      [
        2,
        2,
        2,
        0,
        1,
        1,
        1,
        1
      ],
      [
        1,
        2,
        1,
        0,
        3,
        3,
        1,
        3
      ],
      [
        1,
        1,
        1,
        0,
        2,
        1,
        3,
        3
      ],
      [
        1,
        3,
        1,
        2,
        2,
        3,
        3,
        3
      ],
      [
        1,
        3,
        1,
        1,
        2,
        3,
        3,
        2
      ],
      [
        1,
        3,
        2,
        2,
        1,
        1,
        2,
        2
      ],
      [
        1,
        2,
        2,
        1,
        1,
        1,
        2,
        2
      ]
    ],
    "targetColor": 1,
    "moveLimit": 4,
    "portals": [],
    "chapter": "涧行",
    "difficulty": "进阶",
    "mechanics": [
      "expand",
      "return"
    ],
    "focus": "回色搭桥",
    "story": "萤光映着弯水，旧色在另一处等你。",
    "rules": [
      "有些色块，要绕一圈才能相遇。",
      "试着回到之前用过的颜色。"
    ]
  },
  {
    "id": "river-06",
    "number": 6,
    "title": "渡色",
    "mechanic": "return",
    "board": [
      [
        2,
        2,
        2,
        2,
        2,
        0,
        0,
        2
      ],
      [
        1,
        2,
        2,
        2,
        2,
        2,
        2,
        0
      ],
      [
        1,
        3,
        3,
        1,
        1,
        1,
        1,
        0
      ],
      [
        3,
        3,
        2,
        1,
        1,
        1,
        3,
        3
      ],
      [
        0,
        2,
        2,
        2,
        1,
        0,
        3,
        3
      ],
      [
        0,
        0,
        2,
        2,
        0,
        0,
        1,
        1
      ],
      [
        0,
        1,
        1,
        1,
        0,
        0,
        1,
        1
      ],
      [
        3,
        1,
        1,
        1,
        1,
        0,
        0,
        0
      ]
    ],
    "targetColor": 0,
    "moveLimit": 5,
    "portals": [],
    "chapter": "涧行",
    "difficulty": "进阶",
    "mechanics": [
      "expand",
      "return"
    ],
    "focus": "越染越广",
    "story": "雨渡两岸渐远，长大的水色才够得到远处。",
    "rules": [
      "眼前接得最多，不一定走得最远。",
      "看看换色之后，又能接到哪里。"
    ]
  },
  {
    "id": "river-07",
    "number": 7,
    "title": "回澜",
    "mechanic": "return",
    "board": [
      [
        2,
        1,
        1,
        1,
        0,
        1,
        1,
        1
      ],
      [
        2,
        2,
        1,
        1,
        0,
        1,
        1,
        1
      ],
      [
        2,
        2,
        1,
        1,
        0,
        1,
        3,
        1
      ],
      [
        0,
        0,
        2,
        2,
        1,
        3,
        3,
        1
      ],
      [
        0,
        0,
        2,
        2,
        2,
        1,
        0,
        0
      ],
      [
        0,
        0,
        0,
        2,
        2,
        3,
        0,
        1
      ],
      [
        2,
        2,
        2,
        0,
        3,
        3,
        3,
        1
      ],
      [
        2,
        2,
        0,
        0,
        3,
        3,
        3,
        1
      ]
    ],
    "targetColor": 3,
    "moveLimit": 5,
    "portals": [],
    "chapter": "涧行",
    "difficulty": "章末挑战",
    "mechanics": [
      "expand",
      "return"
    ],
    "focus": "回色试炼",
    "story": "荷影下的回澜，把错开的支流重新接起。",
    "rules": [
      "把回色留给恰当的时机。",
      "五笔之内，让支流汇成一片。"
    ]
  },
  {
    "id": "river-08",
    "number": 8,
    "title": "砚痕",
    "mechanic": "obstacle",
    "board": [
      [
        2,
        2,
        3,
        2,
        0,
        0
      ],
      [
        1,
        1,
        -2,
        2,
        2,
        2
      ],
      [
        1,
        1,
        2,
        1,
        2,
        2
      ],
      [
        1,
        1,
        0,
        1,
        1,
        2
      ],
      [
        1,
        0,
        0,
        1,
        1,
        1
      ],
      [
        0,
        0,
        1,
        1,
        1,
        1
      ]
    ],
    "targetColor": 0,
    "moveLimit": 4,
    "portals": [],
    "chapter": "河声",
    "difficulty": "机制入门",
    "mechanics": [
      "expand",
      "obstacle"
    ],
    "focus": "认清砚石",
    "story": "山溪遇见第一块砚石，泉水学着绕行。",
    "rules": [
      "深色砚石不能染色，也不传色。",
      "沿四向找绕路，斜角不相连。"
    ]
  },
  {
    "id": "river-09",
    "number": 9,
    "title": "疏径",
    "mechanic": "obstacle",
    "board": [
      [
        0,
        2,
        2,
        2,
        2,
        2,
        0,
        0
      ],
      [
        0,
        0,
        -2,
        2,
        2,
        3,
        0,
        0
      ],
      [
        3,
        3,
        2,
        3,
        3,
        0,
        0,
        0
      ],
      [
        3,
        3,
        2,
        3,
        3,
        0,
        0,
        0
      ],
      [
        3,
        3,
        2,
        3,
        0,
        0,
        0,
        1
      ],
      [
        3,
        3,
        2,
        3,
        3,
        0,
        1,
        1
      ],
      [
        3,
        3,
        2,
        2,
        3,
        -2,
        1,
        1
      ],
      [
        3,
        3,
        2,
        2,
        3,
        3,
        3,
        3
      ]
    ],
    "targetColor": 1,
    "moveLimit": 4,
    "portals": [],
    "chapter": "河声",
    "difficulty": "进阶",
    "mechanics": [
      "expand",
      "obstacle"
    ],
    "focus": "寻找绕路",
    "story": "石桥遮住近路，桥下仍藏着相连的水脉。",
    "rules": [
      "砚石把近邻隔开，远处仍有路。",
      "先接桥头，再连另一岸。"
    ]
  },
  {
    "id": "river-10",
    "number": 10,
    "title": "曲岸",
    "mechanic": "obstacle",
    "board": [
      [
        3,
        2,
        2,
        1,
        1,
        2,
        2,
        2
      ],
      [
        3,
        3,
        -2,
        2,
        2,
        3,
        0,
        0
      ],
      [
        2,
        2,
        0,
        0,
        0,
        0,
        -2,
        1
      ],
      [
        2,
        2,
        0,
        0,
        0,
        0,
        1,
        1
      ],
      [
        3,
        3,
        2,
        1,
        1,
        0,
        2,
        2
      ],
      [
        3,
        3,
        2,
        1,
        1,
        2,
        2,
        2
      ],
      [
        0,
        3,
        2,
        2,
        2,
        -2,
        0,
        2
      ],
      [
        0,
        3,
        3,
        2,
        2,
        0,
        0,
        0
      ]
    ],
    "targetColor": 1,
    "moveLimit": 5,
    "portals": [],
    "chapter": "河声",
    "difficulty": "进阶",
    "mechanics": [
      "expand",
      "return",
      "obstacle"
    ],
    "focus": "绕石回色",
    "story": "竹湾几度转折，回色才能绕到另一侧。",
    "rules": [
      "先绕过砚石，再借旧色搭桥。",
      "不要急着把每片都染成目标色。"
    ]
  },
  {
    "id": "river-11",
    "number": 11,
    "title": "绕石",
    "mechanic": "obstacle",
    "board": [
      [
        0,
        3,
        3,
        3,
        1,
        1,
        1,
        0,
        0,
        1
      ],
      [
        0,
        0,
        -2,
        0,
        0,
        1,
        1,
        0,
        0,
        0
      ],
      [
        0,
        2,
        2,
        0,
        0,
        0,
        2,
        2,
        -2,
        0
      ],
      [
        0,
        2,
        2,
        0,
        0,
        0,
        3,
        0,
        0,
        2
      ],
      [
        3,
        2,
        2,
        2,
        2,
        3,
        3,
        0,
        0,
        0
      ],
      [
        3,
        3,
        0,
        0,
        0,
        0,
        3,
        0,
        0,
        0
      ],
      [
        3,
        3,
        3,
        1,
        1,
        1,
        1,
        1,
        1,
        2
      ],
      [
        3,
        -2,
        3,
        1,
        1,
        1,
        1,
        1,
        2,
        2
      ],
      [
        3,
        3,
        3,
        3,
        1,
        2,
        2,
        -2,
        2,
        2
      ],
      [
        3,
        3,
        3,
        3,
        2,
        2,
        2,
        2,
        2,
        2
      ]
    ],
    "targetColor": 0,
    "moveLimit": 5,
    "portals": [],
    "chapter": "河声",
    "difficulty": "章末挑战",
    "mechanics": [
      "expand",
      "return",
      "obstacle"
    ],
    "focus": "曲岸试炼",
    "story": "归舟穿过曲岸，把沿途支流收进同一条河。",
    "rules": [
      "四颗砚石之间，仍有连片的路。",
      "看清回色顺序，再落下第一笔。"
    ]
  },
  {
    "id": "river-12",
    "number": 12,
    "title": "遥应",
    "mechanic": "portal",
    "board": [
      [
        3,
        2,
        2,
        0,
        0,
        0
      ],
      [
        2,
        1,
        3,
        3,
        0,
        0
      ],
      [
        1,
        1,
        1,
        3,
        3,
        3
      ],
      [
        1,
        1,
        1,
        3,
        3,
        3
      ],
      [
        3,
        3,
        3,
        2,
        2,
        2
      ],
      [
        1,
        1,
        1,
        2,
        2,
        2
      ]
    ],
    "targetColor": 1,
    "moveLimit": 4,
    "portals": [
      [
        [
          1,
          1
        ],
        [
          4,
          4
        ]
      ]
    ],
    "chapter": "潮生",
    "difficulty": "机制入门",
    "mechanics": [
      "expand",
      "portal"
    ],
    "focus": "接通双生",
    "story": "河水抵达潮痕，远近两点第一次相互回应。",
    "rules": [
      "两个 ◎ 同色时，两端连为一片。",
      "先让它们同色，再一起换色。"
    ]
  },
  {
    "id": "river-13",
    "number": 13,
    "title": "牵光",
    "mechanic": "portal",
    "board": [
      [
        1,
        1,
        1,
        0,
        1,
        1,
        1,
        0
      ],
      [
        1,
        1,
        1,
        0,
        1,
        0,
        0,
        1
      ],
      [
        0,
        1,
        1,
        0,
        0,
        0,
        0,
        1
      ],
      [
        0,
        0,
        0,
        0,
        0,
        0,
        1,
        1
      ],
      [
        0,
        2,
        0,
        0,
        3,
        1,
        1,
        1
      ],
      [
        2,
        2,
        0,
        0,
        3,
        3,
        3,
        3
      ],
      [
        2,
        2,
        0,
        0,
        3,
        3,
        2,
        2
      ],
      [
        1,
        1,
        1,
        0,
        3,
        3,
        2,
        2
      ]
    ],
    "targetColor": 3,
    "moveLimit": 4,
    "portals": [
      [
        [
          1,
          1
        ],
        [
          6,
          6
        ]
      ]
    ],
    "chapter": "潮生",
    "difficulty": "进阶",
    "mechanics": [
      "expand",
      "portal"
    ],
    "focus": "远端借路",
    "story": "风礁之间，双生的水纹替你牵起远岸。",
    "rules": [
      "远端的 ◎ 也能成为下一座桥。",
      "接通之后，任意一端都能落笔。"
    ]
  },
  {
    "id": "river-14",
    "number": 14,
    "title": "共鸣",
    "mechanic": "portal",
    "board": [
      [
        0,
        0,
        3,
        3,
        3,
        3,
        0,
        0
      ],
      [
        0,
        0,
        -2,
        3,
        0,
        0,
        0,
        0
      ],
      [
        0,
        0,
        1,
        0,
        0,
        0,
        3,
        3
      ],
      [
        2,
        3,
        1,
        1,
        1,
        1,
        3,
        3
      ],
      [
        2,
        3,
        2,
        2,
        0,
        0,
        1,
        1
      ],
      [
        2,
        3,
        1,
        1,
        0,
        0,
        1,
        1
      ],
      [
        0,
        0,
        3,
        1,
        1,
        -2,
        1,
        2
      ],
      [
        0,
        0,
        3,
        1,
        3,
        1,
        2,
        2
      ]
    ],
    "targetColor": 3,
    "moveLimit": 5,
    "portals": [
      [
        [
          1,
          1
        ],
        [
          6,
          6
        ]
      ]
    ],
    "chapter": "潮生",
    "difficulty": "进阶",
    "mechanics": [
      "expand",
      "return",
      "obstacle",
      "portal"
    ],
    "focus": "绕石传色",
    "story": "海门被砚石分开，传色的水脉仍能通过。",
    "rules": [
      "砚石挡路时，试着从 ◎ 借路。",
      "回色可把远近支流一起接回来。"
    ]
  },
  {
    "id": "river-15",
    "number": 15,
    "title": "双生",
    "mechanic": "portal",
    "board": [
      [
        0,
        2,
        2,
        1,
        1,
        0,
        3,
        3
      ],
      [
        1,
        1,
        -2,
        1,
        1,
        0,
        3,
        3
      ],
      [
        3,
        3,
        2,
        1,
        0,
        0,
        -2,
        0
      ],
      [
        3,
        1,
        2,
        0,
        0,
        0,
        3,
        0
      ],
      [
        1,
        1,
        1,
        0,
        0,
        3,
        3,
        3
      ],
      [
        2,
        3,
        2,
        2,
        0,
        3,
        3,
        3
      ],
      [
        2,
        0,
        2,
        2,
        3,
        -2,
        0,
        0
      ],
      [
        2,
        0,
        2,
        3,
        3,
        3,
        0,
        0
      ]
    ],
    "targetColor": 3,
    "moveLimit": 5,
    "portals": [
      [
        [
          1,
          1
        ],
        [
          6,
          6
        ]
      ]
    ],
    "chapter": "潮生",
    "difficulty": "章末挑战",
    "mechanics": [
      "expand",
      "return",
      "obstacle",
      "portal"
    ],
    "focus": "双生试炼",
    "story": "星湾两岸遥相映照，旧色成为新的归路。",
    "rules": [
      "绕石、回色、传色，需要排好顺序。",
      "先看两端各自接着哪些颜色。"
    ]
  },
  {
    "id": "river-16",
    "number": 16,
    "title": "落笔",
    "mechanic": "prepare",
    "board": [
      [
        0,
        2,
        0,
        0,
        1,
        1
      ],
      [
        2,
        2,
        1,
        0,
        1,
        1
      ],
      [
        0,
        0,
        2,
        2,
        1,
        1
      ],
      [
        2,
        2,
        3,
        3,
        2,
        2
      ],
      [
        2,
        3,
        3,
        3,
        2,
        0
      ],
      [
        2,
        2,
        2,
        3,
        3,
        0
      ]
    ],
    "targetColor": 1,
    "moveLimit": 4,
    "portals": [],
    "chapter": "入海",
    "difficulty": "机制入门",
    "mechanics": [
      "expand",
      "prepare"
    ],
    "focus": "远处落笔",
    "story": "远帆尚未起航，先把它将到达的水面整理好。",
    "rules": [
      "可以换一片区域落笔。",
      "先整理远处，再让两片汇合。"
    ]
  },
  {
    "id": "river-17",
    "number": 17,
    "title": "相承",
    "mechanic": "prepare",
    "board": [
      [
        2,
        2,
        2,
        0,
        0,
        0,
        0,
        1
      ],
      [
        2,
        2,
        -2,
        2,
        0,
        0,
        0,
        0
      ],
      [
        2,
        2,
        2,
        2,
        2,
        3,
        3,
        0
      ],
      [
        3,
        0,
        0,
        2,
        1,
        3,
        3,
        2
      ],
      [
        1,
        1,
        0,
        0,
        1,
        2,
        2,
        2
      ],
      [
        1,
        1,
        3,
        3,
        2,
        2,
        1,
        1
      ],
      [
        1,
        3,
        3,
        3,
        3,
        -2,
        1,
        3
      ],
      [
        3,
        3,
        3,
        3,
        3,
        2,
        2,
        3
      ]
    ],
    "targetColor": 0,
    "moveLimit": 5,
    "portals": [],
    "chapter": "入海",
    "difficulty": "进阶",
    "mechanics": [
      "expand",
      "return",
      "obstacle",
      "prepare"
    ],
    "focus": "铺垫绕石",
    "story": "月潮推来又退去，先铺好的水色终于相承。",
    "rules": [
      "有些路，需要先在远处铺好。",
      "绕石之前，想想汇合时要什么色。"
    ]
  },
  {
    "id": "river-18",
    "number": 18,
    "title": "合潮",
    "mechanic": "prepare",
    "board": [
      [
        3,
        3,
        3,
        2,
        3,
        3,
        2,
        2
      ],
      [
        3,
        3,
        3,
        1,
        1,
        3,
        1,
        1
      ],
      [
        2,
        2,
        2,
        3,
        3,
        1,
        1,
        1
      ],
      [
        2,
        2,
        2,
        2,
        2,
        2,
        2,
        2
      ],
      [
        2,
        2,
        2,
        2,
        2,
        2,
        2,
        0
      ],
      [
        0,
        2,
        2,
        2,
        2,
        2,
        0,
        0
      ],
      [
        0,
        0,
        1,
        1,
        0,
        0,
        0,
        0
      ],
      [
        0,
        0,
        2,
        2,
        0,
        0,
        0,
        3
      ]
    ],
    "targetColor": 0,
    "moveLimit": 5,
    "portals": [
      [
        [
          1,
          1
        ],
        [
          6,
          6
        ]
      ]
    ],
    "chapter": "入海",
    "difficulty": "进阶",
    "mechanics": [
      "expand",
      "return",
      "portal",
      "prepare"
    ],
    "focus": "铺垫传色",
    "story": "曙光照见两片潮水，远处的一笔让它们相合。",
    "rules": [
      "先整理一端，再用 ◎ 接住另一端。",
      "别急着扩大眼前最大的色块。"
    ]
  },
  {
    "id": "river-19",
    "number": 19,
    "title": "归海",
    "mechanic": "prepare",
    "board": [
      [
        2,
        2,
        2,
        1,
        1,
        1,
        1,
        1,
        2,
        2
      ],
      [
        2,
        2,
        -2,
        1,
        1,
        1,
        2,
        2,
        2,
        2
      ],
      [
        2,
        2,
        2,
        2,
        2,
        2,
        2,
        0,
        -2,
        0
      ],
      [
        1,
        2,
        2,
        0,
        2,
        2,
        2,
        0,
        0,
        0
      ],
      [
        1,
        3,
        0,
        0,
        3,
        3,
        0,
        0,
        0,
        0
      ],
      [
        3,
        3,
        0,
        0,
        3,
        3,
        0,
        0,
        0,
        0
      ],
      [
        0,
        3,
        0,
        0,
        2,
        3,
        0,
        1,
        1,
        1
      ],
      [
        0,
        -2,
        1,
        2,
        2,
        2,
        2,
        2,
        1,
        2
      ],
      [
        1,
        1,
        0,
        1,
        1,
        1,
        2,
        -2,
        1,
        1
      ],
      [
        1,
        0,
        0,
        1,
        1,
        1,
        2,
        2,
        1,
        1
      ]
    ],
    "targetColor": 3,
    "moveLimit": 5,
    "portals": [
      [
        [
          1,
          1
        ],
        [
          8,
          8
        ]
      ]
    ],
    "chapter": "入海",
    "difficulty": "章末挑战",
    "mechanics": [
      "expand",
      "return",
      "obstacle",
      "portal",
      "prepare"
    ],
    "focus": "万色归流",
    "story": "从苔盏的一滴到眼前的大海，万色在这里归流。",
    "rules": [
      "先铺远岸，再把两端的 ◎ 接通。",
      "绕石借色，让万色终于归流。"
    ]
  }
];
});
