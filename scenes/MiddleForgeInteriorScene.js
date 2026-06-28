import InteriorBaseScene from "./InteriorBaseScene.js?v=270";
import ShopSystem from "../systems/ShopSystem.js?v=34";
import { ALCHEMIST_ITEMS } from "../data/alchemist-items.js?v=35";

const W = 1280;
const H = 956;

export default class MiddleForgeInteriorScene extends InteriorBaseScene {
  constructor() {
    super("MiddleForgeInteriorScene");
  }

  create() {
    this.makeRoom({
      width: W,
      height: H,
      title: "Central Forge",
      spawnX: 610,
      spawnY: 840
    });

    // Painted forge interior as the floor/background (covers the default tiles).
    this.add.image(0, 0, "forge-interior").setOrigin(0).setDepth(-6);

    this.addForgeCollisions();

    // Flavor look-prompts on the big props.
    this.interactions.add({ x: 560, y: 300, promptY: 250, promptText: "E Look", radius: 64,
      onInteract: () => this.dialog.show("Forge", "The great hearth roars — iron glows white-hot at its heart.") });
    this.interactions.add({ x: 225, y: 470, promptY: 424, promptText: "E Look", radius: 50,
      onInteract: () => this.dialog.show("Anvil", "Sparks still leap where the last blade was hammered true.") });

    // Blacksmith vendor — all weapons, plus the warrior's heavy metal armor
    // (helmet/armor/boots). Mage gear stays at the Alchemist.
    this.shop = new ShopSystem(this, {
      items: ALCHEMIST_ITEMS.filter(
        (i) =>
          i.slot === "weapon" ||
          (["helmet", "armor", "boots"].includes(i.slot) && i.charClass === "warrior"),
      ),
      title: "The Forge — Armory",
      subtitle: "Blades forged for those who walk into danger"
    });
    this.addForgeVendor(820, 660);

    this.addExitDoor(610, 930, "middleForge");

    this.startForgeAmbience();
  }

  // Interior obstacles (perimeter walls come from makeRoom's addInteriorBounds).
  // Centered rects (cx, cy, w, h) roughly matching the painted props.
  addForgeCollisions() {
    const blocks = [
      [560, 300, 250, 230],  // central great hearth
      [170, 250, 180, 230],  // top-left furnace
      [1150, 470, 170, 210], // right-side forge
      [225, 470, 120, 90],   // anvil on the stump
      [95, 520, 96, 170],    // water quench trough
      [560, 600, 230, 100],  // central work table
      [725, 600, 100, 90],   // grinding wheel
      [330, 810, 300, 90],   // bottom-left workbench
      [1090, 820, 300, 90]   // bottom-right weapon rack/bench
    ];
    blocks.forEach(([cx, cy, w, h]) => this.addSolidRect(cx, cy, w, h));
  }

  // Smith sprite (npc-sheet frame 2) + an "E Weapons" prompt that opens the shop.
  addForgeVendor(x, y) {
    const npc = this.physics.add.sprite(x, y, "npc-sheet", 2).setDepth(y);
    npc.body.setSize(14, 12).setOffset(5, 18);
    npc.body.immovable = true;
    this.solids.add(npc);
    const key = "npc-idle-2";
    if (!this.anims.exists(key)) {
      this.anims.create({
        key, frames: this.anims.generateFrameNumbers("npc-sheet", { start: 2, end: 3 }),
        frameRate: 2, repeat: -1
      });
    }
    npc.play(key);
    this.add.ellipse(x, y + 22, 46, 14, 0x000000, 0.3).setDepth(y - 1);
    this.interactions.add({
      x, y, promptY: y - 40, promptText: "E Weapons", radius: 64,
      enabled: () => !this.shop.isOpen(),
      onInteract: () => this.shop.open()
    });
    return npc;
  }

  // Medieval-forge soundscape: a looping fire roar + irregular hammer-on-anvil clangs.
  startForgeAmbience() {
    if (this.cache.audio.exists("forge-fire")) {
      this._fire = this.sound.add("forge-fire", { loop: true, volume: 0.25 });
      this._fire.play();
    }
    const clang = () => {
      if (!this.scene.isActive()) return;
      const k = Math.random() < 0.5 ? "sword-hit-1" : "sword-hit-2";
      if (this.cache.audio.exists(k)) {
        this.sound.play(k, { volume: 0.18 + Math.random() * 0.12, rate: 0.9 + Math.random() * 0.25 });
      }
      // occasional quick double-strike, like real hammering
      if (Math.random() < 0.4) {
        this.time.delayedCall(150 + Math.random() * 90, () => {
          if (this.scene.isActive() && this.cache.audio.exists(k)) {
            this.sound.play(k, { volume: 0.14 + Math.random() * 0.1, rate: 0.95 + Math.random() * 0.2 });
          }
        });
      }
      this._clangTimer = this.time.delayedCall(900 + Math.random() * 1900, clang);
    };
    this._clangTimer = this.time.delayedCall(700 + Math.random() * 900, clang);

    this.events.once("shutdown", () => {
      this._fire?.stop();
      this._clangTimer?.remove(false);
    });
  }

  update() {
    // Freeze the player (and hide prompts) while the weapon shop is open.
    if (this.shop?.isOpen()) {
      this.player?.update(this.cursors, this.wasd, true);
      this.interactions?.prompt?.setVisible(false);
      return;
    }
    this.updateBase();
  }
}
