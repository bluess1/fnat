// ─────────────────────────────────────────────
//  NightOneScene.js — Night 1 Gameplay
// ─────────────────────────────────────────────

class NightOneScene extends Phaser.Scene {
  constructor() { super({ key: 'NightOneScene' }); }

  // ════════════════════════════════════════════
  //  INIT
  // ════════════════════════════════════════════
  init() {
    this.nightNum        = 1;
    this.characterRoom   = ROOM.HALLWAY_A;
    this.isLured         = false;
    this.lureRoom        = -1;
    this.lureCooldown    = false;
    this.camOpen         = false;
    this.activeCam       = 0;
    this.nightOver       = false;
    this.startTime       = 0;
    this.aiActive        = false;
    this.aiTimer         = null;
    this.loadedTextures  = new Set();

    // Camera feed dimensions
    this.FEED_X = 16;
    this.FEED_Y = 52;
    this.FEED_W = 640;
    this.FEED_H = 430;

    // Stare mechanic
    this.isStaring        = false;
    this.stareTriggered   = false;
    this.playerWatchStart = 0;
    this.STARE_THRESHOLD  = 1500;
  }

  // ════════════════════════════════════════════
  //  PRELOAD
  // ════════════════════════════════════════════
  preload() {
    this.load.image('base',      'assets/base.png');
    this.load.image('deez1',     'assets/deez1.png');
    this.load.image('deezJump',  'assets/deezJump.png');
    this.load.audio('ambience',  'sfx/ambience.mp3');
    this.load.audio('playsound', 'sfx/playsound.mp3');

    // Room photos: imgN.1.png (empty), imgN.2.png (with creature)
    this.load.on('filecomplete', (key) => { this.loadedTextures.add(key); });
    for (let i = 1; i <= 10; i++) {
      this.load.image(`room_empty_${i - 1}`,    `assets/img${i}.1.png`);
      this.load.image(`room_creature_${i - 1}`, `assets/img${i}.2.png`);
    }

    // Fallback generated textures (brighter)
    const palettes = [
      { bg: 0x2a2a3a, line: 0x404060 },
      { bg: 0x2a2020, line: 0x504040 },
      { bg: 0x202a20, line: 0x405040 },
      { bg: 0x2a2a20, line: 0x504800 },
      { bg: 0x302025, line: 0x502030 },
      { bg: 0x202a2a, line: 0x304050 },
      { bg: 0x2a2020, line: 0x403030 },
      { bg: 0x202530, line: 0x304050 },
      { bg: 0x202030, line: 0x353550 },
      { bg: 0x2a2020, line: 0x403030 },
    ];
    for (let i = 0; i < 10; i++) {
      const g = this.make.graphics({ add: false });
      const p = palettes[i];
      g.fillStyle(p.bg, 1);
      g.fillRect(0, 0, 640, 430);
      g.lineStyle(1, p.line, 0.9);
      g.lineBetween(0, 320, 640, 320);
      g.lineBetween(0, 70, 640, 70);
      g.lineBetween(90, 70, 90, 320);
      g.lineBetween(550, 70, 550, 320);
      g.fillStyle(p.line, 0.18);
      g.fillRect(100, 150, 55, 170);
      g.fillStyle(0x000000, 0.35);
      g.fillRect(0, 0, 90, 430);
      g.fillRect(550, 0, 90, 430);
      g.fillRect(0, 0, 640, 70);
      g.generateTexture(`cam_room_${i}`, 640, 430);
      g.destroy();
    }

    const n = this.make.graphics({ add: false });
    for (let i = 0; i < 5000; i++) {
      n.fillStyle(0xffffff, Math.random() * 0.07);
      n.fillRect(Phaser.Math.Between(0, 640), Phaser.Math.Between(0, 430), 1, 1);
    }
    n.generateTexture('cam_noise', 640, 430);
    n.destroy();
  }

  // ════════════════════════════════════════════
  //  CREATE
  // ════════════════════════════════════════════
  create() {
    this.startTime = this.time.now;

    this._buildBaseView();
    this._buildHUD();
    this._buildCameraPanel();
    this._buildJumpscare();
    this._buildCamToggleBtn();
    this._buildAmbientFlicker();

    this.ambienceSound = this.sound.add('ambience', { loop: true, volume: 0.4 });
    this.ambienceSound.play();
    this.playSound = this.sound.add('playsound', { loop: false, volume: 0.8 });

    this.time.delayedCall(AI_SPAWN_DELAY_MS, () => {
      this.aiActive = true;
      this.aiTimer = this.time.addEvent({
        delay: AI_MOVE_INTERVAL[this.nightNum],
        loop: true,
        callback: this._aiStep,
        callbackScope: this,
      });
    });

    this.time.addEvent({
      delay: NIGHT_DURATION_MS,
      callback: this._nightComplete,
      callbackScope: this,
    });

    this.cameras.main.fadeIn(800, 0, 0, 0);
  }

  // ════════════════════════════════════════════
  //  BASE VIEW
  // ════════════════════════════════════════════
  _buildBaseView() {
    this.add.image(GAME_W / 2, GAME_H / 2, 'base').setDisplaySize(GAME_W, GAME_H);
    this.add.rectangle(GAME_W / 2, GAME_H / 2, GAME_W, GAME_H, 0x000000, 0.2);
    const scan = this.add.graphics();
    for (let y = 0; y < GAME_H; y += 4) {
      scan.fillStyle(0x000000, 0.06);
      scan.fillRect(0, y, GAME_W, 1);
    }
    const vig = this.add.graphics();
    for (let r = 0; r < 6; r++) {
      vig.fillStyle(0x000000, 0.04);
      vig.fillEllipse(GAME_W / 2, GAME_H / 2, GAME_W * (0.55 + r * 0.09), GAME_H * (0.55 + r * 0.09));
    }
  }

  // ════════════════════════════════════════════
  //  HUD
  // ════════════════════════════════════════════
  _buildHUD() {
    const topBar = this.add.graphics();
    topBar.fillStyle(0x000000, 0.82);
    topBar.fillRect(0, 0, GAME_W, 44);
    topBar.lineStyle(1, COLOURS.dimGold, 0.5);
    topBar.lineBetween(0, 44, GAME_W, 44);

    this.add.text(18, 13, 'NIGHT  1', {
      fontFamily: "'Special Elite', cursive", fontSize: '15px', color: '#c8860a',
    }).setOrigin(0, 0.5);

    this.clockText = this.add.text(GAME_W / 2, 13, '12:00 AM', {
      fontFamily: "'Special Elite', cursive", fontSize: '17px', color: '#d4c9b0',
    }).setOrigin(0.5, 0.5);

    this.locationText = this.add.text(GAME_W - 18, 13, 'LOCATION: UNKNOWN', {
      fontFamily: "'Special Elite', cursive", fontSize: '12px', color: '#4a3a2a',
    }).setOrigin(1, 0.5);

    this.warningText = this.add.text(GAME_W / 2 + 140, 13, 'MOTION DETECTED', {
      fontFamily: "'Special Elite', cursive", fontSize: '12px', color: '#ff2222',
    }).setOrigin(0, 0.5).setAlpha(0);
  }

  // ════════════════════════════════════════════
  //  AMBIENT FLICKER
  // ════════════════════════════════════════════
  _buildAmbientFlicker() {
    this.globalFlicker = this.add.rectangle(GAME_W / 2, GAME_H / 2, GAME_W, GAME_H, 0x000000, 0).setDepth(50);
    this.time.addEvent({
      delay: 120, loop: true,
      callback: () => {
        if (Math.random() < 0.035) {
          this.globalFlicker.setAlpha(Phaser.Math.FloatBetween(0.08, 0.28));
          this.time.delayedCall(Phaser.Math.Between(40, 120), () => this.globalFlicker.setAlpha(0));
        }
      },
    });
  }

  // ════════════════════════════════════════════
  //  CAMERA PANEL
  // ════════════════════════════════════════════
  _buildCameraPanel() {
    this.camPanel = this.add.container(0, 0).setVisible(false).setDepth(10);

    const backdrop = this.add.graphics();
    backdrop.fillStyle(0x000000, 0.95);
    backdrop.fillRect(0, 0, GAME_W, GAME_H);
    this.camPanel.add(backdrop);

    // ── Feed ──────────────────────────────────
    const FEED_X = this.FEED_X, FEED_Y = this.FEED_Y, FEED_W = this.FEED_W, FEED_H = this.FEED_H;
    const feedCx = FEED_X + FEED_W / 2;
    const feedCy = FEED_Y + FEED_H / 2;

    // Border
    const feedBorder = this.add.graphics();
    feedBorder.lineStyle(2, COLOURS.dimGold, 0.7);
    feedBorder.strokeRect(FEED_X, FEED_Y, FEED_W, FEED_H);
    const cLen = 18;
    feedBorder.lineStyle(2, COLOURS.gold, 1);
    [[FEED_X, FEED_Y],[FEED_X+FEED_W, FEED_Y],[FEED_X, FEED_Y+FEED_H],[FEED_X+FEED_W, FEED_Y+FEED_H]].forEach(([cx,cy]) => {
      const sx = cx === FEED_X ? 1 : -1, sy = cy === FEED_Y ? 1 : -1;
      feedBorder.lineBetween(cx, cy, cx + sx*cLen, cy);
      feedBorder.lineBetween(cx, cy, cx, cy + sy*cLen);
    });
    this.camPanel.add(feedBorder);

    // Feed image — masked to feed box so it never bleeds out
    this.camFeedImg = this.add.image(feedCx, feedCy, 'cam_room_0').setDisplaySize(FEED_W, FEED_H);
    const maskShape = this.make.graphics({ add: false });
    maskShape.fillStyle(0xffffff);
    maskShape.fillRect(FEED_X, FEED_Y, FEED_W, FEED_H);
    this.camFeedImg.setMask(maskShape.createGeometryMask());
    this.camPanel.add(this.camFeedImg);

    // Night-vision tint (brighter)
    this.camTint = this.add.rectangle(feedCx, feedCy, FEED_W, FEED_H, 0x003300, 0.08);
    this.camPanel.add(this.camTint);

    // Noise overlay
    this.camNoiseImg = this.add.image(feedCx, feedCy, 'cam_noise')
      .setDisplaySize(FEED_W, FEED_H).setAlpha(0.3).setBlendMode(Phaser.BlendModes.ADD);
    this.camPanel.add(this.camNoiseImg);

    // Scanlines (lighter)
    const feedScan = this.add.graphics();
    for (let y = FEED_Y; y < FEED_Y + FEED_H; y += 3) {
      feedScan.fillStyle(0x000000, 0.06);
      feedScan.fillRect(FEED_X, y, FEED_W, 1);
    }
    this.camPanel.add(feedScan);

    // Rolling scan line (lighter)
    this.scanLine = this.add.rectangle(FEED_X, FEED_Y, FEED_W, 3, 0x00ff88, 0.04);
    this.camPanel.add(this.scanLine);
    this.tweens.add({
      targets: this.scanLine,
      y: { from: FEED_Y, to: FEED_Y + FEED_H },
      duration: 2800, repeat: -1, ease: 'Linear',
    });

    // Static glitch line that moves randomly
    this.glitchLine = this.add.rectangle(FEED_X, FEED_Y, FEED_W, 2, 0xffffff, 0);
    this.camPanel.add(this.glitchLine);
    this._startGlitchEffects();

    // Cam label
    this.camLabel = this.add.text(FEED_X + 8, FEED_Y + 8, ROOMS[0], {
      fontFamily: "'Special Elite', cursive", fontSize: '12px', color: '#00ff88',
      backgroundColor: '#000000', padding: { x: 4, y: 2 },
    });
    this.camPanel.add(this.camLabel);

    // REC dot
    this.recDot = this.add.graphics();
    this.recDot.fillStyle(COLOURS.brightRed, 1);
    this.recDot.fillCircle(FEED_X + FEED_W - 44, FEED_Y + 14, 5);
    this.camPanel.add(this.recDot);
    this.camPanel.add(this.add.text(FEED_X + FEED_W - 34, FEED_Y + 7, 'REC', {
      fontFamily: "'Special Elite', cursive", fontSize: '12px', color: '#ff2222',
    }));
    this.time.addEvent({ delay: 900, loop: true, callback: () => { this.recDot.setVisible(!this.recDot.visible); } });

    // Panel header
    this.camPanel.add(this.add.text(FEED_X + FEED_W / 2, 26, '[ SECURITY CAMERAS ]', {
      fontFamily: "'Special Elite', cursive", fontSize: '13px', color: '#c8860a', letterSpacing: 6,
    }).setOrigin(0.5));

    // ── Right panel ───────────────────────────
    const RP_X = 670, RP_Y = 52;
    const RP_W = GAME_W - RP_X - 10;
    const RP_H = GAME_H - RP_Y - 8;

    const rpBg = this.add.graphics();
    rpBg.fillStyle(0x04060c, 1);
    rpBg.fillRect(RP_X, RP_Y, RP_W, RP_H);
    rpBg.lineStyle(1, COLOURS.dimGold, 0.4);
    rpBg.strokeRect(RP_X, RP_Y, RP_W, RP_H);
    this.camPanel.add(rpBg);

    this.camPanel.add(this.add.text(RP_X + RP_W / 2, RP_Y + 14, '[ FACILITY MAP ]', {
      fontFamily: "'Special Elite', cursive", fontSize: '11px', color: '#c8860a', letterSpacing: 3,
    }).setOrigin(0.5, 0.5));

    const mapDiv = this.add.graphics();
    mapDiv.lineStyle(1, COLOURS.dimGold, 0.3);
    mapDiv.lineBetween(RP_X + 8, RP_Y + 26, RP_X + RP_W - 8, RP_Y + 26);
    this.camPanel.add(mapDiv);

    // ── Map nodes ─────────────────────────────
    const MAP_OX = RP_X + 6, MAP_OY = RP_Y + 32;
    const CELL_W = RP_W / 2, CELL_H = 46;
    const NODE_W = CELL_W - 10, NODE_H = 34;

    const layout = [
      { idx: ROOM.HALLWAY_A, col: 0, row: 0 },
      { idx: ROOM.HALLWAY_B, col: 1, row: 0 },
      { idx: ROOM.CLASSROOM, col: 0, row: 1 },
      { idx: ROOM.LIBRARY,   col: 1, row: 1 },
      { idx: ROOM.CAFETERIA, col: 0, row: 2 },
      { idx: ROOM.STAIRWELL, col: 1, row: 2 },
      { idx: ROOM.BOILER,    col: 0, row: 3 },
      { idx: ROOM.EAST_CORR, col: 1, row: 3 },
      { idx: ROOM.ROOF,      col: 0, row: 4 },
      { idx: ROOM.WEST_WING, col: 1, row: 4 },
      { idx: ROOM.BASE,      col: 0, row: 5, fullRow: true },
    ];

    const SHORT_LABELS = [
      'CAM 1\nHallway A', 'CAM 2\nHallway B',
      'CAM 3\nClassroom', 'CAM 4\nLibrary',
      'CAM 5\nCafeteria', 'CAM 6\nStairwell',
      'CAM 7\nBoiler',    'CAM 8\nEast Corr',
      'CAM 9\nRoof',      'CAM 10\nWest Wing',
      'YOU — OFFICE',
    ];

    const nodePos = {};
    layout.forEach(n => {
      const nw = n.fullRow ? NODE_W * 2 + 10 : NODE_W;
      const cx = n.fullRow
        ? MAP_OX + CELL_W + NODE_W / 2
        : MAP_OX + n.col * CELL_W + NODE_W / 2 + 5;
      nodePos[n.idx] = { x: cx, y: MAP_OY + n.row * CELL_H + NODE_H / 2, w: nw };
    });

    const lineG = this.add.graphics();
    lineG.lineStyle(1, 0x223344, 0.9);
    const drawn = new Set();
    Object.entries(ROOM_GRAPH).forEach(([fromStr, neighbors]) => {
      const from = parseInt(fromStr);
      neighbors.forEach(to => {
        const key = [Math.min(from, to), Math.max(from, to)].join('-');
        if (drawn.has(key)) return;
        drawn.add(key);
        if (nodePos[from] && nodePos[to])
          lineG.lineBetween(nodePos[from].x, nodePos[from].y, nodePos[to].x, nodePos[to].y);
      });
    });
    this.camPanel.add(lineG);

    this.mapNodes = [];
    layout.forEach(n => {
      const { idx } = n;
      const { x, y, w } = nodePos[idx];
      const isBase = idx === ROOM.BASE;
      const nx = x - w / 2, ny = y - NODE_H / 2;

      const nodeBg = this.add.graphics();
      this._drawMapNode(nodeBg, nx, ny, w, NODE_H, false, isBase);
      this.camPanel.add(nodeBg);

      const nodeTxt = this.add.text(x, y, SHORT_LABELS[idx], {
        fontFamily: "'Special Elite', cursive", fontSize: '8px',
        color: isBase ? '#ff4444' : '#778899', align: 'center',
      }).setOrigin(0.5, 0.5);
      this.camPanel.add(nodeTxt);

      if (!isBase) {
        const zone = this.add.zone(x, y, w, NODE_H).setInteractive();
        zone.on('pointerover', () => {
          if (this.activeCam === idx) return;
          this._drawMapNode(nodeBg, nx, ny, w, NODE_H, false, false, true);
          nodeTxt.setColor('#aabbcc');
        });
        zone.on('pointerout', () => {
          this._drawMapNode(nodeBg, nx, ny, w, NODE_H, idx === this.activeCam, false);
          nodeTxt.setColor(idx === this.activeCam ? '#00ff88' : '#778899');
        });
        zone.on('pointerdown', () => { this._switchCam(idx); });
        this.camPanel.add(zone);
      }

      this.mapNodes.push({ bg: nodeBg, label: nodeTxt, idx, nx, ny, isBase, NODE_W: w, NODE_H });
    });

    // Blinking map dot showing character position
    this._mapDot = this.add.graphics();
    this.camPanel.add(this._mapDot);
    this.tweens.add({ targets: this._mapDot, alpha: { from: 1, to: 0.2 }, duration: 500, yoyo: true, repeat: -1 });
    this._updateMapDot();

    // ── PLAY SOUND button ──────────────────────
    const BTN_SECTION_Y = MAP_OY + 6 * CELL_H + 8;
    const div2 = this.add.graphics();
    div2.lineStyle(1, COLOURS.dimGold, 0.3);
    div2.lineBetween(RP_X + 8, BTN_SECTION_Y, RP_X + RP_W - 8, BTN_SECTION_Y);
    this.camPanel.add(div2);

    const BTN_W = RP_W - 16, BTN_H = 42;
    const btnX = RP_X + 8, btnY = BTN_SECTION_Y + 10;
    this._soundBtnX = btnX; this._soundBtnY = btnY;
    this._soundBtnW = BTN_W; this._soundBtnH = BTN_H;

    this.soundBtnBg = this.add.graphics();
    this._drawSoundBtn(false);
    this.camPanel.add(this.soundBtnBg);

    this.soundBtnTxt = this.add.text(btnX + BTN_W / 2, btnY + BTN_H / 2, 'PLAY SOUND', {
      fontFamily: "'Special Elite', cursive", fontSize: '13px', color: '#d4c9b0', letterSpacing: 3,
    }).setOrigin(0.5, 0.5);
    this.camPanel.add(this.soundBtnTxt);

    const soundZone = this.add.zone(btnX + BTN_W / 2, btnY + BTN_H / 2, BTN_W, BTN_H).setInteractive();
    soundZone.on('pointerover', () => { if (this.lureCooldown) return; this._drawSoundBtn(false, true); this.soundBtnTxt.setColor('#ffffff'); });
    soundZone.on('pointerout',  () => { this._drawSoundBtn(this.lureCooldown); this.soundBtnTxt.setColor('#d4c9b0'); });
    soundZone.on('pointerdown', () => { if (this.lureCooldown || this.nightOver) return; this._activateLure(this.activeCam); });
    this.camPanel.add(soundZone);

    this.cooldownBar  = this.add.graphics();
    this.cooldownText = this.add.text(btnX, btnY + BTN_H + 6, '', {
      fontFamily: "'Special Elite', cursive", fontSize: '10px', color: '#8b0000',
    });
    this.camPanel.add(this.cooldownBar);
    this.camPanel.add(this.cooldownText);
  }

  // ════════════════════════════════════════════
  //  MAP DOT
  // ════════════════════════════════════════════
  _updateMapDot() {
    if (!this._mapDot || !this.mapNodes) return;
    const node = this.mapNodes.find(n => n.idx === this.characterRoom);
    if (!node) return;
    const cx = node.nx + node.NODE_W / 2;
    const cy = node.ny + node.NODE_H / 2;
    this._mapDot.clear();
    this._mapDot.fillStyle(0xff2222, 1);
    this._mapDot.fillCircle(cx, cy, 5);
  }

  // ════════════════════════════════════════════
  //  JUMPSCARE
  // ════════════════════════════════════════════
  _buildJumpscare() {
    this.jumpscareContainer = this.add.container(0, 0).setVisible(false).setDepth(100);
    const black = this.add.rectangle(GAME_W / 2, GAME_H / 2, GAME_W, GAME_H, 0x000000, 1);
    this.jumpscareContainer.add(black);
    this.jumpFlash = this.add.rectangle(GAME_W / 2, GAME_H / 2, GAME_W, GAME_H, 0xffffff, 0);
    this.jumpscareContainer.add(this.jumpFlash);
    this.jumpSprite = this.add.image(GAME_W / 2, GAME_H / 2, 'deezJump')
      .setDisplaySize(GAME_W * 0.78, GAME_H * 0.88).setAlpha(0);
    this.jumpscareContainer.add(this.jumpSprite);
  }

  // ════════════════════════════════════════════
  //  CAM TOGGLE BUTTON — depth 20, always on top
  // ════════════════════════════════════════════
  _buildCamToggleBtn() {
    const bx = GAME_W / 2, by = GAME_H - 24;
    this.camToggleBg = this.add.graphics().setDepth(20);
    this._drawToggleBtn(false);
    this.camToggleTxt = this.add.text(bx, by, '▲  CAMERAS  ▲', {
      fontFamily: "'Special Elite', cursive", fontSize: '13px', color: '#c8860a', letterSpacing: 4,
    }).setOrigin(0.5, 0.5).setDepth(20);
    const zone = this.add.zone(bx, by, 220, 36).setInteractive().setDepth(20);
    zone.on('pointerover', () => { this.camToggleTxt.setColor('#ffffff'); });
    zone.on('pointerout',  () => { this.camToggleTxt.setColor('#c8860a'); });
    zone.on('pointerdown', () => { this._toggleCams(); });
  }

  _drawToggleBtn(open) {
    const bx = GAME_W / 2, by = GAME_H - 24;
    this.camToggleBg.clear();
    this.camToggleBg.fillStyle(open ? COLOURS.dimRed : 0x080808, 0.92);
    this.camToggleBg.fillRoundedRect(bx - 110, by - 18, 220, 36, 4);
    this.camToggleBg.lineStyle(1, open ? COLOURS.bloodRed : COLOURS.dimGold, 0.8);
    this.camToggleBg.strokeRoundedRect(bx - 110, by - 18, 220, 36, 4);
  }

  // ════════════════════════════════════════════
  //  HELPERS
  // ════════════════════════════════════════════
  _drawMapNode(g, x, y, w, h, active, isBase, hover = false) {
    g.clear();
    if (isBase) {
      g.fillStyle(0x1a0000, 1); g.fillRect(x, y, w, h);
      g.lineStyle(1, COLOURS.bloodRed, 0.9); g.strokeRect(x, y, w, h);
    } else if (active) {
      g.fillStyle(0x003322, 1); g.fillRect(x, y, w, h);
      g.lineStyle(1, COLOURS.green, 1); g.strokeRect(x, y, w, h);
    } else if (hover) {
      g.fillStyle(0x1a1a2a, 1); g.fillRect(x, y, w, h);
      g.lineStyle(1, 0x667788, 0.9); g.strokeRect(x, y, w, h);
    } else {
      g.fillStyle(0x080c14, 1); g.fillRect(x, y, w, h);
      g.lineStyle(1, 0x223344, 0.8); g.strokeRect(x, y, w, h);
    }
  }

  _drawSoundBtn(cooldown, hover = false) {
    const { _soundBtnX: x, _soundBtnY: y, _soundBtnW: w, _soundBtnH: h } = this;
    this.soundBtnBg.clear();
    if (cooldown) {
      this.soundBtnBg.fillStyle(0x1a0000, 0.9); this.soundBtnBg.fillRect(x, y, w, h);
      this.soundBtnBg.lineStyle(1, COLOURS.dimRed, 0.6); this.soundBtnBg.strokeRect(x, y, w, h);
    } else if (hover) {
      this.soundBtnBg.fillStyle(COLOURS.dimRed, 1); this.soundBtnBg.fillRect(x, y, w, h);
      this.soundBtnBg.lineStyle(2, COLOURS.bloodRed, 1); this.soundBtnBg.strokeRect(x, y, w, h);
    } else {
      this.soundBtnBg.fillStyle(0x080c10, 0.95); this.soundBtnBg.fillRect(x, y, w, h);
      this.soundBtnBg.lineStyle(1, COLOURS.dimGold, 0.8); this.soundBtnBg.strokeRect(x, y, w, h);
    }
  }

  // ════════════════════════════════════════════
  //  REFRESH CAM FEED
  //  The ONLY place that sets the feed texture.
  //  Shows imgN.2 when character is HERE + AI active,
  //  shows imgN.1 (empty) otherwise.
  //  Falls back to generated dark texture if photo missing.
  // ════════════════════════════════════════════
  _refreshCamFeed() {
    const camIdx   = Math.min(this.activeCam, 9);
    const charHere = this.aiActive && (this.characterRoom === this.activeCam);

    let texKey;
    if (charHere) {
      const creatureKey = `room_creature_${camIdx}`;
      texKey = this.loadedTextures.has(creatureKey) ? creatureKey : `cam_room_${camIdx}`;
    } else {
      const emptyKey = `room_empty_${camIdx}`;
      texKey = this.loadedTextures.has(emptyKey) ? emptyKey : `cam_room_${camIdx}`;
    }

    this.camFeedImg.setTexture(texKey);
    this.camLabel.setText(ROOMS[camIdx]);

    // Warning + watch timer
    if (charHere) {
      this.warningText.setAlpha(1);
      if (this.playerWatchStart === 0) {
        this.playerWatchStart = this.time.now;
        this.stareTriggered   = false;
      }
    } else {
      this.warningText.setAlpha(0);
      this.playerWatchStart = 0;
    }

    // Noise burst
    this.camNoiseImg.setAlpha(0.85);
    this.time.delayedCall(140, () => { if (this.camNoiseImg) this.camNoiseImg.setAlpha(0.3); });
  }

  // Random glitch effects on camera feed
  _startGlitchEffects() {
    this.time.addEvent({
      delay: Phaser.Math.Between(3000, 8000),
      loop: true,
      callback: () => {
        if (!this.camOpen || this.nightOver) return;
        
        // Random glitch flash
        if (Math.random() < 0.3) {
          this.glitchLine.setY(Phaser.Math.Between(this.FEED_Y + 50, this.FEED_Y + this.FEED_H - 50));
          this.glitchLine.setAlpha(Phaser.Math.FloatBetween(0.3, 0.7));
          this.glitchLine.setFillStyle(0xffffff);
          
          this.tweens.add({
            targets: this.glitchLine,
            alpha: 0,
            duration: Phaser.Math.Between(50, 150),
            onComplete: () => {
              this.glitchLine.setY(this.FEED_Y);
              this.glitchLine.setAlpha(0);
            }
          });
        }
        
        // Random color tint shift
        if (Math.random() < 0.2) {
          const tintColors = [0x00ff00, 0x00ffff, 0xff00ff, 0xffff00];
          const color = tintColors[Phaser.Math.Between(0, tintColors.length - 1)];
          this.camTint.setFillStyle(color, 0.15);
          this.time.delayedCall(100, () => {
            if (this.camTint) this.camTint.setFillStyle(0x003300, 0.08);
          });
        }
      },
      callbackScope: this,
    });
  }

  // ════════════════════════════════════════════
  //  LOGIC
  // ════════════════════════════════════════════
  _toggleCams() {
    this.camOpen = !this.camOpen;
    this.camPanel.setVisible(this.camOpen);
    this._drawToggleBtn(this.camOpen);
    this.camToggleTxt.setText(this.camOpen ? '▼  CLOSE  ▼' : '▲  CAMERAS  ▲');
    if (this.camOpen) {
      this._refreshCamFeed();
    } else {
      this.warningText.setAlpha(0);
      this.playerWatchStart = 0;
    }
  }

  _switchCam(index) {
    this.activeCam        = index;
    this.playerWatchStart = 0;
    this.stareTriggered   = false;
    this.mapNodes.forEach(n => {
      if (n.isBase) return;
      this._drawMapNode(n.bg, n.nx, n.ny, n.NODE_W, n.NODE_H, n.idx === index, false);
      n.label.setColor(n.idx === index ? '#00ff88' : '#778899');
    });

    // Check if creature is in this room - trigger glitch effect
    if (this.aiActive && this.characterRoom === index && index !== ROOM.BASE) {
      this._triggerGlitchDisappear();
    }

    this._refreshCamFeed();
  }

  // Glitch effect when player catches creature in a room
  _triggerGlitchDisappear() {
    // Store current room before moving
    const oldRoom = this.characterRoom;

    // Glitch effects
    this.cameras.main.shake(200, 0.015);
    
    // Heavy camera noise during glitch
    if (this.camOpen) {
      this.camNoiseImg.setAlpha(1);
    }
    
    // Delay before creature "disappears" to another room
    const delayMs = Phaser.Math.Between(1000, 2000);
    this.time.delayedCall(delayMs, () => {
      const adjacent = ROOM_GRAPH[oldRoom];
      if (adjacent && adjacent.length > 0) {
        // Filter out current room (player is watching) and BASE
        const safeRooms = adjacent.filter(r => r !== ROOM.BASE && r !== this.activeCam);
        if (safeRooms.length > 0) {
          this.characterRoom = safeRooms[Phaser.Math.Between(0, safeRooms.length - 1)];
        } else if (adjacent.includes(ROOM.BASE)) {
          this.characterRoom = ROOM.BASE;
        } else {
          this.characterRoom = adjacent[Phaser.Math.Between(0, adjacent.length - 1)];
        }
      }
      
      this.playerWatchStart = 0;
      this.stareTriggered = false;
      this._updateLocationText();
      this._updateMapDot();
      
      // Flash after creature moves
      this.cameras.main.flash(100, 255, 255, 255);
      this.time.delayedCall(80, () => { 
        if (this.camNoiseImg) this.camNoiseImg.setAlpha(0.3); 
      });
    });
  }

  _activateLure(roomIndex) {
    if (this.lureCooldown || this.nightOver) return;
    this.isLured = true; this.lureRoom = roomIndex; this.lureCooldown = true;
    this.playSound.play();
    this._drawSoundBtn(true);
    this.soundBtnTxt.setColor('#4a2222');
    this._moveLure(roomIndex);
    this.time.delayedCall(LURE_DURATION_MS, () => { this.isLured = false; this.lureRoom = -1; });
    this._startCooldownBar();
    this.time.delayedCall(LURE_COOLDOWN_MS, () => {
      this.lureCooldown = false;
      this.cooldownText.setText('');
      this.cooldownBar.clear();
      this._drawSoundBtn(false);
      this.soundBtnTxt.setColor('#d4c9b0');
    });
  }

  // Move creature 1-2 steps toward target room (not instant teleport)
  _moveLure(targetRoom) {
    const adjacent = ROOM_GRAPH[this.characterRoom];
    if (!adjacent || adjacent.length === 0) return;

    // Find a path toward target room, move only 1-2 steps
    const steps = Phaser.Math.Between(1, 2);
    let currentRoom = this.characterRoom;
    
    for (let i = 0; i < steps; i++) {
      const currentAdj = ROOM_GRAPH[currentRoom];
      if (!currentAdj || currentAdj.length === 0) break;
      
      // Prefer rooms closer to target
      const distToTarget = this._distToBase();
      const currentDist = distToTarget[currentRoom] ?? 999;
      
      // Find adjacent rooms that move closer to target
      const betterRooms = currentAdj.filter(r => {
        const rDist = distToTarget[r];
        // Can't move to BASE from lure
        if (r === ROOM.BASE) return false;
        // Prefer rooms that are closer to the target room
        if (targetRoom === ROOM.BASE) return true;
        return rDist !== undefined && rDist < currentDist;
      });
      
      if (betterRooms.length > 0) {
        currentRoom = betterRooms[Phaser.Math.Between(0, betterRooms.length - 1)];
      } else {
        // If no better path, pick random safe room
        const safe = currentAdj.filter(r => r !== ROOM.BASE);
        if (safe.length > 0) {
          currentRoom = safe[Phaser.Math.Between(0, safe.length - 1)];
        }
      }
    }
    
    this.characterRoom = currentRoom;
    this.playerWatchStart = 0;
    this.stareTriggered = false;
    this._updateLocationText();
    this._updateMapDot();
    if (this.camOpen) this._refreshCamFeed();
  }

  // AI movement step
  _aiStep() {
    if (this.nightOver || !this.aiActive || this.isStaring) return;
    if (this.isLured) return;

    // After spawn delay (30s), random chance to "appear" in viewed room
    const timeSinceSpawn = this.time.now - this.startTime - AI_SPAWN_DELAY_MS;
    if (timeSinceSpawn >= 0) {
      // 40% chance to appear in viewed room (only if not already there)
      if (this.camOpen && this.activeCam !== this.characterRoom && Math.random() < 0.4) {
        // Teleport to the room player is viewing (but not BASE)
        if (this.activeCam !== ROOM.BASE) {
          this.characterRoom = this.activeCam;
          this.playerWatchStart = 0;
          this.stareTriggered = false;
          this._updateLocationText();
          this._updateMapDot();
          this._refreshCamFeed();
          return;
        }
      }
    }

    const adjacent = ROOM_GRAPH[this.characterRoom];
    if (!adjacent || adjacent.length === 0) return;

    // If cameras are open and viewing a room (not BASE), don't move into that room
    let allowedRooms;
    if (this.camOpen && this.activeCam !== ROOM.BASE) {
      allowedRooms = adjacent.filter(r => r !== this.activeCam);
    } else {
      allowedRooms = adjacent;
    }
    
    if (allowedRooms.length === 0) return;

    // Weighted movement toward BASE (player office)
    const dist    = this._distToBase();
    const maxDist = Math.max(...Object.values(dist));
    const weights = allowedRooms.map(r => Math.pow(2, maxDist - (dist[r] ?? maxDist + 1) + 1));
    const total   = weights.reduce((a, b) => a + b, 0);
    let pick = Math.random() * total;
    let next = allowedRooms[allowedRooms.length - 1];
    for (let i = 0; i < allowedRooms.length; i++) {
      pick -= weights[i];
      if (pick <= 0) { next = allowedRooms[i]; break; }
    }

    this.characterRoom    = next;
    this.playerWatchStart = 0;
    this.stareTriggered   = false;

    if (this.characterRoom === ROOM.BASE) {
      this._triggerJumpscare();
      return;
    }

    this._updateLocationText();
    this._updateMapDot();
    if (this.camOpen) this._refreshCamFeed();
  }

  _distToBase() {
    const dist  = { [ROOM.BASE]: 0 };
    const queue = [ROOM.BASE];
    while (queue.length) {
      const cur = queue.shift();
      Object.entries(ROOM_GRAPH).forEach(([fromStr, neighbors]) => {
        const from = parseInt(fromStr);
        if (neighbors.includes(cur) && dist[from] === undefined) {
          dist[from] = dist[cur] + 1;
          queue.push(from);
        }
      });
    }
    return dist;
  }

  _updateLocationText() {
    if (this.camOpen && this.activeCam === this.characterRoom) {
      this.locationText.setText(`LOCATION: ${ROOMS[this.characterRoom]}`).setColor('#ff4444');
    } else {
      this.locationText.setText('LOCATION: UNKNOWN').setColor('#4a3a2a');
    }
  }

  _startCooldownBar() {
    const barX = this._soundBtnX, barY = this._soundBtnY + this._soundBtnH + 5, barW = this._soundBtnW;
    const steps = 60; let step = 0;
    this.cooldownText.setText('COOLDOWN...');
    this.time.addEvent({
      delay: LURE_COOLDOWN_MS / steps, repeat: steps - 1,
      callback: () => {
        step++;
        const prog = step / steps;
        this.cooldownBar.clear();
        this.cooldownBar.fillStyle(COLOURS.dimRed, 0.5);
        this.cooldownBar.fillRect(barX, barY, barW * prog, 4);
        this.cooldownBar.lineStyle(1, COLOURS.bloodRed, 0.35);
        this.cooldownBar.strokeRect(barX, barY, barW, 4);
      },
    });
  }

  // ════════════════════════════════════════════
  //  STARE — fires after watching char's cam 1.5s
  // ════════════════════════════════════════════
  _triggerStare() {
    if (this.nightOver || this.isStaring) return;
    this.isStaring = true;

    this.camNoiseImg.setAlpha(0.9);
    this.time.delayedCall(200, () => { if (this.camNoiseImg) this.camNoiseImg.setAlpha(0.3); });

    this.time.delayedCall(700, () => {
      const adj = ROOM_GRAPH[this.characterRoom].filter(r => r !== ROOM.BASE);
      if (adj.length) this.characterRoom = adj[Phaser.Math.Between(0, adj.length - 1)];
      this.playerWatchStart = 0;
      this.stareTriggered   = false;
      this.isStaring        = false;
      this._updateLocationText();
      this._updateMapDot();
      this.warningText.setAlpha(0);
      if (this.camOpen) this._refreshCamFeed();
    });
  }

  // ════════════════════════════════════════════
  //  JUMPSCARE
  // ════════════════════════════════════════════
  _triggerJumpscare() {
    if (this.nightOver) return;
    this.nightOver = true;
    if (this.aiTimer) this.aiTimer.remove();
    if (this.ambienceSound) this.ambienceSound.stop();

    this.jumpscareContainer.setVisible(true);
    this.jumpFlash.setAlpha(0.9);
    this.time.delayedCall(80, () => this.jumpFlash.setAlpha(0));
    this.tweens.add({
      targets: this.jumpSprite, alpha: 1,
      scaleX: { from: 0.4, to: 1 }, scaleY: { from: 0.4, to: 1 },
      duration: 160, ease: 'Back.easeOut',
    });
    this.cameras.main.shake(500, 0.025);
    this.cameras.main.flash(200, 200, 0, 0);
    this.time.delayedCall(2400, () => {
      this.cameras.main.fadeOut(600, 0, 0, 0);
      this.cameras.main.once('camerafadeoutcomplete', () => { this.scene.start('HomeScene'); });
    });
  }

  // ════════════════════════════════════════════
  //  NIGHT COMPLETE
  // ════════════════════════════════════════════
  _nightComplete() {
    if (this.nightOver) return;
    this.nightOver = true;
    if (this.aiTimer) this.aiTimer.remove();
    if (this.ambienceSound) this.ambienceSound.stop();

    this.cameras.main.flash(500, 200, 200, 100);
    const win = this.add.text(GAME_W / 2, GAME_H / 2, '6 AM\nYOU SURVIVED', {
      fontFamily: "'Creepster', cursive", fontSize: '58px', color: '#c8860a',
      stroke: '#000000', strokeThickness: 6, align: 'center',
    }).setOrigin(0.5).setAlpha(0).setDepth(200);
    this.tweens.add({ targets: win, alpha: 1, duration: 800, ease: 'Sine.easeIn' });
    this.time.delayedCall(3200, () => {
      this.cameras.main.fadeOut(600, 0, 0, 0);
      this.cameras.main.once('camerafadeoutcomplete', () => { this.scene.start('HomeScene'); });
    });
  }

  // ════════════════════════════════════════════
  //  UPDATE
  // ════════════════════════════════════════════
  update() {
    if (this.nightOver) return;

    // Clock
    const elapsed  = this.time.now - this.startTime;
    const progress = Math.min(elapsed / NIGHT_DURATION_MS, 1);
    const hours    = ['12', '1', '2', '3', '4', '5', '6'];
    this.clockText.setText(`${hours[Math.min(Math.floor(progress * 6), 6)]}:00 AM`);

    // Warning blink
    if (this.camOpen && this.aiActive && this.activeCam === this.characterRoom && !this.isStaring) {
      this.warningText.setAlpha(Math.sin(this.time.now / 280) > 0 ? 1 : 0);
    }

    // Stare trigger
    if (
      this.camOpen && this.aiActive && !this.isStaring && !this.stareTriggered &&
      this.playerWatchStart > 0 && this.activeCam === this.characterRoom
    ) {
      if (this.time.now - this.playerWatchStart >= this.STARE_THRESHOLD) {
        this.stareTriggered = true;
        this._triggerStare();
      }
    }
  }
}
