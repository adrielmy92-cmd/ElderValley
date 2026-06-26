import InteriorBaseScene from "./InteriorBaseScene.js?v=261";

export default class ReferenceHouseInteriorScene extends InteriorBaseScene {
  constructor() {
    super("ReferenceHouseInteriorScene");
  }

  create() {
    this.makeRoom({
      width: 640,
      height: 512,
      title: "Resident House",
      spawnX: 320,
      spawnY: 432
    });

    this.addHomeArchitecture();

    this.add.image(320, 334, "tile-rug").setScale(3.4, 1.25).setDepth(120);
    this.add.image(178, 214, "tile-rug").setScale(1.6, 1.2).setDepth(120);

    this.addFurniture(138, 184, "bed", 46, 24, "The bed sits in the warmest corner of the house.", "Bed");
    this.addFurniture(268, 206, "table", 58, 24, "There is a cup, a small map, and two face-down cards.", "Table");
    this.addFurniture(306, 234, "chair", 20, 16);
    this.addFurniture(466, 180, "bookcase", 38, 18, "Books of recipes, trade, and short village legends.", "Shelf");
    this.addFurniture(512, 304, "plant", 20, 18, "A pot near the window gets plenty of daylight.", "Plant");

    const chestId = "reference-house-chest";
    const opened = this.registry.get("openedChests") ?? {};
    const chest = this.add.image(430, 374, opened[chestId] ? "chest-open" : "chest-closed").setDepth(374);
    this.addSolidRect(430, 364, 36, 20);
    this.interactions.add({
      x: 430,
      y: 374,
      promptY: 338,
      promptText: "E Open",
      radius: 44,
      onInteract: () => {
        const state = this.registry.get("openedChests") ?? {};
        if (state[chestId]) {
          this.dialog.show("Chest", "The chest is empty now.");
          return;
        }
        state[chestId] = true;
        this.registry.set("openedChests", state);
        chest.setTexture("chest-open");
        this.addCardToInventory("Warm Window Card");
        this.dialog.show("Chest", "You found a Warm Window Card.");
      }
    });

    this.addNpc(208, 316, 0, "Resident", "The facade is large, but the most used part of the house is near the fireplace.");
    this.addExitDoor(320, 472, "house01");
  }

  addHomeArchitecture() {
    this.add.rectangle(320, 116, 456, 18, 0x6f452b, 1).setDepth(82);
    this.add.rectangle(320, 148, 412, 46, 0xb48557, 1).setDepth(82);
    this.add.rectangle(116, 256, 42, 198, 0x8b5d38, 1).setDepth(86);
    this.add.rectangle(524, 256, 42, 198, 0x8b5d38, 1).setDepth(86);
    this.addSolidRect(116, 256, 42, 198);
    this.addSolidRect(524, 256, 42, 198);

    this.add.rectangle(320, 134, 96, 62, 0x3b2b24, 1).setDepth(90);
    this.add.rectangle(320, 134, 66, 38, 0xd9bc82, 1).setDepth(91);
    this.add.rectangle(320, 134, 46, 22, 0x563727, 1).setDepth(92);

    this.add.rectangle(538, 390, 70, 54, 0x4f372c, 1).setDepth(128);
    this.add.rectangle(538, 398, 48, 28, 0xf3a33b, 1).setDepth(129);
    this.add.rectangle(538, 404, 34, 14, 0xffd17a, 1).setDepth(130);
    this.addSolidRect(538, 390, 78, 58);
  }
}
