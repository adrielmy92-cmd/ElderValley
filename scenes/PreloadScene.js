import { createPixelArtTextures } from "../systems/PixelArtFactory.js?v=132";

export default class PreloadScene extends Phaser.Scene {
  constructor() {
    super("PreloadScene");
  }

  preload() {
    this.load.video("title-intro", "./assets/videos/eldervalley-title.mp4?v=132", "loadeddata", false, true);
    this.load.audio("title-theme", "./assets/audio/title-theme.mp3?v=132");
    this.load.svg("wallet-metamask", "./assets/ui/metamask-icon.svg?v=161", { width: 128, height: 128 });
    this.load.svg("wallet-phantom", "./assets/ui/phantom-icon.svg?v=161", { width: 128, height: 128 });
    this.load.image("reference-house", "./assets/sprites/reference-house.png");
    this.load.image("blacksmith-house", "./assets/sprites/blacksmith-house.png?v=132");
    this.load.image("card-shop-house", "./assets/sprites/card-shop-house.png?v=132");
    this.load.image("middle-forge-house", "./assets/sprites/middle-forge-house.png?v=132");
    this.load.image("fence-h", "./assets/sprites/fence-pack-h.png?v=132");
    this.load.image("fence-v", "./assets/sprites/fence-pack-v.png?v=132");
    this.load.image("fence-post", "./assets/sprites/fence-pack-post.png?v=132");
    this.load.image("fence-gate", "./assets/sprites/fence-pack-gate.png?v=132");
    this.load.image("fence-gate-open", "./assets/sprites/fence-pack-gate-open.png?v=132");
    this.load.image("creative-tree-pine", "./assets/sprites/creative-tree-pine.png?v=132");
    this.load.image("creative-tree-flower", "./assets/sprites/creative-tree-flower.png?v=132");
    this.load.image("creative-tree-round", "./assets/sprites/creative-tree-round.png?v=132");
    this.load.image("creative-tree-ancient", "./assets/sprites/creative-tree-ancient.png?v=132");
    this.load.image("creative-tree-twisted", "./assets/sprites/creative-tree-twisted-game.png?v=132");
    this.load.image("creative-tree-flower-cone", "./assets/sprites/creative-tree-flower-cone-game.png?v=132");
    this.load.image("creative-tree-layered-pine", "./assets/sprites/creative-tree-layered-pine-game.png?v=132");
    this.load.image("creative-tree-willow", "./assets/sprites/creative-tree-willow-game.png?v=132");
    this.load.image("creative-tree-birch", "./assets/sprites/creative-tree-birch-game.png?v=132");
    this.load.image("creative-tree-cypress", "./assets/sprites/creative-tree-cypress-game.png?v=132");
    this.load.image("creative-tree-red-maple", "./assets/sprites/creative-tree-red-maple-game.png?v=132");
    this.load.image("creative-tree-palm", "./assets/sprites/creative-tree-palm-game.png?v=132");
    this.load.image("creative-structure-fruit-stall", "./assets/sprites/creative-structure-fruit-stall-game.png?v=132");
    this.load.image("creative-structure-knight-statue", "./assets/sprites/creative-structure-knight-statue-game.png?v=132");
    this.load.image("creative-structure-fountain", "./assets/sprites/creative-structure-fountain-game.png?v=132");
    this.load.image("creative-structure-well", "./assets/sprites/creative-structure-well-game.png?v=132");
    this.load.spritesheet("creative-animal-cat", "./assets/sprites/creative-animal-cat-sheet.png?v=176", {
      frameWidth: 96,
      frameHeight: 96
    });
    this.load.spritesheet("creative-animal-bull", "./assets/sprites/creative-animal-bull-sheet.png?v=176", {
      frameWidth: 96,
      frameHeight: 96
    });
    this.load.image("creative-house-tavern", "./assets/sprites/creative-house-tavern.png?v=132");
    this.load.image("creative-house-manor", "./assets/sprites/creative-house-manor.png?v=132");
    this.load.image("creative-house-cottage", "./assets/sprites/creative-house-cottage.png?v=132");
    this.load.image("creative-house-blue-market", "./assets/sprites/creative-house-blue-market.png?v=132");
    this.load.image("creative-house-red-lodge", "./assets/sprites/creative-house-red-lodge.png?v=132");
    this.load.image("creative-house-green-cottage", "./assets/sprites/creative-house-green-cottage.png?v=132");
    this.load.image("creative-house-alchemist", "./assets/sprites/creative-house-alchemist.png?v=144");
    this.load.image("creative-house-ivy-manor", "./assets/sprites/creative-house-ivy-manor.png?v=198");
    this.load.image("creative-house-thatch-cottage", "./assets/sprites/creative-house-thatch-cottage.png?v=195");
    this.load.image("creative-house-blue-cottage", "./assets/sprites/creative-house-blue-cottage.png?v=195");
    this.load.image("creative-house-red-tower-cottage", "./assets/sprites/creative-house-red-tower-cottage.png?v=195");
    this.load.image("creative-house-blue-arcane-manor", "./assets/sprites/creative-house-blue-arcane-manor.png?v=201");
    this.load.image("creative-house-elf-green-manor", "./assets/sprites/creative-house-elf-green-manor.png?v=201");
    this.load.image("creative-house-blue-gold-tower", "./assets/sprites/creative-house-blue-gold-tower.png?v=201");
    this.load.image("creative-house-teal-roof-manor", "./assets/sprites/creative-house-teal-roof-manor.png?v=201");
    this.load.image("alchemist-interior", "./assets/sprites/alchemist-interior.png?v=146");
    for (let index = 1; index <= 19; index += 1) {
      const padded = String(index).padStart(2, "0");
      this.load.image(`creative-floor-${padded}`, `./assets/tilesets/creative-floor-${padded}.png?v=132`);
    }
    this.load.spritesheet("windmill-house", "./assets/sprites/windmill-house-sheet.png?v=132", {
      frameWidth: 300,
      frameHeight: 388
    });
    this.load.image("reference-tree", "./assets/sprites/reference-tree.png");
    this.load.spritesheet("adventurer-sheet", "./assets/sprites/adventurer-sheet.png", {
      frameWidth: 48,
      frameHeight: 68
    });
    this.load.spritesheet("silver-npc-sheet", "./assets/sprites/silver-npc-sheet.png?v=132", {
      frameWidth: 48,
      frameHeight: 68
    });
    this.load.spritesheet("blond-npc-sheet", "./assets/sprites/blond-npc-sheet.png?v=132", {
      frameWidth: 48,
      frameHeight: 68
    });
    this.load.spritesheet("hooded-sheet", "./assets/sprites/hooded-sheet.png?v=133", {
      frameWidth: 48,
      frameHeight: 68
    });
    this.load.spritesheet("knight-npc-sheet", "./assets/sprites/knight-npc-sheet.png?v=132", {
      frameWidth: 80,
      frameHeight: 84
    });
    this.load.spritesheet("knight-npc-idle-sheet", "./assets/sprites/knight-npc-idle-sheet.png?v=132", {
      frameWidth: 80,
      frameHeight: 84
    });
    this.load.spritesheet("mage-1-sheet", "./assets/sprites/blue-mage-sheet.png?v=132", {
      frameWidth: 56,
      frameHeight: 84
    });
    this.load.spritesheet("mage-1-idle-sheet", "./assets/sprites/blue-mage-idle-sheet.png?v=132", {
      frameWidth: 56,
      frameHeight: 84
    });
    this.load.spritesheet("mage-1-attack-normalized", "./assets/sprites/mage-1-attack-normalized.png?v=176", {
      frameWidth: 56,
      frameHeight: 84
    });
    this.load.spritesheet("mage-1-side-attack-normalized", "./assets/sprites/mage-1-side-attack-normalized.png?v=176", {
      frameWidth: 56,
      frameHeight: 84
    });
    createPixelArtTextures(this);
  }

  create() {
    const params = new URLSearchParams(window.location.search);
    if (params.get("dev") === "1") {
      try {
        localStorage.setItem("eldervalley-dev-mode", "1");
      } catch {
        // Se o navegador bloquear storage, apenas nao persiste o modo dev.
      }
    }
    const isDev = (() => {
      try {
        return localStorage.getItem("eldervalley-dev-mode") === "1";
      } catch {
        return false;
      }
    })();
    const requestedScene = params.get("scene") === "city" ? "CityScene" : "WorldScene";
    const targetScene = isDev ? requestedScene : "WorldScene";
    const spawnKey = params.get("spawnKey") ?? (targetScene === "CityScene" ? "fromVillage" : "start");
    if (isDev && params.get("skipTitle") === "1") {
      this.scene.start(targetScene, { spawnKey });
      return;
    }
    this.scene.start("TitleScene", { targetScene, spawnKey });
  }
}
