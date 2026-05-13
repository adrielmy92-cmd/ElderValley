import { createPixelArtTextures } from "../systems/PixelArtFactory.js?v=129";

export default class PreloadScene extends Phaser.Scene {
  constructor() {
    super("PreloadScene");
  }

  preload() {
    this.load.video("title-intro", "./assets/videos/eldervalley-title.mp4?v=129", "loadeddata", false, true);
    this.load.audio("title-theme", "./assets/audio/title-theme.mp3?v=129");
    this.load.image("reference-house", "./assets/sprites/reference-house.png");
    this.load.image("blacksmith-house", "./assets/sprites/blacksmith-house.png?v=129");
    this.load.image("card-shop-house", "./assets/sprites/card-shop-house.png?v=129");
    this.load.image("middle-forge-house", "./assets/sprites/middle-forge-house.png?v=129");
    this.load.image("fence-h", "./assets/sprites/fence-pack-h.png?v=129");
    this.load.image("fence-v", "./assets/sprites/fence-pack-v.png?v=129");
    this.load.image("fence-post", "./assets/sprites/fence-pack-post.png?v=129");
    this.load.image("fence-gate", "./assets/sprites/fence-pack-gate.png?v=129");
    this.load.image("fence-gate-open", "./assets/sprites/fence-pack-gate-open.png?v=129");
    this.load.image("creative-tree-pine", "./assets/sprites/creative-tree-pine.png?v=129");
    this.load.image("creative-tree-flower", "./assets/sprites/creative-tree-flower.png?v=129");
    this.load.image("creative-tree-round", "./assets/sprites/creative-tree-round.png?v=129");
    this.load.image("creative-tree-ancient", "./assets/sprites/creative-tree-ancient.png?v=129");
    this.load.image("creative-tree-twisted", "./assets/sprites/creative-tree-twisted-game.png?v=129");
    this.load.image("creative-tree-flower-cone", "./assets/sprites/creative-tree-flower-cone-game.png?v=129");
    this.load.image("creative-tree-layered-pine", "./assets/sprites/creative-tree-layered-pine-game.png?v=129");
    this.load.image("creative-tree-willow", "./assets/sprites/creative-tree-willow-game.png?v=129");
    this.load.image("creative-tree-birch", "./assets/sprites/creative-tree-birch-game.png?v=129");
    this.load.image("creative-tree-cypress", "./assets/sprites/creative-tree-cypress-game.png?v=129");
    this.load.image("creative-tree-red-maple", "./assets/sprites/creative-tree-red-maple-game.png?v=129");
    this.load.image("creative-tree-palm", "./assets/sprites/creative-tree-palm-game.png?v=129");
    this.load.image("creative-structure-fruit-stall", "./assets/sprites/creative-structure-fruit-stall-game.png?v=129");
    this.load.image("creative-structure-knight-statue", "./assets/sprites/creative-structure-knight-statue-game.png?v=129");
    this.load.image("creative-structure-fountain", "./assets/sprites/creative-structure-fountain-game.png?v=129");
    this.load.image("creative-structure-well", "./assets/sprites/creative-structure-well-game.png?v=129");
    this.load.image("creative-house-tavern", "./assets/sprites/creative-house-tavern.png?v=129");
    this.load.image("creative-house-manor", "./assets/sprites/creative-house-manor.png?v=129");
    this.load.image("creative-house-cottage", "./assets/sprites/creative-house-cottage.png?v=129");
    this.load.image("creative-house-blue-market", "./assets/sprites/creative-house-blue-market.png?v=129");
    this.load.image("creative-house-red-lodge", "./assets/sprites/creative-house-red-lodge.png?v=129");
    this.load.image("creative-house-green-cottage", "./assets/sprites/creative-house-green-cottage.png?v=129");
    for (let index = 1; index <= 19; index += 1) {
      const padded = String(index).padStart(2, "0");
      this.load.image(`creative-floor-${padded}`, `./assets/tilesets/creative-floor-${padded}.png?v=129`);
    }
    this.load.spritesheet("windmill-house", "./assets/sprites/windmill-house-sheet.png?v=129", {
      frameWidth: 300,
      frameHeight: 388
    });
    this.load.image("reference-tree", "./assets/sprites/reference-tree.png");
    this.load.spritesheet("adventurer-sheet", "./assets/sprites/adventurer-sheet.png", {
      frameWidth: 48,
      frameHeight: 68
    });
    this.load.spritesheet("silver-npc-sheet", "./assets/sprites/silver-npc-sheet.png?v=129", {
      frameWidth: 48,
      frameHeight: 68
    });
    this.load.spritesheet("blond-npc-sheet", "./assets/sprites/blond-npc-sheet.png?v=129", {
      frameWidth: 48,
      frameHeight: 68
    });
    this.load.spritesheet("knight-npc-sheet", "./assets/sprites/knight-npc-sheet.png?v=129", {
      frameWidth: 56,
      frameHeight: 84
    });
    this.load.spritesheet("knight-npc-idle-sheet", "./assets/sprites/knight-npc-idle-sheet.png?v=129", {
      frameWidth: 56,
      frameHeight: 84
    });
    this.load.spritesheet("mage-1-sheet", "./assets/sprites/blue-mage-sheet.png?v=129", {
      frameWidth: 56,
      frameHeight: 84
    });
    this.load.spritesheet("mage-1-idle-sheet", "./assets/sprites/blue-mage-idle-sheet.png?v=129", {
      frameWidth: 56,
      frameHeight: 84
    });
    createPixelArtTextures(this);
  }

  create() {
    const params = new URLSearchParams(window.location.search);
    const targetScene = params.get("scene") === "city" ? "CityScene" : "WorldScene";
    const spawnKey = params.get("spawnKey") ?? (targetScene === "CityScene" ? "fromVillage" : "start");
    if (params.get("skipTitle") === "1") {
      this.scene.start(targetScene, { spawnKey });
      return;
    }
    this.scene.start("TitleScene", { targetScene, spawnKey });
  }
}
