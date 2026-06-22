import WorldScene from "./WorldScene.js?v=238";

const ARENA_W = 1920;
const ARENA_H = 1920;

export default class ForestScene extends WorldScene {
  constructor() {
    super("ForestScene");
  }

  create() {
    this.creativeStoragePrefix = "boss-arena";
    this.manualStorageKeys = {
      fences:      "boss-arena-manual-fences-v1",
      trees:       "boss-arena-manual-trees-v1",
      floors:      "boss-arena-manual-floors-v1",
      structures:  "boss-arena-manual-structures-v1",
      windowLights:"boss-arena-manual-window-lights-v1"
    };
    this.manualCollisionStorageKey = "boss-arena-manual-collisions-v1";
    this.houseStorageKey = "boss-arena-editable-houses-v1";

    this.worldWidth = ARENA_W;
    this.worldHeight = ARENA_H;
    this.physics.world.setBounds(0, 0, ARENA_W, ARENA_H);
    this.cameras.main.setBounds(0, 0, ARENA_W, ARENA_H);

    this.drawArenaGround();
    this.createControls();

    this.createPlayer(ARENA_W / 2, ARENA_H / 2);
    this.createCollisionGroup();
    this.silverCharacters = [];

    this.addArenaReturnPortal();
    this.addBossGolem();
    this.createBossHpBar();
    this.loadManualCollisionLayout([]);

    this.createHud();
    this.createDayNightCycle();
    this.createFenceEditor();

    this.player.setCollideWorldBounds(true);
    this.startStableCameraFollow();
    this.initPerformanceOptimizations();
    this.ensureLavaProjectileTexture();
    this.startEmberAmbient();
  }

  getSpawnPoint() {
    return { x: ARENA_W / 2, y: ARENA_H / 2 };
  }

  // ─── GROUND ─────────────────────────────────────────────────────────────────

  drawArenaGround() {
    this.createGroundLayers();
    this.add.image(ARENA_W / 2, ARENA_H / 2, "boss-arena-lava")
      .setDisplaySize(ARENA_W, ARENA_H).setDepth(-20).setOrigin(0.5);
    this.startGroundAnimation();
  }

  // ─── PORTAL ─────────────────────────────────────────────────────────────────

  addArenaReturnPortal() {
    const x = ARENA_W / 2;
    const y = 88;

    if (this.textures.exists("volcano-gate")) {
      this.add.image(x, y, "volcano-gate")
        .setOrigin(0.5, 0.88)
        .setScale(0.20)
        .setDepth(y + 120);
    } else {
      const g = this.add.graphics().setDepth(y + 80);
      g.fillStyle(0x2e1a0e, 1); g.fillRect(x - 52, y - 96, 22, 96);
      g.fillRect(x + 30, y - 96, 22, 96);
      g.fillStyle(0x261408, 1); g.fillRect(x - 56, y - 112, 112, 18);
      const pg = this.add.graphics().setBlendMode(Phaser.BlendModes.ADD).setDepth(y + 40);
      pg.fillStyle(0xff3300, 0.3); pg.fillEllipse(x, y - 54, 56, 86);
    }

    this.interactions.add({
      id: "boss_arena_exit", x, y, promptY: y - 260,
      promptText: "E Return to Village", radius: 80,
      onInteract: () => this.fadeTo("WorldScene", { spawnKey: "forestGate" })
    });
  }

  // ─── BOSS SPRITE (renderização pura — posição vem do servidor) ───────────────

  addBossGolem() {
    const cx = ARENA_W / 2;
    const cy = ARENA_H / 2;

    if (!this.anims.exists("golem-walk")) {
      this.anims.create({ key:"golem-walk", frames:this.anims.generateFrameNumbers("boss-golem-walk",{start:0,end:7}), frameRate:8, repeat:-1 });
    }
    if (!this.anims.exists("golem-attack")) {
      this.anims.create({ key:"golem-attack", frames:this.anims.generateFrameNumbers("boss-golem-attack",{start:0,end:9}), frameRate:10, repeat:0 });
    }
    if (!this.anims.exists("boss-meteor-fly")) {
      this.anims.create({ key:"boss-meteor-fly", frames:this.anims.generateFrameNumbers("boss-meteor",{start:0,end:7}), frameRate:14, repeat:-1 });
    }
    if (!this.anims.exists("boss-ground-explode")) {
      this.anims.create({ key:"boss-ground-explode", frames:this.anims.generateFrameNumbers("boss-ground-explosion",{start:0,end:15}), frameRate:18, repeat:0 });
    }
    if (!this.anims.exists("boss-rock-fly")) {
      this.anims.create({ key:"boss-rock-fly", frames:this.anims.generateFrameNumbers("boss-rock-proj",{start:0,end:11}), frameRate:14, repeat:-1 });
    }

    // Boss é um sprite simples — posição controlada pelo servidor
    const boss = this.add.sprite(cx, cy, "boss-golem-walk", 0)
      .setScale(1.4).setDepth(cy + 10);
    boss.play("golem-walk");

    // Hitbox de colisão com o player — zone invisível, começa desativada
    const hitzone = this.add.zone(cx, cy, 180, 130);
    this.physics.add.existing(hitzone);
    hitzone.body.setImmovable(true).setAllowGravity(false);
    hitzone.body.enable = false; // desativado até o boss nascer
    this.physics.add.collider(this.player, hitzone);

    // Overlap para dano do fireball na hitbox do boss
    this.bossHitzone = hitzone;

    this.bossShadow = this.add.ellipse(cx, cy+70, 100, 28, 0x000000, 0.35).setDepth(cy-1);
    this.bossGolem = boss;
    this.bossDead = false;
    this.bossSpawned = false;
    this.bossHp = 10000;
    this.bossPhase = 1;

    // Começa escondido — aparece quando servidor mandar bossSpawned
    boss.setVisible(false);
    this.bossShadow.setVisible(false);
  }

  // ─── HP BAR ──────────────────────────────────────────────────────────────────

  createBossHpBar() {
    this.bossMaxHp = 10000;
    const BAR_W = 500;
    const DEPTH = 4000;
    this.bossHpContainer = this.add.container(0, 0).setScrollFactor(0).setDepth(DEPTH);

    const bg = this.add.graphics();
    bg.fillStyle(0x000000, 0.7); bg.fillRoundedRect(0, 0, BAR_W+20, 46, 6);
    this.bossHpContainer.add(bg);

    this.bossNameText = this.add.text(10, 4, "LAVA GOLEM  ●  Phase 1", {
      fontFamily:"monospace", fontSize:"12px", color:"#ff9944", stroke:"#1a0000", strokeThickness:3
    });
    this.bossHpContainer.add(this.bossNameText);

    const barBg = this.add.graphics();
    barBg.fillStyle(0x330000,1); barBg.fillRoundedRect(10,20,BAR_W,18,4);
    this.bossHpContainer.add(barBg);

    this.bossHpBarFg = this.add.graphics();
    this.bossHpContainer.add(this.bossHpBarFg);

    this.bossHpText = this.add.text(BAR_W/2+10, 20, "", {
      fontFamily:"monospace", fontSize:"11px", color:"#ffffff", stroke:"#000000", strokeThickness:3
    }).setOrigin(0.5, 0);
    this.bossHpContainer.add(this.bossHpText);

    this._bossBarW = BAR_W;
    this.updateBossHpBar();
    this.layoutBossHpBar(this.scale.width);

    const onResize = (size) => this.layoutBossHpBar(size.width);
    this.scale.on("resize", onResize);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.scale.off("resize", onResize));
  }

  layoutBossHpBar(screenW) {
    if (!this.bossHpContainer) return;
    this.bossHpContainer.setPosition(Math.floor((screenW - this._bossBarW - 20) / 2), 8);
  }

  updateBossHpBar() {
    if (!this.bossHpBarFg) return;
    const pct = Math.max(0, Math.min(1, this.bossHp / this.bossMaxHp));
    const color = pct > 0.5 ? 0xdd2222 : pct > 0.25 ? 0xff6600 : 0xff2200;
    this.bossHpBarFg.clear();
    this.bossHpBarFg.fillStyle(color, 1);
    this.bossHpBarFg.fillRoundedRect(10, 20, Math.max(0, this._bossBarW * pct), 18, 4);
    this.bossHpText?.setText(`${Math.max(0, this.bossHp)} / ${this.bossMaxHp}`);
  }

  // ─── SERVER EVENTS ───────────────────────────────────────────────────────────

  // Countdown de respawn — texto no centro do MAPA (world-space)
  onBossCountdown(remainingMs) {
    const secs = Math.ceil(remainingMs / 1000);
    const cx = ARENA_W / 2;
    const cy = ARENA_H / 2;

    if (!this._countdownText) {
      // Fundo escuro
      this._countdownBg = this.add.graphics().setDepth(4999);
      this._countdownBg.fillStyle(0x000000, 0.6);
      this._countdownBg.fillRoundedRect(cx - 180, cy - 54, 360, 64, 10);

      this._countdownText = this.add.text(cx, cy - 22, "", {
        fontFamily: "monospace", fontSize: "28px",
        color: "#ff9966", stroke: "#1a0000", strokeThickness: 5
      }).setOrigin(0.5).setDepth(5000);

      this._countdownSub = this.add.text(cx, cy + 18, "LAVA GOLEM", {
        fontFamily: "monospace", fontSize: "13px",
        color: "#ff6633", stroke: "#1a0000", strokeThickness: 3
      }).setOrigin(0.5).setDepth(5000);
    }

    const mins = Math.floor(secs / 60);
    const s = String(secs % 60).padStart(2, "0");
    this._countdownText.setText(`🔥  ${mins}:${s}`);
    const visible = secs > 0;
    this._countdownText.setVisible(visible);
    this._countdownBg?.setVisible(visible);
    this._countdownSub?.setVisible(visible);
  }

  // Boss nasceu / renasceu
  onBossSpawned(silent = false) {
    // Limpa countdown
    this._countdownText?.destroy(); this._countdownText = null;
    this._countdownBg?.destroy();   this._countdownBg = null;
    this._countdownSub?.destroy();  this._countdownSub = null;

    if (!this.bossGolem) return;

    // Reseta estado local
    this.bossDead = false;
    this.bossSpawned = true;
    this.bossHp = 10000;
    this.bossPhase = 1;
    this.updateBossHpBar();
    this.bossNameText?.setText("LAVA GOLEM  ●  Phase 1");
    this.bossHpContainer?.setVisible(true);
    this.bossGolem.setVisible(true).setActive(true).clearTint();
    this.bossGolem.play("golem-walk", true);
    this.bossShadow?.setVisible(true);
    if (this.bossHitzone) this.bossHitzone.body.enable = true;

    if (silent) {
      this.bossGolem.setScale(1.4);
    } else {
      // Entrada dramática
      this.bossGolem.setScale(0);
      this.tweens.add({ targets: this.bossGolem, scaleX: 1.4, scaleY: 1.4, duration: 800, ease: "Back.easeOut" });
      this.cameras.main.shake(600, 0.018);
      this.showPhaseAnnouncement("LAVA GOLEM HAS RISEN!");
    }
  }

  // Recebe estado do boss do servidor — fonte única da verdade
  onBossSync(data) {
    if (!this.bossGolem) return;

    // ── BOSS MORTO ───────────────────────────────────────────────────────────
    if (data.dead) {
      // Força esconder toda vez que receber dead=true
      this.bossGolem.setVisible(false).setActive(false);
      this.bossShadow?.setVisible(false);
      if (this.bossHitzone?.body) this.bossHitzone.body.enable = false;

      if (!this.bossDead) {
        this.bossDead = true;
        this.bossSpawned = false;
        // Efeitos de morte só uma vez
        this.bossHpContainer?.setVisible(false);
        this.cameras.main.shake(600, 0.02);
        this.showPhaseAnnouncement("GOLEM DEFEATED!");
        this.time.delayedCall(2000, () => {
          this.dialog?.show("Lava Golem", "The Golem has been defeated! The arena cools down...");
        });
      }

      // Countdown no centro do mapa
      if (data.countdownMs != null) {
        this.onBossCountdown(data.countdownMs);
      }
      return;
    }

    // ── BOSS VIVO ────────────────────────────────────────────────────────────

    // Late joiner ou respawn: mostrar boss
    if (!this.bossSpawned) {
      this.onBossSpawned(true);
    }

    if (this.bossDead) return; // ainda não processou o respawn

    // Posição
    this.bossGolem.setPosition(data.x, data.y);
    this.bossGolem.setFlipX(data.flipX ?? false);
    if (this.bossHitzone?.body) this.bossHitzone.body.reset(data.x, data.y);
    this.bossShadow?.setPosition(data.x, data.y + 70);

    // Animação
    const anim = data.anim ?? "golem-walk";
    if (this.bossGolem.anims.currentAnim?.key !== anim) {
      this.bossGolem.play(anim, true);
    }

    // HP — também mata localmente se chegar a 0
    if (typeof data.hp === "number") {
      this.bossHp = data.hp;
      this.updateBossHpBar();
    }
  }

  // Recebe eventos de ataque do servidor
  onBossAttack(event, data) {
    if (event === "died") {
      if (!this.bossDead) { this.bossDead = true; this.bossSpawned = false; this.onBossDeath(); }
      return;
    }
    if (this.bossDead) return; // ignora ataques depois da morte
    if (event === "meteor") {
      (data.targets ?? []).forEach(({ tx, ty, delay=0 }) => {
        this.time.delayedCall(delay, () => this.spawnSingleMeteor(tx, ty));
      });
    }
    if (event === "eruption") {
      (data.targets ?? []).forEach(({ tx, ty, delay=0 }) => {
        this.time.delayedCall(delay, () => this.spawnSingleEruption(tx, ty));
      });
    }
    if (event === "projectile") {
      this.spawnRockProjectile(data.bx, data.by, data.dx, data.dy);
    }
  }

  // Transição de fase recebida do servidor
  onBossPhaseChange(phase) {
    if (phase <= this.bossPhase) return;
    this.bossPhase = phase;
    const tints = [null, null, 0xff8833, 0xff2200];
    const labels = ["", "", "The Golem rages!", "VOLCANIC FURY!"];
    if (tints[phase]) this.bossGolem?.setTint(tints[phase]);
    this.bossNameText?.setText(`LAVA GOLEM  ●  Phase ${phase}`);
    this.showPhaseAnnouncement(labels[phase]);
    this.cameras.main.shake(400, 0.012);
  }

  // ─── FIREBALL — envia dano ao servidor ──────────────────────────────────────

  applyLightningDamage(wx, wy, radius) {
    if (!this.bossGolem || this.bossDead || !this.bossHitzone?.body?.enable) return;
    const dx = this.bossGolem.x - wx;
    const dy = this.bossGolem.y - wy;
    if (Math.sqrt(dx * dx + dy * dy) <= radius + 40) {
      this.showHitSparks(this.bossGolem.x, this.bossGolem.y);
      this.showDamageNumber(this.bossGolem.x, this.bossGolem.y - 40, 200);
      this.multiplayer?.sendHitBoss(200);
    }
  }

  spawnFireball(x, y, facing) {
    const fireball = super.spawnFireball(x, y, facing);
    if (fireball && this.bossHitzone && !this.bossDead) {
      this.physics.add.overlap(fireball, this.bossHitzone, () => {
        if (!fireball.active) return;
        this.showHitSparks(fireball.x, fireball.y);
        this.showDamageNumber(fireball.x, fireball.y - 40, 200);
        fireball.destroy();
        // Envia dano ao servidor — ele processa e distribui HP para todos
        this.multiplayer?.sendHitBoss(200);
      });
    }
    return fireball;
  }

  // onBossDeath agora é tratado dentro de onBossSync (dead: true)

  // ─── MORTE DO PLAYER ────────────────────────────────────────────────────────

  onPlayerDeath() {
    if (this.playerDying) return;
    this.playerDying = true;
    this.player?.setVelocity(0, 0);
    const cx = this.cameras.main.centerX;
    const cy = this.cameras.main.centerY;
    const msg = this.add.text(cx, cy, "You were defeated...", {
      fontFamily:"monospace", fontSize:"28px", color:"#ff4444", stroke:"#000000", strokeThickness:6
    }).setOrigin(0.5).setScrollFactor(0).setDepth(9999);
    this.cameras.main.shake(300, 0.018);
    this.cameras.main.fadeOut(1600, 60, 0, 0);
    this.time.delayedCall(1800, () => {
      this.playerHp = this.playerMaxHp;
      this.playerDying = false;
      msg.destroy();
      this.fadeTo("WorldScene", { spawnKey:"forestGate" });
    });
  }

  // ─── FASE ANÚNCIO ────────────────────────────────────────────────────────────

  showPhaseAnnouncement(text) {
    const cx = this.cameras.main.centerX;
    const cy = this.cameras.main.centerY;
    const txt = this.add.text(cx, cy-80, text, {
      fontFamily:"monospace", fontSize:"32px", color:"#ff4400", stroke:"#000000", strokeThickness:6
    }).setOrigin(0.5).setScrollFactor(0).setDepth(9500);
    this.tweens.add({ targets:txt, y:cy-140, alpha:0, duration:2200, ease:"Power2", onComplete:()=>txt.destroy() });
  }

  // ─── ATAQUES VISUAIS ────────────────────────────────────────────────────────

  showDamageNumber(x, y, amount) {
    const txt = this.add.text(x, y, `-${amount}`, {
      fontFamily:"monospace", fontSize:"22px", color:"#ffff44", stroke:"#000000", strokeThickness:4
    }).setOrigin(0.5).setDepth(9000);
    this.tweens.add({ targets:txt, y:y-70, alpha:0, scaleX:1.3, scaleY:1.3, duration:850, ease:"Power2", onComplete:()=>txt.destroy() });
  }

  showHitSparks(x, y) {
    const colors = [0xff6600, 0xff4400, 0xffaa00, 0xffffff, 0xff2200];
    for (let i = 0; i < 10; i++) {
      const spark = this.add.graphics().setDepth(9001);
      spark.fillStyle(colors[Math.floor(Math.random()*colors.length)], 1);
      spark.fillCircle(0, 0, Phaser.Math.Between(3,7));
      spark.setPosition(x+Phaser.Math.Between(-20,20), y+Phaser.Math.Between(-20,20));
      const angle = Math.random()*Math.PI*2;
      const speed = Phaser.Math.Between(60,140);
      this.tweens.add({ targets:spark, x:spark.x+Math.cos(angle)*speed, y:spark.y+Math.sin(angle)*speed, alpha:0, duration:Phaser.Math.Between(280,550), ease:"Power2", onComplete:()=>spark.destroy() });
    }
  }

  spawnSingleMeteor(tx, ty) {
    const WARN_MS = 650;
    const IMPACT_R = 85;
    const shadow = this.add.graphics().setDepth(ty-5);
    shadow.fillStyle(0xff2200,0.32); shadow.fillCircle(tx,ty,IMPACT_R);
    const ring = this.add.graphics().setDepth(ty-4);
    ring.lineStyle(3,0xff6600,0.9); ring.strokeCircle(tx,ty,IMPACT_R);
    this.tweens.add({ targets:shadow, alpha:0.08, yoyo:true, repeat:-1, duration:260 });
    const meteor = this.add.sprite(tx+60, ty-320, "boss-meteor", 0)
      .setScale(0.28).setDepth(ty+600).setRotation(0.45);
    meteor.play("boss-meteor-fly");
    this.tweens.add({
      targets:meteor, x:tx, y:ty-20, scaleX:1.15, scaleY:1.15, duration:WARN_MS, ease:"Power2.easeIn",
      onComplete:() => { meteor.destroy(); shadow.destroy(); ring.destroy(); this.onMeteorImpact(tx,ty,IMPACT_R); }
    });
  }

  onMeteorImpact(tx, ty, radius) {
    const flash = this.add.graphics().setDepth(ty+700);
    flash.fillStyle(0xff6600,0.85); flash.fillCircle(tx,ty,radius);
    this.tweens.add({ targets:flash, alpha:0, duration:380, ease:"Power2", onComplete:()=>flash.destroy() });
    const crater = this.add.graphics().setDepth(ty-3);
    crater.fillStyle(0x1a0800,0.55); crater.fillCircle(tx,ty,radius*0.65);
    crater.lineStyle(2,0xff3300,0.4); crater.strokeCircle(tx,ty,radius*0.65);
    this.time.delayedCall(6000,()=>{
      this.tweens.add({ targets:crater, alpha:0, duration:1200, onComplete:()=>crater.destroy() });
    });
    this.showHitSparks(tx,ty); this.showHitSparks(tx+Phaser.Math.Between(-30,30),ty+Phaser.Math.Between(-30,30));
    this.cameras.main.shake(220,0.009);
    if (this.player?.active) {
      const dx=this.player.x-tx, dy=this.player.y-ty;
      if (Math.sqrt(dx*dx+dy*dy) <= radius) { this.takeDamage(40); this.showDamageNumber(this.player.x,this.player.y-50,40); }
    }
  }

  spawnSingleEruption(tx, ty) {
    const WARN_MS = 700;
    const DAMAGE_R = 70;
    const warn = this.add.graphics().setDepth(ty-3);
    warn.fillStyle(0xff2200,0.45); warn.fillEllipse(tx,ty,DAMAGE_R*2,DAMAGE_R*0.9);
    this.tweens.add({ targets:warn, alpha:0.1, yoyo:true, repeat:-1, duration:180 });
    this.time.delayedCall(WARN_MS, () => {
      warn.destroy();
      if (!this.scene.isActive()) return;
      const explosion = this.add.sprite(tx,ty,"boss-ground-explosion",0)
        .setScale(1.1).setDepth(ty+200).setOrigin(0.5,0.75);
      explosion.play("boss-ground-explode");
      explosion.once("animationcomplete",()=>explosion.destroy());
      if (this.player?.active) {
        const dx=this.player.x-tx, dy=this.player.y-ty;
        if (Math.sqrt(dx*dx+dy*dy) <= DAMAGE_R) { this.takeDamage(28); this.showDamageNumber(this.player.x,this.player.y-50,28); }
      }
      this.showHitSparks(tx,ty-20);
      this.cameras.main.shake(140,0.006);
    });
  }

  spawnRockProjectile(bx, by, ndx, ndy) {
    const proj = this.physics.add.sprite(bx, by, "boss-rock-proj", 0)
      .setScale(1.4).setDepth(8000).setRotation(Math.atan2(ndy,ndx)-Math.PI/4);
    proj.body.setAllowGravity(false);
    proj.body.setCircle(22, 42, 42); // centralizado no sprite 128×128
    proj.body.setVelocity(ndx*430, ndy*430);
    this.physics.add.overlap(proj, this.player, () => {
      if (proj.active) { this.takeDamage(65); this.showHitSparks(proj.x,proj.y); proj.destroy(); }
    });
    this.time.delayedCall(2400,()=>{ if (proj.active) proj.destroy(); });
  }

  // ─── LAVA PROJECTILE TEXTURE ─────────────────────────────────────────────────

  ensureLavaProjectileTexture() {
    if (this.textures.exists("boss-lava-proj")) return;
    const size = 22;
    const canvas = this.textures.createCanvas("boss-lava-proj", size, size);
    const ctx = canvas.getCanvas().getContext("2d");
    const grd = ctx.createRadialGradient(size/2,size/2,1,size/2,size/2,size/2);
    grd.addColorStop(0,"#ffee88"); grd.addColorStop(0.35,"#ff6600"); grd.addColorStop(1,"rgba(180,0,0,0)");
    ctx.fillStyle = grd;
    ctx.beginPath(); ctx.arc(size/2,size/2,size/2,0,Math.PI*2); ctx.fill();
    canvas.refresh();
  }

  // ─── BRASAS AMBIENTES ────────────────────────────────────────────────────────

  startEmberAmbient() {
    this.time.addEvent({ delay:45,  loop:true, callback:()=>{ if(this.scene.isActive()) this.spawnEmber(); } });
    this.time.addEvent({ delay:70,  loop:true, callback:()=>{ if(this.scene.isActive()) this.spawnEmber(); } });
    this.time.addEvent({ delay:110, loop:true, callback:()=>{ if(this.scene.isActive()) this.spawnEmber(); } });
  }

  spawnEmber() {
    const cam = this.cameras.main;
    const x = cam.scrollX + Phaser.Math.Between(-60, cam.width+60);
    const y = cam.scrollY + Phaser.Math.Between(-80, 0);
    const colors = [0xff4400,0xff6600,0xffaa00,0xff2200,0xff8800];
    const spark = this.add.graphics().setDepth(Phaser.Math.Between(500,2000));
    spark.fillStyle(Phaser.Utils.Array.GetRandom(colors),1);
    spark.fillCircle(0,0,Phaser.Math.FloatBetween(2,6));
    spark.setPosition(x,y);
    const dur = Phaser.Math.Between(1200,2800);
    this.tweens.add({ targets:spark, x:x+Phaser.Math.Between(-60,60), y:y+Phaser.Math.Between(180,420), alpha:0, duration:dur, ease:"Power1", onComplete:()=>spark.destroy() });
    if (Math.random()<0.3) {
      this.tweens.add({ targets:spark, scaleX:0.2, scaleY:0.2, yoyo:true, repeat:Phaser.Math.Between(1,3), duration:Phaser.Math.Between(150,300) });
    }
  }

  // ─── SEM COLISÃO DE RIO ──────────────────────────────────────────────────────
  rebuildWaterCollision() {}

  // ─── BOSS DEPTH UPDATE ───────────────────────────────────────────────────────

  updateBossDepth() {
    if (!this.bossGolem) return;
    const playerDepth = this.player?.depth ?? (this.player?.y ?? 0) + 100;
    this.bossGolem.setDepth(playerDepth + 500);
    this.bossShadow?.setDepth(playerDepth + 499);
  }

  // ─── UPDATE ─────────────────────────────────────────────────────────────────

  update(time, delta) {
    this.updatePerformanceOptimizations(delta);
    this.updateFenceEditor();
    this.updateBase();
    this.updateBossDepth();
  }
}
