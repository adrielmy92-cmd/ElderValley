// Catalog for the Alchemist's shop. `key` must match the PNG in assets/items/.
// Prices are in coins (the in-game currency earned from work shifts).
//
// Potions: `heal`/`mana` = fraction of max HP/MP restored; `cooldownMs` gates use.
// Gear: `slot` ("ring" | "amulet") + `stats` (applied when equipped). Applied stats
// today: maxHp, maxMp (the HP/MP bars react immediately). Others (attack, defense,
// crit, lifesteal, hpRegen, etc.) are stored now and wired into combat in later phases.

export const RARITY = {
  common:    { label: "Common",    color: 0x9aa4b2, text: "#c7d0db", glow: 0x9aa4b2 },
  uncommon:  { label: "Uncommon",  color: 0x5bbf63, text: "#8fe89a", glow: 0x5bbf63 },
  rare:      { label: "Rare",      color: 0x4aa3ff, text: "#9cc8ff", glow: 0x4aa3ff },
  epic:      { label: "Epic",      color: 0xb06bf0, text: "#d8b0ff", glow: 0xb06bf0 },
  legendary: { label: "Legendary", color: 0xf0b84e, text: "#ffd98a", glow: 0xf0b84e }
};

export const ALCHEMIST_ITEMS = [
  // Healing potions (consumables).
  { key: "potion-health-minor",   name: "Minor Health Potion",   rarity: "uncommon",  price: 50,  effect: "Restore 25% Health",   heal: 0.25, cooldownMs: 8000 },
  { key: "potion-health-greater", name: "Greater Health Potion", rarity: "rare",      price: 150, effect: "Restore 50% Health",   heal: 0.50, cooldownMs: 10000 },
  { key: "potion-health-supreme", name: "Supreme Health Potion", rarity: "legendary", price: 700, effect: "Fully restore Health", heal: 1.00, cooldownMs: 15000 },

  // Mana potions (consumables, longer cooldowns — mana is kept scarce).
  { key: "potion-mana-minor",     name: "Minor Mana Potion",     rarity: "uncommon",  price: 50,  effect: "Restore 25% Mana",     mana: 0.25, cooldownMs: 20000 },
  { key: "potion-mana-greater",   name: "Greater Mana Potion",   rarity: "rare",      price: 150, effect: "Restore 50% Mana",     mana: 0.50, cooldownMs: 25000 },
  { key: "potion-mana-supreme",   name: "Supreme Mana Potion",   rarity: "legendary", price: 700, effect: "Fully restore Mana",   mana: 1.00, cooldownMs: 30000 },

  // Spiritshot — the mage's shot. Consumed per spell cast (auto), multiplies
  // spell damage. Bottomless Gold sink: buy stacks, burn them while fighting.
  { key: "spiritshot",            name: "Spiritshot",            rarity: "uncommon",  price: 8,   effect: "Doubles spell damage (1 per cast)", shot: 2.0 },

  // Jewelry (equippable). slot: 2 ring slots + 1 amulet slot.
  { key: "tidecaller-ring",      name: "Tidecaller",          rarity: "rare",      price: 320, effect: "+15 Mana · slow regen near water", slot: "ring",   stats: { maxMp: 15 } },
  { key: "runelord-band",        name: "Runelord Band",       rarity: "epic",      price: 540, effect: "+12% Spell Power",                 slot: "ring",   stats: { maxMp: 10, attack: 6 } },
  { key: "bloodsteel-ring",      name: "Bloodsteel Ring",     rarity: "uncommon",  price: 180, effect: "+8 Attack",                        slot: "ring",   stats: { attack: 8 } },
  { key: "azurecrown-signet",    name: "Azurecrown Signet",   rarity: "rare",      price: 360, effect: "+10 Defense · +5 Mana",            slot: "ring",   stats: { defense: 10, maxMp: 5 } },
  { key: "verdant-oath",         name: "Verdant Oath",        rarity: "rare",      price: 340, effect: "+20 Max Health",                   slot: "ring",   stats: { maxHp: 20 } },
  { key: "voidband",             name: "Voidband",            rarity: "epic",      price: 500, effect: "+8% Dodge",                        slot: "ring",   stats: { dodge: 0.08 } },
  { key: "frostlight-ring",      name: "Frostlight Ring",     rarity: "rare",      price: 380, effect: "+12 Frost Damage",                 slot: "ring",   stats: { attack: 12 } },
  { key: "maelstrom-coil",       name: "Maelstrom Coil",      rarity: "epic",      price: 560, effect: "+10% Attack Speed",                slot: "ring",   stats: { attackSpeed: 0.10 } },
  { key: "nightveil-ring",       name: "Nightveil Ring",      rarity: "legendary", price: 900, effect: "+15% Crit · +10 Shadow Damage",    slot: "ring",   stats: { crit: 0.15, attack: 10 } },
  { key: "emberscript-band",     name: "Emberscript Band",    rarity: "uncommon",  price: 160, effect: "+6 Fire Damage",                   slot: "ring",   stats: { attack: 6 } },
  { key: "ironward-ring",        name: "Ironward Ring",       rarity: "common",    price: 90,  effect: "+6 Defense",                       slot: "ring",   stats: { defense: 6 } },
  { key: "seal-of-the-order",    name: "Seal of the Order",   rarity: "epic",      price: 520, effect: "+10% XP Gain",                     slot: "ring",   stats: { xpBonus: 0.10 } },
  { key: "crimson-vow",          name: "Crimson Vow",         rarity: "rare",      price: 400, effect: "+10 Attack · 3% Lifesteal",        slot: "ring",   stats: { attack: 10, lifesteal: 0.03 } },
  { key: "frostvein-ring",       name: "Frostvein Ring",      rarity: "uncommon",  price: 150, effect: "+8 Frost Resist",                  slot: "ring",   stats: { defense: 8 } },
  { key: "grovewarden-talisman", name: "Grovewarden Talisman",rarity: "legendary", price: 850, effect: "+30 Max HP · +2 HP/s Regen",       slot: "amulet", stats: { maxHp: 30, hpRegen: 2 } },
  { key: "wraithbone-charm",     name: "Wraithbone Charm",    rarity: "epic",      price: 600, effect: "+12 Shadow Damage · +5% Lifesteal",slot: "amulet", stats: { attack: 12, lifesteal: 0.05 } }
];
