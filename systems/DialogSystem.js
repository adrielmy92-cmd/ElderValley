export default class DialogSystem {
  constructor(scene) {
    this.scene = scene;
    this.active = false;
    this.lines = [];
    this.index = 0;
    this.name = "";

    const { width, height } = scene.scale;
    this.container = scene.add.container(0, 0).setScrollFactor(0).setDepth(5000).setVisible(false);
    this.backing = scene.add.rectangle(0, 0, width - 48, 132, 0x111820, 0.9)
      .setOrigin(0, 1)
      .setStrokeStyle(4, 0xf0d8a8, 1);
    this.nameText = scene.add.text(0, 0, "", {
      fontFamily: "monospace",
      fontSize: "18px",
      color: "#ffd26a"
    }).setOrigin(0, 1);
    this.bodyText = scene.add.text(0, 0, "", {
      fontFamily: "monospace",
      fontSize: "18px",
      color: "#ffffff",
      wordWrap: { width: width - 92 },
      lineSpacing: 6
    }).setOrigin(0, 0);
    this.promptText = scene.add.text(0, 0, "Space / Enter", {
      fontFamily: "monospace",
      fontSize: "14px",
      color: "#c9d4df"
    }).setOrigin(1, 1);
    this.container.add([this.backing, this.nameText, this.bodyText, this.promptText]);
    this.layout(width, height);

    scene.scale.on("resize", (gameSize) => this.layout(gameSize.width, gameSize.height));
  }

  layout(width, height) {
    const x = 24;
    const y = height - 24;
    this.backing.setPosition(x, y).setSize(width - 48, 132);
    this.nameText.setPosition(x + 18, y - 96);
    this.bodyText.setPosition(x + 18, y - 86).setWordWrapWidth(width - 92);
    this.promptText.setPosition(width - 42, y - 14);
  }

  show(name, lines) {
    this.active = true;
    this.name = name;
    this.lines = Array.isArray(lines) ? lines : [lines];
    this.index = 0;
    this.container.setVisible(true);
    this.render();
  }

  render() {
    this.nameText.setText(this.name);
    this.bodyText.setText(this.lines[this.index] ?? "");
  }

  advance() {
    if (!this.active) {
      return;
    }

    this.index += 1;
    if (this.index >= this.lines.length) {
      this.close();
      return;
    }

    this.render();
  }

  close() {
    this.active = false;
    this.container.setVisible(false);
  }
}
