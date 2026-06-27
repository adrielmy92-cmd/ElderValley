import InteriorBaseScene from "./InteriorBaseScene.js?v=264";

export default class CollectorHouseScene extends InteriorBaseScene {
  constructor() {
    super("CollectorHouseScene");
  }

  create() {
    this.makeRoom({ title: "Collector House", spawnX: 320, spawnY: 350 });

    this.add.image(320, 242, "tile-rug").setScale(3, 3).setDepth(120);
    this.addFurniture(116, 174, "bookcase", 38, 18, "Old volumes catalog cards no one has seen in decades.", "Shelf");
    this.addFurniture(176, 174, "bookcase", 38, 18, "An open book shows maps of the riverbank.", "Shelf");
    this.addFurniture(522, 174, "bookcase", 38, 18, "The spines are worn, but carefully organized.", "Shelf");
    this.addFurniture(320, 250, "card-table", 62, 24, "Scrolls and unfinished cards cover the table.", "Table");
    this.addFurniture(452, 320, "chest-closed", 36, 20, "The chest is locked with an old lock.", "Chest");
    this.addFurniture(222, 318, "crystal", 22, 18, "The crystal softly vibrates near rare cards.", "Crystal");

    const sparkle = this.add.image(320, 224, "card-sparkle-0").setDepth(500);
    this.tweens.add({ targets: sparkle, alpha: 0.2, scale: 1.25, duration: 740, yoyo: true, repeat: -1 });

    this.addNpc(382, 228, 4, "Elder", "The rarest cards are not bought. They are discovered.");
    this.addExitDoor(320, 410, "collector");
  }
}
