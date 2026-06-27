import { createPixelArtTextures } from "../systems/PixelArtFactory.js?v=154";

export default class PreloadScene extends Phaser.Scene {
  constructor() {
    super("PreloadScene");
  }

  preload() {
    this.load.video("title-intro", "./assets/videos/eldervalley-title.mp4?v=143", "loadeddata", false, true);
    this.load.audio("title-theme", "./assets/audio/title-theme.mp3?v=143");
    this.load.svg("wallet-metamask", "./assets/ui/metamask-icon.svg?v=172", { width: 128, height: 128 });
    this.load.svg("wallet-phantom", "./assets/ui/phantom-icon.svg?v=172", { width: 128, height: 128 });
    this.load.svg("opensea-logo", "./assets/ui/opensea-icon.svg?v=12", { width: 128, height: 128 });
    this.load.svg("x-logo", "./assets/ui/x-icon.svg?v=12", { width: 128, height: 128 });
    this.load.svg("pumpfun-logo", "./assets/ui/pumpfun-icon.svg?v=12", { width: 128, height: 128 });
    this.load.svg("docs-logo", "./assets/ui/docs-icon.svg?v=12", { width: 128, height: 128 });
    this.load.image("creative-house-tavern", "./assets/sprites/creative-house-tavern.png?v=143");
    this.load.image("creative-house-manor", "./assets/sprites/creative-house-manor.png?v=143");
    this.load.image("creative-house-cottage", "./assets/sprites/creative-house-cottage.png?v=143");
    this.load.image("creative-house-blue-market", "./assets/sprites/creative-house-blue-market.png?v=143");
    this.load.image("creative-house-red-lodge", "./assets/sprites/creative-house-red-lodge.png?v=143");
    this.load.image("creative-house-green-cottage", "./assets/sprites/creative-house-green-cottage.png?v=143");
    this.load.image("creative-house-alchemist", "./assets/sprites/creative-house-alchemist.png?v=155");
    this.load.image("creative-house-ivy-manor", "./assets/sprites/creative-house-ivy-manor.png?v=209");
    this.load.image("creative-house-thatch-cottage", "./assets/sprites/creative-house-thatch-cottage.png?v=206");
    this.load.image("creative-house-blue-cottage", "./assets/sprites/creative-house-blue-cottage.png?v=206");
    this.load.image("creative-house-red-tower-cottage", "./assets/sprites/creative-house-red-tower-cottage.png?v=206");
    this.load.image("creative-house-blue-arcane-manor", "./assets/sprites/creative-house-blue-arcane-manor.png?v=212");
    this.load.image("creative-house-elf-green-manor", "./assets/sprites/creative-house-elf-green-manor.png?v=212");
    this.load.image("creative-house-blue-gold-tower", "./assets/sprites/creative-house-blue-gold-tower.png?v=212");
    this.load.image("creative-house-teal-roof-manor", "./assets/sprites/creative-house-teal-roof-manor.png?v=212");
    this.load.spritesheet("adventurer-sheet", "./assets/sprites/adventurer-sheet.png", {
      frameWidth: 48,
      frameHeight: 68
    });
    this.load.spritesheet("mage-1-sheet", "./assets/sprites/blue-mage-sheet.png?v=143", {
      frameWidth: 56,
      frameHeight: 84
    });
    this.load.spritesheet("mage-1-idle-sheet", "./assets/sprites/blue-mage-idle-sheet.png?v=143", {
      frameWidth: 56,
      frameHeight: 84
    });
    this.load.spritesheet("mage-1-attack-normalized", "./assets/sprites/mage-1-attack-normalized.png?v=187", {
      frameWidth: 56,
      frameHeight: 84
    });
    this.load.spritesheet("mage-1-side-attack-normalized", "./assets/sprites/mage-1-side-attack-normalized.png?v=187", {
      frameWidth: 56,
      frameHeight: 84
    });
    this.load.spritesheet("dark-wanderer-sheet", "./assets/sprites/dark-wanderer-sheet.png?v=14", {
      frameWidth: 96,
      frameHeight: 128
    });
    this.load.spritesheet("warrior-walk-sheet", "./assets/sprites/warrior-walk-sheet.png?v=13", {
      frameWidth: 82,
      frameHeight: 84
    });
    this.load.spritesheet("warrior-attack-sheet", "./assets/sprites/warrior-attack-sheet.png?v=13", {
      frameWidth: 82,
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
        // If the browser blocks storage, dev mode simply does not persist.
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
      this.scene.start("GamePreloadScene", { targetScene, spawnKey });
      return;
    }
    this.scene.start("TitleScene", { targetScene, spawnKey });
  }
}
