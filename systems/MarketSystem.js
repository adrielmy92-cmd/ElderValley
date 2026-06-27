import { ALCHEMIST_ITEMS, RARITY } from "../data/alchemist-items.js?v=32";

// Player marketplace overlay (asynchronous listings, server-authoritative).
// Mirrors ShopSystem's self-contained pattern — every object lives in this.objs
// and is destroyed on close/refresh, so there are no masked-container input bugs.
// Wallet-only: the host scene only opens it for wallet profiles. The host freezes
// the player while isOpen() is true.
const DEPTH = 9000;
const ITEMS_BY_KEY = Object.fromEntries(ALCHEMIST_ITEMS.map((i) => [i.key, i]));

export default class MarketSystem {
  constructor(scene) {
    this.scene = scene;
    this.objs = [];
    this.open_ = false;
    this.tab = "browse";
    this.listings = [];
    this.mine = [];
    this.selected = null;   // selected listing (browse) index
    this.sellKey = null;    // selected bag item key (sell)
    this.sellPrice = 0;
    this.busy = false;
  }

  isOpen() { return this.open_; }
  toggle() { this.open_ ? this.close() : this.open(); }

  open() {
    if (this.open_) return;
    this.open_ = true;
    this.tab = "browse";
    this.selected = null;
    this.sellKey = null;
    this._build();
    this._escHandler = (e) => { if (e.key === "Escape") this.close(); };
    window.addEventListener("keydown", this._escHandler);
    // Sync authoritative coins+bag, then load the catalog.
    this.scene.bag?._pull?.().then(() => { if (this.open_) this._refresh(); }).catch(() => {});
    this._loadBrowse();
  }

  close() {
    if (!this.open_) return;
    this.open_ = false;
    this.objs.forEach((o) => o.destroy());
    this.objs = [];
    if (this._escHandler) { window.removeEventListener("keydown", this._escHandler); this._escHandler = null; }
  }

  _t(o) { this.objs.push(o); return o; }
  _refresh() {
    if (!this.open_) return;
    this.objs.forEach((o) => o.destroy());
    this.objs = [];
    this._build();
  }

  // ── networking ───────────────────────────────────────────────────────────────
  _pid() { return this.scene.getPlayerProfileId?.() ?? "guest"; }
  _name() {
    return this.scene.registry?.get("playerProfile")?.displayName
      ?? this.scene.registry?.get("playerName")
      ?? this.scene.playerName ?? "Trader";
  }
  async _get(path) {
    const r = await fetch(path, { cache: "no-store", headers: this.scene.getSessionHeaders?.() ?? {} });
    return r.json();
  }
  async _post(action, body) {
    const r = await fetch(`/api/market/${action}`, {
      method: "POST",
      headers: this.scene.getSessionHeaders?.({ "Content-Type": "application/json" }) ?? { "Content-Type": "application/json" },
      body: JSON.stringify({ profileId: this._pid(), sellerName: this._name(), ...body })
    });
    return r.json();
  }
  _applyState(data) {
    if (data?.bag) this.scene.bag?._applyBag?.(data.bag);
    if (typeof data?.coins === "number") this.scene.setCoins?.(data.coins);
    this.scene.onBagSynced?.();
  }

  async _loadBrowse() {
    try { const d = await this._get("/api/market"); this.listings = d?.listings ?? []; } catch { this.listings = []; }
    if (this.tab === "browse") this._refresh();
  }
  async _loadMine() {
    try { const d = await this._get(`/api/market/mine?profileId=${encodeURIComponent(this._pid())}`); this.mine = d?.listings ?? []; } catch { this.mine = []; }
    if (this.tab === "mine") this._refresh();
  }

  // Pushed from the server when any player lists/buys/cancels: reload the live data
  // for the tab being viewed so sold listings disappear without reopening.
  refreshLive() {
    if (!this.open_) return;
    if (this.tab === "browse") this._loadBrowse();
    else if (this.tab === "mine") this._loadMine();
  }

  // ── layout ─────────────────────────────────────────────────────────────────
  _build() {
    const s = this.scene;
    const cam = s.cameras.main;
    const W = cam.width, H = cam.height;
    const panelW = Math.min(980, W - 48);
    const panelH = Math.min(640, H - 48);
    const px = Math.round((W - panelW) / 2);
    const py = Math.round((H - panelH) / 2);
    this._panel = { px, py, panelW, panelH };

    this._t(s.add.rectangle(W / 2, H / 2, W, H, 0x05070c, 0.74).setScrollFactor(0).setDepth(DEPTH).setInteractive());

    const g = s.add.graphics().setScrollFactor(0).setDepth(DEPTH + 1);
    g.fillStyle(0x0c1320, 0.99); g.fillRoundedRect(px, py, panelW, panelH, 12);
    g.lineStyle(4, 0x05080f, 1); g.strokeRoundedRect(px, py, panelW, panelH, 12);
    g.lineStyle(2, 0xc9963f, 1); g.strokeRoundedRect(px + 8, py + 8, panelW - 16, panelH - 16, 8);
    g.fillStyle(0x161f30, 1); g.fillRoundedRect(px + 14, py + 14, panelW - 28, 56, 6);
    this._t(g);

    this._t(s.add.text(px + 30, py + 24, "Marketplace", {
      fontFamily: "Georgia, 'Times New Roman', serif", fontSize: "24px",
      color: "#ffe1a4", stroke: "#160a04", strokeThickness: 4
    }).setScrollFactor(0).setDepth(DEPTH + 2));
    this._t(s.add.text(px + 31, py + 50, "Trade with other adventurers · 5% market fee", {
      fontFamily: "monospace", fontSize: "12px", color: "#9fb0c4"
    }).setScrollFactor(0).setDepth(DEPTH + 2));

    this._drawCoin(px + panelW - 152, py + 42, 13);
    this.coinText = this._t(s.add.text(px + panelW - 136, py + 42, String(this._coins()), {
      fontFamily: "monospace", fontSize: "18px", color: "#ffd95e", stroke: "#1a1304", strokeThickness: 3
    }).setOrigin(0, 0.5).setScrollFactor(0).setDepth(DEPTH + 2));

    this._closeBtn(px + panelW - 30, py + 30);

    // Tabs
    const tabs = [["browse", "Browse"], ["sell", "Sell"], ["mine", "My Listings"]];
    const tw = 132, th = 30, tgap = 8;
    tabs.forEach(([key, label], i) => {
      const tx = px + 18 + i * (tw + tgap);
      const ty = py + 80;
      const active = this.tab === key;
      const tg = s.add.graphics().setScrollFactor(0).setDepth(DEPTH + 2);
      tg.fillStyle(active ? 0x24314c : 0x121826, 1); tg.fillRoundedRect(tx, ty, tw, th, 6);
      tg.lineStyle(active ? 2 : 1, active ? 0xc9963f : 0x33415c, 1); tg.strokeRoundedRect(tx, ty, tw, th, 6);
      this._t(tg);
      this._t(s.add.text(tx + tw / 2, ty + th / 2, label, {
        fontFamily: "Georgia, serif", fontSize: "14px", color: active ? "#ffe1a4" : "#8fa3bd"
      }).setOrigin(0.5).setScrollFactor(0).setDepth(DEPTH + 3));
      const z = s.add.zone(tx, ty, tw, th).setOrigin(0).setScrollFactor(0).setDepth(DEPTH + 4).setInteractive({ useHandCursor: true });
      z.on("pointerdown", () => this._switchTab(key));
      this._t(z);
    });

    const innerTop = py + 122;
    this._content = { x: px + 18, y: innerTop, w: panelW - 36, h: panelH - 122 - 18 };

    if (this.tab === "browse") this._renderBrowse();
    else if (this.tab === "sell") this._renderSell();
    else this._renderMine();
  }

  _switchTab(key) {
    if (this.tab === key) return;
    this.tab = key;
    this.selected = null;
    this.sellKey = null;
    this._refresh();
    if (key === "browse") this._loadBrowse();
    if (key === "mine") this._loadMine();
  }

  // ── Browse ───────────────────────────────────────────────────────────────────
  _renderBrowse() {
    const { x, y, w, h } = this._content;
    const leftW = Math.round(w * 0.6);
    this._grid = { x, y, w: leftW - 8, h };
    this._detail = { x: x + leftW + 8, y, w: w - leftW - 8, h };
    this._detailBg();
    if (!this.listings.length) {
      this._centerNote(this._grid, "No listings yet.\nBe the first to sell something!");
    } else {
      this._renderListingGrid(this.listings, this.selected, (i) => { this.selected = i; this._refresh(); });
    }
    this._renderBrowseDetail();
  }

  _renderBrowseDetail() {
    const s = this.scene;
    const { x, y, w, h } = this._detail;
    const cx = x + w / 2;
    const l = this.selected != null ? this.listings[this.selected] : null;
    if (!l) { this._centerNote(this._detail, "Select a listing\nto inspect it."); return; }
    const rar = RARITY[l.rarity] ?? RARITY.common;

    const glow = s.add.graphics().setScrollFactor(0).setDepth(DEPTH + 2);
    glow.fillStyle(rar.glow, 0.16); glow.fillCircle(cx, y + 84, 70); this._t(glow);
    if (s.textures.exists(l.itemKey)) {
      const big = s.add.image(cx, y + 84, l.itemKey).setScrollFactor(0).setDepth(DEPTH + 3);
      big.setScale(132 / 256); this._t(big);
    }
    const title = l.enchantLevel > 0 ? `${l.name} +${l.enchantLevel}` : l.name;
    this._t(s.add.text(cx, y + 162, title, {
      fontFamily: "Georgia, serif", fontSize: "20px", color: rar.text, stroke: "#0a0603", strokeThickness: 4,
      align: "center", wordWrap: { width: w - 24 }
    }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(DEPTH + 3));
    this._t(s.add.text(cx, y + 192, `${rar.label.toUpperCase()}  ·  by ${l.sellerName}`, {
      fontFamily: "monospace", fontSize: "11px", color: "#9fb0c4"
    }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(DEPTH + 3));
    if (l.effect) {
      this._t(s.add.text(cx, y + 218, l.effect, {
        fontFamily: "monospace", fontSize: "13px", color: "#d9e2ee", align: "center",
        lineSpacing: 5, wordWrap: { width: w - 36 }
      }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(DEPTH + 3));
    }

    const priceY = y + h - 92;
    this._drawCoin(cx - 40, priceY, 13);
    this._t(s.add.text(cx - 22, priceY, String(l.price), {
      fontFamily: "monospace", fontSize: "22px", color: "#ffd95e", stroke: "#1a1304", strokeThickness: 3
    }).setOrigin(0, 0.5).setScrollFactor(0).setDepth(DEPTH + 3));

    const mine = l.sellerProfileId === this._pid();
    const affordable = this._coins() >= l.price;
    const enabled = !mine && affordable && !this.busy;
    const label = mine ? "Your listing" : (affordable ? "Buy" : "Not enough coins");
    this._actionButton(cx, y + h - 40, Math.min(w - 36, 220), enabled, label,
      enabled ? 0x1f6d34 : 0x3a2330, enabled ? 0x57d36f : 0x8f5b5b,
      () => this._buy(l.id));
  }

  async _buy(listingId) {
    if (this.busy) return;
    this.busy = true;
    const d = await this._post("buy", { listingId }).catch(() => ({ ok: false, error: "Server unreachable" }));
    this.busy = false;
    if (!d?.ok) { this._toast(d?.error ?? "Purchase failed", "#ffb4b4"); this._loadBrowse(); return; }
    this.scene.playSfx?.("sfx-purchase", 0.5);
    this._applyState(d);
    this.selected = null;
    this._toast(`Bought ${d.item?.name ?? "item"}!`, "#bff7c4");
    this._loadBrowse();
  }

  // ── Sell ─────────────────────────────────────────────────────────────────────
  _renderSell() {
    const { x, y, w, h } = this._content;
    const leftW = Math.round(w * 0.6);
    this._grid = { x, y, w: leftW - 8, h };
    this._detail = { x: x + leftW + 8, y, w: w - leftW - 8, h };
    this._detailBg();

    const stacks = this.scene.bag?.ownedStacks?.() ?? [];
    this._sellItems = stacks;
    if (!stacks.length) {
      this._centerNote(this._grid, "Your bag is empty.\nUnequip gear to sell it here.");
    } else {
      const cells = stacks.map(({ item, count }) => ({
        itemKey: item.key, name: item.name, rarity: item.rarity,
        enchantLevel: this.scene.bag?.enchantLevel?.(item.key) ?? 0, count
      }));
      const selIdx = cells.findIndex((c) => c.itemKey === this.sellKey);
      this._renderListingGrid(cells, selIdx >= 0 ? selIdx : null, (i) => {
        this.sellKey = cells[i].itemKey;
        const cat = ITEMS_BY_KEY[this.sellKey];
        this.sellPrice = Math.max(1, cat?.price ?? 10);
        this._refresh();
      }, true);
    }
    this._renderSellDetail();
  }

  _renderSellDetail() {
    const s = this.scene;
    const { x, y, w, h } = this._detail;
    const cx = x + w / 2;
    const item = this.sellKey ? ITEMS_BY_KEY[this.sellKey] : null;
    if (!item) { this._centerNote(this._detail, "Pick an item from\nyour bag to sell."); return; }
    const rar = RARITY[item.rarity] ?? RARITY.common;
    const lvl = this.scene.bag?.enchantLevel?.(this.sellKey) ?? 0;

    if (s.textures.exists(item.key)) {
      const big = s.add.image(cx, y + 78, item.key).setScrollFactor(0).setDepth(DEPTH + 3);
      big.setScale(120 / 256); this._t(big);
    }
    this._t(s.add.text(cx, y + 148, lvl > 0 ? `${item.name} +${lvl}` : item.name, {
      fontFamily: "Georgia, serif", fontSize: "19px", color: rar.text, stroke: "#0a0603", strokeThickness: 4,
      align: "center", wordWrap: { width: w - 24 }
    }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(DEPTH + 3));

    // Price stepper
    this._t(s.add.text(cx, y + 188, "LIST PRICE", {
      fontFamily: "monospace", fontSize: "11px", color: "#8aa0b8"
    }).setOrigin(0.5).setScrollFactor(0).setDepth(DEPTH + 3));
    this._drawCoin(cx - 46, y + 216, 12);
    this._t(s.add.text(cx - 28, y + 216, String(this.sellPrice), {
      fontFamily: "monospace", fontSize: "22px", color: "#ffd95e", stroke: "#1a1304", strokeThickness: 3
    }).setOrigin(0, 0.5).setScrollFactor(0).setDepth(DEPTH + 3));

    const steps = [[-100, "−100"], [-10, "−10"], [10, "+10"], [100, "+100"]];
    const bw = 50, bgap = 6;
    const totalW = steps.length * bw + (steps.length - 1) * bgap;
    let bx = cx - totalW / 2;
    steps.forEach(([delta, lbl]) => {
      this._actionButton(bx + bw / 2, y + 254, bw, true, lbl, 0x1c2740, 0x46587c, () => {
        this.sellPrice = Math.max(1, Math.min(100000000, this.sellPrice + delta));
        this._refresh();
      }, 13);
      bx += bw + bgap;
    });

    const payout = Math.floor(this.sellPrice * 0.95);
    this._t(s.add.text(cx, y + 286, `You receive ${payout} after fee`, {
      fontFamily: "monospace", fontSize: "11px", color: "#8fbf9a"
    }).setOrigin(0.5).setScrollFactor(0).setDepth(DEPTH + 3));

    this._actionButton(cx, y + h - 40, Math.min(w - 36, 220), !this.busy, "List for sale",
      0x1f6d34, 0x57d36f, () => this._list(this.sellKey, this.sellPrice));
  }

  async _list(itemKey, price) {
    if (this.busy) return;
    this.busy = true;
    const d = await this._post("list", { itemKey, price }).catch(() => ({ ok: false, error: "Server unreachable" }));
    this.busy = false;
    if (!d?.ok) { this._toast(d?.error ?? "Could not list", "#ffb4b4"); return; }
    this.scene.playSfx?.("sfx-sell", 0.5);
    this._applyState(d);
    this.sellKey = null;
    this._toast("Listed on the market!", "#bff7c4");
    this._loadMine();
    this._refresh();
  }

  // ── My Listings ───────────────────────────────────────────────────────────────
  _renderMine() {
    const s = this.scene;
    const { x, y, w, h } = this._content;
    if (!this.mine.length) { this._centerNote({ x, y, w, h }, "You have no active listings."); return; }
    const rowH = 60, gap = 8;
    this.mine.slice(0, Math.floor(h / (rowH + gap))).forEach((l, i) => {
      const ry = y + i * (rowH + gap);
      const rar = RARITY[l.rarity] ?? RARITY.common;
      const g = s.add.graphics().setScrollFactor(0).setDepth(DEPTH + 2);
      g.fillStyle(0x101827, 1); g.fillRoundedRect(x, ry, w, rowH, 8);
      g.lineStyle(1, rar.color, 0.8); g.strokeRoundedRect(x, ry, w, rowH, 8);
      this._t(g);
      if (s.textures.exists(l.itemKey)) {
        const ic = s.add.image(x + 34, ry + rowH / 2, l.itemKey).setScrollFactor(0).setDepth(DEPTH + 3);
        ic.setScale(44 / 256); this._t(ic);
      }
      this._t(s.add.text(x + 66, ry + 14, l.enchantLevel > 0 ? `${l.name} +${l.enchantLevel}` : l.name, {
        fontFamily: "Georgia, serif", fontSize: "15px", color: rar.text
      }).setScrollFactor(0).setDepth(DEPTH + 3));
      this._drawCoin(x + 70, ry + 40, 9);
      this._t(s.add.text(x + 82, ry + 40, String(l.price), {
        fontFamily: "monospace", fontSize: "14px", color: "#ffd95e"
      }).setOrigin(0, 0.5).setScrollFactor(0).setDepth(DEPTH + 3));
      this._actionButton(x + w - 70, ry + rowH / 2, 110, !this.busy, "Cancel", 0x5a2630, 0xc06070,
        () => this._cancel(l.id), 13);
    });
  }

  async _cancel(listingId) {
    if (this.busy) return;
    this.busy = true;
    const d = await this._post("cancel", { listingId }).catch(() => ({ ok: false, error: "Server unreachable" }));
    this.busy = false;
    if (!d?.ok) { this._toast(d?.error ?? "Could not cancel", "#ffb4b4"); this._loadMine(); return; }
    this._applyState(d);
    this._toast("Listing cancelled — item returned.", "#bff7c4");
    this._loadMine();
  }

  // ── shared grid (used by Browse + Sell) ───────────────────────────────────────
  _renderListingGrid(cells, selectedIdx, onSelect, showCount = false) {
    const s = this.scene;
    const { x, y, w, h } = this._grid;
    const cols = 4;
    const max = cols * Math.floor(h / 96);
    const shown = cells.slice(0, max);
    const rows = Math.max(1, Math.ceil(shown.length / cols));
    const gap = 10;
    const cell = Math.min(Math.floor((w - (cols - 1) * gap) / cols), 96);
    const ox = x + Math.round((w - (cols * cell + (cols - 1) * gap)) / 2);

    shown.forEach((c, i) => {
      const r = Math.floor(i / cols), col = i % cols;
      const sx = ox + col * (cell + gap);
      const sy = y + r * (cell + gap);
      const rar = RARITY[c.rarity] ?? RARITY.common;
      const sel = i === selectedIdx;

      const g = s.add.graphics().setScrollFactor(0).setDepth(DEPTH + 2);
      g.fillStyle(sel ? 0x1c2740 : 0x101827, 1); g.fillRoundedRect(sx, sy, cell, cell, 7);
      g.lineStyle(sel ? 3 : 2, rar.color, sel ? 1 : 0.85); g.strokeRoundedRect(sx, sy, cell, cell, 7);
      this._t(g);

      if (s.textures.exists(c.itemKey)) {
        const ic = s.add.image(sx + cell / 2, sy + cell / 2 - 6, c.itemKey).setScrollFactor(0).setDepth(DEPTH + 3);
        ic.setScale((cell - 30) / 256); this._t(ic);
      }
      if (c.enchantLevel > 0) {
        this._t(s.add.text(sx + cell - 6, sy + 5, `+${c.enchantLevel}`, {
          fontFamily: "monospace", fontSize: "12px", color: "#ffe08a", stroke: "#160a04", strokeThickness: 3
        }).setOrigin(1, 0).setScrollFactor(0).setDepth(DEPTH + 4));
      }
      if (showCount && c.count > 1) {
        this._t(s.add.text(sx + cell - 6, sy + cell - 4, `x${c.count}`, {
          fontFamily: "monospace", fontSize: "12px", color: "#cfe0ef", stroke: "#06070a", strokeThickness: 3
        }).setOrigin(1, 1).setScrollFactor(0).setDepth(DEPTH + 4));
      }
      // price tag for browse listings
      if (c.price != null) {
        this._t(s.add.text(sx + cell / 2, sy + cell - 12, String(c.price), {
          fontFamily: "monospace", fontSize: "12px", color: "#ffd95e", stroke: "#1a1304", strokeThickness: 3
        }).setOrigin(0.5).setScrollFactor(0).setDepth(DEPTH + 4));
      }
      const z = s.add.zone(sx, sy, cell, cell).setOrigin(0).setScrollFactor(0).setDepth(DEPTH + 5).setInteractive({ useHandCursor: true });
      z.on("pointerdown", () => onSelect(i));
      this._t(z);
    });
    if (cells.length > shown.length) {
      this._t(s.add.text(x + w / 2, y + h - 6, `+${cells.length - shown.length} more…`, {
        fontFamily: "monospace", fontSize: "11px", color: "#7d8ea4"
      }).setOrigin(0.5, 1).setScrollFactor(0).setDepth(DEPTH + 3));
    }
  }

  // ── small ui helpers ──────────────────────────────────────────────────────────
  _detailBg() {
    const s = this.scene;
    const { x, y, w, h } = this._detail;
    const dg = s.add.graphics().setScrollFactor(0).setDepth(DEPTH + 1);
    dg.fillStyle(0x0a1018, 0.96); dg.fillRoundedRect(x, y, w, h, 8);
    dg.lineStyle(1, 0x2a3850, 1); dg.strokeRoundedRect(x, y, w, h, 8);
    this._t(dg);
  }

  _centerNote(area, msg) {
    this._t(this.scene.add.text(area.x + area.w / 2, area.y + area.h / 2, msg, {
      fontFamily: "monospace", fontSize: "14px", color: "#7d8ea4", align: "center", lineSpacing: 6
    }).setOrigin(0.5).setScrollFactor(0).setDepth(DEPTH + 3));
  }

  _actionButton(cx, cy, w, enabled, label, fill, stroke, cb, fontSize = 16) {
    const s = this.scene;
    const g = s.add.graphics().setScrollFactor(0).setDepth(DEPTH + 3);
    g.fillStyle(enabled ? fill : 0x2a2622, 1); g.fillRoundedRect(cx - w / 2, cy - 18, w, 36, 8);
    g.lineStyle(2, enabled ? stroke : 0x55504a, 1); g.strokeRoundedRect(cx - w / 2, cy - 18, w, 36, 8);
    this._t(g);
    this._t(s.add.text(cx, cy, label, {
      fontFamily: "Georgia, serif", fontSize: `${fontSize}px`,
      color: enabled ? "#eafff0" : "#8a857e", stroke: "#08120a", strokeThickness: 3
    }).setOrigin(0.5).setScrollFactor(0).setDepth(DEPTH + 4));
    if (enabled) {
      const z = s.add.zone(cx, cy, w, 36).setScrollFactor(0).setDepth(DEPTH + 5).setInteractive({ useHandCursor: true });
      z.on("pointerdown", () => cb());
      this._t(z);
    }
  }

  _closeBtn(x, y) {
    const s = this.scene;
    const g = s.add.graphics().setScrollFactor(0).setDepth(DEPTH + 3);
    const paint = (fill) => { g.clear(); g.fillStyle(fill, 1); g.fillCircle(x, y, 15); g.lineStyle(2, 0x000000, 0.5); g.strokeCircle(x, y, 15); };
    paint(0x7a2630); this._t(g);
    this._t(s.add.text(x, y, "✕", { fontFamily: "monospace", fontSize: "16px", color: "#ffd9d9" }).setOrigin(0.5).setScrollFactor(0).setDepth(DEPTH + 4));
    const z = s.add.zone(x, y, 34, 34).setScrollFactor(0).setDepth(DEPTH + 5).setInteractive({ useHandCursor: true });
    z.on("pointerover", () => paint(0xa33240));
    z.on("pointerout", () => paint(0x7a2630));
    z.on("pointerdown", () => this.close());
    this._t(z);
  }

  _drawCoin(x, y, r) {
    const g = this.scene.add.graphics().setScrollFactor(0).setDepth(DEPTH + 3);
    g.fillStyle(0xb8860b, 1); g.fillCircle(x, y, r);
    g.fillStyle(0xffd95e, 1); g.fillCircle(x, y, r - 3);
    g.lineStyle(1.5, 0x8a6508, 1); g.strokeCircle(x, y, r);
    this._t(g);
  }

  _toast(msg, color) {
    const s = this.scene;
    const { px, py, panelW, panelH } = this._panel;
    const t = s.add.text(px + panelW / 2, py + panelH - 8, msg, {
      fontFamily: "monospace", fontSize: "15px", color, stroke: "#06070a", strokeThickness: 4
    }).setOrigin(0.5, 1).setScrollFactor(0).setDepth(DEPTH + 8);
    this._t(t);
    s.tweens.add({ targets: t, y: t.y - 26, alpha: 0, duration: 1400, ease: "Cubic.Out", onComplete: () => t.destroy() });
  }

  _coins() { return this.scene.getCoins?.() ?? 0; }
}
