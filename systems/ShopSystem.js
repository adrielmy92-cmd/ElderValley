import { ALCHEMIST_ITEMS, RARITY } from "../data/alchemist-items.js?v=34";

// MMO-style shop overlay: a left item grid + a right detail pane.
// Self-contained — every object is tracked and destroyed on close, so no
// masked container input quirks. Freezes nothing itself; the host scene
// blocks player movement while isOpen() is true.
const DEPTH = 9000;

export default class ShopSystem {
  constructor(scene, { items = ALCHEMIST_ITEMS, title = "Alchemist's Wares", subtitle = "Rare bands and charms for the worthy" } = {}) {
    this.scene = scene;
    // Hide weapons the current character can't use (mage sees staves, warrior swords).
    this.items = items.filter((i) => scene.bag?.canUse?.(i) ?? true);
    this.title = title;
    this.subtitle = subtitle;
    this.objs = [];
    this.gridObjs = [];
    this.detailObjs = [];
    this.slots = [];
    this.selected = 0;
    this.page = 0;
    this.open_ = false;
  }

  isOpen() {
    return this.open_;
  }

  toggle() {
    this.open_ ? this.close() : this.open();
  }

  open() {
    if (this.open_) return;
    this.open_ = true;
    this.selected = 0;
    this.page = 0;
    this._build();
    this._escHandler = (e) => { if (e.key === "Escape") this.close(); };
    window.addEventListener("keydown", this._escHandler);
  }

  close() {
    if (!this.open_) return;
    this.open_ = false;
    this._clearDetail();
    this._clearGrid();
    this.objs.forEach((o) => o.destroy());
    this.objs = [];
    this.slots = [];
    if (this._escHandler) {
      window.removeEventListener("keydown", this._escHandler);
      this._escHandler = null;
    }
  }

  // ── layout ───────────────────────────────────────────────────────────────
  _build() {
    const s = this.scene;
    const cam = s.cameras.main;
    const W = cam.width;
    const H = cam.height;

    const panelW = Math.min(960, W - 48);
    const panelH = Math.min(620, H - 48);
    const px = Math.round((W - panelW) / 2);
    const py = Math.round((H - panelH) / 2);
    this._panel = { px, py, panelW, panelH };

    // Dim + click blocker
    const shade = s.add.rectangle(W / 2, H / 2, W, H, 0x05070c, 0.74)
      .setScrollFactor(0).setDepth(DEPTH).setInteractive();
    this._track(shade);

    // Panel frame
    const g = s.add.graphics().setScrollFactor(0).setDepth(DEPTH + 1);
    g.fillStyle(0x0c1320, 0.99); g.fillRoundedRect(px, py, panelW, panelH, 12);
    g.lineStyle(4, 0x05080f, 1); g.strokeRoundedRect(px, py, panelW, panelH, 12);
    g.lineStyle(2, 0xc9963f, 1); g.strokeRoundedRect(px + 8, py + 8, panelW - 16, panelH - 16, 8);
    // Header bar
    g.fillStyle(0x161f30, 1); g.fillRoundedRect(px + 14, py + 14, panelW - 28, 56, 6);
    this._track(g);

    // Title + subtitle
    this._track(s.add.text(px + 30, py + 24, this.title, {
      fontFamily: "Georgia, 'Times New Roman', serif", fontSize: "24px",
      color: "#ffe1a4", stroke: "#160a04", strokeThickness: 4
    }).setScrollFactor(0).setDepth(DEPTH + 2));
    this._track(s.add.text(px + 31, py + 50, this.subtitle, {
      fontFamily: "monospace", fontSize: "12px", color: "#9fb0c4"
    }).setScrollFactor(0).setDepth(DEPTH + 2));

    // Coin balance (top-right)
    this._drawCoin(px + panelW - 150, py + 42, 13);
    this.coinText = s.add.text(px + panelW - 134, py + 42, String(this._coins()), {
      fontFamily: "monospace", fontSize: "18px", color: "#ffd95e", stroke: "#1a1304", strokeThickness: 3
    }).setOrigin(0, 0.5).setScrollFactor(0).setDepth(DEPTH + 2);
    this._track(this.coinText);

    // Close button
    this._closeBtn(px + panelW - 30, py + 30);

    // Split: grid (left) + detail (right)
    const innerTop = py + 84;
    const innerH = panelH - 84 - 20;
    const leftW = Math.round((panelW - 28) * 0.6);
    this._grid = { x: px + 18, y: innerTop, w: leftW - 8, h: innerH };
    this._detail = { x: px + 18 + leftW + 8, y: innerTop, w: panelW - 36 - leftW - 8, h: innerH };

    // Detail pane background
    const dg = s.add.graphics().setScrollFactor(0).setDepth(DEPTH + 1);
    dg.fillStyle(0x0a1018, 0.96); dg.fillRoundedRect(this._detail.x, this._detail.y, this._detail.w, this._detail.h, 8);
    dg.lineStyle(1, 0x2a3850, 1); dg.strokeRoundedRect(this._detail.x, this._detail.y, this._detail.w, this._detail.h, 8);
    this._track(dg);

    this._renderGrid();
    this._renderDetail();
  }

  _clearGrid() {
    this.gridObjs.forEach((o) => o.destroy());
    this.gridObjs = [];
    this.slots = [];
  }

  _slotByIndex(i) {
    return this.slots.find((sl) => sl.i === i) ?? null;
  }

  _renderGrid() {
    const s = this.scene;
    const { x, y, w, h } = this._grid;
    const cols = 4;
    const gap = 10;
    // Comfortable cell size driven by width (capped) — never squeezed to fit
    // every row in the panel; overflow is paged instead.
    const cell = Math.min(108, Math.floor((w - (cols - 1) * gap) / cols));
    const gridW = cols * cell + (cols - 1) * gap;
    const ox = x + Math.round((w - gridW) / 2);

    const total = this.items.length;
    const totalRows = Math.ceil(total / cols);
    const fitRows = Math.max(1, Math.floor((h - gap) / (cell + gap)));
    const paged = totalRows > fitRows;
    // Reserve a strip at the bottom for the pager when needed.
    const rowsPerPage = paged ? Math.max(1, Math.floor((h - 34 - gap) / (cell + gap))) : fitRows;
    const perPage = rowsPerPage * cols;
    this._pages = Math.max(1, Math.ceil(total / perPage));
    this.page = Math.min(Math.max(0, this.page), this._pages - 1);

    const start = this.page * perPage;
    const end = Math.min(start + perPage, total);

    this._clearGrid();
    for (let i = start; i < end; i++) {
      const item = this.items[i];
      const local = i - start;
      const r = Math.floor(local / cols), c = local % cols;
      const sx = ox + c * (cell + gap);
      const sy = y + r * (cell + gap);
      const rar = RARITY[item.rarity] ?? RARITY.common;

      const g = s.add.graphics().setScrollFactor(0).setDepth(DEPTH + 2);
      this._gt(g);

      const icon = s.add.image(sx + cell / 2, sy + cell / 2, item.key)
        .setScrollFactor(0).setDepth(DEPTH + 3);
      icon.setScale((cell - 22) / 256);
      this._gt(icon);

      const owned = !this._isConsumable(item) && this.isOwned(item.key);
      if (owned) {
        const oTag = s.add.text(sx + cell - 6, sy + 6, "✓", {
          fontFamily: "monospace", fontSize: "14px", color: "#8fe89a", stroke: "#06120a", strokeThickness: 3
        }).setOrigin(1, 0).setScrollFactor(0).setDepth(DEPTH + 4);
        this._gt(oTag);
      }

      const zone = s.add.zone(sx, sy, cell, cell).setOrigin(0)
        .setScrollFactor(0).setDepth(DEPTH + 5).setInteractive({ useHandCursor: true });
      zone.on("pointerover", () => { if (this.selected !== i) this._paintSlot(g, sx, sy, cell, rar, false, true); });
      zone.on("pointerout", () => { if (this.selected !== i) this._paintSlot(g, sx, sy, cell, rar, false, false); });
      zone.on("pointerdown", () => this._select(i));
      this._gt(zone);

      this.slots.push({ g, sx, sy, cell, rar, i });
      this._paintSlot(g, sx, sy, cell, rar, i === this.selected, false);
    }

    if (this._pages > 1) this._renderPager(ox, y + h - 18, gridW);
  }

  _renderPager(cx0, cy, gridW) {
    const s = this.scene;
    const cx = cx0 + gridW / 2;
    const mk = (dx, label, dir) => {
      const t = s.add.text(cx + dx, cy, label, {
        fontFamily: "monospace", fontSize: "22px", color: "#ffe1a4", stroke: "#160a04", strokeThickness: 3
      }).setOrigin(0.5).setScrollFactor(0).setDepth(DEPTH + 4);
      this._gt(t);
      const enabled = dir < 0 ? this.page > 0 : this.page < this._pages - 1;
      t.setAlpha(enabled ? 1 : 0.3);
      if (enabled) {
        const z = s.add.zone(cx + dx, cy, 40, 36).setScrollFactor(0).setDepth(DEPTH + 5)
          .setInteractive({ useHandCursor: true });
        z.on("pointerdown", () => { this.page += dir; this._renderGrid(); });
        this._gt(z);
      }
    };
    mk(-78, "‹", -1);
    mk(78, "›", 1);
    const lbl = s.add.text(cx, cy, `${this.page + 1} / ${this._pages}`, {
      fontFamily: "monospace", fontSize: "13px", color: "#9fb0c4"
    }).setOrigin(0.5).setScrollFactor(0).setDepth(DEPTH + 4);
    this._gt(lbl);
  }

  _paintSlot(g, sx, sy, cell, rar, selected, hover) {
    g.clear();
    g.fillStyle(selected ? 0x1c2740 : (hover ? 0x16203a : 0x101827), 1);
    g.fillRoundedRect(sx, sy, cell, cell, 7);
    g.lineStyle(selected ? 3 : 2, rar.color, selected ? 1 : 0.85);
    g.strokeRoundedRect(sx, sy, cell, cell, 7);
    if (selected) {
      g.lineStyle(1, 0xffffff, 0.5);
      g.strokeRoundedRect(sx + 3, sy + 3, cell - 6, cell - 6, 5);
    }
  }

  _select(i) {
    if (i === this.selected) return;
    const prev = this._slotByIndex(this.selected);
    if (prev) this._paintSlot(prev.g, prev.sx, prev.sy, prev.cell, prev.rar, false, false);
    this.selected = i;
    const cur = this._slotByIndex(i);
    if (cur) this._paintSlot(cur.g, cur.sx, cur.sy, cur.cell, cur.rar, true, false);
    this._renderDetail();
  }

  // ── detail pane ────────────────────────────────────────────────────────────
  _clearDetail() {
    this.detailObjs.forEach((o) => o.destroy());
    this.detailObjs = [];
  }

  _renderDetail() {
    const s = this.scene;
    this._clearDetail();
    const { x, y, w, h } = this._detail;
    const cx = x + w / 2;
    const item = this.items[this.selected];
    if (!item) { // nothing for sale this character can use (e.g. mage at the forge)
      this._dt(s.add.text(cx, y + h / 2, "Nothing here for\nyour class yet.", {
        fontFamily: "Georgia, serif", fontSize: "16px", color: "#8a99ad",
        align: "center", lineSpacing: 6
      }).setOrigin(0.5).setScrollFactor(0).setDepth(DEPTH + 3));
      return;
    }
    const rar = RARITY[item.rarity] ?? RARITY.common;

    // Big icon with rarity glow
    const glow = s.add.graphics().setScrollFactor(0).setDepth(DEPTH + 2);
    glow.fillStyle(rar.glow, 0.16); glow.fillCircle(cx, y + 96, 78);
    this._dt(glow);
    const big = s.add.image(cx, y + 96, item.key).setScrollFactor(0).setDepth(DEPTH + 3);
    big.setScale(150 / 256);
    this._dt(big);

    // Name
    this._dt(s.add.text(cx, y + 190, item.name, {
      fontFamily: "Georgia, serif", fontSize: "22px", color: rar.text,
      stroke: "#0a0603", strokeThickness: 4, align: "center", wordWrap: { width: w - 24 }
    }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(DEPTH + 3));

    // Rarity tag
    this._dt(s.add.text(cx, y + 222, rar.label.toUpperCase(), {
      fontFamily: "monospace", fontSize: "12px", color: rar.text, letterSpacing: 2
    }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(DEPTH + 3));

    // Divider
    const dv = s.add.graphics().setScrollFactor(0).setDepth(DEPTH + 3);
    dv.lineStyle(1, 0x2a3850, 1); dv.lineBetween(x + 18, y + 250, x + w - 18, y + 250);
    this._dt(dv);

    // Effect
    this._dt(s.add.text(cx, y + 262, item.effect, {
      fontFamily: "monospace", fontSize: "14px", color: "#d9e2ee",
      align: "center", lineSpacing: 6, wordWrap: { width: w - 36 }
    }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(DEPTH + 3));

    // Price
    const priceY = y + this._detail.h - 96;
    this._dt(s.add.text(cx, priceY - 18, "PRICE", {
      fontFamily: "monospace", fontSize: "11px", color: "#8aa0b8"
    }).setOrigin(0.5).setScrollFactor(0).setDepth(DEPTH + 3));
    this._drawCoin(cx - 34, priceY + 6, 13, this.detailObjs);
    this._dt(s.add.text(cx - 16, priceY + 6, String(item.price), {
      fontFamily: "monospace", fontSize: "20px", color: "#ffd95e", stroke: "#1a1304", strokeThickness: 3
    }).setOrigin(0, 0.5).setScrollFactor(0).setDepth(DEPTH + 3));

    // Buy button / state (+ Sell ½ when the player owns a spare copy)
    const sellable = (this.scene.bag?.count?.(item.key) ?? 0) > 0;
    this._buyButton(item, cx, y + this._detail.h - (sellable ? 62 : 44));
    if (sellable) this._sellButton(item, cx, y + this._detail.h - 20);
  }

  _sellButton(item, cx, cy) {
    const s = this.scene;
    const w = Math.min(this._detail.w - 36, 220);
    const value = Math.floor((item.price ?? 0) / 2);
    const g = s.add.graphics().setScrollFactor(0).setDepth(DEPTH + 3);
    g.fillStyle(0x5a3d12, 1); g.fillRoundedRect(cx - w / 2, cy - 18, w, 36, 8);
    g.lineStyle(2, 0xd2a24a, 1); g.strokeRoundedRect(cx - w / 2, cy - 18, w, 36, 8);
    this._dt(g);
    this._dt(s.add.text(cx, cy, `Sell ½  ·  ${value}`, {
      fontFamily: "Georgia, serif", fontSize: "15px", color: "#ffe6b0", stroke: "#1a1304", strokeThickness: 3
    }).setOrigin(0.5).setScrollFactor(0).setDepth(DEPTH + 4));
    const zone = s.add.zone(cx, cy, w, 36).setScrollFactor(0).setDepth(DEPTH + 5)
      .setInteractive({ useHandCursor: true });
    zone.on("pointerdown", () => this._sell(item));
    this._dt(zone);
  }

  async _sell(item) {
    const result = await (this.scene.bag?.sell(item) ?? Promise.resolve({ ok: false, error: "No bag" }));
    if (!result.ok) { this._toast(result.error ?? "Sale failed", "#ffb4b4"); return; }
    this.scene.playSfx?.("sfx-sell", 0.5);
    if (this.coinText) this.coinText.setText(String(this._coins()));
    this._toast(`Sold ${item.name} (+${Math.floor((item.price ?? 0) / 2)})`, "#ffe6b0");
    this._renderDetail();
    this._refreshOwnedTicks();
  }

  _buyButton(item, cx, cy) {
    const s = this.scene;
    const w = Math.min(this._detail.w - 36, 220);
    const owned = !this._isConsumable(item) && this.isOwned(item.key);
    const affordable = this._coins() >= item.price;

    const g = s.add.graphics().setScrollFactor(0).setDepth(DEPTH + 3);
    const fill = owned ? 0x1d4d28 : (affordable ? 0x1f6d34 : 0x3a2330);
    const stroke = owned ? 0x6fd687 : (affordable ? 0x57d36f : 0x8f5b5b);
    g.fillStyle(fill, 1); g.fillRoundedRect(cx - w / 2, cy - 20, w, 40, 8);
    g.lineStyle(2, stroke, 1); g.strokeRoundedRect(cx - w / 2, cy - 20, w, 40, 8);
    this._dt(g);

    const label = owned ? "Owned" : (affordable ? "Buy" : "Not enough coins");
    this._dt(s.add.text(cx, cy, label, {
      fontFamily: "Georgia, serif", fontSize: "16px",
      color: owned ? "#bff7c4" : (affordable ? "#eafff0" : "#ffc9c9"), stroke: "#08120a", strokeThickness: 3
    }).setOrigin(0.5).setScrollFactor(0).setDepth(DEPTH + 4));

    if (!owned && affordable) {
      const zone = s.add.zone(cx, cy, w, 40).setScrollFactor(0).setDepth(DEPTH + 5)
        .setInteractive({ useHandCursor: true });
      zone.on("pointerdown", () => this._buy(item));
      this._dt(zone);
    }
  }

  async _buy(item) {
    const consumable = this._isConsumable(item);
    if (!consumable && this.isOwned(item.key)) return;
    // Inventory.buy handles both guest (local coins) and wallet (authoritative server
    // buy) and returns the outcome — never pre-deduct here.
    const result = await (this.scene.bag?.buy(item) ?? Promise.resolve({ ok: false, error: "No bag" }));
    if (!result.ok) { this._toast(result.error ?? "Purchase failed", "#ffb4b4"); return; }
    this.scene.playSfx?.("sfx-purchase", 0.5);
    if (this.coinText) this.coinText.setText(String(this._coins()));
    this._toast(`Purchased ${item.name}!`, "#bff7c4");
    const slot = this._slotByIndex(this.selected);
    if (consumable) {
      // Consumables stay buyable; just refresh the detail (affordability may change).
      this._renderDetail();
      return;
    }
    this._renderDetail();
    if (slot) this._paintSlot(slot.g, slot.sx, slot.sy, slot.cell, slot.rar, true, false);
    this._refreshOwnedTicks();
  }

  _isConsumable(item) {
    return typeof item.heal === "number" || typeof item.mana === "number"
      || typeof item.shot === "number" || typeof item.scroll === "string";
  }

  _refreshOwnedTicks() {
    // Add a tick to the just-bought slot without rebuilding the whole grid.
    const s = this.scene;
    const slot = this._slotByIndex(this.selected);
    if (!slot) return;
    const tag = s.add.text(slot.sx + slot.cell - 6, slot.sy + 6, "✓", {
      fontFamily: "monospace", fontSize: "14px", color: "#8fe89a", stroke: "#06120a", strokeThickness: 3
    }).setOrigin(1, 0).setScrollFactor(0).setDepth(DEPTH + 4);
    this._gt(tag);
  }

  _toast(msg, color) {
    const s = this.scene;
    const { px, py, panelW, panelH } = this._panel;
    const t = s.add.text(px + panelW / 2, py + panelH - 8, msg, {
      fontFamily: "monospace", fontSize: "15px", color, stroke: "#06070a", strokeThickness: 4
    }).setOrigin(0.5, 1).setScrollFactor(0).setDepth(DEPTH + 8);
    this._track(t);
    s.tweens.add({ targets: t, y: t.y - 26, alpha: 0, duration: 1300, ease: "Cubic.Out", onComplete: () => t.destroy() });
  }

  // ── helpers ────────────────────────────────────────────────────────────────
  _closeBtn(x, y) {
    const s = this.scene;
    const g = s.add.graphics().setScrollFactor(0).setDepth(DEPTH + 3);
    const paint = (fill) => { g.clear(); g.fillStyle(fill, 1); g.fillCircle(x, y, 15); g.lineStyle(2, 0x000000, 0.5); g.strokeCircle(x, y, 15); };
    paint(0x7a2630);
    this._track(g);
    const t = s.add.text(x, y, "✕", { fontFamily: "monospace", fontSize: "16px", color: "#ffd9d9" })
      .setOrigin(0.5).setScrollFactor(0).setDepth(DEPTH + 4);
    this._track(t);
    const zone = s.add.zone(x, y, 34, 34).setScrollFactor(0).setDepth(DEPTH + 5).setInteractive({ useHandCursor: true });
    zone.on("pointerover", () => paint(0xa33240));
    zone.on("pointerout", () => paint(0x7a2630));
    zone.on("pointerdown", () => this.close());
    this._track(zone);
  }

  _drawCoin(x, y, r, bucket = this.objs) {
    const s = this.scene;
    const g = s.add.graphics().setScrollFactor(0).setDepth(DEPTH + 3);
    g.fillStyle(0xb8860b, 1); g.fillCircle(x, y, r);
    g.fillStyle(0xffd95e, 1); g.fillCircle(x, y, r - 3);
    g.lineStyle(1.5, 0x8a6508, 1); g.strokeCircle(x, y, r);
    bucket.push(g);
  }

  _coins() {
    return this.scene.getCoins?.() ?? 0;
  }

  _ownedKey() {
    const pid = this.scene.getPlayerProfileId?.() ?? "guest";
    return `eldervalley-items-${pid}`;
  }

  getOwned() {
    try {
      return new Set(JSON.parse(localStorage.getItem(this._ownedKey()) ?? "[]"));
    } catch {
      return new Set();
    }
  }

  isOwned(key) {
    return this.scene.bag?.has(key) ?? false;
  }

  _addOwned(key) {
    const set = this.getOwned();
    set.add(key);
    try { localStorage.setItem(this._ownedKey(), JSON.stringify([...set])); } catch { /* ignore */ }
  }

  _track(o) { this.objs.push(o); return o; }
  _gt(o) { this.gridObjs.push(o); return o; }
  _dt(o) { this.detailObjs.push(o); return o; }
}
