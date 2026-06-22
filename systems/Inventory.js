import { ALCHEMIST_ITEMS } from "../data/alchemist-items.js?v=6";

// Each enchant level adds this much of the item's base stats.
const ENCHANT_STEP = 0.12;

const ITEMS_BY_KEY = Object.fromEntries(ALCHEMIST_ITEMS.map((i) => [i.key, i]));

export function itemData(key) {
  return ITEMS_BY_KEY[key] ?? null;
}

export function isConsumable(item) {
  return !!item && (typeof item.heal === "number" || typeof item.mana === "number");
}

// Player bag + equipped jewelry. Pure logic, persisted per profile. Stacks hold
// consumables (and not-yet-equipped gear); equipped holds one key per slot.
export default class Inventory {
  constructor(scene) {
    this.scene = scene;
    this.load();
  }

  _storageKey() {
    const pid = this.scene.getPlayerProfileId?.() ?? "guest";
    return `eldervalley-bag-${pid}`;
  }

  load() {
    this.stacks = {};
    this.equipped = { ring1: null, ring2: null, amulet: null };
    this.enchants = {};
    try {
      const raw = JSON.parse(localStorage.getItem(this._storageKey()) ?? "null");
      if (raw && typeof raw === "object") {
        this.stacks = raw.stacks ?? {};
        this.equipped = { ring1: null, ring2: null, amulet: null, ...(raw.equipped ?? {}) };
        this.enchants = raw.enchants ?? {};
      }
    } catch { /* ignore */ }
  }

  save() {
    try {
      localStorage.setItem(this._storageKey(), JSON.stringify({ stacks: this.stacks, equipped: this.equipped, enchants: this.enchants }));
    } catch { /* ignore */ }
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

  slotTypeFor(item) { return item?.slot === "amulet" ? "amulet" : "ring"; }

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
    return true;
  }

  unequip(slot) {
    const key = this.equipped[slot];
    if (!key) return false;
    this.equipped[slot] = null;
    this.add(key, 1);
    this.save();
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

  // First available shot item (e.g. spiritshot), or null. Used by the cast logic.
  firstShot() {
    const e = ALCHEMIST_ITEMS.find((i) => typeof i.shot === "number" && this.count(i.key) > 0);
    return e ?? null;
  }

  shotCount() {
    return ALCHEMIST_ITEMS.reduce((n, i) => n + (typeof i.shot === "number" ? this.count(i.key) : 0), 0);
  }

  // Bag entries with stack count, in catalog order (consumables first there).
  ownedStacks() {
    return ALCHEMIST_ITEMS
      .filter((i) => this.count(i.key) > 0)
      .map((i) => ({ item: i, count: this.count(i.key) }));
  }
}
