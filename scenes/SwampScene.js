import WorldScene from "./WorldScene.js?v=249";

const SWAMP_W = 1920;
const SWAMP_H = 1920;

const PATROL_X1 = 400;
const PATROL_X2 = 1520;
const PATROL_Y1 = 400;
const PATROL_Y2 = 1440;

const TROLL_MAX_HP       = 2500;
const TROLL_RESPAWN_MS   = 25000;
const TROLL_FIREBALL_DMG = 200;
const TROLL_SPEED_IDLE   = 38;
const TROLL_SPEED_AGGRO  = 62;
const TROLL_ATK_INTERVAL = 3200; // ms entre ataques enquanto aggro
const TROLL_FIRE_PAUSE   = 900;  // ms que o troll fica parado ao soltar poder

// ─── ATAQUES ────────────────────────────────────────────────────────────────
// swamp-attacks-sheet.png — 3 linhas × 24 frames × 192×160px
//   Linha 0 (frames  0-23): BOLHA_TOXICA  — AoE bolhas no chão
//   Linha 1 (frames 24-47): ESPINHO_LAMA  — espinhos em linha
//   Linha 2 (frames 48-71): ONDA_LODO     — onda rasteira
const ATK = {
  BOLHA_TOXICA: { frames: [0, 23],  dmg: 25, radius: 70,  label: "Toxic Bubble"   },
  ESPINHO_LAMA: { frames: [24, 47], dmg: 20, radius: 40,  label: "Mud Spike" },
  ONDA_LODO:    { frames: [48, 71], dmg: 22, radius: 50,  label: "Sludge Wave"   }
};
const ATK_LIST = Object.values(ATK);


const DEFAULT_SPAWNS = [
  { x: 680,  y: 680  },
  { x: 1240, y: 680  },
  { x: 680,  y: 1240 },
  { x: 1240, y: 1240 }
];

export default class SwampScene extends WorldScene {
  constructor() {
    super("SwampScene");
  }

  create() {
    this.creativeStoragePrefix = "swamp";
    this.manualStorageKeys = {
      fences:      "swamp-manual-fences-v1",
      trees:       "swamp-manual-trees-v1",
      floors:      "swamp-manual-floors-v1",
      structures:  "swamp-manual-structures-v1",
      windowLights:"swamp-manual-window-lights-v1"
    };
    this.manualCollisionStorageKey = "swamp-manual-collisions-v1";
    this.houseStorageKey = "swamp-editable-houses-v1";

    this.worldWidth = SWAMP_W;
    this.worldHeight = SWAMP_H;
    this.physics.world.setBounds(0, 0, SWAMP_W, SWAMP_H);
    this.cameras.main.setBounds(0, 0, SWAMP_W, SWAMP_H);

    this.drawSwampGround();
    this.createControls();

    const spawn = this.getSwampSpawn();
    this.createPlayer(spawn.x, spawn.y);
    this.createCollisionGroup();
    this.silverCharacters = [];

    this.addSwampReturnPortal();
    this.loadManualCollisionLayout([]);

    this.createHud();
    this.createDayNightCycle();
    this.createFenceEditor();

    this.player.setCollideWorldBounds(true);
    this.startStableCameraFollow();
    this.initPerformanceOptimizations();

    this.swampTrolls = [];
    this.spawnAllSwampTrolls();

    this._startAmbient();
  }

  _startAmbient() {
    if (this.cache.audio.exists("swamp-ambient")) {
      this._ambientMusic = this.sound.add("swamp-ambient", { loop: true, volume: 0.35 });
      this._ambientMusic.play();
      this.events.once("shutdown", () => this._ambientMusic?.stop());
    }
  }

  getSwampSpawn() {
    const key = this.entryData?.spawnKey;
    if (key === "fromVillage") return { x: SWAMP_W / 2, y: SWAMP_H - 160 };
    return { x: SWAMP_W / 2, y: SWAMP_H / 2 };
  }

  drawSwampGround() {
    this.createGroundLayers();
    this.add.image(SWAMP_W / 2, SWAMP_H / 2, "swamp-map")
      .setDisplaySize(SWAMP_W, SWAMP_H)
      .setDepth(-20)
      .setOrigin(0.5);
    this.add.rectangle(SWAMP_W / 2, SWAMP_H / 2, SWAMP_W, SWAMP_H, 0x040e06, 0.32)
      .setDepth(-18).setOrigin(0.5);
    this.startGroundAnimation();
  }

  addSwampReturnPortal() {
    const x = SWAMP_W / 2;
    const y = SWAMP_H - 80;

    if (this.textures.exists("swamp-gate")) {
      this.add.image(x, y, "swamp-gate")
        .setOrigin(0.5, 0.88)
        .setScale(0.20)
        .setDepth(y + 120);
    } else {
      const g = this.add.graphics().setDepth(y + 80);
      g.fillStyle(0x2a3d1a, 1);
      g.fillRect(x - 52, y - 96, 22, 96);
      g.fillRect(x + 30, y - 96, 22, 96);
      g.fillStyle(0x1e2e12, 1);
      g.fillRect(x - 56, y - 112, 112, 18);
    }

    this.interactions.add({
      id: "swamp_exit",
      x, y,
      promptY: y - 260,
      promptText: "E Return to Village",
      radius: 80,
      onInteract: () => this.fadeTo("WorldScene", { spawnKey: "swampGate" })
    });
  }

  // ─── TROLLS ─────────────────────────────────────────────────────────────────

  spawnAllSwampTrolls() {
    const saved = JSON.parse(localStorage.getItem("swamp-trolls-v1") || "null");
    const positions = (Array.isArray(saved) && saved.length === 4) ? saved : DEFAULT_SPAWNS;
    localStorage.setItem("swamp-trolls-v1", JSON.stringify(positions));

    if (!this.anims.exists("swamp-troll-idle")) {
      this.anims.create({
        key: "swamp-troll-idle",
        frames: Array.from({ length: 8 }, (_, i) => ({ key: "swamp-troll", frame: i })),
        frameRate: 8,
        repeat: -1
      });
    }

    // Animações dos 3 ataques
    const atkDefs = [
      { key: "troll-bolha-toxica",  start: ATK.BOLHA_TOXICA.frames[0], end: ATK.BOLHA_TOXICA.frames[1] },
      { key: "troll-espinho-lama",  start: ATK.ESPINHO_LAMA.frames[0], end: ATK.ESPINHO_LAMA.frames[1] },
      { key: "troll-onda-lodo",     start: ATK.ONDA_LODO.frames[0],    end: ATK.ONDA_LODO.frames[1]    }
    ];
    atkDefs.forEach(({ key, start, end }) => {
      if (!this.anims.exists(key)) {
        this.anims.create({
          key,
          frames: Array.from({ length: end - start + 1 }, (_, i) => ({ key: "swamp-attacks", frame: start + i })),
          frameRate: 18,
          repeat: 0
        });
      }
    });

    positions.forEach((pos, i) => this.spawnSwampTroll(pos.x, pos.y, i));
  }

  spawnSwampTroll(x, y, index) {
    const troll = this.physics.add.sprite(x, y, "swamp-troll", 0)
      .setDepth(y + 40)
      .setScale(1.5);
    troll.body.setSize(78, 78).setOffset(4, 4);
    troll.body.setImmovable(true); // posição vem do servidor
    troll.body.setCollideWorldBounds(false);
    troll.play("swamp-troll-idle");

    troll.hp         = TROLL_MAX_HP;
    troll.maxHp      = TROLL_MAX_HP;
    troll.trollIndex = index;
    troll.dead       = false;

    this.physics.add.collider(this.player, troll);

    const hpBg = this.add.graphics().setDepth(9000);
    const hpFg = this.add.graphics().setDepth(9001);
    troll.hpBg = hpBg;
    troll.hpFg = hpFg;
    this.drawTrollHpBar(troll);

    this.swampTrolls.push(troll);
  }

  drawTrollHpBar(troll) {
    if (!troll.hpBg || !troll.hpFg) return;
    const W = 60, H = 7;
    const bx = troll.x - W / 2;
    const by = troll.y - 90;
    troll.hpBg.clear();
    troll.hpFg.clear();
    if (troll.dead || !troll.visible) return;
    troll.hpBg.fillStyle(0x111111, 0.85);
    troll.hpBg.fillRoundedRect(bx, by, W, H, 3);
    const pct = Math.max(0, troll.hp / troll.maxHp);
    const color = pct > 0.5 ? 0x44cc44 : pct > 0.25 ? 0xffaa00 : 0xff3300;
    troll.hpFg.fillStyle(color, 1);
    troll.hpFg.fillRoundedRect(bx, by, Math.max(0, W * pct), H, 3);
  }

  // Projétil do player acertou troll — envia ao servidor
  _hitTroll(troll, amount) {
    if (troll.dead || troll.invincible) return;
    troll.invincible = true;
    this.time.delayedCall(120, () => { if (troll) troll.invincible = false; });
    // Efeitos visuais locais imediatos
    troll.setTint(0xffffff);
    this.time.delayedCall(120, () => troll?.clearTint());
    this.showTrollHitEffect(troll.x, troll.y);
    this.showTrollDamageNumber(troll.x, troll.y - 60, amount);
    // Servidor decide dano, aggro e morte
    this.multiplayer?.sendHitTroll(troll.trollIndex, amount);
  }

  // ─── HANDLERS DO SERVIDOR ────────────────────────────────────────────────────

  onTrollSync(data) {
    data.trolls?.forEach(td => {
      const troll = this.swampTrolls?.[td.i];
      if (!troll) return;
      // Posição do servidor
      troll.setPosition(td.x, td.y);
      if (troll.body) troll.body.reset(td.x, td.y);
      troll.setFlipX(td.flipX ?? false);
      troll.setDepth(td.y + 40);
      // HP
      if (typeof td.hp === "number" && td.hp !== troll.hp) {
        troll.hp = td.hp;
        this.drawTrollHpBar(troll);
      }
    });
  }

  onTrollAttack(data) {
    const { atk, fromX, fromY, toX, toY } = data;
    if (atk === "bubble") this.fireBolhaToxica(fromX, fromY, toX, toY);
    if (atk === "spike")  this.fireEspinhoLama(fromX, fromY, toX, toY);
    if (atk === "sludge") this.fireOndaLodo(fromX, fromY, toX, toY);
    // Toca som de aggro na 1ª vez que um troll ataca
    if (!this._swampAggrod) {
      this._swampAggrod = true;
      this._sfx("swamp-troll-aggro", 0.65);
    }
  }

  onTrollDied(index) {
    const troll = this.swampTrolls?.[index];
    if (!troll || troll.dead) return;
    troll.dead = true;
    this.killTroll(troll);
  }

  onTrollRespawn(data) {
    const troll = this.swampTrolls?.[data.i];
    if (!troll) return;
    this._swampAggrod = false;
    troll.dead       = false;
    troll.hp         = TROLL_MAX_HP;
    troll.alpha      = 0;
    troll.scaleX     = 1.5;
    troll.scaleY     = 1.5;
    troll.clearTint();
    troll.setPosition(data.x, data.y);
    if (troll.body) troll.body.reset(data.x, data.y);
    troll.setVisible(true);
    if (troll.body) troll.body.enable = true;
    this.drawTrollHpBar(troll);
    this.tweens.add({ targets: troll, alpha: 1, duration: 800, ease: "Power2" });
  }

  showTrollHitEffect(x, y) {
    const colors = [0x44ff44, 0x22cc22, 0x88ff44, 0x66dd00, 0xaaffaa];
    const count = Phaser.Math.Between(8, 12);
    for (let i = 0; i < count; i++) {
      const g = this.add.graphics().setDepth(y + 200);
      const color = colors[Math.floor(Math.random() * colors.length)];
      const size = Phaser.Math.Between(4, 9);
      g.fillStyle(color, 1);
      g.fillCircle(0, 0, size);
      g.setPosition(
        x + Phaser.Math.Between(-22, 22),
        y + Phaser.Math.Between(-30, 10)
      );
      const angle = Math.random() * Math.PI * 2;
      const speed = Phaser.Math.Between(40, 100);
      this.tweens.add({
        targets: g,
        x: g.x + Math.cos(angle) * speed,
        y: g.y + Math.sin(angle) * speed - 30,
        alpha: 0,
        scaleX: 0.2,
        scaleY: 0.2,
        duration: Phaser.Math.Between(280, 480),
        ease: "Power2",
        onComplete: () => g.destroy()
      });
    }
    // Anel de impacto
    const ring = this.add.graphics().setDepth(y + 199);
    ring.lineStyle(3, 0x44ff44, 0.8);
    ring.strokeCircle(x, y - 10, 10);
    this.tweens.add({
      targets: ring,
      scaleX: 2.5, scaleY: 2.5,
      alpha: 0,
      duration: 250,
      ease: "Power2",
      onComplete: () => ring.destroy()
    });
  }

  showTrollDamageNumber(x, y, amount) {
    const txt = this.add.text(x, y, `-${amount}`, {
      fontFamily: "monospace", fontSize: "18px",
      color: "#ffff44", stroke: "#000000", strokeThickness: 3
    }).setOrigin(0.5).setDepth(9500);
    this.tweens.add({
      targets: txt, y: y - 55, alpha: 0, scaleX: 1.2, scaleY: 1.2,
      duration: 750, ease: "Power2", onComplete: () => txt.destroy()
    });
  }

  killTroll(troll) {
    troll.dead = true;
    troll.setVelocity(0, 0);
    troll.body.enable = false;
    this._sfx("swamp-troll-death", 0.7);
    troll.hpBg?.clear();
    troll.hpFg?.clear();
    this.tweens.add({
      targets: troll, alpha: 0, scaleX: 0.8, scaleY: 0.8,
      duration: 600, ease: "Power2",
      onComplete: () => {
        troll.setVisible(false);
        this._sfx("swamp-troll-death", 0.7);
      }
    });
  }

  // Sem AI local — posição e estado vêm do servidor via onTrollSync

  // Qualquer projétil do player acerta trolls
  _addTrollOverlap(projectile, damage) {
    this.swampTrolls?.forEach(troll => {
      if (!troll.dead && troll.body?.enable) {
        this.physics.add.overlap(projectile, troll, () => {
          if (!projectile.active) return;
          projectile.destroy();
          this._hitTroll(troll, this.spellDamage(damage));
        });
      }
    });
  }

  spawnFireball(x, y, facing) {
    const p = super.spawnFireball(x, y, facing);
    if (p) this._addTrollOverlap(p, TROLL_FIREBALL_DMG);
    return p;
  }

  spawnArrow(x, y, facing) {
    const p = super.spawnArrow(x, y, facing);
    if (p) this._addTrollOverlap(p, TROLL_FIREBALL_DMG);
    return p;
  }

  applyLightningDamage(wx, wy, radius) {
    this.swampTrolls?.forEach(troll => {
      if (!troll.active || troll.dead) return;
      const dx = troll.x - wx, dy = troll.y - wy;
      if (Math.sqrt(dx * dx + dy * dy) <= radius) {
        this._hitTroll(troll, this.spellDamage(150));
      }
    });
  }

  // ─── SFX ────────────────────────────────────────────────────────────────────

  _sfx(key, volume = 0.55) {
    if (this.cache.audio.exists(key)) {
      this.sound.play(key, { volume });
    }
  }

  // BOLHA TÓXICA — AoE no chão na posição do player com aviso
  fireBolhaToxica(fromX, fromY, toX, toY) {
    const tx = toX ?? this.player?.x ?? fromX;
    const ty = toY ?? this.player?.y ?? fromY;

    this._sfx("swamp-bubble-warn", 0.5);

    // Círculo de aviso
    const warn = this.add.graphics().setDepth(ty + 10);
    warn.fillStyle(0x44ff44, 0.22);
    warn.fillCircle(tx, ty, ATK.BOLHA_TOXICA.radius);
    warn.strokeStyle = 2;
    warn.lineStyle(2, 0x88ff44, 0.7);
    warn.strokeCircle(tx, ty, ATK.BOLHA_TOXICA.radius);

    this.time.delayedCall(800, () => {
      warn.destroy();
      this._sfx("swamp-bubble-burst", 0.6);
      const sprite = this.add.sprite(tx, ty, "swamp-attacks", ATK.BOLHA_TOXICA.frames[0])
        .setDepth(ty + 20).setScale(1.1).setOrigin(0.5, 0.8);
      sprite.play("troll-bolha-toxica");
      sprite.once("animationcomplete", () => sprite.destroy());

      // Checa dano na explosão
      const pdx = this.player.x - tx;
      const pdy = this.player.y - ty;
      if (Math.sqrt(pdx * pdx + pdy * pdy) <= ATK.BOLHA_TOXICA.radius) {
        this.takeDamage(ATK.BOLHA_TOXICA.dmg);
        this.cameras.main.shake(200, 0.008);
      }
    });
  }

  // ESPINHO DE LAMA — linha de espinhos do troll ao player
  fireEspinhoLama(fromX, fromY, toX, toY) {
    const dx = toX - fromX;
    const dy = toY - fromY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const steps = Math.min(4, Math.floor(dist / 90));

    for (let i = 0; i <= steps; i++) {
      const t = (i / Math.max(1, steps));
      const sx = fromX + dx * t;
      const sy = fromY + dy * t;
      const delay = i * 120;

      this.time.delayedCall(delay, () => {
        this._sfx("swamp-spike", 0.5);
        const sprite = this.add.sprite(sx, sy, "swamp-attacks", ATK.ESPINHO_LAMA.frames[0])
          .setDepth(sy + 20).setScale(1.0).setOrigin(0.5, 0.8);
        sprite.play("troll-espinho-lama");
        sprite.once("animationcomplete", () => sprite.destroy());

        const pdx = this.player.x - sx;
        const pdy = this.player.y - sy;
        if (Math.sqrt(pdx * pdx + pdy * pdy) <= ATK.ESPINHO_LAMA.radius) {
          this.takeDamage(ATK.ESPINHO_LAMA.dmg);
        }
      });
    }
  }

  // ONDA DE LODO — sprite que avança em direção ao player
  fireOndaLodo(fromX, fromY, toX, toY) {
    const dx = toX - fromX;
    const dy = toY - fromY;
    const dist = Math.sqrt(dx * dx + dy * dy) || 1;
    const nx = dx / dist;
    const ny = dy / dist;
    const angle = Math.atan2(dy, dx);

    this._sfx("swamp-sludge", 0.5);
    const sprite = this.physics.add.sprite(fromX, fromY, "swamp-attacks", ATK.ONDA_LODO.frames[0])
      .setDepth(fromY + 20).setScale(1.1).setOrigin(0.5, 0.8).setRotation(angle);
    sprite.body.setAllowGravity(false);
    sprite.body.setSize(80, 40);
    sprite.setVelocity(nx * 160, ny * 160);
    sprite.play("troll-onda-lodo");
    sprite.skipPerformanceCull = true;

    const overlap = this.physics.add.overlap(this.player, sprite, () => {
      if (!sprite.active) return;
      sprite.destroy();
      this.takeDamage(ATK.ONDA_LODO.dmg);
    });

    // Destroi se não acertar em 2.5s
    this.time.delayedCall(2500, () => { if (sprite.active) sprite.destroy(); });
    sprite.once("animationcomplete", () => { if (sprite.active) sprite.destroy(); });
  }

  onPlayerDeath() {
    if (this.playerDying) return;
    this.playerDying = true;
    this.player?.setVelocity(0, 0);
    const cx = this.cameras.main.centerX;
    const cy = this.cameras.main.centerY;
    const msg = this.add.text(cx, cy, "You were defeated...", {
      fontFamily: "monospace", fontSize: "28px", color: "#ff4444",
      stroke: "#000000", strokeThickness: 6
    }).setOrigin(0.5).setScrollFactor(0).setDepth(9999);
    this.cameras.main.shake(300, 0.018);
    this.cameras.main.fadeOut(1600, 60, 0, 0);
    this.time.delayedCall(1800, () => {
      this.playerHp = this.playerMaxHp;
      this.playerDying = false;
      msg.destroy();
      this.fadeTo("WorldScene", { spawnKey: "swampGate" });
    });
  }

  // Sem rio — anula colisão de água herdada
  rebuildWaterCollision() {}

  update(time, delta) {
    this.updatePerformanceOptimizations(delta);
    this.updateFenceEditor();
    this.updateBase();
  }
}
