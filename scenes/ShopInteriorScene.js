import InteriorBaseScene from "./InteriorBaseScene.js?v=192";

export default class ShopInteriorScene extends InteriorBaseScene {
  constructor() {
    super("ShopInteriorScene");
  }

  create() {
    this.makeRoom({ title: "Mercado de Cartas", spawnX: 320, spawnY: 350 });

    this.add.image(320, 245, "tile-rug").setScale(4, 2).setDepth(120);
    this.addFurniture(320, 170, "counter", 100, 24, "O balcao tem pequenas caixas marcadas por raridade.", "Balcao");
    this.addFurniture(134, 174, "bookcase", 38, 18, "Prateleiras com capas, caixas e cartas comuns.", "Prateleira");
    this.addFurniture(506, 174, "bookcase", 38, 18, "Uma etiqueta diz: colecionaveis locais, sem garantia de magia.", "Prateleira");
    this.addFurniture(220, 276, "card-table", 62, 24, "Cartas genericas estao expostas por regiao: bosque, rio e montanha.", "Mesa de Cartas");
    this.addFurniture(420, 276, "card-table", 62, 24, "Uma carta brilhante chama sua atencao por um segundo.", "Mesa de Cartas");

    const sparkleA = this.add.image(444, 252, "card-sparkle-0").setDepth(500);
    const sparkleB = this.add.image(200, 252, "card-sparkle-1").setDepth(500);
    this.tweens.add({ targets: [sparkleA, sparkleB], alpha: 0.25, duration: 680, yoyo: true, repeat: -1 });

    this.addNpc(320, 218, 2, "Vendedor", "Bem-vindo ao mercado de cartas. Aqui colecionadores encontram reliquias raras.");
    this.addExitDoor(320, 410, "shop");
  }
}
