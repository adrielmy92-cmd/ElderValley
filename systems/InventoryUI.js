import { RARITY } from "../data/alchemist-items.js?v=35";
import { itemData, isConsumable } from "./Inventory.js?v=34";

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
    const panelW = Math.min(1040, W - 32);
    const panelH = Math.min(688, H - 32);
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
    const leftW = Math.round((panelW - 32) * 0.54);
    this._dollArea = { x: px + 16, y: top, w: leftW, h: panelH - 78 - 16 };
    this._bagArea = { x: px + 16 + leftW + 8, y: top, w: panelW - 32 - leftW - 8, h: panelH - 78 - 16 };

    this._renderDoll();
    this._renderBag();
  }

  // ── paper-doll (3 stacked zones: equipment / stats / level+attributes) ───────
  _renderDoll() {
    const s = this.scene;
    const { x, y, w, h } = this._dollArea;
    const gap = 8;
    const attrH = 100;
    const statsH = 96;
    const equipH = h - attrH - statsH - gap * 2;

    // ── equipment / paper-doll zone ──
    const dbg = s.add.graphics().setScrollFactor(0).setDepth(DEPTH + 1);
    dbg.fillStyle(0x0d1b14, 0.55); dbg.fillRoundedRect(x, y, w, equipH, 10);
    dbg.lineStyle(1, 0x3a4a3a, 0.8); dbg.strokeRoundedRect(x, y, w, equipH, 10);
    this._t(dbg);

    const mcx = x + Math.round(w * 0.5);
    const mcy = y + Math.round(equipH * 0.5);
    const SLOT = 62;
    const colX = Math.min(160, Math.round(w * 0.33)); // side columns clear of the body
    const rowB = 78;   // vertical gap between the three column rows
    const capY = 150;  // boots (bottom centre)

    this._t(s.add.ellipse(mcx, mcy + 80, 108, 22, 0x000000, 0.32).setScrollFactor(0).setDepth(DEPTH + 2));
    const prefix = s.player?.animPrefix ?? "mage-1";
    const walkKey = `${prefix}-walk-down`;
    const walkTex = s.anims.get(walkKey)?.frames?.[0]?.textureKey ?? "mage-1-sheet";
    if (s.textures.exists(walkTex)) {
      const mage = s.add.sprite(mcx, mcy - 8, walkTex, 0).setScrollFactor(0).setDepth(DEPTH + 3).setScale(2.2);
      if (s.anims.exists(walkKey)) mage.play(walkKey);
      this._t(mage);
    }

    // two symmetric 3-row columns flank the mage; boots at the bottom centre.
    // left: helmet / amulet / ring I   ·   right: armor / weapon / ring II
    this._equipSlot("helmet", "Helmet",  mcx - colX, mcy - rowB, SLOT, false);
    this._equipSlot("amulet", "Amulet",  mcx - colX, mcy,        SLOT, false);
    this._equipSlot("ring1",  "Ring I",  mcx - colX, mcy + rowB, SLOT, false);
    this._equipSlot("armor",  "Armor",   mcx + colX, mcy - rowB, SLOT, false);
    this._equipSlot("weapon", "Weapon",  mcx + colX, mcy,        SLOT, false);
    this._equipSlot("ring2",  "Ring II", mcx + colX, mcy + rowB, SLOT, false);
    this._equipSlot("boots",  "Boots",   mcx,        mcy + capY, SLOT, false);

    // ── stats zone ──
    const sy = y + equipH + gap;
    const sbg = s.add.graphics().setScrollFactor(0).setDepth(DEPTH + 1);
    sbg.fillStyle(0x0a1414, 0.92); sbg.fillRoundedRect(x, sy, w, statsH, 9);
    sbg.lineStyle(1, 0x3a4a3a, 0.8); sbg.strokeRoundedRect(x, sy, w, statsH, 9);
    this._t(sbg);
    this._t(s.add.text(x + 12, sy + 7, "Stats", {
      fontFamily: "Georgia, serif", fontSize: "13px", color: "#9fe6c0"
    }).setScrollFactor(0).setDepth(DEPTH + 2));
    this._t(s.add.text(x + w - 12, sy + 8,
      `HP ${Math.round(s.playerHp ?? 0)}/${s.playerMaxHp ?? 0}   MP ${Math.round(s.playerMp ?? 0)}/${s.playerMaxMp ?? 0}`, {
      fontFamily: "monospace", fontSize: "12px", color: "#d9e2ee"
    }).setOrigin(1, 0).setScrollFactor(0).setDepth(DEPTH + 2));

    const b = s.bag.bonuses();
    const extras = [];
    for (const [k, v] of Object.entries(b)) {
      if (k === "maxHp" || k === "maxMp") continue;
      extras.push(PCT_STATS.has(k) ? `${STAT_LABELS[k] ?? k} +${Math.round(v * 100)}%` : `${STAT_LABELS[k] ?? k} +${v}`);
    }
    this._t(s.add.text(x + 12, sy + 30, extras.length ? extras.join("     ") : "No equipment bonuses", {
      fontFamily: "monospace", fontSize: "12px", color: extras.length ? "#cbe0ff" : "#6f7d8c",
      lineSpacing: 6, wordWrap: { width: w - 24 }
    }).setScrollFactor(0).setDepth(DEPTH + 2));

    // ── level + attributes zone ──
    this._renderAttributes(x, sy + statsH + gap, w, attrH);
  }

  // Level + XP + the 3 allocatable attributes (with + buttons while points remain).
  _renderAttributes(x, y, w, h) {
    const s = this.scene;
    const lv = s.leveling;
    if (!lv) return;
    const cx = x + w / 2;

    // panel backdrop
    const bg = s.add.graphics().setScrollFactor(0).setDepth(DEPTH + 2);
    bg.fillStyle(0x1a140a, 0.92); bg.fillRoundedRect(x + 8, y, w - 16, h, 8);
    bg.lineStyle(1, 0x6e4f23, 0.9); bg.strokeRoundedRect(x + 8, y, w - 16, h, 8);
    this._t(bg);

    // level + XP bar + points
    this._t(s.add.text(x + 18, y + 8, `⭑ Lv ${lv.level}`, {
      fontFamily: "Georgia, serif", fontSize: "15px", color: "#ffe08a", stroke: "#160a04", strokeThickness: 3
    }).setScrollFactor(0).setDepth(DEPTH + 3));
    const barX = x + 88, barW = w - 88 - 110, barY = y + 13;
    const xbg = s.add.graphics().setScrollFactor(0).setDepth(DEPTH + 3);
    xbg.fillStyle(0x0c0900, 1); xbg.fillRoundedRect(barX, barY, barW, 8, 3);
    xbg.fillStyle(0xffc24a, 1); xbg.fillRoundedRect(barX, barY, Math.max(0, barW * lv.progress()), 8, 3);
    this._t(xbg);
    this._t(s.add.text(x + w - 18, y + 8, lv.unspent > 0 ? `Points: ${lv.unspent}` : `XP ${lv.xp}/${lv.xpNext || "—"}`, {
      fontFamily: "monospace", fontSize: "12px", color: lv.unspent > 0 ? "#7fe6a0" : "#9fb0c4"
    }).setOrigin(1, 0).setScrollFactor(0).setDepth(DEPTH + 3));

    // three attribute chips
    const attrs = [["vit", "VIT", lv.attr.vit, "+HP"], ["str", "STR", lv.attr.str, "+DMG"], ["agi", "AGI", lv.attr.agi, "+SPD"]];
    const cw = (w - 24) / 3;
    attrs.forEach(([key, label, val, hint], i) => {
      const ax = x + 12 + i * cw;
      this._t(s.add.text(ax + cw / 2 - 14, y + 44, `${label} ${val}`, {
        fontFamily: "monospace", fontSize: "13px", color: "#e6dcc4"
      }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(DEPTH + 3));
      this._t(s.add.text(ax + cw / 2 - 14, y + 62, hint, {
        fontFamily: "monospace", fontSize: "9px", color: "#8a7f6a"
      }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(DEPTH + 3));
      const canSpend = lv.unspent > 0;
      const bx = ax + cw - 30, by = y + 50;
      const pg = s.add.graphics().setScrollFactor(0).setDepth(DEPTH + 3);
      pg.fillStyle(canSpend ? 0x1f6d34 : 0x2a2622, 1); pg.fillCircle(bx, by, 12);
      pg.lineStyle(1.5, canSpend ? 0x57d36f : 0x55504a, 1); pg.strokeCircle(bx, by, 12);
      this._t(pg);
      this._t(s.add.text(bx, by, "+", {
        fontFamily: "monospace", fontSize: "16px", color: canSpend ? "#eafff0" : "#6a655e"
      }).setOrigin(0.5).setScrollFactor(0).setDepth(DEPTH + 4));
      if (canSpend) {
        const z = s.add.zone(bx, by, 28, 28).setScrollFactor(0).setDepth(DEPTH + 5).setInteractive({ useHandCursor: true });
        z.on("pointerdown", () => { Promise.resolve(s.leveling.allocate(key)).then(() => this._refresh()).catch(() => {}); });
        this._t(z);
      }
    });
  }

  _equipSlot(slotKey, label, cx, cy, size, locked) {
    const s = this.scene;
    const key = s.bag.equippedForUi ? s.bag.equippedForUi(slotKey) : s.bag.equipped[slotKey];
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
      const lvl = s.bag.enchantLevel(key);
      if (lvl > 0) {
        this._t(s.add.text(cx + half - 4, cy - half + 4, `+${lvl}`, {
          fontFamily: "monospace", fontSize: "12px", color: "#ffe08a", stroke: "#160a04", strokeThickness: 3
        }).setOrigin(1, 0).setScrollFactor(0).setDepth(DEPTH + 4));
      }
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
    } else if (slotKey === "weapon") {
      g.lineBetween(cx - 9, cy + 11, cx + 8, cy - 10); // blade
      g.lineBetween(cx + 3, cy - 11, cx + 11, cy - 3); // guard
      g.lineBetween(cx - 11, cy + 7, cx - 6, cy + 12); // pommel
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

      const isShot = typeof item.shot === "number";
      const isScroll = typeof item.scroll === "string";
      const isFish = item.type === "fish";
      const consumable = isConsumable(item);
      const isGear = !consumable && !isShot && !isScroll && !isFish;
      const lvl = isGear ? s.bag.enchantLevel(item.key) : 0;

      // Items with a PNG render the image; ones without (e.g. fish) fall back to emoji.
      let icon;
      if (s.textures.exists(item.key)) {
        icon = s.add.image(x + 32, ry + (rowH - 7) / 2, item.key).setScrollFactor(0).setDepth(DEPTH + 3);
        icon.setScale(36 / 256);
      } else {
        icon = s.add.text(x + 32, ry + (rowH - 7) / 2, item.emoji ?? "❓", { fontSize: "26px" })
          .setOrigin(0.5).setScrollFactor(0).setDepth(DEPTH + 3);
      }
      this._t(icon);
      const dispName = lvl > 0 ? `${item.name} +${lvl}` : item.name;
      this._t(s.add.text(x + 58, ry + 8, dispName, { fontFamily: "monospace", fontSize: "13px", color: lvl > 0 ? "#ffe08a" : rar.text })
        .setScrollFactor(0).setDepth(DEPTH + 3));
      const descText = (consumable || isShot || isScroll || isFish)
        ? `${item.effect}  ·  x${count}`
        : (isGear ? this._gearStatLine(item, lvl) : item.effect);
      this._t(s.add.text(x + 58, ry + 26, descText, {
        fontFamily: "monospace", fontSize: "10px", color: (isGear && lvl > 0) ? "#ffe08a" : "#9aa8bc"
      }).setScrollFactor(0).setDepth(DEPTH + 3));

      const by = ry + (rowH - 7) / 2;
      const mkBtn = (bx, bw, label, fill, stroke, onClick) => {
        const btn = s.add.graphics().setScrollFactor(0).setDepth(DEPTH + 3);
        btn.fillStyle(fill, 1); btn.fillRoundedRect(bx, by - 13, bw, 26, 6);
        btn.lineStyle(1, stroke, 1); btn.strokeRoundedRect(bx, by - 13, bw, 26, 6);
        this._t(btn);
        this._t(s.add.text(bx + bw / 2, by, label, { fontFamily: "Georgia, serif", fontSize: "13px", color: "#eafff0" })
          .setOrigin(0.5).setScrollFactor(0).setDepth(DEPTH + 4));
        const z = s.add.zone(bx, by - 13, bw, 26).setOrigin(0).setScrollFactor(0).setDepth(DEPTH + 5)
          .setInteractive({ useHandCursor: true });
        z.on("pointerdown", onClick);
        this._t(z);
      };

      if (isScroll) {
        // scrolls are used from the enchant popup, not here — display only
        this._t(s.add.text(x + w - 18, by, "Scroll", { fontFamily: "monospace", fontSize: "11px", color: "#b9a06a" })
          .setOrigin(1, 0.5).setScrollFactor(0).setDepth(DEPTH + 4));
      } else if (isShot) {
        mkBtn(x + w - 18 - 62, 62, s.shotsEnabled ? "ON" : "OFF",
          s.shotsEnabled ? 0x274a8c : 0x3a3326, s.shotsEnabled ? 0x6f9bff : 0x8a7a52,
          () => { s.toggleShots?.(); this._refresh(); });
      } else if (consumable) {
        mkBtn(x + w - 18 - 62, 62, "Use", 0x1f6d34, 0x57d36f,
          () => { s.useConsumable?.(item); this._refresh(); });
      } else if (isFish) {
        // Fish just sit in the bag (sellable later at a fishmonger) — count only.
        this._t(s.add.text(x + w - 18, by, `x${count}`, { fontFamily: "monospace", fontSize: "13px", color: rar.text })
          .setOrigin(1, 0.5).setScrollFactor(0).setDepth(DEPTH + 4));
      } else {
        // gear: Equip + Enchant
        const equipped = s.bag.isEquipped(item.key);
        mkBtn(x + w - 18 - 62, 62, equipped ? "On" : "Equip",
          equipped ? 0x3a3326 : 0x274a8c, equipped ? 0x8a7a52 : 0x6f9bff,
          () => { s.bag.equip(item.key); s.recomputeStats?.(); this._refresh(); });
        mkBtn(x + w - 18 - 62 - 52, 46, "⚒", 0x5a3d6e, 0xb07be0,
          () => this._enchantPopup(item.key));
      }
    });
  }

  // Human-readable stat line for a gear item that reflects its enchant level, so the
  // upgrade is visible right in the bag (not only after equipping). Mirrors the exact
  // scaling used by Inventory.bonuses(): +12%/level, integers rounded.
  _gearStatLine(item, lvl) {
    if (!item.stats) return item.effect;
    const mult = 1 + lvl * 0.12;
    const parts = [];
    for (const [k, v] of Object.entries(item.stats)) {
      const label = STAT_LABELS[k] ?? k;
      const pct = PCT_STATS.has(k);
      const fmt = (val) => pct ? `${Math.round(val * 100)}%` : `${Math.round(val)}`;
      if (lvl > 0) {
        const scaled = pct ? v * mult : Math.round(v * mult);
        parts.push(`+${fmt(v)}→+${fmt(scaled)} ${label}`);
      } else {
        parts.push(`+${fmt(v)} ${label}`);
      }
    }
    return parts.join("  ·  ");
  }

  // Small modal over the inventory: the enchant gamble for one gear item.
  _enchantPopup(itemKey) {
    const s = this.scene;
    const item = itemData(itemKey);
    if (!item) return;
    const cam = s.cameras.main;
    const W = cam.width, H = cam.height;
    const pw = 360, ph = 250;
    const px = Math.round((W - pw) / 2), py = Math.round((H - ph) / 2);
    const lvl = s.bag.enchantLevel(itemKey);
    const chance = Math.round(s.enchantChance(lvl) * 100);
    const canShatter = lvl >= (s.ENCHANT_SHATTER_FROM ?? 4);
    const normalN = s.bag.count("enchant-scroll");
    const blessedN = s.bag.count("blessed-enchant-scroll");

    const g = s.add.graphics().setScrollFactor(0).setDepth(DEPTH + 20);
    g.fillStyle(0x000000, 0.5); g.fillRect(0, 0, W, H);
    g.fillStyle(0x140f0a, 1); g.fillRoundedRect(px, py, pw, ph, 12);
    g.lineStyle(2, 0xb07be0, 1); g.strokeRoundedRect(px + 6, py + 6, pw - 12, ph - 12, 9);
    this._t(g);

    this._t(s.add.text(px + pw / 2, py + 22, `Enchant — ${item.name} +${lvl}`, {
      fontFamily: "Georgia, serif", fontSize: "17px", color: "#e8c8ff", stroke: "#150a1e", strokeThickness: 3
    }).setOrigin(0.5).setScrollFactor(0).setDepth(DEPTH + 21));
    this._t(s.add.text(px + pw / 2, py + 56, `+${lvl}  →  +${lvl + 1}\nSuccess chance: ${chance}%`, {
      fontFamily: "monospace", fontSize: "14px", color: "#d9e2ee", align: "center", lineSpacing: 5
    }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(DEPTH + 21));
    this._t(s.add.text(px + pw / 2, py + 108,
      canShatter ? "⚠ Failure with a normal scroll SHATTERS the item!" : "Failure resets to +0 (item survives).", {
      fontFamily: "monospace", fontSize: "11px", color: canShatter ? "#ff9a9a" : "#9adf9a", align: "center",
      wordWrap: { width: pw - 36 }
    }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(DEPTH + 21));

    const doEnchant = (blessed) => { Promise.resolve(s.enchant(itemKey, blessed)).then(() => this._refresh()).catch(() => {}); };
    const by = py + ph - 54;
    const mk = (bx, bw, label, sub, fill, stroke, enabled, cb) => {
      const gg = s.add.graphics().setScrollFactor(0).setDepth(DEPTH + 21);
      gg.fillStyle(enabled ? fill : 0x2a2622, 1); gg.fillRoundedRect(bx, by, bw, 40, 7);
      gg.lineStyle(1, enabled ? stroke : 0x55504a, 1); gg.strokeRoundedRect(bx, by, bw, 40, 7);
      this._t(gg);
      this._t(s.add.text(bx + bw / 2, by + 11, label, { fontFamily: "Georgia, serif", fontSize: "13px", color: enabled ? "#eafff0" : "#8a857e" })
        .setOrigin(0.5).setScrollFactor(0).setDepth(DEPTH + 22));
      this._t(s.add.text(bx + bw / 2, by + 27, sub, { fontFamily: "monospace", fontSize: "10px", color: enabled ? "#cfe0ff" : "#75706a" })
        .setOrigin(0.5).setScrollFactor(0).setDepth(DEPTH + 22));
      if (enabled) {
        const z = s.add.zone(bx, by, bw, 40).setOrigin(0).setScrollFactor(0).setDepth(DEPTH + 23).setInteractive({ useHandCursor: true });
        z.on("pointerdown", cb); this._t(z);
      }
    };
    mk(px + 20, 150, "Enchant", `Normal scroll  x${normalN}`, 0x274a8c, 0x6f9bff, normalN > 0, () => doEnchant(false));
    mk(px + pw - 170, 150, "Blessed", `Safe scroll  x${blessedN}`, 0x6e5a23, 0xe7c25a, blessedN > 0, () => doEnchant(true));

    // close (X) for the popup
    const cz = s.add.zone(px + pw - 20, py + 20, 30, 30).setScrollFactor(0).setDepth(DEPTH + 23).setInteractive({ useHandCursor: true });
    this._t(s.add.text(px + pw - 20, py + 20, "✕", { fontFamily: "monospace", fontSize: "15px", color: "#ffd9d9" })
      .setOrigin(0.5).setScrollFactor(0).setDepth(DEPTH + 22));
    cz.on("pointerdown", () => this._refresh());
    this._t(cz);
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
