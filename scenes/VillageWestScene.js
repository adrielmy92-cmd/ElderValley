import WorldScene from "./WorldScene.js?v=267";

// Extensão oeste da vila — mapa SEPARADO (carrega via portão, com loading),
// pra não inflar o WorldScene e não lagar com muita gente.
// Corredor de floresta: entra pelo lado leste (vindo da vila), segue a trilha
// até o portão do novo boss no extremo oeste (placeholder por ora).
const TILE = 32;
const WORLD_W = 2400;
const WORLD_H = 1280;
const ROAD_TOP = 556;
const ROAD_BOTTOM = 684;
const ROAD_MID = Math.round((ROAD_TOP + ROAD_BOTTOM) / 2);

// Lagos pequenos (poças) — NÃO podem atravessar/dividir o mapa: sempre tem
// chão em volta pra contornar. Ficam fora da estrada e das clareiras das placas.
const LAKES = [
  { cx: 700,  cy: 250,  rx: 150, ry: 95 },
  { cx: 1500, cy: 970,  rx: 175, ry: 110 },
  { cx: 1980, cy: 260,  rx: 120, ry: 85 }
];

export default class VillageWestScene extends WorldScene {
  constructor() {
    super("VillageWestScene");
  }

  create() {
    this.creativeStoragePrefix = "village-west";
    this.manualStorageKeys = {
      fences:       "village-west-manual-fences-v1",
      trees:        "village-west-manual-trees-v1",
      floors:       "village-west-manual-floors-v1",
      structures:   "village-west-manual-structures-v1",
      windowLights: "village-west-manual-window-lights-v1"
    };
    this.manualCollisionStorageKey = "village-west-manual-collisions-v1";
    this.houseStorageKey = "village-west-editable-houses-v1";

    this.worldWidth = WORLD_W;
    this.worldHeight = WORLD_H;
    this.physics.world.setBounds(0, 0, WORLD_W, WORLD_H);
    this.cameras.main.setBounds(0, 0, WORLD_W, WORLD_H);

    this.drawForestGround();
    this.createControls();

    // Vindo da vila → leste; voltando do Cemitério → oeste (perto da plaquinha).
    const spawn = this.getSpawnPoint(this.entryData?.spawnKey);
    this.createPlayer(spawn.x, spawn.y);
    this.createCollisionGroup();
    this.silverCharacters = [];

    this.addLakes();
    this.addBoneScatter();
    this.addGhosts();
    this.addVillageReturnGate();
    this.addCemeteryGate();
    this.addRegionBanner();
    // Remove qualquer colisão manual fantasma deste mapa (foi desenhada por engano
    // no editor F4 e ficou presa no localStorage, cortando o mapa). Limpa SEMPRE —
    // o mapa do boss ainda não precisa de colisão manual salva.
    try { localStorage.removeItem("village-west-manual-collisions-v1"); } catch {}
    this.loadManualCollisionLayout([]);

    this.createHud();
    this.createDayNightCycle();
    this.createFenceEditor();

    this.player.setCollideWorldBounds(true);
    this.startStableCameraFollow();
    this.initPerformanceOptimizations();
  }

  // Vindo da vila → nasce no leste. Voltando do Cemitério → nasce no oeste,
  // logo a leste da plaquinha do cemitério (não precisa atravessar o mapa de novo).
  getSpawnPoint(spawnKey) {
    if (spawnKey === "fromCemetery") {
      return { x: 250, y: ROAD_MID };
    }
    return { x: WORLD_W - 220, y: ROAD_MID };
  }

  // ─── GROUND ──────────────────────────────────────────────────────────────
  inLake(x, y) {
    return LAKES.some((l) => {
      const dx = (x - l.cx) / l.rx;
      const dy = (y - l.cy) / l.ry;
      return dx * dx + dy * dy <= 1;
    });
  }

  // hash determinístico por tile (0..1).
  hash2(x, y) {
    let h = ((x * 374761393) ^ (y * 668265263)) >>> 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177) >>> 0;
    return (h >>> 0) / 4294967295;
  }

  // Linha da divisa grama/terra (serpenteia de leve por linha). x < divisa = terra.
  terraBoundary(y) {
    return WORLD_W * 0.44
      + Math.sin(y * 0.012) * 72
      + (this.hash2(3, Math.floor(y / TILE)) - 0.5) * 52;
  }

  isTerra(x, y) {
    return x < this.terraBoundary(y) - 24;
  }

  // Gera tiles de "terra morta" 32×32 (não há asset) p/ o degradê rumo ao boss.
  makeTerraTextures() {
    const variants = [
      [0x6b4f33, 0x563f28, 0x7d5d3c],
      [0x64492f, 0x4f3923, 0x745438]
    ];
    variants.forEach((c, i) => {
      const key = `tile-terra-${i}`;
      if (this.textures.exists(key)) return;
      const g = this.add.graphics();
      g.fillStyle(c[0], 1); g.fillRect(0, 0, TILE, TILE);
      g.fillStyle(c[1], 1);
      [[5, 6], [20, 4], [12, 16], [26, 22], [8, 26]].forEach(([px, py]) => g.fillRect(px, py, 3, 3));
      g.fillStyle(c[2], 1);
      [[15, 9], [3, 18], [24, 12], [18, 25]].forEach(([px, py]) => g.fillRect(px, py, 2, 2));
      g.lineStyle(1, c[1], 0.8); g.lineBetween(6, 28, 14, 20);
      g.generateTexture(key, TILE, TILE);
      g.destroy();
    });
  }

  drawForestGround() {
    this.createGroundLayers();
    this.makeTerraTextures();
    for (let y = 0; y < WORLD_H; y += TILE) {
      for (let x = 0; x < WORLD_W; x += TILE) {
        const onRoad = y >= ROAD_TOP && y <= ROAD_BOTTOM;
        // água tem prioridade só fora da estrada (mantém a trilha intacta)
        if (!onRoad && this.inLake(x + TILE / 2, y + TILE / 2)) {
          this.drawGroundTile("tile-water-0", x, y, { animated: true, kind: "water", variant: 0 });
          continue;
        }
        // DIVISA NÍTIDA: grama a LESTE (vila) → terra a OESTE (rumo ao boss).
        // A linha serpenteia de leve por linha, mas cada tile é 100% grama OU terra.
        const boundary = this.terraBoundary(y);
        let key;
        if (onRoad) {
          key = "tile-path";
        } else if (x + TILE / 2 < boundary) {
          key = this.hash2(x + 7, y + 13) < 0.5 ? "tile-terra-0" : "tile-terra-1";
        } else {
          const grassVariant = (((x / TILE) + (y / TILE)) % 3 + 3) % 3;
          key = `tile-grass-${grassVariant}`;
        }
        this.drawGroundTile(key, x, y);
      }
    }
    this.startGroundAnimation();
  }

  // ─── LAGOS (colisão na água + margem) ─────────────────────────────────────
  addLakes() {
    LAKES.forEach((l) => {
      // margem verde clara em volta da água
      const rim = this.add.graphics().setDepth(-20);
      rim.lineStyle(4, 0x6fae5a, 0.9);
      rim.strokeEllipse(l.cx, l.cy, l.rx * 2 + 8, l.ry * 2 + 8);
      rim.lineStyle(2, 0x3f8f46, 0.8);
      rim.strokeEllipse(l.cx, l.cy, l.rx * 2 + 2, l.ry * 2 + 2);
      // colisão só dentro da água (player anda em volta)
      for (let dy = -l.ry + 24; dy < l.ry; dy += 48) {
        const k = 1 - (dy / l.ry) * (dy / l.ry);
        if (k <= 0) continue;
        const halfW = l.rx * Math.sqrt(k) * 0.92;
        this.addSolidRect(l.cx, l.cy + dy, halfW * 2, 48);
      }
    });
  }

  // ─── OSSOS E CRÂNIOS ENTERRADOS (mais densos rumo ao oeste/boss) ───────────
  addBoneScatter() {
    let seed = 0xb04e5;
    const rand = () => {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      return seed / 0x7fffffff;
    };
    const onRoad = (y) => y >= ROAD_TOP - 10 && y <= ROAD_BOTTOM + 10;

    let placed = 0;
    let tries = 0;
    while (placed < 22 && tries < 500) {
      tries += 1;
      // viés p/ oeste (pow > 1 concentra perto de x pequeno)
      const x = Math.round(40 + Math.pow(rand(), 1.7) * (WORLD_W * 0.8));
      const y = Math.round(70 + rand() * (WORLD_H - 140));
      if (!this.isTerra(x, y)) continue;               // SÓ na parte de terra
      if (onRoad(y)) continue;
      if (this.inLake(x, y)) continue;
      if (Math.hypot(x - 150, y - 700) < 130) continue; // em volta do portão do boss
      const g = this.add.graphics().setDepth(y);
      const r = rand();
      if (r < 0.30) {
        this._drawSkull(g, x, y, 9 + rand() * 5);
      } else if (r < 0.52) {
        this._drawCarcass(g, x, y, 8 + rand() * 5, rand() * Math.PI);
      } else {
        const n = 1 + Math.floor(rand() * 2);
        for (let b = 0; b < n; b += 1) {
          this._drawBone(g, x + (rand() - 0.5) * 22, y + (rand() - 0.5) * 16,
            22 + rand() * 16, rand() * Math.PI, 5 + rand() * 2);
        }
      }
      placed += 1;
    }
  }

  // ─── FANTASMAS verdes vagando (principalmente na terra/oeste) ──────────────
  addGhosts() {
    if (!this.textures.exists("ghost-green")) return;
    if (!this.anims.exists("ghost-float")) {
      this.anims.create({
        key: "ghost-float",
        frames: this.anims.generateFrameNumbers("ghost-green", { start: 0, end: 7 }),
        frameRate: 8,
        repeat: -1
      });
    }
    this.ghosts = [];
    const COUNT = 9;
    for (let i = 0; i < COUNT; i += 1) {
      // a maioria nasce na terra (oeste); alguns chegam perto da divisa
      const x = Phaser.Math.Between(90, i < 7 ? 1000 : 1480);
      const y = Phaser.Math.Between(150, WORLD_H - 150);
      const g = this.add.sprite(x, y, "ghost-green")
        .setScale(0.55).setAlpha(0.85).setDepth(y + 60);
      g.play({ key: "ghost-float", startFrame: i % 8 });
      // respiração/flutuação sutil
      this.tweens.add({
        targets: g, scaleX: 0.6, scaleY: 0.5,
        duration: 1100 + Math.random() * 700, yoyo: true, repeat: -1, ease: "Sine.InOut"
      });
      this.ghosts.push(g);
      this._roamGhost(g);
    }
  }

  _roamGhost(g) {
    if (!g.active) return;
    // deriva curta e lenta (não cruza o mapa), enviesada à terra (oeste)
    const westBias = Math.random() < 0.8;
    let tx = g.x + Phaser.Math.Between(-240, 240) - (westBias ? 60 : 0);
    let ty = g.y + Phaser.Math.Between(-190, 190);
    tx = Phaser.Math.Clamp(tx, 90, westBias ? 1000 : 1480);
    ty = Phaser.Math.Clamp(ty, 150, WORLD_H - 150);
    const dist = Phaser.Math.Distance.Between(g.x, g.y, tx, ty);
    const speed = 26; // px/s — bem lento, flutuando
    // sem flip: o sprite é de frente (idle), virar no horizontal parece "de costas"
    this.tweens.add({
      targets: g, x: tx, y: ty,
      duration: Math.max(2200, (dist / speed) * 1000), ease: "Sine.InOut",
      onUpdate: () => g.setDepth(g.y + 60),
      onComplete: () => this.time.delayedCall(Phaser.Math.Between(500, 1600), () => this._roamGhost(g))
    });
  }

  // Carcaça de animal — só os ossos: coluna + costelas + crânio numa ponta.
  _drawCarcass(g, x, y, s, ang) {
    const BONE = 0xe8e2cf;
    const dx = Math.cos(ang);
    const dy = Math.sin(ang);
    const px = Math.cos(ang + Math.PI / 2);
    const py = Math.sin(ang + Math.PI / 2);
    const half = s * 1.7;
    // cova de terra revolvida
    g.fillStyle(0x3a2c1c, 0.45);
    g.fillEllipse(x, y, s * 3.4, s * 1.8);
    // coluna
    g.lineStyle(Math.max(2, s * 0.22), BONE, 0.95);
    g.lineBetween(x - dx * half, y - dy * half, x + dx * half, y + dy * half);
    // costelas (encurtam nas pontas)
    g.lineStyle(Math.max(1, s * 0.16), BONE, 0.9);
    const ribs = 6;
    for (let i = 0; i < ribs; i += 1) {
      const t = (i / (ribs - 1) - 0.5) * 2; // -1..1
      const cx = x + dx * half * t;
      const cy = y + dy * half * t;
      const rl = s * (1.15 - Math.abs(t) * 0.6);
      g.lineBetween(cx, cy, cx + px * rl, cy + py * rl);
      g.lineBetween(cx, cy, cx - px * rl, cy - py * rl);
    }
    // crânio numa ponta
    const hx = x + dx * half * 1.08;
    const hy = y + dy * half * 1.08;
    g.fillStyle(BONE, 1);
    g.fillCircle(hx, hy, s * 0.5);
    g.fillStyle(0x141414, 1);
    g.fillCircle(hx - px * s * 0.18, hy - py * s * 0.18, s * 0.12);
    g.fillCircle(hx + px * s * 0.18, hy + py * s * 0.12, s * 0.12);
  }

  _drawBone(g, x, y, len, ang, th) {
    const BONE = 0xe8e2cf;
    const dx = Math.cos(ang) * len / 2;
    const dy = Math.sin(ang) * len / 2;
    // cova de terra revolvida (enterrado)
    g.fillStyle(0x3a2c1c, 0.45);
    g.fillEllipse(x, y, len * 1.25, len * 0.6);
    // haste
    g.lineStyle(th, BONE, 0.95);
    g.lineBetween(x - dx, y - dy, x + dx, y + dy);
    // botões das pontas
    const k = th * 0.7;
    const ox = Math.cos(ang + Math.PI / 2) * k;
    const oy = Math.sin(ang + Math.PI / 2) * k;
    g.fillStyle(BONE, 0.95);
    g.fillCircle(x - dx + ox, y - dy + oy, k);
    g.fillCircle(x - dx - ox, y - dy - oy, k);
    g.fillCircle(x + dx + ox, y + dy + oy, k);
    g.fillCircle(x + dx - ox, y + dy - oy, k);
  }

  _drawSkull(g, x, y, s) {
    const BONE = 0xe8e2cf;
    // cova
    g.fillStyle(0x3a2c1c, 0.5);
    g.fillEllipse(x, y + s * 0.25, s * 1.9, s * 0.9);
    // mandíbula
    g.fillStyle(0xd8d2bd, 1);
    g.fillRect(x - s * 0.42, y + s * 0.28, s * 0.84, s * 0.42);
    // crânio
    g.fillStyle(BONE, 1);
    g.fillEllipse(x, y, s * 1.25, s * 1.15);
    // órbitas
    g.fillStyle(0x141414, 1);
    g.fillEllipse(x - s * 0.33, y - s * 0.04, s * 0.36, s * 0.42);
    g.fillEllipse(x + s * 0.33, y - s * 0.04, s * 0.36, s * 0.42);
    // nariz
    g.fillTriangle(x, y + s * 0.06, x - s * 0.11, y + s * 0.3, x + s * 0.11, y + s * 0.3);
    // dentes
    g.lineStyle(1, 0x141414, 0.7);
    for (let i = -2; i <= 2; i += 1) {
      g.lineBetween(x + i * s * 0.16, y + s * 0.3, x + i * s * 0.16, y + s * 0.62);
    }
  }

  // ─── PLACA DE VOLTA PARA A VILA (leste) ───────────────────────────────────
  addVillageReturnGate() {
    const x = WORLD_W - 70;
    const y = ROAD_MID;
    const post = this.add.rectangle(x - 42, y - 18, 8, 44, 0x5a3721, 1).setOrigin(0.5, 1).setDepth(y - 2);
    this.add.rectangle(x, y - 52, 96, 32, 0x7c512d, 1).setDepth(y - 1).setStrokeStyle(2, 0x3b2416, 1);
    this.add.text(x, y - 52, "Village", {
      fontFamily: "monospace", fontSize: "14px", color: "#fff0c2", stroke: "#241409", strokeThickness: 3
    }).setOrigin(0.5).setDepth(y);
    this.interactions.add({
      id: "west_return_village", x, y, promptY: y - 88,
      promptText: "E Back to the Village", radius: 84,
      onInteract: () => this.fadeTo("WorldScene", { spawnKey: "villageWest" })
    });
    return post;
  }

  // ─── PLAQUINHA DO CEMITÉRIO (oeste) → carrega o Cemitério (mapa separado) ──
  // Mesmo esquema das outras transições: só uma placa, sem portal/colisão.
  addCemeteryGate() {
    const x = 130;
    const y = ROAD_MID;
    const post = this.add.rectangle(x + 42, y - 18, 8, 44, 0x4a3326, 1)
      .setOrigin(0.5, 1).setDepth(y - 2);
    const board = this.add.rectangle(x, y - 52, 120, 32, 0x4a4f58, 1)
      .setDepth(y - 1).setStrokeStyle(2, 0x23262d, 1);
    const label = this.add.text(x, y - 52, "Cemetery", {
      fontFamily: "monospace", fontSize: "13px", color: "#cdd6cf",
      stroke: "#16190f", strokeThickness: 3
    }).setOrigin(0.5).setDepth(y);
    this.cemeteryGate = this.interactions.add({
      id: "west_cemetery_gate", x, y, promptY: y - 88,
      promptText: "E Enter the Cemetery", radius: 84,
      onInteract: () => this.fadeTo("CemeteryScene", { spawnKey: "fromWest" })
    });
    return { post, board, label };
  }

  // ─── NOME DA REGIÃO (banner que some) ─────────────────────────────────────
  addRegionBanner() {
    const cam = this.cameras.main;
    const label = this.add.text(cam.width / 2, 96, "Ancient Forest", {
      fontFamily: "monospace", fontSize: "30px", color: "#eaf6df",
      stroke: "#13210f", strokeThickness: 6
    }).setOrigin(0.5).setScrollFactor(0).setDepth(5000).setAlpha(0);
    this.tweens.add({
      targets: label, alpha: 1, duration: 700, yoyo: true, hold: 1800,
      onComplete: () => label.destroy()
    });
  }
}
