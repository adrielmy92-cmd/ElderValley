import InteriorBaseScene from "./InteriorBaseScene.js?v=251";

const ART_SCALE = 1.05;
const SOURCE_SCALE = ART_SCALE / 0.5;
const CHARACTER_SCALE = 1.62;

function sx(value) {
  return Math.round(value * SOURCE_SCALE);
}

export default class WindmillInteriorScene extends InteriorBaseScene {
  constructor() {
    super("WindmillInteriorScene");
  }

  create() {
    if (!this.textures.exists("windmill-interior-test")) {
      this.scene.start("WindmillLoadScene", this.entryData);
      return;
    }

    this.buildWindmillInterior();
  }

  buildWindmillInterior() {
    this.manualCollisionStorageKey = "eldervalley-windmill-manual-collisions-v1";
    this.skipAutoManualCollisionLoad = true;
    this.makeRoom({
      width: Math.round(1448 * ART_SCALE),
      height: Math.round(1086 * ART_SCALE),
      title: "Windmill",
      spawnX: sx(362),
      spawnY: sx(430)
    });

    this.add.image(0, 0, "windmill-interior-test")
      .setOrigin(0)
      .setScale(ART_SCALE)
      .setDepth(-6);

    this.addWindmillCollisions();
    this.addWindmillInteractions();
    this.scalePlayerForMill();
    const miller = this.addNpc(sx(520), sx(394), 4, "Miller", "The windmill shaft creaks slowly. When the wind changes, the flour becomes finer.");
    this.scaleNpcForMill(miller);
    this.addMillExit();
  }

  scalePlayerForMill() {
    this.player.setScale(CHARACTER_SCALE);
    this.player.depthBias = 180;
    this.player.body.setSize(26, 18).setOffset(15, 64);
  }

  scaleNpcForMill(npc) {
    npc.setScale(CHARACTER_SCALE);
    npc.body.setSize(14, 12).setOffset(5, 18);
  }

  addWindmillCollisions() {
    const rects = [
      [362, 33, 420, 44],
      [42, 230, 54, 250],
      [68, 362, 74, 150],
      [112, 430, 118, 76],
      [116, 382, 56, 86],
      [166, 446, 116, 44],
      [118, 122, 44, 158],
      [84, 275, 44, 156],
      [682, 230, 54, 250],
      [656, 362, 74, 150],
      [612, 430, 118, 76],
      [608, 382, 56, 86],
      [558, 446, 116, 44],
      [606, 122, 44, 158],
      [640, 275, 44, 156],
      [150, 464, 230, 42],
      [574, 464, 230, 42],
      [218, 514, 190, 42],
      [506, 514, 190, 42],
      [302, 478, 30, 82],
      [422, 478, 30, 82],
      [362, 510, 86, 40],
      [177, 172, 48, 120],
      [225, 135, 118, 42],
      [329, 83, 36, 58],
      [432, 136, 102, 40],
      [540, 148, 74, 72],
      [388, 196, 126, 34],
      [458, 196, 34, 216],
      [214, 364, 146, 90],
      [214, 410, 154, 58],
      [170, 384, 58, 82],
      [240, 382, 64, 86],
      [198, 438, 116, 48],
      [505, 384, 148, 82],
      [505, 428, 130, 34],
      [82, 270, 72, 92],
      [72, 318, 52, 64],
      [548, 308, 84, 78],
      [596, 332, 78, 78]
    ].map(([x, y, w, h]) => ({
      x: sx(x),
      y: sx(y),
      w: sx(w),
      h: sx(h)
    }));

    const circularAsRects = [
      [398, 278, 52],
      [398, 214, 35],
      [522, 318, 34],
      [548, 304, 35],
      [586, 290, 34],
      [602, 336, 35],
      [574, 370, 31],
      [598, 342, 25],
      [596, 392, 25],
      [640, 356, 24],
      [640, 416, 24],
      [165, 394, 26],
      [80, 342, 27],
      [83, 292, 34],
      [304, 168, 31]
    ].map(([x, y, radius]) => ({
      x: sx(x),
      y: sx(y),
      w: sx(radius * 2),
      h: sx(radius * 2)
    }));

    this.loadManualCollisionLayout([...rects, ...circularAsRects]);
  }

  addMillRect(x, y, width, height) {
    return this.addSolidRect(sx(x), sx(y), sx(width), sx(height));
  }

  addMillCircle(x, y, radius) {
    return this.addSolidCircle(sx(x), sx(y), sx(radius));
  }

  addMillExit() {
    const returnScene = this.entryData.returnScene ?? "WorldScene";
    this.add.rectangle(sx(362), sx(478), sx(76), sx(8), 0x3a2c30, 1).setDepth(sx(478));
    this.interactions.add({
      x: sx(362),
      y: sx(462),
      promptY: sx(430),
      promptText: "E Exit",
      radius: sx(70),
      onInteract: () => this.fadeTo(returnScene, { spawnKey: "windmill" })
    });
  }

  addWindmillInteractions() {
    this.interactions.add({
      x: sx(398),
      y: sx(270),
      promptY: sx(210),
      promptText: "E Look",
      radius: sx(78),
      onInteract: () => this.dialog.show("Mechanism", "The millstone hums softly, locked to the windmill's main shaft.")
    });

    this.interactions.add({
      x: sx(178),
      y: sx(130),
      promptY: sx(82),
      promptText: "E Look",
      radius: sx(54),
      onInteract: () => this.dialog.show("Shelf", "Jars, baskets and small grain sacks are lined up on the wood.")
    });

    this.interactions.add({
      x: sx(214),
      y: sx(380),
      promptY: sx(336),
      promptText: "E Look",
      radius: sx(54),
      onInteract: () => this.dialog.show("Table", "Fine flour covers the table, lit by a small lantern.")
    });

    this.interactions.add({
      x: sx(538),
      y: sx(388),
      promptY: sx(342),
      promptText: "E Look",
      radius: sx(58),
      onInteract: () => this.dialog.show("Workbench", "Tools, jars, and loose parts show the windmill receives constant maintenance.")
    });
  }
}
