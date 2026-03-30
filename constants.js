// ─────────────────────────────────────────────
//  FIVE NIGHTS AT TMA — Constants
// ─────────────────────────────────────────────

const GAME_W = 1100;
const GAME_H = 700;

const NIGHT_DURATION_MS  = 180_000;
const AI_SPAWN_DELAY_MS  = 30_000;

const AI_MOVE_INTERVAL = {
  1: 12000,
  2: 7000,
  3: 4000,
};

const ROOMS = [
  'CAM 1 — Hallway A',
  'CAM 2 — Hallway B',
  'CAM 3 — Classroom',
  'CAM 4 — Library',
  'CAM 5 — Cafeteria',
  'CAM 6 — Stairwell',
  'CAM 7 — Boiler Room',
  'CAM 8 — East Corridor',
  'CAM 9 — Roof Access',
  'CAM 10 — West Wing',
];

const ROOM = {
  HALLWAY_A : 0,
  HALLWAY_B : 1,
  CLASSROOM : 2,
  LIBRARY   : 3,
  CAFETERIA : 4,
  STAIRWELL : 5,
  BOILER    : 6,
  EAST_CORR : 7,
  ROOF      : 8,
  WEST_WING : 9,
  BASE      : 10,
};

const ROOM_GRAPH = {
  0:  [1, 2],
  1:  [0, 5, 7],
  2:  [0, 3],
  3:  [2, 4, 9],
  4:  [3, 5, 6],
  5:  [4, 1, 8],
  6:  [4, 7],
  7:  [6, 1, 10],
  8:  [5, 9],
  9:  [8, 3, 10],
  10: [],
};

const LURE_DURATION_MS  = 10_000;
const LURE_COOLDOWN_MS  = 15_000;

const COLOURS = {
  black    : 0x000000,
  darkBg   : 0x050508,
  panelBg  : 0x0a0a12,
  dimRed   : 0x4a0000,
  bloodRed : 0x8b0000,
  brightRed: 0xff2222,
  gold     : 0xc8860a,
  dimGold  : 0x3a2800,
  offWhite : 0xd4c9b0,
  green    : 0x00ff88,
  dimGreen : 0x003322,
  grey     : 0x444455,
  darkGrey : 0x1a1a22,
};
