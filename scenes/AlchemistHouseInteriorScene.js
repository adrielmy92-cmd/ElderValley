import InteriorBaseScene from "./InteriorBaseScene.js?v=212";
import ShopSystem from "../systems/ShopSystem.js?v=3";

const WIDTH = 1254;
const HEIGHT = 1254;

export default class AlchemistHouseInteriorScene extends InteriorBaseScene {
  constructor() {
    super("AlchemistHouseInteriorScene");
  }

  create() {
    const spawnKey = this.entryData.exitSpawnKey ?? "alchemistHouse";
    this.manualCollisionStorageKey = "eldervalley-alchemist-house-manual-collisions-v1";
    this.skipAutoManualCollisionLoad = true;
    this.makeRoom({
      width: WIDTH,
      height: HEIGHT,
      title: "Arcane House",
      spawnX: 628,
      spawnY: 1084
    });

    this.add.image(0, 0, "alchemist-interior")
      .setOrigin(0)
      .setDepth(-6);

    this.addAlchemistCollisions();
    this.addAlchemistInteractions();
    this.addAlchemistExit(spawnKey);
    this.addNpc(735, 872, 2, "Alchemist", "Not every potion should be drunk. Some serve only to remind us that curiosity has a price.");

    this.shop = new ShopSystem(this);
    const pos = this.getVendorPos();
    this.addShopVendor(pos.x, pos.y);
  }

  vendorPosKey() {
    return "eldervalley-alchemy-vendor-pos";
  }

  getVendorPos() {
    try {
      const saved = JSON.parse(localStorage.getItem(this.vendorPosKey()) ?? "null");
      if (saved && Number.isFinite(saved.x) && Number.isFinite(saved.y)) return saved;
    } catch { /* ignore */ }
    return { x: 470, y: 992 };
  }

  // Hooded merchant: idle animation + an "E Shop" prompt that opens the shop UI.
  // In dev mode the merchant is draggable so the position can be tuned in-game.
  addShopVendor(x, y) {
    if (!this.anims.exists("alchemy-vendor-idle")) {
      this.anims.create({
        key: "alchemy-vendor-idle",
        frames: this.anims.generateFrameNumbers("alchemy-vendor", { start: 0, end: 7 }),
        frameRate: 7,
        repeat: -1
      });
    }
    const npc = this.physics.add.sprite(x, y, "alchemy-vendor", 0).setDepth(y).setScale(1.05);
    npc.body.setSize(30, 16).setOffset(39, 86);
    npc.body.immovable = true;
    this.solids.add(npc);
    npc.play("alchemy-vendor-idle");
    this.vendor = npc;

    // Soft pedestal shadow so he reads as standing on the floor.
    this.vendorShadow = this.add.ellipse(x, y + 44, 64, 18, 0x000000, 0.28).setDepth(y - 1);

    this.shopInteraction = this.interactions.add({
      x,
      y: y + 6,
      promptY: y - 60,
      promptText: "E Shop",
      radius: 76,
      enabled: () => !this.shop.isOpen(),
      onInteract: () => this.shop.open()
    });

    if (this.isDevMode()) {
      this.enableVendorDrag(npc);
    }
    return npc;
  }

  enableVendorDrag(npc) {
    npc.setInteractive({ draggable: true, useHandCursor: true });
    this.input.setDraggable(npc);

    const hint = this.add.text(12, 12,
      "DEV: drag the merchant to reposition (saved locally)", {
        fontFamily: "monospace", fontSize: "13px", color: "#ffe1a4",
        backgroundColor: "#000000aa", padding: { left: 6, right: 6, top: 3, bottom: 3 }
      }).setScrollFactor(0).setDepth(9500);

    this.input.on("drag", (_p, obj, dragX, dragY) => {
      if (obj !== npc) return;
      npc.setPosition(dragX, dragY).setDepth(dragY);
      this.vendorShadow.setPosition(dragX, dragY + 44).setDepth(dragY - 1);
      this.shopInteraction.x = dragX;
      this.shopInteraction.y = dragY + 6;
      this.shopInteraction.promptY = dragY - 60;
      hint.setText(`DEV: merchant at (${Math.round(dragX)}, ${Math.round(dragY)})`);
    });

    this.input.on("dragend", (_p, obj) => {
      if (obj !== npc) return;
      const x = Math.round(npc.x), y = Math.round(npc.y);
      try { localStorage.setItem(this.vendorPosKey(), JSON.stringify({ x, y })); } catch { /* ignore */ }
      hint.setText(`DEV: saved at (${x}, ${y}) — tell me to bake it in`);
    });
  }

  update() {
    // Freeze the player (and stop re-triggering interactions) while the shop is open.
    if (this.shop?.isOpen()) {
      this.player?.update(this.cursors, this.wasd, true);
      this.interactions?.prompt?.setVisible(false);
      return;
    }
    this.updateBase();
  }

  addAlchemistCollisions() {
    const shapes = [
      { type: "rect", x: 626, y: 42, w: 414, h: 58 },
      { type: "rect", x: 196, y: 120, w: 230, h: 58 },
      { type: "rect", x: 1010, y: 120, w: 230, h: 58 },
      { type: "rect", x: 92, y: 412, w: 52, h: 560 },
      { type: "rect", x: 1162, y: 416, w: 52, h: 560 },
      { type: "rect", x: 260, y: 1128, w: 292, h: 54 },
      { type: "rect", x: 996, y: 1128, w: 292, h: 54 },
      { type: "rect", x: 632, y: 1215, w: 260, h: 42 },
      { type: "rect", x: 270, y: 570, w: 150, h: 348 },
      { type: "rect", x: 218, y: 326, w: 164, h: 116 },
      { type: "rect", x: 490, y: 292, w: 206, h: 92 },
      { type: "rect", x: 904, y: 272, w: 230, h: 118 },
      { type: "rect", x: 900, y: 472, w: 152, h: 148 },
      { type: "rect", x: 960, y: 684, w: 178, h: 96 },
      { type: "rect", x: 514, y: 694, w: 268, h: 150 },
      { type: "rect", x: 608, y: 780, w: 394, h: 86 },
      { type: "rect", x: 218, y: 974, w: 198, h: 116 },
      { type: "rect", x: 900, y: 936, w: 242, h: 146 },
      { type: "circle", x: 760, y: 348, r: 102 },
      { type: "circle", x: 1034, y: 894, r: 78 },
      { type: "circle", x: 615, y: 160, r: 52 },
      { type: "circle", x: 186, y: 728, r: 44 },
      { type: "circle", x: 1088, y: 730, r: 34 }
    ];

    this.loadManualCollisionLayout(shapes);
  }

  addAlchemistInteractions() {
    this.interactions.add({
      x: 628,
      y: 760,
      promptY: 690,
      promptText: "E Work (6h | 10 coins/h)",
      radius: 82,
      enabled: () => !this.isWorking,
      onInteract: () => this.startServerWork({ jobId: "alchemy" })
    });

    this.interactions.add({
      x: 760,
      y: 350,
      promptY: 278,
      promptText: "E Look",
      radius: 88,
      onInteract: () => this.dialog.show("Cauldron", "The green liquid pulses slowly, as if breathing along with the house.")
    });

    this.interactions.add({
      x: 610,
      y: 704,
      promptY: 628,
      promptText: "E Look",
      radius: 72,
      onInteract: () => this.dialog.show("Workbench", "Flasks, bones, and open pages suggest old alchemy studies.")
    });

    this.interactions.add({
      x: 218,
      y: 276,
      promptY: 220,
      promptText: "E Read",
      radius: 54,
      onInteract: () => this.dialog.show("Grimoire", "The letters rearrange themselves when you try to read aloud.")
    });

    this.interactions.add({
      x: 1018,
      y: 884,
      promptY: 814,
      promptText: "E Look",
      radius: 66,
      onInteract: () => this.dialog.show("Distiller", "Glass tubes carry a greenish light into a sealed reservoir.")
    });
  }

  addAlchemistExit(spawnKey) {
    const returnScene = this.entryData.returnScene ?? "WorldScene";
    this.add.rectangle(628, 1082, 92, 10, 0x3a2c30, 0.9).setDepth(1081);
    this.interactions.add({
      x: 628,
      y: 1068,
      promptY: 1028,
      promptText: "E Exit",
      radius: 62,
      onInteract: () => this.fadeTo(returnScene, { spawnKey })
    });
  }
}
