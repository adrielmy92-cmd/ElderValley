import InteriorBaseScene from "./InteriorBaseScene.js?v=232";

export default class MiddleForgeInteriorScene extends InteriorBaseScene {
  constructor() {
    super("MiddleForgeInteriorScene");
  }

  create() {
    this.makeRoom({
      width: 704,
      height: 544,
      title: "Central Forge",
      spawnX: 352,
      spawnY: 464
    });

    this.addForgeArchitecture();

    this.add.image(352, 378, "tile-rug").setScale(3.1, 1.1).setDepth(120);
    this.addFurniture(160, 184, "bookcase", 38, 18, "Small tools, leather and rivet boxes are organized here.", "Shelf");
    this.addFurniture(244, 392, "table", 70, 24, "The workbench has hammers, files and still-warm metal pieces.", "Workbench");
    this.addFurniture(484, 390, "card-table", 72, 24, "Some cards have been protected with thin plates of polished metal.", "Order Table");
    this.addFurniture(578, 266, "chest-closed", 36, 20, "A heavy chest holds old tools.", "Tool Chest");

    const anvilShadow = this.add.ellipse(356, 330, 76, 28, 0x181619, 0.28).setDepth(315);
    const anvil = this.add.rectangle(356, 318, 68, 30, 0x59606a, 1).setDepth(330);
    this.add.rectangle(356, 302, 42, 16, 0x8d95a1, 1).setDepth(331);
    this.add.rectangle(356, 344, 22, 28, 0x3b4149, 1).setDepth(331);
    this.addSolidRect(356, 326, 78, 42);
    this.interactions.add({
      x: 356,
      y: 326,
      promptY: 276,
      promptText: "E Look",
      radius: 46,
      onInteract: () => this.dialog.show("Anvil", "The anvil has deep marks from many years of work.")
    });

    this.tweens.add({
      targets: anvilShadow,
      alpha: 0.18,
      duration: 900,
      yoyo: true,
      repeat: -1
    });
    this.tweens.add({
      targets: anvil,
      alpha: 0.88,
      duration: 1200,
      yoyo: true,
      repeat: -1
    });

    const ember = this.add.image(524, 188, "card-sparkle-0").setDepth(500).setTint(0xff7a18);
    this.tweens.add({ targets: ember, alpha: 0.22, scale: 1.35, duration: 520, yoyo: true, repeat: -1 });

    this.addNpc(520, 250, 2, "Ferreiro", "As melhores cartas tambem precisam de bons estojos. Metal protege memoria.");
    this.addExitDoor(352, 504, "middleForge");
  }

  addForgeArchitecture() {
    this.add.rectangle(352, 112, 568, 18, 0x6a4630, 1).setDepth(82);
    this.add.rectangle(352, 138, 522, 48, 0x7a4634, 1).setDepth(82);

    this.add.rectangle(528, 154, 118, 88, 0x4a4038, 1).setDepth(92);
    this.add.rectangle(528, 176, 86, 50, 0x25191a, 1).setDepth(93);
    this.add.rectangle(528, 190, 64, 30, 0xf07a22, 1).setDepth(94);
    this.add.rectangle(528, 198, 48, 16, 0xffc765, 1).setDepth(95);
    this.addSolidRect(528, 172, 132, 98);

    this.add.rectangle(112, 300, 54, 240, 0x7e5137, 1).setDepth(88);
    this.add.rectangle(592, 300, 54, 240, 0x7e5137, 1).setDepth(88);
    this.addSolidRect(112, 300, 54, 240);
    this.addSolidRect(592, 300, 54, 240);

    for (let x = 156; x <= 548; x += 56) {
      this.add.rectangle(x, 128, 28, 34, 0x9a6a43, 1).setDepth(86);
    }
  }
}
