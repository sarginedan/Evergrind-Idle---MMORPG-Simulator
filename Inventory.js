// Inventory & Equipment System — Loot drops, item rarity, gear slots, stat bonuses
// Now with class-based armor types: Mail (Warrior), Leather (Ranger), Cloth (Mage/Cleric)
import { CONFIG } from './config.js';
import { gameState } from './GameState.js';
import { iconImgLg } from './icons.js';
import { goldShop } from './GoldShop.js';
import { aetherbitShop } from './AetherbitShop.js';

// ══════════════════════════════════════════════════════════════════════
// ARMOR TYPE SYSTEM
// ══════════════════════════════════════════════════════════════════════

export const ARMOR_TYPES = {
    mail:    { name: 'Mail',    color: '#7799cc', classes: ['warrior'] },
    leather: { name: 'Leather', color: '#cc9944', classes: ['ranger'] },
    cloth:   { name: 'Cloth',   color: '#bb88dd', classes: ['mage', 'cleric'] },
};

/** Returns the armor type key for a given classId */
export function getArmorTypeForClass(classId) {
    if (classId === 'warrior') return 'mail';
    if (classId === 'ranger') return 'leather';
    return 'cloth'; // mage, cleric
}

// ══════════════════════════════════════════════════════════════════════
// CLASS-SPECIFIC ITEM TEMPLATES
// ══════════════════════════════════════════════════════════════════════

// ── Weapons (unique per class) ────────────────────────────────────────
const WEAPON_TEMPLATES = {
    warrior: [
        { name: 'Rusty Shortsword',     baseDps: 2,  baseIconKey: 'sword' },
        { name: 'Iron Longsword',       baseDps: 4,  baseIconKey: 'sword' },
        { name: 'Forest Cleaver',       baseDps: 6,  baseIconKey: 'axe' },
        { name: 'Verdant Blade',        baseDps: 9,  baseIconKey: 'sword' },
        { name: 'Thornfang Greatsword', baseDps: 12, baseIconKey: 'sword' },
        { name: 'Wyrmtooth Saber',      baseDps: 16, baseIconKey: 'sword' },
        { name: 'Aether Reaver',        baseDps: 20, baseIconKey: 'axe' },
    ],
    mage: [
        { name: 'Gnarled Wand',         baseDps: 2,  baseIconKey: 'crystal' },
        { name: 'Apprentice Staff',     baseDps: 4,  baseIconKey: 'crystal' },
        { name: 'Void-Touched Rod',     baseDps: 6,  baseIconKey: 'crystal' },
        { name: 'Riftweaver Staff',     baseDps: 9,  baseIconKey: 'crystal' },
        { name: 'Entropy Scepter',      baseDps: 12, baseIconKey: 'crystal' },
        { name: 'Abyssal Focus',        baseDps: 16, baseIconKey: 'crystal' },
        { name: 'Singularity Staff',    baseDps: 20, baseIconKey: 'crystal' },
    ],
    ranger: [
        { name: 'Crude Shortbow',       baseDps: 2,  baseIconKey: 'brambleShot' },
        { name: 'Hunter\'s Longbow',    baseDps: 4,  baseIconKey: 'brambleShot' },
        { name: 'Thornwood Recurve',    baseDps: 6,  baseIconKey: 'brambleShot' },
        { name: 'Sylvan Greatbow',      baseDps: 9,  baseIconKey: 'brambleShot' },
        { name: 'Viper Fang Bow',       baseDps: 12, baseIconKey: 'brambleShot' },
        { name: 'Stormstring Warbow',   baseDps: 16, baseIconKey: 'brambleShot' },
        { name: 'Wrath of the Wilds',   baseDps: 20, baseIconKey: 'brambleShot' },
    ],
    cleric: [
        { name: 'Wooden Mace',          baseDps: 2,  baseIconKey: 'dawnStrike' },
        { name: 'Iron Scepter',         baseDps: 4,  baseIconKey: 'dawnStrike' },
        { name: 'Blessed Cudgel',       baseDps: 6,  baseIconKey: 'dawnStrike' },
        { name: 'Dawn Censer',          baseDps: 9,  baseIconKey: 'dawnStrike' },
        { name: 'Solaris Mace',         baseDps: 12, baseIconKey: 'dawnStrike' },
        { name: 'Radiant Hammer',       baseDps: 16, baseIconKey: 'dawnStrike' },
        { name: 'Chorus of Dawn',       baseDps: 20, baseIconKey: 'dawnStrike' },
    ],
};

// ── Armor Pieces (by armor type) ──────────────────────────────────────
const ARMOR_TEMPLATES = {
    mail: {
        helm: [
            { name: 'Chain Coif',           baseArmor: 3,  baseIconKey: 'helm' },
            { name: 'Iron Half-Helm',       baseArmor: 6,  baseIconKey: 'helm' },
            { name: 'Plated Warhelm',       baseArmor: 10, baseIconKey: 'helm' },
            { name: 'Golem Crest Helm',     baseArmor: 14, baseIconKey: 'helm' },
            { name: 'Drakescale Crown',     baseArmor: 20, baseIconKey: 'crown' },
        ],
        chest: [
            { name: 'Chain Hauberk',        baseArmor: 4,  baseIconKey: 'chestArmor' },
            { name: 'Reinforced Mail',      baseArmor: 8,  baseIconKey: 'chestArmor' },
            { name: 'Battleworn Cuirass',   baseArmor: 14, baseIconKey: 'chestArmor' },
            { name: 'Verdant Plate',        baseArmor: 20, baseIconKey: 'chestArmor' },
            { name: 'Ancient Treant Armor', baseArmor: 28, baseIconKey: 'chestArmor' },
        ],
        legs: [
            { name: 'Chain Leggings',       baseArmor: 3,  baseIconKey: 'legsArmor' },
            { name: 'Reinforced Greaves',   baseArmor: 6,  baseIconKey: 'legsArmor' },
            { name: 'Plated Legguards',     baseArmor: 10, baseIconKey: 'legsArmor' },
            { name: 'Ironbark Tassets',     baseArmor: 15, baseIconKey: 'legsArmor' },
        ],
        boots: [
            { name: 'Chain Sabatons',       baseArmor: 2,  baseIconKey: 'boots' },
            { name: 'Ironshod Greaves',     baseArmor: 4,  baseIconKey: 'boots' },
            { name: 'Warplate Treads',      baseArmor: 7,  baseIconKey: 'boots' },
            { name: 'Stalwart Stompers',    baseArmor: 11, baseIconKey: 'boots' },
        ],
    },
    leather: {
        helm: [
            { name: 'Leather Cap',          baseArmor: 2,  baseIconKey: 'helm' },
            { name: 'Hardened Hood',        baseArmor: 4,  baseIconKey: 'helm' },
            { name: 'Stalker\'s Mask',      baseArmor: 7,  baseIconKey: 'helm' },
            { name: 'Thornwarden Helm',     baseArmor: 11, baseIconKey: 'helm' },
            { name: 'Primal Crown',         baseArmor: 16, baseIconKey: 'crown' },
        ],
        chest: [
            { name: 'Leather Vest',         baseArmor: 3,  baseIconKey: 'chestArmor' },
            { name: 'Tanned Jerkin',        baseArmor: 6,  baseIconKey: 'chestArmor' },
            { name: 'Mosshide Tunic',       baseArmor: 10, baseIconKey: 'chestArmor' },
            { name: 'Wildwood Brigandine',  baseArmor: 15, baseIconKey: 'chestArmor' },
            { name: 'Sylvan Warbark',       baseArmor: 22, baseIconKey: 'chestArmor' },
        ],
        legs: [
            { name: 'Leather Breeches',     baseArmor: 2,  baseIconKey: 'legsArmor' },
            { name: 'Ranger Leggings',      baseArmor: 4,  baseIconKey: 'legsArmor' },
            { name: 'Vinewrap Chaps',       baseArmor: 7,  baseIconKey: 'legsArmor' },
            { name: 'Thornguard Greaves',   baseArmor: 11, baseIconKey: 'legsArmor' },
        ],
        boots: [
            { name: 'Soft Moccasins',       baseArmor: 1,  baseIconKey: 'boots' },
            { name: 'Leather Boots',        baseArmor: 3,  baseIconKey: 'boots' },
            { name: 'Stalker Treads',       baseArmor: 5,  baseIconKey: 'boots' },
            { name: 'Windrunner Boots',     baseArmor: 9,  baseIconKey: 'boots' },
        ],
    },
    cloth: {
        helm: [
            { name: 'Linen Cowl',           baseArmor: 1,  baseIconKey: 'helm' },
            { name: 'Woven Circlet',        baseArmor: 3,  baseIconKey: 'helm' },
            { name: 'Mystic Diadem',        baseArmor: 5,  baseIconKey: 'helm' },
            { name: 'Arcane Crown',         baseArmor: 8,  baseIconKey: 'helm' },
            { name: 'Crown of Radiance',    baseArmor: 13, baseIconKey: 'crown' },
        ],
        chest: [
            { name: 'Linen Robes',          baseArmor: 2,  baseIconKey: 'chestArmor' },
            { name: 'Silk Vestments',       baseArmor: 4,  baseIconKey: 'chestArmor' },
            { name: 'Enchanted Robes',      baseArmor: 7,  baseIconKey: 'chestArmor' },
            { name: 'Astral Regalia',       baseArmor: 12, baseIconKey: 'chestArmor' },
            { name: 'Robes of the Beyond',  baseArmor: 18, baseIconKey: 'chestArmor' },
        ],
        legs: [
            { name: 'Cloth Breeches',       baseArmor: 1,  baseIconKey: 'legsArmor' },
            { name: 'Silk Trousers',        baseArmor: 3,  baseIconKey: 'legsArmor' },
            { name: 'Woven Legwraps',       baseArmor: 5,  baseIconKey: 'legsArmor' },
            { name: 'Ethereal Leggings',    baseArmor: 9,  baseIconKey: 'legsArmor' },
        ],
        boots: [
            { name: 'Worn Sandals',         baseArmor: 1,  baseIconKey: 'boots' },
            { name: 'Cloth Slippers',       baseArmor: 2,  baseIconKey: 'boots' },
            { name: 'Arcane Treads',        baseArmor: 4,  baseIconKey: 'boots' },
            { name: 'Celestial Sandals',    baseArmor: 7,  baseIconKey: 'boots' },
        ],
    },
};

// ── Accessories (shared across all classes — no armor type) ───────────
const ACCESSORY_TEMPLATES = {
    ring: [
        { name: 'Copper Band',       baseBonus: 1,  baseIconKey: 'ring' },
        { name: 'Silver Ring',       baseBonus: 3,  baseIconKey: 'ring' },
        { name: 'Emerald Signet',    baseBonus: 6,  baseIconKey: 'ring' },
        { name: 'Drake Fang Ring',   baseBonus: 10, baseIconKey: 'ring' },
    ],
    trinket: [
        { name: 'Lucky Charm',       baseBonus: 1,  baseIconKey: 'karmaOrb' },
        { name: 'Mossy Totem',       baseBonus: 3,  baseIconKey: 'totem' },
        { name: 'Ancient Relic',     baseBonus: 6,  baseIconKey: 'relic' },
        { name: 'Heart of the Wilds', baseBonus: 10, baseIconKey: 'crystal' },
    ],
};

// ── Rarity tiers ──────────────────────────────────────────────────────
const RARITIES = [
    { name: 'Common',    color: '#aabbaa', weight: 50, statMult: 1.0,  prefix: '' },
    { name: 'Uncommon',  color: '#44cc44', weight: 30, statMult: 1.3,  prefix: 'Fine ' },
    { name: 'Rare',      color: '#4488ff', weight: 14, statMult: 1.7,  prefix: 'Superior ' },
    { name: 'Exotic',    color: '#ffaa00', weight: 5,  statMult: 2.2,  prefix: 'Exotic ' },
    { name: 'Legendary', color: '#cc44ff', weight: 1,  statMult: 3.0,  prefix: 'Legendary ' },
];

function pickRarity() {
    // Fortune's Favor (premium upgrade) boosts rare+ drop weights
    const luckBonus = aetherbitShop ? aetherbitShop.getLootLuckBonus() : 0;
    const weights = RARITIES.map((r, i) => {
        if (i === 0) return Math.max(10, r.weight - luckBonus * 2);
        return r.weight + luckBonus * (i * 0.5);
    });
    const totalWeight = weights.reduce((s, w) => s + w, 0);
    let roll = Math.random() * totalWeight;
    for (let i = 0; i < RARITIES.length; i++) {
        roll -= weights[i];
        if (roll <= 0) return RARITIES[i];
    }
    return RARITIES[0];
}

// ── Junk / misc loot (shared) ─────────────────────────────────────────
const JUNK_ITEMS = [
    { name: 'Tattered Pelt',     iconKey: 'pelt', sellValue: 1 },
    { name: 'Cracked Fang',      iconKey: 'fang', sellValue: 1 },
    { name: 'Slimy Residue',     iconKey: 'droplet', sellValue: 1 },
    { name: 'Worn Claw',         iconKey: 'claw', sellValue: 2 },
    { name: 'Mossy Fragment',    iconKey: 'rockShard', sellValue: 2 },
    { name: 'Silk Thread',       iconKey: 'thread', sellValue: 2 },
    { name: 'Beast Eye',         iconKey: 'eye', sellValue: 3 },
    { name: 'Enchanted Bark',    iconKey: 'bark', sellValue: 3 },
    { name: 'Glowing Spore',     iconKey: 'sparkle', sellValue: 4 },
    { name: 'Crystallized Sap',  iconKey: 'sap', sellValue: 5 },
];

// ══════════════════════════════════════════════════════════════════════
// ITEM GENERATION (class-aware)
// ══════════════════════════════════════════════════════════════════════

let _nextId = 1;

export function getNextItemId() { return _nextId; }
export function setNextItemId(id) { _nextId = Math.max(_nextId, id); }

/**
 * Get the appropriate template list for a slot + class combo.
 * Weapons → class-specific, Armor → armor-type-specific, Accessories → shared.
 */
function getTemplatesForSlot(slot, classId) {
    if (slot === 'weapon') {
        return WEAPON_TEMPLATES[classId] || WEAPON_TEMPLATES.warrior;
    }
    if (['ring', 'trinket'].includes(slot)) {
        return ACCESSORY_TEMPLATES[slot];
    }
    // Armor slots (helm, chest, legs, boots) → use armor type
    const armorType = getArmorTypeForClass(classId);
    return ARMOR_TEMPLATES[armorType]?.[slot] || ARMOR_TEMPLATES.mail[slot];
}

function generateEquipItem(slot, playerLevel, classId = null) {
    const cid = classId || gameState.classId || 'warrior';
    const templates = getTemplatesForSlot(slot, cid);
    if (!templates || templates.length === 0) return null;

    // Pick a template appropriate for level
    const maxIdx = Math.min(templates.length - 1, Math.floor(playerLevel / 8));
    const idx = Math.max(0, maxIdx - Math.floor(Math.random() * 2));
    const tpl = templates[idx];

    const rarity = pickRarity();
    const levelScale = 1 + (playerLevel - 1) * 0.08;

    const item = {
        id: _nextId++,
        slot,
        rarity,
        iconKey: tpl.baseIconKey,
        name: rarity.prefix + tpl.name,
        level: playerLevel,
    };

    // Tag with armor type (for display & filtering)
    if (slot === 'weapon') {
        item.armorType = null; // weapons don't have armor type
        item.weaponClass = cid; // track which class this weapon is for
    } else if (['ring', 'trinket'].includes(slot)) {
        item.armorType = null; // accessories are universal
    } else {
        item.armorType = getArmorTypeForClass(cid);
    }

    // Stats
    if (tpl.baseDps != null) {
        item.dps = Math.max(1, Math.round(tpl.baseDps * rarity.statMult * levelScale));
    }
    if (tpl.baseArmor != null) {
        item.armor = Math.max(1, Math.round(tpl.baseArmor * rarity.statMult * levelScale));
    }
    if (tpl.baseBonus != null) {
        item.bonus = Math.max(1, Math.round(tpl.baseBonus * rarity.statMult * levelScale));
    }

    // Bonus stats on higher rarity
    const rarIdx = RARITIES.indexOf(rarity);
    if (rarIdx >= 2) {
        const bonusTypes = ['hp', 'armor', 'crit'];
        item.bonusStat = bonusTypes[Math.floor(Math.random() * bonusTypes.length)];
        item.bonusStatValue = Math.round((rarIdx + 1) * levelScale * (1 + Math.random()));
    }

    // Sell value scales with rarity and level
    item.value = Math.max(1, Math.floor((playerLevel + 1) * (rarIdx + 1) * 0.8));

    // Precompute icon HTML from iconKey
    item.icon = iconImgLg(item.iconKey, 22);

    return item;
}

// ── Starter weapon per class ──────────────────────────────────────────
function createStarterWeapon(classId) {
    const cid = classId || 'warrior';
    const templates = WEAPON_TEMPLATES[cid] || WEAPON_TEMPLATES.warrior;
    const tpl = templates[0]; // first = weakest
    return {
        id: _nextId++,
        slot: 'weapon',
        rarity: RARITIES[0],
        iconKey: tpl.baseIconKey,
        icon: iconImgLg(tpl.baseIconKey, 22),
        name: tpl.name,
        level: 1,
        dps: tpl.baseDps,
        armorType: null,
        weaponClass: cid,
    };
}

// ══════════════════════════════════════════════════════════════════════
// INVENTORY MANAGER
// ══════════════════════════════════════════════════════════════════════

class InventoryManager {
    constructor() {
        this._baseMaxSlots = 24;
        this.items = [];
        this.version = 0;
        this.equipped = {
            weapon: null,
            helm: null,
            chest: null,
            legs: null,
            boots: null,
            ring: null,
            trinket: null,
        };

        this.lootNotifications = [];

        // Starter weapon (default warrior — will be reset on class select)
        this.equipped.weapon = createStarterWeapon('warrior');
    }

    /** Reset inventory for a new character of given class */
    reset(classId) {
        this.items = [];
        this.version++;
        this.equipped = {
            weapon: null,
            helm: null,
            chest: null,
            legs: null,
            boots: null,
            ring: null,
            trinket: null,
        };
        this.lootNotifications = [];
        _nextId = 1;

        this.equipped.weapon = createStarterWeapon(classId || gameState.classId || 'warrior');
        this.recalcStats();
    }

    /** Dynamic max slots — includes bag expansion from Gold Merchant */
    get maxSlots() {
        return this._baseMaxSlots + goldShop.getExtraBagSlots();
    }

    // ── Loot generation on mob kill (class-aware) ─────────────────
    rollLoot(mobType, mobLevel) {
        const drops = [];

        // 40% chance for junk
        if (Math.random() < 0.4) {
            const junk = JUNK_ITEMS[Math.floor(Math.random() * JUNK_ITEMS.length)];
            drops.push({
                id: _nextId++,
                type: 'junk',
                name: junk.name,
                iconKey: junk.iconKey,
                icon: iconImgLg(junk.iconKey, 22),
                sellValue: junk.sellValue + Math.floor(mobLevel * 0.3),
                rarity: RARITIES[0],
            });
        }

        // Equipment drop chance (scales with mob level + Treasure Hunter premium upgrade)
        const equipDropBonus = aetherbitShop ? aetherbitShop.getEquipDropRateBonus() : 0;
        const equipChance = 0.15 + mobLevel * 0.003 + equipDropBonus;
        if (Math.random() < equipChance) {
            const allSlots = ['weapon', 'helm', 'chest', 'legs', 'boots', 'ring', 'trinket'];
            const slot = allSlots[Math.floor(Math.random() * allSlots.length)];
            const item = generateEquipItem(slot, mobLevel);
            if (item) drops.push(item);
        }

        // ── Auto-sell filter (Gold Shop permanent upgrade) ──
        const autoSellTier = goldShop.getAutoSellTier();
        if (autoSellTier >= 0) {
            const kept = [];
            for (const item of drops) {
                const rarIdx = RARITIES.indexOf(item.rarity);
                if (rarIdx <= autoSellTier) {
                    const value = item.sellValue || Math.max(1, Math.floor((item.level || 1) * (rarIdx + 1) * 0.5));
                    gameState.addGold(value);
                } else {
                    kept.push(item);
                }
            }
            return kept;
        }

        return drops;
    }

    // ── Add items to bag ──────────────────────────────────────────
    addItem(item) {
        if (this.items.length >= this.maxSlots) {
            const junkIdx = this.items.findIndex(i => i.type === 'junk');
            if (junkIdx >= 0) {
                this.sellItem(junkIdx);
            } else {
                const value = item.sellValue || (item.level || 1);
                gameState.addGold(value);
                gameState.addGameLog(`Bag full — auto-sold ${item.name} for ${value}g`);
                return;
            }
        }
        this.items.push(item);
        this.version++;
        gameState.totalItemsLooted = (gameState.totalItemsLooted || 0) + 1;

        const isRare = item.rarity && (item.rarity.name === 'Rare' || item.rarity.name === 'Exotic');
        const isLegendary = item.rarity && item.rarity.name === 'Legendary';
        if (window.audioManager) {
            window.audioManager.playLoot(isRare, isLegendary);
        }

        this.lootNotifications.push({ item, time: Date.now() });
        if (this.lootNotifications.length > 5) this.lootNotifications.shift();
    }

    sellItem(index) {
        const item = this.items[index];
        if (!item) return;
        const value = item.sellValue || Math.max(1, Math.floor((item.level || 1) * (RARITIES.indexOf(item.rarity) + 1) * 0.5));
        gameState.addGold(value);
        this.items.splice(index, 1);
        this.version++;
        gameState.totalItemsSold = (gameState.totalItemsSold || 0) + 1;
        return value;
    }

    sellAllJunk() {
        let totalGold = 0;
        let count = 0;
        const bestIds = this.getBestUpgradeIds();
        for (let i = this.items.length - 1; i >= 0; i--) {
            const item = this.items[i];
            if (item.type === 'junk' || (item.id != null && !bestIds.has(item.id))) {
                totalGold += this.sellItem(i);
                count++;
            }
        }
        if (count > 0) {
            gameState.addGameLog(`Sold ${count} items for ${totalGold}g`);
        }
        return { count, totalGold };
    }

    /** Sell all items below a certain rarity index (0=Common, 1=Uncommon, etc) */
    sellBelowRarity(maxRarityIndex) {
        let totalGold = 0;
        let count = 0;
        const bestIds = this.getBestUpgradeIds();
        
        for (let i = this.items.length - 1; i >= 0; i--) {
            const item = this.items[i];
            // Never sell quest items (type: 'quest') or junk here (use sellAllJunk for junk)
            if (item.type === 'junk' || item.type === 'quest') continue;
            
            const rarIdx = RARITIES.indexOf(item.rarity);
            if (rarIdx >= 0 && rarIdx <= maxRarityIndex) {
                // Don't sell if it's currently a recommended upgrade
                if (bestIds.has(item.id)) continue;
                
                totalGold += this.sellItem(i);
                count++;
            }
        }
        
        if (count > 0) {
            gameState.addGameLog(`Scrapped ${count} items for ${totalGold}g`);
        }
        return { count, totalGold };
    }

    // ── Equip / unequip ───────────────────────────────────────────
    equipItem(index) {
        const item = this.items[index];
        if (!item || !item.slot) return false;
        if (item.type === 'junk') return false;

        // Unequip current
        const prev = this.equipped[item.slot];
        this.items.splice(index, 1);

        if (prev) {
            this.items.push(prev);
        }

        this.equipped[item.slot] = item;
        this.recalcStats();
        this.version++;
        gameState.addGameLog(`Equipped ${item.name}`);
        return true;
    }

    unequipItem(slot) {
        const item = this.equipped[slot];
        if (!item) return false;
        if (this.items.length >= this.maxSlots) return false;

        this.equipped[slot] = null;
        this.items.push(item);
        this.recalcStats();
        this.version++;
        return true;
    }

    // ── Stat recalc ───────────────────────────────────────────────
    recalcStats() {
        let bonusDps = 0;
        let bonusArmor = 0;
        let bonusHp = 0;
        let bonusCrit = 0;
        let bonusMisc = 0;

        for (const slot of Object.keys(this.equipped)) {
            const item = this.equipped[slot];
            if (!item) continue;
            if (item.dps) bonusDps += item.dps;
            if (item.armor) bonusArmor += item.armor;
            if (item.bonus) bonusMisc += item.bonus;
            if (item.bonusStat === 'hp') bonusHp += item.bonusStatValue;
            if (item.bonusStat === 'armor') bonusArmor += item.bonusStatValue;
            if (item.bonusStat === 'crit') bonusCrit += item.bonusStatValue;
        }

        gameState.equipBonusDps = bonusDps;
        gameState.equipBonusArmor = bonusArmor;
        gameState.equipBonusHp = bonusHp;
        gameState.equipBonusCrit = bonusCrit;
        gameState.equipBonusMisc = bonusMisc;
    }

    // ── Compute effective primary stat value for an item ───────────
    _getEffectivePrimaryStat(item) {
        if (!item) return 0;
        if (item.slot === 'weapon') return item.dps || 0;
        if (['helm', 'chest', 'legs', 'boots'].includes(item.slot)) return item.armor || 0;
        if (['ring', 'trinket'].includes(item.slot)) return item.bonus || 0;
        return 0;
    }

    /**
     * Get the stat difference between an item and what's currently equipped.
     * Positive = upgrade, negative = downgrade, zero = same.
     */
    getUpgradeScore(item) {
        if (!item || !item.slot || item.type === 'junk') return { diff: 0, isUpgrade: false };
        const current = this.equipped[item.slot];

        const newStat = this._getEffectivePrimaryStat(item);
        if (!current) return { diff: newStat, isUpgrade: true };

        const currentStat = this._getEffectivePrimaryStat(current);
        const diff = newStat - currentStat;

        return { diff, isUpgrade: diff > 0 };
    }

    isUpgrade(item) {
        return this.getUpgradeScore(item).isUpgrade;
    }

    /**
     * Returns a Set of item IDs that are the BEST upgrade per slot.
     */
    getBestUpgradeIds() {
        const bestPerSlot = {};

        for (const item of this.items) {
            if (!item || !item.slot || item.type === 'junk') continue;
            const { diff, isUpgrade } = this.getUpgradeScore(item);
            if (!isUpgrade) continue;

            const prev = bestPerSlot[item.slot];
            if (!prev || diff > prev.diff) {
                bestPerSlot[item.slot] = { diff, itemId: item.id };
            }
        }

        const ids = new Set();
        for (const slot in bestPerSlot) {
            ids.add(bestPerSlot[slot].itemId);
        }
        return ids;
    }

    // ── Auto equip best items (idle convenience) ──────────────────
    autoEquipUpgrades() {
        let equipped = false;
        const bestIds = this.getBestUpgradeIds();
        for (let i = this.items.length - 1; i >= 0; i--) {
            const item = this.items[i];
            if (item && bestIds.has(item.id)) {
                this.equipItem(i);
                equipped = true;
            }
        }
        return equipped;
    }

    // ── Summary for UI ────────────────────────────────────────────
    getTotalArmor() {
        let total = 0;
        for (const slot of Object.keys(this.equipped)) {
            const item = this.equipped[slot];
            if (item && item.armor) total += item.armor;
        }
        return total;
    }

    getTotalDps() {
        let total = 0;
        for (const slot of Object.keys(this.equipped)) {
            const item = this.equipped[slot];
            if (item && item.dps) total += item.dps;
        }
        return total;
    }

    drainLootNotifications(ms = 4000) {
        const notifs = this.lootNotifications;
        if (notifs.length === 0) return;
        const cutoff = Date.now() - ms;
        if (notifs[notifs.length - 1].time < cutoff) {
            notifs.length = 0;
            return;
        }
        if (notifs[0].time >= cutoff) return;
        let trimIdx = 0;
        while (trimIdx < notifs.length && notifs[trimIdx].time < cutoff) trimIdx++;
        if (trimIdx > 0) notifs.splice(0, trimIdx);
    }
}

export const inventory = new InventoryManager();
