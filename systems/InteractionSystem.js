export default class InteractionSystem {
  constructor(scene, player, dialogSystem) {
    this.scene = scene;
    this.player = player;
    this.dialogSystem = dialogSystem;
    this.items = [];
    this.nearest = null;
    this.prompt = scene.add.text(0, 0, "E", {
      fontFamily: "monospace",
      fontSize: "16px",
      color: "#1e2430",
      backgroundColor: "#f5d77e",
      padding: { left: 8, right: 8, top: 4, bottom: 4 }
    }).setOrigin(0.5).setDepth(2000).setVisible(false);
  }

  add(item) {
    if (item.radius == null) item.radius = 42;
    this.items.push(item);
  }

  remove(itemOrId) {
    const id = typeof itemOrId === "string" ? itemOrId : itemOrId?.id;
    this.items = this.items.filter((item) => item !== itemOrId && (!id || item.id !== id));
    if (this.nearest === itemOrId || (id && this.nearest?.id === id)) {
      this.nearest = null;
      this.prompt.setVisible(false);
    }
  }

  update() {
    let best = null;
    let bestDistance = Infinity;
    for (const item of this.items) {
      if (item.enabled && !item.enabled()) {
        continue;
      }
      const distance = Phaser.Math.Distance.Between(this.player.x, this.player.y, item.x, item.y);
      if (distance < item.radius && distance < bestDistance) {
        best = item;
        bestDistance = distance;
      }
    }

    this.nearest = best;
    if (!best || this.dialogSystem.active) {
      this.prompt.setVisible(false);
      return;
    }

    this.prompt
      .setPosition(best.promptX ?? best.x, best.promptY ?? best.y - 28)
      .setText(best.promptText ?? "E")
      .setVisible(true);
  }

  interact() {
    if (this.dialogSystem.active) {
      this.dialogSystem.advance();
      return true;
    }

    if (!this.nearest) {
      return false;
    }

    this.nearest.onInteract();
    return true;
  }
}
