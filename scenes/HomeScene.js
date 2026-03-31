// ─────────────────────────────────────────────
//  HomeScene.js — Main Menu
//  Creepy atmosphere, no FNAF branding
// ─────────────────────────────────────────────

class HomeScene extends Phaser.Scene {
  constructor() {
    super({key: 'HomeScene'});
  }

  preload() {
    // Generate noise texture
    const g = this.make.graphics({add: false});
    for (let i = 0; i < 5000; i++) {
      g.fillStyle(0xffffff, Math.random() * 0.08);
      g.fillRect(
          Phaser.Math.Between(0, GAME_W), Phaser.Math.Between(0, GAME_H), 1, 1);
    }
    g.generateTexture('noise', GAME_W, GAME_H);
    g.destroy();
  }

  create() {
    this._buildBg();
    this._buildFlicker();
    this._buildEyes();
    this._buildTitle();
    this._buildMenu();
    this._buildParticles();
    this._buildDrips();
    this._buildVignette();
  }

  _buildBg() {
    // Brighter gradient
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x1a1a2a, 0x1a1a2a, 0x2a2a3a, 0x2a2a3a, 1);
    bg.fillRect(0, 0, GAME_W, GAME_H);

    // Subtle grid
    const grid = this.add.graphics();
    grid.lineStyle(1, 0x333355, 0.3);
    for (let x = 0; x < GAME_W; x += 60) grid.lineBetween(x, 0, x, GAME_H);
    for (let y = 0; y < GAME_H; y += 60) grid.lineBetween(0, y, GAME_W, y);

    // Faint horizontal scan lines
    const scan = this.add.graphics();
    for (let y = 0; y < GAME_H; y += 4) {
      scan.fillStyle(0x000000, 0.06);
      scan.fillRect(0, y, GAME_W, 1);
    }
  }

  _buildFlicker() {
    // Overlay rect that randomly dims
    this.flickerRect =
        this.add.rectangle(GAME_W / 2, GAME_H / 2, GAME_W, GAME_H, 0x000000, 0);
    this.time.addEvent({
      delay: 80,
      loop: true,
      callback: () => {
        if (Math.random() < 0.04) {
          this.flickerRect.setAlpha(Phaser.Math.FloatBetween(0.1, 0.35));
          this.time.delayedCall(60, () => this.flickerRect.setAlpha(0));
        }
      }
    });
  }

  _buildEyes() {
    // Pairs of glowing eyes hidden in corners
    const positions = [
      {x: 30, y: 180},
      {x: 755, y: 220},
      {x: 55, y: 490},
      {x: 730, y: 460},
      {x: 20, y: 350},
      {x: 770, y: 380},
    ];
    positions.forEach(pos => {
      const eye = this.add.graphics();
      eye.fillStyle(0xffffff, 0.5);
      eye.fillEllipse(pos.x - 7, pos.y, 10, 5);
      eye.fillEllipse(pos.x + 7, pos.y, 10, 5);
      eye.fillStyle(0x000000, 1);
      eye.fillCircle(pos.x - 6, pos.y, 2);
      eye.fillCircle(pos.x + 8, pos.y, 2);

      this.tweens.add({
        targets: eye,
        alpha: {from: 0.7, to: 0},
        duration: 150,
        yoyo: true,
        hold: Phaser.Math.Between(3000, 9000),
        repeat: -1,
        delay: Phaser.Math.Between(0, 5000),
      });
    });
  }

  _buildTitle() {
    // Subtitle
    this.add
        .text(GAME_W / 2, 155, 'FIVE NIGHTS AT', {
          fontFamily: '\'Special Elite\', cursive',
          fontSize: '28px',
          color: '#888877',
          letterSpacing: 8,
        })
        .setOrigin(0.5);

    // Main title shadow
    this.add
        .text(GAME_W / 2 + 3, 218, 'T   M   A', {
          fontFamily: '\'Creepster\', cursive',
          fontSize: '96px',
          color: '#1a0000',
        })
        .setOrigin(0.5);

    // Main title
    this.titleText = this.add
                         .text(GAME_W / 2, 215, 'T   M   A', {
                           fontFamily: '\'Creepster\', cursive',
                           fontSize: '96px',
                           color: '#ffffff',
                           stroke: '#8b0000',
                           strokeThickness: 5,
                         })
                         .setOrigin(0.5);

    // Subtitle under title
    this.add
        .text(GAME_W / 2, 265, '— they never left —', {
          fontFamily: '\'Special Elite\', cursive',
          fontSize: '14px',
          color: '#4a3a2a',
          letterSpacing: 4,
        })
        .setOrigin(0.5);

    // Title pulse
    this.tweens.add({
      targets: this.titleText,
      alpha: {from: 1, to: 0.75},
      duration: 3000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // Red glow under title
    const glow = this.add.graphics();
    glow.fillStyle(0x8b0000, 0.07);
    glow.fillEllipse(GAME_W / 2, 220, 500, 120);
    this.tweens.add({
      targets: glow,
      alpha: {from: 0.5, to: 1},
      scaleX: {from: 0.9, to: 1.1},
      duration: 2500,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  _buildMenu() {
    const items = [
      {label: 'NIGHT  1', action: () => this._startNight(1)},
      {label: 'CONTINUE', action: () => this._startNight(1)},
      {label: 'QUIT', action: () => {}},
    ];

    items.forEach((item, i) => {
      const y = 360 + i * 62;

      // Button bg
      const bg = this.add.graphics();
      bg.fillStyle(COLOURS.darkBg, 0.9);
      bg.fillRoundedRect(GAME_W / 2 - 110, y - 22, 220, 44, 4);
      bg.lineStyle(1, COLOURS.dimGold, 0.6);
      bg.strokeRoundedRect(GAME_W / 2 - 110, y - 22, 220, 44, 4);

      // Button text
      const txt = this.add
                      .text(GAME_W / 2, y, item.label, {
                        fontFamily: '\'Creepster\', cursive',
                        fontSize: '28px',
                        color: '#c8860a',
                      })
                      .setOrigin(0.5);

      // Hit zone
      const zone = this.add.zone(GAME_W / 2, y, 220, 44).setInteractive({
        cursor: 'pointer'
      });

      zone.on('pointerover', () => {
        bg.clear();
        bg.fillStyle(COLOURS.dimRed, 1);
        bg.fillRoundedRect(GAME_W / 2 - 110, y - 22, 220, 44, 4);
        bg.lineStyle(1, COLOURS.bloodRed, 1);
        bg.strokeRoundedRect(GAME_W / 2 - 110, y - 22, 220, 44, 4);
        txt.setColor('#ffffff');
        this.tweens.add(
            {targets: txt, scaleX: 1.06, scaleY: 1.06, duration: 100});
      });

      zone.on('pointerout', () => {
        bg.clear();
        bg.fillStyle(COLOURS.darkBg, 0.9);
        bg.fillRoundedRect(GAME_W / 2 - 110, y - 22, 220, 44, 4);
        bg.lineStyle(1, COLOURS.dimGold, 0.6);
        bg.strokeRoundedRect(GAME_W / 2 - 110, y - 22, 220, 44, 4);
        txt.setColor('#c8860a');
        this.tweens.add({targets: txt, scaleX: 1, scaleY: 1, duration: 100});
      });

      zone.on('pointerdown', () => {
        this.cameras.main.flash(250, 80, 0, 0);
        this.time.delayedCall(260, item.action);
      });
    });
  }

  _startNight(n) {
    this.cameras.main.fadeOut(600, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.start('NightOneScene');
    });
  }

  _buildDrips() {
    const g = this.add.graphics();
    g.fillStyle(0x8b0000, 0.5);
    [30, 110, 240, 390, 520, 650, 760].forEach(x => {
      const len = Phaser.Math.Between(20, 70);
      g.fillRect(x, 0, 3, len);
      g.fillCircle(x + 1, len, 4);
    });
  }

  _buildParticles() {
    for (let i = 0; i < 30; i++) {
      const dot = this.add.graphics();
      dot.fillStyle(0xffffff, 0.2);
      dot.fillCircle(0, 0, 1);
      dot.setPosition(
          Phaser.Math.Between(0, GAME_W), Phaser.Math.Between(0, GAME_H));
      this.tweens.add({
        targets: dot,
        y: `-=${Phaser.Math.Between(50, 120)}`,
        alpha: 0,
        duration: Phaser.Math.Between(5000, 12000),
        repeat: -1,
        delay: Phaser.Math.Between(0, 8000),
        onRepeat: t => {
          dot.x = Phaser.Math.Between(0, GAME_W);
          dot.y = GAME_H + 5;
        },
      });
    }
  }

  _buildVignette() {
    // Lighter vignette
    const v = this.add.graphics();
    for (let r = 0; r < 6; r++) {
      const radius = GAME_W * (0.5 + r * 0.08);
      v.fillStyle(0x000000, 0.04);
      v.fillEllipse(GAME_W / 2, GAME_H / 2, radius, radius * (GAME_H / GAME_W));
    }
  }

  update() {}
}