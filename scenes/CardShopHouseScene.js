import InteriorBaseScene from "./InteriorBaseScene.js?v=127";

export default class CardShopHouseScene extends InteriorBaseScene {
  constructor() {
    super("CardShopHouseScene");
  }

  create() {
    this.makeRoom({
      width: 512,
      height: 576,
      title: "Loja de Cartas",
      spawnX: 256,
      spawnY: 488
    });

    this.addStorefrontDetails();

    this.add.image(256, 394, "tile-rug").setScale(3.5, 1.35).setDepth(120);
    this.add.image(256, 226, "tile-rug").setScale(2.2, 1.2).setDepth(120);

    this.addFurniture(146, 178, "bookcase", 38, 18, "Caixas de cartas comuns estao organizadas por cor e regiao.", "Prateleira");
    this.addFurniture(366, 178, "bookcase", 38, 18, "As caixas superiores tem selos antigos de ElderValley.", "Prateleira");
    this.addFurniture(104, 342, "bookcase", 38, 18, "Pacotes fechados ficam atras do vidro, longe de maos curiosas.", "Vitrine");
    this.addFurniture(256, 286, "counter", 112, 24, "O balcao tem um livro de vendas, moedas e cartas separadas por raridade.", "Balcao");
    this.addFurniture(256, 402, "card-table", 68, 24, "Cartas de colecao estao expostas sob um pano vermelho e creme.", "Mesa de Cartas");
    this.addFurniture(372, 388, "card-table", 58, 22, "Uma pequena placa diz: trocas justas, cartas originais.", "Mesa Lateral");
    this.addFurniture(414, 474, "plant", 20, 18, "A planta fica perto da porta para deixar a loja menos empoeirada.", "Vaso");

    const chestId = "card-shop-house-chest";
    const opened = this.registry.get("openedChests") ?? {};
    const chest = this.add.image(116, 474, opened[chestId] ? "chest-open" : "chest-closed").setDepth(474);
    this.addSolidRect(116, 464, 36, 20);
    this.interactions.add({
      x: 116,
      y: 474,
      promptY: 438,
      promptText: "E Abrir",
      radius: 44,
      onInteract: () => {
        const state = this.registry.get("openedChests") ?? {};
        if (state[chestId]) {
          this.dialog.show("Bau", "O bau da loja ja foi aberto.");
          return;
        }
        state[chestId] = true;
        this.registry.set("openedChests", state);
        chest.setTexture("chest-open");
        this.addCardToInventory("Lantern Market Card");
        this.dialog.show("Bau", "Voce encontrou uma Lantern Market Card.");
      }
    });

    const sparkleA = this.add.image(230, 374, "card-sparkle-0").setDepth(500);
    const sparkleB = this.add.image(386, 360, "card-sparkle-1").setDepth(500);
    this.tweens.add({ targets: [sparkleA, sparkleB], alpha: 0.22, scale: 1.2, duration: 720, yoyo: true, repeat: -1 });

    this.addNpc(256, 230, 2, "Vendedor", "Bem-vindo. Essa loja parece pequena por fora, mas as melhores cartas ficam bem guardadas.");
    this.addExitDoor(256, 536, "blacksmith");
  }

  addStorefrontDetails() {
    this.add.rectangle(256, 102, 284, 10, 0x6b412e, 1).setDepth(80);
    this.add.rectangle(256, 130, 224, 12, 0x8d4c38, 1).setDepth(80);
    this.add.rectangle(256, 142, 224, 18, 0xd8b06a, 1).setDepth(81);
    for (let x = 160; x <= 344; x += 32) {
      this.add.rectangle(x, 142, 16, 18, 0xb94e45, 1).setDepth(82);
    }

    this.add.rectangle(256, 92, 86, 46, 0x3f2c2a, 1).setDepth(85);
    this.add.rectangle(256, 92, 62, 30, 0xe0c493, 1).setDepth(86);
    this.add.rectangle(256, 92, 46, 18, 0x61422f, 1).setDepth(87);

    this.add.rectangle(72, 300, 38, 108, 0x8a593b, 1).setDepth(90);
    this.add.rectangle(440, 300, 38, 108, 0x8a593b, 1).setDepth(90);
    this.addSolidRect(72, 300, 38, 108);
    this.addSolidRect(440, 300, 38, 108);
  }
}
