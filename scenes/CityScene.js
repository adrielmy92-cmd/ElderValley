import WorldScene from "./WorldScene.js?v=245";

const TILE = 32;

export default class CityScene extends WorldScene {
  constructor() {
    super("CityScene");
  }

  create() {
    this.creativeStoragePrefix = "eldervalley-city";
    this.manualStorageKeys = {
      fences: "eldervalley-city-manual-fences-v1",
      trees: "eldervalley-city-manual-trees-v1",
      floors: "eldervalley-city-manual-floors-v1",
      structures: "eldervalley-city-manual-structures-v1",
      windowLights: "eldervalley-city-manual-window-lights-v1"
    };
    this.manualCollisionStorageKey = "eldervalley-city-manual-collisions-v1";
    this.houseStorageKey = "eldervalley-city-editable-houses-v1";
    // City content (houses, structures, fences, floors) is placed at fixed
    // absolute coordinates by the editor and extends to ~1888×1120. The world
    // must be large enough to contain it on every device — deriving the size
    // from the viewport clipped the right/bottom of the city on narrow mobile
    // screens (the camera bounds shrank below where the buildings actually are).
    this.worldWidth  = 1920;
    this.worldHeight = 1248;
    this.physics.world.setBounds(0, 0, this.worldWidth, this.worldHeight);
    this.cameras.main.setBounds(0, 0, this.worldWidth, this.worldHeight);
    this.drawCityGround();
    this.createControls();

    const spawn = this.getSpawnPoint(this.entryData.spawnKey);
    this.createPlayer(spawn.x, spawn.y);
    this.createCollisionGroup();
    this.silverCharacters = [];
    this.addSavedEditableHousesOnly();
    this.addCityExit();
    this.addCityWorldBounds();
    this.loadManualCollisionLayout([]);
    this.addCityGuards();
    this.createHud();
    this.createDayNightCycle();
    this.createFenceEditor();

    this.player.setCollideWorldBounds(true);
    this.startStableCameraFollow();
    this.initPerformanceOptimizations();
  }

  getSpawnPoint(spawnKey) {
    if (spawnKey && spawnKey !== "fromVillage") {
      return super.getSpawnPoint(spawnKey);
    }
    return { x: 220, y: 432 };
  }

  drawCityGround() {
    this.createGroundLayers();
    for (let y = 0; y < this.worldHeight; y += TILE) {
      for (let x = 0; x < this.worldWidth; x += TILE) {
        const centerLeft = Math.max(320, Math.floor(this.worldWidth * 0.42));
        const centerTop = 224;
        const centerWidth = 384;
        const centerHeight = 576;
        const cityCenter = x >= centerLeft && x <= centerLeft + centerWidth && y >= centerTop && y <= centerTop + centerHeight;
        const entryRoad = x < centerLeft + 32 && y >= 384 && y <= 480;
        const path = cityCenter || entryRoad;
        const grassVariant = ((x / TILE) + (y / TILE)) % 3;
        const key = path ? "tile-path" : `tile-grass-${grassVariant}`;
        this.drawGroundTile(key, x, y);
      }
    }

    this.startGroundAnimation();
  }

  addCityExit() {
    const x = 126;
    const y = 432;
    this.add.rectangle(x + 44, y - 18, 8, 44, 0x5a3721, 1)
      .setOrigin(0.5, 1)
      .setDepth(y - 2);
    this.add.rectangle(x, y - 52, 118, 32, 0x7c512d, 1)
      .setDepth(y - 1)
      .setStrokeStyle(2, 0x3b2416, 1);
    this.add.text(x, y - 52, "Village", {
      fontFamily: "monospace",
      fontSize: "14px",
      color: "#fff0c2",
      stroke: "#241409",
      strokeThickness: 3
    }).setOrigin(0.5).setDepth(y);
    this.interactions.add({
      id: "door_village_gate",
      x,
      y,
      promptY: y - 88,
      promptText: "E Return to Village",
      radius: 82,
      onInteract: () => this.fadeTo("WorldScene", { spawnKey: "cityGate" })
    });
  }

  addCityWorldBounds() {
    this.addSolidRect(this.worldWidth / 2, -8, this.worldWidth, 16);
    this.addSolidRect(this.worldWidth / 2, this.worldHeight + 8, this.worldWidth, 16);
    this.addSolidRect(-8, this.worldHeight / 2, 16, this.worldHeight);
    this.addSolidRect(this.worldWidth + 8, this.worldHeight / 2, 16, this.worldHeight);
  }

  addCityGuards() {
    this.createKnightAnimations();
    this.cityGuards = [];
    this.cityGuardPhrases = [
      "Keep the peace within the walls.",
      "The guard is watching the streets.",
      "Safe travels, wanderer.",
      "No trouble in the city center.",
      "The houses here are under protection.",
      "Any suspicious movement, alert the guard."
    ];

    // Road area matches drawCityGround exactly — guards never leave pavement
    const cL = Math.max(320, Math.floor(this.worldWidth * 0.42)) + 40;
    const cR = cL + 384 - 80;
    const cT = 224 + 48;
    const cMid = 224 + 288;
    const cB = 224 + 576 - 48;

    [
      {
        x: cL, y: cT,
        facing: "right",
        name: "Guard Rowan",
        patrol: [
          { x: cL,  y: cT   },
          { x: cR,  y: cT   },
          { x: cR,  y: cMid },
          { x: cL,  y: cMid }
        ]
      },
      {
        x: cR, y: cMid,
        facing: "left",
        name: "Guard Cedric",
        patrol: [
          { x: cR,  y: cMid },
          { x: cL,  y: cMid },
          { x: cL,  y: cB   },
          { x: cR,  y: cB   }
        ]
      }
    ].forEach((guardConfig, index) => {
      const guard = this.physics.add.sprite(guardConfig.x, guardConfig.y, "knight-npc-sheet", this.getGuardIdleFrame(guardConfig.facing))
        .setDepth(guardConfig.y + 120);
      guard.body.setSize(20, 14).setOffset(30, 68);
      guard.body.setCollideWorldBounds(true);
      guard.speed = 46;
      guard.facing = guardConfig.facing;
      guard.guardName = guardConfig.name;
      guard.patrol = guardConfig.patrol;
      guard.patrolIndex = 1;
      guard.pauseUntil = this.time.now + index * 700;

      const interaction = {
        x: guard.x,
        y: guard.y + 34,
        promptY: guard.y - 50,
        promptText: "E Talk",
        radius: 52,
        onInteract: () => this.dialog.show(guardConfig.name, this.cityGuardPhrases[index % this.cityGuardPhrases.length])
      };
      this.interactions.add(interaction);
      this.physics.add.collider(this.player, guard);
      this.physics.add.collider(guard, this.solids);

      const bubble = this.createGuardBubble(guard);
      this.cityGuards.push({ sprite: guard, interaction, bubble, nextPhraseAt: this.time.now + 1600 + index * 2100 });
    });
  }

  getGuardIdleFrame(facing) {
    return {
      down: 0,
      left: 8,
      right: 16,
      up: 24
    }[facing] ?? 0;
  }

  createGuardBubble(guard) {
    const container = this.add.container(guard.x, guard.y - 92).setDepth(1800).setVisible(false);
    const bg = this.add.graphics();
    const text = this.add.text(0, 0, "", {
      fontFamily: "monospace",
      fontSize: "12px",
      color: "#2a1708",
      align: "center",
      wordWrap: { width: 180 }
    }).setOrigin(0.5);
    container.add([bg, text]);
    container.bg = bg;
    container.label = text;
    container.skipPerformanceCull = true;
    return container;
  }

  showGuardBubble(guardData, phrase) {
    const { sprite, bubble } = guardData;
    if (!sprite?.active || !bubble?.active) {
      return;
    }
    const label = bubble.label;
    const bg = bubble.bg;
    label.setText(phrase);
    const bounds = label.getBounds();
    const width = Math.max(112, bounds.width + 24);
    const height = Math.max(34, bounds.height + 16);
    bg.clear();
    bg.fillStyle(0xffedb0, 0.96);
    bg.fillRoundedRect(-width / 2, -height / 2, width, height, 6);
    bg.lineStyle(2, 0x6f4520, 1);
    bg.strokeRoundedRect(-width / 2, -height / 2, width, height, 6);
    bg.fillStyle(0xffedb0, 0.96);
    bg.fillTriangle(-8, height / 2 - 2, 8, height / 2 - 2, 0, height / 2 + 10);
    bubble.setPosition(sprite.x, sprite.y - 92);
    bubble.setVisible(true);

    this.tweens.killTweensOf(bubble);
    bubble.setAlpha(0);
    this.tweens.add({
      targets: bubble,
      alpha: 1,
      duration: 180,
      yoyo: true,
      hold: 2600,
      onComplete: () => bubble.setVisible(false)
    });
  }

  updateCityGuards() {
    this.cityGuards?.forEach((guardData, index) => {
      const { sprite, interaction, bubble } = guardData;
      if (!sprite?.active) {
        return;
      }
      this.updateGuardPatrol(sprite);
      sprite.setDepth(sprite.y + 120);
      interaction.x = sprite.x;
      interaction.y = sprite.y + 34;
      interaction.promptY = sprite.y - 50;
      if (bubble?.visible) {
        bubble.setPosition(sprite.x, sprite.y - 92);
      }
      if (this.time.now >= guardData.nextPhraseAt && !this.dialog.active) {
        const phrase = this.cityGuardPhrases[(index + Math.floor(this.time.now / 7000)) % this.cityGuardPhrases.length];
        this.showGuardBubble(guardData, phrase);
        guardData.nextPhraseAt = this.time.now + Phaser.Math.Between(7800, 12800);
      }
    });
  }

  updateGuardPatrol(guard) {
    if (!guard.patrol?.length || this.dialog.active || this.time.now < (guard.pauseUntil ?? 0)) {
      guard.setVelocity(0, 0);
      guard.anims.stop();
      guard.setFrame(this.getGuardIdleFrame(guard.facing));
      return;
    }

    const target = guard.patrol[guard.patrolIndex % guard.patrol.length];
    const dx = target.x - guard.x;
    const dy = target.y - guard.y;
    const distance = Math.hypot(dx, dy);

    const blocked = guard.body.blocked.none === false || guard.body.touching.none === false;
    if (distance < 8 || blocked) {
      guard.setVelocity(0, 0);
      guard.patrolIndex = (guard.patrolIndex + 1) % guard.patrol.length;
      guard.pauseUntil = this.time.now + Phaser.Math.Between(450, 1100);
      guard.anims.stop();
      guard.setFrame(this.getGuardIdleFrame(guard.facing));
      return;
    }

    const vx = (dx / distance) * guard.speed;
    const vy = (dy / distance) * guard.speed;
    guard.setVelocity(vx, vy);
    if (Math.abs(vx) > Math.abs(vy)) {
      guard.facing = vx < 0 ? "left" : "right";
    } else {
      guard.facing = vy < 0 ? "up" : "down";
    }
    guard.play(`knight-walk-${guard.facing}`, true);
  }

  update(time, delta) {
    super.update(time, delta);
    this.updateCityGuards();
  }
}
