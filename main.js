// ─────────────────────────────────────────────
//  main.js — Phaser config & boot
// ─────────────────────────────────────────────

const config = {
  type: Phaser.AUTO,
  width: GAME_W,
  height: GAME_H,
  backgroundColor: '#000000',
  parent: 'game-container',
  scene: [HomeScene, NightOneScene],
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
};

const game = new Phaser.Game(config);
