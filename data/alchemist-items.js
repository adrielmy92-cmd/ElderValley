// Catalog for the Alchemist's shop. `key` must match the PNG in assets/items/.
// Prices are in coins (the in-game currency earned from work shifts).
//
// Potions: `heal`/`mana` = fraction of max HP/MP restored; `cooldownMs` gates use.
// Gear: `slot` ("ring" | "amulet" | "weapon") + `stats` (applied when equipped).
// All combat stats are wired: maxHp/maxMp (bars), attack, defense, dodge, crit,
// lifesteal, attackSpeed, hpRegen, xpBonus. Weapons are sold at the Forge, jewelry/
// potions at the Alchemist.

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
  // Shots — consumed per attack to multiply damage. Class-gated by shotType:
  // mages use Spiritshot (magic), warriors/archers use Soulshot (physical).
  { key: "spiritshot",            name: "Spiritshot",            rarity: "uncommon",  price: 8,   effect: "Doubles spell damage (1 per cast)",   shot: 2.0, shotType: "spirit" },
  { key: "soulshot",              name: "Soulshot",              rarity: "uncommon",  price: 8,   effect: "Doubles physical damage (1 per hit)", shot: 2.0, shotType: "soul" },

  // Enchant scrolls (Gold-only). Used from the inventory to upgrade jewelry.
  // Normal can SHATTER gear on high-level failure; Blessed only resets to +0.
  { key: "enchant-scroll",         name: "Enchant Scroll",         rarity: "uncommon",  price: 40,  effect: "Enchant gear +1 — may shatter on failure",  scroll: "normal" },
  { key: "blessed-enchant-scroll", name: "Blessed Enchant Scroll", rarity: "rare",      price: 120, effect: "Enchant gear +1 — safe (resets, never shatters)", scroll: "blessed" },

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
  { key: "wraithbone-charm",     name: "Wraithbone Charm",    rarity: "epic",      price: 600, effect: "+12 Shadow Damage · +5% Lifesteal",slot: "amulet", stats: { attack: 12, lifesteal: 0.05 } },

  // Weapons (equippable, slot: "weapon"). Sold at the Forge. Stat-only (no on-character
  // visual). Icons are real cut-out PNGs in assets/items/. Weapons are the main Attack
  // source (bigger than rings) + a signature stat. Sorted roughly by tier.
  { key: "rusted-shortsword",   name: "Rusted Shortsword",   rarity: "common",    price: 100,  effect: "+18 Attack",                          slot: "weapon", charClass: "warrior", stats: { attack: 18 } },
  { key: "steel-longsword",     name: "Steel Longsword",     rarity: "common",    price: 200,  effect: "+28 Attack",                          slot: "weapon", charClass: "warrior", stats: { attack: 28 } },
  { key: "bonereaver",          name: "Bonereaver",          rarity: "uncommon",  price: 300,  effect: "+36 Attack · 5% Lifesteal",           slot: "weapon", charClass: "warrior", stats: { attack: 36, lifesteal: 0.05 } },
  { key: "cogforged-saber",     name: "Cogforged Saber",     rarity: "uncommon",  price: 340,  effect: "+34 Attack · +14% Attack Speed",      slot: "weapon", charClass: "warrior", stats: { attack: 34, attackSpeed: 0.14 } },
  { key: "leafsong-blade",      name: "Leafsong Blade",      rarity: "rare",      price: 460,  effect: "+42 Attack · +3 HP/s Regen",          slot: "weapon", charClass: "warrior", stats: { attack: 42, hpRegen: 3 } },
  { key: "emerald-edge",        name: "Emerald Edge",        rarity: "rare",      price: 480,  effect: "+44 Attack · +10% Crit",              slot: "weapon", charClass: "warrior", stats: { attack: 44, crit: 0.10 } },
  { key: "thornvine-blade",     name: "Thornvine Blade",     rarity: "rare",      price: 520,  effect: "+44 Attack · 5% Lifesteal · Poison on hit", slot: "weapon", charClass: "warrior", stats: { attack: 44, lifesteal: 0.05 }, proc: { type: "poison", chance: 0.30, dmg: 12, ticks: 5, interval: 600 } },
  { key: "frostrune-blade",     name: "Frostrune Blade",     rarity: "rare",      price: 520,  effect: "+44 Attack · +12% Crit",              slot: "weapon", charClass: "warrior", stats: { attack: 44, crit: 0.12 } },
  { key: "tideblade",           name: "Tideblade",           rarity: "epic",      price: 680,  effect: "+52 Attack · +18 Mana · +10% Crit",   slot: "weapon", charClass: "warrior", stats: { attack: 52, maxMp: 18, crit: 0.10 } },
  { key: "voidcaller-blade",    name: "Voidcaller Blade",    rarity: "epic",      price: 720,  effect: "+54 Attack · +15% Crit",              slot: "weapon", charClass: "warrior", stats: { attack: 54, crit: 0.15 } },
  { key: "runic-claymore",      name: "Runic Claymore",      rarity: "epic",      price: 760,  effect: "+56 Attack · +15% XP Gain",           slot: "weapon", charClass: "warrior", stats: { attack: 56, xpBonus: 0.15 } },
  { key: "stormfang",           name: "Stormfang",           rarity: "epic",      price: 800,  effect: "+56 Attack · +18% Attack Speed",      slot: "weapon", charClass: "warrior", stats: { attack: 56, attackSpeed: 0.18 } },
  { key: "bone-scimitar",       name: "Bone Scimitar",       rarity: "epic",      price: 820,  effect: "+58 Attack · 7% Lifesteal",           slot: "weapon", charClass: "warrior", stats: { attack: 58, lifesteal: 0.07 } },
  { key: "infernal-edge",       name: "Infernal Edge",       rarity: "legendary", price: 1100, effect: "+68 Attack · +14% Crit · 6% Lifesteal · Burn on hit", slot: "weapon", charClass: "warrior", stats: { attack: 68, crit: 0.14, lifesteal: 0.06 }, proc: { type: "burn", chance: 0.32, dmg: 16, ticks: 4, interval: 500 } },
  { key: "starfall-greatsword", name: "Starfall Greatsword", rarity: "legendary", price: 1300, effect: "+78 Attack · +18% Crit · +18% Attack Speed", slot: "weapon", charClass: "warrior", stats: { attack: 78, crit: 0.18, attackSpeed: 0.18 } },

  // Fish (caught at the river minigame; held in the bag, sellable later). No PNG yet —
  // the bag renders item.emoji when the texture is missing. `price` = sell value.
  { key: "fish-sardine", name: "River Sardine", rarity: "common",    type: "fish", emoji: "🐟", price: 9,   effect: "A common river fish" },
  { key: "fish-trout",   name: "Trout",         rarity: "uncommon",  type: "fish", emoji: "🐟", price: 20,  effect: "A freshwater catch" },
  { key: "fish-salmon",  name: "Salmon",        rarity: "rare",      type: "fish", emoji: "🐠", price: 46,  effect: "A rare, prized fish" },
  { key: "fish-golden",  name: "Golden Fish",   rarity: "legendary", type: "fish", emoji: "🐡", price: 150, effect: "A legendary catch" },
  { key: "fish-ancient", name: "Ancient Leviathan", rarity: "legendary", type: "fish", emoji: "🐉", price: 600, effect: "A near-mythical trophy of the deep" }
];
