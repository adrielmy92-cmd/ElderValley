export default class GamePreloadScene extends Phaser.Scene {
  constructor() {
    super("GamePreloadScene");
  }

  init(data = {}) {
    this.targetScene = data.targetScene ?? "WorldScene";
    this.spawnKey = data.spawnKey ?? (this.targetScene === "CityScene" ? "fromVillage" : "start");
    this.entryData = data.entryData ?? {};
  }

  preload() {
    this.drawLoadingUi();

    this.loadImage("reference-house", "./assets/sprites/reference-house.png");
    this.loadImage("blacksmith-house", "./assets/sprites/blacksmith-house.png?v=132");
    this.loadImage("card-shop-house", "./assets/sprites/card-shop-house.png?v=132");
    this.loadImage("middle-forge-house", "./assets/sprites/middle-forge-house.png?v=132");
    this.loadImage("fence-h", "./assets/sprites/fence-pack-h.png?v=132");
    this.loadImage("fence-v", "./assets/sprites/fence-pack-v.png?v=132");
    this.loadImage("fence-post", "./assets/sprites/fence-pack-post.png?v=132");
    this.loadImage("fence-gate", "./assets/sprites/fence-pack-gate.png?v=132");
    this.loadImage("fence-gate-open", "./assets/sprites/fence-pack-gate-open.png?v=132");

    this.loadImage("creative-tree-pine", "./assets/sprites/creative-tree-pine.png?v=132");
    this.loadImage("creative-tree-flower", "./assets/sprites/creative-tree-flower.png?v=132");
    this.loadImage("creative-tree-round", "./assets/sprites/creative-tree-round.png?v=132");
    this.loadImage("creative-tree-ancient", "./assets/sprites/creative-tree-ancient.png?v=132");
    this.loadImage("creative-tree-twisted", "./assets/sprites/creative-tree-twisted-game.png?v=132");
    this.loadImage("creative-tree-flower-cone", "./assets/sprites/creative-tree-flower-cone-game.png?v=132");
    this.loadImage("creative-tree-layered-pine", "./assets/sprites/creative-tree-layered-pine-game.png?v=132");
    this.loadImage("creative-tree-willow", "./assets/sprites/creative-tree-willow-game.png?v=132");
    this.loadImage("creative-tree-birch", "./assets/sprites/creative-tree-birch-game.png?v=132");
    this.loadImage("creative-tree-cypress", "./assets/sprites/creative-tree-cypress-game.png?v=132");
    this.loadImage("creative-tree-red-maple", "./assets/sprites/creative-tree-red-maple-game.png?v=132");
    this.loadImage("creative-tree-palm", "./assets/sprites/creative-tree-palm-game.png?v=132");

    this.loadImage("creative-structure-fruit-stall", "./assets/sprites/creative-structure-fruit-stall-game.png?v=132");
    this.loadImage("creative-structure-knight-statue", "./assets/sprites/creative-structure-knight-statue-game.png?v=132");
    this.loadImage("creative-structure-fountain", "./assets/sprites/creative-structure-fountain-game.png?v=132");
    this.loadImage("creative-structure-well", "./assets/sprites/creative-structure-well-game.png?v=132");
    this.loadImage("creative-structure-lamp-double", "./assets/sprites/creative-structure-lamp-double.png?v=207");
    this.loadImage("creative-structure-lamp-hanging", "./assets/sprites/creative-structure-lamp-hanging.png?v=207");
    this.loadImage("creative-structure-lamp-monk", "./assets/sprites/creative-structure-lamp-monk.png?v=207");
    this.loadImage("creative-structure-lamp-vine", "./assets/sprites/creative-structure-lamp-vine.png?v=207");
    this.loadSheet("creative-structure-campfire", "./assets/sprites/creative-structure-campfire-sheet.png?v=204", 384, 352);
    this.loadSheet("creative-animal-cat", "./assets/sprites/creative-animal-cat-sheet.png?v=176", 96, 96);
    this.loadSheet("creative-animal-bull", "./assets/sprites/creative-animal-bull-sheet.png?v=176", 96, 96);
    this.loadSheet("creative-npc-hooded", "./assets/sprites/creative-npc-hooded-sheet.png?v=1", 194, 194);
    this.loadSheet("creative-npc-skeleton-archer", "./assets/sprites/skeleton-archer-idle-sheet.png?v=1", 132, 132);

    this.loadSheet("spell-lightning-sheet", "./assets/sprites/spell-lightning-sheet.png?v=1", 192, 192);

    this.loadImage("boss-arena-lava", "./assets/maps/boss-arena-lava.png?v=2");
    this.loadImage("swamp-map", "./assets/maps/swamp-map.png?v=2");
    this.loadImage("bee-map", "./assets/maps/bee-map.jpg?v=1");
    this.loadSheet("bee-boss-idle-sheet",   "./assets/sprites/bee-boss-idle-sheet.png?v=1", 102, 102);
    this.loadSheet("bee-soldier-sheet",     "./assets/sprites/bee-soldier-sheet.png", 60, 60);
    this.loadSheet("bee-honey-puddle-sheet","./assets/sprites/bee-honey-puddle-sheet.png?v=1", 192, 192);
    this.loadAudio("spell-lightning-cast",   "./assets/audio/spell-lightning-cast.mp3");
    this.loadAudio("spell-lightning-loop",   "./assets/audio/spell-lightning-loop.mp3");
    this.loadAudio("bee-honey-puddle-drop",  "./assets/audio/bee-honey-puddle-drop.mp3");
    this.loadAudio("bee-honey-puddle-loop",  "./assets/audio/bee-honey-puddle-loop.mp3");
    this.loadAudio("bee-battle",      "./assets/audio/bee-battle.ogg");
    this.loadAudio("bee-sting-fire",  "./assets/audio/bee-sting-fire.ogg");
    this.loadAudio("bee-hit",         "./assets/audio/bee-hit.ogg");
    this.loadAudio("bee-boss-death",       "./assets/audio/bee-boss-death.ogg");
    this.loadAudio("bee-queen-death-line", "./assets/audio/bee-queen-death-line.mp3");
    this.loadAudio("bee-queen-voice",    "./assets/audio/bee-queen-voice.mp3");
    this.loadAudio("bee-queen-soldiers", "./assets/audio/bee-queen-soldiers.mp3");
    ["bee-queen-aggro","bee-queen-phase2","bee-queen-phase3",
     "bee-queen-t1","bee-queen-t2","bee-queen-t3",
     "bee-queen-t4","bee-queen-t5","bee-queen-t6",
     "bee-queen-t7","bee-queen-t8","bee-queen-t9"
    ].forEach(k => this.loadAudio(k, `./assets/audio/${k}.mp3`));
    this.loadSheet("swamp-troll", "./assets/sprites/swamp-troll-sheet.png?v=1", 86, 86);
    this.loadSheet("swamp-attacks", "./assets/sprites/swamp-attacks-sheet.png?v=1", 192, 160);
    this.loadAudio("swamp-troll-aggro",  "./assets/audio/swamp-troll-aggro.ogg");
    this.loadAudio("swamp-troll-death",  "./assets/audio/swamp-troll-death.ogg");
    this.loadAudio("swamp-troll-hurt",   "./assets/audio/swamp-troll-hurt.wav");
    this.loadAudio("swamp-ambient",      "./assets/audio/swamp-ambient.ogg?v=2");
    this.loadAudio("swamp-bubble-warn",  "./assets/audio/swamp-bubble-warn.ogg");
    this.loadAudio("swamp-bubble-burst", "./assets/audio/swamp-bubble-burst.ogg");
    this.loadAudio("swamp-spike",        "./assets/audio/swamp-spike.ogg");
    this.loadAudio("swamp-sludge",       "./assets/audio/swamp-sludge.ogg");
    this.loadSheet("boss-golem-walk", "./assets/sprites/boss-golem-walk-sheet.png?v=2", 200, 200);
    this.loadSheet("boss-golem-attack", "./assets/sprites/boss-golem-attack-sheet.png?v=2", 200, 200);
    this.loadSheet("boss-meteor", "./assets/sprites/boss-meteor-sheet.png?v=1", 128, 128);
    this.loadSheet("boss-ground-explosion", "./assets/sprites/boss-ground-explosion-sheet.png?v=1", 160, 160);
    this.loadSheet("boss-rock-proj", "./assets/sprites/boss-rock-proj-sheet.png?v=2", 128, 128);
    this.loadImage("alchemist-interior", "./assets/sprites/alchemist-interior.png?v=146");
    this.loadImage("volcano-gate-raw", "./assets/sprites/volcano-gate.png?v=1");
    for (let index = 1; index <= 19; index += 1) {
      const padded = String(index).padStart(2, "0");
      this.loadImage(`creative-floor-${padded}`, `./assets/tilesets/creative-floor-${padded}.png?v=132`);
    }

    this.loadSheet("windmill-house", "./assets/sprites/windmill-house-sheet.png?v=132", 300, 388);
    this.loadImage("reference-tree", "./assets/sprites/reference-tree.png");
    this.loadSheet("silver-npc-sheet", "./assets/sprites/silver-npc-sheet.png?v=132", 48, 68);
    this.loadSheet("blond-npc-sheet", "./assets/sprites/blond-npc-sheet.png?v=132", 48, 68);
    this.loadSheet("hooded-sheet", "./assets/sprites/hooded-sheet.png?v=133", 48, 68);
    this.loadSheet("knight-npc-sheet", "./assets/sprites/knight-npc-sheet.png?v=132", 80, 84);
    this.loadSheet("knight-npc-idle-sheet", "./assets/sprites/knight-npc-idle-sheet.png?v=132", 80, 84);
  }

  create() {
    this.applyChromaKey("volcano-gate-raw", "volcano-gate", 255, 0, 255);
    this.scene.start(this.targetScene, {
      ...this.entryData,
      spawnKey: this.spawnKey
    });
  }

  applyChromaKey(sourceKey, destKey, r, g, b) {
    if (this.textures.exists(destKey) || !this.textures.exists(sourceKey)) {
      return;
    }
    const src = this.textures.get(sourceKey).source[0];
    const canvas = document.createElement("canvas");
    canvas.width = src.width;
    canvas.height = src.height;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(src.image, 0, 0);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    for (let i = 0; i < data.length; i += 4) {
      if (data[i] > 180 && data[i + 1] < 60 && data[i + 2] > 180) {
        data[i + 3] = 0;
      }
    }
    ctx.putImageData(imageData, 0, 0);
    this.textures.addCanvas(destKey, canvas);
  }

  loadImage(key, url) {
    if (!this.textures.exists(key)) {
      this.load.image(key, url);
    }
  }

  loadAudio(key, url) {
    if (!this.cache.audio.exists(key)) {
      this.load.audio(key, url);
    }
  }

  loadSheet(key, url, frameWidth, frameHeight) {
    if (!this.textures.exists(key)) {
      this.load.spritesheet(key, url, { frameWidth, frameHeight });
    }
  }

  drawLoadingUi() {
    const width = this.scale.width;
    const height = this.scale.height;
    this.add.rectangle(0, 0, width, height, 0x08111d, 1).setOrigin(0);
    this.add.text(width / 2, height / 2 - 22, "Loading ElderValley", {
      fontFamily: "monospace",
      fontSize: "22px",
      color: "#f3d08a",
      stroke: "#000000",
      strokeThickness: 4
    }).setOrigin(0.5);

    const barWidth = Math.min(420, width - 80);
    const bar = this.add.rectangle(width / 2 - barWidth / 2, height / 2 + 22, 0, 10, 0xf0b84e, 1).setOrigin(0, 0.5);
    this.add.rectangle(width / 2, height / 2 + 22, barWidth, 12, 0xd29643, 0.35).setStrokeStyle(1, 0xf0c36a);
    this.load.on("progress", (value) => {
      bar.width = barWidth * value;
    });
  }
}
