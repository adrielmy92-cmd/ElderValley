export default class BootScene extends Phaser.Scene {
  constructor() {
    super("BootScene");
  }

  create() {
    this.registry.set("inventory", []);
    this.registry.set("openedChests", {});
    this.scene.start("PreloadScene");
  }
}
