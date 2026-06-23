import BaseGameScene from "./BaseGameScene.js?v=251";

const TILE = 32;

export default class InteriorBaseScene extends BaseGameScene {
  makeRoom({ width = 640, height = 448, spawnX = 320, spawnY = 350, title = "ElderValley" }) {
    this.manualCollisionStorageKey ??= `eldervalley-${this.scene.key}-manual-collisions-v1`;
    this.roomWidth = width;
    this.roomHeight = height;
    this.physics.world.setBounds(0, 0, width, height);
    this.cameras.main.setBounds(0, 0, width, height);
    this.drawInteriorTiles(width, height);
    this.createControls();
    this.createPlayer(spawnX, spawnY);
    this.createCollisionGroup();
    this.addInteriorBounds(width, height);
    if (!this.skipAutoManualCollisionLoad) {
      this.loadManualCollisionLayout([]);
    }
    this.createHud();
    this.hudTitle.setText(title);
    this.player.setCollideWorldBounds(true);
    this.cameras.main.startFollow(this.player, true, 0.12, 0.12);
  }

  drawInteriorTiles(width, height) {
    for (let y = 0; y < height; y += TILE) {
      for (let x = 0; x < width; x += TILE) {
        const key = y < 96 ? "tile-wall" : "tile-floor";
        this.add.image(x, y, key).setOrigin(0).setDepth(-20);
      }
    }
  }

  addInteriorBounds(width, height) {
    this.addSolidRect(width / 2, 64, width, 64);
    this.addSolidRect(width / 2, height + 8, width, 16);
    this.addSolidRect(-8, height / 2, 16, height);
    this.addSolidRect(width + 8, height / 2, 16, height);
  }

  addExitDoor(x, y, spawnKey) {
    const returnScene = this.entryData.returnScene ?? "WorldScene";
    this.add.rectangle(x, y + 14, 48, 8, 0x3a2c30, 1).setDepth(y - 1);
    this.interactions.add({
      x,
      y,
      promptY: y - 24,
      promptText: "E Exit",
      radius: 44,
      onInteract: () => this.fadeTo(returnScene, { spawnKey })
    });
  }

  addFurniture(x, y, key, bodyWidth, bodyHeight, text, name = "Objeto") {
    const obj = this.addSolidImage(x, y, key, {
      bodyWidth,
      bodyHeight,
      offsetY: -bodyHeight / 2
    });
    if (text) {
      this.interactions.add({
        x,
        y,
        promptY: y - obj.height,
        promptText: "E Look",
        radius: 44,
        onInteract: () => this.dialog.show(name, text)
      });
    }
    return obj;
  }

  addNpc(x, y, frameStart, name, line) {
    const npc = this.physics.add.sprite(x, y, "npc-sheet", frameStart).setDepth(y);
    npc.body.setSize(14, 12).setOffset(5, 18);
    this.solids.add(npc);
    const key = `npc-idle-${frameStart}`;
    if (!this.anims.exists(key)) {
      this.anims.create({
        key,
        frames: this.anims.generateFrameNumbers("npc-sheet", { start: frameStart, end: frameStart + 1 }),
        frameRate: 2,
        repeat: -1
      });
    }
    npc.play(key);
    this.interactions.add({
      x,
      y,
      promptY: y - 32,
      promptText: "E Talk",
      radius: 42,
      onInteract: () => this.dialog.show(name, line)
    });
    return npc;
  }

  update() {
    this.updateBase();
  }
}
