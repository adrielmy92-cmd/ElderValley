import { ALCHEMIST_ITEMS } from "../data/alchemist-items.js?v=10";

// Each enchant level adds this much of the item's base stats.
const ENCHANT_STEP = 0.12;

const ITEMS_BY_KEY = Object.fromEntries(ALCHEMIST_ITEMS.map((i) => [i.key, i]));

export function itemData(key) {
  return ITEMS_BY_KEY[key] ?? null;
}

export function isConsumable(item) {
  return !!item && (typeof item.heal === "number" || typeof item.mana === "number");
}

// Player bag + equipped jewelry. Reads are always synchronous against an in-memory
// cache. For WALLET profiles the server is authoritative ("server" mode): mutations
// hit /api/economy/* and the response (authoritative coins+bag) reconciles the cache.
// For GUEST profiles nothing changes — the bag lives in localStorage ("local" mode).
export default class Inventory {
  constructor(scene) {
    this.scene = scene;
    this._mode = "local";
    this._seq = 0;        // request ordering so a stale reconcile can't clobber a newer one
    this._appliedSeq = 0;
    this.load();
  }

  get serverMode() { return this._mode === "server"; }

  _profileId() { return this.scene.getPlayerProfileId?.() ?? "guest"; }
  _isWallet() { return String(this._profileId()).toLowerCase().startsWith("wallet:"); }
  _storageKey() { return `eldervalley-bag-${this._profileId()}`; }

  load() {
    this.stacks = {};
    this.equipped = { ring1: null, ring2: null, amulet: null };
    this.enchants = {};
    if (this._isWallet()) {
      this._mode = "server";
      const profile = this.scene.registry?.get("playerProfile");
      if (profile?.bag) this._applyBag(profile.bag);
      else this._loadLocal();          // until the server profile arrives / migrates
      this._maybeMigrate(profile);     // async, fire-and-forget
    } else {
      this._mode = "local";
      this._loadLocal();
    }
  }

  _loadLocal() {
    try {
      const raw = JSON.parse(localStorage.getItem(this._storageKey()) ?? "null");
      if (raw && typeof raw === "object") {
        this.stacks = raw.stacks ?? {};
        this.equipped = { ring1: null, ring2: null, amulet: null, ...(raw.equipped ?? {}) };
        this.enchants = raw.enchants ?? {};
      }
    } catch { /* ignore */ }
  }

  _applyBag(bag) {
    this.stacks = { ...(bag?.stacks ?? {}) };
    this.equipped = { ring1: null, ring2: null, amulet: null, ...(bag?.equipped ?? {}) };
    this.enchants = { ...(bag?.enchants ?? {}) };
    // Keep registry.playerProfile fresh so a scene change re-hydrates the current
    // bag (not the stale login-time one).
    if (this.serverMode) {
      const p = this.scene.registry?.get("playerProfile");
      if (p) this.scene.registry.set("playerProfile", {
        ...p, bag: { stacks: { ...this.stacks }, equipped: { ...this.equipped }, enchants: { ...this.enchants } }
      });
    }
  }

  save() {
    // Always keep a local cache; in server mode the authority is the server, this is
    // only a fallback snapshot (never re-migrated — bagMigrated guards that).
    try {
      localStorage.setItem(this._storageKey(), JSON.stringify({ stacks: this.stacks, equipped: this.equipped, enchants: this.enchants }));
    } catch { /* ignore */ }
  }

  // ── Server bridge (wallet mode) ─────────────────────────────────────────────
  async _server(action, body) {
    const res = await fetch(`/api/economy/${action}`, {
      method: "POST",
      headers: this.scene.getSessionHeaders?.({ "Content-Type": "application/json" }) ?? { "Content-Type": "application/json" },
      body: JSON.stringify({ profileId: this._profileId(), ...body })
    });
    return res.json();
  }

  // Apply an authoritative {coins, bag} reply, newest-wins. Returns true on ok.
  _reconcile(data, seq) {
    if (typeof seq === "number") {
      if (seq < this._appliedSeq) return false; // a newer reply already landed
      this._appliedSeq = seq;
    }
    if (!data?.ok) return false;
    if (data.bag) this._applyBag(data.bag);
    if (typeof data.coins === "number") this.scene.setCoins?.(data.coins);
    this.save();
    this.scene.onBagSynced?.();
    return true;
  }

  // Fire a deterministic mutation we already applied optimistically; reconcile later.
  _push(action, body) {
    if (!this.serverMode) return;
    const seq = ++this._seq;
    this._server(action, body)
      .then((data) => { if (!this._reconcile(data, seq)) this._pull(); })
      .catch(() => { /* keep optimistic state; next sync corrects it */ });
  }

  // Re-pull the authoritative bag from the profile endpoint (used on rejection).
  async _pull() {
    try {
      const res = await fetch(`/api/profile/${encodeURIComponent(this._profileId())}`, {
        cache: "no-store",
        headers: this.scene.getSessionHeaders?.() ?? {}
      });
      const data = await res.json();
      const seq = ++this._seq;
      this._reconcile({ ok: true, bag: data?.profile?.bag, coins: data?.profile?.coins }, seq);
    } catch { /* ignore */ }
  }

  async _maybeMigrate(profile) {
    if (!this.serverMode || !profile || profile.bagMigrated) return;
    let local = null;
    try { local = JSON.parse(localStorage.getItem(this._storageKey()) ?? "null"); } catch { /* ignore */ }
    const hasLocal = local && (Object.keys(local.stacks ?? {}).length > 0 || Object.values(local.equipped ?? {}).some(Boolean));
    try {
      const data = await this._server("migrate-bag", { bag: hasLocal ? local : { stacks: {}, equipped: {}, enchants: {} } });
      if (data?.ok) {
        const seq = ++this._seq;
        this._reconcile(data, seq);
        const p = this.scene.registry?.get("playerProfile");
        if (p) this.scene.registry.set("playerProfile", { ...p, bag: data.bag, bagMigrated: true });
      }
    } catch { /* will retry next online load */ }
  }

  enchantLevel(key) { return this.enchants[key] ?? 0; }
  setEnchant(key, level) {
    if (level > 0) this.enchants[key] = level; else delete this.enchants[key];
    this.save();
  }

  // Fully remove an item (shatter): drop from bag, any equip slot, and enchant map.
  destroyItem(key) {
    delete this.stacks[key];
    for (const slot of Object.keys(this.equipped)) {
      if (this.equipped[slot] === key) this.equipped[slot] = null;
    }
    delete this.enchants[key];
    this.save();
  }

  count(key) { return this.stacks[key] ?? 0; }
  isEquipped(key) { return Object.values(this.equipped).includes(key); }
  has(key) { return this.count(key) > 0 || this.isEquipped(key); }

  add(key, n = 1) {
    this.stacks[key] = (this.stacks[key] ?? 0) + n;
    this.save();
  }

  remove(key, n = 1) {
    const left = (this.stacks[key] ?? 0) - n;
    if (left <= 0) delete this.stacks[key];
    else this.stacks[key] = left;
    this.save();
  }

  // Consume a stackable (potion/shot). Optimistic local decrement + server reconcile.
  consume(key, n = 1) {
    this.remove(key, n);
    this._push("consume", { itemKey: key });
  }

  slotTypeFor(item) { return item?.slot === "amulet" ? "amulet" : "ring"; }

  // Purchase an item. Server mode: authoritative buy (no local pre-deduct). Guest:
  // deduct coins + add locally. Returns { ok, error? }.
  async buy(item) {
    if (this.serverMode) {
      try {
        const data = await this._server("buy", { itemKey: item.key });
        if (!this._reconcile(data, ++this._seq)) return { ok: false, error: data?.error ?? "Purchase failed" };
        return { ok: true };
      } catch { return { ok: false, error: "Server unreachable" }; }
    }
    const coins = this.scene.getCoins?.() ?? 0;
    if (coins < item.price) return { ok: false, error: "Not enough coins" };
    this.scene.setCoins?.(coins - item.price);
    this.add(item.key);
    return { ok: true };
  }

  // Server-authoritative enchant gamble. Returns the server reply (or guest result
  // shape). Guest rolls locally via the caller (BaseGameScene.enchant).
  async serverEnchant(itemKey, blessed) {
    const data = await this._server("enchant", { itemKey, blessed: !!blessed });
    this._reconcile(data, ++this._seq);
    return data;
  }

  // Equip from the bag. Rings fill ring1 then ring2; a full pair bumps ring1 back.
  equip(key) {
    const item = itemData(key);
    if (!item || isConsumable(item)) return false;
    if (this.count(key) <= 0) return false;
    let slot;
    if (this.slotTypeFor(item) === "amulet") {
      slot = "amulet";
    } else {
      slot = !this.equipped.ring1 ? "ring1" : (!this.equipped.ring2 ? "ring2" : "ring1");
    }
    const prev = this.equipped[slot];
    this.remove(key, 1);
    if (prev) this.add(prev, 1);
    this.equipped[slot] = key;
    this.save();
    this._push("equip", { itemKey: key });
    return true;
  }

  unequip(slot) {
    const key = this.equipped[slot];
    if (!key) return false;
    this.equipped[slot] = null;
    this.add(key, 1);
    this.save();
    this._push("unequip", { slot });
    return true;
  }

  // Summed stat bonuses from all equipped pieces (scaled by enchant level).
  bonuses() {
    const sum = {};
    for (const slot of Object.keys(this.equipped)) {
      const key = this.equipped[slot];
      const item = key && itemData(key);
      if (!item?.stats) continue;
      const mult = 1 + this.enchantLevel(key) * ENCHANT_STEP;
      for (const [k, v] of Object.entries(item.stats)) {
        const scaled = Number.isInteger(v) ? Math.round(v * mult) : v * mult;
        sum[k] = (sum[k] ?? 0) + scaled;
      }
    }
    return sum;
  }

  // First available shot of the given class type (spirit/soul), or null.
  firstShot(type) {
    const e = ALCHEMIST_ITEMS.find((i) => typeof i.shot === "number" && (!type || i.shotType === type) && this.count(i.key) > 0);
    return e ?? null;
  }

  shotCount(type) {
    return ALCHEMIST_ITEMS.reduce((n, i) => n + ((typeof i.shot === "number" && (!type || i.shotType === type)) ? this.count(i.key) : 0), 0);
  }

  // Bag entries with stack count, in catalog order (consumables first there).
  ownedStacks() {
    return ALCHEMIST_ITEMS
      .filter((i) => this.count(i.key) > 0)
      .map((i) => ({ item: i, count: this.count(i.key) }));
  }
}
