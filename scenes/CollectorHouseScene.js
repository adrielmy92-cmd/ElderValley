import InteriorBaseScene from "./InteriorBaseScene.js?v=132";

export default class CollectorHouseScene extends InteriorBaseScene {
  constructor() {
    super("CollectorHouseScene");
  }

  create() {
    this.makeRoom({ title: "Casa do Colecionador", spawnX: 320, spawnY: 350 });

    this.add.image(320, 242, "tile-rug").setScale(3, 3).setDepth(120);
    this.addFurniture(116, 174, "bookcase", 38, 18, "Volumes antigos catalogam cartas que ninguem viu em decadas.", "Estante");
    this.addFurniture(176, 174, "bookcase", 38, 18, "Um livro aberto mostra mapas da margem do rio.", "Estante");
    this.addFurniture(522, 174, "bookcase", 38, 18, "As lombadas estao gastas, mas organizadas com carinho.", "Estante");
    this.addFurniture(320, 250, "card-table", 62, 24, "Pergaminhos e cartas incompletas cobrem a mesa.", "Mesa");
    this.addFurniture(452, 320, "chest-closed", 36, 20, "O bau esta trancado por uma fechadura antiga.", "Bau");
    this.addFurniture(222, 318, "crystal", 22, 18, "O cristal vibra de leve perto de cartas raras.", "Cristal");

    const sparkle = this.add.image(320, 224, "card-sparkle-0").setDepth(500);
    this.tweens.add({ targets: sparkle, alpha: 0.2, scale: 1.25, duration: 740, yoyo: true, repeat: -1 });

    this.addNpc(382, 228, 4, "Anciao", "As cartas mais raras nao sao compradas. Elas sao descobertas.");
    this.addExitDoor(320, 410, "collector");
  }
}
