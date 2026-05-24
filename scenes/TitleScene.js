import WalletSystem from "../systems/WalletSystem.js?v=209";

export default class TitleScene extends Phaser.Scene {
  constructor() {
    super("TitleScene");
  }

  create(data = {}) {
    this.targetScene = data.targetScene ?? "WorldScene";
    this.spawnKey = data.spawnKey ?? "start";
    this.started = false;
    this.activePanel = "houses";
    this.loginMode = localStorage.getItem("eldervalley-login-mode") ?? "guest";
    this.selectedCharacter = localStorage.getItem("eldervalley-selected-character") ?? "mage-1";
    this.scrollOffsets = { houses: 0, characters: 0 };
    this.activeScrollArea = null;
    this.walletSystem = new WalletSystem(this);
    if (this.selectedCharacter === "archer") {
      this.selectedCharacter = "adventurer";
      localStorage.setItem("eldervalley-selected-character", this.selectedCharacter);
    }
    if (!["mage-1", "adventurer"].includes(this.selectedCharacter)) {
      this.selectedCharacter = "mage-1";
      localStorage.setItem("eldervalley-selected-character", this.selectedCharacter);
    }

    this.buildTitleScreen();
    this.startTitleMusic();
    this.input.keyboard?.once("keydown-ENTER", () => this.startGame());
    this.input.keyboard?.once("keydown-SPACE", () => this.startGame());
    this.input.keyboard?.once("keydown-E", () => this.startGame());
  }

  startTitleMusic() {
    this.stopTitleMusic(true);
    this.titleMusic = new Audio("./assets/audio/title-theme.mp3?v=135");
    this.titleMusic.loop = true;
    this.titleMusic.autoplay = true;
    this.titleMusic.preload = "auto";
    this.titleMusic.volume = 0.42;

    const playMusic = () => {
      if (!this.titleMusic || !this.titleMusic.paused) {
        return;
      }
      const promise = this.titleMusic.play();
      if (promise?.catch) {
        promise.catch(() => {
          this.input.once("pointerdown", playMusic);
          this.input.keyboard?.once("keydown", playMusic);
        });
      }
    };

    playMusic();
    this.time.delayedCall(180, playMusic);
    this.time.delayedCall(700, playMusic);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.stopTitleMusic(true));
  }

  stopTitleMusic(immediate = false) {
    if (!this.titleMusic) {
      return;
    }
    const music = this.titleMusic;
    this.titleMusic = null;
    if (immediate) {
      music.pause();
      music.currentTime = 0;
      return;
    }
    const startVolume = music.volume;
    this.tweens.addCounter({
      from: startVolume,
      to: 0,
      duration: 360,
      onUpdate: (tween) => {
        music.volume = tween.getValue();
      },
      onComplete: () => {
        music.pause();
        music.currentTime = 0;
      }
    });
  }

  buildTitleScreen() {
    const { width, height } = this.scale;
    this.cameras.main.setBackgroundColor("#07101a");
    this.add.tileSprite(width / 2, height / 2, width, height, "tile-grass")
      .setAlpha(0.16)
      .setDepth(0);

    this.drawBackdrop(width, height);
    this.drawHeader(width);
    this.layout = this.getLayout(width, height);
    this.drawVideoPanel(this.layout.video);
    this.drawTabs(this.layout.side.x, this.layout.side.y - 46, this.layout.side.w);
    this.contentRoot = this.add.container(0, 0).setDepth(30);
    this.input.on("wheel", (pointer, _gameObjects, _deltaX, deltaY) => {
      if (!this.activeScrollArea) {
        return;
      }
      const { x, y, w, h } = this.activeScrollArea;
      if (pointer.x < x || pointer.x > x + w || pointer.y < y || pointer.y > y + h) {
        return;
      }
      this.scrollActivePanel(deltaY);
    });
    this.renderPanel();
  }

  drawBackdrop(width, height) {
    const g = this.add.graphics().setDepth(1);
    g.fillStyle(0x050b13, 0.95);
    g.fillRect(0, 0, width, height);
    g.fillStyle(0x071a2c, 0.98);
    g.fillRect(0, 0, width, 150);
    g.fillStyle(0x2e1a0d, 0.95);
    g.fillRect(0, 132, width, 18);
    g.fillStyle(0xd19a4c, 0.86);
    g.fillRect(0, 134, width, 2);
    g.fillRect(0, 146, width, 2);
    g.lineStyle(3, 0x140904, 1);
    g.strokeRect(6, 6, width - 12, height - 12);
    g.lineStyle(2, 0xc58c41, 0.9);
    g.strokeRect(12, 12, width - 24, height - 24);
  }

  drawHeader(width) {
    const logoSize = Math.max(48, Math.min(76, width * 0.048));
    const glow = this.add.text(width / 2, 61, "ELDERVALLEY", {
      fontFamily: "Georgia, 'Times New Roman', serif",
      fontSize: `${logoSize}px`,
      color: "#fff0b0",
      stroke: "#8a541e",
      strokeThickness: 16,
      shadow: { offsetX: 0, offsetY: 0, color: "#ffcc63", blur: 12, fill: true }
    }).setOrigin(0.5).setDepth(19).setAlpha(0.24);
    this.tweens.add({
      targets: glow,
      alpha: { from: 0.18, to: 0.43 },
      scale: { from: 1, to: 1.018 },
      duration: 1650,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut"
    });

    this.add.text(width / 2, 62, "ELDERVALLEY", {
      fontFamily: "Georgia, 'Times New Roman', serif",
      fontSize: `${logoSize}px`,
      color: "#ffd574",
      stroke: "#251006",
      strokeThickness: 9,
      shadow: { offsetX: 4, offsetY: 5, color: "#030201", blur: 0, fill: true }
    }).setOrigin(0.5).setDepth(20);

    this.add.text(width / 2, 118, "Demo Version", {
      fontFamily: "monospace",
      fontSize: "18px",
      color: "#e7ba61",
      stroke: "#120905",
      strokeThickness: 4
    }).setOrigin(0.5).setDepth(21);

    if (width >= 1180) {
      this.drawTopLink(38, 44, 94, "X", "Twitter");
      this.drawTopLink(146, 44, 118, "Dex", "DexScreener");
      this.drawTopLink(278, 44, 94, "Base", "Chain");
    }
  }

  drawTopLink(x, y, w, top, bottom) {
    const g = this.add.graphics().setDepth(12);
    g.fillStyle(0x080c12, 0.98);
    g.fillRoundedRect(x, y, w, 58, 6);
    g.lineStyle(2, 0xb47b38, 1);
    g.strokeRoundedRect(x, y, w, 58, 6);
    this.add.text(x + w / 2, y + 22, top, {
      fontFamily: "Georgia, 'Times New Roman', serif",
      fontSize: "20px",
      color: "#61b7ff",
      stroke: "#020407",
      strokeThickness: 4
    }).setOrigin(0.5).setDepth(13);
    this.add.text(x + w / 2, y + 45, bottom, this.textStyle(10, "#f1d596")).setOrigin(0.5).setDepth(13);
    const zone = this.add.zone(x, y, w, 58)
      .setOrigin(0)
      .setInteractive({ useHandCursor: true })
      .setDepth(14);
    this.attachHoverFx(zone, g, () => {
      g.clear();
      g.fillStyle(0x101723, 0.98);
      g.fillRoundedRect(x, y, w, 58, 6);
      g.lineStyle(2, 0xffd166, 1);
      g.strokeRoundedRect(x, y, w, 58, 6);
    }, () => {
      g.clear();
      g.fillStyle(0x080c12, 0.98);
      g.fillRoundedRect(x, y, w, 58, 6);
      g.lineStyle(2, 0xb47b38, 1);
      g.strokeRoundedRect(x, y, w, 58, 6);
    });
  }

  drawWalletDock(width) {
    this.walletDock?.destroy(true);
    this.walletDock = this.add.container(0, 0).setDepth(75);
    const dockW = Math.min(460, Math.max(370, width * 0.29));
    const x = width - dockW - 26;
    const y = 36;
    const g = this.add.graphics();
    g.fillStyle(0x080c12, 0.98);
    g.fillRoundedRect(x, y, dockW, 96, 7);
    g.lineStyle(2, 0xb47b38, 1);
    g.strokeRoundedRect(x, y, dockW, 96, 7);
    g.lineStyle(1, 0xf0bf6a, 0.75);
    g.strokeRoundedRect(x + 6, y + 6, dockW - 12, 84, 5);
    this.walletDock.add(g);

    const title = this.add.text(x + 16, y + 17, "Holder Wallet", this.textStyle(13, "#ffd889"))
      .setOrigin(0, 0.5);
    const address = this.add.text(x + 16, y + 40, this.walletSystem.getShortAddress(), this.textStyle(11, "#d8c6a1"))
      .setOrigin(0, 0.5);
    const status = this.add.text(x + 16, y + 61, this.walletSystem.status, this.textStyle(10, "#9fb8d9"))
      .setOrigin(0, 0.5)
      .setWordWrapWidth(dockW - 32);
    this.walletDock.add([title, address, status]);

    const buttonY = y + 35;
    const rightX = x + dockW - 222;
    this.addWalletButton(rightX, buttonY, 74, "Meta", "metamask", () => this.handleWalletConnect("metamask"));
    this.addWalletButton(rightX + 80, buttonY, 82, "Phantom", "phantom", () => this.handleWalletConnect("phantom"));
    this.addWalletButton(rightX + 168, buttonY, 46, "Disconnect", null, () => this.walletSystem.disconnect());

    const loginY = y + 78;
    const guestSelected = this.loginMode === "guest";
    const walletSelected = this.loginMode === "wallet";
    this.addLoginModeButton(x + 16, loginY, 118, "Guest", "guest", guestSelected);
    this.addLoginModeButton(x + 142, loginY, 150, "Wallet Login", "wallet", walletSelected);
  }

  addWalletButton(x, y, w, label, icon, onClick) {
    const button = this.add.rectangle(x, y, w, 24, 0x23170d, 0.98)
      .setOrigin(0, 0.5)
      .setStrokeStyle(1, 0xd29643)
      .setInteractive({ useHandCursor: true })
      .on("pointerdown", onClick);
    const labelX = icon ? x + 32 : x + w / 2;
    const text = this.add.text(labelX, y, label, this.textStyle(10, "#ffe0a0")).setOrigin(icon ? 0 : 0.5, 0.5);
    this.walletDock.add([button, text]);
    if (icon) {
      this.drawWalletIcon(icon, x + 16, y);
    }
  }

  addLoginModeButton(x, y, w, label, mode, selected) {
    const button = this.add.rectangle(x, y, w, 24, selected ? 0x17395c : 0x15100c, 0.98)
      .setOrigin(0, 0.5)
      .setStrokeStyle(1, selected ? 0xe0aa52 : 0x8f5b2c)
      .setInteractive({ useHandCursor: true })
      .on("pointerdown", () => {
        this.loginMode = mode;
        localStorage.setItem("eldervalley-login-mode", mode);
        if (mode === "wallet" && !this.walletSystem.connected) {
          this.walletSystem.status = "Choose MetaMask or Phantom to enter with a wallet.";
        } else {
          this.walletSystem.status = mode === "guest" ? "Guest entry enabled." : "Wallet login enabled.";
        }
        this.refreshWalletDock();
      });
    const text = this.add.text(x + w / 2, y, label, this.textStyle(10, selected ? "#ffe0a0" : "#d8c6a1"))
      .setOrigin(0.5);
    this.walletDock.add([button, text]);
  }

  drawWalletIcon(type, x, y) {
    const icon = this.add.graphics();
    if (type === "metamask") {
      icon.fillStyle(0xf28c2d, 1);
      icon.fillTriangle(x - 9, y - 7, x - 1, y - 12, x - 2, y - 2);
      icon.fillTriangle(x + 9, y - 7, x + 1, y - 12, x + 2, y - 2);
      icon.fillStyle(0xffb15a, 1);
      icon.fillTriangle(x - 8, y - 5, x, y - 1, x - 7, y + 8);
      icon.fillTriangle(x + 8, y - 5, x, y - 1, x + 7, y + 8);
      icon.fillStyle(0x2b170d, 1);
      icon.fillTriangle(x - 4, y + 1, x, y + 5, x + 4, y + 1);
    } else if (type === "phantom") {
      icon.fillStyle(0x6f4cff, 1);
      icon.fillCircle(x, y, 10);
      icon.fillStyle(0xffffff, 1);
      icon.fillCircle(x - 3, y - 1, 2);
      icon.fillCircle(x + 4, y - 1, 2);
      icon.fillStyle(0x21134a, 1);
      icon.fillCircle(x - 3, y - 1, 1);
      icon.fillCircle(x + 4, y - 1, 1);
      icon.fillStyle(0x6f4cff, 1);
      icon.fillTriangle(x - 9, y + 4, x - 4, y + 12, x + 1, y + 5);
      icon.fillTriangle(x + 2, y + 5, x + 6, y + 12, x + 10, y + 4);
    }
    this.walletDock.add(icon);
  }

  refreshWalletDock() {
    if (this.loginOverlay?.visible) {
      this.showLoginOverlay(true);
      return;
    }
    if (this.activePanel === "houses" || this.activePanel === "characters") {
      this.renderPanel();
    }
  }

  async handleWalletConnect(provider) {
    try {
      if (provider === "metamask") {
        await this.walletSystem.connectMetaMask();
      } else {
        await this.walletSystem.connectPhantom();
      }
      this.loginMode = "wallet";
      localStorage.setItem("eldervalley-login-mode", "wallet");
      if (this.walletSystem.profile?.selectedCharacter) {
        this.selectedCharacter = this.walletSystem.profile.selectedCharacter;
      }
    } catch (error) {
      this.walletSystem.status = error?.message ?? "Could not connect.";
    }
    this.refreshWalletDock();
  }

  getLayout(width, height) {
    const margin = 28;
    const top = 198;
    const bottom = 56;
    if (width < 1120) {
      const videoH = Math.max(260, Math.floor(height * 0.42));
      return {
        compact: true,
        video: { x: margin, y: top, w: width - margin * 2, h: videoH },
        side: { x: margin, y: top + videoH + 68, w: width - margin * 2, h: height - top - videoH - bottom - 68 }
      };
    }
    const sideW = Math.min(540, Math.max(430, Math.floor(width * 0.32)));
    return {
      compact: false,
      video: { x: margin, y: top, w: width - sideW - margin * 3, h: height - top - bottom },
      side: { x: width - sideW - margin, y: top, w: sideW, h: height - top - bottom }
    };
  }

  drawVideoPanel(area) {
    this.drawPanelFrame(area.x, area.y, area.w, area.h, "", 4);
    const x = area.x + 14;
    const y = area.y + 14;
    const w = area.w - 28;
    const h = area.h - 28;
    const maskShape = this.make.graphics({ x: 0, y: 0, add: false });
    maskShape.fillStyle(0xffffff, 1);
    maskShape.fillRect(x, y, w, h);
    this.videoMask = maskShape.createGeometryMask();

    if (this.cache.video.exists("title-intro")) {
      this.titleVideo = this.add.video(x + w / 2, y + h / 2, "title-intro")
        .setOrigin(0.5)
        .setDepth(5)
        .setMask(this.videoMask);
      this.titleVideo.setMute(true);
      this.titleVideo.play(true);
      this.fitVideo(w, h);
      this.titleVideo.video?.addEventListener("loadedmetadata", () => this.fitVideo(w, h));
      this.titleVideo.video?.addEventListener("loadeddata", () => this.fitVideo(w, h));
      this.time.delayedCall(120, () => this.fitVideo(w, h));
    }

    this.drawVeoCover(x, y, w, h);
    const startW = Math.min(420, w * 0.34);
    const startH = Math.min(62, h * 0.11);
    const startX = x + w / 2;
    const startY = y + h - Math.max(54, h * 0.095);
    this.add.zone(startX, startY, startW, startH)
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .setDepth(60)
      .on("pointerover", () => this.playUiTone("hover"))
      .on("pointerdown", () => {
        this.playUiTone("click");
        this.startGame();
      });
  }

  fitVideo(width, height) {
    if (!this.titleVideo) {
      return;
    }
    const source = this.titleVideo.video;
    const sourceWidth = source?.videoWidth || this.titleVideo.width;
    const sourceHeight = source?.videoHeight || this.titleVideo.height;
    if (!sourceWidth || !sourceHeight) {
      return;
    }
    this.titleVideo.setScale(Math.max(width / sourceWidth, height / sourceHeight));
  }

  drawVeoCover(x, y, w, h) {
    const panelW = Math.min(260, Math.max(210, w * 0.19));
    const panelH = 96;
    const px = x + w - panelW - 2;
    const py = y + h - panelH + 4;
    const g = this.add.graphics().setDepth(70);
    g.fillStyle(0x050302, 0.96);
    g.fillRect(px - 22, py - 12, panelW + 46, panelH + 26);
    g.fillStyle(0x080503, 0.86);
    g.fillRoundedRect(px + 6, py + 7, panelW, panelH, 6);
    g.fillStyle(0x3f2615, 0.99);
    g.fillRoundedRect(px, py, panelW, panelH, 6);
    g.lineStyle(4, 0x1b0d06, 1);
    g.strokeRoundedRect(px, py, panelW, panelH, 6);
    g.lineStyle(2, 0xc79045, 1);
    g.strokeRoundedRect(px + 6, py + 6, panelW - 12, panelH - 12, 4);

    const cx = px + panelW / 2;
    const cy = py + panelH / 2 + 2;
    g.fillStyle(0x11243a, 1);
    g.fillTriangle(cx - 34, cy - 28, cx + 34, cy - 28, cx, cy + 36);
    g.fillStyle(0x1b3e63, 1);
    g.fillTriangle(cx - 26, cy - 20, cx + 26, cy - 20, cx, cy + 26);
    g.lineStyle(4, 0xe0aa52, 1);
    g.strokeTriangle(cx - 34, cy - 28, cx + 34, cy - 28, cx, cy + 36);
    g.lineStyle(3, 0xffd889, 0.95);
    g.beginPath();
    g.moveTo(cx, cy - 17);
    g.lineTo(cx, cy + 14);
    g.moveTo(cx - 16, cy - 2);
    g.lineTo(cx + 16, cy - 2);
    g.moveTo(cx - 11, cy + 12);
    g.lineTo(cx, cy + 22);
    g.lineTo(cx + 11, cy + 12);
    g.strokePath();
  }

  drawTabs(x, y, width) {
    const tabs = [
      { id: "houses", label: "Houses" },
      { id: "characters", label: "Characters" },
      { id: "market", label: "Market" },
      { id: "notices", label: "Notices" }
    ];
    const tabW = width / tabs.length;
    this.tabButtons = tabs.map((tab, index) => {
      const tx = x + index * tabW;
      const button = this.add.rectangle(tx, y, tabW - 4, 38, 0x21150d, 0.98)
        .setOrigin(0, 0)
        .setStrokeStyle(2, 0x8f5b2c)
        .setInteractive({ useHandCursor: true })
        .setDepth(28)
        .on("pointerover", () => {
          if (this.activePanel !== tab.id) {
            button.setFillStyle(0x2e2115, 0.98);
          }
          this.playUiTone("hover");
        })
        .on("pointerout", () => {
          if (this.activePanel !== tab.id) {
            button.setFillStyle(0x21150d, 0.98);
          }
        })
        .on("pointerdown", () => {
          this.playUiTone("click");
          this.activePanel = tab.id;
          this.renderPanel();
        });
      const label = this.add.text(tx + tabW / 2, y + 19, tab.label, this.textStyle(12, "#f3d08a"))
        .setOrigin(0.5)
        .setDepth(29);
      return { tab, button, label };
    });
  }

  renderPanel() {
    this.activeScrollArea = null;
    this.contentRoot?.removeAll(true);
    this.tabButtons?.forEach(({ tab, button }) => {
      const active = tab.id === this.activePanel;
      button.setFillStyle(active ? 0x17395c : 0x21150d, 0.98);
      button.setStrokeStyle(2, active ? 0xe0aa52 : 0x8f5b2c);
    });

    if (this.activePanel === "characters") {
      this.renderCharacters();
      return;
    }
    if (this.activePanel === "market") {
      this.renderInfo("Market", [
        "Buy and sell valley houses.",
        "Resources, automatic work, and economy arrive later.",
        "Taverns, markets, and forges are not residential houses."
      ]);
      return;
    }
    if (this.activePanel === "notices") {
      this.renderInfo("Notices", [
        "Upcoming updates arrive first in the demo version.",
        "New houses, characters, and decorations are in development.",
        "Online systems, economy, and rewards arrive in future stages."
      ]);
      return;
    }
    this.renderHouses();
  }

  getHouseCatalog() {
    return [
      { name: "Noble House", key: "creative-house-manor", price: "0.16 ETH", maxW: 0.96, maxH: 0.76 },
      { name: "Tall House", key: "creative-house-cottage", price: "0.10 ETH", maxW: 0.96, maxH: 0.78 },
      { name: "Red Lodge", key: "creative-house-red-lodge", price: "0.12 ETH", maxW: 0.96, maxH: 0.76 },
      { name: "Green House", key: "creative-house-green-cottage", price: "0.12 ETH", maxW: 0.96, maxH: 0.78 },
      { name: "Arcane House", key: "creative-house-alchemist", price: "0.22 ETH", maxW: 0.96, maxH: 0.82 },
      { name: "Emerald Manor", key: "creative-house-ivy-manor", price: "0.26 ETH", maxW: 0.96, maxH: 0.8 },
      { name: "Thatch Cottage", key: "creative-house-thatch-cottage", price: "0.11 ETH", maxW: 0.96, maxH: 0.8 },
      { name: "Blue House", key: "creative-house-blue-cottage", price: "0.13 ETH", maxW: 0.88, maxH: 0.84 },
      { name: "Tower House", key: "creative-house-red-tower-cottage", price: "0.14 ETH", maxW: 0.82, maxH: 0.88 },
      { name: "Blue Manor", key: "creative-house-blue-arcane-manor", price: "0.28 ETH", maxW: 0.96, maxH: 0.86 },
      { name: "Elven Manor", key: "creative-house-elf-green-manor", price: "0.30 ETH", maxW: 0.96, maxH: 0.86 },
      { name: "Blue Tower Manor", key: "creative-house-blue-gold-tower", price: "0.29 ETH", maxW: 0.96, maxH: 0.86 },
      { name: "Turquoise Manor", key: "creative-house-teal-roof-manor", price: "0.27 ETH", maxW: 0.96, maxH: 0.86 }
    ];
  }

  getCharacterCatalog() {
    return [
      { id: "mage-1", name: "Mage", key: "mage-1-idle-sheet", frame: 0, scale: 0.72 },
      { id: "adventurer", name: "Adventurer", key: "adventurer-sheet", frame: 0, scale: 0.82 }
    ];
  }

  renderHouses() {
    const { x, y, w, h } = this.layout.side;
    this.drawPanelFrame(x, y, w, h, "Valley Houses", 32, true);
    this.drawAccountSummary(x + 24, y + 56, w - 48);

    const houses = this.getHouseCatalog();
    const columns = w >= 500 ? 2 : 1;
    const gap = 14;
    const rows = Math.ceil(houses.length / columns);
    const listX = x + 18;
    const listY = y + 150;
    const listW = w - 36;
    const listH = h - 174;
    const cardW = (listW - 12 - gap * (columns - 1)) / columns;
    const cardH = columns > 1 ? 190 : 214;
    const contentH = rows * cardH + Math.max(0, rows - 1) * gap;
    const scroller = this.createScrollArea("houses", listX, listY, listW, listH, contentH);

    houses.forEach((house, index) => {
      const col = index % columns;
      const row = Math.floor(index / columns);
      const cx = listX + 6 + col * (cardW + gap);
      const cy = listY + row * (cardH + gap);
      this.addCard(cx, cy, cardW, cardH, false, scroller.content);
      const image = this.add.image(cx + cardW / 2, cy + cardH - 54, house.key)
        .setOrigin(0.5, 1)
        .setDepth(36);
      this.fitImageInside(image, cardW * house.maxW, Math.max(90, cardH - 68));
      scroller.content.add(image);
      this.addContentText(cx + 12, cy + cardH - 35, house.name, 14, "#ffd889", cardW - 24, scroller.content);
      const owned = this.walletSystem.isHouseOwned(house.key);
      this.addContentText(cx + 12, cy + cardH - 16, owned ? "Owned by this wallet" : house.price, 11, owned ? "#a7ffb3" : "#d8c6a1", cardW - 104, scroller.content);
      this.addBuyButton(cx + cardW - 88, cy + cardH - 24, house, scroller.content);
    });
  }

  drawAccountSummary(x, y, w) {
    const g = this.add.graphics().setDepth(34);
    g.fillStyle(0x0b1420, 0.96);
    g.fillRoundedRect(x, y, w, 82, 6);
    g.lineStyle(1, 0xd29643, 0.8);
    g.strokeRoundedRect(x, y, w, 82, 6);
    this.contentRoot.add(g);

    const profile = this.walletSystem.profile;
    const loginLabel = this.loginMode === "wallet" && this.walletSystem.connected
      ? this.walletSystem.getShortAddress()
      : "Entrando como convidado";
    const houses = profile?.ownedHouses?.length ?? 0;
    const characters = profile?.ownedCharacters?.length ?? 0;
    this.addContentText(x + 14, y + 20, loginLabel, 13, "#ffd889", w - 28);
    this.addContentText(x + 14, y + 45, `Your houses: ${houses}  |  Characters: ${characters}`, 12, "#d8c6a1", w - 28);
    this.addContentText(x + 14, y + 66, this.walletSystem.status, 10, "#9fb8d9", w - 28);
  }

  addBuyButton(x, y, house, parent = this.contentRoot) {
    const owned = this.walletSystem.isHouseOwned(house.key);
    const button = this.add.rectangle(x, y, 74, 24, owned ? 0x1d4d28 : (this.walletSystem.connected ? 0x17395c : 0x2b190d), 0.98)
      .setOrigin(0, 0.5)
      .setStrokeStyle(1, owned ? 0x8ded9d : (this.walletSystem.connected ? 0xe0aa52 : 0x8f5b2c))
      .setInteractive({ useHandCursor: true })
      .setDepth(60)
      .on("pointerdown", () => this.handleHousePurchase(house));
    const label = this.add.text(x + 37, y, owned ? "Owned" : "Buy", this.textStyle(10, "#ffe0a0"))
      .setOrigin(0.5)
      .setDepth(61);
    parent.add([button, label]);
  }

  async handleHousePurchase(house) {
    try {
      const result = await this.walletSystem.prepareHousePurchase(house);
      this.walletSystem.status = result.message;
    } catch (error) {
      this.walletSystem.status = error?.message ?? "Could not start purchase.";
    }
    this.refreshWalletDock();
  }

  renderCharacters() {
    const { x, y, w, h } = this.layout.side;
    this.drawPanelFrame(x, y, w, h, "Your Character", 32, true);
    this.drawAccountSummary(x + 24, y + 56, w - 48);

    const chars = this.getCharacterCatalog();
    const listX = x + 18;
    const listY = y + 150;
    const listW = w - 36;
    const listH = h - 174;
    const gap = 14;
    const cardW = listW - 12;
    const cardH = 118;
    const contentH = chars.length * cardH + Math.max(0, chars.length - 1) * gap;
    const scroller = this.createScrollArea("characters", listX, listY, listW, listH, contentH);
    chars.forEach((character, index) => {
      const cy = listY + index * (cardH + gap);
      const selected = this.selectedCharacter === character.id;
      const owned = this.loginMode !== "wallet"
        || !this.walletSystem.connected
        || this.walletSystem.profile?.ownedCharacters?.includes(character.id);
      this.addCard(listX + 6, cy, cardW, cardH, selected, scroller.content);
      const sprite = this.add.sprite(listX + 54, cy + cardH - 16, character.key, character.frame)
        .setOrigin(0.5, 1)
        .setScale(character.scale)
        .setDepth(36);
      scroller.content.add(sprite);
      this.addContentText(listX + 106, cy + 34, character.name, 18, "#ffd889", cardW - 132, scroller.content);
      this.addContentText(listX + 106, cy + 64, selected ? "Selected" : (owned ? "Choose" : "Not owned"), 12, selected ? "#a7ffb3" : (owned ? "#d8c6a1" : "#d97878"), cardW - 132, scroller.content);
      const zone = this.add.zone(listX + 6, cy, cardW, cardH)
        .setOrigin(0)
        .setInteractive({ useHandCursor: true })
        .setDepth(60)
        .on("pointerdown", () => {
          if (owned) {
            this.selectCharacter(character.id);
          } else {
            this.walletSystem.status = `${character.name} does not belong to this wallet yet.`;
            this.renderPanel();
          }
        });
      scroller.content.add(zone);
    });
  }

  renderInfo(title, lines) {
    const { x, y, w, h } = this.layout.side;
    this.drawPanelFrame(x, y, w, h, title, 32, true);
    lines.forEach((line, index) => {
      const cy = y + 88 + index * 76;
      this.addCard(x + 24, cy, w - 48, 54);
      this.addContentText(x + 44, cy + 27, line, 14, "#d8c6a1", w - 88);
    });
  }

  selectCharacter(characterId) {
    this.selectedCharacter = characterId;
    localStorage.setItem("eldervalley-selected-character", characterId);
    this.registry.set("playerCharacter", characterId);
    this.walletSystem.saveSelectedCharacter(characterId);
    this.renderPanel();
  }

  drawPanelFrame(x, y, w, h, label, depth = 4, dynamic = false) {
    const g = this.add.graphics().setDepth(depth);
    g.fillStyle(0x020509, 0.72);
    g.fillRoundedRect(x + 8, y + 10, w, h, 8);
    g.fillStyle(0x0a111b, 0.98);
    g.fillRoundedRect(x, y, w, h, 8);
    g.lineStyle(4, 0x030201, 1);
    g.strokeRoundedRect(x, y, w, h, 8);
    g.lineStyle(2, 0xd29643, 1);
    g.strokeRoundedRect(x + 8, y + 8, w - 16, h - 16, 5);
    let title = null;
    if (label) {
      g.fillStyle(0x2b190d, 1);
      g.fillRect(x + 18, y + 18, w - 36, 24);

      title = this.add.text(x + 34, y + 30, label, {
        fontFamily: "Georgia, 'Times New Roman', serif",
        fontSize: "22px",
        color: "#ffe0a0",
        stroke: "#1d0d05",
        strokeThickness: 4
      }).setOrigin(0, 0.5).setDepth(depth + 2);
    }

    if (dynamic) {
      this.contentRoot.add(title ? [g, title] : [g]);
    }
  }

  addCard(x, y, w, h, selected = false, parent = this.contentRoot) {
    const g = this.add.graphics().setDepth(34);
    g.fillStyle(0x0a0d12, 0.94);
    g.fillRoundedRect(x, y, w, h, 6);
    g.lineStyle(2, selected ? 0xffd166 : 0x7b4c26, 1);
    g.strokeRoundedRect(x, y, w, h, 6);
    g.lineStyle(1, selected ? 0xf7c86a : 0xd49a4c, 0.72);
    g.strokeRoundedRect(x + 5, y + 5, w - 10, h - 10, 4);
    parent.add(g);
  }

  addContentText(x, y, text, size, color, width, parent = this.contentRoot) {
    const label = this.add.text(x, y, text, {
      fontFamily: size >= 18 ? "Georgia, 'Times New Roman', serif" : "monospace",
      fontSize: `${size}px`,
      color,
      stroke: "#120805",
      strokeThickness: size >= 18 ? 4 : 3,
      wordWrap: { width }
    }).setOrigin(0, 0.5).setDepth(36);
    parent.add(label);
    return label;
  }

  fitImageInside(image, maxWidth, maxHeight) {
    const scale = Math.min(maxWidth / image.width, maxHeight / image.height);
    image.setScale(scale);
  }

  createScrollArea(key, x, y, w, h, contentHeight) {
    const maxScroll = Math.max(0, contentHeight - h);
    const offset = Phaser.Math.Clamp(this.scrollOffsets[key] ?? 0, 0, maxScroll);
    this.scrollOffsets[key] = offset;

    const maskShape = this.add.graphics().setVisible(false);
    maskShape.fillStyle(0xffffff, 1);
    maskShape.fillRect(x, y, w, h);
    const content = this.add.container(0, -offset).setDepth(35);
    content.setMask(maskShape.createGeometryMask());

    const hitZone = this.add.zone(x, y, w, h)
      .setOrigin(0)
      .setInteractive({ useHandCursor: false })
      .setDepth(31);

    this.contentRoot.add([maskShape, content, hitZone]);

    const area = {
      key,
      x,
      y,
      w,
      h,
      contentHeight,
      maxScroll,
      content,
      handle: null
    };
    this.activeScrollArea = area;

    if (maxScroll > 0) {
      const trackX = x + w - 8;
      const track = this.add.rectangle(trackX, y, 5, h, 0x2b190d, 0.82)
        .setOrigin(0.5, 0)
        .setDepth(84);
      const handleH = Math.max(34, h * (h / contentHeight));
      const handle = this.add.rectangle(trackX, y + 3, 10, handleH, 0xd29643, 0.98)
        .setOrigin(0.5, 0)
        .setInteractive({ useHandCursor: true })
        .setDepth(85);
      this.input.setDraggable(handle);
      handle.on("drag", (_pointer, _dragX, dragY) => {
        const minY = y + 3;
        const maxY = y + h - handleH - 3;
        const clampedY = Phaser.Math.Clamp(dragY, minY, maxY);
        const ratio = maxY === minY ? 0 : (clampedY - minY) / (maxY - minY);
        this.setScrollOffset(area, ratio * maxScroll);
      });
      area.handle = handle;
      area.handleRange = { minY: y + 3, maxY: y + h - handleH - 3, handleH };
      this.contentRoot.add([track, handle]);
      this.updateScrollHandle(area);
    }

    return area;
  }

  scrollActivePanel(deltaY) {
    if (!this.activeScrollArea || this.activeScrollArea.maxScroll <= 0) {
      return;
    }
    this.setScrollOffset(this.activeScrollArea, (this.scrollOffsets[this.activeScrollArea.key] ?? 0) + deltaY * 0.75);
  }

  setScrollOffset(area, value) {
    const offset = Phaser.Math.Clamp(value, 0, area.maxScroll);
    this.scrollOffsets[area.key] = offset;
    area.content.y = -offset;
    this.updateScrollHandle(area);
  }

  updateScrollHandle(area) {
    if (!area.handle || !area.handleRange) {
      return;
    }
    const ratio = area.maxScroll <= 0 ? 0 : (this.scrollOffsets[area.key] ?? 0) / area.maxScroll;
    area.handle.y = Phaser.Math.Linear(area.handleRange.minY, area.handleRange.maxY, ratio);
  }

  textStyle(size, color) {
    return {
      fontFamily: "monospace",
      fontSize: `${size}px`,
      color,
      stroke: "#080402",
      strokeThickness: 3
    };
  }

  attachHoverFx(zone, graphic, onOver, onOut) {
    zone
      .on("pointerover", () => {
        this.playUiTone("hover");
        onOver?.();
      })
      .on("pointerout", () => onOut?.())
      .on("pointerdown", () => this.playUiTone("click"));
    return zone;
  }

  playUiTone(kind = "hover") {
    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) {
        return;
      }
      this.uiAudioContext ??= new AudioContextClass();
      const context = this.uiAudioContext;
      if (context.state === "suspended") {
        context.resume();
      }
      const now = context.currentTime;
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = "triangle";
      oscillator.frequency.setValueAtTime(kind === "click" ? 420 : 680, now);
      gain.gain.setValueAtTime(kind === "click" ? 0.045 : 0.022, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + (kind === "click" ? 0.11 : 0.07));
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start(now);
      oscillator.stop(now + (kind === "click" ? 0.12 : 0.08));
    } catch {
      // UI sound is cosmetic; ignore browsers that block WebAudio.
    }
  }

  showLoginOverlay(forceRedraw = false) {
    if (this.loginOverlay && !forceRedraw) {
      return;
    }
    this.loginOverlay?.destroy(true);

    const { width, height } = this.scale;
    const panelW = Math.min(760, width - 48);
    const panelH = Math.min(520, height - 70);
    const x = width / 2 - panelW / 2;
    const y = height / 2 - panelH / 2;
    this.loginOverlay = this.add.container(0, 0).setDepth(9000);
    this.loginOverlay.visible = true;

    const shade = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.68)
      .setInteractive();
    const g = this.add.graphics();
    g.fillStyle(0x07101a, 0.99);
    g.fillRoundedRect(x, y, panelW, panelH, 10);
    g.lineStyle(4, 0x030201, 1);
    g.strokeRoundedRect(x, y, panelW, panelH, 10);
    g.lineStyle(2, 0xd29643, 1);
    g.strokeRoundedRect(x + 10, y + 10, panelW - 20, panelH - 20, 7);
    g.fillStyle(0x2b190d, 1);
    g.fillRect(x + 24, y + 24, panelW - 48, 44);
    this.loginOverlay.add([shade, g]);

    const titleText = this.walletSystem.connected ? "Your ElderValley Profile" : "Enter ElderValley";
    const title = this.add.text(width / 2, y + 46, titleText, {
      fontFamily: "Georgia, 'Times New Roman', serif",
      fontSize: "30px",
      color: "#ffe0a0",
      stroke: "#1d0d05",
      strokeThickness: 5
    }).setOrigin(0.5);
    const subtitleText = this.walletSystem.connected
      ? "Review what this wallet owns before entering the world."
      : "Connect a wallet to load your profile, houses, and characters.";
    const subtitle = this.add.text(width / 2, y + 92, subtitleText, this.textStyle(14, "#d8c6a1"))
      .setOrigin(0.5);
    this.loginOverlay.add([title, subtitle]);

    if (this.walletSystem.connected) {
      this.drawWalletProfilePanel(x + 24, y + 118, panelW - 48, panelH - 198);
      this.addModalButton(width / 2 - 248, y + panelH - 58, 150, "Enter", () => this.beginGame());
      this.addModalButton(width / 2 - 76, y + panelH - 58, 150, "Desconectar", () => {
        this.walletSystem.disconnect();
        this.loginMode = "wallet";
        localStorage.setItem("eldervalley-login-mode", "wallet");
        this.showLoginOverlay(true);
      });
      this.addModalButton(width / 2 + 96, y + panelH - 58, 150, "Back", () => {
        this.loginOverlay?.destroy(true);
        this.loginOverlay = null;
      });
      return;
    }

    const cardY = y + 126;
    const cardW = (panelW - 84) / 3;
    this.addLoginChoiceCard(x + 24, cardY, cardW, 172, "Guest", "Explore without a wallet. Purchases stay locked.", null, () => {
      this.loginMode = "guest";
      localStorage.setItem("eldervalley-login-mode", "guest");
      this.walletSystem.status = "Guest mode active. Purchases and profile stay locked without a wallet.";
      this.beginGame();
    });
    this.addLoginChoiceCard(x + 42 + cardW, cardY, cardW, 172, "MetaMask", "Enter with an EVM wallet.", "metamask", () => this.handleWalletConnect("metamask"));
    this.addLoginChoiceCard(x + 60 + cardW * 2, cardY, cardW, 172, "Phantom", "Enter with Phantom.", "phantom", () => this.handleWalletConnect("phantom"));

    const summaryY = cardY + 204;
    const summary = this.add.text(x + 42, summaryY, `Guest: enter to test without saving purchases.\nWallet: loads account houses, characters, and items.\n${this.walletSystem.status}`, {
      fontFamily: "monospace",
      fontSize: "14px",
      color: "#e9d5a0",
      stroke: "#080402",
      strokeThickness: 3,
      lineSpacing: 8,
      wordWrap: { width: panelW - 84 }
    }).setOrigin(0);
    this.loginOverlay.add(summary);

    this.addModalButton(width / 2 - 78, y + panelH - 58, 156, "Back", () => {
      this.loginOverlay?.destroy(true);
      this.loginOverlay = null;
    });
  }

  drawWalletProfilePanel(x, y, w, h) {
    const profile = this.walletSystem.profile ?? {};
    const houses = profile.ownedHouses ?? [];
    const characterCatalog = this.getCharacterCatalog();
    const ownedCharacterIds = profile.ownedCharacters ?? [];
    const selected = characterCatalog.find((character) => character.id === (profile.selectedCharacter ?? this.selectedCharacter)) ?? characterCatalog[0];
    const ownedCharacters = ownedCharacterIds
      .map((id) => characterCatalog.find((character) => character.id === id)?.name ?? id)
      .join(", ") || "Nenhum personagem comprado ainda";
    const ownedHouses = houses
      .map((house) => house.name ?? this.getHouseCatalog().find((item) => item.key === house.id)?.name ?? house.id)
      .join("\n") || "Nenhuma casa comprada ainda";

    const g = this.add.graphics();
    g.fillStyle(0x090f18, 0.98);
    g.fillRoundedRect(x, y, w, h, 8);
    g.lineStyle(2, 0xd29643, 1);
    g.strokeRoundedRect(x, y, w, h, 8);
    this.loginOverlay.add(g);

    const avatarCard = this.add.graphics();
    avatarCard.fillStyle(0x0d1622, 1);
    avatarCard.fillRoundedRect(x + 18, y + 22, 150, h - 44, 7);
    avatarCard.lineStyle(1, 0x8f5b2c, 1);
    avatarCard.strokeRoundedRect(x + 18, y + 22, 150, h - 44, 7);
    this.loginOverlay.add(avatarCard);
    const avatar = this.add.sprite(x + 93, y + 142, selected.key, selected.frame)
      .setOrigin(0.5, 1)
      .setScale(selected.scale * 1.35);
    this.loginOverlay.add(avatar);
    const charName = this.add.text(x + 93, y + h - 44, selected.name, this.textStyle(14, "#ffd889")).setOrigin(0.5);
    const charLabel = this.add.text(x + 93, y + h - 22, "Active Character", this.textStyle(10, "#d8c6a1")).setOrigin(0.5);
    this.loginOverlay.add([charName, charLabel]);

    const infoX = x + 190;
    const infoW = w - 214;
    const info = [
      `Wallet: ${this.walletSystem.getShortAddress()}`,
      `Rede: ${this.walletSystem.wallet?.chain ?? "EVM"}`,
      `Purchased houses: ${houses.length}`,
      `Characters: ${ownedCharacterIds.length}`
    ];
    this.addProfileBox(infoX, y + 22, infoW, 104, "Resumo da Conta", info.join("\n"));
    this.addProfileBox(infoX, y + 138, infoW, 96, "Your Houses", ownedHouses);
    this.addProfileBox(infoX, y + 246, infoW, Math.max(70, h - 268), "Your Characters", ownedCharacters);
  }

  addProfileBox(x, y, w, h, title, body) {
    const g = this.add.graphics();
    g.fillStyle(0x0b1420, 0.96);
    g.fillRoundedRect(x, y, w, h, 6);
    g.lineStyle(1, 0x8f5b2c, 0.9);
    g.strokeRoundedRect(x, y, w, h, 6);
    this.loginOverlay.add(g);
    const titleText = this.add.text(x + 14, y + 17, title, this.textStyle(13, "#ffd889")).setOrigin(0, 0.5);
    const bodyText = this.add.text(x + 14, y + 42, body, {
      ...this.textStyle(12, "#d8c6a1"),
      lineSpacing: 7,
      wordWrap: { width: w - 28 }
    }).setOrigin(0, 0);
    this.loginOverlay.add([titleText, bodyText]);
  }

  addLoginChoiceCard(x, y, w, h, title, description, icon, onClick) {
    const selected = (title === "Guest" && this.loginMode === "guest")
      || (title !== "Guest" && this.loginMode === "wallet" && this.walletSystem.connected);
    const g = this.add.graphics();
    g.fillStyle(selected ? 0x17395c : 0x0a0d12, 0.96);
    g.fillRoundedRect(x, y, w, h, 8);
    g.lineStyle(2, selected ? 0xffd166 : 0x7b4c26, 1);
    g.strokeRoundedRect(x, y, w, h, 8);
    this.loginOverlay.add(g);

    const zone = this.add.zone(x, y, w, h)
      .setOrigin(0)
      .setInteractive({ useHandCursor: true })
      .on("pointerover", () => {
        g.clear();
        g.fillStyle(selected ? 0x1d4974 : 0x121924, 0.98);
        g.fillRoundedRect(x, y, w, h, 8);
        g.lineStyle(2, 0xffd166, 1);
        g.strokeRoundedRect(x, y, w, h, 8);
        this.playUiTone("hover");
      })
      .on("pointerout", () => {
        g.clear();
        g.fillStyle(selected ? 0x17395c : 0x0a0d12, 0.96);
        g.fillRoundedRect(x, y, w, h, 8);
        g.lineStyle(2, selected ? 0xffd166 : 0x7b4c26, 1);
        g.strokeRoundedRect(x, y, w, h, 8);
      })
      .on("pointerdown", () => {
        this.playUiTone("click");
        onClick();
      });
    const name = this.add.text(x + w / 2, y + 28, title, this.textStyle(16, "#ffd889")).setOrigin(0.5);
    const desc = this.add.text(x + w / 2, y + h - 30, description, {
      ...this.textStyle(10, "#d8c6a1"),
      align: "center",
      wordWrap: { width: w - 34 }
    }).setOrigin(0.5);
    this.loginOverlay.add([name, desc, zone]);

    if (icon) {
      this.drawModalWalletIcon(icon, x + w / 2, y + 86);
    } else {
      const guest = this.add.text(x + w / 2, y + 88, "V", {
        fontFamily: "Georgia, 'Times New Roman', serif",
        fontSize: "52px",
        color: "#ffe0a0",
        stroke: "#1d0d05",
        strokeThickness: 6
      }).setOrigin(0.5);
      this.loginOverlay.add(guest);
    }
  }

  drawModalWalletIcon(type, x, y) {
    const key = type === "metamask" ? "wallet-metamask" : "wallet-phantom";
    const size = type === "metamask" ? 74 : 70;
    const icon = this.add.image(x, y, key)
      .setOrigin(0.5)
      .setDisplaySize(size, size);
    this.loginOverlay.add(icon);
  }

  addModalButton(x, y, w, label, onClick) {
    const button = this.add.rectangle(x, y, w, 38, 0x2b190d, 0.98)
      .setOrigin(0, 0.5)
      .setStrokeStyle(2, 0xd29643)
      .setInteractive({ useHandCursor: true })
      .on("pointerover", () => {
        button.setFillStyle(0x3a2718, 0.98);
        button.setStrokeStyle(2, 0xffd166);
        this.playUiTone("hover");
      })
      .on("pointerout", () => {
        button.setFillStyle(0x2b190d, 0.98);
        button.setStrokeStyle(2, 0xd29643);
      })
      .on("pointerdown", () => {
        this.playUiTone("click");
        onClick();
      });
    const text = this.add.text(x + w / 2, y, label, this.textStyle(14, "#ffe0a0")).setOrigin(0.5);
    this.loginOverlay.add([button, text]);
  }

  startGame() {
    if (this.started) {
      return;
    }
    this.showLoginOverlay();
  }

  async beginGame() {
    if (this.started) {
      return;
    }
    if (this.loginMode === "wallet" && !this.walletSystem.connected) {
      this.loginMode = "wallet";
      localStorage.setItem("eldervalley-login-mode", "wallet");
      this.walletSystem.status = "Connect MetaMask or Phantom to enter with a wallet.";
      this.showLoginOverlay(true);
      return;
    }
    this.started = true;
    this.applyLoginIdentity();
    const profileReady = await this.loadProfileBeforeGame();
    if (!profileReady) {
      this.started = false;
      this.walletSystem.status = "Sign with the wallet again to load your profile.";
      this.showLoginOverlay(true);
      return;
    }
    this.registry.set("playerCharacter", this.selectedCharacter);
    localStorage.setItem("eldervalley-selected-character", this.selectedCharacter);
    this.stopTitleMusic(false);
    this.cameras.main.fadeOut(420, 0, 0, 0);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.start("GamePreloadScene", { targetScene: this.targetScene, spawnKey: this.spawnKey });
    });
  }

  applyLoginIdentity() {
    localStorage.setItem("eldervalley-login-mode", this.loginMode);
    if (this.loginMode === "wallet" && this.walletSystem.connected) {
      const wallet = this.walletSystem.wallet;
      const name = `Holder ${wallet.address.slice(0, 6)}...${wallet.address.slice(-4)}`;
      localStorage.setItem("eldervalley-player-name", name);
      const profileId = wallet.profileId ?? `wallet:${String(wallet.chain ?? "evm").toLowerCase()}:${wallet.address.toLowerCase()}`;
      localStorage.setItem("eldervalley-profile-id", profileId);
      if (wallet.sessionToken) {
        localStorage.setItem("eldervalley-session-token", wallet.sessionToken);
        this.registry.set("playerSessionToken", wallet.sessionToken);
      }
      this.registry.set("playerLogin", {
        mode: "wallet",
        provider: wallet.provider,
        chain: wallet.chain,
        address: wallet.address
      });
      this.registry.set("playerProfileId", profileId);
      return;
    }
    const guestId = this.getOrCreateGuestId();
    const profileId = `guest:${guestId}`;
    localStorage.setItem("eldervalley-profile-id", profileId);
    this.registry.set("playerLogin", { mode: "guest" });
    this.registry.set("playerProfileId", profileId);
  }

  getOrCreateGuestId() {
    let guestId = localStorage.getItem("eldervalley-guest-id");
    if (!guestId) {
      guestId = `guest-${Date.now()}-${Math.random().toString(16).slice(2)}`;
      localStorage.setItem("eldervalley-guest-id", guestId);
    }
    return guestId;
  }

  async loadProfileBeforeGame() {
    const profileId = this.registry.get("playerProfileId") ?? localStorage.getItem("eldervalley-profile-id");
    if (!profileId || window.location.protocol === "file:") {
      return true;
    }

    try {
      const token = this.registry.get("playerSessionToken") ?? localStorage.getItem("eldervalley-session-token");
      const response = await fetch(`/api/profile/${encodeURIComponent(profileId)}`, {
        cache: "no-store",
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      if (!response.ok) {
        return !profileId.startsWith("wallet:");
      }
      const payload = await response.json();
      const profile = payload?.profile;
      if (!profile) {
        await this.saveInitialProfile(profileId);
        return true;
      }
      this.registry.set("playerProfile", profile);
      this.registry.set("coins", Number(profile.coins ?? 0));
      this.registry.set("coinsProfileId", profileId);
      if (profile.selectedCharacter && ["mage-1", "adventurer"].includes(profile.selectedCharacter)) {
        this.selectedCharacter = profile.selectedCharacter;
      }
    } catch {
      // If the server does not respond, fall back to the local cache.
    }
    return true;
  }

  async saveInitialProfile(profileId) {
    const login = this.registry.get("playerLogin") ?? { mode: "guest" };
    const profile = {
      profileId,
      loginMode: login.mode ?? "guest",
      walletAddress: login.address ?? "",
      walletProvider: login.provider ?? "",
      selectedCharacter: this.selectedCharacter,
      coins: Number(this.registry.get("coins") ?? 0),
      ownedCharacters: ["mage-1", this.selectedCharacter].filter(Boolean),
      ownedHouses: [],
      items: []
    };
    this.registry.set("playerProfile", profile);
    try {
      const token = this.registry.get("playerSessionToken") ?? localStorage.getItem("eldervalley-session-token");
      await fetch(`/api/profile/${encodeURIComponent(profileId)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify(profile)
      });
    } catch {
      // O jogo ainda pode entrar sem servidor de perfil.
    }
  }
}
