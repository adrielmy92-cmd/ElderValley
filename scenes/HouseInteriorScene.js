import InteriorBaseScene from "./InteriorBaseScene.js?v=222";

export default class HouseInteriorScene extends InteriorBaseScene {
  constructor() {
    super("HouseInteriorScene");
  }

  create() {
    const spawnKey = this.entryData.exitSpawnKey ?? "house01";
    this.makeRoom({ title: "Resident House", spawnX: 320, spawnY: 350 });

    this.add.image(320, 236, "tile-rug").setScale(3, 2).setDepth(120);
    this.addFurniture(118, 174, "bed", 46, 24, "The bed is neatly made. Someone left early to search for cards.", "Bed");
    this.addFurniture(256, 220, "table", 50, 24, "Tea marks and a hand-drawn card rest on the table.", "Table");
    this.addFurniture(304, 248, "chair", 20, 16);
    this.addFurniture(458, 174, "bookcase", 38, 18, "Books about old routes, merchants, and lost cards.", "Shelf");
    this.addFurniture(516, 250, "plant", 20, 18, "A well-kept plant. The village likes living things.", "Plant");
    this.addFurniture(430, 342, "chest-closed", 36, 20, null);

    const chestId = "house-common-chest";
    const opened = this.registry.get("openedChests") ?? {};
    const chest = this.add.image(430, 342, opened[chestId] ? "chest-open" : "chest-closed").setDepth(342);
    this.addSolidRect(430, 332, 36, 20);
    this.interactions.add({
      x: 430,
      y: 342,
      promptY: 308,
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
        this.addCardToInventory("Forest Spirit Card");
        this.dialog.show("Chest", "You found a Forest Spirit Card.");
      }
    });

    this.addNpc(178, 284, 0, "Resident", "If you search calmly, the village always reveals something.");
    this.addExitDoor(320, 410, spawnKey);
  }
}
