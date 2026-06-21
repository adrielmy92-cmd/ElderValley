// Catalog for the Alchemist's shop. `key` must match the PNG in assets/items/.
// Prices are in coins (the in-game currency earned from work shifts).
// Effects are display strings for now — wiring real stat bonuses comes later.

export const RARITY = {
  common:    { label: "Common",    color: 0x9aa4b2, text: "#c7d0db", glow: 0x9aa4b2 },
  uncommon:  { label: "Uncommon",  color: 0x5bbf63, text: "#8fe89a", glow: 0x5bbf63 },
  rare:      { label: "Rare",      color: 0x4aa3ff, text: "#9cc8ff", glow: 0x4aa3ff },
  epic:      { label: "Epic",      color: 0xb06bf0, text: "#d8b0ff", glow: 0xb06bf0 },
  legendary: { label: "Legendary", color: 0xf0b84e, text: "#ffd98a", glow: 0xf0b84e }
};

export const ALCHEMIST_ITEMS = [
  // Healing potions (consumables). `heal` is the fraction of max health restored.
  { key: "potion-health-minor",   name: "Minor Health Potion",   rarity: "uncommon",  price: 50,  effect: "Restore 25% Health",      heal: 0.25 },
  { key: "potion-health-greater", name: "Greater Health Potion", rarity: "rare",      price: 150, effect: "Restore 50% Health",      heal: 0.50 },
  { key: "potion-health-supreme", name: "Supreme Health Potion", rarity: "legendary", price: 700, effect: "Fully restore Health",    heal: 1.00 },

  // Mana potions (consumables). `mana` is the fraction of max mana restored.
  { key: "potion-mana-minor",     name: "Minor Mana Potion",     rarity: "uncommon",  price: 50,  effect: "Restore 25% Mana",        mana: 0.25 },
  { key: "potion-mana-greater",   name: "Greater Mana Potion",   rarity: "rare",      price: 150, effect: "Restore 50% Mana",        mana: 0.50 },
  { key: "potion-mana-supreme",   name: "Supreme Mana Potion",   rarity: "legendary", price: 700, effect: "Fully restore Mana",      mana: 1.00 },

  { key: "tidecaller-ring",      name: "Tidecaller",          rarity: "rare",      price: 320, effect: "+15 Mana · slow health regen near water" },
  { key: "runelord-band",        name: "Runelord Band",       rarity: "epic",      price: 540, effect: "+12% Spell Power" },
  { key: "bloodsteel-ring",      name: "Bloodsteel Ring",     rarity: "uncommon",  price: 180, effect: "+8 Attack" },
  { key: "azurecrown-signet",    name: "Azurecrown Signet",   rarity: "rare",      price: 360, effect: "+10 Defense · +5 Mana" },
  { key: "verdant-oath",         name: "Verdant Oath",        rarity: "rare",      price: 340, effect: "+20 Max Health" },
  { key: "voidband",             name: "Voidband",            rarity: "epic",      price: 500, effect: "+8% Dodge" },
  { key: "frostlight-ring",      name: "Frostlight Ring",     rarity: "rare",      price: 380, effect: "+12 Frost Damage" },
  { key: "maelstrom-coil",       name: "Maelstrom Coil",      rarity: "epic",      price: 560, effect: "+10% Attack Speed" },
  { key: "nightveil-ring",       name: "Nightveil Ring",      rarity: "legendary", price: 900, effect: "+15% Crit · +10 Shadow Damage" },
  { key: "emberscript-band",     name: "Emberscript Band",    rarity: "uncommon",  price: 160, effect: "+6 Fire Damage" },
  { key: "ironward-ring",        name: "Ironward Ring",       rarity: "common",    price: 90,  effect: "+6 Defense" },
  { key: "seal-of-the-order",    name: "Seal of the Order",   rarity: "epic",      price: 520, effect: "+10% XP Gain" },
  { key: "crimson-vow",          name: "Crimson Vow",         rarity: "rare",      price: 400, effect: "+10 Attack · 3% Lifesteal" },
  { key: "frostvein-ring",       name: "Frostvein Ring",      rarity: "uncommon",  price: 150, effect: "+8 Frost Resist" },
  { key: "grovewarden-talisman", name: "Grovewarden Talisman",rarity: "legendary", price: 850, effect: "+30 Max HP · +2 HP/s Regen" },
  { key: "wraithbone-charm",     name: "Wraithbone Charm",    rarity: "epic",      price: 600, effect: "+12 Shadow Damage · +5% Lifesteal" }
];
