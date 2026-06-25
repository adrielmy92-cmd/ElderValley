import WorldScene from "./WorldScene.js?v=290";

// Cemitério — mapa SEPARADO, continuação da Floresta Antiga (depois da parte de
// terra morta). É o sprite/mapa animado do cemitério (GIF → vídeo) usado como
// está, com os efeitos do próprio mapa (chamas verdes etc.). Sem colisão extra.
// Entra pela plaquinha "Cemitério" no oeste da Floresta (VillageWestScene).
const MAP = 820;            // tamanho nativo do sprite do cemitério
const SCALE = 2;            // exibe maior pra ser caminhável
const WORLD_W = MAP * SCALE;
const WORLD_H = MAP * SCALE;
const GATE_X = Math.round(WORLD_W * 0.475);  // entrada (escadaria) ao sul

export default class CemeteryScene extends WorldScene {
  constructor() {
    super("CemeteryScene");
  }

  create() {
    this.creativeStoragePrefix = "cemetery";
    this.manualStorageKeys = {
      fences:       "cemetery-manual-fences-v1",
      trees:        "cemetery-manual-trees-v1",
      floors:       "cemetery-manual-floors-v1",
      structures:   "cemetery-manual-structures-v1",
      windowLights: "cemetery-manual-window-lights-v1"
    };
    this.manualCollisionStorageKey = "cemetery-manual-collisions-v1";
    this.houseStorageKey = "cemetery-editable-houses-v1";

    this.worldWidth = WORLD_W;
    this.worldHeight = WORLD_H;
    this.physics.world.setBounds(0, 0, WORLD_W, WORLD_H);
    this.cameras.main.setBounds(0, 0, WORLD_W, WORLD_H);

    this.drawCemeteryGround();
    this.createControls();

    // Entra pela escadaria ao sul.
    this.createPlayer(GATE_X, WORLD_H - 70);
    this.createCollisionGroup();
    this.silverCharacters = [];

    this.addForestReturnGate();
    this.addSkeletons();
    this.addRegionBanner();

    // Sem colisão manual salva neste mapa.
    try { localStorage.removeItem("cemetery-manual-collisions-v1"); } catch {}
    this.loadManualCollisionLayout([]);

    this.createHud();
    this.createDayNightCycle();
    this.createFenceEditor();

    this.player.setCollideWorldBounds(true);
    this.startStableCameraFollow();
    this.initPerformanceOptimizations();
  }

  getSpawnPoint() {
    return { x: GATE_X, y: WORLD_H - 70 };
  }

  // ─── CHÃO = sprite/mapa animado do cemitério (vídeo, com os efeitos do GIF) ─
  drawCemeteryGround() {
    this.createGroundLayers();
    const vid = this.add.video(WORLD_W / 2, WORLD_H / 2, "cemetery-map")
      .setOrigin(0.5)
      .setScale(SCALE)
      .setDepth(-20)
      .setLoop(true);
    vid.play(true);
    // alguns navegadores começam pausados até liberar autoplay — garante o play
    vid.on("unlocked", () => vid.play(true));
    this.cemeteryVideo = vid;
    this.startGroundAnimation();
  }

  // ─── ESQUELETOS que moram no cemitério (vagam pela arena) ─────────────────
  addSkeletons() {
    if (!this.textures.exists("skeleton")) return;
    if (!this.anims.exists("skeleton-idle")) {
      this.anims.create({
        key: "skeleton-idle",
        frames: this.anims.generateFrameNumbers("skeleton", { start: 0, end: 7 }),
        frameRate: 9,
        repeat: -1
      });
    }
    this.skeletons = [];
    const COUNT = 7;
    const MIN = 200;
    const MAXX = WORLD_W - 200;
    const MAXY = WORLD_H - 220;
    for (let i = 0; i < COUNT; i += 1) {
      const x = Phaser.Math.Between(MIN, MAXX);
      const y = Phaser.Math.Between(MIN, MAXY);
      const s = this.add.sprite(x, y, "skeleton")
        .setScale(0.5).setDepth(y);
      s.play({ key: "skeleton-idle", startFrame: i % 8 });
      s.homeX = x; s.homeY = y;   // ancora: não saem de perto da cova
      this.skeletons.push(s);
      this.time.delayedCall(Phaser.Math.Between(0, 2500), () => this._roamSkeleton(s));
    }
  }

  // Sprite é só idle de frente (encara a câmera) — não tem frames de andar pra
  // cima/lados. Então eles ficam PARADOS em idle encarando o player a maior parte
  // do tempo, e só dão passinhos curtos LATERAIS ocasionais (viram pro lado certo).
  _roamSkeleton(s) {
    if (!s.active) return;

    // encara o player na horizontal
    if (this.player) s.setFlipX(this.player.x < s.x);

    // a maioria das vezes só fica parado em idle
    if (Math.random() < 0.45) {
      this.time.delayedCall(Phaser.Math.Between(1400, 3600), () => this._roamSkeleton(s));
      return;
    }

    // passinho curto, predominantemente lateral, perto da "casa" (cova)
    const tx = Phaser.Math.Clamp(
      s.x + Phaser.Math.Between(-90, 90),
      Math.max(200, s.homeX - 120), Math.min(WORLD_W - 200, s.homeX + 120)
    );
    const ty = Phaser.Math.Clamp(
      s.y + Phaser.Math.Between(-28, 28),
      Math.max(200, s.homeY - 60), Math.min(WORLD_H - 220, s.homeY + 60)
    );
    if (tx < s.x - 4) s.setFlipX(true);
    else if (tx > s.x + 4) s.setFlipX(false);

    const dist = Phaser.Math.Distance.Between(s.x, s.y, tx, ty);
    const speed = 38; // px/s — arrastado
    this.tweens.add({
      targets: s, x: tx, y: ty,
      duration: Math.max(900, (dist / speed) * 1000), ease: "Sine.InOut",
      onUpdate: () => s.setDepth(s.y),
      onComplete: () => this.time.delayedCall(Phaser.Math.Between(1200, 3200), () => this._roamSkeleton(s))
    });
  }

  // ─── VOLTA PARA A FLORESTA (escadaria ao sul) ─────────────────────────────
  addForestReturnGate() {
    const x = GATE_X;
    const y = WORLD_H - 24;
    const post = this.add.rectangle(x - 56, y - 18, 8, 44, 0x4a3326, 1)
      .setOrigin(0.5, 1).setDepth(y - 2);
    this.add.rectangle(x - 14, y - 52, 100, 32, 0x3f6b2e, 1)
      .setDepth(y - 1).setStrokeStyle(2, 0x223b18, 1);
    this.add.text(x - 14, y - 52, "Forest", {
      fontFamily: "monospace", fontSize: "13px", color: "#eaf6df",
      stroke: "#16240f", strokeThickness: 3
    }).setOrigin(0.5).setDepth(y);
    this.interactions.add({
      id: "cemetery_exit", x, y, promptY: y - 84,
      promptText: "E Back to the Forest", radius: 92,
      onInteract: () => this.fadeTo("VillageWestScene", { spawnKey: "fromCemetery" })
    });
    return post;
  }

  // ─── NOME DA REGIÃO (banner que some) ─────────────────────────────────────
  addRegionBanner() {
    const cam = this.cameras.main;
    const label = this.add.text(cam.width / 2, 96, "Cemetery", {
      fontFamily: "monospace", fontSize: "30px", color: "#bff7c4",
      stroke: "#0c2410", strokeThickness: 6
    }).setOrigin(0.5).setScrollFactor(0).setDepth(5000).setAlpha(0);
    this.tweens.add({
      targets: label, alpha: 1, duration: 700, yoyo: true, hold: 1800,
      onComplete: () => label.destroy()
    });
  }
}
