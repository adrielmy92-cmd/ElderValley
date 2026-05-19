import InteriorBaseScene from "./InteriorBaseScene.js?v=163";

export default class HouseInteriorScene extends InteriorBaseScene {
  constructor() {
    super("HouseInteriorScene");
  }

  create() {
    const spawnKey = this.entryData.exitSpawnKey ?? "house01";
    this.makeRoom({ title: "Casa de Morador", spawnX: 320, spawnY: 350 });

    this.add.image(320, 236, "tile-rug").setScale(3, 2).setDepth(120);
    this.addFurniture(118, 174, "bed", 46, 24, "A cama esta arrumada. Alguem saiu cedo para procurar cartas.", "Cama");
    this.addFurniture(256, 220, "table", 50, 24, "Ha marcas de cha e uma carta desenhada a mao sobre a mesa.", "Mesa");
    this.addFurniture(304, 248, "chair", 20, 16);
    this.addFurniture(458, 174, "bookcase", 38, 18, "Livros sobre rotas antigas, comerciantes e cartas perdidas.", "Estante");
    this.addFurniture(516, 250, "plant", 20, 18, "Uma planta bem cuidada. A vila gosta das coisas vivas.", "Vaso");
    this.addFurniture(430, 342, "chest-closed", 36, 20, null);

    const chestId = "house-common-chest";
    const opened = this.registry.get("openedChests") ?? {};
    const chest = this.add.image(430, 342, opened[chestId] ? "chest-open" : "chest-closed").setDepth(342);
    this.addSolidRect(430, 332, 36, 20);
    this.interactions.add({
      x: 430,
      y: 342,
      promptY: 308,
      promptText: "E Abrir",
      radius: 44,
      onInteract: () => {
        const state = this.registry.get("openedChests") ?? {};
        if (state[chestId]) {
          this.dialog.show("Bau", "O bau esta vazio agora.");
          return;
        }
        state[chestId] = true;
        this.registry.set("openedChests", state);
        chest.setTexture("chest-open");
        this.addCardToInventory("Forest Spirit Card");
        this.dialog.show("Bau", "Voce encontrou uma Forest Spirit Card.");
      }
    });

    this.addNpc(178, 284, 0, "Morador", "Se voce procurar com calma, a vila sempre revela alguma coisa.");
    this.addExitDoor(320, 410, spawnKey);
  }
}
