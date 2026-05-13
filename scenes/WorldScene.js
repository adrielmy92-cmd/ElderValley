import BaseGameScene from "./BaseGameScene.js?v=130";

const TILE = 32;
const RIVER_TOP = 832;
const RIVER_BOTTOM = 960;
const BRIDGE_LEFT = 3680;
const BRIDGE_RIGHT = 3872;

const SPAWNS = {
  start: { x: 1042, y: 420 },
  house01: { x: 1332, y: 374 },
  blacksmith: { x: 456, y: 386 },
  middleForge: { x: 862, y: 378 },
  windmill: { x: 1970, y: 704 },
  cityGate: { x: 2760, y: 704 },
  shop: { x: 640, y: 328 },
  collector: { x: 930, y: 626 }
};

const HOUSE_STORAGE_KEY = "market-village-editable-houses-v1";

const HOUSE_DEFS = [
  {
    id: "blacksmith",
    label: "Loja",
    key: "card-shop-house",
    x: 445,
    y: 338,
    sceneKey: "CardShopHouseScene",
    doorId: "door_blacksmith",
    doorOffset: { x: 11, y: 10 },
    spawnOffset: { x: 11, y: 48 },
    colliders: [
      [-88, -126, 28, 176],
      [92, -126, 28, 176],
      [0, -248, 178, 96],
      [-42, -128, 86, 92],
      [58, -128, 76, 92],
      [0, -28, 178, 64]
    ]
  },
  {
    id: "middleForge",
    label: "Forja",
    key: "middle-forge-house",
    x: 888,
    y: 338,
    sceneKey: "MiddleForgeInteriorScene",
    doorId: "door_middle_forge",
    doorOffset: { x: -26, y: 14 },
    spawnOffset: { x: -26, y: 40 },
    colliders: [
      [0, -224, 252, 34],
      [-136, -118, 28, 184],
      [136, -118, 28, 184],
      [-68, -42, 92, 58],
      [72, -42, 138, 58],
      [-4, -142, 176, 42],
      [-112, -88, 56, 54],
      [116, -96, 40, 76],
      [0, 4, 292, 32]
    ]
  },
  {
    id: "house01",
    label: "Casa",
    key: "reference-house",
    x: 1380,
    y: 318,
    sceneKey: "ReferenceHouseInteriorScene",
    doorId: "door_house_01",
    doorOffset: { x: -48, y: 20 },
    spawnOffset: { x: -48, y: 56 },
    colliders: [
      [-54, -132, 174, 238],
      [62, -94, 116, 176]
    ]
  },
  {
    id: "windmill",
    label: "Moinho",
    key: "windmill-house",
    x: 1970,
    y: 650,
    sceneKey: "WindmillLoadScene",
    doorId: "door_windmill",
    doorOffset: { x: 0, y: 12 },
    spawnOffset: { x: 0, y: 54 },
    animated: true,
    colliders: [
      [-132, -66, 44, 116],
      [132, -66, 44, 116],
      [-66, -48, 68, 64],
      [66, -48, 68, 64],
      [0, -112, 204, 46],
      [-90, 4, 112, 24],
      [0, -16, 62, 18],
      [90, 4, 112, 24]
    ]
  },
  {
    id: "tavernHouse",
    label: "Taverna",
    key: "creative-house-tavern",
    creativeOnly: true,
    x: 0,
    y: 0,
    sceneKey: "HouseInteriorScene",
    doorId: "door_tavern_house",
    doorOffset: { x: 0, y: -28 },
    spawnOffset: { x: 0, y: 24 },
    colliders: [
      [-150, -154, 28, 224],
      [150, -154, 28, 224],
      [0, -302, 276, 62],
      [-82, -126, 104, 116],
      [82, -126, 104, 116],
      [-118, -38, 78, 54],
      [118, -38, 78, 54],
      [0, -4, 62, 18]
    ]
  },
  {
    id: "largeManor",
    label: "Mansao",
    key: "creative-house-manor",
    creativeOnly: true,
    x: 0,
    y: 0,
    sceneKey: "HouseInteriorScene",
    doorId: "door_large_manor",
    doorOffset: { x: 0, y: -30 },
    spawnOffset: { x: 0, y: 28 },
    colliders: [
      [-136, -142, 28, 214],
      [136, -142, 28, 214],
      [0, -296, 246, 58],
      [-72, -144, 118, 112],
      [78, -118, 100, 120],
      [-88, -34, 78, 58],
      [88, -34, 78, 58],
      [0, -2, 58, 20]
    ]
  },
  {
    id: "cozyCottage",
    label: "Casa alta",
    key: "creative-house-cottage",
    creativeOnly: true,
    x: 0,
    y: 0,
    sceneKey: "HouseInteriorScene",
    doorId: "door_cozy_cottage",
    doorOffset: { x: 0, y: -24 },
    spawnOffset: { x: 0, y: 28 },
    colliders: [
      [-122, -136, 28, 194],
      [122, -136, 28, 194],
      [0, -276, 220, 58],
      [-64, -132, 92, 112],
      [72, -124, 92, 112],
      [-82, -30, 70, 54],
      [82, -30, 70, 54],
      [0, 0, 54, 18]
    ]
  },
  {
    id: "blueMarketHouse",
    label: "Mercado azul",
    key: "creative-house-blue-market",
    creativeOnly: true,
    x: 0,
    y: 0,
    sceneKey: "HouseInteriorScene",
    doorId: "door_blue_market_house",
    doorOffset: { x: 0, y: -18 },
    spawnOffset: { x: 0, y: 34 },
    colliders: []
  },
  {
    id: "redLodgeHouse",
    label: "Hospedaria",
    key: "creative-house-red-lodge",
    creativeOnly: true,
    x: 0,
    y: 0,
    sceneKey: "HouseInteriorScene",
    doorId: "door_red_lodge_house",
    doorOffset: { x: 0, y: -18 },
    spawnOffset: { x: 0, y: 34 },
    colliders: []
  },
  {
    id: "greenCottageHouse",
    label: "Casa verde",
    key: "creative-house-green-cottage",
    creativeOnly: true,
    x: 0,
    y: 0,
    sceneKey: "HouseInteriorScene",
    doorId: "door_green_cottage_house",
    doorOffset: { x: 0, y: -18 },
    spawnOffset: { x: 0, y: 34 },
    colliders: []
  }
];

export default class WorldScene extends BaseGameScene {
  constructor(sceneKey = "WorldScene") {
    super(sceneKey);
    this.useHouseDefaultCollisions = false;
  }

  create() {
    this.creativeStoragePrefix = "eldervalley-village";
    this.manualStorageKeys = {
      fences: "market-village-manual-fences-v1",
      trees: "market-village-manual-trees-v1",
      floors: "eldervalley-manual-floors-v1",
      structures: "eldervalley-village-manual-structures-v1"
    };
    this.manualCollisionStorageKey = "eldervalley-village-manual-collisions-v1";
    this.houseStorageKey = HOUSE_STORAGE_KEY;
    this.worldWidth = 2920;
    this.worldHeight = 1320;
    this.physics.world.setBounds(0, 0, this.worldWidth, this.worldHeight);
    this.cameras.main.setBounds(0, 0, this.worldWidth, this.worldHeight);
    this.drawGround();
    this.createControls();

    const spawn = this.getSpawnPoint(this.entryData.spawnKey);
    this.createPlayer(spawn.x, spawn.y);
    this.createCollisionGroup();
    this.silverCharacters = [];
    this.buildVillage();
    this.loadManualCollisionLayout([]);
    this.createHud();
    this.createDayNightCycle();
    this.createFenceEditor();

    this.player.setCollideWorldBounds(true);
    this.startStableCameraFollow();
    this.initPerformanceOptimizations();
  }

  startStableCameraFollow() {
    this.cameras.main.roundPixels = true;
    this.cameras.main.startFollow(this.player, false, 1, 1);
  }

  initPerformanceOptimizations() {
    this.dayNightUpdateAccumulator = 0;
    this.visibilityCullAccumulator = 0;
    this.visibilityCullPadding = 260;
    this.updateVisibilityCulling(true);
  }

  updatePerformanceOptimizations(delta) {
    this.dayNightUpdateAccumulator = (this.dayNightUpdateAccumulator ?? 0) + delta;
    if (this.dayNightUpdateAccumulator >= 120) {
      this.updateDayNightCycle(this.dayNightUpdateAccumulator);
      this.dayNightUpdateAccumulator = 0;
    }

    this.visibilityCullAccumulator = (this.visibilityCullAccumulator ?? 0) + delta;
    if (this.visibilityCullAccumulator >= 180) {
      this.updateVisibilityCulling();
      this.visibilityCullAccumulator = 0;
    }
  }

  updateVisibilityCulling(force = false) {
    const camera = this.cameras.main;
    if (!camera?.worldView) {
      return;
    }

    const view = camera.worldView;
    const pad = this.visibilityCullPadding ?? 260;
    const left = view.x - pad;
    const right = view.right + pad;
    const top = view.y - pad;
    const bottom = view.bottom + pad;

    this.children.list.forEach((child) => {
      if (!child?.active || child.scrollFactorX === 0 || child.scrollFactorY === 0 || child.skipPerformanceCull) {
        return;
      }
      if (child.type === "Zone" || child.type === "RenderTexture" || child.depth >= 1900) {
        return;
      }
      if (!["Image", "Sprite", "Rectangle", "Ellipse", "Text"].includes(child.type)) {
        return;
      }

      let visible = true;
      if (child.getBounds) {
        const bounds = child.getBounds();
        visible = bounds.right >= left && bounds.left <= right && bounds.bottom >= top && bounds.top <= bottom;
      } else if (typeof child.x === "number" && typeof child.y === "number") {
        visible = child.x >= left && child.x <= right && child.y >= top && child.y <= bottom;
      }

      if (force || child.visible !== visible) {
        child.setVisible(visible);
      }
    });
  }

  drawGround() {
    this.createGroundLayers();
    for (let y = 0; y < this.worldHeight; y += TILE) {
      for (let x = 0; x < this.worldWidth; x += TILE) {
        const water = y >= RIVER_TOP && y < RIVER_BOTTOM;
        const bridge = (
          x >= BRIDGE_LEFT && x <= BRIDGE_RIGHT && y >= 768 && y <= 1024
        );
        const townCenter = (
          x >= 3008 && x <= 4512 && y >= 256 && y <= 800
        ) || (
          x >= 3008 && x <= 4512 && y >= 992 && y <= 1264
        );
        const path = (
          (x >= 176 && x <= 272 && y < RIVER_TOP)
          || (y >= 352 && y <= 448 && y < RIVER_TOP)
          || (x >= 640 && x <= 736 && y >= 160 && y < 448)
          || (x >= 1040 && x <= 1136 && y >= 160 && y < 448)
          || (x >= 1664 && x <= 1760 && y >= 352 && y < RIVER_TOP)
          || (y >= 672 && y <= 768 && x >= 1664 && y < RIVER_TOP)
          || (y >= 608 && y <= 736 && x >= 1760 && x <= 3040)
          || townCenter
          || bridge
        );
        const grassVariant = ((x / TILE) + (y / TILE)) % 3;
        const key = water && !bridge ? "tile-water-0" : path ? "tile-path" : `tile-grass-${grassVariant}`;
        if (water && !bridge) {
          this.drawGroundTile(key, x, y, { animated: true, kind: "water", variant: 0 });
        } else {
          this.drawGroundTile(key, x, y);
        }
      }
    }

    this.startGroundAnimation();
  }

  createGroundLayers() {
    this.staticGroundLayer = this.add.renderTexture(0, 0, this.worldWidth, this.worldHeight)
      .setOrigin(0)
      .setDepth(-22);
    this.animatedGroundLayer = this.add.renderTexture(0, 0, this.worldWidth, this.worldHeight)
      .setOrigin(0)
      .setDepth(-21);
    this.manualFloorLayer = this.add.renderTexture(0, 0, this.worldWidth, this.worldHeight)
      .setOrigin(0)
      .setDepth(-12);
    this.animatedGroundTiles = [];
  }

  drawGroundTile(key, x, y, options = {}) {
    const layer = options.animated ? this.animatedGroundLayer : this.staticGroundLayer;
    layer.draw(key, x, y);
    if (options.animated) {
      this.animatedGroundTiles.push({
        x,
        y,
        kind: options.kind ?? "grass",
        variant: options.variant ?? 0
      });
    }
  }

  startGroundAnimation() {
    if (!this.animatedGroundTiles.length) {
      return;
    }

    this.groundTimer = this.time.addEvent({
      delay: 520,
      loop: true,
      callback: () => {
        this.waterFrame = !this.waterFrame;
        this.animatedGroundLayer.clear();
        this.animatedGroundTiles.forEach((tile) => {
          const key = this.waterFrame ? "tile-water-0" : "tile-water-1";
          this.animatedGroundLayer.draw(key, tile.x, tile.y);
        });
      }
    });
  }

  buildVillage() {
    this.addRiverEdges();
    this.addHouses();
    this.addDecorations();
    this.addTownCenter();
    this.addSilverCharacter();
    this.addBlondCharacter();
    this.addAdventurerCharacter();
    this.addKnightCharacter();
    this.addNpc();
    this.addCityTransition();
    this.addWorldBounds();
  }

  addWorldBounds() {
    this.addSolidRect(this.worldWidth / 2, -8, this.worldWidth, 16);
    this.addSolidRect(this.worldWidth / 2, this.worldHeight + 8, this.worldWidth, 16);
    this.addSolidRect(-8, this.worldHeight / 2, 16, this.worldHeight);
    this.addSolidRect(this.worldWidth + 8, this.worldHeight / 2, 16, this.worldHeight);
    if (BRIDGE_LEFT >= this.worldWidth) {
      this.addSolidRect(this.worldWidth / 2, (RIVER_TOP + RIVER_BOTTOM) / 2, this.worldWidth, RIVER_BOTTOM - RIVER_TOP);
      return;
    }
    this.addSolidRect(BRIDGE_LEFT / 2, (RIVER_TOP + RIVER_BOTTOM) / 2, BRIDGE_LEFT, RIVER_BOTTOM - RIVER_TOP);
    if (BRIDGE_RIGHT < this.worldWidth) {
      this.addSolidRect((BRIDGE_RIGHT + this.worldWidth) / 2, (RIVER_TOP + RIVER_BOTTOM) / 2, this.worldWidth - BRIDGE_RIGHT, RIVER_BOTTOM - RIVER_TOP);
    }
  }

  addHouses() {
    this.editableHouses = [];
    const saved = this.loadEditableHouseLayouts();
    this.applyEditableHouseLayouts(saved, true);
    this.syncEditableHouseLayouts(true, saved);
  }

  addSavedEditableHousesOnly() {
    this.editableHouses = [];
    const saved = this.loadEditableHouseLayouts();
    this.applyEditableHouseLayouts(saved, false);
    this.syncEditableHouseLayouts(false, saved);
  }

  applyEditableHouseLayouts(saved, includeDefaults) {
    this.hiddenEditableHouseIds = new Set(saved.filter((house) => house.hidden).map((house) => house.id));
    const layouts = includeDefaults
      ? [
        ...HOUSE_DEFS
          .filter((def) => !def.creativeOnly)
          .map((def) => saved.find((house) => house.id === def.id) ?? def),
        ...saved.filter((house) => HOUSE_DEFS.find((def) => def.id === house.id)?.creativeOnly)
      ]
      : saved;

    layouts.forEach((layout) => {
      if (layout.hidden) {
        return;
      }
      const def = HOUSE_DEFS.find((houseDef) => houseDef.id === layout.id);
      if (def) {
        this.createEditableHouse(def, layout.x, layout.y);
      }
    });
  }

  replaceEditableHouseLayouts(saved, includeDefaults) {
    (this.editableHouses ?? []).forEach((house) => {
      this.interactions.remove(house.interaction);
      house.colliders.forEach(({ zone }) => zone.destroy());
      house.image.destroy();
    });
    this.editableHouses = [];
    this.selectedEditableHouse = null;
    this.draggedEditableHouse = null;
    this.applyEditableHouseLayouts(saved, includeDefaults);
    this.updateHouseSelectionMarker();
    this.updateCreativeHud();
  }

  getSpawnPoint(spawnKey) {
    const houseDef = HOUSE_DEFS.find((def) => def.id === spawnKey);
    if (houseDef) {
      const saved = this.loadEditableHouseLayouts();
      const layout = saved.find((house) => house.id === houseDef.id) ?? houseDef;
      return {
        x: layout.x + houseDef.spawnOffset.x,
        y: layout.y + houseDef.spawnOffset.y
      };
    }
    return SPAWNS[spawnKey] ?? SPAWNS.start;
  }

  loadEditableHouseLayouts() {
    try {
      return JSON.parse(localStorage.getItem(this.houseStorageKey ?? HOUSE_STORAGE_KEY) ?? "[]");
    } catch {
      return [];
    }
  }

  async syncEditableHouseLayouts(includeDefaults, localData) {
    const key = this.houseStorageKey ?? HOUSE_STORAGE_KEY;
    const hasLocalSave = this.hasLocalStorageKey(key);
    if (hasLocalSave && Array.isArray(localData)) {
      this.saveSharedStorage(key, localData);
      return;
    }

    const remote = await this.loadSharedStorage(key);
    if (Array.isArray(remote)) {
      this.writeLocalStorageArray(key, remote);
      this.replaceEditableHouseLayouts(remote, includeDefaults);
      return;
    }
  }

  hasLocalStorageKey(key) {
    try {
      return localStorage.getItem(key) !== null;
    } catch {
      return false;
    }
  }

  readLocalStorageArray(key) {
    try {
      const raw = localStorage.getItem(key);
      const parsed = JSON.parse(raw ?? "[]");
      return {
        hasLocalSave: raw !== null,
        data: Array.isArray(parsed) ? parsed : []
      };
    } catch {
      return { hasLocalSave: false, data: [] };
    }
  }

  writeLocalStorageArray(key, data) {
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch {
      // O jogo continua usando a copia do servidor.
    }
  }

  async loadSharedStorage(key) {
    if (!key || window.location.protocol === "file:") {
      return null;
    }

    try {
      const response = await fetch(`/api/storage/${encodeURIComponent(key)}`, { cache: "no-store" });
      const payload = await response.json();
      return payload?.data;
    } catch {
      return null;
    }
  }

  async saveSharedStorage(key, data) {
    if (!key || window.location.protocol === "file:") {
      return;
    }

    try {
      await fetch(`/api/storage/${encodeURIComponent(key)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        keepalive: true
      });
    } catch {
      // LocalStorage fica como fallback.
    }
  }

  async syncCreativeCollection(key, localData, hasLocalSave, clearFn, applyFn) {
    if (hasLocalSave && Array.isArray(localData)) {
      this.saveSharedStorage(key, localData);
      return;
    }

    const remote = await this.loadSharedStorage(key);
    if (Array.isArray(remote)) {
      this.writeLocalStorageArray(key, remote);
      clearFn();
      remote.forEach((item) => applyFn(item));
      return;
    }
  }

  saveEditableHouseLayouts() {
    const previousLayouts = this.loadEditableHouseLayouts();
    const visible = this.editableHouses.map(({ def, x, y }) => ({ id: def.id, x, y }));
    const hidden = [...(this.hiddenEditableHouseIds ?? new Set())].map((id) => {
      const previous = previousLayouts.find((house) => house.id === id);
      const def = HOUSE_DEFS.find((houseDef) => houseDef.id === id);
      return {
        id,
        x: previous?.x ?? def?.x ?? 0,
        y: previous?.y ?? def?.y ?? 0,
        hidden: true
      };
    });
    const data = [...visible, ...hidden];
    try {
      localStorage.setItem(this.houseStorageKey ?? HOUSE_STORAGE_KEY, JSON.stringify(data));
    } catch {
      // O jogo continua funcionando mesmo se o navegador bloquear storage.
    }
    this.saveSharedStorage(this.houseStorageKey ?? HOUSE_STORAGE_KEY, data);
  }

  createEditableHouse(def, x, y) {
    this.hiddenEditableHouseIds?.delete(def.id);
    let image;
    if (def.animated) {
      this.createWindmillAnimation();
      image = this.add.sprite(x, y, def.key, 0)
        .setOrigin(0.5, 1)
        .setDepth(y + 44)
        .play("windmill-house-spin");
    } else {
      image = this.add.image(x, y, def.key)
        .setOrigin(0.5, 1)
        .setDepth(y + 44);
    }

    const house = {
      def,
      x,
      y,
      image,
      colliders: (this.useHouseDefaultCollisions ? (def.colliders ?? []) : []).map(([dx, dy, width, height]) => {
        const zone = this.addSolidRect(x + dx, y + dy, width, height);
        return { zone, dx, dy };
      }),
      interaction: {
        id: def.doorId,
        x: x + def.doorOffset.x,
        y: y + def.doorOffset.y,
        promptY: y + def.doorOffset.y - 38,
        promptText: "E Entrar",
        radius: 46,
        onInteract: () => this.fadeTo(def.sceneKey, { exitSpawnKey: def.id, doorId: def.doorId, returnScene: this.scene.key })
      }
    };

    this.interactions.add(house.interaction);
    this.editableHouses.push(house);
    return house;
  }

  restoreEditableHouse(def, x, y) {
    const existing = this.findEditableHouseById(def.id);
    if (existing) {
      this.selectedEditableHouse = existing;
      this.moveEditableHouse(existing, x, y);
      this.saveEditableHouseLayouts();
      this.updateHouseSelectionMarker();
      this.updateCreativeHud();
      return existing;
    }

    const house = this.createEditableHouse(def, x, y);
    this.selectedEditableHouse = house;
    this.saveEditableHouseLayouts();
    this.updateHouseSelectionMarker();
    this.updateCreativeHud();
    return house;
  }

  findEditableHouseById(id) {
    return (this.editableHouses ?? []).find((house) => house.def.id === id);
  }

  moveEditableHouse(house, x, y) {
    house.x = x;
    house.y = y;
    house.image.setPosition(x, y).setDepth(y + 44);
    house.colliders.forEach(({ zone, dx, dy }) => {
      zone.setPosition(x + dx, y + dy);
      zone.body?.updateFromGameObject();
    });
    house.interaction.x = x + house.def.doorOffset.x;
    house.interaction.y = y + house.def.doorOffset.y;
    house.interaction.promptY = house.interaction.y - 38;
  }

  removeEditableHouse(house) {
    if (!house) {
      return;
    }

    this.hiddenEditableHouseIds ??= new Set();
    this.hiddenEditableHouseIds.add(house.def.id);
    this.interactions.remove(house.interaction);
    house.colliders.forEach(({ zone }) => zone.destroy());
    house.image.destroy();
    this.editableHouses = (this.editableHouses ?? []).filter((item) => item !== house);

    if (this.selectedEditableHouse === house) {
      this.selectedEditableHouse = null;
    }
    if (this.draggedEditableHouse === house) {
      this.draggedEditableHouse = null;
    }

    this.saveEditableHouseLayouts();
    this.updateHouseSelectionMarker();
    this.updateCreativeHud();
  }

  createWindmillAnimation() {
    if (this.anims.exists("windmill-house-spin")) {
      return;
    }
    this.anims.create({
      key: "windmill-house-spin",
      frames: this.anims.generateFrameNumbers("windmill-house", { start: 0, end: 7 }),
      frameRate: 7,
      repeat: -1
    });
  }

  addBlacksmithHouse(x, y) {
    this.add.image(x, y, "blacksmith-house").setOrigin(0.5, 1).setDepth(y + 44);
    this.addSolidRect(x, y - 238, 246, 32);
    this.addSolidRect(x - 126, y - 138, 30, 196);
    this.addSolidRect(x + 126, y - 138, 30, 196);
    this.addSolidRect(x - 58, y - 44, 104, 60);
    this.addSolidRect(x + 70, y - 44, 132, 60);
    this.addSolidRect(x - 4, y - 146, 186, 40);
    this.addSolidRect(x - 94, y - 88, 74, 48);
    this.addSolidRect(x, y + 4, 286, 32);
  }

  addCardShopHouse(x, y) {
    this.add.image(x, y, "card-shop-house").setOrigin(0.5, 1).setDepth(y + 44);

    this.addSolidRect(x - 90, y - 96, 28, 178);
    this.addSolidRect(x + 92, y - 96, 28, 178);
    this.addSolidRect(x, y - 140, 152, 58);
    this.addSolidRect(x - 50, y - 44, 74, 58);
    this.addSolidRect(x + 66, y - 44, 58, 58);
    this.addSolidRect(x + 10, y - 38, 52, 92);
    this.addSolidRect(x - 64, y + 4, 66, 24);
    this.addSolidRect(x + 10, y + 4, 50, 24);
    this.addSolidRect(x + 72, y + 4, 76, 24);
  }

  addBlacksmithLot(x, y) {
    this.addFencedLot({
      left: x - 166,
      right: x + 174,
      top: y - 294,
      bottom: y + 26,
      gateX: x,
      gateWidth: 98
    });
  }

  addCardShopLot(x, y) {
    this.addFencedLot({
      left: x - 152,
      right: x + 154,
      top: y - 304,
      bottom: y + 6,
      gateX: x + 12,
      gateWidth: 116
    });
  }

  addMiddleForgeHouse(x, y) {
    this.add.image(x, y, "middle-forge-house").setOrigin(0.5, 1).setDepth(y + 44);
    this.addSolidRect(x, y - 224, 252, 34);
    this.addSolidRect(x - 136, y - 118, 28, 184);
    this.addSolidRect(x + 136, y - 118, 28, 184);
    this.addSolidRect(x - 68, y - 42, 92, 58);
    this.addSolidRect(x + 72, y - 42, 138, 58);
    this.addSolidRect(x - 4, y - 142, 176, 42);
    this.addSolidRect(x - 112, y - 88, 56, 54);
    this.addSolidRect(x + 116, y - 96, 40, 76);
    this.addSolidRect(x, y + 4, 292, 32);
  }

  addMiddleForgeLot(x, y) {
    this.addFencedLot({
      left: x - 156,
      right: x + 156,
      top: y - 258,
      bottom: y + 6,
      gateX: x - 26,
      gateWidth: 112
    });

    [[x - 124, y + 10], [x + 118, y + 8]].forEach(([fx, fy]) => {
      this.add.image(fx, fy, "flower-white").setDepth(fy);
    });
  }

  addReferenceHouse(x, y) {
    this.add.image(x, y, "reference-house").setOrigin(0.5, 1).setDepth(y + 44);

    this.addSolidRect(x - 68, y - 246, 138, 30);
    this.addSolidRect(x + 54, y - 246, 126, 30);
    this.addSolidRect(x - 136, y - 142, 28, 194);
    this.addSolidRect(x + 126, y - 142, 28, 194);
    this.addSolidRect(x - 70, y - 48, 108, 54);
    this.addSolidRect(x + 64, y - 48, 118, 54);
    this.addSolidRect(x - 16, y - 152, 118, 44);
    this.addSolidRect(x + 50, y - 108, 106, 80);
    this.addSolidRect(x - 92, y - 92, 68, 48);
    this.addSolidRect(x, y + 4, 292, 32);
  }

  addReferenceHouseLot(x, y) {
    this.addFencedLot({
      left: x - 174,
      right: x + 174,
      top: y - 286,
      bottom: y + 28,
      gateX: x - 48,
      gateWidth: 112
    });

    [[x - 142, y - 30], [x - 122, y - 18], [x + 132, y - 34], [x + 146, y - 18]].forEach(([fx, fy]) => {
      this.add.image(fx, fy, "flower-white").setDepth(fy);
    });
  }

  addWindmillHouse(x, y) {
    if (!this.anims.exists("windmill-house-spin")) {
      this.anims.create({
        key: "windmill-house-spin",
        frames: this.anims.generateFrameNumbers("windmill-house", { start: 0, end: 7 }),
        frameRate: 7,
        repeat: -1
      });
    }

    this.add.sprite(x, y, "windmill-house", 0)
      .setOrigin(0.5, 1)
      .setDepth(y + 44)
      .play("windmill-house-spin");

    this.addSolidRect(x - 132, y - 66, 44, 116);
    this.addSolidRect(x + 132, y - 66, 44, 116);
    this.addSolidRect(x - 66, y - 48, 68, 64);
    this.addSolidRect(x + 66, y - 48, 68, 64);
    this.addSolidRect(x, y - 112, 204, 46);
    this.addSolidRect(x - 90, y + 4, 112, 24);
    this.addSolidRect(x + 90, y + 4, 112, 24);
  }

  addWindmillLot(x, y) {
    this.addFencedLot({
      left: x - 172,
      right: x + 172,
      top: y - 338,
      bottom: y + 16,
      gateX: x,
      gateWidth: 118
    });
  }

  addReferenceTree(x, y) {
    const tree = this.add.image(x, y, "reference-tree").setOrigin(0.5, 1).setDepth(y + 80);
    this.addSolidRect(x, y - 22, 42, 28);
    this.tweens.add({
      targets: tree,
      scaleX: 1.02,
      duration: 1500,
      yoyo: true,
      repeat: -1,
      ease: "Sine.inOut"
    });
    return tree;
  }

  addFence(x, y, vertical = false) {
    if (vertical) {
      this.add.image(x, y, "fence-v")
        .setOrigin(0.5)
        .setDepth(y - 90);
      this.addSolidRect(x, y, 15, 54);
      return;
    }

    this.addSolidImage(x, y, "fence-h", {
      bodyWidth: 56,
      bodyHeight: 10,
      offsetY: 3,
      depth: y - 90
    });
  }

  addFencePost(x, y) {
    this.addSolidImage(x, y, "fence-post", {
      bodyWidth: 16,
      bodyHeight: 18,
      offsetY: -8,
      depth: y - 88
    });
  }

  addFenceGate(x, y) {
    this.add.image(x, y, "fence-gate")
      .setOrigin(0.5, 1)
      .setDepth(y - 88);
  }

  createFenceEditor() {
    this.manualFenceStorageKey = this.manualStorageKeys?.fences ?? `${this.creativeStoragePrefix ?? "eldervalley"}-manual-fences-v1`;
    this.manualTreeStorageKey = this.manualStorageKeys?.trees ?? `${this.creativeStoragePrefix ?? "eldervalley"}-manual-trees-v1`;
    this.manualFloorStorageKey = this.manualStorageKeys?.floors ?? `${this.creativeStoragePrefix ?? "eldervalley"}-manual-floors-v1`;
    this.manualStructureStorageKey = this.manualStorageKeys?.structures ?? `${this.creativeStoragePrefix ?? "eldervalley"}-manual-structures-v1`;
    this.manualFences = [];
    this.manualTrees = [];
    this.manualFloors = [];
    this.manualStructures = [];
    this.creativeModeEnabled = false;
    this.activeCreativeMode = "tree";
    this.fenceEditorEnabled = false;
    this.treeEditorEnabled = false;
    this.floorEditorEnabled = false;
    this.houseEditorEnabled = false;
    this.structureEditorEnabled = false;
    this.selectedFenceType = "h";
    this.selectedTreeType = "pine";
    this.selectedFloorType = "stoneA";
    this.selectedStructureType = "fruitStall";
    this.selectedHouseType = HOUSE_DEFS[0]?.id ?? null;
    this.selectedEditableHouse = null;
    this.draggedEditableHouse = null;
    this.fencePieces = {
      h: {
        key: "fence-h",
        label: "Horizontal",
        originY: 1,
        bodyWidth: 56,
        bodyHeight: 10,
        offsetY: 3,
        depthOffset: -90,
        snap: 16
      },
      v: {
        key: "fence-v",
        label: "Vertical",
        originY: 0.5,
        scale: 0.72,
        bodyWidth: 11,
        bodyHeight: 39,
        offsetY: 0,
        depthOffset: -90,
        snap: 16
      },
      post: {
        key: "fence-post",
        label: "Poste",
        originY: 1,
        scale: 0.72,
        bodyWidth: 12,
        bodyHeight: 14,
        offsetY: -6,
        depthOffset: -88,
        snap: 16
      },
      gate: {
        key: "fence-gate",
        label: "Portao",
        originY: 1,
        bodyWidth: 72,
        bodyHeight: 16,
        offsetY: -8,
        depthOffset: -88,
        snap: 16
      },
      openGate: {
        key: "fence-gate-open",
        label: "Portao aberto",
        originY: 1,
        scale: 0.72,
        collides: false,
        bodyWidth: 0,
        bodyHeight: 0,
        offsetY: 0,
        depthOffset: -88,
        snap: 16
      }
    };
    this.treePieces = {
      pine: {
        key: "creative-tree-pine",
        label: "Pinheiro",
        colliders: [[0, 4, 42, 46]],
        depthOffset: 82,
        snap: 16
      },
      flower: {
        key: "creative-tree-flower",
        label: "Florida",
        colliders: [[0, 4, 52, 46]],
        depthOffset: 86,
        snap: 16
      },
      round: {
        key: "creative-tree-round",
        label: "Copa cheia",
        colliders: [[0, 4, 56, 46]],
        depthOffset: 86,
        snap: 16
      },
      ancient: {
        key: "creative-tree-ancient",
        label: "Antiga",
        colliders: [[0, 4, 66, 48]],
        depthOffset: 88,
        snap: 16
      },
      twisted: {
        key: "creative-tree-twisted",
        label: "Tortuosa",
        scale: 1,
        colliders: [[0, 6, 48, 52]],
        depthOffset: 104,
        snap: 16
      },
      flowerCone: {
        key: "creative-tree-flower-cone",
        label: "Cone florida",
        scale: 1,
        colliders: [[0, 6, 46, 52]],
        depthOffset: 108,
        snap: 16
      },
      layeredPine: {
        key: "creative-tree-layered-pine",
        label: "Pinheiro camadas",
        scale: 1,
        colliders: [[0, 6, 44, 52]],
        depthOffset: 112,
        snap: 16
      },
      willow: {
        key: "creative-tree-willow",
        label: "Salgueiro",
        scale: 1,
        colliders: [[0, 6, 54, 56]],
        depthOffset: 112,
        snap: 16
      },
      birch: {
        key: "creative-tree-birch",
        label: "Bordo branco",
        scale: 1,
        colliders: [[0, 6, 38, 54]],
        depthOffset: 112,
        snap: 16
      },
      cypress: {
        key: "creative-tree-cypress",
        label: "Cipreste",
        scale: 1,
        colliders: [[0, 6, 40, 56]],
        depthOffset: 112,
        snap: 16
      },
      redMaple: {
        key: "creative-tree-red-maple",
        label: "Bordo vermelho",
        scale: 1,
        colliders: [[0, 6, 58, 54]],
        depthOffset: 114,
        snap: 16
      },
      palm: {
        key: "creative-tree-palm",
        label: "Palmeira",
        scale: 1,
        colliders: [[0, 6, 46, 54]],
        depthOffset: 108,
        snap: 16
      }
    };
    this.floorPieces = {
      stoneA: { key: "creative-floor-01", label: "Pedra A" },
      stoneB: { key: "creative-floor-02", label: "Pedra B" },
      stoneC: { key: "creative-floor-03", label: "Pedra C" },
      dirtA: { key: "creative-floor-04", label: "Terra A" },
      dirtB: { key: "creative-floor-05", label: "Terra B" },
      grassA: { key: "creative-floor-06", label: "Grama A" },
      grassB: { key: "creative-floor-07", label: "Grama B" },
      woodA: { key: "creative-floor-08", label: "Madeira A" },
      woodB: { key: "creative-floor-09", label: "Madeira B" },
      stoneTop: { key: "creative-floor-10", label: "Pedra topo" },
      dirtTop: { key: "creative-floor-11", label: "Terra topo" },
      stoneLeft: { key: "creative-floor-12", label: "Pedra esq" },
      stoneRight: { key: "creative-floor-13", label: "Pedra dir" },
      cornerA: { key: "creative-floor-14", label: "Canto A" },
      cornerB: { key: "creative-floor-15", label: "Canto B" },
      cornerC: { key: "creative-floor-16", label: "Canto C" },
      cornerD: { key: "creative-floor-17", label: "Canto D" },
      grassDirt: { key: "creative-floor-18", label: "Grama terra" },
      stoneDirt: { key: "creative-floor-19", label: "Pedra terra" }
    };
    this.structurePieces = {
      fruitStall: {
        key: "creative-structure-fruit-stall",
        label: "Banca frutas",
        scale: 1,
        colliders: [[0, -54, 158, 90]],
        depthOffset: 96,
        snap: 16
      },
      knightStatue: {
        key: "creative-structure-knight-statue",
        label: "Estatua",
        scale: 1,
        colliders: [[0, -48, 78, 92]],
        depthOffset: 94,
        snap: 16
      },
      fountain: {
        key: "creative-structure-fountain",
        label: "Fonte",
        scale: 1,
        colliders: [[0, -58, 166, 106]],
        depthOffset: 98,
        snap: 16
      },
      well: {
        key: "creative-structure-well",
        label: "Poco",
        scale: 1,
        colliders: [[0, -58, 112, 96]],
        depthOffset: 100,
        snap: 16
      }
    };

    this.input.mouse?.disableContextMenu();
    this.input.keyboard.addCapture(Phaser.Input.Keyboard.KeyCodes.TAB);
    this.creativePanelPosition = this.loadCreativePanelPosition();
    this.fenceEditorKeys = this.input.keyboard.addKeys({
      toggleCreative: Phaser.Input.Keyboard.KeyCodes.TAB,
      modeFence: Phaser.Input.Keyboard.KeyCodes.F,
      modeTree: Phaser.Input.Keyboard.KeyCodes.T,
      modeHouse: Phaser.Input.Keyboard.KeyCodes.H,
      modeFloor: Phaser.Input.Keyboard.KeyCodes.P,
      modeStructure: Phaser.Input.Keyboard.KeyCodes.B,
      horizontal: Phaser.Input.Keyboard.KeyCodes.ONE,
      vertical: Phaser.Input.Keyboard.KeyCodes.TWO,
      post: Phaser.Input.Keyboard.KeyCodes.THREE,
      gate: Phaser.Input.Keyboard.KeyCodes.FOUR,
      openGate: Phaser.Input.Keyboard.KeyCodes.FIVE,
      six: Phaser.Input.Keyboard.KeyCodes.SIX,
      seven: Phaser.Input.Keyboard.KeyCodes.SEVEN,
      eight: Phaser.Input.Keyboard.KeyCodes.EIGHT,
      nine: Phaser.Input.Keyboard.KeyCodes.NINE,
      zero: Phaser.Input.Keyboard.KeyCodes.ZERO,
      redMaple: Phaser.Input.Keyboard.KeyCodes.R,
      palm: Phaser.Input.Keyboard.KeyCodes.M,
      remove: Phaser.Input.Keyboard.KeyCodes.DELETE,
      backspace: Phaser.Input.Keyboard.KeyCodes.BACKSPACE
    });

    this.creativeInventoryItems = [];
    this.creativePanel = this.add.rectangle(this.creativePanelPosition.x, this.creativePanelPosition.y, 820, 188, 0x101721, 0.86)
      .setOrigin(0)
      .setScrollFactor(0)
      .setDepth(2998)
      .setStrokeStyle(2, 0xf0c15d, 0.72)
      .setInteractive({ useHandCursor: true });
    this.creativePanel.on("pointerdown", (pointer) => this.startCreativePanelDrag(pointer));
    this.creativeTitleText = this.add.text(this.creativePanelPosition.x + 14, this.creativePanelPosition.y + 12, "", {
      fontFamily: "monospace",
      fontSize: "16px",
      color: "#ffe7a8",
      stroke: "#1a202b",
      strokeThickness: 3
    }).setScrollFactor(0).setDepth(3000);
    this.creativeModesText = this.add.text(this.creativePanelPosition.x + 14, this.creativePanelPosition.y + 40, "", {
      fontFamily: "monospace",
      fontSize: "13px",
      color: "#d9e5ef",
      stroke: "#1a202b",
      strokeThickness: 3
    }).setScrollFactor(0).setDepth(3000);
    this.fenceEditorText = this.add.text(18, this.scale.height - 34, "", {
      fontFamily: "monospace",
      fontSize: "13px",
      color: "#fff2bf",
      stroke: "#1a202b",
      strokeThickness: 3
    }).setScrollFactor(0).setDepth(3000);

    this.handleFenceEditorResize = (gameSize) => {
      this.fenceEditorText?.setPosition(18, gameSize.height - 34);
      this.updateCreativeHud();
    };
    this.scale.on("resize", this.handleFenceEditorResize);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      if (this.handleFenceEditorResize) {
        this.scale.off("resize", this.handleFenceEditorResize);
      }
      this.creativePanel?.off("pointerdown");
      this.input.off("pointerdown", this.handleFenceEditorPointerDown, this);
      this.input.off("pointermove", this.handleCreativePointerMove, this);
      this.input.off("pointerup", this.handleCreativePointerUp, this);
    });

    this.input.on("pointerdown", this.handleFenceEditorPointerDown, this);
    this.input.on("pointermove", this.handleCreativePointerMove, this);
    this.input.on("pointerup", this.handleCreativePointerUp, this);
    this.loadManualFloors();
    this.loadManualFences();
    this.loadManualTrees();
    this.loadManualStructures();
    this.updateCreativeHud();
  }

  updateFenceEditor() {
    if (!this.fenceEditorKeys) {
      return;
    }

    if (Phaser.Input.Keyboard.JustDown(this.fenceEditorKeys.toggleCreative)) {
      this.creativeModeEnabled = !this.creativeModeEnabled;
      if (this.creativeModeEnabled) {
        this.activeCreativeMode = this.activeCreativeMode ?? "tree";
      }
      this.syncCreativeModeState();
      this.updateCreativeHud();
    }

    if (this.creativeModeEnabled && Phaser.Input.Keyboard.JustDown(this.fenceEditorKeys.modeFence)) {
      this.activeCreativeMode = "fence";
      this.syncCreativeModeState();
      this.updateCreativeHud();
    }

    if (this.creativeModeEnabled && Phaser.Input.Keyboard.JustDown(this.fenceEditorKeys.modeTree)) {
      this.activeCreativeMode = "tree";
      this.syncCreativeModeState();
      this.updateCreativeHud();
    }

    if (this.creativeModeEnabled && Phaser.Input.Keyboard.JustDown(this.fenceEditorKeys.modeHouse)) {
      this.activeCreativeMode = "house";
      this.syncCreativeModeState();
      this.updateCreativeHud();
    }

    if (this.creativeModeEnabled && Phaser.Input.Keyboard.JustDown(this.fenceEditorKeys.modeFloor)) {
      this.activeCreativeMode = "floor";
      this.syncCreativeModeState();
      this.updateCreativeHud();
    }

    if (this.creativeModeEnabled && Phaser.Input.Keyboard.JustDown(this.fenceEditorKeys.modeStructure)) {
      this.activeCreativeMode = "structure";
      this.syncCreativeModeState();
      this.updateCreativeHud();
    }

    const fenceSelectionKeys = [
      ["horizontal", "h"],
      ["vertical", "v"],
      ["post", "post"],
      ["gate", "gate"],
      ["openGate", "openGate"]
    ];

    fenceSelectionKeys.forEach(([keyName, fenceType]) => {
      if (this.isFenceEditorActive() && Phaser.Input.Keyboard.JustDown(this.fenceEditorKeys[keyName])) {
        this.selectedFenceType = fenceType;
        this.updateCreativeHud();
      }
    });

    const treeSelectionKeys = [
      ["horizontal", "pine"],
      ["vertical", "flower"],
      ["post", "round"],
      ["gate", "ancient"],
      ["openGate", "twisted"],
      ["six", "flowerCone"],
      ["seven", "layeredPine"],
      ["eight", "willow"],
      ["nine", "birch"],
      ["zero", "cypress"],
      ["redMaple", "redMaple"],
      ["palm", "palm"]
    ];

    treeSelectionKeys.forEach(([keyName, treeType]) => {
      if (this.isTreeEditorActive() && Phaser.Input.Keyboard.JustDown(this.fenceEditorKeys[keyName])) {
        this.selectedTreeType = treeType;
        this.updateCreativeHud();
      }
    });

    const houseSelectionKeys = ["horizontal", "vertical", "post", "gate"];
    houseSelectionKeys.forEach((keyName, index) => {
      const def = HOUSE_DEFS[index];
      if (def && this.isHouseEditorActive() && Phaser.Input.Keyboard.JustDown(this.fenceEditorKeys[keyName])) {
        this.selectedHouseType = def.id;
        this.selectedEditableHouse = this.findEditableHouseById(def.id) ?? null;
        this.updateCreativeHud();
        this.updateHouseSelectionMarker();
      }
    });

    const floorSelectionKeys = [
      "horizontal", "vertical", "post", "gate", "openGate",
      "six", "seven", "eight", "nine", "zero"
    ];
    const floorTypes = Object.keys(this.floorPieces);
    floorSelectionKeys.forEach((keyName, index) => {
      const floorType = floorTypes[index];
      if (floorType && this.isFloorEditorActive() && Phaser.Input.Keyboard.JustDown(this.fenceEditorKeys[keyName])) {
        this.selectedFloorType = floorType;
        this.updateCreativeHud();
      }
    });

    const structureSelectionKeys = ["horizontal", "vertical", "post", "gate"];
    const structureTypes = Object.keys(this.structurePieces);
    structureSelectionKeys.forEach((keyName, index) => {
      const structureType = structureTypes[index];
      if (structureType && this.isStructureEditorActive() && Phaser.Input.Keyboard.JustDown(this.fenceEditorKeys[keyName])) {
        this.selectedStructureType = structureType;
        this.updateCreativeHud();
      }
    });

    const removePressed = Phaser.Input.Keyboard.JustDown(this.fenceEditorKeys.remove)
      || Phaser.Input.Keyboard.JustDown(this.fenceEditorKeys.backspace);
    if (this.isFenceEditorActive() && removePressed) {
      const point = this.getFenceEditorPointerWorldPoint();
      this.removeNearestManualFence(point.x, point.y);
    } else if (this.isTreeEditorActive() && removePressed) {
      const point = this.getTreeEditorPointerWorldPoint();
      this.removeNearestManualTree(point.x, point.y);
    } else if (this.isFloorEditorActive() && removePressed) {
      const point = this.getFloorEditorPointerWorldPoint();
      this.removeManualFloorAt(point.x, point.y);
    } else if (this.isStructureEditorActive() && removePressed) {
      const point = this.getStructureEditorPointerWorldPoint();
      this.removeManualStructureAt(point.x, point.y);
    } else if (this.isHouseEditorActive() && removePressed) {
      const point = this.getHouseEditorPointerWorldPoint();
      this.removeEditableHouse(this.getHouseAtWorldPoint(point.x, point.y) ?? this.selectedEditableHouse);
    }
  }

  syncCreativeModeState() {
    this.fenceEditorEnabled = this.creativeModeEnabled && this.activeCreativeMode === "fence";
    this.treeEditorEnabled = this.creativeModeEnabled && this.activeCreativeMode === "tree";
    this.floorEditorEnabled = this.creativeModeEnabled && this.activeCreativeMode === "floor";
    this.houseEditorEnabled = this.creativeModeEnabled && this.activeCreativeMode === "house";
    this.structureEditorEnabled = this.creativeModeEnabled && this.activeCreativeMode === "structure";
    if (!this.houseEditorEnabled) {
      this.draggedEditableHouse = null;
      this.updateHouseSelectionMarker();
    }
  }

  isFenceEditorActive() {
    return this.creativeModeEnabled && this.activeCreativeMode === "fence";
  }

  isTreeEditorActive() {
    return this.creativeModeEnabled && this.activeCreativeMode === "tree";
  }

  isFloorEditorActive() {
    return this.creativeModeEnabled && this.activeCreativeMode === "floor";
  }

  isHouseEditorActive() {
    return this.creativeModeEnabled && this.activeCreativeMode === "house";
  }

  isStructureEditorActive() {
    return this.creativeModeEnabled && this.activeCreativeMode === "structure";
  }

  updateCreativeHud() {
    if (!this.fenceEditorText || !this.creativePanel) {
      return;
    }

    this.creativePanel.setVisible(this.creativeModeEnabled);
    this.creativeTitleText?.setVisible(this.creativeModeEnabled);
    this.creativeModesText?.setVisible(this.creativeModeEnabled);

    if (!this.creativeModeEnabled) {
      this.fenceEditorText.setText("Tab Criativo");
      this.clearCreativeInventory();
      return;
    }

    const panelWidth = Math.min(this.scale.width - 36, 930);
    this.clampCreativePanelPosition(panelWidth, 188);
    this.creativePanel.setSize(panelWidth, 188);
    this.creativePanel.setPosition(this.creativePanelPosition.x, this.creativePanelPosition.y);
    this.creativeTitleText?.setPosition(this.creativePanelPosition.x + 14, this.creativePanelPosition.y + 12);
    this.creativeModesText?.setPosition(this.creativePanelPosition.x + 14, this.creativePanelPosition.y + 40);
    this.creativeInventoryBounds = new Phaser.Geom.Rectangle(this.creativePanelPosition.x, this.creativePanelPosition.y, panelWidth, 188);
    const activeLabel = {
      fence: "Cercas",
      tree: "Arvores",
      floor: "Pisos",
      house: "Casas",
      structure: "Estruturas"
    }[this.activeCreativeMode] ?? "Nenhum";
    this.creativeTitleText?.setText("Modo Criativo");
    this.creativeModesText?.setText(`Modo: ${activeLabel}  |  P Pisos  |  F Cercas  |  T Arvores  |  H Casas  |  B Estruturas`);

    if (this.isFenceEditorActive()) {
      const label = this.fencePieces[this.selectedFenceType]?.label ?? "Horizontal";
      this.fenceEditorText.setText(`Cerca: ${label} | clique coloca | direito/remove apaga`);
    } else if (this.isTreeEditorActive()) {
      const label = this.treePieces[this.selectedTreeType]?.label ?? "Pinheiro";
      this.fenceEditorText.setText(`Arvore: ${label} | clique coloca | direito/remove apaga`);
    } else if (this.isFloorEditorActive()) {
      const label = this.floorPieces[this.selectedFloorType]?.label ?? "Pedra A";
      this.fenceEditorText.setText(`Piso: ${label} | clique pinta | direito/Delete apaga`);
    } else if (this.isHouseEditorActive()) {
      const selectedDef = HOUSE_DEFS.find((def) => def.id === this.selectedHouseType);
      const label = this.selectedEditableHouse?.def.label ?? selectedDef?.label ?? "nenhuma";
      this.fenceEditorText.setText(`Casa: ${label} | clique coloca/move | direito/Delete remove do mapa`);
    } else if (this.isStructureEditorActive()) {
      const label = this.structurePieces[this.selectedStructureType]?.label ?? "Banca frutas";
      this.fenceEditorText.setText(`Estrutura: ${label} | clique coloca | direito/Delete apaga`);
    } else {
      this.fenceEditorText.setText("Escolha um modo criativo");
    }
    this.renderCreativeInventory();
  }

  clearCreativeInventory() {
    this.creativeInventoryItems?.forEach((item) => item.destroy());
    this.creativeInventoryItems = [];
  }

  loadCreativePanelPosition() {
    const defaultPosition = { x: 18, y: 82 };
    try {
      const saved = JSON.parse(localStorage.getItem(`${this.creativeStoragePrefix ?? "eldervalley"}-creative-panel-position-v1`) ?? "null");
      if (typeof saved?.x === "number" && typeof saved?.y === "number") {
        return saved;
      }
    } catch {
      // O painel volta para o lugar padrao se o navegador bloquear storage.
    }
    return defaultPosition;
  }

  saveCreativePanelPosition() {
    try {
      localStorage.setItem(`${this.creativeStoragePrefix ?? "eldervalley"}-creative-panel-position-v1`, JSON.stringify(this.creativePanelPosition));
    } catch {
      // O painel ainda pode ser movido mesmo sem storage.
    }
  }

  clampCreativePanelPosition(width = this.creativePanel?.width ?? 820, height = this.creativePanel?.height ?? 188) {
    const maxX = Math.max(0, this.scale.width - width - 8);
    const maxY = Math.max(0, this.scale.height - height - 8);
    this.creativePanelPosition.x = Phaser.Math.Clamp(this.creativePanelPosition.x, 8, maxX);
    this.creativePanelPosition.y = Phaser.Math.Clamp(this.creativePanelPosition.y, 8, maxY);
  }

  startCreativePanelDrag(pointer) {
    if (!this.creativeModeEnabled || pointer.rightButtonDown()) {
      return;
    }
    const bounds = this.creativeInventoryBounds;
    const headerLimit = bounds ? bounds.y + 62 : this.creativePanelPosition.y + 62;
    if (pointer.y > headerLimit) {
      return;
    }
    this.draggingCreativePanel = true;
    this.creativePanelDragOffset = {
      x: pointer.x - this.creativePanelPosition.x,
      y: pointer.y - this.creativePanelPosition.y
    };
  }

  moveCreativePanel(pointer) {
    if (!this.draggingCreativePanel || !this.creativePanelDragOffset) {
      return;
    }
    this.creativePanelPosition.x = pointer.x - this.creativePanelDragOffset.x;
    this.creativePanelPosition.y = pointer.y - this.creativePanelDragOffset.y;
    this.updateCreativeHud();
  }

  stopCreativePanelDrag() {
    if (!this.draggingCreativePanel) {
      return;
    }
    this.draggingCreativePanel = false;
    this.creativePanelDragOffset = null;
    this.saveCreativePanelPosition();
  }

  getCreativeInventoryEntries() {
    if (this.isFenceEditorActive()) {
      return [
        ["h", this.fencePieces.h, "1"],
        ["v", this.fencePieces.v, "2"],
        ["post", this.fencePieces.post, "3"],
        ["gate", this.fencePieces.gate, "4"],
        ["openGate", this.fencePieces.openGate, "5"]
      ].map(([type, piece, hotkey]) => ({
        type,
        piece,
        hotkey,
        selected: this.selectedFenceType === type,
        select: () => { this.selectedFenceType = type; }
      }));
    }

    if (this.isTreeEditorActive()) {
      return [
        ["pine", "1"], ["flower", "2"], ["round", "3"], ["ancient", "4"],
        ["twisted", "5"], ["flowerCone", "6"], ["layeredPine", "7"], ["willow", "8"],
        ["birch", "9"], ["cypress", "0"], ["redMaple", "R"], ["palm", "M"]
      ].map(([type, hotkey]) => ({
        type,
        piece: this.treePieces[type],
        hotkey,
        selected: this.selectedTreeType === type,
        select: () => { this.selectedTreeType = type; }
      }));
    }

    if (this.isFloorEditorActive()) {
      const hotkeys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "", "", "", "", "", "", "", "", ""];
      return Object.entries(this.floorPieces).map(([type, piece], index) => ({
        type,
        piece,
        hotkey: hotkeys[index],
        selected: this.selectedFloorType === type,
        select: () => { this.selectedFloorType = type; }
      }));
    }

    if (this.isHouseEditorActive()) {
      return HOUSE_DEFS.map((def, index) => {
        const house = this.findEditableHouseById(def.id);
        return {
          type: def.id,
          piece: { key: def.key, label: def.label },
          hotkey: String(index + 1),
          selected: this.selectedHouseType === def.id || this.selectedEditableHouse?.def.id === def.id,
          select: () => {
            this.selectedHouseType = def.id;
            this.selectedEditableHouse = house ?? null;
            this.updateHouseSelectionMarker();
            this.updateCreativeHud();
          }
        };
      });
    }

    if (this.isStructureEditorActive()) {
      return Object.entries(this.structurePieces).map(([type, piece], index) => ({
        type,
        piece,
        hotkey: String(index + 1),
        selected: this.selectedStructureType === type,
        select: () => {
          this.selectedStructureType = type;
          this.updateCreativeHud();
        }
      }));
    }

    return [];
  }

  renderCreativeInventory() {
    this.clearCreativeInventory();
    if (!this.creativeModeEnabled) {
      return;
    }

    const entries = this.getCreativeInventoryEntries();
    const cardWidth = 64;
    const cardHeight = 66;
    const gap = 7;
    const startX = this.creativePanelPosition.x + 16;
    const startY = this.creativePanelPosition.y + 70;
    const maxColumns = Math.max(1, Math.floor(((this.creativeInventoryBounds?.width ?? 820) - 32) / (cardWidth + gap)));

    entries.forEach((entry, index) => {
      if (!entry.piece) {
        return;
      }
      const col = index % maxColumns;
      const row = Math.floor(index / maxColumns);
      const x = startX + col * (cardWidth + gap);
      const y = startY + row * (cardHeight + gap);
      const selected = entry.selected;
      const bg = this.add.rectangle(x, y, cardWidth, cardHeight, selected ? 0x6a4a24 : 0x202b37, selected ? 0.96 : 0.92)
        .setOrigin(0)
        .setScrollFactor(0)
        .setDepth(3000)
        .setStrokeStyle(2, selected ? 0xffde75 : 0x5e7084, selected ? 1 : 0.7)
        .setInteractive({ useHandCursor: true });
      bg.on("pointerdown", () => {
        entry.select();
        this.updateCreativeHud();
      });

      const icon = this.add.image(x + cardWidth / 2, y + 41, entry.piece.key)
        .setOrigin(0.5, 1)
        .setScrollFactor(0)
        .setDepth(3001);
      const iconScale = Math.min(46 / icon.width, 46 / icon.height, 1.4);
      icon.setScale(iconScale);

      const keyText = this.add.text(x + 6, y + 4, entry.hotkey, {
        fontFamily: "monospace",
        fontSize: "12px",
        color: "#ffe7a8",
        stroke: "#1a202b",
        strokeThickness: 3
      }).setScrollFactor(0).setDepth(3002);

      const label = this.add.text(x + 4, y + 50, entry.piece.label.slice(0, 9), {
        fontFamily: "monospace",
        fontSize: "9px",
        color: "#f8f3df",
        stroke: "#1a202b",
        strokeThickness: 2
      }).setScrollFactor(0).setDepth(3002);

      this.creativeInventoryItems.push(bg, icon, keyText, label);
    });
  }

  isPointerOverCreativeInventory(pointer) {
    return this.creativeModeEnabled
      && this.creativeInventoryBounds
      && this.creativeInventoryBounds.contains(pointer.x, pointer.y);
  }

  handleFenceEditorPointerDown(pointer) {
    if (this.manualCollisionEditorEnabled) {
      return;
    }

    if (!this.creativeModeEnabled || pointer.event?.target?.tagName === "BUTTON" || this.isPointerOverCreativeInventory(pointer)) {
      return;
    }

    if (this.isFenceEditorActive()) {
      const point = this.getFenceEditorPointerWorldPoint(pointer);
      if (pointer.rightButtonDown()) {
        this.removeNearestManualFence(point.x, point.y);
        return;
      }
      this.placeManualFence(this.selectedFenceType, point.x, point.y);
      return;
    }

    if (this.isTreeEditorActive()) {
      const point = this.getTreeEditorPointerWorldPoint(pointer);
      if (pointer.rightButtonDown()) {
        this.removeManualTreeAt(point.x, point.y);
        return;
      }
      this.placeManualTree(this.selectedTreeType, point.x, point.y);
      return;
    }

    if (this.isFloorEditorActive()) {
      const point = this.getFloorEditorPointerWorldPoint(pointer);
      if (pointer.rightButtonDown()) {
        this.removeManualFloorAt(point.x, point.y);
        return;
      }
      this.placeManualFloor(this.selectedFloorType, point.x, point.y);
      return;
    }

    if (this.isStructureEditorActive()) {
      const point = this.getStructureEditorPointerWorldPoint(pointer);
      if (pointer.rightButtonDown()) {
        this.removeManualStructureAt(point.x, point.y);
        return;
      }
      this.placeManualStructure(this.selectedStructureType, point.x, point.y);
      return;
    }

    if (this.isHouseEditorActive()) {
      this.handleHouseEditorPointerDown(pointer);
    }
  }

  handleCreativePointerMove(pointer) {
    if (this.manualCollisionEditorEnabled) {
      return;
    }

    if (this.draggingCreativePanel) {
      this.moveCreativePanel(pointer);
      return;
    }

    if (!this.isHouseEditorActive() || !this.draggedEditableHouse || !pointer.isDown) {
      return;
    }

    const point = this.getHouseEditorPointerWorldPoint(pointer);
    this.moveEditableHouse(this.draggedEditableHouse, point.x, point.y);
    this.updateHouseSelectionMarker();
  }

  handleCreativePointerUp() {
    if (this.manualCollisionEditorEnabled) {
      return;
    }

    if (this.draggingCreativePanel) {
      this.stopCreativePanelDrag();
      return;
    }

    if (!this.draggedEditableHouse) {
      return;
    }

    this.saveEditableHouseLayouts();
    this.draggedEditableHouse = null;
  }

  getFenceEditorPointerWorldPoint(pointer = this.input.activePointer) {
    const worldPoint = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
    const piece = this.fencePieces[this.selectedFenceType] ?? this.fencePieces.h;
    const snap = piece.snap ?? 16;
    return {
      x: Math.round(worldPoint.x / snap) * snap,
      y: Math.round(worldPoint.y / snap) * snap
    };
  }

  getTreeEditorPointerWorldPoint(pointer = this.input.activePointer) {
    const worldPoint = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
    const piece = this.treePieces[this.selectedTreeType] ?? this.treePieces.pine;
    const snap = piece.snap ?? 16;
    return {
      x: Math.round(worldPoint.x / snap) * snap,
      y: Math.round(worldPoint.y / snap) * snap
    };
  }

  getFloorEditorPointerWorldPoint(pointer = this.input.activePointer) {
    const worldPoint = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
    const snap = 64;
    return {
      x: Math.floor(worldPoint.x / snap) * snap + snap / 2,
      y: Math.floor(worldPoint.y / snap) * snap + snap / 2
    };
  }

  getStructureEditorPointerWorldPoint(pointer = this.input.activePointer) {
    const worldPoint = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
    const piece = this.structurePieces[this.selectedStructureType] ?? this.structurePieces.fruitStall;
    const snap = piece.snap ?? 16;
    return {
      x: Math.round(worldPoint.x / snap) * snap,
      y: Math.round(worldPoint.y / snap) * snap
    };
  }

  getHouseEditorPointerWorldPoint(pointer = this.input.activePointer) {
    const worldPoint = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
    return {
      x: Math.round(worldPoint.x / 16) * 16,
      y: Math.round(worldPoint.y / 16) * 16
    };
  }

  handleHouseEditorPointerDown(pointer) {
    const rawPoint = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
    const point = this.getHouseEditorPointerWorldPoint(pointer);
    const house = this.getHouseAtWorldPoint(rawPoint.x, rawPoint.y);

    if (pointer.rightButtonDown()) {
      if (house) {
        this.removeEditableHouse(house);
      }
      return;
    }

    if (house) {
      this.selectedEditableHouse = house;
      this.selectedHouseType = house.def.id;
      this.draggedEditableHouse = house;
      this.updateCreativeHud();
      this.updateHouseSelectionMarker();
      return;
    }

    if (this.selectedEditableHouse && !pointer.rightButtonDown()) {
      this.moveEditableHouse(this.selectedEditableHouse, point.x, point.y);
      this.saveEditableHouseLayouts();
      this.updateHouseSelectionMarker();
      return;
    }

    const selectedDef = HOUSE_DEFS.find((def) => def.id === this.selectedHouseType);
    if (selectedDef) {
      this.restoreEditableHouse(selectedDef, point.x, point.y);
    }
  }

  getHouseAtWorldPoint(x, y) {
    return [...(this.editableHouses ?? [])].reverse().find((house) => {
      const bounds = house.image.getBounds();
      return bounds.contains(x, y);
    });
  }

  updateHouseSelectionMarker() {
    if (!this.houseSelectionMarker) {
      this.houseSelectionMarker = this.add.rectangle(0, 0, 1, 1)
        .setOrigin(0.5)
        .setDepth(2997)
        .setStrokeStyle(2, 0xffe27a, 0.9)
        .setVisible(false);
    }

    if (!this.isHouseEditorActive() || !this.selectedEditableHouse) {
      this.houseSelectionMarker.setVisible(false);
      return;
    }

    const bounds = this.selectedEditableHouse.image.getBounds();
    this.houseSelectionMarker
      .setPosition(bounds.centerX, bounds.centerY)
      .setSize(bounds.width + 8, bounds.height + 8)
      .setVisible(true);
  }

  placeManualFence(type, x, y, shouldSave = true) {
    const piece = this.fencePieces[type];
    if (!piece) {
      return;
    }

    const duplicate = this.manualFences.some((fence) => fence.type === type && fence.x === x && fence.y === y);
    if (duplicate) {
      return;
    }

    const image = this.add.image(x, y, piece.key)
      .setOrigin(0.5, piece.originY)
      .setDepth(y + piece.depthOffset)
      .setScale(piece.scale ?? 1);
    const collider = piece.collides === false
      ? undefined
      : this.addSolidRect(x, y + piece.offsetY, piece.bodyWidth, piece.bodyHeight);

    this.manualFences.push({ type, x, y, image, collider });
    if (shouldSave) {
      this.saveManualFences();
    }
  }

  removeNearestManualFence(x, y) {
    let bestIndex = -1;
    let bestDistance = 34;
    this.manualFences.forEach((fence, index) => {
      const distance = Phaser.Math.Distance.Between(x, y, fence.x, fence.y);
      if (distance < bestDistance) {
        bestDistance = distance;
        bestIndex = index;
      }
    });

    if (bestIndex === -1) {
      return;
    }

    const [fence] = this.manualFences.splice(bestIndex, 1);
    fence.image?.destroy();
    fence.collider?.destroy();
    this.saveManualFences();
  }

  placeManualTree(type, x, y, shouldSave = true) {
    const piece = this.treePieces[type];
    if (!piece) {
      return;
    }

    const duplicate = this.manualTrees.some((tree) => tree.type === type && tree.x === x && tree.y === y);
    if (duplicate) {
      return;
    }

    const image = this.add.image(x, y, piece.key)
      .setOrigin(0.5, 1)
      .setDepth(y + piece.depthOffset)
      .setScale(piece.scale ?? 1);
    const colliders = (piece.colliders ?? [[0, piece.offsetY ?? -18, piece.bodyWidth ?? 34, piece.bodyHeight ?? 28]])
      .map(([dx, dy, width, height]) => this.addSolidRect(x + dx, y + dy, width, height));

    this.manualTrees.push({ type, x, y, image, colliders });
    if (shouldSave) {
      this.saveManualTrees();
    }
  }

  removeNearestManualTree(x, y) {
    let bestIndex = -1;
    let bestDistance = 110;
    this.manualTrees.forEach((tree, index) => {
      const distance = Phaser.Math.Distance.Between(x, y, tree.x, tree.y);
      if (distance < bestDistance) {
        bestDistance = distance;
        bestIndex = index;
      }
    });

    if (bestIndex === -1) {
      return;
    }

    const [tree] = this.manualTrees.splice(bestIndex, 1);
    tree.image?.destroy();
    tree.collider?.destroy();
    tree.colliders?.forEach((collider) => collider.destroy());
    this.saveManualTrees();
  }

  removeManualTreeAt(x, y) {
    let indexToRemove = -1;
    for (let index = this.manualTrees.length - 1; index >= 0; index -= 1) {
      const tree = this.manualTrees[index];
      const bounds = tree.image?.getBounds();
      if (bounds?.contains(x, y)) {
        indexToRemove = index;
        break;
      }
    }

    if (indexToRemove === -1) {
      this.removeNearestManualTree(x, y);
      return;
    }

    const [tree] = this.manualTrees.splice(indexToRemove, 1);
    tree.image?.destroy();
    tree.collider?.destroy();
    tree.colliders?.forEach((collider) => collider.destroy());
    this.saveManualTrees();
  }

  placeManualStructure(type, x, y, shouldSave = true) {
    const piece = this.structurePieces[type];
    if (!piece) {
      return;
    }

    const duplicate = this.manualStructures.some((structure) => structure.type === type && structure.x === x && structure.y === y);
    if (duplicate) {
      return;
    }

    const image = this.add.image(x, y, piece.key)
      .setOrigin(0.5, 1)
      .setDepth(y + piece.depthOffset)
      .setScale(piece.scale ?? 1);
    const colliders = (piece.colliders ?? [])
      .map(([dx, dy, width, height]) => this.addSolidRect(x + dx, y + dy, width, height));

    this.manualStructures.push({ type, x, y, image, colliders });
    if (shouldSave) {
      this.saveManualStructures();
    }
  }

  removeNearestManualStructure(x, y) {
    let bestIndex = -1;
    let bestDistance = 120;
    this.manualStructures.forEach((structure, index) => {
      const distance = Phaser.Math.Distance.Between(x, y, structure.x, structure.y);
      if (distance < bestDistance) {
        bestDistance = distance;
        bestIndex = index;
      }
    });

    if (bestIndex === -1) {
      return;
    }

    const [structure] = this.manualStructures.splice(bestIndex, 1);
    structure.image?.destroy();
    structure.colliders?.forEach((collider) => collider.destroy());
    this.saveManualStructures();
  }

  removeManualStructureAt(x, y) {
    let indexToRemove = -1;
    for (let index = this.manualStructures.length - 1; index >= 0; index -= 1) {
      const structure = this.manualStructures[index];
      const bounds = structure.image?.getBounds();
      if (bounds?.contains(x, y)) {
        indexToRemove = index;
        break;
      }
    }

    if (indexToRemove === -1) {
      this.removeNearestManualStructure(x, y);
      return;
    }

    const [structure] = this.manualStructures.splice(indexToRemove, 1);
    structure.image?.destroy();
    structure.colliders?.forEach((collider) => collider.destroy());
    this.saveManualStructures();
  }

  placeManualFloor(type, x, y, shouldSave = true) {
    const piece = this.floorPieces[type];
    if (!piece) {
      return;
    }

    const existingIndex = this.manualFloors.findIndex((floor) => floor.x === x && floor.y === y);
    if (existingIndex !== -1) {
      this.manualFloors.splice(existingIndex, 1);
    }

    this.manualFloors.push({ type, x, y });
    this.redrawManualFloors();
    if (shouldSave) {
      this.saveManualFloors();
    }
  }

  drawManualFloor(type, x, y) {
    const piece = this.floorPieces[type];
    if (!piece || !this.manualFloorLayer) {
      return;
    }

    const source = this.textures.get(piece.key)?.getSourceImage();
    const width = source?.width ?? 128;
    const height = source?.height ?? 128;
    this.manualFloorLayer.draw(piece.key, x - width / 2, y - height / 2);
  }

  redrawManualFloors() {
    if (!this.manualFloorLayer) {
      return;
    }

    this.manualFloorLayer.clear();
    this.manualFloors.forEach((floor) => this.drawManualFloor(floor.type, floor.x, floor.y));
  }

  removeManualFloorAt(x, y) {
    const index = this.manualFloors.findIndex((floor) => floor.x === x && floor.y === y);
    if (index === -1) {
      return;
    }

    const [floor] = this.manualFloors.splice(index, 1);
    this.redrawManualFloors();
    this.saveManualFloors();
  }

  clearManualFences() {
    (this.manualFences ?? []).forEach((fence) => {
      fence.image?.destroy();
      fence.collider?.destroy();
    });
    this.manualFences = [];
  }

  clearManualFloors() {
    this.manualFloors = [];
    this.redrawManualFloors();
  }

  clearManualTrees() {
    (this.manualTrees ?? []).forEach((tree) => {
      tree.image?.destroy();
      tree.collider?.destroy();
      tree.colliders?.forEach((collider) => collider.destroy());
    });
    this.manualTrees = [];
  }

  clearManualStructures() {
    (this.manualStructures ?? []).forEach((structure) => {
      structure.image?.destroy();
      structure.colliders?.forEach((collider) => collider.destroy());
    });
    this.manualStructures = [];
  }

  loadManualFences() {
    const { data: saved, hasLocalSave } = this.readLocalStorageArray(this.manualFenceStorageKey);

    saved.forEach((fence) => {
      if (typeof fence?.x === "number" && typeof fence?.y === "number") {
        this.placeManualFence(fence.type, fence.x, fence.y, false);
      }
    });
    this.syncCreativeCollection(
      this.manualFenceStorageKey,
      saved,
      hasLocalSave,
      () => this.clearManualFences(),
      (fence) => {
        if (typeof fence?.x === "number" && typeof fence?.y === "number") {
          this.placeManualFence(fence.type, fence.x, fence.y, false);
        }
      }
    );
  }

  saveManualFences() {
    const data = this.manualFences.map(({ type, x, y }) => ({ type, x, y }));
    this.writeLocalStorageArray(this.manualFenceStorageKey, data);
    this.saveSharedStorage(this.manualFenceStorageKey, data);
  }

  loadManualFloors() {
    const { data: saved, hasLocalSave } = this.readLocalStorageArray(this.manualFloorStorageKey);

    saved.forEach((floor) => {
      if (typeof floor?.x === "number" && typeof floor?.y === "number") {
        const piece = this.floorPieces[floor.type];
        if (piece) {
          this.manualFloors.push({ type: floor.type, x: floor.x, y: floor.y });
        }
      }
    });
    this.redrawManualFloors();
    this.syncCreativeCollection(
      this.manualFloorStorageKey,
      saved,
      hasLocalSave,
      () => this.clearManualFloors(),
      (floor) => {
        if (typeof floor?.x === "number" && typeof floor?.y === "number" && this.floorPieces[floor.type]) {
          this.manualFloors.push({ type: floor.type, x: floor.x, y: floor.y });
        }
      }
    ).then(() => this.redrawManualFloors());
  }

  saveManualFloors() {
    const data = this.manualFloors.map(({ type, x, y }) => ({ type, x, y }));
    this.writeLocalStorageArray(this.manualFloorStorageKey, data);
    this.saveSharedStorage(this.manualFloorStorageKey, data);
  }

  loadManualTrees() {
    const { data: saved, hasLocalSave } = this.readLocalStorageArray(this.manualTreeStorageKey);

    saved.forEach((tree) => {
      if (typeof tree?.x === "number" && typeof tree?.y === "number") {
        this.placeManualTree(tree.type, tree.x, tree.y, false);
      }
    });
    this.syncCreativeCollection(
      this.manualTreeStorageKey,
      saved,
      hasLocalSave,
      () => this.clearManualTrees(),
      (tree) => {
        if (typeof tree?.x === "number" && typeof tree?.y === "number") {
          this.placeManualTree(tree.type, tree.x, tree.y, false);
        }
      }
    );
  }

  saveManualTrees() {
    const data = this.manualTrees.map(({ type, x, y }) => ({ type, x, y }));
    this.writeLocalStorageArray(this.manualTreeStorageKey, data);
    this.saveSharedStorage(this.manualTreeStorageKey, data);
  }

  loadManualStructures() {
    const { data: saved, hasLocalSave } = this.readLocalStorageArray(this.manualStructureStorageKey);

    saved.forEach((structure) => {
      if (typeof structure?.x === "number" && typeof structure?.y === "number") {
        this.placeManualStructure(structure.type, structure.x, structure.y, false);
      }
    });
    this.syncCreativeCollection(
      this.manualStructureStorageKey,
      saved,
      hasLocalSave,
      () => this.clearManualStructures(),
      (structure) => {
        if (typeof structure?.x === "number" && typeof structure?.y === "number") {
          this.placeManualStructure(structure.type, structure.x, structure.y, false);
        }
      }
    );
  }

  saveManualStructures() {
    const data = this.manualStructures.map(({ type, x, y }) => ({ type, x, y }));
    this.writeLocalStorageArray(this.manualStructureStorageKey, data);
    this.saveSharedStorage(this.manualStructureStorageKey, data);
  }

  addFencedLot({ left, right, top, bottom, gateX, gateWidth = 96 }) {
    const step = 48;
    const gateLeft = gateX - gateWidth / 2;
    const gateRight = gateX + gateWidth / 2;
    const topY = Math.round(top);
    const bottomY = Math.round(bottom);

    for (let x = left + 28; x <= right - 28; x += step) {
      this.addFenceIfClear(x, topY, false);
    }

    for (let y = top + 46; y <= bottom - 42; y += step) {
      this.addFenceIfClear(left, y, true);
      this.addFenceIfClear(right, y, true);
    }

    for (let x = left + 28; x <= right - 28; x += step) {
      if (x > gateLeft && x < gateRight) {
        continue;
      }
      this.addFenceIfClear(x, bottomY, false);
    }

    this.addFencePost(gateLeft, bottomY);
    this.addFencePost(gateRight, bottomY);
    this.addFenceGate(gateX - gateWidth / 2 - 34, bottomY + 2);
    this.addFenceGate(gateX + gateWidth / 2 + 34, bottomY + 2);
  }

  addFenceIfClear(x, y, vertical = false) {
    if (this.isPathAt(x, y)) {
      return;
    }
    this.addFence(x, y, vertical);
  }

  isPathAt(x, y) {
    return (
      (x >= 176 && x <= 272 && y < this.worldHeight - 128)
      || (y >= 352 && y <= 448 && y < this.worldHeight - 128)
      || (x >= 640 && x <= 736 && y >= 160 && y < 448)
      || (x >= 1040 && x <= 1136 && y >= 160 && y < 448)
      || (x >= 1664 && x <= 1760 && y >= 352 && y < this.worldHeight - 128)
      || (y >= 672 && y <= 768 && x >= 1664 && y < this.worldHeight - 128)
    );
  }

  addDoor(x, y, id, sceneKey, spawnKey) {
    this.interactions.add({
      id,
      x,
      y,
      promptY: y - 38,
      promptText: "E Entrar",
      radius: 46,
      onInteract: () => this.fadeTo(sceneKey, { exitSpawnKey: spawnKey, doorId: id, returnScene: this.scene.key })
    });
  }

  addDecorations() {
    this.lampGlows = [];
    const trees = [
      [70, 150], [70, 545], [340, 598], [410, 545], [835, 620],
      [900, 565], [1110, 540], [1400, 630]
    ];
    trees.forEach(([x, y]) => this.addReferenceTree(x, y));

    const lamps = [[300, 520], [540, 506], [1010, 508], [1160, 310], [1510, 470], [1840, 686]];
    lamps.forEach(([x, y], index) => this.addStreetLamp(x, y, index));

    const flowers = [[300, 470], [330, 486], [1090, 310], [450, 490], [860, 485], [1000, 470]];
    flowers.forEach(([x, y]) => this.add.image(x, y, "flower-white").setDepth(y));

    [[140, 792], [420, 808], [760, 790]].forEach(([x, y]) => this.add.image(x, y, "lily").setDepth(y));
  }

  addTownCenter() {
    // O centro fica vazio por enquanto; a passagem da ponte vem do terreno.
  }

  addTownCenterBorder(left, top, width, height) {
    const right = left + width;
    const bottom = top + height;
    const step = 48;

    for (let x = left + 24; x < right - 24; x += step) {
      this.add.image(x, top - 8, "fence-h").setOrigin(0.5, 1).setDepth(top + 8);
      this.add.image(x, bottom + 18, "fence-h").setOrigin(0.5, 1).setDepth(bottom + 18);
    }

    for (let y = top + 44; y < bottom - 34; y += step) {
      this.add.image(left - 8, y, "fence-v").setOrigin(0.5, 1).setDepth(y);
      this.add.image(right + 8, y, "fence-v").setOrigin(0.5, 1).setDepth(y);
    }

    [
      [left - 18, top - 4], [right + 18, top - 4],
      [left - 18, bottom + 16], [right + 18, bottom + 16]
    ].forEach(([x, y]) => this.add.image(x, y, "fence-post").setOrigin(0.5, 1).setDepth(y + 8));
  }

  addCityTransition() {
    const x = this.worldWidth - 150;
    const y = 704;
    const post = this.add.rectangle(x - 42, y - 18, 8, 44, 0x5a3721, 1)
      .setOrigin(0.5, 1)
      .setDepth(y - 2);
    const board = this.add.rectangle(x, y - 52, 96, 32, 0x7c512d, 1)
      .setDepth(y - 1)
      .setStrokeStyle(2, 0x3b2416, 1);
    const label = this.add.text(x, y - 52, "Cidade", {
      fontFamily: "monospace",
      fontSize: "14px",
      color: "#fff0c2",
      stroke: "#241409",
      strokeThickness: 3
    }).setOrigin(0.5).setDepth(y);
    this.interactions.add({
      id: "door_city_gate",
      x,
      y,
      promptY: y - 88,
      promptText: "E Ir para Cidade",
      radius: 82,
      onInteract: () => this.fadeTo("CityScene", { spawnKey: "fromVillage" })
    });
    return { post, board, label };
  }

  addStreetLamp(x, y, index = 0) {
    const lamp = this.addSolidImage(x, y, "lamp-0", {
      bodyWidth: 16,
      bodyHeight: 16,
      offsetY: -8,
      depth: y + 40
    });
    this.addLampGlow(x, y - 42);
    this.time.addEvent({
      delay: 520 + index * 45,
      loop: true,
      callback: () => lamp.setTexture(lamp.texture.key === "lamp-0" ? "lamp-1" : "lamp-0")
    });
    return lamp;
  }

  addLampGlow(x, y) {
    const glow = this.add.graphics().setDepth(2810);
    glow.setBlendMode(Phaser.BlendModes.ADD);
    glow.fillStyle(0xff9f35, 0.16);
    glow.fillCircle(x, y, 72);
    glow.fillStyle(0xffd36a, 0.22);
    glow.fillCircle(x, y, 46);
    glow.fillStyle(0xfff1a8, 0.34);
    glow.fillCircle(x, y, 22);
    glow.fillStyle(0xffffc8, 0.44);
    glow.fillCircle(x, y, 9);
    glow.setAlpha(0);
    this.lampGlows.push(glow);
  }

  createDayNightCycle() {
    this.dayNightDuration = 180000;
    this.dayNightTime = this.registry.get("dayNightTime") ?? this.dayNightDuration * 0.24;
    const width = this.scale.width;
    const height = this.scale.height;

    this.sunsetOverlay = this.add.rectangle(0, 0, width, height, 0xf09a48, 1)
      .setOrigin(0)
      .setScrollFactor(0)
      .setDepth(2790)
      .setAlpha(0);

    this.nightOverlay = this.add.rectangle(0, 0, width, height, 0x020817, 1)
      .setOrigin(0)
      .setScrollFactor(0)
      .setDepth(2800)
      .setAlpha(0);

    this.handleDayNightResize = (gameSize) => {
      this.sunsetOverlay?.setSize(gameSize.width, gameSize.height);
      this.nightOverlay?.setSize(gameSize.width, gameSize.height);
    };
    this.scale.on("resize", this.handleDayNightResize);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      if (this.handleDayNightResize) {
        this.scale.off("resize", this.handleDayNightResize);
      }
    });

    this.updateDayNightCycle(0);
  }

  updateDayNightCycle(delta = 0) {
    if (!this.nightOverlay || !this.sunsetOverlay) {
      return;
    }

    this.dayNightTime = (this.dayNightTime + delta) % this.dayNightDuration;
    this.registry.set("dayNightTime", this.dayNightTime);

    const phase = this.dayNightTime / this.dayNightDuration;
    const nightAlpha = this.getNightAlpha(phase);
    const sunsetAlpha = this.getSunsetAlpha(phase);
    const glowAlpha = Math.min(1, Math.max(0, (nightAlpha - 0.02) / 0.38));

    this.nightOverlay.setAlpha(nightAlpha);
    this.sunsetOverlay.setAlpha(sunsetAlpha);
    this.lampGlows?.forEach((glow, index) => {
      const flicker = 0.88 + Math.sin((this.time.now + index * 430) / 260) * 0.12;
      glow.setAlpha(glowAlpha * flicker);
    });
  }

  getNightAlpha(phase) {
    if (phase < 0.2) {
      return 0;
    }
    if (phase < 0.42) {
      return Phaser.Math.Easing.Sine.InOut((phase - 0.2) / 0.22) * 0.54;
    }
    if (phase < 0.7) {
      return 0.54;
    }
    if (phase < 0.94) {
      return (1 - Phaser.Math.Easing.Sine.InOut((phase - 0.7) / 0.24)) * 0.54;
    }
    return 0;
  }

  getSunsetAlpha(phase) {
    if (phase >= 0.14 && phase < 0.42) {
      return Math.sin(((phase - 0.14) / 0.28) * Math.PI) * 0.24;
    }
    if (phase >= 0.76 && phase < 0.98) {
      return Math.sin(((phase - 0.76) / 0.22) * Math.PI) * 0.12;
    }
    return 0;
  }

  addRiverEdges() {
    for (let x = 14; x < this.worldWidth; x += 42) {
      this.add.rectangle(x, RIVER_TOP - 2, 18, 4, 0x75c864, 1).setDepth(RIVER_TOP - 1);
      this.add.rectangle(x + 18, RIVER_TOP, 10, 3, 0x3f8f46, 1).setDepth(RIVER_TOP);
      this.add.rectangle(x, RIVER_BOTTOM + 2, 18, 4, 0x75c864, 1).setDepth(RIVER_BOTTOM + 3);
      this.add.rectangle(x + 18, RIVER_BOTTOM, 10, 3, 0x3f8f46, 1).setDepth(RIVER_BOTTOM + 4);
    }
  }

  addNpc() {
    const villager = this.physics.add.sprite(515, 398, "npc-sheet", 0).setDepth(398);
    villager.body.setSize(14, 12).setOffset(5, 18);
    this.solids.add(villager);
    if (!this.anims.exists("npc-idle-0")) {
      this.anims.create({
        key: "npc-idle-0",
        frames: this.anims.generateFrameNumbers("npc-sheet", { start: 0, end: 1 }),
        frameRate: 2,
        repeat: -1
      });
    }
    villager.play("npc-idle-0");
    this.interactions.add({
      x: villager.x,
      y: villager.y,
      promptY: villager.y - 32,
      promptText: "E Falar",
      radius: 42,
      onInteract: () => this.dialog.show("Morador", "Dizem que algumas cartas antigas foram escondidas nas casas da vila.")
    });
  }

  addSilverCharacter() {
    this.createSilverAnimations();

    const character = this.physics.add.sprite(705, 384, "silver-npc-sheet", 6)
      .setDepth(384 + 120);
    character.body.setSize(18, 14).setOffset(15, 52);
    character.body.setCollideWorldBounds(true);
    character.speed = 58;
    character.facing = "right";
    character.animPrefix = "silver";
    character.play("silver-walk-right");

    const interaction = {
      x: character.x,
      y: character.y + 34,
      promptY: character.y - 44,
      promptText: "E Falar",
      radius: 44,
      onInteract: () => this.dialog.show("Viajante", "Passei pelo rio procurando pistas sobre cartas antigas.")
    };
    this.interactions.add(interaction);

    this.physics.add.collider(character, this.solids, () => this.pickSilverTarget(character, true));
    this.physics.add.collider(this.player, character);

    this.silverCharacters ??= [];
    this.silverCharacters.push({ sprite: character, interaction });
    this.pickSilverTarget(character, true);
  }

  addBlondCharacter() {
    this.createBlondAnimations();

    const character = this.physics.add.sprite(1000, 430, "blond-npc-sheet", 3)
      .setDepth(430 + 120);
    character.body.setSize(18, 14).setOffset(15, 52);
    character.body.setCollideWorldBounds(true);
    character.speed = 56;
    character.facing = "left";
    character.animPrefix = "blond";
    character.play("blond-walk-left");

    const interaction = {
      x: character.x,
      y: character.y + 34,
      promptY: character.y - 44,
      promptText: "E Falar",
      radius: 44,
      onInteract: () => this.dialog.show("Cavaleiro", "Estou patrulhando a vila enquanto os colecionadores chegam.")
    };
    this.interactions.add(interaction);

    this.physics.add.collider(character, this.solids, () => this.pickSilverTarget(character, true));
    this.physics.add.collider(this.player, character);
    this.silverCharacters?.forEach(({ sprite }) => this.physics.add.collider(character, sprite));

    this.silverCharacters ??= [];
    this.silverCharacters.push({ sprite: character, interaction });
    this.pickSilverTarget(character, true);
  }

  addAdventurerCharacter() {
    this.createAdventurerAnimations();

    const character = this.physics.add.sprite(555, 518, "adventurer-sheet", 0)
      .setDepth(518 + 120);
    character.body.setSize(18, 14).setOffset(15, 52);
    character.body.setCollideWorldBounds(true);
    character.speed = 58;
    character.facing = "down";
    character.animPrefix = "adventurer";
    character.framesPerDirection = 3;
    character.play("adventurer-walk-down");

    const interaction = {
      x: character.x,
      y: character.y + 34,
      promptY: character.y - 44,
      promptText: "E Falar",
      radius: 44,
      onInteract: () => this.dialog.show("Aventureiro", "Vou explorar a vila enquanto voce testa essa magia nova.")
    };
    this.interactions.add(interaction);

    this.physics.add.collider(character, this.solids, () => this.pickSilverTarget(character, true));
    this.physics.add.collider(this.player, character);
    this.silverCharacters?.forEach(({ sprite }) => {
      if (sprite?.body) {
        this.physics.add.collider(character, sprite);
      }
    });

    this.silverCharacters ??= [];
    this.silverCharacters.push({ sprite: character, interaction });
    this.pickSilverTarget(character, true);
  }

  addKnightCharacter() {
    this.createKnightAnimations();

    const character = this.physics.add.sprite(1510, 704, "knight-npc-sheet", 16)
      .setDepth(704 + 120);
    character.body.setSize(20, 14).setOffset(18, 68);
    character.body.setCollideWorldBounds(true);
    character.speed = 48;
    character.facing = "right";
    character.animPrefix = "knight";
    character.framesPerDirection = 8;
    character.play("knight-walk-right");

    const interaction = {
      x: character.x,
      y: character.y + 34,
      promptY: character.y - 50,
      promptText: "E Falar",
      radius: 50,
      onInteract: () => this.dialog.show("Cavaleiro", "Estou vigiando a estrada ate o centro da cidade.")
    };
    this.interactions.add(interaction);

    this.physics.add.collider(character, this.solids, () => this.pickSilverTarget(character, true));
    this.physics.add.collider(this.player, character);
    this.silverCharacters?.forEach(({ sprite }) => {
      if (sprite?.body) {
        this.physics.add.collider(character, sprite);
      }
    });

    this.silverCharacters ??= [];
    this.silverCharacters.push({ sprite: character, interaction });
    this.pickSilverTarget(character, true);
  }

  pickSilverTarget(character, immediate = false) {
    character.waitUntil = this.time.now + (immediate ? 0 : Phaser.Math.Between(450, 1200));
    character.walkUntil = character.waitUntil + Phaser.Math.Between(850, 1800);
    character.wanderDirection = Phaser.Utils.Array.GetRandom(["down", "left", "right", "up"]);
  }

  updateSilverCharacters() {
    this.silverCharacters?.forEach(({ sprite, interaction }) => {
      if (!sprite?.body || !sprite.active) {
        return;
      }

      sprite.setDepth(sprite.y + 120);
      interaction.x = sprite.x;
      interaction.y = sprite.y + 34;
      interaction.promptY = sprite.y - 44;

      if (this.dialog.active || !sprite.wanderDirection || this.time.now < (sprite.waitUntil ?? 0)) {
        sprite.setVelocity(0, 0);
        sprite.anims.stop();
        sprite.setFrame(this.getWandererIdleFrame(sprite));
        return;
      }

      const blocked = sprite.body.blocked.none === false || sprite.body.touching.none === false;
      const nearMapEdge = sprite.x < 88 || sprite.x > this.worldWidth - 88 || sprite.y < 126 || sprite.y > this.worldHeight - 190;
      if (this.time.now >= (sprite.walkUntil ?? 0) || blocked || nearMapEdge) {
        sprite.setVelocity(0, 0);
        this.pickSilverTarget(sprite);
        return;
      }

      const velocities = {
        down: [0, sprite.speed],
        left: [-sprite.speed, 0],
        right: [sprite.speed, 0],
        up: [0, -sprite.speed]
      };
      const facing = sprite.wanderDirection;
      const [vx, vy] = velocities[facing] ?? velocities.down;
      sprite.setVelocity(vx, vy);
      sprite.facing = facing;
      sprite.play(`${sprite.animPrefix ?? "silver"}-walk-${facing}`, true);
    });
  }

  getWandererIdleFrame(sprite) {
    const row = {
      down: 0,
      left: 1,
      right: 2,
      up: 3
    }[sprite.facing] ?? 0;
    return row * (sprite.framesPerDirection ?? 3);
  }

  createSilverAnimations() {
    this.createWandererAnimations("silver", "silver-npc-sheet");
  }

  createBlondAnimations() {
    this.createWandererAnimations("blond", "blond-npc-sheet");
  }

  createAdventurerAnimations() {
    this.createWandererAnimations("adventurer", "adventurer-sheet");
  }

  createKnightAnimations() {
    this.createWandererAnimations("knight", "knight-npc-sheet", 8);
  }

  createMage1Animations() {
    this.createWandererAnimations("mage-1", "mage-1-sheet", 8);
  }

  createWandererAnimations(prefix, textureKey, framesPerDirection = 3) {
    const makeFrames = (row) => {
      const start = row * framesPerDirection;
      if (framesPerDirection === 3) {
        return [start, start + 1, start + 2, start + 1];
      }
      return Array.from({ length: framesPerDirection }, (_, index) => start + index);
    };
    const defs = [
      [`${prefix}-walk-down`, makeFrames(0)],
      [`${prefix}-walk-left`, makeFrames(1)],
      [`${prefix}-walk-right`, makeFrames(2)],
      [`${prefix}-walk-up`, makeFrames(3)]
    ];

    defs.forEach(([key, frames]) => {
      if (this.anims.exists(key)) {
        return;
      }
      this.anims.create({
        key,
        frames: frames.map((frame) => ({ key: textureKey, frame })),
        frameRate: 10,
        repeat: -1
      });
    });
  }

  update(time, delta) {
    this.updatePerformanceOptimizations(delta);
    this.updateSilverCharacters();
    this.updateFenceEditor();
    this.updateBase();
  }
}
