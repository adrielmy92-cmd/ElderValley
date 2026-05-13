export default class TitleScene extends Phaser.Scene {
  constructor() {
    super("TitleScene");
  }

  create(data = {}) {
    this.targetScene = data.targetScene ?? "WorldScene";
    this.spawnKey = data.spawnKey ?? "start";
    this.started = false;
    this.activePanel = "characters";
    this.selectedCharacter = localStorage.getItem("eldervalley-selected-character") ?? "mage-1";
    this.lamps = [];
    this.fireflies = [];

    this.buildTitleScreen();
    this.startTitleMusic();
    this.input.keyboard?.once("keydown-ENTER", () => this.startGame());
    this.input.keyboard?.once("keydown-SPACE", () => this.startGame());
    this.input.keyboard?.once("keydown-E", () => this.startGame());
  }

  startTitleMusic() {
    this.stopTitleMusic(true);
    this.titleMusic = new Audio("./assets/audio/title-theme.mp3?v=131");
    this.titleMusic.loop = true;
    this.titleMusic.autoplay = true;
    this.titleMusic.preload = "auto";
    this.titleMusic.volume = 0.42;

    const playMusic = () => {
      if (!this.titleMusic || !this.titleMusic.paused) {
        return;
      }
      const playPromise = this.titleMusic.play();
      if (playPromise?.catch) {
        playPromise.catch(() => {
          this.input.once("pointerdown", playMusic);
          this.input.keyboard?.once("keydown", playMusic);
        });
      }
    };

    playMusic();
    this.time.delayedCall(160, playMusic);
    this.time.delayedCall(600, playMusic);
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
    const cx = width / 2;

    this.cameras.main.setBackgroundColor("#07101a");
    this.add.tileSprite(cx, height / 2, width, height, "tile-grass")
      .setAlpha(0.22)
      .setDepth(0);

    this.addBackdrop(width, height);
    this.addSiteTitle(cx, width);
    this.addVideoPanel(width, height);
    this.addInfoPanel(width, height);
    this.addFooter(width, height);
  }

  addBackdrop(width, height) {
    const graphics = this.add.graphics().setDepth(1);
    graphics.fillStyle(0x06101a, 0.86);
    graphics.fillRect(0, 0, width, height);
    graphics.fillStyle(0x172f22, 0.55);
    graphics.fillRect(0, height * 0.78, width, height * 0.22);
    graphics.fillStyle(0x0b1520, 0.94);
    graphics.fillRect(0, 0, width, 116);
    graphics.fillStyle(0x2f1b10, 0.9);
    graphics.fillRect(0, 112, width, 5);
    graphics.fillStyle(0xc28b43, 0.75);
    graphics.fillRect(0, 117, width, 2);

    for (let i = 0; i < 30; i += 1) {
      const x = Phaser.Math.Between(20, width - 120);
      const y = Phaser.Math.Between(142, height - 34);
      graphics.fillStyle(i % 2 === 0 ? 0x213d2c : 0x10263a, 0.28);
      graphics.fillRect(x, y, Phaser.Math.Between(40, 96), Phaser.Math.Between(3, 8));
    }
  }

  addSiteTitle(cx, width) {
    this.add.text(cx, 56, "ElderValley", {
      fontFamily: "Georgia, 'Times New Roman', serif",
      fontSize: `${Math.max(60, Math.min(102, width * 0.067))}px`,
      color: "#ffd678",
      stroke: "#2a1006",
      strokeThickness: 9,
      shadow: { offsetX: 4, offsetY: 5, color: "#050302", blur: 0, fill: true }
    }).setOrigin(0.5).setDepth(20);

    this.add.text(cx, 106, "Versao Demo", {
      fontFamily: "monospace",
      fontSize: "17px",
      color: "#d9c48b",
      stroke: "#120905",
      strokeThickness: 4
    }).setOrigin(0.5).setDepth(21);
  }

  addVideoPanel(width, height) {
    const margin = 28;
    const top = 142;
    const availableRightPanel = Math.max(390, Math.min(500, width * 0.3));
    const panelW = Math.max(560, width - availableRightPanel - margin * 3);
    const panelH = height - top - 48;
    const x = margin;
    const y = top;

    this.videoPanel = { x, y, width: panelW, height: panelH };
    this.drawPanelFrame(x, y, panelW, panelH, "Apresentacao");

    const videoX = x + 18;
    const videoY = y + 52;
    const videoW = panelW - 36;
    const videoH = panelH - 70;
    this.videoBounds = { x: videoX, y: videoY, width: videoW, height: videoH };

    const maskShape = this.make.graphics({ x: 0, y: 0, add: false });
    maskShape.fillStyle(0xffffff, 1);
    maskShape.fillRect(videoX, videoY, videoW, videoH);
    this.videoMask = maskShape.createGeometryMask();

    if (this.cache.video.exists("title-intro")) {
      this.titleVideo = this.add.video(videoX + videoW / 2, videoY + videoH / 2, "title-intro")
        .setOrigin(0.5)
        .setDepth(5)
        .setMask(this.videoMask);
      this.titleVideo.setMute(true);
      this.titleVideo.play(true);
      this.scaleTitleVideo(videoW, videoH);
      this.titleVideo.video?.addEventListener("loadedmetadata", () => this.scaleTitleVideo(videoW, videoH));
      this.titleVideo.video?.addEventListener("loadeddata", () => this.scaleTitleVideo(videoW, videoH));
      this.time.delayedCall(120, () => this.scaleTitleVideo(videoW, videoH));
    }

    this.addVeoCover(videoX, videoY, videoW, videoH);
    this.addHiddenStartZone(videoX, videoY, videoW, videoH);
  }

  scaleTitleVideo(width, height) {
    if (!this.titleVideo) {
      return;
    }
    const source = this.titleVideo.video;
    const sourceWidth = source?.videoWidth || this.titleVideo.width;
    const sourceHeight = source?.videoHeight || this.titleVideo.height;
    if (!sourceWidth || !sourceHeight) {
      return;
    }
    const scale = Math.min(width / sourceWidth, height / sourceHeight);
    this.titleVideo.setScale(scale);
  }

  drawPanelFrame(x, y, width, height, label) {
    const graphics = this.add.graphics().setDepth(4);
    graphics.fillStyle(0x05080c, 0.72);
    graphics.fillRoundedRect(x + 8, y + 10, width, height, 8);
    graphics.fillStyle(0x20140c, 0.94);
    graphics.fillRoundedRect(x, y, width, height, 8);
    graphics.lineStyle(5, 0x090604, 1);
    graphics.strokeRoundedRect(x, y, width, height, 8);
    graphics.lineStyle(2, 0xd29643, 1);
    graphics.strokeRoundedRect(x + 8, y + 8, width - 16, height - 16, 5);
    graphics.fillStyle(0x5c351b, 1);
    graphics.fillRect(x + 18, y + 18, width - 36, 24);
    graphics.fillStyle(0x855329, 1);
    for (let i = 0; i < 4; i += 1) {
      graphics.fillRect(x + 28, y + 23 + i * 5, width - 56, 2);
    }

    this.add.text(x + 34, y + 30, label, {
      fontFamily: "Georgia, 'Times New Roman', serif",
      fontSize: "22px",
      color: "#ffe0a0",
      stroke: "#1d0d05",
      strokeThickness: 4
    }).setOrigin(0, 0.5).setDepth(6);
  }

  addVeoCover(videoX, videoY, videoW, videoH) {
    const panelWidth = Math.min(300, Math.max(230, videoW * 0.24));
    const panelHeight = 72;
    const x = videoX + videoW - panelWidth - 12;
    const y = videoY + videoH - panelHeight - 10;
    const graphics = this.add.graphics().setDepth(8);

    graphics.fillStyle(0x080503, 0.7);
    graphics.fillRoundedRect(x + 5, y + 6, panelWidth, panelHeight, 6);
    graphics.fillStyle(0x3f2615, 0.99);
    graphics.fillRoundedRect(x, y, panelWidth, panelHeight, 6);
    graphics.lineStyle(4, 0x1b0d06, 1);
    graphics.strokeRoundedRect(x, y, panelWidth, panelHeight, 6);
    graphics.lineStyle(2, 0xc79045, 1);
    graphics.strokeRoundedRect(x + 6, y + 6, panelWidth - 12, panelHeight - 12, 4);
    graphics.fillStyle(0x6b3f20, 1);
    graphics.fillRect(x + 14, y + 15, panelWidth - 28, 5);
    graphics.fillRect(x + 14, y + 34, panelWidth - 28, 5);
    graphics.fillRect(x + 14, y + 53, panelWidth - 28, 4);
    graphics.fillStyle(0x102f48, 1);
    graphics.fillTriangle(x + 26, y + 17, x + 58, y + 36, x + 26, y + 55);
    graphics.lineStyle(2, 0xd6a65d, 1);
    graphics.strokeTriangle(x + 26, y + 17, x + 58, y + 36, x + 26, y + 55);
    graphics.fillStyle(0x78d5ff, 0.9);
    graphics.fillCircle(x + 37, y + 36, 5);

    this.add.text(x + 74, y + 37, "ElderValley", {
      fontFamily: "Georgia, 'Times New Roman', serif",
      fontSize: "28px",
      color: "#ffd889",
      stroke: "#1d0d05",
      strokeThickness: 5
    }).setOrigin(0, 0.5).setDepth(9);
  }

  addHiddenStartZone(videoX, videoY, videoW, videoH) {
    this.add.zone(
      videoX + videoW / 2,
      videoY + videoH * 0.86,
      Math.min(460, videoW * 0.44),
      Math.min(90, videoH * 0.16)
    )
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .setDepth(30)
      .on("pointerdown", () => this.startGame());
  }

  addInfoPanel(width, height) {
    const margin = 28;
    const top = 142;
    const x = this.videoPanel.x + this.videoPanel.width + 24;
    const y = top;
    const panelW = width - x - margin;
    const panelH = height - top - 48;

    this.infoPanel = { x, y, width: panelW, height: panelH };
    this.drawPanelFrame(x, y, panelW, panelH, "Portal");
    this.addTabs(x + 22, y + 62, panelW - 44);
    this.contentLayer = this.add.container(0, 0).setDepth(14);
    this.renderInfoContent();
  }

  addTabs(x, y, width) {
    this.tabs = [
      { id: "characters", label: "Personagens" },
      { id: "houses", label: "Casas" },
      { id: "news", label: "Novidades" }
    ];
    const tabW = Math.max(100, (width - 16) / this.tabs.length);
    this.tabObjects = this.tabs.map((tab, index) => {
      const tx = x + index * (tabW + 8);
      const button = this.add.rectangle(tx, y, tabW, 42, 0x2d1b10, 0.95)
        .setOrigin(0, 0.5)
        .setStrokeStyle(2, 0x9c6b35)
        .setInteractive({ useHandCursor: true })
        .setDepth(13);
      const label = this.add.text(tx + tabW / 2, y, tab.label, {
        fontFamily: "monospace",
        fontSize: "14px",
        color: "#f7d99a",
        stroke: "#120805",
        strokeThickness: 3
      }).setOrigin(0.5).setDepth(14);
      button.on("pointerdown", () => {
        this.activePanel = tab.id;
        this.renderInfoContent();
      });
      return { tab, button, label };
    });
  }

  renderInfoContent() {
    this.contentLayer?.removeAll(true);
    this.tabObjects?.forEach(({ tab, button }) => {
      button.setFillStyle(tab.id === this.activePanel ? 0x6b3f20 : 0x2d1b10, 0.96);
      button.setStrokeStyle(2, tab.id === this.activePanel ? 0xe0aa52 : 0x9c6b35);
    });

    if (this.activePanel === "houses") {
      this.renderHouseStore();
      return;
    }
    if (this.activePanel === "news") {
      this.renderNewsPanel();
      return;
    }
    this.renderCharacterPanel();
  }

  renderCharacterPanel() {
    const { x, y, width } = this.infoPanel;
    const startY = y + 126;
    this.addContentText(x + 28, startY, "Escolha seu personagem", 27, "#ffe0a0");
    this.addContentText(x + 28, startY + 42, "Classes iniciais para entrar no vale.", 15, "#d5c29a");

    [
      { id: "mage-1", name: "Mago 1", key: "mage-1-idle-sheet", frame: 0, scale: 1.15, desc: "Controle arcano e exploracao." },
      { id: "knight", name: "Cavaleiro", key: "knight-npc-sheet", frame: 0, scale: 1.15, desc: "Armadura pesada e presenca de guarda." }
    ].forEach((card, index) => {
      const cardX = x + 28;
      const cardY = startY + 92 + index * 112;
      const selected = this.selectedCharacter === card.id;
      this.addCard(cardX, cardY, width - 56, 92, selected);
      const zone = this.add.zone(cardX, cardY, width - 56, 92)
        .setOrigin(0)
        .setInteractive({ useHandCursor: true })
        .setDepth(19)
        .on("pointerdown", () => this.selectCharacter(card.id));
      this.contentLayer.add(zone);
      const sprite = this.add.sprite(cardX + 54, cardY + 78, card.key, card.frame)
        .setOrigin(0.5, 1)
        .setScale(card.scale)
        .setDepth(16);
      this.contentLayer.add(sprite);
      this.addContentText(cardX + 106, cardY + 25, card.name, 21, "#ffd889");
      this.addContentText(cardX + 106, cardY + 57, card.desc, 14, "#d8c6a1");
      this.addContentText(cardX + width - 142, cardY + 46, selected ? "Selecionado" : "Escolher", 13, selected ? "#9dffb0" : "#ffe0a0");
    });
  }

  selectCharacter(characterId) {
    this.selectedCharacter = characterId;
    localStorage.setItem("eldervalley-selected-character", characterId);
    this.registry.set("playerCharacter", characterId);
    this.renderInfoContent();
  }

  renderHouseStore() {
    const { x, y, width } = this.infoPanel;
    const startY = y + 126;
    this.addContentText(x + 28, startY, "Casas a venda", 27, "#ffe0a0");
    this.addContentText(x + 28, startY + 42, "Lotes e estruturas para construir sua historia.", 15, "#d5c29a");

    const houses = [
      { name: "Casa alta", key: "creative-house-cottage", price: "1.200 EV", scale: 0.15 },
      { name: "Mercado azul", key: "creative-house-blue-market", price: "2.900 EV", scale: 0.14 },
      { name: "Hospedaria", key: "creative-house-red-lodge", price: "3.400 EV", scale: 0.13 },
      { name: "Casa verde", key: "creative-house-green-cottage", price: "2.200 EV", scale: 0.15 },
      { name: "Taverna", key: "creative-house-tavern", price: "3.800 EV", scale: 0.12 },
      { name: "Mansao", key: "creative-house-manor", price: "6.500 EV", scale: 0.12 }
    ];
    const columns = width >= 430 ? 2 : 1;
    const gap = 12;
    const cardW = columns === 2 ? (width - 56 - gap) / 2 : width - 56;
    const cardH = 118;

    houses.forEach((house, index) => {
      const col = index % columns;
      const row = Math.floor(index / columns);
      const cardX = x + 28 + col * (cardW + gap);
      const cardY = startY + 90 + row * (cardH + 12);
      this.addCard(cardX, cardY, cardW, cardH);
      const image = this.add.image(cardX + cardW / 2, cardY + 74, house.key)
        .setOrigin(0.5, 1)
        .setScale(house.scale)
        .setDepth(16);
      this.contentLayer.add(image);
      this.addContentText(cardX + 14, cardY + 92, house.name, 16, "#ffd889");
      this.addContentText(cardX + 14, cardY + 111, house.price, 12, "#d8c6a1");
    });
  }

  renderNewsPanel() {
    const { x, y, width } = this.infoPanel;
    const startY = y + 126;
    this.addContentText(x + 28, startY, "Mundo vivo", 27, "#ffe0a0");
    [
      "Economia com trabalho, coleta e comercio.",
      "Casas compraveis e decoraveis.",
      "Cidade criada no modo criativo vira mapa jogavel.",
      "Exploracao, guildas e eventos sazonais."
    ].forEach((row, index) => {
      const ry = startY + 64 + index * 62;
      this.addCard(x + 28, ry, width - 56, 44);
      this.addContentText(x + 48, ry + 23, row, 15, "#d8c6a1");
    });
  }

  addCard(x, y, width, height, selected = false) {
    const graphics = this.add.graphics().setDepth(15);
    graphics.fillStyle(0x120b07, 0.78);
    graphics.fillRoundedRect(x, y, width, height, 7);
    graphics.lineStyle(2, selected ? 0xffd166 : 0x7b4c26, 1);
    graphics.strokeRoundedRect(x, y, width, height, 7);
    graphics.lineStyle(1, selected ? 0x9dffb0 : 0xd49a4c, 0.75);
    graphics.strokeRoundedRect(x + 5, y + 5, width - 10, height - 10, 4);
    this.contentLayer.add(graphics);
    return graphics;
  }

  addContentText(x, y, text, size, color) {
    const label = this.add.text(x, y, text, {
      fontFamily: size >= 20 ? "Georgia, 'Times New Roman', serif" : "monospace",
      fontSize: `${size}px`,
      color,
      stroke: "#120805",
      strokeThickness: size >= 20 ? 4 : 3,
      wordWrap: { width: Math.max(220, (this.infoPanel?.width ?? 420) - 76) }
    }).setOrigin(0, 0.5).setDepth(16);
    this.contentLayer.add(label);
    return label;
  }

  addFooter(width, height) {
    this.add.text(width / 2, height - 18, "Clique no PRESS START do video ou aperte Enter", {
      fontFamily: "monospace",
      fontSize: "14px",
      color: "#bba77d",
      stroke: "#080402",
      strokeThickness: 3
    }).setOrigin(0.5).setDepth(20);
  }

  update(time) {
    this.lamps.forEach(({ lamp, offset }) => {
      lamp.setTexture(Math.sin(time * 0.008 + offset) > 0 ? "lamp-1" : "lamp-0");
    });

    this.fireflies.forEach(({ firefly, baseX, baseY, speed, phase }) => {
      firefly.x = baseX + Math.sin(time * speed + phase) * 18;
      firefly.y = baseY + Math.cos(time * speed * 1.3 + phase) * 10;
      firefly.alpha = 0.2 + Math.sin(time * 0.004 + phase) * 0.16;
    });
  }

  startGame() {
    if (this.started) {
      return;
    }
    this.started = true;
    this.registry.set("playerCharacter", this.selectedCharacter);
    localStorage.setItem("eldervalley-selected-character", this.selectedCharacter);
    this.stopTitleMusic(false);
    this.cameras.main.fadeOut(420, 0, 0, 0);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.start(this.targetScene, { spawnKey: this.spawnKey });
    });
  }
}
