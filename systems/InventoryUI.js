import { RARITY } from "../data/alchemist-items.js?v=4";
import { itemData, isConsumable } from "./Inventory.js?v=1";

const DEPTH = 9000;
const STAT_LABELS = {
  maxHp: "Max HP", maxMp: "Max MP", attack: "Attack", defense: "Defense",
  crit: "Crit", dodge: "Dodge", lifesteal: "Lifesteal", attackSpeed: "Atk Speed",
  hpRegen: "HP Regen", xpBonus: "XP Bonus"
};
const PCT_STATS = new Set(["crit", "dodge", "lifesteal", "attackSpeed", "xpBonus"]);

// Bag + equipment screen (toggle with I). Same self-contained object-tracking
// approach as the shop, so it never gets caught in masked-container input bugs.
export default class InventoryUI {
  constructor(scene) {
    this.scene = scene;
    this.objs = [];
    this.open_ = false;
  }

  isOpen() { return this.open_; }
  toggle() { this.open_ ? this.close() : this.open(); }

  open() {
    if (this.open_) return;
    this.open_ = true;
    this._build();
    this._escHandler = (e) => { if (e.key === "Escape" || e.key === "i" || e.key === "I") this.close(); };
    window.addEventListener("keydown", this._escHandler);
  }

  close() {
    if (!this.open_) return;
    this.open_ = false;
    this.objs.forEach((o) => o.destroy());
    this.objs = [];
    if (this._escHandler) { window.removeEventListener("keydown", this._escHandler); this._escHandler = null; }
  }

  _t(o) { this.objs.push(o); return o; }

  _build() {
    const s = this.scene;
    const cam = s.cameras.main;
    const W = cam.width, H = cam.height;
    const panelW = Math.min(900, W - 48);
    const panelH = Math.min(600, H - 48);
    const px = Math.round((W - panelW) / 2);
    const py = Math.round((H - panelH) / 2);
    this._panel = { px, py, panelW, panelH };

    this._t(s.add.rectangle(W / 2, H / 2, W, H, 0x05070c, 0.74).setScrollFactor(0).setDepth(DEPTH).setInteractive());

    const g = s.add.graphics().setScrollFactor(0).setDepth(DEPTH + 1);
    g.fillStyle(0x0c1320, 0.99); g.fillRoundedRect(px, py, panelW, panelH, 12);
    g.lineStyle(4, 0x05080f, 1); g.strokeRoundedRect(px, py, panelW, panelH, 12);
    g.lineStyle(2, 0x6f86a8, 1); g.strokeRoundedRect(px + 8, py + 8, panelW - 16, panelH - 16, 8);
    g.fillStyle(0x161f30, 1); g.fillRoundedRect(px + 14, py + 14, panelW - 28, 50, 6);
    this._t(g);

    this._t(s.add.text(px + 30, py + 24, "Inventory", {
      fontFamily: "Georgia, serif", fontSize: "24px", color: "#dfeaf6", stroke: "#0a0f18", strokeThickness: 4
    }).setScrollFactor(0).setDepth(DEPTH + 2));
    this._closeBtn(px + panelW - 30, py + 30);

    const top = py + 76;
    const leftW = Math.round((panelW - 28) * 0.42);
    this._left = { x: px + 18, y: top, w: leftW - 8, h: panelH - 76 - 18 };
    this._right = { x: px + 18 + leftW + 8, y: top, w: panelW - 36 - leftW - 8, h: panelH - 76 - 18 };

    const rg = s.add.graphics().setScrollFactor(0).setDepth(DEPTH + 1);
    rg.fillStyle(0x0a1018, 0.96); rg.fillRoundedRect(this._right.x, this._right.y, this._right.w, this._right.h, 8);
    rg.lineStyle(1, 0x2a3850, 1); rg.strokeRoundedRect(this._right.x, this._right.y, this._right.w, this._right.h, 8);
    this._t(rg);

    this._renderEquipped();
    this._renderStats();
    this._renderBag();
  }

  _refresh() {
    this.objs.forEach((o) => o.destroy());
    this.objs = [];
    this._build();
  }

  _renderEquipped() {
    const s = this.scene;
    const { x, y, w } = this._left;
    this._t(s.add.text(x + 2, y, "Equipped", { fontFamily: "monospace", fontSize: "14px", color: "#9fb0c4" })
      .setScrollFactor(0).setDepth(DEPTH + 2));
    const slots = [["ring1", "Ring I"], ["ring2", "Ring II"], ["amulet", "Amulet"]];
    const cell = Math.min(86, Math.floor((w - 24) / 3));
    slots.forEach(([slot, label], i) => {
      const sx = x + i * (cell + 10);
      const sy = y + 24;
      const key = s.bag.equipped[slot];
      const item = key && itemData(key);
      const rar = item ? (RARITY[item.rarity] ?? RARITY.common) : null;
      const gg = s.add.graphics().setScrollFactor(0).setDepth(DEPTH + 2);
      gg.fillStyle(0x101827, 1); gg.fillRoundedRect(sx, sy, cell, cell, 7);
      gg.lineStyle(2, rar ? rar.color : 0x33415c, rar ? 1 : 0.7); gg.strokeRoundedRect(sx, sy, cell, cell, 7);
      this._t(gg);
      this._t(s.add.text(sx + cell / 2, sy + cell + 10, label, { fontFamily: "monospace", fontSize: "11px", color: "#8aa0b8" })
        .setOrigin(0.5).setScrollFactor(0).setDepth(DEPTH + 2));
      if (item) {
        const icon = s.add.image(sx + cell / 2, sy + cell / 2, item.key).setScrollFactor(0).setDepth(DEPTH + 3);
        icon.setScale((cell - 16) / 256);
        this._t(icon);
        const z = s.add.zone(sx, sy, cell, cell).setOrigin(0).setScrollFactor(0).setDepth(DEPTH + 4)
          .setInteractive({ useHandCursor: true });
        z.on("pointerdown", () => { s.bag.unequip(slot); s.recomputeStats?.(); this._refresh(); });
        this._t(z);
      }
    });
    this._t(s.add.text(x + 2, y + 24 + cell + 26, "click an equipped item to unequip", {
      fontFamily: "monospace", fontSize: "10px", color: "#5f7388"
    }).setScrollFactor(0).setDepth(DEPTH + 2));
  }

  _renderStats() {
    const s = this.scene;
    const { x, y, w, h } = this._left;
    const sy = y + 200;
    this._t(s.add.text(x + 2, sy, "Stats", { fontFamily: "monospace", fontSize: "14px", color: "#9fb0c4" })
      .setScrollFactor(0).setDepth(DEPTH + 2));
    const b = s.bag.bonuses();
    const lines = [
      `HP   ${s.playerHp ?? 0} / ${s.playerMaxHp ?? 0}`,
      `MP   ${s.playerMp ?? 0} / ${s.playerMaxMp ?? 0}`
    ];
    for (const [k, v] of Object.entries(b)) {
      if (k === "maxHp" || k === "maxMp") continue;
      const label = STAT_LABELS[k] ?? k;
      lines.push(PCT_STATS.has(k) ? `${label}  +${Math.round(v * 100)}%` : `${label}  +${v}`);
    }
    this._t(s.add.text(x + 2, sy + 22, lines.join("\n"), {
      fontFamily: "monospace", fontSize: "13px", color: "#d9e2ee", lineSpacing: 6, wordWrap: { width: w - 4 }
    }).setScrollFactor(0).setDepth(DEPTH + 2));
  }

  _renderBag() {
    const s = this.scene;
    const { x, y, w, h } = this._right;
    this._t(s.add.text(x + 14, y + 10, "Bag", { fontFamily: "monospace", fontSize: "14px", color: "#9fb0c4" })
      .setScrollFactor(0).setDepth(DEPTH + 2));
    const entries = s.bag.ownedStacks();
    if (entries.length === 0) {
      this._t(s.add.text(x + w / 2, y + h / 2, "Empty — buy items at the Alchemist shop", {
        fontFamily: "monospace", fontSize: "13px", color: "#7488a0", align: "center", wordWrap: { width: w - 30 }
      }).setOrigin(0.5).setScrollFactor(0).setDepth(DEPTH + 2));
      return;
    }
    const rowH = 46;
    const maxRows = Math.floor((h - 40) / rowH);
    entries.slice(0, maxRows).forEach((entry, i) => {
      const { item, count } = entry;
      const ry = y + 38 + i * rowH;
      const rar = RARITY[item.rarity] ?? RARITY.common;
      const rg = s.add.graphics().setScrollFactor(0).setDepth(DEPTH + 2);
      rg.fillStyle(0x101827, 0.9); rg.fillRoundedRect(x + 10, ry, w - 20, rowH - 6, 6);
      rg.lineStyle(1, rar.color, 0.8); rg.strokeRoundedRect(x + 10, ry, w - 20, rowH - 6, 6);
      this._t(rg);
      const icon = s.add.image(x + 30, ry + (rowH - 6) / 2, item.key).setScrollFactor(0).setDepth(DEPTH + 3);
      icon.setScale(34 / 256);
      this._t(icon);
      this._t(s.add.text(x + 54, ry + 7, item.name, { fontFamily: "monospace", fontSize: "13px", color: rar.text })
        .setScrollFactor(0).setDepth(DEPTH + 3));
      this._t(s.add.text(x + 54, ry + 24, isConsumable(item) ? `${item.effect}  ·  x${count}` : item.effect, {
        fontFamily: "monospace", fontSize: "10px", color: "#8aa0b8"
      }).setScrollFactor(0).setDepth(DEPTH + 3));

      const consumable = isConsumable(item);
      const label = consumable ? "Use" : "Equip";
      const bw = 64, bx = x + w - 20 - bw, by = ry + (rowH - 6) / 2;
      const bg = s.add.graphics().setScrollFactor(0).setDepth(DEPTH + 3);
      bg.fillStyle(consumable ? 0x1f6d34 : 0x274a8c, 1); bg.fillRoundedRect(bx, by - 13, bw, 26, 6);
      bg.lineStyle(1, consumable ? 0x57d36f : 0x6f9bff, 1); bg.strokeRoundedRect(bx, by - 13, bw, 26, 6);
      this._t(bg);
      this._t(s.add.text(bx + bw / 2, by, label, { fontFamily: "Georgia, serif", fontSize: "13px", color: "#eafff0" })
        .setOrigin(0.5).setScrollFactor(0).setDepth(DEPTH + 4));
      const z = s.add.zone(bx, by - 13, bw, 26).setOrigin(0).setScrollFactor(0).setDepth(DEPTH + 5)
        .setInteractive({ useHandCursor: true });
      z.on("pointerdown", () => {
        if (consumable) s.useConsumable?.(item);
        else { s.bag.equip(item.key); s.recomputeStats?.(); }
        this._refresh();
      });
      this._t(z);
    });
  }

  _closeBtn(x, y) {
    const s = this.scene;
    const g = s.add.graphics().setScrollFactor(0).setDepth(DEPTH + 3);
    const paint = (fill) => { g.clear(); g.fillStyle(fill, 1); g.fillCircle(x, y, 15); g.lineStyle(2, 0x000000, 0.5); g.strokeCircle(x, y, 15); };
    paint(0x42506a); this._t(g);
    this._t(s.add.text(x, y, "✕", { fontFamily: "monospace", fontSize: "16px", color: "#dfe7f2" })
      .setOrigin(0.5).setScrollFactor(0).setDepth(DEPTH + 4));
    const z = s.add.zone(x, y, 34, 34).setScrollFactor(0).setDepth(DEPTH + 5).setInteractive({ useHandCursor: true });
    z.on("pointerover", () => paint(0x586786)); z.on("pointerout", () => paint(0x42506a));
    z.on("pointerdown", () => this.close());
    this._t(z);
  }
}
