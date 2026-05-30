import WorldScene from "./WorldScene.js?v=222";

const BEE_W = 2752;
const BEE_H = 1536;

const BOSS_MAX_HP       = 12000;
const BOSS_RESPAWN_MS   = 28000;
const BOSS_FIREBALL_DMG = 200;
const BOSS_STING_DMG    = 55;
const BOSS_PUDDLE_DMG   = 28;
const BOSS_DIVE_DMG     = 130;
const BOSS_DASH_DMG     = 65;

const PHASE_CFG = {
  1: { speed: 110, atkInterval: 1800, orbitSpeed: 0,      atkRange: 480, specialInterval: 18000 },
  2: { speed: 145, atkInterval: 1300, orbitSpeed: 0.0012, atkRange: 540, specialInterval: 11000 },
  3: { speed: 185, atkInterval: 900,  orbitSpeed: 0.0020, atkRange: 600, specialInterval: 7000  }
};

const PATROL_PTS = [
  { x: BEE_W * 0.28, y: BEE_H * 0.28 },
  { x: BEE_W * 0.50, y: BEE_H * 0.22 },
  { x: BEE_W * 0.72, y: BEE_H * 0.28 },
  { x: BEE_W * 0.72, y: BEE_H * 0.52 },
  { x: BEE_W * 0.50, y: BEE_H * 0.42 },
  { x: BEE_W * 0.28, y: BEE_H * 0.52 },
];

export default class BeeScene extends WorldScene {
  constructor() {
    super("BeeScene");
  }

  create() {
    this.creativeStoragePrefix = "bee";
    this.manualStorageKeys = {
      fences:       "bee-manual-fences-v1",
      trees:        "bee-manual-trees-v1",
      floors:       "bee-manual-floors-v1",
      structures:   "bee-manual-structures-v1",
      windowLights: "bee-manual-window-lights-v1"
    };
    this.manualCollisionStorageKey = "bee-manual-collisions-v1";
    this.houseStorageKey = "bee-editable-houses-v1";

    this.worldWidth  = BEE_W;
    this.worldHeight = BEE_H;
    this.physics.world.setBounds(0, 0, BEE_W, BEE_H);
    this.cameras.main.setBounds(0, 0, BEE_W, BEE_H);

    this.drawBeeGround();
    this.createControls();

    const spawn = this._getBeeSpawn();
    this.createPlayer(spawn.x, spawn.y);
    this.createCollisionGroup();
    this.silverCharacters = [];

    this._addBeeReturnPortal();
    this.loadManualCollisionLayout([]);

    this.createHud();
    this.createDayNightCycle();
    this.createFenceEditor();

    this.player.setCollideWorldBounds(true);
    this.startStableCameraFollow();
    this.initPerformanceOptimizations();

    this._spawnBeeBoss();
    this._initSoldiers();
    this._startAmbient();
  }

  // ─── SOLDADOS ────────────────────────────────────────────────────────────────

  _initSoldiers() {
    if (!this.anims.exists("bee-soldier-idle")) {
      this.anims.create({
        key: "bee-soldier-idle",
        frames: Array.from({ length: 8 }, (_, i) => ({ key: "bee-soldier-sheet", frame: i })),
        frameRate: 8, repeat: -1
      });
    }
    this._soldiers = [];
    this._soldierSpawnCooldown = 0;
  }

  _spawnSoldier(fromX, fromY) {
    if (!fromX) {
      // Aparece de um dos lados do mapa
      const side = Math.random() < 0.5;
      fromX = side ? 80 : BEE_W - 80;
      fromY = Phaser.Math.Between(BEE_H * 0.2, BEE_H * 0.8);
    }

    const s = this.physics.add.sprite(fromX, fromY, "bee-soldier-sheet", 0)
      .setScale(1.6).setDepth(fromY + 30);
    s.body.setSize(42, 42).setOffset(9, 9);
    s.body.setCollideWorldBounds(true);
    s.play("bee-soldier-idle");

    s.hp        = 350;
    s.maxHp     = 350;
    s.dead      = false;
    s.lastAtk   = 0;
    s.lastSting = 0;

    // Entrada dramática — aparece pequeno e cresce
    s.setScale(0.2).setAlpha(0);
    this.tweens.add({ targets: s, scaleX: 1.6, scaleY: 1.6, alpha: 1, duration: 400, ease: "Back.out" });

    // Partículas de entrada
    for (let i = 0; i < 8; i++) {
      const g = this.add.graphics().setDepth(fromY + 50);
      g.fillStyle(0xffcc00, 1);
      g.fillCircle(0, 0, Phaser.Math.Between(3, 7));
      g.setPosition(fromX, fromY);
      const a = Math.random() * Math.PI * 2, spd = Phaser.Math.Between(40, 100);
      this.tweens.add({ targets: g, x: g.x + Math.cos(a)*spd, y: g.y + Math.sin(a)*spd, alpha: 0, duration: 500, onComplete: () => g.destroy() });
    }

    this.physics.add.collider(s, this.player, () => {
      if (s.dead || !this.player) return;
      const now = this.time.now;
      if (now - s.lastAtk < 900) return;
      s.lastAtk = now;
      this.takeDamage(30);
      this.cameras.main.shake(120, 0.007);
    });

    if (this.solids) this.physics.add.collider(s, this.solids);

    this._soldiers.push(s);

    // HP bar do soldado
    s.hpBar = this.add.graphics().setDepth(s.depth + 5);
    this._drawSoldierHpBar(s);

    return s;
  }

  _drawSoldierHpBar(s) {
    if (!s.hpBar) return;
    s.hpBar.clear();
    if (s.dead || !s.active) return;
    const W = 44, H = 5;
    const bx = s.x - W / 2, by = s.y - 58;
    s.hpBar.fillStyle(0x111111, 0.85);
    s.hpBar.fillRect(bx, by, W, H);
    const pct = Math.max(0, s.hp / s.maxHp);
    s.hpBar.fillStyle(pct > 0.5 ? 0xffdd00 : 0xff4400, 1);
    s.hpBar.fillRect(bx, by, W * pct, H);
  }

  _hitSoldier(soldier, amount) {
    if (!soldier || soldier.dead) return;
    soldier.hp -= amount;
    soldier.setTintFill(0xffffff);
    this.time.delayedCall(100, () => { if (!soldier.dead) soldier.clearTint(); });
    this._drawSoldierHpBar(soldier);
    if (soldier.hp <= 0) this._killSoldier(soldier);
  }

  _killSoldier(soldier) {
    if (!soldier || soldier.dead) return;
    soldier.dead = true;
    soldier.body.enable = false;
    soldier.hpBar?.destroy();
    this.cameras.main.shake(180, 0.008);
    this.tweens.add({
      targets: soldier, alpha: 0, scaleX: 2.2, scaleY: 2.2,
      duration: 400, ease: "Power2",
      onComplete: () => { soldier.destroy(); }
    });
    for (let i = 0; i < 10; i++) {
      const g = this.add.graphics().setDepth(soldier.y + 100);
      g.fillStyle(i % 2 === 0 ? 0xffcc00 : 0xff8800, 1);
      g.fillCircle(0, 0, Phaser.Math.Between(3, 8));
      g.setPosition(soldier.x + Phaser.Math.Between(-20, 20), soldier.y + Phaser.Math.Between(-20, 10));
      const a = Math.random() * Math.PI * 2;
      this.tweens.add({ targets: g, x: g.x + Math.cos(a)*80, y: g.y + Math.sin(a)*80 - 30, alpha: 0, duration: 500, onComplete: () => g.destroy() });
    }
    this._soldiers = this._soldiers.filter(s => s !== soldier);
  }

  _callSoldiers(count) {
    const boss = this.beeBoss;
    if (!boss) return;
    this._queenSpeak("bee-queen-soldiers", "SOLDADOS!! ATAQUEM!!");
    for (let i = 0; i < count; i++) {
      this.time.delayedCall(i * 350, () => {
        if (!boss.dead) this._spawnSoldier();
      });
    }
  }

  _updateSoldiers(time) {
    if (!this.player || !this._soldiers) return;

    const furiosos = this.beeBoss?.state === "vulnerable" || this.beeBoss?.phase === 3;
    const speed    = furiosos ? 155 : 120;

    for (const s of [...this._soldiers]) {
      if (!s.active || s.dead) continue;

      const dx   = this.player.x - s.x;
      const dy   = this.player.y - s.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      s.body.setVelocity((dx / dist) * speed, (dy / dist) * speed);
      s.setFlipX(dx > 0);
      s.setDepth(s.y + 30);
      this._drawSoldierHpBar(s);

      // Tint de fúria
      if (furiosos && !s._furious) { s._furious = true; s.setTint(0xff5500); }
      else if (!furiosos && s._furious) { s._furious = false; s.clearTint(); }

      // Ferrão do soldado
      if (dist < 380 && time - s.lastSting > 2500) {
        s.lastSting = time;
        const angle = Math.atan2(dy, dx);
        this._fireSoldierSting(s.x, s.y, angle);
      }
    }
  }

  _fireSoldierSting(fromX, fromY, angle) {
    const g = this.add.graphics().setDepth(fromY + 15);
    g.fillStyle(0xffaa00, 1);
    g.fillEllipse(0, 0, 14, 8);

    const sting = this.physics.add.image(fromX, fromY, "__DEFAULT").setAlpha(0);
    sting.body.setAllowGravity(false);
    sting.body.setSize(10, 8);
    sting.setVelocity(Math.cos(angle) * 200, Math.sin(angle) * 200);

    const upd = () => {
      if (!sting.active) { g.destroy(); return; }
      g.setPosition(sting.x, sting.y).setRotation(angle);
    };
    this.events.on("update", upd);
    sting.once("destroy", () => this.events.off("update", upd));

    this.physics.add.overlap(this.player, sting, () => {
      if (!sting.active) return;
      sting.destroy(); g.destroy();
      this.takeDamage(20);
      this.cameras.main.shake(100, 0.005);
    });
    if (this.solids) this.physics.add.collider(sting, this.solids, () => { if (sting.active) { sting.destroy(); g.destroy(); } });
    this.time.delayedCall(2000, () => { if (sting.active) { sting.destroy(); g.destroy(); } });
  }

  _startAmbient() {
    if (this.cache.audio.exists("bee-ambient")) {
      this._ambientMusic = this.sound.add("bee-ambient", { loop: true, volume: 0.12 });
      this._ambientMusic.play();
      this.events.once("shutdown", () => this._ambientMusic?.stop());
    }
  }

  _startBattleMusic() {
    if (this._battleMusic?.isPlaying) return;
    this._ambientMusic?.stop();
    if (this.cache.audio.exists("bee-battle")) {
      this._battleMusic = this.sound.add("bee-battle", { loop: true, volume: 0 });
      this._battleMusic.play();
      // Fade in da música de batalha
      this.tweens.add({ targets: this._battleMusic, volume: 0.12, duration: 1500 });
      this.events.once("shutdown", () => this._battleMusic?.stop());
    }
  }

  _stopBattleMusic() {
    if (!this._battleMusic?.isPlaying) return;
    this.tweens.add({
      targets: this._battleMusic, volume: 0, duration: 1200,
      onComplete: () => {
        this._battleMusic?.stop();
        this._startAmbient();
      }
    });
  }

  _sfx(key, volume = 0.6) {
    if (this.cache.audio.exists(key)) this.sound.play(key, { volume });
  }

  _getBeeSpawn() {
    const key = this.entryData?.spawnKey;
    if (key === "fromVillage") return { x: BEE_W / 2, y: BEE_H - 180 };
    return { x: BEE_W / 2, y: BEE_H / 2 };
  }

  // ─── GROUND ─────────────────────────────────────────────────────────────────

  drawBeeGround() {
    this.createGroundLayers();
    this.add.image(BEE_W / 2, BEE_H / 2, "bee-map")
      .setDepth(-20).setOrigin(0.5);
    this.add.rectangle(BEE_W / 2, BEE_H / 2, BEE_W, BEE_H, 0x3a2000, 0.12)
      .setDepth(-18).setOrigin(0.5);
    this.startGroundAnimation();
  }

  // ─── SPAWN ───────────────────────────────────────────────────────────────────

  _spawnBeeBoss() {
    if (!this.anims.exists("bee-boss-idle")) {
      this.anims.create({
        key: "bee-boss-idle",
        frames: Array.from({ length: 8 }, (_, i) => ({ key: "bee-boss-idle-sheet", frame: i })),
        frameRate: 8,
        repeat: -1
      });
    }

    const x = BEE_W / 2;
    const y = BEE_H * 0.32;

    const boss = this.physics.add.sprite(x, y, "bee-boss-idle-sheet", 0)
      .setDepth(y + 40).setScale(2.8);
    boss.body.setSize(84, 80).setOffset(9, 11);
    boss.body.setCollideWorldBounds(true);
    boss.body.setImmovable(true);
    boss.play("bee-boss-idle");

    boss.hp           = BOSS_MAX_HP;
    boss.maxHp        = BOSS_MAX_HP;
    boss.phase        = 1;
    boss.state        = "patrol";
    boss.patrolIdx    = 0;
    boss.lastAtk      = 0;
    boss.lastSpecial  = 0;
    boss.invincible   = false;
    boss._orbitAngle  = 0;
    boss._dashHit     = false;
    boss._diveHit     = false;

    this.physics.add.collider(this.player, boss);

    boss.hpBg = this.add.graphics().setDepth(9000);
    boss.hpFg = this.add.graphics().setDepth(9001);
    this._drawBossHpBar(boss);

    this._bossLabel = this.add.text(x, y - 220, "Queen of Bees", {
      fontFamily: "monospace", fontSize: "14px",
      color: "#ffdd44", stroke: "#3a2000", strokeThickness: 4
    }).setOrigin(0.5).setDepth(9002);

    // ── Barra de vida no topo da tela ──────────────────────────────────────────
    const cw = this.cameras.main.width;
    const BAR_W = 340, BAR_H = 20;
    const tbx = (cw - BAR_W) / 2;

    boss.topBg = this.add.graphics().setDepth(9950).setScrollFactor(0);
    boss.topFg = this.add.graphics().setDepth(9951).setScrollFactor(0);
    boss.topLabel = this.add.text(cw / 2, 12, "⚔  Rainha das Abelhas  ⚔", {
      fontFamily: "monospace", fontSize: "13px",
      color: "#ffdd44", stroke: "#1a0a00", strokeThickness: 4
    }).setOrigin(0.5, 1).setScrollFactor(0).setDepth(9952);
    this._drawTopHpBar(boss);

    this.beeBoss = boss;
  }

  // ─── HP BAR ──────────────────────────────────────────────────────────────────

  _drawBossHpBar(boss) {
    this._drawTopHpBar(boss);
    if (!boss.hpBg || !boss.hpFg) return;
    const W = 120, H = 10;
    const bx = boss.x - W / 2;
    const by = boss.y - 200;
    boss.hpBg.clear();
    boss.hpFg.clear();
    if (boss.dead || !boss.visible) return;
    boss.hpBg.fillStyle(0x111111, 0.9);
    boss.hpBg.fillRoundedRect(bx - 2, by - 2, W + 4, H + 4, 4);
    const pct = Math.max(0, boss.hp / boss.maxHp);
    const color = pct > 0.66 ? 0xffdd00 : pct > 0.33 ? 0xff8800 : 0xff2200;
    boss.hpFg.fillStyle(color, 1);
    boss.hpFg.fillRoundedRect(bx, by, Math.max(0, W * pct), H, 3);
    boss.hpBg.lineStyle(2, 0xffffff, 0.45);
    [0.66, 0.33].forEach(t => boss.hpBg.strokeRect(bx + W * t - 1, by, 2, H));
  }

  _drawTopHpBar(boss) {
    if (!boss.topBg || !boss.topFg) return;
    const cw  = this.cameras.main.width;
    const BAR_W = 340, BAR_H = 20;
    const bx  = (cw - BAR_W) / 2;
    const by  = 16;

    boss.topBg.clear();
    boss.topFg.clear();

    if (boss.dead || !boss.visible) { boss.topLabel?.setVisible(false); return; }
    boss.topLabel?.setVisible(true);

    boss.topBg.fillStyle(0x000000, 0.78);
    boss.topBg.fillRoundedRect(bx - 4, by - 4, BAR_W + 8, BAR_H + 8, 6);
    boss.topBg.lineStyle(2, 0xffdd44, 0.5);
    boss.topBg.strokeRoundedRect(bx - 4, by - 4, BAR_W + 8, BAR_H + 8, 6);
    boss.topBg.lineStyle(2, 0xffffff, 0.25);
    [0.66, 0.33].forEach(t => boss.topBg.strokeRect(bx + BAR_W * t - 1, by, 2, BAR_H));

    const pct   = Math.max(0, boss.hp / boss.maxHp);
    const color = pct > 0.66 ? 0xffdd00 : pct > 0.33 ? 0xff8800 : 0xff2200;
    boss.topFg.fillStyle(color, 1);
    boss.topFg.fillRoundedRect(bx, by, Math.max(0, BAR_W * pct), BAR_H, 4);
  }

  // ─── FASE ────────────────────────────────────────────────────────────────────

  _getBossPhase() {
    const pct = this.beeBoss.hp / this.beeBoss.maxHp;
    if (pct > 0.66) return 1;
    if (pct > 0.33) return 2;
    return 3;
  }

  // Só vira o sprite quando há movimento horizontal significativo — evita flicker
  _updateFlip(boss, vx) {
    if (Math.abs(vx) > 20) boss.setFlipX(vx < 0);
  }

  // ─── HELPERS ─────────────────────────────────────────────────────────────────

  // Mantém posição dentro dos bounds com margem
  _clamp(x, y, margin = 160) {
    return {
      x: Phaser.Math.Clamp(x, margin, BEE_W - margin),
      y: Phaser.Math.Clamp(y, margin, BEE_H - margin)
    };
  }

  _triggerQueenVoice() {
    if (this._voicePlayed) return;
    this._voicePlayed = true;
    this.time.delayedCall(1200, () => {
      this._queenSpeak("bee-queen-aggro", "Sua presença aqui é uma AFRONTA à Colmeia!");
    });
  }

  _queenSpeak(audioKey, line) {
    if (this._queenSpeaking) return;
    this._queenSpeaking = true;

    if (this.cache.audio.exists(audioKey)) {
      const snd = this.sound.add(audioKey, { volume: 1.0 });
      snd.once("complete", () => { this._queenSpeaking = false; });
      snd.once("stop",     () => { this._queenSpeaking = false; });
      snd.play();
    } else {
      this._queenTTS(line, () => { this._queenSpeaking = false; });
    }

    this._showQueenScreamEffect();
    this._showQueenSubtitle(`" ${line} "`);
  }

  _queenTTS(text, onDone) {
    if (!window.speechSynthesis) { onDone?.(); return; }
    window.speechSynthesis.cancel();
    const u    = new SpeechSynthesisUtterance(text);
    u.lang     = "pt-BR";
    u.pitch    = 0.4;
    u.rate     = 0.72;
    u.volume   = 1.0;
    u.onend    = () => onDone?.();
    u.onerror  = () => onDone?.();
    const speak = () => {
      const voices = window.speechSynthesis.getVoices();
      const pick = voices.find(v => v.lang.startsWith("pt")) ?? voices[0];
      if (pick) u.voice = pick;
      window.speechSynthesis.speak(u);
    };
    if (window.speechSynthesis.getVoices().length > 0) speak();
    else window.speechSynthesis.addEventListener("voiceschanged", speak, { once: true });
  }

  _showQueenScreamEffect() {
    const boss = this.beeBoss;
    if (!boss || boss.dead) return;
    const bx = boss.x, by = boss.y;

    // Burst lines radiating outward
    const numRays = 14;
    for (let i = 0; i < numRays; i++) {
      const angle = (Math.PI * 2 / numRays) * i + (Math.random() * 0.2);
      const g = this.add.graphics().setDepth(by + 310);
      const inner = 58 + Math.random() * 12;
      const len   = 50 + Math.random() * 60;
      const thick = Math.random() < 0.4 ? 4 : 2;
      g.lineStyle(thick, i % 2 === 0 ? 0xffee00 : 0xff9900, 1);
      g.beginPath();
      g.moveTo(bx + Math.cos(angle) * inner, by + Math.sin(angle) * inner);
      g.lineTo(bx + Math.cos(angle) * (inner + len), by + Math.sin(angle) * (inner + len));
      g.strokePath();
      this.tweens.add({ targets: g, alpha: 0, scaleX: 1.6, scaleY: 1.6, duration: 550 + Math.random() * 200, ease: "Power2", onComplete: () => g.destroy() });
    }

    // Expanding shockwave rings
    [0, 120, 260].forEach((delay, i) => {
      this.time.delayedCall(delay, () => {
        const ring = this.add.graphics().setDepth(by + 308);
        ring.lineStyle(5 - i, i === 0 ? 0xffee00 : 0xffaa00, 1);
        ring.strokeCircle(bx, by, 48 + i * 8);
        this.tweens.add({ targets: ring, scaleX: 4, scaleY: 4, alpha: 0, duration: 650, ease: "Power2", onComplete: () => ring.destroy() });
      });
    });

    // Floating "!" shards
    ["!", "!!", "!!!"].forEach((str, i) => {
      const angle = -Math.PI / 2 + (i - 1) * 0.55;
      const dist  = 80 + i * 20;
      const ex = this.add.text(bx + Math.cos(angle) * dist, by + Math.sin(angle) * dist, str, {
        fontFamily: "monospace", fontSize: `${18 + i * 4}px`,
        color: "#ffee00", stroke: "#cc5500", strokeThickness: 4
      }).setOrigin(0.5).setDepth(by + 315);
      this.tweens.add({
        targets: ex,
        x: ex.x + Math.cos(angle) * 55,
        y: ex.y + Math.sin(angle) * 55 - 30,
        alpha: 0, scaleX: 1.8, scaleY: 1.8,
        duration: 800, delay: i * 80, ease: "Power2",
        onComplete: () => ex.destroy()
      });
    });

    // Boss pulse
    this.tweens.add({ targets: boss, scaleX: 3.3, scaleY: 3.3, duration: 140, yoyo: true, repeat: 2, ease: "Sine.inOut", onComplete: () => { if (!boss.dead) boss.setScale(2.8); } });
  }

  _showQueenSubtitle(text) {
    const cx = this.cameras.main.centerX;
    const cy = this.cameras.main.centerY;
    const sub = this.add.text(cx, cy + 130, text, {
      fontFamily: "monospace", fontSize: "17px",
      color: "#ffee88", stroke: "#3a2000", strokeThickness: 5,
      backgroundColor: "#000000aa", padding: { x: 16, y: 8 }
    }).setOrigin(0.5).setScrollFactor(0).setDepth(9992).setAlpha(0).setScale(0.85);
    this.tweens.add({ targets: sub, alpha: 1, scaleX: 1, scaleY: 1, duration: 280, ease: "Back.out" });
    this.time.delayedCall(3800, () => {
      this.tweens.add({ targets: sub, alpha: 0, y: cy + 110, duration: 500, ease: "Power2", onComplete: () => sub.destroy() });
    });
  }

  _triggerBattleTaunt(phase) {
    const pool = {
      1: [
        { k: "bee-queen-t1", t: "Intruso tolo! A Colmeia não perdoa invasores!" },
        { k: "bee-queen-t2", t: "Sua espécie não é nada além de um inseto a ser esmagado!" },
        { k: "bee-queen-t3", t: "Sinta a ira da Colmeia, sua pequena praga!" },
      ],
      2: [
        { k: "bee-queen-t4", t: "Você está começando a me IRRITAR!" },
        { k: "bee-queen-t5", t: "Todo o Enxame observa enquanto eu te destruo!" },
        { k: "bee-queen-t6", t: "Você realmente achou que poderia machucar uma rainha?!" },
      ],
      3: [
        { k: "bee-queen-t7", t: "Veja o que você fez! Vou te fazer SOFRER!" },
        { k: "bee-queen-t8", t: "Seus gritos vão ecoar por esta Colmeia para sempre!" },
        { k: "bee-queen-t9", t: "Nada pode te salvar agora. Nem mesmo os deuses!" },
      ]
    };
    const lines = pool[phase] ?? pool[1];
    const { k, t } = lines[Math.floor(Math.random() * lines.length)];
    this._queenSpeak(k, t);
  }

  // Só verifica stuck quando o boss está ativamente se movendo
  _unstuckCheck(boss, time) {
    // Se o body não tem velocidade significativa, reseta o timer e sai
    const vx = boss.body?.velocity.x ?? 0;
    const vy = boss.body?.velocity.y ?? 0;
    if (Math.abs(vx) + Math.abs(vy) < 30) {
      boss._stuckPos = null;
      return;
    }

    if (!boss._stuckPos) {
      boss._stuckPos = { x: boss.x, y: boss.y, t: time };
      return;
    }
    const moved = Math.abs(boss.x - boss._stuckPos.x) + Math.abs(boss.y - boss._stuckPos.y);
    if (moved > 12) {
      boss._stuckPos = { x: boss.x, y: boss.y, t: time };
    } else if (time - boss._stuckPos.t > 800) {
      // Realmente preso na parede — empurra para dentro
      const toCX = BEE_W / 2 - boss.x;
      const toCY = BEE_H / 2 - boss.y;
      const d    = Math.sqrt(toCX * toCX + toCY * toCY) || 1;
      boss.body.setVelocity((toCX / d) * 200, (toCY / d) * 200);
      boss._stuckPos = { x: boss.x, y: boss.y, t: time };
    }
  }

  // ─── AI PRINCIPAL ────────────────────────────────────────────────────────────

  _updateBeeBoss(time, delta) {
    const boss = this.beeBoss;
    if (!boss || boss.dead || !this.player) return;

    // Separação forçada — garante que o player não atravessa a boss
    const PUSH_RADIUS = 145;
    const _pdx = this.player.x - boss.x;
    const _pdy = this.player.y - boss.y;
    const _pd  = Math.sqrt(_pdx * _pdx + _pdy * _pdy);
    if (_pd > 0 && _pd < PUSH_RADIUS) {
      const overlap = PUSH_RADIUS - _pd;
      this.player.x += (_pdx / _pd) * overlap;
      this.player.y += (_pdy / _pd) * overlap;
    }

    const dx   = this.player.x - boss.x;
    const dy   = this.player.y - boss.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    // ── estados que bloqueiam movimento normal ──
    if (boss.state === "telegraph" || boss.state === "vulnerable") {
      boss.body.setVelocity(0, 0);
      boss.setDepth(boss.y + 40);
      this._drawBossHpBar(boss);
      this._bossLabel?.setPosition(boss.x, boss.y - 220);
      return;
    }

    if (boss.state === "special") {
      boss.body.setVelocity(0, 0);
      boss.setDepth(boss.y + 40);
      this._drawBossHpBar(boss);
      this._bossLabel?.setPosition(boss.x, boss.y - 220);
      return;
    }

    if (boss.state === "special_dive") {
      this._updateRoyalDive(boss);
      boss.setDepth(boss.y + 40);
      this._drawBossHpBar(boss);
      this._bossLabel?.setPosition(boss.x, boss.y - 220);
      return;
    }

    if (boss.state === "special_dash") {
      this._updateFranticDash(boss);
      boss.setDepth(boss.y + 40);
      this._drawBossHpBar(boss);
      this._bossLabel?.setPosition(boss.x, boss.y - 220);
      return;
    }

    if (boss.state === "special_burst") {
      boss.body.setVelocity(0, 0);
      boss.setDepth(boss.y + 40);
      this._drawBossHpBar(boss);
      this._bossLabel?.setPosition(boss.x, boss.y - 220);
      return;
    }

    // ── aggro ──
    if (dist < 560 && boss.state === "patrol") {
      boss.state = "chase";
      boss.lastSpecial = time;
      this._startBattleMusic();
      this._triggerQueenVoice();
      this._lastTauntTime = time;
    }
    if (dist > 900 && boss.state === "chase") {
      boss.state = "patrol";
      this._stopBattleMusic();
    }

    // ── taunts periódicos durante batalha ──
    if (boss.state === "chase" && time - (this._lastTauntTime ?? 0) > 28000) {
      this._lastTauntTime = time;
      this._triggerBattleTaunt(boss.phase);
    }

    const cfg = PHASE_CFG[boss.phase];

    if (boss.state === "chase") {
      // Especial (fase 2+)
      if (time - boss.lastSpecial > cfg.specialInterval) {
        boss.lastSpecial = time;
        const r = Math.random();
        if (boss.phase === 1 || r < 0.33) this._doRadialBurst();
        else if (r < 0.66) this._doRoyalDive();
        else this._doFranticDash();
        return;
      }

      // Movimento
      if (boss.phase === 1) {
        boss.body.setVelocity((dx / dist) * cfg.speed, (dy / dist) * cfg.speed);
      } else {
        boss._orbitAngle += cfg.orbitSpeed * (delta ?? 16);
        const orbitDist = 300;
        const rawTx = this.player.x + Math.cos(boss._orbitAngle) * orbitDist;
        const rawTy = this.player.y + Math.sin(boss._orbitAngle) * orbitDist;
        const { x: tx, y: ty } = this._clamp(rawTx, rawTy, 160);
        const odx = tx - boss.x, ody = ty - boss.y;
        const od  = Math.sqrt(odx * odx + ody * ody) || 1;
        boss.body.setVelocity((odx / od) * cfg.speed, (ody / od) * cfg.speed);
      }
      this._unstuckCheck(boss, time);

      // Ataque normal
      if (dist < cfg.atkRange && time - boss.lastAtk > cfg.atkInterval) {
        boss.lastAtk = time;
        this._telegraphAttack();
      }
    } else {
      // Patrulha
      const pt    = PATROL_PTS[boss.patrolIdx];
      const pdx   = pt.x - boss.x;
      const pdy   = pt.y - boss.y;
      const pdist = Math.sqrt(pdx * pdx + pdy * pdy);
      if (pdist < 30) {
        boss.patrolIdx = (boss.patrolIdx + 1) % PATROL_PTS.length;
      } else {
        boss.body.setVelocity((pdx / pdist) * 55, (pdy / pdist) * 55);
        this._updateFlip(boss, pdx);
      }
    }

    // Flip baseado na velocidade real — sem flicker
    this._updateFlip(boss, boss.body.velocity.x);

    boss.setDepth(boss.y + 40);
    this._drawBossHpBar(boss);
    this._bossLabel?.setPosition(boss.x, boss.y - 220);
  }

  // ─── ATAQUE NORMAL (telegraph) ───────────────────────────────────────────────

  _telegraphAttack() {
    const boss = this.beeBoss;
    if (!boss || boss.dead || !this.player) return;
    boss.state = "telegraph";

    const tx = this.player.x;
    const ty = this.player.y;

    this.tweens.add({
      targets: boss, scaleX: 3.2, scaleY: 3.2,
      duration: 180, yoyo: true, repeat: 2, ease: "Sine.inOut",
      onComplete: () => { if (!boss.dead) boss.setScale(2.8); }
    });

    const warn = this.add.graphics().setDepth(ty + 8);
    const wr = boss.phase === 3 ? 110 : 70;
    warn.fillStyle(0xffcc00, 0.2);
    warn.fillCircle(tx, ty, wr);
    warn.lineStyle(3, 0xff8800, 0.85);
    warn.strokeCircle(tx, ty, wr);
    this.tweens.add({ targets: warn, scaleX: 0.3, scaleY: 0.3, alpha: 0.6, duration: 750, ease: "Linear" });

    this.time.delayedCall(800, () => {
      warn.destroy();
      if (boss.dead) return;

      if (boss.phase === 1)      this._fireSpread(boss.x, boss.y, tx, ty, 1);
      else if (boss.phase === 2) this._fireSpread(boss.x, boss.y, tx, ty, 3);
      else { this._fireSpread(boss.x, boss.y, tx, ty, 5); this._fireHoneyPuddle(tx, ty); }

      this._enterVulnerable(650);
    });
  }

  // ─── ESPECIAL 1: MERGULHO REAL ───────────────────────────────────────────────

  _doRoyalDive() {
    const boss = this.beeBoss;
    if (!boss || boss.dead || !this.player) return;

    boss.state = "special";
    boss.body.setVelocity(0, 0);

    // Aviso de nome do especial
    this._showSpecialAnnounce("Royal Dive!");

    // Sobe e aumenta
    const origY = boss.y;
    this.tweens.add({
      targets: boss, scaleX: 3.4, scaleY: 3.4, y: origY - 130,
      duration: 700, ease: "Back.out"
    });
    boss.setTint(0xff6600);

    // Captura posição do player, clamped para longe das bordas
    const { x: tx, y: ty } = this._clamp(this.player.x, this.player.y, 160);

    // Círculo de mira que encolhe
    const warn = this.add.graphics().setDepth(ty + 8);
    warn.fillStyle(0xff2200, 0.18);
    warn.fillCircle(tx, ty, 110);
    warn.lineStyle(5, 0xff2200, 0.9);
    warn.strokeCircle(tx, ty, 110);
    // Cruz de mira
    warn.lineStyle(2, 0xff6600, 0.7);
    warn.beginPath(); warn.moveTo(tx - 120, ty); warn.lineTo(tx + 120, ty); warn.strokePath();
    warn.beginPath(); warn.moveTo(tx, ty - 120); warn.lineTo(tx, ty + 120); warn.strokePath();
    this.tweens.add({ targets: warn, scaleX: 0.15, scaleY: 0.15, alpha: 0.4, duration: 1000, ease: "Cubic.in" });

    this.time.delayedCall(1050, () => {
      warn.destroy();
      if (boss.dead) return;

      boss.setScale(2.8);
      boss.body.reset(boss.x, boss.y);

      const dx   = tx - boss.x;
      const dy   = ty - boss.y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;

      boss.state      = "special_dive";
      boss._diveTarget = { x: tx, y: ty };
      boss._diveHit    = false;
      boss.body.setVelocity((dx / dist) * 1050, (dy / dist) * 1050);
    });
  }

  _updateRoyalDive(boss) {
    if (!boss._diveTarget) return;

    const dx   = boss._diveTarget.x - boss.x;
    const dy   = boss._diveTarget.y - boss.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    // Dano ao player durante o mergulho
    if (!boss._diveHit && this.player) {
      const pdx = this.player.x - boss.x;
      const pdy = this.player.y - boss.y;
      if (Math.sqrt(pdx * pdx + pdy * pdy) < 130) {
        boss._diveHit = true;
        this.takeDamage(BOSS_DIVE_DMG);
        this.cameras.main.shake(350, 0.018);
      }
    }

    if (dist < 70) {
      // Pouso
      boss.body.setVelocity(0, 0);
      boss.setPosition(boss._diveTarget.x, boss._diveTarget.y);
      boss.body?.reset(boss._diveTarget.x, boss._diveTarget.y);
      this._diveLandEffect(boss.x, boss.y);
      this._enterVulnerable(1800);
    }
  }

  _diveLandEffect(x, y) {
    this.cameras.main.shake(320, 0.016);
    [20, 20].forEach((r, i) => {
      const ring = this.add.graphics().setDepth(y + 199 - i);
      ring.lineStyle(i === 0 ? 5 : 3, i === 0 ? 0xff6600 : 0xffcc00, 1);
      ring.strokeCircle(x, y, r);
      this.tweens.add({
        targets: ring, scaleX: i === 0 ? 7 : 10, scaleY: i === 0 ? 7 : 10, alpha: 0,
        duration: i === 0 ? 500 : 700, ease: "Power2",
        onComplete: () => ring.destroy()
      });
    });
    for (let i = 0; i < 18; i++) {
      const g = this.add.graphics().setDepth(y + 200);
      g.fillStyle(i % 2 === 0 ? 0xffcc00 : 0xff6600, 1);
      g.fillCircle(0, 0, Phaser.Math.Between(5, 11));
      g.setPosition(x, y);
      const a = Math.random() * Math.PI * 2, spd = Phaser.Math.Between(90, 220);
      this.tweens.add({
        targets: g, x: g.x + Math.cos(a)*spd, y: g.y + Math.sin(a)*spd - 30,
        alpha: 0, scaleX: 0.1, scaleY: 0.1,
        duration: Phaser.Math.Between(400, 750), ease: "Power2",
        onComplete: () => g.destroy()
      });
    }
  }

  // ─── ESPECIAL 2: DASH FRENÉTICO ──────────────────────────────────────────────

  _doFranticDash() {
    const boss = this.beeBoss;
    if (!boss || boss.dead || !this.player) return;

    boss.state = "special";
    boss.body.setVelocity(0, 0);

    this._showSpecialAnnounce("Frantic Dash!");

    // Gera waypoints: 4 aleatórios + 1 em cima do player (todos com margem das bordas)
    const M = 200;
    const waypoints = [];
    for (let i = 0; i < 4; i++) {
      waypoints.push(this._clamp(
        Phaser.Math.Between(M, BEE_W - M),
        Phaser.Math.Between(M, BEE_H - M),
        M
      ));
    }
    waypoints.push(this._clamp(
      this.player.x + Phaser.Math.Between(-60, 60),
      this.player.y + Phaser.Math.Between(-60, 60),
      M
    ));

    // Desenha rastro de aviso
    const pathObjs = this._drawDashPath([{ x: boss.x, y: boss.y }, ...waypoints]);

    // Flash na boss para indicar que algo vai acontecer
    this.tweens.add({ targets: boss, alpha: 0.4, duration: 200, yoyo: true, repeat: 4 });

    // Após 1.2s, executa os dashes
    this.time.delayedCall(1200, () => {
      // Fade out do rastro
      pathObjs.forEach(o => {
        this.tweens.killTweensOf(o);
        this.tweens.add({ targets: o, alpha: 0, duration: 250, onComplete: () => o.destroy() });
      });

      if (!boss.dead) {
        boss.state         = "special_dash";
        boss._dashWaypoints = waypoints;
        boss._dashWpIdx    = 0;
        boss._dashHit      = false;
      }
    });
  }

  _updateFranticDash(boss) {
    const wps = boss._dashWaypoints;
    if (!wps || boss._dashWpIdx >= wps.length) {
      // Terminou todos os dashes
      boss.body.setVelocity(0, 0);
      this._enterVulnerable(1200);
      return;
    }

    const target = wps[boss._dashWpIdx];
    const dx     = target.x - boss.x;
    const dy     = target.y - boss.y;
    const dist   = Math.sqrt(dx * dx + dy * dy);

    if (dist < 45) {
      boss._dashWpIdx++;
      boss.body.setVelocity(0, 0);
      // Pequena pausa entre dashes para dar ritmo
      boss.state = "special";
      this.time.delayedCall(80, () => {
        if (!boss.dead) boss.state = "special_dash";
      });
      return;
    }

    const speed = 820;
    boss.body.setVelocity((dx / dist) * speed, (dy / dist) * speed);
    this._unstuckCheck(boss, this.time.now);

    // Rastro de mel durante o dash
    if (!boss._lastTrailTime || this.time.now - boss._lastTrailTime > 50) {
      boss._lastTrailTime = this.time.now;
      const t = this.add.graphics().setDepth(boss.y + 10);
      t.fillStyle(0xffcc00, 0.45);
      t.fillCircle(boss.x, boss.y, 18);
      this.tweens.add({ targets: t, alpha: 0, scaleX: 0.3, scaleY: 0.3, duration: 280, ease: "Power2", onComplete: () => t.destroy() });
    }

    // Dano ao player
    if (!boss._dashHit && this.player) {
      const pdx = this.player.x - boss.x;
      const pdy = this.player.y - boss.y;
      if (Math.sqrt(pdx * pdx + pdy * pdy) < 100) {
        boss._dashHit = true;
        this.takeDamage(BOSS_DASH_DMG);
        this.cameras.main.shake(200, 0.01);
        this.time.delayedCall(500, () => { boss._dashHit = false; });
      }
    }
  }

  // ─── ESPECIAL 3: EXPLOSÃO RADIAL ─────────────────────────────────────────────

  _doRadialBurst() {
    const boss = this.beeBoss;
    if (!boss || boss.dead) return;

    boss.state = "special_burst";
    boss.body.setVelocity(0, 0);
    this._showSpecialAnnounce("Fúria do Enxame!");
    boss.setTint(0xff3300);

    // Chama 1-2 soldados durante o burst pra pressionar o player
    if (this._soldiers.length < 4) {
      const qty = boss.phase >= 3 ? 2 : 1;
      this.time.delayedCall(400, () => this._callSoldiers(qty));
    }

    // Pulsa pra avisar que vai disparar
    this.tweens.add({ targets: boss, alpha: 0.3, duration: 120, yoyo: true, repeat: 4,
      onComplete: () => { if (!boss.dead) boss.setAlpha(1); }
    });

    const waves = boss.phase >= 3 ? 7 : 5;
    for (let w = 0; w < waves; w++) {
      this.time.delayedCall(600 + w * 650, () => {
        if (!boss.dead) this._fireBurstWave(boss.x, boss.y, w);
      });
    }
    this.time.delayedCall(600 + waves * 650 + 400, () => {
      if (!boss.dead) this._enterVulnerable(1600);
    });
  }

  _fireBurstWave(x, y, waveIndex) {
    const boss = this.beeBoss;
    this.cameras.main.shake(180, 0.014);
    this.tweens.add({
      targets: boss, scaleX: 3.5, scaleY: 3.5, duration: 90, yoyo: true,
      onComplete: () => { if (!boss.dead) boss.setScale(2.8); }
    });

    // Anel 1 — 26 projéteis
    const count  = 26;
    const offset = waveIndex * (Math.PI / count);
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 / count) * i + offset;
      this._fireSingleSting(x, y, angle);
    }

    // Anel 2 — 26 projéteis rotacionados (meio espaço)
    this.time.delayedCall(120, () => {
      if (!this.beeBoss || this.beeBoss.dead) return;
      const halfStep = Math.PI / count;
      for (let i = 0; i < count; i++) {
        const angle = (Math.PI * 2 / count) * i + offset + halfStep;
        this._fireSingleSting(x, y, angle);
      }
    });

    // Salva de rastreamento — projéteis espalhados em torno do player
    this.time.delayedCall(240, () => {
      if (!this.beeBoss || this.beeBoss.dead || !this.player) return;
      const toPlayer = Math.atan2(this.player.y - y, this.player.x - x);
      const spread   = 6;
      const arc      = Math.PI / 5;
      for (let i = 0; i < spread; i++) {
        const angle = toPlayer - arc / 2 + (arc / (spread - 1)) * i;
        this._fireSingleSting(x, y, angle);
      }
    });

    // Anéis visuais de expansão
    [0, 80, 160].forEach((delay, idx) => {
      this.time.delayedCall(delay, () => {
        const ring = this.add.graphics().setDepth(y + 201);
        ring.lineStyle(idx === 0 ? 7 : 3, idx === 0 ? 0xff4400 : 0xffcc00, 1);
        ring.strokeCircle(x, y, 28);
        this.tweens.add({ targets: ring, scaleX: 7, scaleY: 7, alpha: 0, duration: 550, ease: "Power2", onComplete: () => ring.destroy() });
      });
    });
  }

  _drawDashPath(pts) {
    const objs = [];
    for (let i = 0; i < pts.length - 1; i++) {
      const from = pts[i];
      const to   = pts[i + 1];

      // Linha pontilhada
      const g = this.add.graphics().setDepth(2000);
      const ddx = to.x - from.x;
      const ddy = to.y - from.y;
      const len  = Math.sqrt(ddx * ddx + ddy * ddy);
      const steps = Math.max(1, Math.floor(len / 22));
      g.lineStyle(3, 0xffdd00, 0.75);
      for (let s = 0; s < steps; s += 2) {
        g.beginPath();
        g.moveTo(from.x + ddx / steps * s,       from.y + ddy / steps * s);
        g.lineTo(from.x + ddx / steps * (s + 1), from.y + ddy / steps * (s + 1));
        g.strokePath();
      }

      // Seta no meio
      const mx  = (from.x + to.x) / 2;
      const my  = (from.y + to.y) / 2;
      const ang = Math.atan2(ddy, ddx);
      const sz  = 11;
      g.fillStyle(0xff8800, 0.9);
      g.fillTriangle(
        mx + Math.cos(ang) * sz,         my + Math.sin(ang) * sz,
        mx + Math.cos(ang + 2.4) * sz * 0.65, my + Math.sin(ang + 2.4) * sz * 0.65,
        mx + Math.cos(ang - 2.4) * sz * 0.65, my + Math.sin(ang - 2.4) * sz * 0.65
      );
      objs.push(g);

      // Pulsa
      this.tweens.add({ targets: g, alpha: 0.25, duration: 220, yoyo: true, repeat: -1 });

      // Fantasma do boss no destino
      if (i < pts.length - 2) {
        const ghost = this.add.sprite(to.x, to.y, "bee-boss-idle-sheet", 0)
          .setScale(2.8).setAlpha(0.28).setTint(0xffcc00).setDepth(1999);
        this.tweens.add({ targets: ghost, alpha: 0.1, duration: 300, yoyo: true, repeat: -1 });
        objs.push(ghost);
      } else {
        // Último ponto = player: círculo de impacto mais ameaçador
        const target = this.add.graphics().setDepth(2001);
        target.lineStyle(4, 0xff2200, 0.9);
        target.strokeCircle(to.x, to.y, 65);
        target.lineStyle(2, 0xff6600, 0.7);
        target.strokeCircle(to.x, to.y, 40);
        this.tweens.add({ targets: target, alpha: 0.2, duration: 200, yoyo: true, repeat: -1 });
        objs.push(target);
      }
    }
    return objs;
  }

  // ─── HELPERS COMUNS ──────────────────────────────────────────────────────────

  _enterVulnerable(duration) {
    const boss = this.beeBoss;
    if (!boss || boss.dead) return;
    boss.state = "vulnerable";
    boss.setTint(0xffffaa);

    const hint = this.add.text(boss.x, boss.y - 260, "EXPOSED!", {
      fontFamily: "monospace", fontSize: "13px",
      color: "#ffffaa", stroke: "#553300", strokeThickness: 3
    }).setOrigin(0.5).setDepth(9500);
    this.tweens.add({ targets: hint, y: hint.y - 40, alpha: 0, duration: 900, ease: "Power2", onComplete: () => hint.destroy() });

    this.time.delayedCall(duration, () => {
      if (!boss.dead && boss.state === "vulnerable") {
        boss.state = "chase";
        if (boss.phase === 2) boss.setTint(0xff9944);
        else if (boss.phase === 3) boss.setTint(0xff5522);
        else boss.clearTint();
      }
    });
  }

  _showSpecialAnnounce(label) {
    const cx = this.cameras.main.centerX;
    const cy = this.cameras.main.centerY;
    const txt = this.add.text(cx, cy - 70, label, {
      fontFamily: "monospace", fontSize: "22px",
      color: "#ff8800", stroke: "#000000", strokeThickness: 6
    }).setOrigin(0.5).setScrollFactor(0).setDepth(9990);
    this.tweens.add({
      targets: txt, y: cy - 150, alpha: 0,
      duration: 1600, ease: "Power2",
      onComplete: () => txt.destroy()
    });
  }

  // ─── ATAQUES ─────────────────────────────────────────────────────────────────

  _fireSpread(fromX, fromY, toX, toY, count) {
    const base  = Math.atan2(toY - fromY, toX - fromX);
    const total = count > 1 ? Math.PI / 5 : 0;
    for (let i = 0; i < count; i++) {
      const off = count > 1 ? -total / 2 + (total / (count - 1)) * i : 0;
      this._fireSingleSting(fromX, fromY, base + off);
    }
  }

  _fireSingleSting(fromX, fromY, angle) {
    this._sfx("bee-sting-fire", 0.45);
    const g = this.add.graphics().setDepth(fromY + 20);
    g.fillStyle(0xffcc00, 1);
    g.fillEllipse(0, 0, 20, 11);
    g.fillStyle(0xff8800, 0.8);
    g.fillEllipse(0, 0, 11, 6);

    const sting = this.physics.add.image(fromX, fromY, "__DEFAULT").setAlpha(0);
    sting.body.setAllowGravity(false);
    sting.body.setSize(14, 10);
    const spd = this.beeBoss?.state === "special_burst" ? 420 : 230;
    sting.setVelocity(Math.cos(angle) * spd, Math.sin(angle) * spd);
    sting.skipPerformanceCull = true;

    const updateG = () => {
      if (!sting.active) { g.destroy(); return; }
      g.setPosition(sting.x, sting.y);
      g.setRotation(angle);
    };
    this.events.on("update", updateG);
    sting.once("destroy", () => this.events.off("update", updateG));

    this.physics.add.overlap(this.player, sting, () => {
      if (!sting.active) return;
      sting.destroy(); g.destroy();
      this.takeDamage(BOSS_STING_DMG);
      this.cameras.main.shake(160, 0.007);
    });

    if (this.solids) {
      this.physics.add.collider(sting, this.solids, () => {
        if (!sting.active) return;
        sting.destroy(); g.destroy();
      });
    }

    const lifetime = this.beeBoss?.state === "special_burst" ? 4500 : 2200;
    this.time.delayedCall(lifetime, () => { if (sting.active) { sting.destroy(); g.destroy(); } });
  }

  _fireHoneyPuddle(tx, ty) {
    const radius = 110;
    const g = this.add.graphics().setDepth(ty + 5);
    g.fillStyle(0xffaa00, 0.5);
    g.fillCircle(tx, ty, radius);
    g.fillStyle(0xffdd44, 0.28);
    g.fillCircle(tx, ty, radius * 0.55);
    this.tweens.add({ targets: g, alpha: 0.6, duration: 500, yoyo: true, repeat: 5, onComplete: () => g.destroy() });

    this.time.addEvent({
      delay: 500, repeat: 5,
      callback: () => {
        if (!this.player) return;
        const ddx = this.player.x - tx, ddy = this.player.y - ty;
        if (Math.sqrt(ddx * ddx + ddy * ddy) < radius) this.takeDamage(BOSS_PUDDLE_DMG);
      }
    });
  }

  // ─── HIT / FASES / MORTE ─────────────────────────────────────────────────────

  _hitBeeBoss(amount) {
    const boss = this.beeBoss;
    if (!boss || boss.dead || boss.invincible) return;

    boss.invincible = true;
    this.time.delayedCall(120, () => { if (boss) boss.invincible = false; });

    const finalAmount = boss.state === "vulnerable" ? amount * 2 : amount;

    const _phaseTint = () => {
      if (boss.dead) return;
      if (boss.phase === 2) boss.setTint(0xff9944);
      else if (boss.phase === 3) boss.setTint(0xff5522);
      else boss.clearTint();
    };


    // setTintFill pinta o sprite INTEIRO de branco — visível de verdade
    boss.setTintFill(0xffffff);
    this.time.delayedCall(80, () => {
      if (!boss.dead) boss.setTintFill(0x000000); // preto por 40ms — cria contraste
    });
    this.time.delayedCall(120, () => {
      if (!boss.dead) boss.setTintFill(0xffffff); // branco de novo
    });
    this.time.delayedCall(220, () => _phaseTint());

    this._sfx("bee-hit", 0.55);
    this._showBossHitEffect(boss.x, boss.y);
    this._showBossDmgNumber(boss.x, boss.y - 70, finalAmount, boss.state === "vulnerable");

    boss.hp = Math.max(0, boss.hp - finalAmount);
    this._drawBossHpBar(boss);

    const newPhase = this._getBossPhase();
    if (newPhase !== boss.phase) {
      boss.phase = newPhase;
      this._enterPhase(newPhase);
    }

    if (boss.hp <= 0) this._killBeeBoss();
  }

  _enterPhase(phase) {
    const boss = this.beeBoss;
    const labels  = { 2: "RAGE!",         3: "TOTAL FURY!" };
    const colors  = { 2: "#ff8800",       3: "#ff2200" };
    const tints   = { 2: 0xff9944,        3: 0xff5522 };
    const shakes  = { 2: 0.014,           3: 0.024 };
    const taunts  = {
      2: "Você ousa me ferir?! O Enxame vai te DEVORAR vivo!",
      3: "CHEGA!! Vou te RASGAR com o meu próprio ferrão!!"
    };

    this.cameras.main.shake(500, shakes[phase]);
    this.cameras.main.flash(400, phase === 3 ? 255 : 200, phase === 3 ? 20 : 80, 0, true);
    this.time.delayedCall(600, () => {
      const audioKey = { 2: "bee-queen-phase2", 3: "bee-queen-phase3" }[phase];
      this._queenSpeak(audioKey, taunts[phase]);
    });

    const cx = this.cameras.main.centerX;
    const cy = this.cameras.main.centerY;
    const txt = this.add.text(cx, cy - 60, labels[phase], {
      fontFamily: "monospace", fontSize: phase === 3 ? "38px" : "30px",
      color: colors[phase], stroke: "#000000", strokeThickness: 7
    }).setOrigin(0.5).setScrollFactor(0).setDepth(9990);
    this.tweens.add({ targets: txt, y: cy - 140, alpha: 0, duration: 2000, ease: "Power2", onComplete: () => txt.destroy() });

    this.tweens.add({
      targets: boss, scaleX: 3.4, scaleY: 3.4,
      duration: 250, yoyo: true, repeat: 3, ease: "Sine.inOut",
      onComplete: () => boss.setScale(2.8)
    });
    boss.setTint(tints[phase]);

    if (boss.state !== "dead") boss.state = "chase";

    // Chama soldados nas transições de fase
    const soldierCount = { 2: 2, 3: 2 }[phase];
    if (soldierCount && this._soldiers.length < 4) {
      this.time.delayedCall(1200, () => this._callSoldiers(soldierCount));
    }
  }

  _killBeeBoss() {
    const boss = this.beeBoss;
    if (!boss) return;
    boss.dead  = true;
    boss.state = "dead";
    boss.body.setVelocity(0, 0);
    boss.body.enable = false;
    boss.hpBg?.clear();
    boss.hpFg?.clear();
    boss.topBg?.clear();
    boss.topFg?.clear();
    boss.topLabel?.setVisible(false);
    if (this._bossLabel) this._bossLabel.setVisible(false);
    // Mata todos os soldados junto com a rainha
    this.time.delayedCall(300, () => {
      [...(this._soldiers ?? [])].forEach(s => this._killSoldier(s));
    });

    this._sfx("bee-boss-death", 0.8);
    this._stopBattleMusic();
    this.cameras.main.shake(500, 0.022);
    this.tweens.add({
      targets: boss, alpha: 0, scaleX: 3.8, scaleY: 3.8,
      duration: 800, ease: "Power2",
      onComplete: () => boss.setVisible(false)
    });

    for (let i = 0; i < 26; i++) {
      const g = this.add.graphics().setDepth(boss.y + 200);
      g.fillStyle(i % 2 === 0 ? 0xffcc00 : 0xff8800, 1);
      g.fillCircle(0, 0, Phaser.Math.Between(5, 13));
      g.setPosition(boss.x + Phaser.Math.Between(-40, 40), boss.y + Phaser.Math.Between(-40, 10));
      const a = Math.random() * Math.PI * 2, spd = Phaser.Math.Between(60, 160);
      this.tweens.add({
        targets: g, x: g.x + Math.cos(a)*spd, y: g.y + Math.sin(a)*spd - 50,
        alpha: 0, scaleX: 0.1, scaleY: 0.1,
        duration: Phaser.Math.Between(500, 900), ease: "Power2",
        onComplete: () => g.destroy()
      });
    }

    const cx = this.cameras.main.centerX, cy = this.cameras.main.centerY;
    const victory = this.add.text(cx, cy - 40, "Queen Defeated!", {
      fontFamily: "monospace", fontSize: "24px",
      color: "#ffdd44", stroke: "#3a2000", strokeThickness: 6
    }).setOrigin(0.5).setScrollFactor(0).setDepth(9999);
    this.tweens.add({ targets: victory, y: cy - 120, alpha: 0, duration: 2500, delay: 400, ease: "Power2", onComplete: () => victory.destroy() });

    this.time.delayedCall(BOSS_RESPAWN_MS, () => {
      if (!boss) return;
      const pt = PATROL_PTS[0];
      boss.dead       = false;
      boss.state      = "patrol";
      boss.phase      = 1;
      boss.hp         = BOSS_MAX_HP;
      this._voicePlayed    = false;
      this._lastTauntTime  = 0;
      boss.alpha   = 0;
      boss.setScale(2.8);
      boss.clearTint();
      boss.setPosition(pt.x, pt.y);
      if (boss.body) { boss.body.reset(pt.x, pt.y); boss.body.enable = true; }
      boss.setVisible(true);
      if (this._bossLabel) this._bossLabel.setVisible(true);
      this._drawBossHpBar(boss);
      this.tweens.add({ targets: boss, alpha: 1, duration: 1200, ease: "Power2" });
    });
  }

  // ─── EFEITOS ─────────────────────────────────────────────────────────────────

  _showBossHitEffect(_x, _y) {}

  _showBossDmgNumber(x, y, amount, crit = false) {
    const txt = this.add.text(x, y, crit ? `⚡${amount}` : `-${amount}`, {
      fontFamily: "monospace",
      fontSize: crit ? "24px" : "18px",
      color: crit ? "#ffffff" : "#ffee44",
      stroke: "#000000",
      strokeThickness: crit ? 5 : 3
    }).setOrigin(0.5).setDepth(9500);
    this.tweens.add({
      targets: txt, y: y - 60, alpha: 0,
      scaleX: crit ? 1.5 : 1.2, scaleY: crit ? 1.5 : 1.2,
      duration: crit ? 950 : 750, ease: "Power2",
      onComplete: () => txt.destroy()
    });
  }

  // ─── PROJÉTEIS DO PLAYER ─────────────────────────────────────────────────────

  spawnFireball(x, y, facing) {
    const p = super.spawnFireball(x, y, facing);
    if (p) this._addBossOverlap(p, BOSS_FIREBALL_DMG);
    return p;
  }

  spawnArrow(x, y, facing) {
    const p = super.spawnArrow(x, y, facing);
    if (p) this._addBossOverlap(p, BOSS_FIREBALL_DMG);
    return p;
  }

  _addBossOverlap(projectile, damage) {
    const boss = this.beeBoss;
    if (!boss || boss.dead || !boss.body?.enable) return;
    this.physics.add.overlap(projectile, boss, () => {
      if (!projectile.active) return;
      projectile.destroy();
      this._hitBeeBoss(damage);
    });
    // Projétil também acerta soldados
    this._addSoldierOverlap(projectile, damage * 0.5);
  }

  _addSoldierOverlap(projectile, damage) {
    for (const s of (this._soldiers ?? [])) {
      if (!s.active || s.dead) continue;
      this.physics.add.overlap(projectile, s, () => {
        if (!projectile.active || s.dead) return;
        projectile.destroy();
        this._hitSoldier(s, damage);
      });
    }
  }

  // ─── PORTAL ──────────────────────────────────────────────────────────────────

  _addBeeReturnPortal() {
    const x = BEE_W / 2;
    const y = BEE_H - 80;

    const g = this.add.graphics().setDepth(y + 80);
    g.fillStyle(0x8a6200, 1);
    g.fillRect(x - 52, y - 96, 22, 96);
    g.fillStyle(0xc49a20, 1);
    g.fillRect(x - 56, y - 102, 30, 12);
    g.fillStyle(0x8a6200, 1);
    g.fillRect(x + 30, y - 96, 22, 96);
    g.fillStyle(0xc49a20, 1);
    g.fillRect(x + 26, y - 102, 30, 12);
    g.fillStyle(0x6a4800, 1);
    g.fillRect(x - 56, y - 112, 112, 18);
    g.fillStyle(0xffdd44, 0.65);
    [[x-41,y-72],[x-41,y-48],[x+41,y-72],[x+41,y-48]].forEach(([rx,ry]) => g.fillRect(rx-4,ry-4,8,8));
    const pg = this.add.graphics().setBlendMode(Phaser.BlendModes.ADD).setDepth(y + 40);
    pg.fillStyle(0xffcc00, 0.3);
    pg.fillEllipse(x, y - 54, 56, 86);
    pg.fillStyle(0xffee88, 0.14);
    pg.fillEllipse(x, y - 54, 90, 120);
    g.fillStyle(0x5a3800, 1);
    g.fillRect(x - 4, y - 130, 8, 26);
    g.fillStyle(0x7a5000, 1);
    g.fillRect(x - 52, y - 158, 104, 30);
    this.add.text(x, y - 143, "Hive", {
      fontFamily: "monospace", fontSize: "13px",
      color: "#ffdd88", stroke: "#3a2000", strokeThickness: 3
    }).setOrigin(0.5).setDepth(y + 100);
    this.interactions.add({
      id: "bee_exit", x, y, promptY: y - 170,
      promptText: "E Return to Village", radius: 72,
      onInteract: () => this.fadeTo("WorldScene", { spawnKey: "beeGate" })
    });
  }

  // ─── MORTE DO PLAYER ─────────────────────────────────────────────────────────

  onPlayerDeath() {
    if (this.playerDying) return;
    this.playerDying = true;
    this.player?.setVelocity(0, 0);
    const cx = this.cameras.main.centerX, cy = this.cameras.main.centerY;
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
      this.fadeTo("WorldScene", { spawnKey: "beeGate" });
    });
  }

  rebuildWaterCollision() {}

  update(time, delta) {
    this.updatePerformanceOptimizations(delta);
    this.updateFenceEditor();
    this.updateBase();
    this._updateBeeBoss(time, delta);
    this._updateSoldiers(time);
  }
}
