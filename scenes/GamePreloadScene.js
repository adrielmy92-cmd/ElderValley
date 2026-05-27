export default class GamePreloadScene extends Phaser.Scene {
  constructor() {
    super("GamePreloadScene");
  }

  init(data = {}) {
    this.targetScene = data.targetScene ?? "WorldScene";
    this.spawnKey = data.spawnKey ?? (this.targetScene === "CityScene" ? "fromVillage" : "start");
    this.entryData = data.entryData ?? {};
  }

  preload() {
    this.drawLoadingUi();

    this.loadImage("reference-house", "./assets/sprites/reference-house.png");
    this.loadImage("blacksmith-house", "./assets/sprites/blacksmith-house.png?v=132");
    this.loadImage("card-shop-house", "./assets/sprites/card-shop-house.png?v=132");
    this.loadImage("middle-forge-house", "./assets/sprites/middle-forge-house.png?v=132");
    this.loadImage("fence-h", "./assets/sprites/fence-pack-h.png?v=132");
    this.loadImage("fence-v", "./assets/sprites/fence-pack-v.png?v=132");
    this.loadImage("fence-post", "./assets/sprites/fence-pack-post.png?v=132");
    this.loadImage("fence-gate", "./assets/sprites/fence-pack-gate.png?v=132");
    this.loadImage("fence-gate-open", "./assets/sprites/fence-pack-gate-open.png?v=132");

    this.loadImage("creative-tree-pine", "./assets/sprites/creative-tree-pine.png?v=132");
    this.loadImage("creative-tree-flower", "./assets/sprites/creative-tree-flower.png?v=132");
    this.loadImage("creative-tree-round", "./assets/sprites/creative-tree-round.png?v=132");
    this.loadImage("creative-tree-ancient", "./assets/sprites/creative-tree-ancient.png?v=132");
    this.loadImage("creative-tree-twisted", "./assets/sprites/creative-tree-twisted-game.png?v=132");
    this.loadImage("creative-tree-flower-cone", "./assets/sprites/creative-tree-flower-cone-game.png?v=132");
    this.loadImage("creative-tree-layered-pine", "./assets/sprites/creative-tree-layered-pine-game.png?v=132");
    this.loadImage("creative-tree-willow", "./assets/sprites/creative-tree-willow-game.png?v=132");
    this.loadImage("creative-tree-birch", "./assets/sprites/creative-tree-birch-game.png?v=132");
    this.loadImage("creative-tree-cypress", "./assets/sprites/creative-tree-cypress-game.png?v=132");
    this.loadImage("creative-tree-red-maple", "./assets/sprites/creative-tree-red-maple-game.png?v=132");
    this.loadImage("creative-tree-palm", "./assets/sprites/creative-tree-palm-game.png?v=132");

    this.loadImage("creative-structure-fruit-stall", "./assets/sprites/creative-structure-fruit-stall-game.png?v=132");
    this.loadImage("creative-structure-knight-statue", "./assets/sprites/creative-structure-knight-statue-game.png?v=132");
    this.loadImage("creative-structure-fountain", "./assets/sprites/creative-structure-fountain-game.png?v=132");
    this.loadImage("creative-structure-well", "./assets/sprites/creative-structure-well-game.png?v=132");
    this.loadImage("creative-structure-lamp-double", "./assets/sprites/creative-structure-lamp-double.png?v=207");
    this.loadImage("creative-structure-lamp-hanging", "./assets/sprites/creative-structure-lamp-hanging.png?v=207");
    this.loadImage("creative-structure-lamp-monk", "./assets/sprites/creative-structure-lamp-monk.png?v=207");
    this.loadImage("creative-structure-lamp-vine", "./assets/sprites/creative-structure-lamp-vine.png?v=207");
    this.loadSheet("creative-structure-campfire", "./assets/sprites/creative-structure-campfire-sheet.png?v=204", 384, 352);
    this.loadSheet("creative-animal-cat", "./assets/sprites/creative-animal-cat-sheet.png?v=176", 96, 96);
    this.loadSheet("creative-animal-bull", "./assets/sprites/creative-animal-bull-sheet.png?v=176", 96, 96);
    this.loadSheet("creative-npc-hooded", "./assets/sprites/creative-npc-hooded-sheet.png?v=1", 194, 194);

    this.loadImage("alchemist-interior", "./assets/sprites/alchemist-interior.png?v=146");
    for (let index = 1; index <= 19; index += 1) {
      const padded = String(index).padStart(2, "0");
      this.loadImage(`creative-floor-${padded}`, `./assets/tilesets/creative-floor-${padded}.png?v=132`);
    }

    this.loadSheet("windmill-house", "./assets/sprites/windmill-house-sheet.png?v=132", 300, 388);
    this.loadImage("reference-tree", "./assets/sprites/reference-tree.png");
    this.loadSheet("silver-npc-sheet", "./assets/sprites/silver-npc-sheet.png?v=132", 48, 68);
    this.loadSheet("blond-npc-sheet", "./assets/sprites/blond-npc-sheet.png?v=132", 48, 68);
    this.loadSheet("hooded-sheet", "./assets/sprites/hooded-sheet.png?v=133", 48, 68);
    this.loadSheet("knight-npc-sheet", "./assets/sprites/knight-npc-sheet.png?v=132", 80, 84);
    this.loadSheet("knight-npc-idle-sheet", "./assets/sprites/knight-npc-idle-sheet.png?v=132", 80, 84);
  }

  create() {
    this.scene.start(this.targetScene, {
      ...this.entryData,
      spawnKey: this.spawnKey
    });
  }

  loadImage(key, url) {
    if (!this.textures.exists(key)) {
      this.load.image(key, url);
    }
  }

  loadSheet(key, url, frameWidth, frameHeight) {
    if (!this.textures.exists(key)) {
      this.load.spritesheet(key, url, { frameWidth, frameHeight });
    }
  }

  drawLoadingUi() {
    const width = this.scale.width;
    const height = this.scale.height;
    this.add.rectangle(0, 0, width, height, 0x08111d, 1).setOrigin(0);
    this.add.text(width / 2, height / 2 - 22, "Loading ElderValley", {
      fontFamily: "monospace",
      fontSize: "22px",
      color: "#f3d08a",
      stroke: "#000000",
      strokeThickness: 4
    }).setOrigin(0.5);

    const barWidth = Math.min(420, width - 80);
    const bar = this.add.rectangle(width / 2 - barWidth / 2, height / 2 + 22, 0, 10, 0xf0b84e, 1).setOrigin(0, 0.5);
    this.add.rectangle(width / 2, height / 2 + 22, barWidth, 12, 0xd29643, 0.35).setStrokeStyle(1, 0xf0c36a);
    this.load.on("progress", (value) => {
      bar.width = barWidth * value;
    });
  }
}
