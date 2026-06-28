// Catalog for the Alchemist's shop. `key` must match the PNG in assets/items/.
// Prices are in coins (the in-game currency earned from work shifts).
//
// Potions: `heal`/`mana` = fraction of max HP/MP restored; `cooldownMs` gates use.
// Gear: `slot` ("ring" | "amulet" | "weapon" | "armor" | "helmet" | "boots") + `stats` (applied when equipped).
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

  // Mage robes (equippable armor, slot: "armor", charClass: "mage"). Sold at the
  // Alchemist; hidden from the warrior. Armor is the chest slot in the paper-doll —
  // it stacks Defense + Mana + Spell Power with a signature flavor stat per element.
  { key: "robe-emberweave",   name: "Emberweave Robe",   rarity: "rare",      price: 420, effect: "+12 Defense · +20 Mana · +14 Spell Power",          slot: "armor", charClass: "mage", stats: { defense: 12, maxMp: 20, attack: 14 } },
  { key: "robe-grovekeeper",  name: "Grovekeeper Robe",  rarity: "rare",      price: 400, effect: "+14 Defense · +30 Max HP · +16 Mana · +2 HP/s Regen", slot: "armor", charClass: "mage", stats: { defense: 14, maxHp: 30, maxMp: 16, hpRegen: 2 } },
  { key: "robe-frostward",    name: "Frostward Robe",    rarity: "rare",      price: 460, effect: "+16 Defense · +25 Max HP · +18 Mana",               slot: "armor", charClass: "mage", stats: { defense: 16, maxHp: 25, maxMp: 18 } },
  { key: "robe-stormcaller",  name: "Stormcaller Robe",  rarity: "epic",      price: 640, effect: "+12 Defense · +22 Mana · +18 Spell Power · +8% Atk Speed", slot: "armor", charClass: "mage", stats: { defense: 12, maxMp: 22, attack: 18, attackSpeed: 0.08 } },
  { key: "robe-shadowmantle", name: "Shadowmantle Robe", rarity: "epic",      price: 680, effect: "+14 Defense · +20 Mana · +12 Spell Power · 6% Lifesteal", slot: "armor", charClass: "mage", stats: { defense: 14, maxMp: 20, attack: 12, lifesteal: 0.06 } },
  { key: "robe-arcanearchon", name: "Arcane Archon Robe",rarity: "legendary", price: 980, effect: "+18 Defense · +30 Mana · +22 Spell Power · +10% Crit", slot: "armor", charClass: "mage", stats: { defense: 18, maxMp: 30, attack: 22, crit: 0.10 } },

  // Mage hats (equippable headgear, slot: "helmet", charClass: "mage"). Sold at the
  // Alchemist; hidden from the warrior. The head slot — lighter than the chest robe,
  // pairs with the matching robe element for a themed set.
  { key: "hat-grovekeeper",  name: "Grovekeeper Hat",  rarity: "rare",      price: 320, effect: "+8 Defense · +18 Max HP · +14 Mana · +1 HP/s Regen", slot: "helmet", charClass: "mage", stats: { defense: 8, maxHp: 18, maxMp: 14, hpRegen: 1 } },
  { key: "hat-emberweave",   name: "Emberweave Hat",   rarity: "rare",      price: 330, effect: "+8 Defense · +16 Mana · +10 Spell Power",          slot: "helmet", charClass: "mage", stats: { defense: 8, maxMp: 16, attack: 10 } },
  { key: "hat-frostward",    name: "Frostward Hat",    rarity: "rare",      price: 350, effect: "+10 Defense · +16 Max HP · +14 Mana",              slot: "helmet", charClass: "mage", stats: { defense: 10, maxHp: 16, maxMp: 14 } },
  { key: "hat-stormcaller",  name: "Stormcaller Hat",  rarity: "epic",      price: 500, effect: "+8 Defense · +16 Mana · +12 Spell Power · +6% Atk Speed", slot: "helmet", charClass: "mage", stats: { defense: 8, maxMp: 16, attack: 12, attackSpeed: 0.06 } },
  { key: "hat-shadowmantle", name: "Shadowmantle Hat", rarity: "epic",      price: 520, effect: "+9 Defense · +16 Mana · +10 Spell Power · 4% Lifesteal", slot: "helmet", charClass: "mage", stats: { defense: 9, maxMp: 16, attack: 10, lifesteal: 0.04 } },
  { key: "hat-arcanearchon", name: "Arcane Archon Hat",rarity: "legendary", price: 760, effect: "+12 Defense · +22 Mana · +16 Spell Power · +8% Crit", slot: "helmet", charClass: "mage", stats: { defense: 12, maxMp: 22, attack: 16, crit: 0.08 } },

  // Mage boots (equippable footwear, slot: "boots", charClass: "mage"). Sold at the
  // Alchemist; hidden from the warrior. The feet slot — footwear leans into mobility
  // (dodge / attack speed) to complete the elemental set with the hat + robe.
  { key: "boot-grovekeeper",  name: "Grovekeeper Boots",  rarity: "rare",      price: 300, effect: "+8 Defense · +16 Max HP · +12 Mana",            slot: "boots", charClass: "mage", stats: { defense: 8, maxHp: 16, maxMp: 12 } },
  { key: "boot-emberweave",   name: "Emberweave Boots",   rarity: "rare",      price: 310, effect: "+8 Defense · +14 Mana · +8 Spell Power",         slot: "boots", charClass: "mage", stats: { defense: 8, maxMp: 14, attack: 8 } },
  { key: "boot-frostward",    name: "Frostward Boots",    rarity: "rare",      price: 330, effect: "+10 Defense · +14 Max HP · +12 Mana",           slot: "boots", charClass: "mage", stats: { defense: 10, maxHp: 14, maxMp: 12 } },
  { key: "boot-stormcaller",  name: "Stormcaller Boots",  rarity: "epic",      price: 480, effect: "+8 Defense · +14 Mana · +8% Atk Speed",         slot: "boots", charClass: "mage", stats: { defense: 8, maxMp: 14, attackSpeed: 0.08 } },
  { key: "boot-shadowmantle", name: "Shadowmantle Boots", rarity: "epic",      price: 500, effect: "+9 Defense · +14 Mana · +5% Dodge",            slot: "boots", charClass: "mage", stats: { defense: 9, maxMp: 14, dodge: 0.05 } },
  { key: "boot-arcanearchon", name: "Arcane Archon Boots",rarity: "legendary", price: 720, effect: "+12 Defense · +20 Mana · +12 Spell Power · +6% Crit", slot: "boots", charClass: "mage", stats: { defense: 12, maxMp: 20, attack: 12, crit: 0.06 } },

  // Warrior helmets (equippable headgear, slot: "helmet", charClass: "warrior"). Sold at
  // the Alchemist; hidden from the mage. Heavier than the mage hats — they stack Defense
  // + Max HP (the warrior's tank stats) with a signature combat stat at higher tiers.
  { key: "helm-rangerhood", name: "Ranger's Hood",    rarity: "common",    price: 120, effect: "+10 Defense · +20 Max HP",                       slot: "helmet", charClass: "warrior", stats: { defense: 10, maxHp: 20 } },
  { key: "helm-ironguard",  name: "Ironguard Helm",   rarity: "uncommon",  price: 200, effect: "+16 Defense · +24 Max HP",                       slot: "helmet", charClass: "warrior", stats: { defense: 16, maxHp: 24 } },
  { key: "helm-frostiron",  name: "Frostiron Helm",   rarity: "rare",      price: 360, effect: "+22 Defense · +30 Max HP · +6 Attack",           slot: "helmet", charClass: "warrior", stats: { defense: 22, maxHp: 30, attack: 6 } },
  { key: "helm-dawnguard",  name: "Dawnguard Helm",   rarity: "rare",      price: 380, effect: "+24 Defense · +28 Max HP · +2 HP/s Regen",       slot: "helmet", charClass: "warrior", stats: { defense: 24, maxHp: 28, hpRegen: 2 } },
  { key: "helm-deathskull", name: "Deathskull Helm",  rarity: "epic",      price: 560, effect: "+26 Defense · +36 Max HP · 4% Lifesteal",        slot: "helmet", charClass: "warrior", stats: { defense: 26, maxHp: 36, lifesteal: 0.04 } },
  { key: "helm-voidcrown",  name: "Voidcrown Helm",   rarity: "legendary", price: 820, effect: "+32 Defense · +44 Max HP · +10 Attack · +6% Crit", slot: "helmet", charClass: "warrior", stats: { defense: 32, maxHp: 44, attack: 10, crit: 0.06 } },

  // Warrior body armor (equippable, slot: "armor", charClass: "warrior"). Forged at the
  // Blacksmith; hidden from the mage. Biggest defensive piece — heavy Defense + Max HP.
  // Same 6 elements as the warrior helmets (sets).
  { key: "plate-ranger",     name: "Ranger's Leathers",  rarity: "common",    price: 200,  effect: "+14 Defense · +28 Max HP",                          slot: "armor", charClass: "warrior", stats: { defense: 14, maxHp: 28 } },
  { key: "plate-ironguard",  name: "Ironguard Plate",    rarity: "uncommon",  price: 320,  effect: "+22 Defense · +36 Max HP",                          slot: "armor", charClass: "warrior", stats: { defense: 22, maxHp: 36 } },
  { key: "plate-frostiron",  name: "Frostiron Plate",    rarity: "rare",      price: 480,  effect: "+30 Defense · +44 Max HP · +8 Attack",              slot: "armor", charClass: "warrior", stats: { defense: 30, maxHp: 44, attack: 8 } },
  { key: "plate-dawnguard",  name: "Dawnguard Plate",    rarity: "rare",      price: 500,  effect: "+32 Defense · +42 Max HP · +3 HP/s Regen",          slot: "armor", charClass: "warrior", stats: { defense: 32, maxHp: 42, hpRegen: 3 } },
  { key: "plate-deathskull", name: "Deathskull Plate",   rarity: "epic",      price: 700,  effect: "+36 Defense · +52 Max HP · 6% Lifesteal",           slot: "armor", charClass: "warrior", stats: { defense: 36, maxHp: 52, lifesteal: 0.06 } },
  { key: "plate-voidcrown",  name: "Voidcrown Plate",    rarity: "legendary", price: 1000, effect: "+44 Defense · +64 Max HP · +12 Attack · +8% Crit", slot: "armor", charClass: "warrior", stats: { defense: 44, maxHp: 64, attack: 12, crit: 0.08 } },

  // Warrior boots (equippable, slot: "boots", charClass: "warrior"). Forged at the
  // Blacksmith; hidden from the mage. Smaller piece — Defense + Max HP with a mobility
  // flavor (dodge / attack speed) at higher tiers. Same 6 elements (sets).
  { key: "greave-ranger",     name: "Ranger's Boots",      rarity: "common",    price: 180, effect: "+10 Defense · +20 Max HP",                       slot: "boots", charClass: "warrior", stats: { defense: 10, maxHp: 20 } },
  { key: "greave-ironguard",  name: "Ironguard Greaves",   rarity: "uncommon",  price: 280, effect: "+16 Defense · +24 Max HP",                       slot: "boots", charClass: "warrior", stats: { defense: 16, maxHp: 24 } },
  { key: "greave-frostiron",  name: "Frostiron Greaves",   rarity: "rare",      price: 360, effect: "+22 Defense · +28 Max HP",                       slot: "boots", charClass: "warrior", stats: { defense: 22, maxHp: 28 } },
  { key: "greave-dawnguard",  name: "Dawnguard Greaves",   rarity: "rare",      price: 380, effect: "+24 Defense · +26 Max HP · +2 HP/s Regen",       slot: "boots", charClass: "warrior", stats: { defense: 24, maxHp: 26, hpRegen: 2 } },
  { key: "greave-deathskull", name: "Deathskull Greaves",  rarity: "epic",      price: 520, effect: "+26 Defense · +34 Max HP · +5% Dodge",            slot: "boots", charClass: "warrior", stats: { defense: 26, maxHp: 34, dodge: 0.05 } },
  { key: "greave-voidcrown",  name: "Voidcrown Greaves",   rarity: "legendary", price: 720, effect: "+32 Defense · +44 Max HP · +6% Crit · +6% Atk Speed", slot: "boots", charClass: "warrior", stats: { defense: 32, maxHp: 44, crit: 0.06, attackSpeed: 0.06 } },

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

  // Staves (mage weapons, slot: "weapon", charClass: "mage"). Sold at the Forge; the
  // shop hides them from the warrior. `attack` powers the mage's spell damage.
  { key: "wildgrove-staff",   name: "Wildgrove Staff",   rarity: "common",    price: 140,  effect: "+22 Spell Power · +12 Mana · +2 HP/s Regen",        slot: "weapon", charClass: "mage", stats: { attack: 22, maxMp: 12, hpRegen: 2 } },
  { key: "frostspire-staff",  name: "Frostspire Staff",  rarity: "uncommon",  price: 320,  effect: "+32 Spell Power · +18 Mana · +8% Crit",             slot: "weapon", charClass: "mage", stats: { attack: 32, maxMp: 18, crit: 0.08 } },
  { key: "plaguethorn-staff", name: "Plaguethorn Staff", rarity: "rare",      price: 540,  effect: "+44 Spell Power · +14 Mana · Poison on hit",        slot: "weapon", charClass: "mage", stats: { attack: 44, maxMp: 14 }, proc: { type: "poison", chance: 0.30, dmg: 12, ticks: 5, interval: 600 } },
  { key: "emberheart-staff",  name: "Emberheart Staff",  rarity: "rare",      price: 580,  effect: "+46 Spell Power · +12 Mana · Burn on hit",          slot: "weapon", charClass: "mage", stats: { attack: 46, maxMp: 12 }, proc: { type: "burn", chance: 0.32, dmg: 16, ticks: 4, interval: 500 } },
  { key: "voidcaller-staff",  name: "Voidcaller Staff",  rarity: "epic",      price: 760,  effect: "+56 Spell Power · +20 Mana · +15% Crit",            slot: "weapon", charClass: "mage", stats: { attack: 56, maxMp: 20, crit: 0.15 } },
  { key: "stormcrystal-staff",name: "Stormcrystal Staff",rarity: "legendary", price: 1300, effect: "+76 Spell Power · +24 Mana · +16% Crit · +16% Atk Speed", slot: "weapon", charClass: "mage", stats: { attack: 76, maxMp: 24, crit: 0.16, attackSpeed: 0.16 } },

  // Ogre axes (melee weapons, slot: "weapon", charClass: "ogre"). Sold at the Forge; the
  // shop hides them from mage/warrior. The ogre carries an axe in-sprite, so these are
  // stat-only (no visual swap) — `attack` feeds the ogre's heavy melee. Brutish curve:
  // bigger raw Attack than swords, one signature stat each.
  { key: "ogre-axe-gravewarden",  name: "Gravewarden Axe",  rarity: "common",    price: 130,  effect: "+24 Attack · 5% Lifesteal",                  slot: "weapon", charClass: "ogre", stats: { attack: 24, lifesteal: 0.05 } },
  { key: "ogre-axe-glacierrend",  name: "Glacierrend",      rarity: "uncommon",  price: 330,  effect: "+36 Attack · +10% Crit",                     slot: "weapon", charClass: "ogre", stats: { attack: 36, crit: 0.10 } },
  { key: "ogre-axe-magmacleaver", name: "Magmacleaver",     rarity: "rare",      price: 540,  effect: "+48 Attack · Burn on hit",                   slot: "weapon", charClass: "ogre", stats: { attack: 48 }, proc: { type: "burn", chance: 0.32, dmg: 16, ticks: 4, interval: 500 } },
  { key: "ogre-axe-thornroot",    name: "Thornroot Cleaver",rarity: "rare",      price: 560,  effect: "+46 Attack · +3 HP/s Regen · Poison on hit", slot: "weapon", charClass: "ogre", stats: { attack: 46, hpRegen: 3 }, proc: { type: "poison", chance: 0.30, dmg: 12, ticks: 5, interval: 600 } },
  { key: "ogre-axe-voidsplitter", name: "Voidsplitter",     rarity: "epic",      price: 780,  effect: "+60 Attack · +16% Crit",                     slot: "weapon", charClass: "ogre", stats: { attack: 60, crit: 0.16 } },
  { key: "ogre-axe-stormbreaker", name: "Stormbreaker",     rarity: "legendary", price: 1350, effect: "+82 Attack · +18% Crit · +18% Attack Speed", slot: "weapon", charClass: "ogre", stats: { attack: 82, crit: 0.18, attackSpeed: 0.18 } },

  // Fish (caught at the river minigame; held in the bag, sellable later). No PNG yet —
  // the bag renders item.emoji when the texture is missing. `price` = sell value.
  { key: "fish-sardine", name: "River Sardine", rarity: "common",    type: "fish", emoji: "🐟", price: 9,   effect: "A common river fish" },
  { key: "fish-trout",   name: "Trout",         rarity: "uncommon",  type: "fish", emoji: "🐟", price: 20,  effect: "A freshwater catch" },
  { key: "fish-salmon",  name: "Salmon",        rarity: "rare",      type: "fish", emoji: "🐠", price: 46,  effect: "A rare, prized fish" },
  { key: "fish-golden",  name: "Golden Fish",   rarity: "legendary", type: "fish", emoji: "🐡", price: 150, effect: "A legendary catch" },
  { key: "fish-ancient", name: "Ancient Leviathan", rarity: "legendary", type: "fish", emoji: "🐉", price: 600, effect: "A near-mythical trophy of the deep" }
];
