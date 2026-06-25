export default class WindmillLoadScene extends Phaser.Scene {
  constructor() {
    super("WindmillLoadScene");
  }

  init(data = {}) {
    this.entryData = data;
  }

  preload() {
    this.cameras.main.setBackgroundColor("#151b22");
    this.add.text(24, 24, "Loading windmill...", {
      fontFamily: "monospace",
      fontSize: "18px",
      color: "#ffffff",
      stroke: "#1a202b",
      strokeThickness: 4
    }).setDepth(3000);

    if (!this.textures.exists("windmill-interior-test")) {
      this.load.image("windmill-interior-test", "./assets/sprites/windmill-interior-test.png?v=140");
    }
  }

  create() {
    this.scene.start("WindmillInteriorScene", this.entryData);
  }
}
