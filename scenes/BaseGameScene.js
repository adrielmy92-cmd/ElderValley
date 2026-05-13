import Player from "../player/Player.js?v=130";
import DialogSystem from "../systems/DialogSystem.js?v=130";
import InteractionSystem from "../systems/InteractionSystem.js?v=130";
import ChatSystem from "../systems/ChatSystem.js?v=130";
import MultiplayerSystem from "../systems/MultiplayerSystem.js?v=130";

export default class BaseGameScene extends Phaser.Scene {
  init(data = {}) {
    this.entryData = data;
    this.isTransitioning = false;
  }

  createControls() {
    this.cursors = this.input.keyboard.createCursorKeys();
    this.wasd = this.input.keyboard.addKeys({
      up: Phaser.Input.Keyboard.KeyCodes.W,
      down: Phaser.Input.Keyboard.KeyCodes.S,
      left: Phaser.Input.Keyboard.KeyCodes.A,
      right: Phaser.Input.Keyboard.KeyCodes.D
    });
    this.interactKeys = this.input.keyboard.addKeys({
      e: Phaser.Input.Keyboard.KeyCodes.E,
      space: Phaser.Input.Keyboard.KeyCodes.SPACE,
      enter: Phaser.Input.Keyboard.KeyCodes.ENTER,
      chat: Phaser.Input.Keyboard.KeyCodes.T
    });
  }

  createPlayer(x, y) {
    this.player = new Player(this, x, y);
    this.dialog = new DialogSystem(this);
    this.interactions = new InteractionSystem(this, this.player, this.dialog);
    return this.player;
  }

  createCollisionGroup() {
    this.solids = this.physics.add.staticGroup();
    this.physics.add.collider(this.player, this.solids);
    this.createCollisionDebugControls();
    this.createManualCollisionEditor();
  }

  addSolidRect(x, y, w, h) {
    const zone = this.add.zone(x, y, w, h);
    this.physics.add.existing(zone, true);
    this.solids.add(zone);
    this.redrawCollisionDebug();
    return zone;
  }

  addSolidCircle(x, y, radius) {
    const diameter = radius * 2;
    const zone = this.add.zone(x, y, diameter, diameter);
    this.physics.add.existing(zone, true);
    zone.body.setCircle(radius);
    this.solids.add(zone);
    this.redrawCollisionDebug();
    return zone;
  }

  createCollisionDebugControls() {
    this.collisionDebugEnabled = this.registry.get("collisionDebugEnabled") ?? false;
    this.collisionDebugKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.F3);
    this.collisionDebugGraphics = this.add.graphics().setDepth(5000);
    this.collisionDebugGraphics.skipPerformanceCull = true;
    this.redrawCollisionDebug();
  }

  updateCollisionDebugControls() {
    if (!this.collisionDebugKey) {
      return;
    }

    if (Phaser.Input.Keyboard.JustDown(this.collisionDebugKey)) {
      this.collisionDebugEnabled = !this.collisionDebugEnabled;
      this.registry.set("collisionDebugEnabled", this.collisionDebugEnabled);
      this.redrawCollisionDebug();
      return;
    }

    if (this.collisionDebugEnabled && this.time.now - (this.lastCollisionDebugDraw ?? 0) > 250) {
      this.lastCollisionDebugDraw = this.time.now;
      this.redrawCollisionDebug();
    }
  }

  redrawCollisionDebug() {
    if (!this.collisionDebugGraphics) {
      return;
    }

    const graphics = this.collisionDebugGraphics;
    graphics.clear();
    if (!this.collisionDebugEnabled || !this.solids) {
      return;
    }

    graphics.lineStyle(2, 0xff2f46, 0.95);
    graphics.fillStyle(0xff2f46, 0.16);
    this.solids.getChildren().forEach((solid) => {
      const body = solid.body;
      if (!body) {
        return;
      }
      if (body.isCircle) {
        const radius = body.radius ?? body.width / 2;
        graphics.fillCircle(body.x + radius, body.y + radius, radius);
        graphics.strokeCircle(body.x + radius, body.y + radius, radius);
        return;
      }
      graphics.fillRect(body.x, body.y, body.width, body.height);
      graphics.strokeRect(body.x, body.y, body.width, body.height);
    });
  }

  createManualCollisionEditor() {
    if (!this.manualCollisionStorageKey) {
      return;
    }

    this.input.mouse?.disableContextMenu();
    this.manualCollisionRects = [];
    this.manualCollisionEditorEnabled = false;
    this.manualCollisionShape = "rect";
    this.manualCollisionEditorKeys = this.input.keyboard.addKeys({
      toggle: Phaser.Input.Keyboard.KeyCodes.F4,
      reset: Phaser.Input.Keyboard.KeyCodes.R,
      shape: Phaser.Input.Keyboard.KeyCodes.C
    });
    this.manualCollisionEditorGraphics = this.add.graphics().setDepth(5100);
    this.manualCollisionEditorGraphics.skipPerformanceCull = true;
    this.manualCollisionEditorText = this.add.text(18, 76, "", {
      fontFamily: "monospace",
      fontSize: "13px",
      color: "#ffffff",
      backgroundColor: "#2c1b1b",
      padding: { left: 8, right: 8, top: 5, bottom: 5 }
    }).setScrollFactor(0).setDepth(5200).setVisible(false);

    this.input.on("pointerdown", this.handleManualCollisionPointerDown, this);
    this.input.on("pointermove", this.handleManualCollisionPointerMove, this);
    this.input.on("pointerup", this.handleManualCollisionPointerUp, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.input.off("pointerdown", this.handleManualCollisionPointerDown, this);
      this.input.off("pointermove", this.handleManualCollisionPointerMove, this);
      this.input.off("pointerup", this.handleManualCollisionPointerUp, this);
    });
  }

  updateManualCollisionEditorControls() {
    if (!this.manualCollisionEditorKeys) {
      return;
    }

    if (Phaser.Input.Keyboard.JustDown(this.manualCollisionEditorKeys.toggle)) {
      this.manualCollisionEditorEnabled = !this.manualCollisionEditorEnabled;
      this.collisionDebugEnabled = this.manualCollisionEditorEnabled || this.collisionDebugEnabled;
      this.registry.set("collisionDebugEnabled", this.collisionDebugEnabled);
      this.redrawCollisionDebug();
      this.redrawManualCollisionEditor();
    }

    if (this.manualCollisionEditorEnabled && Phaser.Input.Keyboard.JustDown(this.manualCollisionEditorKeys.reset)) {
      this.resetManualCollisionLayout();
    }

    if (this.manualCollisionEditorEnabled && Phaser.Input.Keyboard.JustDown(this.manualCollisionEditorKeys.shape)) {
      this.manualCollisionShape = this.manualCollisionShape === "rect" ? "circle" : "rect";
      this.redrawManualCollisionEditor();
    }
  }

  setManualCollisionDefaults(rects) {
    this.manualCollisionDefaultRects = rects.map((rect) => ({ ...rect }));
  }

  loadManualCollisionLayout(defaultRects = this.manualCollisionDefaultRects ?? []) {
    this.setManualCollisionDefaults(defaultRects);
    let saved = null;
    let hasLocalSave = false;
    try {
      const raw = localStorage.getItem(this.manualCollisionStorageKey);
      hasLocalSave = raw !== null;
      saved = JSON.parse(raw ?? "null");
    } catch {
      saved = null;
    }

    const rects = Array.isArray(saved) ? saved : this.manualCollisionDefaultRects;
    this.replaceManualCollisionLayout(rects, false);
    this.syncManualCollisionLayout(saved, hasLocalSave);
  }

  replaceManualCollisionLayout(shapes, shouldSave = true) {
    this.manualCollisionRects?.forEach((rect) => rect.zone?.destroy());
    this.manualCollisionRects = [];
    shapes.forEach((shape) => {
      if (shape?.type === "circle") {
        this.addManualCollisionCircle(shape, false);
        return;
      }
      this.addManualCollisionRect(shape, false);
    });
    if (shouldSave) {
      this.saveManualCollisionLayout({ syncRemote: true });
    }
    this.redrawCollisionDebug();
    this.redrawManualCollisionEditor();
  }

  async loadRemoteManualCollisionLayout() {
    if (!this.manualCollisionStorageKey || window.location.protocol === "file:") {
      return;
    }

    try {
      const remote = await this.readRemoteManualCollisionLayout();
      if (Array.isArray(remote)) {
        this.replaceManualCollisionLayout(remote, false);
        this.writeLocalManualCollisionLayout(remote);
      }
    } catch {
      // Se o servidor nao tiver API, o localStorage ainda funciona.
    }
  }

  async syncManualCollisionLayout(localShapes, hasLocalSave) {
    if (!this.manualCollisionStorageKey || window.location.protocol === "file:") {
      return;
    }

    try {
      const remote = await this.readRemoteManualCollisionLayout();
      if (Array.isArray(remote)) {
        this.replaceManualCollisionLayout(remote, false);
        this.writeLocalManualCollisionLayout(remote);
        return;
      }
      if (hasLocalSave && Array.isArray(localShapes)) {
        this.saveRemoteManualCollisionLayout(localShapes);
      }
    } catch {
      // Sem API remota, fica so no localStorage.
    }
  }

  async readRemoteManualCollisionLayout() {
    const response = await fetch(`/api/storage/${encodeURIComponent(this.manualCollisionStorageKey)}`, {
      cache: "no-store"
    });
    const payload = await response.json();
    return payload?.data;
  }

  writeLocalManualCollisionLayout(data) {
    try {
      localStorage.setItem(this.manualCollisionStorageKey, JSON.stringify(data));
    } catch {
      // Continua usando a copia do servidor.
    }
  }

  addManualCollisionRect(rect, shouldSave = true) {
    if (!rect || rect.w < 6 || rect.h < 6) {
      return null;
    }

    const normalized = {
      type: "rect",
      x: Math.round(rect.x),
      y: Math.round(rect.y),
      w: Math.round(rect.w),
      h: Math.round(rect.h)
    };
    const zone = this.addSolidRect(normalized.x, normalized.y, normalized.w, normalized.h);
    this.manualCollisionRects ??= [];
    this.manualCollisionRects.push({ ...normalized, zone });
    if (shouldSave) {
      this.saveManualCollisionLayout();
      this.redrawManualCollisionEditor();
    }
    return zone;
  }

  addManualCollisionCircle(circle, shouldSave = true) {
    if (!circle || circle.r < 4) {
      return null;
    }

    const normalized = {
      type: "circle",
      x: Math.round(circle.x),
      y: Math.round(circle.y),
      r: Math.round(circle.r)
    };
    const zone = this.addSolidCircle(normalized.x, normalized.y, normalized.r);
    this.manualCollisionRects ??= [];
    this.manualCollisionRects.push({ ...normalized, zone });
    if (shouldSave) {
      this.saveManualCollisionLayout();
      this.redrawManualCollisionEditor();
    }
    return zone;
  }

  removeManualCollisionAt(x, y) {
    if (!this.manualCollisionRects?.length) {
      return false;
    }

    for (let index = this.manualCollisionRects.length - 1; index >= 0; index -= 1) {
      const rect = this.manualCollisionRects[index];
      const inside = rect.type === "circle"
        ? Phaser.Math.Distance.Between(x, y, rect.x, rect.y) <= rect.r
        : x >= rect.x - rect.w / 2 && x <= rect.x + rect.w / 2 && y >= rect.y - rect.h / 2 && y <= rect.y + rect.h / 2;
      if (inside) {
        this.manualCollisionRects.splice(index, 1);
        rect.zone?.destroy();
        this.saveManualCollisionLayout();
        this.redrawCollisionDebug();
        this.redrawManualCollisionEditor();
        return true;
      }
    }
    return false;
  }

  resetManualCollisionLayout() {
    this.replaceManualCollisionLayout(this.manualCollisionDefaultRects ?? []);
  }

  saveManualCollisionLayout(options = {}) {
    if (!this.manualCollisionStorageKey) {
      return;
    }

    const data = (this.manualCollisionRects ?? []).map(({ type = "rect", x, y, w, h, r }) => (
      type === "circle" ? { type, x, y, r } : { type: "rect", x, y, w, h }
    ));
    try {
      localStorage.setItem(this.manualCollisionStorageKey, JSON.stringify(data));
    } catch {
      // O editor continua funcionando mesmo se o storage estiver bloqueado.
    }
    if (options.syncRemote !== false) {
      this.saveRemoteManualCollisionLayout(data);
    }
  }

  async saveRemoteManualCollisionLayout(data) {
    if (!this.manualCollisionStorageKey || window.location.protocol === "file:") {
      return;
    }

    try {
      await fetch(`/api/storage/${encodeURIComponent(this.manualCollisionStorageKey)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        keepalive: true
      });
    } catch {
      // O localStorage continua sendo o fallback.
    }
  }

  getManualCollisionPointerWorldPoint(pointer = this.input.activePointer) {
    const point = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
    return {
      x: Math.round(point.x / 8) * 8,
      y: Math.round(point.y / 8) * 8
    };
  }

  handleManualCollisionPointerDown(pointer) {
    if (!this.manualCollisionEditorEnabled || pointer.y < 58) {
      return;
    }

    const point = this.getManualCollisionPointerWorldPoint(pointer);
    if (pointer.rightButtonDown()) {
      this.removeManualCollisionAt(point.x, point.y);
      return;
    }

    this.manualCollisionDragStart = point;
    this.manualCollisionDragEnd = point;
    this.redrawManualCollisionEditor();
  }

  handleManualCollisionPointerMove(pointer) {
    if (!this.manualCollisionEditorEnabled || !this.manualCollisionDragStart || !pointer.isDown) {
      return;
    }

    this.manualCollisionDragEnd = this.getManualCollisionPointerWorldPoint(pointer);
    this.redrawManualCollisionEditor();
  }

  handleManualCollisionPointerUp() {
    if (!this.manualCollisionEditorEnabled || !this.manualCollisionDragStart || !this.manualCollisionDragEnd) {
      return;
    }

    const start = this.manualCollisionDragStart;
    const end = this.manualCollisionDragEnd;
    const shape = this.manualCollisionShape ?? "rect";

    this.manualCollisionDragStart = null;
    this.manualCollisionDragEnd = null;
    if (shape === "circle") {
      this.addManualCollisionCircle({
        x: start.x,
        y: start.y,
        r: Phaser.Math.Distance.Between(start.x, start.y, end.x, end.y)
      });
      return;
    }

    this.addManualCollisionRect({
      x: Math.round((start.x + end.x) / 2),
      y: Math.round((start.y + end.y) / 2),
      w: Math.abs(end.x - start.x),
      h: Math.abs(end.y - start.y)
    });
  }

  redrawManualCollisionEditor() {
    if (!this.manualCollisionEditorGraphics) {
      return;
    }

    this.manualCollisionEditorGraphics.clear();
    this.manualCollisionEditorText?.setVisible(this.manualCollisionEditorEnabled);
    if (!this.manualCollisionEditorEnabled) {
      return;
    }

    const shapeLabel = this.manualCollisionShape === "circle" ? "redondo" : "retangulo";
    this.manualCollisionEditorText?.setText(`Editor colisao: ${shapeLabel} | C muda forma | arraste cria | direito remove | R restaura | F4 fecha`);
    this.manualCollisionEditorGraphics.lineStyle(2, 0xffd166, 0.95);
    this.manualCollisionEditorGraphics.fillStyle(0xffd166, 0.12);
    this.manualCollisionRects?.forEach((rect) => {
      if (rect.type === "circle") {
        this.manualCollisionEditorGraphics.strokeCircle(rect.x, rect.y, rect.r);
        return;
      }
      this.manualCollisionEditorGraphics.strokeRect(rect.x - rect.w / 2, rect.y - rect.h / 2, rect.w, rect.h);
    });

    if (this.manualCollisionDragStart && this.manualCollisionDragEnd) {
      const start = this.manualCollisionDragStart;
      const end = this.manualCollisionDragEnd;
      if (this.manualCollisionShape === "circle") {
        const radius = Phaser.Math.Distance.Between(start.x, start.y, end.x, end.y);
        this.manualCollisionEditorGraphics.fillCircle(start.x, start.y, radius);
        this.manualCollisionEditorGraphics.strokeCircle(start.x, start.y, radius);
        return;
      }
      const x = Math.min(start.x, end.x);
      const y = Math.min(start.y, end.y);
      const w = Math.abs(end.x - start.x);
      const h = Math.abs(end.y - start.y);
      this.manualCollisionEditorGraphics.fillRect(x, y, w, h);
      this.manualCollisionEditorGraphics.strokeRect(x, y, w, h);
    }
  }

  addSolidImage(x, y, key, options = {}) {
    const image = this.add.image(x, y, key).setOrigin(options.originX ?? 0.5, options.originY ?? 1);
    image.setDepth(options.depth ?? y);
    const bodyWidth = options.bodyWidth ?? image.width * 0.7;
    const bodyHeight = options.bodyHeight ?? image.height * 0.28;
    const offsetY = options.offsetY ?? -bodyHeight / 2;
    this.addSolidRect(x, y + offsetY, bodyWidth, bodyHeight);
    return image;
  }

  createHud() {
    this.hudTitle = this.add.text(18, 16, "ElderValley", {
      fontFamily: "monospace",
      fontSize: "20px",
      color: "#ffffff",
      stroke: "#1a202b",
      strokeThickness: 4
    }).setScrollFactor(0).setDepth(3000);

    this.hudHint = this.add.text(18, 44, "WASD / Setas para andar  |  E/Espaco interagir  |  T/Enter chat", {
      fontFamily: "monospace",
      fontSize: "13px",
      color: "#d9e5ef",
      stroke: "#1a202b",
      strokeThickness: 3
    }).setScrollFactor(0).setDepth(3000);

    this.cardIcon = this.add.image(0, 0, "card-icon").setScrollFactor(0).setDepth(3000);
    this.inventoryText = this.add.text(0, 0, "x0", {
      fontFamily: "monospace",
      fontSize: "18px",
      color: "#ffffff",
      stroke: "#1a202b",
      strokeThickness: 4
    }).setScrollFactor(0).setDepth(3000);
    this.layoutHud(this.scale.width);
    this.handleHudResize = (gameSize) => this.layoutHud(gameSize.width);
    this.scale.on("resize", this.handleHudResize);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      if (this.handleHudResize) {
        this.scale.off("resize", this.handleHudResize);
      }
    });
    this.updateInventoryHud();
    this.chat ??= new ChatSystem(this);
    this.multiplayer ??= new MultiplayerSystem(this);
  }

  layoutHud(width) {
    if (!this.cardIcon) {
      return;
    }
    this.cardIcon.setPosition(width - 72, 28);
    this.inventoryText.setPosition(width - 52, 18);
  }

  updateInventoryHud() {
    const inventory = this.registry.get("inventory") ?? [];
    this.inventoryText?.setText(`x${inventory.length}`);
  }

  addCardToInventory(cardName) {
    const inventory = [...(this.registry.get("inventory") ?? [])];
    inventory.push(cardName);
    this.registry.set("inventory", inventory);
    this.updateInventoryHud();
  }

  fadeTo(sceneKey, data) {
    if (this.isTransitioning) {
      return;
    }

    this.isTransitioning = true;
    this.player?.setVelocity(0, 0);
    this.input.keyboard.resetKeys();
    this.time.delayedCall(0, () => {
      this.scene.start(sceneKey, data);
    });
  }

  updateBase() {
    if (this.isTransitioning) {
      return;
    }

    if (!this.player || !this.interactKeys || !this.interactions || !this.dialog) {
      return;
    }

    this.updateCollisionDebugControls();
    this.updateManualCollisionEditorControls();
    this.chat?.update();
    this.multiplayer?.update(this.time.now);

    if (this.manualCollisionEditorEnabled) {
      this.player.setVelocity(0, 0);
      this.interactions.update();
      return;
    }

    if (this.chat?.active) {
      this.player.update(this.cursors, this.wasd, true);
      this.interactions.update();
      return;
    }

    if (!this.dialog.active && Phaser.Input.Keyboard.JustDown(this.interactKeys.chat)) {
      this.chat?.open();
      this.player.update(this.cursors, this.wasd, true);
      return;
    }

    const enterPressed = Phaser.Input.Keyboard.JustDown(this.interactKeys.enter);
    if (!this.dialog.active && enterPressed && !this.interactions.nearest) {
      this.chat?.open();
      this.player.update(this.cursors, this.wasd, true);
      return;
    }

    const pressedInteract = Phaser.Input.Keyboard.JustDown(this.interactKeys.e)
      || Phaser.Input.Keyboard.JustDown(this.interactKeys.space)
      || enterPressed;

    if (pressedInteract) {
      this.interactions.interact();
      if (this.isTransitioning) {
        return;
      }
    }

    this.player.update(this.cursors, this.wasd, this.dialog.active);
    this.interactions.update();
  }
}
