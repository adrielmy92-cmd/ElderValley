import Player from "../player/Player.js?v=190";
import DialogSystem from "../systems/DialogSystem.js?v=133";
import InteractionSystem from "../systems/InteractionSystem.js?v=133";
import ChatSystem from "../systems/ChatSystem.js?v=209";
import MultiplayerSystem from "../systems/MultiplayerSystem.js?v=226";
import MobileControls from "../systems/MobileControls.js?v=1";
import Inventory, { itemData } from "../systems/Inventory.js?v=6";
import InventoryUI from "../systems/InventoryUI.js?v=9";
import Leveling from "../systems/Leveling.js?v=3";

export default class BaseGameScene extends Phaser.Scene {
  init(data = {}) {
    this.entryData = data;
    this.isTransitioning = false;
    this.captureDevModeFromUrl();
  }

  captureDevModeFromUrl() {
    const params = new URLSearchParams(window.location.search);
    const adminToken = params.get("admin") ?? params.get("devToken");
    try {
      if (params.get("dev") === "1" || adminToken) {
        localStorage.setItem("eldervalley-dev-mode", "1");
      }
      if (adminToken) {
        localStorage.setItem("eldervalley-admin-token", adminToken);
      }
    } catch {
      // O jogo continua, apenas sem persistir o acesso dev.
    }
  }

  isDevMode() {
    try {
      const profile = this.registry.get("playerProfile");
      if (profile?.isDeveloper) {
        return true;
      }
      return localStorage.getItem("eldervalley-dev-mode") === "1"
        || Boolean(localStorage.getItem("eldervalley-admin-token"));
    } catch {
      return false;
    }
  }

  getAdminStorageToken() {
    try {
      return localStorage.getItem("eldervalley-admin-token") ?? "";
    } catch {
      return "";
    }
  }

  addAdminStorageHeaders(headers = {}) {
    const sessionToken = this.registry.get("playerSessionToken") ?? localStorage.getItem("eldervalley-session-token");
    const token = this.getAdminStorageToken();
    const nextHeaders = { ...headers };
    if (sessionToken) {
      nextHeaders.Authorization = `Bearer ${sessionToken}`;
    }
    if (token) {
      nextHeaders["X-ElderValley-Admin-Token"] = token;
    }
    return nextHeaders;
  }

  showDevOnlyNotice() {
    this.dialog?.show("DEV", "This feature is exclusive to the developer.");
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
      chat: Phaser.Input.Keyboard.KeyCodes.T,
      attack: Phaser.Input.Keyboard.KeyCodes.Q,
      spell1: Phaser.Input.Keyboard.KeyCodes.ONE,
      spell2: Phaser.Input.Keyboard.KeyCodes.TWO,
      inventory: Phaser.Input.Keyboard.KeyCodes.I,
      shots: Phaser.Input.Keyboard.KeyCodes.G
    });
  }

  createPlayer(x, y) {
    this.player = new Player(this, x, y);
    this.dialog = new DialogSystem(this);
    this.interactions = new InteractionSystem(this, this.player, this.dialog);
    this.bag = new Inventory(this);
    this.leveling = new Leveling(this);
    this.inventoryUI = new InventoryUI(this);
    this.applyMoveSpeed();
    this._potCooldownUntil = { hp: 0, mp: 0 };
    this.shotsEnabled = this.shotsEnabled ?? true;
    this._castMult = 1;
    this._castAtk = 0;
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
      if (!this.isDevMode()) {
        this.showDevOnlyNotice();
        return;
      }
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
      this.saveManualCollisionLayout();
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
      // If the server API is unavailable, localStorage still works.
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
        this.writeLocalManualCollisionLayout(localShapes);
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

  handleSharedStorageUpdate(payload) {
    if (!payload || payload.key !== this.manualCollisionStorageKey || !Array.isArray(payload.data)) {
      return false;
    }
    this.writeLocalManualCollisionLayout(payload.data);
    this.replaceManualCollisionLayout(payload.data, false);
    return true;
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
    this.setCreativeDirty?.(true);
    if (options.syncRemote === true) {
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
        headers: this.addAdminStorageHeaders({ "Content-Type": "application/json" }),
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

    const shapeLabel = this.manualCollisionShape === "circle" ? "circle" : "rectangle";
    this.manualCollisionEditorText?.setText(`Collision editor: ${shapeLabel} | C changes shape | drag to create | right-click removes | R restore | F4 close`);
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

    this.hudHint = this.add.text(18, 44, "WASD / Arrows to move  |  E/Space interact  |  T/Enter chat", {
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
    this.clockText = this.add.text(0, 0, "08:00", {
      fontFamily: "monospace",
      fontSize: "16px",
      color: "#ffe6a8",
      stroke: "#1a202b",
      strokeThickness: 4
    }).setScrollFactor(0).setDepth(3000);
    this.coinText = this.add.text(0, 0, "Coins: 0", {
      fontFamily: "monospace",
      fontSize: "16px",
      color: "#ffd66b",
      stroke: "#1a202b",
      strokeThickness: 4
    }).setScrollFactor(0).setDepth(3000);
    if (typeof this.registry.get("worldClockMinutes") !== "number") {
      this.registry.set("worldClockMinutes", 8 * 60);
    }
    this.clockMinutesPerSecond = 5;
    this.clockMinuteCarry = 0;
    this.lastClockTick = this.time.now;
    this.layoutHud(this.scale.width);
    this.handleHudResize = (gameSize) => {
      this.layoutHud(gameSize.width);
      this.layoutSpellBar(gameSize.width, gameSize.height);
    };
    this.scale.on("resize", this.handleHudResize);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      if (this.handleHudResize) {
        this.scale.off("resize", this.handleHudResize);
      }
    });
    this.createPlayerHpBar();
    if (!this.player?.profile?.melee) this.createSpellBar(); // mage spells only
    this.updateInventoryHud();
    this.updateClockHud();
    this.updateCurrencyHud();
    if (this.input.keyboard) {
      this.input.keyboard.enabled = true;
      this.input.keyboard.resetKeys();
    }
    if (!this.chat || this.chat.destroyed || !this.chat.root?.isConnected) {
      this.chat = new ChatSystem(this);
    }
    if (!this.multiplayer || this.multiplayer.destroyed) {
      this.multiplayer = new MultiplayerSystem(this);
    }
    this.createProfilePersistence();
    this.mobileControls = new MobileControls(this);
  }

  createSpellBar() {
    const DEPTH = 3000;
    const SLOT_W = 52, SLOT_H = 44, GAP = 6;
    const spells = [
      { key: "1", name: "Fire", bgColor: 0x5c1a00, borderColor: 0xff6a00, iconColors: ["#ff6a00", "#ffb829", "#fff4a3"], label: "Fire" },
      { key: "2", name: "Arcane Lightning", bgColor: 0x001a3a, borderColor: 0x29b6f6, iconColors: ["#1a8fff", "#a8f4ff", "#ffffff"], label: "Lightning" }
    ];

    this.spellSlots = spells.map((spell, i) => {
      const container = this.add.container(0, 0).setScrollFactor(0).setDepth(DEPTH);

      const bg = this.add.graphics();
      bg.fillStyle(spell.bgColor, 0.88);
      bg.fillRoundedRect(0, 0, SLOT_W, SLOT_H, 6);
      bg.lineStyle(2, spell.borderColor, 1);
      bg.strokeRoundedRect(0, 0, SLOT_W, SLOT_H, 6);

      const keyLabel = this.add.text(5, 4, `[${spell.key}]`, {
        fontFamily: "monospace", fontSize: "10px",
        color: "#" + spell.borderColor.toString(16).padStart(6, "0"),
        stroke: "#000000", strokeThickness: 2
      });

      // mini icon pixel
      const iconG = this.add.graphics();
      if (i === 0) {
        // fire icon
        iconG.fillStyle(0xf05a16, 1); iconG.fillRect(20, 18, 12, 8);
        iconG.fillStyle(0xffb629, 1); iconG.fillRect(22, 14, 8, 8);
        iconG.fillStyle(0xfff4a3, 1); iconG.fillRect(24, 12, 4, 6);
      } else {
        // lightning icon
        iconG.fillStyle(0x006fe0, 1); iconG.fillRect(18, 17, 16, 4);
        iconG.fillStyle(0x29b6f6, 1); iconG.fillRect(20, 16, 12, 3);
        iconG.fillStyle(0xffffff, 1);
        iconG.fillRect(22, 17, 8, 1);
        iconG.fillRect(18, 13, 6, 3); iconG.fillRect(28, 20, 6, 3);
      }

      const nameLabel = this.add.text(SLOT_W / 2, SLOT_H - 10, spell.label, {
        fontFamily: "monospace", fontSize: "9px",
        color: "#ffffff", stroke: "#000000", strokeThickness: 2
      }).setOrigin(0.5, 0.5);

      // overlay de cooldown (só para o slot do raio, índice 1)
      const cdOverlay = this.add.graphics();
      const cdText = this.add.text(SLOT_W / 2, SLOT_H / 2 - 2, "", {
        fontFamily: "monospace", fontSize: "16px", fontStyle: "bold",
        color: "#ffffff", stroke: "#000000", strokeThickness: 3
      }).setOrigin(0.5, 0.5).setAlpha(0);

      container.add([bg, keyLabel, iconG, nameLabel, cdOverlay, cdText]);
      container._slotIndex = i;
      return { container, bg, spell, cdOverlay, cdText };
    });

    this._lightningCooldownEnd = 0;
    this._spellBarActive = 0;
    this._spellSlotW = SLOT_W;
    this._spellSlotGap = GAP;
    this._spellBarTotalW = spells.length * SLOT_W + (spells.length - 1) * GAP;
    this.layoutSpellBar(this.scale.width, this.scale.height);
  }

  layoutSpellBar(width, height) {
    if (!this.spellSlots) return;
    const SLOT_W = this._spellSlotW ?? 52;
    const GAP = this._spellSlotGap ?? 6;
    const totalW = this._spellBarTotalW ?? (2 * SLOT_W + GAP);
    const startX = Math.floor((width - totalW) / 2);
    const Y = height - 56;
    this.spellSlots.forEach(({ container }, i) => {
      container.setPosition(startX + i * (SLOT_W + GAP), Y);
    });
  }

  createPlayerHpBar() {
    const b = this.bag?.bonuses() ?? {};
    this.playerMaxHp = 100 + (b.maxHp ?? 0) + (this.leveling?.bonusHp() ?? 0);
    this.playerHp = this.playerHp ?? this.playerMaxHp;
    this.playerMaxMp = 50 + (b.maxMp ?? 0);
    this.playerMp = this.playerMp ?? this.playerMaxMp;
    this.playerInvincible = false;

    const BAR_W = 160;
    const BAR_H = 14;
    const X = 16;
    const Y = 72;
    const DEPTH = 3000;

    this.hpLabel = this.add.text(X, Y - 2, "❤ HP", {
      fontFamily: "monospace", fontSize: "12px",
      color: "#ff6666", stroke: "#1a202b", strokeThickness: 3
    }).setScrollFactor(0).setDepth(DEPTH);

    this.hpBarBg = this.add.graphics().setScrollFactor(0).setDepth(DEPTH);
    this.hpBarFg = this.add.graphics().setScrollFactor(0).setDepth(DEPTH + 1);
    this.hpBarBg.fillStyle(0x1a0000, 0.85);
    this.hpBarBg.fillRoundedRect(X + 38, Y - 1, BAR_W, BAR_H + 2, 4);

    this.hpValueText = this.add.text(X + 38 + BAR_W + 6, Y - 1, "", {
      fontFamily: "monospace", fontSize: "12px",
      color: "#ffcccc", stroke: "#1a202b", strokeThickness: 3
    }).setScrollFactor(0).setDepth(DEPTH);

    this._hpBarW = BAR_W;
    this._hpBarX = X + 38;
    this._hpBarY = Y;

    // MP bar, just below HP.
    const MY = Y + 22;
    this.mpLabel = this.add.text(X, MY - 2, "✦ MP", {
      fontFamily: "monospace", fontSize: "12px",
      color: "#6fb6ff", stroke: "#1a202b", strokeThickness: 3
    }).setScrollFactor(0).setDepth(DEPTH);
    this.mpBarBg = this.add.graphics().setScrollFactor(0).setDepth(DEPTH);
    this.mpBarFg = this.add.graphics().setScrollFactor(0).setDepth(DEPTH + 1);
    this.mpBarBg.fillStyle(0x00121a, 0.85);
    this.mpBarBg.fillRoundedRect(X + 38, MY - 1, BAR_W, BAR_H + 2, 4);
    this.mpValueText = this.add.text(X + 38 + BAR_W + 6, MY - 1, "", {
      fontFamily: "monospace", fontSize: "12px",
      color: "#bfe0ff", stroke: "#1a202b", strokeThickness: 3
    }).setScrollFactor(0).setDepth(DEPTH);
    this._mpBarX = X + 38;
    this._mpBarY = MY;

    // Spiritshot indicator, below the MP bar.
    this.shotText = this.add.text(X, MY + 22, "", {
      fontFamily: "monospace", fontSize: "12px",
      color: "#bfe0ff", stroke: "#1a202b", strokeThickness: 3
    }).setScrollFactor(0).setDepth(DEPTH);

    // Level badge + thin XP bar, below the spiritshot indicator.
    const XY = MY + 42;
    this.levelText = this.add.text(X, XY - 2, "", {
      fontFamily: "monospace", fontSize: "12px",
      color: "#ffe08a", stroke: "#1a202b", strokeThickness: 3
    }).setScrollFactor(0).setDepth(DEPTH);
    this.xpBarBg = this.add.graphics().setScrollFactor(0).setDepth(DEPTH);
    this.xpBarFg = this.add.graphics().setScrollFactor(0).setDepth(DEPTH + 1);
    this.xpBarBg.fillStyle(0x1c1500, 0.85);
    this.xpBarBg.fillRoundedRect(X + 38, XY, BAR_W, 8, 3);
    this._xpBarX = X + 38;
    this._xpBarY = XY;
    this._xpBarW = BAR_W;
    this.pointsText = this.add.text(X + 38 + BAR_W + 6, XY - 3, "", {
      fontFamily: "monospace", fontSize: "12px",
      color: "#7fe6a0", stroke: "#1a202b", strokeThickness: 3
    }).setScrollFactor(0).setDepth(DEPTH);

    // Melee characters (warrior) don't use mana — hide the MP bar. They DO use shots
    // (Soulshot), so the shot indicator stays; move it up into the freed MP row.
    if (this.player?.profile?.melee) {
      [this.mpLabel, this.mpBarBg, this.mpBarFg, this.mpValueText].forEach((o) => o?.setVisible(false));
      this.shotText?.setY(MY - 2);
    }

    this.updatePlayerHpBar();
    if (!this.player?.profile?.melee) this.updatePlayerMpBar();
    this.updateShotHud();
    this.updateXpHud();
  }

  updateXpHud() {
    if (!this.levelText) return;
    const lv = this.leveling;
    this.levelText.setText(`⭑ Lv ${lv?.level ?? 1}`);
    const pct = lv?.progress?.() ?? 0;
    this.xpBarFg?.clear();
    this.xpBarFg?.fillStyle(0xffc24a, 1);
    this.xpBarFg?.fillRoundedRect(this._xpBarX, this._xpBarY, Math.max(0, this._xpBarW * pct), 8, 3);
    const pts = lv?.unspent ?? 0;
    this.pointsText?.setText(pts > 0 ? `+${pts} pts (I)` : "");
    this.pointsText?.setColor(pts > 0 ? "#7fe6a0" : "#7fe6a0");
  }

  // Small floating "+N XP" near the player when XP is gained without a level-up.
  showXpPopup(amount) {
    if (!this.player) return;
    const t = this.add.text(this.player.x, this.player.y - 46, `+${amount} XP`, {
      fontFamily: "monospace", fontSize: "13px", color: "#ffe08a", stroke: "#1a1304", strokeThickness: 4
    }).setOrigin(0.5).setDepth(9000);
    this.tweens.add({ targets: t, y: t.y - 28, alpha: 0, duration: 1100, ease: "Cubic.Out", onComplete: () => t.destroy() });
  }

  updateShotHud() {
    if (!this.shotText) return;
    const type = this.player?.profile?.shotType;
    if (!type) { this.shotText.setVisible(false); return; }
    const n = this.bag?.shotCount?.(type) ?? 0;
    const on = this.shotsEnabled && n > 0;
    const label = type === "soul" ? "Soulshot" : "Spiritshot";
    const color = type === "soul" ? "#ffae6b" : "#8fd0ff";
    this.shotText.setText(`✦ ${label} x${n}  [${this.shotsEnabled ? "ON" : "OFF"}]  (G)`);
    this.shotText.setColor(on ? color : "#7a8aa0");
  }

  toggleShots() {
    this.shotsEnabled = !this.shotsEnabled;
    this.updateShotHud();
    const label = this.player?.profile?.shotType === "soul" ? "Soulshots" : "Spiritshots";
    this.flashHudMessage?.(`${label} ${this.shotsEnabled ? "ON" : "OFF"}`);
  }

  // Call once per spell cast: burns a shot (if enabled & available) and snapshots
  // the attack bonus, so spellDamage() can be read for every enemy the cast hits.
  beginCast() {
    this._castAtk = (this.bag?.bonuses?.().attack ?? 0) + (this.leveling?.bonusAttack() ?? 0);
    this._castMult = 1;
    // Consume one shot of the player's class type (spirit=mage / soul=warrior/archer).
    const type = this.player?.profile?.shotType;
    if (this.shotsEnabled && this.bag && type) {
      const shot = this.bag.firstShot?.(type);
      if (shot) {
        this.bag.consume(shot.key, 1);
        this._castMult = shot.shot;
        this.updateShotHud();
      }
    }
  }

  // Final damage for the current cast = (base + attack bonus) * shot multiplier.
  spellDamage(base) {
    return Math.max(1, Math.round((base + (this._castAtk ?? 0)) * (this._castMult ?? 1)));
  }

  // Melee sword strike: area-of-effect damage in front of the warrior. Reuses each
  // combat scene's applyLightningDamage (boss/trolls/bees) so damage + hit sparks +
  // damage numbers all work per scene. Uses the attack bonus, never burns a spiritshot.
  applyMeleeDamage(x, y, radius) {
    this.beginCast(); // attack bonus + consumes a Soulshot (the warrior's shot type)
    this.applyLightningDamage?.(x, y, radius);
  }

  // ── Enchant gamble (Phase 3) ────────────────────────────────────────────────
  ENCHANT_MAX = 10;
  ENCHANT_SHATTER_FROM = 4; // failing at +4 or higher can shatter (normal scroll)

  // Success chance for the attempt that takes gear from `level` to `level+1`.
  enchantChance(level) {
    const table = [1, 1, 1, 0.65, 0.55, 0.45, 0.35, 0.30, 0.25, 0.20];
    return table[level] ?? 0.15;
  }

  // Try to enchant an owned gear item. `blessed` scrolls never shatter (reset to +0).
  // Wallet profiles roll on the server (authoritative); guests roll locally. Always
  // returns a Promise so callers can `.then(refresh)` uniformly.
  async enchant(itemKey, blessed = false) {
    if (this.bag?.serverMode) {
      const data = await this.bag.serverEnchant(itemKey, blessed);
      if (!data?.ok) { this.flashHudMessage?.(data?.error ?? "Enchant failed"); return data ?? { ok: false }; }
      this.recomputeStats?.();
      if (data.success) { this.flashHudMessage?.(`Enchant success! +${data.level}`); this.playSfx("sfx-enchant-success", 0.6); }
      else if (data.shattered) { this.flashHudMessage?.(`Shattered! Crystallized for ${data.refund} coins`); this.playSfx("sfx-enchant-shatter", 0.6); }
      else { this.flashHudMessage?.("Enchant failed — reset to +0"); this.playSfx("sfx-enchant-shatter", 0.4); }
      return data;
    }
    const scrollKey = blessed ? "blessed-enchant-scroll" : "enchant-scroll";
    if (!this.bag || this.bag.count(scrollKey) <= 0) {
      this.flashHudMessage?.(`No ${blessed ? "Blessed " : ""}Enchant Scroll`);
      return { ok: false };
    }
    const level = this.bag.enchantLevel(itemKey);
    if (level >= this.ENCHANT_MAX) { this.flashHudMessage?.("Already at max enchant"); return { ok: false }; }

    this.bag.remove(scrollKey, 1);
    const success = Math.random() < this.enchantChance(level);
    if (success) {
      this.bag.setEnchant(itemKey, level + 1);
      this.recomputeStats?.();
      this.flashHudMessage?.(`Enchant success! +${level + 1}`);
      this.playSfx("sfx-enchant-success", 0.6);
      return { ok: true, success: true, level: level + 1 };
    }
    // failure
    if (!blessed && level >= this.ENCHANT_SHATTER_FROM) {
      const price = itemData(itemKey)?.price ?? 0;
      const refund = Math.floor(price * 0.25);
      this.bag.destroyItem(itemKey);
      if (refund > 0) this.addCoins?.(refund);
      this.recomputeStats?.();
      this.flashHudMessage?.(`Shattered! Crystallized for ${refund} coins`);
      this.playSfx("sfx-enchant-shatter", 0.6);
      return { ok: true, success: false, shattered: true, refund };
    }
    this.bag.setEnchant(itemKey, 0);
    this.recomputeStats?.();
    this.flashHudMessage?.("Enchant failed — reset to +0");
    this.playSfx("sfx-enchant-shatter", 0.4);
    return { ok: true, success: false, reset: true };
  }

  updatePlayerMpBar() {
    if (!this.mpBarFg) return;
    const pct = Math.max(0, Math.min(1, this.playerMp / this.playerMaxMp));
    this.mpBarFg.clear();
    this.mpBarFg.fillStyle(0x3aa0ff, 1);
    this.mpBarFg.fillRoundedRect(this._mpBarX, this._mpBarY - 1, Math.max(0, this._hpBarW * pct), 15, 4);
    this.mpValueText?.setText(`${Math.max(0, Math.round(this.playerMp))}/${this.playerMaxMp}`);
  }

  // Recompute max HP/MP from equipped gear, keep current values in range, refresh bars.
  recomputeStats() {
    const b = this.bag?.bonuses() ?? {};
    this.playerMaxHp = 100 + (b.maxHp ?? 0) + (this.leveling?.bonusHp() ?? 0);
    this.playerMaxMp = 50 + (b.maxMp ?? 0);
    this.playerHp = Math.min(this.playerHp ?? this.playerMaxHp, this.playerMaxHp);
    this.playerMp = Math.min(this.playerMp ?? this.playerMaxMp, this.playerMaxMp);
    this.updatePlayerHpBar?.();
    this.updatePlayerMpBar?.();
  }

  // Move speed = the character's base speed + Agility bonus (captured once).
  applyMoveSpeed() {
    if (!this.player) return;
    if (this._baseMoveSpeed == null) this._baseMoveSpeed = this.player.speed ?? 145;
    this.player.speed = this._baseMoveSpeed + (this.leveling?.bonusSpeed() ?? 0);
  }

  // Out-of-combat-ish HP regen: Vitality regen + any gear hpRegen. Ticked from updateBase.
  tickRegen() {
    if (!this.player || (this.playerHp ?? 0) <= 0) return;
    const now = this.time?.now ?? Date.now();
    const last = this._lastRegenAt ?? now;
    const dt = Math.min(1, (now - last) / 1000);
    if (dt < 0.25) return; // throttle to ~4Hz
    this._lastRegenAt = now;
    const perSec = (this.leveling?.regenPerSec() ?? 0) + (this.bag?.bonuses?.().hpRegen ?? 0);
    if (perSec <= 0) return;
    if (this.playerHp >= this.playerMaxHp) return;
    this.playerHp = Math.min(this.playerMaxHp, this.playerHp + perSec * dt);
    this.updatePlayerHpBar?.();
  }

  // A market transaction happened somewhere — refresh an open marketplace so sold
  // items vanish live for everyone.
  onMarketUpdate() {
    this.market?.refreshLive?.();
  }

  // Play a one-shot sound effect if it was preloaded.
  playSfx(key, volume = 0.6) {
    if (this.cache?.audio?.exists(key)) this.sound.play(key, { volume });
  }

  // Authoritative XP update pushed from the server (kill / work).
  onXpGained(payload) {
    const before = this.leveling?.level ?? 1;
    this.leveling?.applyServer(payload);
    const leveled = (payload?.leveledUp ?? 0) > 0 || (this.leveling?.level ?? 1) > before;
    if (leveled) {
      this.flashHudMessage?.(`LEVEL UP!  Lv ${this.leveling.level}  ·  +${payload?.leveledUp ?? 1} point${(payload?.leveledUp ?? 1) > 1 ? "s" : ""}`);
      this.playSfx("sfx-levelup", 0.6);
    } else if ((payload?.gained ?? 0) > 0) {
      this.showXpPopup?.(payload.gained);
    }
    this.updateXpHud?.();
  }

  // Drink a potion from the bag: restore HP/MP (fraction of max), cooldown-gated.
  useConsumable(item) {
    if (!item) return false;
    const now = this.time.now;
    const kind = typeof item.heal === "number" ? "hp" : (typeof item.mana === "number" ? "mp" : null);
    if (!kind) return false;
    if (this.bag.count(item.key) <= 0) return false;
    if (now < (this._potCooldownUntil?.[kind] ?? 0)) {
      const left = Math.ceil(((this._potCooldownUntil[kind]) - now) / 1000);
      this.flashHudMessage?.(`${kind === "hp" ? "Healing" : "Mana"} on cooldown (${left}s)`);
      return false;
    }
    if (kind === "hp") {
      if (this.playerHp >= this.playerMaxHp) { this.flashHudMessage?.("HP already full"); return false; }
      this.playerHp = Math.min(this.playerMaxHp, this.playerHp + Math.round(this.playerMaxHp * item.heal));
      this.updatePlayerHpBar?.();
    } else {
      if (this.playerMp >= this.playerMaxMp) { this.flashHudMessage?.("MP already full"); return false; }
      this.playerMp = Math.min(this.playerMaxMp, this.playerMp + Math.round(this.playerMaxMp * item.mana));
      this.updatePlayerMpBar?.();
    }
    this._potCooldownUntil[kind] = now + (item.cooldownMs ?? 8000);
    this.bag.consume(item.key, 1);
    return true;
  }

  // Refresh UI bits after the server reconciles the bag/coins (wallet mode).
  onBagSynced() {
    this.recomputeStats?.();
    this.updateShotHud?.();
    this.updateInventoryHud?.();
    if (this.inventoryUI?.isOpen?.()) this.inventoryUI._refresh?.();
    if (this.shop?.isOpen?.()) this.shop._renderDetail?.();
  }

  flashHudMessage(msg) {
    this._hudMsg?.destroy();
    const cam = this.cameras.main;
    this._hudMsg = this.add.text(cam.width / 2, cam.height - 80, msg, {
      fontFamily: "monospace", fontSize: "16px", color: "#ffe6a8", stroke: "#06070a", strokeThickness: 4
    }).setOrigin(0.5).setScrollFactor(0).setDepth(9600);
    this.tweens.add({ targets: this._hudMsg, y: this._hudMsg.y - 24, alpha: 0, duration: 1200, onComplete: () => this._hudMsg?.destroy() });
  }

  updatePlayerHpBar() {
    if (!this.hpBarFg) return;
    const pct = Math.max(0, Math.min(1, this.playerHp / this.playerMaxHp));
    const color = pct > 0.5 ? 0x44dd44 : pct > 0.25 ? 0xffaa00 : 0xff2222;
    this.hpBarFg.clear();
    this.hpBarFg.fillStyle(color, 1);
    this.hpBarFg.fillRoundedRect(this._hpBarX, this._hpBarY - 1, Math.max(0, this._hpBarW * pct), 15, 4);
    this.hpValueText?.setText(`${Math.max(0, this.playerHp)}/${this.playerMaxHp}`);
  }

  takeDamage(amount) {
    if (this.playerInvincible || this.playerHp <= 0) return;
    this.playerHp = Math.max(0, this.playerHp - amount);
    this.updatePlayerHpBar();
    // Flash vermelho no player
    if (this.player) {
      this.player.setTint(0xff4444);
      this.time.delayedCall(200, () => this.player?.clearTint());
    }
    // Invencibilidade temporária
    this.playerInvincible = true;
    this.time.delayedCall(600, () => { this.playerInvincible = false; });
    if (this.playerHp <= 0) {
      this.onPlayerDeath();
    }
  }

  onPlayerDeath() {
    // Padrão para cenas sem mecânica de morte: apenas reenchere HP
    this.playerHp = this.playerMaxHp;
    this.updatePlayerHpBar();
  }

  layoutHud(width) {
    if (!this.cardIcon) {
      return;
    }
    this.cardIcon.setPosition(width - 72, 28);
    this.inventoryText.setPosition(width - 52, 18);
    this.clockText?.setPosition(width - 152, 18);
    this.coinText?.setPosition(width - 292, 18);
    this.layoutSpellBar(width, this.scale.height);
  }

  updateClockHud() {
    const minutes = Math.floor(this.registry.get("worldClockMinutes") ?? 0) % 1440;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    this.clockText?.setText(`${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`);
  }

  updateWorldClock() {
    if (!this.clockText) {
      return;
    }
    const serverMinutes = this.registry.get("worldClockServerMinutes");
    const syncedAt = this.registry.get("worldClockSyncedAt");
    if (typeof serverMinutes === "number" && typeof syncedAt === "number") {
      const elapsedSeconds = Math.max(0, (performance.now() - syncedAt) / 1000);
      const minutes = (serverMinutes + elapsedSeconds * (this.clockMinutesPerSecond ?? 5)) % 1440;
      this.registry.set("worldClockMinutes", minutes);
      this.updateClockHud();
      return;
    }
    const now = this.time.now;
    if (!this.lastClockTick) {
      this.lastClockTick = now;
      return;
    }
    const elapsed = now - this.lastClockTick;
    if (elapsed < 200) {
      return;
    }
    this.lastClockTick = now;
    const addFloat = (elapsed / 1000) * (this.clockMinutesPerSecond ?? 5) + (this.clockMinuteCarry ?? 0);
    const addMinutes = Math.floor(addFloat);
    this.clockMinuteCarry = addFloat - addMinutes;
    if (addMinutes <= 0) {
      return;
    }
    const current = this.registry.get("worldClockMinutes") ?? 0;
    this.registry.set("worldClockMinutes", (current + addMinutes) % 1440);
    this.updateClockHud();
  }

  updateInventoryHud() {
    const inventory = this.registry.get("inventory") ?? [];
    this.inventoryText?.setText(`x${inventory.length}`);
  }

  getPlayerProfileId() {
    const registryProfileId = this.registry.get("playerProfileId") ?? localStorage.getItem("eldervalley-profile-id");
    if (registryProfileId) {
      return registryProfileId;
    }

    const login = this.registry.get("playerLogin");
    if (login?.mode === "wallet" && login.address) {
      const profileId = `wallet:${String(login.chain ?? "evm").toLowerCase()}:${String(login.address).toLowerCase()}`;
      this.registry.set("playerProfileId", profileId);
      try {
        localStorage.setItem("eldervalley-profile-id", profileId);
      } catch {
        // Sem persistencia local, segue pelo registry.
      }
      return profileId;
    }

    const wallet = this.registry.get("walletAddress")
      ?? this.registry.get("wallet")
      ?? localStorage.getItem("eldervalley-wallet-address")
      ?? localStorage.getItem("eldervalley-wallet");
    if (wallet) {
      return `wallet:${String(wallet).toLowerCase()}`;
    }

    let guestId = localStorage.getItem("eldervalley-guest-id");
    if (!guestId) {
      guestId = `guest-${Date.now()}-${Math.random().toString(16).slice(2)}`;
      try {
        localStorage.setItem("eldervalley-guest-id", guestId);
      } catch {
        // O jogo segue com o id em memoria quando o navegador bloqueia storage.
      }
    }
    return `guest:${guestId}`;
  }

  getCurrencyStorageKey() {
    return `eldervalley-coins-${this.getPlayerProfileId()}`;
  }

  getCoins() {
    const profileId = this.getPlayerProfileId();
    const registryCoins = this.registry.get("coins");
    if (typeof registryCoins === "number" && this.registry.get("coinsProfileId") === profileId) {
      return registryCoins;
    }
    const saved = Number(localStorage.getItem(`eldervalley-coins-${profileId}`) ?? 0);
    const coins = Number.isFinite(saved) ? Math.max(0, Math.floor(saved)) : 0;
    this.registry.set("coins", coins);
    this.registry.set("coinsProfileId", profileId);
    return coins;
  }

  setCoins(amount) {
    const coins = Math.max(0, Math.floor(amount));
    const profileId = this.getPlayerProfileId();
    this.registry.set("coins", coins);
    this.registry.set("coinsProfileId", profileId);
    try {
      localStorage.setItem(`eldervalley-coins-${profileId}`, String(coins));
    } catch {
      // Continua salvo no registry da sessao.
    }
    this.updateCurrencyHud();
    return coins;
  }

  addCoins(amount) {
    const coins = this.setCoins(this.getCoins() + amount);
    this.savePlayerProfileSoon();
    return coins;
  }

  getSessionHeaders(headers = {}) {
    const token = this.registry.get("playerSessionToken") ?? localStorage.getItem("eldervalley-session-token");
    return {
      ...headers,
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    };
  }

  updateCurrencyHud() {
    this.coinText?.setText(`Coins: ${this.getCoins()}`);
  }

  createProfilePersistence() {
    this.profileSaveTimer?.remove(false);
    this.profileSaveTimer = this.time.addEvent({
      delay: 3500,
      loop: true,
      callback: () => this.savePlayerProfile()
    });
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.savePlayerProfile({ keepalive: true });
      this.profileSaveTimer?.remove(false);
    });
  }

  buildPlayerProfilePayload() {
    const profileId = this.getPlayerProfileId();
    const login = this.registry.get("playerLogin") ?? { mode: "guest" };
    const previous = this.registry.get("playerProfile") ?? {};
    return {
      ...previous,
      profileId,
      loginMode: login.mode ?? previous.loginMode ?? "guest",
      walletAddress: login.address ?? previous.walletAddress ?? "",
      walletProvider: login.provider ?? previous.walletProvider ?? "",
      selectedCharacter: this.player?.characterId ?? this.registry.get("playerCharacter") ?? previous.selectedCharacter ?? "mage-1",
      coins: this.getCoins(),
      ownedCharacters: [...new Set([...(previous.ownedCharacters ?? []), "mage-1", this.player?.characterId].filter(Boolean))],
      ownedHouses: Array.isArray(previous.ownedHouses) ? previous.ownedHouses : [],
      items: Array.isArray(previous.items) ? previous.items : [],
      position: this.player ? {
        scene: this.scene.key,
        x: Math.round(this.player.x),
        y: Math.round(this.player.y)
      } : previous.position ?? null
    };
  }

  async savePlayerProfile(options = {}) {
    const profileId = this.getPlayerProfileId();
    if (!profileId || window.location.protocol === "file:") {
      return;
    }
    const now = this.time?.now ?? Date.now();
    if (!options.keepalive && now - (this.lastProfileSaveAt ?? 0) < 2800) {
      return;
    }
    this.lastProfileSaveAt = now;
    const profile = this.buildPlayerProfilePayload();
    this.registry.set("playerProfile", profile);
    try {
      const token = this.registry.get("playerSessionToken") ?? localStorage.getItem("eldervalley-session-token");
      await fetch(`/api/profile/${encodeURIComponent(profileId)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify(profile),
        keepalive: options.keepalive === true
      });
    } catch {
      // O servidor pode estar offline; o localStorage segue como fallback.
    }
  }

  savePlayerProfileSoon() {
    this.profileSaveSoonTimer?.remove(false);
    this.profileSaveSoonTimer = this.time.delayedCall(250, () => this.savePlayerProfile());
  }

  addCardToInventory(cardName) {
    const inventory = [...(this.registry.get("inventory") ?? [])];
    inventory.push(cardName);
    this.registry.set("inventory", inventory);
    this.updateInventoryHud();
  }

  handleRoomFull(capacity, current) {
    const returnScene = this.entryData?.returnScene ?? "WorldScene";
    const spawnKey = this.entryData?.exitSpawnKey ?? this.entryData?.spawnKey;
    const msg = capacity >= 999
      ? `This house is currently full (${current} visitors). Please try again shortly.`
      : `This house has reached the limit of ${capacity} visitors (${current}/${capacity}). Please try again shortly.`;
    this.dialog?.show("House Full", msg);
    this.time.delayedCall(2800, () => this.fadeTo(returnScene, { spawnKey }));
  }

  fadeTo(sceneKey, data) {
    if (this.isTransitioning) {
      return;
    }

    this.isTransitioning = true;
    this.player?.setVelocity(0, 0);
    this.savePlayerProfile({ keepalive: true });
    this.input.keyboard.resetKeys();
    this.time.delayedCall(0, () => {
      this.scene.start(sceneKey, data);
    });
  }

  formatWorkMinutes(minutes) {
    const safeMinutes = Math.max(0, Math.floor(Number(minutes) || 0));
    const hours = Math.floor(safeMinutes / 60);
    const mins = safeMinutes % 60;
    return `${hours}h${String(mins).padStart(2, "0")}`;
  }

  async requestServerWork(action, payload = {}, method = "POST") {
    const profileId = this.getPlayerProfileId();
    const body = {
      profileId,
      presenceId: this.multiplayer?.getPresenceId?.() ?? "",
      ...payload
    };
    const url = method === "GET"
      ? `/api/work/${action}?${new URLSearchParams(body).toString()}`
      : `/api/work/${action}`;
    const response = await fetch(url, {
      method,
      headers: this.getSessionHeaders({ "Content-Type": "application/json" }),
      body: method === "GET" ? undefined : JSON.stringify(body)
    });
    const result = await response.json().catch(() => null);
    if (!response.ok || !result?.ok) {
      throw new Error(result?.error ?? "Server refused the work action.");
    }
    return result;
  }

  showWorkNotice(text) {
    const notice = this.add.text(this.scale.width / 2, this.scale.height - 156, text, {
      fontFamily: "monospace",
      fontSize: "14px",
      color: "#fff2c4",
      backgroundColor: "#1b2430",
      padding: { left: 10, right: 10, top: 6, bottom: 6 },
      align: "center",
      wordWrap: { width: Math.min(560, this.scale.width - 80) }
    }).setOrigin(0.5).setScrollFactor(0).setDepth(3300);
    this.tweens.add({
      targets: notice,
      alpha: 0,
      delay: 1500,
      duration: 420,
      onComplete: () => notice.destroy()
    });
  }

  ingredientColor(name) {
    const colors = {
      "Living Leaf": 0x69d36f,
      "Crystal Salt": 0xd9f0ff,
      "Moonroot": 0xb48755,
      "Blue Ash": 0x7da6ff,
      "Green Essence": 0x31f06b
    };
    return colors[name] ?? 0xf0c15d;
  }

  createWorkMiniButton(x, y, width, height, label, onClick, options = {}) {
    const group = this.add.container(x, y);
    const bg = this.add.rectangle(0, 0, width, height, options.fill ?? 0x1b2430, 0.98)
      .setStrokeStyle(2, options.stroke ?? 0xf0c15d, 0.95);
    const text = this.add.text(0, 0, label, {
      fontFamily: "monospace",
      fontSize: options.fontSize ?? "11px",
      color: options.color ?? "#fff2c4",
      align: "center",
      stroke: "#000000",
      strokeThickness: 2,
      wordWrap: { width: width - 8 }
    }).setOrigin(0.5);
    const hit = this.add.rectangle(0, 0, width, height, 0xffffff, 0.001)
      .setInteractive({ useHandCursor: true });
    hit.on("pointerdown", onClick);
    hit.on("pointerover", () => bg.setFillStyle(options.hover ?? 0x2b3b4a, 1));
    hit.on("pointerout", () => bg.setFillStyle(options.fill ?? 0x1b2430, 0.98));
    group.add([bg, text, hit]);
    return group;
  }

  createServerWorkUi(work) {
    this.clearServerWorkPointerHandler();
    this.workUi?.destroy();
    const width = Math.min(560, Math.max(440, this.scale.width * 0.42));
    const x = Math.max(width / 2 + 14, this.scale.width - width / 2 - 18);
    const y = Math.max(150, this.scale.height - 154);
    const container = this.add.container(x, y).setScrollFactor(0).setDepth(3200);
    const bg = this.add.rectangle(0, 0, width, 286, 0x121821, 0.97)
      .setStrokeStyle(2, 0xf0c15d, 0.95);
    const barBack = this.add.rectangle(0, -88, width - 38, 14, 0x253241, 1);
    const barFill = this.add.rectangle(-(width - 38) / 2, -88, 1, 14, 0x75d982, 1)
      .setOrigin(0, 0.5);
    const title = this.add.text(0, -124, "", {
      fontFamily: "monospace",
      fontSize: "15px",
      color: "#fff2c4",
      stroke: "#1a202b",
      strokeThickness: 3
    }).setOrigin(0.5);
    const detail = this.add.text(0, -106, "", {
      fontFamily: "monospace",
      fontSize: "12px",
      color: "#d9e5ef",
      stroke: "#1a202b",
      strokeThickness: 3,
      align: "center"
    }).setOrigin(0.5);
    const taskText = this.add.text(0, -62, "", {
      fontFamily: "monospace",
      fontSize: "12px",
      color: "#fff2c4",
      stroke: "#1a202b",
      strokeThickness: 3,
      align: "center",
      wordWrap: { width: width - 42 }
    }).setOrigin(0.5);
    const sequenceText = this.add.text(0, -40, "", {
      fontFamily: "monospace",
      fontSize: "12px",
      color: "#ffd66b",
      stroke: "#1a202b",
      strokeThickness: 3,
      align: "center",
      wordWrap: { width: width - 42 }
    }).setOrigin(0.5);
    const selectedText = this.add.text(0, -18, "", {
      fontFamily: "monospace",
      fontSize: "12px",
      color: "#d9e5ef",
      stroke: "#1a202b",
      strokeThickness: 3,
      align: "center",
      wordWrap: { width: width - 42 }
    }).setOrigin(0.5);
    const hint = this.add.text(0, 140, "Click flasks | slots remove items | ESC leave early", {
      fontFamily: "monospace",
      fontSize: "10px",
      color: "#ffd66b",
      stroke: "#1a202b",
      strokeThickness: 3
    }).setOrigin(0.5);
    container.add([bg, barBack, barFill, title, detail, taskText, sequenceText, selectedText, hint]);
    this.workUi = container;
    this.serverWorkUi = {
      container,
      width,
      barFill,
      title,
      detail,
      taskText,
      sequenceText,
      selectedText,
      buttons: [],
      slots: [],
      controls: [],
      clickTargets: [],
      taskId: "",
      buttonsKey: "",
      lastMessage: ""
    };
    this.serverWorkPointerHandler = (pointer) => this.handleServerWorkPointer(pointer);
    this.input.on("pointerdown", this.serverWorkPointerHandler);
    this.updateServerWorkUi(work);
  }

  clearServerWorkPointerHandler() {
    if (this.serverWorkPointerHandler && this.input) {
      this.input.off("pointerdown", this.serverWorkPointerHandler);
      this.serverWorkPointerHandler = null;
    }
  }

  handleServerWorkPointer(pointer) {
    const ui = this.serverWorkUi;
    if (!ui?.clickTargets?.length || !ui.container?.active) {
      return;
    }
    const localX = pointer.x - ui.container.x;
    const localY = pointer.y - ui.container.y;
    for (let index = ui.clickTargets.length - 1; index >= 0; index -= 1) {
      const target = ui.clickTargets[index];
      const left = target.x - target.width / 2;
      const right = target.x + target.width / 2;
      const top = target.y - target.height / 2;
      const bottom = target.y + target.height / 2;
      if (localX >= left && localX <= right && localY >= top && localY <= bottom) {
        pointer.event?.preventDefault?.();
        target.onClick();
        return;
      }
    }
  }

  updateServerWorkSlots() {
    const ui = this.serverWorkUi;
    if (!ui) {
      return;
    }
    const selected = this.serverWorkSelection ?? [];
    ui.slots.forEach((slot, index) => {
      const choice = selected[index];
      slot.bg.setFillStyle(choice ? 0x263847 : 0x0c1118, choice ? 1 : 0.98);
      slot.bg.setStrokeStyle(2, choice ? this.ingredientColor(choice) : 0xf0c15d, choice ? 1 : 0.75);
      slot.text.setText(choice ? choice.replace(" ", "\n") : `${index + 1}`);
      slot.bottle.setVisible(Boolean(choice));
      if (choice) {
        slot.bottle.setFillStyle(this.ingredientColor(choice), 1);
      }
    });
  }

  rebuildServerWorkTaskButtons(work) {
    const ui = this.serverWorkUi;
    if (!ui) {
      return;
    }
    const destroyObjects = (entry) => (entry?.objects ?? [entry]).forEach((object) => object?.destroy?.());
    ui.buttons.forEach(destroyObjects);
    ui.slots.forEach(destroyObjects);
    ui.controls.forEach(destroyObjects);
    ui.buttons = [];
    ui.slots = [];
    ui.controls = [];
    ui.clickTargets = [];
    const choices = Array.isArray(work?.task?.choices) ? work.task.choices : [];
    if (!choices.length) {
      return;
    }

    const sequenceLength = Math.max(1, Number(work?.task?.sequenceLength) || work?.task?.sequence?.length || 3);
    const slotWidth = Math.min(108, Math.max(82, (ui.width - 84) / sequenceLength));
    const slotGap = 10;
    const slotStartX = -((sequenceLength - 1) * (slotWidth + slotGap)) / 2;
    for (let index = 0; index < sequenceLength; index += 1) {
      const slotX = slotStartX + index * (slotWidth + slotGap);
      const bg = this.add.rectangle(slotX, 20, slotWidth, 38, 0x0c1118, 0.98)
        .setStrokeStyle(2, 0xf0c15d, 0.75);
      const bottle = this.add.rectangle(slotX - slotWidth / 2 + 18, 20, 16, 25, 0xffffff, 1)
        .setStrokeStyle(2, 0x0b1016, 0.95)
        .setVisible(false);
      const text = this.add.text(slotX + 8, 20, `${index + 1}`, {
        fontFamily: "monospace",
        fontSize: "11px",
        color: "#fff2c4",
        align: "center",
        stroke: "#000000",
        strokeThickness: 2
      }).setOrigin(0.5);
      ui.container.add([bg, bottle, text]);
      ui.slots.push({ objects: [bg, bottle, text], bg, bottle, text });
      ui.clickTargets.push({
        x: slotX,
        y: 20,
        width: slotWidth,
        height: 38,
        onClick: () => this.removeServerWorkIngredient(index)
      });
    }

    const buttonWidth = Math.min(104, Math.max(78, (ui.width - 40) / choices.length));
    const startX = -((choices.length - 1) * buttonWidth) / 2;
    choices.forEach((choice, index) => {
      const buttonX = startX + index * buttonWidth;
      const color = this.ingredientColor(choice);
      const bg = this.add.rectangle(buttonX, 76, buttonWidth - 8, 54, 0x1b2430, 0.98)
        .setStrokeStyle(2, 0xf0c15d, 0.9);
      const bottle = this.add.rectangle(buttonX, 68, 21, 27, color, 1)
        .setStrokeStyle(2, 0x0b1016, 0.95);
      const neck = this.add.rectangle(buttonX, 49, 10, 10, color, 1)
        .setStrokeStyle(1, 0x0b1016, 0.95);
      const shine = this.add.rectangle(buttonX - 5, 63, 4, 13, 0xffffff, 0.38);
      const label = this.add.text(buttonX, 99, choice.replace(" ", "\n"), {
        fontFamily: "monospace",
        fontSize: "9px",
        color: "#fff2c4",
        align: "center",
        stroke: "#000000",
        strokeThickness: 2
      }).setOrigin(0.5);
      ui.container.add([bg, bottle, neck, shine, label]);
      ui.buttons.push({ objects: [bg, bottle, neck, shine, label] });
      ui.clickTargets.push({
        x: buttonX,
        y: 76,
        width: buttonWidth - 8,
        height: 62,
        onClick: () => this.selectServerWorkIngredient(choice)
      });
    });

    const makeControl = (x, label, fill, hover, color, onClick) => {
      const bg = this.add.rectangle(x, 122, 136, 30, fill, 0.98)
        .setStrokeStyle(2, 0xf0c15d, 0.95);
      const text = this.add.text(x, 122, label, {
        fontFamily: "monospace",
        fontSize: "11px",
        color,
        stroke: "#000000",
        strokeThickness: 2
      }).setOrigin(0.5);
      ui.container.add([bg, text]);
      ui.controls.push({ objects: [bg, text] });
      ui.clickTargets.push({ x, y: 122, width: 136, height: 30, onClick });
    };
    makeControl(-76, "CLEAR", 0x2b1f20, 0x4a2b2d, "#fff2c4", () => this.resetServerWorkSelection());
    makeControl(76, "MIX", 0x203823, 0x315b38, "#d9ffd9", () => this.submitServerWorkTask());
    this.updateServerWorkSlots();
  }

  updateServerWorkUi(work, message = "") {
    if (!this.serverWorkUi || !work) {
      return;
    }
    const ui = this.serverWorkUi;
    const progress = Phaser.Math.Clamp(Number(work.progress) || 0, 0, 1);
    ui.barFill.width = Math.max(1, (ui.width - 38) * progress);
    ui.title.setText(`${work.label} ${Math.floor(progress * 100)}%`);
    ui.detail.setText(`${this.formatWorkMinutes(work.elapsedGameMinutes)} / ${this.formatWorkMinutes(work.totalGameMinutes)} | ${work.coinsPerGameHour} coins/h | +${work.earnedCoins}/${work.maxCoins} coins`);

    const task = work.task;
    const selected = this.serverWorkSelection ?? [];
    const sequence = Array.isArray(task?.sequence) ? task.sequence : [];
    ui.taskText.setText(sequence.length ? task.prompt : message);
    ui.sequenceText.setText(sequence.length ? `Recipe: ${sequence.join("  >  ")}` : "");
    ui.lastMessage = message || ui.lastMessage || "";
    ui.selectedText.setText(`${selected.length ? `Mixture: ${selected.join("  >  ")}` : "Mixture: fill the slots below"}${ui.lastMessage ? `\n${ui.lastMessage}` : ""}`);

    const buttonsKey = `${task?.taskId ?? ""}:${(task?.choices ?? []).join("|")}`;
    if (ui.buttonsKey !== buttonsKey) {
      ui.buttonsKey = buttonsKey;
      ui.lastMessage = message || "";
      this.rebuildServerWorkTaskButtons(work);
    }
    this.updateServerWorkSlots();
  }

  selectServerWorkIngredient(choice) {
    if (!this.serverWork?.task || this.serverWorkTaskBusy) {
      return;
    }
    const task = this.serverWork.task;
    const max = Math.max(1, Number(task.sequenceLength) || task.sequence?.length || 3);
    if ((this.serverWorkSelection ?? []).length >= max) {
      this.serverWorkUi.lastMessage = "Mixture full. Click MIX or CLEAR.";
      this.updateServerWorkUi(this.serverWork);
      return;
    }
    this.serverWorkSelection = [...(this.serverWorkSelection ?? []), choice];
    this.serverWorkUi.lastMessage = this.serverWorkSelection.length >= max
      ? "Mixture complete. Click MIX."
      : "Keep filling the recipe.";
    this.updateServerWorkUi(this.serverWork);
  }

  removeServerWorkIngredient(index) {
    if (this.serverWorkTaskBusy) {
      return;
    }
    const selected = [...(this.serverWorkSelection ?? [])];
    if (index < 0 || index >= selected.length) {
      return;
    }
    selected.splice(index, 1);
    this.serverWorkSelection = selected;
    this.serverWorkUi.lastMessage = "Flask removed.";
    this.updateServerWorkUi(this.serverWork);
  }

  resetServerWorkSelection() {
    if (this.serverWorkTaskBusy) {
      return;
    }
    this.serverWorkSelection = [];
    this.serverWorkUi.lastMessage = "Mixture cleared.";
    this.updateServerWorkUi(this.serverWork);
  }

  async submitServerWorkTask() {
    if (!this.serverWork?.task || this.serverWorkTaskBusy) {
      return;
    }
    const task = this.serverWork.task;
    const max = Math.max(1, Number(task.sequenceLength) || task.sequence?.length || 3);
    if ((this.serverWorkSelection ?? []).length < max) {
      this.serverWorkUi.lastMessage = `Missing ${max - (this.serverWorkSelection ?? []).length} flasks.`;
      this.updateServerWorkUi(this.serverWork);
      return;
    }
    this.serverWorkTaskBusy = true;
    this.serverWorkUi.lastMessage = "Mixing...";
    this.updateServerWorkUi(this.serverWork);
    try {
      const result = await this.requestServerWork("task", {
        sessionId: this.serverWork.sessionId,
        answer: this.serverWorkSelection
      });
      this.serverWork = result.work;
      this.serverWorkSelection = [];
      this.serverWorkUi.lastMessage = "";
      this.updateServerWorkUi(this.serverWork, result.success ? `Correct: +${result.bonusGameMinutes} min progress` : "Wrong sequence. A new recipe has arrived.");
    } catch (error) {
      this.showWorkNotice(error.message);
    } finally {
      this.serverWorkTaskBusy = false;
    }
  }

  restorePlayerAfterWork() {
    this.isWorking = false;
    this.workCancelKey = null;
    this.finishTimedWork = null;
    this.serverWorkPoll?.remove(false);
    this.serverWorkPoll = null;
    this.clearServerWorkPointerHandler();
    this.workUi?.destroy();
    this.workUi = null;
    this.serverWorkUi = null;
    this.serverWork = null;
    this.serverWorkSelection = [];
    if (this.player?.body) {
      this.player.body.enable = true;
    }
    this.player?.setVisible(true);
    this.player?.playIdle?.();
  }

  async finishServerWork(cancelled = false) {
    if (!this.serverWork || this.serverWorkFinishing) {
      return;
    }
    this.serverWorkFinishing = true;
    try {
      const result = await this.requestServerWork("finish", {
        sessionId: this.serverWork.sessionId,
        cancelled
      });
      if (result.profile) {
        this.registry.set("playerProfile", result.profile);
        this.setCoins(result.profile.coins ?? this.getCoins());
      }
      this.restorePlayerAfterWork();
      this.showWorkNotice(`${result.cancelled ? "You left alchemy." : "Alchemy shift complete."}\n+${result.earnedCoins ?? 0} coins`);
    } catch (error) {
      this.showWorkNotice(error.message);
    } finally {
      this.serverWorkFinishing = false;
    }
  }

  async refreshServerWork() {
    if (!this.serverWork || this.serverWorkFinishing) {
      return;
    }
    try {
      const result = await this.requestServerWork("status", { sessionId: this.serverWork.sessionId }, "GET");
      this.serverWork = result.work;
      this.updateServerWorkUi(this.serverWork);
      if (this.serverWork.completed) {
        this.finishServerWork(false);
      }
    } catch (error) {
      this.showWorkNotice(error.message);
    }
  }

  async startServerWork({ jobId = "alchemy" } = {}) {
    if (this.isWorking || !this.player) {
      return false;
    }
    this.isWorking = true;
    this.serverWorkFinishing = false;
    this.serverWorkSelection = [];
    this.player.setVelocity(0, 0);
    this.player.setVisible(false);
    if (this.player.body) {
      this.player.body.enable = false;
    }
    this.workCancelKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
    this.finishTimedWork = (cancelled = true) => this.finishServerWork(cancelled);
    try {
      const result = await this.requestServerWork("start", { jobId });
      this.serverWork = result.work;
      this.createServerWorkUi(this.serverWork);
      this.serverWorkPoll = this.time.addEvent({
        delay: 1000,
        loop: true,
        callback: () => this.refreshServerWork()
      });
      return true;
    } catch (error) {
      this.restorePlayerAfterWork();
      this.showWorkNotice(error.message);
      return false;
    }
  }

  startTimedWork({
    label = "Working",
    durationMs,
    totalGameMinutes,
    coinsPerGameHour = 0,
    rewardText = "Work complete.",
    cancelText = "You left work early.",
    allowCancel = true
  } = {}) {
    if (this.isWorking || !this.player) {
      return false;
    }

    this.isWorking = true;
    const clockSpeed = this.clockMinutesPerSecond ?? 5;
    const workGameMinutes = totalGameMinutes ?? Math.max(1, Math.round(((durationMs ?? 9000) / 1000) * clockSpeed));
    const workDurationMs = durationMs ?? (workGameMinutes / clockSpeed) * 1000;
    const start = this.time.now;
    const end = start + workDurationMs;
    const maxCoins = Math.floor((workGameMinutes / 60) * coinsPerGameHour);
    let finished = false;
    this.player.setVelocity(0, 0);
    this.player.setVisible(false);
    if (this.player.body) {
      this.player.body.enable = false;
    }

    const width = Math.min(460, Math.max(260, this.scale.width * 0.42));
    const x = this.scale.width / 2;
    const y = this.scale.height - 92;
    const container = this.add.container(x, y).setScrollFactor(0).setDepth(3200);
    const bg = this.add.rectangle(0, 0, width, 86, 0x121821, 0.94)
      .setStrokeStyle(2, 0xf0c15d, 0.95);
    const barBack = this.add.rectangle(0, 20, width - 40, 14, 0x253241, 1);
    const barFill = this.add.rectangle(-(width - 40) / 2, 20, 1, 14, 0x7fe08a, 1)
      .setOrigin(0, 0.5);
    const text = this.add.text(0, -24, `${label} 0%`, {
      fontFamily: "monospace",
      fontSize: "15px",
      color: "#fff2c4",
      stroke: "#1a202b",
      strokeThickness: 3
    }).setOrigin(0.5);
    const detailText = this.add.text(0, 0, "", {
      fontFamily: "monospace",
      fontSize: "12px",
      color: "#d9e5ef",
      stroke: "#1a202b",
      strokeThickness: 3,
      align: "center"
    }).setOrigin(0.5);
    const cancelHint = this.add.text(0, 39, allowCancel ? "ESC to leave early" : "", {
      fontFamily: "monospace",
      fontSize: "12px",
      color: "#ffd66b",
      stroke: "#1a202b",
      strokeThickness: 3
    }).setOrigin(0.5);
    container.add([bg, barBack, barFill, text, detailText, cancelHint]);
    this.workUi = container;
    this.workCancelKey = allowCancel ? this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC) : null;

    const formatHours = (minutes) => {
      const hours = Math.floor(minutes / 60);
      const mins = Math.floor(minutes % 60);
      return `${hours}h${String(mins).padStart(2, "0")}`;
    };

    const earnedCoinsFor = (elapsedGameMinutes) => Math.floor((elapsedGameMinutes / 60) * coinsPerGameHour);

    const finishWork = (cancelled = false) => {
      if (!this.isWorking || finished) {
        return;
      }
      finished = true;
      const elapsedMs = Phaser.Math.Clamp(this.time.now - start, 0, workDurationMs);
      const elapsedGameMinutes = Math.min(workGameMinutes, (elapsedMs / 1000) * clockSpeed);
      const earnedCoins = Math.min(maxCoins, earnedCoinsFor(elapsedGameMinutes));
      if (earnedCoins > 0) {
        this.addCoins(earnedCoins);
      }
      this.isWorking = false;
      this.workTimer?.remove(false);
      this.workTimer = null;
      this.workUi?.destroy();
      this.workUi = null;
      this.workCancelKey = null;
      this.finishTimedWork = null;
      if (this.player?.body) {
        this.player.body.enable = true;
      }
      this.player?.setVisible(true);
      this.player?.playIdle?.();
      const summary = earnedCoins > 0
        ? `${cancelled ? cancelText : rewardText}\nTime: ${formatHours(elapsedGameMinutes)} | +${earnedCoins} coins`
        : `${cancelled ? cancelText : rewardText}\nTime: ${formatHours(elapsedGameMinutes)} | no coins yet`;
      const doneText = this.add.text(this.scale.width / 2, this.scale.height - 150, summary, {
        fontFamily: "monospace",
        fontSize: "14px",
        color: "#fff2c4",
        backgroundColor: "#1b2430",
        padding: { left: 10, right: 10, top: 6, bottom: 6 },
        align: "center",
        wordWrap: { width: Math.min(520, this.scale.width - 80) }
      }).setOrigin(0.5).setScrollFactor(0).setDepth(3200);
      this.tweens.add({
        targets: doneText,
        alpha: 0,
        delay: 1400,
        duration: 400,
        onComplete: () => doneText.destroy()
      });
    };
    this.finishTimedWork = finishWork;

    this.workTimer = this.time.addEvent({
      delay: 60,
      loop: true,
      callback: () => {
        const progress = Phaser.Math.Clamp((this.time.now - start) / workDurationMs, 0, 1);
        const elapsedGameMinutes = Math.min(workGameMinutes, progress * workGameMinutes);
        const earnedCoins = Math.min(maxCoins, earnedCoinsFor(elapsedGameMinutes));
        barFill.width = Math.max(1, (width - 40) * progress);
        text.setText(`${label} ${Math.floor(progress * 100)}%`);
        detailText.setText(`${formatHours(elapsedGameMinutes)} / ${formatHours(workGameMinutes)} | ${coinsPerGameHour} coins/h | +${earnedCoins}/${maxCoins} coins`);
        if (this.time.now >= end) {
          finishWork();
        }
      }
    });

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.workTimer?.remove(false);
      this.workUi?.destroy();
      this.workCancelKey = null;
      this.finishTimedWork = null;
      this.isWorking = false;
    });

    return true;
  }

  ensureArrowTexture() {
    if (this.textures.exists("spell-arrow")) {
      return;
    }
    const texture = this.textures.createCanvas("spell-arrow", 24, 6);
    const ctx = texture.getContext();
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, 24, 6);
    // Ponta
    ctx.fillStyle = "#c8c8c8";
    ctx.fillRect(20, 2, 4, 2);
    ctx.fillRect(22, 1, 2, 4);
    // Haste
    ctx.fillStyle = "#8b6340";
    ctx.fillRect(4, 2, 18, 2);
    // Penas
    ctx.fillStyle = "#e8e8d0";
    ctx.fillRect(0, 0, 5, 2);
    ctx.fillRect(0, 4, 5, 2);
    ctx.fillStyle = "#b0b098";
    ctx.fillRect(0, 2, 4, 2);
    texture.refresh();
  }

  spawnArrow(x, y, facing = "down") {
    if (!this.physics || this.isTransitioning) {
      return null;
    }
    this.ensureArrowTexture();
    const vectors = {
      down:  { x: 0,  y: 1,  angle: Math.PI / 2,  offsetX: 0,   offsetY: 28 },
      up:    { x: 0,  y: -1, angle: -Math.PI / 2, offsetX: 0,   offsetY: -32 },
      left:  { x: -1, y: 0,  angle: Math.PI,       offsetX: -30, offsetY: -4 },
      right: { x: 1,  y: 0,  angle: 0,             offsetX: 30,  offsetY: -4 }
    };
    const vector = vectors[facing] ?? vectors.right;
    const arrow = this.physics.add.sprite(x + vector.offsetX, y + vector.offsetY, "spell-arrow")
      .setDepth(y + 1800)
      .setRotation(vector.angle);
    arrow.body.setAllowGravity(false);
    arrow.body.setSize(20, 4);
    arrow.setVelocity(vector.x * 420, vector.y * 420);
    arrow.skipPerformanceCull = true;

    const updateDepth = this.time.addEvent({
      delay: 16,
      repeat: 50,
      callback: () => {
        if (arrow.active) {
          arrow.setDepth(arrow.y + 1800);
        } else {
          updateDepth.remove(false);
        }
      }
    });

    const destroyArrow = () => {
      updateDepth.remove(false);
      arrow.destroy();
    };
    if (this.solids) {
      this.physics.add.collider(arrow, this.solids, destroyArrow);
    }
    this.time.delayedCall(900, () => {
      if (arrow.active) {
        destroyArrow();
      }
    });
    return arrow;
  }

  ensureFireballTextures() {
    if (this.textures.exists("spell-fireball-0")) {
      return;
    }

    const frames = [
      { core: "#fff4a3", mid: "#ffb629", edge: "#f05a16" },
      { core: "#fff9c7", mid: "#ff8f18", edge: "#d83b0e" },
      { core: "#ffe172", mid: "#ff6f12", edge: "#b92b0a" }
    ];

    frames.forEach((colors, index) => {
      const texture = this.textures.createCanvas(`spell-fireball-${index}`, 40, 24);
      const ctx = texture.getContext();
      ctx.imageSmoothingEnabled = false;
      ctx.clearRect(0, 0, 40, 24);
      ctx.fillStyle = colors.edge;
      ctx.fillRect(4, 9, 26, 7);
      ctx.fillRect(9, 5, 20, 15);
      ctx.fillRect(28, 7, 6, 3);
      ctx.fillRect(30, 15, 5, 3);
      ctx.fillStyle = colors.mid;
      ctx.fillRect(6, 10, 22, 5);
      ctx.fillRect(11, 7, 16, 11);
      ctx.fillRect(1 + index * 2, 11, 7, 3);
      ctx.fillStyle = colors.core;
      ctx.fillRect(11, 11, 13, 3);
      ctx.fillRect(14, 9, 8, 7);
      ctx.fillStyle = "#ff7a1b";
      ctx.fillRect(32 - index, 4, 3, 3);
      ctx.fillRect(35, 18 - index, 3, 2);
      texture.refresh();
    });
  }

  spawnFireball(x, y, facing = "down") {
    if (!this.physics || this.isTransitioning) {
      return null;
    }

    this.beginCast();
    this.ensureFireballTextures();
    const vectors = {
      down: { x: 0, y: 1, angle: Math.PI / 2, offsetX: 0, offsetY: 30 },
      up: { x: 0, y: -1, angle: -Math.PI / 2, offsetX: 0, offsetY: -36 },
      left: { x: -1, y: 0, angle: Math.PI, offsetX: -34, offsetY: -6 },
      right: { x: 1, y: 0, angle: 0, offsetX: 34, offsetY: -6 }
    };
    const vector = vectors[facing] ?? vectors.down;
    const fireball = this.physics.add.sprite(x + vector.offsetX, y + vector.offsetY, "spell-fireball-0")
      .setDepth(y + 1800)
      .setRotation(vector.angle);
    fireball.body.setAllowGravity(false);
    fireball.body.setSize(18, 12);
    fireball.setVelocity(vector.x * 300, vector.y * 300);
    fireball.skipPerformanceCull = true;

    let frame = 0;
    const animation = this.time.addEvent({
      delay: 70,
      repeat: 10,
      callback: () => {
        if (!fireball.active) {
          animation.remove(false);
          return;
        }
        frame = (frame + 1) % 3;
        fireball.setTexture(`spell-fireball-${frame}`);
        fireball.setDepth(fireball.y + 1800);
      }
    });

    const destroyFireball = () => {
      animation.remove(false);
      fireball.destroy();
    };
    if (this.solids) {
      this.physics.add.collider(fireball, this.solids, destroyFireball);
    }
    this.time.delayedCall(720, () => {
      if (fireball.active) {
        destroyFireball();
      }
    });
    return fireball;
  }

  startLightningCooldown(ms = 8000) {
    const slot = this.spellSlots?.[1];
    if (!slot) return;
    const SLOT_W = this._spellSlotW ?? 52;
    const SLOT_H = 44;
    const { cdOverlay, cdText } = slot;

    this._lightningCooldownEnd = this.time.now + ms;

    const tick = () => {
      const remaining = this._lightningCooldownEnd - this.time.now;
      if (remaining <= 0) {
        cdOverlay.clear();
        cdText.setAlpha(0);
        return;
      }
      const pct = remaining / ms;
      cdOverlay.clear();
      cdOverlay.fillStyle(0x000000, 0.62);
      cdOverlay.fillRoundedRect(1, 1, SLOT_W - 2, SLOT_H - 2, 5);
      // borda que vai sumindo conforme o cooldown passa
      cdOverlay.lineStyle(2, 0x29b6f6, pct);
      cdOverlay.strokeRoundedRect(1, 1, SLOT_W - 2, SLOT_H - 2, 5);
      cdText.setText(Math.ceil(remaining / 1000).toString()).setAlpha(1);
      this.time.delayedCall(100, tick);
    };
    tick();
  }

  enterLightningTargetMode() {
    if (this._lightningTargeting) return;
    // verifica cooldown
    if (this._lightningCooldownEnd && this.time.now < this._lightningCooldownEnd) {
      const rem = Math.ceil((this._lightningCooldownEnd - this.time.now) / 1000);
      // pisca o slot para indicar que ainda está em cooldown
      const slot = this.spellSlots?.[1];
      if (slot) {
        this.tweens.add({ targets: slot.container, alpha: 0.4, duration: 80, yoyo: true, repeat: 2 });
      }
      return;
    }
    this._lightningTargeting = true;

    // cursor de mira: círculo ciano pulsante seguindo o mouse
    this._lightningCursor = this.add.graphics().setDepth(9999).setScrollFactor(0);
    this._lightningCursorWorld = this.add.graphics().setDepth(9999);

    const drawCursor = () => {
      this._lightningCursor.clear();
      this._lightningCursor.lineStyle(2, 0x29eeff, 1);
      this._lightningCursor.strokeCircle(0, 0, 18);
      this._lightningCursor.lineStyle(1, 0xffffff, 0.6);
      this._lightningCursor.strokeCircle(0, 0, 10);
      // cruz
      this._lightningCursor.lineStyle(1, 0x29eeff, 0.9);
      this._lightningCursor.lineBetween(-22, 0, -12, 0);
      this._lightningCursor.lineBetween(12, 0, 22, 0);
      this._lightningCursor.lineBetween(0, -22, 0, -12);
      this._lightningCursor.lineBetween(0, 12, 0, 22);
    };
    drawCursor();

    // pulsar
    this._lightningCursorTween = this.tweens.add({
      targets: this._lightningCursor,
      alpha: { from: 1, to: 0.5 },
      duration: 400,
      yoyo: true,
      repeat: -1
    });

    // hint text
    this._lightningHint = this.add.text(
      this.scale.width / 2, 80,
      "Raio Arcano — Clique no alvo",
      { fontFamily: "monospace", fontSize: "14px", color: "#a8f4ff", stroke: "#000", strokeThickness: 3 }
    ).setOrigin(0.5, 0).setScrollFactor(0).setDepth(9999);

    this._lightningClickHandler = (pointer) => {
      if (!this._lightningTargeting) return;
      const wx = this.cameras.main.scrollX + pointer.x;
      const wy = this.cameras.main.scrollY + pointer.y;
      this.strikeLightning(wx, wy);
      this.exitLightningTargetMode();
    };

    this.input.once("pointerdown", this._lightningClickHandler);

    // cancelar com ESC ou re-pressionar 2
    this._lightningCancelKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
    this._lightningCancelKey.once("down", () => this.exitLightningTargetMode());

    // mover cursor com mouse (screen space)
    this._lightningMoveHandler = (pointer) => {
      if (this._lightningCursor?.active) {
        this._lightningCursor.setPosition(pointer.x, pointer.y);
      }
    };
    this.input.on("pointermove", this._lightningMoveHandler);

    // posicionar no mouse atual
    this._lightningCursor.setPosition(this.input.activePointer.x, this.input.activePointer.y);
  }

  exitLightningTargetMode() {
    this._lightningTargeting = false;
    this._lightningCursorTween?.stop();
    this._lightningCursor?.destroy();
    this._lightningCursorWorld?.destroy();
    this._lightningHint?.destroy();
    this._lightningCursor = null;
    this._lightningCursorWorld = null;
    this._lightningHint = null;
    if (this._lightningMoveHandler) {
      this.input.off("pointermove", this._lightningMoveHandler);
      this._lightningMoveHandler = null;
    }
    if (this._lightningClickHandler) {
      this.input.off("pointerdown", this._lightningClickHandler);
      this._lightningClickHandler = null;
    }
  }

  strikeLightning(wx, wy) {
    if (this.isTransitioning) return;

    const FRAME_SIZE = 192;
    const DISPLAY = 200;
    const RADIUS = 100;      // cobre toda a área do sprite (display 200 / 2)
    const DURATION = 1500;
    const DAMAGE_INTERVAL = 500;

    // inicia cooldown imediatamente ao lançar
    this.startLightningCooldown(8000);
    const DEPTH = wy + 2000;

    // cria animação do raio se ainda não existe
    if (!this.anims.exists("lightning-strike-anim")) {
      this.anims.create({
        key: "lightning-strike-anim",
        frames: Array.from({ length: 8 }, (_, i) => ({ key: "spell-lightning-sheet", frame: i })),
        frameRate: 8,
        repeat: -1
      });
    }

    // zona de dano no chão
    const zone = this.add.graphics().setDepth(DEPTH);
    const drawZone = (alpha) => {
      zone.clear();
      zone.fillStyle(0x29eeff, alpha * 0.15);
      zone.fillCircle(wx, wy, RADIUS);
      zone.lineStyle(2, 0x29eeff, alpha * 0.85);
      zone.strokeCircle(wx, wy, RADIUS);
    };
    drawZone(1);

    // sprite animado — cai de cima
    const strike = this.add.sprite(wx, wy - 100, "spell-lightning-sheet", 0)
      .setDepth(DEPTH + 1)
      .setDisplaySize(DISPLAY, DISPLAY)
      .setAlpha(0);

    // entrada: cai em 100ms
    this.tweens.add({
      targets: strike,
      y: wy,
      alpha: 1,
      duration: 100,
      ease: "Cubic.Out",
      onComplete: () => {
        // inicia animação em loop
        strike.play("lightning-strike-anim");

        // áudio de impacto + loop elétrico
        if (this.cache.audio.exists("spell-lightning-cast")) {
          this.sound.play("spell-lightning-cast", { volume: 0.08 });
        }
        let loopSound = null;
        if (this.cache.audio.exists("spell-lightning-loop")) {
          loopSound = this.sound.add("spell-lightning-loop", { volume: 0.04, loop: true });
          loopSound.play();
        }

        // shake e flash de impacto
        this.cameras.main.shake(200, 0.007);
        const flashG = this.add.graphics().setDepth(DEPTH + 2);
        let ft = 0;
        this.time.addEvent({
          delay: 28, repeat: 5,
          callback: () => {
            ft++;
            const p = 1 - ft / 6;
            flashG.clear();
            flashG.fillStyle(0xffffff, p * 0.65);
            flashG.fillCircle(wx, wy, 16 + ft * 9);
            flashG.fillStyle(0x88ddff, p * 0.35);
            flashG.fillCircle(wx, wy, 24 + ft * 14);
            if (ft >= 6) flashG.destroy();
          }
        });

        // ticks de dano a cada DAMAGE_INTERVAL
        const maxTicks = Math.floor(DURATION / DAMAGE_INTERVAL);
        let ticks = 0;
        const damageTimer = this.time.addEvent({
          delay: DAMAGE_INTERVAL,
          repeat: maxTicks - 1,
          callback: () => {
            ticks++;
            // pulso visual na zona
            const pG = this.add.graphics().setDepth(DEPTH + 2);
            pG.fillStyle(0x29eeff, 0.3);
            pG.fillCircle(wx, wy, RADIUS);
            this.tweens.add({ targets: pG, alpha: 0, duration: 220, onComplete: () => pG.destroy() });
            drawZone(1);
            this.beginCast();
            this.applyLightningDamage(wx, wy, RADIUS);
          }
        });

        // fim: para animação e some
        this.time.delayedCall(DURATION, () => {
          damageTimer.remove(false);
          strike.stop();
          loopSound?.stop();
          this.tweens.add({
            targets: [strike, zone],
            alpha: 0,
            duration: 280,
            onComplete: () => { strike.destroy(); zone.destroy(); }
          });
        });
      }
    });
  }

  // Hook para cenas sobrescreverem com lógica de inimigos específica
  applyLightningDamage(wx, wy, radius) {}

  updateBase() {
    if (this.isTransitioning) {
      return;
    }

    if (!this.player || !this.interactKeys || !this.interactions || !this.dialog) {
      return;
    }

    this.updateCollisionDebugControls();
    this.updateManualCollisionEditorControls();
    this.updateWorldClock();
    this.tickRegen();
    this.chat?.update();
    this.multiplayer?.update(this.time.now);

    if (this.inventoryUI?.isOpen()) {
      this.player.update(this.cursors, this.wasd, true);
      this.interactions.prompt?.setVisible(false);
      return;
    }
    if (!this.dialog.active && !this.chat?.active && Phaser.Input.Keyboard.JustDown(this.interactKeys.inventory)) {
      this.inventoryUI.toggle();
      this.player.update(this.cursors, this.wasd, true);
      return;
    }
    if (!this.dialog.active && !this.chat?.active && Phaser.Input.Keyboard.JustDown(this.interactKeys.shots)) {
      this.toggleShots();
    }

    if (this.isWorking) {
      this.player.setVelocity(0, 0);
      this.interactions.prompt?.setVisible(false);
      if (this.workCancelKey && Phaser.Input.Keyboard.JustDown(this.workCancelKey)) {
        this.finishTimedWork?.(true);
      }
      return;
    }

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

    if (!this.dialog.active && (Phaser.Input.Keyboard.JustDown(this.interactKeys.attack) || Phaser.Input.Keyboard.JustDown(this.interactKeys.spell1))) {
      this.player.attack?.("fire");
      this.player.update(this.cursors, this.wasd, true);
      return;
    }

    if (!this.dialog.active && !this.player?.profile?.melee && Phaser.Input.Keyboard.JustDown(this.interactKeys.spell2)) {
      if (this._lightningTargeting) {
        this.exitLightningTargetMode();
      } else {
        this.enterLightningTargetMode();
      }
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
      const interacted = this.interactions.interact();
      if (this.isTransitioning) {
        return;
      }
    }

    this.player.update(this.cursors, this.wasd, this.dialog.active);
    this.interactions.update();
  }
}
