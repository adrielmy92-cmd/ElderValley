import { ALCHEMIST_ITEMS } from "../data/alchemist-items.js?v=30";

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
  _charKey() { return this.scene.getCharKey?.() ?? "mage-1"; }
  _storageKey() { return `eldervalley-bag-${this._profileId()}-${this._charKey()}`; }
  _legacyStorageKey() { return `eldervalley-bag-${this._profileId()}`; }

  // Weapons are class-specific (mage = staff, warrior = sword) and live in a per-class
  // equipped slot, so switching characters never carries a weapon across. Rings,
  // amulet, potions, fish and coins stay shared on the account.
  _charClass() {
    const id = this.scene?.player?.characterId ?? this.scene?.registry?.get?.("playerCharacter") ?? "mage-1";
    return id === "warrior" ? "warrior" : "mage";
  }
  _weaponSlotFor(cls) { return cls === "warrior" ? "weaponWarrior" : "weaponMage"; }
  equippedWeapon() { return this.equipped[this._weaponSlotFor(this._charClass())] ?? null; }
  equippedForUi(slotKey) { return slotKey === "weapon" ? this.equippedWeapon() : (this.equipped[slotKey] ?? null); }
  // Can the current character use/equip this item? Non-weapons always; weapons only
  // when their class matches (legacy swords with no class default to warrior).
  canUse(item) {
    if (item?.slot === "weapon") return (item.charClass ?? "warrior") === this._charClass();
    // Armor / headgear / footwear are class-flavoured too (mage robes/hats/boots).
    // Items without a charClass are universal.
    if ((item?.slot === "armor" || item?.slot === "helmet" || item?.slot === "boots") && item.charClass) {
      return item.charClass === this._charClass();
    }
    return true;
  }
  // Normalise an equipped map to the per-class weapon schema, migrating any legacy
  // single `weapon` slot into the slot matching that weapon's class.
  _normEquipped(raw) {
    const eq = { weaponMage: null, weaponWarrior: null, ring1: null, ring2: null, amulet: null, armor: null, helmet: null, boots: null, ...(raw ?? {}) };
    if (eq.weapon) {
      const item = itemData(eq.weapon);
      if (item?.slot === "weapon") eq[this._weaponSlotFor(item.charClass === "warrior" ? "warrior" : "mage")] = eq.weapon;
    }
    delete eq.weapon;
    return eq;
  }

  load() {
    this.stacks = {};
    this.equipped = this._normEquipped(null);
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
      let stored = localStorage.getItem(this._storageKey());
      if (stored === null) {
        // One-time migration: the first character to load adopts the old shared bag,
        // then the legacy key is removed so other characters start empty.
        const legacy = localStorage.getItem(this._legacyStorageKey());
        if (legacy !== null) {
          localStorage.setItem(this._storageKey(), legacy);
          localStorage.removeItem(this._legacyStorageKey());
          stored = legacy;
        }
      }
      const raw = JSON.parse(stored ?? "null");
      if (raw && typeof raw === "object") {
        this.stacks = raw.stacks ?? {};
        this.equipped = this._normEquipped(raw.equipped);
        this.enchants = raw.enchants ?? {};
      }
    } catch { /* ignore */ }
  }

  _applyBag(bag) {
    this.stacks = { ...(bag?.stacks ?? {}) };
    this.equipped = this._normEquipped(bag?.equipped);
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

  slotTypeFor(item) {
    if (item?.slot === "amulet") return "amulet";
    if (item?.slot === "weapon") return "weapon";
    if (item?.slot === "armor") return "armor";
    if (item?.slot === "helmet") return "helmet";
    if (item?.slot === "boots") return "boots";
    return "ring";
  }

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

  // Sell one owned (un-equipped) copy back to a shop for half its price.
  async sell(item) {
    if (this.count(item.key) <= 0) return { ok: false, error: "None to sell" };
    if (this.serverMode) {
      try {
        const data = await this._server("sell", { itemKey: item.key });
        if (!this._reconcile(data, ++this._seq)) return { ok: false, error: data?.error ?? "Sale failed" };
        return { ok: true };
      } catch { return { ok: false, error: "Server unreachable" }; }
    }
    this.remove(item.key, 1);
    this.scene.addCoins?.(Math.floor((item.price ?? 0) / 2));
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
    const t = this.slotTypeFor(item);
    if (t === "amulet") slot = "amulet";
    else if (t === "armor" || t === "helmet" || t === "boots") {
      if (!this.canUse(item)) return false; // wrong class can't wear this robe/hat/boots
      slot = t;
    }
    else if (t === "weapon") {
      const cls = item.charClass === "warrior" ? "warrior" : "mage";
      if (cls !== this._charClass()) return false; // wrong class can't wield this weapon
      slot = this._weaponSlotFor(cls);
    }
    else slot = !this.equipped.ring1 ? "ring1" : (!this.equipped.ring2 ? "ring2" : "ring1");
    const prev = this.equipped[slot];
    this.remove(key, 1);
    if (prev) this.add(prev, 1);
    this.equipped[slot] = key;
    this.save();
    this._push("equip", { itemKey: key });
    return true;
  }

  unequip(slot) {
    if (slot === "weapon") slot = this._weaponSlotFor(this._charClass());
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
    // Only the current class's weapon counts (the other class's weapon is dormant).
    // Armor/helmet only contribute if the current class can wear them (class-flavoured).
    const wearable = (key) => {
      const it = key && itemData(key);
      return it && this.canUse(it) ? key : null;
    };
    const keys = [this.equippedWeapon(), this.equipped.ring1, this.equipped.ring2, this.equipped.amulet,
      wearable(this.equipped.armor), wearable(this.equipped.helmet), wearable(this.equipped.boots)];
    for (const key of keys) {
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
      .filter((i) => this.count(i.key) > 0 && this.canUse(i))
      .map((i) => ({ item: i, count: this.count(i.key) }));
  }
}
