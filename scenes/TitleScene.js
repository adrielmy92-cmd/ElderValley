import WalletSystem from "../systems/WalletSystem.js?v=232";

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
    // Playable characters; coerce any other saved choice to the Mage.
    if (!TitleScene.SELECTABLE_CHARACTERS.includes(this.selectedCharacter)) {
      this.selectedCharacter = "mage-1";
      localStorage.setItem("eldervalley-selected-character", this.selectedCharacter);
    }

    this.buildTitleScreen();
    this.startTitleMusic();
    this.input.keyboard?.once("keydown-ENTER", () => this.startGame());
    this.input.keyboard?.once("keydown-SPACE", () => this.startGame());
    this.input.keyboard?.once("keydown-E", () => this.startGame());

    // Desktop shows the OpenSea button in the top-left link row; phones (no link
    // row) keep the floating corner icon so the collection stays reachable.
    if (this.isPhone()) {
      this.addOpenSeaLink();
      this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.removeOpenSeaLink());
    }
  }

  addOpenSeaLink() {
    const existing = document.getElementById("ev-opensea-link");
    if (existing) {
      existing.style.display = "flex";
      this._openSeaLink = existing;
      return;
    }
    const link = document.createElement("a");
    link.id = "ev-opensea-link";
    link.href = "https://opensea.io/assets/base/0x3E96BCdC2bD5dB11644977f7e4a6F3a599624f97";
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.title = "Ver as casas no OpenSea";
    link.setAttribute("aria-label", "OpenSea");
    Object.assign(link.style, {
      position: "fixed", top: "12px", right: "12px", zIndex: "9995",
      width: "42px", height: "42px", borderRadius: "50%", overflow: "hidden",
      display: "flex", alignItems: "center", justifyContent: "center", lineHeight: "0",
      boxShadow: "0 2px 10px rgba(0,0,0,0.45)", cursor: "pointer",
      transition: "transform 0.12s ease"
    });
    link.addEventListener("mouseenter", () => { link.style.transform = "scale(1.08)"; });
    link.addEventListener("mouseleave", () => { link.style.transform = "scale(1)"; });
    // Official OpenSea logomark.
    link.innerHTML = `<svg width="42" height="42" viewBox="0 0 90 90" xmlns="http://www.w3.org/2000/svg" role="img" aria-hidden="true"><path d="M90 45C90 69.8514 69.8514 90 45 90C20.1486 90 0 69.8514 0 45C0 20.1486 20.1486 0 45 0C69.8566 0 90 20.1486 90 45Z" fill="#2081E2"/><path d="M22.2011 46.512L22.3953 46.2069L34.1016 27.8939C34.2726 27.6257 34.6749 27.6535 34.8043 27.9447C36.76 32.3277 38.4475 37.7786 37.6569 41.1721C37.3194 42.5683 36.3948 44.4593 35.3545 46.2069C35.2204 46.4612 35.0725 46.7109 34.9153 46.9513C34.8413 47.0623 34.7165 47.127 34.5824 47.127H22.5432C22.219 47.127 22.0295 46.7756 22.2011 46.512Z" fill="white"/><path d="M74.3802 49.0654C74.3802 49.3382 74.2185 49.5739 73.9745 49.6757C72.4793 50.3104 67.4242 52.6053 65.3215 55.5283C59.9612 62.9853 55.8714 73.6334 46.7341 73.6334H21.4051C7.95147 73.6334 0 62.0937 0 50.8772C0 50.5117 0.296661 50.2151 0.66214 50.2151H14.2392C14.6694 50.2151 14.9846 50.6064 14.9476 51.0319C14.7951 52.4513 15.0577 53.9012 15.7244 55.2161C17.0091 57.7892 19.6377 59.3952 22.5004 59.3952H29.2042V54.1559H22.5743C22.2366 54.1559 22.0341 53.7674 22.2366 53.4912C22.3107 53.3801 22.39 53.2643 22.4756 53.1346C23.0926 52.2547 23.9748 50.8865 24.8524 49.3334C25.4509 48.2791 26.0309 47.1556 26.4982 46.0264C26.5923 45.8245 26.6672 45.6178 26.7421 45.4159C26.8666 45.0672 26.9958 44.7416 27.0867 44.4161C27.1776 44.1387 27.2532 43.8467 27.3287 43.5739C27.5494 42.621 27.6435 41.6116 27.6435 40.5631C27.6435 40.1515 27.625 39.7203 27.5875 39.3086C27.5685 38.8587 27.512 38.4088 27.4555 37.9589C27.4173 37.5566 27.3478 37.1589 27.2747 36.7434C27.1822 36.137 27.053 35.5352 26.9047 34.9288L26.8533 34.7027C26.7421 34.3012 26.6505 34.1188 26.5219 33.7173C26.1591 32.461 25.7435 31.2354 25.3043 30.0863C25.1437 29.6314 24.9596 29.1955 24.7751 28.7596C24.5037 28.1005 24.2276 27.5031 23.9748 26.9351C23.8429 26.6766 23.7303 26.4421 23.6177 26.1986C23.4906 25.9211 23.3587 25.6437 23.2268 25.3805C23.1333 25.1928 23.0254 25.0052 22.9498 24.8316L22.1409 23.3393C22.0277 23.1374 22.2125 22.8972 22.4329 22.9594L27.553 24.3473H27.5672C27.5767 24.3473 27.5815 24.352 27.5862 24.352L28.2618 24.5396L29.0042 24.7508L29.2757 24.8273V21.7842C29.2757 20.3147 30.4505 19.1267 31.9012 19.1267C32.6266 19.1267 33.2854 19.4232 33.7573 19.9056C34.2297 20.3879 34.5251 21.0476 34.5251 21.7842V26.2935L35.0721 26.4475C35.1152 26.4618 35.1584 26.481 35.1967 26.5098C35.3286 26.6105 35.5171 26.7551 35.756 26.9333C35.9456 27.0825 36.1495 27.2654 36.3964 27.4531C36.8857 27.8522 37.4711 28.3648 38.1156 28.9521C38.2867 29.1014 38.4523 29.2555 38.6035 29.4096C39.4292 30.1801 40.3543 31.0852 41.2375 32.085C41.4853 32.3675 41.728 32.6549 41.9758 32.9567C42.2236 33.2633 42.4857 33.5651 42.7144 33.8669C43.0146 34.2696 43.3387 34.6864 43.6151 35.1224C43.7471 35.3236 43.8981 35.5304 44.0204 35.7316C44.3639 36.2632 44.6688 36.8124 44.9594 37.3617C45.0818 37.6105 45.209 37.8836 45.3171 38.1517C45.6334 38.8451 45.8812 39.5529 46.0386 40.2608C46.0866 40.4148 46.1199 40.5784 46.139 40.7276V40.7612C46.1917 40.9728 46.2108 41.1986 46.23 41.4291C46.3008 42.166 46.2673 42.9029 46.1151 43.6446C46.0531 43.9588 45.9718 44.2569 45.8708 44.5711C45.7649 44.8709 45.659 45.1853 45.5196 45.4803C45.2479 46.1059 44.9264 46.7315 44.5482 47.3139C44.4259 47.5302 44.2796 47.7549 44.1335 47.9796C43.973 48.214 43.8071 48.4362 43.6611 48.6523C43.4584 48.9301 43.2412 49.2235 43.0192 49.4914C42.8197 49.7642 42.6155 50.0369 42.3917 50.2807C42.0803 50.6546 41.7833 51.0106 41.4719 51.3505C41.2918 51.5618 41.0975 51.7803 40.8985 51.9819C40.7042 52.2068 40.5051 52.4093 40.3251 52.5969C40.013 52.9081 39.7516 53.1521 39.5333 53.3534L39.0202 53.8261C38.9494 53.8883 38.8546 53.9234 38.7564 53.9234H35.0721V54.1559H39.6618C40.546 54.1559 41.4248 54.1131 42.3018 54.0231C42.532 53.9997 42.7474 54.1761 42.7474 54.4082C42.7474 54.6005 42.6097 54.7654 42.4174 54.7886C40.984 54.9621 39.5306 55.0339 38.0773 55.0339H38.0631V59.3952H44.7669C46.3735 59.3952 48.0237 58.8113 49.2693 57.6852C49.531 57.4452 50.6722 56.4159 52.0244 54.8636C52.0699 54.8104 52.1286 54.7724 52.1938 54.7542L73.5345 48.6627C73.9716 48.5375 74.3802 48.8625 74.3802 49.3171V49.0654Z" fill="white"/></svg>`;
    document.body.appendChild(link);
    this._openSeaLink = link;
  }

  removeOpenSeaLink() {
    this._openSeaLink?.remove();
    this._openSeaLink = null;
  }

  startTitleMusic() {
    this.stopTitleMusic(true);
    this.titleMusic = new Audio("./assets/audio/title-theme.mp3?v=146");
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

  isPhone() {
    return this.scale.width < 640;
  }

  buildTitleScreen() {
    const { width, height } = this.scale;
    this.cameras.main.setBackgroundColor("#07101a");
    this.add.tileSprite(width / 2, height / 2, width, height, "tile-grass")
      .setAlpha(0.16).setDepth(0);

    this.drawBackdrop(width, height);

    if (this.isPhone()) {
      this.drawHeaderMobile(width, height);
    } else {
      this.drawHeader(width);
    }

    this.layout = this.getLayout(width, height);

    if (this.isPhone()) {
      this.drawPhoneHero(width, height);
    }

    if (!this.isPhone()) {
      this.drawVideoPanel(this.layout.video);
    }

    this.drawTabs(this.layout.side.x, this.layout.side.y - 46, this.layout.side.w);
    this.contentRoot = this.add.container(0, 0).setDepth(30);

    this.input.on("wheel", (pointer, _gameObjects, _deltaX, deltaY) => {
      if (!this.activeScrollArea) return;
      const { x, y, w, h } = this.activeScrollArea;
      if (pointer.x < x || pointer.x > x + w || pointer.y < y || pointer.y > y + h) return;
      this.scrollActivePanel(deltaY);
    });

    if (this.isPhone()) {
      let touchY = 0;
      this.input.on("pointerdown", (p) => { if (p.y > this.layout.side.y) touchY = p.y; });
      this.input.on("pointermove", (p) => {
        if (!p.isDown || !this.activeScrollArea || p.y < this.layout.side.y) return;
        this.scrollActivePanel((touchY - p.y) * 1.4);
        touchY = p.y;
      });
    }

    this.renderPanel();
  }

  drawPhoneHero(width, height) {
    const panelTop = this.layout?.side?.y ?? Math.floor(height * 0.52);
    const heroH = panelTop - 96;
    const cx = width / 2;
    const cy = 96 + heroH / 2;

    // Glow radial behind logo
    const gfx = this.add.graphics().setDepth(2).setBlendMode(Phaser.BlendModes.ADD);
    gfx.fillStyle(0xffd574, 0.06);
    gfx.fillEllipse(cx, cy - 20, width * 0.9, heroH * 0.7);

    // Tagline
    this.add.text(cx, cy + 18, "A social RPG on Solana", {
      fontFamily: "monospace",
      fontSize: "14px",
      color: "#a0b8cc",
      stroke: "#07101a",
      strokeThickness: 3,
      align: "center"
    }).setOrigin(0.5).setDepth(22);

    // Play button
    const btnW = Math.min(220, width - 48);
    const btnY = cy + 58;
    const btnBg = this.add.rectangle(cx, btnY, btnW, 52, 0x17395c, 0.98)
      .setStrokeStyle(2, 0xe0aa52)
      .setDepth(22)
      .setInteractive({ useHandCursor: true });
    const btnTxt = this.add.text(cx, btnY, "▶  PLAY", {
      fontFamily: "Georgia, serif",
      fontSize: "20px",
      color: "#ffd574",
      stroke: "#0d1e30",
      strokeThickness: 4
    }).setOrigin(0.5).setDepth(23);

    btnBg.on("pointerover", () => btnBg.setFillStyle(0x1d4974));
    btnBg.on("pointerout",  () => btnBg.setFillStyle(0x17395c, 0.98));
    btnBg.on("pointerdown", () => {
      this.playUiTone("click");
      this.startGame();
    });

    // Divider line above panel
    const g2 = this.add.graphics().setDepth(5);
    g2.fillStyle(0x2e1a0d, 1);
    g2.fillRect(0, panelTop - 4, width, 4);
    g2.fillStyle(0xd19a4c, 0.7);
    g2.fillRect(0, panelTop - 2, width, 1);
  }

  drawBackdrop(width, height) {
    const headerH = this.isPhone() ? 80 : 150;
    const g = this.add.graphics().setDepth(1);
    g.fillStyle(0x050b13, 0.95);
    g.fillRect(0, 0, width, height);
    g.fillStyle(0x071a2c, 0.98);
    g.fillRect(0, 0, width, headerH);
    g.fillStyle(0x2e1a0d, 0.95);
    g.fillRect(0, headerH - 18, width, 18);
    g.fillStyle(0xd19a4c, 0.86);
    g.fillRect(0, headerH - 16, width, 2);
    g.fillRect(0, headerH - 4, width, 2);
    g.lineStyle(3, 0x140904, 1);
    g.strokeRect(4, 4, width - 8, height - 8);
    g.lineStyle(2, 0xc58c41, 0.9);
    g.strokeRect(9, 9, width - 18, height - 18);
  }

  drawHeaderMobile(width, height) {
    const logoSize = Math.max(36, Math.min(52, width * 0.12));
    const glow = this.add.text(width / 2, 40, "ELDERVALLEY", {
      fontFamily: "Georgia, 'Times New Roman', serif",
      fontSize: `${logoSize}px`,
      color: "#fff0b0", stroke: "#8a541e", strokeThickness: 12,
      shadow: { offsetX: 0, offsetY: 0, color: "#ffcc63", blur: 8, fill: true }
    }).setOrigin(0.5).setDepth(19).setAlpha(0.22);
    this.tweens.add({ targets: glow, alpha: { from: 0.16, to: 0.38 }, scale: { from: 1, to: 1.02 }, duration: 1650, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
    this.add.text(width / 2, 40, "ELDERVALLEY", {
      fontFamily: "Georgia, 'Times New Roman', serif",
      fontSize: `${logoSize}px`,
      color: "#ffd574", stroke: "#251006", strokeThickness: 7,
      shadow: { offsetX: 3, offsetY: 4, color: "#030201", blur: 0, fill: true }
    }).setOrigin(0.5).setDepth(20);
    this.add.text(width / 2, 75, "Own your home · Earn from fees", {
      fontFamily: "monospace", fontSize: "13px",
      color: "#e7ba61", stroke: "#120905", strokeThickness: 3
    }).setOrigin(0.5).setDepth(21);
    this.drawTokenContract(width / 2, 95, 11);
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

    this.add.text(width / 2, 118, "Own your home · Earn from fees", {
      fontFamily: "monospace",
      fontSize: "18px",
      color: "#e7ba61",
      stroke: "#120905",
      strokeThickness: 4
    }).setOrigin(0.5).setDepth(21);
    this.drawContractBadge(width);

    if (width >= 1180) {
      this.drawTopLink(38, 44, 116, "X", "Twitter", "https://x.com/Eldervalley", "x-logo");
      this.drawTopLink(164, 44, 146, "Buy", "$ELDER · Pump.fun", TitleScene.PUMPFUN_URL, "pumpfun-logo");
      this.drawTopLink(320, 44, 132, "Docs", "Whitepaper", "/docs.html", "docs-logo");
      this.drawTopLink(462, 44, 150, "OpenSea", "Collection", "https://opensea.io/assets/base/0x3E96BCdC2bD5dB11644977f7e4a6F3a599624f97", "opensea-logo");
    }
  }

  // $ELDER Solana mint (Pump.fun). Fill in after the launch — leave empty and the
  // CA badge/chip stay hidden until then (no dead Base address shown).
  static SELECTABLE_CHARACTERS = ["mage-1", "warrior"];
  static ELDER_CA = "";
  // Pump.fun coin page. Until the mint is known, link to pump.fun home.
  static PUMPFUN_URL = "https://pump.fun";

  // Desktop: a prominent, highlighted CA badge in the clean strip between the
  // header band (ends ~150) and the body panels (start at 198). Centered over
  // the main/video column so it never overlaps the right-hand tabs or panels.
  drawContractBadge(width) {
    const full = TitleScene.ELDER_CA;
    if (!full) return null; // hidden until the Solana mint is set
    const fontPx = 15;
    const idle = `CA: ${full}  ⧉`;
    const charW = fontPx * 0.62;
    const boxW = Math.ceil(idle.length * charW) + 28;
    const boxH = 32;
    const margin = 28;

    // Right edge of the main/video column (left of the side tabs).
    let colRight;
    if (width < 1120) {
      colRight = width - margin; // compact: main column spans full width
    } else {
      const sideW = Math.min(540, Math.max(430, Math.floor(width * 0.32)));
      colRight = width - sideW - margin * 2;
    }
    let x = Math.round((margin + colRight - boxW) / 2);
    if (x < margin) x = margin;
    const y = 158;

    const g = this.add.graphics().setDepth(40);
    const paint = (fill, stroke) => {
      g.clear();
      g.fillStyle(fill, 0.98); g.fillRoundedRect(x, y, boxW, boxH, 8);
      g.lineStyle(2, stroke, 1); g.strokeRoundedRect(x, y, boxW, boxH, 8);
    };
    paint(0x161d10, 0xffd166);

    const t = this.add.text(x + 14, y + boxH / 2, idle, {
      fontFamily: "monospace", fontSize: `${fontPx}px`,
      color: "#ffe9a8", stroke: "#0c1206", strokeThickness: 3
    }).setOrigin(0, 0.5).setDepth(41);

    const zone = this.add.zone(x, y, boxW, boxH).setOrigin(0)
      .setInteractive({ useHandCursor: true }).setDepth(42);
    zone.on("pointerup", () => {
      try { navigator.clipboard?.writeText(full); } catch { /* ignore */ }
      t.setText("CA copiado! ✓").setColor("#d6ffd8");
      this.time.delayedCall(1200, () => t.setText(idle).setColor("#ffe9a8"));
    });
    this.attachHoverFx(zone, g, () => paint(0x222b13, 0xfff0b0), () => paint(0x161d10, 0xffd166));
    return g;
  }

  // Mobile: compact copyable chip (full address won't fit, so shortened).
  drawTokenContract(x, y, fontSize = 13) {
    const full = TitleScene.ELDER_CA;
    if (!full) return null; // hidden until the Solana mint is set
    const short = `${full.slice(0, 6)}…${full.slice(-4)}`;
    const baseColor = "#ffe9a8";
    const idle = `CA: ${short}  ⧉`;
    const label = this.add.text(x, y, idle, {
      fontFamily: "monospace", fontSize: `${fontSize}px`,
      color: baseColor, stroke: "#0c1206", strokeThickness: 3
    }).setOrigin(0.5).setDepth(21).setInteractive({ useHandCursor: true });
    label.on("pointerover", () => label.setColor("#fff0b0"));
    label.on("pointerout", () => label.setColor(baseColor));
    label.on("pointerup", () => {
      try { navigator.clipboard?.writeText(full); } catch { /* ignore */ }
      label.setText("CA copiado! ✓").setColor("#d6ffd8");
      this.time.delayedCall(1200, () => label.setText(idle).setColor(baseColor));
    });
    return label;
  }

  drawTopLink(x, y, w, top, bottom, url = null, iconKey = null) {
    const h = 58;
    const g = this.add.graphics().setDepth(12);
    const paint = (fill, stroke) => {
      g.clear();
      g.fillStyle(fill, 0.98);
      g.fillRoundedRect(x, y, w, h, 6);
      g.lineStyle(2, stroke, 1);
      g.strokeRoundedRect(x, y, w, h, 6);
    };
    paint(0x080c12, 0xb47b38);

    let textX = x + w / 2;
    let textOrigin = 0.5;
    if (iconKey) {
      this.add.image(x + 27, y + h / 2, iconKey).setDisplaySize(30, 30).setDepth(13);
      textX = x + 48;
      textOrigin = 0;
    }
    this.add.text(textX, y + 22, top, {
      fontFamily: "Georgia, 'Times New Roman', serif",
      fontSize: "20px",
      color: "#61b7ff",
      stroke: "#020407",
      strokeThickness: 4
    }).setOrigin(textOrigin, 0.5).setDepth(13);
    this.add.text(textX, y + 45, bottom, this.textStyle(10, "#f1d596")).setOrigin(textOrigin, 0.5).setDepth(13);

    const zone = this.add.zone(x, y, w, h)
      .setOrigin(0)
      .setInteractive({ useHandCursor: true })
      .setDepth(14);
    if (url) {
      zone.on("pointerdown", () => window.open(url, "_blank", "noopener"));
    }
    this.attachHoverFx(zone, g, () => paint(0x101723, 0xffd166), () => paint(0x080c12, 0xb47b38));
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
      if (!TitleScene.SELECTABLE_CHARACTERS.includes(this.selectedCharacter)) this.selectedCharacter = "mage-1";
    } catch (error) {
      this.walletSystem.status = error?.message ?? "Could not connect.";
    }
    this.refreshWalletDock();
  }

  getLayout(width, height) {
    const margin = this.isPhone() ? 14 : 28;
    const bottom = this.isPhone() ? 20 : 56;

    // Phone: hero at top half, panel at bottom half
    if (this.isPhone()) {
      const panelTop = Math.floor(height * 0.52);
      return {
        phone: true, compact: true,
        video: { x: 0, y: 0, w: 0, h: 0 },
        side:  { x: margin, y: panelTop, w: width - margin * 2, h: height - panelTop - bottom }
      };
    }

    const top = 198;
    if (width < 1120) {
      const videoH = Math.max(200, Math.floor(height * 0.36));
      return {
        compact: true,
        video: { x: margin, y: top, w: width - margin * 2, h: videoH },
        side: { x: margin, y: top + videoH + 56, w: width - margin * 2, h: height - top - videoH - bottom - 56 }
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
      { id: "houses",     label: this.isPhone() ? "Houses" : "Houses"     },
      { id: "characters", label: this.isPhone() ? "Chars"  : "Characters" },
      { id: "market",     label: "Market"  },
      { id: "notices",    label: "Notices" }
    ];
    const tabH = this.isPhone() ? 44 : 38;
    const fontSize = this.isPhone() ? 11 : 12;
    const tabW = width / tabs.length;
    this.tabButtons = tabs.map((tab, index) => {
      const tx = x + index * tabW;
      const button = this.add.rectangle(tx, y, tabW - 2, tabH, 0x21150d, 0.98)
        .setOrigin(0, 0)
        .setStrokeStyle(2, 0x8f5b2c)
        .setInteractive({ useHandCursor: true })
        .setDepth(28)
        .on("pointerover", () => {
          if (this.activePanel !== tab.id) button.setFillStyle(0x2e2115, 0.98);
          this.playUiTone("hover");
        })
        .on("pointerout", () => {
          if (this.activePanel !== tab.id) button.setFillStyle(0x21150d, 0.98);
        })
        .on("pointerdown", () => {
          this.playUiTone("click");
          this.activePanel = tab.id;
          this.renderPanel();
        });
      const label = this.add.text(tx + tabW / 2, y + tabH / 2, tab.label, this.textStyle(fontSize, "#f3d08a"))
        .setOrigin(0.5)
        .setDepth(29);
      return { tab, button, label };
    });
  }

  renderPanel() {
    this.activeScrollArea = null;
    this.contentRoot?.removeAll(true);
    this._scrollMasks?.forEach(m => m.destroy());
    this._scrollMasks = [];
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
      // Display-only SOL prices for the Solana relaunch (placeholders — adjust later).
      // NOTE: on-chain minting is still the Base contract; the Buy button is paused
      // (see renderHouses) until the Solana house contract ships.
      { name: "Tall House", key: "creative-house-cottage", price: "0.5 SOL", maxW: 0.96, maxH: 0.78 },
      { name: "Thatch Cottage", key: "creative-house-thatch-cottage", price: "0.5 SOL", maxW: 0.96, maxH: 0.8 },
      { name: "Red Lodge", key: "creative-house-red-lodge", price: "0.5 SOL", maxW: 0.96, maxH: 0.76 },
      { name: "Green House", key: "creative-house-green-cottage", price: "0.5 SOL", maxW: 0.96, maxH: 0.78 },
      { name: "Blue House", key: "creative-house-blue-cottage", price: "1 SOL", maxW: 0.88, maxH: 0.84 },
      { name: "Emerald Manor", key: "creative-house-ivy-manor", price: "1 SOL", maxW: 0.96, maxH: 0.8 },
      { name: "Elven Manor", key: "creative-house-elf-green-manor", price: "1 SOL", maxW: 0.96, maxH: 0.86 },
      { name: "Arcane Manor", key: "creative-house-blue-arcane-manor", price: "2 SOL", maxW: 0.96, maxH: 0.86 },
      { name: "Golden Tower", key: "creative-house-blue-gold-tower", price: "2 SOL", maxW: 0.96, maxH: 0.86 },
      { name: "Teal Manor", key: "creative-house-teal-roof-manor", price: "2 SOL", maxW: 0.96, maxH: 0.86 },
      { name: "Grand Manor", key: "creative-house-manor", price: "4 SOL", maxW: 0.96, maxH: 0.76 },
      { name: "Red Tower", key: "creative-house-red-tower-cottage", price: "4 SOL", maxW: 0.82, maxH: 0.88 }
    ];
  }

  getCharacterCatalog() {
    return [
      { id: "mage-1", name: "Mage", key: "mage-1-idle-sheet", frame: 0, scale: 0.72 },
      { id: "warrior", name: "Guerreiro", key: "warrior-walk-sheet", frame: 0, scale: 0.74 }
    ];
  }

  renderHouses() {
    const { x, y, w, h } = this.layout.side;
    const phone = this.isPhone();
    const summaryH = phone ? 52 : 82;
    const listTop  = phone ? 96 : 150;
    this.drawPanelFrame(x, y, w, h, "Valley Houses", 32, true);
    this.drawAccountSummary(x + (phone ? 12 : 24), y + (phone ? 44 : 56), w - (phone ? 24 : 48), summaryH);

    const houses = this.getHouseCatalog();
    const columns = w >= 500 ? 2 : 1;
    const gap = phone ? 8 : 14;
    const rows = Math.ceil(houses.length / columns);
    const listX = x + (phone ? 8 : 18);
    const listY = y + listTop;
    const listW = w - (phone ? 16 : 36);
    const listH = h - listTop - (phone ? 14 : 24);
    const cardW = (listW - 12 - gap * (columns - 1)) / columns;
    const cardH = phone ? (columns > 1 ? 150 : 168) : (columns > 1 ? 190 : 214);
    const contentH = rows * cardH + Math.max(0, rows - 1) * gap;
    const scroller = this.createScrollArea("houses", listX, listY, listW, listH, contentH);

    houses.forEach((house, index) => {
      const col = index % columns;
      const row = Math.floor(index / columns);
      const cx = listX + 6 + col * (cardW + gap);
      const cy = listY + row * (cardH + gap);
      this.addCard(cx, cy, cardW, cardH, false, scroller.content);
      const imgArea = Math.max(phone ? 60 : 90, cardH - (phone ? 54 : 68));
      const image = this.add.image(cx + cardW / 2, cy + cardH - (phone ? 42 : 54), house.key)
        .setOrigin(0.5, 1).setDepth(36);
      this.fitImageInside(image, cardW * house.maxW, imgArea);
      scroller.content.add(image);
      this.addContentText(cx + 8, cy + cardH - (phone ? 28 : 35), house.name, phone ? 11 : 14, "#ffd889", cardW - 16, scroller.content);
      const owned = this.walletSystem.isHouseOwned(house.key);
      this.addContentText(cx + 8, cy + cardH - (phone ? 13 : 16), owned ? "Owned" : house.price, phone ? 9 : 11, owned ? "#a7ffb3" : "#d8c6a1", cardW - (phone ? 70 : 104), scroller.content);
      this.addBuyButton(cx + cardW - (phone ? 66 : 88), cy + cardH - (phone ? 20 : 24), house, scroller.content);
    });

    // Scene-level Buy click handling (nested interactive objects inside the masked
    // scrolling container don't get pointer events in Phaser 3). Width excludes the
    // scrollbar column so dragging the scrollbar still works.
    const buyOffX = phone ? 66 : 88;
    const buyOffY = phone ? 20 : 24;
    const clickZone = this.add.zone(listX, listY, listW - 14, listH)
      .setOrigin(0)
      .setInteractive({ useHandCursor: true })
      .setDepth(37);
    this.contentRoot.add(clickZone);
    clickZone.on("pointerdown", (pointer) => {
      const scrollOffset = this.scrollOffsets["houses"] ?? 0;
      const localX = pointer.x;                  // no horizontal scroll
      const localY = pointer.y + scrollOffset;   // content.y === -scrollOffset
      const col = Math.floor((localX - (listX + 6)) / (cardW + gap));
      const row = Math.floor((localY - listY) / (cardH + gap));
      if (col < 0 || col >= columns || row < 0) return;
      const index = row * columns + col;
      if (index < 0 || index >= houses.length) return;
      const cardX = listX + 6 + col * (cardW + gap);
      const cardY = listY + row * (cardH + gap);
      if (localX > cardX + cardW || localY > cardY + cardH) return; // gap between cards
      const bx = cardX + cardW - buyOffX;
      const by = cardY + cardH - buyOffY;
      const inButton = localX >= bx - 6 && localX <= bx + 80 && localY >= by - 16 && localY <= by + 16;
      if (!inButton) return;
      const house = houses[index];
      if (this.walletSystem.isHouseOwned(house.key)) return;
      // Purchases paused during the Solana move — don't trigger the Base/ETH flow.
      this.walletSystem.status = "House minting is moving to Solana — purchases are paused. Coming soon!";
      this.refreshWalletDock();
    });
  }

  drawAccountSummary(x, y, w, h = 82) {
    const g = this.add.graphics().setDepth(34);
    g.fillStyle(0x0b1420, 0.96);
    g.fillRoundedRect(x, y, w, h, 6);
    g.lineStyle(1, 0xd29643, 0.8);
    g.strokeRoundedRect(x, y, w, h, 6);
    this.contentRoot.add(g);

    const profile = this.walletSystem.profile;
    const loginLabel = this.loginMode === "wallet" && this.walletSystem.connected
      ? this.walletSystem.getShortAddress()
      : "Entering as guest";
    const houses = profile?.ownedHouses?.length ?? 0;
    const characters = profile?.ownedCharacters?.length ?? 0;
    this.addContentText(x + 14, y + 20, loginLabel, 13, "#ffd889", w - 28);
    this.addContentText(x + 14, y + 45, `Your houses: ${houses}  |  Characters: ${characters}`, 12, "#d8c6a1", w - 28);
    this.addContentText(x + 14, y + 66, this.walletSystem.status, 10, "#9fb8d9", w - 28);
  }

  // Visual only — clicks are handled by the scene-level zone in renderHouses,
  // because interactive objects nested in the masked, scrolling content container
  // do not receive pointer events in Phaser 3.
  addBuyButton(x, y, house, parent = this.contentRoot) {
    const owned = this.walletSystem.isHouseOwned(house.key);
    const button = this.add.rectangle(x, y, 74, 24, owned ? 0x1d4d28 : (this.walletSystem.connected ? 0x17395c : 0x2b190d), 0.98)
      .setOrigin(0, 0.5)
      .setStrokeStyle(1, owned ? 0x8ded9d : (this.walletSystem.connected ? 0xe0aa52 : 0x8f5b2c))
      .setDepth(60);
    const label = this.add.text(x + 37, y, owned ? "Owned" : "Buy", this.textStyle(10, "#ffe0a0"))
      .setOrigin(0.5)
      .setDepth(63);
    parent.add([button, label]);
  }

  async handleHousePurchase(house) {
    if (this._purchasing) {
      return;
    }
    this._purchasing = true;
    try {
      const result = await this.walletSystem.prepareHousePurchase(house);
      this.walletSystem.status = result.message;
    } catch (error) {
      this.walletSystem.status = this.describePurchaseError(error);
    } finally {
      this._purchasing = false;
    }
    this.refreshWalletDock();
  }

  describePurchaseError(error) {
    // Common wallet rejections / chain errors → friendly text.
    const code = error?.code ?? error?.info?.error?.code;
    if (code === 4001 || code === "ACTION_REJECTED") {
      return "Purchase cancelled in the wallet.";
    }
    if (error?.shortMessage?.includes("insufficient funds") || String(error?.message).includes("insufficient funds")) {
      return "Not enough balance to cover the price + network fee.";
    }
    return error?.shortMessage ?? error?.message ?? "Could not complete the purchase.";
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
    const BASE_CHARACTERS = ["mage-1", "warrior", "adventurer", "dark-wanderer"];
    const charOwnedMap = chars.map((character) => ({
      character,
      owned: this.loginMode !== "wallet"
        || !this.walletSystem.connected
        || BASE_CHARACTERS.includes(character.id)
        || this.walletSystem.profile?.ownedCharacters?.includes(character.id)
    }));

    chars.forEach((character, index) => {
      const cy = listY + index * (cardH + gap);
      const selected = this.selectedCharacter === character.id;
      const owned = charOwnedMap[index].owned;
      this.addCard(listX + 6, cy, cardW, cardH, selected, scroller.content);
      const sprite = this.add.sprite(listX + 54, cy + cardH - 16, character.key, character.frame)
        .setOrigin(0.5, 1)
        .setScale(character.scale)
        .setDepth(36);
      scroller.content.add(sprite);
      this.addContentText(listX + 106, cy + 34, character.name, 18, "#ffd889", cardW - 132, scroller.content);
      this.addContentText(listX + 106, cy + 64, selected ? "Selected" : (owned ? "Choose" : "Not owned"), 12, selected ? "#a7ffb3" : (owned ? "#d8c6a1" : "#d97878"), cardW - 132, scroller.content);
    });

    // Clique registrado fora do container aninhado para evitar conflito de input no Phaser 3
    const clickZone = this.add.zone(listX, listY, listW, Math.max(listH, contentH))
      .setOrigin(0)
      .setInteractive({ useHandCursor: true })
      .setDepth(62);
    this.contentRoot.add(clickZone);
    clickZone.on("pointerdown", (pointer) => {
      const scrollOffset = this.scrollOffsets["characters"] ?? 0;
      const relY = pointer.y - listY + scrollOffset;
      const index = Math.floor(relY / (cardH + gap));
      if (index < 0 || index >= chars.length) {
        return;
      }
      const slotStart = index * (cardH + gap);
      if (relY > slotStart + cardH) {
        return; // clique no gap entre cards
      }
      const { character, owned } = charOwnedMap[index];
      if (owned) {
        this.selectCharacter(character.id);
      } else {
        this.walletSystem.status = `${character.name} does not belong to this wallet yet.`;
        this.renderPanel();
      }
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

    // maskShape must live at scene level (NOT inside a container) so the
    // GeometryMask uses correct world coordinates in WebGL / mobile.
    const maskShape = this.add.graphics().setScrollFactor(0).setVisible(false);
    maskShape.fillStyle(0xffffff, 1);
    maskShape.fillRect(x, y, w, h);
    this._scrollMasks = this._scrollMasks ?? [];
    this._scrollMasks.push(maskShape);

    const content = this.add.container(0, -offset).setDepth(35);
    content.setMask(maskShape.createGeometryMask());

    const hitZone = this.add.zone(x, y, w, h)
      .setOrigin(0)
      .setInteractive({ useHandCursor: false })
      .setDepth(31);

    this.contentRoot.add([content, hitZone]);

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
      const DEPTH = 38;
      const track = this.add.rectangle(trackX, y, 5, h, 0x2b190d, 0.82)
        .setOrigin(0.5, 0).setDepth(DEPTH).setScrollFactor(0);
      const handleH = Math.max(34, h * (h / contentHeight));
      const handle = this.add.rectangle(trackX, y + 3, 10, handleH, 0xd29643, 0.98)
        .setOrigin(0.5, 0).setDepth(DEPTH + 1).setScrollFactor(0)
        .setInteractive({ useHandCursor: true });
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
      this._scrollMasks.push(track, handle);
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
    if (this.loginOverlay && !forceRedraw) return;
    this.loginOverlay?.destroy(true);

    if (this.isPhone()) {
      this._showLoginOverlayPhone();
      return;
    }

    const { width, height } = this.scale;
    const panelW = Math.min(760, width - 48);
    const panelH = Math.min(520, height - 70);
    const x = width / 2 - panelW / 2;
    const y = height / 2 - panelH / 2;
    this.loginOverlay = this.add.container(0, 0).setDepth(9000);
    this.loginOverlay.visible = true;

    const shade = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.68).setInteractive();
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
      fontFamily: "Georgia, 'Times New Roman', serif", fontSize: "30px",
      color: "#ffe0a0", stroke: "#1d0d05", strokeThickness: 5
    }).setOrigin(0.5);
    const subtitleText = this.walletSystem.connected
      ? "Review what this wallet owns before entering the world."
      : "Connect a wallet to load your profile, houses, and characters.";
    const subtitle = this.add.text(width / 2, y + 92, subtitleText, this.textStyle(14, "#d8c6a1")).setOrigin(0.5);
    this.loginOverlay.add([title, subtitle]);

    if (this.walletSystem.connected) {
      this.drawWalletProfilePanel(x + 24, y + 118, panelW - 48, panelH - 198);
      this.addModalButton(width / 2 - 248, y + panelH - 58, 150, "Enter",      () => this.beginGame());
      this.addModalButton(width / 2 - 76,  y + panelH - 58, 150, "Disconnect", () => { this.walletSystem.disconnect(); this.loginMode = "wallet"; localStorage.setItem("eldervalley-login-mode", "wallet"); this.showLoginOverlay(true); });
      this.addModalButton(width / 2 + 96,  y + panelH - 58, 150, "Back",       () => { this.loginOverlay?.destroy(true); this.loginOverlay = null; });
      return;
    }

    const cardW = (panelW - 84) / 3;
    const cardY = y + 126;
    this.addLoginChoiceCard(x + 24,              cardY, cardW, 172, "Guest",    "Explore without a wallet. Purchases stay locked.", null,       () => { this.loginMode = "guest"; localStorage.setItem("eldervalley-login-mode", "guest"); this.walletSystem.status = "Guest mode active."; this.beginGame(); });
    this.addLoginChoiceCard(x + 42 + cardW,      cardY, cardW, 172, "MetaMask", "Enter with an EVM wallet.",                        "metamask", () => this.handleWalletConnect("metamask"));
    this.addLoginChoiceCard(x + 60 + cardW * 2,  cardY, cardW, 172, "Phantom",  "Enter with Phantom.",                             "phantom",  () => this.handleWalletConnect("phantom"));

    const summary = this.add.text(x + 42, cardY + 204, `Guest: enter to test without saving purchases.\nWallet: loads account houses, characters, and items.\n${this.walletSystem.status}`, {
      fontFamily: "monospace", fontSize: "14px", color: "#e9d5a0",
      stroke: "#080402", strokeThickness: 3, lineSpacing: 8, wordWrap: { width: panelW - 84 }
    }).setOrigin(0);
    this.loginOverlay.add(summary);
    this.addModalButton(width / 2 - 78, y + panelH - 58, 156, "Back", () => { this.loginOverlay?.destroy(true); this.loginOverlay = null; });
  }

  _showLoginOverlayPhone() {
    const { width, height } = this.scale;
    const cx = width / 2;
    const panelW = width - 28;
    const panelH = Math.min(380, height - 60);
    const px = 14;
    const py = height / 2 - panelH / 2;

    this.loginOverlay = this.add.container(0, 0).setDepth(9000);
    const shade = this.add.rectangle(cx, height / 2, width, height, 0x000000, 0.78).setInteractive();
    const g = this.add.graphics();
    g.fillStyle(0x07101a, 0.99);
    g.fillRoundedRect(px, py, panelW, panelH, 10);
    g.lineStyle(3, 0x030201, 1);
    g.strokeRoundedRect(px, py, panelW, panelH, 10);
    g.lineStyle(2, 0xd29643, 1);
    g.strokeRoundedRect(px + 8, py + 8, panelW - 16, panelH - 16, 7);
    g.fillStyle(0x2b190d, 1);
    g.fillRect(px + 16, py + 16, panelW - 32, 36);
    this.loginOverlay.add([shade, g]);

    const titleText = this.walletSystem.connected ? "Your Profile" : "Enter ElderValley";
    this.loginOverlay.add(this.add.text(cx, py + 34, titleText, {
      fontFamily: "Georgia, serif", fontSize: "20px",
      color: "#ffe0a0", stroke: "#1d0d05", strokeThickness: 4
    }).setOrigin(0.5));

    if (this.walletSystem.connected) {
      const addrText = this.walletSystem.getShortAddress();
      this.loginOverlay.add(this.add.text(cx, py + 70, addrText, this.textStyle(11, "#d8c6a1")).setOrigin(0.5));
      this._addPhoneBtn(cx, py + 110, panelW - 48, 48, "▶  Enter Game",  "#7ed98a", "#1d4928", () => this.beginGame());
      this._addPhoneBtn(cx, py + 168, panelW - 48, 40, "Disconnect",     "#e07070", "#3a1010", () => { this.walletSystem.disconnect(); this.loginMode = "wallet"; localStorage.setItem("eldervalley-login-mode", "wallet"); this.showLoginOverlay(true); });
      this._addPhoneBtn(cx, py + 218, panelW - 48, 40, "Back",           "#d8c6a1", "#1a1a1a", () => { this.loginOverlay?.destroy(true); this.loginOverlay = null; });
      return;
    }

    this.loginOverlay.add(this.add.text(cx, py + 66, "Choose how to enter:", this.textStyle(12, "#a0b8cc")).setOrigin(0.5));

    const statusTxt = this.add.text(cx, py + panelH - 44, this.walletSystem.status, {
      ...this.textStyle(10, "#9fb8d9"), align: "center", wordWrap: { width: panelW - 32 }
    }).setOrigin(0.5);
    this.loginOverlay.add(statusTxt);

    this._addPhoneBtn(cx, py + 112, panelW - 48, 52, "🧑  Play as Guest",  "#ffd574", "#2b1a00", () => {
      this.loginMode = "guest";
      localStorage.setItem("eldervalley-login-mode", "guest");
      this.walletSystem.status = "Guest mode — purchases locked.";
      statusTxt.setText(this.walletSystem.status);
      this.beginGame();
    });
    this._addPhoneBtn(cx, py + 174, panelW - 48, 52, "🦊  MetaMask",       "#ff9944", "#2b1500", () => this.handleWalletConnect("metamask").then(() => { statusTxt.setText(this.walletSystem.status); }).catch(() => { statusTxt.setText(this.walletSystem.status); }));
    this._addPhoneBtn(cx, py + 236, panelW - 48, 52, "👻  Phantom",        "#a080ff", "#1a0f30", () => this.handleWalletConnect("phantom").then(() => { statusTxt.setText(this.walletSystem.status); }).catch(() => { statusTxt.setText(this.walletSystem.status); }));
    this._addPhoneBtn(cx, py + 300, panelW - 48, 40, "✕  Back",            "#d8c6a1", "#1a1a1a", () => { this.loginOverlay?.destroy(true); this.loginOverlay = null; });
  }

  _addPhoneBtn(cx, cy, w, h, label, textColor, bgHex, onClick) {
    const bg = parseInt(bgHex.replace("#",""), 16);
    const btn = this.add.rectangle(cx, cy, w, h, bg, 0.96)
      .setStrokeStyle(1.5, parseInt(textColor.replace("#",""), 16), 0.8)
      .setInteractive({ useHandCursor: true });
    const txt = this.add.text(cx, cy, label, {
      fontFamily: "monospace", fontSize: "15px",
      color: textColor, stroke: "#080402", strokeThickness: 3
    }).setOrigin(0.5);
    btn.on("pointerdown", () => { this.playUiTone("click"); onClick(); });
    btn.on("pointerover",  () => btn.setAlpha(0.8));
    btn.on("pointerout",   () => btn.setAlpha(1));
    this.loginOverlay.add([btn, txt]);
  }

  drawWalletProfilePanel(x, y, w, h) {
    const profile = this.walletSystem.profile ?? {};
    const houses = profile.ownedHouses ?? [];
    const characterCatalog = this.getCharacterCatalog();
    const ownedCharacterIds = profile.ownedCharacters ?? [];
    const selected = characterCatalog.find((character) => character.id === (profile.selectedCharacter ?? this.selectedCharacter)) ?? characterCatalog[0];
    const ownedCharacters = ownedCharacterIds
      .map((id) => characterCatalog.find((character) => character.id === id)?.name ?? id)
      .join(", ") || "No characters purchased yet";
    const ownedHouses = houses
      .map((house) => house.name ?? this.getHouseCatalog().find((item) => item.key === house.id)?.name ?? house.id)
      .join("\n") || "No houses purchased yet";

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
      `Network: ${this.walletSystem.wallet?.chain ?? "EVM"}`,
      `Purchased houses: ${houses.length}`,
      `Characters: ${ownedCharacterIds.length}`
    ];
    this.addProfileBox(infoX, y + 22, infoW, 104, "Account Summary", info.join("\n"));
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
      let profile = payload?.profile;
      if (!profile) {
        await this.saveInitialProfile(profileId);
        return true;
      }
      // Enter as the character the player picked (each character is a separate save).
      // If it differs from the server's active one, POST the switch and adopt the
      // per-character projection the server returns (its coins/bag/leveling block).
      const desired = TitleScene.SELECTABLE_CHARACTERS.includes(this.selectedCharacter) ? this.selectedCharacter : "mage-1";
      if (profile.selectedCharacter !== desired) {
        try {
          const res = await fetch(`/api/profile/${encodeURIComponent(profileId)}`, {
            method: "POST",
            headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
            body: JSON.stringify({ ...profile, selectedCharacter: desired })
          });
          const pj = await res.json();
          if (pj?.profile) profile = pj.profile;
        } catch { /* keep the GET profile */ }
      }
      this.selectedCharacter = desired;
      this.registry.set("playerProfile", profile);
      this.registry.set("coins", Number(profile.coins ?? 0));
      this.registry.set("coinsKey", `${profileId}-${desired}`);
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
