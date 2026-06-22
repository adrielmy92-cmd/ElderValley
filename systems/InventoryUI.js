import { RARITY } from "../data/alchemist-items.js?v=4";
import { itemData, isConsumable } from "./Inventory.js?v=1";

const DEPTH = 9000;
const STAT_LABELS = {
  maxHp: "Max HP", maxMp: "Max MP", attack: "Attack", defense: "Defense",
  crit: "Crit", dodge: "Dodge", lifesteal: "Lifesteal", attackSpeed: "Atk Speed",
  hpRegen: "HP Regen", xpBonus: "XP Bonus"
};
const PCT_STATS = new Set(["crit", "dodge", "lifesteal", "attackSpeed", "xpBonus"]);

// Themed RPG paper-doll: the mage in the center with equipment slots around the
// body (helmet top, jewelry left, armor right, boots bottom) + a bag on the right.
// Self-contained object tracking (no masked containers → input always works).
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
  _refresh() { this.objs.forEach((o) => o.destroy()); this.objs = []; this._build(); }

  _build() {
    const s = this.scene;
    const cam = s.cameras.main;
    const W = cam.width, H = cam.height;
    const panelW = Math.min(940, W - 40);
    const panelH = Math.min(600, H - 40);
    const px = Math.round((W - panelW) / 2);
    const py = Math.round((H - panelH) / 2);

    // dim
    this._t(s.add.rectangle(W / 2, H / 2, W, H, 0x04060a, 0.78).setScrollFactor(0).setDepth(DEPTH).setInteractive());

    // ornate parchment-dark frame
    const g = s.add.graphics().setScrollFactor(0).setDepth(DEPTH + 1);
    g.fillStyle(0x140f0a, 0.99); g.fillRoundedRect(px, py, panelW, panelH, 14);
    g.lineStyle(5, 0x070504, 1); g.strokeRoundedRect(px, py, panelW, panelH, 14);
    g.lineStyle(2, 0xc9963f, 1); g.strokeRoundedRect(px + 9, py + 9, panelW - 18, panelH - 18, 10);
    g.lineStyle(1, 0x6e4f23, 1); g.strokeRoundedRect(px + 14, py + 14, panelW - 28, panelH - 28, 8);
    // header band
    g.fillStyle(0x241a0f, 1); g.fillRoundedRect(px + 16, py + 16, panelW - 32, 50, 6);
    this._t(g);

    this._t(s.add.text(px + 32, py + 26, "Character & Inventory", {
      fontFamily: "Georgia, 'Times New Roman', serif", fontSize: "23px",
      color: "#ffe1a4", stroke: "#160a04", strokeThickness: 4
    }).setScrollFactor(0).setDepth(DEPTH + 2));
    this._closeBtn(px + panelW - 32, py + 32);

    const top = py + 78;
    const leftW = Math.round((panelW - 32) * 0.56);
    this._dollArea = { x: px + 16, y: top, w: leftW, h: panelH - 78 - 16 };
    this._bagArea = { x: px + 16 + leftW + 8, y: top, w: panelW - 32 - leftW - 8, h: panelH - 78 - 16 };

    this._renderDoll();
    this._renderBag();
  }

  // ── paper-doll ──────────────────────────────────────────────────────────────
  _renderDoll() {
    const s = this.scene;
    const { x, y, w, h } = this._dollArea;

    // backdrop
    const bg = s.add.graphics().setScrollFactor(0).setDepth(DEPTH + 1);
    bg.fillStyle(0x0d1b14, 0.55); bg.fillRoundedRect(x, y, w, h, 10);
    bg.lineStyle(1, 0x3a4a3a, 0.8); bg.strokeRoundedRect(x, y, w, h, 10);
    this._t(bg);

    const mcx = x + Math.round(w * 0.5);
    const mcy = y + Math.round(h * 0.46);
    const SLOT = 60;
    const colX = 132; // horizontal offset of the side columns from center
    const rowY = 76;  // vertical step between left slots

    // platform shadow + mage in the center (walking in place, facing the camera)
    this._t(s.add.ellipse(mcx, mcy + 90, 116, 24, 0x000000, 0.35).setScrollFactor(0).setDepth(DEPTH + 2));
    const prefix = s.player?.animPrefix ?? "mage-1";
    const walkKey = `${prefix}-walk-down`;
    const walkTex = s.anims.get(walkKey)?.frames?.[0]?.textureKey ?? "mage-1-sheet";
    if (s.textures.exists(walkTex)) {
      const mage = s.add.sprite(mcx, mcy - 20, walkTex, 0).setScrollFactor(0).setDepth(DEPTH + 3);
      mage.setScale(2.6);
      if (s.anims.exists(walkKey)) mage.play(walkKey);
      this._t(mage);
    }

    // equipment slots positioned around the body
    this._equipSlot("helmet", "Helmet", mcx,            mcy - 150, SLOT, true);
    this._equipSlot("amulet", "Amulet", mcx - colX,     mcy - rowY, SLOT, false);
    this._equipSlot("ring1",  "Ring I", mcx - colX,     mcy,        SLOT, false);
    this._equipSlot("ring2",  "Ring II",mcx - colX,     mcy + rowY, SLOT, false);
    this._equipSlot("armor",  "Armor",  mcx + colX,     mcy,        SLOT, true);
    this._equipSlot("boots",  "Boots",  mcx,            mcy + 150,  SLOT, true);

    // stats strip at the bottom
    const b = s.bag.bonuses();
    const statLines = [`HP ${s.playerHp ?? 0}/${s.playerMaxHp ?? 0}    MP ${Math.round(s.playerMp ?? 0)}/${s.playerMaxMp ?? 0}`];
    const extras = [];
    for (const [k, v] of Object.entries(b)) {
      if (k === "maxHp" || k === "maxMp") continue;
      extras.push(PCT_STATS.has(k) ? `${STAT_LABELS[k] ?? k} +${Math.round(v * 100)}%` : `${STAT_LABELS[k] ?? k} +${v}`);
    }
    if (extras.length) statLines.push(extras.join("   "));
    this._t(s.add.text(mcx, y + h - 14, statLines.join("\n"), {
      fontFamily: "monospace", fontSize: "12px", color: "#d9e2ee", align: "center",
      lineSpacing: 5, wordWrap: { width: w - 24 }
    }).setOrigin(0.5, 1).setScrollFactor(0).setDepth(DEPTH + 3));
  }

  _equipSlot(slotKey, label, cx, cy, size, locked) {
    const s = this.scene;
    const key = s.bag.equipped[slotKey];
    const item = key && itemData(key);
    const rar = item ? (RARITY[item.rarity] ?? RARITY.common) : null;
    const half = size / 2;

    const g = s.add.graphics().setScrollFactor(0).setDepth(DEPTH + 2);
    g.fillStyle(locked && !item ? 0x161310 : 0x1b1712, 0.96);
    g.fillRoundedRect(cx - half, cy - half, size, size, 8);
    g.lineStyle(2, item ? rar.color : (locked ? 0x4a4036 : 0x8a6a3a), item ? 1 : 0.9);
    g.strokeRoundedRect(cx - half, cy - half, size, size, 8);
    // inner gold corner ticks for a jeweled-frame feel
    g.lineStyle(1, item ? rar.color : 0x6e4f23, 0.7);
    g.strokeRoundedRect(cx - half + 3, cy - half + 3, size - 6, size - 6, 6);
    this._t(g);

    this._t(s.add.text(cx, cy + half + 9, label, {
      fontFamily: "monospace", fontSize: "10px", color: locked && !item ? "#7a6a52" : "#c9b48a"
    }).setOrigin(0.5).setScrollFactor(0).setDepth(DEPTH + 2));

    if (item) {
      const icon = s.add.image(cx, cy, item.key).setScrollFactor(0).setDepth(DEPTH + 3);
      icon.setScale((size - 14) / 256);
      this._t(icon);
      const z = s.add.zone(cx - half, cy - half, size, size).setOrigin(0)
        .setScrollFactor(0).setDepth(DEPTH + 4).setInteractive({ useHandCursor: true });
      z.on("pointerdown", () => { s.bag.unequip(slotKey); s.recomputeStats?.(); this._refresh(); });
      this._t(z);
    } else {
      // faint slot-type glyph so empty slots read as "what goes here"
      const gl = s.add.graphics().setScrollFactor(0).setDepth(DEPTH + 3);
      this._slotGlyph(gl, slotKey, cx, cy, locked ? 0x4a4236 : 0x6c5a3c);
      this._t(gl);
      if (locked) {
        this._t(s.add.text(cx, cy, "🔒", { fontFamily: "monospace", fontSize: "13px", color: "#6a5c44" })
          .setOrigin(0.5).setScrollFactor(0).setDepth(DEPTH + 4));
      }
    }
  }

  // simple silhouettes drawn with graphics (no extra assets)
  _slotGlyph(g, slotKey, cx, cy, color) {
    g.lineStyle(2, color, 0.9);
    g.fillStyle(color, 0.18);
    if (slotKey === "helmet") {
      g.beginPath(); g.arc(cx, cy + 4, 12, Math.PI, 0); g.lineTo(cx + 12, cy + 9); g.lineTo(cx - 12, cy + 9); g.closePath(); g.strokePath(); g.fillPath();
    } else if (slotKey === "armor") {
      g.strokeRoundedRect(cx - 11, cy - 11, 22, 22, 4);
      g.lineBetween(cx, cy - 11, cx, cy + 11);
    } else if (slotKey === "boots") {
      g.strokeRoundedRect(cx - 11, cy - 10, 9, 20, 2);
      g.strokeRoundedRect(cx + 2, cy - 10, 9, 20, 2);
    } else if (slotKey === "amulet") {
      g.strokeCircle(cx, cy - 7, 8);
      g.fillStyle(color, 0.25); g.fillTriangle(cx - 6, cy + 2, cx + 6, cy + 2, cx, cy + 12);
    } else { // rings
      g.strokeCircle(cx, cy + 2, 9);
      g.fillStyle(color, 0.3); g.fillCircle(cx, cy - 8, 3);
    }
  }

  // ── bag ─────────────────────────────────────────────────────────────────────
  _renderBag() {
    const s = this.scene;
    const { x, y, w, h } = this._bagArea;
    const bg = s.add.graphics().setScrollFactor(0).setDepth(DEPTH + 1);
    bg.fillStyle(0x0a1018, 0.96); bg.fillRoundedRect(x, y, w, h, 10);
    bg.lineStyle(2, 0x6e4f23, 1); bg.strokeRoundedRect(x, y, w, h, 10);
    this._t(bg);

    this._t(s.add.text(x + 14, y + 10, "Bag", {
      fontFamily: "Georgia, serif", fontSize: "16px", color: "#e7cf9c", stroke: "#160a04", strokeThickness: 3
    }).setScrollFactor(0).setDepth(DEPTH + 2));

    const entries = s.bag.ownedStacks();
    if (entries.length === 0) {
      this._t(s.add.text(x + w / 2, y + h / 2, "Empty\nBuy gear & potions at the\nAlchemist shop", {
        fontFamily: "monospace", fontSize: "13px", color: "#7488a0", align: "center", lineSpacing: 6,
        wordWrap: { width: w - 30 }
      }).setOrigin(0.5).setScrollFactor(0).setDepth(DEPTH + 2));
      return;
    }

    const rowH = 50;
    const maxRows = Math.floor((h - 44) / rowH);
    entries.slice(0, maxRows).forEach((entry, i) => {
      const { item, count } = entry;
      const ry = y + 40 + i * rowH;
      const rar = RARITY[item.rarity] ?? RARITY.common;
      const rg = s.add.graphics().setScrollFactor(0).setDepth(DEPTH + 2);
      rg.fillStyle(0x12100b, 0.92); rg.fillRoundedRect(x + 10, ry, w - 20, rowH - 7, 7);
      rg.lineStyle(1, rar.color, 0.85); rg.strokeRoundedRect(x + 10, ry, w - 20, rowH - 7, 7);
      this._t(rg);

      const icon = s.add.image(x + 32, ry + (rowH - 7) / 2, item.key).setScrollFactor(0).setDepth(DEPTH + 3);
      icon.setScale(36 / 256);
      this._t(icon);
      this._t(s.add.text(x + 58, ry + 8, item.name, { fontFamily: "monospace", fontSize: "13px", color: rar.text })
        .setScrollFactor(0).setDepth(DEPTH + 3));
      this._t(s.add.text(x + 58, ry + 26, isConsumable(item) ? `${item.effect}  ·  x${count}` : item.effect, {
        fontFamily: "monospace", fontSize: "10px", color: "#9aa8bc"
      }).setScrollFactor(0).setDepth(DEPTH + 3));

      const consumable = isConsumable(item);
      const equipped = !consumable && s.bag.isEquipped(item.key);
      const label = consumable ? "Use" : (equipped ? "On" : "Equip");
      const bw = 62, bx = x + w - 18 - bw, by = ry + (rowH - 7) / 2;
      const bgc = consumable ? 0x1f6d34 : (equipped ? 0x3a3326 : 0x274a8c);
      const bdc = consumable ? 0x57d36f : (equipped ? 0x8a7a52 : 0x6f9bff);
      const btn = s.add.graphics().setScrollFactor(0).setDepth(DEPTH + 3);
      btn.fillStyle(bgc, 1); btn.fillRoundedRect(bx, by - 13, bw, 26, 6);
      btn.lineStyle(1, bdc, 1); btn.strokeRoundedRect(bx, by - 13, bw, 26, 6);
      this._t(btn);
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
    paint(0x7a2630); this._t(g);
    this._t(s.add.text(x, y, "✕", { fontFamily: "monospace", fontSize: "16px", color: "#ffd9d9" })
      .setOrigin(0.5).setScrollFactor(0).setDepth(DEPTH + 4));
    const z = s.add.zone(x, y, 34, 34).setScrollFactor(0).setDepth(DEPTH + 5).setInteractive({ useHandCursor: true });
    z.on("pointerover", () => paint(0xa33240)); z.on("pointerout", () => paint(0x7a2630));
    z.on("pointerdown", () => this.close());
    this._t(z);
  }
}
