import WorldScene from "./WorldScene.js?v=131";

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
      structures: "eldervalley-city-manual-structures-v1"
    };
    this.manualCollisionStorageKey = "eldervalley-city-manual-collisions-v1";
    this.houseStorageKey = "eldervalley-city-editable-houses-v1";
    this.worldWidth = Math.max(800, Math.ceil(this.scale.width / TILE) * TILE);
    this.worldHeight = Math.max(960, Math.ceil((this.scale.height + 160) / TILE) * TILE);
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
    this.add.text(x, y - 52, "Vila", {
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
      promptText: "E Voltar para Vila",
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
}
