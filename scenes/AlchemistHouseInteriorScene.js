import InteriorBaseScene from "./InteriorBaseScene.js?v=194";

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
      title: "Casa Arcana",
      spawnX: 628,
      spawnY: 1084
    });

    this.add.image(0, 0, "alchemist-interior")
      .setOrigin(0)
      .setDepth(-6);

    this.addAlchemistCollisions();
    this.addAlchemistInteractions();
    this.addAlchemistExit(spawnKey);
    this.addNpc(735, 872, 2, "Alquimista", "Nem toda pocao deve ser bebida. Algumas servem apenas para lembrar que curiosidade cobra preco.");
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
      promptText: "E Trabalhar (6h | 10 moedas/h)",
      radius: 82,
      enabled: () => !this.isWorking,
      onInteract: () => this.startServerWork({ jobId: "alchemy" })
    });

    this.interactions.add({
      x: 760,
      y: 350,
      promptY: 278,
      promptText: "E Ver",
      radius: 88,
      onInteract: () => this.dialog.show("Caldeirao", "O liquido verde pulsa devagar, como se respirasse junto com a casa.")
    });

    this.interactions.add({
      x: 610,
      y: 704,
      promptY: 628,
      promptText: "E Ver",
      radius: 72,
      onInteract: () => this.dialog.show("Bancada", "Frascos, ossos e paginas abertas indicam estudos de alquimia antiga.")
    });

    this.interactions.add({
      x: 218,
      y: 276,
      promptY: 220,
      promptText: "E Ler",
      radius: 54,
      onInteract: () => this.dialog.show("Grimorio", "As letras se reorganizam quando voce tenta ler em voz alta.")
    });

    this.interactions.add({
      x: 1018,
      y: 884,
      promptY: 814,
      promptText: "E Ver",
      radius: 66,
      onInteract: () => this.dialog.show("Destilador", "Tubos de vidro carregam uma luz esverdeada ate um reservatorio lacrado.")
    });
  }

  addAlchemistExit(spawnKey) {
    const returnScene = this.entryData.returnScene ?? "WorldScene";
    this.add.rectangle(628, 1082, 92, 10, 0x3a2c30, 0.9).setDepth(1081);
    this.interactions.add({
      x: 628,
      y: 1068,
      promptY: 1028,
      promptText: "E Sair",
      radius: 62,
      onInteract: () => this.fadeTo(returnScene, { spawnKey })
    });
  }
}
